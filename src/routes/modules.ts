import { Router, Request } from 'express';
import { db } from '../lib/database';
import { Module as PrismaModule } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../lib/logger';
import { cached, cacheDelPattern } from '../lib/cache';
import { audit } from '../lib/audit';

const MODULES_CACHE_TTL = 30; // seconds — modules rarely change

// Implémentation MINIMALE restaurée pour éviter les 404 côté frontend
// et rétablir l'affichage des modules. Conçue pour être sûre et simple.
// Per-organization activation logic can be refined later.

const prisma = db;
const router = Router();
router.use(authenticateToken);

// Utilitaire: dériver une route cohérente à partir d'une clé si route absente.
// Règles:
//  - Préserver la route fournie si déjà présente (mais remplacer les underscores par des tirets)
//  - Si absente: / + key transformée (google_agenda => google-agenda)
//  - Garantir un leading '/'
function deriveRoute(key?: string | null, provided?: string | null): string | null {
	if (!key && !provided) return null;
	let route = provided && provided.trim() !== '' ? provided.trim() : '';
	if (!route && key) {
		// Construire depuis la clé
		route = key.replace(/^google_/, 'google-').replace(/_/g, '-');
	} else if (route) {
		// Normaliser underscores
		route = route.replace(/_/g, '-');
		// Retirer double slash éventuel
		route = route.replace(/\/{2,}/g, '/');
		if (route.startsWith('/api/')) {
			// Ne pas normaliser les routes API ici
			return route;
		}
	}
	if (!route.startsWith('/')) route = '/' + route;
	return route;
}

// Helper: map un enregistrement Module (+ éventuellement status org) vers le format frontend
type MinimalModule = Pick<PrismaModule, 'id' | 'key' | 'label' | 'feature' | 'icon' | 'route' | 'description' | 'page' | 'order' | 'active' | 'organizationId' | 'parameters'> & {
	Category?: {
		id: string;
		name: string;
		icon: string | null;
		iconColor: string | null;
	} | null;
};
function mapModule(m: MinimalModule, orgStatuses: Record<string, boolean> | null, organizationId?: string | null) {
	// Statut global
	const activeGlobal = m.active !== false;
	let isActiveForOrg: boolean | undefined = undefined;
	if (organizationId) {
		// Si un organizationId est fourni, tenter de lire le status spécifique
		if (orgStatuses && orgStatuses[m.id] !== undefined) {
			isActiveForOrg = orgStatuses[m.id];
		} else if (m.organizationId && m.organizationId === organizationId) {
			// Module spécifique à l'organisation
			isActiveForOrg = activeGlobal;
		} else if (!m.organizationId) {
			// Module global sans statut spécifique enregistré → permissif
			isActiveForOrg = activeGlobal; // fallback true si actif globalement
		} else {
			// Module d'une autre organisation
			isActiveForOrg = false;
		}
	}
	return {
		id: m.id,
		key: m.key,
		label: m.label,
		feature: m.feature,
		icon: m.icon,
		route: m.route,
		description: m.description,
		page: m.page,
		order: m.order ?? 0,
		active: activeGlobal,
		parameters: m.parameters, // 🔧 Inclure les paramètres
		organizationId: m.organizationId,
		isActiveForOrg,
		placement: m.placement || 'sidebar',
		// ✅ Ajouter les informations de catégorie
		category: m.Category?.name || null,
		categoryIcon: m.Category?.icon || null,
		categoryColor: m.Category?.iconColor || null,
	};
}

// Helper: extraire l'utilisateur du JWT cookie (optionnel, ne bloque pas si absent)
function extractUserFromRequest(req: Request): { userId: string; role?: string; isSuperAdmin?: boolean } | null {
	try {
		let token = req.cookies?.token;
		if (!token) {
			const authHeader = req.headers['authorization'];
			token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;
		}
		if (!token) return null;
		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string; roles?: string[]; isSuperAdmin?: boolean };
		// Le JWT utilise 'roles' (pluriel, tableau) – dériver le rôle singulier
		const role = decoded.role || decoded.roles?.[0];
		const isSuperAdmin = decoded.isSuperAdmin || role === 'super_admin' || decoded.roles?.includes('super_admin');
		return { userId: decoded.userId, role, isSuperAdmin };
	} catch {
		return null;
	}
}

// GET /api/modules?organizationId=xxx
// 🔐 Filtre les modules selon: 1) activation globale, 2) activation org, 3) permissions du rôle
router.get('/', async (req, res) => {
	const { organizationId } = req.query as { organizationId?: string };
	try {
		// Récupération brute des modules (globaux + spécifiques) avec catégories — cached
		const modules = await cached('modules:all', MODULES_CACHE_TTL, () =>
			prisma.module.findMany({
				orderBy: { order: 'asc' },
				include: {
					Category: {
						select: {
							id: true,
							name: true,
							icon: true,
							iconColor: true
						}
					}
				}
			})
		);

		let orgStatuses: Record<string, boolean> | null = null;
		if (organizationId) {
			orgStatuses = await cached(
				`modules:org:${organizationId}:statuses`,
				MODULES_CACHE_TTL,
				async () => {
					const statuses = await prisma.organizationModuleStatus.findMany({
						where: { organizationId },
						select: { moduleId: true, active: true },
					});
					return statuses.reduce((acc, s) => {
						acc[s.moduleId] = s.active;
						return acc;
					}, {} as Record<string, boolean>);
				}
			);
		}

		const mapped = modules.map(m => mapModule(m, orgStatuses, organizationId));

		// Filtrage si organizationId fourni: n'afficher que les modules globaux + ceux de l'orga
		let filtered = organizationId
			? mapped.filter(m => !m.organizationId || m.organizationId === organizationId)
			: mapped;

		// 🔐 FILTRAGE PAR PERMISSIONS DU RÔLE
		// Super admins voient tout, les autres ne voient que les modules autorisés par leur rôle
		const currentUser = extractUserFromRequest(req);
		const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'super_admin';

		// Filtrer les modules superAdminOnly pour les non-SA
		if (!isSuperAdmin) {
			filtered = filtered.filter(m => !(m as any).superAdminOnly);
		}

		if (currentUser && organizationId && !isSuperAdmin) {
			try {
				// Trouver le rôle de l'utilisateur dans cette organisation
				const userOrg = await prisma.userOrganization.findUnique({
					where: { userId_organizationId: { userId: currentUser.userId, organizationId } },
					select: { roleId: true },
				});

				if (userOrg?.roleId) {
					// Charger les permissions "access" du rôle
					const rolePermissions = await prisma.permission.findMany({
						where: { roleId: userOrg.roleId, action: 'access' },
						select: { moduleId: true, allowed: true },
					});

					// Construire un set des modules explicitement autorisés et refusés
					const allowedModuleIds = new Set<string>();
					const deniedModuleIds = new Set<string>();
					for (const perm of rolePermissions) {
						if (perm.moduleId) {
							if (perm.allowed) {
								allowedModuleIds.add(perm.moduleId);
							} else {
								deniedModuleIds.add(perm.moduleId);
							}
						}
					}

					// Si des permissions existent pour ce rôle, filtrer:
					// - Un module est visible SEULEMENT s'il a une permission allowed=true
					// - Un module sans permission explicite est MASQUÉ (deny by default)
					if (rolePermissions.length > 0) {
						filtered = filtered.filter(m => allowedModuleIds.has(m.id));
					} else {
						// Aucune permission access pour ce rôle → vérifier si le système de permissions est actif
						// (d'autres rôles ont des permissions access configurées)
						const otherRolesWithPerms = await prisma.permission.count({
							where: { action: 'access', roleId: { not: userOrg.roleId } },
						});
						if (otherRolesWithPerms > 0) {
							// Le système est actif → ce rôle n'a rien de configuré = aucun accès
							filtered = [];
						}
						// Sinon, aucun rôle n'a de permissions → backward compatible, tout visible
					}
				}
			} catch (permErr) {
				logger.error('[modules] Erreur lors du filtrage par permissions du rôle:', permErr);
				// En cas d'erreur, on ne filtre pas (fail-open pour ne pas bloquer l'UI)
			}
		}

		// ✅ SORT: Garantir l'ordre des modules Zhiive
		// Si organizationId === 'zhiive-global-org' (ou pas d'organizationId):
		// Afficher les 9 modules Zhiive DANS CET ORDRE: Nectar, Arena, Wax, Friends, Reels, Hive, Mail, Agenda, Search
		// Stats n'apparaît PAS pour Zhiive
		const isZhiiveOrg = !organizationId || organizationId === 'zhiive-global-org';
		if (isZhiiveOrg) {
			const ZHIIVE_MODULE_ORDER = ['nectar', 'arena', 'wax', 'friends', 'reels', 'hive', 'mail', 'agenda', 'search'];

			// Filtrer: garder SEULEMENT les modules Zhiive (exclure stats)
			filtered = filtered.filter(m => ZHIIVE_MODULE_ORDER.includes(m.key));

			// Trier selon l'ordre défini
			filtered.sort((a, b) => {
				const indexA = ZHIIVE_MODULE_ORDER.indexOf(a.key);
				const indexB = ZHIIVE_MODULE_ORDER.indexOf(b.key);
				return indexA - indexB;
			});
		}

		res.json({ success: true, data: filtered });
	} catch (e) {
		logger.error('[modules] GET / erreur', e);
		res.status(500).json({ success: false, message: 'Erreur récupération modules' });
	}
});

// GET /api/modules/swipe-tabs → retourne les modules configurés pour le swipe (placement = 'swipe' ou 'both')
router.get('/swipe-tabs', async (req, res) => {
	try {
		const { organizationId } = req.query as { organizationId?: string };
		
		// Vérifier si l'utilisateur est super admin pour afficher les modules SA-only
		const currentUser = extractUserFromRequest(req);
		const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'super_admin';
		
		// Récupérer les modules swipe/both actifs (globaux + ceux de l'org courante)
		const modules = await prisma.module.findMany({
			where: {
				placement: { in: ['swipe', 'both'] },
				active: true,
				// Filtrer les modules superAdminOnly pour les non-SA
				...(isSuperAdmin ? {} : { superAdminOnly: false }),
				// Filtrer par organisation : modules globaux + modules de l'org courante
				...(organizationId ? {
					OR: [
						{ organizationId: null },
						{ organizationId: organizationId },
					],
				} : {}),
			},
			orderBy: { order: 'asc' },
			include: {
				OrganizationModuleStatus: organizationId ? {
					where: { organizationId },
				} : false,
			},
		});

		// Filter out modules disabled for this org
		const filtered = modules.filter(m => {
			if (!organizationId) return true;
			const orgStatus = (m as any).OrganizationModuleStatus?.[0];
			if (!orgStatus) return true;
			return orgStatus.active;
		});

		// Dédupliquer par key (préfère org-spécifique si les deux existent)
		const byKey = new Map<string, typeof filtered[0]>();
		for (const m of filtered) {
			const existing = byKey.get(m.key);
			if (!existing || (m.organizationId && !existing.organizationId)) {
				byKey.set(m.key, m);
			}
		}

		// Canonical label overrides (DB may have stale names)
		const LABEL_OVERRIDES: Record<string, string> = {
			explore: 'Friends',
			flow: 'Nectar',
			universe: 'Nectar',
		};

		const tabs = Array.from(byKey.values())
			.sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
			.map(m => ({
				id: m.key === 'flow' || m.key === 'universe' ? 'nectar' : m.key,
				label: LABEL_OVERRIDES[m.key] || m.label,
				color: m.key === 'flow' || m.key === 'universe' ? '#FDCB6E' : (m.tabColor || '#999'),
				icon: m.key === 'flow' || m.key === 'universe' ? 'nectar' : (m.tabIcon || 'app'),
				order: m.order ?? 99,
				moduleId: m.id,
				placement: m.placement,
			}));

		// Deduplicate (flow + universe both become nectar)
		const seen = new Set<string>();
		const dedupedTabs = tabs.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });

		res.json({ success: true, data: dedupedTabs });
	} catch (e) {
		logger.error('[modules] GET /swipe-tabs erreur', e);
		res.status(500).json({ success: false, message: 'Erreur récupération swipe tabs' });
	}
});

// GET /api/modules/all → tous les modules (mode super-admin vue globale)
router.get('/all', async (_req, res) => {
	try {
		const modules = await prisma.module.findMany({ 
			orderBy: { order: 'asc' },
			include: {
				Category: {
					select: {
						id: true,
						name: true,
						icon: true,
						iconColor: true
					}
				}
			}
		});
		const mapped = modules.map(m => mapModule(m, null));
		res.json({ success: true, data: mapped });
	} catch (e) {
		logger.error('[modules] GET /all erreur', e);
		res.status(500).json({ success: false, message: 'Erreur récupération modules (all)' });
	}
});

// PATCH /api/modules/status { moduleId, organizationId, active }
router.patch('/status', async (req, res) => {
	const { moduleId, organizationId, active } = req.body as { moduleId: string; organizationId: string; active: boolean };
	if (!moduleId || !organizationId || typeof active !== 'boolean') {
		return res.status(400).json({ success: false, message: 'Paramètres invalides' });
	}
	try {
		// upsert OrganizationModuleStatus
		const status = await prisma.organizationModuleStatus.upsert({
			where: { organizationId_moduleId: { organizationId, moduleId } },
			update: { active },
			create: { organizationId, moduleId, active },
		});
		await cacheDelPattern(`modules:org:${organizationId}:*`);
		res.json({ success: true, data: status });
	} catch (e) {
		logger.error('[modules] PATCH /status erreur', e);
		res.status(500).json({ success: false, message: 'Erreur mise à jour statut module' });
	}
});

// POST /api/modules  (création)
router.post('/', async (req, res) => {
	try {
		const { key, label, feature, icon, route, description, page, order, active, organizationId, parameters } = req.body;
		if (!key || !label) {
			return res.status(400).json({ success: false, message: 'key et label requis' });
		}
		const finalRoute = deriveRoute(key, route);
		const created = await prisma.module.create({
			data: {
				key,
				label,
				feature: feature || key, // fallback
				icon: icon || null,
				route: finalRoute,
				description: description || null,
				page: page || null,
				order: typeof order === 'number' ? order : 0,
				active: active !== false,
				parameters: parameters || null, // 🔧 Paramètres JSON
				organizationId: organizationId || null,
			},
		});
		await cacheDelPattern('modules:*');
		const actor = extractUserFromRequest(req);
		audit.record({
			action: 'module.create',
			actorId: actor?.userId ?? null,
			organizationId: organizationId ?? null,
			targetType: 'Module',
			targetId: created.id,
			outcome: 'success',
			ip: req.ip ?? null
		});
		res.json({ success: true, data: mapModule(created, null, organizationId) });
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : 'Erreur inconnue';
			logger.error('[modules] POST / erreur', e);
			res.status(500).json({ success: false, message: 'Erreur création module', detail: message });
	}
});

// PUT /api/modules/:id (mise à jour)
router.put('/:id', async (req, res) => {
	const { id } = req.params;
	try {
		const { label, feature, icon, route, description, page, order, active, key, organizationId, parameters, categoryId, placement, tabColor, tabIcon, superAdminOnly } = req.body as {
			label?: string; feature?: string; icon?: string; route?: string; description?: string; page?: string; order?: number; active?: boolean; key?: string; organizationId?: string | null; parameters?: unknown; categoryId?: string; placement?: string; tabColor?: string; tabIcon?: string; superAdminOnly?: boolean;
		};
		let normalizedRoute: string | undefined;
		if (route !== undefined || key !== undefined) {
			normalizedRoute = deriveRoute(key, route);
		}
		
		
		const updated = await prisma.module.update({
			where: { id },
			data: {
				label: label !== undefined ? label : undefined,
				feature: feature !== undefined ? feature : undefined,
				icon: icon !== undefined ? icon : undefined,
				route: normalizedRoute !== undefined ? normalizedRoute : undefined,
				description: description !== undefined ? description : undefined,
				page: page !== undefined ? page : undefined,
				order: order !== undefined ? order : undefined,
				active: active !== undefined ? active : undefined,
				parameters: parameters !== undefined ? parameters : undefined, // 🔧 Paramètres JSON
				key: key !== undefined ? key : undefined,
				organizationId: organizationId !== undefined ? organizationId : undefined,
				categoryId: categoryId !== undefined ? categoryId : undefined,
				placement: placement !== undefined ? placement : undefined,
				tabColor: tabColor !== undefined ? tabColor : undefined,
				tabIcon: tabIcon !== undefined ? tabIcon : undefined,
				superAdminOnly: superAdminOnly !== undefined ? superAdminOnly : undefined,
			},
		});
		await cacheDelPattern('modules:*');
		const actor = extractUserFromRequest(req);
		audit.record({
			action: 'module.update',
			actorId: actor?.userId ?? null,
			targetType: 'Module',
			targetId: id,
			outcome: 'success',
			ip: req.ip ?? null
		});
		res.json({ success: true, data: mapModule(updated, null) });
	} catch (e: unknown) {
		logger.error('[modules] PUT /:id erreur', e);
		if (e?.code === 'P2002') {
			return res.status(409).json({ success: false, message: 'Conflit d\'unicité (clé ou feature déjà utilisée)' });
		}
		res.status(500).json({ success: false, message: 'Erreur mise à jour module' });
	}
});

// DELETE /api/modules/:id
router.delete('/:id', async (req, res) => {
	const { id } = req.params;
	try {
		// Supprimer d'abord les statuses organisation
		await prisma.organizationModuleStatus.deleteMany({ where: { moduleId: id } });
		await prisma.permission.deleteMany({ where: { moduleId: id } }).catch(() => {}); // best effort
		const deleted = await prisma.module.delete({ where: { id } });
		await cacheDelPattern('modules:*');
		const actor = extractUserFromRequest(req);
		audit.record({
			action: 'module.delete',
			actorId: actor?.userId ?? null,
			targetType: 'Module',
			targetId: deleted.id,
			outcome: 'success',
			ip: req.ip ?? null
		});
		res.json({ success: true, data: { id: deleted.id } });
	} catch (e) {
		logger.error('[modules] DELETE /:id erreur', e);
		res.status(500).json({ success: false, message: 'Erreur suppression module' });
	}
});

// Health (optionnel)
router.get('/health', (_req, res) => res.json({ success: true, message: 'modules ok' }));

export default router;

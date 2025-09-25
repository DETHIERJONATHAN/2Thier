import { Router } from 'express';
import { PrismaClient, Module as PrismaModule } from '@prisma/client';

// Implémentation MINIMALE restaurée pour éviter les 404 côté frontend
// et rétablir l'affichage des modules. Conçue pour être sûre et simple.
// TODO: Affiner la logique d'activation par organisation si nécessaire.

const prisma = new PrismaClient();
const router = Router();

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
		// ✅ Ajouter les informations de catégorie
		category: m.Category?.name || null,
		categoryIcon: m.Category?.icon || null,
		categoryColor: m.Category?.iconColor || null,
	};
}

// GET /api/modules?organizationId=xxx
router.get('/', async (req, res) => {
	const { organizationId } = req.query as { organizationId?: string };
	try {
		// Récupération brute des modules (globaux + spécifiques) avec catégories
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

		let orgStatuses: Record<string, boolean> | null = null;
		if (organizationId) {
			const statuses = await prisma.organizationModuleStatus.findMany({
				where: { organizationId },
				select: { moduleId: true, active: true },
			});
			orgStatuses = statuses.reduce((acc, s) => {
				acc[s.moduleId] = s.active;
				return acc;
			}, {} as Record<string, boolean>);
		}

		const mapped = modules.map(m => mapModule(m, orgStatuses, organizationId));

		// Filtrage si organizationId fourni: n'afficher que les modules globaux + ceux de l'orga
		const filtered = organizationId
			? mapped.filter(m => !m.organizationId || m.organizationId === organizationId)
			: mapped;

		res.json({ success: true, data: filtered });
	} catch (e) {
		console.error('[modules] GET / erreur', e);
		res.status(500).json({ success: false, message: 'Erreur récupération modules' });
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
		console.error('[modules] GET /all erreur', e);
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
		res.json({ success: true, data: status });
	} catch (e) {
		console.error('[modules] PATCH /status erreur', e);
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
		res.json({ success: true, data: mapModule(created, null, organizationId) });
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : 'Erreur inconnue';
			console.error('[modules] POST / erreur', e);
			res.status(500).json({ success: false, message: 'Erreur création module', detail: message });
	}
});

// PUT /api/modules/:id (mise à jour)
router.put('/:id', async (req, res) => {
	const { id } = req.params;
	try {
		const { label, feature, icon, route, description, page, order, active, key, organizationId, parameters, categoryId } = req.body as {
			label?: string; feature?: string; icon?: string; route?: string; description?: string; page?: string; order?: number; active?: boolean; key?: string; organizationId?: string | null; parameters?: unknown; categoryId?: string;
		};
		let normalizedRoute: string | undefined;
		if (route !== undefined || key !== undefined) {
			normalizedRoute = deriveRoute(key, route);
		}
		
		console.log(`[modules] PUT /${id} - Mise à jour module avec categoryId:`, categoryId);
		console.log(`[modules] PUT /${id} - Body complet:`, req.body);
		
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
			},
		});
		res.json({ success: true, data: mapModule(updated, null) });
	} catch (e: unknown) {
		console.error('[modules] PUT /:id erreur', e);
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
		res.json({ success: true, data: { id: deleted.id } });
	} catch (e) {
		console.error('[modules] DELETE /:id erreur', e);
		res.status(500).json({ success: false, message: 'Erreur suppression module' });
	}
});

// Health (optionnel)
router.get('/health', (_req, res) => res.json({ success: true, message: 'modules ok' }));

export default router;

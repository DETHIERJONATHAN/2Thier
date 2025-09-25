import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

// ✅ PLUS BESOIN D'INTERFACE LOCALE - UTILISATION DE L'INTERFACE CENTRALISÉE

const router = Router();
const prisma = new PrismaClient();

// 🧹 SANITISATION SIMPLE ET EFFICACE (sans DOMPurify)
const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Supprime < et >
};

// 🔧 UTILITAIRES PERMISSIONS (Factorisation)
interface AuthUser {
  role: string;
  organizationId?: string;
  userId: string;
}

const canAccessOrganization = (user: AuthUser, organizationId: string): boolean => {
  // SuperAdmin peut tout voir
  if (user?.role === 'super_admin') {
    return true;
  }
  // Autres utilisateurs : seulement leur organisation
  return user?.organizationId === organizationId;
};

const isSuperAdmin = (user: AuthUser): boolean => {
  return user?.role === 'super_admin';
};

// 🔧 VALIDATION ID CENTRALISÉE (Factorisation)
// Accepter UUID, CUID (cuid2 non strict) ou identifiants alphanumériques simples (fallback dev)
const isValidId = (id: string): boolean => {
  if (!id) return false;
  const s = String(id).trim();
  // UUID v4-like
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // CUID (commençant par c) ou cuid2 plus large
  const cuidRe = /^c[a-z0-9]{7,}$/i;
  // Identifiants alphanumériques (sécurisé par sanitization) – utile en dev/scripts
  const simpleRe = /^[a-zA-Z0-9_-]{8,}$/;
  return uuidRe.test(s) || cuidRe.test(s) || simpleRe.test(s);
};

const validateAndSanitizeId = (id: string, fieldName = 'ID'): string => {
  const sanitized = sanitizeString(String(id));
  if (!isValidId(sanitized)) {
    throw new Error(`${fieldName} invalide`);
  }
  return sanitized;
};

// 🔧 UTILITAIRES GOOGLE WORKSPACE (Factorisation TypeScript stricte)
const GOOGLE_WORKSPACE_MODULES = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'] as const;
type GoogleWorkspaceModule = typeof GOOGLE_WORKSPACE_MODULES[number];

interface ModuleStatus {
  active: boolean;
  Module?: {
    key?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const isGoogleWorkspaceModule = (moduleKey: string): moduleKey is GoogleWorkspaceModule => {
  return (GOOGLE_WORKSPACE_MODULES as readonly string[]).includes(moduleKey);
};

const getActiveGoogleModules = (moduleStatuses: ModuleStatus[] = []): ModuleStatus[] => {
  return moduleStatuses.filter(oms => 
    oms.active && oms.Module?.key && isGoogleWorkspaceModule(oms.Module.key)
  );
};

// ✅ FONCTION UTILITAIRE : Compter les modules réellement actifs pour une organisation
async function countRealActiveModules(organizationId: string): Promise<number> {
  console.log(`[countRealActiveModules] 🔍 Début count pour organisation: ${organizationId}`);
  
  // Vérifier si c'est Google Workspace en regardant GoogleWorkspaceConfig
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { 
      GoogleWorkspaceConfig: true, 
      name: true 
    }
  });
  
  const hasGoogleWorkspace = !!organization?.GoogleWorkspaceConfig;
  console.log(`[countRealActiveModules] 🌐 Organisation ${organization?.name} - Google Workspace: ${hasGoogleWorkspace}`);
  
  // Récupérer TOUS les modules actifs de la base
  const allActiveModules = await prisma.module.findMany({
    where: {
      active: true
    },
    include: {
      OrganizationModuleStatus: {
        where: {
          organizationId: organizationId
        }
      }
    }
  });
  
  console.log(`[countRealActiveModules] 📊 Total modules actifs dans Module: ${allActiveModules.length}`);
  
  // Filtrer les modules réellement actifs pour cette organisation
  const activeModulesForOrg = allActiveModules.filter(module => {
    // Si le module a un statut spécifique pour cette organisation
    const moduleStatus = module.OrganizationModuleStatus[0];
    
    // Si c'est un module Google et que Google Workspace n'est pas activé
    if (module.key && module.key.toLowerCase().startsWith('google_') && !hasGoogleWorkspace) {
      console.log(`[countRealActiveModules] 🚫 Module Google ${module.key}: Google Workspace désactivé -> EXCLU`);
      return false;
    }
    
    if (moduleStatus) {
      // Utiliser le statut spécifique (peut être actif ou inactif)
      console.log(`[countRealActiveModules] ${moduleStatus.active ? '✅' : '❌'} Module ${module.key || 'Sans clé'} (${module.label || 'Sans nom'}): statut spécifique -> ${moduleStatus.active ? 'ACTIF' : 'INACTIF'}`);
      return moduleStatus.active;
    } else {
      // Pas de statut spécifique = actif par défaut
      console.log(`[countRealActiveModules] ✅ Module ${module.key || 'Sans clé'} (${module.label || 'Sans nom'}): pas de statut spécifique -> ACTIF par défaut`);
      return true;
    }
  });
  
  const finalCount = activeModulesForOrg.length;
  console.log(`[countRealActiveModules] 🎯 Count final pour ${organization?.name}: ${finalCount}`);
  
  return finalCount;
}

// 🔧 FONCTION HELPER : Vérifier si Google Workspace est activé
function hasGoogleWorkspaceEnabled(
  moduleStatuses: ModuleStatus[] = [],
  googleWorkspaceConfig?: { isActive?: boolean } | null
): boolean {
  // 1. Vérifier si au moins un module Google Workspace est actif
  const hasActiveModules = getActiveGoogleModules(moduleStatuses).length > 0;
  
  // 2. Vérifier si une configuration Google Workspace active existe
  const hasActiveConfig = googleWorkspaceConfig?.isActive === true;
  
  // Google Workspace est considéré comme activé si :
  // - Il y a des modules actifs OU une configuration active
  return hasActiveModules || hasActiveConfig;
};

// 🔧 UTILITAIRE DOMAIN GOOGLE WORKSPACE (TODO amélioré)
interface OrganizationWithFeatures {
  name: string;
  features?: string[];
}

const extractGoogleWorkspaceDomain = (organization: OrganizationWithFeatures): string | null => {
  // TODO: À terme, récupérer depuis un champ dédié googleWorkspaceDomain
  // Pour l'instant, logique de fallback basique
  if (organization.features?.includes('google_workspace')) {
    return `${organization.name.toLowerCase().replace(/\s+/g, '')}.com`;
  }
  return null;
};

// 🔒 VALIDATION ZOD ULTRA-STRICTE
const organizationCreateSchema = z.object({
  name: z.string()
    .min(2, 'Nom organisation minimum 2 caractères')
    .max(100, 'Nom organisation maximum 100 caractères')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nom organisation contient des caractères non autorisés'),
  description: z.string()
    .max(500, 'Description maximum 500 caractères')
    .optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Statut doit être ACTIVE ou INACTIVE' })
  }).optional(),
  // 📞 NOUVEAUX CHAMPS DE CONTACT
  website: z.string()
    .url('Site web doit être une URL valide')
    .max(255, 'Site web maximum 255 caractères')
    .optional(),
  phone: z.string()
    .max(20, 'Téléphone maximum 20 caractères')
    .regex(/^[\d\s\-+().]+$/, 'Numéro de téléphone contient des caractères non autorisés')
    .optional(),
  address: z.string()
    .max(500, 'Adresse maximum 500 caractères')
    .optional(),
  // 🌟 GOOGLE WORKSPACE CONFIGURATION
  googleWorkspace: z.object({
    enabled: z.boolean().default(false),
    domain: z.string().optional(),
    adminEmail: z.string().email().optional(),
    modules: z.object({
      gmail: z.boolean().default(false),
      calendar: z.boolean().default(false),
      drive: z.boolean().default(false),
      meet: z.boolean().default(false),
      docs: z.boolean().default(false),
      sheets: z.boolean().default(false),
      voice: z.boolean().default(false)
    }).optional()
  }).optional()
});

const organizationUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Nom organisation minimum 2 caractères')
    .max(100, 'Nom organisation maximum 100 caractères')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nom organisation contient des caractères non autorisés')
    .optional(),
  description: z.string()
    .max(500, 'Description maximum 500 caractères')
    .nullish(),
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Statut doit être ACTIVE ou INACTIVE' })
  }).optional(),
  // 📞 NOUVEAUX CHAMPS DE CONTACT
  website: z.string()
    .url('Site web doit être une URL valide')
    .max(255, 'Site web maximum 255 caractères')
    .nullish(),
  phone: z.string()
    .max(20, 'Téléphone maximum 20 caractères')
    .regex(/^[\d\s\-+().]+$/, 'Numéro de téléphone contient des caractères non autorisés')
    .nullish(),
  address: z.string()
    .max(500, 'Adresse maximum 500 caractères')
    .nullish(),
  googleWorkspace: z.object({
    enabled: z.boolean().optional(),
    domain: z.string().optional(),
    adminEmail: z.string().email().optional(),
    modules: z.object({
      gmail: z.boolean().optional(),
      calendar: z.boolean().optional(),
      drive: z.boolean().optional(),
      meet: z.boolean().optional(),
      docs: z.boolean().optional(),
      sheets: z.boolean().optional(),
      voice: z.boolean().optional()
    }).optional()
  }).optional()
});

// 🚀 RATE LIMITING ADAPTATIF (Plus strict que Users/Roles car fonctionnalités sensibles)
const organizationsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requêtes par minute (très strict)
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (_req, res) => {
    console.log('🚨 [ORGANIZATIONS] Rate limit dépassé');
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes. Veuillez attendre.'
    });
  }
});

const organizationsCreateRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 créations par minute max
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Limite de création atteinte. Attendez 1 minute.'
    });
  }
});

const organizationsDeleteRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 suppressions par minute max
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Limite de suppression atteinte. Attendez 1 minute.'
    });
  }
});

// 🛡️ GESTION D'ERREURS ZOD CENTRALISÉE
const handleZodError = (error: z.ZodError) => {
  return {
    success: false,
    message: 'Données invalides',
    errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
};

// Appliquer l'authentification et rate limiting
router.use(authMiddleware);
router.use(organizationsRateLimit);

// 🟢 GET /api/organizations/active - SEULEMENT LES ORGANISATIONS ACTIVES
router.get('/active', async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] GET /organizations/active - Récupération organisations ACTIVES uniquement');
  
  try {
    const requestingUser = req.user;
    const { search, userId } = req.query;
    
    console.log(`[ORGANIZATIONS] User role: ${requestingUser?.role}`);
    console.log(`[ORGANIZATIONS] Query params:`, { search, userId });
    
    // 🔍 VALIDATION QUERY PARAMS avec FILTRE ACTIF OBLIGATOIRE
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'active'] } // ✅ Accepter variantes de statut
    };
    
    if (search && typeof search === 'string') {
      const sanitizedSearch = sanitizeString(search);
      where.name = {
        contains: sanitizedSearch,
        mode: 'insensitive'
      };
    }
    
    if (userId && typeof userId === 'string') {
      const userOrgs = await prisma.userOrganization.findMany({
        where: { userId: sanitizeString(userId) },
        select: { organizationId: true }
      });
      const orgIds = userOrgs.map(uo => uo.organizationId);
      
      if (orgIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      
      where.id = { in: orgIds };
    }
    
    // ✅ PERMISSIONS : Tous les utilisateurs authentifiés peuvent voir les orgs actives
    if (isSuperAdmin(requestingUser)) {
      // Super admin voit toutes les organisations actives
      console.log('[ORGANIZATIONS] Super admin - accès aux organisations actives');
    } else if (requestingUser?.role === 'admin' && requestingUser.organizationId) {
      // Admin voit seulement son organisation SI elle est active
      where.id = requestingUser.organizationId;
      console.log('[ORGANIZATIONS] Admin - accès à son organisation uniquement si active');
    } else if (requestingUser?.organizationId) {
      // Utilisateur normal voit seulement son organisation SI elle est active
      where.id = requestingUser.organizationId;
      console.log('[ORGANIZATIONS] Utilisateur - accès à son organisation uniquement si active');
    } else {
      console.log('[ORGANIZATIONS] Accès refusé - pas d\'organisation assignée');
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }
    
    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: {
            UserOrganization: true,
            Role: true
          }
        },
        OrganizationModuleStatus: {
          include: {
            Module: true
          }
        },
        Role: {
          select: {
            id: true,
            name: true,
            isGlobal: true
          }
        },
        GoogleWorkspaceConfig: { // ✅ NOUVEAU : Inclure la configuration Google Workspace
          select: {
            id: true,
            isActive: true,
            domain: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // 🌟 ENRICHISSEMENT AVEC STATISTIQUES COMPLÈTES
    const enrichedOrganizations = await Promise.all(organizations.map(async org => {
      const activeGoogleModules = getActiveGoogleModules(org.OrganizationModuleStatus);
      const realActiveModulesCount = await countRealActiveModules(org.id);
      
      return {
        ...org,
        stats: {
          totalUsers: org._count?.UserOrganization ?? 0,
          totalRoles: org._count?.Role ?? 0,
          activeModules: realActiveModulesCount, // ✅ DYNAMIQUE : Comptage réel en temps réel
          googleWorkspaceEnabled: hasGoogleWorkspaceEnabled(org.OrganizationModuleStatus, org.GoogleWorkspaceConfig)
        },
        googleWorkspaceDomain: org.GoogleWorkspaceConfig?.domain || extractGoogleWorkspaceDomain(org),
        googleWorkspaceModules: activeGoogleModules.map(oms => oms.Module).filter(Boolean)
      };
    }));
    
    console.log(`[ORGANIZATIONS] ${enrichedOrganizations.length} organisations ACTIVES trouvées`);
    
    res.json({
      success: true,
      data: enrichedOrganizations
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur GET /active:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des organisations actives'
    });
  }
});

// �🏷️ GET /api/organizations - SÉCURISÉ AVEC ZOD + SANITISATION (TOUTES LES ORGS POUR ADMIN)
router.get('/', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] GET /organizations - Récupération organisations SÉCURISÉE');
  
  try {
    const requestingUser = req.user;
    const { search, userId } = req.query;
    
    console.log(`[ORGANIZATIONS] User role: ${requestingUser?.role}`);
    console.log(`[ORGANIZATIONS] Query params:`, { search, userId });
    
    // 🔍 VALIDATION QUERY PARAMS (optionnelle mais recommandée)  
    const where: Record<string, unknown> = {};
    
    if (search && typeof search === 'string') {
      const sanitizedSearch = sanitizeString(search);
      where.name = {
        contains: sanitizedSearch,
        mode: 'insensitive'
      };
    }
    
    if (userId && typeof userId === 'string') {
      const userOrgs = await prisma.userOrganization.findMany({
        where: { userId: sanitizeString(userId) },
        select: { organizationId: true }
      });
      const orgIds = userOrgs.map(uo => uo.organizationId);
      
      if (orgIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      
      where.id = { in: orgIds };
    }
    
    // ✅ LOGIQUE PERMISSIONS STRICTE
    if (isSuperAdmin(requestingUser)) {
      // Super admin voit tout
      console.log('[ORGANIZATIONS] Super admin - accès complet');
    } else if (requestingUser?.role === 'admin' && requestingUser.organizationId) {
      // Admin voit seulement son organisation
      where.id = requestingUser.organizationId;
      console.log('[ORGANIZATIONS] Admin - accès à son organisation uniquement');
    } else {
      console.log('[ORGANIZATIONS] Accès refusé - rôle insuffisant');
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }
    
    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: {
            UserOrganization: true,
            Role: true // ✅ AJOUT : Compter les rôles
          }
        },
        OrganizationModuleStatus: {
          include: {
            Module: true
          }
        },
        Role: { // ✅ AJOUT : Inclure les rôles pour statistiques détaillées
          select: {
            id: true,
            name: true,
            isGlobal: true
          }
        },
        GoogleWorkspaceConfig: { // ✅ NOUVEAU : Inclure la configuration Google Workspace
          select: {
            id: true,
            isActive: true,
            domain: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // 🌟 ENRICHISSEMENT AVEC STATISTIQUES COMPLÈTES (Factorisé)
    const enrichedOrganizations = await Promise.all(organizations.map(async org => {
      const activeGoogleModules = getActiveGoogleModules(org.OrganizationModuleStatus);
      
      // 🚀 COMPTAGE DYNAMIQUE RÉEL avec fonction utilitaire
      const realActiveModulesCount = await countRealActiveModules(org.id);
      
      console.log(`[DEBUG] Organisation ${org.name}: ${realActiveModulesCount} modules réellement actifs`);
      
      return {
        ...org,
        stats: {
          totalUsers: org._count?.UserOrganization ?? 0,
          totalRoles: org._count?.Role ?? 0, // ✅ CORRIGÉ : Nombre réel de rôles
          activeModules: realActiveModulesCount, // ✅ DYNAMIQUE : Comptage réel en temps réel
          googleWorkspaceEnabled: hasGoogleWorkspaceEnabled(org.OrganizationModuleStatus, org.GoogleWorkspaceConfig)
        },
        googleWorkspaceDomain: org.GoogleWorkspaceConfig?.domain || extractGoogleWorkspaceDomain(org), // ✅ AMÉLIORÉ : Utiliser le vrai domaine de la config
        googleWorkspaceModules: activeGoogleModules.map(oms => oms.Module).filter(Boolean)
      };
    }));
    
    console.log(`[ORGANIZATIONS] ${enrichedOrganizations.length} organisations trouvées`);
    
    res.json({
      success: true,
      data: enrichedOrganizations
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur GET:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des organisations'
    });
  }
});

// 🏷️ POST /api/organizations - SÉCURISÉ AVEC ZOD + SANITISATION + RATE LIMITING
router.post('/', organizationsCreateRateLimit, requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] POST /organizations - Création organisation SÉCURISÉE');
  
  try {
    // 🔍 VALIDATION ZOD ULTRA-STRICTE
    const validation = organizationCreateSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('[ORGANIZATIONS] Validation échouée:', validation.error);
      return res.status(400).json(handleZodError(validation.error));
    }
    
    const data = validation.data;
    
    // 🧹 SANITISATION SUPPLÉMENTAIRE
    const sanitizedData = {
      name: sanitizeString(data.name),
      description: data.description ? sanitizeString(data.description) : undefined,
      status: data.status || 'ACTIVE',
      // 📞 NOUVEAUX CHAMPS DE CONTACT
      website: data.website ? sanitizeString(data.website) : undefined,
      phone: data.phone ? sanitizeString(data.phone) : undefined,
      address: data.address ? sanitizeString(data.address) : undefined
    };
    
    console.log('[ORGANIZATIONS] Données sanitisées:', sanitizedData);
    
    // ✅ VÉRIFICATION UNICITÉ
    const existingOrg = await prisma.organization.findFirst({
      where: {
        name: {
          equals: sanitizedData.name,
          mode: 'insensitive'
        }
      }
    });
    
    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: 'Une organisation avec ce nom existe déjà'
      });
    }
    
    // 🔄 TRANSACTION SÉCURISÉE
    const newOrganization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: sanitizedData
      });
      
      // 🌟 CONFIGURATION GOOGLE WORKSPACE SI ACTIVÉE
      if (data.googleWorkspace?.enabled) {
        console.log('[ORGANIZATIONS] Configuration Google Workspace activée');
        // Ici on pourrait ajouter la logique pour créer la configuration Google Workspace
        // pour l'instant on log juste
      }
      
      return org;
    });
    
    console.log('[ORGANIZATIONS] Organisation créée avec succès:', newOrganization.id);
    
    res.status(201).json({
      success: true,
      message: 'Organisation créée avec succès',
      data: newOrganization
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur POST:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json(handleZodError(error));
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de l\'organisation'
    });
  }
});

// 🏷️ GET /api/organizations/:id - SÉCURISÉ AVEC ZOD + SANITISATION
router.get('/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] GET /organizations/:id - Récupération organisation SÉCURISÉE');
  
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // 🧹 VALIDATION + SANITISATION ID (Factorisé)
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    
    console.log(`[ORGANIZATIONS] Récupération organisation ${sanitizedId}`);
    
    // ✅ VÉRIFICATION PERMISSIONS
    if (!canAccessOrganization(requestingUser, sanitizedId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette organisation'
      });
    }
    
    const organization = await prisma.organization.findUnique({
      where: { id: sanitizedId },
      include: {
        UserOrganization: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            },
            Role: {
              select: {
                id: true,
                name: true,
                label: true
              }
            }
          }
        },
        OrganizationModuleStatus: {
          include: {
            Module: true
          }
        },
        _count: {
          select: {
            UserOrganization: true,
            Role: true // ✅ AJOUT : Compter les rôles pour organisation individuelle
          }
        },
        Role: { // ✅ AJOUT : Inclure les rôles de l'organisation
          select: {
            id: true,
            name: true,
            label: true,
            isGlobal: true
          }
        },
        GoogleWorkspaceConfig: { // ✅ NOUVEAU : Inclure la configuration Google Workspace
          select: {
            id: true,
            isActive: true,
            domain: true
          }
        }
      }
    });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvée'
      });
    }
    
    // 🌟 ENRICHISSEMENT AVEC STATISTIQUES COMPLÈTES (Factorisé)
    const activeGoogleModules = getActiveGoogleModules(organization.OrganizationModuleStatus);
    const realActiveModulesCount = await countRealActiveModules(organization.id);
    
    console.log(`[DEBUG] Organisation individuelle ${organization.name}: ${realActiveModulesCount} modules réellement actifs`);
    
    const enrichedOrganization = {
      ...organization,
      stats: {
        totalUsers: organization._count?.UserOrganization ?? 0,
        totalRoles: organization._count?.Role ?? 0, // ✅ CORRIGÉ : Utilise le count direct des rôles
        activeModules: realActiveModulesCount, // ✅ DYNAMIQUE : Comptage réel en temps réel
        googleWorkspaceEnabled: hasGoogleWorkspaceEnabled(organization.OrganizationModuleStatus, organization.GoogleWorkspaceConfig)
      },
      googleWorkspaceDomain: organization.GoogleWorkspaceConfig?.domain || extractGoogleWorkspaceDomain(organization), // ✅ AMÉLIORÉ : Utiliser le vrai domaine de la config
      googleWorkspaceModules: activeGoogleModules.map(oms => oms.Module).filter(Boolean)
    };
    
    console.log('[ORGANIZATIONS] Organisation récupérée avec succès');
    
    res.json({
      success: true,
      data: enrichedOrganization
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur GET /:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'organisation'
    });
  }
});

// 🏷️ PUT /api/organizations/:id - SÉCURISÉ AVEC ZOD + SANITISATION + RATE LIMITING
router.put('/:id', requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] PUT /organizations/:id - Mise à jour organisation SÉCURISÉE');
  
  try {
    const { id } = req.params;
    console.log('🔍 [ORGANIZATIONS] ID reçu:', id);
    console.log('🔍 [ORGANIZATIONS] Body reçu:', JSON.stringify(req.body, null, 2));
    
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    
    // 🔍 VALIDATION ZOD
    const validation = organizationUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ [ORGANIZATIONS] Erreur validation Zod:', validation.error.errors);
      return res.status(400).json(handleZodError(validation.error));
    }
    
    console.log('✅ [ORGANIZATIONS] Validation Zod réussie');
    const data = validation.data;
    
    // 🧹 SANITISATION
    const updateData: {
      name?: string;
      description?: string | null;
      status?: string;
      website?: string | null;
      phone?: string | null;
      address?: string | null;
    } = {};
    if (data.name) updateData.name = sanitizeString(data.name);
    if (data.description !== undefined) {
      updateData.description = data.description ? sanitizeString(data.description) : null;
    }
    if (data.status) updateData.status = data.status;
    
    // 📞 NOUVEAUX CHAMPS DE CONTACT
    if (data.website !== undefined) {
      updateData.website = data.website ? sanitizeString(data.website) : null;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone ? sanitizeString(data.phone) : null;
    }
    if (data.address !== undefined) {
      updateData.address = data.address ? sanitizeString(data.address) : null;
    }
    
    console.log('[ORGANIZATIONS] Données de mise à jour sanitisées:', updateData);
    
    // ✅ VÉRIFICATION EXISTENCE
    const existingOrg = await prisma.organization.findUnique({
      where: { id: sanitizedId }
    });
    
    if (!existingOrg) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvée'
      });
    }
    
    // ✅ VÉRIFICATION UNICITÉ DU NOM (si changé)
    if (updateData.name && updateData.name !== existingOrg.name) {
      const duplicateOrg = await prisma.organization.findFirst({
        where: {
          name: {
            equals: updateData.name,
            mode: 'insensitive'
          },
          id: { not: sanitizedId }
        }
      });
      
      if (duplicateOrg) {
        return res.status(409).json({
          success: false,
          message: 'Une autre organisation avec ce nom existe déjà'
        });
      }
    }
    
    // 🔄 TRANSACTION SÉCURISÉE
    const updatedOrganization = await prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: sanitizedId },
        data: updateData
      });
      
      // 🌟 MISE À JOUR GOOGLE WORKSPACE SI NÉCESSAIRE
      if (data.googleWorkspace) {
        console.log('[ORGANIZATIONS] Mise à jour Google Workspace:', data.googleWorkspace);
        
        // Récupérer ou créer la configuration Google Workspace
        const existingConfig = await tx.googleWorkspaceConfig.findUnique({
          where: { organizationId: sanitizedId }
        });
        
        const googleWorkspaceData: {
          gmailEnabled?: boolean;
          calendarEnabled?: boolean;
          driveEnabled?: boolean;
          meetEnabled?: boolean;
          docsEnabled?: boolean;
          sheetsEnabled?: boolean;
          voiceEnabled?: boolean;
          enabled?: boolean;
          domain?: string;
          adminEmail?: string;
        } = {};
        
        // Gestion des modules Google Workspace
        if (data.googleWorkspace.modules) {
          const modules = data.googleWorkspace.modules;
          if (modules.gmail !== undefined) googleWorkspaceData.gmailEnabled = modules.gmail;
          if (modules.calendar !== undefined) googleWorkspaceData.calendarEnabled = modules.calendar;
          if (modules.drive !== undefined) googleWorkspaceData.driveEnabled = modules.drive;
          if (modules.meet !== undefined) googleWorkspaceData.meetEnabled = modules.meet;
          if (modules.docs !== undefined) googleWorkspaceData.docsEnabled = modules.docs;
          if (modules.sheets !== undefined) googleWorkspaceData.sheetsEnabled = modules.sheets;
          if (modules.voice !== undefined) googleWorkspaceData.voiceEnabled = modules.voice;
        }
        
        // Gestion de l'activation/désactivation
        if (data.googleWorkspace.enabled !== undefined) {
          googleWorkspaceData.enabled = data.googleWorkspace.enabled;
        }
        
        // Gestion du domaine et email admin
        if (data.googleWorkspace.domain) {
          googleWorkspaceData.domain = sanitizeString(data.googleWorkspace.domain);
        }
        if (data.googleWorkspace.adminEmail) {
          googleWorkspaceData.adminEmail = sanitizeString(data.googleWorkspace.adminEmail);
        }
        
        // Mettre à jour ou créer la configuration
        if (existingConfig) {
          await tx.googleWorkspaceConfig.update({
            where: { organizationId: sanitizedId },
            data: googleWorkspaceData
          });
        } else {
          await tx.googleWorkspaceConfig.create({
            data: {
              organizationId: sanitizedId,
              enabled: data.googleWorkspace.enabled || false,
              ...googleWorkspaceData
            }
          });
        }
      }
      
      return updated;
    });
    
    console.log('[ORGANIZATIONS] Organisation mise à jour avec succès');
    
    res.json({
      success: true,
      message: 'Organisation mise à jour avec succès',
      data: updatedOrganization
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur PUT:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json(handleZodError(error));
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour de l\'organisation'
    });
  }
});

// 🏷️ DELETE /api/organizations/:id - SÉCURISÉ + RATE LIMITING
router.delete('/:id', organizationsDeleteRateLimit, requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] DELETE /organizations/:id - Suppression organisation SÉCURISÉE');
  
  try {
    const { id } = req.params;
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    
    console.log(`[ORGANIZATIONS] Tentative suppression organisation ${sanitizedId}`);
    
    // ✅ VÉRIFICATION EXISTENCE
    const existingOrg = await prisma.organization.findUnique({
      where: { id: sanitizedId },
      include: {
        _count: {
          select: {
            UserOrganization: true
          }
        }
      }
    });
    
    if (!existingOrg) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvée'
      });
    }
    
    // ✅ VÉRIFICATION SÉCURITÉ - Empêcher suppression si utilisateurs
    if (existingOrg._count.UserOrganization > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une organisation ayant des utilisateurs'
      });
    }
    
    // 🔄 TRANSACTION SÉCURISÉE
    await prisma.$transaction(async (tx) => {
      // Supprimer d'abord les relations modules
      await tx.organizationModuleStatus.deleteMany({
        where: { organizationId: sanitizedId }
      });
      
      // Puis supprimer l'organisation
      await tx.organization.delete({
        where: { id: sanitizedId }
      });
    });
    
    console.log('[ORGANIZATIONS] Organisation supprimée avec succès');
    
    res.json({
      success: true,
      message: 'Organisation supprimée avec succès'
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur DELETE:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de l\'organisation'
    });
  }
});

// 🌟 ROUTES GOOGLE WORKSPACE - NOUVELLES FONCTIONNALITÉS AVANCÉES

// GET /api/organizations/:id/google-modules - Récupérer statut modules Google Workspace
router.get('/:id/google-modules', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] GET /organizations/:id/google-modules - Récupération modules Google');
  
  try {
    const { id } = req.params;
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    const requestingUser = req.user;
    
    // ✅ VÉRIFICATION PERMISSIONS
    if (!canAccessOrganization(requestingUser, sanitizedId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette organisation'
      });
    }
    
    // Récupérer tous les modules Google Workspace pour cette organisation
    const moduleStatuses = await prisma.organizationModuleStatus.findMany({
      where: {
        organizationId: sanitizedId,
        Module: {
          key: {
            in: [...GOOGLE_WORKSPACE_MODULES]
          }
        }
      },
      include: {
        Module: true
      }
    });
    
    // Structure des modules Google par défaut
    const defaultModules = {
      gmail: { enabled: false, configured: false },
      calendar: { enabled: false, configured: false },
      drive: { enabled: false, configured: false },
      meet: { enabled: false, configured: false },
      docs: { enabled: false, configured: false },
      sheets: { enabled: false, configured: false },
      voice: { enabled: false, configured: false }
    };
    
    // Mettre à jour avec les données de la base
    moduleStatuses.forEach(status => {
      if (status.Module?.key && defaultModules[status.Module.key as keyof typeof defaultModules]) {
        defaultModules[status.Module.key as keyof typeof defaultModules] = {
          enabled: status.active,
          configured: status.active // Simplifié pour le moment
        };
      }
    });
    
    res.json({
      success: true,
      data: defaultModules
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur GET google-modules:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des modules Google'
    });
  }
});

// POST /api/organizations/:id/google-modules/:module/toggle - Toggle module Google Workspace
router.post('/:id/google-modules/:module/toggle', requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] POST /organizations/:id/google-modules/:module/toggle - Toggle module Google');
  
  try {
    const { id, module } = req.params;
    const { enabled } = req.body;
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    const sanitizedModule = sanitizeString(module);
    
    // ✅ VALIDATION MODULE GOOGLE (Factorisé)
    if (!isGoogleWorkspaceModule(sanitizedModule)) {
      return res.status(400).json({
        success: false,
        message: 'Module Google Workspace invalide'
      });
    }
    
    // ✅ VALIDATION ENABLED
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre enabled doit être un booléen'
      });
    }
    
    console.log(`[ORGANIZATIONS] Toggle module ${sanitizedModule} à ${enabled} pour organisation ${sanitizedId}`);
    
    // 🔄 TRANSACTION SÉCURISÉE
    await prisma.$transaction(async (tx) => {
      // Trouver ou créer le module
      let moduleRecord = await tx.module.findFirst({
        where: { key: sanitizedModule }
      });
      
      if (!moduleRecord) {
        // Créer le module s'il n'existe pas
        moduleRecord = await tx.module.create({
          data: {
            key: sanitizedModule,
            label: sanitizedModule.charAt(0).toUpperCase() + sanitizedModule.slice(1),
            feature: `google_${sanitizedModule}`,
            active: true,
            order: GOOGLE_WORKSPACE_MODULES.indexOf(sanitizedModule as GoogleWorkspaceModule)
          }
        });
      }
      
      // Mettre à jour ou créer le statut du module pour l'organisation
      await tx.organizationModuleStatus.upsert({
        where: {
          organizationId_moduleId: {
            organizationId: sanitizedId,
            moduleId: moduleRecord.id
          }
        },
        update: {
          active: enabled
        },
        create: {
          organizationId: sanitizedId,
          moduleId: moduleRecord.id,
          active: enabled
        }
      });
    });
    
    console.log('[ORGANIZATIONS] Module Google mis à jour avec succès');
    
    res.json({
      success: true,
      message: `Module ${sanitizedModule} ${enabled ? 'activé' : 'désactivé'} avec succès`
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur POST google-modules toggle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du module Google'
    });
  }
});

// GET /api/organizations/:id/google-workspace/domain-status - Vérifier le statut du domaine pour Google Workspace
router.get('/:id/google-workspace/domain-status', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[ORGANIZATIONS] GET /organizations/:id/google-workspace/domain-status - Vérification statut domaine');
  
  try {
    const { id } = req.params;
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    const requestingUser = req.user;
    
    // ✅ VÉRIFICATION PERMISSIONS
    if (!canAccessOrganization(requestingUser, sanitizedId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette organisation'
      });
    }
    
    // Récupérer l'organisation
    const organization = await prisma.organization.findUnique({
      where: { id: sanitizedId }
    });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvée'
      });
    }
    
    // Récupérer la configuration Google Workspace pour obtenir le vrai domaine
    const googleConfig = await prisma.googleWorkspaceConfig.findUnique({
      where: { organizationId: sanitizedId }
    });
    
    // Utiliser le domaine configuré dans Google Workspace, ou un domaine par défaut
    const domain = googleConfig?.domain || '2thier.be';
    
    // Générer les enregistrements DNS requis
    const requiredRecords = {
      verification: {
        type: 'TXT',
        name: '@',
        value: `google-site-verification=ABC123XYZ${Date.now().toString().slice(-6)}`
      },
      mx: [
        { priority: 1, server: 'aspmx.l.google.com.' },
        { priority: 5, server: 'alt1.aspmx.l.google.com.' },
        { priority: 5, server: 'alt2.aspmx.l.google.com.' },
        { priority: 10, server: 'alt3.aspmx.l.google.com.' },
        { priority: 10, server: 'alt4.aspmx.l.google.com.' }
      ],
      security: {
        spf: 'v=spf1 include:_spf.google.com ~all',
        dmarc: 'v=DMARC1; p=quarantine; rua=mailto:admin@' + domain
      }
    };
    
    // Pour l'instant, considérer que le domaine n'est pas configuré
    // Dans une vraie implémentation, on ferait des requêtes DNS réelles
    const isConfigured = false;
    
    console.log('[ORGANIZATIONS] Statut domaine calculé:', { domain, isConfigured });
    
    res.json({
      success: true,
      data: {
        domain,
        isConfigured,
        requiredRecords: isConfigured ? null : requiredRecords
      }
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur GET domain-status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification du domaine'
    });
  }
});

export default router;

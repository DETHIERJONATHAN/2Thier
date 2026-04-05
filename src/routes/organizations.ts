import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { db, Prisma } from '../lib/database';
import { UserOrganizationStatus } from '@prisma/client';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

// ✅ PLUS BESOIN D'INTERFACE LOCALE - UTILISATION DE L'INTERFACE CENTRALISÉE

const router = Router();
const prisma = db;

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
  // Vérifier si c'est Google Workspace en regardant GoogleWorkspaceConfig
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { 
      GoogleWorkspaceConfig: true, 
      name: true 
    }
  });
  
  const hasGoogleWorkspace = !!organization?.GoogleWorkspaceConfig;
  
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
  
  // Filtrer les modules réellement actifs pour cette organisation
  const activeModulesForOrg = allActiveModules.filter(module => {
    const moduleStatus = module.OrganizationModuleStatus[0];
    
    // Si c'est un module Google et que Google Workspace n'est pas activé
    if (module.key && module.key.toLowerCase().startsWith('google_') && !hasGoogleWorkspace) {
      return false;
    }
    
    if (moduleStatus) {
      return moduleStatus.active;
    } else {
      return true; // Pas de statut spécifique = actif par défaut
    }
  });
  
  return activeModulesForOrg.length;
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

// 🧹 SUPPRESSION PROFONDE DES DONNÉES LIÉES À UNE ORGANISATION AVANT LA SUPPRESSION
const cleanupOrganizationData = async (tx: Prisma.TransactionClient, organizationId: string): Promise<void> => {
  const runDelete = async (label: string, action: () => Promise<unknown>) => {
    try {
      
      await action();
    } catch (error) {
      console.error(`[ORGANIZATIONS] ❌ Échec suppression ${label} pour ${organizationId}`, error);
      throw error;
    }
  };

  await runDelete('CalendarParticipant', () => tx.calendarParticipant.deleteMany({
    where: {
      CalendarEvent: {
        organizationId
      }
    }
  }));

  await runDelete('FormSubmission', () => tx.formSubmission.deleteMany({
    where: {
      Block: {
        organizationId
      }
    }
  }));

  await runDelete('AIRecommendation', () => tx.aIRecommendation.deleteMany({ where: { organizationId } }));
  await runDelete('AdCampaign', () => tx.adCampaign.deleteMany({ where: { organizationId } }));
  await runDelete('AdPlatformIntegration', () => tx.adPlatformIntegration.deleteMany({ where: { organizationId } }));
  await runDelete('AnalyticsEvent', () => tx.analyticsEvent.deleteMany({ where: { organizationId } }));
  await runDelete('AutomationRule', () => tx.automationRule.deleteMany({ where: { organizationId } }));
  await runDelete('AiUsageLog', () => tx.aiUsageLog.deleteMany({ where: { organizationId } }));
  await runDelete('CallToLeadMapping', () => tx.callToLeadMapping.deleteMany({ where: { organizationId } }));
  await runDelete('CallStatus', () => tx.callStatus.deleteMany({ where: { organizationId } }));
  await runDelete('Category', () => tx.category.deleteMany({ where: { organizationId } }));
  await runDelete('GoogleMailWatch', () => tx.googleMailWatch.deleteMany({ where: { organizationId } }));
  await runDelete('GoogleToken', () => tx.googleToken.deleteMany({ where: { organizationId } }));
  await runDelete('GoogleVoiceCall', () => tx.googleVoiceCall.deleteMany({ where: { organizationId } }));
  await runDelete('GoogleVoiceConfig', () => tx.googleVoiceConfig.deleteMany({ where: { organizationId } }));
  await runDelete('GoogleVoiceSMS', () => tx.googleVoiceSMS.deleteMany({ where: { organizationId } }));
  await runDelete('GoogleWorkspaceConfig', () => tx.googleWorkspaceConfig.deleteMany({ where: { organizationId } }));
  await runDelete('IntegrationsSettings', () => tx.integrationsSettings.deleteMany({ where: { organizationId } }));
  await runDelete('Invitation', () => tx.invitation.deleteMany({ where: { organizationId } }));
  await runDelete('Lead', () => tx.lead.deleteMany({ where: { organizationId } }));
  await runDelete('LeadSource', () => tx.leadSource.deleteMany({ where: { organizationId } }));
  await runDelete('LeadStatus', () => tx.leadStatus.deleteMany({ where: { organizationId } }));
  await runDelete('Module', () => tx.module.deleteMany({ where: { organizationId } }));
  await runDelete('Notification', () => tx.notification.deleteMany({ where: { organizationId } }));
  await runDelete('Order', () => tx.order.deleteMany({ where: { organizationId } }));
  await runDelete('OrganizationModuleStatus', () => tx.organizationModuleStatus.deleteMany({ where: { organizationId } }));
  await runDelete('OrganizationRoleStatus', () => tx.organizationRoleStatus.deleteMany({ where: { organizationId } }));
  await runDelete('Permission', () => tx.permission.deleteMany({ where: { organizationId } }));
  await runDelete('Product', () => tx.product.deleteMany({ where: { organizationId } }));
  await runDelete('Role', () => tx.role.deleteMany({ where: { organizationId } }));
  await runDelete('TechnicalData', () => tx.technicalData.deleteMany({ where: { organizationId } }));
  await runDelete('TelnyxCall', () => tx.telnyxCall.deleteMany({ where: { organizationId } }));
  await runDelete('TelnyxConnection', () => tx.telnyxConnection.deleteMany({ where: { organizationId } }));
  await runDelete('TelnyxMessage', () => tx.telnyxMessage.deleteMany({ where: { organizationId } }));
  await runDelete('TelnyxPhoneNumber', () => tx.telnyxPhoneNumber.deleteMany({ where: { organizationId } }));
  await runDelete('TelnyxUserConfig', () => tx.telnyxUserConfig.deleteMany({ where: { organizationId } }));
  await runDelete('TimelineEvent', () => tx.timelineEvent.deleteMany({ where: { organizationId } }));
  await runDelete('TreeBranchLeafNodeCondition', () => tx.treeBranchLeafNodeCondition.deleteMany({ where: { organizationId } }));
  await runDelete('TreeBranchLeafNodeFormula', () => tx.treeBranchLeafNodeFormula.deleteMany({ where: { organizationId } }));
  await runDelete('TreeBranchLeafNodeTable', () => tx.treeBranchLeafNodeTable.deleteMany({ where: { organizationId } }));
  await runDelete('TreeBranchLeafMarker', () => tx.treeBranchLeafMarker.deleteMany({ where: { organizationId } }));
  await runDelete('TreeBranchLeafTree', () => tx.treeBranchLeafTree.deleteMany({ where: { organizationId } }));
  await runDelete('EcommerceIntegration', () => tx.ecommerceIntegration.deleteMany({ where: { organizationId } }));
  await runDelete('EmailAccount', () => tx.emailAccount.deleteMany({ where: { organizationId } }));
  await runDelete('EmailDomain', () => tx.emailDomain.deleteMany({ where: { organizationId } }));
  await runDelete('EmailTemplate', () => tx.emailTemplate.deleteMany({ where: { organizationId } }));
  await runDelete('CalendarEvent', () => tx.calendarEvent.deleteMany({ where: { organizationId } }));
  await runDelete('Block', () => tx.block.deleteMany({ where: { organizationId } }));
  await runDelete('UserOrganization', () => tx.userOrganization.deleteMany({ where: { organizationId } }));
};

// 🔒 VALIDATION ZOD ULTRA-STRICTE
const organizationCreateSchema = z.object({
  name: z.string()
    .min(2, 'Nom organisation minimum 2 caractères')
    .max(100, 'Nom organisation maximum 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_'.&(),]+$/, 'Nom organisation contient des caractères non autorisés'),
  description: z.string()
    .max(500, 'Description maximum 500 caractères')
    .optional(),
  status: z.string()
    .transform(s => s.toUpperCase())
    .pipe(z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: 'Statut doit être ACTIVE ou INACTIVE' })
    })).optional(),
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
  vatNumber: z.string()
    .max(30, 'Numéro de TVA maximum 30 caractères')
    .optional(),
  email: z.string()
    .email('Email invalide')
    .max(255, 'Email maximum 255 caractères')
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
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_'.&(),]+$/, 'Nom organisation contient des caractères non autorisés')
    .optional(),
  description: z.string()
    .max(500, 'Description maximum 500 caractères')
    .nullish(),
  status: z.string()
    .transform(s => s.toUpperCase())
    .pipe(z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: 'Statut doit être ACTIVE ou INACTIVE' })
    })).optional(),
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
  // Champs facturation
  vatNumber: z.string()
    .max(30, 'Numéro TVA maximum 30 caractères')
    .nullish(),
  legalName: z.string()
    .max(200, 'Nom légal maximum 200 caractères')
    .nullish(),
  iban: z.string()
    .max(40, 'IBAN maximum 40 caractères')
    .nullish(),
  bankAccountHolder: z.string()
    .max(200, 'Titulaire du compte maximum 200 caractères')
    .nullish(),
  email: z.string()
    .email('Email invalide')
    .max(255, 'Email maximum 255 caractères')
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

// ============================================================================
// 🌐 ROUTES PUBLIQUES (SANS AUTHENTIFICATION)
// ============================================================================

/**
 * GET /api/organizations/public
 * Retourne la liste des organisations publiques pour le dropdown d'inscription
 * Route accessible SANS authentification (pour inscription type "joinOrg")
 */
router.get('/public', async (_req, res) => {
  try {
    const organizations = await prisma.organization.findMany({
      where: {
        status: { in: ['ACTIVE', 'active'] }
      },
      select: {
        id: true,
        name: true,
        description: true,
        // Optionnel: nombre de membres pour affichage
        _count: {
          select: {
            UserOrganization: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Formater pour le frontend
    const publicOrgs = organizations.map(org => ({
      id: org.id,
      name: org.name,
      description: org.description || undefined,
      memberCount: org._count?.UserOrganization || 0
    }));


    res.json({
      success: true,
      data: publicOrgs
    });

  } catch (error) {
    console.error('[Organizations] Erreur /public:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// 🟢 GET /api/organizations/public/:id — Profil public d'une Colony
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'ID requis' });

    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        email: true,
        phone: true,
        website: true,
        logoUrl: true,
        coverUrl: true,
        coverPositionY: true,
        vatNumber: true,
        createdAt: true,
        _count: {
          select: {
            UserOrganization: { where: { status: 'ACTIVE' } },
            WallPost: true,
          }
        },
        UserOrganization: {
          where: { status: 'ACTIVE' },
          select: {
            User: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true }
            },
            Role: { select: { name: true, label: true } }
          },
          orderBy: { createdAt: 'asc' },
          take: 20
        }
      }
    });

    if (!org) {
      return res.status(404).json({ success: false, error: 'Colony non trouvée' });
    }

    const members = org.UserOrganization.map(uo => ({
      id: uo.User.id,
      firstName: uo.User.firstName,
      lastName: uo.User.lastName,
      avatarUrl: uo.User.avatarUrl,
      role: uo.Role?.label || uo.Role?.name || 'Membre',
    }));

    res.json({
      success: true,
      data: {
        id: org.id,
        name: org.name,
        description: org.description,
        address: org.address,
        email: org.email,
        phone: org.phone,
        website: org.website,
        logoUrl: org.logoUrl,
        coverUrl: org.coverUrl,
        coverPositionY: org.coverPositionY ?? 50,
        vatNumber: org.vatNumber,
        createdAt: org.createdAt,
        memberCount: org._count.UserOrganization,
        postCount: org._count.WallPost,
        members,
      }
    });
  } catch (error) {
    console.error('[Organizations] Erreur /public/:id:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================================
// 🔒 ROUTES AUTHENTIFIÉES
// ============================================================================

// Appliquer l'authentification et rate limiting
router.use(authMiddleware);
router.use(organizationsRateLimit);

// 🟢 GET /api/organizations/active - SEULEMENT LES ORGANISATIONS ACTIVES
router.get('/active', async (req: AuthenticatedRequest, res) => {
  
  
  try {
    const requestingUser = req.user;
    const { search, userId } = req.query;
    
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
      
    } else if (requestingUser?.role === 'admin' && requestingUser.organizationId) {
      // Admin voit seulement son organisation SI elle est active
      where.id = requestingUser.organizationId;
      
    } else if (requestingUser?.organizationId) {
      // Utilisateur normal voit seulement son organisation SI elle est active
      where.id = requestingUser.organizationId;
      
    } else {
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
  
  
  try {
    const requestingUser = req.user;
    const { search, userId } = req.query;
    
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
      
    } else if (requestingUser?.role === 'admin' && requestingUser.organizationId) {
      // Admin voit seulement son organisation
      where.id = requestingUser.organizationId;
      
    } else {
      
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
  
  
  try {
    // 🔍 VALIDATION ZOD ULTRA-STRICTE
    const validation = organizationCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(handleZodError(validation.error));
    }
    
    const data = validation.data;
    
    // 🧹 SANITISATION SUPPLÉMENTAIRE
    const sanitizedData = {
      name: sanitizeString(data.name),
      description: data.description ? sanitizeString(data.description) : null,
      status: (data.status || 'ACTIVE').toUpperCase(),
      // 📞 CHAMPS DE CONTACT
      website: data.website ? sanitizeString(data.website) : null,
      phone: data.phone ? sanitizeString(data.phone) : null,
      address: data.address ? sanitizeString(data.address) : null,
      vatNumber: data.vatNumber ? sanitizeString(data.vatNumber) : null,
      email: data.email ? sanitizeString(data.email) : null,
    };

    
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
    const now = new Date();
    const generatedId = randomUUID();

    const newOrganization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          id: generatedId,
          name: sanitizedData.name,
          description: sanitizedData.description,
          status: sanitizedData.status,
          website: sanitizedData.website,
          phone: sanitizedData.phone,
          address: sanitizedData.address,
          vatNumber: sanitizedData.vatNumber,
          email: sanitizedData.email,
          createdAt: now,
          updatedAt: now
        }
      });
      
      // 🌟 CONFIGURATION GOOGLE WORKSPACE SI ACTIVÉE
      if (data.googleWorkspace?.enabled) {
        
        // Ici on pourrait ajouter la logique pour créer la configuration Google Workspace
        // pour l'instant on log juste
      }
      
      return org;
    });
    
    
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
  
  
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // 🧹 VALIDATION + SANITISATION ID (Factorisé)
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    
    
    
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
  
  
  try {
    const { id } = req.params;
    
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    
    // 🔍 VALIDATION ZOD
    const validation = organizationUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ [ORGANIZATIONS] Erreur validation Zod:', validation.error.errors);
      return res.status(400).json(handleZodError(validation.error));
    }
    
    const data = validation.data;
    
    // 🧹 SANITISATION
    const updateData: {
      name?: string;
      description?: string | null;
      status?: string;
      website?: string | null;
      phone?: string | null;
      address?: string | null;
      vatNumber?: string | null;
      legalName?: string | null;
      iban?: string | null;
      bankAccountHolder?: string | null;
      email?: string | null;
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

    // 🧾 CHAMPS FACTURATION
    if (data.vatNumber !== undefined) {
      updateData.vatNumber = data.vatNumber ? sanitizeString(data.vatNumber) : null;
    }
    if (data.legalName !== undefined) {
      updateData.legalName = data.legalName ? sanitizeString(data.legalName) : null;
    }
    if (data.iban !== undefined) {
      updateData.iban = data.iban ? sanitizeString(data.iban) : null;
    }
    if (data.bankAccountHolder !== undefined) {
      updateData.bankAccountHolder = data.bankAccountHolder ? sanitizeString(data.bankAccountHolder) : null;
    }
    if (data.email !== undefined) {
      updateData.email = data.email ? sanitizeString(data.email) : null;
    }
    
    
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
  
  
  try {
    const { id } = req.params;
    const sanitizedId = validateAndSanitizeId(id, 'ID organisation');
    
    
    
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
    
    // 🔄 TRANSACTION SÉCURISÉE AVEC NETTOYAGE COMPLET
    await prisma.$transaction(async (tx) => {
      await cleanupOrganizationData(tx, sanitizedId);
      await tx.organization.delete({
        where: { id: sanitizedId }
      });
    });
    
    
    
    res.json({
      success: true,
      message: 'Organisation supprimée avec succès'
    });
    
  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur DELETE:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return res.status(409).json({
          success: false,
          message: 'Impossible de supprimer cette organisation tant que des données associées existent (modules, rôles, configurations, etc.).'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de l\'organisation'
    });
  }
});

// 🌟 ROUTES GOOGLE WORKSPACE - NOUVELLES FONCTIONNALITÉS AVANCÉES

// GET /api/organizations/:id/google-modules - Récupérer statut modules Google Workspace
router.get('/:id/google-modules', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  
  
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

// ============================================================================
// POST /api/organizations/create-my-org — Free user crée sa propre organisation
// Accessible à tout utilisateur authentifié qui n'a PAS encore d'organisation
// ============================================================================
const createMyOrgSchema = z.object({
  name: z.string()
    .min(2, 'Nom organisation minimum 2 caractères')
    .max(100, 'Nom organisation maximum 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_'.&(),]+$/, 'Nom organisation contient des caractères non autorisés'),
  address: z.string()
    .min(5, 'Adresse minimum 5 caractères')
    .max(500, 'Adresse maximum 500 caractères'),
  vatNumber: z.string()
    .min(2, 'Numéro de TVA minimum 2 caractères')
    .max(30, 'Numéro de TVA maximum 30 caractères'),
  phone: z.string()
    .min(5, 'Téléphone minimum 5 caractères')
    .max(20, 'Téléphone maximum 20 caractères')
    .regex(/^[\d\s\-+().]+$/, 'Numéro de téléphone contient des caractères non autorisés'),
  email: z.string()
    .email('Adresse email invalide')
    .max(255, 'Email maximum 255 caractères'),
  description: z.string()
    .max(500, 'Description maximum 500 caractères')
    .optional(),
});

const createMyOrgRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 tentatives par heure
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Trop de tentatives. Réessayez dans 1 heure.'
    });
  }
});

router.post('/create-my-org', createMyOrgRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    // Vérifier que l'utilisateur n'est pas déjà admin/fondateur d'une organisation
    const existingAdminMembership = await prisma.userOrganization.findFirst({
      where: { userId },
      include: { Role: true }
    });
    if (existingAdminMembership && existingAdminMembership.Role?.name === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà fondateur d\'une Colony'
      });
    }

    // Validation
    const validation = createMyOrgSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors.map(e => e.message).join(', ')
      });
    }

    const data = validation.data;

    // Vérification unicité du nom
    const existingOrg = await prisma.organization.findFirst({
      where: { name: { equals: sanitizeString(data.name), mode: 'insensitive' } }
    });
    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: 'Une organisation avec ce nom existe déjà'
      });
    }

    const now = new Date();
    const orgId = randomUUID();

    // Transaction : créer l'org + rôles + associer l'utilisateur comme admin
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          id: orgId,
          name: sanitizeString(data.name),
          address: sanitizeString(data.address),
          vatNumber: sanitizeString(data.vatNumber),
          phone: sanitizeString(data.phone),
          email: sanitizeString(data.email),
          description: data.description ? sanitizeString(data.description) : null,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }
      });

      // Créer le rôle admin pour cette organisation
      const adminRole = await tx.role.create({
        data: {
          id: randomUUID(),
          name: 'admin',
          label: 'Administrateur',
          organizationId: orgId,
          updatedAt: now,
        }
      });

      // Créer le rôle user par défaut
      await tx.role.create({
        data: {
          id: randomUUID(),
          name: 'user',
          label: 'Utilisateur',
          organizationId: orgId,
          updatedAt: now,
        }
      });

      // Associer l'utilisateur à l'organisation en tant qu'admin
      await tx.userOrganization.create({
        data: {
          id: randomUUID(),
          userId,
          organizationId: orgId,
          roleId: adminRole.id,
          status: UserOrganizationStatus.ACTIVE,
          updatedAt: now,
        }
      });

      return org;
    });


    res.status(201).json({
      success: true,
      message: `Organisation "${result.name}" créée avec succès. Vous en êtes l'administrateur.`,
      organization: { id: result.id, name: result.name }
    });

  } catch (error) {
    console.error('[ORGANIZATIONS] Erreur create-my-org:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Une organisation avec ce nom existe déjà'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de l\'organisation'
    });
  }
});

// 📸 POST /api/organizations/:id/logo - Upload logo de l'organisation
router.post('/:id/logo', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    // Vérifier que l'utilisateur a accès à cette organisation
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId, organizationId: id },
      include: { Role: true },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isSuperAdmin = user?.role === 'super_admin';
    if (!userOrg && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const files = (req as any).files;
    if (!files || !files.logo) {
      return res.status(400).json({ success: false, message: 'Aucun fichier uploadé. Envoyez un champ "logo".' });
    }

    const file = files.logo;
    // Valider le type MIME
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF, WEBP ou SVG.' });
    }
    // Limite 5MB
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Le fichier ne doit pas dépasser 5 Mo.' });
    }

    const path = await import('path');
    const { uploadExpressFile } = await import('../lib/storage');

    const ext = path.default.extname(file.name);
    const finalName = `${id}_${Date.now()}${ext}`;
    const key = `org-logos/${finalName}`;

    const logoUrl = await uploadExpressFile(file, key);

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: { logoUrl },
      select: { id: true, name: true, logoUrl: true },
    });

    res.json({ success: true, data: updatedOrg });
  } catch (error) {
    console.error('❌ [POST /api/organizations/:id/logo] Erreur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'upload du logo' });
  }
});

// 📸 POST /api/organizations/:id/cover - Upload cover de l'organisation
router.post('/:id/cover', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId, organizationId: id },
      include: { Role: true },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isSuperAdmin = user?.role === 'super_admin';
    if (!userOrg && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const files = (req as any).files;
    if (!files || !files.cover) {
      return res.status(400).json({ success: false, message: 'Aucun fichier uploadé. Envoyez un champ "cover".' });
    }

    const file = files.cover;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WEBP.' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Le fichier ne doit pas dépasser 10 Mo.' });
    }

    const path = await import('path');
    const { uploadExpressFile } = await import('../lib/storage');

    const ext = path.default.extname(file.name);
    const finalName = `${id}_cover_${Date.now()}${ext}`;
    const key = `org-covers/${finalName}`;

    const coverUrl = await uploadExpressFile(file, key);

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: { coverUrl, coverPositionY: 50 },
      select: { id: true, name: true, coverUrl: true, coverPositionY: true },
    });

    res.json({ success: true, data: updatedOrg });
  } catch (error) {
    console.error('❌ [POST /api/organizations/:id/cover] Erreur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'upload de la couverture' });
  }
});

// 📐 PUT /api/organizations/:id/cover-position - Repositionner la cover
router.put('/:id/cover-position', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId, organizationId: id },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isSuperAdmin = user?.role === 'super_admin';
    if (!userOrg && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const posY = Number(req.body?.positionY);
    if (isNaN(posY) || posY < 0 || posY > 100) {
      return res.status(400).json({ success: false, message: 'positionY doit être entre 0 et 100' });
    }

    await prisma.organization.update({
      where: { id },
      data: { coverPositionY: posY },
    });

    res.json({ success: true, positionY: posY });
  } catch (error) {
    console.error('❌ [PUT /api/organizations/:id/cover-position] Erreur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;

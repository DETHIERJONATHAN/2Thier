import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import invitationRoutes from './invitations.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

// Type pour les requêtes authentifiées
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId?: string;
    isSuperAdmin?: boolean;
  };
}

const router = Router();
const prisma = new PrismaClient();

// 🧹 SANITISATION SIMPLE (sans DOMPurify)
const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Supprime < et >
};

// 🔒 VALIDATION ZOD ULTRA-STRICTE
const userUpdateSchema = z.object({
  roleId: z.string().uuid('ID rôle invalide').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Statut doit être ACTIVE ou INACTIVE' })
  }).optional()
});

const userOrganizationSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
  organizationId: z.string().uuid('ID organisation invalide'),
  roleId: z.string().uuid('ID rôle invalide')
});

// 🛡️ RATE LIMITING ADAPTÉ
const usersRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requêtes max
  message: { 
    success: false, 
    message: 'Trop de requêtes utilisateurs, réessayez plus tard' 
  }
});

const usersModifyRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 modifications max
  message: { 
    success: false, 
    message: 'Trop de modifications utilisateurs, réessayez plus tard' 
  }
});

// 🔧 GESTION ERREURS ZOD CENTRALISÉE
const handleZodError = (error: z.ZodError) => {
  return {
    success: false,
    message: 'Données invalides',
    errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
};

// Appliquer l'authentification et rate limiting
router.use(authMiddleware);
router.use(usersRateLimit);

// Monter les routes d'invitations sous /users/invitations
router.use('/invitations', invitationRoutes);

// 🏷️ GET /api/users/free - SÉCURISÉ AVEC ZOD + SANITISATION
router.get('/free', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  console.log('[USERS] GET /users/free - Récupération utilisateurs libres SÉCURISÉE');
  
  try {
    const freeUsers = await prisma.user.findMany({
      where: {
        UserOrganization: {
          none: {}
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`[USERS] Found ${freeUsers.length} free users`);
    res.json({ success: true, data: freeUsers });
  } catch (error) {
    console.error('[USERS] Erreur récupération utilisateurs libres:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la récupération des utilisateurs libres' 
    });
  }
});

// 🏷️ GET /api/users - SÉCURISÉ AVEC LOGIQUE SUPER ADMIN
router.get('/', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  console.log('[USERS] GET /users - Récupération utilisateurs SÉCURISÉE');
  
  try {
    const sessionUser = req.user;

    // LOGIQUE SUPERADMIN - Montrer TOUS les utilisateurs
    if (sessionUser?.isSuperAdmin) {
      console.log('[USERS] SuperAdmin request - showing ALL users');
      
      const allUsers = await prisma.user.findMany({
        include: {
          UserOrganization: {
            include: {
              Role: true,
              Organization: {
                include: {
                  googleWorkspaceConfig: true
                }
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`[USERS] Found ${allUsers.length} total users for SuperAdmin`);
      return res.json({ success: true, data: allUsers });
    }

    // LOGIQUE UTILISATEUR NORMAL - Organisation uniquement
    const organizationId = sessionUser?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: "L'ID de l'organisation est manquant" 
      });
    }

    console.log(`[USERS] Standard user request - org: ${organizationId}`);
    
    const usersInOrg = await prisma.user.findMany({
      where: {
        UserOrganization: {
          some: { organizationId }
        }
      },
      include: {
        UserOrganization: {
          where: { organizationId },
          include: {
            Role: true,
            Organization: {
              include: {
                googleWorkspaceConfig: true
              }
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[USERS] Found ${usersInOrg.length} users for org ${organizationId}`);
    res.json({ success: true, data: usersInOrg });

  } catch (error) {
    console.error('[USERS] Erreur récupération utilisateurs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    });
  }
});

// 🏷️ GET /api/users/:userId/organizations - SÉCURISÉ
router.get('/:userId/organizations', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[USERS] GET /users/${userId}/organizations - SÉCURISÉ`);
  
  try {
    // Validation UUID
    if (!userId || !z.string().uuid().safeParse(userId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    const userOrganizations = await prisma.userOrganization.findMany({
      where: { userId: sanitizeString(userId) },
      include: {
        Organization: true,
        Role: true,
      },
      orderBy: {
        Organization: { name: 'asc' }
      }
    });
    
    console.log(`[USERS] Found ${userOrganizations.length} organizations for user ${userId}`);
    res.json({ success: true, data: userOrganizations });
  } catch (error) {
    console.error(`[USERS] Erreur organisations utilisateur ${userId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur interne du serveur" 
    });
  }
});

// 🏷️ POST /api/users/user-organizations - SÉCURISÉ AVEC ZOD
router.post('/user-organizations', usersModifyRateLimit, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  console.log('[USERS] POST /users/user-organizations - Assignation SÉCURISÉE');
  
  try {
    // Validation Zod
    const validation = userOrganizationSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('[USERS] Validation échouée:', validation.error);
      return res.status(400).json(handleZodError(validation.error));
    }

    const { userId, organizationId, roleId } = validation.data;

    // Vérifier si l'assignation existe déjà
    const existingAssignment = await prisma.userOrganization.findFirst({
      where: { userId, organizationId }
    });

    if (existingAssignment) {
      return res.status(409).json({ 
        success: false, 
        message: "L'utilisateur est déjà dans cette organisation" 
      });
    }

    const newUserOrganization = await prisma.userOrganization.create({
      data: {
        userId,
        organizationId,
        roleId,
        status: 'ACTIVE'
      },
      include: {
        Organization: true,
        Role: true,
      }
    });

    console.log(`[USERS] Assignation réussie: user ${userId} → org ${organizationId}`);
    res.status(201).json({ success: true, data: newUserOrganization });
  } catch (error) {
    console.error('[USERS] Erreur assignation utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur interne du serveur" 
    });
  }
});

// 🏷️ PATCH /api/users/user-organizations/:userOrganizationId - SÉCURISÉ AVEC ZOD
router.patch('/user-organizations/:userOrganizationId', usersModifyRateLimit, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const { userOrganizationId } = req.params;
  console.log(`[USERS] PATCH /users/user-organizations/${userOrganizationId} - SÉCURISÉ`);
  
  try {
    // Validation UUID param
    if (!userOrganizationId || !z.string().uuid().safeParse(userOrganizationId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID relation utilisateur-organisation invalide'
      });
    }

    // Validation Zod body
    const validation = userUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('[USERS] Validation échouée:', validation.error);
      return res.status(400).json(handleZodError(validation.error));
    }

    const { roleId, status } = validation.data;
    const updateData: Partial<{ roleId: string; status: 'ACTIVE' | 'INACTIVE' }> = {};
    if (roleId) updateData.roleId = roleId;
    if (status) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Aucune donnée de mise à jour fournie" 
      });
    }

    const updatedUserOrganization = await prisma.userOrganization.update({
      where: { id: sanitizeString(userOrganizationId) },
      data: updateData,
      include: {
        Organization: true,
        Role: true,
        User: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    console.log(`[USERS] Mise à jour réussie: relation ${userOrganizationId}`);
    res.json({ success: true, data: updatedUserOrganization });
  } catch (error) {
    console.error('[USERS] Erreur mise à jour utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur interne du serveur" 
    });
  }
});

// 🏷️ DELETE /api/users/user-organizations/:userOrganizationId - SÉCURISÉ
router.delete('/user-organizations/:userOrganizationId', usersModifyRateLimit, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const { userOrganizationId } = req.params;
  console.log(`[USERS] DELETE /users/user-organizations/${userOrganizationId} - SÉCURISÉ`);
  
  try {
    // Validation UUID
    if (!userOrganizationId || !z.string().uuid().safeParse(userOrganizationId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID relation utilisateur-organisation invalide'
      });
    }

    // Vérifier si l'utilisateur a d'autres organisations
    const relationToDelete = await prisma.userOrganization.findUnique({
      where: { id: sanitizeString(userOrganizationId) },
      select: { userId: true }
    });

    if (!relationToDelete) {
      return res.status(404).json({ 
        success: false, 
        message: "Relation non trouvée" 
      });
    }

    const remainingRelations = await prisma.userOrganization.count({
      where: {
        userId: relationToDelete.userId,
        id: { not: sanitizeString(userOrganizationId) }
      }
    });

    if (remainingRelations === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Impossible de supprimer la dernière organisation de l'utilisateur" 
      });
    }

    await prisma.userOrganization.delete({
      where: { id: sanitizeString(userOrganizationId) }
    });

    console.log(`[USERS] Suppression relation réussie: ${userOrganizationId}`);
    res.json({ success: true, message: "Utilisateur retiré de l'organisation avec succès" });
  } catch (error) {
    console.error('[USERS] Erreur suppression relation:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur interne du serveur" 
    });
  }
});

// 🏷️ PATCH /api/users/:userId - Modifier les informations utilisateur
router.patch('/:userId', usersModifyRateLimit, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  
  console.log(`[USERS] PATCH /users/${userId} - Modification informations utilisateur`);
  
  try {
    // Schéma de validation pour les informations utilisateur
    const userInfoSchema = z.object({
      firstName: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long').optional(),
      lastName: z.string().min(1, 'Nom requis').max(50, 'Nom trop long').optional(),
      email: z.string().email('Email invalide').optional(),
      phoneNumber: z.string().nullable().optional(),
      address: z.string().nullable().optional(), 
      vatNumber: z.string().nullable().optional(),
      avatarUrl: z.string().url('URL avatar invalide').nullable().optional()
    });

    // Validation des données
    const validationResult = userInfoSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('[USERS] Validation error:', validationResult.error.errors);
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validationResult.error.errors
      });
    }

    const updateData = validationResult.data;
    const sessionUser = req.user;

    // Vérifier que l'utilisateur existe
    const userToUpdate = await prisma.user.findUnique({
      where: { id: sanitizeString(userId) }
    });

    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérification des permissions
    if (!sessionUser?.isSuperAdmin) {
      // Les admins ne peuvent modifier que les utilisateurs de leur organisation
      const userOrganization = await prisma.userOrganization.findFirst({
        where: {
          userId: sanitizeString(userId),
          organizationId: sessionUser?.organizationId
        }
      });

      if (!userOrganization) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez modifier que les utilisateurs de votre organisation'
        });
      }
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: sanitizeString(userId) },
      data: updateData,
      include: {
        UserOrganization: {
          include: {
            Role: true,
            Organization: {
              include: {
                googleWorkspaceConfig: true
              }
            }
          }
        }
      }
    });

    console.log(`[USERS] User ${sessionUser?.email} updated user ${updatedUser.email}`);
    res.json({
      success: true,
      message: 'Informations utilisateur mises à jour avec succès',
      data: updatedUser
    });

  } catch (error) {
    console.error('[USERS] Erreur modification utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la modification'
    });
  }
});

// 🏷️ DELETE /api/users/:userId - ADMIN ET SUPER ADMIN - SÉCURISÉ
router.delete('/:userId', usersModifyRateLimit, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const sessionUser = req.user;
  console.log(`[USERS] DELETE /users/${userId} - ADMIN/SUPER ADMIN SÉCURISÉ`);
  
  try {
    // Validation UUID
    if (!userId || !z.string().uuid().safeParse(userId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    // Vérifier que l'utilisateur existe
    const userToDelete = await prisma.user.findUnique({
      where: { id: sanitizeString(userId) },
      include: { UserOrganization: true }
    });

    if (!userToDelete) {
      return res.status(404).json({ 
        success: false, 
        message: "Utilisateur non trouvé" 
      });
    }

    // Empêcher l'auto-suppression
    if (userToDelete.id === sessionUser?.id) {
      return res.status(400).json({ 
        success: false, 
        message: "Vous ne pouvez pas supprimer votre propre compte" 
      });
    }

    // LOGIQUE POUR ADMIN NON-SUPERADMIN
    if (!sessionUser?.isSuperAdmin) {
      // Un admin normal ne peut supprimer que :
      // 1. Les utilisateurs libres (sans organisation)
      // 2. Les utilisateurs de sa propre organisation
      
      const isUserFree = userToDelete.UserOrganization.length === 0;
      const isInSameOrg = userToDelete.UserOrganization.some(
        uo => uo.organizationId === sessionUser?.organizationId
      );
      
      if (!isUserFree && !isInSameOrg) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez supprimer que les utilisateurs libres ou de votre organisation"
        });
      }
    }

    // Transaction sécurisée
    await prisma.$transaction(async (tx) => {
      // Supprimer toutes les relations UserOrganization
      await tx.userOrganization.deleteMany({
        where: { userId: sanitizeString(userId) }
      });

      // Supprimer l'utilisateur
      await tx.user.delete({
        where: { id: sanitizeString(userId) }
      });
    });

    console.log(`[USERS] User ${sessionUser?.email} deleted user ${userToDelete.email}`);
    res.json({ 
      success: true, 
      message: `Utilisateur ${userToDelete.email} supprimé avec succès` 
    });

  } catch (error) {
    console.error('[USERS] Erreur suppression utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur interne du serveur lors de la suppression" 
    });
  }
});

// 📊 NOUVEAU ENDPOINT: Résumé des droits d'un utilisateur dans une organisation
router.get('/:userId/rights-summary', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { organizationId } = req.query;

    console.log(`[USERS] Récupération du résumé des droits pour utilisateur ${userId} dans organisation ${organizationId}`);

    if (!userId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur et organisation requis'
      });
    }

    // Récupérer les informations utilisateur avec ses relations dans l'organisation
    const userWithOrgInfo = await prisma.user.findUnique({
      where: { id: sanitizeString(userId) },
      include: {
        UserOrganization: {
          where: { organizationId: sanitizeString(organizationId as string) },
          include: {
            Role: {
              include: {
                Permission: {
                  include: {
                    Module: true
                  }
                }
              }
            },
            Organization: {
              include: {
                Module: {
                  where: { active: true },
                  orderBy: { order: 'asc' }
                },
                OrganizationModuleStatus: true
              }
            }
          }
        }
      }
    });

    if (!userWithOrgInfo) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const userOrgRelation = userWithOrgInfo.UserOrganization[0];
    if (!userOrgRelation) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non associé à cette organisation'
      });
    }

    const organization = userOrgRelation.Organization;
    const role = userOrgRelation.Role;
    const permissions = role.Permission;

    // Structurer les permissions par module
    const permissionsByModule: { [moduleKey: string]: { label: string; actions: string[] } } = {};
    
    permissions.forEach(permission => {
      if (permission.allowed && permission.Module) {
        const moduleKey = permission.Module.key;
        if (!permissionsByModule[moduleKey]) {
          permissionsByModule[moduleKey] = {
            label: permission.Module.label,
            actions: []
          };
        }
        permissionsByModule[moduleKey].actions.push(permission.action);
      }
    });

    // Construire la réponse
    interface RightsSummaryResponse {
      userInfo: {
        id: string; email: string; firstName: string | null; lastName: string | null; accountStatus: string; lastConnection: Date;
      };
      organizationInfo: { id: string; name: string; status: string | null; moduleCount: number };
      roles: string[];
      permissions: { [k: string]: { label: string; actions: string[]; isActive?: boolean; synthetic?: boolean } };
      synthetic?: boolean;
    }
    const rightsSummary: RightsSummaryResponse = {
      userInfo: {
        id: userWithOrgInfo.id,
        email: userWithOrgInfo.email,
        firstName: userWithOrgInfo.firstName,
        lastName: userWithOrgInfo.lastName,
        accountStatus: userWithOrgInfo.status,
        lastConnection: userWithOrgInfo.updatedAt
      },
      organizationInfo: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        moduleCount: organization.Module.length
      },
      roles: [role.label],
      permissions: permissionsByModule
    };

    // 🚀 Fallback Super Admin : si aucun enregistrement de permission explicite pour ce rôle
    const isSuperAdminRole = role.label?.toLowerCase().includes('super') && role.label?.toLowerCase().includes('admin');
    if (isSuperAdminRole && Object.keys(permissionsByModule).length === 0) {
      console.log('[USERS][rights-summary] Aucun permission explicite trouvée pour un rôle SuperAdmin – génération synthétique de toutes les permissions actives.');
      // Récupérer toutes les actions disponibles par module (même non "allowed")
      const moduleIds = organization.Module.map(m => m.id);
      if (moduleIds.length > 0) {
        const rawPerms = await prisma.permission.findMany({
          where: { moduleId: { in: moduleIds } },
          include: { Module: true }
        });
        const synthetic: { [k: string]: { label: string; actions: string[]; isActive?: boolean; synthetic?: boolean } } = {};
        rawPerms.forEach(p => {
          if (!p.Module) return;
          const key = p.Module.key;
          if (!synthetic[key]) {
            synthetic[key] = { label: p.Module.label || key, actions: [], isActive: true, synthetic: true };
          }
          if (!synthetic[key].actions.includes(p.action)) {
            synthetic[key].actions.push(p.action);
          }
        });
        rightsSummary.permissions = synthetic;
        rightsSummary.organizationInfo.moduleCount = Object.keys(synthetic).length;
        rightsSummary.synthetic = true;
        console.log(`[USERS][rights-summary] Permissions synthétiques générées: ${Object.keys(synthetic).length} modules.`);
      }
    }

    console.log(`[USERS] Résumé des droits généré pour ${userWithOrgInfo.email} dans ${organization.name}`);
    console.log(`[USERS] Rôle: ${role.label}, Permissions: ${Object.keys(rightsSummary.permissions).length} modules (synthetic=${rightsSummary.synthetic ? 'yes' : 'no'})`);

    res.json({
      success: true,
      data: rightsSummary
    });

  } catch (error) {
    console.error('[USERS] Erreur récupération résumé des droits:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la récupération du résumé des droits'
    });
  }
});

export default router;

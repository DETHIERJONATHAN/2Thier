import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import invitationRoutes from './invitations.js';
import { db } from '../lib/database';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
import { emailService } from '../services/EmailService';

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
const prisma = db;

// 🧹 SANITISATION SIMPLE (sans DOMPurify)
const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Supprime < et >
};

// 🔒 VALIDATION ZOD ULTRA-STRICTE
const userUpdateSchema = z.object({
  // Accepter des IDs non-UUID (ex: cuid, chaînes custom)
  roleId: z.string().min(1, 'ID rôle requis').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Statut doit être ACTIVE ou INACTIVE' })
  }).optional()
});

const userOrganizationSchema = z.object({
  // IDs non-UUID supportés
  userId: z.string().min(1, 'ID utilisateur requis'),
  organizationId: z.string().min(1, 'ID organisation requis'),
  roleId: z.string().min(1, 'ID rôle requis')
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
        status: true,
        emailVerified: true,
        confirmationEmailSentAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
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
  
  try {
    const sessionUser = req.user;

    // LOGIQUE SUPERADMIN - Montrer TOUS les utilisateurs
    if (sessionUser?.isSuperAdmin) {
      
      const allUsers = await prisma.user.findMany({
        include: {
          UserOrganization: {
            include: {
              Role: true,
              Organization: {
                include: {
                  GoogleWorkspaceConfig: true
                }
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' }
      });
      
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
                GoogleWorkspaceConfig: true
              }
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

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
  
  try {
    // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
    if (!userId || !z.string().min(1).safeParse(userId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide ou manquant'
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
  
  try {
    // Validation Zod
    const validation = userOrganizationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(handleZodError(validation.error));
    }

    const { userId, organizationId, roleId } = validation.data;

    // Génération d'un ID et des timestamps requis (schema: UserOrganization.id sans default, updatedAt sans default)
    const newId = `uo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

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
        id: newId,
        userId,
        organizationId,
        roleId,
        status: 'ACTIVE',
        updatedAt: now
      },
      include: {
        Organization: true,
        Role: true,
      }
    });

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
  
  try {
    // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
    if (!userOrganizationId || !z.string().min(1).safeParse(userOrganizationId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID relation utilisateur-organisation invalide ou manquant'
      });
    }

    // Validation Zod body
    const validation = userUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(handleZodError(validation.error));
    }

  const { roleId, status } = validation.data;
  const updateData: Partial<{ roleId: string; status: 'ACTIVE' | 'INACTIVE'; updatedAt: Date }> = {};
    if (roleId) updateData.roleId = roleId;
    if (status) updateData.status = status;
  updateData.updatedAt = new Date();

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

    res.json({ success: true, data: updatedUserOrganization });
  } catch (error: unknown) {
    // Prisma P2025: Record to update not found
    const e = error as { code?: string } | undefined;
    if (e?.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "Relation utilisateur-organisation introuvable"
      });
    }
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
  
  try {
    // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
    if (!userOrganizationId || !z.string().min(1).safeParse(userOrganizationId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID relation utilisateur-organisation invalide ou manquant'
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
                GoogleWorkspaceConfig: true
              }
            }
          }
        }
      }
    });

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
  
  try {
    // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
    if (!userId || !z.string().min(1).safeParse(userId).success) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide ou manquant'
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

    // Transaction sécurisée — nettoyage complet de toutes les FK vers User
    const uid = sanitizeString(userId);
    await prisma.$transaction(async (tx) => {
      // 1. NULL-ifier les FK nullables (conserver les données, détacher l'user)
      await tx.notification.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.calendarParticipant.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.calendarEvent.updateMany({ where: { ownerId: uid }, data: { ownerId: null } });
      await tx.chantierHistory.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.chantier.updateMany({ where: { responsableId: uid }, data: { responsableId: null } });
      await tx.chantier.updateMany({ where: { commercialId: uid }, data: { commercialId: null } });
      await tx.chantier.updateMany({ where: { validatedById: uid }, data: { validatedById: null } });
      await tx.chantierEvent.updateMany({ where: { validatedById: uid }, data: { validatedById: null } });
      await tx.formSubmission.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.generatedDocument.updateMany({ where: { createdBy: uid }, data: { createdBy: null } });
      await tx.generatedDocument.updateMany({ where: { sentBy: uid }, data: { sentBy: null } });
      await tx.googleVoiceCall.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.googleVoiceSMS.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.integrationsSettings.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.invitation.updateMany({ where: { targetUserId: uid }, data: { targetUserId: null } });
      await tx.lead.updateMany({ where: { assignedToId: uid }, data: { assignedToId: null } });
      await tx.telnyxPhoneNumber.updateMany({ where: { assignedUserId: uid }, data: { assignedUserId: null } });
      await tx.telnyxSipEndpoint.updateMany({ where: { userId: uid }, data: { userId: null } });
      await tx.contentReport.updateMany({ where: { reviewedBy: uid }, data: { reviewedBy: null } });
      await tx.quest.updateMany({ where: { sponsorId: uid }, data: { sponsorId: null } });
      await tx.website_blog_posts.updateMany({ where: { authorId: uid }, data: { authorId: null } });
      await tx.website_media_files.updateMany({ where: { uploadedById: uid }, data: { uploadedById: null } });

      // 2. Supprimer les réactions/comments/shares de l'user (avant les posts)
      await tx.wallReaction.deleteMany({ where: { userId: uid } });
      await tx.wallComment.deleteMany({ where: { authorId: uid } });
      await tx.wallShare.deleteMany({ where: { userId: uid } });

      // 3. Supprimer les posts de l'user (cascade: réactions/comments/shares des autres)
      await tx.wallPost.deleteMany({ where: { authorId: uid } });

      // 4. Supprimer les tables avec FK requises vers User
      await tx.deletedEmail.deleteMany({ where: { userId: uid } });
      await tx.email.deleteMany({ where: { userId: uid } });
      await tx.emailAccount.deleteMany({ where: { userId: uid } });
      await tx.googleMailWatch.deleteMany({ where: { userId: uid } });
      await tx.googleToken.deleteMany({ where: { userId: uid } });
      await tx.googleWorkspaceUser.deleteMany({ where: { userId: uid } });
      await tx.invitation.deleteMany({ where: { invitedById: uid } });
      await tx.productDocument.deleteMany({ where: { uploadedById: uid } });
      await tx.technicianFieldReview.deleteMany({ where: { reviewedById: uid } });
      await tx.telnyxSettings.deleteMany({ where: { userId: uid } });
      await tx.telnyxUserConfig.deleteMany({ where: { userId: uid } });
      await tx.userOrganization.deleteMany({ where: { userId: uid } });
      await tx.userService.deleteMany({ where: { userId: uid } });

      // 5. Supprimer l'utilisateur (les tables Cascade s'auto-nettoient)
      await tx.user.delete({ where: { id: uid } });
    });

    res.json({ 
      success: true, 
      message: `Utilisateur ${userToDelete.email} supprimé avec succès` 
    });

  } catch (error: any) {
    console.error('[USERS] Erreur suppression utilisateur:', error);
    // Message spécifique si FK constraint
    if (error?.code === 'P2003') {
      return res.status(400).json({ 
        success: false, 
        message: `Impossible de supprimer : des données liées existent (${error?.meta?.field_name || 'contrainte FK'})` 
      });
    }
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
      }
    }


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

// 🔄 POST /api/users/me/current-organization - Changer l'organisation courante
router.post('/me/current-organization', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    const userId = authReq.user?.id;
    const { organizationId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID organisation requis'
      });
    }


    // Vérifier que l'utilisateur appartient bien à cette organisation
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: userId,
        organizationId: organizationId
      },
      include: {
        Organization: true,
        Role: true
      }
    });

    if (!userOrg) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'appartenez pas à cette organisation'
      });
    }

    // Mettre à jour la session avec la nouvelle organisation
    if (req.session) {
      req.session.currentOrganizationId = organizationId;
      
      // Sauvegarder la session de manière synchrone
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      
      return res.json({
        success: true,
        message: 'Organisation changée avec succès',
        data: {
          organizationId: organizationId,
          organizationName: userOrg.Organization.name,
          role: userOrg.Role.label
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Session non disponible'
      });
    }

  } catch (error) {
    console.error('[USERS] Erreur changement organisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement d\'organisation'
    });
  }
});

// ============================================================================
// POST /api/users/:userId/resend-verification - Admin: Renvoyer l'email de confirmation
// ============================================================================
router.post('/:userId/resend-verification', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    if (user.emailVerified) {
      return res.json({ success: true, message: 'Cet utilisateur a déjà vérifié son email.', alreadyVerified: true });
    }

    // Générer un nouveau token
    const newToken = randomBytes(32).toString('hex');
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: newToken,
        emailVerificationExpires: newExpires,
        confirmationEmailSentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?token=${newToken}`;
    const firstName = user.firstName || '';

    await emailService.sendEmail({
      to: user.email,
      subject: 'Activez votre compte Zhiive',
      text: `Bonjour ${firstName},\n\nVoici votre lien pour activer votre compte Zhiive :\n\n${verifyUrl}\n\nCe lien est valide pendant 24 heures.\n\n-- Zhiive`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Zhiive</h1>
            </div>
            <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour ${firstName} !</h2>
            <p style="color: #444; line-height: 1.6;">Un administrateur vous a renvoy&eacute; le lien d'activation. Cliquez ci-dessous pour activer votre compte :</p>
            <p style="text-align: center; margin: 35px 0;">
              <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Activer mon compte</a>
            </p>
            <p style="color: #888; font-size: 13px;">Ce lien est valide pendant 24 heures.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="color: #aaa; font-size: 11px; text-align: center;">Cet email a ete envoye par Zhiive.</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: `Email de confirmation renvoyé à ${user.email}` });

  } catch (error) {
    console.error('[USERS] Erreur renvoi email vérification:', error);
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi de l'email de vérification" });
  }
});

// ============================================================================
// PATCH /api/users/:userId/global-status - Admin: Toggle statut global Zhiive
// ============================================================================
router.patch('/:userId/global-status', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { status } = req.body;

  const parsed = z.object({
    status: z.enum(['active', 'inactive'], {
      errorMap: () => ({ message: 'Statut doit être "active" ou "inactive"' })
    })
  }).safeParse({ status });

  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: parsed.data.status, updatedAt: new Date() },
    });

    res.json({ success: true, message: `Statut Zhiive mis à jour: ${parsed.data.status}` });

  } catch (error) {
    console.error('[USERS] Erreur changement statut global:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de statut global' });
  }
});

export default router;

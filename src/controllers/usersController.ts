import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Interface pour les requêtes authentifiées (copiée du middleware auth)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId?: string;
    isSuperAdmin: boolean;
    role?: string;
  };
}

// Récupérer tous les utilisateurs
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  const sessionUser = req.user;

  try {
    // LOGIQUE SUPERADMIN - Montrer TOUS les utilisateurs de TOUTES les organisations
    if (sessionUser?.isSuperAdmin) {
      console.log('[USERS] SuperAdmin request - showing ALL users from ALL organizations.');
      
      const allUsers = await prisma.user.findMany({
        include: {
          UserOrganization: {
            include: {
              Role: true,
              Organization: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`[USERS] Found ${allUsers.length} total users for SuperAdmin.`);
      return res.json({ success: true, data: allUsers });
    }

    // LOGIQUE UTILISATEUR NORMAL - Montrer les utilisateurs de sa propre organisation
    const organizationId = sessionUser?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "L'ID de l'organisation est manquant pour cet utilisateur." });
    }

    console.log(`[USERS] Standard user request - showing users for organization: ${organizationId}`);
    
    const usersInOrg = await prisma.user.findMany({
      where: {
        UserOrganization: {
          some: {
            organizationId: organizationId,
          },
        },
      },
      include: {
        UserOrganization: {
          where: {
            organizationId: organizationId,
          },
          include: {
            Role: true,
            Organization: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[USERS] Found ${usersInOrg.length} users for organization ${organizationId}.`);
    return res.json({ success: true, data: usersInOrg });

  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
};

// Mettre à jour le rôle et le statut d'un utilisateur dans une organisation
export const updateUserRoleAndStatus = async (req: AuthenticatedRequest, res: Response) => {
    const { userOrganizationId } = req.params;
    const { roleId, status } = req.body;

    if (!userOrganizationId) {
        return res.status(400).json({ success: false, message: "L'ID de la relation utilisateur-organisation est manquant." });
    }

    try {
        const updateData: { roleId?: string; status?: 'ACTIVE' | 'INACTIVE' } = {};
        if (roleId) updateData.roleId = roleId;
        if (status) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "Aucune donnée de mise à jour fournie." });
        }

        const updatedUserOrganization = await prisma.userOrganization.update({
            where: { id: userOrganizationId },
            data: updateData,
        });

        res.json({ success: true, data: updatedUserOrganization });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
};

// Obtenir toutes les organisations pour un utilisateur spécifique
export const getUserOrganizations = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const userOrganizations = await prisma.userOrganization.findMany({
      where: { userId: userId },
      include: {
        Organization: true,
        Role: true,
      },
      orderBy: {
        Organization: {
          name: 'asc',
        },
      },
    });
    res.json({ success: true, data: userOrganizations });
  } catch (error) {
    console.error(`Erreur lors de la récupération des organisations pour l'utilisateur ${userId}:`, error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

// Assigner un utilisateur à une nouvelle organisation
export const assignUserToOrganization = async (req: Request, res: Response) => {
  const { userId, organizationId, roleId } = req.body;

  if (!userId || !organizationId || !roleId) {
    return res.status(400).json({ success: false, message: "Les informations userId, organizationId et roleId sont requises." });
  }

  try {
    // Vérifier si l'assignation existe déjà
    const existingAssignment = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
      },
    });

    if (existingAssignment) {
      return res.status(409).json({ success: false, message: "L'utilisateur est déjà dans cette organisation." });
    }

    const newUserOrganization = await prisma.userOrganization.create({
      data: {
        userId,
        organizationId,
        roleId,
        status: 'ACTIVE', // Statut par défaut
      },
      include: {
        Organization: true,
        Role: true,
      }
    });

    res.status(201).json({ success: true, data: newUserOrganization });
  } catch (error) {
    console.error("Erreur lors de l'assignation de l'utilisateur à l'organisation:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

// Retirer un utilisateur d'une organisation
export const removeUserFromOrganization = async (req: Request, res: Response) => {
  const { userOrganizationId } = req.params;

  try {
    // Vérifier si l'utilisateur a d'autres organisations
    const relationToDelete = await prisma.userOrganization.findUnique({
        where: { id: userOrganizationId },
        select: { userId: true }
    });

    if (!relationToDelete) {
        return res.status(404).json({ success: false, message: "Relation non trouvée." });
    }

    const remainingRelations = await prisma.userOrganization.count({
        where: {
            userId: relationToDelete.userId,
            id: { not: userOrganizationId }
        }
    });

    if (remainingRelations === 0) {
        return res.status(400).json({ success: false, message: "Impossible de supprimer la dernière organisation de l'utilisateur. L'utilisateur doit appartenir à au moins une organisation." });
    }

    await prisma.userOrganization.delete({
      where: { id: userOrganizationId },
    });

    res.json({ success: true, message: "Utilisateur retiré de l'organisation avec succès." });
  } catch (error) {
    console.error("Erreur lors du retrait de l'utilisateur de l'organisation:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

// Supprimer un utilisateur (super_admin uniquement)
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const sessionUser = req.user;

  try {
    // Vérification de sécurité - seuls les super_admin peuvent supprimer des utilisateurs
    if (!sessionUser?.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Accès refusé. Seuls les super administrateurs peuvent supprimer des utilisateurs." 
      });
    }

    // Vérifier que l'utilisateur existe
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: true
      }
    });

    if (!userToDelete) {
      return res.status(404).json({ 
        success: false, 
        message: "Utilisateur non trouvé." 
      });
    }

    // Empêcher l'auto-suppression
    if (userToDelete.id === sessionUser.id) {
      return res.status(400).json({ 
        success: false, 
        message: "Vous ne pouvez pas supprimer votre propre compte." 
      });
    }

    // Utiliser une transaction pour supprimer toutes les données liées
    await prisma.$transaction(async (tx) => {
      // Supprimer toutes les relations UserOrganization
      await tx.userOrganization.deleteMany({
        where: { userId: userId }
      });

      // Supprimer l'utilisateur
      await tx.user.delete({
        where: { id: userId }
      });
    });

    console.log(`[USERS] SuperAdmin ${sessionUser.email} deleted user ${userToDelete.email}`);
    
    res.json({ 
      success: true, 
      message: `Utilisateur ${userToDelete.email} supprimé avec succès.` 
    });

  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur interne du serveur lors de la suppression." 
    });
  }
};

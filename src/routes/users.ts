import express from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { requirePermission } from '../middlewares/requirePermission';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from '../services/EmailService';

const router = express.Router();

// --- Schémas de validation Zod ---

const UserStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
});

const InviteUserSchema = z.object({
  email: z.string().email(),
  roleId: z.string(),
});

const UserOrganizationsSchema = z.object({
    organizationIds: z.array(z.string()),
});


// --- Routes pour les invitations ---

// GET /api/users/invitations - Récupérer les invitations pour l'organisation actuelle
router.get('/invitations', requirePermission('manage_users'), async (req, res) => {
  const organizationId = req.organizationId;
  if (!organizationId) {
    return res.status(400).json({ success: false, message: "Organisation non identifiée." });
  }
  try {
    const invitations = await prisma.invitation.findMany({
      where: { organizationId: organizationId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: invitations });
  } catch (error) {
    console.error('[USERS] Erreur lors de la récupération des invitations:', error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des invitations." });
  }
});

// POST /api/users/invite - Inviter un nouvel utilisateur
router.post('/invite', requirePermission('manage_users'), async (req, res) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
        return res.status(400).json({ success: false, message: "Organisation non identifiée." });
    }

    const result = InviteUserSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, errors: result.error.issues });
    }
    const { email, roleId } = result.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // L'invitation expire dans 7 jours

        const invitation = await prisma.invitation.create({
            data: {
                id: uuidv4(),
                email,
                organizationId,
                roleId,
                status: 'PENDING',
                expiresAt,
            },
      include: {
        organization: { select: { name: true } },
        role: { select: { name: true, label: true } },
      }
        });

    try {
      await emailService.sendInvitationEmail({
        to: invitation.email,
        token: invitation.id,
        isExistingUser: !!existingUser,
        organizationName: invitation.organization?.name ?? 'Votre organisation',
        roleName: invitation.role?.label ?? invitation.role?.name ?? 'Utilisateur'
      });
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'invitation par email:", emailError);
    }

    res.status(201).json({ success: true, message: 'Invitation envoyée avec succès.', data: invitation });
  } catch (error) {
    console.error("Erreur lors de la création de l'invitation :", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
});

// DELETE /api/users/invitations/:id - Révoquer une invitation
router.delete('/invitations/:id', requirePermission('manage_users'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.invitation.update({
            where: { id },
            data: { status: 'REVOKED' },
        });
        res.json({ success: true, message: "Invitation révoquée." });
  } catch (error) {
    console.error('Erreur lors de la révocation d\'invitation:', error);
    res.status(500).json({ success: false, message: "Erreur lors de la révocation." });
    }
});


// --- Routes pour la gestion des utilisateurs ---

// GET /api/users - Récupérer tous les utilisateurs de l'organisation
router.get('/', requirePermission('manage_users'), async (req, res) => {
  const organizationId = req.organizationId;
  try {
    const users = await prisma.user.findMany({
      where: {
        UserOrganization: {
          some: {
            organizationId: organizationId,
          },
        },
      },
      include: {
        UserOrganization: {
          where: { organizationId: organizationId },
          include: { Role: true },
        },
      },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('[USERS] Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/users/free - Récupérer tous les utilisateurs libres (sans organisation)
router.get('/free', requirePermission('manage_users'), async (req, res) => {
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
    res.json({ success: true, data: freeUsers });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs libres:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des utilisateurs libres' });
  }
});

// PATCH /api/users/user-organizations/:userOrgId - Mettre à jour le statut d'un utilisateur dans une organisation
router.patch('/user-organizations/:userOrgId', requirePermission('manage_users'), async (req, res) => {
    const { userOrgId } = req.params;
    const result = UserStatusSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, errors: result.error.issues });
    }
    try {
        const updatedRelation = await prisma.userOrganization.update({
            where: { id: userOrgId },
            data: { status: result.data.status },
        });
        res.json({ success: true, data: updatedRelation });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de userOrganization:', error);
    res.status(500).json({ success: false, message: "Erreur lors de la mise à jour du statut." });
    }
});

// GET /api/users/:id/organizations - Récupérer les organisations d'un utilisateur
router.get('/:id/organizations', requirePermission('super_admin'), async (req, res) => {
    const { id } = req.params;
    try {
        const userOrgs = await prisma.userOrganization.findMany({
            where: { userId: id },
            include: { Organization: true }
        });
        res.json({ success: true, data: userOrgs });
  } catch (error) {
    console.error('Erreur lors de la récupération des organisations utilisateur:', error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// POST /api/users/:id/organizations - Mettre à jour les organisations d'un utilisateur
router.post('/:id/organizations', requirePermission('super_admin'), async (req, res) => {
    const { id: userId } = req.params;
    const result = UserOrganizationsSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, errors: result.error.issues });
    }
    const { organizationIds } = result.data;

    try {
        // On ne peut pas enlever l'utilisateur de son organisation principale
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && !organizationIds.includes(user.primaryOrganizationId)) {
            return res.status(400).json({ success: false, message: "Vous ne pouvez pas retirer un utilisateur de son organisation principale." });
        }

        await prisma.$transaction(async (tx) => {
            // Supprimer les anciennes relations (sauf la principale)
            await tx.userOrganization.deleteMany({
                where: { 
                    userId: userId,
                    organizationId: { notIn: organizationIds }
                }
            });

            // Ajouter les nouvelles relations
            const existingRels = await tx.userOrganization.findMany({
                where: { userId: userId, organizationId: { in: organizationIds } }
            });
            const existingOrgIds = existingRels.map(r => r.organizationId);
            const newOrgIds = organizationIds.filter(orgId => !existingOrgIds.includes(orgId));

            // Pour les nouvelles organisations, trouver le rôle par défaut
            const defaultRole = await tx.role.findFirst({ where: { name: 'User', organizationId: { in: newOrgIds } }});
            if (!defaultRole && newOrgIds.length > 0) {
                 throw new Error("Impossible de trouver un rôle par défaut pour les nouvelles organisations.");
            }

            await tx.userOrganization.createMany({
                data: newOrgIds.map(orgId => ({
                    userId: userId,
                    organizationId: orgId,
                    roleId: defaultRole!.id, // Le '!' est sûr ici à cause du check précédent
                })),
            });
        });

        res.json({ success: true, message: "Organisations mises à jour." });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des organisations utilisateur:', error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});


export default router;

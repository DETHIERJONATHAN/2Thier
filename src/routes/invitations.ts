import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { requireRole } from "../middlewares/requireRole";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { emailService } from "../services/EmailService";

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware as any, impersonationMiddleware as any);

// Schéma de validation pour la création d'invitation
const createInvitationSchema = z.object({
  email: z.string().email("L'adresse e-mail est invalide."),
  roleName: z.string().min(1, "Le nom du rôle est requis."),
  organizationId: z.string().uuid("L'ID de l'organisation est requis et doit être un UUID valide."),
});

// Route pour créer une nouvelle invitation
router.post('/', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, roleName, organizationId } = createInvitationSchema.parse(req.body);
    const inviterId = req.user!.userId; // Correction: userId au lieu de id

    // 1. Vérifier si l'utilisateur est déjà dans l'organisation
    const existingUserInOrg = await prisma.userOrganization.findFirst({
      where: {
        organizationId: organizationId,
        User: { email: email },
      },
    });
    if (existingUserInOrg) {
      res.status(409).json({ message: "Un utilisateur avec cet e-mail est déjà membre de cette organisation." });
      return;
    }

    // 2. Trouver le rôle (soit spécifique à l'organisation, soit global)
    const role = await prisma.role.findFirst({
      where: { 
        name: roleName, 
        OR: [
          { organizationId: organizationId }, // Rôle spécifique à l'organisation
          { organizationId: null }            // Rôle global
        ]
      },
    });
    if (!role) {
      res.status(404).json({ message: `Le rôle '${roleName}' n'a pas été trouvé.` });
      return;
    }

    // 3. Gérer les invitations existantes pour ce couple email/organisation
    const existingInvitation = await prisma.invitation.findUnique({
      where: { email_organizationId: { email, organizationId } },
    });

    if (existingInvitation && existingInvitation.status === 'PENDING' && existingInvitation.expiresAt > new Date()) {
      res.status(409).json({ message: "Une invitation active existe déjà pour cette adresse e-mail dans cette organisation." });
      return;
    }
    // Si une invitation non-active existe (expirée, désactivée...), on la supprime pour en créer une nouvelle.
    if (existingInvitation) {
      await prisma.invitation.delete({ where: { id: existingInvitation.id } });
    }

    // 4. Vérifier si l'e-mail correspond à un utilisateur existant
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationData: Prisma.InvitationCreateInput = {
      email,
      token,
      expiresAt,
      organization: { connect: { id: organizationId } },
      role: { connect: { id: role.id } },
      invitedUser: { connect: { id: inviterId } }, // Correction: invitedUser au lieu de invitedBy
      status: 'PENDING',
    };

    // Si un utilisateur existe (quel que soit son statut ou ses organisations), on lie l'invitation
    if (targetUser) {
      invitationData.targetUser = { connect: { id: targetUser.id } };
    }

    const newInvitation = await prisma.invitation.create({
      data: invitationData,
      include: {
        organization: true,
        role: true,
      }
    });

    // Envoyer l'e-mail de notification
    try {
      await emailService.sendInvitationEmail({
        to: newInvitation.email,
        token: newInvitation.token,
        isExistingUser: !!targetUser,
        organizationName: newInvitation.organization.name,
        roleName: newInvitation.role.label || newInvitation.role.name,
      });
    } catch (emailError) {
        console.error("Échec de l'envoi de l'e-mail d'invitation:", emailError);
        // Ne pas bloquer la réponse si l'e-mail échoue.
        // Un système de logging plus robuste serait utile ici en production.
    }

    res.status(201).json({
      success: true,
      message: "Invitation envoyée avec succès.",
      data: {
        id: newInvitation.id,
        token: newInvitation.token,
        isExistingUser: !!targetUser,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Données invalides.', details: error.errors });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target ?? 'champs inconnus';
        console.error(`Erreur de contrainte unique (P2002) sur ${target}:`, error);
        res.status(409).json({
            message: `Conflit de données. Une entrée avec ces informations existe déjà.`
        });
        return;
      }
    }
    console.error("Erreur lors de la création de l'invitation:", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// POST /api/invitations/:id/resend
// Regénère le token pour une invitation existante.
router.post('/:id/resend', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: id, status: { in: ['PENDING', 'DISABLED'] } },
    });

    if (!invitation) {
      res.status(404).json({ success: false, message: "Invitation non trouvée, déjà utilisée ou expirée." });
      return;
    }

    // Regénérer le token et la date d'expiration
    const newToken = uuidv4();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const updatedInvitation = await prisma.invitation.update({
      where: { id: id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'PENDING', // Réactiver l'invitation si elle était désactivée
      },
    });

    // Ici, vous pourriez déclencher un envoi d'email avec le nouveau token

    res.status(200).json({ success: true, message: "L'invitation a été renvoyée avec succès.", data: { token: updatedInvitation.token } });

  } catch (error) {
    console.error("Erreur lors du renvoi de l'invitation:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});

// Route pour changer le statut d'une invitation
router.patch('/:id/status', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'DISABLED'].includes(status)) {
        res.status(400).json({ message: "Statut invalide. Seuls PENDING et DISABLED sont autorisés." });
        return;
    }

    try {
        const invitation = await prisma.invitation.findUnique({ where: { id } });

        if (!invitation) {
            res.status(404).json({ message: "Invitation non trouvée." });
            return;
        }

        if (invitation.status !== 'PENDING' && invitation.status !== 'DISABLED') {
            res.status(400).json({ message: `L\'invitation ne peut pas être modifiée car son statut est ${invitation.status}.` });
            return;
        }

        const updatedInvitation = await prisma.invitation.update({
            where: { id },
            data: { status: status },
        });

        res.json({ success: true, data: updatedInvitation });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut de l'invitation ${id}:`, error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
});

// Schéma de validation pour la vérification du jeton
const verifyTokenSchema = z.object({
  token: z.string().uuid("Le format du jeton est invalide."),
});

// Route pour vérifier la validité d'un jeton d'invitation
router.get('/verify', async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = verifyTokenSchema.parse(req.query);

        const invitation = await prisma.invitation.findUnique({
            where: { 
                token: token, 
                expiresAt: { gte: new Date() },
                status: 'PENDING'
            },
            include: {
                organization: { select: { name: true } },
                role: { select: { name: true, label: true } }
            }
        });

        if (!invitation) {
            res.status(404).json({ message: 'Invitation non trouvée, invalide, expirée ou déjà utilisée.' });
            return;
        }

        const isExistingUser = !!invitation.targetUserId;

        res.json({
            success: true,
            data: {
                email: invitation.email,
                organization: invitation.organization,
                role: invitation.role,
                isExistingUser: isExistingUser,
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Jeton invalide fourni.', details: error.errors });
            return;
        }
        console.error("Erreur lors de la vérification du jeton d'invitation:", error);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
});

// Schéma de validation pour l'acceptation de l'invitation
const acceptInvitationSchema = z.object({
    token: z.string().uuid("Le format du jeton est invalide."),
    firstName: z.string().min(1, "Le prénom est requis."),
    lastName: z.string().min(1, "Le nom est requis."),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

// Route pour accepter une invitation et finaliser l'inscription
router.post('/accept', async (req: Request, res: Response): Promise<void> => {
    try {
        // Le schéma est maintenant dynamique
        const invitationToken = z.string().uuid("Le format du jeton est invalide.").parse(req.body.token);

        const invitation = await prisma.invitation.findUnique({
            where: { 
                token: invitationToken, 
                expiresAt: { gte: new Date() },
                status: 'PENDING'
            },
        });

        if (!invitation) {
            res.status(404).json({ message: 'Invitation non trouvée, invalide, expirée ou déjà utilisée.' });
            return;
        }

        // Scénario 1: L'invitation est pour un utilisateur existant
        if (invitation.targetUserId) {
            const user = await prisma.user.findUnique({ where: { id: invitation.targetUserId }});
            if (!user) {
                // Cas de sécurité : l'utilisateur lié a été supprimé entre-temps
                res.status(404).json({ message: "L'utilisateur associé à cette invitation n'existe plus." });
                return;
            }

            await prisma.$transaction(async (tx) => {
                // Ajouter l'utilisateur à la nouvelle organisation
                await tx.userOrganization.create({
                    data: {
                        userId: user.id,
                        organizationId: invitation.organizationId,
                        roleId: invitation.roleId,
                        status: 'ACTIVE'
                    }
                });

                // Mettre à jour l'invitation
                await tx.invitation.update({
                    where: { id: invitation.id },
                    data: { status: 'ACCEPTED' },
                });
            });

            res.status(200).json({ success: true, message: `Vous avez rejoint l'organisation avec succès.` });
            return;
        }

        // Scénario 2: L'invitation est pour un nouvel utilisateur (logique existante)
        const { firstName, lastName, password } = acceptInvitationSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
        if (existingUser) {
            // Ce cas ne devrait plus se produire grâce à la logique de liaison, mais reste une sécurité
            res.status(409).json({ message: "Un utilisateur avec cette adresse e-mail existe déjà. Veuillez vous connecter pour accepter l'invitation." });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    firstName: firstName,
                    lastName: lastName,
                    email: invitation.email,
                    passwordHash: passwordHash,
                    status: 'active',
                    role: 'user',
                }
            });

            await tx.userOrganization.create({
                data: {
                    userId: createdUser.id,
                    organizationId: invitation.organizationId,
                    roleId: invitation.roleId,
                }
            });

            await tx.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' },
            });

            return createdUser;
        });

        res.status(201).json({ success: true, message: "Inscription réussie!", data: { userId: newUser.id } });

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Données d\'inscription invalides.', details: error.errors });
            return;
        }
        console.error("Erreur lors de l'acceptation de l'invitation:", error);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
});

// DELETE /api/invitations/:id
// Annule une invitation en attente.
router.delete('/:id', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: id, status: { in: ['PENDING', 'DISABLED'] } },
    });

    if (!invitation) {
      res.status(404).json({ success: false, message: "Invitation non trouvée, déjà utilisée ou expirée." });
      return;
    }

    // Supprimer l'invitation
    await prisma.invitation.delete({
      where: { id: id },
    });
    
    // Par sécurité, on supprime aussi un potentiel utilisateur créé avec le statut 'invited'
    // Bien que la logique actuelle ne semble pas en créer, cela rend le système plus robuste.
    await prisma.user.deleteMany({
        where: {
            email: invitation.email,
            status: 'invited'
        }
    });

    res.status(200).json({ success: true, message: "L'invitation a été annulée avec succès." });

  } catch (error) {
    console.error("Erreur lors de l'annulation de l'invitation:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});

// POST /api/invitations/:id/force-accept
// Force l'acceptation d'une invitation pour créer un utilisateur (super_admin only)
router.post('/:id/force-accept', requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
        const invitation = await prisma.invitation.findUnique({ where: { id } });

        if (!invitation) {
            return res.status(404).json({ success: false, message: "Invitation non trouvée." });
        }

        if (invitation.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `L'invitation a déjà le statut ${invitation.status}.` });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Un utilisateur avec cet e-mail existe déjà." });
        }

        // Création de l'utilisateur avec un mot de passe aléatoire et sécurisé
        const tempPassword = uuidv4(); // Utilise uuid pour un mot de passe temporaire robuste
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const newUser = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    email: invitation.email,
                    passwordHash: passwordHash,
                    status: 'active',
                    role: 'user', // Rôle global par défaut
                    // Le prénom/nom peuvent être vides, l'utilisateur les mettra à jour
                }
            });

            if (invitation.organizationId) {
                await tx.userOrganization.create({
                    data: {
                        userId: createdUser.id,
                        organizationId: invitation.organizationId,
                        roleId: invitation.roleId,
                        status: 'ACTIVE'
                    }
                });
            }

            await tx.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' },
            });

            // Retourner l'utilisateur complet avec ses nouvelles relations
            return tx.user.findUnique({
                where: { id: createdUser.id },
                include: {
                    UserOrganization: {
                        include: {
                            Organization: true,
                            Role: true,
                        },
                    },
                }
            });
        });

        // NOTE: Vous devriez probablement envoyer un e-mail à l'utilisateur
        // avec un lien pour réinitialiser son mot de passe.

        res.status(201).json({ success: true, message: "L\'utilisateur a été créé et l\'invitation acceptée.", data: newUser });

    } catch (error) {
        console.error("Erreur lors de l\'acceptation forcée de l\'invitation:", error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
});

// GET /api/invitations : liste les invitations (optionnellement filtrées par organizationId)
router.get('/', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.query;
    const requestingUser = req.user;

    if (!requestingUser) {
        res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
        return;
    }

    let where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }
    // Si admin, ne retourne que les invitations de son org
    if (requestingUser.role !== 'super_admin' && requestingUser.organizationId) {
      where.organizationId = requestingUser.organizationId;
    }
    // Invitations PENDING ou DISABLED (pas ACCEPTED ni CANCELLED)
    where.status = { in: ['PENDING', 'DISABLED'] };
    const invitations = await prisma.invitation.findMany({
      where,
      include: {
        role: true,
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: invitations });
  } catch (error) {
    console.error('Erreur lors de la récupération des invitations:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des invitations.' });
  }
});

export default router;

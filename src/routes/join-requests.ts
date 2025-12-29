import { Router, Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { db } from '../lib/database';
import { JoinRequestStatus, UserOrganizationStatus } from '@prisma/client';

const router = Router();

// ============================================================================
// 📝 ROUTES DEMANDES D'ADHÉSION (JoinRequest)
// ============================================================================

/**
 * POST /api/join-requests
 * Créer une demande d'adhésion à une organisation
 * Accessible à tous les utilisateurs authentifiés
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { organizationId, message } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'organizationId requis' });
    }

    // Vérifier que l'organisation existe
    const organization = await db.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organisation non trouvée' });
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const existingMembership = await db.userOrganization.findFirst({
      where: { userId, organizationId }
    });

    if (existingMembership) {
      return res.status(409).json({ 
        success: false, 
        error: 'Vous êtes déjà membre de cette organisation' 
      });
    }

    // Vérifier qu'une demande n'existe pas déjà
    const existingRequest = await db.joinRequest.findUnique({
      where: { userId_organizationId: { userId, organizationId } }
    });

    if (existingRequest) {
      return res.status(409).json({ 
        success: false, 
        error: 'Une demande existe déjà pour cette organisation',
        status: existingRequest.status
      });
    }

    // Créer la demande
    const joinRequest = await db.joinRequest.create({
      data: {
        userId,
        organizationId,
        message: message?.trim() || null,
        status: JoinRequestStatus.PENDING
      },
      include: {
        Organization: { select: { id: true, name: true } }
      }
    });

    console.log(`[JoinRequest] Nouvelle demande créée: user=${userId} -> org=${organizationId}`);

    res.status(201).json({
      success: true,
      data: joinRequest,
      message: 'Demande d\'adhésion envoyée avec succès'
    });

  } catch (error) {
    console.error('[JoinRequest] Erreur création:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/join-requests/my-requests
 * Récupérer mes demandes d'adhésion (pour l'utilisateur connecté)
 */
router.get('/my-requests', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    const requests = await db.joinRequest.findMany({
      where: { userId },
      include: {
        Organization: { select: { id: true, name: true, description: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: requests });

  } catch (error) {
    console.error('[JoinRequest] Erreur récupération:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/join-requests/pending
 * Récupérer les demandes en attente pour mon organisation (admin)
 */
router.get('/pending', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';

    // SuperAdmin peut voir toutes les demandes
    const whereClause = isSuperAdmin 
      ? { status: JoinRequestStatus.PENDING }
      : { organizationId, status: JoinRequestStatus.PENDING };

    if (!isSuperAdmin && !organizationId) {
      return res.status(403).json({ success: false, error: 'Organisation requise' });
    }

    const requests = await db.joinRequest.findMany({
      where: whereClause,
      include: {
        User: { select: { id: true, firstName: true, lastName: true, email: true } },
        Organization: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: requests });

  } catch (error) {
    console.error('[JoinRequest] Erreur liste pending:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/join-requests/:id/approve
 * Approuver une demande d'adhésion (admin)
 */
router.post('/:id/approve', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body; // Rôle à attribuer au nouvel utilisateur
    const adminId = req.user?.userId;
    const adminOrgId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';

    // Récupérer la demande
    const joinRequest = await db.joinRequest.findUnique({
      where: { id },
      include: { Organization: true, User: true }
    });

    if (!joinRequest) {
      return res.status(404).json({ success: false, error: 'Demande non trouvée' });
    }

    // Vérifier les permissions
    if (!isSuperAdmin && joinRequest.organizationId !== adminOrgId) {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      return res.status(400).json({ 
        success: false, 
        error: `Demande déjà traitée (${joinRequest.status})` 
      });
    }

    // Trouver le rôle par défaut si non spécifié
    let finalRoleId = roleId;
    if (!finalRoleId) {
      const defaultRole = await db.role.findFirst({
        where: { 
          organizationId: joinRequest.organizationId,
          name: 'user' // Rôle par défaut
        }
      });
      finalRoleId = defaultRole?.id;
    }

    if (!finalRoleId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Aucun rôle disponible. Veuillez spécifier un roleId.' 
      });
    }

    // Transaction: approuver et créer UserOrganization
    const result = await db.$transaction(async (tx) => {
      // Mettre à jour la demande
      const updatedRequest = await tx.joinRequest.update({
        where: { id },
        data: {
          status: JoinRequestStatus.APPROVED,
          reviewedBy: adminId,
          reviewedAt: new Date()
        }
      });

      // Créer l'appartenance à l'organisation
      const userOrg = await tx.userOrganization.create({
        data: {
          id: crypto.randomUUID(),
          userId: joinRequest.userId,
          organizationId: joinRequest.organizationId,
          roleId: finalRoleId,
          status: UserOrganizationStatus.ACTIVE,
          updatedAt: new Date()
        }
      });

      return { request: updatedRequest, userOrganization: userOrg };
    });

    console.log(`[JoinRequest] Demande ${id} approuvée par ${adminId}`);

    res.json({
      success: true,
      data: result,
      message: `Demande approuvée. ${joinRequest.User?.firstName} ${joinRequest.User?.lastName} est maintenant membre de ${joinRequest.Organization?.name}`
    });

  } catch (error) {
    console.error('[JoinRequest] Erreur approbation:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/join-requests/:id/reject
 * Rejeter une demande d'adhésion (admin)
 */
router.post('/:id/reject', authMiddleware, requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.userId;
    const adminOrgId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';

    // Récupérer la demande
    const joinRequest = await db.joinRequest.findUnique({
      where: { id }
    });

    if (!joinRequest) {
      return res.status(404).json({ success: false, error: 'Demande non trouvée' });
    }

    // Vérifier les permissions
    if (!isSuperAdmin && joinRequest.organizationId !== adminOrgId) {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      return res.status(400).json({ 
        success: false, 
        error: `Demande déjà traitée (${joinRequest.status})` 
      });
    }

    // Rejeter la demande
    const updatedRequest = await db.joinRequest.update({
      where: { id },
      data: {
        status: JoinRequestStatus.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });

    console.log(`[JoinRequest] Demande ${id} rejetée par ${adminId}. Raison: ${reason || 'Non spécifiée'}`);

    res.json({
      success: true,
      data: updatedRequest,
      message: 'Demande rejetée'
    });

  } catch (error) {
    console.error('[JoinRequest] Erreur rejet:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/join-requests/:id
 * Annuler ma propre demande (avant traitement)
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const joinRequest = await db.joinRequest.findUnique({
      where: { id }
    });

    if (!joinRequest) {
      return res.status(404).json({ success: false, error: 'Demande non trouvée' });
    }

    // Seul le créateur peut annuler sa demande
    if (joinRequest.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    // On ne peut annuler que si PENDING
    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      return res.status(400).json({ 
        success: false, 
        error: 'Impossible d\'annuler une demande déjà traitée' 
      });
    }

    await db.joinRequest.delete({ where: { id } });

    res.json({ success: true, message: 'Demande annulée' });

  } catch (error) {
    console.error('[JoinRequest] Erreur suppression:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;

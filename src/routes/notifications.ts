import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import UniversalNotificationService from '../services/UniversalNotificationService.js';

const prisma = new PrismaClient();
const router = Router();

// Middleware to protect routes
router.use(authMiddleware);

/**
 * @route GET /api/notifications
 * @description Fetch pending notifications for the current user.
 * It fetches notifications for the organizations the user belongs to,
 * or notifications directly assigned to the user.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user || !user.userId) {
        // authMiddleware should prevent this, but as a safeguard:
        res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
        return;
    }
    const userId = user.userId;

    // SuperAdmin logic: can see ALL notifications
    if (user.role === 'super_admin') {
        const notifications = await prisma.notification.findMany({
            where: {
                status: 'PENDING',
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                Organization: true // Include organization details for context
            }
        });
        res.json({ success: true, data: notifications });
        return;
    }

    // Normal user: only see notifications from their organizations

    // Get all organizations the user is a member of
    const userOrganizations = await prisma.userOrganization.findMany({
        where: { userId: userId },
        select: { organizationId: true }
    });
    const orgIds = userOrganizations.map(uo => uo.organizationId);

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { organizationId: { in: orgIds } },
          { userId: userId }
        ],
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        Organization: true // Include organization details for context
      }
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Échec de la récupération des notifications:', error);
    res.status(500).json({ success: false, message: 'Échec de la récupération des notifications' });
  }
});

/**
 * @route POST /api/notifications
 * @description Create a new notification for the current user.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user || !user.userId) {
        res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
        return;
    }
    const userId = user.userId;

    const { type, data, organizationId } = req.body;

    if (!type || !data) {
        res.status(400).json({ success: false, message: 'Type et data sont requis' });
        return;
    }

    // Get user's first organization if not provided
    let targetOrgId = organizationId;
    if (!targetOrgId) {
        const userOrg = await prisma.userOrganization.findFirst({
            where: { userId: userId },
            select: { organizationId: true }
        });
        targetOrgId = userOrg?.organizationId;
    }

    const notification = await prisma.notification.create({
        data: {
            type,
            data,
            userId,
            organizationId: targetOrgId,
            status: 'PENDING'
        },
        include: {
            Organization: true
        }
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error('Échec de la création de la notification:', error);
    res.status(500).json({ success: false, message: 'Échec de la création de la notification' });
  }
});

/**
 * @route PATCH /api/notifications/:id/read
 * @description Mark a specific notification as read.
 */
router.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: notificationId } = req.params;
        const user = (req as AuthenticatedRequest).user;

        if (!user || !user.userId) {
            res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
            return;
        }
        const userId = user.userId;

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification non trouvée' });
            return;
        }

        // Get all organizations the user is a member of
        const userOrganizations = await prisma.userOrganization.findMany({
            where: { userId: userId },
            select: { organizationId: true }
        });
        const orgIds = userOrganizations.map(uo => uo.organizationId);

        // A user can only mark a notification as read if it's for their organization
        // or directly assigned to them.
        const canAccess = notification.userId === userId || 
                          (notification.organizationId && orgIds.includes(notification.organizationId));

        if (!canAccess) {
             res.status(403).json({ success: false, message: 'Interdit: Vous n\'avez pas accès à cette notification.' });
             return;
        }

        const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: { status: 'READ' },
        });

        res.json({ success: true, data: updatedNotification });

    } catch (error) {
        console.error('Échec de la mise à jour de la notification:', error);
        res.status(500).json({ success: false, message: 'Échec de la mise à jour de la notification' });
    }
});

/**
 * @route DELETE /api/notifications/:id
 * @description Delete a specific notification.
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: notificationId } = req.params;
        const user = (req as AuthenticatedRequest).user;

        if (!user || !user.userId) {
            res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
            return;
        }
        const userId = user.userId;

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification non trouvée' });
            return;
        }

        const userOrganizations = await prisma.userOrganization.findMany({
            where: { userId: userId },
            select: { organizationId: true }
        });
        const orgIds = userOrganizations.map(uo => uo.organizationId);

        const canAccess = notification.userId === userId || 
                          (notification.organizationId && orgIds.includes(notification.organizationId));

        if (!canAccess) {
            res.status(403).json({ success: false, message: 'Interdit: Vous n\'avez pas accès à cette notification.' });
            return;
        }

        await prisma.notification.delete({
            where: { id: notificationId },
        });

        res.json({ success: true, message: 'Notification supprimée avec succès.' });

    } catch (error) {
        console.error('Échec de la suppression de la notification:', error);
        res.status(500).json({ success: false, message: 'Échec de la suppression de la notification' });
    }
});

/**
 * @route POST /api/notifications/check-emails
 * @description Déclencher manuellement une vérification des nouveaux emails pour l'utilisateur actuel
 */
router.post('/check-emails', async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as AuthenticatedRequest).user;
        if (!user || !user.userId) {
            res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
            return;
        }

        console.log(`🔔 [API] Vérification manuelle des emails pour l'utilisateur ${user.userId}`);
        
        // 🚀 SOLUTION IMMÉDIATE : Déclencher une synchronisation MANUELLE instantanée
        try {
            // Importer le service AutoMailSyncService pour forcer une sync immédiate
            const { autoMailSync } = await import('../services/AutoMailSyncService.js');
            
            // Déclencher la synchronisation pour l'utilisateur actuel
            console.log('🔥 [API] Déclenchement sync manuelle immédiate...');
            await autoMailSync.syncForUser(user.userId);
            
            console.log('✅ [API] Synchronisation manuelle terminée avec succès');
        } catch (syncError) {
            console.error('❌ [API] Erreur sync manuelle:', syncError);
            // Continuer malgré l'erreur de sync pour la notification backup
        }
        
        // Utiliser aussi le service de notification universel en backup
        const notificationService = UniversalNotificationService.getInstance();
        
        // Déclencher une vérification manuelle de tous les types d'événements
        console.log('🌟 [API] Vérification manuelle de TOUS les types d\'événements...');
        
        // Émettre un événement pour déclencher les vérifications
        notificationService.emit('manual-check-requested', { userId: user.userId });
        
        res.json({ 
            success: true, 
            message: 'Vérification des nouveaux emails effectuée avec succès.' 
        });

    } catch (error) {
        console.error('Échec de la vérification des emails:', error);
        res.status(500).json({ success: false, message: 'Échec de la vérification des emails' });
    }
});

/**
 * @route POST /api/notifications/check-emails-all
 * @description Déclencher manuellement une vérification des nouveaux emails pour tous les utilisateurs (Admin uniquement)
 */
router.post('/check-emails-all', async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as AuthenticatedRequest).user;
        if (!user || !user.userId) {
            res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
            return;
        }

        // Vérifier les permissions (admin ou super_admin seulement)
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            res.status(403).json({ success: false, message: 'Permissions insuffisantes. Admin requis.' });
            return;
        }

        console.log(`🔔 [API] Vérification manuelle globale des emails par ${user.role} ${user.userId}`);
        
        // Utiliser le nouveau service temps réel pour vérification globale
        const notificationService = RealTimeEmailNotificationService.getInstance();
        await notificationService.performBackupCheck();
        
        res.json({ 
            success: true, 
            message: 'Vérification des nouveaux emails effectuée pour tous les utilisateurs.' 
        });

    } catch (error) {
        console.error('Échec de la vérification globale des emails:', error);
        res.status(500).json({ success: false, message: 'Échec de la vérification globale des emails' });
    }
});


export default router;

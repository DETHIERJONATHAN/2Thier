import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import UniversalNotificationService from '../services/UniversalNotificationService.js';
import { prisma } from '../lib/prisma';
import { getGeminiService } from '../services/GoogleGeminiService';
import { logger } from '../lib/logger';

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
        res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
        return;
    }
    const userId = user.userId;
    const includeRead = req.query.includeRead === 'true';
    const statusFilter = includeRead ? { status: { in: ['PENDING', 'READ'] } } : { status: 'PENDING' as const };

    // SuperAdmin logic: can see ALL notifications BUT filter personal social notifications
    if (user.role === 'super_admin') {
        const notifications = await prisma.notification.findMany({
            where: {
              ...statusFilter,
              // Don't show other users' personal social notifications
              OR: [
                { type: { notIn: ['FRIEND_REQUEST_RECEIVED', 'FRIEND_REQUEST_ACCEPTED'] } },
                { userId: userId },
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { Organization: true }
        });
        res.json({ success: true, data: notifications });
        return;
    }

    // Normal user: only see notifications from their organizations
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
        ...statusFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { Organization: true }
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Échec de la récupération des notifications:', error);
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
    logger.error('Échec de la création de la notification:', error);
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
            data: { status: 'READ', readAt: new Date() },
        });

        res.json({ success: true, data: updatedNotification });

    } catch (error) {
        logger.error('Échec de la mise à jour de la notification:', error);
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
        logger.error('Échec de la suppression de la notification:', error);
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

        
        // 🚀 SOLUTION IMMÉDIATE : Déclencher une synchronisation MANUELLE instantanée
        try {
            // Importer le service AutoMailSyncService pour forcer une sync immédiate
            const { autoMailSync } = await import('../services/AutoMailSyncService.js');
            
            // Déclencher la synchronisation pour l'utilisateur actuel
            await autoMailSync.syncForUser(user.userId);
            
        } catch (syncError) {
            logger.error('❌ [API] Erreur sync manuelle:', syncError);
            // Continuer malgré l'erreur de sync pour la notification backup
        }
        
        // Utiliser aussi le service de notification universel en backup
        const notificationService = UniversalNotificationService.getInstance();
        
        // Déclencher une vérification manuelle de tous les types d'événements
        
        // Émettre un événement pour déclencher les vérifications
        notificationService.emit('manual-check-requested', { userId: user.userId });
        
        res.json({ 
            success: true, 
            message: 'Vérification des nouveaux emails effectuée avec succès.' 
        });

    } catch (error) {
        logger.error('Échec de la vérification des emails:', error);
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

        
        // Utiliser le nouveau service temps réel pour vérification globale
        const notificationService = RealTimeEmailNotificationService.getInstance();
        await notificationService.performBackupCheck();
        
        res.json({ 
            success: true, 
            message: 'Vérification des nouveaux emails effectuée pour tous les utilisateurs.' 
        });

    } catch (error) {
        logger.error('Échec de la vérification globale des emails:', error);
        res.status(500).json({ success: false, message: 'Échec de la vérification globale des emails' });
    }
});

/**
 * @route PATCH /api/notifications/mark-all-read
 * @description Marquer toutes les notifications PENDING comme READ pour l'utilisateur courant
 */
router.patch('/mark-all-read', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user?.userId) {
      res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
      return;
    }

    const userOrganizations = await prisma.userOrganization.findMany({
      where: { userId: user.userId },
      select: { organizationId: true }
    });
    const orgIds = userOrganizations.map(uo => uo.organizationId);

    const now = new Date();
    const result = await prisma.notification.updateMany({
      where: {
        status: 'PENDING',
        OR: [
          { organizationId: { in: orgIds } },
          { userId: user.userId }
        ],
      },
      data: { status: 'READ', readAt: now, updatedAt: now },
    });

    res.json({ success: true, updated: result.count });
  } catch (error) {
    logger.error('Erreur mark-all-read:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/notifications/stats
 * @description Statistiques des notifications (par type, par priorité) pour le tableau de bord
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user?.userId) {
      res.status(401).json({ success: false });
      return;
    }

    const userOrganizations = await prisma.userOrganization.findMany({
      where: { userId: user.userId },
      select: { organizationId: true }
    });
    const orgIds = userOrganizations.map(uo => uo.organizationId);

    const where = user.role === 'super_admin'
      ? { status: 'PENDING' as const }
      : {
          status: 'PENDING' as const,
          OR: [
            { organizationId: { in: orgIds } },
            { userId: user.userId }
          ],
        };

    const notifications = await prisma.notification.findMany({
      where,
      select: { type: true, priority: true, createdAt: true }
    });

    // Compteurs par type
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byPriority[n.priority || 'normal'] = (byPriority[n.priority || 'normal'] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: notifications.length,
        byType,
        byPriority,
        urgent: byPriority['urgent'] || 0,
        high: byPriority['high'] || 0,
      }
    });
  } catch (error) {
    logger.error('Erreur stats notifications:', error);
    res.status(500).json({ success: false });
  }
});

/**
 * @route POST /api/notifications/ai-digest
 * @description Générer un résumé IA intelligent des notifications via Gemini
 */
router.post('/ai-digest', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user?.userId) {
      res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
      return;
    }

    const userOrganizations = await prisma.userOrganization.findMany({
      where: { userId: user.userId },
      select: { organizationId: true }
    });
    const orgIds = userOrganizations.map(uo => uo.organizationId);

    // Récupérer les notifications récentes (dernières 24h ou PENDING)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { status: 'PENDING', organizationId: { in: orgIds } },
          { status: 'PENDING', userId: user.userId },
          { createdAt: { gte: since }, organizationId: { in: orgIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (notifications.length === 0) {
      res.json({
        success: true,
        data: {
          summary: "🎉 Aucune notification en attente ! Tout est à jour.",
          actions: [],
          stats: { total: 0 },
        }
      });
      return;
    }

    // Préparer le contexte pour Gemini
    const notifSummary = notifications.map(n => {
      const data = n.data as Record<string, unknown>;
      return `- [${n.type}] ${data?.message || 'Notification'} (${n.priority || 'normal'}, ${n.status}, ${new Date(n.createdAt).toLocaleString('fr-BE')})`;
    }).join('\n');

    const prompt = `Tu es l'assistant IA du CRM 2THIER Energy. Analyse ces ${notifications.length} notifications et génère un résumé exécutif concis en français.

Notifications récentes:
${notifSummary}

Génère un JSON avec exactement cette structure (pas de markdown, juste le JSON):
{
  "summary": "Résumé en 2-3 phrases maximum de la situation.",
  "urgentActions": ["Action urgente 1", "Action urgente 2"],
  "insights": "Un insight business utile basé sur les données.",
  "score": 85
}

Le score (0-100) représente la "santé opérationnelle" : 100 = tout va bien, <50 = situations urgentes non traitées.
Sois concis et actionnable. Utilise des emojis pertinents.`;

    try {
      const gemini = getGeminiService();
      const rawResponse = await gemini.chat(prompt);
      
      // Parser la réponse JSON de Gemini
      let aiResult;
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: rawResponse, urgentActions: [], insights: '', score: 50 };
      } catch {
        aiResult = { summary: rawResponse.substring(0, 500), urgentActions: [], insights: '', score: 50 };
      }

      res.json({
        success: true,
        data: {
          ...aiResult,
          stats: {
            total: notifications.length,
            pending: notifications.filter(n => n.status === 'PENDING').length,
            urgent: notifications.filter(n => (n as any).priority === 'urgent').length,
            high: notifications.filter(n => (n as any).priority === 'high').length,
          },
          generatedAt: new Date().toISOString(),
        }
      });
    } catch (aiError) {
      // Fallback sans IA
      logger.warn('[Notifications] Gemini non disponible, fallback sans IA:', aiError);
      const pending = notifications.filter(n => n.status === 'PENDING');
      const urgent = notifications.filter(n => (n as any).priority === 'urgent');

      res.json({
        success: true,
        data: {
          summary: `📊 ${pending.length} notification${pending.length > 1 ? 's' : ''} en attente${urgent.length > 0 ? `, dont ${urgent.length} urgente${urgent.length > 1 ? 's' : ''}` : ''}. Consultez vos notifications pour plus de détails.`,
          urgentActions: urgent.map(n => (n.data as unknown)?.message || 'Action requise').slice(0, 3),
          insights: '',
          score: urgent.length > 3 ? 30 : urgent.length > 0 ? 60 : pending.length > 10 ? 70 : 90,
          stats: {
            total: notifications.length,
            pending: pending.length,
            urgent: urgent.length,
            high: notifications.filter(n => (n as any).priority === 'high').length,
          },
          generatedAt: new Date().toISOString(),
        }
      });
    }
  } catch (error) {
    logger.error('Erreur AI digest:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du résumé IA' });
  }
});


export default router;

/**
 * 🌟 INTÉGRATION SYSTÈME NOTIFICATIONS DANS API CRM
 * 
 * Ce fichier intègre le système de notifications ultra-performant
 * dans votre serveur API Express existant.
 * 
 * AJOUTEZ CES LIGNES À VOTRE api-server.ts :
 * 
 * import { notificationSystem } from './services/NotificationApiIntegration';
 * 
 * // Après l'initialisation de votre app Express :
 * await notificationSystem.initializeWithServer(app);
 */

import express from 'express';
import { NotificationSystemInitializer } from './NotificationSystemInitializer';
import NotificationOrchestrator from './NotificationOrchestrator';
import { db } from '../lib/database';

export class NotificationApiIntegration {
  private static instance: NotificationApiIntegration;
  private notificationSystem: NotificationSystemInitializer;
  private orchestrator: NotificationOrchestrator;
  private app?: express.Application;

  private constructor() {
    this.notificationSystem = NotificationSystemInitializer.getInstance();
    this.orchestrator = NotificationOrchestrator.getInstance();
  }

  static getInstance(): NotificationApiIntegration {
    if (!this.instance) {
      this.instance = new NotificationApiIntegration();
    }
    return this.instance;
  }

  /**
   * 🚀 INITIALISER AVEC LE SERVEUR EXPRESS
   */
  async initializeWithServer(app: express.Application): Promise<void> {
    try {
      console.log('🎯 [NotificationAPI] Intégration au serveur Express...');
      
      this.app = app;

      // 1. Ajouter les routes API pour les notifications
      this.setupNotificationRoutes();

      // 2. Ajouter les webhooks Google
      this.setupGoogleWebhooks();

      // 3. Ajouter le middleware SSE pour temps réel
      this.setupServerSentEvents();

      // 4. Initialiser le système complet
      await this.notificationSystem.initialize();

      console.log('✅ [NotificationAPI] Intégration complète réussie !');

    } catch (error) {
      console.error('❌ [NotificationAPI] Erreur intégration:', error);
      throw error;
    }
  }

  /**
   * 📡 ROUTES API NOTIFICATIONS
   */
  private setupNotificationRoutes(): void {
    if (!this.app) return;

    // Route pour obtenir les notifications d'un utilisateur
    this.app.get('/api/notifications/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        const notifications = await this.getNotifications(
          userId,
          parseInt(page as string),
          parseInt(limit as string),
          unreadOnly === 'true'
        );

        res.json({
          success: true,
          data: notifications,
          message: 'Notifications récupérées'
        });

      } catch (error) {
        console.error('❌ [NotificationAPI] Erreur récupération notifications:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur récupération notifications'
        });
      }
    });

    // Route pour marquer une notification comme lue
    this.app.patch('/api/notifications/:notificationId/read', async (req, res) => {
      try {
        const { notificationId } = req.params;
        
        await this.markAsRead(notificationId);

        res.json({
          success: true,
          message: 'Notification marquée comme lue'
        });

      } catch (error) {
        console.error('❌ [NotificationAPI] Erreur marquage lu:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur marquage notification'
        });
      }
    });

    // Route pour obtenir les statistiques
    this.app.get('/api/notifications/stats/:organizationId', async (req, res) => {
      try {
        const { organizationId } = req.params;
        
        const stats = await this.getNotificationStats(organizationId);

        res.json({
          success: true,
          data: stats,
          message: 'Statistiques récupérées'
        });

      } catch (error) {
        console.error('❌ [NotificationAPI] Erreur stats:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur récupération statistiques'
        });
      }
    });

    // Route pour tester le système
    this.app.post('/api/notifications/test', async (req, res) => {
      try {
        const { userId, organizationId, type = 'NEW_EMAIL' } = req.body;

        await this.sendTestNotification(userId, organizationId, type);

        res.json({
          success: true,
          message: 'Notification test envoyée'
        });

      } catch (error) {
        console.error('❌ [NotificationAPI] Erreur test:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur envoi notification test'
        });
      }
    });

    console.log('📡 [NotificationAPI] Routes API configurées');
  }

  /**
   * 🎣 WEBHOOKS GOOGLE
   */
  private setupGoogleWebhooks(): void {
    if (!this.app) return;

    // Webhook Gmail
    this.app.post('/api/webhooks/google-gmail', express.raw({ type: 'application/json' }), async (req, res) => {
      try {
        console.log('📧 [NotificationAPI] Webhook Gmail reçu');
        
        // TODO: Traiter le webhook Gmail
        // const message = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString());
        
        res.status(200).send('OK');

      } catch (error) {
        console.error('❌ [NotificationAPI] Erreur webhook Gmail:', error);
        res.status(500).send('Error');
      }
    });

    // Webhook Google Calendar
    this.app.post('/api/webhooks/google-calendar', express.raw({ type: 'application/json' }), async (req, res) => {
      try {
        console.log('📅 [NotificationAPI] Webhook Calendar reçu');
        
        // TODO: Traiter le webhook Calendar
        
        res.status(200).send('OK');

      } catch (error) {
        console.error('❌ [NotificationAPI] Erreur webhook Calendar:', error);
        res.status(500).send('Error');
      }
    });

    console.log('🎣 [NotificationAPI] Webhooks Google configurés');
  }

  /**
   * ⚡ SERVER-SENT EVENTS POUR TEMPS RÉEL
   */
  private setupServerSentEvents(): void {
    if (!this.app) return;

    this.app.get('/api/notifications/stream/:userId', (req, res) => {
      const { userId } = req.params;

      // Configuration SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Envoyer ping initial
      res.write('data: {"type":"connected","message":"Stream notifications actif"}\n\n');

      // Écouter les notifications pour cet utilisateur
      const notificationHandler = (notification: any) => {
        if (notification.userId === userId) {
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        }
      };

      this.orchestrator.on('notification', notificationHandler);
      this.orchestrator.on('urgent-notification', notificationHandler);

      // Nettoyage à la déconnexion
      req.on('close', () => {
        this.orchestrator.off('notification', notificationHandler);
        this.orchestrator.off('urgent-notification', notificationHandler);
        res.end();
      });

      // Keep-alive toutes les 30 secondes
      const keepAlive = setInterval(() => {
        res.write('data: {"type":"ping"}\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(keepAlive);
      });
    });

    console.log('⚡ [NotificationAPI] Server-Sent Events configurés');
  }

  /**
   * 🔧 MÉTHODES UTILITAIRES
   */
  private async getNotifications(userId: string, page: number, limit: number, unreadOnly: boolean) {
    const where: any = { userId };
    if (unreadOnly) {
      where.status = 'PENDING';
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const total = await db.notification.count({ where });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  private async markAsRead(notificationId: string) {
    await db.notification.update({
      where: { id: notificationId },
      data: { 
        status: 'READ',
        readAt: new Date()
      }
    });
  }

  private async getNotificationStats(organizationId: string) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await db.notification.groupBy({
      by: ['type', 'status'],
      where: {
        organizationId,
        createdAt: { gte: last24h }
      },
      _count: true
    });

    return {
      total: stats.reduce((sum, s) => sum + s._count, 0),
      byType: stats.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + s._count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: stats.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + s._count;
        return acc;
      }, {} as Record<string, number>),
      period: '24h'
    };
  }

  private async sendTestNotification(userId: string, organizationId: string, type: string) {
    const { UniversalNotificationService } = await import('./UniversalNotificationService');
    const service = UniversalNotificationService.getInstance();

    await service.createNotification({
      type: type as any,
      title: '🧪 Notification de test',
      message: 'Ceci est une notification de test du système',
      userId,
      organizationId,
      priority: 'medium',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      },
      tags: ['test']
    });
  }
}

// Export de l'instance pour utilisation directe
export const notificationSystem = NotificationApiIntegration.getInstance();
export default NotificationApiIntegration;

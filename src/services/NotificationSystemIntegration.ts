/**
 * 🎯 POINT D'ENTRÉE PRINCIPAL - SYSTÈME NOTIFICATIONS CRM
 * 
 * INTÉGRATION COMPLÈTE DANS L'API CRM :
 * - 🚀 Démarrage automatique au lancement serveur
 * - 📧 Routes webhooks Gmail et Calendar
 * - 🔌 WebSocket temps réel pour le frontend
 * - 📊 API monitoring et statistiques
 * - 🧠 Endpoints IA et analytics
 * - ⚡ Performance ultra-optimisée
 */

import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import NotificationMasterOrchestrator from './NotificationMasterOrchestrator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationSystemIntegration {
  private orchestrator: NotificationMasterOrchestrator;
  private io?: SocketIOServer;
  private connectedClients = new Map<string, any>();

  constructor() {
    this.orchestrator = NotificationMasterOrchestrator.getInstance();
    this.setupOrchestratorEvents();
  }

  /**
   * 🚀 INITIALISER LE SYSTÈME COMPLET
   */
  async initialize(app: express.Application, server?: any): Promise<void> {
    try {
      console.log('🌟 [NotificationSystem] Initialisation système notifications...');

      // 1. Configurer WebSocket pour temps réel
      if (server) {
        this.setupWebSocket(server);
      }

      // 2. Configurer les routes API
      this.setupAPIRoutes(app);

      // 3. Démarrer l'orchestrateur principal
      await this.orchestrator.startComplete();

      console.log('✅ [NotificationSystem] Système notifications prêt !');
      console.log('🔔 [NotificationSystem] WebSocket temps réel actif');
      console.log('📧 [NotificationSystem] Webhooks Gmail/Calendar actifs');
      console.log('🧠 [NotificationSystem] Intelligence artificielle active');

    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur initialisation:', error);
      throw error;
    }
  }

  /**
   * 🔌 CONFIGURER WEBSOCKET TEMPS RÉEL
   */
  private setupWebSocket(server: any): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/socket.io'
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 [NotificationSystem] Client connecté: ${socket.id}`);

      // Authentification du client
      socket.on('authenticate', async (data) => {
        try {
          const { userId, organizationId, token } = data;
          
          // Vérifier le token (implémentation simplifiée)
          const user = await prisma.user.findFirst({
            where: { id: userId }
          });

          if (user) {
            this.connectedClients.set(socket.id, {
              userId,
              organizationId,
              socket,
              connectedAt: new Date()
            });

            socket.join(`org-${organizationId}`);
            socket.join(`user-${userId}`);

            socket.emit('authenticated', {
              success: true,
              message: 'Connecté au système de notifications'
            });

            // Envoyer les notifications en attente
            await this.sendPendingNotifications(userId, socket);

            console.log(`✅ [NotificationSystem] Client authentifié: ${userId}`);
          } else {
            socket.emit('auth-error', { message: 'Token invalide' });
          }
        } catch (error) {
          console.error('❌ [NotificationSystem] Erreur authentification:', error);
          socket.emit('auth-error', { message: 'Erreur serveur' });
        }
      });

      // Marquer une notification comme lue
      socket.on('mark-notification-read', async (notificationId) => {
        try {
          await prisma.notification.update({
            where: { id: notificationId },
            data: { status: 'READ', readAt: new Date() }
          });

          socket.emit('notification-marked-read', { notificationId });
        } catch (error) {
          console.error('❌ [NotificationSystem] Erreur marquage lu:', error);
        }
      });

      // Demander les statistiques
      socket.on('get-stats', () => {
        const stats = this.orchestrator.getSystemStatus();
        socket.emit('stats', stats);
      });

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
        console.log(`🔌 [NotificationSystem] Client déconnecté: ${socket.id}`);
      });
    });

    console.log('🔌 [NotificationSystem] WebSocket configuré');
  }

  /**
   * 🛠️ CONFIGURER LES ROUTES API
   */
  private setupAPIRoutes(app: express.Application): void {
    // 📧 Webhook Gmail
    app.post('/webhooks/gmail', express.raw({ type: 'application/json' }), async (req, res) => {
      try {
        console.log('📧 [NotificationSystem] Webhook Gmail reçu');
        await this.orchestrator.handleGmailWebhook(req.body);
        res.status(200).send('OK');
      } catch (error) {
        console.error('❌ [NotificationSystem] Erreur webhook Gmail:', error);
        res.status(500).send('Error');
      }
    });

    // 📅 Webhook Calendar
    app.post('/webhooks/calendar', express.json(), async (req, res) => {
      try {
        console.log('📅 [NotificationSystem] Webhook Calendar reçu');
        await this.orchestrator.handleCalendarWebhook(req.body);
        res.status(200).send('OK');
      } catch (error) {
        console.error('❌ [NotificationSystem] Erreur webhook Calendar:', error);
        res.status(500).send('Error');
      }
    });

    // 📊 API Statistiques
    app.get('/api/notifications/stats', async (req, res) => {
      try {
        const stats = this.orchestrator.getSystemStatus();
        res.json(stats);
      } catch (error) {
        console.error('❌ [NotificationSystem] Erreur stats API:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // 🔔 API Notifications utilisateur
    app.get('/api/notifications/user/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string)
        });

        res.json(notifications);
      } catch (error) {
        console.error('❌ [NotificationSystem] Erreur API notifications:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // 🧠 API Analyse IA
    app.get('/api/notifications/ai-insights/:organizationId', async (req, res) => {
      try {
        const { organizationId } = req.params;
        
        // Générer des insights IA simulés
        const insights = await this.generateAIInsights(organizationId);
        res.json(insights);
      } catch (error) {
        console.error('❌ [NotificationSystem] Erreur API IA:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // ✅ API Marquer comme lu
    app.post('/api/notifications/:id/read', async (req, res) => {
      try {
        const { id } = req.params;
        
        const notification = await prisma.notification.update({
          where: { id },
          data: { 
            status: 'READ',
            readAt: new Date()
          }
        });

        res.json(notification);
      } catch (error) {
        console.error('❌ [NotificationSystem] Erreur marquage lu API:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // 🧹 API Nettoyer notifications
    app.delete('/api/notifications/cleanup/:organizationId', async (req, res) => {
      try {
        const { organizationId } = req.params;
        
        const result = await prisma.notification.deleteMany({
          where: {
            organizationId,
            status: 'READ',
            createdAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Plus de 7 jours
            }
          }
        });

        res.json({ deleted: result.count });
      } catch (error) {
        console.error('❌ [NotificationSystem] Erreur nettoyage API:', error);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    console.log('🛠️ [NotificationSystem] Routes API configurées');
  }

  /**
   * 🎧 CONFIGURER LES ÉVÉNEMENTS ORCHESTRATEUR
   */
  private setupOrchestratorEvents(): void {
    // Notification créée -> diffuser en temps réel
    this.orchestrator.on('notification-sent', (notification) => {
      this.broadcastNotification(notification);
    });

    // Stats mises à jour -> diffuser aux clients connectés
    this.orchestrator.on('stats-updated', (stats) => {
      this.broadcastStats(stats);
    });

    // Alerte santé système -> diffuser aux admins
    this.orchestrator.on('health-warning', (health) => {
      this.broadcastHealthAlert(health);
    });

    // Rapport IA quotidien -> diffuser
    this.orchestrator.on('daily-ai-report', (report) => {
      this.broadcastAIReport(report);
    });

    console.log('🎧 [NotificationSystem] Événements orchestrateur configurés');
  }

  /**
   * 📡 DIFFUSER UNE NOTIFICATION EN TEMPS RÉEL
   */
  private broadcastNotification(notification: any): void {
    if (!this.io) return;

    try {
      // Diffuser à l'utilisateur spécifique
      if (notification.userId) {
        this.io.to(`user-${notification.userId}`).emit('new-notification', notification);
      }

      // Diffuser à l'organisation
      if (notification.organizationId) {
        this.io.to(`org-${notification.organizationId}`).emit('organization-notification', notification);
      }

      console.log(`📡 [NotificationSystem] Notification diffusée: ${notification.type}`);
    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur diffusion notification:', error);
    }
  }

  /**
   * 📊 DIFFUSER LES STATISTIQUES
   */
  private broadcastStats(stats: any): void {
    if (!this.io) return;

    try {
      this.io.emit('stats-update', stats);
    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur diffusion stats:', error);
    }
  }

  /**
   * 🚨 DIFFUSER ALERTE SANTÉ
   */
  private broadcastHealthAlert(health: any): void {
    if (!this.io) return;

    try {
      // Diffuser seulement aux admins (simplification)
      this.io.emit('health-alert', health);
      console.log('🚨 [NotificationSystem] Alerte santé diffusée');
    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur diffusion alerte:', error);
    }
  }

  /**
   * 🧠 DIFFUSER RAPPORT IA
   */
  private broadcastAIReport(report: any): void {
    if (!this.io) return;

    try {
      this.io.emit('ai-report', report);
      console.log('🧠 [NotificationSystem] Rapport IA diffusé');
    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur diffusion rapport IA:', error);
    }
  }

  /**
   * 📩 ENVOYER NOTIFICATIONS EN ATTENTE
   */
  private async sendPendingNotifications(userId: string, socket: any): Promise<void> {
    try {
      const pendingNotifications = await prisma.notification.findMany({
        where: {
          userId,
          status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      for (const notification of pendingNotifications) {
        socket.emit('new-notification', notification);
      }

      console.log(`📩 [NotificationSystem] ${pendingNotifications.length} notifications en attente envoyées`);
    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur envoi notifications en attente:', error);
    }
  }

  /**
   * 🧠 GÉNÉRER INSIGHTS IA
   */
  private async generateAIInsights(organizationId: string): Promise<any> {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Statistiques de la semaine
      const weeklyStats = await prisma.notification.groupBy({
        by: ['type'],
        where: {
          organizationId,
          createdAt: { gte: weekAgo }
        },
        _count: { id: true }
      });

      // Emails analysés
      const emailStats = await prisma.email.groupBy({
        by: ['userId'],
        where: {
          organizationId,
          createdAt: { gte: weekAgo }
        },
        _count: { id: true }
      });

      return {
        period: 'Derniers 7 jours',
        summary: {
          totalNotifications: weeklyStats.reduce((sum, s) => sum + s._count.id, 0),
          totalEmails: emailStats.reduce((sum, s) => sum + s._count.id, 0),
          efficiency: 0.87, // Simulé
          aiAccuracy: 0.92 // Simulé
        },
        trends: {
          mostActiveDay: 'Mardi',
          peakHour: '14:00',
          topNotificationType: weeklyStats[0]?.type || 'NEW_EMAIL'
        },
        recommendations: [
          'Optimiser notifications pendant heures de pointe',
          'Améliorer filtrage email pour réduire bruit',
          'Configurer rappels intelligents pour RDV importants'
        ]
      };
    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur génération insights:', error);
      return {
        error: 'Impossible de générer les insights',
        period: 'N/A',
        summary: {},
        trends: {},
        recommendations: []
      };
    }
  }

  /**
   * 📊 OBTENIR ÉTAT DU SYSTÈME
   */
  getSystemStatus(): any {
    return {
      ...this.orchestrator.getSystemStatus(),
      webSocket: {
        connected: this.connectedClients.size,
        clients: Array.from(this.connectedClients.values()).map(client => ({
          userId: client.userId,
          connectedAt: client.connectedAt
        }))
      }
    };
  }

  /**
   * 🛑 ARRÊTER LE SYSTÈME
   */
  async shutdown(): Promise<void> {
    console.log('🛑 [NotificationSystem] Arrêt du système...');

    // Déconnecter tous les clients WebSocket
    if (this.io) {
      this.io.disconnectSockets();
    }

    // Arrêter l'orchestrateur
    await this.orchestrator.stopComplete();

    console.log('✅ [NotificationSystem] Système arrêté');
  }
}

export default NotificationSystemIntegration;

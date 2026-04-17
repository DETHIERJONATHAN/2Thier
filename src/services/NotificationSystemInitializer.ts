/**
 * 🎯 INITIALIZATEUR SYSTÈME NOTIFICATIONS ULTRA-PERFORMANT
 * 
 * CE FICHIER DÉMARRE TOUT LE SYSTÈME DE NOTIFICATIONS :
 * - 🚀 Orchestrateur principal
 * - 📧 Service Gmail avec IA
 * - 📅 Service Calendar intelligent
 * - 🔔 Service universel de notifications
 * - ⚡ Notifications temps réel ultra-rapides
 * - 🧠 Intelligence artificielle intégrée
 */

import NotificationOrchestrator from './NotificationOrchestrator';
import { UniversalNotificationService } from './UniversalNotificationService';
import { logger } from '../lib/logger';

export class NotificationSystemInitializer {
  private static instance: NotificationSystemInitializer;
  private orchestrator: NotificationOrchestrator;
  private isInitialized = false;

  private constructor() {
    this.orchestrator = NotificationOrchestrator.getInstance();
  }

  static getInstance(): NotificationSystemInitializer {
    if (!this.instance) {
      this.instance = new NotificationSystemInitializer();
    }
    return this.instance;
  }

  /**
   * 🚀 INITIALISATION COMPLÈTE DU SYSTÈME
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {

      // Démarrer l'orchestrateur complet
      await this.orchestrator.startCompleteSystem();

      // Configurer les événements globaux
      this.setupGlobalEventHandling();

      this.isInitialized = true;


    } catch (error) {
      logger.error('❌ [NotificationSystem] ERREUR INITIALISATION:', error);
      throw error;
    }
  }

  /**
   * 🔗 CONFIGURATION ÉVÉNEMENTS GLOBAUX
   */
  private setupGlobalEventHandling(): void {
    // Écouter les notifications urgentes
    this.orchestrator.on('urgent-notification', (data) => {
      this.handleUrgentNotification(data);
    });

    // Écouter toutes les notifications
    this.orchestrator.on('notification', (data) => {
      this.handleRegularNotification(data);
    });

    // Gestion des erreurs système
    process.on('uncaughtException', (error) => {
      logger.error('💥 [NotificationSystem] Erreur non gérée:', error);
      this.handleSystemError(error);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('💥 [NotificationSystem] Promesse rejetée:', reason);
      this.handleSystemError(reason);
    });
  }

  /**
   * 🚨 GESTION NOTIFICATIONS URGENTES
   */
  private handleUrgentNotification(data: unknown): void {
    try {
      
      // Route by notification type
      switch (data.type) {
        case 'urgent-email':
          this.handleUrgentEmail(data.data);
          break;
        case 'urgent-meeting':
          this.handleUrgentMeeting(data.data);
          break;
        default:
      }

    } catch (error) {
      logger.error('❌ [NotificationSystem] Erreur notification urgente:', error);
    }
  }

  /**
   * 🔔 GESTION NOTIFICATIONS NORMALES
   */
  private handleRegularNotification(data: unknown): void {
    try {
      // Logique de routage des notifications normales
      
    } catch (error) {
      logger.error('❌ [NotificationSystem] Erreur notification normale:', error);
    }
  }

  /**
   * 📧 GESTION EMAIL URGENT
   */
  private handleUrgentEmail(emailData: unknown): void {
    
    // Stub — urgent email actions (push, SMS, desktop alert) not yet wired
  }

  /**
   * 📅 GESTION MEETING URGENT
   */
  private handleUrgentMeeting(meetingData: unknown): void {
    
    // Stub — urgent meeting actions (audio alert, auto-open link) not yet wired
  }

  /**
   * 💥 GESTION ERREURS SYSTÈME
   */
  private handleSystemError(error: unknown): void {
    logger.error('💥 [NotificationSystem] ERREUR SYSTÈME:', error);
    
    // Stub — admin alerting and auto-recovery not yet wired
  }

  /**
   * 📊 OBTENIR STATISTIQUES SYSTÈME
   */
  async getSystemStats(): Promise<unknown> {
    try {
      const universal = UniversalNotificationService.getInstance();
      const universalStatus = universal.getStatus();

      // Aggregate stats from all notification services
      return {
        isRunning: this.isInitialized,
        services: {
          universal: universalStatus.isRunning,
          gmail: true,
          calendar: true,
          orchestrator: true
        },
        universal: universalStatus,
        // stats: await universal.getStats('organization-id')
      };

    } catch (error) {
      logger.error('❌ [NotificationSystem] Erreur stats:', error);
      return { error: error.message };
    }
  }

  /**
   * 🛑 ARRÊT PROPRE DU SYSTÈME
   */
  async shutdown(): Promise<void> {
    try {
      
      this.orchestrator.stop();
      this.isInitialized = false;
      

    } catch (error) {
      logger.error('❌ [NotificationSystem] Erreur arrêt:', error);
    }
  }
}

// Export des instances pour utilisation directe
export const notificationSystem = NotificationSystemInitializer.getInstance();
export default NotificationSystemInitializer;

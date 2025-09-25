/**
 * 🚀 SERVICE D'INITIALISATION DU SYSTÈME DE NOTIFICATIONS COMPLET
 * 
 * Ce service démarre et coordonne tous les services de notifications :
 * - UniversalNotificationService (notifications tous types)
 * - RealTimeEmailNotificationService (emails temps réel)
 * - AutoMailSyncService (synchronisation emails)
 */

import UniversalNotificationService from './UniversalNotificationService.js';
import RealTimeEmailNotificationService from './RealTimeEmailNotificationService.js';
import { autoMailSync } from './AutoMailSyncService.js';

export class NotificationSystemService {
  private static instance: NotificationSystemService;
  private isStarted = false;

  private constructor() {}

  static getInstance(): NotificationSystemService {
    if (!this.instance) {
      this.instance = new NotificationSystemService();
    }
    return this.instance;
  }

  /**
   * 🚀 DÉMARRER TOUT LE SYSTÈME DE NOTIFICATIONS
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.log('⚠️ [NotificationSystem] Système déjà démarré');
      return;
    }

    console.log('🌟 [NotificationSystem] Démarrage du système de notifications complet...');

    try {
      // 1. 🌟 Démarrer le service universel
      console.log('1️⃣ [NotificationSystem] Démarrage UniversalNotificationService...');
      const universalService = UniversalNotificationService.getInstance();
      universalService.start();

      // 2. 📧 Démarrer le service de notifications email temps réel
      console.log('2️⃣ [NotificationSystem] Démarrage RealTimeEmailNotificationService...');
      const emailNotificationService = RealTimeEmailNotificationService.getInstance();
      emailNotificationService.start();

      // 3. 🔄 Démarrer la synchronisation email automatique
      console.log('3️⃣ [NotificationSystem] Démarrage AutoMailSyncService...');
      await autoMailSync.start();

      // 4. 🔗 Connecter les services entre eux
      this.setupServiceConnections();

      this.isStarted = true;
      console.log('✅ [NotificationSystem] Système de notifications complet démarré avec succès !');

      // 5. 📊 Afficher le statut
      this.logSystemStatus();

    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur lors du démarrage:', error);
      throw error;
    }
  }

  /**
   * 🔗 CONNECTER LES SERVICES ENTRE EUX
   */
  private setupServiceConnections(): void {
    console.log('🔗 [NotificationSystem] Configuration des connexions inter-services...');

    // Écouter les événements de nouveaux emails depuis AutoMailSyncService
    const emailNotificationService = RealTimeEmailNotificationService.getInstance();
    
    // Quand AutoMailSyncService trouve un nouveau email, déclencher une notification
    autoMailSync.on('newEmailFound', (emailData) => {
      console.log('🎯 [NotificationSystem] Nouvel email détecté, création notification...');
      emailNotificationService.notifyNewEmail(emailData);
    });

    console.log('✅ [NotificationSystem] Connexions inter-services configurées');
  }

  /**
   * 📊 AFFICHER LE STATUT DU SYSTÈME
   */
  private logSystemStatus(): void {
    console.log('\n🎯 [NotificationSystem] STATUT DU SYSTÈME :');
    console.log('=' .repeat(50));
    console.log('✅ UniversalNotificationService : ACTIF');
    console.log('✅ RealTimeEmailNotificationService : ACTIF');
    console.log('✅ AutoMailSyncService : ACTIF');
    console.log('✅ Connexions inter-services : CONFIGURÉES');
    console.log('=' .repeat(50));
    console.log('🔔 Le système de notifications est opérationnel !\n');
  }

  /**
   * 🛑 ARRÊTER TOUT LE SYSTÈME
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      console.log('⚠️ [NotificationSystem] Système déjà arrêté');
      return;
    }

    console.log('🛑 [NotificationSystem] Arrêt du système de notifications...');

    try {
      // Arrêter tous les services
      const universalService = UniversalNotificationService.getInstance();
      universalService.stop();

      const emailNotificationService = RealTimeEmailNotificationService.getInstance();
      emailNotificationService.stop();

      await autoMailSync.stop();

      this.isStarted = false;
      console.log('✅ [NotificationSystem] Système de notifications arrêté');

    } catch (error) {
      console.error('❌ [NotificationSystem] Erreur lors de l\'arrêt:', error);
    }
  }

  /**
   * 📋 OBTENIR LE STATUT DU SYSTÈME
   */
  getStatus(): object {
    return {
      isStarted: this.isStarted,
      services: {
        universal: this.isStarted,
        emailRealTime: this.isStarted,
        autoSync: this.isStarted
      },
      startedAt: this.isStarted ? new Date().toISOString() : null
    };
  }
}

export default NotificationSystemService;

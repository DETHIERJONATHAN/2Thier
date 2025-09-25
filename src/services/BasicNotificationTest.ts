/**
 * 🔔 SERVICE DE NOTIFICATIONS BASIQUE - VERSION TEST
 * 
 * VERSION SIMPLIFIÉE POUR TESTER LE SYSTÈME :
 * - ✅ Service universel fonctionnel
 * - ✅ Test de création de notifications
 * - ✅ Intégration API basique
 * - 🔄 Gmail et Calendar en attente
 */

import UniversalNotificationService from './UniversalNotificationService';

export class BasicNotificationTest {
  private universalService: UniversalNotificationService;

  constructor() {
    this.universalService = UniversalNotificationService.getInstance();
  }

  /**
   * 🚀 DÉMARRER LE TEST BASIQUE
   */
  async startBasicTest(): Promise<void> {
    try {
      console.log('🧪 [BasicNotificationTest] Démarrage test basique...');
      
      // 1. Démarrer le service universel
      this.universalService.start();
      
      // 2. Test de création de notification
      await this.testNotificationCreation();
      
      console.log('✅ [BasicNotificationTest] Test basique réussi !');
      
    } catch (error) {
      console.error('❌ [BasicNotificationTest] Erreur test:', error);
      throw error;
    }
  }

  /**
   * 🧪 TESTER LA CRÉATION DE NOTIFICATIONS
   */
  private async testNotificationCreation(): Promise<void> {
    try {
      console.log('🧪 [BasicNotificationTest] Test création notification...');
      
      // Créer une notification de test
      await this.universalService.createNotification({
        type: 'SYSTEM_ALERT',
        title: 'Test du système de notifications',
        message: 'Le système de notifications est opérationnel !',
        organizationId: 'test-org',
        priority: 'medium',
        metadata: {
          testMode: true,
          timestamp: new Date()
        },
        tags: ['test', 'system']
      });
      
      console.log('✅ [BasicNotificationTest] Notification de test créée !');
      
    } catch (error) {
      console.error('❌ [BasicNotificationTest] Erreur test notification:', error);
      throw error;
    }
  }

  /**
   * 📧 TESTER NOTIFICATION EMAIL
   */
  async testEmailNotification(): Promise<void> {
    try {
      await this.universalService.notifyNewEmail({
        emailId: 'test-email-123',
        from: 'test@example.com',
        subject: 'Email de test',
        userId: 'test-user',
        organizationId: 'test-org'
      });
      
      console.log('✅ [BasicNotificationTest] Notification email de test créée !');
      
    } catch (error) {
      console.error('❌ [BasicNotificationTest] Erreur test email:', error);
    }
  }

  /**
   * 👥 TESTER NOTIFICATION LEAD
   */
  async testLeadNotification(): Promise<void> {
    try {
      await this.universalService.notifyNewLead({
        leadId: 'test-lead-123',
        name: 'Prospect Test',
        email: 'prospect@test.com',
        source: 'TEST',
        organizationId: 'test-org'
      });
      
      console.log('✅ [BasicNotificationTest] Notification lead de test créée !');
      
    } catch (error) {
      console.error('❌ [BasicNotificationTest] Erreur test lead:', error);
    }
  }

  /**
   * 📊 OBTENIR STATISTIQUES TEST
   */
  async getTestStats(): Promise<any> {
    try {
      const stats = await this.universalService.getStats('test-org');
      console.log('📊 [BasicNotificationTest] Stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ [BasicNotificationTest] Erreur stats:', error);
      return { error: 'Impossible de récupérer les stats' };
    }
  }

  /**
   * 🛑 ARRÊTER LE TEST
   */
  stop(): void {
    this.universalService.stop();
    console.log('✅ [BasicNotificationTest] Test arrêté');
  }
}

export default BasicNotificationTest;

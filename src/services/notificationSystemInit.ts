/**
 * 🎯 INTÉGRATION DU SYSTÈME DE NOTIFICATIONS DANS LE SERVEUR
 * 
 * Ce fichier doit être importé et appelé au démarrage du serveur principal
 */

import NotificationSystemService from './NotificationSystemService.js';

let notificationSystem: NotificationSystemService | null = null;

/**
 * 🚀 INITIALISER LE SYSTÈME DE NOTIFICATIONS
 * À appeler au démarrage du serveur
 */
export async function initializeNotificationSystem(): Promise<void> {
  try {
    console.log('🎯 [INIT] Initialisation du système de notifications...');
    
    notificationSystem = NotificationSystemService.getInstance();
    await notificationSystem.start();
    
    console.log('✅ [INIT] Système de notifications initialisé avec succès');
    
    // Afficher les instructions pour l'utilisateur
    console.log('\n📋 [NOTIFICATIONS] FONCTIONNALITÉS DISPONIBLES :');
    console.log('  • 📧 Notifications email temps réel');
    console.log('  • 👥 Notifications nouveaux leads');  
    console.log('  • 📞 Notifications appels manqués');
    console.log('  • 📅 Rappels rendez-vous');
    console.log('  • 💰 Notifications devis/factures');
    console.log('  • 🔔 Alertes système');
    console.log('');

  } catch (error) {
    console.error('❌ [INIT] Erreur initialisation système notifications:', error);
    throw error;
  }
}

/**
 * 🛑 ARRÊTER LE SYSTÈME DE NOTIFICATIONS
 * À appeler à l'arrêt du serveur
 */
export async function shutdownNotificationSystem(): Promise<void> {
  try {
    if (notificationSystem) {
      console.log('🛑 [SHUTDOWN] Arrêt du système de notifications...');
      await notificationSystem.stop();
      console.log('✅ [SHUTDOWN] Système de notifications arrêté');
    }
  } catch (error) {
    console.error('❌ [SHUTDOWN] Erreur arrêt système notifications:', error);
  }
}

/**
 * 📊 OBTENIR LE STATUT DU SYSTÈME
 */
export function getNotificationSystemStatus(): object {
  if (!notificationSystem) {
    return { status: 'not_initialized' };
  }
  return notificationSystem.getStatus();
}

/**
 * 🎯 OBTENIR L'INSTANCE DU SYSTÈME (pour utilisation dans les routes)
 */
export function getNotificationSystemInstance(): NotificationSystemService | null {
  return notificationSystem;
}

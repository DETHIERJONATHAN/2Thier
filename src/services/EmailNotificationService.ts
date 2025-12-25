/**
 * 📧 SERVICE DE NOTIFICATIONS EMAIL
 * 
 * Ce service gère la création de notifications quand de nouveaux emails sont reçus.
 * Il s'intègre avec le système de synchronisation automatique des emails.
 */

import { db } from '../lib/database';

const prisma = db;

interface EmailNotificationData {
  emailId: string;
  from: string;
  subject: string;
  folder: string;
  receivedAt: Date;
}

export class EmailNotificationService {
  
  /**
   * Créer une notification pour un nouvel email reçu
   */
  static async createNewEmailNotification(
    userId: string,
    organizationId: string,
    emailData: EmailNotificationData
  ): Promise<void> {
    try {
      console.log(`🔔 [EmailNotification] Création notification pour: ${emailData.subject}`);
      
      // Créer la notification dans la base de données
      await prisma.notification.create({
        data: {
          organizationId,
          userId,
          type: 'NEW_MAIL_RECEIVED',
          data: {
            message: `📧 Nouveau message de ${this.truncateString(emailData.from, 30)}`,
            emailId: emailData.emailId,
            from: emailData.from,
            subject: this.truncateString(emailData.subject, 50),
            folder: emailData.folder,
            timestamp: emailData.receivedAt.toISOString(),
            details: `Sujet: "${emailData.subject}"`
          },
          status: 'PENDING'
        }
      });
      
      console.log(`✅ [EmailNotification] Notification créée pour l'email: ${emailData.subject}`);
      
    } catch (error) {
      console.error('❌ [EmailNotification] Erreur lors de la création de la notification:', error);
    }
  }

  /**
   * Créer une notification groupée pour plusieurs nouveaux emails
   */
  static async createBulkEmailNotification(
    userId: string,
    organizationId: string,
    emailCount: number,
    latestEmail?: EmailNotificationData
  ): Promise<void> {
    try {
      console.log(`🔔 [EmailNotification] Création notification groupée pour ${emailCount} emails`);
      
      let message = `📧 ${emailCount} nouveaux messages reçus`;
      let details = `Vous avez reçu ${emailCount} nouveaux emails`;
      
      if (latestEmail) {
        message = `📧 ${emailCount} nouveaux messages (dernier: ${this.truncateString(latestEmail.from, 25)})`;
        details = `Dernier email: "${this.truncateString(latestEmail.subject, 40)}" de ${latestEmail.from}`;
      }
      
      await prisma.notification.create({
        data: {
          organizationId,
          userId,
          type: 'NEW_MAIL_RECEIVED',
          data: {
            message,
            emailCount,
            timestamp: new Date().toISOString(),
            details,
            latestEmailId: latestEmail?.emailId,
            folder: latestEmail?.folder || 'inbox'
          },
          status: 'PENDING'
        }
      });
      
      console.log(`✅ [EmailNotification] Notification groupée créée pour ${emailCount} emails`);
      
    } catch (error) {
      console.error('❌ [EmailNotification] Erreur lors de la création de la notification groupée:', error);
    }
  }

  /**
   * Vérifier et créer des notifications pour les nouveaux emails d'un utilisateur
   */
  static async checkAndNotifyNewEmails(userId: string): Promise<void> {
    try {
      // Récupérer l'organisation de l'utilisateur
      const userOrg = await prisma.userOrganization.findFirst({
        where: { userId },
        select: { organizationId: true }
      });

      if (!userOrg) {
        console.log(`⚠️ [EmailNotification] Pas d'organisation trouvée pour l'utilisateur ${userId}`);
        return;
      }

      // Chercher les nouveaux emails des dernières 5 minutes (non notifiés)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const newEmails = await prisma.email.findMany({
        where: {
          userId,
          createdAt: {
            gte: fiveMinutesAgo
          },
          // Ne pas notifier les emails dans les dossiers spam, trash, sent, drafts
          folder: {
            in: ['inbox']
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10 // Limiter à 10 emails pour éviter le spam de notifications
      });

      if (newEmails.length === 0) {
        return; // Pas de nouveaux emails
      }

      console.log(`📧 [EmailNotification] ${newEmails.length} nouveaux emails trouvés pour l'utilisateur ${userId}`);

      if (newEmails.length === 1) {
        // Un seul email : notification individuelle
        const email = newEmails[0];
        await this.createNewEmailNotification(
          userId,
          userOrg.organizationId,
          {
            emailId: email.id,
            from: email.from,
            subject: email.subject,
            folder: email.folder,
            receivedAt: email.createdAt
          }
        );
      } else {
        // Plusieurs emails : notification groupée
        const latestEmail = newEmails[0];
        await this.createBulkEmailNotification(
          userId,
          userOrg.organizationId,
          newEmails.length,
          {
            emailId: latestEmail.id,
            from: latestEmail.from,
            subject: latestEmail.subject,
            folder: latestEmail.folder,
            receivedAt: latestEmail.createdAt
          }
        );
      }

    } catch (error) {
      console.error(`❌ [EmailNotification] Erreur lors de la vérification des nouveaux emails pour ${userId}:`, error);
    }
  }

  /**
   * Vérifier et notifier pour tous les utilisateurs avec emails actifs
   */
  static async checkAllUsersForNewEmails(): Promise<void> {
    try {
      console.log('🔍 [EmailNotification] Vérification des nouveaux emails pour tous les utilisateurs...');
      
      // Récupérer tous les utilisateurs avec des paramètres de mail configurés
      const usersWithMail = await prisma.emailAccount.findMany({
        where: {
          isActive: true,
          encryptedPassword: { not: null }
        },
        select: {
          userId: true
        },
        take: 20 // Limite de sécurité
      });

      console.log(`👥 [EmailNotification] ${usersWithMail.length} utilisateurs avec mail configuré`);

      for (const emailAccount of usersWithMail) {
        try {
          await this.checkAndNotifyNewEmails(emailAccount.userId);
          // Petite pause entre chaque utilisateur
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (userError) {
          console.error(`❌ [EmailNotification] Erreur pour l'utilisateur ${emailAccount.userId}:`, userError);
        }
      }

      console.log('✅ [EmailNotification] Vérification terminée pour tous les utilisateurs');

    } catch (error) {
      console.error('❌ [EmailNotification] Erreur lors de la vérification globale:', error);
    }
  }

  /**
   * Utilitaire pour tronquer les chaînes trop longues
   */
  private static truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Démarrer le service de vérification périodique (toutes les 2 minutes)
   */
  static startPeriodicCheck(): void {
    console.log('🚀 [EmailNotification] Démarrage du service de notifications email...');
    
    // Vérification immédiate
    this.checkAllUsersForNewEmails();
    
    // Puis toutes les 2 minutes
    setInterval(() => {
      this.checkAllUsersForNewEmails();
    }, 2 * 60 * 1000); // 2 minutes

    console.log('✅ [EmailNotification] Service démarré - vérifications toutes les 2 minutes');
  }
}

export default EmailNotificationService;

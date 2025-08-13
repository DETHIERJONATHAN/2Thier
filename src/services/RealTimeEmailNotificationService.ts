/**
 * 🚀 SERVICE DE NOTIFICATIONS EMAIL EN TEMPS RÉEL
 * 
 * SYSTÈME HYBRIDE OPTIMISÉ :
 * 1. 📧 Intégration directe avec AutoMailSyncService (temps réel)
 * 2. 🔄 Vérification périodique de sécurité (toutes les 5 minutes)
 * 3. 💡 Notifications intelligentes et instantanées
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import UniversalNotificationService from './UniversalNotificationService.js';

const prisma = new PrismaClient();

interface EmailNotificationData {
  emailId: string;
  from: string;
  subject: string;
  folder: string;
  receivedAt: Date;
  userId: string;
  organizationId: string;
}

export class RealTimeEmailNotificationService extends EventEmitter {
  private static instance: RealTimeEmailNotificationService;
  private backupCheckInterval?: NodeJS.Timeout;
  private isRunning = false;

  private constructor() {
    super();
  }

  static getInstance(): RealTimeEmailNotificationService {
    if (!this.instance) {
      this.instance = new RealTimeEmailNotificationService();
    }
    return this.instance;
  }

  /**
   * 🚀 DÉMARRER LE SERVICE TEMPS RÉEL
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ [RealTimeEmailNotification] Service déjà en cours...');
      return;
    }

    console.log('🚀 [RealTimeEmailNotification] Démarrage du service temps réel...');
    this.isRunning = true;

    // 1. 🎯 ÉCOUTER LES ÉVÉNEMENTS DE SYNCHRONISATION EMAIL
    this.setupEmailSyncListener();

    // 2. 🔄 VÉRIFICATION DE SÉCURITÉ toutes les 5 minutes
    this.startBackupCheck();

    console.log('✅ [RealTimeEmailNotification] Service temps réel démarré !');
  }

  /**
   * 🎯 ÉCOUTER LES NOUVEAUX EMAILS EN TEMPS RÉEL
   */
  private setupEmailSyncListener(): void {
    console.log('🎧 [RealTimeEmailNotification] Configuration de l\'écoute temps réel...');
    
    // Écouter les événements de nouveaux emails depuis AutoMailSyncService
    this.on('newEmailReceived', this.handleNewEmailReceived.bind(this));
    
    console.log('✅ [RealTimeEmailNotification] Écoute temps réel configurée');
  }

  /**
   * 📧 TRAITEMENT IMMÉDIAT D'UN NOUVEL EMAIL
   */
  private async handleNewEmailReceived(emailData: EmailNotificationData): Promise<void> {
    try {
      console.log(`⚡ [RealTimeEmailNotification] NOUVEL EMAIL DÉTECTÉ - Traitement immédiat !`);
      console.log(`📧 De: ${emailData.from}, Sujet: ${emailData.subject}`);

      // Vérifier si ce n'est pas un spam/brouillon/envoyé
      if (this.shouldIgnoreEmail(emailData)) {
        console.log(`🚫 [RealTimeEmailNotification] Email ignoré: ${emailData.folder}`);
        return;
      }

      // Créer la notification IMMÉDIATEMENT
      await this.createInstantNotification(emailData);

    } catch (error) {
      console.error('❌ [RealTimeEmailNotification] Erreur lors du traitement temps réel:', error);
    }
  }

  /**
   * 🔔 CRÉER UNE NOTIFICATION INSTANTANÉE
   */
  private async createInstantNotification(emailData: EmailNotificationData): Promise<void> {
    try {
      // 🌟 NOUVELLE APPROCHE : Utiliser UniversalNotificationService
      const universalService = UniversalNotificationService.getInstance();
      
      await universalService.notifyNewEmail({
        emailId: emailData.emailId,
        from: emailData.from,
        subject: emailData.subject,
        userId: emailData.userId,
        organizationId: emailData.organizationId
      });
      
      console.log(`✅ [RealTimeEmailNotification] Notification UNIVERSELLE créée pour: ${emailData.subject}`);

    } catch (error) {
      console.error('❌ [RealTimeEmailNotification] Erreur notification instantanée:', error);
    }
  }  /**
   * 🔄 VÉRIFICATION DE SÉCURITÉ (toutes les 5 minutes)
   * En cas où le temps réel rate quelque chose
   */
  private startBackupCheck(): void {
    console.log('🛡️ [RealTimeEmailNotification] Démarrage vérification de sécurité...');
    
    this.backupCheckInterval = setInterval(async () => {
      console.log('🔍 [RealTimeEmailNotification] Vérification de sécurité...');
      await this.performBackupCheck();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * 🔍 VÉRIFICATION DE SÉCURITÉ - RATTRAPER LES EMAILS MANQUÉS
   * Méthode publique pour déclencher manuellement une vérification
   */
  async performBackupCheck(): Promise<void> {
    try {
      // Chercher les emails des 10 dernières minutes sans notification
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const usersWithMail = await prisma.emailAccount.findMany({
        where: {
          isActive: true,
          encryptedPassword: { not: null }
        },
        select: { 
          userId: true
        },
        take: 10 // Limite pour la sécurité
      });

      for (const emailAccount of usersWithMail) {
        // Récupérer l'organisation de l'utilisateur
        const userOrg = await prisma.userOrganization.findFirst({
          where: { userId: emailAccount.userId },
          select: { organizationId: true }
        });
        
        if (!userOrg) continue;
        const organizationId = userOrg.organizationId;

        // Chercher les emails récents sans notification
        const recentEmails = await prisma.email.findMany({
          where: {
            userId: emailAccount.userId,
            createdAt: { gte: tenMinutesAgo },
            folder: { in: ['INBOX', 'inbox'] },
            // Vérifier qu'il n'y a pas déjà une notification
            NOT: {
              id: {
                in: await prisma.notification.findMany({
                  where: {
                    userId: emailAccount.userId,
                    type: 'NEW_MAIL_RECEIVED',
                    createdAt: { gte: tenMinutesAgo }
                  },
                  select: { id: true }
                }).then(notifications => notifications.map(n => n.id))
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        });

        // Créer les notifications manquées
        for (const email of recentEmails) {
          const universalService = UniversalNotificationService.getInstance();
          
          await universalService.notifyNewEmail({
            emailId: email.id,
            from: email.from,
            subject: email.subject,
            userId: emailAccount.userId,
            organizationId
          });
        }
      }

      console.log('✅ [RealTimeEmailNotification] Vérification de sécurité terminée');

    } catch (error) {
      console.error('❌ [RealTimeEmailNotification] Erreur vérification de sécurité:', error);
    }
  }

  /**
   * 🚫 FILTRER LES EMAILS À IGNORER
   */
  private shouldIgnoreEmail(emailData: EmailNotificationData): boolean {
    const ignoredFolders = [
      'SPAM', 'spam', 'Spam',
      'JUNK', 'junk', 'Junk',
      'DRAFTS', 'drafts', 'Drafts', 'Brouillons',
      'SENT', 'sent', 'Sent', 'Envoyés'
    ];
    
    return ignoredFolders.includes(emailData.folder);
  }

  /**
   * 📧 MÉTHODE PUBLIQUE POUR SIGNALER UN NOUVEL EMAIL
   * À appeler depuis AutoMailSyncService
   */
  notifyNewEmail(emailData: EmailNotificationData): void {
    this.emit('newEmailReceived', emailData);
  }

  /**
   * 🛑 ARRÊTER LE SERVICE
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('🛑 [RealTimeEmailNotification] Arrêt du service...');
    
    if (this.backupCheckInterval) {
      clearInterval(this.backupCheckInterval);
    }
    
    this.removeAllListeners();
    this.isRunning = false;
    
    console.log('✅ [RealTimeEmailNotification] Service arrêté');
  }

  /**
   * ✂️ UTILITAIRE POUR TRONQUER LES CHAÎNES
   */
  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}

export default RealTimeEmailNotificationService;

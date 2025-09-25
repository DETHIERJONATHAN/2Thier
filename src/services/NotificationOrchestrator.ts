/**
 * 🎯 ORCHESTRATEUR PRINCIPAL NOTIFICATIONS ULTRA-PERFORMANT
 * 
 * COORDINATION INTELLIGENTE DE TOUS LES SERVICES :
 * - 📧 Google Mail temps réel avec IA
 * - 📅 Google Calendar intelligent
 * - 👥 Leads et prospects avec scoring IA
 * - 📞 Appels et communications
 * - 💰 Facturation et devis automatisés
 * - 🚨 Alertes système critiques
 * - ⚡ Notifications push ultra-rapides
 * - 🧠 Intelligence artificielle centralisée
 */

import { UniversalNotificationService } from './UniversalNotificationService';
import GoogleMailNotificationService from './GoogleMailNotificationService';
import GoogleCalendarNotificationService from './GoogleCalendarNotificationService';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

interface NotificationSettings {
  userId: string;
  organizationId: string;
  emailNotifications: boolean;
  calendarNotifications: boolean;
  pushNotifications: boolean;
  aiEnrichment: boolean;
  urgentOnly: boolean;
  quietHours: {
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export class NotificationOrchestrator extends EventEmitter {
  private static instance: NotificationOrchestrator;
  private universalService: UniversalNotificationService;
  private gmailService: GoogleMailNotificationService;
  private calendarService: GoogleCalendarNotificationService;
  private isRunning = false;
  private userSettings = new Map<string, NotificationSettings>();

  private constructor() {
    super();
    this.universalService = UniversalNotificationService.getInstance();
    this.gmailService = GoogleMailNotificationService.getInstance();
    this.calendarService = GoogleCalendarNotificationService.getInstance();
    
    this.setupEventListeners();
  }

  static getInstance(): NotificationOrchestrator {
    if (!this.instance) {
      this.instance = new NotificationOrchestrator();
    }
    return this.instance;
  }

  /**
   * 🚀 DÉMARRAGE COMPLET DU SYSTÈME
   */
  async startCompleteSystem(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ [NotificationOrchestrator] Système déjà en cours...');
      return;
    }

    console.log('🎯 [NotificationOrchestrator] DÉMARRAGE SYSTÈME COMPLET...');
    
    try {
      // 1. Démarrer le service universel
      this.universalService.start();
      
      // 2. Charger les utilisateurs actifs
      const activeUsers = await this.getActiveUsers();
      console.log(`👥 [NotificationOrchestrator] ${activeUsers.length} utilisateurs actifs trouvés`);

      // 3. Démarrer la surveillance pour chaque utilisateur
      for (const user of activeUsers) {
        await this.startUserNotifications(user.id);
      }

      // 4. Démarrer les vérifications périodiques avancées
      this.startAdvancedChecks();

      this.isRunning = true;
      console.log('✅ [NotificationOrchestrator] SYSTÈME COMPLET DÉMARRÉ !');

    } catch (error) {
      console.error('❌ [NotificationOrchestrator] Erreur démarrage:', error);
      throw error;
    }
  }

  /**
   * 👤 DÉMARRER NOTIFICATIONS POUR UN UTILISATEUR
   */
  async startUserNotifications(userId: string): Promise<void> {
    try {
      console.log(`🎯 [NotificationOrchestrator] Démarrage notifications: ${userId}`);

      // Charger les préférences utilisateur
      const settings = await this.loadUserSettings(userId);
      this.userSettings.set(userId, settings);

      // Démarrer Gmail si activé
      if (settings.emailNotifications) {
        await this.gmailService.startGmailWatching(userId);
      }

      // Démarrer Calendar si activé
      if (settings.calendarNotifications) {
        await this.calendarService.startCalendarWatching(userId);
      }

      console.log(`✅ [NotificationOrchestrator] Utilisateur configuré: ${userId}`);

    } catch (error) {
      console.error(`❌ [NotificationOrchestrator] Erreur utilisateur ${userId}:`, error);
    }
  }

  /**
   * 🔄 VÉRIFICATIONS AVANCÉES PÉRIODIQUES
   */
  private startAdvancedChecks(): void {
    console.log('🔄 [NotificationOrchestrator] Démarrage vérifications avancées...');

    // Vérification toutes les 30 secondes pour les événements critiques
    setInterval(async () => {
      await this.checkCriticalEvents();
    }, 30 * 1000);

    // Vérification toutes les 2 minutes pour les événements normaux
    setInterval(async () => {
      await this.checkNormalEvents();
    }, 2 * 60 * 1000);

    // Vérification toutes les 10 minutes pour les analyses IA
    setInterval(async () => {
      await this.performAIAnalysis();
    }, 10 * 60 * 1000);

    // Nettoyage toutes les heures
    setInterval(async () => {
      await this.performCleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * 🚨 VÉRIFICATION ÉVÉNEMENTS CRITIQUES
   */
  private async checkCriticalEvents(): Promise<void> {
    try {
      // Vérifier les nouveaux leads urgents
      await this.checkUrgentLeads();
      
      // Vérifier les appels manqués
      await this.checkMissedCalls();
      
      // Vérifier les emails très importants
      await this.checkVIPEmails();
      
      // Vérifier les rendez-vous imminents
      await this.checkImminentMeetings();

    } catch (error) {
      console.error('❌ [NotificationOrchestrator] Erreur vérification critique:', error);
    }
  }

  /**
   * 📊 VÉRIFICATION ÉVÉNEMENTS NORMAUX
   */
  private async checkNormalEvents(): Promise<void> {
    try {
      // Nouveaux devis créés
      await this.checkNewQuotes();
      
      // Nouvelles factures
      await this.checkNewInvoices();
      
      // Tâches en retard
      await this.checkOverdueTasks();
      
      // Mises à jour projets
      await this.checkProjectUpdates();

    } catch (error) {
      console.error('❌ [NotificationOrchestrator] Erreur vérification normale:', error);
    }
  }

  /**
   * 🧠 ANALYSE IA PÉRIODIQUE
   */
  private async performAIAnalysis(): Promise<void> {
    try {
      console.log('🧠 [NotificationOrchestrator] Analyse IA périodique...');

      // Analyser les patterns de notifications
      await this.analyzeNotificationPatterns();
      
      // Optimiser les horaires d'envoi
      await this.optimizeNotificationTiming();
      
      // Détecter les anomalies
      await this.detectAnomalies();
      
      // Suggérer des améliorations
      await this.suggestImprovements();

    } catch (error) {
      console.error('❌ [NotificationOrchestrator] Erreur analyse IA:', error);
    }
  }

  /**
   * 👥 VÉRIFIER NOUVEAUX LEADS URGENTS
   */
  private async checkUrgentLeads(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const urgentLeads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        priority: { in: ['HIGH', 'URGENT'] }
      },
      include: {
        user: true,
        organization: true
      }
    });

    for (const lead of urgentLeads) {
      // Vérifier si notification déjà envoyée
      const existingNotification = await prisma.notification.findFirst({
        where: {
          type: 'NEW_LEAD',
          createdAt: { gte: fiveMinutesAgo },
          data: {
            path: ['metadata', 'leadId'],
            equals: lead.id
          }
        }
      });

      if (!existingNotification) {
        await this.universalService.notifyNewLead({
          leadId: lead.id,
          name: lead.name || 'Lead sans nom',
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          source: lead.source || undefined,
          userId: lead.userId || undefined,
          organizationId: lead.organizationId
        });
      }
    }
  }

  /**
   * 📞 VÉRIFIER APPELS MANQUÉS
   */
  private async checkMissedCalls(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // TODO: Implémenter selon votre modèle d'appels
    console.log('📞 [NotificationOrchestrator] Vérification appels manqués...', {
      since: tenMinutesAgo.toISOString()
    });
  }

  /**
   * ⭐ VÉRIFIER EMAILS VIP
   */
  private async checkVIPEmails(): Promise<void> {
    // TODO: Implémenter détection emails VIP avec IA
    console.log('⭐ [NotificationOrchestrator] Vérification emails VIP...');
  }

  /**
   * ⏰ VÉRIFIER RENDEZ-VOUS IMMINENTS
   */
  private async checkImminentMeetings(): Promise<void> {
    // TODO: Implémenter vérification rendez-vous via Calendar API
    console.log('⏰ [NotificationOrchestrator] Vérification rendez-vous imminents...');
  }

  /**
   * 💰 VÉRIFIER NOUVEAUX DEVIS
   */
  private async checkNewQuotes(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // TODO: Implémenter selon votre modèle de devis
    console.log('💰 [NotificationOrchestrator] Vérification nouveaux devis...', {
      since: oneHourAgo.toISOString()
    });
  }

  /**
   * 🧾 VÉRIFIER NOUVELLES FACTURES
   */
  private async checkNewInvoices(): Promise<void> {
    // TODO: Implémenter selon votre modèle de factures
    console.log('🧾 [NotificationOrchestrator] Vérification nouvelles factures...');
  }

  /**
   * ⏰ VÉRIFIER TÂCHES EN RETARD
   */
  private async checkOverdueTasks(): Promise<void> {
    // TODO: Implémenter selon votre modèle de tâches
    console.log('⏰ [NotificationOrchestrator] Vérification tâches en retard...');
  }

  /**
   * 📋 VÉRIFIER MISES À JOUR PROJETS
   */
  private async checkProjectUpdates(): Promise<void> {
    // TODO: Implémenter selon votre modèle de projets
    console.log('📋 [NotificationOrchestrator] Vérification mises à jour projets...');
  }

  /**
   * 📊 ANALYSER PATTERNS DE NOTIFICATIONS
   */
  private async analyzeNotificationPatterns(): Promise<void> {
    // TODO: Implémenter analyse IA des patterns
    console.log('📊 [NotificationOrchestrator] Analyse patterns notifications...');
  }

  /**
   * ⏰ OPTIMISER HORAIRES NOTIFICATIONS
   */
  private async optimizeNotificationTiming(): Promise<void> {
    // TODO: Implémenter optimisation IA des horaires
    console.log('⏰ [NotificationOrchestrator] Optimisation horaires...');
  }

  /**
   * 🔍 DÉTECTER ANOMALIES
   */
  private async detectAnomalies(): Promise<void> {
    // TODO: Implémenter détection d'anomalies avec IA
    console.log('🔍 [NotificationOrchestrator] Détection anomalies...');
  }

  /**
   * 💡 SUGGÉRER AMÉLIORATIONS
   */
  private async suggestImprovements(): Promise<void> {
    // TODO: Implémenter suggestions IA
    console.log('💡 [NotificationOrchestrator] Suggestions améliorations...');
  }

  /**
   * 🧹 NETTOYAGE PÉRIODIQUE
   */
  private async performCleanup(): Promise<void> {
    try {
      // Supprimer les anciennes notifications
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const deleted = await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: oneDayAgo },
          status: { in: ['READ', 'dismissed'] }
        }
      });

      if (deleted.count > 0) {
        console.log(`🧹 [NotificationOrchestrator] ${deleted.count} notifications nettoyées`);
      }

    } catch (error) {
      console.error('❌ [NotificationOrchestrator] Erreur nettoyage:', error);
    }
  }

  /**
   * 🔧 MÉTHODES UTILITAIRES
   */
  private async getActiveUsers() {
    return prisma.user.findMany({
      where: {
        isActive: true,
        emailAccount: { isNot: null }
      },
      select: {
        id: true,
        organizationId: true
      }
    });
  }

  private async loadUserSettings(userId: string): Promise<NotificationSettings> {
    // TODO: Charger depuis la base de données
    return {
      userId,
      organizationId: (await this.getUserOrganization(userId))!,
      emailNotifications: true,
      calendarNotifications: true,
      pushNotifications: true,
      aiEnrichment: true,
      urgentOnly: false,
      quietHours: { start: "22:00", end: "08:00" },
      channels: {
        email: true,
        sms: false,
        push: true,
        inApp: true
      }
    };
  }

  private async getUserOrganization(userId: string): Promise<string | null> {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId },
      select: { organizationId: true }
    });
    return userOrg?.organizationId || null;
  }

  private setupEventListeners(): void {
    // Écouter les événements des services
    this.gmailService.on('gmail-notification', (data) => {
      this.emit('notification', { type: 'gmail', data });
    });

    this.gmailService.on('urgent-email', (data) => {
      this.emit('urgent-notification', { type: 'urgent-email', data });
    });

    this.calendarService.on('urgent-meeting', (data) => {
      this.emit('urgent-notification', { type: 'urgent-meeting', data });
    });
  }

  /**
   * 🛑 ARRÊTER LE SYSTÈME
   */
  stop(): void {
    console.log('🛑 [NotificationOrchestrator] Arrêt du système...');
    
    this.universalService.stop();
    this.isRunning = false;
    
    console.log('✅ [NotificationOrchestrator] Système arrêté');
  }
}

export default NotificationOrchestrator;

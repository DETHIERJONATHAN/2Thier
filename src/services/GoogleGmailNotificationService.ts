/**
 * 📧 SERVICE NOTIFICATIONS GMAIL TEMPS RÉEL AVEC IA
 * 
 * SYSTÈME ULTRA-PERFORMANT :
 * - 🔄 Synchronisation temps réel Gmail API
 * - 🧠 Analyse IA de chaque email
 * - ⚡ Notifications instantanées
 * - 🎯 Classification intelligente des priorités
 * - 📊 Extraction automatique des données importantes
 */

import { google } from 'googleapis';
import UniversalNotificationService from './UniversalNotificationService';
import { prisma } from '../lib/prisma';

import { googleOAuthConfig, isGoogleOAuthConfigured } from '../auth/googleConfig';
import { logger } from '../lib/logger';

interface EmailAnalysis {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'commercial' | 'support' | 'facturation' | 'interne' | 'spam' | 'autre';
  importance: number; // 1-10
  keyInfo: {
    hasAttachments: boolean;
    isReply: boolean;
    mentionsPrice: boolean;
    mentionsUrgent: boolean;
    containsContact: boolean;
    estimatedResponseTime: string;
  };
  suggestedActions: string[];
  extractedData: {
    phone?: string;
    email?: string;
    company?: string;
    amount?: number;
    currency?: string;
    deadline?: Date;
  };
}

export class GoogleGmailNotificationService {
  private static instance: GoogleGmailNotificationService;
  private universalService: UniversalNotificationService;
  private isWatching = false;
  private activeWatches = new Map<string, string>(); // userId -> historyId

  private constructor() {
    this.universalService = UniversalNotificationService.getInstance();
  }

  static getInstance(): GoogleGmailNotificationService {
    if (!this.instance) {
      this.instance = new GoogleGmailNotificationService();
    }
    return this.instance;
  }

  /**
   * 🚀 DÉMARRER LA SURVEILLANCE GMAIL TEMPS RÉEL
   */
  async startGmailWatch(): Promise<void> {

    try {
      // Récupérer tous les utilisateurs avec Gmail configuré
      const usersWithGmail = await prisma.googleToken.findMany({
        where: {
          gmailEnabled: true,
          accessToken: { not: null }
        },
        include: {
          user: true,
          organization: true
        }
      });


      for (const userToken of usersWithGmail) {
        await this.setupUserGmailWatch(userToken);
      }

      this.isWatching = true;

    } catch (error) {
      logger.error('❌ [GmailNotification] Erreur démarrage surveillance:', error);
    }
  }

  /**
   * 🔧 CONFIGURER LA SURVEILLANCE POUR UN UTILISATEUR
   */
  private async setupUserGmailWatch(userToken: unknown): Promise<void> {
    try {
      if (!isGoogleOAuthConfigured()) {
        throw new Error('Configuration Google OAuth manquante pour GoogleGmailNotificationService.');
      }

      const oauth2Client = new google.auth.OAuth2(
        googleOAuthConfig.clientId,
        googleOAuthConfig.clientSecret,
        googleOAuthConfig.redirectUri
      );

      oauth2Client.setCredentials({
        access_token: userToken.accessToken,
        refresh_token: userToken.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Configurer le webhook pour les nouveaux emails
      const projectId = googleOAuthConfig.projectId;
      if (!projectId) {
        throw new Error('GOOGLE_PROJECT_ID manquant dans googleOAuthConfig.');
      }

      const watchResponse = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: `projects/${projectId}/topics/gmail-notifications`,
          labelIds: ['INBOX'],
          labelFilterAction: 'include'
        }
      });

      if (watchResponse.data.historyId) {
        this.activeWatches.set(userToken.userId, watchResponse.data.historyId);
        
        // Sauvegarder l'état dans la base
        await prisma.googleMailWatch.upsert({
          where: { userId: userToken.userId },
          create: {
            userId: userToken.userId,
            organizationId: userToken.organizationId,
            historyId: watchResponse.data.historyId,
            isActive: true
          },
          update: {
            historyId: watchResponse.data.historyId,
            isActive: true,
            updatedAt: new Date()
          }
        });

      }

    } catch (error) {
      logger.error(`❌ [GmailNotification] Erreur watch pour ${userToken.userId}:`, error);
    }
  }

  /**
   * 🔔 TRAITER UNE NOTIFICATION GMAIL WEBHOOK
   */
  async handleGmailWebhook(data: unknown): Promise<void> {
    try {
      const message = JSON.parse(Buffer.from(data.message.data, 'base64').toString());
      const emailAddress = message.emailAddress;
      const historyId = message.historyId;


      // Trouver l'utilisateur correspondant
      const userToken = await prisma.googleToken.findFirst({
        where: {
          user: { email: emailAddress },
          gmailEnabled: true
        },
        include: { user: true }
      });

      if (!userToken) {
        logger.warn(`⚠️ [GmailNotification] Utilisateur non trouvé pour ${emailAddress}`);
        return;
      }

      // Récupérer les nouveaux emails depuis le dernier historyId
      await this.fetchNewEmails(userToken, historyId);

    } catch (error) {
      logger.error('❌ [GmailNotification] Erreur traitement webhook:', error);
    }
  }

  /**
   * 📬 RÉCUPÉRER ET ANALYSER LES NOUVEAUX EMAILS
   */
  private async fetchNewEmails(userToken: unknown, currentHistoryId: string): Promise<void> {
    try {
      if (!isGoogleOAuthConfigured()) {
        throw new Error('Configuration Google OAuth manquante pour fetchNewEmails.');
      }

      const oauth2Client = new google.auth.OAuth2(
        googleOAuthConfig.clientId,
        googleOAuthConfig.clientSecret,
        googleOAuthConfig.redirectUri
      );

      oauth2Client.setCredentials({
        access_token: userToken.accessToken,
        refresh_token: userToken.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Récupérer l'historique depuis le dernier ID connu
      const lastHistoryId = this.activeWatches.get(userToken.userId) || '1';

      const historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX'
      });

      if (!historyResponse.data.history) {
        return;
      }

      // Traiter chaque nouvel email
      for (const historyItem of historyResponse.data.history) {
        if (historyItem.messagesAdded) {
          for (const messageAdded of historyItem.messagesAdded) {
            if (messageAdded.message?.id) {
              await this.processNewEmail(gmail, messageAdded.message.id, userToken);
            }
          }
        }
      }

      // Mettre à jour l'historyId
      this.activeWatches.set(userToken.userId, currentHistoryId);
      await prisma.googleMailWatch.update({
        where: { userId: userToken.userId },
        data: { historyId: currentHistoryId }
      });

    } catch (error) {
      logger.error(`❌ [GmailNotification] Erreur récupération emails pour ${userToken.userId}:`, error);
    }
  }

  /**
   * 🧠 TRAITER ET ANALYSER UN NOUVEL EMAIL AVEC IA
   */
  private async processNewEmail(gmail: unknown, messageId: string, userToken: unknown): Promise<void> {
    try {
      // Récupérer les détails du message
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = messageResponse.data;
      const headers = message.payload.headers;

      // Extraire les informations de base
      const from = headers.find((h: Record<string, unknown>) => h.name === 'From')?.value || '';
      const subject = headers.find((h: Record<string, unknown>) => h.name === 'Subject')?.value || '';
      const date = headers.find((h: Record<string, unknown>) => h.name === 'Date')?.value || '';
      const to = headers.find((h: Record<string, unknown>) => h.name === 'To')?.value || '';

      // Extraire le contenu du message
      let emailBody = '';
      if (message.payload.body?.data) {
        emailBody = Buffer.from(message.payload.body.data, 'base64').toString();
      } else if (message.payload.parts) {
        // Email multipart
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            emailBody += Buffer.from(part.body.data, 'base64').toString();
          }
        }
      }


      // 🧠 ANALYSE IA DE L'EMAIL
      const analysis = await this.analyzeEmailWithAI(from, subject, emailBody);

      // Sauvegarder l'email en base
      const savedEmail = await prisma.email.create({
        data: {
          messageId: messageId,
          from: from,
          to: to,
          subject: subject,
          content: emailBody,
          userId: userToken.userId,
          organizationId: userToken.organizationId,
          folder: 'INBOX',
          isRead: false,
          receivedAt: new Date(date),
          metadata: {
            gmailId: messageId,
            analysis: analysis,
            threadId: message.threadId
          }
        }
      });

      // 🔔 CRÉER LA NOTIFICATION INTELLIGENTE
      await this.createIntelligentNotification(savedEmail, analysis, userToken);


    } catch (error) {
      logger.error(`❌ [GmailNotification] Erreur traitement email ${messageId}:`, error);
    }
  }

  /**
   * 🧠 ANALYSE IA AVANCÉE DE L'EMAIL
   */
  private async analyzeEmailWithAI(from: string, subject: string, body: string): Promise<EmailAnalysis> {
    try {
      // Analyse par mots-clés et patterns
      const urgentKeywords = ['urgent', 'asap', 'immédiat', 'rapidement', 'emergency'];
      const commercialKeywords = ['devis', 'prix', 'tarif', 'offre', 'proposition', 'achat'];
      const supportKeywords = ['problème', 'erreur', 'bug', 'aide', 'support', 'panne'];

      const lowercaseSubject = subject.toLowerCase();
      const lowercaseBody = body.toLowerCase();
      const fullText = `${lowercaseSubject} ${lowercaseBody}`;

      // Détection de priorité
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      if (urgentKeywords.some(word => fullText.includes(word))) {
        priority = 'urgent';
      } else if (commercialKeywords.some(word => fullText.includes(word))) {
        priority = 'high';
      } else if (supportKeywords.some(word => fullText.includes(word))) {
        priority = 'high';
      }

      // Détection de catégorie
      let category: 'commercial' | 'support' | 'facturation' | 'interne' | 'spam' | 'autre' = 'autre';
      if (commercialKeywords.some(word => fullText.includes(word))) {
        category = 'commercial';
      } else if (supportKeywords.some(word => fullText.includes(word))) {
        category = 'support';
      } else if (fullText.includes('facture') || fullText.includes('paiement')) {
        category = 'facturation';
      }

      // Extraction de données
      const phoneRegex = /(\+33|0)[1-9](?:[0-9]{8})/g;
      const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
      const amountRegex = /(\d+(?:[.,]\d{2})?)\s*€?/g;

      const phones = body.match(phoneRegex) || [];
      const emails = body.match(emailRegex) || [];
      const amounts = body.match(amountRegex) || [];

      return {
        priority,
        category,
        importance: priority === 'urgent' ? 10 : priority === 'high' ? 8 : priority === 'medium' ? 6 : 4,
        keyInfo: {
          hasAttachments: false, // À implémenter
          isReply: subject.toLowerCase().startsWith('re:'),
          mentionsPrice: commercialKeywords.some(word => fullText.includes(word)),
          mentionsUrgent: urgentKeywords.some(word => fullText.includes(word)),
          containsContact: phones.length > 0 || emails.length > 1,
          estimatedResponseTime: priority === 'urgent' ? '1h' : priority === 'high' ? '4h' : '24h'
        },
        suggestedActions: [
          priority === 'urgent' ? 'Répondre immédiatement' : 'Programmer réponse',
          category === 'commercial' ? 'Créer lead si nouveau contact' : 'Classer dans dossier',
          'Analyser contenu pour extraction données'
        ],
        extractedData: {
          phone: phones[0],
          email: emails.find(e => !e.includes(from.split('@')[1])), // Email externe
          amount: amounts[0] ? parseFloat(amounts[0].replace(',', '.')) : undefined,
          currency: '€'
        }
      };

    } catch (error) {
      logger.error('❌ [GmailNotification] Erreur analyse IA:', error);
      return {
        priority: 'medium',
        category: 'autre',
        importance: 5,
        keyInfo: {
          hasAttachments: false,
          isReply: false,
          mentionsPrice: false,
          mentionsUrgent: false,
          containsContact: false,
          estimatedResponseTime: '24h'
        },
        suggestedActions: ['Lire et traiter'],
        extractedData: {}
      };
    }
  }

  /**
   * 🔔 CRÉER UNE NOTIFICATION INTELLIGENTE
   */
  private async createIntelligentNotification(email: unknown, analysis: EmailAnalysis, userToken: unknown): Promise<void> {
    try {
      // Construire le message intelligent
      const priorityEmoji = {
        urgent: '🚨',
        high: '⚡',
        medium: '📧',
        low: '📝'
      };

      const categoryEmoji = {
        commercial: '💼',
        support: '🛠️',
        facturation: '💰',
        interne: '🏢',
        spam: '🗑️',
        autre: '📄'
      };

      let intelligentMessage = `${priorityEmoji[analysis.priority]} ${categoryEmoji[analysis.category]} De: ${email.from.substring(0, 30)}`;

      // Ajouter des informations enrichies
      if (analysis.extractedData.amount) {
        intelligentMessage += ` | 💰 ${analysis.extractedData.amount}€`;
      }
      if (analysis.keyInfo.mentionsUrgent) {
        intelligentMessage += ` | ⚠️ URGENT`;
      }
      if (analysis.extractedData.phone) {
        intelligentMessage += ` | 📞 Contact`;
      }

      // Créer la notification via le service universel
      await this.universalService.notifyNewEmail({
        emailId: email.id,
        from: email.from,
        subject: email.subject,
        userId: userToken.userId,
        organizationId: userToken.organizationId,
        summary: intelligentMessage,
        priority: analysis.priority,
        metadata: {
          category: analysis.category,
          importance: analysis.importance,
          suggestedActions: analysis.suggestedActions,
          keyInfo: analysis.keyInfo,
          extractedData: analysis.extractedData
        },
        tags: ['email', 'inbox', analysis.category]
      });

      // Si c'est un email commercial, créer potentiellement un lead
      if (analysis.category === 'commercial' && analysis.priority === 'high') {
        await this.createLeadFromEmail(email, analysis, userToken);
      }

    } catch (error) {
      logger.error('❌ [GmailNotification] Erreur création notification intelligente:', error);
    }
  }

  /**
   * 👥 CRÉER UN LEAD AUTOMATIQUEMENT DEPUIS UN EMAIL COMMERCIAL
   */
  private async createLeadFromEmail(email: unknown, analysis: EmailAnalysis, userToken: unknown): Promise<void> {
    try {
      if (!analysis.extractedData.email && !analysis.extractedData.phone) {
        return; // Pas assez d'infos pour créer un lead
      }

      // Vérifier si le contact existe déjà
      const existingContact = await prisma.contact.findFirst({
        where: {
          OR: [
            { email: analysis.extractedData.email },
            { phone: analysis.extractedData.phone }
          ]
        }
      });

      if (existingContact) {
        return;
      }

      // Créer le lead
      const lead = await prisma.lead.create({
        data: {
          firstName: 'Prospect',
          lastName: 'Email',
          email: analysis.extractedData.email || email.from,
          phone: analysis.extractedData.phone,
          source: 'EMAIL_AUTOMATIQUE',
          status: 'NEW',
          priority: analysis.priority === 'urgent' ? 'HIGH' : 'MEDIUM',
          notes: `Lead créé automatiquement depuis email: ${email.subject}\n\nContenu: ${email.content.substring(0, 200)}...`,
          userId: userToken.userId,
          organizationId: userToken.organizationId,
          metadata: {
            originalEmailId: email.id,
            aiAnalysis: analysis
          }
        }
      });

      // Notifier le nouveau lead
      await this.universalService.notifyNewLead({
        leadId: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        phone: lead.phone,
        source: 'EMAIL IA',
        userId: userToken.userId,
        organizationId: userToken.organizationId
      });


    } catch (error) {
      logger.error('❌ [GmailNotification] Erreur création lead automatique:', error);
    }
  }

  /**
   * 📊 STATISTIQUES GMAIL
   */
  async getGmailStats(organizationId: string): Promise<unknown> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await prisma.email.groupBy({
        by: ['userId'],
        where: {
          organizationId,
          receivedAt: { gte: today },
          folder: 'INBOX'
        },
        _count: { id: true }
      });

      return {
        totalToday: stats.reduce((sum, s) => sum + s._count.id, 0),
        byUser: stats,
        activeWatches: this.activeWatches.size
      };
    } catch (error) {
      logger.error('❌ [GmailNotification] Erreur stats:', error);
      return { totalToday: 0, byUser: [], activeWatches: 0 };
    }
  }

  /**
   * 🛑 ARRÊTER LA SURVEILLANCE
   */
  async stopGmailWatch(): Promise<void> {
    
    this.isWatching = false;
    this.activeWatches.clear();
    
    await prisma.googleMailWatch.updateMany({
      data: { isActive: false }
    });
    
  }
}

export default GoogleGmailNotificationService;

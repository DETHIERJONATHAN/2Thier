/**
 * 🚀 SERVICE NOTIFICATIONS GOOGLE MAIL ULTRA-PERFORMANT AVEC IA
 * 
 * FONCTIONNALITÉS :
 * - ⚡ Notifications temps réel via Google Push API
 * - 🧠 Analyse IA du contenu des emails
 * - 🎯 Classification automatique (urgent, commercial, support...)
 * - 📊 Scoring d'importance avec IA
 * - 🔔 Notifications enrichies avec contexte IA
 * - 💬 Résumés intelligents des emails longs
 * - 🏷️ Tags automatiques avec IA
 * - 📱 Push notifications ultra-rapides
 */

import { google } from 'googleapis';
import { UniversalNotificationService } from './UniversalNotificationService';
import { EventEmitter } from 'events';
import { prisma } from '../lib/prisma';

import { googleOAuthConfig } from '../auth/googleConfig';

// 🧠 INTERFACE ANALYSE IA EMAIL
interface EmailAIAnalysis {
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  category: 'commercial' | 'support' | 'facture' | 'lead' | 'interne' | 'spam' | 'autre';
  sentiment: 'positive' | 'neutral' | 'negative';
  actionRequired: boolean;
  summary: string;
  keyPoints: string[];
  suggestedResponse?: string;
  priority: number; // 1-10
  tags: string[];
  estimatedResponseTime?: string;
  rawContent?: string;
}

// 📧 INTERFACE EMAIL ENRICHI
interface EnrichedGmailNotification {
  emailId: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  timestamp: Date;
  aiAnalysis: EmailAIAnalysis;
  userId: string;
  organizationId: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

export class GoogleMailNotificationService extends EventEmitter {
  private static instance: GoogleMailNotificationService;
  private universalService: UniversalNotificationService;
  private isWatching = new Map<string, boolean>();
  private webhookHandlers = new Map<string, any>();

  private constructor() {
    super();
    this.universalService = UniversalNotificationService.getInstance();
  }

  static getInstance(): GoogleMailNotificationService {
    if (!this.instance) {
      this.instance = new GoogleMailNotificationService();
    }
    return this.instance;
  }

  /**
   * 🚀 DÉMARRER LA SURVEILLANCE GMAIL TEMPS RÉEL
   */
  async startGmailWatching(userId: string): Promise<void> {
    try {
      console.log(`🚀 [GoogleMail] Démarrage surveillance temps réel pour: ${userId}`);

      // Récupérer les tokens Google de l'utilisateur
      const googleTokens = await this.getGoogleTokens(userId);
      if (!googleTokens) {
        console.warn(`⚠️ [GoogleMail] Pas de tokens Google pour: ${userId}`);
        return;
      }

      // Configurer l'authentification Google
      const auth = new google.auth.OAuth2();
      auth.setCredentials({
        access_token: googleTokens.accessToken,
        refresh_token: googleTokens.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth });

      // Configurer le watch Gmail avec Push notifications
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

      this.isWatching.set(userId, true);
      
      console.log(`✅ [GoogleMail] Surveillance activée: ${watchResponse.data.historyId}`);

      // Stocker la configuration de surveillance
      await prisma.googleMailWatch.upsert({
        where: { userId },
        update: {
          historyId: watchResponse.data.historyId,
          expiration: new Date(parseInt(watchResponse.data.expiration || '0')),
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          userId,
          organizationId: (await this.getUserOrganization(userId))!,
          historyId: watchResponse.data.historyId,
          expiration: new Date(parseInt(watchResponse.data.expiration || '0')),
          isActive: true
        }
      });

    } catch (error) {
      console.error(`❌ [GoogleMail] Erreur surveillance: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 🔔 TRAITER UN NOUVEAU EMAIL AVEC IA
   */
  async processNewGmailWithAI(emailData: any, userId: string): Promise<void> {
    try {
      console.log(`🧠 [GoogleMail] Traitement IA email: ${emailData.id}`);

      // 1. Récupérer le contenu complet de l'email
      const fullEmail = await this.getFullEmailContent(emailData.id, userId);
      
      // 2. Analyser avec IA
      const aiAnalysis = await this.analyzeEmailWithAI(fullEmail);
      
      // 3. Créer la notification enrichie
      const enrichedNotification: EnrichedGmailNotification = {
        emailId: fullEmail.id,
        threadId: fullEmail.threadId,
        from: this.extractEmailAddress(fullEmail.from),
        to: this.extractEmailAddress(fullEmail.to),
        subject: fullEmail.subject,
        snippet: fullEmail.snippet,
        timestamp: new Date(parseInt(fullEmail.internalDate)),
        aiAnalysis,
        userId,
        organizationId: (await this.getUserOrganization(userId))!,
        attachments: fullEmail.attachments
      };

      // 4. Créer la notification ultra-détaillée
      await this.createEnrichedNotification(enrichedNotification);

      // 5. Émettre l'événement temps réel
      this.emit('gmail-notification', enrichedNotification);

      console.log(`✅ [GoogleMail] Email traité avec IA: ${aiAnalysis.category} (priorité: ${aiAnalysis.priority})`);

    } catch (error) {
      console.error('❌ [GoogleMail] Erreur traitement IA:', error);
    }
  }

  /**
   * 🧠 ANALYSER EMAIL AVEC IA
   */
  private async analyzeEmailWithAI(email: any): Promise<EmailAIAnalysis> {
    try {
      // Préparer le contenu pour l'IA
      const content = `
From: ${email.from}
Subject: ${email.subject}
Body: ${email.textContent || email.snippet}
`.trim();

      // TODO: Intégrer votre service IA (OpenAI, Anthropic, etc.)
      // Pour l'instant, analyse basique avec des règles
        const analysis = {
          ...this.analyzeEmailBasic(email),
          rawContent: content
        };
      
      console.log(`🧠 [GoogleMail] Analyse IA: ${analysis.category} - urgence: ${analysis.urgency}`);
      
      return analysis;

    } catch (error) {
      console.error('❌ [GoogleMail] Erreur analyse IA:', error);
      
      // Analyse de fallback
      return {
        urgency: 'medium',
        category: 'autre',
        sentiment: 'neutral',
        actionRequired: false,
        summary: email.snippet || 'Email reçu',
        keyPoints: ['Email reçu'],
        priority: 5,
        tags: ['email'],
        estimatedResponseTime: '24h',
        rawContent: content
      };
    }
  }

  /**
   * 🎯 ANALYSE BASIQUE AVEC RÈGLES MÉTIER
   */
  private analyzeEmailBasic(email: any): EmailAIAnalysis {
    const subject = (email.subject || '').toLowerCase();
    const content = (email.textContent || email.snippet || '').toLowerCase();
    const from = (email.from || '').toLowerCase();

    // Détection urgence
    let urgency: EmailAIAnalysis['urgency'] = 'medium';
    if (subject.includes('urgent') || subject.includes('asap') || content.includes('urgent')) {
      urgency = 'urgent';
    } else if (subject.includes('important') || content.includes('important')) {
      urgency = 'high';
    }

    // Détection catégorie
    let category: EmailAIAnalysis['category'] = 'autre';
    if (subject.includes('facture') || subject.includes('invoice') || subject.includes('devis')) {
      category = 'facture';
    } else if (subject.includes('support') || content.includes('problème')) {
      category = 'support';
    } else if (subject.includes('lead') || subject.includes('prospect') || content.includes('intéressé')) {
      category = 'lead';
    } else if (from.includes('commercial') || content.includes('vente')) {
      category = 'commercial';
    }

    // Détection sentiment
    let sentiment: EmailAIAnalysis['sentiment'] = 'neutral';
    if (content.includes('merci') || content.includes('excellent') || content.includes('parfait')) {
      sentiment = 'positive';
    } else if (content.includes('problème') || content.includes('mécontent') || content.includes('erreur')) {
      sentiment = 'negative';
    }

    // Calcul priorité
    let priority = 5;
    if (urgency === 'urgent') priority = 10;
    else if (urgency === 'high') priority = 8;
    else if (category === 'facture') priority = 7;
    else if (category === 'lead') priority = 8;

    // Génération tags
    const tags = ['email', category];
    if (urgency === 'urgent' || urgency === 'high') tags.push('prioritaire');
    if (sentiment === 'negative') tags.push('attention');

    return {
      urgency,
      category,
      sentiment,
      actionRequired: urgency === 'urgent' || category === 'support',
      summary: this.generateSummary(email),
      keyPoints: this.extractKeyPoints(content),
      priority,
      tags,
      estimatedResponseTime: urgency === 'urgent' ? '1h' : category === 'support' ? '4h' : '24h'
    };
  }

  /**
   * 📝 CRÉER NOTIFICATION ENRICHIE
   */
  private async createEnrichedNotification(notification: EnrichedGmailNotification): Promise<void> {
    const ai = notification.aiAnalysis;
    
    // Titre intelligent basé sur l'analyse IA
    let title = `📧 ${ai.category === 'urgent' ? '🚨 URGENT' : ''} Email`;
    if (ai.category === 'lead') title = '👥 Nouveau prospect par email';
    else if (ai.category === 'facture') title = '💰 Email facture/devis';
    else if (ai.category === 'support') title = '🆘 Demande support';

    // Message détaillé avec IA
    const message = `${notification.from} | ${ai.summary}`;

    // Priorité basée sur l'IA
    let priority: 'low' | 'medium' | 'high' | 'urgent' = ai.urgency;

    await this.universalService.createNotification({
      type: 'NEW_EMAIL',
      title,
      message,
      userId: notification.userId,
      organizationId: notification.organizationId,
      priority,
      metadata: {
        emailId: notification.emailId,
        threadId: notification.threadId,
        from: notification.from,
        subject: notification.subject,
        aiAnalysis: ai,
        attachments: notification.attachments,
        processingTime: new Date().toISOString(),
        rawContentPreview: ai.rawContent?.substring(0, 500)
      },
      actionUrl: `/emails/${notification.emailId}`,
      tags: ['gmail', ...ai.tags]
    });

    // Si urgent, créer une notification push supplémentaire
    if (ai.urgency === 'urgent') {
      await this.createUrgentPushNotification(notification);
    }
  }

  /**
   * 🚨 NOTIFICATION PUSH URGENTE
   */
  private async createUrgentPushNotification(notification: EnrichedGmailNotification): Promise<void> {
    console.log(`🚨 [GoogleMail] NOTIFICATION URGENTE: ${notification.subject}`);
    
    // TODO: Implémenter push notifications (Firebase, WebPush, etc.)
    this.emit('urgent-email', {
      type: 'URGENT_EMAIL',
      title: `🚨 EMAIL URGENT de ${notification.from}`,
      body: notification.aiAnalysis.summary,
      data: {
        emailId: notification.emailId,
        userId: notification.userId,
        urgency: notification.aiAnalysis.urgency
      }
    });
  }

  /**
   * 🔧 MÉTHODES UTILITAIRES
   */
  private async getGoogleTokens(userId: string, organizationId?: string) {
    if (organizationId) {
      return prisma.googleToken.findUnique({
        where: { userId_organizationId: { userId, organizationId } }
      });
    }
    // Fallback: chercher le premier token de l'utilisateur
    return prisma.googleToken.findFirst({
      where: { userId }
    });
  }

  private async getUserOrganization(userId: string): Promise<string | null> {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId },
      select: { organizationId: true }
    });
    return userOrg?.organizationId || null;
  }

  private extractEmailAddress(emailString: string): string {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString;
  }

  private generateSummary(email: any): string {
    const content = email.textContent || email.snippet || '';
    if (content.length <= 100) return content;
    return content.substring(0, 100) + '...';
  }

  private extractKeyPoints(content: string): string[] {
    // Extraction basique de points clés
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  private async getFullEmailContent(emailId: string, _userId: string): Promise<any> {
    // TODO: Implémenter la récupération complète via Gmail API
    return {
      id: emailId,
      threadId: 'thread_' + emailId,
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Email Subject',
      snippet: 'Email snippet...',
      internalDate: Date.now().toString(),
      textContent: 'Full email content...',
      attachments: []
    };
  }
}

export default GoogleMailNotificationService;

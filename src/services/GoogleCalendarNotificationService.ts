/**
 * 📅 SERVICE NOTIFICATIONS GOOGLE CALENDAR ULTRA-INTELLIGENT
 * 
 * FONCTIONNALITÉS AVANCÉES :
 * - ⚡ Synchronisation temps réel Google Calendar
 * - 🧠 Analyse IA des rendez-vous (importance, préparation)
 * - 🔔 Notifications intelligentes multi-niveaux
 * - 📊 Suggestions IA pour préparation réunions
 * - ⏰ Alertes adaptatives selon le type de meeting
 * - 📍 Intégration localisation et transport
 * - 👥 Analyse participants et historique
 * - 🎯 Recommandations IA pour follow-up
 */

import { google } from 'googleapis';
import { UniversalNotificationService } from './UniversalNotificationService';
import { EventEmitter } from 'events';
import { prisma } from '../lib/prisma';

// 🧠 INTERFACE ANALYSE IA RENDEZ-VOUS
interface MeetingAIAnalysis {
  importance: 'low' | 'medium' | 'high' | 'critical';
  meetingType: 'commercial' | 'interne' | 'support' | 'formation' | 'presentation' | 'negociation';
  preparationTime: number; // minutes recommandées
  keyTopics: string[];
  participantAnalysis: {
    vipAttendees: string[];
    newContacts: string[];
    decisionMakers: string[];
  };
  suggestedPreparation: string[];
  followUpActions: string[];
  estimatedDuration: number;
  conflictRisk: 'none' | 'low' | 'medium' | 'high';
  travelTime?: number;
}

// 📅 INTERFACE NOTIFICATION RENDEZ-VOUS ENRICHIE
interface EnrichedCalendarNotification {
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  organizer: string;
  aiAnalysis: MeetingAIAnalysis;
  userId: string;
  organizationId: string;
  meetingUrl?: string;
  attachments?: Array<{
    title: string;
    link: string;
  }>;
}

export class GoogleCalendarNotificationService extends EventEmitter {
  private static instance: GoogleCalendarNotificationService;
  private universalService: UniversalNotificationService;
  private calendarWatchers = new Map<string, boolean>();

  private constructor() {
    super();
    this.universalService = UniversalNotificationService.getInstance();
  }

  static getInstance(): GoogleCalendarNotificationService {
    if (!this.instance) {
      this.instance = new GoogleCalendarNotificationService();
    }
    return this.instance;
  }

  /**
   * 🚀 DÉMARRER SURVEILLANCE CALENDAR TEMPS RÉEL
   */
  async startCalendarWatching(userId: string): Promise<void> {
    try {

      const googleTokens = await this.getGoogleTokens(userId);
      if (!googleTokens) {
        console.warn(`⚠️ [GoogleCalendar] Pas de tokens Google: ${userId}`);
        return;
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({
        access_token: googleTokens.accessToken,
        refresh_token: googleTokens.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth });

      // Configurer surveillance push notifications
      const watchResponse = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: `calendar-watch-${userId}-${Date.now()}`,
          type: 'web_hook',
          address: `${process.env.APP_URL}/api/webhooks/google-calendar`,
          token: userId
        }
      });

      this.calendarWatchers.set(userId, true);
      

      // Vérification immédiate des événements proches
      await this.checkUpcomingEvents(userId);

    } catch (error) {
      console.error(`❌ [GoogleCalendar] Erreur surveillance: ${userId}`, error);
    }
  }

  /**
   * 🔍 VÉRIFIER ÉVÉNEMENTS PROCHES AVEC IA
   */
  async checkUpcomingEvents(userId: string): Promise<void> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const events = await this.getUpcomingEvents(userId, now, tomorrow);
      
      for (const event of events) {
        await this.processEventWithAI(event, userId);
      }

    } catch (error) {
      console.error('❌ [GoogleCalendar] Erreur vérification événements:', error);
    }
  }

  /**
   * 🧠 TRAITER ÉVÉNEMENT AVEC IA
   */
  private async processEventWithAI(event: any, userId: string): Promise<void> {
    try {

      // Analyser l'événement avec IA
      const aiAnalysis = await this.analyzeEventWithAI(event);

      // Créer notification enrichie
      const enrichedNotification: EnrichedCalendarNotification = {
        eventId: event.id,
        title: event.summary || 'Rendez-vous',
        description: event.description,
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        location: event.location,
        attendees: (event.attendees || []).map((a: any) => a.email),
        organizer: event.organizer?.email || '',
        aiAnalysis,
        userId,
        organizationId: (await this.getUserOrganization(userId))!,
        meetingUrl: event.hangoutLink || event.location?.includes('http') ? event.location : undefined,
        attachments: (event.attachments || []).map((a: any) => ({
          title: a.title,
          link: a.fileUrl
        }))
      };

      // Créer les notifications selon l'analyse IA
      await this.createSmartCalendarNotifications(enrichedNotification);


    } catch (error) {
      console.error('❌ [GoogleCalendar] Erreur traitement événement:', error);
    }
  }

  /**
   * 🧠 ANALYSER ÉVÉNEMENT AVEC IA
   */
  private async analyzeEventWithAI(event: any): Promise<MeetingAIAnalysis> {
    try {
      const title = (event.summary || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const attendees = event.attendees || [];

      // Détection type de meeting
      let meetingType: MeetingAIAnalysis['meetingType'] = 'interne';
      if (title.includes('commercial') || title.includes('vente') || title.includes('prospect')) {
        meetingType = 'commercial';
      } else if (title.includes('support') || title.includes('problème')) {
        meetingType = 'support';
      } else if (title.includes('formation') || title.includes('training')) {
        meetingType = 'formation';
      } else if (title.includes('présentation') || title.includes('demo')) {
        meetingType = 'presentation';
      } else if (title.includes('négociation') || title.includes('contrat')) {
        meetingType = 'negociation';
      }

      // Calcul importance
      let importance: MeetingAIAnalysis['importance'] = 'medium';
      if (attendees.length > 5 || title.includes('important') || title.includes('urgent')) {
        importance = 'high';
      } else if (meetingType === 'commercial' || meetingType === 'negociation') {
        importance = 'high';
      } else if (attendees.length <= 2) {
        importance = 'low';
      }

      // Si mots-clés critiques
      if (title.includes('board') || title.includes('direction') || title.includes('ceo')) {
        importance = 'critical';
      }

      // Analyse participants
      const participantAnalysis = this.analyzeParticipants(attendees);

      // Temps de préparation recommandé
      let preparationTime = 15; // minutes par défaut
      if (importance === 'critical') preparationTime = 60;
      else if (importance === 'high') preparationTime = 30;
      else if (meetingType === 'presentation') preparationTime = 45;

      return {
        importance,
        meetingType,
        preparationTime,
        keyTopics: this.extractKeyTopics(title + ' ' + description),
        participantAnalysis,
        suggestedPreparation: this.generatePreparationSuggestions(meetingType, title),
        followUpActions: this.generateFollowUpActions(meetingType),
        estimatedDuration: this.calculateDuration(event),
        conflictRisk: await this.assessConflictRisk(event),
        travelTime: this.calculateTravelTime(event.location)
      };

    } catch (error) {
      console.error('❌ [GoogleCalendar] Erreur analyse IA:', error);
      
      // Analyse de fallback
      return {
        importance: 'medium',
        meetingType: 'interne',
        preparationTime: 15,
        keyTopics: ['Rendez-vous'],
        participantAnalysis: { vipAttendees: [], newContacts: [], decisionMakers: [] },
        suggestedPreparation: ['Vérifier l\'agenda'],
        followUpActions: ['Envoyer compte-rendu'],
        estimatedDuration: 60,
        conflictRisk: 'none'
      };
    }
  }

  /**
   * 🔔 CRÉER NOTIFICATIONS INTELLIGENTES MULTI-NIVEAUX
   */
  private async createSmartCalendarNotifications(notification: EnrichedCalendarNotification): Promise<void> {
    const ai = notification.aiAnalysis;
    const timeUntil = notification.startTime.getTime() - Date.now();
    const minutesUntil = Math.round(timeUntil / (1000 * 60));

    // NOTIFICATION 1: Préparation (selon IA)
    if (minutesUntil <= ai.preparationTime && minutesUntil > 15) {
      await this.createPreparationNotification(notification);
    }

    // NOTIFICATION 2: Rappel 15 minutes avant
    if (minutesUntil <= 15 && minutesUntil > 5) {
      await this.createReminderNotification(notification);
    }

    // NOTIFICATION 3: Alerte 5 minutes avant
    if (minutesUntil <= 5 && minutesUntil > 0) {
      await this.createUrgentReminderNotification(notification);
    }

    // NOTIFICATION 4: Follow-up après meeting
    if (minutesUntil < -30) { // 30 min après le début
      await this.createFollowUpNotification(notification);
    }
  }

  /**
   * 📚 NOTIFICATION PRÉPARATION
   */
  private async createPreparationNotification(notification: EnrichedCalendarNotification): Promise<void> {
    const ai = notification.aiAnalysis;
    
    await this.universalService.createNotification({
      type: 'UPCOMING_MEETING',
      title: `📚 Préparer: ${notification.title}`,
      message: `Dans ${ai.preparationTime}min | ${ai.meetingType} - ${ai.importance}`,
      userId: notification.userId,
      organizationId: notification.organizationId,
      priority: ai.importance === 'critical' ? 'urgent' : 'high',
      metadata: {
        eventId: notification.eventId,
        aiAnalysis: ai,
        suggestedPreparation: ai.suggestedPreparation,
        keyTopics: ai.keyTopics,
        phase: 'preparation'
      },
      actionUrl: `/calendar/${notification.eventId}`,
      tags: ['calendar', 'preparation', ai.meetingType]
    });
  }

  /**
   * ⏰ NOTIFICATION RAPPEL 15 MIN
   */
  private async createReminderNotification(notification: EnrichedCalendarNotification): Promise<void> {
    await this.universalService.createNotification({
      type: 'UPCOMING_MEETING',
      title: `⏰ Dans 15min: ${notification.title}`,
      message: `${notification.location ? '📍 ' + notification.location : '💻 Meeting'} | ${notification.attendees.length} participants`,
      userId: notification.userId,
      organizationId: notification.organizationId,
      priority: 'high',
      metadata: {
        eventId: notification.eventId,
        location: notification.location,
        attendees: notification.attendees,
        meetingUrl: notification.meetingUrl,
        phase: 'reminder'
      },
      actionUrl: notification.meetingUrl || `/calendar/${notification.eventId}`,
      tags: ['calendar', 'reminder']
    });
  }

  /**
   * 🚨 NOTIFICATION URGENTE 5 MIN
   */
  private async createUrgentReminderNotification(notification: EnrichedCalendarNotification): Promise<void> {
    await this.universalService.createNotification({
      type: 'UPCOMING_MEETING',
      title: `🚨 MAINTENANT: ${notification.title}`,
      message: `Meeting commence ! ${notification.meetingUrl ? 'Cliquer pour rejoindre' : ''}`,
      userId: notification.userId,
      organizationId: notification.organizationId,
      priority: 'urgent',
      metadata: {
        eventId: notification.eventId,
        meetingUrl: notification.meetingUrl,
        urgentAction: true,
        phase: 'urgent'
      },
      actionUrl: notification.meetingUrl || `/calendar/${notification.eventId}`,
      tags: ['calendar', 'urgent', 'now']
    });

    // Push notification urgente
    this.emit('urgent-meeting', {
      type: 'URGENT_MEETING',
      title: `🚨 Meeting: ${notification.title}`,
      body: 'Votre rendez-vous commence maintenant !',
      data: {
        eventId: notification.eventId,
        meetingUrl: notification.meetingUrl
      }
    });
  }

  /**
   * 📝 NOTIFICATION FOLLOW-UP
   */
  private async createFollowUpNotification(notification: EnrichedCalendarNotification): Promise<void> {
    const ai = notification.aiAnalysis;
    
    await this.universalService.createNotification({
      type: 'PROJECT_UPDATE',
      title: `📝 Follow-up: ${notification.title}`,
      message: `Actions recommandées après votre ${ai.meetingType}`,
      userId: notification.userId,
      organizationId: notification.organizationId,
      priority: 'medium',
      metadata: {
        eventId: notification.eventId,
        followUpActions: ai.followUpActions,
        meetingType: ai.meetingType,
        phase: 'followup'
      },
      actionUrl: `/calendar/${notification.eventId}/followup`,
      tags: ['calendar', 'followup', ai.meetingType]
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

  private async getUpcomingEvents(userId: string, start: Date, end: Date): Promise<any[]> {
    // TODO: Implémenter récupération événements via Google Calendar API
    return [];
  }

  private analyzeParticipants(attendees: any[]) {
    if (!Array.isArray(attendees) || attendees.length === 0) {
      return {
        vipAttendees: [],
        newContacts: [],
        decisionMakers: []
      };
    }

    const normalized = attendees.map((attendee) => {
      if (typeof attendee === 'string') {
        return { email: attendee };
      }
      return attendee || {};
    });

    const vipKeywords = ['ceo', 'cfo', 'cto', 'founder', 'président', 'president', 'vp'];
    const decisionKeywords = ['director', 'manager', 'lead', 'responsable', 'head'];

    const vipAttendees = normalized
      .filter((attendee) => typeof attendee.email === 'string' && vipKeywords.some((keyword) => attendee.email.toLowerCase().includes(keyword)))
      .map((attendee) => attendee.email!);

    const decisionMakers = normalized
      .filter((attendee) => {
        const target = (attendee.email || attendee.displayName || '').toLowerCase();
        return decisionKeywords.some((keyword) => target.includes(keyword));
      })
      .map((attendee) => attendee.email || attendee.displayName)
      .filter(Boolean) as string[];

    const newContacts = normalized
      .filter((attendee) => {
        if (typeof attendee.email !== 'string') return false;
        const status = (attendee.responseStatus || attendee.status || '').toLowerCase();
        return status === 'needsaction' || status === 'tentative';
      })
      .map((attendee) => attendee.email!);

    return {
      vipAttendees,
      newContacts,
      decisionMakers
    };
  }

  private extractKeyTopics(text: string): string[] {
    // Extraction basique de mots-clés
    const keywords = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    return [...new Set(keywords)].slice(0, 5);
  }

  private generatePreparationSuggestions(meetingType: string, title: string): string[] {
    const suggestions = ['Vérifier l\'agenda'];
    const normalizedTitle = title.toLowerCase();
    
    if (meetingType === 'commercial') {
      suggestions.push('Préparer argumentaire', 'Revoir historique client');
    } else if (meetingType === 'presentation') {
      suggestions.push('Tester la présentation', 'Préparer Q&A');
    }

    if (normalizedTitle.includes('budget')) {
      suggestions.push('Réviser les chiffres budgétaires');
    }
    if (normalizedTitle.includes('contrat')) {
      suggestions.push('Relire le contrat');
    }
    if (normalizedTitle.includes('board') || normalizedTitle.includes('direction')) {
      suggestions.push('Préparer les indicateurs clés');
    }
    
    return suggestions;
  }

  private generateFollowUpActions(meetingType: string): string[] {
    if (meetingType === 'commercial') {
      return ['Envoyer proposition', 'Planifier follow-up', 'Mettre à jour CRM'];
    }
    return ['Envoyer compte-rendu', 'Définir actions suivantes'];
  }

  private calculateDuration(event: any): number {
    if (!event.end || !event.start) return 60;
    const start = new Date(event.start.dateTime || event.start.date);
    const end = new Date(event.end.dateTime || event.end.date);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  private async assessConflictRisk(event: any): Promise<'none' | 'low' | 'medium' | 'high'> {
    if (!event || !event.start || !event.end) {
      return 'none';
    }

    const start = new Date(event.start.dateTime || event.start.date).getTime();
    const end = new Date(event.end.dateTime || event.end.date).getTime();
    const now = Date.now();

    if (start <= now && end >= now) {
      return 'high';
    }

    const timeUntilStart = start - now;
    if (timeUntilStart < 15 * 60 * 1000) {
      return 'medium';
    }

    const attendeeCount = Array.isArray(event.attendees) ? event.attendees.length : 0;
    if (attendeeCount > 6) {
      return 'low';
    }

    return 'none';
  }

  private calculateTravelTime(location?: string): number | undefined {
    if (!location) return undefined;
    // TODO: Intégrer API Google Maps pour calcul temps de trajet
    return 15; // minutes par défaut
  }
}

export default GoogleCalendarNotificationService;

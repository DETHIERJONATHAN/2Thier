/**
 * SERVICE GOOGLE CALENDAR - UTILISANT LE MODULE D'AUTHENTIFICATION CENTRALISÉ
 * 
 * Ce service utilise exclusivement le GoogleAuthManager pour obtenir les clients authentifiés.
 * Il ne contient AUCUNE logique d'authentification propre.
 */

import { google } from 'googleapis';
import { googleAuthManager } from '../index';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Obtient une instance de l'API Google Calendar pour une organisation
   */
  private async getCalendarAPI(organizationId: string) {
    console.log(`[GoogleCalendarService] 📅 Création instance API Calendar pour organisation: ${organizationId}`);
    
    const authClient = await googleAuthManager.getAuthenticatedClient(organizationId);
    if (!authClient) {
      throw new Error('Connexion Google non configurée.');
    }

    return google.calendar({ version: 'v3', auth: authClient });
  }

  /**
   * Récupère les événements du calendrier
   */
  async getEvents(organizationId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      const calendar = await this.getCalendarAPI(organizationId);

      const params = {
        calendarId: 'primary',
        singleEvents: true,
        orderBy: 'startTime' as const,
        maxResults: 100,
        timeMin: startDate?.toISOString(),
        timeMax: endDate?.toISOString(),
      };

      const response = await calendar.events.list(params);
      const events = response.data.items || [];

      return events.map(event => ({
        id: event.id,
        summary: event.summary || 'Sans titre',
        description: event.description,
        start: {
          dateTime: event.start?.dateTime || event.start?.date || '',
          timeZone: event.start?.timeZone,
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date || '',
          timeZone: event.end?.timeZone,
        },
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email || '',
          displayName: attendee.displayName,
        })),
      }));
    } catch (error) {
      console.error('[GoogleCalendarService] ❌ Erreur lors de la récupération des événements:', error);
      throw error;
    }
  }

  /**
   * Crée un nouvel événement
   */
  async createEvent(organizationId: string, event: CalendarEvent): Promise<string> {
    try {
      const calendar = await this.getCalendarAPI(organizationId);

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
        },
      });

      return response.data.id!;
    } catch (error) {
      console.error('[GoogleCalendarService] ❌ Erreur lors de la création de l\'événement:', error);
      throw error;
    }
  }

  /**
   * Met à jour un événement existant
   */
  async updateEvent(organizationId: string, eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    try {
      const calendar = await this.getCalendarAPI(organizationId);

      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
        },
      });
    } catch (error) {
      console.error('[GoogleCalendarService] ❌ Erreur lors de la mise à jour de l\'événement:', error);
      throw error;
    }
  }

  /**
   * Supprime un événement
   */
  async deleteEvent(organizationId: string, eventId: string): Promise<void> {
    try {
      const calendar = await this.getCalendarAPI(organizationId);

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      console.error('[GoogleCalendarService] ❌ Erreur lors de la suppression de l\'événement:', error);
      throw error;
    }
  }

  /**
   * Synchronise les événements avec Google Calendar
   */
  async syncEvents(organizationId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    console.log(`[GoogleCalendarService] 🔄 Synchronisation des événements pour l'organisation: ${organizationId}`);
    console.log(`[GoogleCalendarService] 📅 Période: ${startDate.toISOString()} -> ${endDate.toISOString()}`);
    
    return await this.getEvents(organizationId, startDate, endDate);
  }
}

// Export de l'instance singleton
export const googleCalendarService = GoogleCalendarService.getInstance();

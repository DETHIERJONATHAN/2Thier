// src/services/GoogleCalendarApiService.ts
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { googleAuthManager } from '../google-auth/index.js'; // Import du manager centralisé

/**
 * Service pour interagir avec l'API Google Calendar.
 * Gère les opérations CRUD sur les événements en utilisant un client OAuth2 déjà authentifié.
 */
export class GoogleCalendarApiService {
  private oauth2Client: OAuth2Client;

  // Le constructeur accepte maintenant directement un client OAuth2 authentifié.
  private constructor(client: OAuth2Client) {
    this.oauth2Client = client;
  }

  /**
   * Crée une instance du service pour une organisation donnée.
   * Utilise le manager d'authentification centralisé pour obtenir un client authentifié.
   * @param organizationId L'ID de l'organisation pour laquelle créer le service.
   * @returns Une instance de GoogleCalendarApiService ou null si l'authentification échoue.
   */
  static async create(organizationId: string): Promise<GoogleCalendarApiService | null> {
    console.log(`[GoogleCalendarApiService] Tentative de création du service pour l'organisation: ${organizationId}`);
    
    // Utilisation du manager centralisé pour obtenir le client authentifié
    const authClient = await googleAuthManager.getAuthenticatedClient(organizationId);

    if (!authClient) {
      console.error(`[GoogleCalendarApiService] Échec de l'obtention du client authentifié via googleAuthManager pour l'organisation ${organizationId}.`);
      return null;
    }
    
    console.log(`[GoogleCalendarApiService] Client authentifié obtenu avec succès pour l'organisation ${organizationId}.`);
    return new GoogleCalendarApiService(authClient);
  }

  private get calendar(): calendar_v3.Calendar {
    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Crée un événement dans Google Calendar.
   * @param eventData Données de l'événement à créer.
   * @returns L'événement créé par l'API Google.
   */
  async createEvent(eventData: calendar_v3.Params$Resource$Events$Insert["requestBody"]) {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
        conferenceDataVersion: 1, // Pour activer la création de liens Meet
      });
      console.log('[GoogleCalendarService] Événement créé sur Google Calendar:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('[GoogleCalendarService] Erreur lors de la création de l\'événement sur Google:', error);
      throw new Error('Impossible de créer l\'événement sur Google Calendar.');
    }
  }

  /**
   * Met à jour un événement existant dans Google Calendar.
   * @param eventId ID de l'événement Google à mettre à jour.
   * @param eventData Nouvelles données de l'événement.
   * @returns L'événement mis à jour.
   */
  async updateEvent(eventId: string, eventData: calendar_v3.Params$Resource$Events$Update["requestBody"]) {
    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: eventData,
      });
      console.log('[GoogleCalendarService] Événement mis à jour sur Google Calendar:', eventId);
      return response.data;
    } catch (error) {
      console.error(`[GoogleCalendarService] Erreur lors de la mise à jour de l'événement ${eventId} sur Google:`, error);
      throw new Error('Impossible de mettre à jour l\'événement sur Google Calendar.');
    }
  }

  /**
   * Supprime un événement de Google Calendar.
   * @param eventId ID de l'événement Google à supprimer.
   */
  async deleteEvent(eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
      console.log('[GoogleCalendarService] Événement supprimé de Google Calendar:', eventId);
    } catch (error) {
      console.error(`[GoogleCalendarService] Erreur lors de la suppression de l'événement ${eventId} sur Google:`, error);
      // Ne pas bloquer si l'événement n'existe déjà plus sur Google
      if (error.code === 404 || error.code === 410) {
        console.warn(`[GoogleCalendarService] L'événement ${eventId} n'existait pas ou plus sur Google Calendar.`);
        return;
      }
      throw new Error('Impossible de supprimer l\'événement sur Google Calendar.');
    }
  }
  
  /**
   * Récupère les événements de Google Calendar pour une période donnée.
   * @param timeMin Date de début (ISO string).
   * @param timeMax Date de fin (ISO string).
   * @returns Liste des événements.
   */
  async listEvents(timeMin: string, timeMax: string) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });
      return response.data.items || [];
    } catch (error) {
      console.error('[GoogleCalendarService] Erreur lors de la récupération des événements depuis Google:', error);
      throw new Error('Impossible de récupérer les événements depuis Google Calendar.');
    }
  }
}

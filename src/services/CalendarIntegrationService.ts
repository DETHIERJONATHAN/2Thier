import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
  projectId?: string;
  leadId?: string;
  meetingType: 'client' | 'internal' | 'demo' | 'followup';
  googleEventId?: string;
  location?: string;
  meetingLink?: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  status: 'active' | 'pending' | 'completed';
  assignedUsers: string[];
}

export class CalendarIntegrationService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  // Créer un RDV lié à un projet
  async createProjectMeeting(data: {
    projectId: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    attendees: string[];
    meetingType: CalendarEvent['meetingType'];
    location?: string;
  }): Promise<CalendarEvent> {
    try {
      // 1. Créer l'événement dans Google Calendar
      const googleEvent = await this.createGoogleCalendarEvent({
        summary: `[${data.meetingType.toUpperCase()}] ${data.title}`,
        description: data.description,
        start: data.start,
        end: data.end,
        attendees: data.attendees,
        location: data.location
      });

      // 2. Enregistrer dans le CRM
      const crmEvent = await this.api.post('/api/calendar/events', {
        ...data,
        googleEventId: googleEvent.id,
        meetingLink: googleEvent.meetingLink
      });

      return crmEvent.data;
    } catch (error) {
      console.error('Erreur lors de la création du RDV projet:', error);
      throw error;
    }
  }

  // Créer un RDV avec un lead
  async createLeadMeeting(data: {
    leadId: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    meetingType: CalendarEvent['meetingType'];
    location?: string;
  }): Promise<CalendarEvent> {
    try {
      // Récupérer les infos du lead
      const lead = await this.api.get(`/api/leads/${data.leadId}`);
      
      const attendees = [lead.data.email];
      
      return await this.createProjectMeeting({
        projectId: lead.data.projectId || '',
        attendees,
        ...data
      });
    } catch (error) {
      console.error('Erreur lors de la création du RDV lead:', error);
      throw error;
    }
  }

  // Récupérer les RDV d'un projet
  async getProjectMeetings(projectId: string): Promise<CalendarEvent[]> {
    try {
      const response = await this.api.get(`/api/calendar/events/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des RDV:', error);
      return [];
    }
  }

  // Récupérer les RDV d'un utilisateur
  async getUserMeetings(userId?: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await this.api.get(`/api/calendar/events?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des RDV utilisateur:', error);
      return [];
    }
  }

  // Créer l'événement dans Google Calendar (simulation)
  private async createGoogleCalendarEvent(eventData: any): Promise<any> {
    // En pratique, ici vous utiliseriez l'API Google Calendar
    // Pour l'instant, on simule la création
    return {
      id: `google_${Date.now()}`,
      meetingLink: `https://meet.google.com/${Math.random().toString(36).substr(2, 9)}`,
      ...eventData
    };
  }

  // Synchroniser avec Google Calendar
  async syncWithGoogleCalendar(): Promise<void> {
    try {
      // Récupérer les événements depuis Google Calendar
      // Comparer avec la base CRM
      // Mettre à jour les différences
      console.log('Synchronisation avec Google Calendar...');
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
    }
  }
}

// Hook pour utiliser le service
export const useCalendarIntegration = () => {
  const { api } = useAuthenticatedApi();
  const service = new CalendarIntegrationService(api);

  return {
    createProjectMeeting: service.createProjectMeeting.bind(service),
    createLeadMeeting: service.createLeadMeeting.bind(service),
    getProjectMeetings: service.getProjectMeetings.bind(service),
    getUserMeetings: service.getUserMeetings.bind(service),
    syncWithGoogleCalendar: service.syncWithGoogleCalendar.bind(service)
  };
};

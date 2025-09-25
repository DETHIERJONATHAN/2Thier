import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { message } from 'antd';
import dayjs from 'dayjs';

// 🎯 INTERFACES POUR GOOGLE AGENDA
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: Attendee[];
  organizer: Attendee;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'default' | 'public' | 'private';
  eventType: 'meeting' | 'call' | 'rdv' | 'deadline' | 'reminder' | 'other';
  meetingUrl?: string;
  phoneNumber?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  color?: string;
  reminders?: Reminder[];
  recurrence?: RecurrenceRule;
  attachments?: Attachment[];
  isAllDay: boolean;
  created: string;
  updated: string;
  source: 'google' | 'outlook' | 'manual';
  leadId?: string;
  clientId?: string;
  projectId?: string;
}

export interface Attendee {
  email: string;
  name?: string;
  status: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  isOrganizer?: boolean;
  avatar?: string;
}

export interface Reminder {
  method: 'email' | 'popup';
  minutes: number;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  until?: string;
  count?: number;
  byWeekDay?: number[];
}

export interface Attachment {
  title: string;
  fileUrl: string;
  mimeType: string;
  size: number;
}

export interface CalendarStats {
  totalEvents: number;
  todayEvents: number;
  weekEvents: number;
  monthEvents: number;
  upcomingMeetings: number;
  conflicts: number;
  completionRate: number;
  avgMeetingDuration: number;
}

// 🎯 HOOK GOOGLE AGENDA OPTIMISÉ
export const useGoogleAgenda = () => {
  const { api } = useAuthenticatedApi();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<CalendarStats | null>(null);

  // 🔧 API STABILISÉE
  const stableApi = useMemo(() => api, []);

  // 📊 CHARGEMENT DES ÉVÉNEMENTS
  const loadEvents = useCallback(async (startDate?: string, endDate?: string) => {
    if (!stableApi) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await stableApi.get(`/calendar/events?${params.toString()}`);
      const eventsData = response.data || [];
      
      // Transformer les données pour l'interface
      const transformedEvents = eventsData.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.startDate,
        end: event.endDate,
        location: event.location,
        eventType: event.type || 'other',
        priority: event.priority || 'medium',
        category: event.type || 'other',
        status: event.status === 'confirmé' ? 'confirmed' : 
                event.status === 'tentative' ? 'tentative' : 
                'cancelled',
        isAllDay: event.allDay || false,
        created: event.createdAt,
        updated: event.updatedAt,
        source: event.googleEventId ? 'google' : 'manual',
        organizer: {
          email: event.owner?.email || '',
          name: `${event.owner?.firstName || ''} ${event.owner?.lastName || ''}`.trim()
        },
        attendees: event.participants?.map((p: any) => ({
          email: p.user?.email || '',
          name: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
          status: 'accepted'
        })) || []
      }));

      setEvents(transformedEvents);
      calculateStats(transformedEvents);
      
      message.success(`${transformedEvents.length} événements chargés`);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      message.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  }, [stableApi]);

  // 🔄 SYNCHRONISATION GOOGLE CALENDAR
  const syncWithGoogleCalendar = useCallback(async () => {
    if (!stableApi) return;
    
    setSyncing(true);
    try {
      const now = dayjs();
      const startDate = now.subtract(1, 'month').toISOString();
      const endDate = now.add(3, 'month').toISOString();
      
      await stableApi.post('/calendar/sync', { startDate, endDate });
      await loadEvents();
      message.success('🔄 Synchronisation Google Calendar réussie');
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      message.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  }, [stableApi, loadEvents]);

  // 📝 CRÉATION D'ÉVÉNEMENT
  const createEvent = useCallback(async (eventData: any) => {
    if (!stableApi) return;

    try {
      const payload = {
        title: eventData.title,
        description: eventData.description,
        startDate: eventData.start,
        endDate: eventData.end,
        location: eventData.location,
        type: eventData.category || eventData.eventType,
        priority: eventData.priority,
        allDay: eventData.isAllDay,
        status: 'confirmé',
        createMeetLink: eventData.meetingUrl ? true : false
      };

      await stableApi.post('/calendar/events', payload);
      message.success('✅ Événement créé avec succès');
      await loadEvents();
      return true;
    } catch (error) {
      console.error('Erreur création événement:', error);
      message.error('Erreur lors de la création de l\'événement');
      return false;
    }
  }, [stableApi, loadEvents]);

  // ✏️ MODIFICATION D'ÉVÉNEMENT
  const updateEvent = useCallback(async (eventId: string, eventData: any) => {
    if (!stableApi) return;

    try {
      const payload = {
        title: eventData.title,
        description: eventData.description,
        startDate: eventData.start,
        endDate: eventData.end,
        location: eventData.location,
        type: eventData.category || eventData.eventType,
        priority: eventData.priority,
        allDay: eventData.isAllDay
      };

      await stableApi.put(`/calendar/events/${eventId}`, payload);
      message.success('✅ Événement modifié avec succès');
      await loadEvents();
      return true;
    } catch (error) {
      console.error('Erreur modification événement:', error);
      message.error('Erreur lors de la modification de l\'événement');
      return false;
    }
  }, [stableApi, loadEvents]);

  // 🗑️ SUPPRESSION D'ÉVÉNEMENT
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!stableApi) return;

    try {
      await stableApi.delete(`/calendar/events/${eventId}`);
      message.success('✅ Événement supprimé avec succès');
      await loadEvents();
      return true;
    } catch (error) {
      console.error('Erreur suppression événement:', error);
      message.error('Erreur lors de la suppression de l\'événement');
      return false;
    }
  }, [stableApi, loadEvents]);

  // 📈 CALCUL DES STATISTIQUES
  const calculateStats = useCallback((eventsData: CalendarEvent[]) => {
    const now = dayjs();
    const today = now.startOf('day');
    const weekStart = now.startOf('week');
    const monthStart = now.startOf('month');

    const todayEvents = eventsData.filter(event => 
      dayjs(event.start).isSame(today, 'day')
    ).length;

    const weekEvents = eventsData.filter(event => 
      dayjs(event.start).isAfter(weekStart) && dayjs(event.start).isBefore(weekStart.add(1, 'week'))
    ).length;

    const monthEvents = eventsData.filter(event => 
      dayjs(event.start).isAfter(monthStart) && dayjs(event.start).isBefore(monthStart.add(1, 'month'))
    ).length;

    const upcomingMeetings = eventsData.filter(event => 
      dayjs(event.start).isAfter(now) && dayjs(event.start).isBefore(now.add(7, 'days'))
    ).length;

    // Détection des conflits
    const conflicts = detectEventConflicts(eventsData);

    // Taux de complétion
    const pastEvents = eventsData.filter(event => dayjs(event.end).isBefore(now));
    const completedEvents = pastEvents.filter(event => event.status === 'confirmed');
    const completionRate = pastEvents.length > 0 ? (completedEvents.length / pastEvents.length) * 100 : 100;

    // Durée moyenne des réunions
    const meetings = eventsData.filter(event => event.eventType === 'meeting');
    const avgDuration = meetings.length > 0 
      ? meetings.reduce((sum, event) => sum + dayjs(event.end).diff(dayjs(event.start), 'minutes'), 0) / meetings.length
      : 0;

    setStats({
      totalEvents: eventsData.length,
      todayEvents,
      weekEvents,
      monthEvents,
      upcomingMeetings,
      conflicts: conflicts.length,
      completionRate: Math.round(completionRate),
      avgMeetingDuration: Math.round(avgDuration)
    });
  }, []);

  // 🔍 DÉTECTION DES CONFLITS
  const detectEventConflicts = useCallback((eventsData: CalendarEvent[]) => {
    const conflicts: string[] = [];
    
    for (let i = 0; i < eventsData.length; i++) {
      for (let j = i + 1; j < eventsData.length; j++) {
        const event1 = eventsData[i];
        const event2 = eventsData[j];
        
        const start1 = dayjs(event1.start);
        const end1 = dayjs(event1.end);
        const start2 = dayjs(event2.start);
        const end2 = dayjs(event2.end);
        
        if (start1.isBefore(end2) && start2.isBefore(end1)) {
          conflicts.push(event1.id, event2.id);
        }
      }
    }
    
    return [...new Set(conflicts)];
  }, []);

  // 🚀 CHARGEMENT INITIAL
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    // États
    events,
    loading,
    syncing,
    stats,
    
    // Actions
    loadEvents,
    syncWithGoogleCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    calculateStats,
    detectEventConflicts
  };
};

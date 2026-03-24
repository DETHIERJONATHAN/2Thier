/**
 * 🎣 useGoogleCalendar - Hook pour l'intégration Google Calendar intelligente
 * 
 * Fonctionnalités révolutionnaires :
 * - 📅 Affichage agenda temps réel
 * - 🎯 Calcul créneaux libres automatique
 * - 🤖 Suggestions IA basées sur géolocalisation
 * - ⚡ Création RDV directe pendant l'appel
 * - 📧 Email confirmation automatique
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../../components/Notifications';
import dayjs from 'dayjs';
import type { 
  UseGoogleCalendarReturn,
  CalendarEvent,
  FreeSlot,
  CalendarState,
  CreateEventRequest,
  CreateEventResponse,
  Lead
} from '../types/CallTypes';

export const useGoogleCalendar = (
  leadId: string,
  lead: Lead | null
): UseGoogleCalendarReturn => {
  
  const { api } = useAuthenticatedApi();
  
  // 📅 État principal du calendrier
  const [calendarState, setCalendarState] = useState<CalendarState>({
    events: [],
    freeSlots: [],
    selectedDate: dayjs(),
    selectedSlot: null,
    isLoading: false,
    isVisible: false
  });
  
  const [error, setError] = useState<string>();
  
  // 🎯 Calculer les créneaux libres avec IA géospatiale
  const calculateFreeSlots = useCallback(async (
    date: dayjs.Dayjs, 
    events: CalendarEvent[]
  ): Promise<void> => {
    try {
      console.log('[useGoogleCalendar] 🧠 Calcul créneaux libres IA...');
      
      const response = await api.post<{ freeSlots: FreeSlot[] }>('/api/google/calendar/free-slots', {
        date: date.format('YYYY-MM-DD'),
        events: events,
        leadData: {
          location: lead?.data?.address,
          city: lead?.data?.city,
          preferences: lead?.data?.preferences,
          timezone: lead?.data?.timezone || 'Europe/Brussels'
        },
        aiOptimization: {
          considerTravel: true,
          optimizeForLead: true,
          preferredTimes: ['09:00', '14:00', '16:00'], // Meilleurs créneaux commerciaux
          minDuration: 60, // 1h minimum pour RDV commercial
          bufferTime: 15   // 15min buffer entre RDV
        }
      });
      
      if (response.freeSlots) {
        console.log('[useGoogleCalendar] ✅ Créneaux libres calculés:', response.freeSlots.length);
        
        setCalendarState(prev => ({
          ...prev,
          freeSlots: response.freeSlots
        }));
        
      }
      
    } catch (error: unknown) {
      console.warn('[useGoogleCalendar] ⚠️ Erreur calcul créneaux:', error);
      // Fallback : créneaux simples sans IA
      const simpleFreeSlots = generateSimpleFreeSlots(date, events);
      setCalendarState(prev => ({
        ...prev,
        freeSlots: simpleFreeSlots
      }));
    }
  }, [api, lead]);
  
  // 📅 Charger les événements Google Calendar
  const loadCalendarEvents = useCallback(async (date: dayjs.Dayjs): Promise<void> => {
    setCalendarState(prev => ({ ...prev, isLoading: true }));
    setError(undefined);
    
    try {
      console.log('[useGoogleCalendar] 📅 Chargement événements pour:', date.format('YYYY-MM-DD'));
      
      const response = await api.get<{ events: CalendarEvent[] }>('/api/google/calendar/events', {
        params: {
          date: date.format('YYYY-MM-DD'),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });
      
      if (response.events) {
        console.log('[useGoogleCalendar] ✅ Événements chargés:', response.events.length);
        
        setCalendarState(prev => ({
          ...prev,
          events: response.events,
          selectedDate: date
        }));
        
        // 🎯 Calculer automatiquement les créneaux libres
        await calculateFreeSlots(date, response.events);
        
      } else {
        throw new Error('Erreur lors du chargement des événements');
      }
      
    } catch (error: unknown) {
      console.error('[useGoogleCalendar] ❌ Erreur chargement événements:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement du calendrier';
      setError(errorMessage);
      NotificationManager.error('Impossible de charger le calendrier Google');
      
    } finally {
      setCalendarState(prev => ({ ...prev, isLoading: false }));
    }
  }, [api, calculateFreeSlots]);
  
  // 📅 Sélectionner une date
  const selectDate = useCallback(async (date: dayjs.Dayjs): Promise<void> => {
    if (date.isSame(calendarState.selectedDate, 'day')) return;
    
    await loadCalendarEvents(date);
  }, [calendarState.selectedDate, loadCalendarEvents]);
  
  // 🎯 Sélectionner un créneau libre
  const selectSlot = useCallback((slot: FreeSlot): void => {
    console.log('[useGoogleCalendar] 🎯 Créneau sélectionné:', slot);
    
    setCalendarState(prev => ({
      ...prev,
      selectedSlot: slot
    }));
    
    NotificationManager.info(`Créneau sélectionné: ${dayjs(slot.start).format('DD/MM à HH:mm')}`);
  }, []);
  
  // ⚡ Créer un RDV directement pendant l'appel
  const createMeeting = useCallback(async (
    slot: FreeSlot,
    meetingDetails: {
      title?: string;
      description?: string;
      duration?: number;
    } = {}
  ): Promise<CreateEventResponse> => {
    if (!lead?.data) {
      throw new Error('Informations lead manquantes');
    }
    
    setCalendarState(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log('[useGoogleCalendar] ⚡ Création RDV...');
      
      const eventData: CreateEventRequest = {
        title: meetingDetails.title || `RDV Commercial - ${lead.data.name}`,
        description: meetingDetails.description || 
          `Rendez-vous commercial avec ${lead.data.name} (${lead.data.company || 'Entreprise'}).\n\n` +
          `Téléphone: ${lead.data.phone}\n` +
          `Email: ${lead.data.email}\n` +
          `Source: ${lead.source}\n\n` +
          `RDV programmé via Zhiive pendant appel téléphonique.`,
        start: slot.start,
        end: meetingDetails.duration 
          ? dayjs(slot.start).add(meetingDetails.duration, 'minute').toDate()
          : slot.end,
        attendees: [
          {
            email: lead.data.email,
            name: lead.data.name
          }
        ],
        location: lead.data.address ? 
          `${lead.data.address}, ${lead.data.city || ''}`.trim() :
          'À confirmer',
        metadata: {
          leadId: leadId,
          source: 'crm_call',
          priority: 'high'
        }
      };
      
      const response = await api.post<CreateEventResponse>('/api/google/calendar/create-event', eventData);
      
      if (response.success && response.eventId) {
        console.log('[useGoogleCalendar] ✅ RDV créé - ID:', response.eventId);
        
        // 🔄 Recharger les événements pour afficher le nouveau RDV
        await loadCalendarEvents(calendarState.selectedDate);
        
        // 📧 Envoyer email de confirmation automatique
        if (response.emailSent) {
          console.log('[useGoogleCalendar] ✅ Email confirmation envoyé');
          NotificationManager.success('✅ RDV programmé ! Email de confirmation envoyé');
        } else {
          NotificationManager.success('✅ RDV programmé dans Google Calendar');
        }
        
        // 🎯 Reset sélection
        setCalendarState(prev => ({
          ...prev,
          selectedSlot: null
        }));
        
        return response;
        
      } else {
        throw new Error(response.error || 'Erreur lors de la création du RDV');
      }
      
    } catch (error: unknown) {
      console.error('[useGoogleCalendar] ❌ Erreur création RDV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du RDV';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
      throw error;
      
    } finally {
      setCalendarState(prev => ({ ...prev, isLoading: false }));
    }
  }, [lead, leadId, api, calendarState.selectedDate, loadCalendarEvents]);
  
  // 👁️ Afficher/masquer le calendrier
  const toggleCalendar = useCallback((): void => {
    const newVisibility = !calendarState.isVisible;
    
    setCalendarState(prev => ({
      ...prev,
      isVisible: newVisibility
    }));
    
    // 📅 Charger les événements d'aujourd'hui si première ouverture
    if (newVisibility && calendarState.events.length === 0) {
      loadCalendarEvents(dayjs());
    }
    
    console.log('[useGoogleCalendar] 👁️ Calendrier', newVisibility ? 'affiché' : 'masqué');
  }, [calendarState.isVisible, calendarState.events.length, loadCalendarEvents]);
  
  // 🎯 Suggestions IA créneaux optimaux
  const getAISuggestions = useCallback((): FreeSlot[] => {
    return calendarState.freeSlots
      .filter(slot => slot.aiScore && slot.aiScore > 0.7) // Score IA > 70%
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
      .slice(0, 3); // Top 3 suggestions
  }, [calendarState.freeSlots]);
  
  // 📊 Statistiques agenda
  const calendarStats = useMemo(() => {
    const today = dayjs();
    const todayEvents = calendarState.events.filter(event => 
      dayjs(event.start).isSame(today, 'day')
    );
    
    return {
      todayEvents: todayEvents.length,
      todayFreeSlots: calendarState.freeSlots.length,
      nextAvailableSlot: calendarState.freeSlots[0] || null,
      busyPercentage: todayEvents.length > 0 
        ? Math.round((todayEvents.length / (todayEvents.length + calendarState.freeSlots.length)) * 100)
        : 0
    };
  }, [calendarState.events, calendarState.freeSlots]);
  
  // 🎯 Auto-chargement initial
  useEffect(() => {
    if (calendarState.isVisible && calendarState.events.length === 0) {
      loadCalendarEvents(dayjs());
    }
  }, [calendarState.isVisible, calendarState.events.length, loadCalendarEvents]);
  
  // 🎯 Retour du hook avec toutes les fonctionnalités
  const returnValue: UseGoogleCalendarReturn = useMemo(() => ({
    calendarState,
    loadCalendarEvents,
    selectDate,
    selectSlot,
    createMeeting,
    toggleCalendar,
    getAISuggestions,
    calendarStats,
    isLoading: calendarState.isLoading,
    error
  }), [
    calendarState,
    loadCalendarEvents,
    selectDate,
    selectSlot,
    createMeeting,
    toggleCalendar,
    getAISuggestions,
    calendarStats,
    error
  ]);
  
  return returnValue;
};

// 🛠️ FONCTIONS UTILITAIRES

/**
 * Génère des créneaux libres simples (fallback sans IA)
 */
function generateSimpleFreeSlots(date: dayjs.Dayjs, events: CalendarEvent[]): FreeSlot[] {
  const slots: FreeSlot[] = [];
  
  // Créneaux de 1h toutes les heures (9h-18h)
  for (let hour = 9; hour < 18; hour++) {
    const slotStart = date.hour(hour).minute(0).second(0);
    const slotEnd = slotStart.add(1, 'hour');
    
    // Vérifier si le créneau est libre
    const isConflict = events.some(event => {
      const eventStart = dayjs(event.start);
      const eventEnd = dayjs(event.end);
      return slotStart.isBefore(eventEnd) && slotEnd.isAfter(eventStart);
    });
    
    if (!isConflict) {
      slots.push({
        start: slotStart.toDate(),
        end: slotEnd.toDate(),
        duration: 60,
        aiScore: 0.5, // Score neutre
        reason: 'Créneau libre standard'
      });
    }
  }
  
  return slots;
}

export default useGoogleCalendar;

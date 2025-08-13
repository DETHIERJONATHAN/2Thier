import { useCallback, useState } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

export interface TimeSlot {
  start: string;
  end: string;
  duration: number;
  aiRecommendation?: {
    score: number;
    reason: string;
  };
  aiScore?: number;
  aiReason?: string;
}

interface UseGoogleCalendarOptions {
  defaultDuration?: number;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const useGoogleCalendar = (options: UseGoogleCalendarOptions = {}) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const fetchAvailableSlots = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      // Récupérer les créneaux disponibles
      const slots = await api.get(`/api/calendar/slots/${formatDate(date)}`);
      
      // Enrichir avec les recommandations IA si disponibles
      const slotsWithAI = slots.map((slot: TimeSlot) => ({
        ...slot,
        aiScore: slot.aiRecommendation?.score || 0,
        aiReason: slot.aiRecommendation?.reason || null
      }));
      
      // Trier par score IA décroissant
      const sortedSlots = slotsWithAI.sort((a: TimeSlot, b: TimeSlot) => b.aiScore - a.aiScore);
      
      setAvailableSlots(sortedSlots);
    } catch (error) {
      console.error('[useGoogleCalendar] Erreur lors de la récupération des créneaux:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createMeeting = useCallback(async (slot: TimeSlot, details: {
    title: string;
    description: string;
    duration?: number;
  }) => {
    try {
      const response = await api.post('/api/calendar/meetings', {
        start: slot.start,
        end: slot.end,
        title: details.title,
        description: details.description,
        duration: details.duration || options.defaultDuration || 60
      });

      return response;
    } catch (error) {
      console.error('[useGoogleCalendar] Erreur lors de la création du RDV:', error);
      throw error;
    }
  }, [api, options.defaultDuration]);

  return {
    loading,
    availableSlots,
    fetchAvailableSlots,
    createMeeting
  };
};

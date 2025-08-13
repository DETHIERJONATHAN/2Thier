import { useCallback, useState } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import type { TimeSlot } from './useGoogleCalendar';

export interface AIRecommendation {
  datetime: string;
  duration: number;
  confidence: number;
  priority: number;
  reasoning: string;
}

export const useAIRecommendations = (lead: any, selectedDate: any) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);

  // Récupérer les recommandations IA
  const fetchRecommendations = useCallback(async () => {
    if (!lead?.id) return [];

    setLoading(true);
    try {
      const response = await api.post('/api/ai/recommendations', {
        leadId: lead.id,
        date: selectedDate.format('YYYY-MM-DD'),
        context: {
          leadData: lead.data,
          preferences: lead.preferences,
          history: lead.history
        }
      });

      setAiRecommendations(response.recommendations || []);
      return response.recommendations;
    } catch (error) {
      console.error('[useAIRecommendations] Erreur lors de la récupération des recommandations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [api, lead, selectedDate]);

  return {
    loading,
    aiRecommendations,
    fetchRecommendations
  };
};

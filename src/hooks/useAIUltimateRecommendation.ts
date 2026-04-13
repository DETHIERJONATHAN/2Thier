import { useState, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import type { Lead } from '../components/CallModule/types/CallTypes';
import { logger } from '../lib/logger';

interface Appointment {
  id: string;
  date: Date;
  duration: number;
  location?: string;
  status: string;
}

interface CallTranscription {
  id: string;
  date: Date;
  content: string;
  sentiment: string;
  keyPoints: string[];
}

interface Note {
  id: string;
  date: Date;
  content: string;
  type: string;
  author: string;
}

interface UltimateRecommendation {
  proposedDate: Date;
  reasoning: string;
  confidence: number;
  factors: {
    callHistory: string;
    notes: string;
    geographicalOptimization: string;
    behavioralPattern: string;
    sectoralInsight: string;
    commercialExperience: string;
  };
  alternatives?: Array<{
    date: Date;
    reason: string;
  }>;
}

interface UltimateRecommendationResponse {
  recommendation: UltimateRecommendation | null;
  loading: boolean;
  error: string | null;
}

export const useAIUltimateRecommendation = (): {
  generateUltimateRecommendation: (
    lead: Lead,
    existingAppointments: Appointment[],
    callTranscriptions: CallTranscription[],
    notes: Note[]
  ) => Promise<void>;
} & UltimateRecommendationResponse => {
  const [recommendation, setRecommendation] = useState<UltimateRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { api } = useAuthenticatedApi();

  const generateUltimateRecommendation = useCallback(async (
    lead: Lead,
    existingAppointments: Appointment[] = [],
    callTranscriptions: CallTranscription[] = [],
    notes: Note[] = []
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      logger.debug('🧠 [UltimateRecommendation] Génération analyse ultime pour:', lead.name);
      logger.debug('📊 [UltimateRecommendation] RDV existants:', existingAppointments.length);
      logger.debug('📞 [UltimateRecommendation] Transcriptions:', callTranscriptions.length);
      logger.debug('📝 [UltimateRecommendation] Notes:', notes.length);

      const response = await api.post('/api/ai/ultimate-recommendation', {
        lead,
        context: {
          existingAppointments,
          callTranscriptions,
          notes,
          currentDate: new Date().toISOString(),
          commercialProfile: {
            experience: 'senior', // Pourrait venir du profil utilisateur
            sector: lead.sector || 'general',
            successRate: 0.75 // Pourrait être calculé
          }
        }
      });

      if (response.success && response.data) {
        setRecommendation(response.data.recommendation);
        logger.debug('✅ [UltimateRecommendation] Analyse reçue:', response.data.recommendation.reasoning);
      } else {
        throw new Error('Réponse API invalide');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      logger.error('❌ [UltimateRecommendation] Erreur:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [api]);

  return {
    recommendation,
    loading,
    error,
    generateUltimateRecommendation
  };
};

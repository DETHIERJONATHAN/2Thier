/**
 * 🤖 useAIRecommendations - Hook pour les recommandations IA de créneaux
 * 
 * Fonctionnalités :
 * - 🧠 Analyse du profil prospect via API IA
 * - 📊 Statistiques de conversion par créneaux
 * - 📍 Optimisation géographique des déplacements
 * - ⏰ Historique des préférences sectorielles
 * - 🎯 Score de confiance basé sur les données réelles
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import type { Lead, AIScheduleRecommendation } from '../types/CallTypes';
import dayjs, { Dayjs } from 'dayjs';

interface UseAIRecommendationsReturn {
  aiRecommendations: AIScheduleRecommendation[];
  isLoadingRecommendations: boolean;
  error?: string;
  refreshRecommendations: () => Promise<void>;
  getRecommendationInsight: (leadId: string, timeSlot: Date) => Promise<string>;
}

// 🎯 Paramètres d'analyse IA
interface AIAnalysisParams {
  leadProfile: {
    industry?: string;
    companySize?: string;
    jobTitle?: string;
    seniority?: string;
    location?: string;
  };
  historicalData: {
    previousInteractions?: number;
    preferredTimeSlots?: string[];
    conversionRates?: Record<string, number>;
  };
  contextualFactors: {
    seasonality?: string;
    dayOfWeek?: string;
    currentQuarter?: string;
  };
}

export const useAIRecommendations = (
  lead: Lead,
  selectedDate: Dayjs
): UseAIRecommendationsReturn => {
  
  const { api } = useAuthenticatedApi();
  
  // 🎯 États du hook
  const [aiRecommendations, setAIRecommendations] = useState<AIScheduleRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [error, setError] = useState<string>();

  // 🔄 Générer des recommandations de fallback (sans IA)
  const generateFallbackRecommendations = useCallback((): void => {
    const fallbackSlots: AIScheduleRecommendation[] = [
      {
        id: 'fallback_morning',
        timeSlot: {
          start: selectedDate.hour(10).minute(0).toDate(),
          end: selectedDate.hour(11).minute(0).toDate()
        },
        confidence: 0.65,
        reason: 'Créneau matinal standard (fallback)',
        priority: 'medium',
        aiInsight: 'Recommandation basique - API IA indisponible'
      },
      {
        id: 'fallback_afternoon',
        timeSlot: {
          start: selectedDate.hour(14).minute(0).toDate(),
          end: selectedDate.hour(15).minute(0).toDate()
        },
        confidence: 0.60,
        reason: 'Après-midi standard (fallback)',
        priority: 'low',
        aiInsight: 'Recommandation basique - API IA indisponible'
      }
    ];
    
    setAIRecommendations(fallbackSlots);
  }, [selectedDate]);

  // 🧠 Générer les paramètres d'analyse IA
  const generateAnalysisParams = useCallback((leadData: Lead): AIAnalysisParams => {
    return {
      leadProfile: {
        industry: leadData.data?.sector || 'unknown',
        companySize: leadData.data?.companySize || 'unknown',
        jobTitle: `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim(),
        seniority: leadData.data?.decisionMaker ? 'executive' : 'standard',
        location: leadData.data?.location || 'unknown'
      },
      historicalData: {
        previousInteractions: leadData.data?.callHistory?.length || 0,
        preferredTimeSlots: [], // Sera calculé via API
        conversionRates: {} // Sera récupéré via API
      },
      contextualFactors: {
        seasonality: selectedDate.format('Q') === '1' ? 'Q1' : 
                    selectedDate.format('Q') === '2' ? 'Q2' :
                    selectedDate.format('Q') === '3' ? 'Q3' : 'Q4',
        dayOfWeek: selectedDate.format('dddd'),
        currentQuarter: `Q${selectedDate.format('Q')}`
      }
    };
  }, [selectedDate]);

  // 🚀 Charger les recommandations IA via API
  const fetchAIRecommendations = useCallback(async (): Promise<void> => {
    if (!lead || (!lead.data && !lead.name)) {
      setAIRecommendations([]);
      return;
    }

    setIsLoadingRecommendations(true);
    setError(undefined);

    try {
      const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.company || 'Lead inconnu';
      console.log('[useAIRecommendations] 🤖 Génération recommandations IA pour:', leadName);

      // 📊 Préparation des données d'analyse
      const analysisParams = generateAnalysisParams(lead);
      
      // 🎯 Appel API pour les recommandations IA
      const response = await api.post<{
        success: boolean;
        data: {
          recommendations: AIScheduleRecommendation[];
          metadata: {
            analysisTime: number;
            confidence: number;
            factorsConsidered: string[];
          };
        };
      }>('/api/ai/schedule-recommendations', {
        leadId: lead.id,
        targetDate: selectedDate.format('YYYY-MM-DD'),
        analysisParams,
        preferences: {
          minDuration: 30,
          maxDuration: 120,
          preferredTimeRange: ['09:00', '17:00'],
          includeGeographicOptimization: true,
          includeSectoralAnalysis: true
        }
      });

      if (response.success && response.data?.recommendations) {
        console.log('[useAIRecommendations] ✅ Recommandations IA reçues:', response.data.recommendations.length);
        
        // 🎯 Tri par priorité et confiance
        const sortedRecommendations = response.data.recommendations
          .sort((a, b) => {
            // D'abord par priorité (high > medium > low)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            
            if (priorityDiff !== 0) return priorityDiff;
            
            // Puis par confiance
            return b.confidence - a.confidence;
          })
          .slice(0, 5); // Maximum 5 recommandations
        
        setAIRecommendations(sortedRecommendations);
        
        // 📊 Log des métadonnées d'analyse
        if (response.data?.metadata) {
          console.log('[useAIRecommendations] 📊 Métadonnées IA:', {
            tempsAnalyse: `${response.data.metadata.analysisTime}ms`,
            confianceGlobale: `${Math.round(response.data.metadata.confidence * 100)}%`,
            facteursConsidérés: response.data.metadata.factorsConsidered
          });
        }
        
      } else {
        console.warn('[useAIRecommendations] ⚠️ Pas de recommandations retournées');
        setAIRecommendations([]);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[useAIRecommendations] ❌ Erreur génération:', errorMessage);
      
      setError(`Erreur génération recommandations IA: ${errorMessage}`);
      setAIRecommendations([]);
      
      // 🔄 Fallback : recommandations basiques sans IA
      console.log('[useAIRecommendations] 🔄 Génération recommandations fallback...');
      generateFallbackRecommendations();
      
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [lead, selectedDate, api, generateAnalysisParams, generateFallbackRecommendations]);

  //  Obtenir une analyse détaillée d'un créneau spécifique
  const getRecommendationInsight = useCallback(async (
    leadId: string, 
    timeSlot: Date
  ): Promise<string> => {
    try {
      const response = await api.post<{
        success: boolean;
        insight: string;
        factors: string[];
      }>('/api/ai/slot-insight', {
        leadId,
        timeSlot: dayjs(timeSlot).format(),
        analysisDepth: 'detailed'
      });

      if (response.success && response.insight) {
        return response.insight;
      }
      
      return 'Analyse détaillée indisponible';
      
    } catch (error) {
      console.error('[useAIRecommendations] ❌ Erreur insight:', error);
      return 'Erreur lors de l\'analyse du créneau';
    }
  }, [api]);

  // 🔄 Fonction de refresh public
  const refreshRecommendations = useCallback(async (): Promise<void> => {
    await fetchAIRecommendations();
  }, [fetchAIRecommendations]);

  // 🎯 Charger les recommandations au changement de lead ou date
  useEffect(() => {
    if (lead.data && selectedDate) {
      fetchAIRecommendations();
    }
  }, [lead.data, selectedDate, fetchAIRecommendations]);

  // 📊 Statistiques des recommandations
  const recommendationStats = useMemo(() => {
    const highPriority = aiRecommendations.filter(r => r.priority === 'high').length;
    const avgConfidence = aiRecommendations.length > 0 ? 
      aiRecommendations.reduce((acc, r) => acc + r.confidence, 0) / aiRecommendations.length : 0;
    
    return {
      total: aiRecommendations.length,
      highPriority,
      avgConfidence: Math.round(avgConfidence * 100)
    };
  }, [aiRecommendations]);

  // 🎯 Log des stats pour debug
  useEffect(() => {
    if (aiRecommendations.length > 0) {
      console.log('[useAIRecommendations] 📊 Stats recommandations:', recommendationStats);
    }
  }, [recommendationStats, aiRecommendations.length]);

  return {
    aiRecommendations,
    isLoadingRecommendations,
    error,
    refreshRecommendations,
    getRecommendationInsight
  };
};

export default useAIRecommendations;

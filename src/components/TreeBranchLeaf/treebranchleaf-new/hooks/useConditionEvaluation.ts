/**
 * 🚀 useConditionEvaluation (Legacy Hook)
 * 
 * Ce hook est une version legacy. Pour les nouveaux développements,
 * utiliser le hook optimisé dans /TBL/hooks/useConditionEvaluation.ts
 * qui utilise le batch context.
 * 
 * ATTENTION: Ce fichier reste pour rétrocompatibilité.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface ConditionEvaluationResult {
  success: boolean;
  result: boolean | null;
  loading: boolean;
  error: string | null;
  details?: {
    message: string;
    conditionMet: string;
  };
}

// 🚀 OPTIMISATION: Cache local pour éviter les appels API répétés
const conditionCache = new Map<string, { result: ConditionEvaluationResult; timestamp: number }>();
const CACHE_TTL_MS = 30_000; // 30 secondes

export const useConditionEvaluation = (conditionId: string | null): ConditionEvaluationResult => {
  const [evaluation, setEvaluation] = useState<ConditionEvaluationResult>({
    success: false,
    result: null,
    loading: false,
    error: null
  });
  
  const { api } = useAuthenticatedApi();

  useEffect(() => {
    if (!conditionId) {
      setEvaluation({
        success: false,
        result: null,
        loading: false,
        error: null
      });
      return;
    }

    // 🚀 OPTIMISATION: Vérifier le cache d'abord
    const cached = conditionCache.get(conditionId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`🚀 [useConditionEvaluation Legacy] Cache hit pour ${conditionId}`);
      setEvaluation(cached.result);
      return;
    }

    const evaluateCondition = async () => {
      setEvaluation(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        console.log(`⚠️ [useConditionEvaluation Legacy] Évaluation condition (API): ${conditionId}`);
        
        const response = await api.post(`/api/tbl/evaluate/condition/${conditionId}`, {
          submissionId: 'df833cac-0b44-4b2b-bb1c-de3878f00182',
          organizationId: 'test-org',
          userId: 'test-user',
          testMode: true
        });
        
        if (response.evaluation) {
          const result: ConditionEvaluationResult = {
            success: response.evaluation.success,
            result: response.evaluation.result,
            loading: false,
            error: null,
            details: response.evaluation.details
          };
          
          // 🚀 Mettre en cache
          conditionCache.set(conditionId, { result, timestamp: Date.now() });
          
          setEvaluation(result);
        } else {
          setEvaluation({
            success: false,
            result: null,
            loading: false,
            error: 'Réponse invalide'
          });
        }
      } catch (error: unknown) {
        console.error(`❌ [useConditionEvaluation Legacy] Erreur:`, error);
        setEvaluation({
          success: false,
          result: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Erreur d\'évaluation'
        });
      }
    };

    evaluateCondition();
  }, [conditionId, api]);

  return evaluation;
};

export default useConditionEvaluation;

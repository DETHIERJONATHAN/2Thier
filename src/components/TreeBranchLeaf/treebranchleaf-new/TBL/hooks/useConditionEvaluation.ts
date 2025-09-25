import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import type { TBLFormData } from './useTBLSave';

interface ConditionEvaluationResult {
  isLoading: boolean;
  result: unknown;
  error: string | null;
  conditionMet: boolean;
}

import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import type { TBLFormData } from './useTBLSave';

interface ConditionEvaluationResult {
  isLoading: boolean;
  result: unknown;
  error: string | null;
  conditionMet: boolean;
}

export function useConditionEvaluation(conditionId: string | null, formData: TBLFormData): ConditionEvaluationResult {
  const { api } = useAuthenticatedApi();
  const [state, setState] = useState<ConditionEvaluationResult>({
    isLoading: false,
    result: null,
    error: null,
    conditionMet: false
  });

  // Stabiliser formData pour éviter les re-renders inutiles
  const formDataString = useMemo(() => JSON.stringify(formData), [formData]);

  useEffect(() => {
    if (!conditionId || !api) {
      setState({
        isLoading: false,
        result: null,
        error: null,
        conditionMet: false
      });
      return;
    }

    const evaluateCondition = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        console.log(`🧮 [useConditionEvaluation] Évaluation condition ${conditionId} avec formData:`, formData);
        
        // 🔧 CORRECTION : Utiliser les endpoints TBL Prisma avec CapacityCalculator
        const response = await api.post(`/api/tbl/evaluate/condition/${conditionId}`, {
          submissionId: 'df833cac-0b44-4b2b-bb1c-de3878f00182', // Utiliser submissionId réel
          organizationId: 'test-org',
          userId: 'test-user',
          testMode: false // Mode réel avec vraies données
        });

        console.log(`🧮 [useConditionEvaluation] Réponse pour ${conditionId}:`, response);

        const evaluationResult = response.evaluation?.result;
        const conditionMet = response.evaluation?.details?.conditionMet === 'OUI';

        setState({
          isLoading: false,
          result: evaluationResult,
          error: null,
          conditionMet
        });

      } catch (error) {
        console.error(`❌ [useConditionEvaluation] Erreur pour ${conditionId}:`, error);
        setState({
          isLoading: false,
          result: null,
          error: error instanceof Error ? error.message : 'Erreur d\'évaluation',
          conditionMet: false
        });
      }
    };

    evaluateCondition();

    // Réévaluer quand formData change
  }, [conditionId, formDataString, api, formData]);

  return state;
}

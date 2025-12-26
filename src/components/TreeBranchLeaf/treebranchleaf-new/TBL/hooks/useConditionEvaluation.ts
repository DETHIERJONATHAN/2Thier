/**
 * 🚀 useConditionEvaluation - Hook optimisé pour évaluer les conditions TBL
 * 
 * VERSION BATCH : Utilise le TBLBatchContext pour récupérer les conditions
 * déjà chargées, évitant ainsi les appels API redondants.
 * 
 * AVANT : 1 appel API par condition (N conditions = N appels)
 * APRÈS : 0 appels API supplémentaires (données déjà dans le batch)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { useTBLBatch } from '../contexts/TBLBatchContext';
import type { TBLFormData } from './useTBLSave';

interface ConditionEvaluationResult {
  isLoading: boolean;
  result: unknown;
  error: string | null;
  conditionMet: boolean;
}

/**
 * Évalue une condition en local en utilisant les données du batch
 * Cela évite un appel API par condition
 */
function evaluateConditionLocally(
  condition: {
    id: string;
    conditionType: string;
    fieldNodeId: string | null;
    operator: string | null;
    value: string | null;
    isActive: boolean;
  } | null,
  formData: TBLFormData
): { conditionMet: boolean; result: unknown } {
  if (!condition || !condition.isActive) {
    return { conditionMet: false, result: null };
  }

  // Si pas de champ source, condition toujours vraie
  if (!condition.fieldNodeId) {
    return { conditionMet: true, result: 'no-field' };
  }

  // Récupérer la valeur du champ dans formData
  const fieldValue = formData[condition.fieldNodeId];
  const compareValue = condition.value;
  const operator = condition.operator || '==';

  // Évaluation selon l'opérateur
  let conditionMet = false;
  
  switch (operator) {
    case '==':
    case '===':
    case 'equals':
      conditionMet = String(fieldValue) === String(compareValue);
      break;
    case '!=':
    case '!==':
    case 'not_equals':
      conditionMet = String(fieldValue) !== String(compareValue);
      break;
    case '>':
    case 'greater_than':
      conditionMet = Number(fieldValue) > Number(compareValue);
      break;
    case '>=':
    case 'greater_or_equal':
      conditionMet = Number(fieldValue) >= Number(compareValue);
      break;
    case '<':
    case 'less_than':
      conditionMet = Number(fieldValue) < Number(compareValue);
      break;
    case '<=':
    case 'less_or_equal':
      conditionMet = Number(fieldValue) <= Number(compareValue);
      break;
    case 'contains':
      conditionMet = String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
      break;
    case 'not_contains':
      conditionMet = !String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
      break;
    case 'is_empty':
      conditionMet = fieldValue === null || fieldValue === undefined || fieldValue === '';
      break;
    case 'is_not_empty':
      conditionMet = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      break;
    case 'starts_with':
      conditionMet = String(fieldValue || '').toLowerCase().startsWith(String(compareValue || '').toLowerCase());
      break;
    case 'ends_with':
      conditionMet = String(fieldValue || '').toLowerCase().endsWith(String(compareValue || '').toLowerCase());
      break;
    default:
      // Par défaut, faire une comparaison d'égalité
      conditionMet = String(fieldValue) === String(compareValue);
  }

  return { 
    conditionMet, 
    result: { 
      fieldValue, 
      compareValue, 
      operator, 
      evaluated: conditionMet 
    } 
  };
}

export function useConditionEvaluation(conditionId: string | null, formData: TBLFormData): ConditionEvaluationResult {
  const { api } = useAuthenticatedApi();
  const batchContext = useTBLBatch();
  
  const [state, setState] = useState<ConditionEvaluationResult>({
    isLoading: false,
    result: null,
    error: null,
    conditionMet: false
  });

  // Stabiliser formData pour éviter les re-renders inutiles
  const formDataString = useMemo(() => JSON.stringify(formData), [formData]);

  useEffect(() => {
    if (!conditionId) {
      setState({
        isLoading: false,
        result: null,
        error: null,
        conditionMet: false
      });
      return;
    }

    // 🚀 BATCH APPROACH: Essayer d'abord d'évaluer localement avec les données batch
    if (batchContext.isReady) {
      const condition = batchContext.getConditionById(conditionId);
      
      if (condition) {
        console.log(`🚀 [useConditionEvaluation] Évaluation LOCALE condition ${conditionId} (batch)`);
        
        const { conditionMet, result } = evaluateConditionLocally(condition, formData);
        
        setState({
          isLoading: false,
          result,
          error: null,
          conditionMet
        });
        return;
      }
    }

    // 🔄 FALLBACK: Si pas dans le batch, faire l'appel API (rare)
    const evaluateCondition = async () => {
      if (!api) return;
      
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        console.log(`⚠️ [useConditionEvaluation] Fallback API pour condition ${conditionId}`);
        
        const response = await api.post(`/api/tbl/evaluate/condition/${conditionId}`, {
          submissionId: 'df833cac-0b44-4b2b-bb1c-de3878f00182',
          organizationId: 'test-org',
          userId: 'test-user',
          testMode: false
        });

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
  }, [conditionId, formDataString, api, formData, batchContext.isReady, batchContext.getConditionById]);

  return state;
}


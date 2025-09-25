import { useState, useEffect } from 'react';
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

    const evaluateCondition = async () => {
      setEvaluation(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        console.log(`🧮 [useConditionEvaluation] Évaluation condition: ${conditionId}`);
        
        // 🔧 CORRECTION : Utiliser les endpoints TBL Prisma avec CapacityCalculator
        const response = await api.post(`/api/tbl/evaluate/condition/${conditionId}`, {
          submissionId: 'df833cac-0b44-4b2b-bb1c-de3878f00182', // Utiliser submissionId réel
          organizationId: 'test-org',
          userId: 'test-user',
          testMode: true
        });
        
        console.log(`🧮 [useConditionEvaluation] Résultat:`, response);
        
        if (response.evaluation) {
          setEvaluation({
            success: response.evaluation.success,
            result: response.evaluation.result,
            loading: false,
            error: null,
            details: response.evaluation.details
          });
        } else {
          setEvaluation({
            success: false,
            result: null,
            loading: false,
            error: 'Réponse invalide'
          });
        }
      } catch (error: unknown) {
        console.error(`❌ [useConditionEvaluation] Erreur:`, error);
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

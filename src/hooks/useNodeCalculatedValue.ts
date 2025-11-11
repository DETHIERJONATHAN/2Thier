/**
 * 🎯 Hook pour récupérer les valeurs calculées depuis Prisma
 * 
 * Le backend a DÉJÀ calculé et stocké la valeur dans TreeBranchLeafNode.calculatedValue
 * Ce hook va juste la chercher et la retourner
 * 
 * NO RECALCULATION - Just fetch and display
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

interface CalculatedValueResult {
  value: string | number | boolean | null;
  loading: boolean;
  error: string | null;
  calculatedAt?: string;
  calculatedBy?: string; // "formula-abc", "table-def", etc.
}

/**
 * Récupère une valeur calculée depuis Prisma (TreeBranchLeafNode.calculatedValue)
 * 
 * @param nodeId - ID du nœud TreeBranchLeaf
 * @param treeId - ID de l'arbre
 * @param submissionId - (Optionnel) ID de la soumission pour contextualiser
 * @returns { value, loading, error, calculatedAt, calculatedBy }
 */
export function useNodeCalculatedValue(
  nodeId: string,
  treeId: string,
  submissionId?: string
): CalculatedValueResult {
  const { api } = useAuthenticatedApi();
  const [value, setValue] = useState<string | number | boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<string>();
  const [calculatedBy, setCalculatedBy] = useState<string>();

  // Fonction pour récupérer la valeur
  const fetchCalculatedValue = useCallback(async () => {
    if (!nodeId || !treeId) {
      setError('nodeId et treeId requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 🎯 Endpoint: GET /api/tree-nodes/:nodeId/calculated-value
      // Retourne: { value, calculatedAt, calculatedBy }
      const response = await api.get(
        `/api/tree-nodes/${nodeId}/calculated-value`,
        {
          params: submissionId ? { submissionId } : undefined
        }
      );

      if (response && typeof response === 'object') {
        const data = response as Record<string, unknown>;
        
        // Extraire les données de la réponse
        let extractedValue = data.value ?? data.calculatedValue ?? null;
        
        // 🔥 Si c'est un objet, extraire la valeur intelligemment
        if (typeof extractedValue === 'object' && extractedValue !== null) {
          const obj = extractedValue as Record<string, unknown>;
          extractedValue = 
            obj.value ?? 
            obj.result ?? 
            obj.calculatedValue ?? 
            obj.text ?? 
            obj.humanText ?? 
            extractedValue;
        }

        setValue(extractedValue as string | number | boolean | null);
        setCalculatedAt(data.calculatedAt as string | undefined);
        setCalculatedBy(data.calculatedBy as string | undefined);

        console.log('✅ [useNodeCalculatedValue] Valeur récupérée:', {
          nodeId,
          treeId,
          value: extractedValue,
          calculatedAt: data.calculatedAt,
          calculatedBy: data.calculatedBy
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      console.error('❌ [useNodeCalculatedValue] Erreur récupération:', {
        nodeId,
        treeId,
        error: errMsg
      });
    } finally {
      setLoading(false);
    }
  }, [nodeId, treeId, submissionId, api]);

  // Récupérer la valeur quand nodeId/treeId change
  useEffect(() => {
    if (nodeId && treeId) {
      fetchCalculatedValue();
    }
  }, [nodeId, treeId, fetchCalculatedValue]);

  return {
    value,
    loading,
    error,
    calculatedAt,
    calculatedBy
  };
}

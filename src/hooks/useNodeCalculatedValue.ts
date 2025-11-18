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
  /** Permet de déclencher un refetch manuel (ex: après un save). */
  refresh: () => void;
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

      // Déclarer extractedValue au niveau supérieur pour pouvoir l'utiliser dans le fallback
      let extractedValue: string | number | boolean | null = null;
      
      if (response && typeof response === 'object') {
        const data = response as Record<string, unknown>;
        
        // Extraire les données de la réponse
        extractedValue = data.value ?? data.calculatedValue ?? null;
        
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

        console.log('✅ [useNodeCalculatedValue] Valeur récupérée:', {
          nodeId,
          treeId,
          value: extractedValue,
          calculatedAt: data.calculatedAt,
          calculatedBy: data.calculatedBy
        });

        // Si on a une valeur valide, l'utiliser directement
        if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
          setValue(extractedValue as string | number | boolean | null);
          setCalculatedAt(data.calculatedAt as string | undefined);
          setCalculatedBy(data.calculatedBy as string | undefined);
          return; // On a trouvé une valeur, pas besoin de fallback
        }
      }
      
      // 🔁 Client-side fallback: if no valid value returned, try nodeId without '-1' and copiedFromNodeId
      if ((extractedValue === null || extractedValue === undefined || extractedValue === '') && nodeId) {
        try {
          // Try without suffix (-1, -2, -3, etc.)
          if (typeof nodeId === 'string') {
            const suffixMatch = nodeId.match(/^(.+)-(\d+)$/);
            if (suffixMatch) {
              const [, plainId] = suffixMatch;
              console.log(`🔄 [useNodeCalculatedValue] Trying fallback: ${nodeId} -> ${plainId}`);
              const respPlain = await api.get(`/api/tree-nodes/${plainId}/calculated-value`);
              if (respPlain?.success && respPlain?.value !== undefined && respPlain?.value !== null) {
                console.log(`✅ [useNodeCalculatedValue] Fallback réussi pour ${nodeId}: ${respPlain.value}`);
                setValue(respPlain.value as string | number | boolean | null);
                setCalculatedAt(respPlain.calculatedAt as string | undefined);
                setCalculatedBy(`${respPlain.calculatedBy} (copy fallback)` as string | undefined);
                return;
              }
            }
          }

          // Try metadata.copiedFromNodeId
          try {
            const nodeInfo = await api.get(`/api/treebranchleaf/nodes/${nodeId}`);
            const copiedFrom = nodeInfo?.metadata?.copiedFromNodeId || nodeInfo?.metadata?.copied_from_node_id || nodeInfo?.metadata?.sourceTemplateId || undefined;
            if (copiedFrom) {
              let orig = copiedFrom;
              if (typeof orig === 'string' && orig.trim().startsWith('[')) {
                try { orig = JSON.parse(orig)[0]; } catch { /* ignore */ }
              }
              if (Array.isArray(orig) && orig.length > 0) orig = orig[0];
              if (typeof orig === 'string' && orig) {
                const resp2 = await api.get(`/api/tree-nodes/${String(orig)}/calculated-value`);
                if (resp2?.success && resp2?.value !== undefined && resp2?.value !== null) {
                  setValue(resp2.value as string | number | boolean | null);
                  setCalculatedAt(resp2.calculatedAt as string | undefined);
                  setCalculatedBy(resp2.calculatedBy as string | undefined);
                  return;
                }
              }
            }
          } catch { /* ignore */ }
        } catch (fallbackErr) {
          console.warn('[useNodeCalculatedValue] client fallback error', fallbackErr);
        }
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

  // 🔄 Rafraîchir automatiquement quand un événement global force la retransformation
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId?: string }>).detail;
      if (!detail?.nodeId || detail.nodeId === nodeId) {
        fetchCalculatedValue();
      }
    };
    window.addEventListener('tbl-force-retransform', handler);
    return () => window.removeEventListener('tbl-force-retransform', handler);
  }, [fetchCalculatedValue, nodeId]);

  const refresh = useCallback(() => {
    fetchCalculatedValue();
  }, [fetchCalculatedValue]);

  return {
    value,
    loading,
    error,
    calculatedAt,
    calculatedBy,
    refresh
  };
}

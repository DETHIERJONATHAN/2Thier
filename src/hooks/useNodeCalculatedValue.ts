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
import { tblLog, isTBLDebugEnabled } from '../utils/tblDebug';

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
 * ⚠️ IMPORTANT: Le submissionId est utilisé UNIQUEMENT pour lire les valeurs des champs sources
 * nécessaires au calcul, PAS pour enregistrer le résultat calculé lui-même.
 * 
 * Les calculated values (display fields) ne sont JAMAIS enregistrés dans la submission.
 * Ils calculent toujours en temps réel basés sur les valeurs actuelles des champs normaux.
 * 
 * @param nodeId - ID du nœud TreeBranchLeaf
 * @param treeId - ID de l'arbre
 * @param submissionId - (Optionnel) ID de la soumission pour lire les valeurs des champs sources
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
      // 
      // ⚠️ IMPORTANT: Le submissionId est envoyé UNIQUEMENT pour lire les valeurs
      // des champs sources nécessaires au calcul. Le résultat calculé lui-même
      // n'est JAMAIS enregistré dans la submission - il reste dynamique.
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
            extractedValue;
        }

        if (isTBLDebugEnabled()) {
          tblLog('✅ [useNodeCalculatedValue] Valeur récupérée:', {
            nodeId,
            treeId,
            value: extractedValue,
            calculatedAt: data.calculatedAt,
            calculatedBy: data.calculatedBy
          });
        }

        // Si on a une valeur valide, l'utiliser directement
        if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
          setValue(extractedValue as string | number | boolean | null);
          setCalculatedAt(data.calculatedAt as string | undefined);
          setCalculatedBy(data.calculatedBy as string | undefined);
          return; // On a trouvé une valeur, pas besoin de fallback
        }
      }
      
      // 🔥 DÉSACTIVÉ: Plus de fallback automatique sur l'original!
      // Les champs copié's doivent rester INDÉPENDANTS de leur template original
      // Chaque copie a sa propre valeur calculée stockée en base
      // Si la valeur est vide, elle le reste jusqu'à ce qu'elle soit calculée
      if ((extractedValue === null || extractedValue === undefined || extractedValue === '') && nodeId) {
        // Log supprimé - trop fréquent
        // Ne pas chercher l'original - on l'affiche vide intentionnellement!
        setValue(null);
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
      const detail = (event as CustomEvent<{ nodeId?: string; submissionId?: string; debugId?: string }>).detail;
      if (!detail?.nodeId || detail.nodeId === nodeId) {
        // Log supprimé - appelé très fréquemment
        fetchCalculatedValue();
      }
    };
    window.addEventListener('tbl-force-retransform', handler);
    return () => window.removeEventListener('tbl-force-retransform', handler);
  }, [fetchCalculatedValue, nodeId, submissionId]);

  // 🔔 Rafraîchir aussi quand un événement tbl-node-updated est dispatché avec notre nodeId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent<{ node?: { id?: string } }>).detail;
        if (!detail?.node?.id || detail.node.id === nodeId) {
          fetchCalculatedValue();
        }
      } catch (err) {
        // noop
      }
    };
    window.addEventListener('tbl-node-updated', handler);
    return () => window.removeEventListener('tbl-node-updated', handler);
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

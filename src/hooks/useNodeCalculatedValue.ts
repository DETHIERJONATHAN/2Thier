/**
 * 🎯 Hook pour récupérer les valeurs calculées depuis Prisma
 * 
 * Le backend a DÉJÀ calculé et stocké la valeur dans TreeBranchLeafNode.calculatedValue
 * Ce hook va juste la chercher et la retourner
 * 
 * NO RECALCULATION - Just fetch and display
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // 🎯 NOUVELLE PROTECTION: Compteur d'évaluations API en cours pour éviter les overwrites
  const [isProtected, setIsProtected] = useState(false);
  const pendingEvaluationsRef = useRef<number>(0);

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

        // 🎯 PROTECTION: Ne pas écraser une valeur existante par null/vide/[] si des évaluations sont en cours
        const isValueBeingCleared = (
          extractedValue === null || 
          extractedValue === undefined || 
          extractedValue === '' ||
          extractedValue === '∅' ||
          (Array.isArray(extractedValue) && extractedValue.length === 0) // 🔥 NOUVEAU: Bloquer les tableaux vides []
        );
        const hasCurrentValue = (
          value !== null && 
          value !== undefined && 
          value !== '' && 
          value !== '∅' &&
          !(Array.isArray(value) && value.length === 0)
        );
        
        if (isProtected && isValueBeingCleared && hasCurrentValue) {
          console.log(`🛡️ [GRD nodeId=${nodeId}] PROTECTION: ne pas écraser "${value}" avec "${extractedValue}" (${pendingEvaluationsRef.current} évaluations en cours)`);
          return; // Bloquer l'overwrite
        }

        // Si on a une valeur valide, l'utiliser directement
        if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
          console.log(`🔄 [useNodeCalculatedValue] Mise à jour valeur pour nodeId=${nodeId}:`, extractedValue);
          setValue(extractedValue as string | number | boolean | null);
          setCalculatedAt(data.calculatedAt as string | undefined);
          setCalculatedBy(data.calculatedBy as string | undefined);
          return; // On a trouvé une valeur, pas besoin de fallback
        } else {
          console.log(`❌ [useNodeCalculatedValue] Valeur vide/null pour nodeId=${nodeId}:`, extractedValue);
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

  // 🎯 NOUVELLE PROTECTION: Écouter l'événement de fin d'évaluation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleEvaluationComplete = () => {
      if (pendingEvaluationsRef.current > 0) {
        pendingEvaluationsRef.current--;
        console.log(`⬇️ [GRD nodeId=${nodeId}] Évaluation terminée (${pendingEvaluationsRef.current} restantes)`);
        
        // Désactiver la protection quand le compteur atteint 0
        if (pendingEvaluationsRef.current === 0) {
          setIsProtected(false);
        }
      }
    };
    
    window.addEventListener('tbl-evaluation-complete', handleEvaluationComplete);
    return () => window.removeEventListener('tbl-evaluation-complete', handleEvaluationComplete);
  }, [nodeId]);

  // 🔄 Rafraîchir automatiquement quand un événement global force la retransformation
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId?: string; submissionId?: string; debugId?: string }>).detail;
      if (!detail?.nodeId || detail.nodeId === nodeId) {
        // 🎯 PROTECTION: Incrémenter le compteur quand un refresh est demandé
        pendingEvaluationsRef.current++;
        setIsProtected(true);
        console.log(`⬆️ [GRD nodeId=${nodeId}] Rafraîchissement demandé (${pendingEvaluationsRef.current} en cours)`);
        
        // 🔥 DEBOUNCE: Attendre 500ms avant de rafraîchir pour éviter les clignotements
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          fetchCalculatedValue();
        }, 500);
      }
    };
    
    window.addEventListener('tbl-force-retransform', handler);
    return () => {
      window.removeEventListener('tbl-force-retransform', handler);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [fetchCalculatedValue, nodeId, submissionId]);

  // � NOUVEAU: Rafraîchir automatiquement quand les données du formulaire changent
  // Pour les display fields comme GRD qui dépendent de lead.postalCode, etc.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const handler = () => {
      // 🔥 DEBOUNCE: Attendre 800ms après le dernier changement pour éviter les appels multiples
      // Silencieux - pas de console.log pour ne pas polluer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        fetchCalculatedValue();
      }, 800);
    };
    
    window.addEventListener('tbl-field-changed', handler);
    return () => {
      window.removeEventListener('tbl-field-changed', handler);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [fetchCalculatedValue]);

  // �🔔 Rafraîchir aussi quand un événement tbl-node-updated est dispatché avec notre nodeId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent<{ node?: { id?: string } }>).detail;
        if (!detail?.node?.id || detail.node.id === nodeId) {
          // 🎯 PROTECTION: Incrémenter le compteur quand un update est signalé
          pendingEvaluationsRef.current++;
          setIsProtected(true);
          console.log(`⬆️ [GRD nodeId=${nodeId}] Update signalé (${pendingEvaluationsRef.current} en cours)`);
          
          // 🔥 DEBOUNCE: Attendre 500ms avant de rafraîchir pour éviter les clignotements
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            fetchCalculatedValue();
          }, 500);
        }
      } catch (err) {
        // noop
      }
    };
    
    window.addEventListener('tbl-node-updated', handler);
    return () => {
      window.removeEventListener('tbl-node-updated', handler);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
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

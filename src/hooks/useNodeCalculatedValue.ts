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

// 🧠 Coalescing global (module-level): évite les bursts de requêtes identiques
const inFlightByKey = new Map<string, Promise<void>>();
const lastFetchAtByKey = new Map<string, number>();

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

  // Refs pour éviter les closures périmées sans créer de boucles de dépendances
  const valueRef = useRef<string | number | boolean | null>(null);
  const isProtectedRef = useRef<boolean>(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    isProtectedRef.current = isProtected;
  }, [isProtected]);

  // 🔇 Anti-spam: mémoriser les derniers refresh globaux traités
  const lastGlobalRefreshKeyRef = useRef<string | null>(null);
  const lastGlobalRefreshAtRef = useRef<number>(0);

  // Fonction pour récupérer la valeur
  const fetchCalculatedValue = useCallback(async () => {
    if (!nodeId || !treeId) {
      // Cas courant: certains composants appellent le hook avec nodeId temporairement vide.
      // On n'émet pas d'erreur et on n'appelle pas l'API.
      setLoading(false);
      setError(null);
      setValue(null);
      return;
    }

    const requestKey = `${treeId}::${submissionId || ''}::${nodeId}`;
    const now = Date.now();

    // Throttle court (évite l'empilement d'events: preview + autosave + retransform)
    const last = lastFetchAtByKey.get(requestKey);
    if (last && now - last < 450) {
      return;
    }

    const inFlight = inFlightByKey.get(requestKey);
    if (inFlight) {
      await inFlight;
      return;
    }

    try {
      lastFetchAtByKey.set(requestKey, now);
      setLoading(true);
      setError(null);

      // 🎯 Endpoint: GET /api/tree-nodes/:nodeId/calculated-value
      // Retourne: { value, calculatedAt, calculatedBy }
      // 
      // ⚠️ IMPORTANT: Le submissionId est envoyé UNIQUEMENT pour lire les valeurs
      // des champs sources nécessaires au calcul. Le résultat calculé lui-même
      // n'est JAMAIS enregistré dans la submission - il reste dynamique.
      // ✅ IMPORTANT: Un 404 doit être toléré (ex: display field pas encore créé en DB)
      // et ne doit pas polluer la console ni casser l'UI.
      const reqPromise = (async () => {
        const response = await api.get(
          `/api/tree-nodes/${nodeId}/calculated-value`,
          {
            params: submissionId ? { submissionId } : undefined,
            suppressErrorLogForStatuses: [404]
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
          const currentValue = valueRef.current;
          const hasCurrentValue = (
            currentValue !== null && 
            currentValue !== undefined && 
            currentValue !== '' && 
            currentValue !== '∅' &&
            !(Array.isArray(currentValue) && currentValue.length === 0)
          );
          
          if (isProtectedRef.current && isValueBeingCleared && hasCurrentValue) {
            console.log(`🛡️ [GRD nodeId=${nodeId}] PROTECTION: ne pas écraser "${currentValue}" avec "${extractedValue}" (${pendingEvaluationsRef.current} évaluations en cours)`);
            return;
          }

          // Si on a une valeur valide, l'utiliser directement
          if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
            console.log(`🔄 [useNodeCalculatedValue] Mise à jour valeur pour nodeId=${nodeId}:`, extractedValue);
            setValue(extractedValue as string | number | boolean | null);
            setCalculatedAt(data.calculatedAt as string | undefined);
            setCalculatedBy(data.calculatedBy as string | undefined);
            return;
          }
        }
        
        // Si la valeur est vide, on l'affiche vide intentionnellement
        setValue(null);
      })();

      inFlightByKey.set(requestKey, reqPromise);
      await reqPromise;
    } catch (err) {
      const status = (err as Error & { status?: number })?.status;
      if (status === 404) {
        // Tolérer le 404 (nœud inexistant / pas encore créé) -> valeur vide
        setValue(null);
        setError(null);
        return;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      console.error('❌ [useNodeCalculatedValue] Erreur récupération:', {
        nodeId,
        treeId,
        error: errMsg
      });
    } finally {
      const requestKey = `${treeId}::${submissionId || ''}::${nodeId}`;
      inFlightByKey.delete(requestKey);
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
    if (!nodeId || !treeId) return;
    // Quand un devis existe (submissionId), on laisse l'évaluation serveur piloter le refresh
    // via `tbl-force-retransform`/`tbl-node-updated` pour éviter un refetch trop tôt (valeurs non encore recalculées).
    if (submissionId) return;
    
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
  }, [nodeId, treeId]);

  // 🔄 Rafraîchir automatiquement quand un événement global force la retransformation
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!nodeId || !treeId) {
      return;
    }
    
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId?: string; submissionId?: string; treeId?: string | number; reason?: string; signature?: string; timestamp?: number; debugId?: string }>).detail;

      // Filtrer par treeId si présent
      if (detail?.treeId !== undefined && detail?.treeId !== null && String(detail.treeId) !== String(treeId)) {
        return;
      }

      // Filtrer par submissionId si présent
      if (detail?.submissionId && submissionId && String(detail.submissionId) !== String(submissionId)) {
        return;
      }

      // Anti-spam: ignorer les doubles refresh globaux identiques
      const refreshKey = `${detail?.reason || ''}::${detail?.signature || ''}::${detail?.timestamp || ''}`;
      const now = Date.now();
      if (lastGlobalRefreshKeyRef.current === refreshKey && (now - lastGlobalRefreshAtRef.current) < 400) {
        return;
      }

      // Global refresh sans nodeId => tous les champs, mais étalé pour éviter un burst de requêtes
      const isGlobal = !detail?.nodeId;
      if (isGlobal || detail.nodeId === nodeId) {
        // 🎯 PROTECTION: Incrémenter le compteur quand un refresh est demandé
        pendingEvaluationsRef.current++;
        setIsProtected(true);
        console.log(`⬆️ [GRD nodeId=${nodeId}] Rafraîchissement demandé (${pendingEvaluationsRef.current} en cours)`);

        lastGlobalRefreshKeyRef.current = refreshKey;
        lastGlobalRefreshAtRef.current = now;

        // 🚀 Triggers au centre: rafraîchissement immédiat (throttle 450ms déjà appliqué dans fetchCalculatedValue)
        fetchCalculatedValue();
      }
    };
    
    window.addEventListener('tbl-force-retransform', handler);
    return () => {
      window.removeEventListener('tbl-force-retransform', handler);
    };
  }, [fetchCalculatedValue, nodeId, submissionId, treeId]);

  // � NOUVEAU: Rafraîchir automatiquement quand les données du formulaire changent
  // Pour les display fields comme GRD qui dépendent de lead.postalCode, etc.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!nodeId || !treeId) return;
    
    const handler = () => {
      // 🚀 Triggers au centre: rafraîchissement immédiat au changement de champ
      // (Garde-fou léger anti-doublon, le throttle 450ms est le principal)
      if (Date.now() - lastGlobalRefreshAtRef.current < 120) return;
      fetchCalculatedValue();
    };
    
    window.addEventListener('tbl-field-changed', handler);
    return () => {
      window.removeEventListener('tbl-field-changed', handler);
    };
  }, [fetchCalculatedValue, nodeId, treeId, submissionId]);

  // �🔔 Rafraîchir aussi quand un événement tbl-node-updated est dispatché avec notre nodeId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!nodeId || !treeId) return;
    
    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent<{ node?: { id?: string } }>).detail;
        if (!detail?.node?.id || detail.node.id === nodeId) {
          // 🎯 PROTECTION: Incrémenter le compteur quand un update est signalé
          pendingEvaluationsRef.current++;
          setIsProtected(true);
          console.log(`⬆️ [GRD nodeId=${nodeId}] Update signalé (${pendingEvaluationsRef.current} en cours)`);

          lastGlobalRefreshAtRef.current = Date.now();

          // 🚀 Triggers au centre: rafraîchissement immédiat (throttle 450ms déjà appliqué)
          fetchCalculatedValue();
        }
      } catch {
        // noop
      }
    };
    
    window.addEventListener('tbl-node-updated', handler);
    return () => {
      window.removeEventListener('tbl-node-updated', handler);
    };
  }, [fetchCalculatedValue, nodeId, treeId]);

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

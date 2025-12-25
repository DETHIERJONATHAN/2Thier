import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { useTBLBatchOptional } from '../contexts/TBLBatchContext';

/**
 * 🎯 SYSTÈME ULTRA-SIMPLE : Récupère la valeur calculée par le backend
 * 
 * Le backend fait TOUT le travail (formules, tables, conditions)
 * Ce hook va juste chercher la réponse et la renvoie TELLE QUELLE
 * 
 * 🚀 OPTIMISATION BATCH : Ce hook utilise d'abord le cache batch (TBLBatchContext)
 * et fait un fallback vers l'API individuelle uniquement si nécessaire.
 * 
 * @param nodeId - ID du champ à récupérer
 * @param treeId - ID de l'arbre
 * @param formData - Données du formulaire
 * @returns La valeur exacte renvoyée par le backend
 */
export const useBackendValue = (
  nodeId: string | undefined,
  treeId: string | undefined,
  formData: Record<string, unknown>
) => {
  const { api } = useAuthenticatedApi();
  const [value, setValue] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const usedBatch = useRef(false);

  // 🚀 BATCH : Essayer d'utiliser le cache batch d'abord
  const batchContext = useTBLBatchOptional();

  // 🎯 STABILISER formData : Créer un hash stable pour éviter les re-rendus infinis
  const formDataHash = useMemo(() => {
    return JSON.stringify(formData);
  }, [formData]);

  // 🚀 BATCH MODE : Récupérer la valeur depuis le cache batch si disponible
  const batchValue = useMemo(() => {
    if (!nodeId || !batchContext?.isReady) return undefined;
    
    const cachedValue = batchContext.getCalculatedValueForNode(nodeId);
    if (cachedValue) {
      // Prendre submissionValue en priorité, sinon calculatedValue
      return cachedValue.submissionValue ?? cachedValue.calculatedValue;
    }
    return undefined;
  }, [nodeId, batchContext]);

  useEffect(() => {
    if (!nodeId) {
      return;
    }

    const shouldRefresh = (candidate?: string | string[]) => {
      if (!candidate || !nodeId) {
        return false;
      }
      if (Array.isArray(candidate)) {
        return candidate.includes(nodeId);
      }
      return candidate === nodeId;
    };

    const handleNodeEvent = (event: Event) => {
      const custom = event as CustomEvent<{
        node?: { id?: string };
        nodeId?: string;
        targetNodeIds?: string[];
      }>;
      const detail = custom.detail;
      const candidates: Array<string | string[] | undefined> = [detail?.node?.id, detail?.nodeId, detail?.targetNodeIds];
      if (candidates.some(id => shouldRefresh(id))) {
        usedBatch.current = false;
        setRefreshToken(token => token + 1);
      }
    };

    const handleForceRetransform = (event: Event) => {
      const custom = event as CustomEvent<{
        nodeId?: string;
        node?: { id?: string };
        targetNodeIds?: string[];
      }>;
      const detail = custom.detail;
      const candidates: Array<string | string[] | undefined> = [detail?.nodeId, detail?.node?.id, detail?.targetNodeIds];
      if (candidates.some(id => shouldRefresh(id))) {
        usedBatch.current = false;
        setRefreshToken(token => token + 1);
      }
    };

    window.addEventListener('tbl-node-updated', handleNodeEvent as EventListener);
    window.addEventListener('tbl-force-retransform', handleForceRetransform as EventListener);

    return () => {
      window.removeEventListener('tbl-node-updated', handleNodeEvent as EventListener);
      window.removeEventListener('tbl-force-retransform', handleForceRetransform as EventListener);
    };
  }, [nodeId]);

  useEffect(() => {
    if (!nodeId || !treeId) {
      setValue(undefined);
      return;
    }

    // 🚀 BATCH MODE : Si on a une valeur batch et pas de refresh forcé, l'utiliser directement
    if (batchValue !== undefined && refreshToken === 0) {
      if (!usedBatch.current) {
        // console.log(`🚀 [useBackendValue] Mode BATCH - valeur pour ${nodeId}:`, batchValue);
      }
      usedBatch.current = true;
      setValue(batchValue);
      setLoading(false);
      return;
    }

    // Si batch en chargement, attendre
    if (batchContext && batchContext.loading && refreshToken === 0) {
      setLoading(true);
      return;
    }

    // 🔄 FALLBACK : Appel API individuel
    if (!api) {
      setValue(undefined);
      return;
    }

    const fetchBackendValue = async () => {
      try {
        setLoading(true);

        // 🚀 ÉTAPE 1 : CHERCHER D'ABORD LA VALEUR STOCKÉE DANS PRISMA
        try {
          const cachedResponse = await api.get<{
            success?: boolean;
            value?: unknown;
            calculatedValue?: unknown;
            calculatedAt?: string;
            calculatedBy?: string;
          }>(`/api/tree-nodes/${nodeId}/calculated-value`);

          const hasStoredValue = cachedResponse && typeof cachedResponse === 'object'
            && (
              (cachedResponse as Record<string, unknown>).value !== undefined && (cachedResponse as Record<string, unknown>).value !== null
              || (cachedResponse as Record<string, unknown>).calculatedValue !== undefined && (cachedResponse as Record<string, unknown>).calculatedValue !== null
            );

          if (hasStoredValue) {
            const storedValue = (cachedResponse as Record<string, unknown>).value ?? (cachedResponse as Record<string, unknown>).calculatedValue;
            setValue(storedValue);
            setLoading(false);
            return; // 🎯 Sortir ici si valeur trouvée !
          }
        } catch {
          // Pas de valeur stockée, continuer vers le calcul backend
        }

        // 🚀 ÉTAPE 2 : SI PAS DE VALEUR STOCKÉE, CALCULER VIA BACKEND
        // Reconstituer formData depuis le hash
        const parsedFormData = JSON.parse(formDataHash);

        // Appel API vers le backend
        const response = await api.post<{
          success: boolean;
          results: Array<{
            nodeId: string;
            label?: string;
            value: unknown;
            calculatedValue: unknown;
          }>;
        }>('/api/tbl/submissions/preview-evaluate', {
          treeId,
          formData: parsedFormData,
          leadId: parsedFormData.__leadId
        });

        // Trouver le résultat pour ce nodeId
        if (response?.success && response?.results) {
          // 🎯 STRATÉGIE ULTRA-ROBUSTE : Essayer plusieurs méthodes de recherche
          let result = response.results.find(r => r.nodeId === nodeId);
          
          // Si pas trouvé directement, essayer avec le nodeId sans suffix "-1"
          if (!result && nodeId.endsWith('-1')) {
            const nodeIdWithoutSuffix = nodeId.slice(0, -2);
            result = response.results.find(r => r.nodeId === nodeIdWithoutSuffix);
          }
          
          // Si toujours pas trouvé, essayer avec le nodeId AVEC suffix "-1"
          if (!result && !nodeId.endsWith('-1')) {
            const nodeIdWithSuffix = `${nodeId}-1`;
            result = response.results.find(r => r.nodeId === nodeIdWithSuffix);
          }
          
          if (result) {
            // PRENDRE DIRECTEMENT LA VALEUR DU BACKEND
            let backendValue = result.value ?? result.calculatedValue;
            
            // 🛡️ SI C'EST UN OBJET, extraire la vraie valeur
            if (backendValue && typeof backendValue === 'object' && !Array.isArray(backendValue)) {
              const obj = backendValue as Record<string, unknown>;
              const extracted = obj.value ?? obj.result ?? obj.calculatedValue ?? obj.text ?? obj.humanText ?? obj.displayValue ?? backendValue;
              
              // SI C'EST TOUJOURS UN OBJET, descendre plus profond
              if (extracted && typeof extracted === 'object' && !Array.isArray(extracted)) {
                const deepObj = extracted as Record<string, unknown>;
                backendValue = deepObj.value ?? deepObj.result ?? deepObj.calculatedValue ?? extracted;
              } else {
                backendValue = extracted;
              }
            }
            
            setValue(backendValue);
          } else {
            // NodeId non trouvé dans les résultats - c'est normal pour les champs sans capacité de calcul
            setValue(undefined);
          }
        } else {
          setValue(undefined);
        }
      } catch (err) {
        console.error('❌ [useBackendValue] Erreur:', err);
        setValue(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchBackendValue();
  }, [nodeId, treeId, formDataHash, api, refreshToken, batchValue, batchContext]); // ✅ Utiliser formDataHash au lieu de formData

  return { value, loading };
};

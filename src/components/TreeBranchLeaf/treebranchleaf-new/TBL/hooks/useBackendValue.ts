import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { useTBLBatchOptional } from '../contexts/TBLBatchContext';
import { isChangeInProgress } from '../../../../../hooks/useNodeCalculatedValue';

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
  
  // 🛡️ REF POUR GARDER LA DERNIÈRE VALEUR VALIDE
  const lastValidValue = useRef<unknown>(undefined);
  
  // 🛡️ FONCTION HELPER : Mettre à jour la valeur de manière sécurisée
  const setValueSafely = (newValue: unknown) => {
    const isEmptyValue = newValue === null || newValue === undefined || 
      newValue === '' || newValue === '[]' || 
      (Array.isArray(newValue) && newValue.length === 0);
    
    const hasValidLastValue = lastValidValue.current !== undefined && 
      lastValidValue.current !== null && 
      lastValidValue.current !== '' && 
      lastValidValue.current !== '[]' && 
      !(Array.isArray(lastValidValue.current) && lastValidValue.current.length === 0);
    
    if (isEmptyValue && hasValidLastValue) {
      console.log(`🛡️ [useBackendValue] PROTECTION REF: garder lastValidValue pour ${nodeId}`, lastValidValue.current);
      setValue(lastValidValue.current); // Garder l'ancienne valeur
      return;
    }
    
    // Sinon, mettre à jour normalement
    if (!isEmptyValue) {
      lastValidValue.current = newValue; // Sauvegarder la nouvelle valeur valide
    }
    setValue(newValue);
  };

  // 🚀 BATCH : Essayer d'utiliser le cache batch d'abord
  const batchContext = useTBLBatchOptional();

  // 🎯 STABILISER formData : Créer un hash stable pour éviter les re-rendus infinis
  const formDataHash = useMemo(() => {
    return JSON.stringify(formData);
  }, [formData]);

  // 🚀 BATCH MODE : Récupérer la valeur depuis le cache batch si disponible
  const batchValue = useMemo(() => {
    if (!nodeId || !batchContext?.isReady) return undefined;
    
    // PRIORITÉ 1: Valeur calculée (formules)
    const cachedValue = batchContext.getCalculatedValueForNode(nodeId);
    if (cachedValue) {
      // Prendre submissionValue en priorité, sinon calculatedValue
      return cachedValue.submissionValue ?? cachedValue.calculatedValue;
    }
    
    // PRIORITÉ 2: Node-data (variables/données) - pour les champs comme GRD, Prix Kwh, etc.
    const nodeData = batchContext.getNodeDataForNode(nodeId);
    if (nodeData?.variable) {
      const variable = nodeData.variable as { fixedValue?: unknown; sourceType?: string };
      // Si c'est une valeur fixe, la retourner directement
      if (variable.sourceType === 'fixed' && variable.fixedValue !== undefined) {
        return variable.fixedValue;
      }
      // Sinon retourner la config pour traitement ultérieur
      return variable.fixedValue;
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
        calculatedValues?: Record<string, unknown>;
        clearDisplayFields?: boolean;
      }>;
      const detail = custom.detail;

      // 🔥 FIX RESET: Quand "Nouveau devis" demande de vider les display fields,
      // on reset la valeur ET le lastValidValue ref pour empêcher la restauration
      if (detail?.clearDisplayFields === true) {
        console.log(`🧹 [useBackendValue] Clear display field: nodeId=${nodeId}`);
        lastValidValue.current = undefined; // 🎯 Crucial: vider le ref pour empêcher setValueSafely de restaurer
        setValue(undefined);
        return;
      }

      // 🎯 FIX OFF-BY-ONE: Consommer les valeurs inline du broadcast DIRECTEMENT
      // Avant ce fix, useBackendValue ne lisait jamais les calculatedValues inline,
      // et refetchait depuis la DB qui avait encore les ANCIENNES valeurs.
      if (detail?.calculatedValues && nodeId && nodeId in detail.calculatedValues) {
        const inlineValue = detail.calculatedValues[nodeId];
        if (inlineValue !== undefined && inlineValue !== null) {
          console.log(`📥 [useBackendValue] Valeur inline pour nodeId=${nodeId}:`, inlineValue);
          setValueSafely(inlineValue);
          setLoading(false);
          return; // 🎯 Ne PAS faire de refetch, on a la bonne valeur directement
        }
      }

      // 🛡️ Si calculatedValues existe mais notre nodeId n'y est PAS,
      // cela signifie que ce champ n'a pas été impacté par le changement → ne pas refetch
      if (detail?.calculatedValues && Object.keys(detail.calculatedValues).length > 0) {
        return;
      }

      // Fallback: vérifier si un refresh spécifique est demandé pour ce nodeId
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
      setValueSafely(undefined);
      return;
    }

    // 🚀 BATCH MODE : Si on a une valeur batch et pas de refresh forcé, l'utiliser directement
    if (batchValue !== undefined && refreshToken === 0) {
      if (!usedBatch.current) {
        // console.log(`🚀 [useBackendValue] Mode BATCH - valeur pour ${nodeId}:`, batchValue);
      }
      usedBatch.current = true;
      setValueSafely(batchValue);
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
      setValueSafely(undefined);
      return;
    }

    // 🎯 FIX OFF-BY-ONE: Ne pas fetch depuis la DB pendant qu'un changement est en cours
    // La DB contient encore les ANCIENNES valeurs. Les bonnes viendront via le broadcast inline.
    if (isChangeInProgress()) {
      console.log(`🚫 [useBackendValue] GET BLOQUÉ pour nodeId=${nodeId} - changement en cours, attente du broadcast inline`);
      return;
    }

    const fetchBackendValue = async () => {
      try {
        setLoading(true);
        
        // 🔑 Extraire le submissionId du formData pour les lookups de table
        const parsedFormData = typeof formDataHash === 'string' ? JSON.parse(formDataHash) : formData;
        const submissionId = parsedFormData.__submissionId || parsedFormData.submissionId || '';

        // 🚀 ÉTAPE 1 : CHERCHER D'ABORD LA VALEUR STOCKÉE DANS PRISMA
        try {
          // 🔑 Passer le submissionId pour que l'operation-interpreter puisse résoudre les lookups
          const url = submissionId 
            ? `/api/tree-nodes/${nodeId}/calculated-value?submissionId=${encodeURIComponent(submissionId)}`
            : `/api/tree-nodes/${nodeId}/calculated-value`;
          
          const cachedResponse = await api.get<{
            success?: boolean;
            value?: unknown;
            calculatedValue?: unknown;
            calculatedAt?: string;
            calculatedBy?: string;
          }>(url);

          const hasStoredValue = cachedResponse && typeof cachedResponse === 'object'
            && (
              (cachedResponse as Record<string, unknown>).value !== undefined && (cachedResponse as Record<string, unknown>).value !== null
              || (cachedResponse as Record<string, unknown>).calculatedValue !== undefined && (cachedResponse as Record<string, unknown>).calculatedValue !== null
            );

          if (hasStoredValue) {
            const storedValue = (cachedResponse as Record<string, unknown>).value ?? (cachedResponse as Record<string, unknown>).calculatedValue;
            // 🛡️ PROTECTION: Ne pas écraser une valeur vide si on avait déjà une valeur valide
            const isEmptyValue = storedValue === null || storedValue === undefined || 
              storedValue === '' || storedValue === '[]' || 
              (Array.isArray(storedValue) && storedValue.length === 0);
            
            if (!isEmptyValue) {
              setValueSafely(storedValue);
              setLoading(false);
              return; // 🎯 Sortir ici si valeur trouvée !
            }
            // Si valeur vide mais on a déjà une valeur en state, la garder
            if (isEmptyValue && value !== undefined && value !== null && value !== '' && value !== '[]') {
              console.log(`🛡️ [useBackendValue] Protection: garder ancienne valeur pour ${nodeId}`);
              setLoading(false);
              return;
            }
            setValueSafely(storedValue);
            setLoading(false);
            return;
          }
        } catch {
          // Pas de valeur stockée, continuer vers le calcul backend
        }

        // 🚀 ÉTAPE 2 : SI PAS DE VALEUR STOCKÉE, CALCULER VIA BACKEND
        // (parsedFormData déjà déclaré au début de fetchBackendValue)

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
            
            // 🛡️ PROTECTION ULTIME : Ne JAMAIS écraser une valeur valide par une valeur vide
            const isEmptyBackendValue = backendValue === null || backendValue === undefined || 
              backendValue === '' || backendValue === '[]' || 
              (Array.isArray(backendValue) && backendValue.length === 0);
            
            const hasValidCurrentValue = value !== undefined && value !== null && 
              value !== '' && value !== '[]' && 
              !(Array.isArray(value) && value.length === 0);
            
            if (isEmptyBackendValue && hasValidCurrentValue) {
              console.log(`🛡️ [useBackendValue] PROTECTION: garder valeur existante pour ${nodeId} (backend retourné vide)`);
              setLoading(false);
              return; // ⛔ Ne PAS écraser !
            }
            
            setValueSafely(backendValue);
          } else {
            // NodeId non trouvé dans les résultats - c'est normal pour les champs sans capacité de calcul
            // 🛡️ Ne pas écraser si on a déjà une valeur valide
            const hasValidCurrentValue = value !== undefined && value !== null && 
              value !== '' && value !== '[]' && 
              !(Array.isArray(value) && value.length === 0);
            
            if (hasValidCurrentValue) {
              console.log(`🛡️ [useBackendValue] PROTECTION: garder valeur existante pour ${nodeId} (non trouvé dans results)`);
              setLoading(false);
              return;
            }
            setValueSafely(undefined);
          }
        } else {
          // Pas de résultats - ne pas écraser une valeur existante
          const hasValidCurrentValue = value !== undefined && value !== null && 
            value !== '' && value !== '[]' && 
            !(Array.isArray(value) && value.length === 0);
          
          if (hasValidCurrentValue) {
            console.log(`🛡️ [useBackendValue] PROTECTION: garder valeur existante pour ${nodeId} (pas de results)`);
            setLoading(false);
            return;
          }
          setValueSafely(undefined);
        }
      } catch (err) {
        console.error('❌ [useBackendValue] Erreur:', err);
        setValueSafely(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchBackendValue();
  }, [nodeId, treeId, api, refreshToken, batchValue, batchContext]); // 🔥 FIX R10: RETIRÉ formDataHash - les display fields se mettent à jour via broadcast inline, PAS via refetch sur changement formData

  return { value, loading };
};

import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

/**
 * 🎯 SYSTÈME ULTRA-SIMPLE : Récupère la valeur calculée par le backend
 * 
 * Le backend fait TOUT le travail (formules, tables, conditions)
 * Ce hook va juste chercher la réponse et la renvoie TELLE QUELLE
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

  // 🎯 STABILISER formData : Créer un hash stable pour éviter les re-rendus infinis
  const formDataHash = useMemo(() => {
    return JSON.stringify(formData);
  }, [formData]);

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
    if (!nodeId || !treeId || !api) {
      setValue(undefined);
      return;
    }

    const fetchBackendValue = async () => {
      try {
        setLoading(true);

        // 🚀 ÉTAPE 1 : CHERCHER D'ABORD LA VALEUR STOCKÉE DANS PRISMA
        console.log(`🔍 [useBackendValue] Tentative de récupération de la valeur STOCKÉE pour nodeId: ${nodeId}`);
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
            console.log(`✅ [useBackendValue] VALEUR TROUVÉE DANS PRISMA pour nodeId: ${nodeId}`, storedValue);
            setValue(storedValue);
            setLoading(false);
            return; // 🎯 Sortir ici si valeur trouvée !
          }
        } catch (cacheErr) {
          console.log(`⚠️ [useBackendValue] Valeur non trouvée dans Prisma (normal pour première requête):`, cacheErr);
          // Continuer vers la réponse du backend
        }

        // 🚀 ÉTAPE 2 : SI PAS DE VALEUR STOCKÉE, CALCULER VIA BACKEND
        console.log(`🔍 [useBackendValue] Pas de valeur stockée, calcul via backend pour nodeId: ${nodeId}`);

        // Reconstituer formData depuis le hash
        const parsedFormData = JSON.parse(formDataHash);

        console.log(`🔍 [useBackendValue] NodeId: ${nodeId}, FormData envoyé:`, parsedFormData);

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
          console.log(`🔍🔍🔍 [useBackendValue] RÉPONSE COMPLÈTE pour nodeId recherché: "${nodeId}"`);
          console.log(`📊 [useBackendValue] Tous les résultats disponibles (${response.results.length}):`, 
            response.results.map(r => ({ nodeId: r.nodeId, label: r.label, value: r.value, calculatedValue: r.calculatedValue }))
          );
          
          // 🎯 STRATÉGIE ULTRA-ROBUSTE : Essayer plusieurs méthodes de recherche
          console.log(`🔍 [useBackendValue] Recherche pour nodeId: "${nodeId}"`);
          
          let result = response.results.find(r => r.nodeId === nodeId);
          if (result) {
            console.log(`✅ [useBackendValue] Méthode 1 - Match exact du nodeId`);
          }
          
          // Si pas trouvé directement, essayer avec le nodeId sans suffix "-1"
          if (!result && nodeId.endsWith('-1')) {
            const nodeIdWithoutSuffix = nodeId.slice(0, -2);
            result = response.results.find(r => r.nodeId === nodeIdWithoutSuffix);
            if (result) {
              console.log(`✅ [useBackendValue] Méthode 2 - RÉSULTAT TROUVÉ avec nodeId sans suffix: ${nodeIdWithoutSuffix}`);
            }
          }
          
          // Si toujours pas trouvé, essayer avec le nodeId AVEC suffix "-1"
          if (!result && !nodeId.endsWith('-1')) {
            const nodeIdWithSuffix = `${nodeId}-1`;
            result = response.results.find(r => r.nodeId === nodeIdWithSuffix);
            if (result) {
              console.log(`✅ [useBackendValue] Méthode 3 - RÉSULTAT TROUVÉ avec nodeId avec suffix: ${nodeIdWithSuffix}`);
            }
          }
          
          // 🆕 MÉTHODE 4 : Recherche par label (fallback ultime si nodeId ne match pas)
          if (!result) {
            console.log(`⚠️ [useBackendValue] NodeId "${nodeId}" non trouvé, tentative de recherche par label...`);
            // On ne peut pas utiliser le label directement car on ne l'a pas ici
            // Mais on peut logger tous les nodeIds disponibles pour debug
            console.log(`📋 [useBackendValue] NodeIds disponibles dans la réponse:`, 
              response.results.map(r => r.nodeId).join(', ')
            );
          }
          
          if (result) {
            console.log(`✅✅✅ [useBackendValue] RÉSULTAT TROUVÉ:`, JSON.stringify(result, null, 2));
            console.log(`🔍 [useBackendValue] STRUCTURE DU RÉSULTAT:`, {
              hasValue: 'value' in result,
              hasCalculatedValue: 'calculatedValue' in result,
              hasOperationResult: 'operationResult' in result,
              valueType: typeof result.value,
              calculatedValueType: typeof result.calculatedValue,
              operationResultType: typeof result.operationResult
            });
            
            // PRENDRE DIRECTEMENT LA VALEUR DU BACKEND
            // Pas de transformation, pas de calcul, juste la valeur brute
            let backendValue = result.value ?? result.calculatedValue;
            
            console.log(`✅ [useBackendValue] NodeId: ${nodeId}, Valeur brute du backend:`, backendValue);
            console.log(`✅ [useBackendValue] Type de la valeur:`, typeof backendValue);
            
            // 🛡️ SI C'EST UN OBJET, extraire la vraie valeur
            if (backendValue && typeof backendValue === 'object' && !Array.isArray(backendValue)) {
              const obj = backendValue as Record<string, unknown>;
              console.log('⚠️ [useBackendValue] OBJET DÉTECTÉ !');
              console.log('📦 [useBackendValue] Contenu complet:', JSON.stringify(obj, null, 2));
              console.log('🔑 [useBackendValue] Clés disponibles:', Object.keys(obj));
              
              // Essayer différentes propriétés communes
              const extracted = obj.value ?? obj.result ?? obj.calculatedValue ?? obj.text ?? obj.humanText ?? obj.displayValue ?? backendValue;
              console.log('🔄 [useBackendValue] Valeur extraite:', extracted, 'Type:', typeof extracted);
              
              // SI C'EST TOUJOURS UN OBJET, descendre plus profond
              if (extracted && typeof extracted === 'object' && !Array.isArray(extracted)) {
                const deepObj = extracted as Record<string, unknown>;
                console.log('⚠️ [useBackendValue] TOUJOURS UN OBJET après extraction !');
                console.log('📦 [useBackendValue] Contenu du sous-objet:', JSON.stringify(deepObj, null, 2));
                const deepExtracted = deepObj.value ?? deepObj.result ?? deepObj.calculatedValue ?? extracted;
                console.log('🔄 [useBackendValue] Valeur profonde extraite:', deepExtracted);
                backendValue = deepExtracted;
              } else {
                backendValue = extracted;
              }
            }
            
            console.log(`✅ [useBackendValue] NodeId: ${nodeId}, Valeur finale:`, backendValue);
            
            setValue(backendValue);
          } else {
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
  }, [nodeId, treeId, formDataHash, api, refreshToken]); // ✅ Utiliser formDataHash au lieu de formData

  return { value, loading };
};

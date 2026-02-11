import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { useTBLBatch } from '../contexts/TBLBatchContext';

/**
 * 🎯 Hook pour récupérer la valeur calculée d'un champ depuis le backend
 * 
 * ✅ OPTIMISÉ : Ne recharge QUE si les données métier changent
 * 🚀 BATCH FIRST : Utilise d'abord le cache batch, puis fallback API
 * 
 * Appelle `/api/tbl/submissions/preview-evaluate` pour un nodeId donné
 * et retourne la valeur calculée par operation-interpreter.ts
 * 
 * @param nodeId - L'ID du TreeBranchLeafNodeVariable à évaluer
 * @param treeId - L'ID de l'arbre TreeBranchLeaf
 * @param formData - Les données actuelles du formulaire
 * @returns { value, loading, error, humanText, displayConfig }
 */

interface DisplayConfig {
  displayFormat: string;
  unit: string | null;
  precision: number;
  visibleToUser: boolean;
}

export const useCalculatedFieldValue = (
  nodeId: string | undefined,
  treeId: string | undefined,
  formData: Record<string, unknown>
) => {
  const { api } = useAuthenticatedApi();
  const batchContext = useTBLBatch();
  const [value, setValue] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [humanText, setHumanText] = useState<string>('');
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // 🆕 Stocker formData dans une ref pour toujours avoir la dernière version
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // 🔧 Stabiliser formData avec JSON.stringify pour éviter les re-rendus inutiles
  // ✅ OPTIMISATION: Ne recalculer QUE si les valeurs métier changent (pas __leadId, __version, etc.)
  const formDataKey = useMemo(() => {
    // Filtrer les champs techniques qui ne doivent PAS déclencher de rechargement
    const filtered = Object.entries(formData)
      .filter(([key]) => !key.startsWith('__'))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    return JSON.stringify(filtered);
  }, [formData]);

  // 🆕 Extraire le leadId séparément pour éviter les changements de référence
  const leadId = useMemo(
    () => (formData as Record<string, unknown>).__leadId as string | undefined,
    [formData]
  );

  // 🚀 BATCH MODE : Récupérer la valeur depuis le cache batch si disponible
  const batchValue = useMemo(() => {
    if (!nodeId || !batchContext?.isReady) return undefined;
    
    const cachedValue = batchContext.getCalculatedValueForNode(nodeId);
    if (cachedValue) {
      console.log(`🚀 [useCalculatedFieldValue] BATCH HIT pour ${nodeId}:`, cachedValue);
      // Prendre submissionValue en priorité, sinon calculatedValue
      return cachedValue.submissionValue ?? cachedValue.calculatedValue;
    }
    return undefined;
  }, [nodeId, batchContext?.isReady, batchContext?.getCalculatedValueForNode]);

  // 🔄 Écouter les events de mise à jour pour forcer un refresh
  useEffect(() => {
    if (!nodeId) return;

    const handleNodeEvent = (event: Event) => {
      const custom = event as CustomEvent<{
        node?: { id?: string };
        nodeId?: string;
        targetNodeIds?: string[];
      }>;
      const detail = custom.detail;
      const candidates = [detail?.node?.id, detail?.nodeId, ...(detail?.targetNodeIds || [])];
      if (candidates.includes(nodeId)) {
        setRefreshToken(t => t + 1);
      }
    };

    // 🔥 FIX R10: Handler séparé pour tbl-force-retransform qui consomme les valeurs inline
    // Avant ce fix, tbl-force-retransform déclenchait un refreshToken++ → GET API → données stale
    const handleForceRetransform = (event: Event) => {
      const custom = event as CustomEvent<{
        calculatedValues?: Record<string, unknown>;
        nodeId?: string;
        node?: { id?: string };
        targetNodeIds?: string[];
      }>;
      const detail = custom.detail;

      // 🎯 PRIORITÉ: Consommer les valeurs inline du broadcast DIRECTEMENT
      if (detail?.calculatedValues && nodeId && nodeId in detail.calculatedValues) {
        const inlineValue = detail.calculatedValues[nodeId];
        if (inlineValue !== undefined && inlineValue !== null) {
          console.log(`📥 [useCalculatedFieldValue] Valeur inline pour nodeId=${nodeId}:`, inlineValue);
          setValue(inlineValue);
          setLoading(false);
          return; // 🎯 Ne PAS refetch
        }
      }

      // 🛡️ Si calculatedValues existe mais nodeId pas dedans → ne pas refetch
      if (detail?.calculatedValues && Object.keys(detail.calculatedValues).length > 0) {
        return;
      }

      // Fallback: refresh spécifique pour ce nodeId
      const candidates = [detail?.nodeId, detail?.node?.id, ...(detail?.targetNodeIds || [])];
      if (candidates.includes(nodeId)) {
        setRefreshToken(t => t + 1);
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

    const fetchValue = async () => {
      try {
        setLoading(true);
        setError(null);

        console.warn(`⚠️ [useCalculatedFieldValue] FALLBACK API pour nodeId: ${nodeId}`);

        // ✅ Utiliser formDataRef.current pour toujours avoir la dernière version
        const responseData = await api.post<{
          success: boolean;
          results: Array<{
            nodeId: string;
            value?: unknown;                 // ✅ valeur à la racine (backend récent)
            calculatedValue?: unknown;       // ✅ alias possible
            operationResult?: { value?: unknown; humanText?: string };
            displayConfig?: DisplayConfig;
          }>;
        }>('/api/tbl/submissions/preview-evaluate', {
          treeId,
          formData: formDataRef.current, // ✅ Toujours la dernière version
          leadId // ✅ Version stable du leadId
        });

        if (responseData?.success && responseData?.results) {
          const result = responseData.results.find(
            (r: { nodeId: string }) => r.nodeId === nodeId
          );

          if (result) {
            // ✅ PRENDRE DIRECTEMENT LA VALEUR DU BACKEND
            let calculatedValue: unknown = (result as any).value ?? (result as any).calculatedValue;

            setValue(calculatedValue);
            setHumanText((result.operationResult as any)?.humanText || '');
            setDisplayConfig((result as any).displayConfig || null);
          } else {
            setValue(undefined);
          }
        } else {
          setValue(undefined);
        }
      } catch (err) {
        console.error('❌ [useCalculatedFieldValue] Erreur:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setValue(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchValue();
  }, [nodeId, treeId, leadId, api, batchValue, batchContext, refreshToken]); // 🔥 FIX R10: RETIRÉ formDataKey - les display fields se mettent à jour via broadcast inline, PAS via refetch sur changement formData

  return { value, loading, error, humanText, displayConfig };
};

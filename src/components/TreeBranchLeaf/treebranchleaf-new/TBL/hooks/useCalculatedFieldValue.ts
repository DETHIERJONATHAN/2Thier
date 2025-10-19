import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

/**
 * 🎯 Hook pour récupérer la valeur calculée d'un champ depuis le backend
 * 
 * ✅ OPTIMISÉ : Ne recharge QUE si les données métier changent
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
  const [value, setValue] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [humanText, setHumanText] = useState<string>('');
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig | null>(null);

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

  useEffect(() => {
    if (!nodeId || !treeId || !api) {
      setValue(undefined);
      return;
    }

    const fetchValue = async () => {
      try {
        setLoading(true);
        setError(null);

        if (process.env.NODE_ENV === 'development') {
          console.log('[useCalculatedFieldValue] 📡 Appel API:', nodeId);
        }

        // ✅ Utiliser formDataRef.current pour toujours avoir la dernière version
        const responseData = await api.post<{ 
          success: boolean; 
          results: Array<{ 
            nodeId: string; 
            operationResult: { value: unknown; humanText: string };
            displayConfig?: DisplayConfig;
          }> 
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
            const calculatedValue = result.operationResult?.value;
            setValue(calculatedValue);
            setHumanText(result.operationResult?.humanText || '');
            setDisplayConfig(result.displayConfig || null);
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[useCalculatedFieldValue] ✅ Valeur:', calculatedValue);
            }
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
  }, [nodeId, treeId, formDataKey, leadId, api]); // ✅ Seulement formDataKey (pas formData)

  return { value, loading, error, humanText, displayConfig };
};

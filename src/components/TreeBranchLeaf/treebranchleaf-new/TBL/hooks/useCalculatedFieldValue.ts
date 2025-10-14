import { useState, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

/**
 * 🎯 Hook pour récupérer la valeur calculée d'un champ depuis le backend
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

  // 🔧 Stabiliser formData avec JSON.stringify pour éviter les re-rendus inutiles
  const formDataKey = useMemo(() => JSON.stringify(formData), [formData]);

  useEffect(() => {
    console.log('[useCalculatedFieldValue] 🚀 Hook déclenché:', { 
      nodeId, 
      treeId, 
      hasApi: !!api,
      formDataKeys: Object.keys(formData).length 
    });

    if (!nodeId || !treeId || !api) {
      console.log('[useCalculatedFieldValue] ⚠️ Paramètres manquants:', { nodeId, treeId, hasApi: !!api });
      setValue(undefined);
      return;
    }

    const fetchValue = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[useCalculatedFieldValue] 📡 Appel API avec:', { treeId, formDataKeys: Object.keys(formData).length });

        // Appel à l'endpoint de preview-evaluate
        // ⚠️ IMPORTANT: api.post() renvoie DIRECTEMENT les données JSON, pas { data: ... }
        const responseData = await api.post<{ 
          success: boolean; 
          results: Array<{ 
            nodeId: string; 
            operationResult: { value: unknown; humanText: string };
            displayConfig?: DisplayConfig;
          }> 
        }>('/api/tbl/submissions/preview-evaluate', {
          treeId,
          formData
        });

        console.log('[useCalculatedFieldValue] 📥 Réponse reçue:', {
          hasData: !!responseData,
          dataKeys: responseData ? Object.keys(responseData) : [],
          success: responseData?.success,
          resultsLength: responseData?.results?.length
        });

        if (responseData?.success && responseData?.results) {
          // 🔍 DEBUG: Log la réponse API
          console.log('[useCalculatedFieldValue] 🔍 Réponse API complète:', {
            nodeIdRecherché: nodeId,
            resultsCount: responseData.results.length,
            results: responseData.results
          });

          // Chercher le résultat pour notre nodeId
          const result = responseData.results.find(
            (r: { nodeId: string }) => r.nodeId === nodeId
          );

          console.log('[useCalculatedFieldValue] 🔍 Résultat trouvé:', result);

          if (result) {
            // Récupérer la valeur depuis operationResult
            const calculatedValue = result.operationResult?.value;
            console.log('[useCalculatedFieldValue] ✅ Valeur extraite:', calculatedValue);
            console.log('[useCalculatedFieldValue] 🎨 Config affichage:', result.displayConfig);
            setValue(calculatedValue);
            setHumanText(result.operationResult?.humanText || '');
            setDisplayConfig(result.displayConfig || null);
          } else {
            console.log('[useCalculatedFieldValue] ❌ Aucun résultat trouvé pour nodeId:', nodeId);
            setValue(undefined);
          }
        } else {
          console.log('[useCalculatedFieldValue] ⚠️ Réponse invalide ou pas de résultats:', {
            hasSuccess: !!responseData?.success,
            hasResults: !!responseData?.results,
            responseData
          });
          setValue(undefined);
        }
      } catch (err) {
        console.error('❌ [useCalculatedFieldValue] Erreur:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setValue(undefined);
      } finally {
        console.log('[useCalculatedFieldValue] 🏁 Fin du fetch, loading=false');
        setLoading(false);
      }
    };

    fetchValue();
  }, [nodeId, treeId, formDataKey, api]); // ✅ Utiliser formDataKey au lieu de formData

  return { value, loading, error, humanText, displayConfig };
};

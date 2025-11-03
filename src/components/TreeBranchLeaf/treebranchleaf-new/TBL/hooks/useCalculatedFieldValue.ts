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
          console.warn('🚨🚨🚨 [DEBUG FORMDATA] Appel API pour nodeId:', nodeId);
          console.warn('🚨🚨🚨 [DEBUG FORMDATA] Keys:', Object.keys(formDataRef.current));
          console.warn('🚨🚨🚨 [DEBUG FORMDATA] Contenu complet:', formDataRef.current);
        }

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

        console.error('═══════════════════════════════════════════════════════');
        console.error('🔍 [STEP 2] RÉPONSE BACKEND REÇUE');
        console.error('Success:', responseData?.success);
        console.error('Nombre de résultats:', responseData?.results?.length);
        console.error('═══════════════════════════════════════════════════════');

        if (responseData?.success && responseData?.results) {
          const result = responseData.results.find(
            (r: { nodeId: string }) => r.nodeId === nodeId
          );

          console.error('═══════════════════════════════════════════════════════');
          console.error('🔍 [STEP 3] RECHERCHE DU RÉSULTAT');
          console.error('NodeId recherché:', nodeId);
          console.error('Résultat trouvé:', !!result);
          if (result) {
            console.error('result.value:', (result as any).value);
            console.error('result.calculatedValue:', (result as any).calculatedValue);
            console.error('Type de result.value:', typeof (result as any).value);
          }
          console.error('═══════════════════════════════════════════════════════');

          if (result) {
            // ✅ PRENDRE DIRECTEMENT LA VALEUR DU BACKEND
            let calculatedValue: unknown = (result as any).value ?? (result as any).calculatedValue;

            console.error('═══════════════════════════════════════════════════════');
            console.error('� [STEP 4] EXTRACTION DE LA VALEUR');
            console.error('Valeur extraite:', calculatedValue);
            console.error('Type:', typeof calculatedValue);
            console.error('Est undefined?', calculatedValue === undefined);
            console.error('Est null?', calculatedValue === null);
            console.error('Est 0?', calculatedValue === 0);
            console.error('Est "0"?', calculatedValue === "0");
            console.error('Est 56?', calculatedValue === 56);
            console.error('Est "56"?', calculatedValue === "56");
            console.error('═══════════════════════════════════════════════════════');

            console.error('═══════════════════════════════════════════════════════');
            console.error('� [STEP 5] APPEL DE setValue()');
            console.error('Valeur passée à setValue:', calculatedValue);
            console.error('═══════════════════════════════════════════════════════');

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
  }, [nodeId, treeId, formDataKey, leadId, api]); // ✅ Seulement formDataKey (pas formData)

  return { value, loading, error, humanText, displayConfig };
};

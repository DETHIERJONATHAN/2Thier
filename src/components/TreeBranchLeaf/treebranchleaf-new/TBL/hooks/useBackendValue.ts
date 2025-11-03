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

  // 🎯 STABILISER formData : Créer un hash stable pour éviter les re-rendus infinis
  const formDataHash = useMemo(() => {
    return JSON.stringify(formData);
  }, [formData]);

  useEffect(() => {
    if (!nodeId || !treeId || !api) {
      setValue(undefined);
      return;
    }

    const fetchBackendValue = async () => {
      try {
        setLoading(true);

        // Reconstituer formData depuis le hash
        const parsedFormData = JSON.parse(formDataHash);

        console.log(`🔍 [useBackendValue] NodeId: ${nodeId}, FormData envoyé:`, parsedFormData);

        // Appel API vers le backend
        const response = await api.post<{
          success: boolean;
          results: Array<{
            nodeId: string;
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
          console.log(`🔍 [useBackendValue] RÉPONSE COMPLÈTE pour nodeId ${nodeId}:`, JSON.stringify(response.results, null, 2));
          
          const result = response.results.find(r => r.nodeId === nodeId);
          
          if (result) {
            console.log(`🔍 [useBackendValue] RÉSULTAT TROUVÉ:`, JSON.stringify(result, null, 2));
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
  }, [nodeId, treeId, formDataHash, api]); // ✅ Utiliser formDataHash au lieu de formData

  return { value, loading };
};

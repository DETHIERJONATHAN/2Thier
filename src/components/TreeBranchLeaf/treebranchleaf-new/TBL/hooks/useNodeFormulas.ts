/**
 * 🎯 useNodeFormulas - Hook pour charger les formules d'un nœud avec leur targetProperty
 * 
 * Ce hook charge les formules depuis la table TreeBranchLeafNodeFormula
 * pour avoir accès au targetProperty (qui n'est pas dans formula_instances JSONB)
 */

import { useState, useEffect, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

export interface NodeFormula {
  id: string;
  name: string;
  tokens: unknown[];
  targetProperty?: string | null;
  constraintMessage?: string | null;
  enabled?: boolean;
}

interface UseNodeFormulasOptions {
  nodeId?: string;
  enabled?: boolean;
}

interface UseNodeFormulasResult {
  formulas: NodeFormula[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook pour charger les formules d'un nœud depuis la table dédiée
 */
export const useNodeFormulas = ({
  nodeId,
  enabled = true
}: UseNodeFormulasOptions): UseNodeFormulasResult => {
  const { api } = useAuthenticatedApi();
  const [formulas, setFormulas] = useState<NodeFormula[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);
  
  // Cache pour éviter de recharger si le nodeId n'a pas changé
  const lastLoadedNodeId = useRef<string | null>(null);
  const cachedFormulas = useRef<NodeFormula[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !nodeId || !api) {
      console.log(`⏭️ [useNodeFormulas] Skip pour ${nodeId}: enabled=${enabled}, hasApi=${!!api}`);
      return;
    }

    // Si déjà chargé pour ce nodeId (et pas de refresh), utiliser le cache
    if (lastLoadedNodeId.current === nodeId && refreshKey === 0) {
      console.log(`📦 [useNodeFormulas] Utilisation cache pour ${nodeId}: ${cachedFormulas.current.length} formules`);
      setFormulas(cachedFormulas.current);
      return;
    }

    const loadFormulas = async () => {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 [useNodeFormulas] Chargement formules pour node: ${nodeId}...`);

      try {
        const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formulas`) as { formulas: NodeFormula[] };
        const loadedFormulas = response.formulas || [];
        
        console.log(`✅ [useNodeFormulas] Réponse API pour ${nodeId}:`, loadedFormulas);
        
        if (mountedRef.current) {
          setFormulas(loadedFormulas);
          lastLoadedNodeId.current = nodeId;
          cachedFormulas.current = loadedFormulas;
          
          // Log pour debug
          const constraintFormulas = loadedFormulas.filter(f => f.targetProperty);
          if (constraintFormulas.length > 0) {
            console.log(`🎯 [useNodeFormulas] Formules de contrainte pour ${nodeId}:`, constraintFormulas);
          }
        }
      } catch (err) {
        console.error('[useNodeFormulas] Erreur chargement:', err);
        if (mountedRef.current) {
          setError('Erreur lors du chargement des formules');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadFormulas();
  }, [enabled, nodeId, api, refreshKey]);

  const refresh = () => {
    setRefreshKey(k => k + 1);
  };

  return {
    formulas,
    loading,
    error,
    refresh
  };
};

/**
 * Extrait les formules de contrainte (celles avec un targetProperty non vide)
 */
export const getConstraintFormulas = (formulas: NodeFormula[]): NodeFormula[] => {
  return formulas.filter(f => f.targetProperty && ['number_max', 'number_min', 'max', 'min', 'step', 'visible', 'disabled', 'required'].includes(f.targetProperty));
};

/**
 * Extrait le nodeId source d'une formule depuis ses tokens
 * Supporte les formats: @value.nodeId, @calculated.nodeId, @select.nodeId
 */
export const extractSourceNodeIdFromTokens = (tokens: unknown[]): string | null => {
  if (!tokens || !Array.isArray(tokens)) return null;
  
  for (const token of tokens) {
    if (typeof token === 'string') {
      // Format @value.nodeId, @calculated.nodeId, @select.nodeId, @value.shared-ref-xxx
      const match = token.match(/@(?:value|calculated|select)\.(.+)/);
      if (match) return match[1];
    }
    
    if (typeof token === 'object' && token !== null) {
      const tokenObj = token as Record<string, unknown>;
      if (tokenObj.type === 'ref' && typeof tokenObj.ref === 'string') {
        const match = tokenObj.ref.match(/@(?:value|calculated|select)\.(.+)/);
        if (match) return match[1];
      }
    }
  }
  
  return null;
};

export default useNodeFormulas;

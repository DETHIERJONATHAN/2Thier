/**
 * 🎯 useNodeFormulas - Hook pour charger les formules d'un nœud avec leur targetProperty
 * 
 * Ce hook charge les formules depuis la table TreeBranchLeafNodeFormula
 * pour avoir accès au targetProperty (qui n'est pas dans formula_instances JSONB)
 * 
 * 🚀 OPTIMISATION BATCH : Ce hook utilise d'abord le cache batch (TBLBatchContext)
 * et fait un fallback vers l'API individuelle uniquement si nécessaire.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { tblLog, isTBLDebugEnabled } from '../../../../../utils/tblDebug';
import { useTBLBatchOptional } from '../contexts/TBLBatchContext';

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
 * 
 * 🚀 OPTIMISATION : Utilise le cache batch si disponible, sinon fallback API
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
  
  // 🚀 BATCH : Essayer d'utiliser le cache batch d'abord
  const batchContext = useTBLBatchOptional();
  
  // Cache pour éviter de recharger si le nodeId n'a pas changé
  const lastLoadedNodeId = useRef<string | null>(null);
  const cachedFormulas = useRef<NodeFormula[]>([]);
  const usedBatch = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 🚀 BATCH MODE : Si le contexte batch est disponible et prêt, utiliser ses données
  const batchFormulas = useMemo(() => {
    if (!nodeId || !batchContext?.isReady) return null;
    
    const formulas = batchContext.getFormulasForNode(nodeId);
    if (formulas.length > 0) {
      return formulas.map(f => ({
        id: f.id,
        name: f.name,
        tokens: f.tokens as unknown[],
        targetProperty: f.targetProperty,
        constraintMessage: f.constraintMessage,
        enabled: f.enabled
      }));
    }
    return null;
  }, [nodeId, batchContext]);

  useEffect(() => {
    if (!enabled || !nodeId) {
      return;
    }

    // 🚀 BATCH MODE : Si on a des données batch, les utiliser directement
    if (batchFormulas !== null) {
      if (!usedBatch.current && isTBLDebugEnabled()) {
        tblLog(`🚀 [useNodeFormulas] Mode BATCH - ${batchFormulas.length} formules pour ${nodeId}`);
      }
      usedBatch.current = true;
      setFormulas(batchFormulas);
      setLoading(false);
      setError(null);
      return;
    }

    // Si batch pas prêt mais en chargement, attendre
    if (batchContext && batchContext.loading) {
      setLoading(true);
      return;
    }

    // Si batch n'a pas cette donnée, fallback vers API individuelle
    if (!api) {
      return;
    }

    // Si déjà chargé pour ce nodeId (et pas de refresh), utiliser le cache local
    if (lastLoadedNodeId.current === nodeId && refreshKey === 0 && cachedFormulas.current.length > 0) {
      setFormulas(cachedFormulas.current);
      return;
    }

    // 🔄 FALLBACK : Appel API individuel
    const loadFormulas = async () => {
      setLoading(true);
      setError(null);
      
      if (isTBLDebugEnabled()) {
        tblLog(`🔄 [useNodeFormulas] FALLBACK API pour node: ${nodeId}...`);
      }

      try {
        const response = await api.get(`/api/treebranchleaf/nodes/${nodeId}/formulas`) as { formulas: NodeFormula[] };
        const loadedFormulas = response.formulas || [];
        
        if (isTBLDebugEnabled()) {
          tblLog(`✅ [useNodeFormulas] Réponse API pour ${nodeId}:`, loadedFormulas);
        }
        
        if (mountedRef.current) {
          setFormulas(loadedFormulas);
          lastLoadedNodeId.current = nodeId;
          cachedFormulas.current = loadedFormulas;
          
          // Log pour debug uniquement si formules de contrainte
          const constraintFormulas = loadedFormulas.filter(f => f.targetProperty);
          if (constraintFormulas.length > 0 && isTBLDebugEnabled()) {
            tblLog(`🎯 [useNodeFormulas] Formules de contrainte pour ${nodeId}:`, constraintFormulas);
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
  }, [enabled, nodeId, api, refreshKey, batchFormulas, batchContext]);

  const refresh = () => {
    usedBatch.current = false;
    lastLoadedNodeId.current = null;
    cachedFormulas.current = [];
    setRefreshKey(k => k + 1);
    // Aussi rafraîchir le batch si disponible
    batchContext?.refresh();
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

/**
 * 🚀 useTBLBatchData - Hook pour charger toutes les données TBL en batch
 * 
 * Ce hook remplace les dizaines de requêtes individuelles par UNE SEULE requête batch.
 * Résultat : ~80% de réduction du temps de chargement et des requêtes API.
 * 
 * UTILISATION :
 * ```tsx
 * const { 
 *   batchData, 
 *   loading, 
 *   getFormulasForNode, 
 *   getCalculatedValueForNode,
 *   getSelectConfigForNode 
 * } = useTBLBatchData(treeId, leadId);
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

// Types pour les données batch
export interface BatchFormula {
  id: string;
  nodeId: string;
  name: string;
  tokens: unknown[];
  targetProperty?: string | null;
  constraintMessage?: string | null;
  description?: string | null;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BatchCalculatedValue {
  calculatedValue: unknown;
  calculatedAt: Date | null;
  calculatedBy: string | null;
  submissionValue?: unknown;
}

export interface BatchSelectConfig {
  fieldType: string | null;
  options: unknown;
  sourceType: string | null;
  sourceTableId: string | null;
  sourceColumn: string | null;
  displayColumn: string | null;
}

export interface BatchNodeData {
  usedVariableId: string | null;
  variable: {
    id: string;
    nodeId: string;
    sourceType?: string | null;
    sourceRef?: string | null;
    fixedValue?: unknown;
    selectedNodeId?: string | null;
    exposedKey?: string | null;
    displayFormat?: string | null;
    unit?: string | null;
    precision?: number | null;
    metadata?: unknown;
  } | null;
  ownerNodeId: string | null;
}

export interface TBLBatchData {
  formulasByNode: Record<string, BatchFormula[]>;
  valuesByNode: Record<string, BatchCalculatedValue>;
  configsByNode: Record<string, BatchSelectConfig>;
  dataByNode: Record<string, BatchNodeData>;
  stats: {
    totalNodes: number;
    totalFormulas: number;
    nodesWithFormulas: number;
    nodesWithValues: number;
    selectFields: number;
    nodesWithData: number;
  };
}

interface UseTBLBatchDataResult {
  /** Données brutes du batch */
  batchData: TBLBatchData | null;
  /** État de chargement */
  loading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Si le batch a été chargé avec succès */
  isReady: boolean;
  /** Récupère les formules d'un noeud depuis le cache batch */
  getFormulasForNode: (nodeId: string) => BatchFormula[];
  /** Récupère la valeur calculée d'un noeud depuis le cache batch */
  getCalculatedValueForNode: (nodeId: string) => BatchCalculatedValue | null;
  /** Récupère la config select d'un noeud depuis le cache batch */
  getSelectConfigForNode: (nodeId: string) => BatchSelectConfig | null;
  /** Récupère la configuration data/variable d'un noeud depuis le cache batch */
  getNodeDataForNode: (nodeId: string) => BatchNodeData | null;
  /** Force un rechargement du batch */
  refresh: () => void;
}

/**
 * Hook pour charger toutes les données TBL en batch
 * 
 * @param treeId - ID du tree TBL
 * @param leadId - ID du lead (optionnel, pour récupérer les valeurs de submission)
 */
export const useTBLBatchData = (
  treeId: string | undefined,
  leadId?: string
): UseTBLBatchDataResult => {
  const { api } = useAuthenticatedApi();
  const [batchData, setBatchData] = useState<TBLBatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Refs pour éviter les appels dupliqués
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const lastLoadedTreeId = useRef<string | null>(null);
  const lastLoadedLeadId = useRef<string | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Charger les données batch
  useEffect(() => {
    if (!treeId || !api) {
      return;
    }

    // Éviter les doubles chargements
    if (loadingRef.current) {
      return;
    }

    // Si déjà chargé pour ce tree/lead, ne pas recharger (sauf si refresh)
    if (
      lastLoadedTreeId.current === treeId &&
      lastLoadedLeadId.current === leadId &&
      refreshKey === 0 &&
      batchData !== null
    ) {
      return;
    }

    const loadBatchData = async () => {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // 🚀 Charger les données de base ET les node-data en parallèle
        const baseUrl = leadId
          ? `/api/tbl/batch/trees/${treeId}/all?leadId=${leadId}`
          : `/api/tbl/batch/trees/${treeId}/all`;
        const nodeDataUrl = `/api/tbl/batch/trees/${treeId}/node-data`;

        console.log(`🚀 [useTBLBatchData] Chargement batch pour tree ${treeId}...`);
        const startTime = performance.now();

        const [baseResponse, nodeDataResponse] = await Promise.all([
          api.get<{
            success: boolean;
            treeId: string;
            leadId: string | null;
            stats: Omit<TBLBatchData['stats'], 'nodesWithData'>;
            formulasByNode: TBLBatchData['formulasByNode'];
            valuesByNode: TBLBatchData['valuesByNode'];
            configsByNode: TBLBatchData['configsByNode'];
          }>(baseUrl),
          api.get<{
            success: boolean;
            treeId: string;
            totalNodesWithData: number;
            dataByNode: TBLBatchData['dataByNode'];
          }>(nodeDataUrl).catch(() => null) // Ne pas bloquer si node-data échoue
        ]);

        const duration = performance.now() - startTime;

        if (mountedRef.current && baseResponse?.success) {
          const data: TBLBatchData = {
            formulasByNode: baseResponse.formulasByNode || {},
            valuesByNode: baseResponse.valuesByNode || {},
            configsByNode: baseResponse.configsByNode || {},
            dataByNode: nodeDataResponse?.dataByNode || {},
            stats: {
              ...(baseResponse.stats || {
                totalNodes: 0,
                totalFormulas: 0,
                nodesWithFormulas: 0,
                nodesWithValues: 0,
                selectFields: 0
              }),
              nodesWithData: nodeDataResponse?.totalNodesWithData || 0
            }
          };

          setBatchData(data);
          lastLoadedTreeId.current = treeId;
          lastLoadedLeadId.current = leadId;

          console.log(
            `✅ [useTBLBatchData] Batch chargé en ${duration.toFixed(0)}ms:`,
            `${data.stats.totalFormulas} formules,`,
            `${data.stats.nodesWithValues} valeurs,`,
            `${data.stats.selectFields} selects,`,
            `${data.stats.nodesWithData} node-data`
          );
        }
      } catch (err) {
        console.error('[useTBLBatchData] Erreur chargement batch:', err);
        if (mountedRef.current) {
          setError('Erreur lors du chargement batch des données TBL');
          // Ne pas bloquer - les hooks individuels peuvent fallback
        }
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadBatchData();
  }, [treeId, leadId, api, refreshKey, batchData]);

  // Helpers pour accéder aux données
  const getFormulasForNode = useCallback((nodeId: string): BatchFormula[] => {
    if (!batchData?.formulasByNode) return [];
    
    // Essayer d'abord l'ID exact
    if (batchData.formulasByNode[nodeId]) {
      return batchData.formulasByNode[nodeId];
    }
    
    // Si pas trouvé et nodeId a un suffixe "-1", essayer sans le suffixe
    if (nodeId.endsWith('-1')) {
      const baseId = nodeId.slice(0, -2);
      if (batchData.formulasByNode[baseId]) {
        return batchData.formulasByNode[baseId];
      }
    }
    
    // Si pas trouvé et nodeId n'a pas de suffixe, essayer avec "-1"
    if (!nodeId.endsWith('-1')) {
      const suffixedId = `${nodeId}-1`;
      if (batchData.formulasByNode[suffixedId]) {
        return batchData.formulasByNode[suffixedId];
      }
    }
    
    return [];
  }, [batchData]);

  const getCalculatedValueForNode = useCallback((nodeId: string): BatchCalculatedValue | null => {
    if (!batchData?.valuesByNode) return null;
    
    // Même logique de fallback pour les suffixes
    if (batchData.valuesByNode[nodeId]) {
      return batchData.valuesByNode[nodeId];
    }
    
    if (nodeId.endsWith('-1')) {
      const baseId = nodeId.slice(0, -2);
      if (batchData.valuesByNode[baseId]) {
        return batchData.valuesByNode[baseId];
      }
    }
    
    if (!nodeId.endsWith('-1')) {
      const suffixedId = `${nodeId}-1`;
      if (batchData.valuesByNode[suffixedId]) {
        return batchData.valuesByNode[suffixedId];
      }
    }
    
    return null;
  }, [batchData]);

  const getSelectConfigForNode = useCallback((nodeId: string): BatchSelectConfig | null => {
    if (!batchData?.configsByNode) return null;
    
    // Même logique de fallback pour les suffixes
    if (batchData.configsByNode[nodeId]) {
      return batchData.configsByNode[nodeId];
    }
    
    if (nodeId.endsWith('-1')) {
      const baseId = nodeId.slice(0, -2);
      if (batchData.configsByNode[baseId]) {
        return batchData.configsByNode[baseId];
      }
    }
    
    if (!nodeId.endsWith('-1')) {
      const suffixedId = `${nodeId}-1`;
      if (batchData.configsByNode[suffixedId]) {
        return batchData.configsByNode[suffixedId];
      }
    }
    
    return null;
  }, [batchData]);

  const getNodeDataForNode = useCallback((nodeId: string): BatchNodeData | null => {
    if (!batchData?.dataByNode) return null;
    
    // Même logique de fallback pour les suffixes
    if (batchData.dataByNode[nodeId]) {
      return batchData.dataByNode[nodeId];
    }
    
    if (nodeId.endsWith('-1')) {
      const baseId = nodeId.slice(0, -2);
      if (batchData.dataByNode[baseId]) {
        return batchData.dataByNode[baseId];
      }
    }
    
    if (!nodeId.endsWith('-1')) {
      const suffixedId = `${nodeId}-1`;
      if (batchData.dataByNode[suffixedId]) {
        return batchData.dataByNode[suffixedId];
      }
    }
    
    return null;
  }, [batchData]);

  const refresh = useCallback(() => {
    lastLoadedTreeId.current = null;
    lastLoadedLeadId.current = undefined;
    setRefreshKey(k => k + 1);
  }, []);

  const isReady = useMemo(() => {
    return batchData !== null && !loading && !error;
  }, [batchData, loading, error]);

  return {
    batchData,
    loading,
    error,
    isReady,
    getFormulasForNode,
    getCalculatedValueForNode,
    getSelectConfigForNode,
    getNodeDataForNode,
    refresh
  };
};

export default useTBLBatchData;

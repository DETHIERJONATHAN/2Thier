/**
 * 🚀 TBLBatchContext - Contexte React pour partager les données batch
 * 
 * Ce contexte charge les données batch UNE SEULE FOIS et les partage entre
 * tous les composants TBL enfants. Cela évite que chaque composant fasse
 * sa propre requête.
 * 
 * UTILISATION :
 * ```tsx
 * // Dans le composant parent (TBL.tsx)
 * <TBLBatchProvider treeId={treeId} leadId={leadId}>
 *   <TBLContent />
 * </TBLBatchProvider>
 * 
 * // Dans les composants enfants
 * const { getFormulasForNode, isReady } = useTBLBatch();
 * ```
 */

import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { 
  useTBLBatchData, 
  TBLBatchData, 
  BatchFormula, 
  BatchCalculatedValue, 
  BatchSelectConfig,
  BatchNodeData,
  BatchCondition,
  InverseConditionInfo
} from '../hooks/useTBLBatchData';
import { setBatchNodeDataCache } from '../hooks/useTBLDataPrismaComplete';

// Interface du contexte
interface TBLBatchContextValue {
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
  /** Récupère la config data/variable d'un noeud depuis le cache batch */
  getNodeDataForNode: (nodeId: string) => BatchNodeData | null;
  /** 🚀 NOUVEAU: Récupère les conditions d'un noeud */
  getConditionsForNode: (nodeId: string) => BatchCondition[];
  /** 🚀 NOUVEAU: Récupère une condition par son ID */
  getConditionById: (conditionId: string) => BatchCondition | null;
  /** 🚀 NOUVEAU: Récupère la condition active d'un noeud */
  getActiveConditionForNode: (nodeId: string) => BatchCondition | null;
  /** 🚀 CRITIQUE: Récupère les conditions qui CIBLENT ce noeud (visibilité conditionnelle) */
  getConditionsTargetingNode: (nodeId: string) => InverseConditionInfo[];
  /** Force un rechargement du batch */
  refresh: () => void;
  /** ID du tree actuel */
  treeId: string | undefined;
  /** ID du lead actuel */
  leadId: string | undefined;
}

// Valeur par défaut du contexte
const defaultContextValue: TBLBatchContextValue = {
  batchData: null,
  loading: false,
  error: null,
  isReady: false,
  getFormulasForNode: () => [],
  getCalculatedValueForNode: () => null,
  getSelectConfigForNode: () => null,
  getNodeDataForNode: () => null,
  getConditionsForNode: () => [],
  getConditionById: () => null,
  getActiveConditionForNode: () => null,
  getConditionsTargetingNode: () => [],
  refresh: () => {},
  treeId: undefined,
  leadId: undefined
};

// Création du contexte
const TBLBatchContext = createContext<TBLBatchContextValue>(defaultContextValue);

// Props du provider
interface TBLBatchProviderProps {
  children: ReactNode;
  treeId: string | undefined;
  leadId?: string;
}

/**
 * Provider qui charge les données batch et les partage via contexte
 */
export const TBLBatchProvider: React.FC<TBLBatchProviderProps> = ({
  children,
  treeId,
  leadId
}) => {
  // Utiliser le hook de batch
  const {
    batchData,
    loading,
    error,
    isReady,
    getFormulasForNode,
    getCalculatedValueForNode,
    getSelectConfigForNode,
    getNodeDataForNode,
    getConditionsForNode,
    getConditionById,
    getActiveConditionForNode,
    getConditionsTargetingNode,
    refresh
  } = useTBLBatchData(treeId, leadId);

  // 🚀 Synchroniser le cache global quand les données batch sont prêtes
  useEffect(() => {
    if (isReady && treeId && batchData?.dataByNode) {
      setBatchNodeDataCache(treeId, batchData.dataByNode);
      console.log(`🚀 [TBLBatchProvider] Cache node-data synchronisé (${Object.keys(batchData.dataByNode).length} nodes)`);
    }
  }, [isReady, treeId, batchData?.dataByNode]);

  // Mémoriser la valeur du contexte pour éviter les re-rendus inutiles
  const contextValue = useMemo<TBLBatchContextValue>(() => ({
    batchData,
    loading,
    error,
    isReady,
    getFormulasForNode,
    getCalculatedValueForNode,
    getSelectConfigForNode,
    getNodeDataForNode,
    getConditionsForNode,
    getConditionById,
    getActiveConditionForNode,
    getConditionsTargetingNode,
    refresh,
    treeId,
    leadId
  }), [
    batchData,
    loading,
    error,
    isReady,
    getFormulasForNode,
    getCalculatedValueForNode,
    getSelectConfigForNode,
    getNodeDataForNode,
    getConditionsForNode,
    getConditionById,
    getActiveConditionForNode,
    getConditionsTargetingNode,
    refresh,
    treeId,
    leadId
  ]);

  return (
    <TBLBatchContext.Provider value={contextValue}>
      {children}
    </TBLBatchContext.Provider>
  );
};

/**
 * Hook pour accéder aux données batch depuis n'importe quel composant enfant
 * 
 * @throws Error si utilisé en dehors d'un TBLBatchProvider
 */
export const useTBLBatch = (): TBLBatchContextValue => {
  const context = useContext(TBLBatchContext);
  
  // Note: On ne throw pas d'erreur car certains composants peuvent être utilisés
  // en dehors du provider (mode dégradé/fallback)
  
  return context;
};

/**
 * Hook optionnel qui retourne undefined si pas de provider
 * Utile pour les composants qui peuvent fonctionner avec ou sans batch
 */
export const useTBLBatchOptional = (): TBLBatchContextValue | undefined => {
  const context = useContext(TBLBatchContext);
  
  // Si le contexte a les valeurs par défaut (pas de provider), retourner undefined
  if (context === defaultContextValue) {
    return undefined;
  }
  
  return context;
};

export default TBLBatchContext;

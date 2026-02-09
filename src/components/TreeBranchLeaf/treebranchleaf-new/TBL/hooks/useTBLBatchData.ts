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

// 🚀 NOUVEAU: Types pour les conditions batch
export interface BatchCondition {
  id: string;
  nodeId: string;
  name: string;
  conditionSet: unknown;
  description?: string | null;
  isDefault?: boolean;
  order?: number;
}

// 🚀 CRITIQUE: Type pour les conditions inversées (conditions qui CIBLENT un nodeId)
// Utilisé pour savoir quand un champ doit être affiché/masqué basé sur une condition externe
export interface InverseConditionInfo {
  conditionId: string;        // ID de la condition
  sourceNodeId: string;       // NodeId qui DÉFINIT la condition (le champ source à surveiller)
  dependsOn: string;          // NodeId du champ dont dépend la visibilité
  operator: string;           // Opérateur de comparaison (==, !=, etc.)
  showWhen: string;           // Valeur à comparer (option ID pour select)
  actionType: 'SHOW' | 'HIDE'; // Type d'action
}

export interface TBLBatchData {
  formulasByNode: Record<string, BatchFormula[]>;
  valuesByNode: Record<string, BatchCalculatedValue>;
  configsByNode: Record<string, BatchSelectConfig>;
  dataByNode: Record<string, BatchNodeData>;
  // 🚀 NOUVEAU: Conditions
  conditionsByNode?: Record<string, BatchCondition[]>;
  conditionsById?: Record<string, BatchCondition>;
  activeConditionByNode?: Record<string, string | null>;
  // 🚀 CRITIQUE: Index inversé des conditions (qui CIBLENT un nodeId avec SHOW/HIDE)
  conditionsTargetingNode?: Record<string, InverseConditionInfo[]>;
  stats: {
    totalNodes: number;
    totalFormulas: number;
    nodesWithFormulas: number;
    nodesWithValues: number;
    selectFields: number;
    nodesWithData: number;
    nodesWithConditions?: number; // 🚀 NOUVEAU
  };
}

/**
 * 🚀 CRITIQUE: Construit l'index inversé des conditions
 * Parse tous les conditionSet pour trouver les actions SHOW/HIDE et créer un mapping:
 * targetNodeId -> [{conditionId, dependsOn, operator, showWhen}]
 * 
 * Cela permet de savoir si un champ doit être visible/masqué basé sur les conditions d'autres champs.
 */
/**
 * 🔧 Helper: Normaliser un opérateur pour éliminer les doubles négations
 */
function normalizeOperator(op: string): string {
  // Simplifier les doubles négations
  if (op === 'not_not_contains') return 'contains';
  if (op === 'not_not_equals') return 'equals';
  if (op === 'not_!=') return '==';
  if (op === 'not_==') return '!=';
  if (op.startsWith('not_not_')) return op.substring(8);
  return op;
}

/**
 * 🔧 Helper: Inverser un opérateur
 */
function invertOperator(op: string): string {
  const inverted = op === 'contains' ? 'not_contains' : 
                   op === 'not_contains' ? 'contains' :
                   op === '==' ? '!=' : 
                   op === '!=' ? '==' :
                   op === 'equals' ? 'not_equals' :
                   op === 'not_equals' ? 'equals' :
                   op === 'isEmpty' ? 'isNotEmpty' :
                   op === 'isNotEmpty' ? 'isEmpty' :
                   op.startsWith('not_') ? op.substring(4) :
                   'not_' + op;
  return normalizeOperator(inverted);
}

/**
 * 🔧 Helper: Extraire un nodeId depuis une référence
 */
function extractNodeIdFromRef(ref: string): string {
  if (!ref) return '';
  
  if (ref.startsWith('@value.')) {
    return ref.substring(7);
  } else if (ref.startsWith('@select.')) {
    return ref.substring(8);
  } else if (ref.startsWith('@calculated.')) {
    // Retourner la partie complète après @calculated. (UUID + suffixe éventuel comme -sum-total)
    return ref.substring(12);
  } else if (ref.startsWith('@node.')) {
    return ref.substring(6);
  } else if (ref.startsWith('node-formula:')) {
    return ref.substring(13);
  } else if (ref.startsWith('node-table:')) {
    return ref.substring(11);
  } else if (ref.startsWith('node-condition:')) {
    return ref.substring(15);
  } else if (ref.startsWith('node-variable:')) {
    return ref.substring(14);
  } else if (ref.startsWith('formula:')) {
    return ref.substring(8);
  } else if (ref.startsWith('condition:')) {
    return ''; // Géré séparément
  } else {
    // UUID direct ?
    const uuidMatch = ref.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return uuidMatch ? uuidMatch[1] : ref;
  }
}

/**
 * 🚀 CRITIQUE: Construit l'index inversé des conditions
 * Parse tous les conditionSet (branches + fallback) pour trouver les actions SHOW/HIDE
 */
function buildConditionsTargetingIndex(
  conditionsById: Record<string, BatchCondition> | undefined
): Record<string, InverseConditionInfo[]> {
  const index: Record<string, InverseConditionInfo[]> = {};
  
  if (!conditionsById) {
    return index;
  }

  // Helper pour ajouter une entrée à l'index
  const addToIndex = (
    targetNodeId: string,
    info: InverseConditionInfo
  ) => {
    if (!targetNodeId || targetNodeId.startsWith('condition:')) return;
    
    if (!index[targetNodeId]) {
      index[targetNodeId] = [];
    }
    index[targetNodeId].push(info);
  };

  // Helper pour résoudre récursivement les conditions chaînées
  const resolveConditionTargets = (
    conditionId: string,
    parentDependsOn: string,
    parentOperator: string,
    parentShowWhen: string,
    inverted: boolean,
    visited: Set<string>
  ) => {
    if (visited.has(conditionId)) return; // Éviter les boucles infinies
    visited.add(conditionId);
    
    const chainedCondition = conditionsById[conditionId];
    if (!chainedCondition?.conditionSet) return;
    
    const chainedSet = chainedCondition.conditionSet as {
      branches?: Array<{
        when?: { op?: string; left?: { ref?: string }; right?: { ref?: string } };
        actions?: Array<{ type?: string; nodeIds?: string[] }>;
      }>;
      fallback?: {
        actions?: Array<{ type?: string; nodeIds?: string[] }>;
      };
    };
    

    
    // Parser les branches de la condition chaînée
    for (const branch of chainedSet.branches || []) {
      const when = branch.when;
      const branchDependsOn = when?.left?.ref ? extractNodeIdFromRef(when.left.ref) : parentDependsOn;
      const branchOperator = when?.op || '==';
      const branchShowWhen = when?.right?.ref ? extractNodeIdFromRef(when.right.ref) : '';
      
      for (const action of branch.actions || []) {
        const actionType = (action.type?.toUpperCase() || 'SHOW') as 'SHOW' | 'HIDE';
        
        for (const targetRef of action.nodeIds || []) {
          if (targetRef.startsWith('condition:')) {
            resolveConditionTargets(targetRef.substring(10), branchDependsOn, branchOperator, branchShowWhen, false, visited);
          } else if (targetRef.startsWith('node-formula:') || targetRef.startsWith('node-table:') || targetRef.startsWith('node-variable:')) {
            // 🔧 FIX: node-formula:/node-table:/node-variable: targets select WHICH formula/table/variable
            // to use on the condition's OWN node, not a different node
            addToIndex(chainedCondition.nodeId, {
              conditionId,
              sourceNodeId: chainedCondition.nodeId,
              dependsOn: branchDependsOn,
              operator: branchOperator,
              showWhen: branchShowWhen,
              actionType
            });
          } else {
            const targetNodeId = extractNodeIdFromRef(targetRef);
            addToIndex(targetNodeId, {
              conditionId,
              sourceNodeId: chainedCondition.nodeId,
              dependsOn: branchDependsOn,
              operator: branchOperator,
              showWhen: branchShowWhen,
              actionType
            });
          }
        }
      }
    }
    
    // Parser le fallback de la condition chaînée
    if (chainedSet.fallback?.actions) {
      for (const action of chainedSet.fallback.actions) {
        const actionType = (action.type?.toUpperCase() || 'SHOW') as 'SHOW' | 'HIDE';
        
        for (const targetRef of action.nodeIds || []) {
          if (targetRef.startsWith('condition:')) {
            // 🔥 FIX: Si on vient d'un fallback parent (inverted=true), on n'inverse pas encore
            const opForChain = inverted ? parentOperator : ('not_' + parentOperator);
            resolveConditionTargets(targetRef.substring(10), parentDependsOn, opForChain, parentShowWhen, true, visited);
          } else if (targetRef.startsWith('node-formula:') || targetRef.startsWith('node-table:') || targetRef.startsWith('node-variable:')) {
            // 🔧 FIX: node-formula:/node-table:/node-variable: targets = formula selection on owning node
            const finalOp = inverted ? parentOperator : invertOperator(parentOperator);
            addToIndex(chainedCondition.nodeId, {
              conditionId,
              sourceNodeId: chainedCondition.nodeId,
              dependsOn: parentDependsOn,
              operator: finalOp,
              showWhen: parentShowWhen,
              actionType
            });
          } else {
            const targetNodeId = extractNodeIdFromRef(targetRef);
            // 🔥 FIX: Si le parent vient déjà d'un fallback (inverted=true), 
            // son opérateur est déjà inversé, on n'inverse pas une deuxième fois !
            // Sinon, on inverse normalement car le fallback s'applique quand la condition est FAUSSE
            const finalOp = inverted ? parentOperator : invertOperator(parentOperator);

            addToIndex(targetNodeId, {
              conditionId,
              sourceNodeId: chainedCondition.nodeId,
              dependsOn: parentDependsOn,
              operator: finalOp,
              showWhen: parentShowWhen,
              actionType
            });
          }
        }
      }
    }
  };
  
  // Parser chaque condition
  for (const condition of Object.values(conditionsById)) {
    if (!condition.conditionSet) continue;
    
    const conditionSet = condition.conditionSet as {
      branches?: Array<{
        when?: { op?: string; left?: { ref?: string }; right?: { ref?: string } };
        actions?: Array<{ type?: string; nodeIds?: string[] }>;
      }>;
      fallback?: {
        actions?: Array<{ type?: string; nodeIds?: string[] }>;
      };
    };
    
    // === PARSER LES BRANCHES ===
    for (const branch of conditionSet.branches || []) {
      if (!branch.when) continue;
      
      const when = branch.when;
      const operator = when.op || '==';
      const dependsOn = when.left?.ref ? extractNodeIdFromRef(when.left.ref) : '';
      const showWhen = when.right?.ref ? extractNodeIdFromRef(when.right.ref) : '';
      
      if (!dependsOn) continue;
      
      for (const action of branch.actions || []) {
        const actionType = (action.type?.toUpperCase() || 'SHOW') as 'SHOW' | 'HIDE';
        
        for (const targetRef of action.nodeIds || []) {
          if (targetRef.startsWith('condition:')) {
            // Résoudre la condition chaînée
            resolveConditionTargets(targetRef.substring(10), dependsOn, operator, showWhen, false, new Set([condition.id]));
          } else if (targetRef.startsWith('node-formula:') || targetRef.startsWith('node-table:') || targetRef.startsWith('node-variable:')) {
            // 🔧 FIX: node-formula: etc. targets = formula selection on the condition's own node
            addToIndex(condition.nodeId, {
              conditionId: condition.id,
              sourceNodeId: condition.nodeId,
              dependsOn,
              operator,
              showWhen,
              actionType
            });
          } else {
            const targetNodeId = extractNodeIdFromRef(targetRef);
            addToIndex(targetNodeId, {
              conditionId: condition.id,
              sourceNodeId: condition.nodeId,
              dependsOn,
              operator,
              showWhen,
              actionType
            });
          }
        }
      }
    }
    
    // === PARSER LE FALLBACK (SINON) ===
    if (conditionSet.fallback?.actions && conditionSet.branches?.[0]?.when) {
      // Le fallback hérite du when de la première branche mais avec opérateur inversé
      const firstBranch = conditionSet.branches[0];
      const when = firstBranch.when!;
      const dependsOn = when.left?.ref ? extractNodeIdFromRef(when.left.ref) : '';
      const showWhen = when.right?.ref ? extractNodeIdFromRef(when.right.ref) : '';
      const originalOp = when.op || '==';
      
      // Inverser l'opérateur pour le fallback (avec normalisation)
      const invertedOp = invertOperator(originalOp);
      
      if (dependsOn) {
        for (const action of conditionSet.fallback.actions) {
          const actionType = (action.type?.toUpperCase() || 'SHOW') as 'SHOW' | 'HIDE';
          
          for (const targetRef of action.nodeIds || []) {
            if (targetRef.startsWith('condition:')) {
              // Résoudre la condition chaînée (avec opérateur inversé hérité)
              resolveConditionTargets(targetRef.substring(10), dependsOn, invertedOp, showWhen, true, new Set([condition.id]));
            } else if (targetRef.startsWith('node-formula:') || targetRef.startsWith('node-table:') || targetRef.startsWith('node-variable:')) {
              // 🔧 FIX: node-formula: etc. targets = formula selection on the condition's own node
              addToIndex(condition.nodeId, {
                conditionId: condition.id,
                sourceNodeId: condition.nodeId,
                dependsOn,
                operator: invertedOp,
                showWhen,
                actionType
              });
            } else {
              const targetNodeId = extractNodeIdFromRef(targetRef);
              addToIndex(targetNodeId, {
                conditionId: condition.id,
                sourceNodeId: condition.nodeId,
                dependsOn,
                operator: invertedOp,
                showWhen,
                actionType
              });
            }
          }
        }
      }
    }
  }
  
  return index;
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
  /** 🚀 NOUVEAU: Récupère les conditions d'un noeud depuis le cache batch */
  getConditionsForNode: (nodeId: string) => BatchCondition[];
  /** 🚀 NOUVEAU: Récupère une condition par son ID */
  getConditionById: (conditionId: string) => BatchCondition | null;
  /** 🚀 NOUVEAU: Récupère la condition active d'un noeud */
  getActiveConditionForNode: (nodeId: string) => BatchCondition | null;
  /** 🚀 CRITIQUE: Récupère les conditions qui CIBLENT ce noeud (pour visibilité conditionnelle) */
  getConditionsTargetingNode: (nodeId: string) => InverseConditionInfo[];
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
        // 🚀 Charger les données de base, node-data ET conditions en parallèle
        const baseUrl = leadId
          ? `/api/tbl/batch/trees/${treeId}/all?leadId=${leadId}`
          : `/api/tbl/batch/trees/${treeId}/all`;
        const nodeDataUrl = `/api/tbl/batch/trees/${treeId}/node-data`;
        const conditionsUrl = `/api/tbl/batch/trees/${treeId}/conditions`;

        console.log(`🚀 [useTBLBatchData] Chargement batch pour tree ${treeId}...`);
        const startTime = performance.now();

        const [baseResponse, nodeDataResponse, conditionsResponse] = await Promise.all([
          api.get<{
            success: boolean;
            treeId: string;
            leadId: string | null;
            stats: Omit<TBLBatchData['stats'], 'nodesWithData' | 'nodesWithConditions'>;
            formulasByNode: TBLBatchData['formulasByNode'];
            valuesByNode: TBLBatchData['valuesByNode'];
            configsByNode: TBLBatchData['configsByNode'];
          }>(baseUrl),
          api.get<{
            success: boolean;
            treeId: string;
            totalNodesWithData: number;
            dataByNode: TBLBatchData['dataByNode'];
          }>(nodeDataUrl).catch(() => null), // Ne pas bloquer si node-data échoue
          api.get<{
            success: boolean;
            treeId: string;
            totalConditions: number;
            nodesWithConditions: number;
            conditionsByNode: TBLBatchData['conditionsByNode'];
            conditionsById: TBLBatchData['conditionsById'];
            activeConditionByNode: TBLBatchData['activeConditionByNode'];
          }>(conditionsUrl).catch(() => null) // Ne pas bloquer si conditions échoue
        ]);

        const duration = performance.now() - startTime;

        if (mountedRef.current && baseResponse?.success) {
          // 🚀 CRITIQUE: Construire l'index inversé des conditions AVANT de créer batchData
          const conditionsTargetingNode = buildConditionsTargetingIndex(conditionsResponse?.conditionsById);
          
          const data: TBLBatchData = {
            formulasByNode: baseResponse.formulasByNode || {},
            valuesByNode: baseResponse.valuesByNode || {},
            configsByNode: baseResponse.configsByNode || {},
            dataByNode: nodeDataResponse?.dataByNode || {},
            // 🚀 NOUVEAU: Conditions
            conditionsByNode: conditionsResponse?.conditionsByNode || {},
            conditionsById: conditionsResponse?.conditionsById || {},
            activeConditionByNode: conditionsResponse?.activeConditionByNode || {},
            // 🚀 CRITIQUE: Index inversé des conditions (SHOW/HIDE targets)
            conditionsTargetingNode,
            stats: {
              ...(baseResponse.stats || {
                totalNodes: 0,
                totalFormulas: 0,
                nodesWithFormulas: 0,
                nodesWithValues: 0,
                selectFields: 0
              }),
              nodesWithData: nodeDataResponse?.totalNodesWithData || 0,
              nodesWithConditions: conditionsResponse?.nodesWithConditions || 0
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
            `${data.stats.nodesWithData} node-data,`,
            `${data.stats.nodesWithConditions} conditions`
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
    
    // 🔥 CRITICAL FIX 07/01/2026: Ne JAMAIS fallback sur l'original pour les nœuds copiés!
    // Si c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1 n'a pas de config, c'est qu'elle n'a pas été chargée.
    // On ne doit PAS retourner la config de c071a466-5a0f-4b4e-afb0-fd69ac79d51a (l'original)!
    // Sinon on affiche les données de l'original au lieu de la copie.
    return batchData.configsByNode[nodeId] || null;
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

  // 🚀 NOUVEAU: Helper pour récupérer les conditions d'un nœud
  const getConditionsForNode = useCallback((nodeId: string): BatchCondition[] => {
    if (!batchData?.conditionsByNode) return [];
    
    if (batchData.conditionsByNode[nodeId]) {
      return batchData.conditionsByNode[nodeId];
    }
    
    if (nodeId.endsWith('-1')) {
      const baseId = nodeId.slice(0, -2);
      if (batchData.conditionsByNode[baseId]) {
        return batchData.conditionsByNode[baseId];
      }
    }
    
    if (!nodeId.endsWith('-1')) {
      const suffixedId = `${nodeId}-1`;
      if (batchData.conditionsByNode[suffixedId]) {
        return batchData.conditionsByNode[suffixedId];
      }
    }
    
    return [];
  }, [batchData]);

  // 🚀 NOUVEAU: Helper pour récupérer une condition par son ID
  const getConditionById = useCallback((conditionId: string): BatchCondition | null => {
    if (!batchData?.conditionsById) return null;
    return batchData.conditionsById[conditionId] || null;
  }, [batchData]);

  // 🚀 NOUVEAU: Helper pour récupérer la condition active d'un nœud
  const getActiveConditionForNode = useCallback((nodeId: string): BatchCondition | null => {
    if (!batchData?.activeConditionByNode || !batchData?.conditionsById) return null;
    
    const activeId = batchData.activeConditionByNode[nodeId];
    if (!activeId) return null;
    
    return batchData.conditionsById[activeId] || null;
  }, [batchData]);

  // 🚀 CRITIQUE: Helper pour récupérer les conditions qui CIBLENT ce noeud (visibilité conditionnelle)
  const getConditionsTargetingNode = useCallback((nodeId: string): InverseConditionInfo[] => {
    if (!batchData?.conditionsTargetingNode) {
      return [];
    }
    
    // Essayer d'abord l'ID exact
    if (batchData.conditionsTargetingNode[nodeId]) {
      return batchData.conditionsTargetingNode[nodeId];
    }
    
    // Fallback: essayer des variantes connues de l'ID
    const variants: string[] = [];
    
    // Suffixe "-1" (copies de repeater)
    if (nodeId.endsWith('-1')) {
      variants.push(nodeId.slice(0, -2));
    } else {
      variants.push(`${nodeId}-1`);
    }
    
    // Suffixe "-sum-total" (champs Total calculés)
    if (nodeId.endsWith('-sum-total')) {
      variants.push(nodeId.replace(/-sum-total$/, ''));
    } else {
      variants.push(`${nodeId}-sum-total`);
    }
    
    for (const variant of variants) {
      if (batchData.conditionsTargetingNode[variant]) {
        return batchData.conditionsTargetingNode[variant];
      }
    }
    
    return [];
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
    getConditionsForNode,
    getConditionById,
    getActiveConditionForNode,
    getConditionsTargetingNode,
    refresh
  };
};

export default useTBLBatchData;

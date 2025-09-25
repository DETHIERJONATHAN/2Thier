/**
 * 🎣 useTreeData - Hook pour la gestion des données d'arbre
 * 
 * Centralise toutes les opérations CRUD sur les arbres et nœuds
 * Utilise notre API centralisée TreeBranchLeaf
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { message } from 'antd';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import type { 
  TreeBranchLeafTree, 
  TreeBranchLeafNode, 
  NodeTypeKey,
  FieldTypeKey
} from '../types';

interface CreateNodeData {
  type: NodeTypeKey;
  label: string;
  parentId?: string;
  fieldType?: FieldTypeKey;
  order?: number;
}

interface UseTreeDataReturn {
  // État
  tree: TreeBranchLeafTree | null;
  nodes: TreeBranchLeafNode[] | null;
  loading: boolean;
  error: string | null;

  // Actions sur l'arbre
  createTree: (data: Partial<TreeBranchLeafTree>) => Promise<TreeBranchLeafTree | null>;
  updateTree: (tree: TreeBranchLeafTree) => Promise<TreeBranchLeafTree | null>;
  deleteTree: (treeId: string) => Promise<boolean>;
  duplicateTree: (treeId: string) => Promise<TreeBranchLeafTree | null>;

  // Actions sur les nœuds
  createNode: (data: CreateNodeData) => Promise<TreeBranchLeafNode | null>;
  updateNode: (node: Partial<TreeBranchLeafNode> & { id: string }) => Promise<TreeBranchLeafNode | null>;
  deleteNode: (nodeId: string) => Promise<boolean>;
  moveNode: (nodeId: string, targetId?: string, position?: 'before' | 'after' | 'child') => Promise<boolean>;
  copyNode: (nodeId: string) => Promise<boolean>;
  pasteNode: (targetId?: string, position?: 'before' | 'after' | 'child') => Promise<TreeBranchLeafNode | null>;

  // Actions sur les capacités
  activateCapability: (nodeId: string, capability: string, config?: Record<string, unknown>) => Promise<boolean>;
  deactivateCapability: (nodeId: string, capability: string) => Promise<boolean>;

  // Utilitaires
  refresh: () => Promise<void>;
  getNode: (nodeId: string) => TreeBranchLeafNode | null;
  getChildren: (nodeId?: string) => TreeBranchLeafNode[];
  getPath: (nodeId: string) => TreeBranchLeafNode[];,
}

export const useTreeData = (
  treeId?: string, 
  organizationId?: string
): UseTreeDataReturn => {
  // =============================================================================
  // 🎛️ STATE - État local
  // =============================================================================
  
  const [tree, setTree] = useState<TreeBranchLeafTree | null>(null);
  const [nodes, setNodes] = useState<TreeBranchLeafNode[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);

  // =============================================================================
  // 🎣 HOOKS
  // =============================================================================
  
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook, [apiHook]);

  // =============================================================================
  // 📊 COMPUTED - Valeurs calculées
  // =============================================================================
  
  const getNode = useCallback((nodeId: string): TreeBranchLeafNode | null => {
    if (!nodes) return null;
    return nodes.find(node => node.id === nodeId) || null;
  }, [nodes]);

  const getChildren = useCallback((nodeId?: string): TreeBranchLeafNode[] => {
    if (!nodes) return [];
    return nodes.filter(node => node.parentId === nodeId).sort((a, b) => a.order - b.order);
  }, [nodes]);

  const getPath = useCallback((nodeId: string): TreeBranchLeafNode[] => {
    const path: TreeBranchLeafNode[] = [];
    let currentNode = getNode(nodeId);
    
    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? getNode(currentNode.parentId) : null;
    }
    
    return path;
  }, [getNode]);

  // =============================================================================
  // 🔄 DATA LOADING - Chargement des données
  // =============================================================================
  
  const loadTree = useCallback(async () => {
    if (!treeId) return;

    setLoading(true);
    setError(null);

    try {
      const treeResponse = await api.get(`/api/treebranchleaf/trees/${treeId}`);
      setTree(treeResponse);

      const nodesResponse = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
      setNodes(nodesResponse);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      message.error(`Impossible de charger l'arbre : ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [api, treeId]);

  const refresh = useCallback(async () => {
    await loadTree();
  }, [loadTree]);

  // Chargement initial
  useEffect(() => {
    if (treeId) {
      loadTree();
    } else {
      setTree(null);
      setNodes(null);
    }
  }, [loadTree, treeId]);

  // =============================================================================
  // 🌳 TREE OPERATIONS - Opérations sur l'arbre
  // =============================================================================
  
  const createTree = useCallback(async (data: Partial<TreeBranchLeafTree>) => {
    if (!organizationId) return null;

    setLoading(true);
    try {
      const newTree = await api.post('/api/treebranchleaf/trees', {
        ...data,
        organizationId,
        status: 'draft',
        version: '1.0.0'
      message.success('Arbre créé avec succès');
      return newTree;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de création';
      message.error(`Impossible de créer l'arbre : ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, organizationId]);

  const updateTree = useCallback(async (updatedTree: TreeBranchLeafTree) => {
    setLoading(true);
    try {
      const result = await api.put(`/api/treebranchleaf/trees/${updatedTree.id}`, updatedTree);
      setTree(result);
      message.success('Arbre mis à jour');
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour';
      message.error(`Impossible de mettre à jour l'arbre : ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const deleteTree = useCallback(async (treeIdToDelete: string) => {
    try {
      await api.delete(`/api/treebranchleaf/trees/${treeIdToDelete}`);
      
      // Reset si on supprime l'arbre actuel
      if (treeIdToDelete === treeId) {
        setTree(null);
        setNodes(null);
      }
      
      message.success('Arbre supprimé');
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de suppression';
      message.error(`Impossible de supprimer l'arbre : ${errorMessage}`);
      return false;
    }
  }, [api, treeId]);

  const duplicateTree = useCallback(async (treeIdToDuplicate: string) => {
    try {
      const result = await api.post(`/api/treebranchleaf/trees/${treeIdToDuplicate}/duplicate`);
      message.success('Arbre dupliqué avec succès');
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de duplication';
      message.error(`Impossible de dupliquer l'arbre : ${errorMessage}`);
      return null;
    }
  }, [api]);

  // =============================================================================
  // 🍃 NODE OPERATIONS - Opérations sur les nœuds
  // =============================================================================
  
  const createNode = useCallback(async (data: CreateNodeData) => {
    if (!tree) return null;

    try {
      // Calculer l'ordre
      const siblings = getChildren(data.parentId);
      const order = siblings.length;

      const newNode = await api.post(`/api/treebranchleaf/trees/${tree.id}/nodes`, {
        ...data,
        treeId: tree.id,
        order,
        isRequired: false,
        isVisible: true,
        isActive: true,
        metadata: {}
      // Mettre à jour la liste locale
      setNodes(prev => prev ? [...prev, newNode] : [newNode]);
      message.success(`${data.type === 'branch' ? 'Branche' : 'Feuille'} créée`);
      return newNode;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de création';
      message.error(`Impossible de créer le nœud : ${errorMessage}`);
      return null;
    }
  }, [api, tree, getChildren]);

  const updateNode = useCallback(async (nodeData: Partial<TreeBranchLeafNode> & { id: string }) => {
    if (!tree) return null;

    try {
      const updatedNode = await api.put(
        `/api/treebranchleaf/trees/${tree.id}/nodes/${nodeData.id}`, 
        nodeData
      );

      // Mettre à jour la liste locale
      setNodes(prev => 
        prev ? prev.map(node => node.id === nodeData.id ? updatedNode : node) : [updatedNode]
      );

      return updatedNode;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour';
      message.error(`Impossible de mettre à jour le nœud : ${errorMessage}`);
      return null;
    }
  }, [api, tree]);

  const deleteNode = useCallback(async (nodeId: string) => {
    if (!tree) return false;

    try {
      await api.delete(`/api/treebranchleaf/trees/${tree.id}/nodes/${nodeId}`);

      // Supprimer de la liste locale
      setNodes(prev => prev ? prev.filter(node => node.id !== nodeId) : null);
      message.success('Nœud supprimé');
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de suppression';
      message.error(`Impossible de supprimer le nœud : ${errorMessage}`);
      return false;
    }
  }, [api, tree]);

  const moveNode = useCallback(async (
    nodeId: string, 
    targetId?: string, 
    position: 'before' | 'after' | 'child' = 'child'
  ) => {
    if (!tree) return false;

    try {
      await api.patch(`/api/treebranchleaf/trees/${tree.id}/nodes/${nodeId}/move`, {
        targetId,
        position
      // Recharger les données pour avoir l'ordre correct
      await refresh();
      message.success('Nœud déplacé');
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de déplacement';
      message.error(`Impossible de déplacer le nœud : ${errorMessage}`);
      return false;
    }
  }, [api, tree, refresh]);

  const copyNode = useCallback(async (nodeId: string) => {
    setCopiedNodeId(nodeId);
    message.success('Nœud copié dans le presse-papiers');
    return true;
  }, []);

  const pasteNode = useCallback(async (
    targetId?: string, 
    position: 'before' | 'after' | 'child' = 'child'
  ) => {
    if (!copiedNodeId || !tree) return null;

    try {
      const result = await api.post(`/api/treebranchleaf/trees/${tree.id}/nodes/${copiedNodeId}/duplicate`, {
        targetId,
        position
      await refresh();
      setCopiedNodeId(null);
      message.success('Nœud collé avec succès');
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de collage';
      message.error(`Impossible de coller le nœud : ${errorMessage}`);
      return null;
    }
  }, [api, copiedNodeId, tree, refresh]);

  // =============================================================================
  // 🧩 CAPABILITY OPERATIONS - Opérations sur les capacités
  // =============================================================================
  
  const activateCapability = useCallback(async (
    nodeId: string, 
    capability: string, 
    config: Record<string, unknown> = {}
  ) => {
    const node = getNode(nodeId);
    if (!node) return false;

    try {
      const capabilityFlags = {
        [`has${capability.charAt(0).toUpperCase() + capability.slice(1)}`]: true
      };

      const configField = `${capability}Config`;
      
      await updateNode({
        id: nodeId,
        ...capabilityFlags,
        [configField]: config
      message.success(`Capacité ${capability} activée`);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'activation';
      message.error(`Impossible d'activer la capacité : ${errorMessage}`);
      return false;
    }
  }, [getNode, updateNode]);

  const deactivateCapability = useCallback(async (nodeId: string, capability: string) => {
    const node = getNode(nodeId);
    if (!node) return false;

    try {
      const capabilityFlags = {
        [`has${capability.charAt(0).toUpperCase() + capability.slice(1)}`]: false
      };

      const configField = `${capability}Config`;
      
      await updateNode({
        id: nodeId,
        ...capabilityFlags,
        [configField]: null
      message.success(`Capacité ${capability} désactivée`);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de désactivation';
      message.error(`Impossible de désactiver la capacité : ${errorMessage}`);
      return false;
    }
  }, [getNode, updateNode]);

  // =============================================================================
  // 🎯 RETURN - Valeur de retour
  // =============================================================================
  
  return {
    // État
    tree,
    nodes,
    loading,
    error,

    // Actions sur l'arbre
    createTree,
    updateTree,
    deleteTree,
    duplicateTree,

    // Actions sur les nœuds
    createNode,
    updateNode,
    deleteNode,
    moveNode,
    copyNode,
    pasteNode,

    // Actions sur les capacités
    activateCapability,
    deactivateCapability,

    // Utilitaires
    refresh,
    getNode,
    getChildren,
    getPath
  };
};

export default useTreeData;

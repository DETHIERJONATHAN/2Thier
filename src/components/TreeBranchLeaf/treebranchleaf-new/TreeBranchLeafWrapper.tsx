/**
 * 🌲 TreeBranchLeaf - Wrapper de connexion
 * 
 * Fichier de connexion principal qui charge les données depuis notre API centralisée
 * et initialise le système TreeBranchLeaf complet
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Spin, Alert } from 'antd';
import { useParams } from 'react-router-dom';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../auth/useAuth';
import TreeBranchLeafEditor from './TreeBranchLeafEditor';
import type { TreeBranchLeafTree, TreeBranchLeafNode, NodeTypeKey } from './types';

interface TreeBranchLeafWrapperProps {
  // Props optionnelles pour la flexibilité
  treeId?: string;
  mode?: 'edit' | 'view';
}

const TreeBranchLeafWrapper: React.FC<TreeBranchLeafWrapperProps> = ({
  treeId: propTreeId,
  mode = 'edit'
}) => {
  // Récupérer l'ID depuis l'URL si disponible
  const { id: urlTreeId } = useParams<{ id: string }>();
  const effectiveTreeId = propTreeId || urlTreeId;

  // État
  const [trees, setTrees] = useState<TreeBranchLeafTree[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeBranchLeafTree | null>(null);
  const [nodes, setNodes] = useState<TreeBranchLeafNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handleNodeMetadataUpdate, setHandleNodeMetadataUpdate] = useState<((node: TreeBranchLeafNode) => void) | null>(null);

  // Hooks
  const { user } = useAuth();
  const apiHook = useAuthenticatedApi();
  
  // Stabiliser l'API pour éviter les re-rendus
  const api = useMemo(() => apiHook.api, [apiHook]);

  // Fonctions utilitaires
  const buildNodeHierarchy = useCallback((flatNodes: TreeBranchLeafNode[]): TreeBranchLeafNode[] => {
    if (!flatNodes || flatNodes.length === 0) {
      // console.log(...) // ✨ Log réduit
      return [];
    }
    
    // ✅ Filtrer uniquement les nœuds TEMPLATES (parentId: null, isSharedReference: true)
    // Les options SELECT qui UTILISENT des références ne doivent PAS être filtrées
    const visibleNodes = flatNodes.filter(node => 
      !(node.isSharedReference === true && node.sharedReferenceId === null && node.parentId === null)
    );
    
    // Créer une map pour un accès rapide
    const nodeMap = new Map<string, TreeBranchLeafNode>();
    const rootNodes: TreeBranchLeafNode[] = [];
    
    // D'abord, créer tous les nœuds avec une propriété children vide
    visibleNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });
    
    // Ensuite, construire la hiérarchie
    visibleNodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!;
      
      if (node.parentId && nodeMap.has(node.parentId)) {
        // Ce nœud a un parent, l'ajouter aux enfants du parent
        const parent = nodeMap.get(node.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(nodeWithChildren);
        // console.log(`📎 [buildNodeHierarchy] Nœud ${node.label} (${node.type}) ajouté sous parent ${parent.label} (${parent.type})`); // ✨ Log réduit
      } else {
        // Nœud racine (pas de parent ou parent introuvable)
        rootNodes.push(nodeWithChildren);
        if (node.parentId) {
          // console.log(`🚨 [buildNodeHierarchy] PROBLÈME: ${node.label} (${node.type}) a parentId=${node.parentId?.substring(0, 8)}... mais parent INTROUVABLE !`); // ✨ Log réduit
        } else {
          // console.log(`🌱 [buildNodeHierarchy] Nœud racine: ${node.label} (${node.type}) - parentId: ${node.parentId}`); // ✨ Log réduit
        }
      }
    });
    
    // Trier les nœuds par order
    const sortNodesByOrder = (nodes: TreeBranchLeafNode[]) => {
      nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortNodesByOrder(node.children);
        }
      });
    };
    
    sortNodesByOrder(rootNodes);
    
    // console.log(...) // ✨ Log réduit
    /* {
      // flatCount: flatNodes.length,
      // rootCount: rootNodes.length,
      // hierarchy: rootNodes.slice(0, 2), // Premiers 2 pour debug
      // rootLabels: rootNodes.map(n => n.label)
    } */
    
    if (rootNodes.length === 0) {
      // console.warn('🚨 [buildNodeHierarchy] AUCUN NŒUD RACINE TROUVÉ !'); // ✨ Log réduit
    }
    
    return rootNodes;
  }, []);

  const loadTreeNodes = useCallback(async (treeId: string) => {
    try {
      const flatNodesData = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes`);
      
      // Transformer les données plates en hiérarchie
      const hierarchicalNodes = buildNodeHierarchy(flatNodesData || []);
      
      setNodes(hierarchicalNodes);
    } catch (err) {
      console.error('Erreur lors du chargement des nœuds:', err);
      throw new Error('Impossible de charger les nœuds de l\'arbre');
    }
  }, [api, buildNodeHierarchy]);

  // Chargement initial des données
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Utiliser notre API centralisée
      const treesData = await api.get('/api/treebranchleaf/trees');
      
      // 🐛 DEBUG: Logs pour vérifier les données de l'API
      // console.log(...) // ✨ Log réduit
      /* {
        // treesData: treesData,
        // treesCount: treesData?.length || 0
      } */
      
      setTrees(treesData);

      // Si un treeId spécifique est demandé, le sélectionner
      if (effectiveTreeId) {
        const specificTree = treesData.find((t: TreeBranchLeafTree) => t.id === effectiveTreeId);
        if (specificTree) {
          setSelectedTree(specificTree);
          await loadTreeNodes(effectiveTreeId);
        } else {
          setError(`Arbre avec l'ID ${effectiveTreeId} non trouvé`);
        }
      } else if (treesData.length > 0) {
        // Sinon, sélectionner le premier arbre disponible
        setSelectedTree(treesData[0]);
        await loadTreeNodes(treesData[0].id);
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données TreeBranchLeaf');
    } finally {
      setLoading(false);
    }
  }, [effectiveTreeId, loadTreeNodes, api]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Gestionnaires d'événements pour le TreeBranchLeafEditor
  const handleTreeChange = async (tree: TreeBranchLeafTree) => {
    setSelectedTree(tree);
    await loadTreeNodes(tree.id);
  };

  const handleTreesUpdate = (updatedTrees: TreeBranchLeafTree[]) => {
    setTrees(updatedTrees);
  };

  const flattenNodes = useCallback((input: TreeBranchLeafNode[] | undefined | null): TreeBranchLeafNode[] => {
    if (!input || input.length === 0) return [];

    const flat: TreeBranchLeafNode[] = [];
    const stack: TreeBranchLeafNode[] = [...input];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const childNodes = current.children;

      flat.push({ ...current, children: undefined });

      if (childNodes && childNodes.length > 0) {
        for (let i = childNodes.length - 1; i >= 0; i -= 1) {
          stack.push(childNodes[i]);
        }
      }
    }

    return flat;
  }, []);

  const handleNodesUpdate = useCallback((updatedNodes: TreeBranchLeafNode[]) => {
    // Si les nœuds ont déjà une hiérarchie (children présents), c'est un reload serveur
    // → Utiliser directement sans reconstruction
    const hasHierarchy = updatedNodes.some(n => n.children && n.children.length > 0);
    
    if (hasHierarchy) {
      setNodes(updatedNodes);
      return;
    }
    
    // Sinon, vérifier si c'est juste une mise à jour de propriétés
    setNodes(prev => {
      const currentFlatNodes = flattenNodes(prev);
      const newFlatNodes = flattenNodes(updatedNodes);
      
      const sameStructure = currentFlatNodes.length === newFlatNodes.length &&
        currentFlatNodes.every(n => newFlatNodes.some(nn => nn.id === n.id));
      
      if (sameStructure) {
        return updatedNodes;
      } else {
        const normalizedFlatNodes = flattenNodes(updatedNodes);
        return buildNodeHierarchy(normalizedFlatNodes);
      }
    });
  }, [flattenNodes, buildNodeHierarchy]);

  const handleNodeCreate = useCallback(async (data: {
    type: NodeTypeKey;
    label: string;
    parentId?: string;
    fieldType?: string;
  }) => {
    if (!selectedTree) return null;

    try {
      const newNode = await api.post(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`, data);
      
      // Recharger tous les nœuds pour garantir la cohérence
      await loadTreeNodes(selectedTree.id);
      
      return newNode;
    } catch (error) {
      console.error("Erreur lors de la création du nœud:", error);
      return null;
    }
  }, [api, selectedTree, loadTreeNodes]);

  // Affichage conditionnel
  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {/* AntD v5: tip doit être utilisé avec un enfant ou en fullscreen */}
        <Spin size="large" tip="Chargement de TreeBranchLeaf...">
          <div style={{ width: 1, height: 1 }} />
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={loadInitialData}>
              Réessayer
            </button>
          }
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Authentification requise"
          description="Vous devez être connecté pour accéder à TreeBranchLeaf"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // Rendu principal
  return (
    <TreeBranchLeafEditor
      trees={trees}
      selectedTree={selectedTree}
      nodes={nodes}
      readOnly={mode === 'view'}
      onTreeChange={handleTreeChange}
      onTreesUpdate={handleTreesUpdate}
      onNodesUpdate={handleNodesUpdate}
      onNodeCreate={handleNodeCreate} // Passer la fonction de création
      onSetHandleNodeMetadataUpdate={setHandleNodeMetadataUpdate}
      handleNodeMetadataUpdate={handleNodeMetadataUpdate}
    />
  );
};

export default TreeBranchLeafWrapper;

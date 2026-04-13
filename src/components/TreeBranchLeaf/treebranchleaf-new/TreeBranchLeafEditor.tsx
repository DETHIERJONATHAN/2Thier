
/**
 * 🌳 TreeBranchLeafEditor - Composant principal
 * 
 * Layout en 3 colonnes :
 * - Gauche : Palette (créer)
 * - Milieu : Structure (organiser)
 * - Droite : Paramètres (configurer)
 * 
 * + Module du haut : Gestionnaire d'arbres
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Row, Col, Layout, Card, Spin, Segmented, Grid } from 'antd';
import { DndContext } from '@dnd-kit/core';

// Composants
import TreeManager from './components/TreeManager/TreeManager';
import Palette from './components/Palette/Palette';
import Structure from './components/Structure/Structure';
import Parameters from './components/Parameters/Parameters';
import SimplePreview from './components/Preview/SimplePreview';

// Utils
// import { performanceLogger } from './utils/performanceLogger';

// Hooks et utils
// import { useTreeData } from './hooks/useTreeData';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { message } from 'antd';

// Helper pour récupérer l'organization courante depuis un global éventuellement injecté
declare global {
  interface Window { __CURRENT_ORG_ID?: string }
}
import { TreeBranchLeafRegistry } from './core/registry';

// Types
import type { 
  TreeBranchLeafTree, 
  TreeBranchLeafNode, 
  UIState, 
  DragItem, 
  DropTargetData,
  NodeTypeKey
} from './types';

const { Content } = Layout;

/**
 * 🔧 Utilitaire : Aplatir une hiérarchie de nœuds en tableau plat
 */
const flattenNodes = (input: TreeBranchLeafNode[] | undefined | null): TreeBranchLeafNode[] => {
  if (!input || input.length === 0) return [];
  const result: TreeBranchLeafNode[] = [];
  const traverse = (node: TreeBranchLeafNode) => {
    result.push(node);
    if (node.children && node.children.length > 0) {
      node.children.forEach(traverse);
    }
  };
  input.forEach(traverse);
  return result;
};

interface TreeBranchLeafEditorProps {
  trees: TreeBranchLeafTree[];
  selectedTree: TreeBranchLeafTree | null;
  nodes: TreeBranchLeafNode[];
  // Optionnels passés par le wrapper
  flatNodes?: TreeBranchLeafNode[];
  onTreesUpdate?: (trees: TreeBranchLeafTree[]) => void;
  onNodeCreate?: (data: { type: NodeTypeKey; label: string; parentId?: string; fieldType?: string }) => Promise<TreeBranchLeafNode | null>;
  readOnly?: boolean;
  onTreeChange: (tree: TreeBranchLeafTree) => void;
  onNodesUpdate: (nodes: TreeBranchLeafNode[]) => void;
  onSetHandleNodeMetadataUpdate?: (handler: (node: TreeBranchLeafNode) => void) => void;
  handleNodeMetadataUpdate?: ((node: TreeBranchLeafNode) => void) | null;
}

const TreeBranchLeafEditor: React.FC<TreeBranchLeafEditorProps> = ({
  trees,
  selectedTree: selectedTreeProp,
  nodes: propNodes,
  readOnly = false,
  onTreeChange,
  onNodesUpdate,
  onSetHandleNodeMetadataUpdate,
  handleNodeMetadataUpdate
}) => {
  // Fallback automatique : si aucun arbre sélectionné fourni par le parent, on prend le premier disponible
  const selectedTree = selectedTreeProp || (trees && trees.length > 0 ? trees[0] : null);
  // Hook pour l'API authentifiée
  const { api } = useAuthenticatedApi();
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.lg ?? false;
  const isMobile = !(screens.md ?? false);
  // =============================================================================
  // 🎛️ STATE - État local
  // =============================================================================
  
  const [uiState, setUIState] = useState<UIState>({
    selectedNode: undefined,
    expandedNodes: new Set<string>(),
    dragState: {
      isDragging: false,
      draggedItem: undefined,
      hoveredTarget: undefined,
      validDrop: false
    },
    searchState: {
      query: '',
      filters: {}
    },
    panelState: {
      activePanel: 'properties',
      openCapabilities: new Set(),
      previewMode: false
    }
  });
  const renderInfoRef = useRef({ count: 0 });
  renderInfoRef.current.count += 1;
  // Log de rendu temporairement supprimé

  // UIState monitoring temporairement supprimé

  // PropNodes monitoring temporairement supprimé

  const _prevTreesSignatureRef = useRef<string | null>(null);
  // useEffect(() => {
    // const signature = JSON.stringify({
    //   count: trees?.length || 0,
    //   ids: (trees || []).slice(0, 10).map((t) => t.id)
    // });
    // if (prevTreesSignatureRef.current !== signature) {
    //   // console.log('🌿 [TreeBranchLeafEditor] trees prop changed', {
    //   //   previous: prevTreesSignatureRef.current,
    //   //   next: signature,
    //   //   treesSample: (trees || []).slice(0, 3)
    //   // });
    //   prevTreesSignatureRef.current = signature;
    // }
  // }, [trees]);

  // useEffect(() => {
    // console.log('🌿 [TreeBranchLeafEditor] selectedTree changed', {
    //   selectedTreeId: selectedTree?.id,
    //   name: selectedTree?.name
    // });
  // }, [selectedTree?.id, selectedTree?.name]);

  // Ellipsis monitoring temporairement désactivé

  const [activeMobileTab, setActiveMobileTab] = useState<string>('structure');
  // Ref pour accéder aux nœuds courants dans les callbacks sans dépendre de propNodes
  const nodesRef = useRef<TreeBranchLeafNode[]>(propNodes || []);
  useEffect(() => {
    // ✅ Synchroniser silencieusement (pas de log - c'est normal après drag & drop)
    nodesRef.current = propNodes || [];
  }, [propNodes]);
  
  // 🔔 Écouter les événements de mise à jour de node (pour hasData, hasFormula, etc.)
  useEffect(() => {
    const handleNodeUpdated = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{ node?: TreeBranchLeafNode; treeId?: string | number; nodeId?: string }>;
        const { node: updatedNode, nodeId } = customEvent.detail || {};
        
        if (!updatedNode && !nodeId) return;
        
        // Mettre à jour le selectedNode si c'est lui qui a été modifié
        setUIState(prev => {
          const targetId = updatedNode?.id || nodeId;
          if (!prev.selectedNode || prev.selectedNode.id !== targetId) {
            return prev;
          }
          // Fusionner les propriétés mises à jour (notamment hasData, hasFormula, hasLink, etc.)
          const merged = { ...prev.selectedNode, ...updatedNode } as TreeBranchLeafNode;
          return { ...prev, selectedNode: merged };
        });
      } catch (e) {
        console.error('❌ [TreeBranchLeafEditor] handleNodeUpdated error:', e);
      }
    };
    
    window.addEventListener('tbl-node-updated', handleNodeUpdated);
    return () => window.removeEventListener('tbl-node-updated', handleNodeUpdated);
  }, []);
  
  // Actions sur les arbres
  const createTree = useCallback(async (data: Partial<TreeBranchLeafTree>) => {
    try {
      const created = await api.post('/api/treebranchleaf/trees', data);
      // Recharger la liste complète des arbres
      const all = await api.get('/api/treebranchleaf/trees');
      onTreesUpdate?.(all || []);
      // Sélectionner le nouvel arbre
      if (created?.id) {
        onTreeChange(created);
      }
      return created as TreeBranchLeafTree;
    } catch (error) {
      console.error('❌ Erreur création arbre:', error);
      return null;
    }
  }, [api, onTreeChange]);
  
  const updateTree = useCallback(async (data: Partial<TreeBranchLeafTree> & { id: string }) => {
    try {
      const updated = await api.put(`/api/treebranchleaf/trees/${data.id}`, data);
      const all = await api.get('/api/treebranchleaf/trees');
      onTreesUpdate?.(all || []);
      // Si c'est l'arbre sélectionné, s'assurer qu'il est bien resélectionné
      if (selectedTree && updated?.id === selectedTree.id) {
        onTreeChange(updated);
      }
      return updated as TreeBranchLeafTree;
    } catch (error) {
      console.error('❌ Erreur mise à jour arbre:', error);
      return null;
    }
  }, [api, onTreeChange, selectedTree]);
  
  const deleteTree = useCallback(async (treeId: string) => {
    try {
      await api.delete(`/api/treebranchleaf/trees/${treeId}`);
      const all = await api.get('/api/treebranchleaf/trees');
      onTreesUpdate?.(all || []);
      // Si on a supprimé l'arbre courant, sélectionner le premier restant
      if (selectedTree?.id === treeId) {
        const next = (all || [])[0];
        if (next) onTreeChange(next);
      }
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression arbre:', error);
      return false;
    }
  }, [api, onTreeChange, selectedTree]);
  
  const moveNode = useCallback(async (
    nodeId: string,
    targetId?: string,
    position: 'before' | 'after' | 'child' = 'child'
  ): Promise<boolean> => {
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return false;
    }

    try {
      // 🎯 OPTIMISTE : Mettre à jour l'ordre LOCALEMENT avant l'appel serveur
      const currentFlat = flattenNodes(nodesRef.current);
      const draggedNode = currentFlat.find(n => n.id === nodeId);
      const targetNode = currentFlat.find(n => n.id === targetId);
      
      if (!draggedNode || !targetNode) {
        console.error('❌ Nœud source ou cible introuvable');
        return false;
      }
      
      // 🚨 VALIDATION HIÉRARCHIQUE CLIENT-SIDE (avant mise à jour optimiste)
      let newParentId: string | null;
      
      if (position === 'child') {
        newParentId = targetId!;
      } else {
        newParentId = targetNode.parentId || null;
      }
      
      // Récupérer le nouveau parent pour validation
      const newParent = newParentId ? currentFlat.find(n => n.id === newParentId) : null;
      
      // Règles hiérarchiques TreeBranchLeaf
      if (draggedNode.type === 'leaf_option') {
        // Les options peuvent être sous :
        // 1. Des champs SELECT (leaf_ avec subType='SELECT')
        // 2. Des branches de niveau 2+ (branches sous branches = SELECT)
        if (newParent) {
          const isSelectField = newParent.type?.startsWith('leaf_') && newParent.subType === 'SELECT';
          const isSelectBranch = newParent.type === 'branch' && newParent.parentId !== null;
          
          if (!isSelectField && !isSelectBranch) {
            console.error('❌ Les options ne peuvent être déplacées que sous des champs SELECT ou des branches de niveau 2+');
            return false;
          }
        }
      } else if (draggedNode.type?.startsWith('leaf_')) {
        // ✅ Les champs peuvent être déplacés à peu près n'importe où
        // Sous des branches, d'autres champs, sections, etc.
        // La seule restriction: pas sous les options SELECT
        if (newParent && newParent.type?.startsWith('leaf_') && newParent.subType === 'SELECT') {
          console.error('❌ Les champs ne peuvent pas être déplacés sous une option SELECT');
          return false;
        }
      } else if (draggedNode.type === 'branch') {
        // Les branches peuvent être sous l'arbre ou une autre branche
        if (newParent && !(newParent.type === 'tree' || newParent.type === 'branch')) {
          console.error('❌ Les branches ne peuvent être déplacées que sous l\'arbre ou une autre branche');
          return false;
        }
      }
      
      // Calculer le nouvel order
      let newOrder: number;
      
      if (position === 'child') {
        const siblings = currentFlat.filter(n => n.parentId === targetId);
        newOrder = siblings.length; // À la fin
      } else {
        const siblings = currentFlat.filter(n => n.parentId === newParentId && n.id !== nodeId);
        const targetIndex = siblings.findIndex(s => s.id === targetId);
        newOrder = position === 'before' ? targetIndex : targetIndex + 1;
      }
      
      // Sauvegarder l'état actuel pour rollback en cas d'erreur
      const previousNodes = nodesRef.current;
      
      // Mettre à jour le nœud déplacé LOCALEMENT
      const optimisticFlat = currentFlat.map(n => {
        if (n.id === nodeId) {
          return { ...n, parentId: newParentId, order: newOrder };
        }
        // Réindexer les siblings de la destination
        if (n.parentId === newParentId && n.id !== nodeId) {
          const siblings = currentFlat.filter(s => s.parentId === newParentId && s.id !== nodeId);
          const idx = siblings.findIndex(s => s.id === n.id);
          if (idx >= newOrder) {
            return { ...n, order: idx + 1 };
          }
        }
        return n;
      });
      
      // Reconstruire la hiérarchie depuis les données optimistes
      const buildHierarchy = (flatNodes: TreeBranchLeafNode[]): TreeBranchLeafNode[] => {
        // ✅ Filtrer uniquement les nœuds TEMPLATES (parentId: null, isSharedReference: true)
        // Les options SELECT qui UTILISENT des références ne doivent PAS être filtrées
        const visibleNodes = flatNodes.filter(node => 
          !(node.isSharedReference === true && node.sharedReferenceId === null && node.parentId === null)
        );
        
        const nodeMap = new Map<string, TreeBranchLeafNode>();
        const rootNodes: TreeBranchLeafNode[] = [];
        
        visibleNodes.forEach(node => {
          nodeMap.set(node.id, { ...node, children: [] });
        });
        
        visibleNodes.forEach(node => {
          const nodeWithChildren = nodeMap.get(node.id)!;
          
          if (node.parentId && nodeMap.has(node.parentId)) {
            const parent = nodeMap.get(node.parentId)!;
            parent.children = parent.children || [];
            parent.children.push(nodeWithChildren);
          } else {
            rootNodes.push(nodeWithChildren);
          }
        });
        
        const sortByOrder = (nodes: TreeBranchLeafNode[]) => {
          nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
          nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
              sortByOrder(node.children);
            }
          });
        };
        
        sortByOrder(rootNodes);
        return rootNodes;
      };
      
      const optimisticHierarchy = buildHierarchy(optimisticFlat);
      
      // ✅ Mise à jour OPTIMISTE immédiate
      onNodesUpdate(optimisticHierarchy);
      
      // Appel API (en arrière-plan)
      try {
        await api.patch(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${nodeId}`, {
          targetId,
          position
        });
        console.log('✅ DROP RÉUSSI !');
        
        // 🔄 IMPORTANT: Recharger les données pour avoir les orders corrects du serveur
        // Le backend réindexe tous les siblings, l'optimiste ne le fait pas complètement
        const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
        if (updatedNodes) {
          onNodesUpdate(updatedNodes);
          console.log('🔄 Données rechargées après déplacement');
        }
      } catch (patchError: unknown) {
        // Tentative de fallback avec PUT
        console.warn('⚠️ PATCH échoué, tentative PUT fallback');
        
        try {
          await api.put(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${nodeId}`, {
            targetId,
            position
          });
          console.log('✅ DROP RÉUSSI (via PUT) !');
          
          // 🔄 Recharger aussi après PUT
          const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
          if (updatedNodes) {
            onNodesUpdate(updatedNodes);
            console.log('🔄 Données rechargées après déplacement (PUT)');
          }
        } catch (putError: unknown) {
          // 🔄 ROLLBACK : Les deux appels ont échoué, restaurer l'état précédent
          console.error('❌ Échec serveur, rollback de la mise à jour optimiste');
          onNodesUpdate(previousNodes);
          
          // Extraire et afficher le message d'erreur du serveur (tester plusieurs formats)
          const errorMessage = 
            putError?.data?.error || 
            putError?.data?.message ||
            putError?.message ||
            patchError?.data?.error || 
            patchError?.data?.message ||
            patchError?.message ||
            'Déplacement invalide';
          
          console.error(`\n❌❌❌ ERREUR DE DÉPLACEMENT ❌❌❌`);
          console.error(`Message: ${errorMessage}`);
          console.error(`Details PATCH:`, patchError);
          console.error(`Details PUT:`, putError);
          console.error(`❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n`);
          
          return false;
        }
      }

      // Resynchroniser selectedNode (après rechargement des données)
      setUIState(prev => {
        if (!prev.selectedNode) return prev;
        // Chercher dans la hiérarchie optimiste
        const findNode = (nodes: TreeBranchLeafNode[]): TreeBranchLeafNode | undefined => {
          for (const n of nodes) {
            if (n.id === prev.selectedNode!.id) return n;
            if (n.children) {
              const found = findNode(n.children);
              if (found) return found;
            }
          }
          return undefined;
        };
        const refreshed = findNode(optimisticHierarchy);
        let nextState = prev;
        if (refreshed) {
          nextState = { ...nextState, selectedNode: refreshed };
        }
        // 🚀 Auto-expand du parent cible quand on dépose en enfant
        if (position === 'child' && targetId) {
          const newExpanded = new Set(nextState.expandedNodes);
            newExpanded.add(targetId);
            nextState = { ...nextState, expandedNodes: newExpanded };
        }
        return nextState;
      });
      
      console.log('✅ [TreeBranchLeafEditor] Élément déplacé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur déplacement nœud:', error);
      return false;
    }
  }, [selectedTree, api, onNodesUpdate]);
  
  type CreateNodePayload = {
    type: NodeTypeKey;
    label: string;
    parentId?: string;
    fieldType?: string;
    order?: number;
    metadata?: Record<string, unknown>;
  };

  const createNode = useCallback(async (data: CreateNodePayload): Promise<TreeBranchLeafNode | null> => {
    // console.log(...) // ✨ Log réduit - objet de debug
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné (createNode)');
      return null;
    }
    try {
      console.log('[TreeBranchLeafEditor] createNode ▶️ POST', {
        treeId: selectedTree.id,
        type: data.type,
        parentId: data.parentId,
        label: data.label
      });
      const newNode = await api.post(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`, data);
      if (newNode) {
        console.log('[TreeBranchLeafEditor] createNode ✅ POST ok', {
          id: newNode.id,
          type: newNode.type,
          parentId: newNode.parentId
        });
        // Recharger les données depuis l'API
        console.log('[TreeBranchLeafEditor] createNode ▶️ GET nodes', { treeId: selectedTree.id });
        const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
        console.log('[TreeBranchLeafEditor] createNode ✅ GET nodes', {
          count: (updatedNodes || []).length
        });
        onNodesUpdate(updatedNodes || []);
        // 🚀 Auto-expand du parent si création d'un enfant & sélection immédiate du nouveau nœud
        setUIState(prev => {
          let next = prev;
          if (data.parentId) {
            const expanded = new Set(prev.expandedNodes);
            expanded.add(data.parentId);
            // 🔥 AUTO-EXPAND NOUVEAU NŒUD : Ajouter aussi le nouveau nœud pour qu'il puisse avoir des enfants visibles
            expanded.add(newNode.id);
            console.log('[TreeBranchLeafEditor] createNode 🔁 expand parent + nouveau nœud', {
              parentId: data.parentId,
              newNodeId: newNode.id,
              expandedCount: expanded.size
            });
            next = { ...next, expandedNodes: expanded };
          } else {
            // 🔥 Même sans parent (nœud racine), auto-expand le nouveau nœud
            const expanded = new Set(prev.expandedNodes);
            expanded.add(newNode.id);
            next = { ...next, expandedNodes: expanded };
          }
          console.log('[TreeBranchLeafEditor] createNode 🎯 select node', { id: newNode.id });
          return { ...next, selectedNode: newNode };
        });
        // console.log('✅ Nœud créé et arbre rechargé'); // ✨ Log réduit
        return newNode;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur création nœud:', error);
      return null;
    }
  }, [selectedTree, api, onNodesUpdate]);

  const buildDefaultMetadata = useCallback((nodeTypeKey?: NodeTypeKey): Record<string, unknown> | undefined => {
    if (!nodeTypeKey) return undefined;
    if (nodeTypeKey === 'leaf_repeater') {
      return {
        repeater: {
          templateNodeIds: [],
          minItems: 0,
          maxItems: null,
          addButtonLabel: null,  // null = utilise "Ajouter [Nom du champ]"
          buttonSize: 'middle',
          buttonWidth: 'auto',
          iconOnly: false  // true = affiche juste "+"
        }
      };
    }
    return undefined;
  }, []);
  
  const activateCapability = useCallback(async (nodeId: string, capability: string) => {
    // console.log('⚡ activateCapability:', { nodeId, capability }); // ✨ Log réduit
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné (activateCapability)');
      return;
    }
    const flagMap: Record<string, string> = {
      data: 'hasData',
      formula: 'hasFormula',
      condition: 'hasCondition',
      table: 'hasTable',
      api: 'hasAPI',
      link: 'hasLink',
      markers: 'hasMarkers',
      product: 'hasProduct'
    };
    const flag = flagMap[capability];
    if (!flag) return;
    setUIState(prev => {
      if (prev.selectedNode?.id === nodeId) {
        return {
          ...prev,
          selectedNode: { ...prev.selectedNode, [flag]: true } as TreeBranchLeafNode
        };
      }
      return prev;
    });
    try {
      // 🔥 FIX: Activer la capacité (true) au lieu de la désactiver (false)
      const optimistic = (propNodes || []).map(n => n.id === nodeId ? { ...n, [flag]: true } : n);
      onNodesUpdate(optimistic);
    } catch {
      // no-op: mise à jour optimiste facultative
    }
    // 🔥 FIX: Activer la capacité avec true et ne pas clear la config
    await api.put(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${nodeId}`, { [flag]: true });
    const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
    onNodesUpdate(updatedNodes || []);
    // Re-synchroniser l'objet du nœud sélectionné avec la version rafraîchie
    setUIState(prev => {
      if (!prev.selectedNode) return prev;
      const refreshed = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === prev.selectedNode!.id);
      return refreshed ? { ...prev, selectedNode: refreshed } : prev;
    });
  }, [api, onNodesUpdate, selectedTree, propNodes]);
  
  const updateNode = useCallback(async (node: Partial<TreeBranchLeafNode> & { id: string }): Promise<TreeBranchLeafNode | null> => {
    // console.log('🔄 updateNode:', { node }); // ✨ Log réduit
    if (!selectedTree) return null;
    try {
      try {
  const optimistic = (nodesRef.current || []).map(n => n.id === node.id ? { ...n, ...node } as TreeBranchLeafNode : n);
        onNodesUpdate(optimistic);
      } catch {
        // no-op: mise à jour optimiste facultative
      }
      const updated = await api.put(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, node);
      
      // ⚡ OPTIMISATION TEMPS RÉEL : Utiliser directement la réponse API (buildResponseFromColumns) au lieu de GET supplémentaire
      if (updated) {
        // Mettre à jour le nœud dans la hiérarchie existante (récursif)
        const updateNodeInHierarchy = (nodes: TreeBranchLeafNode[]): TreeBranchLeafNode[] => {
          return nodes.map(n => {
            if (n.id === node.id) {
              return { ...n, ...updated };
            }
            if (n.children && n.children.length > 0) {
              return { ...n, children: updateNodeInHierarchy(n.children) };
            }
            return n;
          });
        };
        
        const updatedHierarchy = updateNodeInHierarchy(nodesRef.current);
        onNodesUpdate(updatedHierarchy);
        
        // Re-synchroniser le nœud sélectionné si c'est lui qui a été modifié
        setUIState(prev => {
          if (prev.selectedNode?.id === node.id) {
            return { ...prev, selectedNode: updated };
          }
          return prev;
        });
      }
      
      return updated || null;
    } catch (error) {
      console.error('❌ updateNode error:', error);
      return null;
    }
  }, [api, onNodesUpdate, selectedTree]);
  
  // =============================================================================
  // 🎛️ ACTIONS MENU CONTEXTUEL - Fonctions pour le menu des nœuds
  // =============================================================================
  
  const editNodeLabel = useCallback(async (node: TreeBranchLeafNode, newLabel: string): Promise<void> => {
    // console.log('✏️ editNodeLabel:', { nodeId: node.id, newLabel }); // ✨ Log réduit
    
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }

    try {
      try {
  const optimistic = (nodesRef.current || []).map(n => n.id === node.id ? { ...n, label: newLabel } : n);
        onNodesUpdate(optimistic);
        setUIState(prev => prev.selectedNode?.id === node.id ? { ...prev, selectedNode: { ...prev.selectedNode, label: newLabel } as TreeBranchLeafNode } : prev);
      } catch {
        // no-op
      }

      try {
        // ⚡ OPTIMISATION TEMPS RÉEL : Utiliser la réponse API directement
        const updated = await api.patch(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, {
          label: newLabel
        });
        const updatedNodes = (nodesRef.current || []).map(n => n.id === node.id ? updated : n);
        onNodesUpdate(updatedNodes);
        
        // Resync du nœud sélectionné
        setUIState(prev => {
          if (prev.selectedNode?.id === node.id) {
            return { ...prev, selectedNode: updated };
          }
          return prev;
        });
        // console.log('✅ Nœud renommé via PATCH'); // ✨ Log réduit
      } catch {
        // console.warn('⚠️ PATCH renommage a échoué, tentative via PUT...'); // ✨ Log réduit
        try {
          const updated = await api.put(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, { label: newLabel });
          
          if (updated) {
            const updatedNodes = (nodesRef.current || []).map(n => n.id === node.id ? updated : n);
            onNodesUpdate(updatedNodes);
            
            setUIState(prev => {
              if (prev.selectedNode?.id === node.id) {
                return { ...prev, selectedNode: updated };
              }
              return prev;
            });
          }
          // console.log('✅ Nœud renommé via PUT'); // ✨ Log réduit
        } catch (e2) {
          console.error('❌ Erreur renommage nœud (PUT):', e2);
          throw e2;
        }
      }
    } catch (error) {
      console.error('❌ Erreur générale renommage:', error);
      throw error;
    }
  }, [selectedTree, api, onNodesUpdate]);
  
  const duplicateNode = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }

    try {
      // Nouvelle stratégie: copie profonde indépendante complète (backend)
      const response = await api.post(`/api/treebranchleaf/nodes/${node.id}/deep-copy`, {
        targetParentId: node.parentId,
      });

      const newRootId = response?.root?.newId || null;

      // Recharger l'arbre complet
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);

      // Sélectionner la nouvelle copie si disponible
      if (newRootId) {
        const createdNode = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === newRootId);
        setUIState(prev => {
          let expandedNodes = prev.expandedNodes;
          if (createdNode?.parentId) {
            const next = new Set(expandedNodes);
            next.add(createdNode.parentId);
            expandedNodes = next;
          }
          return { ...prev, selectedNode: createdNode || prev.selectedNode, expandedNodes };
        });
      }
    } catch (error) {
      console.error('❌ Erreur duplication (deep-copy):', error);
      throw error;
    }
  }, [selectedTree, api, onNodesUpdate]);
  
  const deleteNode = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    // console.log('🗑️ deleteNode:', { nodeId: node.id }); // ✨ Log réduit
    
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }

    try {
      try {
        const optimistic = (propNodes || []).filter(n => n.id !== node.id);
        onNodesUpdate(optimistic);
        setUIState(prev => (prev.selectedNode?.id === node.id)
          ? { ...prev, selectedNode: undefined }
          : prev);
      } catch { /* no-op */ }
      await api.delete(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`);
      
      // Recharger les données
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);
      
      // Désélectionner le nœud s'il était sélectionné
      if (uiState.selectedNode?.id === node.id) {
        setUIState(prev => ({
          ...prev,
          selectedNode: undefined
        }));
      }
      
      // console.log('✅ Nœud supprimé et arbre rechargé'); // ✨ Log réduit
    } catch (error) {
      console.error('❌ Erreur suppression nœud:', error);
      throw error;
    }
  }, [selectedTree, api, onNodesUpdate, propNodes, uiState.selectedNode?.id]);
  
  const moveNodeUp = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    // console.log('⬆️ moveNodeUp:', { nodeId: node.id }); // ✨ Log réduit
    
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }

    try {
      // 🔧 FIX: Aplatir la hiérarchie pour trouver les siblings correctement
      const flatNodes = flattenNodes(nodesRef.current);
      
      // Trouver le sibling précédent sous le même parent
      const siblings = flatNodes
        .filter(n => (n.parentId || null) === (node.parentId || null))
        .sort((a, b) => {
          const od = (a.order ?? 0) - (b.order ?? 0);
          if (od !== 0) return od;
          const aCreated = typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt as unknown as Date)?.toISOString?.() || '';
          const bCreated = typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt as unknown as Date)?.toISOString?.() || '';
          return aCreated.localeCompare(bCreated);
        });
      const idx = siblings.findIndex(s => s.id === node.id);
      if (idx <= 0) return; // déjà en haut
      const prevSibling = siblings[idx - 1];
      await api.patch(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, {
        targetId: prevSibling.id,
        position: 'before'
      });
      // Recharger les données
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);
      setUIState(prev => {
        if (!prev.selectedNode) return prev;
        const refreshed = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === prev.selectedNode!.id);
        return refreshed ? { ...prev, selectedNode: refreshed } : prev;
      });
      // console.log('✅ Nœud déplacé vers le haut'); // ✨ Log réduit
    } catch (error) {
      console.error('❌ Erreur déplacement nœud:', error);
      throw error;
    }
  }, [selectedTree, api, onNodesUpdate]);
  
  const moveNodeDown = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    // console.log('⬇️ moveNodeDown:', { nodeId: node.id }); // ✨ Log réduit
    
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }

    try {
      // 🔧 FIX: Aplatir la hiérarchie pour trouver les siblings correctement
      const flatNodes = flattenNodes(nodesRef.current);
      
      // Trouver le sibling suivant sous le même parent
      const siblings = flatNodes
        .filter(n => (n.parentId || null) === (node.parentId || null))
        .sort((a, b) => {
          const od = (a.order ?? 0) - (b.order ?? 0);
          if (od !== 0) return od;
          const aCreated = typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt as unknown as Date)?.toISOString?.() || '';
          const bCreated = typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt as unknown as Date)?.toISOString?.() || '';
          return aCreated.localeCompare(bCreated);
        });
      const idx = siblings.findIndex(s => s.id === node.id);
      if (idx >= siblings.length - 1) return; // déjà en bas
      const nextSibling = siblings[idx + 1];
      await api.patch(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, {
        targetId: nextSibling.id,
        position: 'after'
      });
      // Recharger les données
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);
      setUIState(prev => {
        if (!prev.selectedNode) return prev;
        const refreshed = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === prev.selectedNode!.id);
        return refreshed ? { ...prev, selectedNode: refreshed } : prev;
      });
      // console.log('✅ Nœud déplacé vers le bas'); // ✨ Log réduit
    } catch (error) {
      console.error('❌ Erreur déplacement nœud:', error);
      throw error;
    }
  }, [selectedTree, api, onNodesUpdate]);

  // Déplacer un nœud directement à la racine (fin de liste)
  const moveNodeToRoot = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }
    try {
      await api.patch(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, {
        targetId: null,
        position: 'child'
      });
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);
      setUIState(prev => {
        if (!prev.selectedNode) return prev;
        const refreshed = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === prev.selectedNode!.id);
        return refreshed ? { ...prev, selectedNode: refreshed } : prev;
      });
      // Option: ouvrir automatiquement le nœud déplacé (pas nécessaire ici)
      // console.log('✅ Nœud déplacé à la racine');
    } catch (error) {
      console.error('❌ Erreur déplacement à la racine:', error);
      throw error;
    }
  }, [selectedTree, api, onNodesUpdate]);
  
  const toggleNodeVisibility = useCallback(async (node: TreeBranchLeafNode): Promise<void> => {
    // console.log('👁️ toggleNodeVisibility:', { nodeId: node.id, currentVisibility: node.isVisible }); // ✨ Log réduit
    
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }

    try {
      try {
        const optimistic = (nodesRef.current || []).map(n => n.id === node.id ? { ...n, isVisible: !node.isVisible } : n);
        onNodesUpdate(optimistic);
        setUIState(prev => prev.selectedNode?.id === node.id ? { ...prev, selectedNode: { ...prev.selectedNode, isVisible: !node.isVisible } as TreeBranchLeafNode } : prev);
      } catch { /* no-op */ }

      try {
        // ⚡ OPTIMISATION TEMPS RÉEL : Utiliser la réponse API directement
        const updated = await api.patch(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, {
          isVisible: !node.isVisible
        });
        if (updated) {
          const updatedNodes = (nodesRef.current || []).map(n => n.id === node.id ? updated : n);
          onNodesUpdate(updatedNodes);
          
          setUIState(prev => {
            if (prev.selectedNode?.id === node.id) {
              return { ...prev, selectedNode: updated };
            }
            return prev;
          });
        }
        // console.log('✅ Visibilité modifiée via PATCH'); // ✨ Log réduit
      } catch {
        // console.warn('⚠️ PATCH visibilité a échoué, tentative via PUT...'); // ✨ Log réduit
        // Fallback PUT si PATCH indisponible
        const updated = await api.put(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${node.id}`, {
          isVisible: !node.isVisible
        });
        if (updated) {
          const updatedNodes = (nodesRef.current || []).map(n => n.id === node.id ? updated : n);
          onNodesUpdate(updatedNodes);
          
          setUIState(prev => {
            if (prev.selectedNode?.id === node.id) {
              return { ...prev, selectedNode: updated };
            }
            return prev;
          });
        }
        // console.log('✅ Visibilité modifiée via PUT'); // ✨ Log réduit
      }
    } catch (error) {
      console.error('❌ Erreur modification visibilité:', error);
      throw error;
    }
  }, [selectedTree, api, onNodesUpdate]);
  
  const openNodeSettings = useCallback((node: TreeBranchLeafNode): void => {
    // console.log('⚙️ openNodeSettings:', { nodeId: node.id }); // ✨ Log réduit
    // Sélectionner le nœud pour ouvrir ses paramètres dans la colonne de droite
    setUIState(prev => ({
      ...prev,
      selectedNode: node,
      panelState: {
        ...prev.panelState,
        activePanel: 'properties'
      }
    }));
    // 📱 Sur mobile, basculer automatiquement vers l'onglet Paramètres
    if (!isDesktop) {
      setActiveMobileTab('parameters');
    }
  }, [isDesktop]);
  
  const deactivateCapability = useCallback(async (nodeId: string, capability: string) => {
    // console.log('🛑 deactivateCapability:', { nodeId, capability }); // ✨ Log réduit
    if (!selectedTree) return;
    const flagMap: Record<string, string> = {
      data: 'hasData',
      formula: 'hasFormula',
      condition: 'hasCondition',
      table: 'hasTable',
      api: 'hasAPI',
      link: 'hasLink',
      markers: 'hasMarkers',
      product: 'hasProduct'
    };
    const flag = flagMap[capability];
    if (!flag) return;
    // Déterminer quelles configs doivent être vidées lors de la désactivation
    const clearConfig: Record<string, unknown> = (() => {
      switch (capability) {
        case 'condition':
          return { conditionConfig: {} };
        case 'formula':
          return { formulaConfig: {} };
        case 'table':
          return { tableConfig: {} };
        case 'api':
          return { apiConfig: {} };
        case 'link':
          return { linkConfig: {} };
        case 'markers':
          return { markers: [] };
        case 'product':
          return { product_sourceNodeId: null, product_visibleFor: null, product_options: null };
        default:
          return {};
      }
    })();
    setUIState(prev => {
      if (prev.selectedNode?.id === nodeId) {
        return {
          ...prev,
          selectedNode: { ...prev.selectedNode, [flag]: false, ...clearConfig } as TreeBranchLeafNode
        };
      }
      return prev;
    });
    try {
      const optimistic = (propNodes || []).map(n => n.id === nodeId ? { ...n, [flag]: false, ...clearConfig } : n);
      onNodesUpdate(optimistic);
    } catch {
      // no-op: mise à jour optimiste facultative
    }
    // Utiliser PUT directement pour éviter les 404 côté API sur PATCH
    await api.put(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${nodeId}`, { [flag]: false, ...clearConfig });
    const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
    onNodesUpdate(updatedNodes || []);
    // Re-synchroniser l'objet du nœud sélectionné avec la version rafraîchie
    setUIState(prev => {
      if (!prev.selectedNode) return prev;
      const refreshed = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === prev.selectedNode!.id);
      return refreshed ? { ...prev, selectedNode: refreshed } : prev;
    });
  }, [api, onNodesUpdate, selectedTree, propNodes]);

  // État de chargement simplifié - les données viennent des props
  const loading = false;
  const error = null;

  // 🐛 DEBUG: Logs pour vérifier les données reçues
  // 🐛 DEBUG: Logs optimisés - seulement si les données changent réellement
  const _debugInfo = useMemo(() => ({
    trees: trees?.length || 0,
    selectedTree: selectedTree?.name || selectedTree?.label || 'aucun',
    propNodes: propNodes?.length || 0,
    propNodesData: propNodes?.slice(0, 3) // Premiers 3 nœuds pour debug
  }), [trees, selectedTree, propNodes]);

  // Debug logging temporairement désactivé pour éviter les boucles

  // =============================================================================
  // 🎣 DRAG & DROP - Logique intégrée directement (sans hook séparé)
  // =============================================================================

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [, setHoveredTarget] = useState<string | null>(null);
  const [validDrop, setValidDrop] = useState<boolean>(false);

  // 🏗️ Validation de la hiérarchie TreeBranchLeaf
  const validateHierarchicalDrop = useCallback((sourceNodeType: string, target: DropTargetData): boolean => {
    try {
      const map = new Map<string, TreeBranchLeafNode>();
      const stack: TreeBranchLeafNode[] = [];
      for (const n of propNodes || []) stack.push(n);
      while (stack.length) {
        const cur = stack.pop()!;
        map.set(cur.id, cur);
        if (cur.children) for (const c of cur.children) stack.push(c);
      }

      const isRootTypeAllowed = (type: string) => type === 'branch' || type === 'section';
      const canBeChildOf = (childType: string, parentType: string) => {
        if (childType === 'branch') return parentType === 'branch' || parentType === 'tree';
        if (childType === 'section') return parentType === 'branch' || parentType === 'tree' || parentType === 'section';
        if (childType === 'leaf_repeater') {
          return parentType === 'branch'
            || parentType === 'section'
            || parentType === 'leaf_repeater'
            || parentType === 'leaf_option'
            || parentType === 'leaf_option_field';
        }
        if (childType.startsWith('leaf_')) {
          if (parentType === 'leaf_repeater') return true;
          return parentType === 'branch' || parentType === 'section' || parentType.startsWith('leaf_');
        }
        return false;
      };

      if (!target.nodeId) {
        return isRootTypeAllowed(sourceNodeType);
      }

      let parentNode: TreeBranchLeafNode | undefined;
      if (target.position === 'before' || target.position === 'after') {
        const sibling = map.get(String(target.nodeId));
        if (!sibling) return isRootTypeAllowed(sourceNodeType);
        
        // Si le sibling n'a pas de parentId, il est à la racine
        if (sibling.parentId) {
          parentNode = map.get(String(sibling.parentId));
        }
        
        if (!parentNode) {
          return isRootTypeAllowed(sourceNodeType);
        }
      } else {
        parentNode = map.get(String(target.nodeId));
        if (!parentNode) return isRootTypeAllowed(sourceNodeType);
      }

      return canBeChildOf(sourceNodeType, parentNode.type);
    } catch (e) {
      console.warn('[validateHierarchicalDrop] Exception', e);
      return false;
      return false;
    }
  }, [propNodes]);

  const canDrop = useCallback((source: DragItem, target: DropTargetData): boolean => {
    if (!source || !target) return false;

    if (source.type === 'palette-item') {
      if (target.type !== 'structure' || !source.nodeType) return false;
      const nodeType = TreeBranchLeafRegistry.getNodeType(source.nodeType);
      if (!nodeType || !nodeType.acceptsDropFrom.includes('palette')) return false;
      return validateHierarchicalDrop(source.nodeType, target);
    }

    if (source.type === 'node') {
      const sourceId = source.data?.id || source.data?.nodeId;
      if (!sourceId || !source.nodeType || target.type !== 'structure') return false;
      if (target.nodeId && String(target.nodeId) === String(sourceId)) return false;
      if ((target.position === 'before' || target.position === 'after') && target.nodeId === sourceId) return false;

      const map = new Map<string, TreeBranchLeafNode>();
      const stack: TreeBranchLeafNode[] = [];
      for (const n of propNodes || []) stack.push(n);
      while (stack.length) {
        const cur = stack.pop()!;
        map.set(cur.id, cur);
        if (cur.children) for (const c of cur.children) stack.push(c);
      }

      if (target.position === 'child' && target.nodeId) {
        const start = map.get(String(sourceId));
        if (start && start.children) {
          const st: TreeBranchLeafNode[] = [...start.children];
          while (st.length) {
            const n = st.pop()!;
            if (n.id === target.nodeId) return false;
            if (n.children) for (const c of n.children) st.push(c);
          }
        }
      }

      return validateHierarchicalDrop(source.nodeType, target);
    }

    return false;
  }, [propNodes, validateHierarchicalDrop]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const dragItem: DragItem = {
      id: String(active.id),
      type: active.data.current?.type || 'node',
      nodeType: active.data.current?.nodeType,
      fieldType: active.data.current?.fieldType,
      data: active.data.current
    };
    setDraggedItem(dragItem);
    setHoveredTarget(null);
    setValidDrop(false);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent): boolean => {
    const { over } = event;
    if (!over || !draggedItem) {
      setHoveredTarget(null);
      setValidDrop(false);
      return false;
    }

    const targetData: DropTargetData = {
      type: over.data.current?.type || 'structure',
      nodeId: over.data.current?.nodeId,
      capability: over.data.current?.capability,
      position: over.data.current?.position,
      accepts: over.data.current?.accepts || [],
      slot: over.data.current?.slot,
      subTab: over.data.current?.subTab
    };

    const canDropHere = canDrop(draggedItem, targetData);
    setHoveredTarget(String(over.id));
    setValidDrop(!!canDropHere);
    return !!canDropHere;
  }, [draggedItem, canDrop]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over } = event;

    if (!over || !draggedItem || !validDrop) {
      setDraggedItem(null);
      setHoveredTarget(null);
      setValidDrop(false);
      return;
    }

    const targetData: DropTargetData = {
      type: over.data.current?.type || 'structure',
      nodeId: over.data.current?.nodeId,
      capability: over.data.current?.capability,
      position: over.data.current?.position,
      accepts: over.data.current?.accepts || [],
      slot: over.data.current?.slot,
      subTab: over.data.current?.subTab
    };

    try {
      if (draggedItem.type === 'palette-item') {
        // Centralisation de la logique de création
        const nodeType = TreeBranchLeafRegistry.getNodeType(draggedItem.nodeType!);
        if (!nodeType) {
          message.error('Type de nœud inconnu.');
          return;
        }

        const map = new Map<string, TreeBranchLeafNode>();
        const stack: TreeBranchLeafNode[] = [];
        for (const n of propNodes || []) stack.push(n);
        while (stack.length) {
          const current = stack.pop()!;
          map.set(current.id, current);
          if (current.children) {
            for (const child of current.children) {
              stack.push(child);
            }
          }
        }

        let effectiveParentId: string | undefined | null = targetData.nodeId;
        if (targetData.position === 'before' || targetData.position === 'after') {
          const sibling = targetData.nodeId ? map.get(String(targetData.nodeId)) : undefined;
          effectiveParentId = sibling?.parentId || null;
        }

        const baseLabel = String(draggedItem.data?.label || nodeType.label);
        const labelToUse = draggedItem.nodeType === 'leaf_field' ? baseLabel : `Nouveau ${nodeType.label}`;

        const payload: CreateNodePayload = {
          type: draggedItem.nodeType!,
          label: labelToUse,
          parentId: effectiveParentId || undefined,
          fieldType: nodeType.defaultFieldType
        };

        const defaultMetadata = buildDefaultMetadata(draggedItem.nodeType as NodeTypeKey | undefined);
        if (defaultMetadata) {
          payload.metadata = defaultMetadata;
        }

        // 🎯 Auto-détection du sous-onglet depuis le contexte de drop
        let detectedSubTab: string | null = null;
        // Cas 1 : Drop sur un en-tête de sous-onglet (subTab dans les données du droppable)
        if (targetData.subTab) {
          detectedSubTab = String(targetData.subTab);
        }
        // Cas 2 : Drop avant/après un frère qui a un sous-onglet
        else if ((targetData.position === 'before' || targetData.position === 'after') && targetData.nodeId) {
          const sibling = map.get(String(targetData.nodeId));
          if (sibling?.metadata?.subTab) {
            const st = sibling.metadata.subTab;
            detectedSubTab = Array.isArray(st) ? String(st[0]) : String(st);
          }
        }
        // Cas 3 : Drop en enfant d'un nœud qui a lui-même un sous-onglet
        else if (targetData.position === 'child' && targetData.nodeId) {
          const targetNode = map.get(String(targetData.nodeId));
          if (targetNode?.metadata?.subTab) {
            const st = targetNode.metadata.subTab;
            detectedSubTab = Array.isArray(st) ? String(st[0]) : String(st);
          }
        }

        // Appliquer le sous-onglet détecté au metadata du nouveau nœud
        if (detectedSubTab) {
          const meta = payload.metadata || {};
          meta.subTab = detectedSubTab;
          payload.metadata = meta;
          console.log(`📂 [DnD] Auto-affectation sous-onglet "${detectedSubTab}" au nouveau nœud`);
        }

        // Appel de la fonction centralisée
        const newNode = await createNode(payload);

        // 📂 Persister le sous-onglet via PUT (le POST ne migre pas vers la colonne dédiée 'subtab')
        if (detectedSubTab && newNode) {
          const newMeta = { ...(newNode.metadata || {}), subTab: detectedSubTab };
          await updateNode({ id: newNode.id, metadata: newMeta } as Partial<TreeBranchLeafNode> & { id: string });
          console.log(`📂 [DnD] Sous-onglet "${detectedSubTab}" persisté via PUT pour nœud ${newNode.id}`);
        }

        if (newNode && (targetData.position === 'before' || targetData.position === 'after') && targetData.nodeId) {
          // Le rechargement dans createNode a déjà la bonne position, mais un moveNode peut forcer l'ordre si le backend ne le gère pas à la création.
          // Pour l'instant, on fait confiance au rechargement. On pourrait ajouter un moveNode ici si nécessaire.
          console.log('Repositionnement géré par le rechargement des données.');
        }

      } else if (draggedItem.type === 'node') {
        // ... (logique de déplacement existante)
        if (!draggedItem.data?.id) {
          console.error('❌ Source sans ID');
          return;
        }

        // 🎯 Auto-détection du sous-onglet pour le nœud déplacé
        const nodeMap = new Map<string, TreeBranchLeafNode>();
        const nodeStack: TreeBranchLeafNode[] = [...(propNodes || [])];
        while (nodeStack.length) {
          const cur = nodeStack.pop()!;
          nodeMap.set(cur.id, cur);
          if (cur.children) for (const c of cur.children) nodeStack.push(c);
        }

        let moveDetectedSubTab: string | null = null;
        if (targetData.subTab) {
          moveDetectedSubTab = String(targetData.subTab);
        } else if ((targetData.position === 'before' || targetData.position === 'after') && targetData.nodeId) {
          const sibling = nodeMap.get(String(targetData.nodeId));
          if (sibling?.metadata?.subTab) {
            const st = sibling.metadata.subTab;
            moveDetectedSubTab = Array.isArray(st) ? String(st[0]) : String(st);
          }
        } else if (targetData.position === 'child' && targetData.nodeId) {
          const targetNode = nodeMap.get(String(targetData.nodeId));
          if (targetNode?.metadata?.subTab) {
            const st = targetNode.metadata.subTab;
            moveDetectedSubTab = Array.isArray(st) ? String(st[0]) : String(st);
          }
        }

        const success = await moveNode(
          draggedItem.data.id,
          targetData.nodeId,
          targetData.position
        );

        if (success) {
          console.log('✅ [TreeBranchLeafEditor] Élément déplacé avec succès');
          console.log('✅ DROP RÉUSSI !');

          // 🎯 Mettre à jour le sous-onglet du nœud déplacé
          const movedNode = nodeMap.get(String(draggedItem.data.id));
          if (movedNode) {
            const currentSubTab = movedNode.metadata?.subTab;
            const currentSubTabStr = Array.isArray(currentSubTab) ? String(currentSubTab[0]) : (currentSubTab ? String(currentSubTab) : null);
            
            if (moveDetectedSubTab && moveDetectedSubTab !== currentSubTabStr) {
              // Déplacé dans un sous-onglet différent → mettre à jour
              const newMeta = { ...(movedNode.metadata || {}), subTab: moveDetectedSubTab };
              console.log(`📂 [DnD] Auto-affectation sous-onglet "${moveDetectedSubTab}" au nœud déplacé`);
              await updateNode({ id: movedNode.id, metadata: newMeta } as Partial<TreeBranchLeafNode> & { id: string });
            } else if (!moveDetectedSubTab && currentSubTab) {
              // Déplacé hors d'un sous-onglet → retirer le sous-onglet
              const newMeta = { ...(movedNode.metadata || {}), subTab: null };
              console.log(`📂 [DnD] Retrait sous-onglet du nœud déplacé (hors sous-onglet)`);
              await updateNode({ id: movedNode.id, metadata: newMeta } as Partial<TreeBranchLeafNode> & { id: string });
            }
          }
        } else {
          console.error('❌ [TreeBranchLeafEditor] Échec du déplacement');
        }
      }
    } catch (error) {
      console.error(`💥 ERREUR DANS DROP:`, error);
    } finally {
      setDraggedItem(null);
      setHoveredTarget(null);
      setValidDrop(false);
    }
  }, [draggedItem, validDrop, createNode, moveNode, updateNode, propNodes, buildDefaultMetadata]);
  // 🎛️ HANDLERS - Gestionnaires d'événements
  // =============================================================================

  // Sélection de nœud - fonction unique
  const handleSelectNode = useCallback((node: TreeBranchLeafNode | null) => {
    setUIState(prev => ({
      ...prev,
      selectedNode: node || undefined
    }));
  }, []);

  // 🔎 Analyse dynamique de la branche complète du nœud sélectionné
  // Récupère automatiquement la vue "full" (descendants, options, shared refs résolues)
  // dès que la sélection change, pour la rendre exploitable côté TBL sans action manuelle.
  const selectedNodeFullRef = useRef<any>(null);
  useEffect(() => {
    const id = uiState.selectedNode?.id;
    if (!id) {
      selectedNodeFullRef.current = null;
      return;
    }
    let cancelled = false;
    // Debounce : attendre 300ms que la sélection se stabilise
    const timer = setTimeout(async () => {
      try {
        const full = await api.get(`/api/treebranchleaf/nodes/${id}/full`);
        if (cancelled) return;
        selectedNodeFullRef.current = full;
        if (typeof window !== 'undefined') {
          (window as any).__TBL_SELECTED_FULL = full;
        }
      } catch (e) {
        if (!cancelled) console.warn('[TreeBranchLeafEditor] ⚠️ Échec chargement analyse complète', e);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [uiState.selectedNode?.id, api]);

  // =============================================================================
  // 🎬 ACTIONS - Gestionnaires d'événements
  // =============================================================================

  const handleToggleExpanded = useCallback((nodeId: string) => {
    setUIState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      
      return {
        ...prev,
        expandedNodes: newExpanded
      };
    });
  }, []);

  const handleSearch = useCallback((query: string, filters: Record<string, unknown>) => {
    setUIState(prev => ({
      ...prev,
      searchState: {
        query,
        filters
      }
    }));
  }, []);

  const handleCapabilityToggle = useCallback((
    nodeId: string, 
    capability: string, 
    enabled: boolean
  ) => {
    if (enabled) {
      activateCapability(nodeId, capability);
      
      // Auto-ouvrir le panneau si configuré
      const module = TreeBranchLeafRegistry.getCapabilityModule(capability);
      if (module?.autoOpen) {
        setUIState(prev => ({
          ...prev,
          panelState: {
            ...prev.panelState,
            openCapabilities: new Set([...prev.panelState.openCapabilities, capability])
          }
        }));
      }
    } else {
      deactivateCapability(nodeId, capability);
      
      // Fermer le panneau
      setUIState(prev => {
        const newOpenCapabilities = new Set(prev.panelState.openCapabilities);
        newOpenCapabilities.delete(capability);
        
        return {
          ...prev,
          panelState: {
            ...prev.panelState,
            openCapabilities: newOpenCapabilities
          }
        };
      });
    }
  }, [activateCapability, deactivateCapability]);

  const handlePaletteItemCreate = useCallback((
    nodeType: NodeTypeKey,
    parentId?: string
  ) => {
    const nodeTypeConfig = TreeBranchLeafRegistry.getNodeType(nodeType);
    if (!nodeTypeConfig) return;

    const payload: CreateNodePayload = {
      type: nodeType,
      label: `Nouveau ${nodeTypeConfig.label}`,
      parentId,
      fieldType: nodeTypeConfig.defaultFieldType
    };

    const defaultMetadata = buildDefaultMetadata(nodeType);
    if (defaultMetadata) {
      payload.metadata = defaultMetadata;
    }

    createNode(payload);
  }, [createNode, buildDefaultMetadata]);

  const handleTreeAction = useCallback(async (
    action: 'create' | 'update' | 'delete' | 'duplicate',
    data?: Partial<TreeBranchLeafTree>
  ) => {
    switch (action) {
      case 'create':
        if (data) {
          await createTree(data);
        }
        break;
      case 'update':
        if (selectedTree && data) {
          await updateTree({ ...selectedTree, ...data });
        }
        break;
      case 'delete':
        if (selectedTree) {
          await deleteTree(selectedTree.id);
        }
        break;
      case 'duplicate':
        if (selectedTree) {
          await createTree({
            ...selectedTree,
            id: undefined,
            name: `${selectedTree.name} (Copie)`,
            status: 'draft'
          });
        }
        break;
    }
  }, [selectedTree, createTree, updateTree, deleteTree]);

  // =============================================================================
  // 🪄 AUTO-SELECTION ARBRE - Si aucun arbre sélectionné mais une liste disponible
  // =============================================================================
  // (Auto-select implicite via fallback selectedTree ci-dessus)

  // =============================================================================
  // 🎨 DRAG & DROP - Gestionnaires DnD
  // =============================================================================

  // Handlers DnD déjà passés au DndContext directement (pas besoin de wrappers)

  // =============================================================================
  // ✅ AUTO-SÉLECTION - Sélectionner automatiquement le premier nœud
  // =============================================================================
  // useEffect(() => {
    // if (!uiState.selectedNode && Array.isArray(propNodes) && propNodes.length > 0) {
    //   const first = propNodes[0];
    //   setUIState(prev => ({ ...prev, selectedNode: first }));
    // }
  // }, [propNodes]);

  // 🌿 AUTO-EXPAND INITIALE : ouvrir automatiquement les nœuds racines ayant des enfants (une seule fois)
  const _hasInitializedExpandRef = useRef(false);
  // useEffect(() => {
    // if (!propNodes || propNodes.length === 0 || hasInitializedExpandRef.current) return;
    // 
    // const hasChildrenSet = new Set<string>();
    // const byParent: Record<string, number> = {};
    // for (const n of propNodes) {
    //   if (n.parentId) {
    //     byParent[n.parentId] = (byParent[n.parentId] || 0) + 1;
    //   }
    // }
    // for (const n of propNodes) {
    //   if (!n.parentId && byParent[n.id] > 0) {
    //     hasChildrenSet.add(n.id);
    //   }
    // }
    // 
    // if (hasChildrenSet.size > 0) {
    //   setUIState(prev => ({ ...prev, expandedNodes: hasChildrenSet }));
    //   hasInitializedExpandRef.current = true;
    // }
  // }, [propNodes]);

  // 🔥 AUTO-EXPAND INITIAL : Désactivé - onglets et sous-onglets fermés par défaut
  // L'utilisateur ouvre manuellement ce qu'il veut voir
  const hasAutoExpandedRef = useRef(false);
  void hasAutoExpandedRef; // éviter l'avertissement unused

  // Garder l'objet du nœud sélectionné synchronisé lorsque la liste des nœuds change
  const _previousSelectedNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!uiState.selectedNode || !propNodes) return;

    const currentId = uiState.selectedNode.id;
    if (_previousSelectedNodeIdRef.current === currentId) return; // avoid re-triggers

    const updated = propNodes.find(n => n.id === currentId);
    if (updated && updated !== uiState.selectedNode) {
      // If metadata changed or other properties changed, update the selectedNode object
      setUIState(prev => ({ ...prev, selectedNode: updated }));
      _previousSelectedNodeIdRef.current = currentId;
    }
  }, [propNodes, uiState.selectedNode?.id, uiState.selectedNode]);

  // useEffect(() => {
    // if (!isDesktop && activeMobileTab === 'parameters' && uiState.panelState.previewMode && activeMobileTab !== 'structure') {
    //   setActiveMobileTab('structure');
    // }
  // }, [isDesktop, activeMobileTab, uiState.panelState.previewMode]);

  // useEffect(() => {
    // if (!isDesktop && uiState.selectedNode && !uiState.panelState.previewMode && activeMobileTab === 'structure' && activeMobileTab !== 'parameters') {
    //   setActiveMobileTab('parameters');
    // }
  // }, [isDesktop, uiState.selectedNode, uiState.panelState.previewMode, activeMobileTab]);

  // useEffect(() => {
    // if (isDesktop && activeMobileTab !== 'structure') {
    //   setActiveMobileTab('structure');
    // }
  // }, [isDesktop, activeMobileTab]);

  // =============================================================================
  // 🎨 RENDER - Callbacks stables pour Parameters
  // =============================================================================

  const handleNodeMetadataUpdated = useCallback((node: TreeBranchLeafNode) => {
    setUIState(prev => {
      if (!prev.selectedNode || prev.selectedNode.id !== node.id) {
        return prev;
      }
      return { ...prev, selectedNode: { ...prev.selectedNode, ...node } };
    });
  }, []);

  const refreshTree = useCallback(async () => {
    if (!selectedTree) return;
    try {
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);
    } catch (e) {
      console.warn('⚠️ [TreeBranchLeafEditor] refreshTree a échoué:', e);
    }
  }, [selectedTree, api, onNodesUpdate]);

  const handleSelectNodeId = useCallback((nodeId: string) => {
    const findNode = (list: TreeBranchLeafNode[] | undefined, id: string): TreeBranchLeafNode | undefined => {
      if (!list) return undefined;
      for (const n of list) {
        if (n.id === id) return n;
        const found = findNode(n.children, id);
        if (found) return found;
      }
      return undefined;
    };
    const found = findNode(nodesRef.current, nodeId);
    if (found) {
      setUIState(prev => ({ ...prev, selectedNode: found }));
    }
  }, []);

  const handleExpandNodeId = useCallback((nodeId: string) => {
    setUIState(prev => ({ ...prev, expandedNodes: new Set([...prev.expandedNodes, nodeId]) }));
  }, []);

  // =============================================================================
  // 🎨 RENDER - Rendu
  // =============================================================================

  const paletteCard = (
    <Card
      title="🎨 Palette"
      size="small"
      style={{ height: isDesktop ? '100%' : 'auto', marginBottom: isDesktop ? 0 : 16 }}
      styles={{
        body: {
          padding: isDesktop ? '6px' : 12,
          height: isDesktop ? 'calc(100% - 55px)' : 'auto',
          overflow: isDesktop ? 'auto' : 'visible'
        }
      }}
    >
      <Palette
        onItemCreate={handlePaletteItemCreate}
        readOnly={readOnly}
        registry={TreeBranchLeafRegistry}
      />
    </Card>
  );

  const structureCard = (
    <Card
      title={uiState.panelState.previewMode ? '👁️ Aperçu' : '🌲 Structure'}
      size="small"
      style={{ height: isDesktop ? '100%' : 'auto', marginBottom: isDesktop ? 0 : 16 }}
      styles={{
        body: {
          padding: isDesktop ? '12px' : 12,
          height: isDesktop ? 'calc(100% - 55px)' : 'auto',
          overflow: uiState.panelState.previewMode ? 'auto' : (isDesktop ? 'hidden' : 'auto')
        }
      }}
    >
      {uiState.panelState.previewMode ? (
        <SimplePreview nodes={propNodes || []} readOnly={readOnly} />
      ) : (
        <Structure
          tree={selectedTree}
          nodes={propNodes || []}
          selectedNode={uiState.selectedNode}
          expandedNodes={uiState.expandedNodes}
          searchState={uiState.searchState}
          dragState={uiState.dragState}
          onSelectNode={handleSelectNode}
          onToggleExpanded={handleToggleExpanded}
          onSearch={handleSearch}
          onNodeAction={updateNode}
          onCapabilityToggle={handleCapabilityToggle}
          readOnly={readOnly}
          registry={TreeBranchLeafRegistry}
          onEditNode={editNodeLabel}
          onDuplicateNode={duplicateNode}
          onDeleteNode={deleteNode}
          onMoveUpNode={moveNodeUp}
          onMoveDownNode={moveNodeDown}
          onToggleNodeVisibility={toggleNodeVisibility}
          onOpenNodeSettings={openNodeSettings}
          onMoveNodeToRoot={moveNodeToRoot}
        />
      )}
    </Card>
  );

  const parametersPanel = uiState.panelState.previewMode ? null : (
    <div
      style={{
        height: isDesktop ? '100%' : 'auto',
        marginBottom: isDesktop ? 0 : 16,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <Parameters
          tree={selectedTree}
          selectedNode={uiState.selectedNode}
          nodes={propNodes || []}
          panelState={uiState.panelState}
          onNodeUpdate={updateNode}
          onCapabilityConfig={updateNode}
          readOnly={readOnly}
          registry={TreeBranchLeafRegistry}
          onDeleteNode={deleteNode}
          onNodeMetadataUpdated={handleNodeMetadataUpdated}
          refreshTree={refreshTree}
          onSelectNodeId={handleSelectNodeId}
          onExpandNodeId={handleExpandNodeId}
        />
      </div>
    </div>
  );

  const mobileSections: Array<{ key: string; label: string; content: React.ReactNode }> = [
    {
      key: 'palette',
      label: 'Palette',
      content: paletteCard
    },
    {
      key: 'structure',
      label: uiState.panelState.previewMode ? 'Aperçu' : 'Structure',
      content: structureCard
    }
  ];

  if (parametersPanel) {
    mobileSections.push({
      key: 'parameters',
      label: 'Paramètres',
      content: parametersPanel
    });
  }

  const availableMobileKeys = mobileSections.map(section => section.key);
  const derivedMobileActiveKey = availableMobileKeys.includes(activeMobileTab)
    ? activeMobileTab
    : (availableMobileKeys[0] ?? 'structure');

  // Synchronisation mobile key temporairement désactivée pour éviter les boucles

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        {/* AntD v5: tip nécessite un enfant */}
        <Spin size="large" tip="Chargement de l'arbre...">
          <div style={{ width: 1, height: 1 }} />
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Layout style={{ minHeight: '100vh', background: 'white' }}>
        
        {/* � EN-TÊTE LEAD - Si leadId fourni */}
        {/* EN-TÊTE LEAD - Temporairement désactivé */}
        
        
        {/* �🎛️ GESTIONNAIRE D'ARBRES - En haut */}
        <div
          style={{
            background: 'white',
            padding: isMobile ? '0 12px' : '0 12px',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <TreeManager
              tree={selectedTree}
              trees={trees}
              organizationId={selectedTree?.organizationId || (typeof window.__CURRENT_ORG_ID === 'string' ? window.__CURRENT_ORG_ID : '')}
              readOnly={readOnly}
              onAction={handleTreeAction}
              onTreeSelect={(tree) => {
                // Gestionnaire pour la sélection d'un arbre depuis le TreeManager
                onTreeChange(tree);
              }}
            />
          </div>
        </div>

        {/* 🏗️ CONTENU PRINCIPAL - 3 colonnes */}
        <Content style={{ padding: isMobile ? '12px' : '0 16px 16px' }}>
          {isDesktop ? (
            <Row gutter={[16, 16]} style={{ height: 'calc(100vh - 120px)' }} wrap={false}>
              <Col flex="0 0 auto" style={{ minWidth: 72, maxWidth: 120 }}>
                {paletteCard}
              </Col>
              <Col flex="1 1 0px">
                {structureCard}
              </Col>
              {parametersPanel && (
                <Col flex="1 1 320px" style={{ minWidth: 280 }}>
                  {parametersPanel}
                </Col>
              )}
            </Row>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Segmented
                options={mobileSections.map(section => ({
                  label: section.label,
                  value: section.key
                }))}
                block
                size="small"
                value={derivedMobileActiveKey}
                onChange={(value) => setActiveMobileTab(String(value))}
              />
              <div>
                {mobileSections.find(section => section.key === derivedMobileActiveKey)?.content}
              </div>
            </div>
          )}
        </Content>

      </Layout>
    </DndContext>
  );
};

export default TreeBranchLeafEditor;

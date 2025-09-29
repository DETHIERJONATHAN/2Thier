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

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Row, Col, Layout, Card, Spin, Switch, Space, Tooltip, Segmented, Grid } from 'antd';
import { DndContext } from '@dnd-kit/core';

// Composants
import TreeManager from './components/TreeManager/TreeManager';
import Palette from './components/Palette/Palette';
import Structure from './components/Structure/Structure';
import Parameters from './components/Parameters/Parameters';
import SimplePreview from './components/Preview/SimplePreview';

// Utils
import { performanceLogger } from './utils/performanceLogger';

// Hooks et utils
// import { useTreeData } from './hooks/useTreeData';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

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
  // DragItem, 
  // DropTargetData,
  NodeTypeKey
} from './types';

const { Content } = Layout;

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
}

const TreeBranchLeafEditor: React.FC<TreeBranchLeafEditorProps> = ({
  trees,
  selectedTree: selectedTreeProp,
  nodes: propNodes,
  readOnly = false,
  onTreeChange,
  onNodesUpdate
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
  const [activeMobileTab, setActiveMobileTab] = useState<string>('structure');
  // Ref pour accéder aux nœuds courants dans les callbacks sans dépendre de propNodes
  const nodesRef = useRef<TreeBranchLeafNode[]>(propNodes || []);
  useEffect(() => {
    nodesRef.current = propNodes || [];
  }, [propNodes]);
  
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
    // console.log('🔄 moveNode:', { nodeId, targetId, position }); // ✨ Log réduit
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return false;
    }

    try {
      // Optimiste minimal: rien de complexe, on laissera le re-fetch refléter l'ordre exact
      // Appel API avec sémantique de déplacement serveur (targetId + position)
      try {
        await api.patch(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${nodeId}`, {
          targetId,
          position
        });
      } catch {
        // console.warn('⚠️ PATCH a échoué, tentative via PUT...', e); // ✨ Log réduit
        await api.put(`/api/treebranchleaf/trees/${selectedTree.id}/nodes/${nodeId}`, {
          targetId,
          position
        });
      }

      // Recharger les nœuds pour refléter l’état correct
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);
      // Resynchroniser selectedNode s'il est le nœud déplacé
      setUIState(prev => {
        if (!prev.selectedNode) return prev;
        const refreshed = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === prev.selectedNode!.id);
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
      // console.log('✅ Nœud déplacé et arbre rechargé'); // ✨ Log réduit
      return true;
    } catch (error) {
      console.error('❌ Erreur déplacement nœud:', error);
      return false;
    }
  }, [selectedTree, api, onNodesUpdate]);
  
  const createNode = useCallback(async (data: {
    type: NodeTypeKey;
    label: string;
    parentId?: string;
    fieldType?: string;
    order?: number;
  }): Promise<TreeBranchLeafNode | null> => {
    // console.log(...) // ✨ Log réduit - objet de debug
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné (createNode)');
      return null;
    }
    try {
      const newNode = await api.post(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`, data);
      if (newNode) {
        // Recharger les données depuis l'API
        const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
        onNodesUpdate(updatedNodes || []);
        // 🚀 Auto-expand du parent si création d'un enfant & sélection immédiate du nouveau nœud
        setUIState(prev => {
          let next = prev;
          if (data.parentId) {
            const expanded = new Set(prev.expandedNodes);
            expanded.add(data.parentId);
            next = { ...next, expandedNodes: expanded };
          }
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
      markers: 'hasMarkers'
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
        const updatedNodes = (nodesRef.current || []).map(n => n.id === node.id ? updated : n);
        onNodesUpdate(updatedNodes);
        
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
    // console.log('📋 duplicateNode:', { nodeId: node.id }); // ✨ Log réduit
    
    if (!selectedTree) {
      console.error('❌ Aucun arbre sélectionné');
      return;
    }

    try {
      // Créer une copie avec un label modifié
      const copyLabel = `${node.label} (copie)`;
      
      const created = await api.post(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`, {
        type: node.type,
        label: copyLabel,
        parentId: node.parentId,
        subType: node.subType || 'data',
        order: (node.order || 0) + 1,
        isVisible: node.isVisible,
        value: node.value,
        defaultValue: node.defaultValue,
        required: node.required,
        hasValidation: node.hasValidation
      });
      
      // Recharger les données
      const updatedNodes = await api.get(`/api/treebranchleaf/trees/${selectedTree.id}/nodes`);
      onNodesUpdate(updatedNodes || []);
      // Sélectionner automatiquement la copie créée si on l'a reçue avec un id
      if (created?.id) {
        const createdNode = (updatedNodes || []).find((n: TreeBranchLeafNode) => n.id === created.id);
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
      // console.log('✅ Nœud dupliqué et arbre rechargé'); // ✨ Log réduit
    } catch (error) {
      console.error('❌ Erreur duplication nœud:', error);
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
      // Trouver le sibling précédent sous le même parent
      const siblings = (nodesRef.current || [])
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
      // Trouver le sibling suivant sous le même parent
      const siblings = (nodesRef.current || [])
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
      console.log('✅ Nœud déplacé à la racine');
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
  }, []);
  
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
      markers: 'hasMarkers'
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
  const debugInfo = useMemo(() => ({
    trees: trees?.length || 0,
    selectedTree: selectedTree?.name || selectedTree?.label || 'aucun',
    propNodes: propNodes?.length || 0,
    propNodesData: propNodes?.slice(0, 3) // Premiers 3 nœuds pour debug
  }), [trees, selectedTree, propNodes]);

  // Log seulement quand les données changent vraiment - OPTIMISÉ
  useEffect(() => {
    performanceLogger.debug('[TreeBranchLeafEditor] Debug données:', debugInfo);
  }, [debugInfo]);

  // =============================================================================
  // 🎣 HOOKS - Hooks personnalisés OPTIMISÉS
  // =============================================================================

  // Stabiliser les nœuds avec useMemo pour éviter les re-créations
  const stableNodes = useMemo(() => propNodes || [], [propNodes]);

  // Mémoriser les fonctions de callback pour éviter les re-rendus - OPTIMISÉ
  const stableMoveNode = useCallback(moveNode, [moveNode]);
  const stableCreateNode = useCallback(createNode, [createNode]);
  const stableActivateCapability = useCallback(activateCapability, [activateCapability]);

  // Mémoriser les handlers pour éviter les re-créations
  const memoizedHandlers = useMemo(() => ({
    onNodeMove: stableMoveNode,
    onNodeCreate: stableCreateNode,
    onCapabilityActivate: stableActivateCapability,
    registry: TreeBranchLeafRegistry
  }), [stableMoveNode, stableCreateNode, stableActivateCapability]);

  const {
    handleDragStart,
    handleDragOver,
    handleDragEnd
  } = useDragAndDrop({
    ...memoizedHandlers,
    nodes: stableNodes
  });
  // 🎛️ HANDLERS - Gestionnaires d'événements
  // =============================================================================

  // Sélection de nœud - fonction unique
  const handleSelectNode = useCallback((node: TreeBranchLeafNode | null) => {
    setUIState(prev => ({
      ...prev,
      selectedNode: node || undefined
    }));
  }, []);

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

    createNode({
      type: nodeType,
      label: `Nouveau ${nodeTypeConfig.label}`,
      parentId,
      fieldType: nodeTypeConfig.defaultFieldType
    });
  }, [createNode]);

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
  useEffect(() => {
    if (!uiState.selectedNode && Array.isArray(propNodes) && propNodes.length > 0) {
      // Prendre le premier nœud racine de la hiérarchie
      const first = propNodes[0];
      setUIState(prev => ({ ...prev, selectedNode: first }));
      // console.log('[TreeBranchLeafEditor] ✅ Auto-sélection du premier nœud:', { id: first.id, label: first.label, type: first.type }); // ✨ Log réduit
    }
  }, [propNodes, uiState.selectedNode]);

  // 🌿 AUTO-EXPAND INITIALE : ouvrir automatiquement les nœuds racines ayant des enfants (une seule fois)
  useEffect(() => {
    if (!propNodes || propNodes.length === 0) return;
    setUIState(prev => {
      if (prev.expandedNodes.size > 0) return prev; // ne le fait qu'une fois (évite réinitialisation)
      const hasChildrenSet = new Set<string>();
      const byParent: Record<string, number> = {};
      for (const n of propNodes) {
        if (n.parentId) {
          byParent[n.parentId] = (byParent[n.parentId] || 0) + 1;
        }
      }
      for (const n of propNodes) {
        if (!n.parentId && byParent[n.id] > 0) {
          hasChildrenSet.add(n.id);
        }
      }
      if (hasChildrenSet.size === 0) return prev;
      return { ...prev, expandedNodes: hasChildrenSet };
    });
  }, [propNodes]);

  // Garder l'objet du nœud sélectionné synchronisé lorsque la liste des nœuds change
  useEffect(() => {
    setUIState(prev => {
      if (!prev.selectedNode) return prev;
      const updated = (propNodes || []).find(n => n.id === prev.selectedNode!.id);
      if (updated && updated !== prev.selectedNode) {
        return { ...prev, selectedNode: updated };
      }
      return prev;
    });
  }, [propNodes]);

  useEffect(() => {
    if (!isDesktop && activeMobileTab === 'parameters' && uiState.panelState.previewMode) {
      setActiveMobileTab('structure');
    }
  }, [isDesktop, activeMobileTab, uiState.panelState.previewMode]);

  useEffect(() => {
    if (!isDesktop && uiState.selectedNode && !uiState.panelState.previewMode && activeMobileTab === 'structure') {
      setActiveMobileTab('parameters');
    }
  }, [isDesktop, uiState.selectedNode, uiState.panelState.previewMode, activeMobileTab]);

  useEffect(() => {
    if (isDesktop && activeMobileTab !== 'structure') {
      setActiveMobileTab('structure');
    }
  }, [isDesktop, activeMobileTab]);

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
          panelState={uiState.panelState}
          onNodeUpdate={updateNode}
          onCapabilityToggle={handleCapabilityToggle}
          onCapabilityConfig={updateNode}
          readOnly={readOnly}
          registry={TreeBranchLeafRegistry}
        />
      </div>
    </div>
  );

  const mobileSections: Array<{ key: string; label: string; content: React.ReactNode }> = [
    {
      key: 'structure',
      label: uiState.panelState.previewMode ? 'Aperçu' : 'Structure',
      content: structureCard
    },
    {
      key: 'palette',
      label: 'Palette',
      content: paletteCard
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

  useEffect(() => {
    if (derivedMobileActiveKey !== activeMobileTab) {
      setActiveMobileTab(derivedMobileActiveKey);
    }
  }, [derivedMobileActiveKey, activeMobileTab]);

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
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        
        {/* � EN-TÊTE LEAD - Si leadId fourni */}
        {/* EN-TÊTE LEAD - Temporairement désactivé */}
        
        
        {/* �🎛️ GESTIONNAIRE D'ARBRES - En haut */}
        <Layout.Header
          style={{
            background: 'white',
            padding: isMobile ? '0 12px' : '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            gap: isMobile ? 12 : 0
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
          <Space
            size={isMobile ? 8 : 12}
            wrap
            style={{
              alignSelf: isMobile ? 'flex-end' : 'center',
              flexShrink: 0
            }}
          >
            <Tooltip title="Aperçu simple du formulaire">
              <span style={{ fontSize: 12, color: '#888' }}>Aperçu</span>
            </Tooltip>
            <Switch
              checked={uiState.panelState.previewMode}
              onChange={(checked) => setUIState(prev => ({
                ...prev,
                panelState: { ...prev.panelState, previewMode: checked }
              }))}
            />
          </Space>
        </Layout.Header>

        {/* 🏗️ CONTENU PRINCIPAL - 3 colonnes */}
        <Content style={{ padding: isMobile ? '12px' : '16px' }}>
          {isDesktop ? (
            <Row gutter={[16, 16]} style={{ height: 'calc(100vh - 120px)' }} wrap={false}>
              <Col flex="0 0 280px" style={{ minWidth: 240 }}>
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

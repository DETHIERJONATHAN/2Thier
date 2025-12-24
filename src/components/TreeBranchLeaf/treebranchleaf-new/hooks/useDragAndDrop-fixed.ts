/**
 * 🎣 useDragAndDrop - Hook pour la gestion du drag & drop
 * 
 * Centralise toute la logique de glisser-déposer :
 * - Palette → Structure (créer)
 * - Structure → Structure (réorganiser)
 * - Structure → Paramètres (référencer)
 * - Réutilisables → Paramètres (attacher)
 */

import { useState, useCallback, useMemo } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { message } from 'antd';
import { useThrottledCallback } from './usePerformanceOptimization';
import type { 
  DragItem, 
  DropTargetData, 
  NodeTypeKey,
  TreeBranchLeafNode,
  TreeBranchLeafRegistry
} from '../types';

interface UseDragAndDropOptions {
  onNodeMove: (nodeId: string, targetId?: string, position?: 'before' | 'after' | 'child') => Promise<boolean>;
  onNodeCreate: (data: {
    type: NodeTypeKey;
    label: string;
    parentId?: string;
    fieldType?: string;
    order?: number;
  }) => Promise<TreeBranchLeafNode | null>;
  onCapabilityActivate: (nodeId: string, capability: string, config?: Record<string, unknown>) => Promise<boolean>;
  registry: typeof TreeBranchLeafRegistry;
  nodes: TreeBranchLeafNode[]; // 👈 Ajout des nœuds pour validation
}

interface UseDragAndDropReturn {
  // État
  draggedItem: DragItem | null;
  hoveredTarget: string | null;
  validDrop: boolean;
  
  // Gestionnaires d'événements
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => boolean;
  handleDragEnd: (event: DragEndEvent) => void;
  
  // Utilitaires
  canDrop: (source: DragItem, target: DropTargetData) => boolean;
  getDropFeedback: (source: DragItem, target: DropTargetData) => string;
}

export function useDragAndDrop({
  onNodeMove,
  onNodeCreate,
  onCapabilityActivate,
  registry,
  nodes
}: UseDragAndDropOptions): UseDragAndDropReturn {

  // =============================================================================
  // 🎛️ STATE - État local
  // =============================================================================
  
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
  const [validDrop, setValidDrop] = useState<boolean>(false);

  // =============================================================================
  // 🧠 VALIDATION - Logique de validation
  // =============================================================================

  // 🏗️ Validation de la hiérarchie TreeBranchLeaf - OPTIMISÉE
  const validateHierarchicalDrop = useMemo(() => {
    // Créer un Map pour une recherche O(1) au lieu de O(n)
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    return (sourceNodeType: string, target: DropTargetData): boolean => {
      // console.log(`🏗️ Validation hiérarchique - sourceType: ${sourceNodeType}, targetId: ${target.nodeId}`); // ✨ Log réduit
      
      // Si pas de target.nodeId, c'est la racine de l'arbre
      if (!target.nodeId) {
        // Seules les branches peuvent être à la racine
        const result = sourceNodeType === 'branch';
        // console.log(`🌳 Drop à la racine - sourceType: ${sourceNodeType}, result: ${result}`); // ✨ Log réduit
        return result;
      }

      // Récupérer le nœud parent depuis le Map (O(1))
      const parentNode = nodeMap.get(target.nodeId);
      if (!parentNode) {
        // console.warn('❌ Nœud parent introuvable:', target.nodeId); // ✨ Log réduit
        return false; // Sécurité : refuser si on ne connaît pas le parent
      }

      // console.log(...) // ✨ Log réduit - objet de debug

      if (newNode) {
        // console.log('✅ Nœud créé avec succès:', newNode); // ✨ Log réduit
        message.success(`${nodeType.label} créé avec succès !`);
      } else {
        console.error('❌ Échec de la création du nœud');
        message.error(`Échec de la création du ${nodeType.label}`);
      }
    } catch (error) {
      console.error('💥 Erreur lors de la création:', error);
      message.error('Erreur lors de la création : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }, [onNodeCreate, registry]);

  const handleNodeDrop = useCallback(async (source: DragItem, target: DropTargetData) => {
    // console.log('📦 Node Drop:', { source, target }); // ✨ Log réduit

    if (!source.data?.id) {
      console.error('❌ Source sans ID:', source);
      return;
    }

    try {
      const success = await onNodeMove(
        source.data.id,
        target.nodeId,
        target.position
      );

      if (success) {
        // console.log('✅ Nœud déplacé avec succès'); // ✨ Log réduit
        message.success('Élément déplacé avec succès !');
      } else {
        console.error('❌ Échec du déplacement du nœud');
        message.error('Échec du déplacement de l\'élément');
      }
    } catch (error) {
      console.error('💥 Erreur lors du déplacement:', error);
      message.error('Erreur lors du déplacement : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }, [onNodeMove]);

  const handleDrop = useCallback(async (source: DragItem, target: DropTargetData) => {
    // console.log('🚀 Handle Drop:', { source, target }); // ✨ Log réduit

    switch (source.type) {
      case 'palette-item':
        await handlePaletteDrop(source, target);
        break;
      case 'node':
        await handleNodeDrop(source, target);
        break;
      default:
        // console.warn('❓ Type de source non géré:', source.type); // ✨ Log réduit
    }
  }, [handlePaletteDrop, handleNodeDrop]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over } = event;
    // console.log(`🎯 DRAG END - Over: ${over?.id}, Dragged: ${draggedItem?.id}, ValidDrop: ${validDrop}`); // ✨ Log réduit
    
    if (!over || !draggedItem || !validDrop) {
      // console.log(`❌ DROP ANNULÉ - Over: ${!!over}, DraggedItem: ${!!draggedItem}, ValidDrop: ${validDrop}`); // ✨ Log réduit
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
      accepts: over.data.current?.accepts || []
,
    };

    // console.log(`🚀 EXECUTING DROP:`, { draggedItem, targetData }); // ✨ Log réduit

    try {
      await handleDrop(draggedItem, targetData);
      // console.log(`✅ DROP RÉUSSI !`); // ✨ Log réduit
    } catch (error) {
      console.error(`💥 ERREUR DANS DROP:`, error);
      message.error('Erreur lors du drop : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setDraggedItem(null);
      setHoveredTarget(null);
      setValidDrop(false);
    }
  }, [draggedItem, validDrop, handleDrop]);

  // =============================================================================
  // 💬 FEEDBACK - Messages utilisateur
  // =============================================================================

  const getDropFeedback = useCallback((source: DragItem, target: DropTargetData): string => {
    if (!canDrop(source, target)) {
      return "❌ Drop non autorisé ici";
    }

    switch (source.type) {
      case 'palette-item':
        return `✅ Créer ${source.nodeType} ici`;
      case 'node':
        return `✅ Déplacer l'élément ici`;
      default:
        return "✅ Drop autorisé";
    }
  }, [canDrop]);

  // =============================================================================
  // 🎯 RETURN - Valeur de retour
  // =============================================================================
  
  return {
    // État
    draggedItem,
    hoveredTarget,
    validDrop,
    
    // Gestionnaires d'événements
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    
    // Utilitaires
    canDrop,
    getDropFeedback
  };
}

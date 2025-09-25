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
// import { useThrottledCallback } from './usePerformanceOptimization';
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
  onCapabilityActivate?: (nodeId: string, capability: string, config?: Record<string, unknown>) => Promise<boolean>;
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

  // 🏗️ Validation de la hiérarchie TreeBranchLeaf - OPTIMISÉE (inclut tous les nœuds)
  const validateHierarchicalDrop = useMemo(() => {
    // Construire une map exhaustive id -> node
    const map = new Map<string, TreeBranchLeafNode>();
    const stack: TreeBranchLeafNode[] = [];
    for (const n of nodes || []) stack.push(n);
    while (stack.length) {
      const cur = stack.pop()!;
      map.set(cur.id, cur);
      if (cur.children) for (const c of cur.children) stack.push(c);
    }

    const isRootTypeAllowed = (type: string) => type === 'branch' || type === 'section';
    const canBeChildOf = (childType: string, parentType: string) => {
      if (childType === 'branch') return parentType === 'branch' || parentType === 'tree';
      if (childType === 'section') return parentType === 'branch' || parentType === 'tree' || parentType === 'section';
      if (childType.startsWith('leaf_')) return parentType === 'branch' || parentType === 'section' || parentType.startsWith('leaf_');
      return false;
    };

  return (sourceNodeType: string, target: DropTargetData): boolean => {
      try {
        // Drop à la racine (zone principale ou sibling sans parent)
        if (!target.nodeId) {
          const ok = isRootTypeAllowed(sourceNodeType);
      // Root drop (zone vide)
          return ok;
        }

        // Déduire le parent selon la position
        let parentNode: TreeBranchLeafNode | undefined;
        if (target.position === 'before' || target.position === 'after') {
          const sibling = map.get(String(target.nodeId));
          if (!sibling) return isRootTypeAllowed(sourceNodeType);
          parentNode = sibling.parentId ? map.get(String(sibling.parentId)) : undefined; // undefined => racine
          if (!parentNode) return isRootTypeAllowed(sourceNodeType);
        } else { // position child
          parentNode = map.get(String(target.nodeId));
          if (!parentNode) return isRootTypeAllowed(sourceNodeType);
        }

        return canBeChildOf(sourceNodeType, parentNode.type);
      } catch (e) {
        console.warn('[validateHierarchicalDrop] Exception', e);
        return false;
      }
    };
  }, [nodes]);

  const canDropPaletteItem = useCallback((source: DragItem, target: DropTargetData): boolean => {
    console.log(`🎨 Validation palette item:`, { sourceNodeType: source.nodeType, targetType: target.type });
    
    // Palette → Structure seulement
    if (target.type !== 'structure') {
      console.log(`❌ Target n'est pas structure: ${target.type}`);
      return false;
    }
    
    if (!source.nodeType) {
      console.log(`❌ Source sans nodeType`);
      return false;
    }

    const nodeType = registry.getNodeType(source.nodeType);
    if (!nodeType) {
      console.log(`❌ NodeType non trouvé dans registry: ${source.nodeType}`);
      return false;
    }

    console.log(`✅ NodeType trouvé:`, nodeType);

    // Vérifier que le type de nœud accepte cette source
    if (!nodeType.acceptsDropFrom.includes('palette')) {
      console.log(`❌ NodeType n'accepte pas 'palette'`, nodeType.acceptsDropFrom);
      return false;
    }

    // 🚨 VALIDATION HIÉRARCHIQUE STRICTE
    const hierarchicalResult = validateHierarchicalDrop(source.nodeType, target);
    console.log(`🏗️ Validation hiérarchique: ${hierarchicalResult}`);
    return hierarchicalResult;
  }, [registry, validateHierarchicalDrop]);

  const canDropNode = useCallback((source: DragItem, target: DropTargetData): boolean => {
    const sourceId = source.data?.id || source.data?.nodeId; // compatibilité
    if (!sourceId || !source.nodeType) {
      console.log('[canDropNode] ❌ Pas de sourceId ou nodeType', { sourceId, nodeType: source.nodeType });
      return false;
    }
    if (target.type !== 'structure') return false;

    // Self-drop direct interdit (même zone 'child')
    if (target.nodeId && String(target.nodeId) === String(sourceId)) {
      console.log('[canDropNode] ⛔ Self drop');
      return false;
    }

    // Empêcher before/after sur soi-même via position
    if ((target.position === 'before' || target.position === 'after') && target.nodeId === sourceId) {
      console.log('[canDropNode] ⛔ before/after sur soi-même');
      return false;
    }

    // Construire map & descendants une seule fois
    const map = new Map<string, TreeBranchLeafNode>();
    const stack: TreeBranchLeafNode[] = [];
    for (const n of nodes || []) stack.push(n);
    while (stack.length) {
      const cur = stack.pop()!;
      map.set(cur.id, cur);
      if (cur.children) for (const c of cur.children) stack.push(c);
    }

    // Protection contre drop dans son propre sous-arbre (position child uniquement)
    if (target.position === 'child' && target.nodeId) {
      const start = map.get(String(sourceId));
      if (start) {
        const st: TreeBranchLeafNode[] = [];
        if (start.children) for (const c of start.children) st.push(c);
        while (st.length) {
          const n = st.pop()!;
          if (n.id === target.nodeId) {
            console.log('[canDropNode] ⛔ Drop dans son propre descendant');
            return false; // descendant direct ou indirect
          }
          if (n.children) for (const c of n.children) st.push(c);
        }
      }
    }

    // Autoriser drop racine (main zone / sibling root) si branche
    const ok = validateHierarchicalDrop(source.nodeType, target);
    if (!ok) {
      console.log('[canDropNode] ❌ validateHierarchicalDrop = false', { sourceType: source.nodeType, target });
    }
    return ok;
  }, [nodes, validateHierarchicalDrop]);

  const canDropReusable = useCallback((): boolean => {
    console.log(`♻️ Validation reusable drop`);
  // Désactivé: pas de drop réutilisables vers Paramètres
  return false;
  }, []);

  // 🎯 Fonction principale canDrop qui utilise les fonctions spécialisées
  const canDrop = useCallback((source: DragItem, target: DropTargetData): boolean => {
  // Log allégé
  // console.log(`🤔 Can drop check`, { source: { type: source.type, nodeType: source.nodeType }, target });
    
    if (!source || !target) {
      console.log(`❌ Source ou target manquant`);
      return false;
    }

    // Selon le type de source et de cible
    let result = false;
    switch (source.type) {
      case 'palette-item':
        result = canDropPaletteItem(source, target);
    // console.log(`🎨 Palette item can drop: ${result}`);
        break;
      case 'node':
        result = canDropNode(source, target);
    // console.log(`📦 Node can drop: ${result}`);
        break;
      case 'reusable':
        result = canDropReusable(source, target);
    // console.log(`♻️ Reusable can drop: ${result}`);
        break;
      default:
    // console.log(`❓ Type inconnu: ${source.type}`);
        result = false;
    }
    
  // console.log(`🎯 Final can drop result: ${result}`);
    return result;
  }, [canDropPaletteItem, canDropNode, canDropReusable]);

  // =============================================================================
  // 📱 DRAG HANDLERS - Gestionnaires d'événements
  // =============================================================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    console.log(`🔥 DRAG START - ID: ${active.id}`);
    console.log(`📊 Data active:`, active.data.current);
    
    // Construire l'objet DragItem depuis les données de l'élément draggé
    const dragItem: DragItem = {
      id: String(active.id),
      type: active.data.current?.type || 'node',
      nodeType: active.data.current?.nodeType,
      fieldType: active.data.current?.fieldType,
      data: active.data.current
    };

    console.log(`✅ DragItem créé:`, dragItem);
    
    setDraggedItem(dragItem);
    setHoveredTarget(null);
    setValidDrop(false);
  }, []);

  // Throttler les validations de drag over pour améliorer les performances
  // Fonction canDrop sans throttling pour éviter les bugs
  // TODO: Remettre throttling une fois le bug résolu
  // const throttledCanDrop = useThrottledCallback(canDrop, 50); // Limite à 20fps

  const handleDragOver = useCallback((event: DragOverEvent): boolean => {
    const { over } = event;
    console.log(`🔄 DRAG OVER - Over ID: ${over?.id}, Dragged:`, draggedItem?.id);
    
    if (!over || !draggedItem) {
      console.log(`❌ Pas de over ou draggedItem - Over: ${!!over}, DraggedItem: ${!!draggedItem}`);
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
  slot: over.data.current?.slot
    };
    
    console.log(`🎯 Target data:`, targetData);

    const canDropHere = canDrop(draggedItem, targetData);
    // S'assurer qu'on retourne toujours un booléen
    const finalResult = canDropHere !== undefined ? canDropHere : false;
    console.log(`✅ Can drop: ${canDropHere} -> final: ${finalResult}`);
    
    setHoveredTarget(String(over.id));
    setValidDrop(finalResult);

    return finalResult;
  }, [draggedItem, canDrop]);

  // =============================================================================
  // 🎯 DROP LOGIC - Logique de drop
  // =============================================================================

  const handlePaletteDrop = useCallback(async (source: DragItem, target: DropTargetData): Promise<TreeBranchLeafNode | null> => {
    console.log('🎨 Palette Drop:', { source, target });

    if (!source.nodeType) {
      console.error('❌ Source sans nodeType:', source);
      return null;
    }

    const nodeType = registry.getNodeType(source.nodeType);
    if (!nodeType) {
      console.error('❌ NodeType non trouvé:', source.nodeType);
      return null;
    }

    // Construire une map id -> node pour trouver rapidement le parent réel quand position = before/after
    const buildNodeMap = () => {
      const map = new Map<string, TreeBranchLeafNode>();
      const stack: TreeBranchLeafNode[] = [];
      for (const n of nodes || []) stack.push(n);
      while (stack.length) {
        const cur = stack.pop()!;
        map.set(cur.id, cur);
        if (cur.children) for (const c of cur.children) stack.push(c);
      }
      return map;
    };
    const nodeMap = buildNodeMap();

    // Déterminer le parent réel selon la position demandée
    let effectiveParentId: string | undefined | null = target.nodeId; // par défaut 'child'
    if (target.position === 'before' || target.position === 'after') {
      if (target.nodeId) {
        const sibling = nodeMap.get(String(target.nodeId));
        effectiveParentId = sibling?.parentId || null; // racine si pas de parent
      }
    }

    // Label : leaf_field garde label exact, sinon préfixe
    const baseLabel = String(source.data?.label || nodeType.label);
    const labelToUse = source.nodeType === 'leaf_field' ? baseLabel : `Nouveau ${nodeType.label}`;

    console.log('📝 Création nœud avec:', {
      type: source.nodeType,
      label: labelToUse,
      parentId: effectiveParentId || undefined,
      fieldType: nodeType.defaultFieldType,
      dropIntent: target.position
    });

    try {
      const newNode = await onNodeCreate({
        type: source.nodeType,
        label: labelToUse,
        parentId: effectiveParentId || undefined,
        fieldType: nodeType.defaultFieldType
      });

      if (!newNode) {
        console.error('❌ Échec de la création du nœud');
        message.error(`Échec de la création du ${nodeType.label}`);
        return null;
      }

      // Si before/after, on repositionne immédiatement le nouveau nœud par rapport au sibling cible
      if ((target.position === 'before' || target.position === 'after') && target.nodeId) {
        try {
          console.log(`🔀 Repositionnement post-création (${target.position}) par rapport à ${target.nodeId}`);
          const moveOk = await onNodeMove(newNode.id, target.nodeId, target.position);
          if (!moveOk) {
            console.warn('⚠️ Repositionnement échoué après création');
          }
        } catch (err) {
          console.error('💥 Erreur repositionnement après création:', err);
        }
      }

      console.log('✅ Nœud créé (et potentiellement repositionné) :', newNode);
      message.success(`${nodeType.label} créé avec succès !`);
      return newNode;
    } catch (error) {
      console.error('💥 Erreur lors de la création:', error);
      message.error('Erreur lors de la création : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
      return null;
    }
  }, [onNodeCreate, onNodeMove, registry, nodes]);

  const handleNodeDrop = useCallback(async (source: DragItem, target: DropTargetData) => {
    console.log('📦 Node Drop:', { source, target });

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
        console.log('✅ Nœud déplacé avec succès');
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

  const handleDrop = useCallback(async (source: DragItem, target: DropTargetData): Promise<TreeBranchLeafNode | boolean | null> => {
    console.log('🚀 Handle Drop:', { source, target });

    switch (source.type) {
      case 'palette-item':
        return await handlePaletteDrop(source, target);
      case 'node':
                if (target.type === 'parameter' && target.capability) {
                  // Désactivé: plus d’insertion via DnD vers Paramètres
                  message.warning('Sélectionnez via le sélecteur dédié');
                  return false;
        }
        return await handleNodeDrop(source, target);
      default:
        console.warn('❓ Type de source non géré:', source.type);
        return null;
    }
  }, [handlePaletteDrop, handleNodeDrop]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over } = event;
    console.log(`🎯 DRAG END - Over: ${over?.id}, Dragged: ${draggedItem?.id}, ValidDrop: ${validDrop}`);
    
    if (!over || !draggedItem || !validDrop) {
      console.log(`❌ DROP ANNULÉ - Over: ${!!over}, DraggedItem: ${!!draggedItem}, ValidDrop: ${validDrop}`);
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
  slot: over.data.current?.slot
    };

    console.log(`🚀 EXECUTING DROP:`, { draggedItem, targetData });

    try {
      const result = await handleDrop(draggedItem, targetData);
      console.log(`✅ DROP RÉUSSI ! Résultat:`, result);
      // Ici, vous pourriez utiliser le `result` pour mettre à jour l'état local
      // si nécessaire, avant le re-fetch global.
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

export default useDragAndDrop;

import React, { memo, useCallback, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { TreeBranchLeafNode } from '../../types';
import { TreeBranchLeafRegistry } from '../../core/registry';
import { NodeActionMenu } from './NodeActionMenu';

/**
 * Composant OptimizedStructureNode optimisé pour les performances.
 * Utilise React.memo pour éviter les re-rendus inutiles
 * et optimise les performances du drag & drop
 */

// Fonction pour obtenir l'icône selon le type de nœud (même que dans la palette)
const getNodeIcon = (nodeType: string): string => {
  // Utiliser le registry pour avoir les MÊMES icônes que dans la palette
  const nodeTypeConfig = TreeBranchLeafRegistry.getNodeType(nodeType);
  if (nodeTypeConfig?.emoji) {
    return nodeTypeConfig.emoji;
  }
  
  // Fallback si pas trouvé dans le registry
  switch (nodeType) {
    case 'branch':
    case 'section':
    case 'groupe':
    case 'category':
      return '🌿'; // Comme dans la palette !
    
    // Types de feuilles
    case 'leaf_option':
      return '○';
    case 'leaf_option_field':
      return '◐';  
    case 'leaf_field':
      return '●';
    
    // Types de champs (fallback)
    case 'text':
    case 'input':
      return '📝';
    case 'number':
    case 'numeric':
      return '🔢';
    case 'select':
    case 'dropdown':
      return '📋';
    case 'checkbox':
    case 'boolean':
      return '☑️';
    case 'date':
      return '📅';
    case 'email':
      return '📧';
    case 'phone':
      return '📞';
    case 'textarea':
      return '📄';
    case 'file':
    case 'upload':
      return '📎';
    case 'url':
    case 'link':
      return '🔗';
    case 'color':
      return '🎨';
    case 'range':
      return '🎚️';
    
    // Par défaut
    default:
      return '📄';
  }
};

interface OptimizedStructureNodeProps {
  node: TreeBranchLeafNode;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  depth: number;
  readOnly?: boolean;
  allNodes?: TreeBranchLeafNode[]; // Pour détecter les sections parentes
  onSelect: (node: TreeBranchLeafNode) => void;
  onToggleExpanded: (nodeId: string) => void;
  onDoubleClick: (node: TreeBranchLeafNode) => void;
  // Actions du menu contextuel
  onEditNode?: (node: TreeBranchLeafNode, newLabel: string) => void;
  onDuplicateNode?: (node: TreeBranchLeafNode) => void;
  onDeleteNode?: (node: TreeBranchLeafNode) => void;
  onMoveUpNode?: (node: TreeBranchLeafNode) => void;
  onMoveDownNode?: (node: TreeBranchLeafNode) => void;
  onToggleNodeVisibility?: (node: TreeBranchLeafNode) => void;
  onOpenNodeSettings?: (node: TreeBranchLeafNode) => void;
  onMoveNodeToRoot?: (node: TreeBranchLeafNode) => void;
  onToggleExpandNode?: (node: TreeBranchLeafNode) => void;
}

const OptimizedStructureNodeComponent: React.FC<OptimizedStructureNodeProps> = ({
  node,
  isSelected,
  isExpanded,
  hasChildren,
  depth,
  readOnly = false,
  allNodes,
  onSelect,
  onToggleExpanded,
  onDoubleClick,
  onEditNode,
  onDuplicateNode,
  onDeleteNode,
  onMoveUpNode,
  onMoveDownNode,
  onToggleNodeVisibility,
  onOpenNodeSettings
  ,onMoveNodeToRoot,
  onToggleExpandNode
}) => {
  // Rendu log temporairement supprimé
  
  // =============================================================================
  // 🎛️ DRAGGABLE - Configuration du drag
  // =============================================================================
  
  const dragData = useMemo(() => {
    const data = {
      type: 'node',
      nodeType: node.type,
  // IMPORTANT: on expose à la fois nodeId et id pour le hook DnD
  // car la logique générique cherchait source.data.id (qui n'existait pas)
  // -> ajout pour compatibilité immédiate
  nodeId: node.id,
  id: node.id,
      node: node
    };
    
    return data;
  }, [node]);

  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging
  } = useDraggable({
    id: `structure-node-${node.id}`,
    data: dragData,
    disabled: readOnly
  });

  // =============================================================================
  // 📦 DROP ZONE - Configuration de la zone de drop 
  // =============================================================================
  
  const dropChildData = useMemo(() => ({
    type: 'structure',
    nodeId: node.id,
    accepts: ['palette-item', 'node'],
    position: 'child' as const
  }), [node]);

  // Zone de drop pour créer un ENFANT
  const { isOver: isChildOver, setNodeRef: setChildDropRef } = useDroppable({
    id: `droppable-${node.id}`,
    data: dropChildData,
    disabled: readOnly
  });

  // Zone de drop AVANT (réorganisation avant ce nœud)
  const dropBeforeData = useMemo(() => ({
    type: 'structure',
    nodeId: node.id,
    accepts: ['palette-item', 'node'],
    position: 'before' as const
  }), [node]);
  const { isOver: isBeforeOver, setNodeRef: setBeforeDropRef } = useDroppable({
    id: `droppable-before-${node.id}`,
    data: dropBeforeData,
    disabled: readOnly
  });

  // Zone de drop APRÈS (réorganisation après ce nœud)
  const dropAfterData = useMemo(() => ({
    type: 'structure',
    nodeId: node.id,
    accepts: ['palette-item', 'node'],
    position: 'after' as const
  }), [node]);
  const { isOver: isAfterOver, setNodeRef: setAfterDropRef } = useDroppable({
    id: `droppable-after-${node.id}`,
    data: dropAfterData,
    disabled: readOnly
  });

  // =============================================================================
  // 🎨 STYLES - Calcul des styles selon l'état
  // =============================================================================

  // Détection si ce champ est dans une section
  const isFieldInSection = useCallback(() => {
    try {
      if (!allNodes || !node.parentId) return false;
      return TreeBranchLeafRegistry.isFieldInSection(node, allNodes);
    } catch (error) {
      console.warn('❌ Erreur lors de la détection de section:', error);
      return false;
    }
  }, [node, allNodes]);

  const inSection = isFieldInSection();

  // =============================================================================
  // 🎯 EVENT HANDLERS - Gestionnaires d'événements optimisés
  // =============================================================================
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Sélection du nœud
    onSelect(node);
    // Ouvrir directement le panneau de paramètres sur clic simple (comportement attendu)
    if (onOpenNodeSettings) {
      try {
        onOpenNodeSettings(node);
      } catch (err) {
        console.warn('⚠️ Erreur lors de "onOpenNodeSettings" au clic:', err);
      }
    }
  }, [node, onSelect, onOpenNodeSettings]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(node);
  }, [node, onDoubleClick]);

  const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(node.id);
  }, [node.id, onToggleExpanded]);

  // =============================================================================
  // 🖼️ RENDU - Interface utilisateur
  // =============================================================================
  
  // Calcul de l'indentation
  const indentationStyle: React.CSSProperties = {
    marginLeft: `${depth * 12}px` // Encore plus compact
  };

  // Icône du nœud
  const nodeIcon = getNodeIcon(node.type);

  // Fonction pour obtenir TOUS les sous-onglets associés au nœud
  const getAssociatedSubTabs = () => {
    const rawSubTab = node.metadata?.subTab;
    if (Array.isArray(rawSubTab)) {
      return rawSubTab.filter(tab => tab && typeof tab === 'string' && tab.trim()); // Tous les sous-onglets valides
    }
    return typeof rawSubTab === 'string' && rawSubTab ? [rawSubTab] : [];
  };

  // Fonction pour rendre les informations de capacités avec sous-onglet
  const renderCapabilityIcons = () => {
    const icons = [];
    const subTabs = getAssociatedSubTabs();
    
    // Style commun pour les badges
    const badgeStyle = {
      fontSize: '8px',
      padding: '1px 4px',
      borderRadius: '4px',
      marginLeft: '2px',
      color: '#fff',
      fontWeight: 500 as const,
      maxWidth: '60px',
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      whiteSpace: 'nowrap' as const,
      display: 'inline-block'
    };
    
    // TOUJOURS afficher TOUS les sous-onglets s'ils existent, indépendamment des capacités
    subTabs.forEach((subTab, index) => {
      icons.push(
        <span 
          key={`subtab-${index}`} 
          title={`Sous-onglet: ${subTab}`}
          style={{ 
            ...badgeStyle,
            backgroundColor: '#1890ff'
          }}
        >
          {subTab}
        </span>
      );
    });
    
    // Puis ajouter les icônes de capacités en plus (si elles existent)
    // 🔧 FIX: Utiliser hasFormula au lieu de formulaConfig pour être cohérent avec le nouveau système
    if (node.hasFormula) {
      icons.push(
        <span key="formula" title="Formule" style={{ color: '#52c41a', fontSize: '9px', marginLeft: '1px', opacity: 0.7 }}>
          🧮
        </span>
      );
    }
    
    // 🔧 FIX: Utiliser hasCondition au lieu de conditionConfig pour le nouveau système
    if (node.hasCondition) {
      icons.push(
        <span key="condition" title="Condition" style={{ color: '#1890ff', fontSize: '9px', marginLeft: '1px', opacity: 0.7 }}>
          ⚖️
        </span>
      );
    }
    
    // 🔧 FIX: Utiliser hasAPI au lieu de apiConfig pour être cohérent
    if (node.hasAPI) {
      icons.push(
        <span key="api" title="API" style={{ color: '#fa8c16', fontSize: '9px', marginLeft: '1px', opacity: 0.7 }}>
          🔌
        </span>
      );
    }
    
    // 🔧 FIX: Utiliser hasTable au lieu de tableConfig pour être cohérent
    if (node.hasTable) {
      icons.push(
        <span key="table" title="Tableau" style={{ color: '#722ed1', fontSize: '9px', marginLeft: '1px', opacity: 0.7 }}>
          🧩
        </span>
      );
    }
    
    if (node.markers && node.markers.length > 0) {
      icons.push(
        <span key="markers" title="Marqueurs" style={{ color: '#eb2f96', fontSize: '9px', marginLeft: '1px', opacity: 0.7 }}>
          📍
        </span>
      );
    }
    
    if (node.linkConfig && Object.keys(node.linkConfig).length > 0) {
      icons.push(
        <span key="link" title="Lien" style={{ color: '#13c2c2', fontSize: '9px', marginLeft: '1px', opacity: 0.7 }}>
          🔗
        </span>
      );
    }
    
    return icons;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Barre drop BEFORE */}
      <div
        ref={setBeforeDropRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -6,
          height: 14,
          borderRadius: 2,
          marginLeft: indentationStyle.marginLeft,
          background: isBeforeOver ? '#ffe58f' : 'transparent',
          zIndex: 2,
          pointerEvents: 'auto',
          borderTop: isBeforeOver ? '2px solid #faad14' : '2px solid transparent'
        }}
      />
      
      <div 
        ref={setChildDropRef}
        style={{ 
          ...indentationStyle, 
          display: 'flex', 
          alignItems: 'center', 
          position: 'relative',
          backgroundColor: isChildOver ? '#f6ffed' : 'transparent',
          border: isChildOver ? '1px dashed #52c41a' : '1px solid transparent',
          borderRadius: '4px',
          transition: 'background 120ms, border 120ms'
        }}
      >
        {/* Carré de drag - SEULE zone draggable */}
        <div
          ref={setDragRef}
          style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#fafafa',
            border: '1px solid #e8e8e8',
            borderRadius: '1px',
            cursor: readOnly ? 'default' : 'grab',
            marginRight: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '5px',
            color: '#bbb',
            opacity: isDragging ? 0.5 : 1,
            flexShrink: 0,
            position: 'relative'
          }}
          {...dragAttributes}
          {...dragListeners}
          data-testid={`structure-drag-${node.id}`}
          title="Glisser pour déplacer"
        >
          {/* Trois lignes horizontales pour indiquer le drag */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            opacity: 0.5
          }}>
            <div style={{ width: '6px', height: '1px', backgroundColor: '#bbb' }} />
            <div style={{ width: '6px', height: '1px', backgroundColor: '#bbb' }} />
            <div style={{ width: '6px', height: '1px', backgroundColor: '#bbb' }} />
          </div>
        </div>

        {/* Contenu principal - NON draggable */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            cursor: 'pointer',
            padding: '1px 4px',
            margin: 0,
            borderRadius: '2px',
            backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
            border: isSelected ? '1px solid #1890ff' : '1px solid transparent',
            boxShadow: isSelected ? 'inset 0 0 0 1px #1890ff' : undefined,
            transition: 'background 100ms, border 100ms',
            display: 'flex',
            alignItems: 'center',
            minHeight: '18px'
          }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          data-testid={`structure-node-${node.id}`}
        >
          {/* Indicateur pli/dépli avec lignes de niveau */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 4, position: 'relative' }}>
            {/* Lignes de niveau pour montrer la hiérarchie */}
            {depth > 0 && (
              <>
                {/* Ligne verticale continue */}
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '-12px',
                  width: '1px',
                  height: '36px',
                  backgroundColor: '#e8e8e8',
                  zIndex: 1
                }} />
                {/* Ligne horizontale de connexion */}
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '6px',
                  width: '12px',
                  height: '1px',
                  backgroundColor: '#e8e8e8',
                  zIndex: 1
                }} />
                {/* Espaceur pour la ligne */}
                <div style={{ width: '14px', height: '1px' }} />
              </>
            )}
            
            {/* Indicateur d'expansion/réduction */}
            <span
              onClick={hasChildren ? handleToggleExpanded : undefined}
              style={{
                width: 12,
                height: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasChildren ? 'pointer' : 'default',
                backgroundColor: hasChildren ? '#fafafa' : 'transparent',
                border: hasChildren ? '1px solid #e8e8e8' : 'none',
                borderRadius: '1px',
                fontSize: '9px',
                color: '#999',
                userSelect: 'none',
                transition: 'all 0.15s',
                zIndex: 2,
                position: 'relative'
              }}
              title={hasChildren ? (isExpanded ? 'Réduire' : 'Développer') : undefined}
            >
              {hasChildren ? (isExpanded ? '−' : '+') : ''}
            </span>
          </div>
          
          {/* Icône du type */}
          <span style={{ fontSize: 11, width: 12, textAlign: 'center', marginRight: 4, opacity: 0.7 }}>
            {nodeIcon}
          </span>
          
          {/* Label */}
          <span
            style={{
              fontWeight: isSelected ? 600 : 400,
              color: inSection ? '#0958d9' : '#333',
              fontSize: '11px',
              marginRight: '4px',
              flex: 1,
              minWidth: 0,
              display: 'inline-flex',
              alignItems: 'center',
              overflow: 'hidden',
              // textOverflow: 'ellipsis', // TEMPORAIREMENT DÉSACTIVÉ POUR DEBUG ELLIPSISMEASURE
              whiteSpace: 'nowrap'
            }}
            title={node.label || `${node.type}_${node.id}`}
          >
            {node.label || `${node.type}_${node.id}`}
          </span>
          
          {/* Icônes des capacités */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
            {renderCapabilityIcons()}
          </div>
          
          {/* Badge section */}
          {inSection && (
            <span style={{
              fontSize: 10,
              background: '#1890ff',
              color: '#fff',
              padding: '1px 4px',
              borderRadius: 8,
              marginLeft: '6px'
            }}>
              Section
            </span>
          )}
          
          {/* Type en petit */}
          <span style={{ 
            fontSize: 9, 
            color: '#999', 
            fontStyle: 'italic', 
            marginLeft: '6px' 
          }}>
            {node.type}
          </span>
        </div>

        {/* Menu d'actions - positionné à droite */}
        {!readOnly && (
          <div style={{ marginLeft: '4px', flexShrink: 0 }}>
            <NodeActionMenu
              node={node}
              isExpanded={isExpanded}
              onEdit={(nodeToEdit, newLabel) => {
                console.log('🔗 [OptimizedStructureNode] Transmission onEdit vers NodeActionMenu');
                if (onEditNode) onEditNode(nodeToEdit, newLabel);
                else console.error('❌ [OptimizedStructureNode] onEditNode manquant!');
              }}
              onDuplicate={(nodeToDupe) => {
                console.log('🔗 [OptimizedStructureNode] Transmission onDuplicate vers NodeActionMenu');
                if (onDuplicateNode) onDuplicateNode(nodeToDupe);
                else console.error('❌ [OptimizedStructureNode] onDuplicateNode manquant!');
              }}
              onDelete={(nodeToDelete) => {
                if (onDeleteNode) onDeleteNode(nodeToDelete);
                else console.error('❌ [OptimizedStructureNode] onDeleteNode manquant!');
              }}
              onMoveUp={onMoveUpNode}
              onMoveDown={onMoveDownNode}
              onToggleVisibility={onToggleNodeVisibility}
              onOpenSettings={onOpenNodeSettings}
              onMoveToRoot={onMoveNodeToRoot}
              onToggleExpand={onToggleExpandNode}
            />
          </div>
        )}
      </div>
      
      {/* Barre drop AFTER */}
      <div
        ref={setAfterDropRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -6,
          height: 14,
          borderRadius: 2,
          marginLeft: indentationStyle.marginLeft,
          background: isAfterOver ? '#ffe58f' : 'transparent',
          zIndex: 2,
          pointerEvents: 'auto',
          borderBottom: isAfterOver ? '2px solid #faad14' : '2px solid transparent'
        }}
      />
    </div>
  );
};

// =============================================================================
// 📋 EXPORT avec React.memo pour optimisation
// =============================================================================

export const OptimizedStructureNode = memo(OptimizedStructureNodeComponent, (prevProps, nextProps) => {
  // Comparaison optimisée pour éviter les re-rendus inutiles
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.node.label === nextProps.node.label &&
    prevProps.node.type === nextProps.node.type &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.hasChildren === nextProps.hasChildren &&
    prevProps.depth === nextProps.depth &&
    prevProps.readOnly === nextProps.readOnly
  );
});

OptimizedStructureNode.displayName = 'OptimizedStructureNode';
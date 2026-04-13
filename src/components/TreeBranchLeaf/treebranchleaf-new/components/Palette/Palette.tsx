/**
 * 🎨 Palette - Composant de la palette d'éléments
 * 
 * Colonne de gauche : éléments qu'on peut glisser dans la Structure
 * - 🌿 Branches
 * - 🍃 Feuilles (O, O+C, C)
 * - Organisés par catégories
 */

import React from 'react';
import { Card, Typography, Tooltip } from 'antd';
import { useDraggable } from '@dnd-kit/core';
// (icônes inutilisées supprimées)
import type { NodeTypeKey, TreeBranchLeafRegistry } from '../../types';
import { logger } from '../../../../../lib/logger';

const { Text } = Typography;

interface PaletteProps {
  onItemCreate: (nodeType: NodeTypeKey, parentId?: string, position?: 'before' | 'after' | 'child') => void;
  readOnly?: boolean;
  registry: typeof TreeBranchLeafRegistry;
}

interface PaletteItemProps {
  id: string;
  nodeType: NodeTypeKey;
  emoji: string;
  label: string;
  description: string;
  color: string;
  readOnly?: boolean;
}

const PaletteItem: React.FC<PaletteItemProps> = ({
  id,
  nodeType,
  emoji,
  label,
  description,
  color,
  readOnly = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id,
    data: {
      type: 'palette-item',
      nodeType,
      label,
      description
    },
    disabled: readOnly
  });

  // Debug logs
  // logger.debug(`🎨 PaletteItem ${nodeType} - isDragging: ${isDragging}, disabled: ${readOnly}`);
  if (isDragging) {
    logger.debug(`🔥 PALETTE ITEM EN COURS DE DRAG:`, { nodeType, label });
  }

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: readOnly ? 'not-allowed' : 'grab'
  };

  return (
    <Tooltip 
      title={`${emoji} ${label} - ${description}`} 
      placement="right"
      open={isDragging ? false : undefined}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
      >
        <Card
          size="small"
          hoverable={!readOnly}
          style={{
            borderColor: color,
            borderWidth: '2px',
            borderStyle: isDragging ? 'dashed' : 'solid',
            backgroundColor: isDragging ? '#f0f0f0' : 'white',
            filter: readOnly ? 'grayscale(100%)' : 'none',
            textAlign: 'center',
            width: '100%',
          }}
          styles={{ body: { 
            padding: '6px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}}
        >
          <div style={{ 
            fontSize: '18px',
            color: readOnly ? '#ccc' : color,
            lineHeight: 1,
          }}>
            {emoji}
          </div>
          <div style={{
            fontSize: '9px',
            lineHeight: 1.1,
            marginTop: 2,
            color: '#666',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
          }}>
            {label}
          </div>
        </Card>
      </div>
    </Tooltip>
  );
};

const Palette: React.FC<PaletteProps> = ({
  onItemCreate,
  readOnly = false,
  registry
}) => {
  const nodeTypes = registry.getAllNodeTypes();

  // Grouper par catégorie
  const categories = [
    {
      key: 'structure',
      label: '🏗️ Structure',
      items: nodeTypes.filter(nt => nt.key === 'branch')
    },
    {
      key: 'sections',
      label: '📋 Sections',
      items: nodeTypes.filter(nt => nt.key === 'section')
    },
    {
      key: 'leafs',
      label: '🍃 Feuilles',
      items: nodeTypes.filter(nt => nt.key.startsWith('leaf_'))
    }
  ];

  return (
    <div 
      style={{ 
        height: '100%', 
        overflow: 'auto',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Catégories d'éléments */}
      {categories.map(category => (
        <div key={category.key} style={{ marginBottom: '12px' }}>
          <div style={{ 
            marginBottom: '6px', 
            padding: '2px 4px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <Text strong style={{ fontSize: '11px' }}>
              {category.label}
            </Text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {category.items.map(nodeType => (
              <div 
                key={`wrap-${nodeType.key}`}
                onDoubleClick={() => !readOnly && onItemCreate(nodeType.key)}
              >
                <PaletteItem
                  key={`palette-${nodeType.key}`}
                  id={`palette-${nodeType.key}`}
                  nodeType={nodeType.key}
                  emoji={nodeType.emoji}
                  label={nodeType.label}
                  description={nodeType.description}
                  color={nodeType.color}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {readOnly && (
        <div style={{ 
          textAlign: 'center', 
          padding: '16px',
          backgroundColor: '#fff7e6',
          borderRadius: '4px',
          margin: '16px 0'
        }}>
          <Text type="warning" style={{ fontSize: '12px' }}>
            🔒 Mode lecture seule
          </Text>
        </div>
      )}

    </div>
  );
};

export default Palette;

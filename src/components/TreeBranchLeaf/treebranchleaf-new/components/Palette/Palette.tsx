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
  // console.log(`🎨 PaletteItem ${nodeType} - isDragging: ${isDragging}, disabled: ${readOnly}`);
  if (isDragging) {
    console.log(`🔥 PALETTE ITEM EN COURS DE DRAG:`, { nodeType, label });
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
            marginBottom: '8px',
            borderColor: color,
            borderWidth: '2px',
            borderStyle: isDragging ? 'dashed' : 'solid',
            backgroundColor: isDragging ? '#f0f0f0' : 'white',
            filter: readOnly ? 'grayscale(100%)' : 'none',
            textAlign: 'center',
            minHeight: '45px'
          }}
          styles={{ body: { 
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}}
        >
          <div style={{ 
            fontSize: '18px',
            color: readOnly ? '#ccc' : color,
            marginBottom: '4px'
          }}>
            {emoji}
          </div>
          <div style={{ 
            fontSize: '10px', 
            fontWeight: 500, 
            color: readOnly ? '#ccc' : '#333',
            textAlign: 'center',
            lineHeight: '1.1'
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
      {/* Titre et instructions */}
      <div style={{ marginBottom: '16px', padding: '8px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          🖱️ Glisser ces éléments dans la Structure pour créer votre arbre
        </Text>
      </div>

      {/* Catégories d'éléments */}
      {categories.map(category => (
        <div key={category.key} style={{ marginBottom: '20px' }}>
          <div style={{ 
            marginBottom: '12px', 
            padding: '4px 8px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px'
          }}>
            <Text strong style={{ fontSize: '13px' }}>
              {category.label}
            </Text>
          </div>

          {category.items.map(nodeType => (
            <div key={`wrap-${nodeType.key}`} onDoubleClick={() => !readOnly && onItemCreate(nodeType.key)}>
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
      ))}

      {/* Instructions détaillées */}
      <Card size="small" style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div style={{ marginBottom: '8px', fontWeight: 500 }}>
            💡 Mode d'emploi :
          </div>
          <div style={{ lineHeight: '1.4' }}>
            • <strong>🌿 Branche</strong> : Conteneur hiérarchique<br />
            • <strong>📋 Section</strong> : Zone calculatrice avec champs d'affichage<br />
            • <strong>○ Option (O)</strong> : Choix simple<br />
            • <strong>◐ Option+Champ (O+C)</strong> : Choix + saisie<br />
            • <strong>● Champ (C)</strong> : Saisie pure<br /><br />
            
            <Text type="secondary">
              Déposez <strong>entre</strong> deux éléments pour créer un frère, 
              <strong>sur</strong> un élément pour créer un enfant.
            </Text>
          </div>
        </div>
      </Card>

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

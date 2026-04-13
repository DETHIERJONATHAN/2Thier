/**
 * 📦 ARRAY FIELD EDITOR - Éditeur de Listes avec Drag & Drop
 * 
 * Composant pour éditer des champs de type array (tableaux) :
 * - Menu items
 * - CTA buttons
 * - Highlight points
 * - Services
 * - Testimonials
 * - etc.
 * 
 * FONCTIONNALITÉS :
 * - ✅ Glisser-déposer pour réorganiser (@dnd-kit)
 * - ✅ Ajouter/Supprimer/Dupliquer items
 * - ✅ Édition inline avec Collapse
 * - ✅ Validation et limites (maxItems)
 * - ✅ Support de champs imbriqués complexes
 * 
 * @module site/editor/fields/ArrayFieldEditor
 * @author 2Thier CRM Team
 */

import React from 'react';
import {
  Card,
  Button,
  Space,
  Popconfirm,
  Empty,
  Alert,
  Collapse,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  HolderOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FieldDefinition } from '../../schemas/types';
import FieldRenderer from './FieldRenderer';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../lib/logger';

/**
 * 🔧 Props de l'ArrayFieldEditor
 */
interface ArrayFieldEditorProps {
  /** Type des items (définition des sous-champs) */
  itemType?: Record<string, FieldDefinition>;
  
  /** Activer le drag & drop */
  draggable?: boolean;
  
  /** Nombre maximum d'items */
  maxItems?: number;
  
  /** Valeur actuelle (array) */
  value?: unknown[];
  
  /** Callback onChange */
  onChange?: (value: unknown[]) => void;
  
  /** Contexte AI */
  aiContext?: unknown;
  
  /** 🔥 NOUVEAU : Toutes les valeurs du formulaire (pour les conditions) */
  formValues?: unknown;
  
  /** 🔥 CRITIQUE : Chemin du champ dans le formulaire (ex: ['items']) */
  name?: (string | number)[];
}

/**
 * 🧩 SortableItem - Item draggable
 */
interface SortableItemProps {
  id: string;
  index: number;
  item: unknown;
  itemType?: Record<string, FieldDefinition>;
  onUpdate: (index: number, newValue: unknown) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  aiContext?: unknown;
  formValues?: unknown;
  /** 🔥 CRITIQUE : Chemin parent dans le formulaire */
  parentName?: (string | number)[];
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  index,
  item,
  itemType,
  onUpdate,
  onDelete,
  onDuplicate,
  aiContext,
  formValues,
  parentName = []
}) => {
  const { t } = useTranslation();
  logger.debug('🔥 [SortableItem] Item', index, '- parentName reçu:', parentName, 'typeof:', typeof parentName, 'isArray:', Array.isArray(parentName));
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  
  // Générer un label pour l'item (ex: "Menu Item 1", ou le premier champ text)
  const getItemLabel = () => {
    if (!itemType) return `Item ${index + 1}`;
    
    const firstTextField = Object.values(itemType).find(
      field => ['text', 'textarea'].includes(field.type)
    );
    
    if (firstTextField && item[firstTextField.id]) {
      return item[firstTextField.id];
    }
    
    return `Item ${index + 1}`;
  };
  
  return (
    <div ref={setNodeRef} style={style}>
      <Collapse
        items={[
          {
            key: id,
            label: (
              <Space>
                <HolderOutlined {...listeners} {...attributes} style={{ cursor: 'grab' }} />
                <strong>{getItemLabel()}</strong>
              </Space>
            ),
            extra: (
              <Space size="small" onClick={(e) => e.stopPropagation()}>
                <Tooltip title={t('common.duplicate')}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => onDuplicate(index)}
                  />
                </Tooltip>
                <Popconfirm
                  title="Supprimer cet item ?"
                  onConfirm={() => onDelete(index)}
                  okText={t('common.delete')}
                  cancelText={t('common.cancel')}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              </Space>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {itemType && Object.entries(itemType).map(([key, fieldDef]) => {
                  // 🔥 Construire le chemin complet : ['items', 0, 'value']
                  const fullPath = [...parentName, index, key];
                  
                  logger.debug(`🔍 [ArrayFieldEditor] Item ${index} - Field ${key}:`, {
                    value: item[key],
                    fieldDef: fieldDef.type,
                    itemKeys: Object.keys(item),
                    fullPath
                  });
                  
                  return (
                    <FieldRenderer
                      key={key}
                      field={fieldDef}
                      value={item[key]}
                      onChange={(newValue) => {
                        const updatedItem = { ...item, [key]: newValue };
                        onUpdate(index, updatedItem);
                      }}
                      name={fullPath}
                      aiContext={aiContext}
                      formValues={item}
                    />
                  );
                })}
              </Space>
            )
          }
        ]}
        defaultActiveKey={[id]}
      />
    </div>
  );
};

/**
 * 📦 ArrayFieldEditor Component
 */
export const ArrayFieldEditor: React.FC<ArrayFieldEditorProps> = (props) => {
  const {
    name: receivedName,
    itemType,
    draggable = true,
    maxItems = 10,
    value = [],
    onChange,
    aiContext,
    formValues
  } = props;
  
  // Utiliser null coalescing explicite pour garantir un tableau
  const name = receivedName || [];
  
  // ✅ PAS d'état local ! Utiliser directement la prop value
  // Cela évite les boucles infinies de synchronisation
  const items = value || [];
  
  // Configuration des sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  
  /**
   * 🎯 Handler de fin de drag
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = items.findIndex((_, i) => `item-${i}` === active.id);
    const newIndex = items.findIndex((_, i) => `item-${i}` === over.id);
    
    const newItems = arrayMove(items, oldIndex, newIndex);
    onChange?.(newItems);
  };
  
  /**
   * 🔧 Helper: Deep clone pour éviter les références partagées
   */
  const deepClone = (obj: unknown): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    const cloned: unknown = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  };

  /**
   * ➕ Ajouter un nouvel item
   */
  const handleAdd = () => {
    if (items.length >= maxItems) return;
    
    // Créer un item vide avec les valeurs par défaut
    // 🔥 CRITICAL: Deep clone pour éviter que tous les items partagent les mêmes objets
    const newItem: unknown = {};
    if (itemType) {
      Object.entries(itemType).forEach(([key, fieldDef]) => {
        newItem[key] = deepClone(fieldDef.default) || '';
      });
    }
    
    const newItems = [...items, newItem];
    onChange?.(newItems);
  };
  
  /**
   * 🗑️ Supprimer un item
   */
  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange?.(newItems);
  };
  
  /**
   * 📋 Dupliquer un item
   */
  const handleDuplicate = (index: number) => {
    if (items.length >= maxItems) return;
    
    // 🔥 CRITICAL: Deep clone pour éviter que le duplicata partage les mêmes références
    const itemToDuplicate = deepClone(items[index]);
    const newItems = [
      ...items.slice(0, index + 1),
      itemToDuplicate,
      ...items.slice(index + 1)
    ];
    
    onChange?.(newItems);
  };
  
  /**
   * ✏️ Mettre à jour un item
   */
  const handleUpdate = (index: number, newValue: unknown) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange?.(newItems);
  };
  
  /**
   * 🎨 Rendu
   */
  
  return (
    <Card
      size="small"
      style={{ backgroundColor: '#f5f5f5' }}
      styles={{ body: { padding: 12 } }}
    >
      {/* Header avec bouton Ajouter */}
      <div style={{ marginBottom: 12 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ color: '#999', fontSize: 12 }}>
            {items.length} / {maxItems} items
          </span>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={items.length >= maxItems}
          >
            Ajouter
          </Button>
        </Space>
      </div>
      
      {/* Alert si limite atteinte */}
      {items.length >= maxItems && (
        <Alert
          type="info"
          message={`Limite de ${maxItems} items atteinte`}
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}
      
      {/* Liste des items */}
      {items.length === 0 ? (
        <Empty
          description="Aucun item"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
            Ajouter le premier item
          </Button>
        </Empty>
      ) : draggable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((_, i) => `item-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {items.map((item, index) => (
                <SortableItem
                  key={`item-${index}`}
                  id={`item-${index}`}
                  index={index}
                  item={item}
                  itemType={itemType}
                  parentName={name || []}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  aiContext={aiContext}
                  formValues={formValues}
                />
              ))}
            </Space>
          </SortableContext>
        </DndContext>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {items.map((item, index) => (
            <Card
              key={`item-${index}`}
              size="small"
              title={`Item ${index + 1}`}
              extra={
                <Space size="small">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleDuplicate(index)}
                  />
                  <Popconfirm
                    title="Supprimer ?"
                    onConfirm={() => handleDelete(index)}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {itemType && Object.entries(itemType).map(([key, fieldDef]) => {
                  const fullPath = [...(name || []), index, key];
                  return (
                    <FieldRenderer
                      key={key}
                      field={fieldDef}
                      value={item[key]}
                      onChange={(newValue) => {
                        const updatedItem = { ...item, [key]: newValue };
                        handleUpdate(index, updatedItem);
                      }}
                      name={fullPath}
                      aiContext={aiContext}
                      formValues={item}
                    />
                  );
                })}
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
};

export default ArrayFieldEditor;

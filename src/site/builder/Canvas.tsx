import React from 'react';
import { Card, Button, Space, Typography, Tag, Tooltip, Empty } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  DragOutlined,
  PlusOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SectionInstance } from '../schemas/types';
import { getSectionSchema } from '../schemas';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

/**
 * 🖼️ CANVAS - ZONE D'ÉDITION AVEC DRAG & DROP
 * 
 * Affiche toutes les sections du site avec :
 * - 🎯 Drag & Drop pour réorganiser (@dnd-kit)
 * - ✏️ Bouton éditer (ouvre UniversalSectionEditor)
 * - 📋 Bouton dupliquer
 * - 🗑️ Bouton supprimer
 * - 👁️ Toggle visibilité (actif/inactif)
 * - 🔒 Toggle verrouillage
 * 
 * @author IA Assistant - Canvas avec @dnd-kit
 */

interface CanvasProps {
  sections: SectionInstance[];
  onReorder: (sections: SectionInstance[]) => void;
  onEdit: (section: SectionInstance) => void;
  onDuplicate: (section: SectionInstance) => void;
  onDelete: (section: SectionInstance) => void;
  onToggle: (section: SectionInstance) => void;
  onLock: (section: SectionInstance) => void;
  onAddSection: () => void;
}

/**
 * 📦 CARTE DE SECTION SORTABLE
 */
interface SortableSectionCardProps {
  section: SectionInstance;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onLock: () => void;
}

const SortableSectionCard: React.FC<SortableSectionCardProps> = ({
  section,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  onLock
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id, disabled: section.isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: section.isLocked ? 'not-allowed' : 'move'
  };

  // 🔍 Récupération du schema pour afficher les infos
  const schema = getSectionSchema(section.type);

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        style={{
          marginBottom: '12px',
          borderRadius: '8px',
          border: section.isActive ? '2px solid #1890ff' : '2px solid #d9d9d9',
          background: section.isActive ? 'white' : '#fafafa',
          opacity: section.isActive ? 1 : 0.6
        }}
        styles={{ body: { padding: '12px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 🎯 DRAG HANDLE */}
          <div
            {...attributes}
            {...listeners}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: section.isLocked ? 'not-allowed' : 'grab',
              color: section.isLocked ? '#d9d9d9' : '#1890ff',
              fontSize: '16px'
            }}
          >
            {section.isLocked ? <LockOutlined /> : <DragOutlined />}
          </div>

          {/* 📋 INFOS SECTION */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Text strong style={{ fontSize: '14px' }}>
                {schema?.name || section.type}
              </Text>
              {section.isLocked && (
                <Tag icon={<LockOutlined />} color="default" style={{ fontSize: '11px' }}>
                  Verrouillé
                </Tag>
              )}
              {!section.isActive && (
                <Tag icon={<EyeInvisibleOutlined />} color="warning" style={{ fontSize: '11px' }}>
                  Masqué
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {schema?.description || `Section ${section.type}`}
            </Text>
          </div>

          {/* 🎛️ ACTIONS */}
          <Space size="small">
            <Tooltip title={section.isActive ? 'Masquer' : 'Afficher'}>
              <Button
                type="text"
                size="small"
                icon={section.isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={onToggle}
                style={{ color: section.isActive ? '#52c41a' : '#999' }}
              />
            </Tooltip>

            <Tooltip title={t('common.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={onEdit}
                style={{ color: '#1890ff' }}
              />
            </Tooltip>

            <Tooltip title={t('common.duplicate')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={onDuplicate}
                style={{ color: '#722ed1' }}
              />
            </Tooltip>

            <Tooltip title={section.isLocked ? 'Déverrouiller' : 'Verrouiller'}>
              <Button
                type="text"
                size="small"
                icon={section.isLocked ? <LockOutlined /> : <UnlockOutlined />}
                onClick={onLock}
                style={{ color: section.isLocked ? '#ff4d4f' : '#999' }}
              />
            </Tooltip>

            <Tooltip title={t('common.delete')}>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={onDelete}
                disabled={section.isLocked}
                danger
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
    </div>
  );
};

/**
 * 🖼️ CANVAS PRINCIPAL
 */
export const Canvas: React.FC<CanvasProps> = ({
  sections,
  onReorder,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  onLock,
  onAddSection
}) => {
  // 🎯 Configuration des sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Empêche le drag accidentel lors du clic
      }
    })
  );

  /**
   * 🔄 GESTION DU DRAG END
   */
  const handleDragEnd = (event: unknown) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) {
      return;
    }

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Réorganisation immédiate
    const reordered = [...sections];
    const [movedSection] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, movedSection);

    onReorder(reordered);
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      {/* 🎯 HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <Title level={4} style={{ marginBottom: '4px' }}>
            Canvas
          </Title>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Glissez-déposez pour réorganiser • {sections.length} section{sections.length > 1 ? 's' : ''}
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAddSection}
          size="large"
        >
          Ajouter une section
        </Button>
      </div>

      {/* 🎨 ZONE DE DRAG & DROP */}
      {sections.length === 0 ? (
        <Empty
          description={
            <div>
              <Text type="secondary">Aucune section pour le moment</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Cliquez sur "Ajouter une section" pour commencer
              </Text>
            </div>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{
            marginTop: '60px',
            padding: '40px',
            background: 'white',
            borderRadius: '8px',
            border: '2px dashed #d9d9d9'
          }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddSection} size="large">
            Ajouter votre première section
          </Button>
        </Empty>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map(section => (
              <SortableSectionCard
                key={section.id}
                section={section}
                onEdit={() => onEdit(section)}
                onDuplicate={() => onDuplicate(section)}
                onDelete={() => onDelete(section)}
                onToggle={() => onToggle(section)}
                onLock={() => onLock(section)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* 🎨 INFO ZONE VERROUILLÉE */}
      {sections.some(s => s.isLocked) && (
        <Card
          size="small"
          style={{
            marginTop: '20px',
            background: '#fff7e6',
            borderColor: '#ffa940'
          }}
        >
          <Space>
            <WarningOutlined style={{ color: '#fa8c16' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Les sections verrouillées ne peuvent pas être déplacées ou supprimées
            </Text>
          </Space>
        </Card>
      )}
    </div>
  );
};

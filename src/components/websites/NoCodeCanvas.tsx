import React, { useState } from 'react';
import { Button, Space, Typography, Tag, Tooltip, Segmented, Empty } from 'antd';
import {
  SettingOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
  DragOutlined,
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SectionRendererV2 from './SectionRendererV2';

const { Text } = Typography;

interface Section {
  id: number;
  type: string;
  name: string;
  content: any;
  isActive: boolean;
  backgroundColor?: string;
  textColor?: string;
}

interface SortableItemProps {
  section: Section;
  onEdit: (section: Section) => void;
  onDuplicate: (section: Section) => void;
  onDelete: (section: Section) => void;
  onToggle: (section: Section) => void;
  viewMode: string;
}

/**
 * 📦 Item sortable individuel avec RENDU RÉEL
 */
const SortableItem: React.FC<SortableItemProps> = ({
  section,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  viewMode
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (section.isActive ? 1 : 0.6)
  };

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          border: isHovered ? '2px solid #1890ff' : '2px solid transparent',
          borderRadius: '8px',
          marginBottom: '16px',
          overflow: 'hidden',
          transition: 'all 0.2s',
          background: 'white'
        }}
      >
        {/* BARRE D'ACTIONS (visible au survol) */}
        {isHovered && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '4px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <Space size="small">
              <Tooltip title="Déplacer">
                <Button
                  type="text"
                  size="small"
                  icon={<DragOutlined />}
                  {...attributes}
                  {...listeners}
                  style={{ cursor: 'grab' }}
                />
              </Tooltip>
              <Tooltip title={section.isActive ? 'Désactiver' : 'Activer'}>
                <Button
                  type="text"
                  size="small"
                  icon={section.isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  onClick={() => onToggle(section)}
                />
              </Tooltip>
              <Tooltip title="Configurer">
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => onEdit(section)}
                />
              </Tooltip>
              <Tooltip title="Dupliquer">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => onDuplicate(section)}
                />
              </Tooltip>
              <Tooltip title="Supprimer">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(section)}
                />
              </Tooltip>
            </Space>
          </div>
        )}

        {/* TAG INACTIF */}
        {!section.isActive && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 9
          }}>
            <Tag color="default">❌ Inactif</Tag>
          </div>
        )}

        {/* 🎨 RENDU RÉEL DE LA SECTION avec SectionRendererV2 */}
        <div 
          onClick={() => onEdit(section)} 
          style={{ 
            cursor: 'pointer',
            opacity: section.isActive ? 1 : 0.6,
            pointerEvents: 'none' // Désactive les interactions dans le preview
          }}
        >
          <SectionRendererV2 section={section} previewMode={true} />
        </div>

        {/* LABEL DU TYPE EN BAS */}
        <div style={{
          background: '#f0f0f0',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center',
          borderTop: '2px solid #e0e0e0',
          fontWeight: 500
        }}>
          📄 {section.name} • {section.type}
        </div>
      </div>
    </div>
  );
};

/**
 * 🎨 CANVAS NO-CODE avec RENDU RÉEL
 * Zone centrale avec aperçu temps réel identique à la prévisualisation
 */
interface NoCodeCanvasProps {
  sections: Section[];
  onReorder: (sections: Section[]) => void;
  onEditSection: (section: Section) => void;
  onDuplicateSection: (section: Section) => void;
  onDeleteSection: (section: Section) => void;
  onToggleSection: (section: Section) => void;
  onAddSection: () => void;
}

const NoCodeCanvas: React.FC<NoCodeCanvasProps> = ({
  sections,
  onReorder,
  onEditSection,
  onDuplicateSection,
  onDeleteSection,
  onToggleSection,
  onAddSection
}) => {
  const [viewMode, setViewMode] = useState<string>('desktop');

  // Gestion du drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      onReorder(reorderedSections);
    }
  };

  // Largeur selon le mode d'affichage
  const canvasWidth = 
    viewMode === 'mobile' ? '375px' :
    viewMode === 'tablet' ? '768px' :
    '100%';

  const canvasMaxWidth = 
    viewMode === 'mobile' ? '375px' :
    viewMode === 'tablet' ? '768px' :
    '1200px';

  return (
    <div style={{ 
      flex: 1, 
      height: '100%', 
      overflowY: 'auto',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* HEADER DU CANVAS */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'white',
        padding: '12px 24px',
        borderBottom: '2px solid #e8e8e8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Text strong style={{ fontSize: '14px' }}>
            🖥️ Canvas • Rendu Réel
          </Text>
          <Tag color="blue">{sections.length} sections</Tag>
          <Tag color="green">
            {sections.filter(s => s.type === 'header').length} header(s)
          </Tag>
          <Tag color="orange">
            {sections.filter(s => !s.isActive).length} inactives
          </Tag>
        </div>

        {/* SÉLECTEUR MODE D'AFFICHAGE */}
        <Segmented
          value={viewMode}
          onChange={setViewMode}
          options={[
            {
              label: (
                <div style={{ padding: '4px 8px' }}>
                  <DesktopOutlined /> Desktop
                </div>
              ),
              value: 'desktop'
            },
            {
              label: (
                <div style={{ padding: '4px 8px' }}>
                  <TabletOutlined /> Tablet
                </div>
              ),
              value: 'tablet'
            },
            {
              label: (
                <div style={{ padding: '4px 8px' }}>
                  <MobileOutlined /> Mobile
                </div>
              ),
              value: 'mobile'
            }
          ]}
        />
      </div>

      {/* ZONE DE CONTENU SCROLLABLE */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        {sections.length === 0 ? (
          <Empty
            description="Aucune section pour le moment"
            style={{ marginTop: '100px' }}
          >
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={onAddSection}
            >
              Ajouter votre première section
            </Button>
          </Empty>
        ) : (
          <div style={{
            width: canvasWidth,
            maxWidth: canvasMaxWidth,
            margin: '0 auto',
            transition: 'width 0.3s ease'
          }}>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => (
                  <SortableItem
                    key={section.id}
                    section={section}
                    onEdit={onEditSection}
                    onDuplicate={onDuplicateSection}
                    onDelete={onDeleteSection}
                    onToggle={onToggleSection}
                    viewMode={viewMode}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* BOUTON AJOUTER EN BAS */}
            <div style={{
              marginTop: '24px',
              padding: '32px',
              border: '2px dashed #d9d9d9',
              borderRadius: '12px',
              textAlign: 'center',
              background: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1890ff';
              e.currentTarget.style.background = '#f0f8ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d9d9d9';
              e.currentTarget.style.background = 'white';
            }}
            onClick={onAddSection}>
              <PlusOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#1890ff' }}>
                Ajouter une nouvelle section
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Cliquez pour ouvrir la bibliothèque de composants
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoCodeCanvas;

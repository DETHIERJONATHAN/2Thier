import { SF, WEBSITE_DEFAULTS } from '../zhiive/ZhiiveTheme';
/**
 * 🎨 PAGE BUILDER - Gestionnaire de sections de site web
 * Permet de créer, éditer, réorganiser toutes les sections d'un site
 * Chaque section a son propre éditeur contextuel
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Empty,
  Tooltip,
  Popconfirm,
  Tabs,
  Select,
  Badge
} from 'antd';
import {
  DragOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  LockOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

// Import des éditeurs spécifiques par type de section
import { HeaderEditor } from './section-editors/HeaderEditor';
import { HeroEditor } from './section-editors/HeroEditor';
import { StatsEditor } from './section-editors/StatsEditor';
import { ContentEditor } from './section-editors/ContentEditor';
import { CTAEditor } from './section-editors/CTAEditor';
import { FooterEditor } from './section-editors/FooterEditor';
import { useTranslation } from 'react-i18next';
import { logger } from '../../lib/logger';

const { Option } = Select;

interface Section {
  id: number;
  websiteId: number;
  key: string;
  type: string;
  name: string;
  content: unknown;
  backgroundColor?: string;
  textColor?: string;
  customCss?: string;
  displayOrder: number;
  isActive: boolean;
  isLocked: boolean;
}

interface SectionsManagerProps {
  websiteId: number;
  siteName: string;
}

// Types de sections disponibles
const SECTION_TYPES = [
  { value: 'header', label: '📌 Header/Bandeau', icon: '📌', description: 'Logo, menu, boutons' },
  { value: 'hero', label: '🎯 Hero Section', icon: '🎯', description: 'Grande bannière avec titre et CTA' },
  { value: 'stats', label: '📊 Statistiques', icon: '📊', description: 'Compteurs de réalisations' },
  { value: 'content', label: '📝 Contenu Libre', icon: '📝', description: 'Texte, images, colonnes' },
  { value: 'services', label: '⚡ Services', icon: '⚡', description: 'Liste des services (géré séparément)' },
  { value: 'projects', label: '🏗️ Projets', icon: '🏗️', description: 'Réalisations (géré séparément)' },
  { value: 'testimonials', label: '⭐ Témoignages', icon: '⭐', description: 'Avis clients (géré séparément)' },
  { value: 'cta', label: '🎨 Call-to-Action', icon: '🎨', description: 'Bandeau avec bouton d\'action' },
  { value: 'footer', label: '📍 Footer', icon: '📍', description: 'Pied de page avec liens' }
];

// Composant item draggable
const SortableItem: React.FC<{
  section: Section;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
}> = ({ section, onEdit, onDelete, onToggle, onDuplicate }) => {
  // DEBUG : Vérifier si la prop section change
  logger.debug(`🎯 SortableItem render - Section ${section.id}:`, section.name, 'isActive:', section.isActive);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionType = SECTION_TYPES.find(t => t.value === section.type);

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        style={{
          marginBottom: 8,
          opacity: section.isActive ? 1 : 0.5,
          borderLeft: `4px solid ${section.backgroundColor || SF.blue}`,
          transition: 'opacity 0.3s ease'
        }}
        styles={{ body: { padding: '12px' } }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px' }}>
              <DragOutlined />
            </div>
            <div>
              <Space>
                <span style={{ fontSize: '18px' }}>{sectionType?.icon}</span>
                <strong>{section.name}</strong>
                <Tag color="blue">{sectionType?.label}</Tag>
                {!section.isActive && <Tag color="default">Inactif</Tag>}
                {section.isLocked && <LockOutlined style={{ color: '#999' }} />}
              </Space>
              <div style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>
                {sectionType?.description}
              </div>
            </div>
          </Space>
          <Space>
            <Tooltip title={section.isActive ? 'Désactiver' : 'Activer'}>
              <Button
                type="text"
                size="small"
                icon={section.isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={onToggle}
              />
            </Tooltip>
            <Tooltip title={t('common.duplicate')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={onDuplicate}
              />
            </Tooltip>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={onEdit}
            />
            {!section.isLocked && (
              <Popconfirm
                title="Supprimer cette section ?"
                description="Cette action est irréversible."
                onConfirm={onDelete}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export const SectionsManager: React.FC<SectionsManagerProps> = ({ websiteId, siteName }) => {
  const { t } = useTranslation();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedType, setSelectedType] = useState<string>('header');
  const [refreshKey, setRefreshKey] = useState(0); // Clé pour forcer le re-render
  const { api } = useAuthenticatedApi();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSections();
  }, [websiteId]);

  const fetchSections = async () => {
    setLoading(true);
    try {
      logger.debug('📡 Fetching sections for websiteId:', websiteId);
      const response = await api.get(`/api/website-sections/${websiteId}`);
      logger.debug('📦 Sections reçues:', response);
      logger.debug('📋 Détail section 2 (Hero):', response.find((s: Section) => s.id === 2));
      
      // FORCER une nouvelle référence pour chaque objet section
      const freshSections = Array.isArray(response) 
        ? response.map((s: Section) => ({ ...s }))  // Shallow copy pour nouvelle référence
        : [];
      
      setSections(freshSections);
      setRefreshKey(prev => prev + 1); // FORCER le re-render complet
    } catch (error) {
      logger.error('❌ Erreur chargement sections:', error);
      message.error('Erreur lors du chargement des sections');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: unknown) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      setSections(newSections);

      try {
        await api.post('/api/website-sections/reorder', {
          sections: newSections.map((s, index) => ({ id: s.id, displayOrder: index + 1 }))
        });
        message.success('Ordre mis à jour');
      } catch (error) {
        logger.error('Erreur réorganisation:', error);
        message.error('Erreur lors de la réorganisation');
        fetchSections();
      }
    }
  };

  const handleAdd = () => {
    setEditingSection(null);
    setModalVisible(true);
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setSelectedType(section.type);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/website-sections/${id}`);
      message.success('Section supprimée');
      fetchSections();
    } catch (error) {
      logger.error('Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleToggle = async (section: Section) => {
    try {
      const newIsActive = !section.isActive;
      logger.debug('🔄 Toggle section:', section.id, 'isActive:', section.isActive, '→', newIsActive);
      
      // 1. UPDATE OPTIMISTE IMMÉDIAT (UI se met à jour instantanément)
      setSections(prevSections => 
        prevSections.map(s => 
          s.id === section.id 
            ? { ...s, isActive: newIsActive }  // Nouvelle référence avec nouvelle valeur
            : s
        )
      );
      
      // 2. Appel API en arrière-plan
      const response = await api.put(`/api/website-sections/${section.id}`, {
        isActive: newIsActive
      });
      logger.debug('✅ Réponse API:', response);
      
      // 3. Recharger pour synchroniser (au cas où)
      await fetchSections();
      logger.debug('✅ Sections rechargées');
      
      message.success(`Section ${newIsActive ? 'activée' : 'désactivée'}`);
    } catch (error) {
      logger.error('❌ Erreur toggle:', error);
      // En cas d'erreur, recharger pour annuler l'optimistic update
      fetchSections();
      message.error('Erreur lors de la modification');
    }
  };

  const handleDuplicate = async (section: Section) => {
    try {
      await api.post(`/api/website-sections/duplicate/${section.id}`);
      message.success('Section dupliquée');
      fetchSections();
    } catch (error) {
      logger.error('Erreur duplication:', error);
      message.error('Erreur lors de la duplication');
    }
  };

  const handleSave = async (content: unknown) => {
    try {
      if (editingSection) {
        // 🔥 FIX: Récupérer la réponse avec les données mergées
        const response = await api.put(`/api/website-sections/${editingSection.id}`, content);
        
        // 🔥 FIX: Mettre à jour localement avec les données complètes au lieu de recharger tout
        setSections(prevSections =>
          prevSections.map(s =>
            s.id === editingSection.id ? response.data : s
          )
        );
        
        message.success('Section modifiée');
      } else {
        const sectionType = SECTION_TYPES.find(t => t.value === selectedType);
        const response = await api.post('/api/website-sections', {
          websiteId,
          key: `${selectedType}-${Date.now()}`,
          type: selectedType,
          name: content.name || sectionType?.label || 'Nouvelle section',
          ...content
        });
        
        // 🔥 FIX: Ajouter la nouvelle section au lieu de recharger tout
        setSections(prevSections => [...prevSections, response.data]);
        
        message.success('Section créée');
      }
      setModalVisible(false);
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
      // En cas d'erreur, recharger pour être sûr
      fetchSections();
    }
  };

  // Rendu de l'éditeur selon le type de section
  const renderEditor = () => {
    const props = {
      section: editingSection,
      onSave: handleSave,
      onCancel: () => setModalVisible(false)
    };

    switch (selectedType) {
      case 'header':
        return <HeaderEditor {...props} />;
      case 'hero':
        return <HeroEditor {...props} />;
      case 'stats':
        return <StatsEditor {...props} />;
      case 'content':
        return <ContentEditor {...props} />;
      case 'cta':
        return <CTAEditor {...props} />;
      case 'footer':
        return <FooterEditor {...props} />;
      default:
        return <ContentEditor {...props} />;
    }
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{sections.length} section(s)</strong>
            <span style={{ marginLeft: '10px', color: WEBSITE_DEFAULTS.primaryColor }}>
              {sections.filter(s => s.isActive).length} active(s)
            </span>
            <span style={{ marginLeft: '10px', color: '#999' }}>
              {sections.filter(s => !s.isActive).length} inactive(s)
            </span>
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              Construisez votre page en ajoutant et réorganisant des sections
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchSections}>
              Actualiser
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Ajouter une section
            </Button>
          </Space>
        </div>

        {sections.length === 0 ? (
          <Empty description="Aucune section. Créez la structure de votre page !" />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <SortableItem
                  key={`${section.id}-${section.isActive}-${refreshKey}`}
                  section={section}
                  onEdit={() => handleEdit(section)}
                  onDelete={() => handleDelete(section.id)}
                  onToggle={() => handleToggle(section)}
                  onDuplicate={() => handleDuplicate(section)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Space>

      <Modal
        title={editingSection ? `Éditer : ${editingSection.name}` : 'Nouvelle section'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {!editingSection && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Type de section
            </label>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: '100%' }}
              size="large"
            >
              {SECTION_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  <Space>
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </div>
        )}

        {renderEditor()}
      </Modal>
    </div>
  );
};

export default SectionsManager;

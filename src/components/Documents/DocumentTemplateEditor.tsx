import { useState, useEffect } from 'react';
import { Button, Card, Select, message, Space, Tag, Divider } from 'antd';
import { PlusOutlined, SaveOutlined, ArrowUpOutlined, ArrowDownOutlined, BgColorsOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import SectionConfigPanel from './SectionConfigPanel';
import InteractivePDFPreview from './InteractivePDFPreview';
import DocumentGlobalThemeEditor, { DocumentGlobalTheme } from './DocumentGlobalThemeEditor';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface Section {
  id: string;
  type: string;
  order: number;
  config: any;
}

interface DocumentTemplateEditorProps {
  templateId: string;
  onSave: () => void;
  onClose: () => void;
}

const SECTION_TYPES = [
  { value: 'COVER_PAGE', label: '📄 Page de couverture' },
  { value: 'COMPANY_PRESENTATION', label: '🏢 Présentation entreprise' },
  { value: 'PROJECT_SUMMARY', label: '📋 Résumé du projet' },
  { value: 'PRICING_TABLE', label: '💰 Tableau des prix' },
  { value: 'TERMS_CONDITIONS', label: '📜 Conditions générales' },
  { value: 'SIGNATURE_BLOCK', label: '✍️ Bloc signature' },
  { value: 'CONTACT_INFO', label: '📞 Informations de contact' },
  { value: 'TIMELINE', label: '📅 Calendrier' },
  { value: 'TECHNICAL_SPECS', label: '🔧 Spécifications techniques' },
  { value: 'TESTIMONIALS', label: '⭐ Témoignages' },
  { value: 'PORTFOLIO', label: '🎨 Portfolio' },
  { value: 'TEAM_PRESENTATION', label: '👥 Présentation équipe' },
  { value: 'FAQ', label: '❓ Questions fréquentes' },
  { value: 'CUSTOM_HTML', label: '🔤 HTML personnalisé' },
];

const DocumentTemplateEditor = ({ templateId, onSave, onClose }: DocumentTemplateEditorProps) => {
  const { api } = useAuthenticatedApi();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionType, setSelectedSectionType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [themeEditorVisible, setThemeEditorVisible] = useState(false);
  const [globalTheme, setGlobalTheme] = useState<DocumentGlobalTheme>({});

  useEffect(() => {
    if (templateId) {
      loadSections();
    }
  }, [templateId]);

  const loadSections = async () => {
    try {
      const response = await api.get(`/api/documents/templates/${templateId}/sections`);
      setSections(response || []);
    } catch (error) {
      console.error('Erreur chargement sections:', error);
    }
  };

  const handleAddSection = () => {
    if (!selectedSectionType) {
      message.warning('Sélectionnez un type de section');
      return;
    }

    const newSection: Section = {
      id: `temp-${Date.now()}`,
      type: selectedSectionType,
      order: sections.length,
      config: {}
    };

    setSections([...sections, newSection]);
    setSelectedSectionType('');
    message.success('Section ajoutée');
  };

  const handleUpdateSection = (index: number, updatedSection: Section) => {
    const newSections = [...sections];
    newSections[index] = updatedSection;
    setSections(newSections);
  };

  const handleDeleteSection = async (index: number) => {
    const sectionToDelete = sections[index];
    
    try {
      // Si la section existe en base de données (pas une section temporaire), la supprimer côté backend
      if (sectionToDelete && !sectionToDelete.id.startsWith('temp-')) {
        await api.delete(`/api/documents/templates/${templateId}/sections/${sectionToDelete.id}`);
      }
      
      const newSections = sections.filter((_, i) => i !== index);
      // Réorganiser les order
      newSections.forEach((section, i) => {
        section.order = i;
      });
      setSections(newSections);
      message.success('Section supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression de la section:', error);
      message.error('Erreur lors de la suppression de la section');
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Mettre à jour les order
    items.forEach((item, index) => {
      item.order = index;
    });

    setSections(items);
  };

  const handleSaveTemplate = async () => {
    try {
      setLoading(true);

      // Sauvegarder chaque section
      for (const section of sections) {
        if (section.id.startsWith('temp-')) {
          // Créer nouvelle section
          await api.post(`/api/documents/templates/${templateId}/sections`, {
            type: section.type,
            order: section.order,
            config: section.config
          });
        } else {
          // Mettre à jour section existante
          await api.put(`/api/documents/templates/${templateId}/sections/${section.id}`, {
            order: section.order,
            config: section.config
          });
        }
      }

      message.success('Template sauvegardé avec succès');
      onSave();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    newSections.forEach((section, i) => {
      section.order = i;
    });

    setSections(newSections);
  };

  return (
    <>
      {/* Animation CSS pour le badge live */}
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(82, 196, 26, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
          }
        }
      `}</style>

      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e8e8e8', 
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>⚙️ Éditeur de Template</h2>
          <Tag color="blue">{sections.length} {sections.length > 1 ? 'sections' : 'section'}</Tag>
        </div>
        <Space size="middle">
          <Button icon={<BgColorsOutlined />} onClick={() => setThemeEditorVisible(true)}>
            🎨 Thème Global
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveTemplate} loading={loading}>
            Enregistrer
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </Space>
      </div>

      {/* Main Content - 2 colonnes */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT PANEL - Configuration (35%) */}
        <div style={{ 
          width: '35%', 
          overflowY: 'auto', 
          padding: '24px',
          backgroundColor: '#fafafa',
          borderRight: '2px solid #e8e8e8'
        }}>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '8px', border: '1px solid #91d5ff' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0050b3', marginBottom: '4px' }}>
              👁️ Prévisualisation en direct activée
            </div>
            <div style={{ fontSize: '11px', color: '#096dd9' }}>
              Vos modifications s'affichent automatiquement à droite
            </div>
          </div>
          {/* Add Section Card */}
          <Card style={{ marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Select
                size="large"
                style={{ flex: 1 }}
                placeholder="🔍 Sélectionner un type de section"
                value={selectedSectionType}
                onChange={setSelectedSectionType}
                options={SECTION_TYPES}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
              <Button
                size="large"
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddSection}
                style={{ minWidth: '120px' }}
              >
                Ajouter
              </Button>
            </div>
          </Card>

          {/* Sections List */}
          {sections.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ color: '#8c8c8c', marginBottom: '8px' }}>Aucune section ajoutée</h3>
              <p style={{ color: '#bfbfbf', margin: 0 }}>
                Sélectionnez un type de section ci-dessus et cliquez sur "Ajouter"
              </p>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {sections.map((section, index) => (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              marginBottom: '16px',
                              opacity: snapshot.isDragging ? 0.6 : 1,
                              ...provided.draggableProps.style
                            }}
                          >
                            <Card
                              style={{ 
                                boxShadow: snapshot.isDragging 
                                  ? '0 8px 24px rgba(0,0,0,0.15)' 
                                  : '0 2px 8px rgba(0,0,0,0.06)',
                                cursor: 'move'
                              }}
                              title={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: 600 }}>
                                    Section {index + 1} - {SECTION_TYPES.find(t => t.value === section.type)?.label || section.type}
                                  </span>
                                  <Space>
                                    <Button
                                      size="small"
                                      icon={<ArrowUpOutlined />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveSection(index, 'up');
                                      }}
                                      disabled={index === 0}
                                    />
                                    <Button
                                      size="small"
                                      icon={<ArrowDownOutlined />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveSection(index, 'down');
                                      }}
                                      disabled={index === sections.length - 1}
                                    />
                                  </Space>
                                </div>
                              }
                            >
                              <SectionConfigPanel
                                section={section}
                                onUpdate={(updated) => handleUpdateSection(index, updated)}
                                onDelete={() => handleDeleteSection(index)}
                              />
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* RIGHT PANEL - Prévisualisation EN DIRECT (65%) */}
        <div style={{ 
          width: '65%', 
          backgroundColor: '#525659',
          overflowY: 'auto',
          padding: '20px',
          position: 'relative'
        }}>
          {/* Badge "Live Preview" */}
          <div style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: '#1890ff',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#52c41a',
                boxShadow: '0 0 0 0 rgba(82, 196, 26, 1)',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                👁️ PRÉVISUALISATION EN DIRECT
              </span>
            </div>
            <Tag color="green" style={{ margin: 0 }}>
              {sections.length} {sections.length > 1 ? 'sections' : 'section'}
            </Tag>
          </div>

          {/* Prévisualisation du PDF */}
          {sections.length > 0 ? (
            <InteractivePDFPreview 
              sections={sections} 
              globalTheme={globalTheme}
              editMode={true}
              templateId={templateId}
              onSectionUpdate={(sectionId, updates) => {
                const index = sections.findIndex(s => s.id === sectionId);
                if (index >= 0) {
                  handleUpdateSection(index, { ...sections[index], ...updates });
                }
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.6 }}>📄</div>
              <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
                Commencez par ajouter une section
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>
                La prévisualisation apparaîtra ici automatiquement
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Thème Global */}
      <DocumentGlobalThemeEditor
        open={themeEditorVisible}
        onClose={() => setThemeEditorVisible(false)}
        onSave={(theme) => {
          setGlobalTheme(theme);
          message.success('Thème global appliqué !');
        }}
        initialTheme={globalTheme}
      />
      </div>
    </>
  );
};

export default DocumentTemplateEditor;

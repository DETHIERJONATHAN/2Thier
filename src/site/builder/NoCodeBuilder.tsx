import React, { useState, useEffect, useMemo } from 'react';
import { Button, message, Spin, Modal, Tabs, Space, Typography, Card, Alert } from 'antd';
import { 
  SaveOutlined, 
  EyeOutlined, 
  FullscreenOutlined,
  PlusOutlined,
  AppstoreOutlined,
  BlockOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { ComponentLibrary } from './ComponentLibrary';
import { Canvas } from './Canvas';
import { UniversalSectionEditor } from '../editor/UniversalSectionEditor';
import { SectionRenderer } from '../renderer/SectionRenderer';
import type { SectionInstance } from '../schemas/types';
import ThemeManager from '../../components/websites/ThemeManager';
import TestimonialsManager from '../../components/websites/TestimonialsManager';
import FormsManager from '../../components/websites/FormsManager';
import AIContentAssistant from '../../components/AIContentAssistant';
import CloudRunDomainSelector from '../../components/websites/CloudRunDomainSelector';

const { Title, Text } = Typography;

/**
 * 🎨 NO-CODE BUILDER v2.0 - SYSTÈME UNIVERSEL
 * 
 * Architecture complètement refaite basée sur les schemas :
 * 
 * 1. ComponentLibrary : Lit les schemas du registry automatiquement
 * 2. Canvas : Affiche les sections avec drag & drop (réorganisation)
 * 3. UniversalSectionEditor : Modal universel qui s'adapte à chaque type de section
 * 4. SectionRenderer : Rendu final basé sur les schemas
 * 
 * FLUX DE DONNÉES :
 * schemas/*.schema.ts → registry → ComponentLibrary → User clique → API créé section
 * → Canvas affiche → User édite → UniversalSectionEditor → Sauvegarde → Rafraîchit Canvas
 * 
 * @author IA Assistant - Système universel modulaire
 * @version 2.0.0
 */

interface NoCodeBuilderProps {
  /** ID du site vitrine */
  websiteId: number;
  /** Nom du site pour l'affichage */
  siteName: string;
}

const NoCodeBuilder: React.FC<NoCodeBuilderProps> = ({ websiteId, siteName }) => {
  // 🔌 API authentifiée (stabilisée avec useMemo)
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook]);

  // 📦 État local
  const [sections, setSections] = useState<SectionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<SectionInstance | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'forms' | 'theme' | 'testimonials' | 'seo' | 'settings'>('builder');
  const [websiteData, setWebsiteData] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // 🔥 CHARGEMENT INITIAL
  useEffect(() => {
    console.log('🎨 [NoCodeBuilder v2] Initialisation websiteId:', websiteId);
    fetchSections();
    fetchWebsiteData();
  }, [websiteId]);

  /**
   * 📡 RÉCUPÉRATION DES DONNÉES DU SITE
   */
  const fetchWebsiteData = async () => {
    try {
      console.log('📡 [NoCodeBuilder v2] Chargement données site...');
      const response = await api.get(`/api/websites/id/${websiteId}`);
      console.log('✅ [NoCodeBuilder v2] Données site chargées:', response);
      setWebsiteData(response);
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur chargement site:', error);
    }
  };

  /**
   * 📡 RÉCUPÉRATION DES SECTIONS DEPUIS L'API
   */
  const fetchSections = async () => {
    setLoading(true);
    try {
      console.log('📡 [NoCodeBuilder v2] Chargement sections...');
      const response = await api.get(`/api/website-sections/${websiteId}`);
      
      // Tri par displayOrder
      const sorted = response.sort((a: SectionInstance, b: SectionInstance) => 
        a.displayOrder - b.displayOrder
      );
      
      console.log('✅ [NoCodeBuilder v2] Sections chargées:', sorted.length);
      setSections(sorted);
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur chargement:', error);
      message.error('Impossible de charger les sections');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ➕ AJOUT D'UNE NOUVELLE SECTION (depuis ComponentLibrary)
   */
  const handleAddSection = async (sectionType: string, defaultContent: any) => {
    try {
      console.log('➕ [NoCodeBuilder v2] Ajout section type:', sectionType);

      const newSection = {
        websiteId,
        key: `${sectionType}-${Date.now()}`,
        type: sectionType,
        name: defaultContent.name || sectionType,
        content: defaultContent,
        displayOrder: sections.length,
        isActive: true,
        isLocked: false
      };

      const response = await api.post('/api/website-sections', newSection);
      console.log('✅ [NoCodeBuilder v2] Section créée ID:', response.id);

      setSections([...sections, response]);
      message.success(`Section "${sectionType}" ajoutée !`);
      
      // Ouvrir l'éditeur directement pour configurer
      setSelectedSection(response);
      setEditorVisible(true);
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur ajout:', error);
      message.error('Erreur lors de l\'ajout de la section');
    }
  };

  /**
   * ✏️ ÉDITION D'UNE SECTION
   */
  const handleEditSection = (section: SectionInstance) => {
    console.log('✏️ [NoCodeBuilder v2] Édition section:', section.type, section.id);
    setSelectedSection(section);
    setEditorVisible(true);
  };

  /**
   * 💾 SAUVEGARDE DES MODIFICATIONS (appelé par UniversalSectionEditor)
   */
  const handleSaveSection = async (updatedContent: any) => {
    if (!selectedSection) return;

    try {
      console.log('💾 [NoCodeBuilder v2] Sauvegarde section ID:', selectedSection.id);
      console.log('💾 [DEBUG] updatedContent reçu:', updatedContent);
      console.log('💾 [DEBUG] updatedContent.style:', updatedContent.style);

      // 🔥 FIX: Récupérer la réponse API avec les données mergées
      const response = await api.put(`/api/website-sections/${selectedSection.id}`, {
        ...selectedSection,
        content: updatedContent
      });

      console.log('🔍 [DEBUG] Response complète:', response);
      console.log('🔍 [DEBUG] response.data:', response.data);
      console.log('🔍 [DEBUG] Type de response:', typeof response);

      // 🔥 FIX: useAuthenticatedApi retourne DIRECTEMENT les données, pas response.data
      const mergedSection = response; // ✅ Pas response.data !
      
      console.log('🔍 [DEBUG] mergedSection:', mergedSection);
      console.log('🔍 [DEBUG] mergedSection.content:', mergedSection.content);
      console.log('🔍 [DEBUG] mergedSection.content.style:', mergedSection.content?.style);

      if (!mergedSection || !mergedSection.id) {
        console.error('❌ [DEBUG] mergedSection invalide!', mergedSection);
        throw new Error('Réponse API invalide');
      }
      
      // Mise à jour locale avec les données COMPLÈTES
      setSections(sections.map(s =>
        s.id === selectedSection.id ? mergedSection : s
      ));

      // 🔥 FIX: Mettre à jour la section sélectionnée pour que l'éditeur ait les bonnes données
      setSelectedSection(mergedSection);

      message.success('Section mise à jour !');
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  /**
   * 🔄 RÉORGANISATION DES SECTIONS (Drag & Drop)
   */
  const handleReorder = async (reorderedSections: SectionInstance[]) => {
    try {
      console.log('🔄 [NoCodeBuilder v2] Réorganisation...');

      // Mise à jour locale immédiate (optimistic update)
      const withNewOrder = reorderedSections.map((s, index) => ({
        ...s,
        displayOrder: index
      }));
      setSections(withNewOrder);

      // Appel API pour persister
      await api.post('/api/website-sections/reorder', {
        sections: withNewOrder.map(s => ({ id: s.id, displayOrder: s.displayOrder }))
      });

      message.success('Ordre mis à jour');
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur réorganisation:', error);
      message.error('Erreur lors de la réorganisation');
      // Rollback
      await fetchSections();
    }
  };

  /**
   * 📋 DUPLICATION D'UNE SECTION
   */
  const handleDuplicateSection = async (section: SectionInstance) => {
    try {
      console.log('📋 [NoCodeBuilder v2] Duplication section ID:', section.id);

      const response = await api.post(`/api/website-sections/${section.id}/duplicate`);
      setSections([...sections, response]);
      message.success('Section dupliquée !');
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur duplication:', error);
      message.error('Erreur lors de la duplication');
    }
  };

  /**
   * 🗑️ SUPPRESSION D'UNE SECTION
   */
  const handleDeleteSection = async (section: SectionInstance) => {
    if (section.isLocked) {
      message.warning('Cette section est verrouillée');
      return;
    }

    try {
      console.log('🗑️ [NoCodeBuilder v2] Suppression section ID:', section.id);

      await api.delete(`/api/website-sections/${section.id}`);
      setSections(sections.filter(s => s.id !== section.id));

      if (selectedSection?.id === section.id) {
        setSelectedSection(null);
        setEditorVisible(false);
      }

      message.success('Section supprimée');
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  /**
   * 👁️ TOGGLE VISIBILITÉ SECTION
   */
  const handleToggleSection = async (section: SectionInstance) => {
    try {
      const newIsActive = !section.isActive;
      console.log('👁️ [NoCodeBuilder v2] Toggle section ID:', section.id, '→', newIsActive);

      // Optimistic update
      setSections(sections.map(s =>
        s.id === section.id ? { ...s, isActive: newIsActive } : s
      ));

      await api.put(`/api/website-sections/${section.id}`, { isActive: newIsActive });
      message.success(`Section ${newIsActive ? 'activée' : 'désactivée'}`);
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur toggle:', error);
      message.error('Erreur lors de la modification');
      // Rollback
      await fetchSections();
    }
  };

  /**
   * 🔒 TOGGLE VERROUILLAGE SECTION
   */
  const handleLockSection = async (section: SectionInstance) => {
    try {
      const newIsLocked = !section.isLocked;
      console.log('🔒 [NoCodeBuilder v2] Lock section ID:', section.id, '→', newIsLocked);

      setSections(sections.map(s =>
        s.id === section.id ? { ...s, isLocked: newIsLocked } : s
      ));

      await api.put(`/api/website-sections/${section.id}`, { isLocked: newIsLocked });
      message.success(`Section ${newIsLocked ? 'verrouillée' : 'déverrouillée'}`);
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur lock:', error);
      message.error('Erreur lors de la modification');
      await fetchSections();
    }
  };

  /**
   * 🌐 PRÉVISUALISATION PLEIN ÉCRAN
   */
  const handleFullPreview = () => {
    console.log('🌐 [NoCodeBuilder v2] Ouverture prévisualisation');
    setPreviewMode(true);
  };

  /**
   * 💾 SAUVEGARDE GLOBALE
   */
  const handleSaveAll = () => {
    message.success('✅ Toutes les sections sont sauvegardées automatiquement !');
  };

  /**
   * 💾 SAUVEGARDE DES PARAMÈTRES DU SITE
   */
  const handleSaveSettings = async (cloudRunData: any) => {
    setSavingSettings(true);
    try {
      console.log('💾 [NoCodeBuilder v2] Sauvegarde paramètres site:', cloudRunData);
      
      // ⚠️ IMPORTANT: N'envoyer QUE les champs autorisés par le schéma Prisma
      // Ne PAS spreader websiteData car il contient des relations imbriquées
      const payload = {
        cloudRunDomain: cloudRunData?.cloudRunDomain,
        cloudRunServiceName: cloudRunData?.cloudRunServiceName,
        cloudRunRegion: cloudRunData?.cloudRunRegion
      };
      
      console.log('📤 [NoCodeBuilder v2] Payload envoyé:', payload);
      await api.put(`/api/websites/${websiteId}`, payload);
      message.success('Paramètres du site sauvegardés !');
      await fetchWebsiteData();
    } catch (error) {
      console.error('❌ [NoCodeBuilder v2] Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingSettings(false);
    }
  };

  // 🔄 LOADING STATE
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <Text type="secondary">Chargement du builder...</Text>
      </div>
    );
  }

  return (
    <div className="nocode-builder-v2" style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 200px)',
      background: '#f0f2f5',
      overflow: 'hidden'
    }}>
      {/* 🎯 BARRE DE NAVIGATION SUPÉRIEURE */}
      <div style={{
        background: 'white',
        borderBottom: '2px solid #e8e8e8',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        zIndex: 1000
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {/* Titre */}
          <Space size="large">
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              🎨 {siteName}
            </Title>
            <Text type="secondary">
              {sections.length} section{sections.length > 1 ? 's' : ''} • 
              {sections.filter(s => s.isActive).length} active{sections.filter(s => s.isActive).length > 1 ? 's' : ''}
            </Text>
          </Space>

          {/* Actions */}
          <Space size="middle">
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => setShowLibrary(!showLibrary)}
              type={showLibrary ? 'primary' : 'default'}
            >
              {showLibrary ? 'Masquer' : 'Afficher'} bibliothèque
            </Button>
            <Button
              icon={<FullscreenOutlined />}
              onClick={handleFullPreview}
              size="large"
            >
              Prévisualisation
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAll}
              size="large"
            >
              Sauvegarder
            </Button>
          </Space>
        </div>

        {/* Onglets Builder / Preview / Thème / SEO / Paramètres */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'builder' | 'preview' | 'forms' | 'theme' | 'seo' | 'settings')}
          style={{ marginTop: '16px', marginBottom: 0 }}
          items={[
            {
              key: 'builder',
              label: (
                <span>
                  <BlockOutlined /> Builder
                </span>
              )
            },
            {
              key: 'preview',
              label: (
                <span>
                  <EyeOutlined /> Aperçu
                </span>
              )
            },
            {
              key: 'forms',
              label: (
                <span>
                  📋 Formulaires
                </span>
              )
            },
            {
              key: 'theme',
              label: (
                <span>
                  🖌️ Thème
                </span>
              )
            },
            {
              key: 'seo',
              label: (
                <span>
                  🔍 SEO
                </span>
              )
            },
            {
              key: 'settings',
              label: (
                <span>
                  ⚙️ Paramètres
                </span>
              )
            }
          ]}
        />
      </div>

      {/* 🎨 CONTENU PRINCIPAL (Builder, Preview, Thème, SEO) */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden',
        position: 'relative' 
      }}>
        {activeTab === 'builder' ? (
          <>
            {/* 📚 BIBLIOTHÈQUE DE COMPOSANTS (Gauche) */}
            {showLibrary && (
              <div style={{
                width: '320px',
                borderRight: '1px solid #e8e8e8',
                background: 'white',
                overflow: 'auto'
              }}>
                <ComponentLibrary onSelectComponent={handleAddSection} />
              </div>
            )}

            {/* 🖼️ CANVAS (Centre) */}
            <div style={{ flex: 1, overflow: 'auto', background: '#f0f2f5' }}>
              <Canvas
                sections={sections}
                onReorder={handleReorder}
                onEdit={handleEditSection}
                onDuplicate={handleDuplicateSection}
                onDelete={handleDeleteSection}
                onToggle={handleToggleSection}
                onLock={handleLockSection}
                onAddSection={() => setShowLibrary(true)}
              />
            </div>
          </>
        ) : activeTab === 'preview' ? (
          /* 👁️ PREVIEW MODE */
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            background: 'white',
            padding: '0'
          }}>
            {sections
              .filter(s => s.isActive)
              .map((section) => (
                <SectionRenderer 
                  key={section.id} 
                  section={section}
                  mode="preview"
                />
              ))}
            
            {sections.filter(s => s.isActive).length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '100px 20px',
                color: '#999'
              }}>
                <EyeOutlined style={{ fontSize: '64px', marginBottom: '16px' }} />
                <Title level={4} type="secondary">Aucune section active</Title>
                <Text type="secondary">
                  Activez des sections dans le mode Builder pour les voir ici
                </Text>
              </div>
            )}
          </div>
        ) : activeTab === 'forms' ? (
          /* 📋 FORMULAIRES MODE - Style Effy */
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            background: '#f0f2f5',
            padding: '24px'
          }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <FormsManager websiteId={websiteId} />
            </div>
          </div>
        ) : activeTab === 'theme' ? (
          /* 🖌️ THÈME MODE */
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            background: '#f0f2f5',
            padding: '24px'
          }}>
            <Card style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <ThemeManager websiteId={websiteId} />
            </Card>
          </div>
        ) : activeTab === 'seo' ? (
          /* 🔍 SEO MODE */
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            background: '#f0f2f5',
            padding: '24px'
          }}>
            <Card style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                  message="Optimisez votre SEO avec l'IA"
                  description="Générez des méta-descriptions, titres et mots-clés optimisés pour votre site"
                  type="info"
                  showIcon
                />
                <AIContentAssistant
                  type="seo"
                  siteName={siteName}
                  industry="transition énergétique"
                  onContentGenerated={(suggestions) => {
                    message.success('Suggestions SEO générées !');
                    console.log('SEO:', suggestions);
                  }}
                />
              </Space>
            </Card>
          </div>
        ) : activeTab === 'settings' ? (
          /* ⚙️ SETTINGS MODE - Paramètres du site */
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            background: '#f0f2f5',
            padding: '24px'
          }}>
            <Card 
              title="⚙️ Paramètres du site"
              style={{ maxWidth: '1200px', margin: '0 auto' }}
              extra={
                <Button
                  type="primary"
                  htmlType="button"
                  icon={<SaveOutlined />}
                  loading={savingSettings}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cloudRunData = {
                      cloudRunDomain: websiteData?.cloudRunDomain,
                      cloudRunServiceName: websiteData?.cloudRunServiceName,
                      cloudRunRegion: websiteData?.cloudRunRegion
                    };
                    handleSaveSettings(cloudRunData);
                  }}
                >
                  Sauvegarder
                </Button>
              }
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                  message="Configuration du domaine Cloud Run"
                  description="Liez ce site à un domaine déjà mappé dans Google Cloud Run pour le rendre accessible via une URL personnalisée."
                  type="info"
                  showIcon
                />
                
                {websiteData && (
                  <CloudRunDomainSelector
                    value={{
                      cloudRunDomain: websiteData.cloudRunDomain,
                      cloudRunServiceName: websiteData.cloudRunServiceName,
                      cloudRunRegion: websiteData.cloudRunRegion
                    }}
                    onChange={(newValue) => {
                      console.log('🔄 CloudRunDomainSelector onChange:', newValue);
                      setWebsiteData({
                        ...websiteData,
                        ...newValue
                      });
                    }}
                  />
                )}

                {!websiteData && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin tip="Chargement des paramètres..." />
                  </div>
                )}
              </Space>
            </Card>
          </div>
        ) : null}
      </div>

      {/* 🎨 ÉDITEUR UNIVERSEL (Drawer Modal) */}
      {selectedSection && (
        <UniversalSectionEditor
          websiteId={websiteId}
          sectionType={selectedSection.type}
          content={selectedSection.content}
          onChange={handleSaveSection}
          visible={editorVisible}
          onClose={() => {
            setEditorVisible(false);
            setSelectedSection(null);
          }}
          mode="drawer"
        />
      )}

      {/* 🌐 MODAL PRÉVISUALISATION PLEIN ÉCRAN */}
      <Modal
        title={null}
        open={previewMode}
        onCancel={() => setPreviewMode(false)}
        footer={null}
        width="100%"
        style={{ top: 0, maxWidth: '100vw', padding: 0 }}
        styles={{ body: { padding: 0, height: '100vh', overflow: 'auto' } }}
      >
        {/* Header sticky */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: 'white',
          padding: '16px 24px',
          borderBottom: '2px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Title level={4} style={{ margin: 0 }}>
            🌐 Prévisualisation : {siteName}
          </Title>
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              href={`/preview/${websiteId}`}
              target="_blank"
            >
              Ouvrir dans un nouvel onglet
            </Button>
            <Button onClick={() => setPreviewMode(false)}>
              Fermer
            </Button>
          </Space>
        </div>

        {/* Rendu des sections */}
        <div style={{ background: 'white' }}>
          {sections
            .filter(s => s.isActive)
            .map((section) => (
              <SectionRenderer 
                key={section.id} 
                section={section}
                mode="preview"
              />
            ))}
        </div>
      </Modal>

      {/* 🎨 STYLES RESPONSIVE */}
      <style>{`
        .nocode-builder-v2 {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        @media (max-width: 768px) {
          .nocode-builder-v2 .ant-space {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default NoCodeBuilder;

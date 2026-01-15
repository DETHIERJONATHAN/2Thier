/**
 * TemplateSelector.tsx
 * 
 * Composant de sélection de template pour la création de nouveaux documents.
 * Affiche les templates disponibles par catégorie avec prévisualisation.
 */

import React, { useState, useMemo } from 'react';
import { Modal, Card, Tabs, Row, Col, Typography, Tag, Button, Empty, Tooltip } from 'antd';
import { 
  FileTextOutlined, 
  PlusOutlined, 
  CheckCircleFilled,
  EyeOutlined,
} from '@ant-design/icons';
import { 
  ALL_TEMPLATES, 
  TEMPLATE_CATEGORIES, 
  DocumentTemplate,
  getTemplatesByCategory,
} from './DocumentTemplates';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface TemplateSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: DocumentTemplate | null) => void;
}

/**
 * Carte de prévisualisation d'un template
 */
const TemplateCard: React.FC<{
  template: DocumentTemplate;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}> = ({ template, selected, onSelect, onPreview }) => {
  return (
    <Card
      hoverable
      className={`template-card ${selected ? 'template-card-selected' : ''}`}
      onClick={onSelect}
      style={{
        border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        borderRadius: 8,
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
      bodyStyle={{ padding: 16 }}
    >
      {selected && (
        <CheckCircleFilled 
          style={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            color: '#1890ff',
            fontSize: 20,
          }} 
        />
      )}
      
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 40 }}>{template.icon}</span>
      </div>
      
      <Title level={5} style={{ marginBottom: 4, textAlign: 'center' }}>
        {template.name}
      </Title>
      
      <Paragraph 
        type="secondary" 
        style={{ 
          fontSize: 12, 
          marginBottom: 8,
          textAlign: 'center',
          minHeight: 36,
        }}
        ellipsis={{ rows: 2 }}
      >
        {template.description}
      </Paragraph>
      
      <div style={{ textAlign: 'center' }}>
        <Tag color="blue">{template.modules.length} modules</Tag>
        <Tooltip title="Prévisualiser">
          <Button 
            type="text" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          />
        </Tooltip>
      </div>
    </Card>
  );
};

/**
 * Carte pour créer un document vierge
 */
const BlankDocumentCard: React.FC<{
  selected: boolean;
  onSelect: () => void;
}> = ({ selected, onSelect }) => {
  return (
    <Card
      hoverable
      onClick={onSelect}
      style={{
        border: selected ? '2px solid #1890ff' : '1px dashed #d9d9d9',
        borderRadius: 8,
        position: 'relative',
        backgroundColor: selected ? '#e6f7ff' : '#fafafa',
        transition: 'all 0.2s ease',
      }}
      bodyStyle={{ 
        padding: 16, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
      }}
    >
      {selected && (
        <CheckCircleFilled 
          style={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            color: '#1890ff',
            fontSize: 20,
          }} 
        />
      )}
      
      <PlusOutlined style={{ fontSize: 40, color: '#1890ff', marginBottom: 12 }} />
      
      <Title level={5} style={{ marginBottom: 4 }}>
        Document vierge
      </Title>
      
      <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
        Commencer avec une page vide et ajouter vos propres modules
      </Text>
    </Card>
  );
};

/**
 * Modal de prévisualisation d'un template
 */
const TemplatePreviewModal: React.FC<{
  template: DocumentTemplate | null;
  visible: boolean;
  onClose: () => void;
}> = ({ template, visible, onClose }) => {
  if (!template) return null;

  return (
    <Modal
      title={`Aperçu : ${template.name}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Description :</Text>
          <Paragraph>{template.description}</Paragraph>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Text strong>Structure du document :</Text>
          <div style={{ 
            marginTop: 8, 
            padding: 16, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 8,
            maxHeight: 300,
            overflow: 'auto',
          }}>
            {template.modules.map((module, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '8px 12px', 
                  marginBottom: 4,
                  backgroundColor: 'white',
                  borderRadius: 4,
                  border: '1px solid #e8e8e8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: '50%', 
                  backgroundColor: '#1890ff',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}>
                  {index + 1}
                </span>
                <Text>{formatModuleName(module.moduleType)}</Text>
                {module.theme && (
                  <Tag size="small" color="geekblue">{module.theme}</Tag>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <Text strong>Format de page :</Text>
          <div style={{ marginTop: 4 }}>
            <Tag>{template.defaultPageSettings?.format || 'A4'}</Tag>
            <Tag>{template.defaultPageSettings?.orientation || 'portrait'}</Tag>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Formatage du nom de module pour l'affichage
 */
const formatModuleName = (moduleType: string): string => {
  const names: Record<string, string> = {
    'COMPANY_HEADER': 'En-tête entreprise',
    'CLIENT_HEADER': 'Bloc client',
    'DOCUMENT_HEADER': 'En-tête complet',
    'DOCUMENT_INFO': 'Informations document',
    'DOCUMENT_FOOTER': 'Pied de page',
    'PRICING_TABLE': 'Tableau de prix',
    'TOTALS_SUMMARY': 'Récapitulatif totaux',
    'PAYMENT_INFO': 'Informations de paiement',
    'VALIDITY_NOTICE': 'Avis de validité',
    'SIGNATURE_BLOCK': 'Bloc signature',
    'TEXT_BLOCK': 'Bloc de texte',
    'SPACER': 'Espacement',
    'IMAGE': 'Image',
    'DIVIDER': 'Séparateur',
  };
  return names[moduleType] || moduleType;
};

/**
 * Composant principal de sélection de template
 */
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  visible,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isBlankSelected, setIsBlankSelected] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Réinitialiser la sélection à l'ouverture
  React.useEffect(() => {
    if (visible) {
      setSelectedTemplate(null);
      setIsBlankSelected(false);
      setActiveCategory('all');
    }
  }, [visible]);

  // Templates filtrés par catégorie
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') {
      return ALL_TEMPLATES;
    }
    return getTemplatesByCategory(activeCategory as DocumentTemplate['category']);
  }, [activeCategory]);

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsBlankSelected(false);
  };

  const handleSelectBlank = () => {
    setSelectedTemplate(null);
    setIsBlankSelected(true);
  };

  const handleConfirm = () => {
    if (isBlankSelected) {
      onSelectTemplate(null);
    } else if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <span>Créer un nouveau document</span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width={900}
        footer={[
          <Button key="cancel" onClick={onClose}>
            Annuler
          </Button>,
          <Button 
            key="create" 
            type="primary" 
            onClick={handleConfirm}
            disabled={!selectedTemplate && !isBlankSelected}
          >
            {isBlankSelected ? 'Créer document vierge' : 'Utiliser ce template'}
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Choisissez un template pour démarrer rapidement ou créez un document vierge.
          </Text>
        </div>

        <Tabs 
          activeKey={activeCategory} 
          onChange={setActiveCategory}
          style={{ marginBottom: 16 }}
        >
          <TabPane 
            tab={
              <span>
                <FileTextOutlined /> Tous
              </span>
            } 
            key="all" 
          />
          {TEMPLATE_CATEGORIES.map(cat => (
            <TabPane 
              tab={
                <span>
                  {cat.icon} {cat.name}
                </span>
              } 
              key={cat.id} 
            />
          ))}
        </Tabs>

        <Row gutter={[16, 16]}>
          {/* Document vierge toujours en premier */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <BlankDocumentCard
              selected={isBlankSelected}
              onSelect={handleSelectBlank}
            />
          </Col>

          {/* Templates filtrés */}
          {filteredTemplates.map(template => (
            <Col xs={24} sm={12} md={8} lg={6} key={template.id}>
              <TemplateCard
                template={template}
                selected={selectedTemplate?.id === template.id}
                onSelect={() => handleSelectTemplate(template)}
                onPreview={() => setPreviewTemplate(template)}
              />
            </Col>
          ))}

          {filteredTemplates.length === 0 && (
            <Col span={24}>
              <Empty 
                description="Aucun template dans cette catégorie"
                style={{ padding: 40 }}
              />
            </Col>
          )}
        </Row>
      </Modal>

      {/* Modal de prévisualisation */}
      <TemplatePreviewModal
        template={previewTemplate}
        visible={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </>
  );
};

export default TemplateSelector;

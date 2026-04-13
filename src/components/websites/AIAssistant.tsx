/**
 * 🤖 AIAssistant - Assistant IA avec Google Gemini
 * Génère des suggestions intelligentes pour le contenu des sections
 */

import React, { useState } from 'react';
import {
  Button,
  Modal,
  Card,
  List,
  Space,
  Spin,
  Alert,
  Tooltip,
  Tag,
  Row,
  Col,
  message
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  ReloadOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { logger } from '../../lib/logger';

export type AIContext = 
  | 'title' 
  | 'subtitle'
  | 'description' 
  | 'fullSection' 
  | 'layout' 
  | 'colors' 
  | 'content'
  | 'seo';

interface AIAssistantProps {
  context: AIContext;
  currentValue?: unknown;
  onSuggestion: (suggestion: unknown) => void;
  sectionType?: string;
  buttonSize?: 'small' | 'middle' | 'large';
  buttonType?: 'default' | 'primary' | 'text' | 'link' | 'dashed';
  showText?: boolean;
}

interface AISuggestion {
  value: unknown;
  reason?: string;
  score?: number;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  context,
  currentValue,
  onSuggestion,
  sectionType = 'section',
  buttonSize = 'small',
  buttonType = 'text',
  showText = false
}) => {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);
    setModalOpen(true);

    try {
      const prompt = buildPrompt(context, currentValue, sectionType);
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context,
          sectionType,
          currentValue
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        throw new Error(data.error || 'Aucune suggestion générée');
      }
    } catch (err: unknown) {
      logger.error('AI Generation Error:', err);
      setError(err.message || 'Erreur lors de la génération des suggestions');
      message.error('Erreur IA : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const buildPrompt = (context: AIContext, value: unknown, sectionType: string): string => {
    const baseContext = `Tu es un expert en web design, copywriting et UX. Tu crées du contenu engageant et optimisé pour le web.`;

    switch (context) {
      case 'title':
        return `${baseContext}\n\nGénère 5 titres accrocheurs et professionnels pour une section "${sectionType}" d'un site web.\n\nTitre actuel: "${value || 'Aucun'}"\n\nRègles:\n- Clair et concis (max 60 caractères)\n- Impactant et mémorable\n- Adapté au secteur d'activité\n- Optimisé SEO\n\nFormat de réponse: JSON array de strings`;

      case 'subtitle':
        return `${baseContext}\n\nGénère 3 sous-titres pertinents pour une section "${sectionType}".\n\nTitre principal: "${currentValue?.title || 'Non défini'}"\nSous-titre actuel: "${value || 'Aucun'}"\n\nRègles:\n- Complète le titre principal\n- Court et percutant (max 100 caractères)\n- Apporte une valeur ajoutée\n\nFormat de réponse: JSON array de strings`;

      case 'description':
        return `${baseContext}\n\nGénère 3 descriptions engageantes pour une section "${sectionType}".\n\nTitre: "${currentValue?.title || 'Non défini'}"\nDescription actuelle: "${value || 'Aucune'}"\n\nRègles:\n- 2-3 phrases maximum\n- Ton professionnel mais accessible\n- Bénéfices clairs pour l'utilisateur\n- Incite à l'action\n\nFormat de réponse: JSON array de strings`;

      case 'fullSection':
        return `${baseContext}\n\nGénère un contenu COMPLET pour une section "${sectionType}" incluant:\n- 1 titre principal\n- 1 sous-titre\n- 1 description (2-3 phrases)\n- 3 à 6 éléments/cartes avec titre et description courte\n\nRègles:\n- Contenu cohérent et professionnel\n- Adapté au secteur\n- Optimisé pour la conversion\n\nFormat de réponse: JSON object avec { title, subtitle, description, items: [{ title, description }] }`;

      case 'layout':
        return `${baseContext}\n\nSuggère 3 dispositions de grille optimales pour une section "${sectionType}" contenant ${currentValue?.itemCount || 6} éléments.\n\nConsidérations:\n- Lisibilité\n- Esthétique\n- Responsive design\n- Hiérarchie visuelle\n\nFormat de réponse: JSON array avec [{ columns, rows, gap, responsive: {mobile, tablet, desktop}, reason }]`;

      case 'colors':
        return `${baseContext}\n\nSuggère 3 palettes de couleurs harmonieuses pour une section "${sectionType}".\n\nPalette actuelle: ${JSON.stringify(value || {})}\n\nRègles:\n- Harmonie des couleurs\n- Contraste suffisant (accessibilité)\n- Moderne et professionnel\n- Adapté au web\n\nFormat de réponse: JSON array avec [{ primary, secondary, accent, background, text, reason }]`;

      case 'seo':
        return `${baseContext}\n\nOptimise le contenu SEO pour une section "${sectionType}".\n\nContenu actuel: ${JSON.stringify(value || {})}\n\nGénère:\n- Meta title (max 60 caractères)\n- Meta description (max 160 caractères)\n- 5 mots-clés pertinents\n- Balises alt pour images\n\nFormat de réponse: JSON object avec { metaTitle, metaDescription, keywords: [], altTexts: [] }`;

      default:
        return `${baseContext}\n\nAméliore ce contenu pour une section "${sectionType}":\n\n${JSON.stringify(value)}\n\nFormat de réponse: JSON avec suggestions`;
    }
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    onSuggestion(suggestion.value);
    setModalOpen(false);
    message.success('✨ Suggestion appliquée avec succès !');
  };

  const renderSuggestion = (suggestion: AISuggestion, index: number) => {
    switch (context) {
      case 'title':
      case 'subtitle':
      case 'description':
        return (
          <Card
            key={`item-${index}`}
            size="small"
            hoverable
            style={{ marginBottom: 12 }}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => applySuggestion(suggestion)}
              >
                Appliquer
              </Button>
            }
          >
            <div style={{ fontSize: context === 'title' ? '18px' : context === 'subtitle' ? '16px' : '14px' }}>
              {suggestion.value}
            </div>
            {suggestion.reason && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                <BulbOutlined /> {suggestion.reason}
              </div>
            )}
          </Card>
        );

      case 'fullSection':
        return (
          <Card
            key={`item-${index}`}
            title={`💡 Proposition ${index + 1}`}
            size="small"
            style={{ marginBottom: 16 }}
            extra={
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => applySuggestion(suggestion)}
              >
                Appliquer tout
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <strong>Titre:</strong>
                <div style={{ fontSize: '18px', marginTop: 4 }}>{suggestion.value.title}</div>
              </div>
              <div>
                <strong>Sous-titre:</strong>
                <div style={{ fontSize: '14px', color: '#666', marginTop: 4 }}>{suggestion.value.subtitle}</div>
              </div>
              <div>
                <strong>Description:</strong>
                <div style={{ marginTop: 4 }}>{suggestion.value.description}</div>
              </div>
              <div>
                <strong>Éléments ({suggestion.value.items?.length || 0}):</strong>
                <List
                  size="small"
                  dataSource={suggestion.value.items || []}
                  renderItem={(item: unknown) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.title}
                        description={item.description}
                      />
                    </List.Item>
                  )}
                />
              </div>
            </Space>
          </Card>
        );

      case 'layout':
        return (
          <Card
            key={`item-${index}`}
            size="small"
            hoverable
            style={{ marginBottom: 12 }}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => applySuggestion(suggestion)}
              >
                Appliquer
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <div><strong>Grille:</strong> {suggestion.value.columns} × {suggestion.value.rows || 'auto'}</div>
                <div><strong>Gap:</strong> {suggestion.value.gap}px</div>
              </Col>
              <Col span={12}>
                <div><strong>Mobile:</strong> {suggestion.value.responsive?.mobile} col</div>
                <div><strong>Tablet:</strong> {suggestion.value.responsive?.tablet} col</div>
                <div><strong>Desktop:</strong> {suggestion.value.responsive?.desktop} col</div>
              </Col>
            </Row>
            {suggestion.reason && (
              <Alert
                message={suggestion.reason}
                type="info"
                showIcon
                icon={<BulbOutlined />}
                style={{ marginTop: 12 }}
              />
            )}
          </Card>
        );

      case 'colors':
        return (
          <Card
            key={`item-${index}`}
            size="small"
            hoverable
            style={{ marginBottom: 12 }}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => applySuggestion(suggestion)}
              >
                Appliquer
              </Button>
            }
          >
            <Space wrap style={{ marginBottom: 12 }}>
              <Tag color={suggestion.value.primary}>Primary: {suggestion.value.primary}</Tag>
              <Tag color={suggestion.value.secondary}>Secondary: {suggestion.value.secondary}</Tag>
              <Tag color={suggestion.value.accent}>Accent: {suggestion.value.accent}</Tag>
              <Tag color={suggestion.value.background}>BG: {suggestion.value.background}</Tag>
              <Tag color={suggestion.value.text}>Text: {suggestion.value.text}</Tag>
            </Space>
            {suggestion.reason && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                <BulbOutlined /> {suggestion.reason}
              </div>
            )}
          </Card>
        );

      default:
        return (
          <Card
            key={`item-${index}`}
            size="small"
            hoverable
            style={{ marginBottom: 12 }}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => applySuggestion(suggestion)}
              >
                Appliquer
              </Button>
            }
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(suggestion.value, null, 2)}
            </pre>
          </Card>
        );
    }
  };

  const getContextLabel = (context: AIContext): string => {
    const labels: Record<AIContext, string> = {
      title: 'Titres',
      subtitle: 'Sous-titres',
      description: 'Descriptions',
      fullSection: 'Section complète',
      layout: 'Layouts',
      colors: 'Palettes de couleurs',
      content: 'Contenu',
      seo: 'Optimisation SEO'
    };
    return labels[context] || 'Suggestions';
  };

  return (
    <>
      <Tooltip title={`Générer des ${getContextLabel(context).toLowerCase()} avec IA (Gemini)`}>
        <Button
          icon={<RobotOutlined />}
          loading={loading}
          onClick={generateSuggestions}
          size={buttonSize}
          type={buttonType}
        >
          {showText && 'IA'}
        </Button>
      </Tooltip>

      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            <span>Suggestions IA - {getContextLabel(context)}</span>
            <Tag color="blue">Gemini</Tag>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={context === 'fullSection' ? 900 : 700}
        footer={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={generateSuggestions} loading={loading}>
            Régénérer
          </Button>,
          <Button key="close" onClick={() => setModalOpen(false)}>
            Fermer
          </Button>
        ]}
      >
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#666' }}>
              Gemini génère des suggestions pour vous...
            </div>
          </div>
        )}

        {error && !loading && (
          <Alert
            message="Erreur lors de la génération"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {!loading && !error && suggestions.length === 0 && (
          <Alert
            message="Aucune suggestion disponible"
            description="Cliquez sur 'Régénérer' pour obtenir des suggestions."
            type="info"
            showIcon
          />
        )}

        {!loading && suggestions.length > 0 && (
          <div>
            <Alert
              message={`${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''} générée${suggestions.length > 1 ? 's' : ''}`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            {suggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
          </div>
        )}
      </Modal>
    </>
  );
};

export default AIAssistant;

import React, { useState, useMemo } from 'react';
import { Button, Tooltip, message, Modal, List, Space, Tag, Typography, Divider } from 'antd';
import { ThunderboltOutlined, StarFilled, CheckCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { logger } from '../../lib/logger';

const { Text, Paragraph } = Typography;

/**
 * ✨ AI ASSIST BUTTON - CONNECTÉ AUX API ROUTES
 * 
 * Bouton pour générer du contenu avec l'IA pour un champ spécifique.
 * S'affiche à côté de chaque champ dans UniversalSectionEditor.
 * 
 * UTILISATION DES API ROUTES :
 * - Appel à POST /api/ai/generate-field
 * - Gestion du loading, erreurs, succès
 * - Affichage de l'analyse de qualité
 * 
 * @author IA Assistant - Phase C connectée
 */

interface AIAssistButtonProps {
  /** ID unique du champ */
  fieldId: string;
  /** Type de champ (text, textarea, etc.) */
  fieldType: string;
  /** Label du champ pour contextualiser */
  fieldLabel: string;
  /** Valeur actuelle du champ */
  currentValue?: unknown;
  /** Contexte IA (type de section, business, tone, etc.) */
  aiContext: {
    sectionType: string;
    businessType?: string;
    tone?: string;
    targetAudience?: string;
    language?: string;
    keywords?: string[];
  };
  /** Callback quand le contenu est généré */
  onGenerated: (content: unknown) => void;
}

const AIAssistButton: React.FC<AIAssistButtonProps> = ({
  fieldId,
  fieldType,
  fieldLabel,
  currentValue,
  aiContext,
  onGenerated
}) => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  
  // 🔌 API authentifiée (stabilisée)
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook]);

  /**
   * 🚀 GÉNÉRATION DE CONTENU VIA API
   */
  const handleGenerate = async () => {
    setLoading(true);
    try {
      logger.debug('🤖 [AI] Génération pour:', fieldId, fieldType, aiContext);
      
      // 📡 Appel à l'API route
      const response = await api.post('/api/ai/generate-field', {
        fieldId,
        fieldType,
        fieldLabel,
        currentValue,
        aiContext
      });

      logger.debug('✅ [AI] Réponse API:', response);

      // � Stocker les suggestions et l'analyse
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
        setAnalysis(response.analysis);
        setModalVisible(true); // Ouvrir le modal de choix
        
        message.success({
          content: `✨ ${response.suggestions.length} suggestions générées ! Choisissez celle qui vous convient.`,
          duration: 3
        });
      } else {
        throw new Error('Aucune suggestion générée');
      }

    } catch (error: unknown) {
      logger.error('❌ [AI] Erreur génération:', error);
      
      // Gestion des erreurs spécifiques
      if (error.response?.status === 429) {
        message.error('⏱️ Trop de requêtes IA. Attendez 1 minute.');
      } else if (error.response?.status === 400) {
        message.error('❌ Paramètres invalides. Vérifiez le contexte IA.');
      } else if (error.message?.includes('GOOGLE_AI_API_KEY') || error.message?.includes('API key')) {
        message.error('❌ Clé API Gemini manquante. Configurez GOOGLE_AI_API_KEY.');
      } else {
        message.error('❌ Erreur lors de la génération du contenu');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ SÉLECTION D'UNE SUGGESTION
   */
  const handleSelectSuggestion = (content: unknown) => {
    onGenerated(content);
    setModalVisible(false);
    setSuggestions([]);
    setAnalysis(null);
    
    message.success('✅ Suggestion appliquée !');
  };

  /**
   * 🎨 RENDU DU CONTENU SELON LE TYPE
   */
  const renderContent = (content: unknown) => {
    // Si c'est un tableau (features, tags, etc.)
    if (Array.isArray(content)) {
      return (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {content.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    }
    
    // Texte simple
    return <Text>{content}</Text>;
  };

  return (
    <>
      <Tooltip title="Générer avec l'IA" placement="top">
        <Button
          type="text"
          icon={<ThunderboltOutlined />}
          loading={loading}
          onClick={handleGenerate}
          style={{
            background: loading 
              ? '#d9d9d9' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: loading 
              ? 'none' 
              : '0 2px 8px rgba(102, 126, 234, 0.25)',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          ✨
        </Button>
      </Tooltip>

      {/* 🎯 MODAL DE SÉLECTION DES SUGGESTIONS */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#667eea' }} />
            <span>Suggestions IA pour "{fieldLabel}"</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSuggestions([]);
          setAnalysis(null);
        }}
        footer={null}
        width={700}
      >
        {analysis && (
          <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
            <Space>
              <Text strong>Score moyen :</Text>
              <Tag color={analysis.avgScore >= 90 ? 'green' : analysis.avgScore >= 80 ? 'blue' : 'orange'}>
                {analysis.avgScore}/100
              </Tag>
              <Tag>{analysis.qualityLevel}</Tag>
            </Space>
            
            {analysis.bestApproach && (
              <Text type="secondary" italic>
                💡 {analysis.bestApproach}
              </Text>
            )}

            {analysis.keywords && analysis.keywords.length > 0 && (
              <Space>
                <Text strong>Mots-clés :</Text>
                {analysis.keywords.map((kw: string, idx: number) => (
                  <Tag key={idx} color="purple">{kw}</Tag>
                ))}
              </Space>
            )}
          </Space>
        )}

        <Divider />

        <List
          dataSource={suggestions}
          renderItem={(suggestion: unknown, index: number) => (
            <List.Item
              key={`item-${index}`}
              style={{
                padding: '16px',
                border: '1px solid #e8e8e8',
                borderRadius: '8px',
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: index === 0 ? '#f0f5ff' : 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e8e8e8';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => handleSelectSuggestion(suggestion.content)}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    {index === 0 && <StarFilled style={{ color: '#faad14' }} />}
                    <Text strong>Proposition {index + 1}</Text>
                    <Tag color={suggestion.score >= 90 ? 'green' : suggestion.score >= 80 ? 'blue' : 'orange'}>
                      Score: {suggestion.score}/100
                    </Tag>
                    {suggestion.angle && <Tag>{suggestion.angle}</Tag>}
                  </Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSuggestion(suggestion.content);
                    }}
                  >
                    Choisir
                  </Button>
                </Space>

                <div style={{
                  padding: '12px',
                  background: '#fafafa',
                  borderRadius: '4px',
                  marginTop: '8px'
                }}>
                  {renderContent(suggestion.content)}
                </div>

                {suggestion.reasoning && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    💭 {suggestion.reasoning}
                  </Text>
                )}
              </Space>
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

export default AIAssistButton;

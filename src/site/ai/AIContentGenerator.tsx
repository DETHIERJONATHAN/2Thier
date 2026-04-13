import React, { useState, useMemo } from 'react';
import { Modal, Form, Input, Select, Button, Space, message, Divider, Switch, Progress } from 'antd';
import { ThunderboltOutlined, RobotOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { logger } from '../../lib/logger';

/**
 * ✨ AI CONTENT GENERATOR - CONNECTÉ AUX API ROUTES
 * 
 * Modal pour générer le contenu complet d'une section avec l'IA.
 * Utilise POST /api/ai/generate-section pour créer tout le contenu en une fois.
 * 
 * FONCTIONNALITÉS :
 * - Formulaire contextuel (business type, tone, audience, keywords)
 * - Génération complète de la section
 * - Option pour générer des images avec DALL-E
 * - Affichage du progress et des tokens utilisés
 * 
 * @author IA Assistant - Phase C connectée
 */

interface AIContentGeneratorProps {
  /** Type de section à générer */
  sectionType: string;
  /** Callback quand le contenu est généré */
  onGenerated: (content: unknown) => void;
  /** Visibilité du modal */
  visible: boolean;
  /** Callback pour fermer */
  onClose: () => void;
}

const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
  sectionType,
  onGenerated,
  visible,
  onClose
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 🔌 API authentifiée (stabilisée)
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook]);

  /**
   * 🚀 GÉNÉRATION COMPLÈTE DE LA SECTION
   */
  const handleSubmit = async (values: unknown) => {
    setLoading(true);
    setProgress(0);
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    
    try {
      logger.debug('🤖 [AI] Génération section complète:', sectionType, values);
      
      // Animation du progress
      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // 📡 Appel à l'API route
      const response = await api.post('/api/ai/generate-section', {
        sectionType,
        businessType: values.businessType,
        tone: values.tone,
        targetAudience: values.targetAudience || 'grand public',
        language: values.language,
        keywords: values.keywords 
          ? values.keywords.split(',').map((k: string) => k.trim()) 
          : [],
        includeImages: values.includeImages || false
      });

      setProgress(100);

      logger.debug('✅ [AI] Section générée:', response);

      // ✅ Callback avec le contenu complet
      onGenerated(response.content);
      
      message.success({
        content: (
          <span>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
            Section générée ! ({response.usage?.tokens || 0} tokens)
          </span>
        ),
        duration: 4
      });
      
      // Fermer et reset
      onClose();
      form.resetFields();
      setProgress(0);

    } catch (error: unknown) {
      logger.error('❌ [AI] Erreur génération section:', error);
      
      setProgress(0);
      
      // Gestion des erreurs spécifiques
      if (error.response?.status === 429) {
        message.error('⏱️ Trop de requêtes IA. Attendez 1 minute.');
      } else if (error.response?.status === 400) {
        message.error('❌ Paramètres invalides. Vérifiez le formulaire.');
      } else if (error.message?.includes('OPENAI_API_KEY')) {
        message.error('❌ Clé OpenAI manquante. Configurez OPENAI_API_KEY dans .env');
      } else {
        message.error('❌ Erreur lors de la génération de la section');
      }
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#667eea', fontSize: '20px' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>
            Générer "{sectionType}" avec l'IA
          </span>
        </Space>
      }
      open={visible}
      onCancel={() => {
        if (!loading) {
          onClose();
          form.resetFields();
          setProgress(0);
        }
      }}
      footer={null}
      width={600}
      maskClosable={!loading}
    >
      {loading && (
        <div style={{ marginBottom: '20px' }}>
          <Progress 
            percent={progress} 
            status={progress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#667eea',
              '100%': '#764ba2'
            }}
          />
          <p style={{ textAlign: 'center', color: '#999', marginTop: '8px', fontSize: '13px' }}>
            {progress < 30 && '🤖 Analyse du contexte...'}
            {progress >= 30 && progress < 60 && '✨ Génération du contenu...'}
            {progress >= 60 && progress < 90 && '📝 Optimisation SEO...'}
            {progress >= 90 && '✅ Finalisation...'}
          </p>
        </div>
      )}
      
      <Divider style={{ marginTop: '12px' }} />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          tone: 'professionnel',
          language: 'français',
          includeImages: false
        }}
        disabled={loading}
      >
        <Form.Item
          name="businessType"
          label="Type d'entreprise"
          rules={[{ required: true, message: 'Le type d\'entreprise est requis' }]}
          tooltip="Décrivez votre activité (ex: agence web, restaurant, e-commerce)"
        >
          <Input 
            placeholder="Ex: agence web, restaurant, e-commerce..." 
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="tone"
          label="Ton de communication"
          rules={[{ required: true }]}
          tooltip="Choisissez le style de langage"
        >
          <Select size="large">
            <Select.Option value="professionnel">🎯 Professionnel</Select.Option>
            <Select.Option value="dynamique">⚡ Dynamique</Select.Option>
            <Select.Option value="amical">😊 Amical</Select.Option>
            <Select.Option value="luxe">💎 Luxe</Select.Option>
            <Select.Option value="technique">🔧 Technique</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="targetAudience"
          label="Audience cible"
          tooltip="Qui sont vos clients ?"
        >
          <Input 
            placeholder="Ex: entrepreneurs, particuliers, PME..." 
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="language"
          label="Langue"
          rules={[{ required: true }]}
        >
          <Select size="large">
            <Select.Option value="français">🇫🇷 Français</Select.Option>
            <Select.Option value="english">🇬🇧 English</Select.Option>
            <Select.Option value="nederlands">🇳🇱 Nederlands</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="keywords"
          label="Mots-clés SEO (optionnel)"
          tooltip="Séparez par des virgules"
        >
          <Input.TextArea
            placeholder="innovation, qualité, expérience, digital..."
            rows={2}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="includeImages"
          label="Générer des images avec DALL-E"
          valuePropName="checked"
          tooltip="⚠️ Coût supplémentaire : ~$0.04 par image"
        >
          <Switch />
        </Form.Item>

        <Divider />

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<ThunderboltOutlined />}
              loading={loading}
              size="large"
              style={{
                background: loading 
                  ? '#d9d9d9' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                fontWeight: 600
              }}
            >
              ✨ Générer la section
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AIContentGenerator;

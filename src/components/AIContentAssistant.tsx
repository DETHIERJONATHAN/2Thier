/**
 * Composant Assistant IA pour la génération de contenu
 * Utilise l'API AI Content pour générer automatiquement du contenu
 */

import React, { useState } from 'react';
import { Button, Modal, Form, Input, Select, Space, message, Spin, Card, Typography, Divider } from 'antd';
import { 
  RobotOutlined, 
  ThunderboltOutlined, 
  FileTextOutlined,
  CommentOutlined,
  GlobalOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

export interface AIContentAssistantProps {
  type: 'service' | 'project' | 'testimonial' | 'page' | 'seo';
  onContentGenerated: (content: any) => void;
  buttonText?: string;
  siteName?: string;
  industry?: string;
  currentContent?: any;
}

export const AIContentAssistant: React.FC<AIContentAssistantProps> = ({
  type,
  onContentGenerated,
  buttonText,
  siteName = '2Thier',
  industry = 'transition énergétique',
  currentContent
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();

  const getIcon = () => {
    switch (type) {
      case 'service': return <ThunderboltOutlined />;
      case 'project': return <FileTextOutlined />;
      case 'testimonial': return <CommentOutlined />;
      case 'page': return <GlobalOutlined />;
      case 'seo': return <CheckCircleOutlined />;
      default: return <RobotOutlined />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'service': return 'Générer un Service avec l\'IA';
      case 'project': return 'Générer un Projet avec l\'IA';
      case 'testimonial': return 'Générer un Témoignage avec l\'IA';
      case 'page': return 'Générer le Contenu de Page avec l\'IA';
      case 'seo': return 'Optimiser le SEO avec l\'IA';
      default: return 'Assistant IA';
    }
  };

  const getFormFields = () => {
    switch (type) {
      case 'service':
        return (
          <>
            <Form.Item
              label="Type de service"
              name="serviceType"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <Input placeholder="Ex: Installation de panneaux photovoltaïques" />
            </Form.Item>
            <Form.Item label="Mots-clés (optionnel)" name="keywords">
              <Select mode="tags" placeholder="Ex: énergie, économie, écologique">
                <Select.Option value="énergie">énergie</Select.Option>
                <Select.Option value="économie">économie</Select.Option>
                <Select.Option value="écologique">écologique</Select.Option>
                <Select.Option value="performance">performance</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'project':
        return (
          <>
            <Form.Item
              label="Type de projet"
              name="projectType"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <Input placeholder="Ex: Installation complète 12 kWp avec batterie" />
            </Form.Item>
            <Form.Item label="Localisation (optionnel)" name="location">
              <Input placeholder="Ex: Charleroi" />
            </Form.Item>
          </>
        );

      case 'testimonial':
        return (
          <>
            <Form.Item
              label="Service concerné"
              name="serviceType"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <Input placeholder="Ex: Panneaux solaires 10 kWp" />
            </Form.Item>
            <Form.Item label="Type de client" name="customerType">
              <Select defaultValue="particulier">
                <Select.Option value="particulier">Particulier</Select.Option>
                <Select.Option value="professionnel">Professionnel</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'page':
        return (
          <>
            <Form.Item
              label="Type de site"
              name="siteType"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <Select defaultValue="vitrine">
                <Select.Option value="vitrine">Site Vitrine</Select.Option>
                <Select.Option value="landing">Landing Page</Select.Option>
                <Select.Option value="blog">Blog</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label="Services principaux"
              name="mainServices"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <Select mode="tags" placeholder="Ex: Photovoltaïque, Pompes à chaleur">
                <Select.Option value="Photovoltaïque">Photovoltaïque</Select.Option>
                <Select.Option value="Batteries">Batteries</Select.Option>
                <Select.Option value="Pompes à chaleur">Pompes à chaleur</Select.Option>
                <Select.Option value="Isolation">Isolation</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Audience cible (optionnel)" name="targetAudience">
              <Input placeholder="Ex: Propriétaires en Wallonie" />
            </Form.Item>
          </>
        );

      case 'seo':
        return (
          <>
            <Form.Item label="Titre actuel" name="currentTitle">
              <Input placeholder={currentContent?.metaTitle || 'Titre actuel'} />
            </Form.Item>
            <Form.Item label="Description actuelle" name="currentDescription">
              <TextArea rows={2} placeholder={currentContent?.metaDescription || 'Description actuelle'} />
            </Form.Item>
            <Form.Item
              label="Contenu de la page"
              name="pageContent"
              rules={[{ required: true, message: 'Requis' }]}
            >
              <TextArea rows={4} placeholder="Collez le contenu de votre page ici..." />
            </Form.Item>
            <Form.Item label="Mots-clés cibles (optionnel)" name="targetKeywords">
              <Select mode="tags" placeholder="Ex: panneaux solaires, installation">
                <Select.Option value="panneaux solaires">panneaux solaires</Select.Option>
                <Select.Option value="installation">installation</Select.Option>
                <Select.Option value="énergie renouvelable">énergie renouvelable</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  const handleGenerate = async (values: any) => {
    setLoading(true);
    setGeneratedContent(null);

    try {
      const endpoint = `/ai-content/generate-${type === 'page' ? 'page' : type}${type === 'seo' ? '-seo' : ''}`;
      
      const payload = {
        siteName,
        industry,
        ...values
      };

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        const content = response.data.content || response.data.suggestions;
        setGeneratedContent(content);
        message.success('✨ Contenu généré avec succès !');
      } else {
        throw new Error(response.data.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Erreur génération IA:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const handleUseContent = () => {
    onContentGenerated(generatedContent);
    message.success('✅ Contenu appliqué !');
    setModalVisible(false);
    setGeneratedContent(null);
    form.resetFields();
  };

  const renderGeneratedContent = () => {
    if (!generatedContent) return null;

    return (
      <Card 
        style={{ marginTop: 16, background: '#f0f9ff', borderColor: '#3b82f6' }}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#10b981' }} />
            <Text strong>Contenu Généré</Text>
          </Space>
        }
      >
        {type === 'service' && (
          <>
            <Paragraph><Text strong>Titre:</Text> {generatedContent.title}</Paragraph>
            <Paragraph><Text strong>Description:</Text> {generatedContent.description}</Paragraph>
            <Paragraph><Text strong>Icône:</Text> {generatedContent.icon}</Paragraph>
            <Paragraph><Text strong>CTA:</Text> {generatedContent.ctaText}</Paragraph>
            <Paragraph>
              <Text strong>Caractéristiques:</Text>
              <ul>
                {generatedContent.features?.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </Paragraph>
          </>
        )}

        {type === 'project' && (
          <>
            <Paragraph><Text strong>Titre:</Text> {generatedContent.title}</Paragraph>
            <Paragraph><Text strong>Localisation:</Text> {generatedContent.location}</Paragraph>
            <Paragraph><Text strong>Détails:</Text> {generatedContent.details}</Paragraph>
            <Paragraph>
              <Text strong>Tags:</Text> {generatedContent.tags?.join(', ')}
            </Paragraph>
          </>
        )}

        {type === 'testimonial' && (
          <>
            <Paragraph><Text strong>Client:</Text> {generatedContent.customerName}</Paragraph>
            <Paragraph><Text strong>Localisation:</Text> {generatedContent.location}</Paragraph>
            <Paragraph><Text strong>Service:</Text> {generatedContent.service}</Paragraph>
            <Paragraph><Text strong>Note:</Text> {generatedContent.rating}/5</Paragraph>
            <Paragraph><Text strong>Témoignage:</Text> {generatedContent.text}</Paragraph>
          </>
        )}

        {type === 'page' && (
          <>
            <Paragraph><Text strong>Titre Hero:</Text> {generatedContent.heroTitle}</Paragraph>
            <Paragraph><Text strong>Sous-titre:</Text> {generatedContent.heroSubtitle}</Paragraph>
            <Paragraph><Text strong>CTA Principal:</Text> {generatedContent.heroCtaPrimary}</Paragraph>
            <Paragraph><Text strong>CTA Secondaire:</Text> {generatedContent.heroCtaSecondary}</Paragraph>
            <Divider />
            <Paragraph><Text strong>Meta Title:</Text> {generatedContent.metaTitle}</Paragraph>
            <Paragraph><Text strong>Meta Description:</Text> {generatedContent.metaDescription}</Paragraph>
            <Paragraph><Text strong>Keywords:</Text> {generatedContent.metaKeywords}</Paragraph>
            <Divider />
            <Paragraph><Text strong>À Propos:</Text> {generatedContent.aboutText}</Paragraph>
          </>
        )}

        {type === 'seo' && (
          <>
            <Paragraph><Text strong>Meta Title:</Text> {generatedContent.metaTitle}</Paragraph>
            <Paragraph><Text strong>Meta Description:</Text> {generatedContent.metaDescription}</Paragraph>
            <Paragraph><Text strong>Keywords:</Text> {generatedContent.metaKeywords}</Paragraph>
            <Paragraph>
              <Text strong>Améliorations suggérées:</Text>
              <ul>
                {generatedContent.improvements?.map((imp: string, i: number) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </Paragraph>
          </>
        )}

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleUseContent}>
            Utiliser ce contenu
          </Button>
          <Button onClick={() => setGeneratedContent(null)}>Regénérer</Button>
        </Space>
      </Card>
    );
  };

  return (
    <>
      <Button 
        icon={<RobotOutlined />}
        onClick={() => setModalVisible(true)}
        type="dashed"
        style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
      >
        {buttonText || '✨ Générer avec l\'IA'}
      </Button>

      <Modal
        title={
          <Space>
            {getIcon()}
            <Title level={4} style={{ margin: 0 }}>{getTitle()}</Title>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setGeneratedContent(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Spin spinning={loading} tip="🤖 L'IA génère votre contenu...">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleGenerate}
            initialValues={{
              siteName,
              industry,
              customerType: 'particulier',
              siteType: 'vitrine'
            }}
          >
            <Form.Item label="Nom du site" name="siteName">
              <Input disabled value={siteName} />
            </Form.Item>
            <Form.Item label="Secteur d'activité" name="industry">
              <Input disabled value={industry} />
            </Form.Item>

            {getFormFields()}

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<RobotOutlined />}
                block
                disabled={loading || !!generatedContent}
              >
                Générer avec l'IA
              </Button>
            </Form.Item>
          </Form>

          {renderGeneratedContent()}
        </Spin>
      </Modal>
    </>
  );
};

export default AIContentAssistant;

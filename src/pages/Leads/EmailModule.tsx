import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Space, 
  Input, 
  Form,
  Typography, 
  Row,
  Col,
  Alert,
  Select,
  Badge,
  Grid,
  
} from 'antd';
import { 
  MailOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
import type { Lead } from '../../types/leads';
import { getErrorMessage } from '../../utils/errorHandling';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

// Types pour les templates d'email
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'rdv_confirmation' | 'relance' | 'refus_suivi' | 'first_contact';
}

/**
 * ✉️ Module Email intégré - Version finale
 * 
 * Fonctionnement :
 * - Depuis module Lead → bouton ✉️ Envoyer un email
 * - Fenêtre type Gmail allégée (adresse, objet, corps pré-remplis)
 * - IA intégrée : rédaction automatique selon action
 * - Templates personnalisables
 * - Suivi des ouvertures et clics
 */

interface EmailModuleProps {
  leadId?: string; // Prop optionnelle pour utilisation en Modal
  onClose?: () => void; // Callback pour fermer le Modal
  autoFillType?: 'rdv_confirmation' | 'devis' | 'relance' | 'first_contact';
}

export default function EmailModule({ leadId: propLeadId, onClose, autoFillType }: EmailModuleProps = {}): React.ReactElement {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { api } = useAuthenticatedApi();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // Utilise le leadId des props si disponible, sinon celui de l'URL
  const leadId = propLeadId || urlLeadId;
  
  // États principaux
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // États pour le formulaire email
  const [form] = Form.useForm();
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: '',
    tone: 'cordial' as 'cordial' | 'formel' | 'amical'
  });
  
  // États pour l'IA
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  // Templates d'email prédéfinis (stabilisés avec useMemo)
  const emailTemplates = useMemo<EmailTemplate[]>(() => [
    {
      id: 'first_contact',
      name: 'Premier contact',
      subject: 'Suite à votre demande',
      body: 'Bonjour,\n\nJe vous remercie pour votre intérêt concernant nos services...',
      type: 'first_contact'
    },
    {
      id: 'rdv_confirmation',
      name: 'Confirmation RDV',
      subject: 'Confirmation de votre rendez-vous',
      body: 'Bonjour,\n\nJe vous confirme notre rendez-vous...',
      type: 'rdv_confirmation'
    },
    {
      id: 'relance',
      name: 'Relance commerciale',
      subject: 'Relance - Votre projet',
      body: 'Bonjour,\n\nJe me permets de revenir vers vous concernant votre projet...',
      type: 'relance'
    }
  ], []);

  // Fonction pour gérer la fermeture/navigation
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose(); // Modal : ferme le Modal
    } else {
      navigate('/leads/home'); // Page : navigation normale
    }
  }, [onClose, navigate]);

  // 📊 Récupération des détails du lead
  const fetchLeadDetail = useCallback(async () => {
    if (!leadId) return;
    
    try {
      const leadData = await api.get(`/api/leads/${leadId}`);
      setLead(leadData);
      
      // Pré-remplir l'email avec les données du lead
      const prefilledData = {
        to: leadData.data?.email || '',
        subject: `Suite à votre demande - ${leadData.data?.company || '2Thier SRL'}`,
        body: '',
        tone: 'cordial' as const
      };
      
      // Si un type d'auto-remplissage est spécifié
      if (autoFillType) {
        const template = emailTemplates.find(t => t.type === autoFillType);
        if (template) {
          prefilledData.subject = template.subject;
          prefilledData.body = template.body;
          setSelectedTemplate(template);
        }
      }
      
      // Si des données sont passées via navigation state
      if (location.state) {
        Object.assign(prefilledData, location.state);
      }
      
      setEmailData(prefilledData);
      form.setFieldsValue(prefilledData);
      
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erreur lors du chargement du lead');
      NotificationManager.error(errorMessage);
      console.error('[EmailModule] ❌ Erreur fetchLeadDetail:', errorMessage, error);
      handleClose();
    } finally {
      setLoading(false);
    }
  }, [leadId, api, handleClose, location.state, form, autoFillType, emailTemplates]);

  // 🔄 Chargement initial
  useEffect(() => {
    fetchLeadDetail();
  }, [fetchLeadDetail]);

  // 🤖 Génération automatique d'email par IA
  const generateAIEmail = useCallback(async (action: string) => {
    if (!lead) return;
    
    setIsGeneratingAI(true);
    try {
      const prompt = `Génère un email ${emailData.tone} pour un lead CRM.
      
      Contexte:
      - Nom: ${lead.data?.name}
      - Société: ${lead.data?.company || 'Particulier'}
      - Source: ${lead.source}
      - Action: ${action}
      
      Génère un objet et un corps d'email professionnel en français.`;
      
      const response = await api.post('/api/gemini/generate-email', {
        prompt,
        context: lead,
        action: action,
        tone: emailData.tone,
        language: 'fr'
      });
      
      if (response?.subject && response?.body) {
        const newEmailData = {
          ...emailData,
          subject: response.subject,
          body: response.body
        };
        
        setEmailData(newEmailData);
        form.setFieldsValue(newEmailData);
        
        NotificationManager.success('Email généré par l\'IA !');
      }
      
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de la génération IA');
      NotificationManager.error(errorMessage);
      console.error('[EmailModule] ❌ Erreur génération IA:', errorMessage, error);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [lead, emailData, api, form]);

  // 📧 Envoi de l'email
  const sendEmail = useCallback(async () => {
    if (!lead) return;
    
    setSending(true);
    try {
      await api.post('/api/gmail/send', {
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        leadId: leadId,
        htmlContent: emailData.body.replace(/\n/g, '<br>'),
        trackOpening: true, // Activer le suivi d'ouverture
        trackClicks: true   // Activer le suivi des clics
      });
      
      // Enregistrer dans l'historique du lead
      await api.post(`/api/leads/${leadId}/history`, {
        type: 'email',
        data: {
          to: emailData.to,
          subject: emailData.subject,
          template: selectedTemplate?.name,
          sentAt: new Date()
        }
      });
      
      NotificationManager.success('Email envoyé avec succès !');
      
      // Fermer le modal ou naviguer
      if (onClose) {
        onClose();
      } else {
        navigate(`/leads/details/${leadId}`);
      }
      
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Erreur lors de l\'envoi de l\'email');
      NotificationManager.error(errorMessage);
      console.error('[EmailModule] ❌ Erreur envoi email:', errorMessage, error);
    } finally {
      setSending(false);
    }
  }, [lead, emailData, leadId, api, selectedTemplate, onClose, navigate]);

  // 🎨 Sélection d'un template
  const selectTemplate = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template);
    const newEmailData = {
      ...emailData,
      subject: template.subject,
      body: template.body
    };
    setEmailData(newEmailData);
    form.setFieldsValue(newEmailData);
  }, [emailData, form]);

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Alert
          message="Lead non trouvé"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleClose}>
              Retour à la liste
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full"
      style={{
        maxWidth: 960,
        padding: isMobile ? '16px' : '24px'
      }}
    >
      {/* 📧 Header */}
      <Row justify="space-between" align="middle" className="mb-6" gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Space wrap size={isMobile ? 12 : 16}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleClose}
            >
              Retour
            </Button>
            <Title level={2} className="mb-0">
              ✉️ Module Email
            </Title>
          </Space>
        </Col>
        <Col xs={24} md={8}>
          <Badge 
            status="processing" 
            text={`Pour: ${lead.data?.name || 'Lead'}`} 
            style={{ width: '100%', display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}
          />
        </Col>
      </Row>

      {/* 📋 Informations du lead */}
      <Card className="mb-6" size="small" bodyStyle={{ padding: isMobile ? '16px' : '24px' }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} md={12}>
            <Text strong>Nom:</Text> {lead.data?.name}<br/>
            <Text strong>Email:</Text> {lead.data?.email}
          </Col>
          <Col xs={24} md={12}>
            <Text strong>Société:</Text> {lead.data?.company || 'Particulier'}<br/>
            <Text strong>Source:</Text> {lead.source}
          </Col>
        </Row>
      </Card>

      {/* 🎨 Templates d'email */}
      <Card title="📝 Templates d'email" className="mb-6" size="small" bodyStyle={{ padding: isMobile ? '16px' : '24px' }}>
        <Row gutter={[8, 8]}>
          {emailTemplates.map(template => (
            <Col key={template.id} xs={12} sm={8} md={6} lg={6}>
              <Button
                size="small"
                type={selectedTemplate?.id === template.id ? 'primary' : 'default'}
                onClick={() => selectTemplate(template)}
                block
              >
                {template.name}
              </Button>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 🤖 Actions IA */}
      <Card title="🤖 Génération IA" className="mb-6" size="small" bodyStyle={{ padding: isMobile ? '16px' : '24px' }}>
        <Space wrap size={isMobile ? 12 : 16}>
          <Button
            icon={<RobotOutlined />}
            loading={isGeneratingAI}
            onClick={() => generateAIEmail('premier_contact')}
            block={isMobile}
          >
            Générer premier contact
          </Button>
          <Button
            icon={<RobotOutlined />}
            loading={isGeneratingAI}
            onClick={() => generateAIEmail('suivi_commercial')}
            block={isMobile}
          >
            Générer suivi
          </Button>
          <Button
            icon={<RobotOutlined />}
            loading={isGeneratingAI}
            onClick={() => generateAIEmail('relance')}
            block={isMobile}
          >
            Générer relance
          </Button>
        </Space>
      </Card>

      {/* ✉️ Formulaire d'email */}
      <Card title="✉️ Composer l'email" bodyStyle={{ padding: isMobile ? '16px' : '24px' }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, allValues) => setEmailData(allValues)}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Form.Item
                label="Destinataire"
                name="to"
                rules={[{ required: true, message: 'Email destinataire requis' }]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="email@example.com"
                  size={isMobile ? 'large' : undefined}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Ton" name="tone">
                <Select size={isMobile ? 'large' : undefined}>
                  <Option value="cordial">Cordial</Option>
                  <Option value="formel">Formel</Option>
                  <Option value="amical">Amical</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Objet"
            name="subject"
            rules={[{ required: true, message: 'Objet requis' }]}
          >
            <Input
              placeholder="Objet de l'email"
              size={isMobile ? 'large' : undefined}
            />
          </Form.Item>

          <Form.Item
            label="Corps de l'email"
            name="body"
            rules={[{ required: true, message: 'Corps de l\'email requis' }]}
          >
            <TextArea
              rows={12}
              placeholder="Tapez votre message ici..."
              showCount
              maxLength={2000}
              style={{ fontSize: isMobile ? '16px' : undefined }}
            />
          </Form.Item>

          <Form.Item>
            <Space wrap size={isMobile ? 12 : 16}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sending}
                onClick={sendEmail}
                size="large"
                block={isMobile}
              >
                Envoyer l'email
              </Button>
              <Button onClick={handleClose} block={isMobile}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 📊 Informations de suivi */}
      <Card title="📊 Suivi et analytics" size="small" bodyStyle={{ padding: isMobile ? '16px' : '24px' }}>
        <Text type="secondary">
          ✅ Suivi d'ouverture activé<br/>
          ✅ Suivi des clics activé<br/>
          ✅ Historique automatique dans le lead
        </Text>
      </Card>
    </div>
  );
}

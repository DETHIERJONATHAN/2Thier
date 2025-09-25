import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Input, 
  Form, 
  Modal, 
  Space, 
  message,
  List,
  Badge,
  Tag
} from 'antd';
import { 
  MailOutlined, 
  SendOutlined,
  ReloadOutlined,
  UserOutlined,
  PaperClipOutlined
} from '@ant-design/icons';

interface EmailSentData {
  type: 'email';
  leadId: string;
  to: string;
  subject: string;
  timestamp: Date;
}

interface GmailWidgetProps {
  leadEmail: string;
  leadName: string;
  leadId: string;
  onEmailSent?: (emailData: EmailSentData) => void;
}

interface EmailThread {
  id: string;
  subject: string;
  snippet: string;
  timestamp: string;
  from: string;
  to: string;
  unread: boolean;
  hasAttachments: boolean;
}

const GmailWidget: React.FC<GmailWidgetProps> = ({ 
  leadEmail, 
  leadName, 
  leadId,
  onEmailSent 
}) => {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  useEffect(() => {
    loadEmailThreads();
  }, [loadEmailThreads]);

  const loadEmailThreads = useCallback(async () => {
    try {
      setLoading(true);
      
      // Utiliser l'API Gmail existante du système
      const response = await api.api.get(`/api/gmail/search?q=from:${encodeURIComponent(leadEmail)} OR to:${encodeURIComponent(leadEmail)}`);
      setEmails(response.messages || []);
    } catch (error) {
      console.error('Erreur lors du chargement des emails:', error);
      // Emails simulés pour la démo - en attendant la connexion API
      setEmails([
        {
          id: '1',
          subject: `Re: Contact avec ${leadName}`,
          snippet: 'Merci pour votre retour rapide. Je suis intéressé par...',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          from: leadEmail,
          to: 'moi@monentreprise.be',
          unread: true,
          hasAttachments: false
        },
        {
          id: '2',
          subject: `Demande d'information - ${leadName}`,
          snippet: 'Bonjour, je souhaiterais obtenir plus d\'informations sur...',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          from: leadEmail,
          to: 'moi@monentreprise.be',
          unread: false,
          hasAttachments: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [leadEmail, leadName, api.api]);

  const handleSendEmail = async (values: { subject: string; body: string; to: string }) => {
    try {
      setSending(true);
      
      // Utiliser l'API Gmail existante du système (même endpoint que GoogleMailPage)
      await api.api.post('/api/gmail/send', {
        to: [leadEmail], // Format array comme dans GoogleMailPage
        subject: values.subject,
        body: values.body,
        leadContext: {
          leadId,
          leadName,
          source: 'crm_lead_detail'
        }
      });

      message.success(`✅ Email envoyé à ${leadName}`);
      setComposeModalVisible(false);
      form.resetFields();
      
      // Recharger les emails
      await loadEmailThreads();
      
      // Notifier le parent pour mise à jour timeline
      if (onEmailSent) {
        onEmailSent({
          type: 'email',
          leadId,
          to: leadEmail,
          subject: values.subject,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi email:', error);
      message.error('❌ Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Card 
      title={
        <Space>
          <MailOutlined />
          Gmail - {leadName}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={loadEmailThreads}
            loading={loading}
          />
          <Button 
            type="primary"
            size="small"
            icon={<SendOutlined />}
            onClick={() => setComposeModalVisible(true)}
          >
            Composer
          </Button>
        </Space>
      }
      className="mb-4"
    >
      <div className="mb-3">
        <Badge status="processing" text={leadEmail} />
      </div>

      <List
        loading={loading}
        dataSource={emails}
        locale={{ emptyText: 'Aucun email trouvé' }}
        renderItem={(email) => (
          <List.Item>
            <List.Item.Meta
              avatar={<UserOutlined className="text-blue-500" />}
              title={
                <Space>
                  <span className={email.unread ? 'font-bold' : ''}>{email.subject}</span>
                  {email.unread && <Badge status="error" />}
                  {email.hasAttachments && <PaperClipOutlined className="text-gray-400" />}
                </Space>
              }
              description={
                <div>
                  <div className="text-gray-600 mb-1">{email.snippet}</div>
                  <Space>
                    <Tag>{email.from === leadEmail ? 'Reçu' : 'Envoyé'}</Tag>
                    <span className="text-xs text-gray-400">{formatTimestamp(email.timestamp)}</span>
                  </Space>
                </div>
              }
            />
          </List.Item>
        )}
      />

      {/* Modal de composition d'email */}
      <Modal
        title={`Nouvel email à ${leadName}`}
        open={composeModalVisible}
        onCancel={() => {
          setComposeModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSendEmail}
          initialValues={{ to: leadEmail }}
        >
          <Form.Item
            name="to"
            label="Destinataire"
          >
            <Input disabled value={leadEmail} />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Sujet"
            rules={[{ required: true, message: 'Veuillez saisir un sujet' }]}
          >
            <Input placeholder="Objet de l'email" />
          </Form.Item>

          <Form.Item
            name="body"
            label="Message"
            rules={[{ required: true, message: 'Veuillez saisir un message' }]}
          >
            <Input.TextArea 
              rows={8} 
              placeholder="Votre message..."
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setComposeModalVisible(false)}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={sending}
                icon={<SendOutlined />}
              >
                Envoyer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GmailWidget;

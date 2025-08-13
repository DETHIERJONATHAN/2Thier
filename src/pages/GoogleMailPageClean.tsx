import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Layout, 
  Button, 
  List, 
  Card, 
  Typography, 
  Tabs, 
  Input, 
  Modal, 
  Form, 
  message, 
  Drawer,
  Collapse,
  Upload,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  StarOutlined, 
  StarFilled, 
  DeleteOutlined, 
  SendOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useGmailService } from '../hooks/useGmailService';
import { FormattedGmailMessage, GmailMessage } from '../types/gmail';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

interface ComposeFormData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments?: File[];
}

const GoogleMailPageClean: React.FC = () => {
  const gmailServiceHook = useGmailService();
  const gmailServiceRef = useRef(gmailServiceHook);
  
  // Mettre à jour la référence sans déclencher de re-render
  useEffect(() => {
    gmailServiceRef.current = gmailServiceHook;
  });

  const [messages, setMessages] = useState<FormattedGmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [currentLabelId, setCurrentLabelId] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, setPageToken] = useState<string>('');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [messageDetailDrawerVisible, setMessageDetailDrawerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Initialisation des données au montage du composant - UNE SEULE FOIS
  useEffect(() => {
    let mounted = true;
    
    const initializeData = async () => {
      if (!mounted) return;
      
      console.log('[Gmail] 🚀 Chargement des données initiales - useEffect direct');
      setIsLoading(true);
      
      try {
        // Utiliser la référence stable pour éviter les boucles
        const result = await gmailServiceRef.current.getMessages({
          labelIds: ['INBOX'],
          q: '',
          maxResults: 25,
        });

        if (!mounted) return;

        console.log('[Gmail] 📧 Réponse complète result:', result);
        if (result && Array.isArray(result)) {
          console.log('[Gmail] 📧 Messages reçus:', result.length);
          setMessages(result);
          setPageToken('');
        } else {
          console.log('[Gmail] ❌ Pas de données valides dans result');
          setMessages([]);
          setPageToken('');
        }
        
        console.log('[Gmail] ✅ Initialisation terminée avec succès');
      } catch (error) {
        if (!mounted) return;
        console.error('Erreur chargement initial:', error);
        setAuthError(true);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeData();
    
    return () => {
      mounted = false;
    };
  }, []); // Pas de dépendance pour éviter les boucles infinies

  const loadMailbox = useCallback(async (mailbox: string) => {
    console.log(`[Gmail] 📂 Chargement mailbox: ${mailbox}`);
    setIsLoading(true);
    setCurrentLabelId(mailbox);
    
    try {
      const result = await gmailServiceRef.current.getMessages({
        mailbox: mailbox.toLowerCase(),
        maxResults: 25,
      });
      
      if (result && Array.isArray(result)) {
        setMessages(result);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Erreur chargement mailbox:', error);
      message.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (value: string) => {
    setSearchQuery(value);
    setIsLoading(true);
    
    try {
      const result = await gmailServiceRef.current.getMessages({
        q: value,
        maxResults: 25,
      });
      
      if (result && Array.isArray(result)) {
        setMessages(result);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      message.error('Erreur lors de la recherche');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggleStar = useCallback(async (messageId: string, isStarred: boolean) => {
    console.log('[Gmail] ⭐ Toggle star pour message:', messageId, 'isStarred:', isStarred);
    
    try {
      if (isStarred) {
        await gmailServiceRef.current.removeLabel(messageId, 'STARRED');
        console.log('[Gmail] ⭐ Étoile supprimée');
      } else {
        await gmailServiceRef.current.addLabel(messageId, 'STARRED');
        console.log('[Gmail] ⭐ Étoile ajoutée');
      }
      
      // Recharger les messages pour refléter le changement
      await loadMailbox(currentLabelId);
      message.success(isStarred ? 'Message retiré des favoris' : 'Message ajouté aux favoris');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur toggle star:', error);
      message.error('Erreur lors de la modification');
    }
  }, [currentLabelId, loadMailbox]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    console.log('[Gmail] 🗑️ Suppression message:', messageId);
    
    try {
      await gmailServiceRef.current.deleteMessage(messageId);
      console.log('[Gmail] 🗑️ Message supprimé avec succès');
      
      // Recharger les messages pour refléter le changement
      await loadMailbox(currentLabelId);
      message.success('Message supprimé');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  }, [currentLabelId, loadMailbox]);

  const handleSendMessage = useCallback(async (values: ComposeFormData) => {
    try {
      await gmailServiceRef.current.sendMessage({
        to: values.to,
        cc: values.cc,
        bcc: values.bcc,
        subject: values.subject,
        body: values.body,
        attachments: values.attachments,
      });
      
      message.success('Message envoyé avec succès');
      setComposeModalVisible(false);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      message.error('Erreur lors de l\'envoi du message');
    }
  }, []);

  const tabItems = [
    { key: 'INBOX', label: 'Boîte de réception' },
    { key: 'SENT', label: 'Envoyés' },
    { key: 'DRAFT', label: 'Brouillons' },
    { key: 'STARRED', label: 'Favoris' },
    { key: 'TRASH', label: 'Corbeille' },
    { key: 'SPAM', label: 'Spam' },
  ];

  const sidebarItems = [
    { key: 'system-folders', label: 'Dossiers système', icon: null },
    { key: 'INBOX', label: 'Boîte de réception', icon: null },
    { key: 'SENT', label: 'Envoyés', icon: null },
    { key: 'DRAFT', label: 'Brouillons', icon: null },
    { key: 'STARRED', label: 'Favoris', icon: null },
    { key: 'TRASH', label: 'Corbeille', icon: null },
    { key: 'SPAM', label: 'Spam', icon: null },
    { key: 'divider', label: '---', icon: null },
    { key: 'create-folder', label: '+ Créer un dossier', icon: PlusOutlined },
  ];

  if (authError) {
    return (
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <Card>
          <Title level={4}>🔒 Authentification Google requise</Title>
          <Text>Veuillez vous connecter à votre compte Google pour accéder à vos emails.</Text>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            block 
            style={{ marginBottom: '16px' }}
            onClick={() => setComposeModalVisible(true)}
          >
            Nouveau message
          </Button>
          
          <div style={{ marginBottom: '16px' }}>
            <Search
              placeholder="Rechercher..."
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </div>

          <List
            size="small"
            dataSource={sidebarItems}
            renderItem={(item) => {
              if (item.key === 'divider') {
                return <div style={{ height: '1px', background: '#f0f0f0', margin: '8px 0' }} />;
              }
              
              if (item.key === 'system-folders') {
                return (
                  <List.Item style={{ padding: '4px 0', fontWeight: 'bold', color: '#666' }}>
                    {item.label}
                  </List.Item>
                );
              }

              if (item.key === 'create-folder') {
                return (
                  <List.Item style={{ padding: '8px 0', cursor: 'pointer', color: '#1890ff' }}>
                    <Button type="link" style={{ padding: 0, height: 'auto' }}>
                      {item.label}
                    </Button>
                  </List.Item>
                );
              }

              return (
                <List.Item
                  style={{ 
                    padding: '8px 12px', 
                    cursor: 'pointer',
                    background: currentLabelId === item.key ? '#f0f7ff' : 'transparent',
                    borderRadius: '4px',
                    margin: '2px 0'
                  }}
                  onClick={() => loadMailbox(item.key)}
                >
                  {item.label}
                </List.Item>
              );
            }}
          />
        </div>
      </Sider>

      <Layout>
        <Content style={{ padding: '24px', background: '#fff' }}>
          <div style={{ marginBottom: '16px' }}>
            <Tabs
              activeKey={currentLabelId}
              onChange={(key) => loadMailbox(key)}
              items={tabItems}
            />
          </div>

          <List
            loading={isLoading}
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item
                key={msg.id}
                actions={[
                  <Button
                    type="text"
                    icon={msg.isStarred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    onClick={() => handleToggleStar(msg.id, msg.isStarred || false)}
                  />,
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteMessage(msg.id)}
                    danger
                  />,
                ]}
                onClick={() => {
                  setSelectedMessage(msg as GmailMessage);
                  setMessageDetailDrawerVisible(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong={!msg.isRead}>{msg.from}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(msg.date).toLocaleDateString()}
                      </Text>
                    </div>
                  }
                  description={
                    <div>
                      <Text strong={!msg.isRead}>{msg.subject}</Text>
                      <br />
                      <Text type="secondary">{msg.snippet}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Content>
      </Layout>

      {/* Modal de composition */}
      <Modal
        title="Nouveau message"
        open={composeModalVisible}
        onCancel={() => setComposeModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form onFinish={handleSendMessage} layout="vertical">
          <Form.Item
            name="to"
            label="À"
            rules={[{ required: true, message: 'Veuillez saisir un destinataire' }]}
          >
            <Input placeholder="destinataire@example.com" />
          </Form.Item>

          <Collapse ghost>
            <Panel header="CC, CCI et pièces jointes" key="advanced">
              <Form.Item name="cc" label="CC">
                <Input placeholder="cc@example.com" />
              </Form.Item>

              <Form.Item name="bcc" label="CCI">
                <Input placeholder="cci@example.com" />
              </Form.Item>

              <Form.Item name="attachments" label="Pièces jointes">
                <Upload
                  multiple
                  beforeUpload={() => false}
                  onChange={(info) => {
                    // Gérer les fichiers uploadés
                  }}
                >
                  <Button icon={<UploadOutlined />}>Joindre des fichiers</Button>
                </Upload>
              </Form.Item>
            </Panel>
          </Collapse>

          <Form.Item
            name="subject"
            label="Objet"
            rules={[{ required: true, message: 'Veuillez saisir un objet' }]}
          >
            <Input placeholder="Objet du message" />
          </Form.Item>

          <Form.Item
            name="body"
            label="Message"
            rules={[{ required: true, message: 'Veuillez saisir un message' }]}
          >
            <Input.TextArea rows={10} placeholder="Votre message..." />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setComposeModalVisible(false)}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                Envoyer
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer de détail du message */}
      <Drawer
        title="Détail du message"
        placement="right"
        width={600}
        open={messageDetailDrawerVisible}
        onClose={() => setMessageDetailDrawerVisible(false)}
      >
        {selectedMessage && (
          <div>
            <div style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
              <Title level={4}>{selectedMessage.subject}</Title>
              <Text><strong>De :</strong> {selectedMessage.from}</Text><br />
              <Text><strong>À :</strong> {selectedMessage.to}</Text><br />
              <Text type="secondary">{new Date(selectedMessage.date).toLocaleString()}</Text>
            </div>
            <div dangerouslySetInnerHTML={{ __html: selectedMessage.body || selectedMessage.snippet }} />
          </div>
        )}
      </Drawer>
    </Layout>
  );
};

export default GoogleMailPageClean;

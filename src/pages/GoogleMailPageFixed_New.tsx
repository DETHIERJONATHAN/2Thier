import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  Layout, List, Button, Input,
  Modal, Form, Select, message,
  Drawer, Empty, Menu, Skeleton
} from 'antd';
import { 
  EditOutlined, ReloadOutlined, InboxOutlined, SendOutlined, 
  FileTextOutlined, StarOutlined, DeleteOutlined, ExclamationCircleOutlined, 
  FolderOutlined, RollbackOutlined, ShareAltOutlined, StarFilled
} from '@ant-design/icons';
import { useGmailService, FormattedGmailMessage, GmailMessage, GmailLabel } from '../hooks/useGmailService';
import PageHeader from '../components/PageHeader';
import GoogleAuthError from '../components/GoogleAuthError';

const { Content, Sider } = Layout;
const { TextArea } = Input;

interface ComposeFormData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}

interface GmailBodyPart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: Array<{ name: string; value: string }>;
  body: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: GmailBodyPart[];
}

const GoogleMailPageFixed: React.FC = () => {
  const gmailService = useGmailService();
  const { getMessages, getLabels } = gmailService;
  const [messages, setMessages] = useState<FormattedGmailMessage[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [currentLabelId, setCurrentLabelId] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageToken, setPageToken] = useState<string>('');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [messageDetailDrawerVisible, setMessageDetailDrawerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [composeForm] = Form.useForm<ComposeFormData>();

  const systemLabels = useMemo(() => ({
    'INBOX': { name: 'Boîte de réception', icon: <InboxOutlined /> },
    'SENT': { name: 'Messages envoyés', icon: <SendOutlined /> },
    'DRAFT': { name: 'Brouillons', icon: <FileTextOutlined /> },
    'STARRED': { name: 'Messages suivis', icon: <StarOutlined /> },
    'TRASH': { name: 'Corbeille', icon: <DeleteOutlined /> },
    'SPAM': { name: 'Courriers indésirables', icon: <ExclamationCircleOutlined /> },
  }), []);

  const getHeaderValue = (headers: { name: string; value: string }[], name: string): string => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  // Types utilitaires pour normaliser les différentes formes de réponse
  type MessagesPayload = { data?: FormattedGmailMessage[]; messages?: FormattedGmailMessage[]; nextPageToken?: string };
  const hasData = (v: unknown): v is { data: unknown } => typeof v === 'object' && v !== null && 'data' in v;

  const loadMessages = useCallback(async (labelId: string, query: string, append: boolean = false) => {
    console.log('[Gmail] 🔄 Chargement messages pour labelId:', labelId, 'query:', query);
    try {
      setIsLoading(true);
      const result = await getMessages({
        labelIds: [labelId],
        q: query,
        maxResults: 25,
        pageToken: append ? pageToken : undefined,
      });

      // Normaliser les réponses possibles (axios, direct, enveloppées)
      const rawPayload = hasData(result) ? result.data : result;
      const payload = rawPayload as MessagesPayload | FormattedGmailMessage[];
      const items: FormattedGmailMessage[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data!
          : Array.isArray(payload?.messages)
            ? payload.messages!
            : [];
      const nextToken: string = Array.isArray(payload) ? '' : (payload?.nextPageToken || '');

      if (append) {
        setMessages(prev => [...prev, ...items]);
      } else {
        setMessages(items);
      }
      setPageToken(nextToken || '');
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      message.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  }, [pageToken, getMessages]);

  // Initialisation des données au montage du composant
  useEffect(() => {
    const initializeData = async () => {
      console.log('[Gmail] 🚀 Chargement des données initiales - useEffect direct');
      setIsLoading(true);
      
      try {
        // Charger les labels
        const labelsResult = await getLabels();
        console.log('[Gmail] 📧 Labels result:', labelsResult);
  if (labelsResult && labelsResult.data) {
          setLabels(labelsResult.data);
          
          // Charger les messages INBOX directement ici
          const result = await getMessages({
            labelIds: ['INBOX'],
            q: '',
            maxResults: 25,
          });

          console.log('[Gmail] 📧 Réponse complète result:', result);
          const rawPayload = hasData(result) ? result.data : result;
          const payload = rawPayload as MessagesPayload | FormattedGmailMessage[];
          const items: FormattedGmailMessage[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data!
              : Array.isArray(payload?.messages)
                ? payload.messages!
                : [];
          const nextToken: string = Array.isArray(payload) ? '' : (payload?.nextPageToken || '');
          console.log('[Gmail] 📧 Items normalisés:', items.length);
          setMessages(items);
          setPageToken(nextToken || '');
          
          console.log('[Gmail] ✅ Initialisation terminée avec succès');
        } else {
          setAuthError(true);
        }
      } catch (error) {
        console.error('Erreur chargement initial:', error);
        setAuthError(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [getLabels, getMessages]); // fonctions stables

  const handleLabelClick = (labelId: string) => {
    setCurrentLabelId(labelId);
    setSearchQuery('');
    setPageToken('');
    loadMessages(labelId, '');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPageToken('');
    loadMessages(currentLabelId, query);
  };

  const handleOpenMessage = async (message: FormattedGmailMessage) => {
    try {
      // Récupérer le message complet avec le body pour l'affichage détaillé
      const fullMessage = await gmailService.getMessage(message.id);
      if (fullMessage) {
        setSelectedMessage(fullMessage);
        setMessageDetailDrawerVisible(true);
        // Marquer comme lu en retirant le label UNREAD
        if (!message.isRead) {
          gmailService.modifyMessage(message.id, [], ['UNREAD']);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du message:', error);
      message.error('Impossible d\'ouvrir le message');
    }
  };

  const handleCompose = (type: 'new' | 'reply' | 'forward' = 'new', originalMessage?: GmailMessage) => {
    composeForm.resetFields();
    if (originalMessage) {
      const from = getHeaderValue(originalMessage.payload.headers, 'From');
      const subject = getHeaderValue(originalMessage.payload.headers, 'Subject');
      
      if (type === 'reply') {
        composeForm.setFieldsValue({
          to: [from],
          subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        });
      } else if (type === 'forward') {
        composeForm.setFieldsValue({
          subject: subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`,
        });
      }
    }
    setComposeModalVisible(true);
  };

  const handleSendCommand = async (values: ComposeFormData) => {
    try {
      await gmailService.sendMessage(values.to, values.subject, values.body, values.cc, values.bcc);
      message.success('Message envoyé avec succès!');
      setComposeModalVisible(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      message.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const result = await gmailService.deleteMessage(messageId);
    if (result) {
      setMessages(messages.filter(m => m.id !== messageId));
      setMessageDetailDrawerVisible(false);
      message.success('Message supprimé');
    } else {
      message.error('Impossible de supprimer le message');
    }
  };

  const handleToggleStar = async (messageId: string, isStarred: boolean) => {
    const addLabelIds = isStarred ? [] : ['STARRED'];
    const removeLabelIds = isStarred ? ['STARRED'] : [];
    
    const result = await gmailService.modifyMessage(messageId, addLabelIds, removeLabelIds);
    if (result) {
      // Mettre à jour l'état local pour un retour visuel immédiat
      setMessages(messages.map(m => 
        m.id === messageId 
          ? { ...m, labelIds: isStarred ? m.labelIds?.filter(l => l !== 'STARRED') : [...(m.labelIds || []), 'STARRED'] }
          : m
      ));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({
            ...selectedMessage,
            labelIds: isStarred ? selectedMessage.labelIds?.filter(l => l !== 'STARRED') : [...(selectedMessage.labelIds || []), 'STARRED']
        });
      }
    } else {
      message.error("Impossible de modifier le statut de l'étoile.");
    }
  };

  if (authError) {
    return <GoogleAuthError onReconnect={() => window.location.href = '/api/google-auth'} />;
  }

  const renderSidebar = () => (
    <Sider width={240} theme="light" className="border-r">
      <div className="p-4">
        <Button type="primary" icon={<EditOutlined />} block onClick={() => handleCompose('new')} size="large">
          Nouveau message
        </Button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[currentLabelId]}
        onClick={({ key }) => handleLabelClick(key)}
        className="border-0"
      >
        {Object.entries(systemLabels).map(([labelId, label]) => (
          <Menu.Item key={labelId} icon={label.icon}>
            {label.name}
          </Menu.Item>
        ))}
        {labels
          .filter(label => !Object.keys(systemLabels).includes(label.id))
          .map(label => (
            <Menu.Item key={label.id} icon={<FolderOutlined />}>
              {label.name}
            </Menu.Item>
          ))}
      </Menu>
    </Sider>
  );

  const renderMessageList = () => (
    <div className="p-4">
      <div className="mb-4">
        <Input.Search
          placeholder="Rechercher dans les messages..."
          onSearch={handleSearch}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>
      
      {isLoading && messages.length === 0 ? (
        <div className="py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 2, width: ['80%', '95%'] }} />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <Empty description="Aucun message trouvé" />
      ) : (
        <List
          dataSource={messages}
          renderItem={(message) => (
            <List.Item
              className={`cursor-pointer hover:bg-gray-50 ${!message.isRead ? 'bg-blue-50' : ''}`}
              onClick={() => handleOpenMessage(message)}
              actions={[
                <Button
                  key="star"
                  type="text"
                  icon={message.isStarred ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(message.id, message.isStarred || false);
                  }}
                />
              ]}
            >
              <List.Item.Meta
                title={
                  <div className="flex justify-between items-center">
                    <span className={`${!message.isRead ? 'font-bold' : ''}`}>
                      {message.from}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                }
                description={
                  <div>
                    <div className={`text-sm ${!message.isRead ? 'font-semibold' : ''}`}>
                      {message.subject}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {message.snippet}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      {/* Bouton charger plus */}
      {pageToken && (
        <div className="text-center py-4">
          <Button onClick={() => loadMessages(currentLabelId, searchQuery, true)} loading={isLoading}>
            Charger plus
          </Button>
        </div>
      )}
    </div>
  );

  const renderMessageDetail = () => {
    if (!selectedMessage) return null;
    
    const from = getHeaderValue(selectedMessage.payload.headers, 'From');
    const to = getHeaderValue(selectedMessage.payload.headers, 'To');
    const subject = getHeaderValue(selectedMessage.payload.headers, 'Subject');
    const date = new Date(parseInt(selectedMessage.internalDate)).toLocaleString();
    const isStarred = selectedMessage.labelIds?.includes('STARRED');
    
    let body = '';
    const findBodyPart = (parts: GmailBodyPart[]): GmailBodyPart | null => {
        for (const part of parts) {
            if (part.mimeType === 'text/html') {
                return part;
            }
            if (part.parts) {
                const nestedPart = findBodyPart(part.parts);
                if (nestedPart) return nestedPart;
            }
        }
        return parts.find(p => p.mimeType === 'text/plain') || null;
    };

    if (selectedMessage.payload.parts) {
        const part = findBodyPart(selectedMessage.payload.parts);
        if (part && part.body.data) {
            body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
    } else if (selectedMessage.payload.body.data) {
        body = atob(selectedMessage.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }

  return (
      <Drawer
        title={
            <div className="flex items-center">
                <Button 
                    type="text" 
                    icon={isStarred ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined />} 
                    onClick={() => handleToggleStar(selectedMessage.id, isStarred)}
                    className="mr-2"
                />
                <span className="truncate">{subject || 'Détail du message'}</span>
            </div>
        }
        placement="right"
        width={'60%'}
        onClose={() => setMessageDetailDrawerVisible(false)}
        open={messageDetailDrawerVisible}
        extra={
          <Button.Group>
            <Button icon={<RollbackOutlined />} onClick={() => handleCompose('reply', selectedMessage)}>Répondre</Button>
            <Button icon={<ShareAltOutlined />} onClick={() => handleCompose('forward', selectedMessage)}>Transférer</Button>
            <Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteMessage(selectedMessage.id)}>Supprimer</Button>
          </Button.Group>
        }
      >
        <div className="p-2">
          <p><strong>De :</strong> {from}</p>
          <p><strong>À :</strong> {to}</p>
          <p><strong>Date :</strong> {date}</p>
          <hr className="my-4"/>
          <div
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
            style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
          />
        </div>
      </Drawer>
    );
  };

  const renderComposeModal = () => (
    <Modal
      title="Nouveau message"
      open={composeModalVisible}
      onCancel={() => setComposeModalVisible(false)}
      width={800}
      destroyOnClose // Important pour réinitialiser le form
      footer={[
        <Button key="back" onClick={() => setComposeModalVisible(false)}>Annuler</Button>,
        <Button key="submit" type="primary" onClick={() => composeForm.submit()}>
          Envoyer
        </Button>,
      ]}
    >
      <Form form={composeForm} layout="vertical" onFinish={handleSendCommand}>
        <Form.Item name="to" label="À" rules={[{ required: true, message: 'Destinataire requis' }]}>
          <Select mode="tags" placeholder="email@example.com" />
        </Form.Item>
        <Form.Item name="subject" label="Objet">
          <Input placeholder="Objet de votre message" />
        </Form.Item>
        <Form.Item name="body" label="Message" rules={[{ required: true, message: 'Le corps du message ne peut être vide' }]}>
          <TextArea rows={10} placeholder="Écrivez votre message ici..." />
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <Layout className="h-screen bg-white">
      <PageHeader
        title="Boîte Mail Gmail"
        subtitle="Votre boîte de réception centralisée"
        extra={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => loadMessages(currentLabelId, searchQuery)} loading={isLoading}>
            Actualiser
          </Button>
        ]}
      />
      <Layout>
        {renderSidebar()}
        <Content className="bg-white border-l">
          {renderMessageList()}
        </Content>
      </Layout>
      {renderMessageDetail()}
      {renderComposeModal()}
    </Layout>
  );
};

export default GoogleMailPageFixed;

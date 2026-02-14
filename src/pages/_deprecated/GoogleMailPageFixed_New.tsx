import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  Layout, List, Button, Input,
  Modal, Form, Select, message,
  Drawer, Empty, Menu, Skeleton, Tooltip, Grid, Space, Typography
} from 'antd';
import { 
  EditOutlined, ReloadOutlined, InboxOutlined, SendOutlined, 
  FileTextOutlined, StarOutlined, DeleteOutlined, ExclamationCircleOutlined, 
  FolderOutlined, RollbackOutlined, ShareAltOutlined, StarFilled, FolderOpenOutlined, CloseOutlined
} from '@ant-design/icons';
import { useGmailService, FormattedGmailMessage, GmailMessage, GmailLabel } from '../hooks/useGmailService';
import PageHeader from '../components/PageHeader';
import GoogleAuthError from '../components/GoogleAuthError';

const { Content } = Layout;
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

const normalizeArrayPayload = <T,>(input: unknown): T[] => {
  if (Array.isArray(input)) {
    return input as T[];
  }

  if (input && typeof input === 'object') {
    const candidate = (input as { data?: unknown; labels?: unknown }).data;
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }

    if (candidate && typeof candidate === 'object' && Array.isArray((candidate as { labels?: unknown }).labels)) {
      return (candidate as { labels: T[] }).labels;
    }

    if (Array.isArray((input as { labels?: unknown }).labels)) {
      return (input as { labels: T[] }).labels;
    }
  }

  return [];
};

const GoogleMailPageFixed: React.FC = () => {
  const gmailService = useGmailService();
  const [msgApi, msgCtx] = message.useMessage();
  const { getMessages, getLabels } = gmailService;
  const [messages, setMessages] = useState<FormattedGmailMessage[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [selectedMessageMeta, setSelectedMessageMeta] = useState<FormattedGmailMessage | null>(null);
  const [currentLabelId, setCurrentLabelId] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageToken, setPageToken] = useState<string>('');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [messageDetailDrawerVisible, setMessageDetailDrawerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [composeForm] = Form.useForm<ComposeFormData>();
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const systemLabels = useMemo(() => ({
    'INBOX': { name: 'Boîte de réception', icon: <InboxOutlined /> },
    'SENT': { name: 'Messages envoyés', icon: <SendOutlined /> },
    'DRAFT': { name: 'Brouillons', icon: <FileTextOutlined /> },
    'STARRED': { name: 'Messages suivis', icon: <StarOutlined /> },
    'TRASH': { name: 'Corbeille', icon: <DeleteOutlined /> },
    'SPAM': { name: 'Courriers indésirables', icon: <ExclamationCircleOutlined /> },
  }), []);

  const getHeaderValue = (headers: { name: string; value: string }[] | undefined, name: string): string => {
    if (!Array.isArray(headers)) {
      return '';
    }
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  const decodeBodyData = (input?: string): string => {
    if (!input) return '';
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    try {
      const binary = atob(normalized);
      if (typeof TextDecoder !== 'undefined') {
        try {
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          return new TextDecoder('utf-8').decode(bytes);
        } catch {
          return binary;
        }
      }
      return binary;
    } catch (err) {
      console.warn('[Gmail] Décodage body échoué, tentative fallback', err);
      try {
        return atob(input);
      } catch {
        return '';
      }
    }
  };

  const formatDate = (value?: string): string => {
    if (!value) return '';
    const numeric = Number(value);
    const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString();
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
  msgApi.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  }, [pageToken, getMessages, msgApi]);

  // Initialisation des données au montage du composant
  useEffect(() => {
    const initializeData = async () => {
      console.log('[Gmail] 🚀 Chargement des données initiales - useEffect direct');
      setIsLoading(true);
      
      try {
        // Charger les labels
        const labelsResult = await getLabels();
        console.log('[Gmail] 📧 Labels result:', labelsResult);
        const normalizedLabels = normalizeArrayPayload<GmailLabel>(labelsResult);

        if (!labelsResult && normalizedLabels.length === 0) {
          setAuthError(true);
          return;
        }

        setLabels(normalizedLabels);
        
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
    setSelectedMessage(null);
    setSelectedMessageMeta(null);
    setMessageDetailDrawerVisible(false);
    loadMessages(labelId, '');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPageToken('');
    loadMessages(currentLabelId, query);
  };

  const handleOpenMessage = async (message: FormattedGmailMessage) => {
    try {
      setSelectedMessageMeta(message);
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
  msgApi.error('Impossible d\'ouvrir le message');
        setSelectedMessageMeta(null);
    }
  };

  const handleCompose = (type: 'new' | 'reply' | 'forward' = 'new', originalMessage?: GmailMessage) => {
    composeForm.resetFields();
    if (originalMessage) {
      const payloadHeaders = originalMessage.payload?.headers;
      const from = getHeaderValue(payloadHeaders, 'From');
      const subject = getHeaderValue(payloadHeaders, 'Subject');
      
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
      msgApi.success('Message envoyé avec succès!');
      setComposeModalVisible(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      msgApi.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const result = await gmailService.deleteMessage(messageId);
    if (result) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setMessageDetailDrawerVisible(false);
      setSelectedMessage(null);
      setSelectedMessageMeta(null);
      msgApi.success('Message supprimé');
    } else {
      msgApi.error('Impossible de supprimer le message');
    }
  };

  const handleToggleStar = async (messageId: string, isStarred: boolean) => {
    const addLabelIds = isStarred ? [] : ['STARRED'];
    const removeLabelIds = isStarred ? ['STARRED'] : [];
    
    const result = await gmailService.modifyMessage(messageId, addLabelIds, removeLabelIds);
    if (result) {
      // Mettre à jour l'état local pour un retour visuel immédiat
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, labelIds: isStarred ? m.labelIds?.filter(l => l !== 'STARRED') : [...(m.labelIds || []), 'STARRED'] }
          : m
      ));
      setSelectedMessage(prev => {
        if (!prev || prev.id !== messageId) {
          return prev;
        }
        const updatedLabels = isStarred
          ? prev.labelIds?.filter(l => l !== 'STARRED')
          : [...(prev.labelIds || []), 'STARRED'];
        return { ...prev, labelIds: updatedLabels };
      });
    } else {
      msgApi.error("Impossible de modifier le statut de l'étoile.");
    }
  };

  const sidebarContent = (
    <Menu
      mode="inline"
      selectedKeys={[currentLabelId]}
      onClick={({ key }) => {
        handleLabelClick(key);
        setIsSidebarDrawerOpen(false);
      }}
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
  );

  const renderSidebar = () => (
    <Drawer
      title="Tous les dossiers"
      placement="left"
      open={isSidebarDrawerOpen}
      onClose={() => setIsSidebarDrawerOpen(false)}
      width={320}
      styles={{ body: { padding: 0 } }}
    >
      {sidebarContent}
    </Drawer>
  );

  const currentLabelName = useMemo(() => {
    const systemLabel = systemLabels[currentLabelId];
    if (systemLabel) {
      return systemLabel.name;
    }
    const customLabel = labels.find(label => label.id === currentLabelId);
    return customLabel?.name ?? 'Boîte de réception';
  }, [currentLabelId, labels, systemLabels]);

  const renderFolderBar = () => (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-center gap-3">
        <Tooltip title="Nouveau message">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<EditOutlined />}
            onClick={() => handleCompose('new')}
            aria-label="Nouveau message"
          />
        </Tooltip>
        <Tooltip title="Tous les dossiers">
          <Button
            shape="circle"
            size="large"
            icon={<FolderOpenOutlined />}
            onClick={() => setIsSidebarDrawerOpen(true)}
            aria-label="Tous les dossiers"
          />
        </Tooltip>
        <Tooltip title="Actualiser">
          <Button
            shape="circle"
            size="large"
            icon={<ReloadOutlined />}
            onClick={() => loadMessages(currentLabelId, searchQuery)}
            loading={isLoading}
            aria-label="Actualiser"
          />
        </Tooltip>
      </div>
      <span className="text-sm text-gray-600">Dossier actuel : <strong>{currentLabelName}</strong></span>
    </div>
  );

  if (authError) {
    return <GoogleAuthError onReconnect={() => window.location.href = '/api/google-auth'} />;
  }

  const renderMessageList = () => (
    <div className="p-4">
      {renderFolderBar()}
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
    
    const headers = selectedMessage.payload?.headers ?? [];
    const from = getHeaderValue(headers, 'From') || selectedMessageMeta?.from || '';
    const to = getHeaderValue(headers, 'To') || selectedMessageMeta?.to || '';
    const subject = getHeaderValue(headers, 'Subject') || selectedMessageMeta?.subject || '';
    const internalDate = formatDate(selectedMessage.internalDate);
    const fallbackDate = selectedMessageMeta?.timestamp ? formatDate(selectedMessageMeta.timestamp) : '';
    const displayedDate = internalDate || fallbackDate || '—';
    const isStarred = selectedMessage.labelIds?.includes('STARRED');
    
    let body = '';
    const findBodyPart = (parts?: GmailBodyPart[]): GmailBodyPart | null => {
      if (!Array.isArray(parts)) {
        return null;
      }
      for (const part of parts) {
        if (part.mimeType === 'text/html') {
          return part;
        }
        if (part.parts && part.parts.length > 0) {
          const nestedPart = findBodyPart(part.parts);
          if (nestedPart) return nestedPart;
        }
      }
      return parts.find(p => p.mimeType === 'text/plain') || null;
    };

    const payload = selectedMessage.payload ?? {};
    if (payload.parts && payload.parts.length > 0) {
      const part = findBodyPart(payload.parts);
      if (part && part.body && part.body.data) {
        body = decodeBodyData(part.body.data);
      }
    } else if (payload.body && payload.body.data) {
      body = decodeBodyData(payload.body.data);
    }

    if (!body) {
      body = selectedMessageMeta?.htmlBody || selectedMessage.snippet || selectedMessageMeta?.snippet || 'Aucun contenu disponible pour ce message.';
    }

    const sanitizedBody = DOMPurify.sanitize(body);

    const handleCloseDetail = () => {
      setMessageDetailDrawerVisible(false);
      setSelectedMessage(null);
      setSelectedMessageMeta(null);
    };

    const headerPrimary = (
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Tooltip title={isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
            <Button 
              type="text" 
              icon={isStarred ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined />} 
              onClick={() => handleToggleStar(selectedMessage.id, isStarred)}
              aria-label={isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            />
          </Tooltip>
          <Typography.Text
            strong
            ellipsis={{ tooltip: subject || 'Détail du message' }}
            className="text-base leading-5"
            style={{ maxWidth: isMobile ? '65vw' : '45vw' }}
          >
            {subject || 'Détail du message'}
          </Typography.Text>
        </div>
        <Tooltip title="Fermer">
          <Button type="text" icon={<CloseOutlined />} onClick={handleCloseDetail} aria-label="Fermer le message" />
        </Tooltip>
      </div>
    );

    const headerActions = (
      <Space
        wrap
        size={[8, 8]}
        className={isMobile ? 'w-full justify-between' : ''}
      >
        <Button icon={<RollbackOutlined />} onClick={() => handleCompose('reply', selectedMessage)} block={isMobile}>Répondre</Button>
        <Button icon={<ShareAltOutlined />} onClick={() => handleCompose('forward', selectedMessage)} block={isMobile}>Transférer</Button>
        <Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteMessage(selectedMessage.id)} block={isMobile}>Supprimer</Button>
      </Space>
    );

    return (
      <Drawer
        title={
          <div className="flex flex-col gap-3 w-full">
            {headerPrimary}
            {headerActions}
          </div>
        }
        placement={isMobile ? 'bottom' : 'right'}
        width={isMobile ? '100%' : '60%'}
        height={isMobile ? '100%' : undefined}
        onClose={handleCloseDetail}
        open={messageDetailDrawerVisible}
        closable={false}
        styles={{
          body: {
            padding: isMobile ? '16px' : '24px',
            height: isMobile ? '100%' : 'auto',
            overflowY: 'auto'
          },
          header: {
            padding: isMobile ? '12px 16px' : '16px 24px'
          }
        }}
      >
        <div className="p-2">
          <p><strong>De :</strong> {from || '—'}</p>
          <p><strong>À :</strong> {to || '—'}</p>
          <p><strong>Date :</strong> {displayedDate}</p>
          <hr className="my-4"/>
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
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
      destroyOnHidden // Important pour réinitialiser le form
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
    <Layout className="min-h-screen bg-white">
      {msgCtx}
      <PageHeader
        title="Boîte Mail Gmail"
        subtitle="Votre boîte de réception centralisée"
      />
      <Content className="bg-white">
        {renderMessageList()}
      </Content>
      {renderMessageDetail()}
      {renderComposeModal()}
      {renderSidebar()}
    </Layout>
  );
};

export default GoogleMailPageFixed;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Layout, Row, Col, List, Button, Space, Input, Avatar, Divider, 
  Modal, Form, Select, message, Spin, Badge, Tooltip, Dropdown, Menu,
  Upload, Drawer, Typography, Popconfirm, Checkbox, Empty
} from 'antd';
import { 
  StarOutlined, SendOutlined, PlusOutlined, 
  ReloadOutlined, PaperClipOutlined, DeleteOutlined, ReplyOutlined,
  ForwardOutlined, MoreOutlined, EyeOutlined, DownloadOutlined,
  FolderOutlined, CloseOutlined,
  CheckOutlined, ExclamationCircleOutlined, InboxOutlined,
  FileTextOutlined, StarFilled
} from '@ant-design/icons';
import { useGmailService, GmailMessage, GmailLabel, SendEmailRequest } from '../hooks/useGmailService';
import PageHeader from '../components/PageHeader';

const { Content, Sider } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { Dragger } = Upload;

interface ComposeFormData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
}

const GoogleMailPage: React.FC = () => {
  // Services et contexte
  const gmailService = useGmailService();
  const [msgApi, msgCtx] = message.useMessage();

  // États principaux
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [currentLabel, setCurrentLabel] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageToken, setPageToken] = useState<string>('');

  // États de l'interface
  const [composeVisible, setComposeVisible] = useState(false);
  const [messageDetailVisible, setMessageDetailVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [composeForm] = Form.useForm<ComposeFormData>();

  // États pour la composition
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Labels système avec icônes et couleurs
  const systemLabels = useMemo(() => ({
    'INBOX': { name: 'Boîte de réception', icon: <InboxOutlined />, color: '#1890ff' },
    'SENT': { name: 'Envoyés', icon: <SendOutlined />, color: '#52c41a' },
    'DRAFT': { name: 'Brouillons', icon: <FileTextOutlined />, color: '#faad14' },
    'STARRED': { name: 'Suivis', icon: <StarFilled />, color: '#f5222d' },
    'TRASH': { name: 'Corbeille', icon: <DeleteOutlined />, color: '#8c8c8c' },
    'SPAM': { name: 'Spam', icon: <ExclamationCircleOutlined />, color: '#fa541c' },
    'IMPORTANT': { name: 'Important', icon: <CheckOutlined />, color: '#fadb14' },
  }), []);

  // Charger les données initiales
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Charger les labels en parallèle
      const labelsResult = await gmailService.getLabels();
      
      if (labelsResult) {
        setLabels(labelsResult.labels || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement initial:', error);
      msgApi.error('Erreur lors du chargement des données Gmail');
    } finally {
      setIsLoading(false);
    }
  }, [gmailService, msgApi]);

  const loadMessages = useCallback(async (token?: string) => {
    setIsLoading(true);
    try {
      const params: {
        labelIds: string[];
        maxResults: number;
        q?: string;
        pageToken?: string;
      } = {
        labelIds: [currentLabel],
        maxResults: 50
      };

      if (searchQuery) {
        params.q = searchQuery;
      }

      if (token) {
        params.pageToken = token;
      }

      const result = await gmailService.getMessages(params);
      
      if (result && result.messages) {
        // Charger les détails de chaque message
        const messagesWithDetails = await Promise.all(
          result.messages.map(async (msg: { id: string }) => {
            const fullMessage = await gmailService.getMessage(msg.id);
            return fullMessage;
          })
        );

        setMessages(messagesWithDetails.filter(Boolean));
        setPageToken(result.nextPageToken || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      msgApi.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  }, [gmailService, currentLabel, searchQuery, msgApi]);

  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Charger les messages quand le label change
  useEffect(() => {
    if (currentLabel) {
      loadMessages();
    }
  }, [currentLabel, searchQuery, loadMessages]);

  // Fonctions utilitaires pour les emails
  const getHeader = (message: GmailMessage, headerName: string): string => {
    const header = message.payload.headers.find(h => h.name.toLowerCase() === headerName.toLowerCase());
    return header ? header.value : '';
  };

  const getEmailBody = (message: GmailMessage): string => {
    if (message.payload.body.data) {
      return atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
    
    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/html' && part.body.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        if (part.mimeType === 'text/plain' && part.body.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      }
    }
    
    return message.snippet;
  };

  const isUnread = (message: GmailMessage): boolean => {
    return message.labelIds?.includes('UNREAD') || false;
  };

  const isStarred = (message: GmailMessage): boolean => {
    return message.labelIds?.includes('STARRED') || false;
  };

  // Actions sur les messages
  const handleSelectMessage = (messageId: string) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(prev => prev.filter(id => id !== messageId));
    } else {
      setSelectedMessages(prev => [...prev, messageId]);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(messages.map(m => m.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const markAsRead = async (messageIds: string[], read: boolean = true) => {
    try {
      await gmailService.markAsRead(messageIds, read);
      await loadMessages();
      msgApi.success(`Messages marqués comme ${read ? 'lus' : 'non lus'}`);
    } catch {
      msgApi.error('Erreur lors de la modification');
    }
  };

  const toggleStar = async (messageIds: string[], starred: boolean) => {
    try {
      await gmailService.toggleStar(messageIds, starred);
      await loadMessages();
      msgApi.success(starred ? 'Étoile ajoutée' : 'Étoile retirée');
    } catch {
      msgApi.error('Erreur lors de la modification');
    }
  };

  const deleteMessages = async (messageIds: string[]) => {
    try {
      await Promise.all(messageIds.map(id => gmailService.deleteMessage(id)));
      await loadMessages();
      setSelectedMessages([]);
      msgApi.success('Messages supprimés');
    } catch {
      msgApi.error('Erreur lors de la suppression');
    }
  };

  // Composition d'email
  const openCompose = (replyTo?: GmailMessage) => {
    if (replyTo) {
      const fromEmail = getHeader(replyTo, 'from');
      const subject = getHeader(replyTo, 'subject');
      
      composeForm.setFieldsValue({
        to: [fromEmail],
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        body: `\n\n--- Message original ---\n${getEmailBody(replyTo)}`
      });
    } else {
      composeForm.resetFields();
    }
    
    setAttachments([]);
    setComposeVisible(true);
  };

  const sendEmail = async (values: ComposeFormData) => {
    try {
      const emailData: SendEmailRequest = {
        to: values.to,
        cc: values.cc || [],
        bcc: values.bcc || [],
        subject: values.subject,
        body: values.body,
        attachments: attachments
      };

      await gmailService.sendEmail(emailData);
  msgApi.success('Email envoyé avec succès !');
      setComposeVisible(false);
      composeForm.resetFields();
      setAttachments([]);
      
      // Recharger si on est dans les envoyés
      if (currentLabel === 'SENT') {
        await loadMessages();
      }
    } catch {
      msgApi.error('Erreur lors de l\'envoi de l\'email');
    }
  };

  // Gestion des pièces jointes
  const handleFileUpload = (file: File) => {
    setAttachments(prev => [...prev, file]);
    return false; // Empêcher l'upload automatique
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Menu actions
  const getActionsMenu = (message: GmailMessage) => (
    <Menu>
      <Menu.Item key="reply" icon={<ReplyOutlined />} onClick={() => openCompose(message)}>
        Répondre
      </Menu.Item>
      <Menu.Item key="forward" icon={<ForwardOutlined />}>
        Transférer
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="star" 
        icon={<StarOutlined />}
        onClick={() => toggleStar([message.id], !isStarred(message))}
      >
        {isStarred(message) ? 'Retirer l\'étoile' : 'Ajouter une étoile'}
      </Menu.Item>
      <Menu.Item 
        key="read"
        icon={<EyeOutlined />}
        onClick={() => markAsRead([message.id], !isUnread(message))}
      >
        Marquer comme {isUnread(message) ? 'lu' : 'non lu'}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
        Supprimer
      </Menu.Item>
    </Menu>
  );

  // Rendu de la liste des labels
  const renderLabels = () => (
    <div className="space-y-1">
      {Object.entries(systemLabels).map(([labelId, labelInfo]) => {
        const labelData = labels.find(l => l.id === labelId);
        const unreadCount = labelData?.messagesUnread || 0;
        
        return (
          <div
            key={labelId}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
              currentLabel === labelId ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
            }`}
            onClick={() => setCurrentLabel(labelId)}
          >
            <div className="flex items-center space-x-3">
              <span style={{ color: labelInfo.color }}>{labelInfo.icon}</span>
              <span className={currentLabel === labelId ? 'text-blue-600 font-medium' : 'text-gray-700'}>
                {labelInfo.name}
              </span>
            </div>
            {unreadCount > 0 && (
              <Badge count={unreadCount} size="small" />
            )}
          </div>
        );
      })}
      
      {/* Labels personnalisés */}
      <Divider />
      {labels.filter(label => label.type === 'user').map(label => (
        <div
          key={label.id}
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
            currentLabel === label.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
          }`}
          onClick={() => setCurrentLabel(label.id)}
        >
          <div className="flex items-center space-x-3">
            <FolderOutlined style={{ color: label.color?.backgroundColor || '#666' }} />
            <span className={currentLabel === label.id ? 'text-blue-600 font-medium' : 'text-gray-700'}>
              {label.name}
            </span>
          </div>
          {(label.messagesUnread || 0) > 0 && (
            <Badge count={label.messagesUnread} size="small" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="google-mail-page h-screen">
      {msgCtx}
      <PageHeader 
        title="Gmail" 
        description="Interface Gmail complète intégrée à votre CRM"
        extra={[
          <Button key="compose" type="primary" icon={<PlusOutlined />} onClick={() => openCompose()}>
            Nouveau message
          </Button>,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => loadMessages()}>
            Actualiser
          </Button>
        ]}
      />
      
      <Layout className="h-full bg-white">
        {/* Sidebar avec labels */}
        <Sider width={280} className="bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              size="large"
              block
              className="mb-6"
              onClick={() => openCompose()}
            >
              Nouveau message
            </Button>
            
            {renderLabels()}
          </div>
        </Sider>

        {/* Contenu principal */}
        <Content className="flex flex-col">
          {/* Barre de recherche et actions */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Input.Search
                  placeholder="Rechercher dans Gmail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onSearch={() => loadMessages()}
                  enterButton
                  size="large"
                />
              </Col>
              
              {selectedMessages.length > 0 && (
                <Col>
                  <Space>
                    <Text>{selectedMessages.length} sélectionné(s)</Text>
                    <Button 
                      icon={<EyeOutlined />}
                      onClick={() => markAsRead(selectedMessages, true)}
                    >
                      Marquer comme lu
                    </Button>
                    <Button 
                      icon={<StarOutlined />}
                      onClick={() => toggleStar(selectedMessages, true)}
                    >
                      Ajouter étoile
                    </Button>
                    <Popconfirm
                      title="Supprimer les messages sélectionnés ?"
                      onConfirm={() => deleteMessages(selectedMessages)}
                    >
                      <Button icon={<DeleteOutlined />} danger>
                        Supprimer
                      </Button>
                    </Popconfirm>
                  </Space>
                </Col>
              )}
            </Row>
          </div>

          {/* Actions de sélection */}
          {messages.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <Checkbox
                indeterminate={selectedMessages.length > 0 && selectedMessages.length < messages.length}
                checked={selectedMessages.length === messages.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                Tout sélectionner
              </Checkbox>
            </div>
          )}

          {/* Liste des messages */}
          <div className="flex-1 overflow-y-auto">
            <Spin spinning={isLoading}>
              {messages.length === 0 ? (
                <Empty 
                  description="Connectez-vous à Gmail pour voir vos messages"
                  className="mt-20"
                />
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={messages}
                  renderItem={(message) => (
                    <List.Item
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isUnread(message) ? 'bg-blue-50' : ''
                      } ${selectedMessages.includes(message.id) ? 'bg-blue-100' : ''}`}
                      actions={[
                        <Tooltip title="Marquer avec une étoile" key="star">
                          <Button
                            type="text"
                            icon={<StarOutlined />}
                            className={isStarred(message) ? 'text-yellow-500' : ''}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar([message.id], !isStarred(message));
                            }}
                          />
                        </Tooltip>,
                        <Dropdown overlay={getActionsMenu(message)} trigger={['click']} key="more">
                          <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
                        </Dropdown>
                      ]}
                      onClick={() => {
                        setSelectedMessage(message);
                        setMessageDetailVisible(true);
                        if (isUnread(message)) {
                          markAsRead([message.id], true);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Checkbox
                          checked={selectedMessages.includes(message.id)}
                          onChange={() => handleSelectMessage(message.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <Avatar size="large" className="bg-blue-500">
                          {getHeader(message, 'from').charAt(0).toUpperCase()}
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <Text 
                                strong={isUnread(message)} 
                                className="text-gray-900 truncate max-w-xs"
                              >
                                {getHeader(message, 'from').split('<')[0].trim()}
                              </Text>
                              {message.payload.parts?.some(part => part.filename) && (
                                <PaperClipOutlined className="text-gray-400" />
                              )}
                            </div>
                            <Text className="text-gray-500 text-sm">
                              {new Date(parseInt(message.internalDate)).toLocaleDateString('fr-FR')}
                            </Text>
                          </div>
                          
                          <div className="mb-1">
                            <Text strong={isUnread(message)} className="text-gray-800">
                              {getHeader(message, 'subject') || '(Aucun objet)'}
                            </Text>
                          </div>
                          
                          <Text className="text-gray-600 text-sm truncate block">
                            {message.snippet}
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </div>

          {/* Pagination */}
          {pageToken && (
            <div className="p-4 border-t border-gray-200 text-center">
              <Button onClick={() => loadMessages(pageToken)}>
                Charger plus de messages
              </Button>
            </div>
          )}
        </Content>
      </Layout>

      {/* Modal de composition */}
      <Modal
        title="Nouveau message"
        open={composeVisible}
        onCancel={() => setComposeVisible(false)}
        footer={null}
        width={800}
        className="compose-modal"
      >
        <Form form={composeForm} onFinish={sendEmail} layout="vertical">
          <Form.Item name="to" label="Destinataires" rules={[{ required: true, message: 'Veuillez saisir au moins un destinataire' }]}>
            <Select
              mode="tags"
              placeholder="Saisir les adresses email..."
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <div className="flex space-x-2 mb-4">
            <Button type="link" onClick={() => setShowCc(!showCc)}>
              Cc
            </Button>
            <Button type="link" onClick={() => setShowBcc(!showBcc)}>
              Cci
            </Button>
          </div>

          {showCc && (
            <Form.Item name="cc" label="Copie (Cc)">
              <Select mode="tags" placeholder="Adresses en copie..." />
            </Form.Item>
          )}

          {showBcc && (
            <Form.Item name="bcc" label="Copie cachée (Cci)">
              <Select mode="tags" placeholder="Adresses en copie cachée..." />
            </Form.Item>
          )}

          <Form.Item name="subject" label="Objet" rules={[{ required: true, message: 'Veuillez saisir un objet' }]}>
            <Input placeholder="Objet du message" />
          </Form.Item>

          <Form.Item name="body" label="Message" rules={[{ required: true, message: 'Veuillez saisir un message' }]}>
            <TextArea rows={12} placeholder="Tapez votre message ici..." />
          </Form.Item>

          {/* Pièces jointes */}
          <div className="mb-4">
            <Dragger
              multiple
              beforeUpload={handleFileUpload}
              showUploadList={false}
              className="mb-2"
            >
              <p className="ant-upload-drag-icon">
                <PaperClipOutlined />
              </p>
              <p className="ant-upload-text">Cliquez ou glissez des fichiers ici</p>
            </Dragger>
            
            {attachments.length > 0 && (
              <div className="mt-2">
                <Text strong>Pièces jointes ({attachments.length}):</Text>
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <Button 
                        type="text" 
                        icon={<CloseOutlined />} 
                        onClick={() => removeAttachment(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button onClick={() => setComposeVisible(false)}>
              Annuler
            </Button>
            <Space>
              <Button type="default">
                Enregistrer le brouillon
              </Button>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                Envoyer
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Drawer pour les détails du message */}
      <Drawer
        title={selectedMessage ? getHeader(selectedMessage, 'subject') : ''}
        placement="right"
        width={600}
        open={messageDetailVisible}
        onClose={() => setMessageDetailVisible(false)}
        extra={
          selectedMessage && (
            <Space>
              <Button icon={<ReplyOutlined />} onClick={() => {
                setMessageDetailVisible(false);
                openCompose(selectedMessage);
              }}>
                Répondre
              </Button>
              <Button icon={<ForwardOutlined />}>
                Transférer
              </Button>
              <Dropdown overlay={getActionsMenu(selectedMessage)} trigger={['click']}>
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          )
        }
      >
        {selectedMessage && (
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Avatar size="large" className="bg-blue-500">
                    {getHeader(selectedMessage, 'from').charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong>{getHeader(selectedMessage, 'from')}</Text>
                    <br />
                    <Text className="text-gray-500 text-sm">
                      {new Date(parseInt(selectedMessage.internalDate)).toLocaleString('fr-FR')}
                    </Text>
                  </div>
                </div>
                {isStarred(selectedMessage) && (
                  <StarFilled className="text-yellow-500" />
                )}
              </div>
              
              <div className="text-sm text-gray-600">
                <div>À: {getHeader(selectedMessage, 'to')}</div>
                {getHeader(selectedMessage, 'cc') && (
                  <div>Cc: {getHeader(selectedMessage, 'cc')}</div>
                )}
              </div>
            </div>

            <div 
              className="message-body mb-4"
              dangerouslySetInnerHTML={{ __html: getEmailBody(selectedMessage) }}
            />

            {/* Pièces jointes */}
            {selectedMessage.payload.parts?.filter(part => part.filename).length > 0 && (
              <div className="border-t pt-4">
                <Title level={5}>Pièces jointes</Title>
                <div className="space-y-2">
                  {selectedMessage.payload.parts
                    .filter(part => part.filename)
                    .map((part, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <PaperClipOutlined />
                          <span>{part.filename}</span>
                          <Text className="text-gray-500 text-sm">
                            ({(part.body.size / 1024).toFixed(1)} KB)
                          </Text>
                        </div>
                        <Button 
                          icon={<DownloadOutlined />} 
                          size="small"
                          onClick={() => {
                            if (part.body.attachmentId) {
                              gmailService.getAttachment(selectedMessage.id, part.body.attachmentId);
                            }
                          }}
                        >
                          Télécharger
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default GoogleMailPage;

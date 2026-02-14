import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Typography, Spin, Button, Input, Modal, Form, 
  message, Tooltip, Empty, List, Grid, Dropdown, Tag,
  Avatar, Checkbox, Drawer, Upload, Popconfirm, Divider, Card, Segmented, Result
} from 'antd';
import type { UploadFile } from 'antd';
import { 
  MailOutlined, InboxOutlined, SendOutlined, FileOutlined, DeleteOutlined,
  StarOutlined, StarFilled, ReloadOutlined, PlusOutlined,
  MoreOutlined, EyeOutlined, ArrowLeftOutlined, PaperClipOutlined,
  TagOutlined, FolderOutlined, UserOutlined, DownloadOutlined, ForwardOutlined, UndoOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, WarningOutlined,
  EditOutlined, CloseOutlined, MenuOutlined, GoogleOutlined, SearchOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

// ============ INTERFACES ============

interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  cc?: string;
  bcc?: string;
  date: string;
  body: string;
  htmlBody?: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  attachments?: Attachment[];
  hasAttachments?: boolean;
}

interface Attachment {
  attachmentId: string;
  id?: string; // Alias for compatibility
  filename: string;
  mimeType: string;
  size: number;
}

interface Label {
  id: string;
  name: string;
  type: string;
  messageCount?: number;
  color?: { backgroundColor?: string; textColor?: string };
}

interface ComposeEmail {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments?: UploadFile[];
  replyToMessageId?: string;
  threadId?: string;
  quotedContent?: string;
}

type MailboxType = 'inbox' | 'sent' | 'drafts' | 'starred' | 'spam' | 'trash' | 'all' | string;

type MailSource = 'gmail' | 'one-com';

// ============ COMPOSANT PRINCIPAL ============

const GoogleGmailPageV2: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const stableApi = useMemo(() => api, [api]);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // Sélecteur de source mail
  const [mailSource, setMailSource] = useState<MailSource>('gmail');
  
  // États principaux
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [_searchLoading, setSearchLoading] = useState(false);
  const [currentMailbox, setCurrentMailbox] = useState<MailboxType>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // États pour les modals et drawers
  const [composeVisible, setComposeVisible] = useState(false);
  const [messageDrawerVisible, setMessageDrawerVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Toujours collapsed par défaut
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  
  // États pour composer un email
  const [composeEmail, setComposeEmail] = useState<ComposeEmail>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: [],
    quotedContent: ''
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  
  // Form pour créer un label
  const [labelForm] = Form.useForm();

  // ============ CONSTANTES ============

  const SYSTEM_LABELS: { key: MailboxType; label: string; icon: React.ReactNode; color?: string }[] = [
    { key: 'inbox', label: 'Boîte de réception', icon: <InboxOutlined />, color: '#1890ff' },
    { key: 'starred', label: 'Favoris', icon: <StarFilled style={{ color: '#faad14' }} /> },
    { key: 'sent', label: 'Messages envoyés', icon: <SendOutlined />, color: '#52c41a' },
    { key: 'drafts', label: 'Brouillons', icon: <FileOutlined />, color: '#722ed1' },
    { key: 'spam', label: 'Spam', icon: <WarningOutlined />, color: '#ff4d4f' },
    { key: 'trash', label: 'Corbeille', icon: <DeleteOutlined />, color: '#8c8c8c' },
    { key: 'all', label: 'Tous les messages', icon: <MailOutlined /> },
  ];

  // ============ FONCTIONS DE CHARGEMENT ============

  const loadMessages = useCallback(async (mailbox: MailboxType = 'inbox', query?: string, token?: string) => {
    try {
      setLoading(true);
      console.log('[Mail] 📬 Chargement messages:', { mailSource, mailbox, query, token });
      
      if (mailSource === 'gmail') {
        // Charger depuis Gmail API
        const params = new URLSearchParams();
        params.append('maxResults', '50');
        params.append('mailbox', mailbox);
        if (query) params.append('q', query);
        if (token) params.append('pageToken', token);
        
        const response = await stableApi.get(`/api/gmail/messages?${params.toString()}`);
        console.log('[Gmail] ✅ Réponse:', response);
        
        const newMessages = response.messages || response.data?.messages || [];
        
        if (token) {
          setMessages(prev => [...prev, ...newMessages]);
        } else {
          setMessages(newMessages);
        }
        
        setPageToken(response.nextPageToken || null);
        setHasMore(!!response.nextPageToken);
      } else {
        // Charger depuis One.com API
        const folderMap: Record<string, string> = {
          'inbox': 'inbox',
          'sent': 'sent',
          'drafts': 'drafts',
          'starred': 'starred',
          'spam': 'spam',
          'trash': 'trash',
          'all': 'inbox' // Pour l'instant, charger inbox
        };
        
        const folder = folderMap[mailbox] || 'inbox';
        const response = await stableApi.get(`/emails?folder=${folder}`);
        console.log('[One.com] ✅ Réponse:', response);
        
        // Convertir le format One.com vers le format Gmail
        const oneComMessages = (response || []).map((email: any) => ({
          id: email.id,
          threadId: email.id,
          snippet: email.body?.substring(0, 150) || '',
          subject: email.subject || '(Aucun objet)',
          from: email.from || '',
          fromEmail: email.from || '',
          to: email.to || '',
          toEmail: email.to || '',
          date: email.createdAt || new Date().toISOString(),
          body: email.body || '',
          htmlBody: email.body || '',
          isRead: email.isRead || false,
          isStarred: email.isStarred || false,
          labels: [folder],
          attachments: [],
          hasAttachments: false
        }));
        
        setMessages(oneComMessages);
        setPageToken(null);
        setHasMore(false);
      }
    } catch (error) {
      console.error('[Mail] ❌ Erreur chargement messages:', error);
      message.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  }, [stableApi, mailSource]);

  const loadLabels = useCallback(async () => {
    try {
      const response = await stableApi.get('/api/gmail/labels');
      console.log('[Gmail] 🏷️ Labels:', response);
      setLabels(response.labels || response || []);
    } catch (error) {
      console.error('[Gmail] ❌ Erreur chargement labels:', error);
    }
  }, [stableApi]);

  const loadMessageDetails = useCallback(async (messageId: string) => {
    try {
      console.log('[Gmail] 📧 Chargement détails message:', messageId);
      const response = await stableApi.get(`/api/gmail/messages/${messageId}`);
      console.log('[Gmail] ✅ Détails message:', response);
      setSelectedMessage(response);
      setMessageDrawerVisible(true);
      
      // Marquer comme lu automatiquement
      if (!response.isRead) {
        await markAsRead(messageId, true);
      }
    } catch (error) {
      console.error('[Gmail] ❌ Erreur chargement détails:', error);
      message.error('Erreur lors du chargement du message');
    }
  }, [stableApi]);

  // ============ EFFETS ============

  useEffect(() => {
    if (mailSource === 'gmail') {
      loadMessages(currentMailbox);
      loadLabels();
    } else {
      // Pour One.com, charger directement les messages
      loadMessages(currentMailbox);
    }
  }, [currentMailbox, loadMessages, loadLabels, mailSource]);

  // Sidebar toujours collapsed par défaut (mode mobile)
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [isMobile]);

  // ============ ACTIONS SUR LES MESSAGES ============

  const handleRefresh = useCallback(() => {
    setPageToken(null);
    loadMessages(currentMailbox, searchQuery);
  }, [currentMailbox, searchQuery, loadMessages]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setPageToken(null);
    loadMessages(currentMailbox, value);
  }, [currentMailbox, loadMessages]);

  const handleMailboxChange = useCallback((mailbox: MailboxType) => {
    setCurrentMailbox(mailbox);
    setSelectedMessage(null);
    setSelectedMessages([]);
    setPageToken(null);
    setSearchQuery('');
  }, []);

  const markAsRead = useCallback(async (messageId: string, read: boolean) => {
    try {
      console.log('[Gmail] 📖 Marquer comme lu:', { messageId, read });
      await stableApi.post(`/api/gmail/messages/${messageId}/modify`, {
        addLabelIds: read ? [] : ['UNREAD'],
        removeLabelIds: read ? ['UNREAD'] : []
      });
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isRead: read } : m
      ));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, isRead: read } : null);
      }
    } catch (error) {
      console.error('[Gmail] ❌ Erreur modification lecture:', error);
      message.error('Erreur lors de la modification');
    }
  }, [stableApi, selectedMessage]);

  const toggleStar = useCallback(async (messageId: string, starred: boolean) => {
    try {
      console.log('[Gmail] ⭐ Toggle étoile:', { messageId, starred });
      await stableApi.post(`/api/gmail/messages/${messageId}/modify`, {
        addLabelIds: starred ? ['STARRED'] : [],
        removeLabelIds: starred ? [] : ['STARRED']
      });
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isStarred: starred } : m
      ));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, isStarred: starred } : null);
      }
      
      message.success(starred ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur toggle étoile:', error);
      message.error('Erreur lors de la modification');
    }
  }, [stableApi, selectedMessage]);

  const moveToTrash = useCallback(async (messageId: string) => {
    try {
      console.log('[Gmail] 🗑️ Mettre à la corbeille:', messageId);
      await stableApi.post(`/api/gmail/messages/${messageId}/trash`);
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
        setMessageDrawerVisible(false);
      }
      
      message.success('Message mis à la corbeille');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur corbeille:', error);
      message.error('Erreur lors de la suppression');
    }
  }, [stableApi, selectedMessage]);

  const restoreFromTrash = useCallback(async (messageId: string) => {
    try {
      console.log('[Gmail] ♻️ Restaurer:', messageId);
      await stableApi.post(`/api/gmail/messages/${messageId}/untrash`);
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      message.success('Message restauré');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur restauration:', error);
      message.error('Erreur lors de la restauration');
    }
  }, [stableApi]);

  const deleteForever = useCallback(async (messageId: string) => {
    try {
      console.log('[Gmail] ❌ Suppression définitive:', messageId);
      await stableApi.delete(`/api/gmail/messages/${messageId}`);
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
        setMessageDrawerVisible(false);
      }
      
      message.success('Message supprimé définitivement');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  }, [stableApi, selectedMessage]);

  const emptyTrash = useCallback(async () => {
    try {
      console.log('[Gmail] 🗑️ Vider la corbeille');
      await stableApi.post('/api/gmail/trash/empty');
      
      if (currentMailbox === 'trash') {
        setMessages([]);
      }
      
      message.success('Corbeille vidée');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur vidage corbeille:', error);
      message.error('Erreur lors du vidage de la corbeille');
    }
  }, [stableApi, currentMailbox]);

  const archiveMessage = useCallback(async (messageId: string) => {
    try {
      console.log('[Gmail] 📦 Archiver:', messageId);
      await stableApi.post(`/api/gmail/messages/${messageId}/modify`, {
        removeLabelIds: ['INBOX']
      });
      
      if (currentMailbox === 'inbox') {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
      
      message.success('Message archivé');
    } catch (error) {
      console.error('[Gmail] ❌ Erreur archivage:', error);
      message.error('Erreur lors de l\'archivage');
    }
  }, [stableApi, currentMailbox]);

  // ============ ACTIONS GROUPÉES (OPTIMISÉ BATCH) ============

  const handleBulkAction = useCallback(async (action: 'read' | 'unread' | 'star' | 'unstar' | 'trash' | 'archive') => {
    if (selectedMessages.length === 0) return;
    
    try {
      setLoading(true);
      
      // 🚀 BATCH: Une seule requête au lieu de N requêtes individuelles
      switch (action) {
        case 'read':
          await stableApi.post('/api/batch/gmail/modify', {
            messageIds: selectedMessages,
            removeLabelIds: ['UNREAD']
          });
          setMessages(prev => prev.map(m => 
            selectedMessages.includes(m.id) ? { ...m, isRead: true } : m
          ));
          break;
          
        case 'unread':
          await stableApi.post('/api/batch/gmail/modify', {
            messageIds: selectedMessages,
            addLabelIds: ['UNREAD']
          });
          setMessages(prev => prev.map(m => 
            selectedMessages.includes(m.id) ? { ...m, isRead: false } : m
          ));
          break;
          
        case 'star':
          await stableApi.post('/api/batch/gmail/modify', {
            messageIds: selectedMessages,
            addLabelIds: ['STARRED']
          });
          setMessages(prev => prev.map(m => 
            selectedMessages.includes(m.id) ? { ...m, isStarred: true } : m
          ));
          break;
          
        case 'unstar':
          await stableApi.post('/api/batch/gmail/modify', {
            messageIds: selectedMessages,
            removeLabelIds: ['STARRED']
          });
          setMessages(prev => prev.map(m => 
            selectedMessages.includes(m.id) ? { ...m, isStarred: false } : m
          ));
          break;
          
        case 'trash':
          await stableApi.post('/api/batch/gmail/trash', {
            messageIds: selectedMessages
          });
          setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
          break;
          
        case 'archive':
          await stableApi.post('/api/batch/gmail/modify', {
            messageIds: selectedMessages,
            removeLabelIds: ['INBOX']
          });
          if (currentMailbox === 'inbox') {
            setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
          }
          break;
      }
      
      setSelectedMessages([]);
      message.success(`${selectedMessages.length} message(s) traité(s)`);
    } catch (error) {
      console.error('[Gmail] ❌ Erreur action groupée:', error);
      message.error('Erreur lors de l\'action groupée');
    } finally {
      setLoading(false);
    }
  }, [selectedMessages, stableApi, currentMailbox]);

  // ============ COMPOSER / ENVOYER EMAIL ============

  // Extraire SEULEMENT le contenu du <body> d'un HTML complet
  const extractBodyContent = (html: string): string => {
    if (!html) return '';
    
    // Si c'est un document HTML complet, extraire le body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1].trim();
    }
    
    // Sinon, c'est peut-être déjà du contenu simple - retourner tel quel
    return html;
  };

  const handleCompose = useCallback((replyTo?: EmailMessage, forward?: boolean) => {
    console.log('[Gmail] 📝 handleCompose appelé:', { replyTo, forward });
    
    if (replyTo) {
      // Extraire l'email depuis "from" si fromEmail est vide
      let emailTo = replyTo.fromEmail;
      if (!emailTo && replyTo.from) {
        const emailMatch = replyTo.from.match(/<([^>]+)>/) || replyTo.from.match(/([^\s<>]+@[^\s<>]+)/);
        emailTo = emailMatch ? emailMatch[1] : replyTo.from;
      }
      
      // En-tête du message cité
      const quotedHeader = forward 
        ? `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #555;">
            ---------- Message transféré ----------<br/>
            De: ${replyTo.from}<br/>
            Date: ${replyTo.date}<br/>
            Objet: ${replyTo.subject}<br/>
           </div><br/>`
        : `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #555;">
            Le ${replyTo.date}, ${replyTo.from} a écrit:
           </div>`;
      
      // EXTRAIRE LE BODY - pas le DOCTYPE/html/head !
      const rawContent = replyTo.htmlBody || replyTo.body || '';
      const cleanContent = extractBodyContent(rawContent);
      
      console.log('[Gmail] 📝 rawContent length:', rawContent.length);
      console.log('[Gmail] 📝 cleanContent length:', cleanContent.length);
      
      setComposeEmail({
        to: forward ? '' : emailTo || '',
        cc: '',
        bcc: '',
        subject: forward ? `Fwd: ${replyTo.subject}` : `Re: ${replyTo.subject}`,
        body: '',
        attachments: [],
        replyToMessageId: forward ? undefined : replyTo.id,
        threadId: replyTo.threadId,
        quotedContent: `${quotedHeader}${cleanContent}`
      });
    } else {
      setComposeEmail({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        attachments: [],
        quotedContent: ''
      });
    }
    setUploadFileList([]);
    setShowCc(false);
    setShowBcc(false);
    setComposeVisible(true);
  }, []);

  const handleSendEmail = useCallback(async () => {
    if (!composeEmail.to.trim()) {
      message.error('Veuillez entrer un destinataire');
      return;
    }
    
    try {
      setSendingEmail(true);
      console.log('[Mail] ✉️ Envoi email:', { mailSource, composeEmail });
      
      // Combiner body + quotedContent - GARDER LE HTML (comme Gmail !)
      const fullBody = composeEmail.quotedContent 
        ? `<div>${composeEmail.body}</div><br/><br/>${composeEmail.quotedContent}`
        : composeEmail.body;
      
      if (mailSource === 'gmail') {
        // Envoyer via Gmail API
        const emailData = {
          to: composeEmail.to,
          cc: composeEmail.cc || undefined,
          bcc: composeEmail.bcc || undefined,
          subject: composeEmail.subject,
          body: fullBody,
          isHtml: true,
          replyToMessageId: composeEmail.replyToMessageId || undefined,
          threadId: composeEmail.threadId || undefined
        };
        
        await stableApi.post('/api/gmail/messages/send', emailData);
      } else {
        // Envoyer via One.com API (Yandex)
        await stableApi.post('/yandex/send', { 
          to: composeEmail.to,
          subject: composeEmail.subject,
          html: fullBody
        });
      }
      
      message.success('Email envoyé avec succès !');
      setComposeVisible(false);
      setComposeEmail({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [], quotedContent: '' });
      setUploadFileList([]);
      
      // Rafraîchir si on est dans les envoyés
      if (currentMailbox === 'sent') {
        handleRefresh();
      }
    } catch (error) {
      console.error('[Mail] ❌ Erreur envoi:', error);
      message.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmail(false);
    }
  }, [composeEmail, uploadFileList, stableApi, currentMailbox, handleRefresh, mailSource]);

  // ============ GESTION DES LABELS ============

  const handleCreateLabel = useCallback(async (values: { name: string }) => {
    try {
      console.log('[Gmail] 🏷️ Création label:', values.name);
      await stableApi.post('/api/gmail/labels', { name: values.name });
      
      message.success('Dossier créé');
      setLabelModalVisible(false);
      labelForm.resetFields();
      loadLabels();
    } catch (error) {
      console.error('[Gmail] ❌ Erreur création label:', error);
      message.error('Erreur lors de la création du dossier');
    }
  }, [stableApi, labelForm, loadLabels]);

  const handleDeleteLabel = useCallback(async (labelId: string) => {
    try {
      console.log('[Gmail] 🗑️ Suppression label:', labelId);
      await stableApi.delete(`/api/gmail/labels/${labelId}`);
      
      message.success('Dossier supprimé');
      loadLabels();
    } catch (error) {
      console.error('[Gmail] ❌ Erreur suppression label:', error);
      message.error('Erreur lors de la suppression du dossier');
    }
  }, [stableApi, loadLabels]);

  // ============ TÉLÉCHARGER PIÈCE JOINTE ============

  const downloadAttachment = useCallback(async (messageId: string, attachmentId: string, filename: string) => {
    try {
      console.log('[Gmail] 📎 Téléchargement pièce jointe:', { messageId, attachmentId, filename });
      
      const response = await stableApi.get(
        `/api/gmail/messages/${messageId}/attachments/${attachmentId}`,
        { responseType: 'blob' }
      );
      
      // Créer un lien de téléchargement
      const blob = new Blob([response], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success(`Téléchargement de ${filename}`);
    } catch (error) {
      console.error('[Gmail] ❌ Erreur téléchargement:', error);
      message.error('Erreur lors du téléchargement');
    }
  }, [stableApi]);

  // ============ UTILITAIRES ============

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }, []);

  const getMailboxTitle = useCallback(() => {
    const found = SYSTEM_LABELS.find(l => l.key === currentMailbox);
    if (found) return found.label;
    const customLabel = labels.find(l => l.id === currentMailbox || l.name === currentMailbox);
    return customLabel?.name || 'Messages';
  }, [currentMailbox, labels]);

  // ============ RENDU SIDEBAR ============

  const renderSidebar = () => {
    // Toujours utiliser un Drawer (mobile et desktop)
    return (
      <Drawer
        title={null}
        placement="left"
        onClose={() => setSidebarCollapsed(true)}
        open={!sidebarCollapsed}
        width={280}
        styles={{ 
          body: { padding: '12px 10px 14px', background: 'white' },
          header: { display: 'none' },
          wrapper: { boxShadow: '0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2)' }
        }}
        closeIcon={null}
      >
        {/* En-tête Gmail style */}
        <div style={{ padding: '16px 12px 12px', background: 'white', borderBottom: '1px solid #e0e0e0', borderRadius: 12 }}>
          <div className="flex items-center gap-2 mb-3" style={{ paddingLeft: 4 }}>
            <MailOutlined className="text-red-600 text-xl" />
            <span className="font-normal text-lg text-gray-800">Gmail</span>
          </div>
          
          {/* Bouton Nouveau message */}
          <Button
            type="default"
            icon={<EditOutlined />}
            size="large"
            onClick={() => { handleCompose(); setSidebarCollapsed(true); }}
            className="w-full mb-4"
            style={{ 
              background: 'white',
              border: '1px solid #dadce0',
              borderRadius: '24px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
              fontSize: '14px',
              fontWeight: 500,
              color: '#202124'
            }}
          >
            Nouveau message
          </Button>
          
          {/* Recherche style Gmail */}
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Rechercher..."
            onPressEnter={(e) => { handleSearch(e.currentTarget.value); setSidebarCollapsed(true); }}
            allowClear
            size="middle"
            className="w-full"
            style={{ 
              background: '#f1f3f4',
              border: 'none',
              borderRadius: '8px'
            }}
          />
        </div>
        
        {/* Labels système - style Gmail */}
        <div style={{ background: 'white', paddingBottom: '8px', paddingTop: 6 }}>
          {SYSTEM_LABELS.map(item => (
            <div
              key={item.key}
              className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-full cursor-pointer transition-all ${
                currentMailbox === item.key 
                  ? 'bg-blue-50 font-medium' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => { handleMailboxChange(item.key); setSidebarCollapsed(true); }}
              style={{ color: currentMailbox === item.key ? '#1967d2' : '#202124' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-base" style={{ color: currentMailbox === item.key ? '#1967d2' : '#5f6368' }}>
                  {item.icon}
                </span>
                <span className="text-sm">
                  {item.label}
                </span>
              </div>
              {item.key === 'inbox' && messages.length > 0 && (
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: currentMailbox === item.key ? '#1967d2' : '#5f6368',
                    background: currentMailbox === item.key ? '#e8f0fe' : '#f1f3f4',
                    padding: '2px 6px',
                    borderRadius: 999
                  }}
                >
                  {messages.length}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Section Dossiers */}
        <div style={{ background: 'white', padding: '10px 12px 8px', borderTop: '1px solid #e0e0e0' }}>
          <div className="flex items-center justify-between mb-2">
            <Text style={{ color: '#5f6368', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Libellés
            </Text>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined style={{ fontSize: '11px', color: '#5f6368' }} />}
              onClick={() => { setLabelModalVisible(true); setSidebarCollapsed(true); }}
              className="hover:bg-gray-100 h-5 w-5 flex items-center justify-center p-0"
            />
          </div>
        </div>
        
        {/* Liste des dossiers style Gmail */}
        <div style={{ background: 'white', paddingBottom: '16px' }}>
          {labels.filter(l => l.type === 'user').length === 0 ? (
            <div className="text-center py-6 px-4">
              <p className="text-xs text-gray-400">Aucun libellé</p>
            </div>
          ) : (
            labels.filter(l => l.type === 'user').map(label => (
              <div
                key={label.id}
                className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-full cursor-pointer transition-all group ${
                  currentMailbox === label.id 
                    ? 'bg-blue-50' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => { handleMailboxChange(label.id); setSidebarCollapsed(true); }}
                style={{ color: currentMailbox === label.id ? '#1967d2' : '#202124' }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <TagOutlined className="text-sm" style={{ color: currentMailbox === label.id ? '#1967d2' : '#5f6368' }} />
                  <span className="text-sm truncate">
                    {label.name}
                  </span>
                </div>
                <Popconfirm
                  title="Supprimer ?"
                  onConfirm={(e) => { e?.stopPropagation(); handleDeleteLabel(label.id); }}
                  okText="Oui"
                  cancelText="Non"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined style={{ fontSize: '11px', color: '#5f6368' }} />}
                    className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 h-5 w-5 flex items-center justify-center p-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            ))
          )}
        </div>
      </Drawer>
    );
  };

  // ============ RENDU LISTE MESSAGES ============

  const renderMessageList = () => (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden" style={{ maxWidth: '100%', width: '100%' }}>
      {/* Toolbar - desktop only ou si actions sélectionnées */}
      {(!isMobile || selectedMessages.length > 0) && (
        <div className="p-2 sm:p-3 border-b flex items-center gap-1 sm:gap-2 overflow-hidden" style={{ maxWidth: '100%' }}>
          {!isMobile && (
            <Checkbox
              indeterminate={selectedMessages.length > 0 && selectedMessages.length < messages.length}
              checked={selectedMessages.length === messages.length && messages.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMessages(messages.map(m => m.id));
                } else {
                  setSelectedMessages([]);
                }
              }}
            />
          )}
          
        {selectedMessages.length > 0 && (
          <Dropdown
            menu={{
              items: [
                { key: 'read', label: 'Marquer comme lu', icon: <EyeOutlined /> },
                { key: 'unread', label: 'Marquer comme non lu', icon: <MailOutlined /> },
                { key: 'star', label: 'Ajouter aux favoris', icon: <StarOutlined /> },
                { key: 'unstar', label: 'Retirer des favoris', icon: <StarFilled /> },
                { type: 'divider' },
                { key: 'archive', label: 'Archiver', icon: <FolderOutlined /> },
                { key: 'trash', label: 'Supprimer', icon: <DeleteOutlined />, danger: true },
              ],
              onClick: ({ key }) => handleBulkAction(key as any)
            }}
          >
            <Button size={isMobile ? 'small' : 'middle'}>
              {isMobile ? `(${selectedMessages.length})` : `Actions (${selectedMessages.length})`}
            </Button>
          </Dropdown>
        )}
        
        {currentMailbox === 'trash' && messages.length > 0 && !isMobile && (
          <Popconfirm
            title="Vider la corbeille ?"
            description="Tous les messages seront supprimés définitivement."
            onConfirm={emptyTrash}
            okText="Vider"
            okType="danger"
            cancelText="Annuler"
          >
            <Button danger icon={<DeleteOutlined />} size={isMobile ? 'small' : 'middle'}>
              {!isMobile && 'Vider la corbeille'}
            </Button>
          </Popconfirm>
        )}
        
        <div className="flex-1 min-w-0" />
        </div>
      )}
      
      {/* Liste */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxWidth: '100%' }}>
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Spin size="large" tip="Chargement des messages..." />
          </div>
        ) : messages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <Text type="secondary" className="block mb-2">
                  {searchQuery ? 'Aucun message trouvé' : `Aucun message dans ${getMailboxTitle()}`}
                </Text>
                {!searchQuery && (
                  <Text type="secondary" className="text-xs">
                    Les nouveaux messages apparaîtront ici
                  </Text>
                )}
              </div>
            }
            className="mt-16"
          />
        ) : (
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <div
                key={msg.id}
                onClick={() => loadMessageDetails(msg.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: !msg.isRead ? '#f0f7ff' : 'white',
                  cursor: 'pointer'
                }}
              >
                {/* Étoile */}
                <div
                  onClick={(e) => { e.stopPropagation(); toggleStar(msg.id, !msg.isStarred); }}
                  style={{ flexShrink: 0 }}
                >
                  {msg.isStarred ? (
                    <StarFilled style={{ color: '#faad14', fontSize: 18 }} />
                  ) : (
                    <StarOutlined style={{ color: '#d9d9d9', fontSize: 18 }} />
                  )}
                </div>
                
                {/* Avatar */}
                <Avatar 
                  size={40} 
                  icon={<UserOutlined />}
                  style={{ backgroundColor: !msg.isRead ? '#1890ff' : '#bfbfbf', flexShrink: 0 }}
                />
                
                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: !msg.isRead ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {currentMailbox === 'sent' ? msg.to : msg.from}
                    </span>
                    {msg.hasAttachments && <PaperClipOutlined style={{ color: '#999', flexShrink: 0 }} />}
                    <span style={{ color: '#999', fontSize: 12, flexShrink: 0 }}>{formatDate(msg.date)}</span>
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: !msg.isRead ? '#333' : '#666' }}>
                    {msg.subject || '(sans objet)'}
                  </div>
                </div>
              </div>
            )}
          />
        )}
        
        {hasMore && (
          <div className="p-4 text-center">
            <Button
              onClick={() => loadMessages(currentMailbox, searchQuery, pageToken || undefined)}
              loading={loading}
              block={isMobile}
            >
              Charger plus
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // ============ RENDU MESSAGE DRAWER ============

  const renderMessageDrawer = () => (
    <Drawer
      title={null}
      placement="right"
      width={isMobile ? '100%' : 700}
      open={messageDrawerVisible}
      onClose={() => { setMessageDrawerVisible(false); setSelectedMessage(null); }}
      styles={{ body: { padding: 0 }, header: { display: 'none' } }}
      className="gmail-message-drawer"
    >
      {selectedMessage && (
        <div className="h-full flex flex-col bg-white">
          {/* Header du message - Style moderne et responsive */}
          <div className={`${isMobile ? 'p-3' : 'p-4'} border-b bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10`}>
            <div className="flex items-center gap-2 mb-3">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => { setMessageDrawerVisible(false); setSelectedMessage(null); }}
                className="hover:bg-gray-100 rounded-lg"
                size={isMobile ? 'middle' : 'middle'}
              />
              
              <div className="flex-1" />
              
              <div className={`flex items-center ${isMobile ? 'gap-0.5' : 'gap-1'} bg-gray-100 rounded-lg p-1`}>
                <Tooltip title="Archiver">
                  <Button
                    type="text"
                    size="small"
                    icon={<FolderOutlined />}
                    onClick={() => archiveMessage(selectedMessage.id)}
                    className="hover:bg-white rounded-md"
                  />
                </Tooltip>
                
                <Tooltip title={selectedMessage.isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                  <Button
                    type="text"
                    size="small"
                    icon={selectedMessage.isStarred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    onClick={() => toggleStar(selectedMessage.id, !selectedMessage.isStarred)}
                    className="hover:bg-white rounded-md"
                  />
                </Tooltip>
                
                {currentMailbox === 'trash' ? (
                  <>
                    <Tooltip title="Restaurer">
                      <Button
                        type="text"
                        size="small"
                        icon={<UndoOutlined />}
                        onClick={() => restoreFromTrash(selectedMessage.id)}
                        className="hover:bg-white rounded-md"
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Supprimer définitivement ?"
                      onConfirm={() => deleteForever(selectedMessage.id)}
                      okText="Supprimer"
                      okType="danger"
                      cancelText="Annuler"
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} className="hover:bg-red-50 rounded-md" />
                    </Popconfirm>
                  </>
                ) : (
                  <Tooltip title="Supprimer">
                    <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => moveToTrash(selectedMessage.id)}
                    className="hover:bg-red-50 rounded-md"
                  />
                </Tooltip>
              )}
              </div>
            </div>
            
            {/* Sujet avec badge non lu */}
            <div className="flex items-start gap-2 mb-3">
              <Title level={isMobile ? 5 : 4} className="m-0 flex-1 break-words">{selectedMessage.subject || '(sans objet)'}</Title>
              {!selectedMessage.isRead && (
                <Tag color="blue" className="m-0 flex-shrink-0">Nouveau</Tag>
              )}
            </div>
            
            {/* Expéditeur avec style amélioré et responsive */}
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-start gap-3'} p-3 bg-white rounded-xl border border-gray-100 shadow-sm`}>
              <div className="flex items-start gap-3">
                <Avatar 
                  size={isMobile ? 40 : 48} 
                  icon={<UserOutlined />}
                  style={{ 
                    backgroundColor: '#1890ff',
                    flexShrink: 0
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <Text strong className={`${isMobile ? 'text-sm' : 'text-base'}`}>{selectedMessage.from}</Text>
                    {!isMobile && (
                      <Text type="secondary" className="text-xs truncate">&lt;{selectedMessage.fromEmail}&gt;</Text>
                    )}
                  </div>
                  <Text type="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'} block mt-0.5 truncate`}>
                    À: {selectedMessage.to}
                  </Text>
                  {selectedMessage.cc && (
                    <Text type="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'} block truncate`}>
                      Cc: {selectedMessage.cc}
                    </Text>
                  )}
                </div>
              </div>
              <div className={`${isMobile ? 'text-left pl-[52px]' : 'text-right'} flex-shrink-0`}>
                <Text type="secondary" className="text-xs block">
                  {new Date(selectedMessage.date).toLocaleDateString('fr-FR', { 
                    weekday: isMobile ? 'short' : 'long', 
                    day: 'numeric', 
                    month: isMobile ? 'short' : 'long' 
                  })}
                  {isMobile && ` à ${new Date(selectedMessage.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                </Text>
                {!isMobile && (
                  <Text type="secondary" className="text-xs">
                    {new Date(selectedMessage.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </div>
            </div>
          </div>
          
          {/* Corps du message */}
          <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'} bg-white`}>
            <div className={`bg-gray-50 ${isMobile ? 'rounded-lg p-3' : 'rounded-xl p-4'} min-h-[200px]`}>
              {selectedMessage.htmlBody ? (
                <div 
                  className={`prose max-w-none ${isMobile ? 'prose-sm' : ''}`}
                  style={{ fontSize: isMobile ? 14 : 16 }}
                  dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }}
                />
              ) : (
                <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: isMobile ? 14 : 16 }}>
                  {selectedMessage.body}
                </Paragraph>
              )}
            </div>
            
            {/* Pièces jointes - Style cartes modernes et responsive */}
            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
              <div className={`mt-4 sm:mt-6 pt-4 border-t`}>
                <Text strong className={`mb-2 sm:mb-3 block text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                  <PaperClipOutlined className="mr-2" />
                  {selectedMessage.attachments.length} pièce(s) jointe(s)
                </Text>
                <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex flex-wrap gap-3'}`}>
                  {selectedMessage.attachments.map((att, index) => (
                    <Card
                      key={att.attachmentId || `attachment-${index}`}
                      size="small"
                      className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-0 bg-gradient-to-br from-gray-50 to-white ${isMobile ? 'w-full' : ''}`}
                      style={{ borderRadius: isMobile ? 8 : 12 }}
                      onClick={() => downloadAttachment(selectedMessage.id, att.attachmentId, att.filename)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg bg-blue-100 flex items-center justify-center`}>
                          <FileOutlined className={`text-blue-500 ${isMobile ? 'text-base' : 'text-lg'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text ellipsis className={`block font-medium ${isMobile ? 'text-sm' : ''}`}>{att.filename}</Text>
                          <Text type="secondary" className="text-xs">{formatFileSize(att.size)}</Text>
                        </div>
                        <DownloadOutlined className={`text-blue-500 ${isMobile ? 'text-base' : 'text-lg'}`} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Actions en bas - Style moderne et responsive */}
          <div className={`${isMobile ? 'p-3' : 'p-4'} border-t bg-gradient-to-r from-gray-50 to-white flex ${isMobile ? 'flex-col gap-2' : 'flex-row gap-3'}`}>
            <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
              <Button
                type="primary"
                icon={<UndoOutlined />}
                onClick={() => { setMessageDrawerVisible(false); handleCompose(selectedMessage); }}
                className={`shadow-md hover:shadow-lg ${isMobile ? 'flex-1' : ''}`}
                style={{ borderRadius: 8 }}
              >
                Répondre
              </Button>
              <Button
                icon={<ForwardOutlined />}
                onClick={() => { setMessageDrawerVisible(false); handleCompose(selectedMessage, true); }}
                className={isMobile ? 'flex-1' : ''}
                style={{ borderRadius: 8 }}
              >
                Transférer
              </Button>
            </div>
            {!isMobile && (
              <>
                <div className="flex-1" />
                <Button
                  type="text"
                  icon={<MoreOutlined />}
                  style={{ borderRadius: 8 }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );

  // ============ RENDU COMPOSE MODAL ============

  const renderComposeModal = () => (
    <Modal
      title={null}
      open={composeVisible}
      onCancel={() => setComposeVisible(false)}
      footer={null}
      width={isMobile ? '100%' : 600}
      closable={false}
      style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0 } : { top: 50 }}
      styles={{ 
        body: { padding: 0 },
        content: isMobile ? { borderRadius: 0, height: '100vh', display: 'flex', flexDirection: 'column' } : { borderRadius: 12, overflow: 'hidden' }
      }}
      className="gmail-compose-modal"
    >
      {/* Header Gmail style */}
      <div 
        style={{ 
          background: '#404040',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: isMobile ? 0 : '12px 12px 0 0'
        }}
      >
        <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
          {composeEmail.replyToMessageId ? 'Répondre' : 'Nouveau message'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined style={{ color: 'white', fontSize: 14 }} />}
            onClick={() => setComposeVisible(false)}
            style={{ color: 'white' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100vh - 44px)' : 'auto', background: 'white' }}>
        {/* Champs destinataires - style Gmail */}
        <div style={{ borderBottom: '1px solid #e0e0e0' }}>
          {/* À: */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#5f6368', fontSize: 14, width: 32 }}>À</span>
            <Input
              value={composeEmail.to}
              onChange={(e) => setComposeEmail(prev => ({ ...prev, to: e.target.value }))}
              placeholder=""
              variant="borderless"
              style={{ flex: 1, fontSize: 14 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {!showCc && (
                <span 
                  onClick={() => setShowCc(true)} 
                  style={{ color: '#5f6368', fontSize: 14, cursor: 'pointer' }}
                >
                  Cc
                </span>
              )}
              {!showBcc && (
                <span 
                  onClick={() => setShowBcc(true)} 
                  style={{ color: '#5f6368', fontSize: 14, cursor: 'pointer' }}
                >
                  Cci
                </span>
              )}
            </div>
          </div>

          {/* Cc: */}
          {showCc && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#5f6368', fontSize: 14, width: 32 }}>Cc</span>
              <Input
                value={composeEmail.cc}
                onChange={(e) => setComposeEmail(prev => ({ ...prev, cc: e.target.value }))}
                variant="borderless"
                style={{ flex: 1, fontSize: 14 }}
              />
              <CloseOutlined 
                onClick={() => { setShowCc(false); setComposeEmail(prev => ({ ...prev, cc: '' })); }}
                style={{ color: '#5f6368', fontSize: 12, cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Cci: */}
          {showBcc && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#5f6368', fontSize: 14, width: 32 }}>Cci</span>
              <Input
                value={composeEmail.bcc}
                onChange={(e) => setComposeEmail(prev => ({ ...prev, bcc: e.target.value }))}
                variant="borderless"
                style={{ flex: 1, fontSize: 14 }}
              />
              <CloseOutlined 
                onClick={() => { setShowBcc(false); setComposeEmail(prev => ({ ...prev, bcc: '' })); }}
                style={{ color: '#5f6368', fontSize: 12, cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Objet */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px' }}>
            <Input
              value={composeEmail.subject}
              onChange={(e) => setComposeEmail(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Objet"
              variant="borderless"
              style={{ flex: 1, fontSize: 14 }}
            />
          </div>
        </div>

        {/* Zone de texte principale */}
        <div style={{ flex: 1, minHeight: isMobile ? 0 : 250, display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={composeEmail.body.replace(/<[^>]*>/g, '')}
            onChange={(e) => setComposeEmail(prev => ({ ...prev, body: e.target.value }))}
            placeholder=""
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '16px',
              fontSize: 14,
              fontFamily: 'Arial, sans-serif',
              lineHeight: 1.5,
              minHeight: isMobile ? 150 : 200,
              color: '#202124'
            }}
          />
          
          {/* Citation pour réponse OU transfert (afficher si quotedContent existe) */}
          {composeEmail.quotedContent && (
            <div style={{ 
              padding: '0 16px 16px', 
              borderLeft: '2px solid #ccc', 
              marginLeft: 16, 
              marginRight: 16,
              marginBottom: 16,
              color: '#5f6368',
              fontSize: 13
            }}>
              <div 
                dangerouslySetInnerHTML={{ __html: composeEmail.quotedContent }}
                style={{ maxHeight: 300, overflow: 'auto' }}
              />
            </div>
          )}
        </div>

        {/* Footer Gmail style */}
        <div style={{ 
          borderTop: '1px solid #e0e0e0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="primary"
              onClick={handleSendEmail}
              loading={sendingEmail}
              style={{ 
                borderRadius: 18,
                background: '#0b57d0',
                border: 'none',
                fontWeight: 500,
                paddingLeft: 20,
                paddingRight: 20,
                height: 36
              }}
            >
              Envoyer
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Upload
              fileList={uploadFileList}
              onChange={({ fileList }) => setUploadFileList(fileList)}
              beforeUpload={() => false}
              multiple
              showUploadList={false}
            >
              <Button
                type="text"
                icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                style={{ color: '#5f6368' }}
                title="Joindre des fichiers"
              />
            </Upload>
            <Button
              type="text"
              icon={<DeleteOutlined style={{ fontSize: 18 }} />}
              onClick={() => setComposeVisible(false)}
              style={{ color: '#5f6368' }}
              title="Supprimer le brouillon"
            />
          </div>
        </div>

        {/* Liste des pièces jointes */}
        {uploadFileList.length > 0 && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid #e0e0e0', background: '#f8f9fa' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {uploadFileList.map((file, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    background: 'white',
                    borderRadius: 16,
                    border: '1px solid #e0e0e0',
                    fontSize: 13
                  }}
                >
                  <PaperClipOutlined style={{ color: '#5f6368' }} />
                  <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <CloseOutlined 
                    onClick={() => setUploadFileList(prev => prev.filter((_, i) => i !== index))}
                    style={{ color: '#5f6368', fontSize: 12, cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );

  // ============ RENDU MODAL CRÉATION LABEL ============

  const renderLabelModal = () => (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FolderOutlined className="text-blue-500" />
          <span>Créer un nouveau dossier</span>
        </div>
      }
      open={labelModalVisible}
      onCancel={() => { setLabelModalVisible(false); labelForm.resetFields(); }}
      onOk={() => labelForm.submit()}
      okText="Créer"
      cancelText="Annuler"
    >
      <Form form={labelForm} onFinish={handleCreateLabel} layout="vertical">
        <Form.Item
          name="name"
          label="Nom du dossier"
          rules={[{ required: true, message: 'Veuillez entrer un nom' }]}
        >
          <Input placeholder="Mon dossier" />
        </Form.Item>
      </Form>
    </Modal>
  );

  // ============ RENDU PRINCIPAL ============

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header avec sélecteur - Desktop */}
      {/* Header identique mobile et desktop */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
          {mailSource === 'gmail' && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setSidebarCollapsed(false)}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MailOutlined style={{ fontSize: 18 }} />
            <span style={{ fontWeight: 600 }}>Boîte de réception</span>
          </div>
          {mailSource === 'gmail' && (
            <Button
              type="text"
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
            />
          )}
        </div>
        {/* Sélecteur */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
          <Segmented
            value={mailSource}
            onChange={(value) => setMailSource(value as MailSource)}
            block
            options={[
              {
                label: (
                  <div style={{ padding: '4px 8px' }}>
                    <GoogleOutlined style={{ marginRight: 6 }} />
                    Gmail
                  </div>
                ),
                value: 'gmail',
              },
              {
                label: (
                  <div style={{ padding: '4px 8px' }}>
                    <MailOutlined style={{ marginRight: 6 }} />
                    Mail Pro
                  </div>
                ),
                value: 'one-com',
              },
            ]}
          />
        </div>
      </div>
      
      {/* Contenu principal - MÊME INTERFACE pour Gmail et One.com */}
      <div className="flex-1 flex overflow-hidden relative w-full max-w-full">
        {/* Sidebar */}
        {renderSidebar()}
        
        {/* Liste des messages */}
        {renderMessageList()}
      </div>
      
      {/* Modals et Drawers - pour Gmail et One.com */}
      {renderMessageDrawer()}
      {renderComposeModal()}
      {renderLabelModal()}
      
      {/* FAB pour mobile - Nouveau message */}
      {isMobile && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<EditOutlined style={{ fontSize: 22 }} />}
          onClick={() => handleCompose()}
          className="shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            border: 'none',
            zIndex: 100
          }}
        />
      )}
    </div>
  );
};

export default GoogleGmailPageV2;

/**
 * CORRECTIONS GOOGLE MAIL - TOUS LES PROBLÈMES IDENTIFIÉS
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Layout, List, Button, Input, Typography, Space, Empty, Spin,
  Dropdown, Menu, message, Card, Modal, Tooltip, Divider, Avatar,
  Checkbox, Tag, Drawer, BackTop, Select, Alert
} from 'antd';
import { 
  SearchOutlined, MailOutlined, ReloadOutlined, SettingOutlined, PlusOutlined,
  DeleteOutlined, StarOutlined, StarFilled, CheckOutlined, CloseOutlined,
  FolderAddOutlined, SyncOutlined, InboxOutlined, SendOutlined,
  FileOutlined, ExclamationCircleOutlined, EyeOutlined, DownloadOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { FormattedGmailMessage, ExtendedGmailMessage } from '../types/gmail';
import { useGmailService } from '../hooks/useGmailService';
import { EmailComposer } from '../components/EmailComposer';
import { CreateDraftData, DraftData } from '../hooks/useDrafts';
import DraftsManager from '../components/DraftsManager';
import '../mail/components/EmailReader.css';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// Extension locale pour ajouter le toggle d'affichage HTML
interface ExtendedGmailMessage extends FormattedGmailMessage {
  showRawHtml?: boolean;
}

const GoogleMailPageFixed: React.FC = () => {
  // États de base
  const [messages, setMessages] = useState<FormattedGmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedGmailMessage | null>(null);
  const [currentLabelId, setCurrentLabelId] = useState<string>('INBOX');
  const [, setPageToken] = useState<string>('');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [messageDetailDrawerVisible, setMessageDetailDrawerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  
  // États pour les fonctionnalités avancées
  const [selectedMessagesForMove, setSelectedMessagesForMove] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customLabels, setCustomLabels] = useState<Array<{key: string, label: string}>>([]);
  const [newLabelModalVisible, setNewLabelModalVisible] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  
  // États pour la prévisualisation des pièces jointes
  const [previewAttachment, setPreviewAttachment] = useState<{
    filename: string;
    mimeType: string;
    data: string;
    attachmentId: string;
    objectUrl: string;
    viewerUrl: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // État pour le modal de confirmation de vidage de corbeille
  const [confirmEmptyTrashVisible, setConfirmEmptyTrashVisible] = useState(false);
  
  // État pour l'affichage du gestionnaire de brouillons
  const [showDraftsManager, setShowDraftsManager] = useState(false);

  // 🚀 NOUVEAU: États pour pré-remplissage des modals
  const [composerPrefilledData, setComposerPrefilledData] = useState<Partial<CreateDraftData> | null>(null);

  // Service Gmail - stable
  const gmailServiceHook = useGmailService();
  const gmailServiceRef = useRef(gmailServiceHook);
  
  // Mettre à jour la référence sans déclencher de re-render
  useEffect(() => {
    gmailServiceRef.current = gmailServiceHook;
  });

  // Nettoyage des Object URLs pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      if (previewAttachment?.objectUrl) {
        URL.revokeObjectURL(previewAttachment.objectUrl);
      }
    };
  }, [previewAttachment?.objectUrl]);

  // Fonction pour fermer l'aperçu et nettoyer les ressources
  const closePreview = useCallback(() => {
    if (previewAttachment?.objectUrl) {
      URL.revokeObjectURL(previewAttachment.objectUrl);
    }
    setPreviewAttachment(null);
  }, [previewAttachment?.objectUrl]);

  // Initialisation des données au montage du composant - UNE SEULE FOIS
  useEffect(() => {
    let mounted = true;
    
    const initializeData = async () => {
      if (!mounted) return;
      
      console.log('[Gmail] 🚀 Chargement des données initiales - useEffect direct');
      setIsLoading(true);
      
      try {
        // Utiliser la fonction loadMailbox pour charger les messages avec la bonne logique
        const queryParams: { maxResults: number; labelIds: string[] } = { 
          maxResults: 25,
          labelIds: [currentLabelId]
        };
        
        const result = await gmailServiceRef.current.getMessages(queryParams);

        if (!mounted) return;

        console.log('[Gmail] 📧 Réponse complète result:', result);
        if (result && Array.isArray(result.messages)) {
          console.log('[Gmail] 📧 Messages reçus:', result.messages.length);
          console.log('[Gmail] 🔍 Premier message (debug):', result.messages[0]);
          setMessages(result.messages);
          setPageToken(result.nextPageToken || '');
        } else {
          console.log('[Gmail] ❌ Pas de données valides dans result');
          setMessages([]);
          setPageToken('');
        }
        
        console.log('[Gmail] ✅ Initialisation terminée avec succès');
        
        // Charger les labels personnalisés
        try {
          const labelsResponse = await gmailServiceRef.current.getLabels();
          // Vérifier si la réponse contient une propriété 'labels'
          const labelsArray = labelsResponse?.labels || labelsResponse;
          
          if (labelsArray && Array.isArray(labelsArray)) {
            // Filtrer les labels personnalisés (pas les labels système Gmail)
            const userLabels = labelsArray
              .filter((label: any) => 
                label.type === 'user' && 
                !['CHAT', 'SENT', 'INBOX', 'IMPORTANT', 'TRASH', 'DRAFT', 'SPAM'].includes(label.id)
              )
              .map((label: any) => ({
                key: label.id,
                label: label.name
              }));
            
            console.log('[Gmail] 🏷️ Labels personnalisés trouvés:', userLabels);
            setCustomLabels(userLabels);
          }
        } catch (labelsError) {
          console.error('[Gmail] ⚠️ Erreur chargement labels:', labelsError);
        }

      } catch (error) {
        if (!mounted) return;
        console.error('[Gmail] ❌ Erreur initialisation:', error);
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
  }, [currentLabelId]); // Inclure currentLabelId pour reagir aux changements

  const loadMailbox = useCallback(async (mailbox: string) => {
    console.log(`[Gmail] 📂 Chargement mailbox: ${mailbox}`);
    setIsLoading(true);
    setCurrentLabelId(mailbox);
    
    // Réinitialiser l'affichage des brouillons pour tous les autres onglets
    setShowDraftsManager(false);
    
    try {
      const queryParams: { maxResults: number; labelIds: string[] } = { 
        maxResults: 25,
        labelIds: []
      };
      
      // Configurer les paramètres selon le type de dossier
      switch (mailbox) {
        case 'INBOX':
          // Boîte de réception : tous les messages reçus sauf spam et corbeille
          queryParams.labelIds = ['INBOX'];
          break;
          
        case 'SENT':
          // Envoyés : uniquement les messages envoyés
          queryParams.labelIds = ['SENT'];
          break;
          
        case 'DRAFT':
          // Brouillons : gestion spécialisée avec DraftsManager
          setShowDraftsManager(true);
          return; // Pas de chargement de messages standard
          
        case 'STARRED':
          // Favoris : messages avec étoile
          queryParams.labelIds = ['STARRED'];
          break;
          
        case 'TRASH':
          // Corbeille : messages supprimés
          queryParams.labelIds = ['TRASH'];
          break;
          
        case 'SPAM':
          // Spam : messages de spam
          queryParams.labelIds = ['SPAM'];
          break;
          
        default:
          // Dossiers personnalisés : utiliser l'ID du label
          queryParams.labelIds = [mailbox];
          break;
      }
      
      console.log(`[Gmail] 🔧 Paramètres pour ${mailbox}:`, queryParams);
      
      const result = await gmailServiceRef.current.getMessages(queryParams);
      
      if (result && Array.isArray(result.messages)) {
        setMessages(result.messages);
        setPageToken(result.nextPageToken || '');
        console.log(`[Gmail] ✅ ${result.messages.length} messages chargés pour ${mailbox}`);
      } else {
        setMessages([]);
        console.log(`[Gmail] ⚠️ Aucun message trouvé pour ${mailbox}`);
      }
    } catch (error) {
      console.error('Erreur chargement mailbox:', error);
      message.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 🔍 CORRECTION 1: AMÉLIORATION DE LA FONCTION DE RECHERCHE
  const handleSearch = useCallback(async (value: string) => {
    console.log('[Gmail] 🔍 RECHERCHE AMÉLIORÉE - Requête:', value);
    setSearchQuery(value);
    setIsLoading(true);
    
    try {
      let queryParams: any = {
        maxResults: 25,
      };

      if (value.trim()) {
        // Construire une requête de recherche Gmail optimisée
        let gmailQuery = value.trim();
        
        // Si c'est juste un mot, chercher dans from, to, subject, et body
        if (!value.includes(':') && !value.includes('@')) {
          gmailQuery = `(from:${value} OR to:${value} OR subject:${value} OR body:${value})`;
        }
        
        // Si c'est une adresse email, chercher spécifiquement
        if (value.includes('@')) {
          gmailQuery = `(from:${value} OR to:${value})`;
        }
        
        queryParams.q = gmailQuery;
        console.log('[Gmail] 🔍 Requête Gmail construite:', gmailQuery);
      } else {
        // Recherche vide = revenir à la boîte courante
        queryParams.labelIds = [currentLabelId];
      }
      
      const result = await gmailServiceRef.current.getMessages(queryParams);
      
      if (result && Array.isArray(result.messages)) {
        setMessages(result.messages);
        console.log(`[Gmail] 🔍 Recherche terminée: ${result.messages.length} résultats`);
        if (result.messages.length === 0) {
          message.info('Aucun email trouvé pour cette recherche');
        }
      } else {
        setMessages([]);
        message.info('Aucun résultat trouvé');
      }
    } catch (error) {
      console.error('[Gmail] ❌ Erreur recherche:', error);
      message.error('Erreur lors de la recherche');
    } finally {
      setIsLoading(false);
    }
  }, [currentLabelId]);

  // ... (continuer avec les autres fonctions existantes) ...

  // 📧 CORRECTION 2: IMPLÉMENTATION COMPLÈTE DU BOUTON RÉPONDRE
  const handleReplyToMessage = useCallback((messageData: FormattedGmailMessage) => {
    console.log('[Gmail] 📧 RÉPONSE AMÉLIORÉE - Message:', messageData.id);
    
    // Extraire l'adresse email de l'expéditeur
    let fromEmail = messageData.from;
    if (fromEmail.includes('<') && fromEmail.includes('>')) {
      // Format: "Nom <email@domain.com>" -> extraire juste l'email
      const match = fromEmail.match(/<([^>]+)>/);
      fromEmail = match ? match[1] : fromEmail;
    }
    
    // Construire l'objet de réponse
    let replySubject = messageData.subject || '';
    if (!replySubject.toLowerCase().startsWith('re:')) {
      replySubject = `Re: ${replySubject}`;
    }
    
    // Construire le corps de la réponse avec citation
    const originalDate = new Date(messageData.date).toLocaleString('fr-FR');
    const replyBody = `



--- Message original ---
De: ${messageData.from}
Date: ${originalDate}
Objet: ${messageData.subject}

${messageData.snippet || ''}`;

    // Pré-remplir le compositeur
    const prefilledData: Partial<CreateDraftData> = {
      to: fromEmail.trim(),
      subject: replySubject,
      body: replyBody
    };
    
    console.log('[Gmail] 📧 Données pré-remplies pour réponse:', prefilledData);
    setComposerPrefilledData(prefilledData);
    setComposeModalVisible(true);
    setMessageDetailDrawerVisible(false); // Fermer le drawer de détail
  }, []);

  // 📤 CORRECTION 3: IMPLÉMENTATION COMPLÈTE DU BOUTON TRANSFÉRER  
  const handleForwardMessage = useCallback((messageData: FormattedGmailMessage) => {
    console.log('[Gmail] 📤 TRANSFERT AMÉLIORÉ - Message:', messageData.id);
    
    // Construire l'objet de transfert
    let forwardSubject = messageData.subject || '';
    if (!forwardSubject.toLowerCase().startsWith('fwd:') && !forwardSubject.toLowerCase().startsWith('tr:')) {
      forwardSubject = `Fwd: ${forwardSubject}`;
    }
    
    // Construire le corps du transfert avec le message original complet
    const originalDate = new Date(messageData.date).toLocaleString('fr-FR');
    const forwardBody = `--- Message transféré ---

De: ${messageData.from}
Date: ${originalDate}
À: ${messageData.to || ''}
Objet: ${messageData.subject}

${messageData.snippet || messageData.body || ''}`;

    // Pré-remplir le compositeur (sans destinataire pour le transfert)
    const prefilledData: Partial<CreateDraftData> = {
      to: '', // Vide pour que l'utilisateur saisisse
      subject: forwardSubject,
      body: forwardBody
    };
    
    console.log('[Gmail] 📤 Données pré-remplies pour transfert:', prefilledData);
    setComposerPrefilledData(prefilledData);
    setComposeModalVisible(true);
    setMessageDetailDrawerVisible(false); // Fermer le drawer de détail
  }, []);

  // ... (garder toutes les autres fonctions existantes) ...

  // 🎨 CORRECTION 4: AMÉLIORATION DE LA MISE EN PAGE DES EMAILS
  const renderEmailContent = useCallback((selectedMessage: ExtendedGmailMessage) => {
    if (!selectedMessage.htmlBody && !selectedMessage.textBody && !selectedMessage.snippet) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#8c8c8c',
          backgroundColor: '#fafafa',
          borderRadius: '6px',
          border: '1px dashed #d9d9d9'
        }}>
          <Text type="secondary">Contenu de l'email non disponible</Text>
        </div>
      );
    }

    // Priorité: HTML > Text > Snippet
    if (selectedMessage.htmlBody) {
      return (
        <div style={{ 
          border: '1px solid #f0f0f0', 
          borderRadius: '6px',
          backgroundColor: '#fafafa',
          padding: '4px'
        }}>
          <iframe
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      line-height: 1.6; 
                      margin: 16px; 
                      color: #333;
                      background: white;
                    }
                    img { 
                      max-width: 100%; 
                      height: auto; 
                      border-radius: 4px;
                    }
                    a { 
                      color: #1890ff; 
                      text-decoration: none; 
                    }
                    a:hover { 
                      text-decoration: underline; 
                    }
                    table { 
                      border-collapse: collapse; 
                      width: 100%; 
                      margin: 12px 0;
                    }
                    td, th { 
                      padding: 8px 12px; 
                      border: 1px solid #e8e8e8; 
                      text-align: left;
                    }
                    th {
                      background-color: #fafafa;
                      font-weight: 600;
                    }
                    blockquote {
                      border-left: 4px solid #1890ff;
                      margin: 16px 0;
                      padding: 12px 16px;
                      background-color: #f6f8fa;
                      border-radius: 0 6px 6px 0;
                    }
                    pre {
                      background-color: #f6f8fa;
                      border-radius: 6px;
                      padding: 12px;
                      overflow-x: auto;
                      font-family: 'Monaco', 'Menlo', monospace;
                      font-size: 13px;
                    }
                    .email-signature {
                      border-top: 1px solid #e8e8e8;
                      margin-top: 20px;
                      padding-top: 12px;
                      color: #666;
                      font-size: 14px;
                    }
                  </style>
                </head>
                <body>
                  ${selectedMessage.htmlBody}
                </body>
              </html>
            `}
            style={{
              width: '100%',
              minHeight: '400px',
              maxHeight: '600px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
            sandbox="allow-same-origin allow-scripts"
            title="Contenu de l'email"
          />
        </div>
      );
    }

    // Fallback sur le texte ou snippet
    const content = selectedMessage.textBody || selectedMessage.snippet;
    return (
      <div style={{ 
        padding: '16px',
        backgroundColor: 'white',
        border: '1px solid #f0f0f0',
        borderRadius: '6px',
        lineHeight: '1.6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordWrap: 'break-word',
          margin: 0,
          fontFamily: 'inherit',
          fontSize: '14px'
        }}>
          {content}
        </pre>
      </div>
    );
  }, []);

  // ... (garder le reste du composant comme dans l'original) ...

  return (
    <Layout className="h-screen bg-white">
      <Sider 
        width={280} 
        className="bg-gray-50 border-r border-gray-200"
        style={{ 
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          overflow: 'auto'
        }}
      >
        {/* Header avec bouton compose */}
        <div className="p-4 border-b border-gray-200">
          <Button 
            type="primary" 
            size="large" 
            icon={<MailOutlined />}
            className="w-full mb-4"
            onClick={() => {
              // Réinitialiser les données pré-remplies pour un nouveau message
              setComposerPrefilledData(null);
              setComposeModalVisible(true);
            }}
          >
            Nouveau message
          </Button>
          
          {/* 🔍 BARRE DE RECHERCHE AMÉLIORÉE */}
          <Search
            placeholder="Rechercher dans Gmail..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            loading={isLoading}
            style={{ marginBottom: '16px' }}
          />
        </div>

        {/* Navigation */}
        <div className="px-2">
          {/* Labels système */}
          {[
            { id: 'INBOX', name: 'Boîte de réception', icon: <InboxOutlined /> },
            { id: 'SENT', name: 'Envoyés', icon: <SendOutlined /> },
            { id: 'DRAFT', name: 'Brouillons', icon: <FileOutlined /> },
            { id: 'STARRED', name: 'Favoris', icon: <StarOutlined /> },
            { id: 'TRASH', name: 'Corbeille', icon: <DeleteOutlined /> },
            { id: 'SPAM', name: 'Spam', icon: <ExclamationCircleOutlined /> },
          ].map(label => (
            <div
              key={label.id}
              className={`flex items-center px-3 py-2 my-1 rounded-lg cursor-pointer transition-colors ${
                currentLabelId === label.id 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => loadMailbox(label.id)}
            >
              <span className="mr-3">{label.icon}</span>
              <span className="flex-1">{label.name}</span>
            </div>
          ))}

          {/* Labels personnalisés */}
          {customLabels.length > 0 && (
            <>
              <Divider className="my-4" />
              <div className="px-3 py-2">
                <Text strong className="text-gray-600">Mes dossiers</Text>
              </div>
              {customLabels.map(label => (
                <div
                  key={label.key}
                  className={`flex items-center px-3 py-2 my-1 rounded-lg cursor-pointer transition-colors ${
                    currentLabelId === label.key 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => loadMailbox(label.key)}
                >
                  <FolderAddOutlined className="mr-3" />
                  <span className="flex-1">{label.label}</span>
                </div>
              ))}
            </>
          )}

          <Divider className="my-4" />
          
          {/* Bouton créer dossier */}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            className="w-full"
            onClick={() => setNewLabelModalVisible(true)}
          >
            Créer un dossier
          </Button>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 280 }}>
        <Content style={{ padding: '24px', background: '#fff' }}>
          {/* Affichage conditionnel : DraftsManager ou Liste des messages */}
          {showDraftsManager ? (
            <DraftsManager />
          ) : (
            <>
            {/* Barre d'actions pour emails sélectionnés */}
            {selectedMessagesForMove.length > 0 && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#f0f7ff', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span>{selectedMessagesForMove.length} email(s) sélectionné(s)</span>
                <Button 
                  size="small"
                  icon={<DeleteOutlined />}
                  title={currentLabelId === 'TRASH' ? "Supprimer définitivement" : "Supprimer"}
                  onClick={() => {
                    if (currentLabelId === 'TRASH') {
                      // Dans la corbeille : suppression définitive
                      // handlePermanentDelete(selectedMessagesForMove);
                    } else {
                      // Ailleurs : déplacer vers corbeille
                      // handleMoveToFolder(selectedMessagesForMove, 'TRASH');
                    }
                  }}
                />
                <Button 
                  size="small"
                  icon={<StarOutlined />}
                  title="Marquer comme favoris"
                  onClick={() => {
                    // handleMoveToFolder(selectedMessagesForMove, 'STARRED')
                  }}
                />
                <Button 
                  size="small"
                  icon={<CloseOutlined />}
                  title="Désélectionner tout"
                  onClick={() => setSelectedMessagesForMove([])}
                />
              </div>
            )}

            {/* Liste des messages */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" tip="Chargement des messages..." />
              </div>
            ) : messages.length === 0 ? (
              <Empty 
                description={authError ? "Erreur d'authentification Gmail" : "Aucun message à afficher"} 
                style={{ marginTop: '50px' }}
              />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={messages}
                renderItem={(item) => (
                  <List.Item
                    key={item.id}
                    onClick={() => {
                      // handleOpenMessage(item)
                    }}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      !item.isRead ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                    }`}
                    style={{ 
                      padding: '16px 20px',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Checkbox
                            checked={selectedMessagesForMove.includes(item.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              // handleToggleMessageSelection
                            }}
                          />
                          <Avatar style={{ backgroundColor: item.isRead ? '#f5f5f5' : '#1890ff' }}>
                            {item.from.charAt(0).toUpperCase()}
                          </Avatar>
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong={!item.isRead} style={{ fontSize: '14px' }}>
                            {item.from}
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {new Date(item.date).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                            <Button
                              type="text"
                              size="small"
                              icon={item.isStarred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                // handleToggleStar(item.id, item.isStarred || false)
                              }}
                            />
                          </div>
                        </div>
                      }
                      description={
                        <div>
                          <Text strong={!item.isRead} style={{ display: 'block', marginBottom: '4px' }}>
                            {item.subject || '(sans objet)'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '13px' }}>
                            {item.snippet}
                          </Text>
                          {item.hasAttachments && (
                            <div style={{ marginTop: '4px' }}>
                              <Tag icon={<PaperClipOutlined />} color="blue" size="small">
                                Pièces jointes
                              </Tag>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
            </>
          )}
        </Content>
      </Layout>

      {/* 📧 COMPOSITEUR D'EMAIL AVEC PRÉ-REMPLISSAGE AMÉLIORÉ */}
      <EmailComposer
        visible={composeModalVisible}
        onClose={() => {
          setComposeModalVisible(false);
          setComposerPrefilledData(null); // Nettoyer les données pré-remplies
        }}
        onSent={() => {
          setComposeModalVisible(false);
          setComposerPrefilledData(null);
          // Recharger la mailbox actuelle pour voir les nouveaux emails envoyés
          loadMailbox(currentLabelId);
        }}
        editingDraft={composerPrefilledData as DraftData}
      />

      {/* Drawer de détail du message avec MISE EN PAGE AMÉLIORÉE */}
      <Drawer
        title="Détail du message"
        placement="right"
        width="calc(100vw - 530px)"
        open={messageDetailDrawerVisible}
        onClose={() => setMessageDetailDrawerVisible(false)}
        extra={
          selectedMessage && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                icon={<SendOutlined />} 
                onClick={() => handleReplyToMessage(selectedMessage)}
              >
                Répondre
              </Button>
              <Button 
                onClick={() => handleForwardMessage(selectedMessage)}
              >
                Transférer
              </Button>
              <Button
                icon={selectedMessage.isStarred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                onClick={() => {
                  // handleToggleStar(selectedMessage.id, selectedMessage.isStarred || false)
                }}
              />
              <Button
                icon={<DeleteOutlined />}
                onClick={() => {
                  // handleDeleteMessage(selectedMessage.id)
                }}
                danger
              />
            </div>
          )
        }
      >
        {selectedMessage && (
          <div>
            <div style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
              <Title level={4}>{selectedMessage.subject}</Title>
              <Text><strong>De :</strong> {selectedMessage.from}</Text><br />
              <Text><strong>À :</strong> {selectedMessage.to}</Text><br />
              <Text type="secondary">{new Date(selectedMessage.date).toLocaleString()}</Text>
            </div>
            
            {/* 🎨 CONTENU EMAIL AVEC MISE EN PAGE AMÉLIORÉE */}
            <div style={{ marginTop: '16px' }}>
              {renderEmailContent(selectedMessage)}
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal de création de dossier */}
      <Modal
        title="Créer un nouveau dossier"
        open={newLabelModalVisible}
        onCancel={() => {
          setNewLabelModalVisible(false);
          setNewLabelName('');
        }}
        onOk={async () => {
          if (!newLabelName.trim()) {
            message.error('Veuillez saisir un nom de dossier');
            return;
          }
          
          setCreatingLabel(true);
          try {
            // await gmailServiceRef.current.createLabel(newLabelName.trim());
            message.success('Dossier créé avec succès');
            setNewLabelModalVisible(false);
            setNewLabelName('');
            // loadCustomLabels(); // Recharger la liste
          } catch (error) {
            console.error('Erreur création dossier:', error);
            message.error('Erreur lors de la création du dossier');
          } finally {
            setCreatingLabel(false);
          }
        }}
        confirmLoading={creatingLabel}
      >
        <Input
          placeholder="Nom du dossier"
          value={newLabelName}
          onChange={(e) => setNewLabelName(e.target.value)}
          onPressEnter={() => {
            // Trigger OK button
          }}
        />
      </Modal>

      <BackTop />
    </Layout>
  );
};

export default GoogleMailPageFixed;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Layout, 
  Button, 
  List, 
  Card, 
  Typography, 
  Input, 
  Modal, 
  Form, 
  message, 
  Drawer,
  Collapse,
  Upload,
  Checkbox,
  Select,
  Dropdown,
  Menu,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  StarOutlined, 
  StarFilled, 
  DeleteOutlined, 
  SendOutlined,
  UploadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FolderOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  SelectOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useGmailService } from '../hooks/useGmailService';
import { FormattedGmailMessage, GmailMessage } from '../types/gmail';
import { EmailComposer } from '../components/EmailComposer';
import { DraftsManager } from '../components/DraftsManager';
import '../mail/components/EmailReader.css';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

// Extension locale pour ajouter le toggle d'affichage HTML
interface ExtendedGmailMessage extends FormattedGmailMessage {
  showRawHtml?: boolean;
}

const GoogleMailPageClean: React.FC = () => {
  // États de base
  const [messages, setMessages] = useState<FormattedGmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedGmailMessage | null>(null);
  const [currentLabelId, setCurrentLabelId] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, setPageToken] = useState<string>('');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [messageDetailDrawerVisible, setMessageDetailDrawerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false);
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const [deleteFolderModalVisible, setDeleteFolderModalVisible] = useState(false);
  const [selectedFolderForEdit, setSelectedFolderForEdit] = useState<{key: string, label: string} | null>(null);
  const [customLabels, setCustomLabels] = useState<Array<{key: string, label: string}>>([]);
  const [selectedMessagesForMove, setSelectedMessagesForMove] = useState<string[]>([]);
  
  // États pour l'aperçu des pièces jointes intégré
  const [previewAttachment, setPreviewAttachment] = useState<{
    filename: string;
    mimeType: string;
    data: string;
    attachmentId: string;
    objectUrl?: string; // Pour les PDF et autres fichiers binaires
    viewerUrl?: string; // Pour les viewers externes
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // État pour le modal de confirmation de vidage de corbeille
  const [confirmEmptyTrashVisible, setConfirmEmptyTrashVisible] = useState(false);
  
  // État pour l'affichage du gestionnaire de brouillons
  const [showDraftsManager, setShowDraftsManager] = useState(false);

  // États pour les données pré-remplies du compositeur
  const [prefilledEmailData, setPrefilledEmailData] = useState<{
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
  } | null>(null);

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
            const userLabels = labelsArray.filter((label: { id: string; name: string; type: string }) => 
              label.type === 'user' && label.name && !label.name.startsWith('CATEGORY_')
            );
            
            const formattedLabels = userLabels.map((label: { id: string; name: string; type: string }) => ({
              key: label.id,
              label: label.name
            }));
            
            setCustomLabels(formattedLabels);
            console.log('[Gmail] 📂 Labels personnalisés chargés:', formattedLabels);
          }
        } catch (labelError) {
          console.error('Erreur chargement labels:', labelError);
        }
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

  const handleSearch = useCallback(async (value: string) => {
    console.log('[Gmail] 🔍 RECHERCHE AMÉLIORÉE - Requête:', value);
    setSearchQuery(value);
    setIsLoading(true);
    
    try {
      const queryParams: { maxResults: number; q?: string; labelIds?: string[] } = {
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
    if (currentLabelId === 'TRASH') {
      // Dans la corbeille : suppression définitive
      console.log('[Gmail] 🔥 Suppression définitive:', messageId);
      
      try {
        await gmailServiceRef.current.deleteMessage(messageId);
        console.log('[Gmail] 🔥 Message supprimé définitivement de la corbeille');
        
        // Recharger les messages pour refléter le changement
        await loadMailbox(currentLabelId);
        message.success('Message supprimé définitivement de la corbeille');
      } catch (error) {
        console.error('[Gmail] ❌ Erreur suppression définitive:', error);
        message.error('Erreur lors de la suppression définitive');
      }
    } else {
      // Ailleurs : déplacer vers corbeille
      console.log('[Gmail] 🗑️ Déplacement vers corbeille:', messageId);
      
      try {
        await gmailServiceRef.current.trashMessage(messageId);
        console.log('[Gmail] 🗑️ Message déplacé vers la corbeille avec succès');
        
        // Recharger les messages pour refléter le changement
        await loadMailbox(currentLabelId);
        message.success('Message déplacé vers la corbeille');
      } catch (error) {
        console.error('[Gmail] ❌ Erreur suppression:', error);
        message.error('Erreur lors de la suppression');
      }
    }
  }, [currentLabelId, loadMailbox]);

  // 🆕 NOUVELLE FONCTION: Suppression définitive des emails (pour la corbeille)
  const handlePermanentDelete = useCallback(async (messageIds: string[]) => {
    console.log('[Gmail] 🔥 Suppression définitive de:', messageIds);
    
    try {
      for (const messageId of messageIds) {
        await gmailServiceRef.current.deleteMessage(messageId);
      }
      
      message.success(`${messageIds.length} message(s) supprimé(s) définitivement de la corbeille`);
      setSelectedMessagesForMove([]);
      await loadMailbox(currentLabelId); // Recharger la corbeille
    } catch (error) {
      console.error('[Gmail] ❌ Erreur suppression définitive:', error);
      message.error('Erreur lors de la suppression définitive');
    }
  }, [currentLabelId, loadMailbox]);

  // 🆕 NOUVELLE FONCTION: Vider complètement la corbeille
  const handleEmptyTrash = useCallback(async () => {
    console.log('[Gmail] 🔥🔥🔥 DEBUT handleEmptyTrash - Vidage complet de la corbeille');
    console.log('[Gmail] 📊 État du service:', gmailServiceRef.current ? 'OK' : 'PAS INITIALISÉ');
    
    try {
      console.log('[Gmail] 📡 Appel de gmailServiceRef.current.emptyTrash()...');
      await gmailServiceRef.current.emptyTrash();
      
      console.log('[Gmail] ✅ emptyTrash() terminé avec succès');
      message.success('Corbeille vidée avec succès - tous les emails ont été supprimés définitivement');
      setSelectedMessagesForMove([]);
      
      console.log('[Gmail] 🔄 Rechargement de la mailbox...');
      await loadMailbox(currentLabelId); // Recharger la corbeille (qui sera vide)
      console.log('[Gmail] ✅ Rechargement terminé');
    } catch (error) {
      console.error('[Gmail] ❌❌❌ ERREUR vidage corbeille:', error);
      message.error('Erreur lors du vidage de la corbeille');
    }
  }, [currentLabelId, loadMailbox]);

  const handleReplyToMessage = useCallback(async (messageData: FormattedGmailMessage) => {
    console.log('[Gmail] 📧 RÉPONSE AMÉLIORÉE - Message:', messageData.id);
    
    try {
      // Récupérer le message complet pour avoir tous les détails
      const fullMessage = await gmailServiceRef.current.getMessage(messageData.id, 'full');
      
      // Extraire l'adresse email de l'expéditeur
      let fromEmail = fullMessage?.from || messageData.from;
      if (fromEmail.includes('<') && fromEmail.includes('>')) {
        // Format: "Nom <email@domain.com>" -> extraire juste l'email
        const match = fromEmail.match(/<([^>]+)>/);
        fromEmail = match ? match[1] : fromEmail;
      }
      
      // Construire l'objet de réponse
      let replySubject = fullMessage?.subject || messageData.subject || '';
      if (!replySubject.toLowerCase().startsWith('re:')) {
        replySubject = `Re: ${replySubject}`;
      }
      
      // Construire le corps de la réponse avec citation
      const originalDate = new Date(fullMessage?.date || messageData.date).toLocaleString('fr-FR');
      const originalHtmlContent = fullMessage?.htmlBody || '';
      const originalTextContent = fullMessage?.textBody || messageData.snippet || '';
      
      // NOUVEAU: Pas de code HTML généré - on envoie juste le contenu original
      // L'EmailComposer va automatiquement séparer zone libre + message original
      const replyBody = originalHtmlContent || originalTextContent;

      // Préparer les données pré-remplies
      const prefilledData = {
        to: fromEmail.trim(),
        subject: replySubject,
        body: replyBody,
        cc: '',
        bcc: ''
      };
      
      console.log('[Gmail] 📧 Données pré-remplies pour réponse:', prefilledData);
      setPrefilledEmailData(prefilledData);
      setComposeModalVisible(true);
      
    } catch (error) {
      console.error('[Gmail] ❌ Erreur lors de la préparation de la réponse:', error);
      message.error('Erreur lors de la préparation de la réponse');
    }
  }, []);

  const handleReplyToAllMessage = useCallback(async (messageData: FormattedGmailMessage) => {
    console.log('[Gmail] 📧 RÉPONSE À TOUS AMÉLIORÉE - Message:', messageData.id);
    
    try {
      // Récupérer le message complet pour avoir tous les détails
      const fullMessage = await gmailServiceRef.current.getMessage(messageData.id, 'full');
      
      // Extraire l'adresse email de l'expéditeur
      let fromEmail = fullMessage?.from || messageData.from;
      if (fromEmail.includes('<') && fromEmail.includes('>')) {
        const match = fromEmail.match(/<([^>]+)>/);
        fromEmail = match ? match[1] : fromEmail;
      }
      
      // Extraire les adresses CC et BCC du message original
      let originalCc = '';
      let originalTo = fullMessage?.to || messageData.to || '';
      
      // Parser les adresses CC si elles existent
      if (fullMessage?.cc) {
        originalCc = fullMessage.cc;
      }
      
      // Pour "Répondre à tous", inclure tous les destinataires originaux sauf nous
      const currentUserEmail = 'jonathan.dethier@2thier.be'; // TODO: récupérer dynamiquement
      
      // Nettoyer et filtrer les adresses
      const cleanEmail = (email: string) => {
        if (email.includes('<') && email.includes('>')) {
          const match = email.match(/<([^>]+)>/);
          return match ? match[1].trim() : email.trim();
        }
        return email.trim();
      };
      
      // Construire la liste des destinataires (TO + CC) sans l'expéditeur actuel
      const allRecipients = [
        ...originalTo.split(',').map(cleanEmail),
        ...originalCc.split(',').map(cleanEmail).filter(Boolean)
      ].filter(email => email && email !== currentUserEmail && email !== fromEmail);
      
      // Construire l'objet de réponse
      let replySubject = fullMessage?.subject || messageData.subject || '';
      if (!replySubject.toLowerCase().startsWith('re:')) {
        replySubject = `Re: ${replySubject}`;
      }
      
      // Construire le corps de la réponse avec citation
      const originalDate = new Date(fullMessage?.date || messageData.date).toLocaleString('fr-FR');
      const originalHtmlContent = fullMessage?.htmlBody || '';
      const originalTextContent = fullMessage?.textBody || messageData.snippet || '';
      
      // NOUVEAU: Pas de code HTML généré - on envoie juste le contenu original
      const replyBody = originalHtmlContent || originalTextContent;

      // Préparer les données pré-remplies
      const prefilledData = {
        to: fromEmail.trim(),
        cc: allRecipients.join(', '),
        subject: replySubject,
        body: replyBody,
        bcc: ''
      };
      
      console.log('[Gmail] 📧 Données pré-remplies pour réponse à tous:', prefilledData);
      setPrefilledEmailData(prefilledData);
      setComposeModalVisible(true);
      
    } catch (error) {
      console.error('[Gmail] ❌ Erreur lors de la préparation de la réponse à tous:', error);
      message.error('Erreur lors de la préparation de la réponse à tous');
    }
  }, []);

  const handleForwardMessage = useCallback(async (messageData: FormattedGmailMessage) => {
    console.log('[Gmail] 📤 TRANSFERT AMÉLIORÉ - Message:', messageData.id);
    
    try {
      // Récupérer le message complet pour avoir tous les détails
      const fullMessage = await gmailServiceRef.current.getMessage(messageData.id, 'full');
      
      // Construire l'objet de transfert
      let forwardSubject = fullMessage?.subject || messageData.subject || '';
      if (!forwardSubject.toLowerCase().startsWith('fwd:') && !forwardSubject.toLowerCase().startsWith('tr:')) {
        forwardSubject = `Fwd: ${forwardSubject}`;
      }
      
      // Construire le corps du transfert avec le message original complet
      const originalHtmlContent = fullMessage?.htmlBody || '';
      const originalTextContent = fullMessage?.textBody || messageData.snippet || '';
      
      // NOUVEAU: Pas de code HTML généré - on envoie juste le contenu original
      const forwardBody = originalHtmlContent || originalTextContent;

      // Préparer les données pré-remplies
      const prefilledData = {
        to: '', // Vide pour que l'utilisateur saisisse
        subject: forwardSubject,
        body: forwardBody,
        cc: '',
        bcc: ''
      };
      
      console.log('[Gmail] 📤 Données pré-remplies pour transfert:', prefilledData);
      setPrefilledEmailData(prefilledData);
      setComposeModalVisible(true);
      
    } catch (error) {
      console.error('[Gmail] ❌ Erreur lors de la préparation du transfert:', error);
      message.error('Erreur lors de la préparation du transfert');
    }
  }, []);

  // Fonction pour réinitialiser les données pré-remplies
  const handleCloseComposer = useCallback(() => {
    setComposeModalVisible(false);
    setPrefilledEmailData(null); // Nettoyer les données pré-remplies
  }, []);

  const loadCustomLabels = useCallback(async () => {
    try {
      console.log('[Gmail] 🔄 Rechargement des labels personnalisés...');
      const labelsResponse = await gmailServiceRef.current.getLabels();
      console.log('[Gmail] 📋 Réponse labels complète:', labelsResponse);
      
      // Vérifier si la réponse contient une propriété 'labels'
      const labelsArray = labelsResponse?.labels || labelsResponse;
      
      if (labelsArray && Array.isArray(labelsArray)) {
        console.log('[Gmail] 📋 Nombre total de labels:', labelsArray.length);
        
        // Filtrer les labels personnalisés (pas les labels système Gmail)
        const userLabels = labelsArray.filter((label: { id: string; name: string; type: string }) => {
          console.log('[Gmail] 🏷️ Traitement label:', label.id, label.name, 'Type:', label.type);
          return label.type === 'user' && label.name && !label.name.startsWith('CATEGORY_');
        });
        
        console.log('[Gmail] 👤 Labels utilisateur filtrés:', userLabels);
        
        const formattedLabels = userLabels.map((label: { id: string; name: string; type: string }) => ({
          key: label.id,
          label: label.name
        }));
        
        console.log('[Gmail] 📂 Labels formatés pour sidebar:', formattedLabels);
        setCustomLabels(formattedLabels);
        console.log('[Gmail] ✅ Labels personnalisés chargés:', formattedLabels);
      } else {
        console.log('[Gmail] ❌ Réponse labels invalide:', labelsResponse);
        console.log('[Gmail] 🔍 Type de réponse:', typeof labelsResponse);
        console.log('[Gmail] 🔍 Propriétés disponibles:', Object.keys(labelsResponse || {}));
      }
    } catch (error) {
      console.error('Erreur chargement labels:', error);
    }
  }, []);

  const handleCreateFolder = useCallback(async (folderName: string) => {
    try {
      console.log('[Gmail] 📁 Création du dossier:', folderName);
      const result = await gmailServiceRef.current.createLabel(folderName);
      
      if (result) {
        message.success(`Dossier "${folderName}" créé avec succès`);
        setCreateFolderModalVisible(false);
        console.log('[Gmail] ✅ Label créé:', result);
        
        // Attendre un peu avant de recharger les labels (délai de propagation)
        console.log('[Gmail] ⏱️ Attente avant rechargement des labels...');
        setTimeout(async () => {
          await loadCustomLabels();
          console.log('[Gmail] 🔄 Labels rechargés après création');
        }, 500);
      } else {
        message.error('Erreur lors de la création du dossier');
      }
    } catch (error: unknown) {
      console.error('Erreur création dossier:', error);
      
      // Gestion spécifique des erreurs Gmail
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Label name exists or conflicts') || 
          errorMessage.includes('exists') ||
          errorMessage.includes('conflicts')) {
        message.error(`Le dossier "${folderName}" existe déjà. Choisissez un autre nom.`);
      } else if (errorMessage.includes('Invalid label name')) {
        message.error(`Nom de dossier invalide. Évitez les caractères spéciaux et les noms réservés.`);
      } else {
        message.error(`Erreur lors de la création du dossier : ${errorMessage || 'Erreur inconnue'}`);
      }
    }
  }, [loadCustomLabels]);

  const handleEditFolder = useCallback(async (newFolderName: string) => {
    if (!selectedFolderForEdit) return;
    
    try {
      console.log('[Gmail] ✏️ Modification du dossier:', selectedFolderForEdit.key, '->', newFolderName);
      const result = await gmailServiceRef.current.updateLabel(selectedFolderForEdit.key, newFolderName);
      
      if (result) {
        message.success(`Dossier renommé en "${newFolderName}" avec succès`);
        setEditFolderModalVisible(false);
        setSelectedFolderForEdit(null);
        console.log('[Gmail] ✅ Label modifié:', result);
        
        // Recharger les labels personnalisés
        await loadCustomLabels();
      } else {
        message.error('Erreur lors de la modification du dossier');
      }
    } catch (error) {
      console.error('Erreur modification dossier:', error);
      message.error('Erreur lors de la modification du dossier');
    }
  }, [selectedFolderForEdit, loadCustomLabels]);

  const handleDeleteFolder = useCallback(async () => {
    if (!selectedFolderForEdit) return;
    
    try {
      console.log('[Gmail] 🗑️ Suppression du dossier:', selectedFolderForEdit.key);
      const result = await gmailServiceRef.current.deleteLabel(selectedFolderForEdit.key);
      
      if (result) {
        message.success(`Dossier "${selectedFolderForEdit.label}" supprimé avec succès`);
        setDeleteFolderModalVisible(false);
        setSelectedFolderForEdit(null);
        console.log('[Gmail] ✅ Label supprimé');
        
        // Recharger immédiatement les labels personnalisés - forcer le rechargement
        setTimeout(() => {
          loadCustomLabels();
        }, 100);
      } else {
        message.error('Erreur lors de la suppression du dossier');
      }
    } catch (error) {
      console.error('Erreur suppression dossier:', error);
      message.error('Erreur lors de la suppression du dossier');
    }
  }, [selectedFolderForEdit, loadCustomLabels]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadMailbox(currentLabelId),
        loadCustomLabels()
      ]);
      message.success('Données actualisées');
    } catch (error) {
      console.error('Erreur lors de l\'actualisation:', error);
      message.error('Erreur lors de l\'actualisation');
    } finally {
      setIsLoading(false);
    }
  }, [currentLabelId, loadMailbox, loadCustomLabels]);

  const handleMarkAsRead = useCallback(async (messageId: string) => {
    try {
      await gmailServiceRef.current.removeLabel(messageId, 'UNREAD');
      // Mettre à jour l'état local
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ));
    } catch (error) {
      console.error('Erreur marquage comme lu:', error);
    }
  }, []);

  const handleOpenMessage = useCallback(async (msg: FormattedGmailMessage) => {
    try {
      // Récupérer le message détaillé avec contenu HTML
      const detailedMessage = await gmailServiceRef.current.getMessage(msg.id, 'full');
      if (detailedMessage) {
        setSelectedMessage({ ...detailedMessage, showRawHtml: true });
      } else {
        // Fallback sur le message de base si pas de détails
        setSelectedMessage({ ...msg, showRawHtml: true });
      }
      setMessageDetailDrawerVisible(true);
      
      // Si le message n'est pas lu, le marquer comme lu
      if (!msg.isRead) {
        await handleMarkAsRead(msg.id);
      }
    } catch (error) {
      console.error('Erreur récupération message détaillé:', error);
      // Fallback sur le message de base en cas d'erreur
      setSelectedMessage({ ...msg, showRawHtml: true });
      setMessageDetailDrawerVisible(true);
    }
  }, [handleMarkAsRead]);

  const handleMoveToFolder = useCallback(async (messageIds: string[], labelId: string) => {
    try {
      console.log('[Gmail] 🏷️ Ajout du label aux messages:', labelId);
      
      // Ajouter le label à chaque message SANS retirer INBOX (système de doublons)
      for (const messageId of messageIds) {
        if (labelId === 'TRASH') {
          // Pour la corbeille, utiliser l'API trash (seule exception - vraiment déplacer)
          await gmailServiceRef.current.trashMessage(messageId);
        } else if (labelId === 'STARRED') {
          // Pour les favoris, ajouter le label STARRED (GARDER dans inbox)
          await gmailServiceRef.current.addLabel(messageId, 'STARRED');
        } else {
          // Pour les autres dossiers, ajouter le label approprié (GARDER dans inbox)
          await gmailServiceRef.current.addLabel(messageId, labelId);
          // 🔥 NOUVEAU: Ne plus retirer INBOX - système de labels multiples
          // Ancienne logique supprimée : if (currentLabelId === 'INBOX' && labelId !== 'INBOX')
        }
      }
      
      const folderNames: { [key: string]: string } = {
        'INBOX': 'Boîte de réception',
        'SENT': 'Envoyés',
        'DRAFT': 'Brouillons',
        'STARRED': 'Favoris',
        'TRASH': 'Corbeille',
        'SPAM': 'Spam'
      };
      
      const folderName = folderNames[labelId] || customLabels.find(l => l.key === labelId)?.label || labelId;
      const actionText = labelId === 'TRASH' ? 'déplacé(s) vers' : 'ajouté(s) à';
      message.success(`${messageIds.length} message(s) ${actionText} ${folderName}`);
      
      setSelectedMessagesForMove([]);
      await loadMailbox(currentLabelId); // Recharger la vue actuelle
    } catch (error) {
      console.error('Erreur ajout label:', error);
      message.error('Erreur lors de l\'ajout du label');
    }
  }, [currentLabelId, loadMailbox, customLabels]);

  // Fonction pour sélectionner tous les messages visibles
  const handleSelectAll = useCallback(() => {
    const allMessageIds = messages.map(msg => msg.id);
    setSelectedMessagesForMove(allMessageIds);
    message.success(`${allMessageIds.length} message(s) sélectionné(s)`);
  }, [messages]);

  // 🔥 NOUVEAU: Fonction pour retirer un email du spam (marquer comme "pas spam")
  const handleRemoveFromSpam = useCallback(async (messageIds: string[]) => {
    try {
      console.log('[Gmail] 🛡️ Retirer du spam:', messageIds);
      
      for (const messageId of messageIds) {
        // Retirer le label SPAM et ajouter INBOX
        await gmailServiceRef.current.removeLabel(messageId, 'SPAM');
        await gmailServiceRef.current.addLabel(messageId, 'INBOX');
      }
      
      message.success(`${messageIds.length} message(s) marqué(s) comme non-spam et remis en boîte de réception`);
      setSelectedMessagesForMove([]);
      await loadMailbox(currentLabelId);
    } catch (error) {
      console.error('Erreur retrait spam:', error);
      message.error('Erreur lors du retrait du spam');
    }
  }, [currentLabelId, loadMailbox]);

  // 🔥 NOUVEAU: Compter les nouveaux spams (pour notification)
  const [spamCount, setSpamCount] = useState(0);
  
  const checkSpamCount = useCallback(async () => {
    try {
      const spamResult = await gmailServiceRef.current.getMessages({ labelIds: ['SPAM'], maxResults: 50 });
      const spamMessages = spamResult?.messages || [];
      const unreadSpamCount = spamMessages.filter(msg => !msg.isRead).length;
      setSpamCount(unreadSpamCount);
    } catch (error) {
      console.error('Erreur comptage spam:', error);
    }
  }, []);

  // Vérifier les spams au chargement et périodiquement
  useEffect(() => {
    if (messages.length > 0) {
      checkSpamCount();
      // Vérifier les spams toutes les 2 minutes
      const interval = setInterval(checkSpamCount, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [messages.length, checkSpamCount]);

  // Types de fichiers supportés pour l'aperçu
  const getFilePreviewType = useCallback((filename: string, mimeType: string) => {
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    
    // PDF
    if (mimeType === 'application/pdf' || fileExtension === 'pdf') {
      return 'pdf';
    }
    
    // Images
    if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension)) {
      return 'image';
    }
    
    // Fichiers texte
    if (mimeType.startsWith('text/') || ['txt', 'json', 'xml', 'csv', 'log', 'md', 'js', 'ts', 'html', 'css'].includes(fileExtension)) {
      return 'text';
    }
    
    // Fichiers Office
    if (
      ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(fileExtension) ||
      [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation'
      ].includes(mimeType)
    ) {
      return 'office';
    }
    
    // Vidéo
    if (mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(fileExtension)) {
      return 'video';
    }
    
    // Audio
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(fileExtension)) {
      return 'audio';
    }
    
    return 'unsupported';
  }, []);

  // Fonction universelle pour prévisualiser une pièce jointe
  const handlePreviewAttachment = useCallback(async (
    messageId: string, 
    attachmentId: string, 
    filename: string, 
    mimeType: string
  ) => {
    try {
      setPreviewLoading(true);
      console.log('[Gmail] 👁️ Aperçu pièce jointe:', filename, 'Type:', mimeType);
      
      const previewType = getFilePreviewType(filename, mimeType);
      const baseUrl = `${window.location.origin}/api/gmail/messages/${messageId}/attachments/${attachmentId}`;
      
      console.log('[Gmail] 🔍 Type d\'aperçu détecté:', previewType);
      
      switch (previewType) {
        case 'pdf': {
          // PDF - Utiliser iframe direct avec URL de preview
          const pdfUrl = `${baseUrl}?preview=true`;
          console.log('[Gmail] 📄 URL PDF pour iframe:', pdfUrl);
          setPreviewAttachment({
            filename,
            mimeType,
            data: pdfUrl,
            attachmentId,
            objectUrl: '',
            viewerUrl: ''
          });
          break;
        }

        case 'image': {
          // Images - Utiliser blob en data URL pour éviter problèmes CORS
          try {
            const response = await gmailServiceRef.current.getAttachment(messageId, attachmentId);
            if (response && response.data) {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                setPreviewAttachment({
                  filename,
                  mimeType,
                  data: dataUrl,
                  attachmentId,
                  objectUrl: '',
                  viewerUrl: ''
                });
              };
              reader.readAsDataURL(response.data);
            }
          } catch {
            // Fallback: utiliser URL directe si blob échoue
            const imageUrl = `${baseUrl}?preview=true`;
            setPreviewAttachment({
              filename,
              mimeType,
              data: imageUrl,
              attachmentId,
              objectUrl: '',
              viewerUrl: ''
            });
          }
          break;
        }

        case 'office': {
          // Fichiers Office - Google Docs Viewer
          const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(baseUrl)}&embedded=true`;
          console.log('[Gmail] 📊 URL Office Viewer:', viewerUrl);
          setPreviewAttachment({
            filename,
            mimeType,
            data: '',
            attachmentId,
            objectUrl: '',
            viewerUrl
          });
          break;
        }

        case 'text': {
          // Fichiers texte - Récupérer et afficher le contenu
          try {
            const response = await gmailServiceRef.current.getAttachment(messageId, attachmentId);
            if (response && response.data) {
              const reader = new FileReader();
              reader.onload = () => {
                const textContent = reader.result as string;
                setPreviewAttachment({
                  filename,
                  mimeType,
                  data: textContent,
                  attachmentId,
                  objectUrl: '',
                  viewerUrl: ''
                });
              };
              reader.readAsText(response.data);
            }
          } catch (error) {
            console.error('Erreur lecture fichier texte:', error);
            throw error;
          }
          break;
        }

        case 'video': {
          // Vidéo - Utiliser élément video HTML5
          const videoUrl = `${baseUrl}?preview=true`;
          setPreviewAttachment({
            filename,
            mimeType,
            data: videoUrl,
            attachmentId,
            objectUrl: '',
            viewerUrl: ''
          });
          break;
        }

        case 'audio': {
          // Audio - Utiliser élément audio HTML5
          const audioUrl = `${baseUrl}?preview=true`;
          setPreviewAttachment({
            filename,
            mimeType,
            data: audioUrl,
            attachmentId,
            objectUrl: '',
            viewerUrl: ''
          });
          break;
        }

        default: {
          // Type non supporté - Afficher message informatif
          setPreviewAttachment({
            filename,
            mimeType,
            data: '',
            attachmentId,
            objectUrl: '',
            viewerUrl: ''
          });
          break;
        }
      }
      
    } catch (error) {
      console.error('Erreur aperçu pièce jointe:', error);
      message.error('Impossible d\'afficher l\'aperçu');
    } finally {
      setPreviewLoading(false);
    }
  }, [getFilePreviewType]);

  const sidebarItems = [
    { key: 'system-folders', label: 'Dossiers système', icon: null },
    { key: 'INBOX', label: 'Boîte de réception', icon: null },
    { key: 'SENT', label: 'Envoyés', icon: null },
    { key: 'DRAFT', label: 'Brouillons', icon: null },
    { key: 'STARRED', label: 'Favoris', icon: null },
    { key: 'TRASH', label: 'Corbeille', icon: null },
    { key: 'SPAM', label: 'Spam', icon: null },
    ...(customLabels.length > 0 ? [
      { key: 'custom-folders', label: 'Dossiers personnalisés', icon: null },
      ...customLabels.map(label => ({ 
        key: label.key, 
        label: label.label, 
        icon: null 
      }))
    ] : []),
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
            icon={<ReloadOutlined />} 
            block 
            style={{ marginBottom: '8px' }}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Actualiser
          </Button>
          
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </div>

          <List
            size="small"
            dataSource={sidebarItems}
            renderItem={(item) => {
              if (item.key === 'system-folders' || item.key === 'custom-folders') {
                return (
                  <List.Item style={{ padding: '4px 0', fontWeight: 'bold', color: '#666' }}>
                    {item.label}
                  </List.Item>
                );
              }

              if (item.key === 'create-folder') {
                return (
                  <List.Item style={{ padding: '8px 0', cursor: 'pointer', color: '#1890ff' }}>
                    <Button 
                      type="link" 
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => setCreateFolderModalVisible(true)}
                    >
                      {item.label}
                    </Button>
                  </List.Item>
                );
              }

              // Vérifier si c'est un dossier personnalisé
              const isCustomFolder = customLabels.some(label => label.key === item.key);

              return (
                <List.Item
                  style={{ 
                    padding: '8px 12px', 
                    cursor: 'pointer',
                    background: currentLabelId === item.key ? '#f0f7ff' : 'transparent',
                    borderRadius: '4px',
                    margin: '2px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span 
                    onClick={() => loadMailbox(item.key)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {/* 🔥 NOUVEAU: Badge de notification pour le spam */}
                    {item.key === 'SPAM' && spamCount > 0 ? (
                      <Badge count={spamCount} size="small">
                        <span>{item.label}</span>
                      </Badge>
                    ) : (
                      item.label
                    )}
                  </span>
                  {isCustomFolder && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button 
                        type="text" 
                        size="small"
                        icon={<EditOutlined />}
                        style={{ padding: '0 4px', minWidth: 'auto' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const folder = customLabels.find(label => label.key === item.key);
                          if (folder) {
                            setSelectedFolderForEdit(folder);
                            setEditFolderModalVisible(true);
                          }
                        }}
                      />
                      <Button 
                        type="text" 
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{ padding: '0 4px', minWidth: 'auto', color: '#ff4d4f' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const folder = customLabels.find(label => label.key === item.key);
                          if (folder) {
                            setSelectedFolderForEdit(folder);
                            setDeleteFolderModalVisible(true);
                          }
                        }}
                      />
                    </div>
                  )}
                </List.Item>
              );
            }}
          />
        </div>
      </Sider>

      <Layout>
        <Content style={{ padding: '24px', background: '#fff' }}>
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
                    handlePermanentDelete(selectedMessagesForMove);
                  } else {
                    // Ailleurs : déplacer vers corbeille
                    handleMoveToFolder(selectedMessagesForMove, 'TRASH');
                  }
                }}
              />
              <Button 
                size="small"
                icon={<StarOutlined />}
                title="Marquer comme favoris"
                onClick={() => handleMoveToFolder(selectedMessagesForMove, 'STARRED')}
              />
              {/* 🔥 NOUVEAU: Bouton "Pas spam" visible seulement dans le dossier SPAM */}
              {currentLabelId === 'SPAM' && (
                <Button 
                  size="small"
                  icon={<CheckOutlined />}
                  title="Marquer comme non-spam et remettre en boîte de réception"
                  onClick={() => handleRemoveFromSpam(selectedMessagesForMove)}
                  style={{ color: '#52c41a' }}
                >
                  Pas spam
                </Button>
              )}
              <Button 
                size="small"
                icon={<CloseOutlined />}
                title="Désélectionner tout"
                onClick={() => setSelectedMessagesForMove([])}
              />
            </div>
          )}
          
          {/* 🆕 NOUVEAU: Bouton "Vider la corbeille" - visible uniquement dans la corbeille quand il y a des emails */}
          {currentLabelId === 'TRASH' && messages.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <Button 
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  console.log('[Gmail] 🚨 CLIC BOUTON "Vider la corbeille" détecté !');
                  console.log('[Gmail] 📊 État actuel:', { currentLabelId, messagesCount: messages.length });
                  console.log('[Gmail] 🔧 Ouverture du modal de confirmation standard...');
                  setConfirmEmptyTrashVisible(true);
                }}
              >
                Vider la corbeille ({messages.length} emails)
              </Button>
            </div>
          )}
          
          {/* Gestion spécialisée des brouillons */}
          {showDraftsManager ? (
            <DraftsManager />
          ) : (
            <>
              {/* Bouton Tout sélectionner - toujours visible quand il y a des messages */}
              {messages.length > 0 && selectedMessagesForMove.length === 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Button 
                    size="small"
                    icon={<SelectOutlined />}
                    onClick={handleSelectAll}
                  >
                    Tout sélectionner
                  </Button>
                </div>
              )}
              
              <List
            loading={isLoading}
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item
                key={msg.id}
                actions={[
                  <Checkbox
                    checked={selectedMessagesForMove.includes(msg.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMessagesForMove(prev => [...prev, msg.id]);
                      } else {
                        setSelectedMessagesForMove(prev => prev.filter(id => id !== msg.id));
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />,
                  <Dropdown
                    menu={{
                      items: [
                        // 🔥 NOUVEAU: Option "Pas spam" visible seulement dans le dossier SPAM
                        ...(currentLabelId === 'SPAM' ? [{
                          key: 'NOT_SPAM',
                          label: '✅ Pas spam',
                          onClick: () => handleRemoveFromSpam([msg.id])
                        }, { type: 'divider' }] : []),
                        {
                          key: 'INBOX',
                          label: '📥 Boîte de réception',
                          onClick: () => handleMoveToFolder([msg.id], 'INBOX')
                        },
                        {
                          key: 'STARRED',
                          label: '⭐ Favoris',
                          onClick: () => handleMoveToFolder([msg.id], 'STARRED')
                        },
                        {
                          key: 'TRASH',
                          label: '🗑️ Corbeille',
                          onClick: () => handleMoveToFolder([msg.id], 'TRASH')
                        },
                        // 🔥 MASQUER "Spam" quand on est déjà dans le dossier SPAM
                        ...(currentLabelId !== 'SPAM' ? [{
                          key: 'SPAM',
                          label: '🚫 Spam',
                          onClick: () => handleMoveToFolder([msg.id], 'SPAM')
                        }] : []),
                        ...(customLabels.length > 0 ? [
                          { type: 'divider' },
                          ...customLabels.map(label => ({
                            key: label.key,
                            label: `📁 ${label.label}`,
                            onClick: () => handleMoveToFolder([msg.id], label.key)
                          }))
                        ] : [])
                      ]
                    }}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      icon={<FolderOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>,
                  <Button
                    type="text"
                    icon={msg.isStarred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    onClick={(e) => {
                      e.stopPropagation(); // Empêcher l'ouverture du mail
                      handleToggleStar(msg.id, msg.isStarred || false);
                    }}
                  />,
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation(); // Empêcher l'ouverture du mail
                      handleDeleteMessage(msg.id);
                    }}
                    danger
                  />,
                ]}
                onClick={() => handleOpenMessage(msg)}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: msg.isRead ? 'transparent' : '#f0f7ff',
                  borderLeft: msg.isRead ? 'none' : '4px solid #1890ff',
                  fontWeight: msg.isRead ? 'normal' : 'bold'
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!msg.isRead && <span style={{ color: '#1890ff', fontSize: '8px' }}>●</span>}
                        <Text strong={!msg.isRead}>{msg.from}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {msg.date ? new Date(msg.date).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Date inconnue'}
                      </Text>
                    </div>
                  }
                  description={
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Text strong={!msg.isRead}>{msg.subject}</Text>
                        {msg.hasAttachments && (
                          <PaperClipOutlined style={{ color: '#666', fontSize: '14px' }} />
                        )}
                      </div>
                      <br />
                      <Text type="secondary">{msg.snippet}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
          </>
          )}
        </Content>
      </Layout>

      {/* Compositeur d'email moderne avec auto-sauvegarde */}
      <EmailComposer
        visible={composeModalVisible}
        prefilledData={prefilledEmailData || undefined}
        onClose={handleCloseComposer}
        onSent={() => {
          setComposeModalVisible(false);
          setPrefilledEmailData(null); // Nettoyer les données pré-remplies
          // Recharger la mailbox actuelle pour voir les nouveaux emails envoyés
          loadMailbox(currentLabelId);
        }}
      />

      {/* Drawer de détail du message */}
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
                icon={<SendOutlined />} 
                onClick={() => handleReplyToAllMessage(selectedMessage)}
              >
                Répondre à tous
              </Button>
              <Button 
                onClick={() => handleForwardMessage(selectedMessage)}
              >
                Transférer
              </Button>
              <Button
                icon={selectedMessage.isStarred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                onClick={() => handleToggleStar(selectedMessage.id, selectedMessage.isStarred || false)}
              />
              <Button
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteMessage(selectedMessage.id)}
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
              
              {/* Affichage des pièces jointes */}
              {selectedMessage.hasAttachments && selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  <Text strong>📎 Pièces jointes ({selectedMessage.attachments.length}) :</Text>
                  <div style={{ marginTop: '8px' }}>
                    {selectedMessage.attachments.map((attachment, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        border: '1px solid #e8e8e8'
                      }}>
                        <div>
                          <Text strong>{attachment.filename}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {attachment.mimeType} • {(attachment.size / 1024).toFixed(1)} KB
                          </Text>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button 
                            size="small" 
                            icon={<EyeOutlined />}
                            loading={previewLoading}
                            onClick={() => handlePreviewAttachment(
                              selectedMessage.id, 
                              attachment.attachmentId, 
                              attachment.filename,
                              attachment.mimeType
                            )}
                          >
                            Aperçu
                          </Button>
                          <Button 
                            size="small" 
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => gmailServiceRef.current.downloadAttachment(
                              selectedMessage.id, 
                              attachment.attachmentId, 
                              attachment.filename
                            )}
                          >
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Aperçu intégré des pièces jointes */}
            {previewAttachment && (
              <div style={{ 
                marginTop: '16px', 
                padding: '16px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <Text strong style={{ fontSize: '16px' }}>
                    👁️ Aperçu - {previewAttachment.filename}
                  </Text>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      size="small" 
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        if (selectedMessage && previewAttachment) {
                          gmailServiceRef.current.downloadAttachment(
                            selectedMessage.id,
                            previewAttachment.attachmentId,
                            previewAttachment.filename
                          );
                        }
                      }}
                    >
                      Télécharger
                    </Button>
                    <Button 
                      size="small"
                      onClick={closePreview}
                    >
                      Fermer l'aperçu
                    </Button>
                  </div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  {(() => {
                    const previewType = getFilePreviewType(previewAttachment.filename, previewAttachment.mimeType);
                    
                    switch (previewType) {
                      case 'image':
                        return previewAttachment.data && (
                          <img 
                            src={previewAttachment.data} 
                            alt={previewAttachment.filename}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '400px', 
                              objectFit: 'contain',
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        );

                      case 'pdf':
                        return previewAttachment.data && (
                          <div>
                            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
                              📄 Fichier PDF - {previewAttachment.filename}
                            </Text>
                            <iframe
                              src={previewAttachment.data}
                              style={{ 
                                width: '100%', 
                                height: '500px', 
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                backgroundColor: '#ffffff'
                              }}
                              title={previewAttachment.filename}
                              sandbox="allow-same-origin allow-scripts"
                            />
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                              <Text type="secondary">
                                Si le PDF ne s'affiche pas, 
                                <a 
                                  href={previewAttachment.data} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ marginLeft: '4px' }}
                                >
                                  cliquez ici pour l'ouvrir dans un nouvel onglet
                                </a>
                              </Text>
                            </div>
                          </div>
                        );

                      case 'office':
                        return previewAttachment.viewerUrl && (
                          <div>
                            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
                              � Fichier Office - {previewAttachment.filename.split('.').pop()?.toUpperCase()}
                            </Text>
                            <iframe
                              src={previewAttachment.viewerUrl}
                              style={{ 
                                width: '100%', 
                                height: '500px', 
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                backgroundColor: '#ffffff'
                              }}
                              title={previewAttachment.filename}
                            />
                          </div>
                        );

                      case 'text':
                        return previewAttachment.data && (
                          <div style={{ textAlign: 'left' }}>
                            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
                              📄 Fichier texte - {previewAttachment.filename}
                            </Text>
                            <div style={{ 
                              backgroundColor: '#ffffff',
                              padding: '16px',
                              borderRadius: '6px',
                              border: '1px solid #dee2e6',
                              maxHeight: '400px',
                              overflow: 'auto',
                              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                              fontSize: '13px',
                              lineHeight: '1.4',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {previewAttachment.data}
                            </div>
                          </div>
                        );

                      case 'video':
                        return previewAttachment.data && (
                          <div>
                            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
                              🎥 Fichier vidéo - {previewAttachment.filename}
                            </Text>
                            <video
                              src={previewAttachment.data}
                              controls
                              style={{ 
                                width: '100%', 
                                maxHeight: '400px',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                backgroundColor: '#000000'
                              }}
                              title={previewAttachment.filename}
                            >
                              Votre navigateur ne supporte pas la lecture vidéo.
                            </video>
                          </div>
                        );

                      case 'audio':
                        return previewAttachment.data && (
                          <div>
                            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
                              🎵 Fichier audio - {previewAttachment.filename}
                            </Text>
                            <audio
                              src={previewAttachment.data}
                              controls
                              style={{ 
                                width: '100%',
                                marginTop: '12px'
                              }}
                              title={previewAttachment.filename}
                            >
                              Votre navigateur ne supporte pas la lecture audio.
                            </audio>
                          </div>
                        );

                      default:
                        return (
                          <div style={{ 
                            padding: '40px',
                            textAlign: 'center',
                            color: '#666',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📎</div>
                            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                              {previewAttachment.filename}
                            </Text>
                            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                              Type: {previewAttachment.mimeType}
                            </Text>
                            <Text type="secondary">
                              Aperçu non disponible pour ce type de fichier.
                              <br />
                              Utilisez le bouton "Télécharger" pour l'ouvrir avec une application appropriée.
                            </Text>
                          </div>
                        );
                    }
                  })()}
                </div>
              </div>
            )}
            
            {/* Contenu de l'email - MÊME STYLE que EmailComposer */}
            <div 
              className="email-content"
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                maxHeight: '70vh',
                overflow: 'auto'
              }}
            >
              {selectedMessage.htmlBody ? (
                <div style={{ padding: '20px' }}>
                  {/* Affichage HTML MAGNIFIQUE - IDENTIQUE à EmailComposer */}
                  <div 
                    style={{
                      padding: '20px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      fontFamily: 'inherit',
                      lineHeight: 'inherit',
                      color: 'inherit',
                      fontSize: 'inherit'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: selectedMessage.htmlBody
                        // 🔒 NETTOYAGE SÉCURITAIRE MINIMAL SEULEMENT
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Scripts pour sécurité
                        .replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi, '') // CSS externes
                        // ✨ TOUT LE RESTE RESTE PARFAIT TEL QUEL !
                    }}
                  />
                </div>
              ) : (
                <div style={{ 
                  padding: '20px',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  margin: '20px',
                  fontFamily: 'Arial, Helvetica, sans-serif, "Segoe UI", Roboto',
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: '#212529'
                }}>
                  {selectedMessage.snippet || 'Contenu non disponible'}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal de création de dossier */}
      <Modal
        title="📁 Créer un nouveau dossier"
        open={createFolderModalVisible}
        onCancel={() => setCreateFolderModalVisible(false)}
        footer={null}
      >
        <Form
          onFinish={(values) => handleCreateFolder(values.folderName)}
          layout="vertical"
        >
          <Form.Item
            name="folderName"
            label="Nom du dossier"
            rules={[
              { required: true, message: 'Veuillez saisir un nom de dossier' },
              { min: 2, message: 'Le nom doit contenir au moins 2 caractères' },
              { max: 50, message: 'Le nom ne peut pas dépasser 50 caractères' }
            ]}
          >
            <Input 
              placeholder="Nom du nouveau dossier..." 
              autoFocus
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button onClick={() => setCreateFolderModalVisible(false)}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit">
              Créer le dossier
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal de modification de dossier */}
      <Modal
        title="✏️ Modifier le dossier"
        open={editFolderModalVisible}
        onCancel={() => {
          setEditFolderModalVisible(false);
          setSelectedFolderForEdit(null);
        }}
        footer={null}
      >
        <Form
          onFinish={(values) => handleEditFolder(values.folderName)}
          layout="vertical"
          initialValues={{ folderName: selectedFolderForEdit?.label }}
        >
          <Form.Item
            name="folderName"
            label="Nouveau nom du dossier"
            rules={[
              { required: true, message: 'Veuillez saisir un nom de dossier' },
              { min: 2, message: 'Le nom doit contenir au moins 2 caractères' },
              { max: 50, message: 'Le nom ne peut pas dépasser 50 caractères' }
            ]}
          >
            <Input 
              placeholder="Nouveau nom du dossier..." 
              autoFocus
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button onClick={() => {
              setEditFolderModalVisible(false);
              setSelectedFolderForEdit(null);
            }}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit">
              Modifier le dossier
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        title="⚠️ Confirmer la suppression"
        open={deleteFolderModalVisible}
        onCancel={() => {
          setDeleteFolderModalVisible(false);
          setSelectedFolderForEdit(null);
        }}
        footer={null}
      >
        <div style={{ marginBottom: '16px' }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />
          Êtes-vous sûr de vouloir supprimer le dossier <strong>"{selectedFolderForEdit?.label}"</strong> ?
        </div>
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fff7e6', borderRadius: '6px' }}>
          <Text type="warning">
            <strong>Attention :</strong> Cette action est irréversible. Le dossier et son organisation seront perdus, 
            mais les emails qu'il contenait ne seront pas supprimés.
          </Text>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={() => {
            setDeleteFolderModalVisible(false);
            setSelectedFolderForEdit(null);
          }}>
            Annuler
          </Button>
          <Button type="primary" danger onClick={handleDeleteFolder}>
            Supprimer définitivement
          </Button>
        </div>
      </Modal>

      {/* 🆕 NOUVEAU: Modal de confirmation pour vider la corbeille */}
      <Modal
        title={<span style={{ color: '#ff4d4f' }}>🗑️ Vider la corbeille ?</span>}
        open={confirmEmptyTrashVisible}
        onCancel={() => {
          console.log('[Gmail] ❌ Modal vidage corbeille - Bouton Annuler cliqué');
          setConfirmEmptyTrashVisible(false);
        }}
        footer={null}
        centered
        maskClosable={false}
        style={{ zIndex: 10000 }}
      >
        <div style={{ marginBottom: '16px' }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px', fontSize: '18px' }} />
          Êtes-vous sûr de vouloir supprimer définitivement <strong>TOUS les {messages.length} emails</strong> de la corbeille ?
        </div>
        <div style={{ marginBottom: '20px', padding: '12px', background: '#fff2f0', borderRadius: '6px', border: '1px solid #ffccc7' }}>
          <Text type="danger">
            <strong>⚠️ ATTENTION :</strong> Cette action est <strong>irréversible</strong>. 
            Tous les emails de la corbeille seront <strong>définitivement supprimés</strong> et ne pourront plus être récupérés.
          </Text>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={() => {
            console.log('[Gmail] ❌ Modal vidage corbeille - Bouton Annuler cliqué');
            setConfirmEmptyTrashVisible(false);
          }}>
            Annuler
          </Button>
          <Button 
            type="primary" 
            danger 
            onClick={() => {
              console.log('[Gmail] ✅ Modal vidage corbeille - Bouton OK cliqué, appel handleEmptyTrash...');
              setConfirmEmptyTrashVisible(false);
              handleEmptyTrash();
            }}
          >
            Oui, vider la corbeille
          </Button>
        </div>
      </Modal>
    </Layout>
  );
};

export default GoogleMailPageClean;

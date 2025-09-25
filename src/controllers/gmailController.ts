import { Request, Response } from 'express';
import { googleOAuthService } from '../google-auth/core/GoogleOAuthCore.js';
import { google } from 'googleapis';

// Interface pour les pièces jointes
interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

// Interface pour les messages Gmail formatés
interface FormattedGmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  snippet: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  htmlBody?: string;
}

// Interface pour les labels Gmail
interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
}

// Interface pour les headers Gmail
interface GmailHeader {
  name: string;
  value: string;
}

// Interface pour les parties du payload Gmail
interface GmailPayloadPart {
  mimeType?: string;
  filename?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailPayloadPart[];
}

// Interface pour le payload Gmail
interface GmailPayload {
  headers?: GmailHeader[];
  mimeType?: string;
  filename?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailPayloadPart[];
}

// Interface pour les données de message Gmail
interface GmailMessageData {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailPayload;
  internalDate?: string;
}

// Interface pour les paramètres de liste
interface ListParams {
  userId: string;
  maxResults: number;
  labelIds?: string[];
  q?: string;
  pageToken?: string;
}

/**
 * Obtenir la liste des messages Gmail selon le type de mailbox
 */
export const getMessages = async (req: Request, res: Response) => {
  console.log('[Gmail Controller] 🚨🚨🚨 ROUTE getMessages APPELÉE - DÉBUT 🚨🚨🚨');
  console.log('[Gmail Controller] 🚨 req.url:', req.url);
  console.log('[Gmail Controller] 🚨 req.method:', req.method);
  console.log('[Gmail Controller] 🚨 req.query:', JSON.stringify(req.query, null, 2));
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { mailbox = 'inbox', maxResults = 50 } = req.query;

    console.log(`[Gmail Controller] ========================================`);
    console.log(`[Gmail Controller] � DEBUG COMPLET - PARAMÈTRES REÇUS:`);
    console.log(`[Gmail Controller] - req.query BRUT:`, JSON.stringify(req.query, null, 2));
    console.log(`[Gmail Controller] - mailbox extrait: "${mailbox}" (type: ${typeof mailbox})`);
    console.log(`[Gmail Controller] - maxResults: ${maxResults}`);
    console.log(`[Gmail Controller] - pageToken: ${req.query.pageToken}`);
    console.log(`[Gmail Controller] 📂 DEMANDE DE FILTRAGE mailbox: ${mailbox}`);
    console.log(`[Gmail Controller] ========================================`);

    // Obtenir les tokens d'accès pour l'organisation (email admin)
    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    if (!auth) {
      console.error('[Gmail Controller] ❌ Impossible de récupérer le client authentifié pour l\'organisation');
      // 🚨 CORRECTION: Utiliser 403 Forbidden au lieu de 401 Unauthorized.
      // 401 signifie "Non authentifié", ce qui est faux. L'utilisateur est authentifié
      // mais n'a pas les droits (jetons Google) pour accéder à cette ressource.
      // Cela évite que le frontend ne déconnecte l'utilisateur à tort.
      return res.status(403).json({ message: "Connexion à Google requise. L'utilisateur n'a pas de jetons valides." });
    }

    // Configurer l'authentification
    const gmail = google.gmail({ version: 'v1', auth });

    // Définir les labelIds selon le type de mailbox
    let labelIds: string[] = [];
    let query = '';

    console.log(`[Gmail Controller] 🔍 SWITCH DEBUG - mailbox: "${mailbox}" (type: ${typeof mailbox})`);

    switch (mailbox) {
      case 'inbox':
        labelIds = ['INBOX'];
        // Exclure les messages supprimés et spams
        query = '-in:trash -in:spam';
        console.log(`[Gmail Controller] ✅ CASE INBOX: labelIds=${JSON.stringify(labelIds)}, query="${query}"`);
        break;
      case 'sent':
        labelIds = ['SENT'];
        console.log(`[Gmail Controller] ✅ CASE SENT: labelIds=${JSON.stringify(labelIds)}`);
        break;
      case 'starred':
        labelIds = ['STARRED'];
        // Les messages favoris peuvent être dans n'importe quel dossier
        query = '-in:trash';
        console.log(`[Gmail Controller] ✅ CASE STARRED: labelIds=${JSON.stringify(labelIds)}, query="${query}"`);
        break;
      case 'trash':
        labelIds = ['TRASH'];
        console.log(`[Gmail Controller] 🗑️ TRASH: labelIds=${JSON.stringify(labelIds)}`);
        break;
      case 'spam':
        labelIds = ['SPAM'];
        console.log(`[Gmail Controller] 🚫 SPAM: labelIds=${JSON.stringify(labelIds)}`);
        break;
      case 'drafts':
        labelIds = ['DRAFT'];
        console.log(`[Gmail Controller] 📝 DRAFTS: labelIds=${JSON.stringify(labelIds)}`);
        break;
      default:
        // Pour les labels personnalisés, utiliser le nom du label
        if (typeof mailbox === 'string') {
          // Récupérer tous les labels pour trouver l'ID correspondant
          const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
          const customLabel = labelsResponse.data.labels?.find(
            label => label.name === mailbox || label.id === mailbox
          );
          if (customLabel && customLabel.id) {
            labelIds = [customLabel.id];
            console.log(`[Gmail Controller] 🏷️ CUSTOM: ${mailbox} -> labelIds=${JSON.stringify(labelIds)}`);
          } else {
            // Si le label n'existe pas, retourner une liste vide
            console.log(`[Gmail Controller] ❌ CUSTOM LABEL INTROUVABLE: ${mailbox}`);
            return res.json({
              messages: [],
              nextPageToken: null,
              resultSizeEstimate: 0
            });
          }
        }
    }

    console.log(`[Gmail Controller] 🔍 FINAL REQUEST PARAMS:`);
    console.log(`[Gmail Controller] - labelIds: ${JSON.stringify(labelIds)}`);
    console.log(`[Gmail Controller] - query: "${query}"`);
    console.log(`[Gmail Controller] - maxResults: ${Number(maxResults)}`);

    // Construire les paramètres de la requête
    const listParams: ListParams = {
      userId: 'me',
      maxResults: Number(maxResults),
      labelIds: labelIds.length > 0 ? labelIds : undefined,
      q: query || undefined
    };

    console.log(`[Gmail Controller] 🚀 APPEL API GMAIL AVEC:`, JSON.stringify(listParams, null, 2));

    // Si on a un pageToken, l'ajouter
    if (req.query.pageToken) {
      listParams.pageToken = req.query.pageToken as string;
    }

    console.log(`[Gmail Controller] 📋 GMAIL API CALL PARAMS:`, listParams);

    // Récupérer la liste des messages
    const response = await gmail.users.messages.list(listParams);
    const messages = response.data.messages || [];

    console.log(`[Gmail Controller] 📨 GMAIL API RESPONSE:`);
    console.log(`[Gmail Controller] - Total messages found: ${messages.length}`);
    console.log(`[Gmail Controller] - Result size estimate: ${response.data.resultSizeEstimate}`);
    console.log(`[Gmail Controller] - Next page token: ${response.data.nextPageToken ? 'EXISTS' : 'NONE'}`);

    if (messages.length > 0) {
      console.log(`[Gmail Controller] 🔍 FIRST MESSAGE IDs:`, messages.slice(0, 3).map(m => m.id));
    }

    // Si aucun message, retourner une réponse vide
    if (messages.length === 0) {
      return res.json({
        messages: [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate || 0
      });
    }

    // Récupérer les détails de chaque message (avec optimisation)
    const messagePromises = messages.slice(0, Number(maxResults)).map(async (message) => {
      if (!message.id) return null;

      try {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        return formatGmailMessage(messageData.data);
      } catch (error) {
        console.error(`[Gmail] Erreur lors de la récupération du message ${message.id}:`, error);
        return null;
      }
    });

    const formattedMessages = (await Promise.all(messagePromises))
      .filter((msg): msg is FormattedGmailMessage => msg !== null);

    console.log(`[Gmail Controller] ✅ FINAL RESULT for ${mailbox}:`);
    console.log(`[Gmail Controller] - Formatted messages: ${formattedMessages.length}`);
    console.log(`[Gmail Controller] - First message subjects:`, formattedMessages.slice(0, 3).map(m => m.subject));
    console.log(`[Gmail Controller] ========================================`);

    res.json({
      messages: formattedMessages,
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate || formattedMessages.length
    });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la récupération des messages:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des messages',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Obtenir les détails d'un message spécifique
 */
export const getMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { id: messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: 'ID du message requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    console.log('[Gmail] 📨 Getting message with ID:', messageId);

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full' // Assure qu'on récupère toutes les parties du message
    });

    console.log('[Gmail] 📋 Message structure:', {
      id: response.data.id,
      mimeType: response.data.payload?.mimeType,
      hasParts: !!response.data.payload?.parts,
      partsCount: response.data.payload?.parts?.length || 0
    });

    const formattedMessage = formatGmailMessage(response.data);
    res.json(formattedMessage);

  } catch (error) {
    console.error('[Gmail] Erreur lors de la récupération du message:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du message',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Marquer un message comme lu
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: 'ID du message requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    });

    res.json({ success: true, message: 'Message marqué comme lu' });

  } catch (error) {
    console.error('[Gmail] Erreur lors du marquage comme lu:', error);
    res.status(500).json({ 
      error: 'Erreur lors du marquage comme lu',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Marquer/démarquer un message comme favori
 */
export const toggleStar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { messageId } = req.params;
    const { isStarred } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'ID du message requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const requestBody = isStarred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] };

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody
    });

    res.json({ 
      success: true, 
      message: isStarred ? 'Message marqué comme favori' : 'Favori retiré'
    });

  } catch (error) {
    console.error('[Gmail] Erreur lors du toggle star:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification du favori',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Supprimer un message (le déplacer vers la corbeille)
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: 'ID du message requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.trash({
      userId: 'me',
      id: messageId
    });

    res.json({ success: true, message: 'Message supprimé' });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la suppression:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Obtenir les labels Gmail
 */
export const getLabels = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.labels.list({ userId: 'me' });
    const labels = response.data.labels || [];

    // Formatter les labels
    const formattedLabels: GmailLabel[] = labels.map(label => ({
      id: label.id || '',
      name: label.name || '',
      type: label.type || 'user',
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility
    }));

    res.json({ labels: formattedLabels });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la récupération des labels:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des labels',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Créer un nouveau label
 */
export const createLabel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nom du label requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const labelObject: {
      name: string;
      messageListVisibility: string;
      labelListVisibility: string;
      color?: {
        textColor: string;
        backgroundColor: string;
      };
    } = {
      name,
      messageListVisibility: 'show',
      labelListVisibility: 'labelShow'
    };

    if (color) {
      labelObject.color = {
        textColor: '#000000',
        backgroundColor: color
      };
    }

    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody: labelObject
    });

    res.json({ 
      success: true, 
      label: response.data,
      message: 'Label créé avec succès'
    });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la création du label:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du label',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Ajouter un label à un message
 */
export const addLabel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { messageId } = req.params;
    const { labelId } = req.body;

    if (!messageId || !labelId) {
      return res.status(400).json({ error: 'ID du message et du label requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId]
      }
    });

    res.json({ success: true, message: 'Label ajouté au message' });

  } catch (error) {
    console.error('[Gmail] Erreur lors de l\'ajout du label:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'ajout du label',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Retirer un label d'un message
 */
export const removeLabel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { messageId } = req.params;
    const { labelId } = req.body;

    if (!messageId || !labelId) {
      return res.status(400).json({ error: 'ID du message et du label requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: [labelId]
      }
    });

    res.json({ success: true, message: 'Label retiré du message' });

  } catch (error) {
    console.error('[Gmail] Erreur lors du retrait du label:', error);
    res.status(500).json({ 
      error: 'Erreur lors du retrait du label',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Fonction utilitaire pour formatter un message Gmail
 */
function formatGmailMessage(messageData: GmailMessageData): FormattedGmailMessage {
  const headers = messageData.payload?.headers || [];
  const labelIds = messageData.labelIds || [];

  // Extraire les headers importants
  const subject = headers.find((h: GmailHeader) => h.name === 'Subject')?.value || '(Aucun sujet)';
  const from = headers.find((h: GmailHeader) => h.name === 'From')?.value || '';
  const to = headers.find((h: GmailHeader) => h.name === 'To')?.value || '';
  const dateHeader = headers.find((h: GmailHeader) => h.name === 'Date')?.value;

  // Convertir la date
  let date = new Date();
  if (dateHeader) {
    date = new Date(dateHeader);
  } else if (messageData.internalDate) {
    date = new Date(parseInt(messageData.internalDate));
  }

  // Vérifier l'état du message
  const isRead = !labelIds.includes('UNREAD');
  const isStarred = labelIds.includes('STARRED');

  // Extraire le contenu HTML
  const htmlBody = extractHtmlContent(messageData.payload);
  
  // Debug: Log du contenu HTML pour diagnostic
  if (htmlBody) {
    console.log(`[formatGmailMessage] 🔍 HTML BODY DEBUG pour ${messageData.id}:`);
    console.log(`[formatGmailMessage] - Longueur: ${htmlBody.length} caractères`);
    console.log(`[formatGmailMessage] - Commence par: ${htmlBody.substring(0, 200)}...`);
    console.log(`[formatGmailMessage] - Contient DOCTYPE: ${htmlBody.includes('<!DOCTYPE')}`);
    console.log(`[formatGmailMessage] - Contient <html>: ${htmlBody.includes('<html')}`);
    console.log(`[formatGmailMessage] - Contient <head>: ${htmlBody.includes('<head')}`);
    console.log(`[formatGmailMessage] - Contient <body>: ${htmlBody.includes('<body')}`);
    console.log(`[formatGmailMessage] - Contient des images: ${htmlBody.includes('<img')}`);
    console.log(`[formatGmailMessage] - Contient des styles: ${htmlBody.includes('style=') || htmlBody.includes('<style')}`);
    
    // Afficher les premiers et derniers caractères pour voir la structure
    console.log(`[formatGmailMessage] - 500 premiers caractères: ${htmlBody.substring(0, 500)}`);
    console.log(`[formatGmailMessage] - 200 derniers caractères: ${htmlBody.substring(htmlBody.length - 200)}`);
    
    // 🎉 HTML EMAIL: C'est normal que les emails n'aient pas de DOCTYPE/html - c'est du contenu de body !
    console.log(`[formatGmailMessage] ✅ HTML Email content detected - ${htmlBody.length} characters`);
  } else {
    console.log(`[formatGmailMessage] ⚠️ Aucun HTML Body trouvé pour ${messageData.id}`);
  }

  // Vérifier les pièces jointes
  const hasAttachments = checkForAttachments(messageData.payload);
  const attachments = hasAttachments ? extractAttachments(messageData.payload) : [];

  return {
    id: messageData.id,
    threadId: messageData.threadId,
    subject,
    from,
    to,
    date,
    snippet: messageData.snippet || '',
    labels: labelIds,
    isRead,
    isStarred,
    hasAttachments,
    attachments,
    htmlBody
  };
}

/**
 * Extraire le contenu HTML d'un message Gmail
 */
function extractHtmlContent(payload: GmailPayload): string | undefined {
  if (!payload) {
    console.log('[HTML Extract] ❌ Payload vide');
    return undefined;
  }

  console.log('[HTML Extract] 🔍 Analyzing payload structure:', {
    mimeType: payload.mimeType,
    hasParts: !!payload.parts,
    partsCount: payload.parts?.length || 0,
    hasBody: !!payload.body,
    bodySize: payload.body?.size || 0
  });

  // Fonction récursive pour chercher le contenu HTML
  function findHtmlPart(part: GmailPayloadPart, depth = 0): string | undefined {
    const indent = '  '.repeat(depth);
    console.log(`[HTML Extract] ${indent}📁 Part analysis:`, {
      mimeType: part.mimeType,
      hasBody: !!part.body,
      bodySize: part.body?.size || 0,
      hasData: !!part.body?.data,
      hasParts: !!part.parts,
      partsCount: part.parts?.length || 0
    });

    // D'ABORD: vérifier si cette partie est du HTML
    if (part.mimeType === 'text/html' && part.body?.data) {
      console.log(`[HTML Extract] ${indent}🎯 Found HTML part! Size: ${part.body.size}`);
      const htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
      console.log(`[HTML Extract] ${indent}📝 HTML Preview:`, htmlContent.substring(0, 200) + '...');
      
      // 🎯 GMAIL LOGIC: Les emails utilisent du HTML sans structure complète - c'est NORMAL !
      // On accepte TOUT contenu text/html, même sans DOCTYPE/html/head/body
      console.log(`[HTML Extract] ${indent}🎉 USING text/html content (Gmail style) - RETOUR IMMÉDIAT!`);
      return cleanAndOptimizeHtml(htmlContent);
    }

    // ENSUITE: chercher récursivement dans les sous-parties PRIORITÉ HTML
    if (part.parts) {
      // 🚀 NOUVELLE LOGIQUE: Chercher d'abord toutes les parties text/html
      for (let i = 0; i < part.parts.length; i++) {
        const subPart = part.parts[i];
        if (subPart.mimeType === 'text/html' && subPart.body?.data) {
          console.log(`[HTML Extract] ${indent}🎯 PRIORITY: Found text/html in sub-part ${i+1}!`);
          const htmlContent = Buffer.from(subPart.body.data, 'base64').toString('utf-8');
          console.log(`[HTML Extract] ${indent}📝 HTML Content preview:`, htmlContent.substring(0, 200) + '...');
          console.log(`[HTML Extract] ${indent}🎉 USING text/html sub-part (Newsletter HTML) - RETOUR IMMÉDIAT!`);
          return cleanAndOptimizeHtml(htmlContent);
        }
      }
      
      // 🔄 Si pas de text/html direct, chercher récursivement
      for (let i = 0; i < part.parts.length; i++) {
        const subPart = part.parts[i];
        console.log(`[HTML Extract] ${indent}🔄 Exploring sub-part ${i+1}/${part.parts.length}:`);
        
        const htmlContent = findHtmlPart(subPart, depth + 1);
        if (htmlContent) {
          console.log(`[HTML Extract] ${indent}✅ Found HTML in sub-part ${i+1}!`);
          return htmlContent;
        }
      }
    }

    // PUIS: vérifier si cette partie contient du HTML même si c'est text/plain
    if (part.body?.data) {
      console.log(`[HTML Extract] ${indent}🔍 Checking ${part.mimeType} for HTML content...`);
      const content = Buffer.from(part.body.data, 'base64').toString('utf-8');
      
      // 🚨 DEBUG CRUCIAL: Afficher le début du contenu pour diagnostiquer
      console.log(`[HTML Extract] ${indent}🔬 CONTENT START (first 300 chars): "${content.substring(0, 300)}"`);
      
      // Détecter du HTML dans text/plain (comme Voyage Privé)
      const hasHtmlTags = content.includes('<') && content.includes('>');
      const hasLinks = content.includes('<a href');
      const hasImages = content.includes('<img');
      const hasFormatting = content.includes('<br>') || content.includes('<div>') || content.includes('<table>');
      
      console.log(`[HTML Extract] ${indent}🔍 HTML DETECTION: hasHtmlTags=${hasHtmlTags}, hasLinks=${hasLinks}, hasImages=${hasImages}, hasFormatting=${hasFormatting}`);
      
      // 🎯 LOGIQUE AMÉLIORÉE: Détecter du HTML même avec des critères plus flexibles
      const isHtmlContent = hasHtmlTags && (hasLinks || hasImages || hasFormatting);
      
      // 📧 FALLBACK SPÉCIAL: Voyage Privé et autres newsletters "texte riche"
      // Si le contenu a des URLs longues et complexes, des mentions d'unsubscribe, etc.
      const hasComplexUrls = content.includes('https://') && content.length > 5000;
      const hasNewsletterKeywords = content.includes('unsubscribe') || content.includes('newsletter') || content.includes('email.') || content.includes('Voyage');
      const isNewsletterContent = hasComplexUrls && hasNewsletterKeywords;
      
      console.log(`[HTML Extract] ${indent}🔍 NEWSLETTER DETECTION: hasComplexUrls=${hasComplexUrls}, hasNewsletterKeywords=${hasNewsletterKeywords}, isNewsletterContent=${isNewsletterContent}`);
      
      if (isHtmlContent || isNewsletterContent) {
        console.log(`[HTML Extract] ${indent}🎯 DETECTED HTML in ${part.mimeType}!`);
        console.log(`[HTML Extract] ${indent}📊 HTML indicators: links=${hasLinks}, images=${hasImages}, formatting=${hasFormatting}`);
        console.log(`[HTML Extract] ${indent}📝 Content preview: ${content.substring(0, 200)}...`);
        console.log(`[HTML Extract] ${indent}🎉 USING HTML from ${part.mimeType} (Voyage Privé style) - RETOUR IMMÉDIAT!`);
        
        // 🔍 DEBUG: Vérifier si le contenu contient déjà une div pre-wrap
        console.log(`[HTML Extract] ${indent}🚨 RAW CONTENT CHECK: Contains pre-wrap=${content.includes('white-space: pre-wrap')}`);
        console.log(`[HTML Extract] ${indent}🚨 RAW CONTENT START: ${content.substring(0, 100)}`);
        
        // 🎯 CRUCIAL: Si c'est du vrai HTML, ne pas l'emballer dans une div pre-wrap
        // Nettoyer et retourner directement le HTML
        const cleanedHtml = cleanAndOptimizeHtml(content);
        console.log(`[HTML Extract] ${indent}🧹 Cleaned HTML preview: ${cleanedHtml.substring(0, 200)}...`);
        return cleanedHtml;
      }
      
      // Fallback vers text/plain basique
      if (part.mimeType === 'text/plain') {
        console.log(`[HTML Extract] ${indent}📄 Using plain text as fallback. Size: ${part.body.size}`);
        const htmlContent = content.replace(/\n/g, '<br>');
        return `<div style="white-space: pre-wrap;">${htmlContent}</div>`;
      }
    }

    return undefined;
  }

  const result = findHtmlPart(payload);
  console.log('[HTML Extract] 🏁 Final result:', result ? `HTML found (${result.length} chars)` : 'No HTML found');
  return result;
}

/**
 * Nettoyer et optimiser le HTML pour un affichage sécurisé
 */
function cleanAndOptimizeHtml(html: string): string {
  if (!html) return '';

  // Supprimer les scripts et autres éléments dangereux
  let cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form\b[^>]*>/gi, '')
    .replace(/<\/form>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // 🧹 NOUVEAU: Nettoyer les lignes vides et espaces excessifs
  cleanHtml = cleanHtml
    // Supprimer les lignes vides multiples
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Supprimer TOUS les <br> multiples (plus agressif)
    .replace(/(<br\s*\/?>){2,}/gi, '<br>')
    // Supprimer les espaces en début/fin de ligne
    .replace(/^\s+|\s+$/gm, '')
    // Supprimer TOUTES les lignes complètement vides
    .replace(/\n\s*\n/g, '\n')
    // Supprimer les <p></p> vides
    .replace(/<p\s*><\/p>/gi, '')
    // Supprimer les <div></div> vides
    .replace(/<div\s*><\/div>/gi, '')
    // Supprimer les <td></td> vides dans les tableaux
    .replace(/<td\s*><\/td>/gi, '')
    // Supprimer les <tr></tr> vides dans les tableaux
    .replace(/<tr\s*><\/tr>/gi, '')
    // Réduire les espaces multiples
    .replace(/\s{3,}/g, ' ')
    // 🚀 NOUVEAU: Supprimer les sauts de ligne excessifs dans les newsletters
    .replace(/>\s*\n\s*</g, '><')
    // Supprimer les espaces avant/après les balises
    .replace(/\s*<\s*/g, '<')
    .replace(/\s*>\s*/g, '>');

  // Corriger les liens pour qu'ils s'ouvrent dans un nouvel onglet
  cleanHtml = cleanHtml.replace(
    /<a\s+([^>]*href\s*=\s*['"'][^'"]*['"][^>]*)>/gi,
    '<a $1 target="_blank" rel="noopener noreferrer">'
  );

  // Améliorer l'affichage des images - garder les styles existants mais ajouter responsivité
  cleanHtml = cleanHtml.replace(
    /<img\s+([^>]*?)(?:\s+style\s*=\s*["']([^"']*)["'])?([^>]*?)>/gi,
    (match, before, existingStyle, after) => {
      const newStyle = existingStyle 
        ? `${existingStyle}; max-width: 100%; height: auto;`
        : 'max-width: 100%; height: auto; display: block;';
      return `<img ${before} style="${newStyle}" ${after}>`;
    }
  );

  // Améliorer les tableaux pour les newsletters
  cleanHtml = cleanHtml.replace(
    /<table\s+([^>]*?)(?:\s+style\s*=\s*["']([^"']*)["'])?([^>]*?)>/gi,
    (match, before, existingStyle, after) => {
      const newStyle = existingStyle 
        ? `${existingStyle}; width: 100%; max-width: 100%;`
        : 'width: 100%; max-width: 100%; border-collapse: collapse;';
      return `<table ${before} style="${newStyle}" ${after}>`;
    }
  );

  // Préserver et améliorer les styles inline des newsletters
  if (!cleanHtml.includes('<!DOCTYPE') && !cleanHtml.includes('<html')) {
    // 🎨 AMÉLIORATION: Meilleure conversion pour les newsletters text/plain
    // Transformer les URLs longues en liens cliquables
    cleanHtml = cleanHtml.replace(
      /(https?:\/\/[^\s<>"]+)/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #1890ff; text-decoration: none;">$1</a>'
    );
    
    // Améliorer la structure avec des paragraphes
    cleanHtml = cleanHtml.replace(/\n\n/g, '</p><p>');
    cleanHtml = cleanHtml.replace(/\n/g, '<br>');
    
    // Wrapper avec de meilleurs styles
    cleanHtml = `<div class="email-newsletter" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 100%; overflow-x: auto; padding: 20px;"><p>${cleanHtml}</p></div>`;
  }

  return cleanHtml;
}

/**
 * Vérifier la présence de pièces jointes
 */
function checkForAttachments(payload: GmailPayload): boolean {
  if (!payload) return false;

  function hasAttachmentParts(part: GmailPayloadPart): boolean {
    if (part.filename && part.filename.length > 0) {
      return true;
    }

    if (part.parts) {
      return part.parts.some((subPart: GmailPayloadPart) => hasAttachmentParts(subPart));
    }

    return false;
  }

  return hasAttachmentParts(payload);
}

/**
 * Extraire les détails des pièces jointes
 */
function extractAttachments(payload: GmailPayload): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  
  if (!payload) return attachments;

  function findAttachmentParts(part: GmailPayloadPart) {
    // Si cette partie a un nom de fichier et un attachmentId, c'est une pièce jointe
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0
      });
    }

    // Chercher récursivement dans les sous-parties
    if (part.parts) {
      part.parts.forEach(findAttachmentParts);
    }
  }

  findAttachmentParts(payload);
  return attachments;
}

/**
 * Obtenir les threads Gmail (pour compatibilité)
 */
export const getThreads = async (req: Request, res: Response) => {
  try {
    // Pour simplifier, rediriger vers getMessages
    return getMessages(req, res);
  } catch (error) {
    console.error('[Gmail] Erreur lors de la récupération des threads:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des threads',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Envoyer un message
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    console.log('[Gmail Send] 📤 Début envoi message');
    console.log('[Gmail Send] 📋 Body reçu:', JSON.stringify(req.body, null, 2));
    console.log('[Gmail Send] 📎 Files reçus:', req.files);

    const { to, cc, bcc, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Destinataire, sujet et corps requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    // 🚀 CONSTRUCTION MESSAGE MIME manuelle - Structure RFC-compliant
    console.log('[Gmail Send] 📤 Construction du message MIME...');
    
    const mainBoundary = `----=_NextPart_${Math.random().toString(36).substr(2, 15)}`;
    const altBoundary = `----=_NextPart_Alt_${Math.random().toString(36).substr(2, 15)}`;
    
    // Headers principaux avec headers de confiance
    const dateNow = new Date().toUTCString();
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 15)}@2thier.be>`;
    
    const headers = [
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      cc ? `CC: ${Array.isArray(cc) ? cc.join(', ') : cc}` : '',
      bcc ? `BCC: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}` : '',
      `Subject: ${subject}`,
      `Date: ${dateNow}`,
      `Message-ID: ${messageId}`,
      'MIME-Version: 1.0',
      'X-Mailer: CRM 2Thier v1.0',
      'X-Priority: 3',
      'Importance: Normal'
    ].filter(Boolean);

    let message = '';
    
    // Vérifier s'il y a des pièces jointes
    const hasAttachments = req.files && Object.keys(req.files).length > 0;
    
    if (hasAttachments) {
      console.log('[Gmail Send] 📎 Message avec pièces jointes');
      
      // Structure MIME complète pour pièces jointes:
      // multipart/mixed contenant:
      //   - multipart/alternative (pour le corps)
      //   - attachments
      message = [
        ...headers,
        `Content-Type: multipart/mixed; boundary="${mainBoundary}"`,
        '',
        // Première partie: le corps du message
        `--${mainBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        '',
        `--${altBoundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        body,
        '',
        `--${altBoundary}--`,
        ''
      ].join('\r\n');

      // Ajouter les pièces jointes
      for (const fieldName in req.files) {
        const files = req.files[fieldName];
        const fileArray = Array.isArray(files) ? files : [files];
        
        for (const file of fileArray) {
          console.log('[Gmail Send] 📎 Ajout pièce jointe:', file.name, 'taille:', file.size);
          
          // Encoder en base64 avec chunks de 76 caractères pour RFC compliance
          const base64Data = file.data.toString('base64');
          const formattedBase64 = base64Data.match(/.{1,76}/g)?.join('\r\n') || base64Data;
          
          // Extension pour Content-Type correct
          const fileName = file.name;
          const extension = fileName.split('.').pop()?.toLowerCase();
          let contentType = file.mimetype;
          
          // Assurer le bon Content-Type selon l'extension
          if (extension === 'pdf' && !contentType.includes('pdf')) {
            contentType = 'application/pdf';
          } else if (extension === 'png' && !contentType.includes('png')) {
            contentType = 'image/png';
          } else if (extension === 'jpg' || extension === 'jpeg') {
            contentType = 'image/jpeg';
          }
          
          message += [
            `--${mainBoundary}`,
            `Content-Type: ${contentType}; name="${fileName}"`,
            `Content-Disposition: attachment; filename="${fileName}"`,
            'Content-Transfer-Encoding: base64',
            '',
            formattedBase64,
            ''
          ].join('\r\n');
        }
      }
      
      // Fermer le multipart principal
      message += `--${mainBoundary}--\r\n`;
      
    } else {
      console.log('[Gmail Send] 📝 Message simple sans pièce jointe');
      
      // Message simple HTML
      message = [
        ...headers,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        body
      ].join('\r\n');
    }

    console.log('[Gmail Send] 📝 Message MIME généré, taille:', message.length);
    console.log('[Gmail Send] 📝 Aperçu (200 premiers caractères):', message.substring(0, 200));

    // Encoder en base64 URL-safe pour Gmail
    const encodedMessage = Buffer.from(message, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('[Gmail Send] 🚀 Envoi via Gmail API...');
    console.log('[Gmail Send] 🚀 Message encodé, taille:', encodedMessage.length);
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log('[Gmail Send] ✅ Message envoyé avec succès, ID:', response.data.id);

    res.json({ 
      success: true, 
      messageId: response.data.id,
      message: 'Message envoyé avec succès'
    });

  } catch (error) {
    console.error('[Gmail] Erreur lors de l\'envoi:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'envoi',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Modifier un message (étoile, lu, etc.)
 */
export const modifyMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { id } = req.params;
    const { addLabelIds, removeLabelIds } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID du message requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const requestBody: { addLabelIds?: string[]; removeLabelIds?: string[] } = {};
    if (addLabelIds) requestBody.addLabelIds = addLabelIds;
    if (removeLabelIds) requestBody.removeLabelIds = removeLabelIds;

    await gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody
    });

    res.json({ success: true, message: 'Message modifié avec succès' });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la modification:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Déplacer un message vers la corbeille
 */
export const trashMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du message requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.trash({
      userId: 'me',
      id
    });

    res.json({ success: true, message: 'Message déplacé vers la corbeille' });

  } catch (error) {
    console.error('[Gmail] Erreur lors du déplacement vers la corbeille:', error);
    res.status(500).json({ 
      error: 'Erreur lors du déplacement vers la corbeille',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Restaurer un message de la corbeille
 */
export const untrashMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du message requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.untrash({
      userId: 'me',
      id
    });

    res.json({ success: true, message: 'Message restauré de la corbeille' });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la restauration:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la restauration',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Modifier un label
 */
export const updateLabel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { id } = req.params;
    const { name, color } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID du label requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const labelObject: {
      name?: string;
      color?: {
        textColor: string;
        backgroundColor: string;
      };
    } = {};

    if (name) labelObject.name = name;
    if (color) {
      labelObject.color = {
        textColor: '#000000',
        backgroundColor: color
      };
    }

    const response = await gmail.users.labels.update({
      userId: 'me',
      id,
      requestBody: labelObject
    });

    res.json({ 
      success: true, 
      label: response.data,
      message: 'Label modifié avec succès'
    });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la modification du label:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification du label',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Supprimer un label
 */
export const deleteLabel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du label requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.labels.delete({
      userId: 'me',
      id
    });

    res.json({ 
      success: true, 
      message: 'Label supprimé avec succès'
    });

  } catch (error) {
    console.error('[Gmail] Erreur lors de la suppression du label:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du label',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Télécharger une pièce jointe
 */
export const getAttachment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { messageId, attachmentId } = req.params;
    const { preview } = req.query; // Nouveau paramètre pour l'aperçu
    
    if (!messageId || !attachmentId) {
      return res.status(400).json({ error: 'ID du message et de la pièce jointe requis' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    // Récupérer d'abord les détails du message pour obtenir le nom et type de fichier
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId
    });

    // Trouver la pièce jointe dans le message pour obtenir ses métadonnées
    let attachmentInfo: { filename?: string; mimeType?: string } = {};
    
    const findAttachmentInParts = (parts: any[]): void => {
      for (const part of parts) {
        if (part.body?.attachmentId === attachmentId) {
          attachmentInfo = {
            filename: part.filename,
            mimeType: part.mimeType
          };
          return;
        }
        if (part.parts) {
          findAttachmentInParts(part.parts);
        }
      }
    };

    if (messageResponse.data.payload?.parts) {
      findAttachmentInParts(messageResponse.data.payload.parts);
    } else if (messageResponse.data.payload?.body?.attachmentId === attachmentId) {
      attachmentInfo = {
        filename: messageResponse.data.payload.filename,
        mimeType: messageResponse.data.payload.mimeType
      };
    }

    // Récupérer les données de la pièce jointe
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId
    });

    if (response.data.data) {
      const data = response.data.data.replace(/-/g, '+').replace(/_/g, '/');
      const buffer = Buffer.from(data, 'base64');
      
      // Déterminer le Content-Type et Content-Disposition selon le type de fichier
      let contentType = attachmentInfo.mimeType || 'application/octet-stream';
      let contentDisposition = 'attachment';
      
      const filename = attachmentInfo.filename || `attachment_${attachmentId}`;
      const fileExtension = filename.split('.').pop()?.toLowerCase();
      
      // Pour l'aperçu, utiliser 'inline' au lieu de 'attachment'
      if (preview === 'true') {
        contentDisposition = 'inline';
        
        // Ajuster le Content-Type selon l'extension si nécessaire
        if (fileExtension === 'pdf' && !contentType.includes('pdf')) {
          contentType = 'application/pdf';
        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension || '')) {
          if (fileExtension === 'png') contentType = 'image/png';
          else if (['jpg', 'jpeg'].includes(fileExtension)) contentType = 'image/jpeg';
          else if (fileExtension === 'gif') contentType = 'image/gif';
          else if (fileExtension === 'webp') contentType = 'image/webp';
        }
      }
      
      // Headers pour l'aperçu ou le téléchargement
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${contentDisposition}; filename="${filename}"`);
      
      // Headers supplémentaires pour l'aperçu (PDF et autres)
      if (preview === 'true') {
        // Permettre l'affichage dans iframe
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
        
        // Headers de cache pour l'aperçu
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Pour les PDF spécifiquement
        if (contentType === 'application/pdf') {
          res.setHeader('Accept-Ranges', 'bytes');
        }
      }
      
      console.log(`[Gmail] Serving attachment: ${filename}, Type: ${contentType}, Disposition: ${contentDisposition}`);
      res.send(buffer);
    } else {
      res.status(404).json({ error: 'Pièce jointe non trouvée' });
    }

  } catch (error) {
    console.error('[Gmail] Erreur lors du téléchargement de la pièce jointe:', error);
    res.status(500).json({ 
      error: 'Erreur lors du téléchargement de la pièce jointe',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Vide complètement la corbeille (suppression définitive de tous les emails TRASH)
 */
export const emptyTrash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const auth = await googleOAuthService.getAuthenticatedClientForOrganization(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    // Récupérer tous les messages dans la corbeille
    const trashMessages = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['TRASH']
    });

    const messages = trashMessages.data.messages || [];
    
    if (messages.length === 0) {
      return res.json({ success: true, message: 'La corbeille est déjà vide' });
    }

    // Supprimer chaque message de la corbeille définitivement
    for (const message of messages) {
      if (message.id) {
        await gmail.users.messages.delete({
          userId: 'me',
          id: message.id
        });
      }
    }

    res.json({ 
      success: true, 
      message: `${messages.length} message(s) supprimé(s) définitivement de la corbeille` 
    });

  } catch (error) {
    console.error('[Gmail] Erreur lors du vidage de la corbeille:', error);
    res.status(500).json({ 
      error: 'Erreur lors du vidage de la corbeille',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

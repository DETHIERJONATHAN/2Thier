/**
 * GMAIL CONTROLLER - VERSION CENTRALISÉE
 * 
 * Contrôleur Gmail utilisant le service d'authentification centralisé.
 * Toutes les opérations passent par le GoogleGmailService.
 */

import { Request, Response } from 'express';
import { GoogleGmailService } from '../index';

// Interface pour les fichiers Formidable
interface FormidableFile {
  name: string;
  data: Buffer;
  size: number;
  mimetype: string;
  tempFilePath?: string;
}

// Interface pour les requêtes authentifiées
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    organizationId?: string;
  };
  files?: { [fieldname: string]: FormidableFile[] }; // Compatible avec Formidable
}

/**
 * Récupère les threads Gmail
 */
export const getThreads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const { maxResults = 10, pageToken, q } = req.query;
    
    const result = await gmailService.getMessages({
      maxResults: Number(maxResults),
      pageToken: pageToken as string,
      q: q as string
    });

    // Renvoyer directement les données pour compatibilité frontend
  res.json(result);
  } catch (error) {
    console.error('[Gmail Controller] Erreur getThreads:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des threads' });
  }
};

/**
 * Récupère les messages Gmail
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const { 
      maxResults = 10, 
      pageToken, 
      q, 
      labelIds,
      mailbox // Frontend peut envoyer mailbox au lieu de labelIds
    } = req.query;

    console.log('[Gmail Controller] Paramètres reçus:', { maxResults, pageToken, q, labelIds, mailbox });

    // 🔄 CONVERSION MAILBOX -> LABELIDS (Compatibilité frontend)
    let finalLabelIds: string[] | undefined;

    if (labelIds) {
      // Si labelIds est fourni directement
      finalLabelIds = Array.isArray(labelIds) ? labelIds : [labelIds];
    } else if (mailbox) {
      // Si mailbox est fourni, convertir selon la logique métier
      const mailboxStr = mailbox as string;
      console.log(`[Gmail Controller] 📦 Conversion mailbox: ${mailboxStr}`);
      
      switch (mailboxStr.toLowerCase()) {
        case 'inbox':
          finalLabelIds = ['INBOX'];
          break;
        case 'sent':
          finalLabelIds = ['SENT'];
          break;
        case 'drafts':
        case 'draft':
          finalLabelIds = ['DRAFT'];
          break;
        case 'starred':
          // 📧 FAVORIS = Messages avec STARRED (peuvent être dans INBOX ou ailleurs)
          finalLabelIds = ['STARRED'];
          break;
        case 'trash':
          finalLabelIds = ['TRASH'];
          break;
        case 'spam':
          finalLabelIds = ['SPAM'];
          break;
        case 'all':
          // Tous les messages - pas de filtre de label
          finalLabelIds = undefined;
          break;
        default:
          // Pour les dossiers personnalisés, utiliser le nom comme labelId
          finalLabelIds = [mailboxStr];
      }
      
      console.log(`[Gmail Controller] ✅ Label final: ${finalLabelIds}`);
    }

    const result = await gmailService.getMessages({
      maxResults: Number(maxResults),
      pageToken: pageToken as string,
      q: q as string,
      labelIds: finalLabelIds
    });

    // Renvoyer directement les données pour compatibilité frontend
    res.json(result);
  } catch (error) {
    console.error('[Gmail Controller] Erreur getMessages:', error);
  res.status(500).json({ error: 'Erreur lors de la récupération des messages', details: (error as Error)?.message });
  }
};

/**
 * Récupère un message Gmail spécifique
 */
export const getMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du message manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const message = await gmailService.getMessageDetails(id);
    if (!message) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    // Renvoyer directement les données pour compatibilité frontend
    res.json(message);
  } catch (error) {
    console.error('[Gmail Controller] Erreur getMessage:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du message' });
  }
};

/**
 * Envoie un message Gmail (avec support des pièces jointes)
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  console.log('[Gmail Controller] 🚀🚀🚀 === DÉBUT SENDMESSAGE - CONTRÔLEUR ATTEINT (FORMIDABLE) ===');
  console.log('[Gmail Controller] 🎯 Timestamp:', new Date().toISOString());
  
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    console.log('[Gmail Controller] 📋 Organization ID reçu:', organizationId);
    
    if (!organizationId) {
      console.log('[Gmail Controller] ❌ Organization ID manquant');
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    console.log('[Gmail Controller] 🔍 === ANALYSE DES DONNÉES REÇUES (FORMIDABLE) ===');
    console.log('[Gmail Controller] 🔍 RAW req.body:', JSON.stringify(req.body, null, 2));
    console.log('[Gmail Controller] 🔍 Type de req.body:', typeof req.body);
    console.log('[Gmail Controller] 🔍 Clés dans req.body:', Object.keys(req.body || {}));
    console.log('[Gmail Controller] 🔍 RAW req.files:', req.files);
    console.log('[Gmail Controller] 🔍 Type de req.files:', typeof req.files);
    
    if (req.files && typeof req.files === 'object') {
      console.log('[Gmail Controller] 🔍 Clés dans req.files:', Object.keys(req.files));
      if ('attachments' in req.files) {
        const attachments = req.files['attachments'];
        console.log('[Gmail Controller] 🔍 Attachments trouvés:', Array.isArray(attachments) ? attachments.length : 1);
        if (Array.isArray(attachments)) {
          attachments.forEach((file, index) => {
            console.log('[Gmail Controller] 📎 Fichier', index + 1, ':', {
              name: file.name,
              size: file.size,
              mimetype: file.mimetype
            });
          });
        } else {
          console.log('[Gmail Controller] 📎 Fichier unique:', {
            name: attachments.name,
            size: attachments.size,
            mimetype: attachments.mimetype
          });
        }
      }
    }

    // Extraire les champs du FormData - avec Formidable, les champs sont directement dans req.body
    const to = req.body.to;
    const subject = req.body.subject;
    const body = req.body.body || '';
    // isHtml peut être boolean (JSON) ou string (FormData)
    const isHtml = req.body.isHtml === true || req.body.isHtml === 'true';
    const cc = req.body.cc;
    const bcc = req.body.bcc;
    const fromName = req.body.fromName; // 🆕 Nouveau paramètre pour nom professionnel

    console.log('[Gmail Controller] 📧 Données extraites:', { 
      to, 
      subject, 
      body: body?.substring(0, 100), 
      isHtml,
      isHtmlRaw: req.body.isHtml,
      cc, 
      bcc, 
      fromName: fromName || 'Par défaut: 2Thier CRM' 
    });
    
    // Validation des champs obligatoires
    if (!to || !subject) {
      console.log('[Gmail Controller] ❌ Champs obligatoires manquants:', { to, subject });
      return res.status(400).json({ error: 'Destinataire et sujet requis' });
    }

    console.log('[Gmail Controller] 📤 Envoi email avec', req.files ? Object.keys(req.files) : 'aucun', 'fichiers');
    console.log('[Gmail Controller] 📧 Destinataire:', to, 'Sujet:', subject);

    console.log('[Gmail Controller]  Création du service Gmail...');
    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      console.log('[Gmail Controller] ❌ Impossible de créer le service Gmail');
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }
    console.log('[Gmail Controller] ✅ Service Gmail créé avec succès');

    // Extraire les attachments - avec Formidable, les fichiers sont dans req.files
    let attachments: FormidableFile[] = [];
    if (req.files && typeof req.files === 'object' && 'attachments' in req.files) {
      const files = req.files['attachments'];
      attachments = Array.isArray(files) ? files : [files];
    }

    console.log('[Gmail Controller] 📎 Nombre de pièces jointes traitées:', attachments.length);
    if (attachments.length > 0) {
      console.log('[Gmail Controller] 📎 Détails des pièces jointes:', attachments.map(f => ({
        filename: f.name,
        size: f.size,
        mimetype: f.mimetype
      })));
    }

    // Préparer les données d'envoi - VERSION PROFESSIONNELLE ANTI-SPAM
    const emailData = {
      to,
      subject,
      body: body || '',
      isHtml: isHtml || false,
      cc,
      bcc,
      fromName: fromName || '2Thier CRM', // 🆕 Nom professionnel par défaut
      attachments: attachments.length > 0 ? attachments.map(file => ({
        filename: file.name,
        content: file.data, // Formidable utilise 'data' au lieu de 'buffer'
        mimeType: file.mimetype
      })) : undefined
    };

    console.log('[Gmail Controller] 📎 Données email préparées (VERSION ANTI-SPAM):', {
      to: emailData.to,
      subject: emailData.subject,
      fromName: emailData.fromName,
      attachments: emailData.attachments?.length || 0
    });

    console.log('[Gmail Controller] 🚀 Appel gmailService.sendEmail...');
    const result = await gmailService.sendEmail(emailData);

    if (!result) {
      console.log('[Gmail Controller] ❌ Aucun résultat de sendEmail');
      return res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }

    console.log('[Gmail Controller] ✅ Email envoyé avec succès:', result);

    res.json({
      success: true,
      message: 'Email envoyé avec succès',
      data: result
    });
    console.log('[Gmail Controller] ✅ Réponse envoyée au client');
  } catch (error) {
    console.error('[Gmail Controller] ❌❌❌ ERREUR COMPLÈTE sendMessage:', error);
    console.error('[Gmail Controller] ❌ Type erreur:', typeof error);
    console.error('[Gmail Controller] ❌ Message erreur:', (error as Error)?.message);
    console.error('[Gmail Controller] ❌ Stack trace:', (error as Error)?.stack);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
};

/**
 * Modifie un message Gmail (marquer comme lu, étoile, etc.)
 */
export const modifyMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    const { action, addLabelIds, removeLabelIds } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID du message manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    let result = false;

    // Si on a addLabelIds ou removeLabelIds, on utilise la logique de modification de labels
    if (addLabelIds || removeLabelIds) {
      console.log('[Gmail Controller] Modification des labels:', { addLabelIds, removeLabelIds });
      
      // Gérer les favoris spécialement
      if (addLabelIds && addLabelIds.includes('STARRED')) {
        result = await gmailService.markAsStarred(id, true);
      } else if (removeLabelIds && removeLabelIds.includes('STARRED')) {
        result = await gmailService.markAsStarred(id, false);
      } else {
        // Pour les autres labels, utiliser la méthode générale
        result = await gmailService.modifyLabels(id, addLabelIds || [], removeLabelIds || []);
      }
    } 
    // Sinon, utiliser l'ancienne logique avec action
    else if (action) {
      switch (action) {
        case 'markAsRead':
          result = await gmailService.markAsRead(id, true);
          break;
        case 'markAsUnread':
          result = await gmailService.markAsRead(id, false);
          break;
        default:
          return res.status(400).json({ error: 'Action non supportée' });
      }
    } else {
      return res.status(400).json({ error: 'Action ou modification de labels requis' });
    }

    res.json({
      success: result,
      message: result ? 'Message modifié avec succès' : 'Erreur lors de la modification'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur modifyMessage:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du message' });
  }
};

/**
 * Supprime un message Gmail
 */
export const deleteMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du message manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.deleteMessage(id);

    res.json({
      success: result,
      message: result ? 'Message supprimé avec succès' : 'Erreur lors de la suppression'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur deleteMessage:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du message' });
  }
};

/**
 * Récupère les labels Gmail
 */
export const getLabels = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const labels = await gmailService.getLabels();

    // Renvoyer directement les données pour compatibilité frontend
    res.json(labels);
  } catch (error) {
    console.error('[Gmail Controller] Erreur getLabels:', error);
  res.status(500).json({ error: 'Erreur lors de la récupération des labels', details: (error as Error)?.message });
  }
};

// Fonctions temporaires pour maintenir la compatibilité avec l'ancien système
export const trashMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du message manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    // Utiliser la vraie fonction de mise à la corbeille
    const result = await gmailService.trashMessage(id);

    res.json({
      success: result,
      message: result ? 'Message déplacé vers la corbeille avec succès' : 'Erreur lors de la suppression'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur trashMessage:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du message' });
  }
};

export const untrashMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du message manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.untrashMessage(id);

    res.json({
      success: result,
      message: result ? 'Message restauré de la corbeille avec succès' : 'Erreur lors de la restauration'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur untrashMessage:', error);
    res.status(500).json({ error: 'Erreur lors de la restauration du message' });
  }
};

/**
 * Vide complètement la corbeille (suppression définitive de tous les emails TRASH)
 */
export const emptyTrash = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.emptyTrash();

    res.json({
      success: result,
      message: result ? 'Corbeille vidée avec succès' : 'Erreur lors du vidage de la corbeille'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur emptyTrash:', error);
    res.status(500).json({ error: 'Erreur lors du vidage de la corbeille' });
  }
};

export const createLabel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nom du label requis' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const label = await gmailService.createLabel(name);
    if (!label) {
      return res.status(500).json({ error: 'Erreur lors de la création du label' });
    }

    res.json({
      success: true,
      data: label
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur createLabel:', error);
    res.status(500).json({ error: 'Erreur lors de la création du label' });
  }
};

export const updateLabel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    const { name } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ error: 'ID et nom du label requis' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.updateLabel(id, name);

    res.json({
      success: result,
      message: result ? 'Label modifié avec succès' : 'Erreur lors de la modification'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur updateLabel:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du label' });
  }
};

export const deleteLabel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du label manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.deleteLabel(id);

    res.json({
      success: result,
      message: result ? 'Label supprimé avec succès' : 'Erreur lors de la suppression'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur deleteLabel:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du label' });
  }
};

export const getAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Essayer de récupérer l'organization ID de plusieurs sources
  let organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    
    // Si pas trouvé dans headers, essayer depuis req.user (système ancien)
    if (!organizationId && req.user?.organizationId) {
      organizationId = req.user.organizationId;
    }
    
    // Fallback: retourner une erreur si aucune organisation trouvée
    if (!organizationId) {
      console.log('[Gmail Controller] ❌ Aucune organisation trouvée pour l\'utilisateur');
      return res.status(400).json({ 
        error: 'Organization ID manquant',
        message: 'Impossible de déterminer l\'organisation de l\'utilisateur'
      });
    }

    const { messageId, attachmentId } = req.params;
    const { preview } = req.query;

    if (!messageId || !attachmentId) {
      return res.status(400).json({ error: 'Message ID et Attachment ID requis' });
    }

    console.log(`[Gmail Controller] 📎 Récupération pièce jointe: ${attachmentId} du message: ${messageId}`);
    console.log(`[Gmail Controller] 🏢 Organization ID utilisé: ${organizationId}`);

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const attachment = await gmailService.getAttachment(messageId, attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Pièce jointe non trouvée' });
    }

    // Déterminer le Content-Type et Content-Disposition selon le type de fichier
    let contentType = attachment.mimeType;
    let contentDisposition = 'attachment';
    
    const filename = attachment.filename;
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
    
    console.log(`[Gmail Controller] ✅ Serving attachment: ${filename}, Type: ${contentType}, Disposition: ${contentDisposition}`);
    res.send(attachment.data);
    
  } catch (error) {
    console.error('[Gmail Controller] Erreur getAttachment:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de la pièce jointe',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Récupère tous les brouillons
 */
export const getDrafts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.getDrafts();
    res.json(result);
  } catch (error) {
    console.error('[Gmail Controller] Erreur getDrafts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des brouillons' });
  }
};

/**
 * Sauvegarde un email en brouillon (création ou mise à jour)
 */
export const saveDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { to, subject, body, isHtml, cc, bcc, draftId } = req.body;
    
    if (!to || !subject) {
      return res.status(400).json({ error: 'Destinataire et sujet requis' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.saveDraft({
      to,
      subject,
      body: body || '',
      isHtml: isHtml || false,
      cc,
      bcc,
      draftId // Pour mise à jour d'un brouillon existant
    });

    if (result) {
      res.json({
        success: true,
        message: draftId ? 'Brouillon mis à jour avec succès' : 'Brouillon sauvegardé avec succès',
        data: result
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Erreur lors de la sauvegarde du brouillon' 
      });
    }
  } catch (error) {
    console.error('[Gmail Controller] Erreur saveDraft:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du brouillon' });
  }
};

/**
 * Supprime un brouillon
 */
export const deleteDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du brouillon manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.deleteDraft(id);

    res.json({
      success: result,
      message: result ? 'Brouillon supprimé avec succès' : 'Erreur lors de la suppression'
    });
  } catch (error) {
    console.error('[Gmail Controller] Erreur deleteDraft:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du brouillon' });
  }
};

/**
 * Envoie un brouillon
 */
export const sendDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID manquant dans la requête' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID du brouillon manquant' });
    }

    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    if (!gmailService) {
      return res.status(401).json({ error: 'Google non connecté pour cette organisation' });
    }

    const result = await gmailService.sendDraft(id);

    if (result) {
      res.json({
        success: true,
        message: 'Brouillon envoyé avec succès',
        data: result
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Erreur lors de l\'envoi du brouillon' 
      });
    }
  } catch (error) {
    console.error('[Gmail Controller] Erreur sendDraft:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du brouillon' });
  }
};

// Petit endpoint de santé pour diagnostiquer les 500 rapidement
export const health = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = (req.headers['x-organization-id'] as string) || req.user?.organizationId;
    if (!organizationId) {
      return res.status(200).json({ ok: false, reason: 'organizationId manquant' });
    }
    const gmailService = await GoogleGmailService.create(organizationId, req.user?.id || req.user?.userId);
    return res.status(200).json({ ok: !!gmailService });
  } catch (e) {
    return res.status(200).json({ ok: false, reason: (e as Error)?.message });
  }
};

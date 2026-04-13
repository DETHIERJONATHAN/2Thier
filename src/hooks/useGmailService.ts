import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useState, useCallback, useMemo, useRef } from 'react';
import { logger } from '../lib/logger';

// Interface pour les pièces jointes
export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

// Interface pour les messages formatés par le backend
export interface FormattedGmailMessage {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  labels: string[];
  htmlBody?: string;
}

// Interface pour les messages bruts Gmail (si nécessaire)
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    body: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: Array<{
      partId: string;
      mimeType: string;
      filename: string;
      headers: Array<{ name: string; value: string; }>;
      body: { size: number; data?: string; };
    }>;
  };
  sizeEstimate: number;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility: string;
  labelListVisibility: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface GmailDraft {
  id: string;
  message: GmailMessage;
}

export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
  threadId?: string;
  replyTo?: string;
}

export const useGmailService = () => {
  const { api } = useAuthenticatedApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Utiliser useRef pour maintenir une référence stable à l'API
  const apiRef = useRef(api);
  // Mettre à jour la référence quand l'API change, sans provoquer de re-render
  apiRef.current = api;

  // Fonction utilitaire stable qui utilise toujours la dernière version de l'API
  const handleApiCall = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    logger.debug('[useGmailService] 🔄 handleApiCall - DEBUT');
    setIsLoading(true);
    setError(null);
    try {
      logger.debug('[useGmailService] 🔄 handleApiCall - Exécution de l\'appel API...');
      const result = await apiCall();
      logger.debug('[useGmailService] ✅ handleApiCall - Résultat reçu:', result);
      logger.debug('[useGmailService] ✅ handleApiCall - Type du résultat:', typeof result);
      return result;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      logger.error('[Gmail Service] ❌ Erreur API dans handleApiCall:', error);
      setError(error.response?.data?.message || error.message || 'Erreur inconnue');
      return null;
    } finally {
      logger.debug('[useGmailService] 🔄 handleApiCall - FIN');
      setIsLoading(false);
    }
  }, []); // Pas de dépendances = fonction stable

  // Maintenant toutes les fonctions n'ont comme dépendance que handleApiCall qui est stable
  const getMessages = useCallback(async (params: {
    labelIds?: string[];
    q?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}) => {
    return handleApiCall(async () => {
      logger.debug('[useGmailService] ========================================');
      logger.debug('[useGmailService] 📤 FRONTEND REQUEST - getMessages');
      logger.debug('[useGmailService] Input params:', params);
      logger.debug('[useGmailService] ========================================');
      
      // Adapter les paramètres pour correspondre à l'API du serveur
      const serverParams: Record<string, string | number> = {
        maxResults: params.maxResults || 20,
      };
      
      // Le serveur attend 'mailbox' au lieu de 'labelIds'
      if (params.labelIds && params.labelIds.length > 0) {
        const labelId = params.labelIds[0];
        logger.debug('[useGmailService] 🏷️ Converting labelId:', labelId);
        // Mapper les labels Gmail vers les noms attendus par le serveur
        switch (labelId) {
          case 'INBOX':
            serverParams.mailbox = 'inbox';
            logger.debug('[useGmailService] ✅ INBOX -> inbox');
            break;
          case 'SENT':
            serverParams.mailbox = 'sent';
            logger.debug('[useGmailService] ✅ SENT -> sent');
            break;
          case 'DRAFT':
            serverParams.mailbox = 'drafts'; // ⚠️ CORRECTION: 'drafts' au lieu de 'draft'
            logger.debug('[useGmailService] ✅ DRAFT -> drafts');
            break;
          case 'STARRED':
            serverParams.mailbox = 'starred';
            logger.debug('[useGmailService] ✅ STARRED -> starred');
            break;
          case 'TRASH':
            serverParams.mailbox = 'trash';
            logger.debug('[useGmailService] ✅ TRASH -> trash');
            break;
          case 'SPAM':
            serverParams.mailbox = 'spam';
            logger.debug('[useGmailService] ✅ SPAM -> spam');
            break;
          default:
            // Pour les labels personnalisés, utiliser l'ID du label directement
            serverParams.mailbox = labelId;
            logger.debug('[useGmailService] ✅ CUSTOM:', labelId, '-> custom label');
        }
      } else {
        serverParams.mailbox = 'inbox'; // Par défaut
        logger.debug('[useGmailService] ⚠️ No labelIds, defaulting to inbox');
      }
      
      if (params.q) {
        serverParams.q = params.q;
      }
      
      if (params.pageToken) {
        serverParams.pageToken = params.pageToken;
      }
      
      logger.debug('[useGmailService] � FINAL SERVER PARAMS:', serverParams);
      logger.debug('[useGmailService] 📡 Making API call to /api/gmail/messages...');
      const response = await apiRef.current.get('/api/gmail/messages', { params: serverParams });
      logger.debug('[useGmailService] � API RESPONSE received:', response);
      logger.debug('[useGmailService] ========================================');
      return response;
    });
  }, [handleApiCall]);

  const getMessage = useCallback(async (messageId: string, format: string = 'full') => {
    return handleApiCall(async () => {
      const response = await apiRef.current.get(`/api/gmail/messages/${messageId}`, {
        params: { format }
      });
      return response;
    });
  }, [handleApiCall]);

  const modifyMessage = useCallback(async (messageId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) => {
    return handleApiCall(() => 
      apiRef.current.post(`/api/gmail/messages/${messageId}/modify`, { addLabelIds, removeLabelIds })
    );
  }, [handleApiCall]);

  const trashMessage = useCallback(async (messageId: string) => {
    return handleApiCall(() => apiRef.current.post(`/api/gmail/messages/${messageId}/trash`));
  }, [handleApiCall]);

  const untrashMessage = useCallback(async (messageId: string) => {
    return handleApiCall(() => apiRef.current.post(`/api/gmail/messages/${messageId}/untrash`));
  }, [handleApiCall]);

  const deleteMessage = useCallback(async (messageId: string) => {
    return handleApiCall(() => apiRef.current.delete(`/api/gmail/messages/${messageId}`));
  }, [handleApiCall]);

  const emptyTrash = useCallback(async () => {
    return handleApiCall(() => apiRef.current.post('/api/gmail/trash/empty'));
  }, [handleApiCall]);

  const addLabel = useCallback(async (messageId: string, labelId: string) => {
    return handleApiCall(() => 
      apiRef.current.post(`/api/gmail/messages/${messageId}/modify`, { 
        addLabelIds: [labelId], 
        removeLabelIds: [] 
      })
    );
  }, [handleApiCall]);

  const removeLabel = useCallback(async (messageId: string, labelId: string) => {
    return handleApiCall(() => 
      apiRef.current.post(`/api/gmail/messages/${messageId}/modify`, { 
        addLabelIds: [], 
        removeLabelIds: [labelId] 
      })
    );
  }, [handleApiCall]);

  const getLabels = useCallback(async () => {
    return handleApiCall(async () => {
      const response = await apiRef.current.get('/api/gmail/labels');
      return response;
    });
  }, [handleApiCall]);

  const createLabel = useCallback(async (name: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post('/api/gmail/labels', { name });
      return response;
    });
  }, [handleApiCall]);

  const updateLabel = useCallback(async (labelId: string, name: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.put(`/api/gmail/labels/${labelId}`, { name });
      return response;
    });
  }, [handleApiCall]);

  const deleteLabel = useCallback(async (labelId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.delete(`/api/gmail/labels/${labelId}`);
      return response;
    });
  }, [handleApiCall]);

  const getAttachment = useCallback(async (messageId: string, attachmentId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.get(`/api/gmail/messages/${messageId}/attachments/${attachmentId}`, {
        responseType: 'blob' // Important pour les fichiers binaires
      });
      return response;
    });
  }, [handleApiCall]);

  const downloadAttachment = useCallback(async (messageId: string, attachmentId: string, fallbackFilename: string) => {
    try {
      const response = await fetch(`${window.location.origin}/api/gmail/messages/${messageId}/attachments/${encodeURIComponent(attachmentId)}`, {
        credentials: 'include',
        headers: {
          'x-organization-id': localStorage.getItem('organizationId') || '',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erreur téléchargement: ${response.status}`);
      }
      
      // Extraire le vrai nom de fichier depuis Content-Disposition du backend
      let filename = fallbackFilename;
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"\n;]+)"?/i);
        if (match && match[1]) {
          filename = match[1].trim();
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('Erreur téléchargement pièce jointe:', error);
      throw error;
    }
  }, []);

  const sendMessage = useCallback(async (emailData: SendEmailRequest) => {
    return handleApiCall(async () => {
      // Si il y a des pièces jointes, utiliser FormData
      if (emailData.attachments && emailData.attachments.length > 0) {
        logger.debug('[useGmailService] 📎 Envoi avec pièces jointes:', emailData.attachments.length);
        
        const formData = new FormData();
        
        // Ajouter les données de l'email
        formData.append('to', Array.isArray(emailData.to) ? emailData.to.join(',') : emailData.to.toString());
        if (emailData.cc) formData.append('cc', Array.isArray(emailData.cc) ? emailData.cc.join(',') : emailData.cc.toString());
        if (emailData.bcc) formData.append('bcc', Array.isArray(emailData.bcc) ? emailData.bcc.join(',') : emailData.bcc.toString());
        formData.append('subject', emailData.subject);
        formData.append('body', emailData.body);
        
        // Ajouter les fichiers
        emailData.attachments.forEach((file) => {
          logger.debug('[useGmailService] 📎 Ajout fichier:', file.name, 'taille:', file.size);
          // IMPORTANT: le backend (Formidable) s'attend au champ "attachments"
          formData.append('attachments', file, file.name);
        });
        
        logger.debug('[useGmailService] 📎 FormData préparé, envoi...');
        
        // Utiliser une approche différente pour FormData
        const response = await fetch(`${window.location.origin}/api/gmail/messages/send`, {
          method: 'POST',
          body: formData,
          credentials: 'include', // Pour inclure les cookies d'auth
          headers: {
            // Ne pas définir Content-Type, le navigateur le fera automatiquement avec boundary
            'x-organization-id': localStorage.getItem('organizationId') || '',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } else {
        // Envoi standard sans pièces jointes
        logger.debug('[useGmailService] 📧 Envoi sans pièces jointes');
        const response = await apiRef.current.post('/api/gmail/messages/send', emailData);
        return response;
      }
    });
  }, [handleApiCall]);

  // Maintenant l'objet retourné est vraiment stable car toutes les fonctions le sont
  return useMemo(() => ({
    isLoading,
    error,
    getMessages,
    getMessage,
    sendMessage,
    modifyMessage,
    trashMessage,
    untrashMessage,
    deleteMessage,
    emptyTrash,
    addLabel,
    removeLabel,
    getLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    getAttachment,
    downloadAttachment,
  }), [isLoading, error, getMessages, getMessage, sendMessage, modifyMessage, trashMessage, untrashMessage, deleteMessage, emptyTrash, addLabel, removeLabel, getLabels, createLabel, updateLabel, deleteLabel, getAttachment, downloadAttachment]);
};

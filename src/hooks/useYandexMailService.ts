/**
 * ============================================================
 *  HOOK: useYandexMailService
 * ============================================================
 *
 *  Hook React qui fournit toutes les opérations de messagerie
 *  Yandex, en miroir de useGmailService pour Gmail.
 *
 *  Les emails Yandex sont stockés dans la DB après synchronisation
 *  IMAP, donc les lectures sont rapides (pas d'appel IMAP à chaque fois).
 *
 *  Ce hook implémente la même interface que useGmailService afin que
 *  la page de mail unifiée puisse utiliser l'un ou l'autre sans
 *  modifier son code.
 *
 *  Dépendances :
 *    - useAuthenticatedApi (hook authentifié)
 *    - Backend: /api/yandex/* (routes yandex-mail.ts)
 * ============================================================
 */

import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useState, useCallback, useMemo, useRef } from 'react';
import type { FormattedGmailMessage, GmailLabel } from './useGmailService';

/**
 * Données nécessaires pour envoyer un email via Yandex.
 */
export interface YandexSendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export const useYandexMailService = () => {
  const { api } = useAuthenticatedApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Référence stable à l'API pour éviter les re-renders
  const apiRef = useRef(api);
  apiRef.current = api;

  // ─── Utilitaire générique pour les appels API avec gestion d'erreurs ───
  const handleApiCall = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Erreur inconnue';
      console.error('[useYandexMailService] ❌ Erreur API:', errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Mapper les labels Gmail vers les dossiers Yandex ───
  const mapLabelToFolder = (labelId: string): string => {
    const map: Record<string, string> = {
      'INBOX':   'inbox',
      'SENT':    'sent',
      'DRAFT':   'drafts',
      'STARRED': 'starred',
      'TRASH':   'trash',
      'SPAM':    'spam',
    };
    return map[labelId] || labelId.toLowerCase();
  };

  // ─────────────────────────────────────────────────────────────
  // getMessages : Récupère les emails depuis la DB via le backend
  //  Compatible avec l'interface de useGmailService
  // ─────────────────────────────────────────────────────────────
  const getMessages = useCallback(async (params: {
    labelIds?: string[];
    q?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}) => {
    return handleApiCall(async () => {
      const folder = params.labelIds?.[0] ? mapLabelToFolder(params.labelIds[0]) : 'inbox';
      const page = params.pageToken ? parseInt(params.pageToken, 10) : 1;

      const response = await apiRef.current.get('/api/yandex/emails', {
        params: {
          folder,
          maxResults: params.maxResults || 25,
          page,
          q: params.q || undefined,
        }
      });

      // Normaliser la réponse pour qu'elle soit identique à celle de Gmail
      const data = response?.data || response;
      const messages: FormattedGmailMessage[] = data?.messages || [];
      const hasMore = data?.hasMore || false;
      const nextPage = hasMore ? (page + 1).toString() : '';

      return {
        data: messages,
        nextPageToken: nextPage,
      };
    });
  }, [handleApiCall]);

  // ─────────────────────────────────────────────────────────────
  // getMessage : Récupère un email unique par ID
  // ─────────────────────────────────────────────────────────────
  const getMessage = useCallback(async (messageId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.get(`/api/yandex/emails/${messageId}`);
      const email = response?.data || response;

      // Transformer en format GmailMessage pour compatibilité
      return {
        id: email.id,
        threadId: email.id,
        labelIds: [email.folder?.toUpperCase() || 'INBOX'],
        snippet: email.body?.substring(0, 200)?.replace(/<[^>]*>/g, '') || '',
        historyId: '',
        internalDate: new Date(email.createdAt).getTime().toString(),
        payload: {
          partId: '0',
          mimeType: email.contentType || 'text/plain',
          filename: '',
          headers: [
            { name: 'From', value: email.from || '' },
            { name: 'To', value: email.to || '' },
            { name: 'Subject', value: email.subject || '' },
            { name: 'Date', value: new Date(email.createdAt).toUTCString() },
          ],
          body: {
            size: email.body?.length || 0,
            // Encoder le body en base64 URL-safe comme Gmail le fait
            data: email.body ? btoa(unescape(encodeURIComponent(email.body)))
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '',
          },
        },
        sizeEstimate: email.body?.length || 0,
      };
    });
  }, [handleApiCall]);

  // ─────────────────────────────────────────────────────────────
  // sendMessage : Envoie un email via Yandex SMTP
  // ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[]
  ) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post('/api/yandex/send', {
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        body,
        isHtml: body.includes('<') && body.includes('>'), // Auto-détection HTML
        cc: cc?.join(','),
        bcc: bcc?.join(','),
      });
      return response;
    });
  }, [handleApiCall]);

  // ─────────────────────────────────────────────────────────────
  // syncEmails : Déclenche une synchronisation IMAP
  // ─────────────────────────────────────────────────────────────
  const syncEmails = useCallback(async (folder: string = 'INBOX') => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post('/api/yandex/sync', null, {
        params: { folder }
      });
      return response;
    });
  }, [handleApiCall]);

  // ─────────────────────────────────────────────────────────────
  // deleteMessage : Supprime un email (déplace dans corbeille)
  // ─────────────────────────────────────────────────────────────
  const deleteMessage = useCallback(async (messageId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.delete(`/api/yandex/emails/${messageId}`);
      return response;
    });
  }, [handleApiCall]);

  // ─────────────────────────────────────────────────────────────
  // toggleStar : Toggle le favori sur un email
  // ─────────────────────────────────────────────────────────────
  const toggleStar = useCallback(async (messageId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post(`/api/yandex/emails/${messageId}/star`);
      return response;
    });
  }, [handleApiCall]);

  // ─────────────────────────────────────────────────────────────
  // getLabels : Retourne les dossiers disponibles (format GmailLabel)
  // ─────────────────────────────────────────────────────────────
  const getLabels = useCallback(async () => {
    return handleApiCall(async () => {
      const response = await apiRef.current.get('/api/yandex/folders');
      const folders = response?.data || response || [];

      // Transformer en format GmailLabel pour compatibilité
      return (Array.isArray(folders) ? folders : []).map((f: { id: string; name: string; type: string; messagesUnread?: number }) => ({
        id: f.id,
        name: f.name,
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow',
        type: f.type,
        messagesUnread: f.messagesUnread || 0,
      })) as GmailLabel[];
    });
  }, [handleApiCall]);

  // ─────────────────────────────────────────────────────────────
  // testConnection : Teste la connexion Yandex
  // ─────────────────────────────────────────────────────────────
  const testConnection = useCallback(async () => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post('/api/yandex/test');
      return response;
    });
  }, [handleApiCall]);

  // ─── Fonctions non supportées (no-op pour compatibilité) ───
  const modifyMessage = useCallback(async () => null, []);
  const trashMessage = useCallback(async (messageId: string) => deleteMessage(messageId), [deleteMessage]);
  const untrashMessage = useCallback(async () => null, []);
  const emptyTrash = useCallback(async () => null, []);
  const addLabel = useCallback(async () => null, []);
  const removeLabel = useCallback(async () => null, []);
  const createLabel = useCallback(async () => null, []);
  const updateLabel = useCallback(async () => null, []);
  const deleteLabel = useCallback(async () => null, []);
  const getAttachment = useCallback(async () => null, []);
  const downloadAttachment = useCallback(async () => { /* non supporté Yandex */ }, []);

  // L'objet retourné est stable grâce à useMemo
  return useMemo(() => ({
    // ─── État ───
    isLoading,
    error,

    // ─── Opérations email (compatibles avec useGmailService) ───
    getMessages,
    getMessage,
    sendMessage,
    deleteMessage,
    getLabels,

    // ─── Opérations spécifiques Yandex ───
    syncEmails,
    toggleStar,
    testConnection,

    // ─── Compatibilité avec l'interface useGmailService ───
    modifyMessage,
    trashMessage,
    untrashMessage,
    emptyTrash,
    addLabel,
    removeLabel,
    createLabel,
    updateLabel,
    deleteLabel,
    getAttachment,
    downloadAttachment,
  }), [
    isLoading, error, getMessages, getMessage, sendMessage, deleteMessage,
    getLabels, syncEmails, toggleStar, testConnection,
    modifyMessage, trashMessage, untrashMessage, emptyTrash,
    addLabel, removeLabel, createLabel, updateLabel, deleteLabel,
    getAttachment, downloadAttachment
  ]);
};

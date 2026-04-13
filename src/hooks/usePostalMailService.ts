/**
 * ============================================================
 *  HOOK: usePostalMailService
 * ============================================================
 *
 *  Hook React pour la messagerie Postal (self-hosted @zhiive.com).
 *  Implémente la même interface que useGmailService et
 *  useYandexMailService pour compatibilité avec UnifiedMailPage.
 *
 *  Les emails Postal sont reçus via webhook (temps réel) et
 *  stockés en DB — les lectures sont donc instantanées.
 *
 *  Dépendances :
 *    - useAuthenticatedApi (hook authentifié)
 *    - Backend: /api/postal/* (routes postal-mail.ts)
 * ============================================================
 */

import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useState, useCallback, useMemo, useRef } from 'react';
import type { FormattedGmailMessage, GmailLabel } from './useGmailService';
import { logger } from '../lib/logger';

export const usePostalMailService = () => {
  const { api } = useAuthenticatedApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiRef = useRef(api);
  apiRef.current = api;

  const handleApiCall = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Erreur inconnue';
      logger.error('[usePostalMailService] ❌ Erreur API:', errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // ─── getMessages ─────────────────────────────────────────
  const getMessages = useCallback(async (params: {
    labelIds?: string[];
    q?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}) => {
    return handleApiCall(async () => {
      const folder = params.labelIds?.[0] ? mapLabelToFolder(params.labelIds[0]) : 'inbox';
      const page = params.pageToken ? parseInt(params.pageToken, 10) : 1;

      const response = await apiRef.current.get('/api/postal/emails', {
        params: {
          folder,
          maxResults: params.maxResults || 25,
          page,
          q: params.q || undefined,
        }
      });

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

  // ─── getMessage ──────────────────────────────────────────
  const getMessage = useCallback(async (messageId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.get(`/api/postal/emails/${messageId}`);
      const email = response?.data || response;

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
            data: email.body ? btoa(unescape(encodeURIComponent(email.body)))
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '',
          },
        },
        sizeEstimate: email.body?.length || 0,
      };
    });
  }, [handleApiCall]);

  // ─── sendMessage ─────────────────────────────────────────
  const sendMessage = useCallback(async (
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[]
  ) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post('/api/postal/send', {
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        body,
        isHtml: body.includes('<') && body.includes('>'),
        cc: cc?.join(','),
        bcc: bcc?.join(','),
      });
      return response;
    });
  }, [handleApiCall]);

  // ─── syncEmails (no-op: Postal reçoit via webhook) ──────
  const syncEmails = useCallback(async (_folder: string = 'INBOX') => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post('/api/postal/sync');
      return response;
    });
  }, [handleApiCall]);

  // ─── deleteMessage ───────────────────────────────────────
  const deleteMessage = useCallback(async (messageId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.delete(`/api/postal/emails/${messageId}`);
      return response;
    });
  }, [handleApiCall]);

  // ─── toggleStar ──────────────────────────────────────────
  const toggleStar = useCallback(async (messageId: string) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post(`/api/postal/emails/${messageId}/star`);
      return response;
    });
  }, [handleApiCall]);

  // ─── getLabels (folders) ─────────────────────────────────
  const getLabels = useCallback(async () => {
    return handleApiCall(async () => {
      const response = await apiRef.current.get('/api/postal/folders');
      const folders = response?.data || response || [];

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

  // ─── testConnection ──────────────────────────────────────
  const testConnection = useCallback(async () => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post('/api/postal/test');
      return response;
    });
  }, [handleApiCall]);

  // ─── Stubs pour compatibilité avec l'interface Gmail ─────
  const modifyMessage = useCallback(async () => null, []);
  const trashMessage = useCallback(async (messageId: string) => deleteMessage(messageId), [deleteMessage]);
  const untrashMessage = useCallback(async () => null, []);
  const emptyTrash = useCallback(async () => null, []);

  // ─── markRead ────────────────────────────────────────────
  const markRead = useCallback(async (messageId: string, isRead: boolean) => {
    return handleApiCall(async () => {
      const response = await apiRef.current.post(`/api/postal/emails/${messageId}/read`, { isRead });
      return response;
    });
  }, [handleApiCall]);
  const addLabel = useCallback(async () => null, []);
  const removeLabel = useCallback(async () => null, []);
  const createLabel = useCallback(async () => null, []);
  const updateLabel = useCallback(async () => null, []);
  const deleteLabel = useCallback(async () => null, []);
  const getAttachment = useCallback(async () => null, []);
  const downloadAttachment = useCallback(async () => { /* non supporté */ }, []);

  return useMemo(() => ({
    isLoading,
    error,
    getMessages,
    getMessage,
    sendMessage,
    deleteMessage,
    getLabels,
    syncEmails,
    toggleStar,
    markRead,
    testConnection,
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
    getLabels, syncEmails, toggleStar, markRead, testConnection,
    modifyMessage, trashMessage, untrashMessage, emptyTrash,
    addLabel, removeLabel, createLabel, updateLabel, deleteLabel,
    getAttachment, downloadAttachment
  ]);
};

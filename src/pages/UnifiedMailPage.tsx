/**
 * ============================================================
 *  PAGE UNIFIÉE DE MESSAGERIE — Gmail & Yandex
 * ============================================================
 *
 *  Interface de messagerie complète, inspirée du design Gmail.
 *  Détection automatique du provider (Gmail / Yandex).
 *
 *  Fonctionnalités :
 *    ✅ Sidebar permanente (desktop) / drawer (mobile)
 *    ✅ Sélection multiple + actions en masse
 *    ✅ Vue split : lecture à droite (desktop)
 *    ✅ Actions rapides au survol (archiver, supprimer, marquer lu)
 *    ✅ Avatars colorés + dates intelligentes
 *    ✅ Compteur non-lus par dossier
 *    ✅ Composition riche (CC/BCC + éditeur WYSIWYG)
 *    ✅ Densité confortable (style Gmail)
 *
 *  Route : /google-gmail (conservée pour compatibilité)
 * ============================================================
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  Layout, Button, Input, Tag, Checkbox,
  Modal, Form, Select, message, Avatar,
  Drawer, Empty, Skeleton, Tooltip, Grid, Space, Typography, Spin, Divider,
} from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import {
  EditOutlined, ReloadOutlined, InboxOutlined, SendOutlined,
  FileTextOutlined, StarOutlined, DeleteOutlined, ExclamationCircleOutlined,
  FolderOutlined, RollbackOutlined, ShareAltOutlined, StarFilled,
  CloseOutlined, CloudSyncOutlined,
  GoogleOutlined, MailOutlined, MenuOutlined,
  EyeOutlined, EyeInvisibleOutlined,
  MoreOutlined, CaretDownOutlined, SearchOutlined,
  PaperClipOutlined, LinkOutlined, DownloadOutlined,
  PictureOutlined, LockOutlined,
} from '@ant-design/icons';
import { useGmailService, FormattedGmailMessage, GmailMessage, GmailLabel } from '../hooks/useGmailService';
import { useYandexMailService } from '../hooks/useYandexMailService';
import { useMailProvider } from '../hooks/useMailProvider';
import GoogleAuthError from '../components/GoogleAuthError';

const { Sider } = Layout;
const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────

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

// ─── Constantes de style ──────────────────────────────────────

/** Palette de couleurs pour les avatars (basée sur la première lettre) */
const AVATAR_COLORS = [
  '#1a73e8', '#e8453c', '#f4b400', '#0b9d58',
  '#ab47bc', '#00acc1', '#ff7043', '#5c6bc0',
  '#26a69a', '#ef5350', '#7e57c2', '#66bb6a',
];

/** Retourne une couleur déterministe basée sur le nom */
const getAvatarColor = (name: string): string => {
  const charCode = (name || '?').charCodeAt(0);
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};

/** Extrait les initiales d'un nom/email pour l'avatar */
const getInitials = (sender: string): string => {
  if (!sender) return '?';
  const nameMatch = sender.match(/^([^<]+)/);
  const name = nameMatch ? nameMatch[1].trim() : sender;
  if (name.includes('@')) return name[0].toUpperCase();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0]?.toUpperCase() || '?';
};

// ─── Utilitaires ──────────────────────────────────────────────

/** Normalise les différentes formes de réponse API en tableau propre */
const normalizeArrayPayload = <T,>(input: unknown): T[] => {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === 'object') {
    const candidate = (input as { data?: unknown; labels?: unknown }).data;
    if (Array.isArray(candidate)) return candidate as T[];
    if (candidate && typeof candidate === 'object' && Array.isArray((candidate as { labels?: unknown }).labels)) {
      return (candidate as { labels: T[] }).labels;
    }
    if (Array.isArray((input as { labels?: unknown }).labels)) {
      return (input as { labels: T[] }).labels;
    }
  }
  return [];
};

/** Extrait la valeur d'un header email */
const getHeaderValue = (headers: { name: string; value: string }[] | undefined, name: string): string => {
  if (!Array.isArray(headers)) return '';
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
};

/** Decode le body base64 (format Gmail) en texte UTF-8 */
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
  } catch {
    try { return atob(input); } catch { return ''; }
  }
};

/**
 * Formate une date de manière intelligente comme Gmail :
 *  - Aujourd'hui → "14:30"
 *  - Hier → "Hier"
 *  - Cette année → "12 janv."
 *  - Année précédente → "12/01/2025"
 */
const smartFormatDate = (value?: string): string => {
  if (!value) return '';
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (date >= yesterday) {
    return 'Hier';
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Formate une date complète pour le détail du message */
const formatDateFull = (value?: string): string => {
  if (!value) return '';
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/** Extrait le nom seul de "Nom <email@domain.com>" */
const extractSenderName = (from: string): string => {
  if (!from) return 'Inconnu';
  const match = from.match(/^([^<]+)/);
  if (match) {
    const name = match[1].trim().replace(/"/g, '');
    return name || from;
  }
  return from.split('@')[0] || from;
};

/** Extrait l'adresse email seule de "Nom <email@domain.com>" */
const extractEmailAddress = (from: string): string => {
  if (!from) return '';
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim() : from.trim();
};

/** Extrait le corps HTML/texte d'un GmailMessage */
const getMessageBody = (msg: GmailMessage | null): string => {
  if (!msg) return '';
  const findPart = (parts?: GmailBodyPart[]): GmailBodyPart | null => {
    if (!Array.isArray(parts)) return null;
    for (const part of parts) {
      if (part.mimeType === 'text/html') return part;
      if (part.parts?.length) {
        const nested = findPart(part.parts);
        if (nested) return nested;
      }
    }
    return parts.find(p => p.mimeType === 'text/plain') || null;
  };
  const payload = msg.payload ?? {};
  if (payload.parts?.length) {
    const part = findPart(payload.parts);
    if (part?.body?.data) return decodeBodyData(part.body.data);
  } else if (payload.body?.data) {
    return decodeBodyData(payload.body.data);
  }
  return msg.snippet || '';
};

/** Extrait le mapping CID -> attachmentId depuis les parts du message */
const extractCidMap = (msg: GmailMessage | null): Record<string, { attachmentId: string; mimeType: string }> => {
  if (!msg) return {};
  const map: Record<string, { attachmentId: string; mimeType: string }> = {};
  const walkParts = (parts?: GmailBodyPart[]) => {
    if (!Array.isArray(parts)) return;
    for (const part of parts) {
      if (part.body?.attachmentId && part.headers) {
        const cidHeader = part.headers.find(h => h.name.toLowerCase() === 'content-id');
        if (cidHeader) {
          // Nettoyer le CID : supprimer <>, espaces, décoder URL
          let cid = cidHeader.value.replace(/^\s*<?/, '').replace(/>?\s*$/, '').trim();
          try { cid = decodeURIComponent(cid); } catch { /* ignore */ }
          map[cid] = { attachmentId: part.body.attachmentId, mimeType: part.mimeType };
          // Aussi mapper sans la partie après @ (certains clients n'utilisent que la partie avant @)
          if (cid.includes('@')) {
            map[cid.split('@')[0]] = { attachmentId: part.body.attachmentId, mimeType: part.mimeType };
          }
        }
      }
      if (part.parts) walkParts(part.parts);
    }
  };
  if (msg.payload?.parts) walkParts(msg.payload.parts as unknown as GmailBodyPart[]);
  return map;
};

/** Remplace les cid: dans le HTML par des URLs d'API pour afficher les images inline */
const resolveCidImages = (html: string, messageId: string, cidMap: Record<string, { attachmentId: string; mimeType: string }>): string => {
  if (!html) return html;
  // Même s'il n'y a pas de cidMap, on essaye de résoudre
  return html.replace(/src=["']cid:([^"']+)["']/gi, (_match, rawCid: string) => {
    // Essayer plusieurs variantes du CID
    let cid = rawCid.trim();
    try { cid = decodeURIComponent(cid); } catch { /* ignore */ }
    const info = cidMap[cid] || cidMap[cid.replace(/%40/g, '@')] || cidMap[cid.split('@')[0]];
    if (info) {
      return `src="${window.location.origin}/api/gmail/messages/${messageId}/attachments/${info.attachmentId}?preview=true"`;
    }
    // CID non trouvé → cacher l'image (sera gérée par le CSS img[src^='cid:'])
    return `src="" data-cid-unresolved="${cid}"`;
  });
};

// ─── Configuration de l'éditeur Quill ─────────────────────────

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean'],
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'link', 'blockquote', 'code-block',
];

// ─── Définition des dossiers système ──────────────────────────

interface FolderConfig {
  name: string;
  icon: React.ReactNode;
}

const SYSTEM_FOLDERS: Record<string, FolderConfig> = {
  'INBOX':   { name: 'Boîte de réception',    icon: <InboxOutlined /> },
  'SENT':    { name: 'Messages envoyés',       icon: <SendOutlined /> },
  'DRAFT':   { name: 'Brouillons',             icon: <FileTextOutlined /> },
  'STARRED': { name: 'Messages suivis',        icon: <StarOutlined /> },
  'TRASH':   { name: 'Corbeille',              icon: <DeleteOutlined /> },
  'SPAM':    { name: 'Spam',                   icon: <ExclamationCircleOutlined /> },
};

// ═══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

const UnifiedMailPage: React.FC = () => {
  // ─── Détection du fournisseur ───
  const { provider, isLoading: providerLoading } = useMailProvider();
  const gmailService = useGmailService();
  const yandexService = useYandexMailService();

  // Provider actif : fallback sur Gmail si "none"
  const isYandex = provider === 'yandex';
  const isGmail = provider === 'gmail' || provider === 'none';

  // ─── State principal ───
  const [msgApi, msgCtx] = message.useMessage();
  const [messages, setMessages] = useState<FormattedGmailMessage[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [selectedMessageMeta, setSelectedMessageMeta] = useState<FormattedGmailMessage | null>(null);
  const [currentLabelId, setCurrentLabelId] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = React.useRef<any>(null);
  const [pageToken, setPageToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [composeForm] = Form.useForm<ComposeFormData>();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isDesktop = !!screens.lg; // ≥992px : split view uniquement sur desktop

  // ─── State : sélection multiple ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── State : compose modal ───
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [composeType, setComposeType] = useState<'new' | 'reply' | 'forward'>('new');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; filename: string; mimeType: string; messageId: string; attachmentId: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── State : sidebar mobile ───
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ─── State : split view (lecture à droite sur desktop) ───
  const [splitOpen, setSplitOpen] = useState(false);

  // ─── State : compteurs non-lus ───
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Ref pour scroll
  const _messageListRef = useRef<HTMLDivElement>(null);

  // ─── Service actif ───
  const activeGetMessages = isYandex ? yandexService.getMessages : gmailService.getMessages;
  const activeGetMessage = isYandex ? yandexService.getMessage : gmailService.getMessage;
  const activeGetLabels = isYandex ? yandexService.getLabels : gmailService.getLabels;

  // Utilitaire de normalisation
  type MessagesPayload = { data?: FormattedGmailMessage[]; messages?: FormattedGmailMessage[]; nextPageToken?: string };
  const hasData = (v: unknown): v is { data: unknown } => typeof v === 'object' && v !== null && 'data' in v;

  // ═══════════════════════════════════════════════════════════
  //  CHARGEMENT DES DONNÉES
  // ═══════════════════════════════════════════════════════════

  /** Charge les messages depuis le provider actif */
  const loadMessages = useCallback(async (labelId: string, query: string, append = false) => {
    try {
      setIsLoading(true);
      const result = await activeGetMessages({
        labelIds: [labelId],
        q: query,
        maxResults: 30,
        pageToken: append ? pageToken : undefined,
      });

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
        setSelectedIds(new Set());
      }
      setPageToken(nextToken || '');
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      msgApi.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  }, [pageToken, activeGetMessages, msgApi]);

  /** Initialisation au montage + quand le provider change */
  useEffect(() => {
    if (providerLoading) return;

    const init = async () => {
      setIsLoading(true);
      try {
        // 1. Charger les labels
        const labelsResult = await activeGetLabels();
        const normalizedLabels = normalizeArrayPayload<GmailLabel>(labelsResult);

        if (isGmail && !labelsResult && normalizedLabels.length === 0) {
          setAuthError(true);
          return;
        }
        setLabels(normalizedLabels);

        // Calculer les compteurs non-lus
        const counts: Record<string, number> = {};
        normalizedLabels.forEach((label) => {
          if (label.messagesUnread) {
            counts[label.id] = label.messagesUnread;
          }
        });
        setUnreadCounts(counts);

        // 2. Charger les messages INBOX
        const result = await activeGetMessages({ labelIds: ['INBOX'], q: '', maxResults: 30 });
        const rawPayload = hasData(result) ? result.data : result;
        const payload = rawPayload as MessagesPayload | FormattedGmailMessage[];
        const items: FormattedGmailMessage[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data) ? payload.data!
          : Array.isArray(payload?.messages) ? payload.messages!
          : [];
        const nextToken: string = Array.isArray(payload) ? '' : (payload?.nextPageToken || '');
        setMessages(items);
        setPageToken(nextToken || '');
      } catch (error) {
        console.error('Erreur chargement initial:', error);
        if (isGmail) setAuthError(true);
      } finally {
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, providerLoading]);

  // ═══════════════════════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleLabelClick = (labelId: string) => {
    setCurrentLabelId(labelId);
    setSearchQuery('');
    setPageToken('');
    setSelectedMessage(null);
    setSelectedMessageMeta(null);
    setSplitOpen(false);
    setSelectedIds(new Set());
    loadMessages(labelId, '');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPageToken('');
    setSelectedIds(new Set());
    loadMessages(currentLabelId, query);
  };

  /** Ouvrir un message (split view desktop / drawer mobile) */
  const handleOpenMessage = async (msg: FormattedGmailMessage) => {
    try {
      setSelectedMessageMeta(msg);
      const rawMessage = await activeGetMessage(msg.id);
      // Unwrap potential { data: { ... } } wrapper from API response
      const fullMessage = rawMessage?.data?.payload ? rawMessage.data : rawMessage;
      if (fullMessage) {
        setSelectedMessage(fullMessage);
        setSplitOpen(true);
        // Marquer comme lu
        if (!msg.isRead) {
          if (isGmail) {
            gmailService.modifyMessage(msg.id, [], ['UNREAD']);
          }
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
          setUnreadCounts(prev => ({
            ...prev,
            [currentLabelId]: Math.max(0, (prev[currentLabelId] || 0) - 1),
          }));
        }
      }
    } catch (error) {
      console.error('Erreur ouverture message:', error);
      msgApi.error('Impossible d\'ouvrir le message');
      setSelectedMessageMeta(null);
    }
  };

  /** Ouvrir la modale de composition */
  const handleCompose = (type: 'new' | 'reply' | 'forward' = 'new', originalMessage?: GmailMessage) => {
    composeForm.resetFields();
    setComposeBody('');
    setComposeAttachments([]);
    setComposeType(type);
    setShowCcBcc(false);

    if (originalMessage) {
      const payloadHeaders = originalMessage.payload?.headers
        || (originalMessage as unknown as { data?: { payload?: { headers?: { name: string; value: string }[] } } }).data?.payload?.headers;
      const from = getHeaderValue(payloadHeaders, 'From') || selectedMessageMeta?.from || '';
      const subject = getHeaderValue(payloadHeaders, 'Subject') || selectedMessageMeta?.subject || '';
      const replyEmail = extractEmailAddress(from) || from;
      const originalBody = getMessageBody(originalMessage);

      if (type === 'reply') {
        composeForm.setFieldsValue({
          to: replyEmail ? [replyEmail] : [],
          subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        });
        setComposeBody(`<br/><br/><blockquote style="border-left: 2px solid #ccc; padding-left: 12px; color: #666; margin-left: 0;">
          <p style="margin: 0 0 8px 0;">Le ${formatDateFull(originalMessage.internalDate)}, <strong>${extractSenderName(from)}</strong> &lt;${replyEmail}&gt; a écrit :</p>
          <div>${DOMPurify.sanitize(originalBody)}</div>
        </blockquote>`);
      } else if (type === 'forward') {
        const toOriginal = getHeaderValue(payloadHeaders, 'To');
        composeForm.setFieldsValue({
          subject: subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`,
        });
        setComposeBody(`<br/><br/><div style="color: #5f6368;">
          <p>---------- Message transféré ----------</p>
          <p>De : ${from}</p>
          <p>Date : ${formatDateFull(originalMessage.internalDate)}</p>
          <p>Objet : ${subject}</p>
          <p>À : ${toOriginal}</p>
        </div><br/>${DOMPurify.sanitize(originalBody)}`);
      }
    }
    setComposeModalVisible(true);
  };

  /** Ajouter des fichiers en pièce jointe */
  const handleAddAttachments = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const maxSize = 25 * 1024 * 1024; // 25 MB
    const tooBig = newFiles.filter(f => f.size > maxSize);
    if (tooBig.length > 0) {
      msgApi.warning(`Fichier(s) trop volumineux (max 25 Mo) : ${tooBig.map(f => f.name).join(', ')}`);
    }
    const valid = newFiles.filter(f => f.size <= maxSize);
    setComposeAttachments(prev => [...prev, ...valid]);
  };

  /** Supprimer une pièce jointe */
  const handleRemoveAttachment = (index: number) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
  };

  /** Formater la taille d'un fichier */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  /** Envoyer un email */
  const handleSendCommand = async (values: ComposeFormData) => {
    try {
      const htmlBody = composeBody || values.body || '';
      if (isYandex) {
        await yandexService.sendMessage(values.to, values.subject, htmlBody, values.cc, values.bcc);
      } else {
        // Utiliser le format SendEmailRequest avec attachments
        await gmailService.sendMessage({
          to: values.to,
          subject: values.subject,
          body: htmlBody,
          cc: values.cc,
          bcc: values.bcc,
          attachments: composeAttachments.length > 0 ? composeAttachments : undefined,
        });
      }
      msgApi.success('Message envoyé !');
      setComposeModalVisible(false);
      setComposeBody('');
      setComposeAttachments([]);
    } catch (error) {
      console.error('Erreur envoi:', error);
      msgApi.error('Erreur lors de l\'envoi');
    }
  };

  /** Supprimer un message */
  const handleDeleteMessage = async (messageId: string) => {
    const result = isYandex
      ? await yandexService.deleteMessage(messageId)
      : await gmailService.deleteMessage(messageId);

    if (result) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (selectedMessage?.id === messageId) {
        setSplitOpen(false);
        setSelectedMessage(null);
        setSelectedMessageMeta(null);
      }
      setSelectedIds(prev => { const n = new Set(prev); n.delete(messageId); return n; });
      msgApi.success('Message supprimé');
    } else {
      msgApi.error('Impossible de supprimer');
    }
  };

  /** Toggle étoile */
  const handleToggleStar = async (messageId: string, isStarred: boolean) => {
    if (isYandex) {
      const result = await yandexService.toggleStar(messageId);
      if (result) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isStarred: !isStarred } : m));
      }
    } else {
      const addLabelIds = isStarred ? [] : ['STARRED'];
      const removeLabelIds = isStarred ? ['STARRED'] : [];
      const result = await gmailService.modifyMessage(messageId, addLabelIds, removeLabelIds);
      if (result) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isStarred: !isStarred } : m));
        setSelectedMessage(prev => {
          if (!prev || prev.id !== messageId) return prev;
          const updatedLabels = isStarred
            ? prev.labelIds?.filter(l => l !== 'STARRED')
            : [...(prev.labelIds || []), 'STARRED'];
          return { ...prev, labelIds: updatedLabels };
        });
      }
    }
  };

  /** Marquer lu / non-lu */
  const handleToggleRead = async (messageId: string, currentlyRead: boolean) => {
    if (isGmail) {
      const addLabels = currentlyRead ? ['UNREAD'] : [];
      const removeLabels = currentlyRead ? [] : ['UNREAD'];
      await gmailService.modifyMessage(messageId, addLabels, removeLabels);
    }
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, isRead: !currentlyRead } : m
    ));
  };

  /** Synchronisation Yandex IMAP */
  const handleYandexSync = async () => {
    setIsSyncing(true);
    try {
      await yandexService.syncEmails('INBOX');
      msgApi.success('Synchronisation terminée !');
      await loadMessages(currentLabelId, searchQuery);
    } catch {
      msgApi.error('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  //  SÉLECTION MULTIPLE + ACTIONS EN MASSE
  // ═══════════════════════════════════════════════════════════

  const isAllSelected = messages.length > 0 && selectedIds.size === messages.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < messages.length;

  const handleSelectAll = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      setSelectedIds(new Set(messages.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  /** Suppression en masse */
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    msgApi.loading(`Suppression de ${ids.length} message(s)...`);

    let successCount = 0;
    for (const id of ids) {
      const result = isYandex
        ? await yandexService.deleteMessage(id)
        : await gmailService.deleteMessage(id);
      if (result) successCount++;
    }

    setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
    setSelectedIds(new Set());

    if (selectedMessage && selectedIds.has(selectedMessage.id)) {
      setSplitOpen(false);
      setSelectedMessage(null);
      setSelectedMessageMeta(null);
    }

    msgApi.success(`${successCount} message(s) supprimé(s)`);
  };

  /** Marquer comme lu/non-lu en masse */
  const handleBulkToggleRead = async (markAsRead: boolean) => {
    const ids = Array.from(selectedIds);

    if (isGmail) {
      for (const id of ids) {
        const addLabels = markAsRead ? [] : ['UNREAD'];
        const removeLabels = markAsRead ? ['UNREAD'] : [];
        await gmailService.modifyMessage(id, addLabels, removeLabels);
      }
    }

    setMessages(prev => prev.map(m =>
      selectedIds.has(m.id) ? { ...m, isRead: markAsRead } : m
    ));
    setSelectedIds(new Set());
    msgApi.success(`${ids.length} message(s) marqué(s) comme ${markAsRead ? 'lus' : 'non lus'}`);
  };

  // ═══════════════════════════════════════════════════════════
  //  NOM DU DOSSIER COURANT (pour info)
  // ═══════════════════════════════════════════════════════════

  const _currentFolderName = useMemo(() => {
    const sys = SYSTEM_FOLDERS[currentLabelId];
    if (sys) return sys.name;
    const custom = labels.find(l => l.id === currentLabelId);
    return custom?.name ?? 'Boîte de réception';
  }, [currentLabelId, labels]);

  // ═══════════════════════════════════════════════════════════
  //  RENDU : SIDEBAR (permanente desktop / drawer mobile)
  // ═══════════════════════════════════════════════════════════

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Bouton Nouveau message */}
      <div className="p-4 pb-2">
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => handleCompose('new')}
          size="large"
          block
          style={{
            borderRadius: 16,
            height: 48,
            fontWeight: 500,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          }}
        >
          Nouveau message
        </Button>
      </div>

      {/* Liste des dossiers */}
      <div className="flex-1 overflow-y-auto pt-2">
        {Object.entries(SYSTEM_FOLDERS).map(([folderId, config]) => {
          const isActive = currentLabelId === folderId;
          const count = unreadCounts[folderId] || 0;
          return (
            <div
              key={folderId}
              onClick={() => {
                handleLabelClick(folderId);
                setMobileSidebarOpen(false);
              }}
              className="cursor-pointer transition-colors"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px 0 12px',
                height: 36,
                borderRadius: '0 20px 20px 0',
                marginRight: 12,
                fontWeight: isActive ? 600 : 400,
                backgroundColor: isActive ? '#d3e3fd' : 'transparent',
                color: isActive ? '#001d35' : '#444746',
                fontSize: 14,
              }}
            >
              <span style={{ width: 32, display: 'flex', justifyContent: 'center', fontSize: 16 }}>
                {config.icon}
              </span>
              <span className="flex-1 ml-2 truncate">{config.name}</span>
              {count > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600 }}>{count}</span>
              )}
            </div>
          );
        })}

        {/* Labels personnalisés (Gmail) */}
        {isGmail && labels.filter(l => !SYSTEM_FOLDERS[l.id]).length > 0 && (
          <>
            <Divider style={{ margin: '8px 0', borderColor: '#e0e0e0' }} />
            <div style={{ padding: '4px 12px 4px 16px', fontSize: 11, fontWeight: 600, color: '#444746', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Libellés
            </div>
            {labels.filter(l => !SYSTEM_FOLDERS[l.id]).map(label => (
              <div
                key={label.id}
                onClick={() => {
                  handleLabelClick(label.id);
                  setMobileSidebarOpen(false);
                }}
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 24px 0 12px',
                  height: 32,
                  borderRadius: '0 20px 20px 0',
                  marginRight: 12,
                  fontSize: 14,
                  color: '#444746',
                  fontWeight: currentLabelId === label.id ? 600 : 400,
                  backgroundColor: currentLabelId === label.id ? '#d3e3fd' : 'transparent',
                }}
              >
                <span style={{ width: 32, display: 'flex', justifyContent: 'center' }}>
                  <FolderOutlined />
                </span>
                <span className="flex-1 ml-2 truncate">{label.name}</span>
                {(label.messagesUnread || 0) > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{label.messagesUnread}</span>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Badge provider en bas */}
      <div className="p-4 border-t" style={{ borderColor: '#e0e0e0' }}>
        <Tag
          icon={isYandex ? <MailOutlined /> : <GoogleOutlined />}
          color={isYandex ? 'purple' : 'blue'}
          className="text-xs"
        >
          {isYandex ? 'Yandex Mail' : 'Gmail'}
        </Tag>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDU : BARRE D'OUTILS (toolbar Gmail-like)
  // ═══════════════════════════════════════════════════════════

  const renderToolbar = () => (
    <div
      className="flex items-center px-2 border-b"
      style={{
        height: 48,
        borderColor: '#e0e0e0',
        backgroundColor: '#fff',
        flexShrink: 0,
      }}
    >
      {/* Hamburger mobile */}
      {isMobile && (
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileSidebarOpen(true)}
          style={{ flexShrink: 0 }}
        />
      )}

      {/* Recherche (icône compacte, s'étend au clic) */}
      {searchExpanded ? (
        <Input.Search
          ref={searchInputRef}
          placeholder="Rechercher..."
          onSearch={(v) => { handleSearch(v); if (!v) { setSearchExpanded(false); } }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          onBlur={() => { if (!searchQuery) setSearchExpanded(false); }}
          style={{ width: isMobile ? 140 : 200, flexShrink: 1, transition: 'width 0.2s' }}
          size="small"
          autoFocus
        />
      ) : (
        <Tooltip title="Rechercher">
          <Button
            type="text"
            size="small"
            icon={<SearchOutlined />}
            onClick={() => { setSearchExpanded(true); }}
            style={{ flexShrink: 0 }}
          />
        </Tooltip>
      )}

      <Divider type="vertical" style={{ margin: '0 4px' }} />

      {/* Checkbox "tout sélectionner" */}
      <Tooltip title={isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}>
        <Checkbox
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onChange={handleSelectAll}
        />
      </Tooltip>
      <Tooltip title="Sélectionner">
        <Button type="text" size="small" icon={<CaretDownOutlined />} style={{ minWidth: 20, padding: '0 2px' }} />
      </Tooltip>

      {/* Actions en masse (visibles si sélection active) */}
      {selectedIds.size > 0 ? (
        <Space size={2}>
          <Tooltip title="Supprimer la sélection">
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={handleBulkDelete} danger />
          </Tooltip>
          <Tooltip title="Marquer comme lu">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleBulkToggleRead(true)} />
          </Tooltip>
          <Tooltip title="Marquer comme non lu">
            <Button type="text" size="small" icon={<EyeInvisibleOutlined />} onClick={() => handleBulkToggleRead(false)} />
          </Tooltip>
          <Text type="secondary" style={{ fontSize: 11 }}>{selectedIds.size}</Text>
        </Space>
      ) : (
        <Space size={2}>
          <Tooltip title="Actualiser">
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => loadMessages(currentLabelId, searchQuery)} loading={isLoading} />
          </Tooltip>
          {isYandex && (
            <Tooltip title="Synchroniser Yandex">
              <Button type="text" size="small" icon={<CloudSyncOutlined />} onClick={handleYandexSync} loading={isSyncing} style={{ color: '#722ed1' }} />
            </Tooltip>
          )}
          <Tooltip title="Plus">
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Tooltip>
        </Space>
      )}

      {/* Spacer + X fermer (visible quand split vue ouverte sur desktop) */}
      <div style={{ flex: 1 }} />
      {splitOpen && isDesktop && (
        <Tooltip title="Fermer le message">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => { setSplitOpen(false); setSelectedMessage(null); setSelectedMessageMeta(null); }}
          />
        </Tooltip>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDU : LISTE DES MESSAGES (style Gmail confortable)
  // ═══════════════════════════════════════════════════════════

  const renderMessageList = () => (
    <div ref={_messageListRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, backgroundColor: '#fff' }}>
      {isLoading && messages.length === 0 ? (
        <div className="p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 12, alignItems: 'center' }}>
              <Skeleton.Avatar active size={40} />
              <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: ['90%'] }} />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: 300 }}>
          <Empty
            description={
              <span className="text-gray-400">
                {searchQuery ? 'Aucun résultat pour cette recherche' : 'Aucun message'}
              </span>
            }
          />
        </div>
      ) : (
        <>
          {messages.map((msg) => {
            const isActive = selectedMessage?.id === msg.id && splitOpen;
            const isChecked = selectedIds.has(msg.id);
            const senderName = extractSenderName(msg.from || '');
            const senderWidth = isMobile ? 0 : (splitOpen && isDesktop ? 120 : 180);

            return (
              <div
                key={msg.id}
                onClick={() => handleOpenMessage(msg)}
                className="group cursor-pointer transition-colors"
                style={{
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  padding: isMobile ? '10px 12px 10px 4px' : '0 16px 0 8px',
                  minHeight: isMobile ? 72 : 48,
                  borderBottom: '1px solid #f2f2f2',
                  backgroundColor: isActive
                    ? '#c2dbff'
                    : isChecked
                      ? '#edf2fc'
                      : !msg.isRead
                        ? '#f2f6fc'
                        : '#fff',
                }}
              >
                {/* Checkbox */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '4px 4px 0' : '0 4px', flexShrink: 0 }}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => handleSelectOne(msg.id, e.target.checked)}
                  />
                </div>

                {/* Étoile */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(msg.id, msg.isStarred || false);
                  }}
                  style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '4px 4px 0' : '0 4px', cursor: 'pointer', flexShrink: 0 }}
                >
                  {msg.isStarred
                    ? <StarFilled style={{ color: '#f4b400', fontSize: 16 }} />
                    : <StarOutlined style={{ color: '#c4c4c4', fontSize: 16 }} className="group-hover:!text-gray-500" />
                  }
                </div>

                {/* Avatar */}
                <Avatar
                  size={isMobile ? 36 : 32}
                  style={{
                    backgroundColor: getAvatarColor(senderName),
                    fontSize: 13,
                    fontWeight: 500,
                    flexShrink: 0,
                    marginRight: isMobile ? 10 : 12,
                    marginTop: isMobile ? 2 : 0,
                  }}
                >
                  {getInitials(msg.from || '')}
                </Avatar>

                {/* MOBILE : Layout multi-lignes */}
                {isMobile ? (
                  <div className="flex-1 min-w-0">
                    {/* Ligne 1 : Expéditeur + Date */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate"
                        style={{
                          fontSize: 14,
                          fontWeight: msg.isRead ? 400 : 600,
                          color: msg.isRead ? '#5f6368' : '#202124',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {senderName}
                      </span>
                      <span style={{ fontSize: 12, color: msg.isRead ? '#5f6368' : '#202124', fontWeight: msg.isRead ? 400 : 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {smartFormatDate(msg.timestamp)}
                      </span>
                    </div>
                    {/* Ligne 2 : Sujet + icône pièce jointe */}
                    <div
                      className="truncate"
                      style={{
                        fontSize: 13,
                        fontWeight: msg.isRead ? 400 : 600,
                        color: msg.isRead ? '#5f6368' : '#202124',
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span className="truncate" style={{ flex: 1, minWidth: 0 }}>{msg.subject || '(sans objet)'}</span>
                      {msg.hasAttachments && <PaperClipOutlined style={{ color: '#9aa0a6', fontSize: 14, flexShrink: 0 }} />}
                    </div>
                    {/* Ligne 3 : Snippet */}
                    {msg.snippet && (
                      <div
                        className="truncate"
                        style={{ fontSize: 12, color: '#9aa0a6', fontWeight: 400, marginTop: 1 }}
                      >
                        {msg.snippet}
                      </div>
                    )}
                  </div>
                ) : (
                  /* DESKTOP : Layout single-line */
                  <>
                    <div className="flex-1 min-w-0 flex items-center gap-3" style={{ overflow: 'hidden' }}>
                      {/* Expéditeur */}
                      <div
                        className="truncate"
                        style={{
                          width: senderWidth,
                          flexShrink: 0,
                          fontSize: 14,
                          fontWeight: msg.isRead ? 400 : 600,
                          color: msg.isRead ? '#5f6368' : '#202124',
                        }}
                      >
                        {senderName}
                      </div>

                      {/* Sujet + snippet + icône pièce jointe */}
                      <div className="flex-1 min-w-0 truncate" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="truncate" style={{ minWidth: 0 }}>
                          <span style={{ color: msg.isRead ? '#5f6368' : '#202124', fontWeight: msg.isRead ? 400 : 600 }}>
                            {msg.subject || '(sans objet)'}
                          </span>
                          {msg.snippet && !(splitOpen && isDesktop) && (
                            <span style={{ color: '#5f6368', fontWeight: 400 }}>
                              {' — '}
                              <span style={{ color: '#9aa0a6' }}>{msg.snippet}</span>
                            </span>
                          )}
                        </span>
                        {msg.hasAttachments && <PaperClipOutlined style={{ color: '#9aa0a6', fontSize: 15, flexShrink: 0 }} />}
                      </div>
                    </div>

                    {/* Actions au survol (desktop uniquement) */}
                    <div
                      className="hidden group-hover:flex items-center gap-0"
                      onClick={(e) => e.stopPropagation()}
                      style={{ flexShrink: 0 }}
                    >
                      <Tooltip title={msg.isRead ? 'Marquer non lu' : 'Marquer lu'}>
                        <Button
                          type="text"
                          size="small"
                          icon={msg.isRead ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                          onClick={() => handleToggleRead(msg.id, msg.isRead || false)}
                          style={{ color: '#5f6368' }}
                        />
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteMessage(msg.id)}
                          style={{ color: '#5f6368' }}
                        />
                      </Tooltip>
                    </div>

                    {/* Date intelligente (cachée au hover sur desktop) */}
                    <div className="group-hover:hidden" style={{ flexShrink: 0, fontSize: 12, color: msg.isRead ? '#5f6368' : '#202124', fontWeight: msg.isRead ? 400 : 600, marginLeft: 8, whiteSpace: 'nowrap' }}>
                      {smartFormatDate(msg.timestamp)}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Bouton charger plus */}
          {pageToken && (
            <div className="text-center py-4">
              <Button
                onClick={() => loadMessages(currentLabelId, searchQuery, true)}
                loading={isLoading}
                type="text"
                style={{ color: '#1a73e8' }}
              >
                Charger plus de messages
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDU : DÉTAIL DU MESSAGE (panneau split / drawer mobile)
  // ═══════════════════════════════════════════════════════════

  const renderMessageDetail = () => {
    if (!selectedMessage || !splitOpen) return null;

    const headers = selectedMessage.payload?.headers ?? [];
    const from = getHeaderValue(headers, 'From') || selectedMessageMeta?.from || '';
    const to = getHeaderValue(headers, 'To') || selectedMessageMeta?.to || '';
    const cc = getHeaderValue(headers, 'Cc');
    const subject = getHeaderValue(headers, 'Subject') || selectedMessageMeta?.subject || '';
    const internalDate = formatDateFull(selectedMessage.internalDate);
    const fallbackDate = selectedMessageMeta?.timestamp ? formatDateFull(selectedMessageMeta.timestamp) : '';
    const displayedDate = internalDate || fallbackDate || '—';
    const isStarred = isYandex
      ? selectedMessageMeta?.isStarred
      : selectedMessage.labelIds?.includes('STARRED');
    const senderName = extractSenderName(from);

    // Extraction du body
    let body = '';
    const findBodyPart = (parts?: GmailBodyPart[]): GmailBodyPart | null => {
      if (!Array.isArray(parts)) return null;
      for (const part of parts) {
        if (part.mimeType === 'text/html') return part;
        if (part.parts?.length) {
          const nested = findBodyPart(part.parts);
          if (nested) return nested;
        }
      }
      return parts.find(p => p.mimeType === 'text/plain') || null;
    };

    const payload = selectedMessage.payload ?? {};
    if (payload.parts?.length) {
      const part = findBodyPart(payload.parts);
      if (part?.body?.data) body = decodeBodyData(part.body.data);
    } else if (payload.body?.data) {
      body = decodeBodyData(payload.body.data);
    }

    if (!body) {
      // selectedMessage peut être un FormattedGmailMessage (avec htmlBody directement)
      const msgAnyBody = selectedMessage as unknown as { htmlBody?: string };
      body = msgAnyBody.htmlBody || selectedMessageMeta?.htmlBody || selectedMessage.snippet || selectedMessageMeta?.snippet || 'Aucun contenu disponible.';
    }

    // Résoudre les images CID (inline)
    const cidMap = extractCidMap(selectedMessage);
    body = resolveCidImages(body, selectedMessage.id, cidMap);

    const sanitizedBody = DOMPurify.sanitize(body, {
      ALLOW_UNKNOWN_PROTOCOLS: true,
      ADD_TAGS: ['style', 'link', 'head', 'meta'],
      ADD_ATTR: ['target', 'style', 'class', 'src', 'alt', 'width', 'height', 'border',
        'cellpadding', 'cellspacing', 'align', 'valign', 'bgcolor', 'background',
        'color', 'face', 'size', 'dir', 'role', 'tabindex', 'title', 'data-*',
        'colspan', 'rowspan', 'scope', 'href', 'rel', 'type', 'media'],
      WHOLE_DOCUMENT: false,
    });

    // Construire le HTML pour l'iframe isolé (rendu identique Gmail)
    const iframeHtml = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #202124;
    word-wrap: break-word;
    overflow-wrap: break-word;
    -webkit-font-smoothing: antialiased;
  }
  img {
    max-width: 100% !important;
    height: auto !important;
    display: inline-block;
  }
  /* Cacher les images CID non résolues et les images cassées */
  img[src=""], img[data-cid-unresolved], img:not([src]) {
    display: none !important;
  }
  img.broken-image {
    display: none !important;
  }
  table {
    max-width: 100% !important;
    border-collapse: collapse;
  }
  a {
    color: #1a73e8;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  blockquote {
    border-left: 3px solid #dadce0;
    margin: 0 0 0 8px;
    padding: 0 0 0 12px;
    color: #5f6368;
  }
  pre, code {
    overflow-x: auto;
    max-width: 100%;
    background: #f8f9fa;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 13px;
  }
  p { margin: 0 0 8px 0; }
  hr { border: none; border-top: 1px solid #dadce0; margin: 16px 0; }
  .gmail_quote { color: #5f6368; }
</style>
</head><body>${sanitizedBody}
<script>
// Cacher les images qui échouent au chargement
document.querySelectorAll('img').forEach(function(img) {
  img.onerror = function() {
    this.style.display = 'none';
    this.classList.add('broken-image');
  };
  // Vérifier si l'image est déjà en erreur
  if (img.complete && img.naturalWidth === 0 && img.src) {
    img.style.display = 'none';
  }
});
</script>
</body></html>`;

    const handleClose = () => {
      setSplitOpen(false);
      setSelectedMessage(null);
      setSelectedMessageMeta(null);
    };

    const detailContent = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff', overflow: 'hidden' }}>
        {/* Zone scrollable : sujet + expéditeur + body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Sujet + actions */}
          <div style={{ padding: '20px 24px 8px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Typography.Title level={4} style={{ margin: 0, fontWeight: 400, flex: 1, wordBreak: 'break-word', fontSize: 22 }}>
              {subject || '(sans objet)'}
            </Typography.Title>
            <div style={{ display: 'flex', gap: 0, alignItems: 'center', flexShrink: 0 }}>
              <Button
                type="text"
                icon={isStarred ? <StarFilled style={{ color: '#f4b400' }} /> : <StarOutlined />}
                onClick={() => handleToggleStar(selectedMessage.id, !!isStarred)}
                size="small"
              />
              <Tooltip title="Répondre">
                <Button type="text" icon={<RollbackOutlined />} onClick={() => handleCompose('reply', selectedMessage)} size="small" />
              </Tooltip>
              <Tooltip title="Transférer">
                <Button type="text" icon={<ShareAltOutlined />} onClick={() => handleCompose('forward', selectedMessage)} size="small" />
              </Tooltip>
              <Tooltip title="Supprimer">
                <Button type="text" icon={<DeleteOutlined />} onClick={() => handleDeleteMessage(selectedMessage.id)} danger size="small" />
              </Tooltip>
            </div>
          </div>

          {/* Infos expéditeur - style Gmail */}
          <div style={{ padding: '8px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Avatar
              size={40}
              style={{
                backgroundColor: getAvatarColor(senderName),
                fontSize: 16,
                fontWeight: 500,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {getInitials(from)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 14 }}>{senderName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>&lt;{extractEmailAddress(from)}&gt;</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  à {to || '—'}
                </Text>
              </div>
              {cc && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Cc : {cc}
                  </Text>
                </div>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {displayedDate}
            </Text>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Body du message - rendu dans un iframe isolé pour présentation fidèle */}
          <div style={{ padding: '0 24px' }}>
            <iframe
              srcDoc={iframeHtml}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts"
              style={{
                width: '100%',
                border: 'none',
                minHeight: 300,
                display: 'block',
              }}
              title="Contenu du message"
              onLoad={(e) => {
                // Auto-resize l'iframe à la taille de son contenu
                const iframe = e.currentTarget;
                try {
                  const doc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (doc?.body) {
                    const height = doc.body.scrollHeight + 20;
                    iframe.style.height = Math.max(height, 200) + 'px';
                    // Observer les changements (images qui chargent après)
                    const resizeObserver = new ResizeObserver(() => {
                      if (doc.body) {
                        iframe.style.height = Math.max(doc.body.scrollHeight + 20, 200) + 'px';
                      }
                    });
                    resizeObserver.observe(doc.body);
                    // Ouvrir les liens dans un nouvel onglet
                    doc.querySelectorAll('a').forEach(a => {
                      a.setAttribute('target', '_blank');
                      a.setAttribute('rel', 'noopener noreferrer');
                    });
                  }
                } catch { /* cross-origin safety */ }
              }}
            />
          </div>

          {/* Pièces jointes du message reçu */}
          {(() => {
            // Support des deux formats de données : 
            // 1. payload.parts (message brut Gmail) → GmailBodyPart avec body.attachmentId
            // 2. attachments (FormattedGmailMessage) → EmailAttachment avec attachmentId direct
            interface AttachmentInfo {
              attachmentId: string;
              filename: string;
              mimeType: string;
              size?: number;
            }
            const allAttachments: AttachmentInfo[] = [];

            // Source 1 : payload.parts (message brut)
            const walkForAttachments = (parts?: GmailBodyPart[]) => {
              if (!Array.isArray(parts)) return;
              for (const part of parts) {
                if (part.body?.attachmentId && part.filename) {
                  allAttachments.push({
                    attachmentId: part.body.attachmentId,
                    filename: part.filename,
                    mimeType: part.mimeType || 'application/octet-stream',
                    size: part.body?.size,
                  });
                }
                if (part.parts) walkForAttachments(part.parts);
              }
            };
            walkForAttachments(selectedMessage.payload?.parts);

            // Source 2 : attachments[] du message courant OU du meta
            const findAttachmentsInObj = (obj: unknown) => {
              if (!obj || typeof obj !== 'object') return;
              const rec = obj as Record<string, unknown>;
              if (!Array.isArray(rec.attachments)) return;
              for (const att of rec.attachments as Array<Record<string, unknown>>) {
                if (!att || typeof att !== 'object') continue;
                const aid = (att.attachmentId || att.id || '') as string;
                const fname = (att.filename || att.name || '') as string;
                const mime = (att.mimeType || att.contentType || 'application/octet-stream') as string;
                const sz = (att.size || 0) as number;
                if (aid && fname) {
                  // Éviter les doublons
                  if (!allAttachments.some(a => a.attachmentId === aid)) {
                    allAttachments.push({ attachmentId: aid, filename: fname, mimeType: mime, size: sz });
                  }
                }
              }
            };
            if (allAttachments.length === 0) findAttachmentsInObj(selectedMessage);
            if (allAttachments.length === 0) findAttachmentsInObj(selectedMessageMeta);

            if (allAttachments.length === 0) return null;

            return (
              <div style={{ padding: '12px 24px 8px' }}>
                <Divider style={{ margin: '0 0 12px' }} />
                <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 8 }}>
                  <PaperClipOutlined /> {allAttachments.length} pièce{allAttachments.length > 1 ? 's' : ''} jointe{allAttachments.length > 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {allAttachments.map((att) => (
                    <div
                      key={att.attachmentId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 8,
                        background: '#f8f9fa', maxWidth: 260,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#e8f0fe'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                    >
                      {/* Clic sur le nom/icône → preview */}
                      <div
                        onClick={async () => {
                          setPreviewLoading(true);
                          try {
                            // Détecter le MIME depuis l'extension du fichier (plus fiable que le header)
                            const getMimeFromFilename = (name: string): string => {
                              const ext = name.split('.').pop()?.toLowerCase() || '';
                              const mimeMap: Record<string, string> = {
                                png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
                                webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
                                pdf: 'application/pdf',
                                mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
                                mp3: 'audio/mpeg', wav: 'audio/wav',
                                txt: 'text/plain', html: 'text/html', csv: 'text/csv',
                              };
                              return mimeMap[ext] || '';
                            };

                            const response = await fetch(
                              `${window.location.origin}/api/gmail/messages/${selectedMessage.id}/attachments/${encodeURIComponent(att.attachmentId)}?preview=true`,
                              {
                                credentials: 'include',
                                headers: { 'x-organization-id': localStorage.getItem('organizationId') || '' },
                              }
                            );
                            if (response.ok) {
                              // Récupérer le vrai nom de fichier depuis le backend
                              let realFilename = att.filename;
                              const cd = response.headers.get('content-disposition');
                              if (cd) {
                                const m = cd.match(/filename="?([^"\n;]+)"?/i);
                                if (m && m[1]) realFilename = m[1].trim();
                              }

                              // MIME: priorité extension > header > att.mimeType
                              const mimeFromExt = getMimeFromFilename(realFilename || att.filename);
                              const rawHeaderMime = (response.headers.get('content-type') || '').split(';')[0].trim();
                              const headerMime = (rawHeaderMime && rawHeaderMime !== 'application/octet-stream') ? rawHeaderMime : '';
                              const finalMime = mimeFromExt || headerMime || att.mimeType || 'application/octet-stream';

                              // Créer le blob avec le bon type MIME
                              const arrayBuffer = await response.arrayBuffer();
                              const blob = new Blob([arrayBuffer], { type: finalMime });
                              const url = URL.createObjectURL(blob);

                              console.log('[Preview] Extension MIME:', mimeFromExt, '| Header MIME:', rawHeaderMime, '| Final MIME:', finalMime, '| Filename:', realFilename, '| Size:', blob.size);

                              setPreviewAttachment({
                                url,
                                filename: realFilename,
                                mimeType: finalMime,
                                messageId: selectedMessage.id,
                                attachmentId: att.attachmentId,
                              });
                            } else {
                              console.error('[Preview] Erreur HTTP:', response.status, response.statusText);
                              msgApi.error(`Erreur ${response.status}: impossible d'ouvrir la pièce jointe`);
                            }
                          } catch (err) {
                            console.error('Erreur preview:', err);
                            msgApi.error('Impossible d\'ouvrir la pièce jointe');
                          } finally {
                            setPreviewLoading(false);
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, overflow: 'hidden' }}
                      >
                        {att.mimeType?.startsWith('image/') ? (
                          <PictureOutlined style={{ color: '#1a73e8', fontSize: 18, flexShrink: 0 }} />
                        ) : (
                          <PaperClipOutlined style={{ color: '#5f6368', fontSize: 18, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#202124' }}>
                            {att.filename}
                          </div>
                          <div style={{ fontSize: 11, color: '#80868b' }}>
                            {att.size ? formatFileSize(att.size) + ' · ' : ''}{att.mimeType?.split('/')[1]?.toUpperCase() || 'Fichier'}
                          </div>
                        </div>
                      </div>
                      {/* Bouton télécharger */}
                      <Tooltip title="Télécharger">
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            gmailService.downloadAttachment(selectedMessage.id, att.attachmentId, att.filename);
                          }}
                          style={{ color: '#5f6368', flexShrink: 0 }}
                        />
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer : répondre rapide (fixe en bas) */}
        <div style={{ padding: '8px 24px 12px', borderTop: '1px solid #e0e0e0', flexShrink: 0 }}>
          <Button
            block
            onClick={() => handleCompose('reply', selectedMessage)}
            style={{
              borderRadius: 20,
              height: 40,
              textAlign: 'left',
              paddingLeft: 16,
              color: '#5f6368',
              borderColor: '#dadce0',
            }}
          >
            Cliquer ici pour répondre...
          </Button>
        </div>
      </div>
    );

    // Mobile + tablette → Drawer plein écran avec header X
    if (!isDesktop) {
      return (
        <Drawer
          placement="right"
          width="100%"
          open={splitOpen}
          onClose={handleClose}
          closable={false}
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          {/* Header mobile avec X */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #e0e0e0', gap: 4 }}>
            <Button type="text" icon={<CloseOutlined />} onClick={handleClose} size="small" />
            <div style={{ flex: 1 }} />
            <Tooltip title="Répondre"><Button type="text" icon={<RollbackOutlined />} onClick={() => handleCompose('reply', selectedMessage)} size="small" /></Tooltip>
            <Tooltip title="Transférer"><Button type="text" icon={<ShareAltOutlined />} onClick={() => handleCompose('forward', selectedMessage)} size="small" /></Tooltip>
            <Tooltip title="Supprimer"><Button type="text" icon={<DeleteOutlined />} onClick={() => handleDeleteMessage(selectedMessage.id)} danger size="small" /></Tooltip>
          </div>
          {detailContent}
        </Drawer>
      );
    }

    // Desktop (≥992px) → panneau split inline
    return detailContent;
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDU : MODALE DE COMPOSITION
  // ═══════════════════════════════════════════════════════════

  const renderComposeModal = () => (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>
            {composeType === 'reply' ? 'Répondre' : composeType === 'forward' ? 'Transférer' : 'Nouveau message'}
          </span>
          <Tag
            icon={isYandex ? <MailOutlined /> : <GoogleOutlined />}
            color={isYandex ? 'purple' : 'blue'}
            className="text-xs"
          >
            {isYandex ? 'Yandex' : 'Gmail'}
          </Tag>
        </div>
      }
      open={composeModalVisible}
      onCancel={() => { setComposeModalVisible(false); setComposeBody(''); setComposeAttachments([]); }}
      width={isMobile ? '100%' : 720}
      destroyOnHidden
      centered={isMobile}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {/* Gauche : Envoyer + outils Gmail-like */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button
              type="primary"
              onClick={() => composeForm.submit()}
              icon={<SendOutlined />}
              style={{ borderRadius: 20, paddingLeft: 20, paddingRight: 20 }}
            >
              Envoyer
            </Button>

            {/* Séparateur */}
            <Divider type="vertical" style={{ margin: '0 4px', height: 24 }} />

            {/* Pièce jointe */}
            <Tooltip title="Joindre des fichiers">
              <Button
                type="text"
                icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                onClick={() => fileInputRef.current?.click()}
              />
            </Tooltip>
            {/* Input fichier caché */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) handleAddAttachments(e.target.files);
                e.target.value = ''; // Reset pour permettre de re-sélectionner le même fichier
              }}
            />

            {/* Insérer un lien */}
            <Tooltip title="Insérer un lien">
              <Button
                type="text"
                icon={<LinkOutlined style={{ fontSize: 18 }} />}
                onClick={() => {
                  const url = prompt('URL du lien :');
                  if (url) {
                    setComposeBody(prev => prev + `<a href="${url}" target="_blank">${url}</a>`);
                  }
                }}
              />
            </Tooltip>

            {/* Insérer une image (inline) */}
            <Tooltip title="Insérer une photo">
              <Button
                type="text"
                icon={<PictureOutlined style={{ fontSize: 18 }} />}
                onClick={() => {
                  const url = prompt('URL de l\'image :');
                  if (url) {
                    setComposeBody(prev => prev + `<img src="${url}" style="max-width:100%;" />`);
                  }
                }}
              />
            </Tooltip>

            {/* Mode confidentiel */}
            <Tooltip title="Mode confidentiel">
              <Button type="text" icon={<LockOutlined style={{ fontSize: 16 }} />} disabled />
            </Tooltip>
          </div>

          {/* Droite : Supprimer brouillon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#5f6368' }}>
              {isYandex ? 'Yandex SMTP' : 'Gmail API'}
            </span>
            <Tooltip title="Annuler">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => { setComposeModalVisible(false); setComposeBody(''); setComposeAttachments([]); }}
              />
            </Tooltip>
          </div>
        </div>
      }
      styles={{
        body: { paddingBottom: 0, maxHeight: isMobile ? '70vh' : '65vh', overflowY: 'auto' },
      }}
    >
      <Form form={composeForm} layout="vertical" onFinish={handleSendCommand}>
        {/* Destinataire */}
        <Form.Item
          name="to"
          label="À"
          rules={[{ required: true, message: 'Au moins un destinataire requis' }]}
          style={{ marginBottom: 12 }}
        >
          <Select
            mode="tags"
            placeholder="destinataire@example.com"
            tokenSeparators={[',', ';', ' ']}
            suffixIcon={null}
          />
        </Form.Item>

        {/* Toggle CC/BCC */}
        {!showCcBcc && (
          <div className="mb-3">
            <Button type="link" size="small" onClick={() => setShowCcBcc(true)} style={{ padding: 0 }}>
              Cc / Cci
            </Button>
          </div>
        )}

        {/* Champs CC et BCC */}
        {showCcBcc && (
          <>
            <Form.Item name="cc" label="Cc" style={{ marginBottom: 12 }}>
              <Select
                mode="tags"
                placeholder="copie@example.com"
                tokenSeparators={[',', ';', ' ']}
                suffixIcon={null}
              />
            </Form.Item>
            <Form.Item name="bcc" label="Cci" style={{ marginBottom: 12 }}>
              <Select
                mode="tags"
                placeholder="copie cachée@example.com"
                tokenSeparators={[',', ';', ' ']}
                suffixIcon={null}
              />
            </Form.Item>
          </>
        )}

        {/* Objet */}
        <Form.Item name="subject" label="Objet" style={{ marginBottom: 12 }}>
          <Input placeholder="Objet du message" />
        </Form.Item>

        {/* Corps du message (éditeur riche) */}
        <Form.Item label="Message" style={{ marginBottom: 8 }}>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
            <style>{`
              .compose-quill .ql-container { min-height: ${isMobile ? '150px' : '220px'}; max-height: 400px; overflow-y: auto; font-size: 14px; }
              .compose-quill .ql-editor { min-height: ${isMobile ? '150px' : '220px'}; }
              .compose-quill .ql-toolbar { border-bottom: 1px solid #e0e0e0; background: #fafafa; flex-wrap: wrap; }
            `}</style>
            <ReactQuill
              className="compose-quill"
              theme="snow"
              value={composeBody}
              onChange={setComposeBody}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Rédigez votre message..."
            />
          </div>
        </Form.Item>

        {/* Zone de pièces jointes */}
        {composeAttachments.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 6 }}>
              <PaperClipOutlined /> {composeAttachments.length} pièce{composeAttachments.length > 1 ? 's' : ''} jointe{composeAttachments.length > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {composeAttachments.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    background: '#f8f9fa',
                    maxWidth: 260,
                  }}
                >
                  {/* Icône selon type */}
                  {file.type.startsWith('image/') ? (
                    <PictureOutlined style={{ color: '#1a73e8', fontSize: 16 }} />
                  ) : (
                    <PaperClipOutlined style={{ color: '#5f6368', fontSize: 16 }} />
                  )}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#80868b' }}>{formatFileSize(file.size)}</div>
                  </div>
                  <Tooltip title="Supprimer">
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined style={{ fontSize: 12 }} />}
                      onClick={() => handleRemoveAttachment(idx)}
                      style={{ minWidth: 20, padding: '0 2px' }}
                    />
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zone de drop pour fichiers */}
        <div
          style={{
            border: '2px dashed #d9d9d9',
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'center',
            color: '#80868b',
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 8,
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = '#1a73e8'; e.currentTarget.style.background = '#e8f0fe'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = '#d9d9d9'; e.currentTarget.style.background = 'transparent'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.style.borderColor = '#d9d9d9';
            e.currentTarget.style.background = 'transparent';
            if (e.dataTransfer.files.length > 0) handleAddAttachments(e.dataTransfer.files);
          }}
        >
          <PaperClipOutlined style={{ fontSize: 18, marginRight: 6 }} />
          Glisser-déposer des fichiers ici ou <span style={{ color: '#1a73e8', textDecoration: 'underline' }}>parcourir</span>
        </div>
      </Form>
    </Modal>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDU : ÉTATS SPÉCIAUX
  // ═══════════════════════════════════════════════════════════

  if (providerLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', backgroundColor: '#fff' }}>
        <Spin size="large" tip="Chargement de la messagerie..." />
      </div>
    );
  }

  if (authError && isGmail) {
    return <GoogleAuthError onReconnect={() => window.location.href = '/api/google-auth'} />;
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDU PRINCIPAL : Layout Gmail-like
  //
  //  Desktop:  [Sidebar 220px] [Toolbar + ListeMessages] [DétailMessage ~55%]
  //  Mobile:   [Toolbar + ListeMessages plein écran]
  //            Sidebar = Drawer, Détail = Drawer plein écran
  // ═══════════════════════════════════════════════════════════

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', backgroundColor: '#fff' }}>
      {msgCtx}

      {/* ─── Sidebar desktop (≥768px) ─── */}
      {!isMobile && (
        <Sider
          width={isDesktop ? 220 : 180}
          theme="light"
          style={{
            borderRight: '1px solid #e0e0e0',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* ─── Sidebar mobile (drawer) ─── */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          width={280}
          styles={{ body: { padding: 0 } }}
          closable={false}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* ─── Zone centrale : toolbar + messages + détail ─── */}
      <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fff' }}>
        {renderToolbar()}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Liste des messages */}
          <div
            style={{
              flex: splitOpen && isDesktop ? '0 0 45%' : '1 1 100%',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRight: splitOpen && isDesktop ? '1px solid #e0e0e0' : 'none',
              transition: 'flex 0.15s ease',
            }}
          >
            {renderMessageList()}
          </div>

          {/* Détail du message (split view desktop ≥992px) */}
          {splitOpen && isDesktop && (
            <div className="flex flex-col" style={{ flex: '1 1 55%', minWidth: 0, overflow: 'hidden' }}>
              {renderMessageDetail()}
            </div>
          )}
        </div>
      </Layout>

      {/* Détail mobile + tablette (Drawer plein écran) */}
      {!isDesktop && renderMessageDetail()}

      {renderComposeModal()}

      {/* Modal de preview des pièces jointes */}
      <Modal
        open={!!previewAttachment}
        onCancel={() => {
          if (previewAttachment?.url) URL.revokeObjectURL(previewAttachment.url);
          setPreviewAttachment(null);
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              {previewAttachment?.filename}
            </span>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                if (previewAttachment) {
                  gmailService.downloadAttachment(
                    previewAttachment.messageId,
                    previewAttachment.attachmentId,
                    previewAttachment.filename
                  );
                }
              }}
            >
              Télécharger
            </Button>
          </div>
        }
        width={950}
        centered
        title={null}
        styles={{
          body: {
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#1a1a1a',
            minHeight: 400,
            maxHeight: '80vh',
            overflow: 'auto',
          },
        }}
      >
        {previewAttachment && (() => {
          // Détection du type basée sur MIME + extension du fichier
          const mime = (previewAttachment.mimeType || '').toLowerCase().split(';')[0].trim();
          const ext = previewAttachment.filename.split('.').pop()?.toLowerCase() || '';
          const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];
          const isImage = mime.startsWith('image/') || imageExts.includes(ext);
          const isPdf = mime === 'application/pdf' || ext === 'pdf';

          if (isImage) {
            return (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.filename}
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('[Preview] Image load error for:', previewAttachment.filename);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            );
          }

          if (isPdf) {
            return (
              <iframe
                src={previewAttachment.url}
                title={previewAttachment.filename}
                style={{ width: '100%', height: '75vh', border: 'none' }}
              />
            );
          }

          // Fichier non prévisualisable
          return (
            <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>
              <PaperClipOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
              <div style={{ fontSize: 16, marginBottom: 8 }}>{previewAttachment.filename}</div>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>
                Ce type de fichier ne peut pas être prévisualisé.
              </div>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => {
                  gmailService.downloadAttachment(
                    previewAttachment.messageId,
                    previewAttachment.attachmentId,
                    previewAttachment.filename
                  );
                }}
              >
                Télécharger
              </Button>
            </div>
          );
        })()}
      </Modal>

      {/* Spinner de chargement pour preview */}
      {previewLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <Spin size="large" />
        </div>
      )}
    </Layout>
  );
};

export default UnifiedMailPage;

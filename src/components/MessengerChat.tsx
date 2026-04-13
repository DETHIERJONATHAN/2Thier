import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar, Input, Modal, Form, DatePicker, TimePicker, message as antMessage, Tooltip, Dropdown, Drawer } from 'antd';
import {
  MessageOutlined,
  CloseOutlined,
  MinusOutlined,
  EditOutlined,
  SendOutlined,
  UserOutlined,
  SearchOutlined,
  TeamOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  HourglassOutlined,
  PushpinOutlined,
  PushpinFilled,
  SmileOutlined,
  AudioOutlined,
  MoreOutlined,
  CheckOutlined,
  FolderOpenOutlined,
  PaperClipOutlined,
  FileOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import VideoCallModal from './VideoCallModal';
import TelnyxDialer from './TelnyxDialer';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useSocket } from '../hooks/useSocket';

// ── Messenger sub-components (Phase 2) ──
import { MessageStatusIndicator } from './messenger/MessageStatusIndicator';
import { MessageReactions } from './messenger/MessageReactions';
import { EmojiReactionPicker } from './messenger/EmojiReactionPicker';
import { FilePreview } from './messenger/FilePreview';
import { VoiceRecorder } from './messenger/VoiceRecorder';
import { SharedFilesPanel } from './messenger/SharedFilesPanel';
import { TaskFromMessage } from './messenger/TaskFromMessage';
import { CustomStatusPicker } from './messenger/CustomStatusPicker';

/** MSN Wizz icon — uses the actual wizz.png */
const WizzIcon = ({ size = 20 }: { size?: number }) => (
  <img src="/wizz.png" alt="Wizz" width={size} height={size} style={{ objectFit: 'contain' }} />
);
import { useAuth } from '../auth/useAuth';
import { useTelnyxCall, type TelnyxEligibility } from '../hooks/useTelnyxCall';
import { useNotificationSound, playNotificationSound } from '../hooks/useNotificationSound';
import { FB, SF } from '../components/zhiive/ZhiiveTheme';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface LastMessage {
  id: string;
  content: string | null;
  senderName: string;
  senderId: string;
  createdAt: string;
  mediaType: string | null;
}

interface Conversation {
  id: string;
  name: string;
  avatarUrl: string | null;
  isGroup: boolean;
  participants: Participant[];
  lastMessage: LastMessage | null;
  unreadCount: number;
  lastMessageAt: string;
}

interface MessageReactionData {
  emoji: string;
  count: number;
  users: { id: string; name: string }[];
  hasReacted: boolean;
}

interface Message {
  id: string;
  content: string | null;
  senderId: string;
  sender: Participant;
  mediaUrls: string[] | null;
  mediaType: string | null;
  isDeleted: boolean;
  isEphemeral?: boolean;
  ephemeralTtl?: number | null;
  viewedAt?: string | null;
  isExpired?: boolean;
  createdAt: string;
  replyTo: { id: string; content: string | null; sender: { firstName: string; lastName: string } } | null;
  // Phase 2 fields
  status?: 'sent' | 'delivered' | 'read';
  isPinned?: boolean;
  mentions?: string[];
  voiceDuration?: number | null;
  voiceTranscript?: string | null;
  reactions?: MessageReactionData[];
}

interface Friend {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isOrgMember: boolean;
  friendshipId: string;
  online?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const CHAT_WIDTH = 400;
const CHAT_HEIGHT = 550;
const LIST_HEIGHT = 530;

// ═══════════════════════════════════════════════════════════════
// MESSENGER CHAT COMPONENT
// ═══════════════════════════════════════════════════════════════

const MessengerChat: React.FC = () => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const { user, currentOrganization } = useAuth();

  // Panel & chat state
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null); // conversation open inside popup
  const [openChats, setOpenChats] = useState<string[]>([]); // conversation IDs of open chat windows
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  // Mettre à jour le badge PWA quand les messages non lus changent
  useEffect(() => {
    import('../lib/pwaBadge').then(({ setMessageBadgeCount }) => setMessageBadgeCount(totalUnread));
  }, [totalUnread]);
  const [inlineMessages, setInlineMessages] = useState<Message[]>([]);
  const [inlineNewMessage, setInlineNewMessage] = useState('');
  const [inlineSending, setInlineSending] = useState(false);
  const inlineMessagesEndRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // 🎭 Wizz (MSN Nudge) state
  const [isShaking, setIsShaking] = useState(false);
  const lastSeenWizzIdRef = useRef<string | null>(null);
  const lastGlobalWizzIdRef = useRef<string | null>(null);
  const wizzCooldownRef = useRef(false);

  // 🕯️ Ephemeral (Snapchat-style) state
  const [ephemeralMode, setEphemeralMode] = useState(false);
  const [ephemeralTtl, setEphemeralTtl] = useState(86400); // 24h default
  const ephemeralViewedRef = useRef<Set<string>>(new Set());

  // Video call state
  const [activeCall, setActiveCall] = useState<{ callId: string; callType: 'video' | 'audio'; isIncoming: boolean; conversationName: string } | null>(null);
  const lastEndedCallIdRef = useRef<string | null>(null);
  const [_loading, _setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  // 🔊 Notification sounds
  const { play: playSound, stop: _stopSound } = useNotificationSound();
  const prevUnreadRef = useRef(0);

  // Telnyx phone state
  const [telnyxEligibility, setTelnyxEligibility] = useState<TelnyxEligibility | null>(null);
  const [showDialer, setShowDialer] = useState(false);
  const [dialerInitialNumber, setDialerInitialNumber] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── SOCKET.IO REAL-TIME ───────────────────────────────────
  // Get JWT token from localStorage for Socket auth
  const socketToken = useMemo(() => {
    try { return localStorage.getItem('authToken') || null; } catch { return null; }
  }, [user?.id]);

  const socket = useSocket({ token: socketToken, enabled: !!user });

  // Phase 2: new UI states
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: ReturnType<typeof setTimeout> }>>(new Map());
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [taskModalMessage, setTaskModalMessage] = useState<Message | null>(null);
  const [showSharedFiles, setShowSharedFiles] = useState(false);
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 📎 File attachment state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // @ Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartPos = useRef<number>(-1);

  // 🎭 Wizz trigger (defined early so fetchUnread can reference it)
  const triggerWizz = useCallback(() => {
    setIsShaking(true);
    playSound('wizz');
    // Global page shake — felt even when messenger is closed
    document.body.classList.add('global-wizz-shake');
    setTimeout(() => {
      setIsShaking(false);
      document.body.classList.remove('global-wizz-shake');
    }, 600);
  }, [playSound]);

  // ─── DATA FETCHING ─────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.get('/api/messenger/conversations');
      if (Array.isArray(data)) setConversations(data);
    } catch { /* silent */ }
  }, [api]);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await api.get('/api/messenger/unread') as unknown;
      if (data && typeof data.unread === 'number') setTotalUnread(data.unread);
      // Global Wizz detection — works even when conversation is closed
      if (data?.latestWizz && data.latestWizz.id !== lastGlobalWizzIdRef.current) {
        lastGlobalWizzIdRef.current = data.latestWizz.id;
        // Also update inline ref to prevent double-trigger if conversation is open
        lastSeenWizzIdRef.current = data.latestWizz.id;
        triggerWizz();
      }
    } catch { /* silent */ }
  }, [api, triggerWizz]);

  const fetchFriends = useCallback(async () => {
    try {
      const data = await api.get('/api/friends') as unknown;
      if (data?.friends) {
        // Sort: online friends first, then alphabetical
        const sorted = [...data.friends].sort((a: Friend, b: Friend) => {
          if (a.online && !b.online) return -1;
          if (!a.online && b.online) return 1;
          return (a.firstName || '').localeCompare(b.firstName || '');
        });
        setFriends(sorted);
      }
    } catch { /* silent */ }
  }, [api]);

  // ─── TELNYX ELIGIBILITY ─────────────────────────────────────
  const fetchTelnyxEligibility = useCallback(async () => {
    try {
      const data = await api.get('/api/messenger/telnyx-eligibility') as TelnyxEligibility;
      setTelnyxEligibility(data);
    } catch { setTelnyxEligibility(null); }
  }, [api]);

  // Stabilize eligibility for useTelnyxCall hook
  const stableEligibility = useMemo(() => telnyxEligibility, [telnyxEligibility?.eligible, telnyxEligibility?.sipCredentials?.sipUsername]);

  const telnyxCall = useTelnyxCall({
    _api: api,
    eligibility: stableEligibility,
    onIncomingCall: (_callerNumber, _callerName) => {
      // Auto-open dialer on incoming Telnyx call
      setShowDialer(true);
      setIsListOpen(true);
    },
  });

  // Sync org friends on first load
  useEffect(() => {
    if (!user) return;
    if (currentOrganization) {
      api.post('/api/friends/sync-org', {}).catch(() => {});
    }
    fetchConversations();
    fetchFriends();
    fetchUnread();
    fetchTelnyxEligibility();
  }, [user, api, currentOrganization, fetchConversations, fetchFriends, fetchUnread, fetchTelnyxEligibility]);

  // ─── SOCKET.IO EVENT LISTENERS ───────────────────────────────
  // Join/leave conversation room
  useEffect(() => {
    if (!socket.connected || !activeConversationId) return;
    socket.joinConversation(activeConversationId);
    socket.markRead(activeConversationId);
    return () => { socket.leaveConversation(activeConversationId); };
  }, [socket.connected, activeConversationId, socket]);

  // Real-time new messages
  useEffect(() => {
    if (!socket.connected) return;
    const cleanup = socket.on('new-message', (data: unknown) => {
      if (data.conversationId === activeConversationId) {
        // Append new message to inline messages
        setInlineMessages(prev => {
          if (prev.some(m => m.id === data.message?.id)) return prev;
          return [...prev, data.message];
        });
        // Mark as read since conversation is open
        socket.markRead(activeConversationId);
      }
      // Refresh conversation list for latest message preview
      fetchConversations();
      fetchUnread();
    });
    return cleanup;
  }, [socket.connected, activeConversationId, socket, fetchConversations, fetchUnread]);

  // Typing indicators
  useEffect(() => {
    if (!socket.connected) return;
    const cleanup = socket.on('user-typing', (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId !== activeConversationId || data.userId === user?.id) return;
      setTypingUsers(prev => {
        const next = new Map(prev);
        if (data.isTyping) {
          // Clear previous timeout if exists
          const existing = next.get(data.userId);
          if (existing?.timeout) clearTimeout(existing.timeout);
          const timeout = setTimeout(() => {
            setTypingUsers(p => { const n = new Map(p); n.delete(data.userId); return n; });
          }, 5000);
          next.set(data.userId, { name: data.userId, timeout });
        } else {
          const existing = next.get(data.userId);
          if (existing?.timeout) clearTimeout(existing.timeout);
          next.delete(data.userId);
        }
        return next;
      });
    });
    return cleanup;
  }, [socket.connected, activeConversationId, socket, user?.id]);

  // Message status updates (delivered/read)
  useEffect(() => {
    if (!socket.connected) return;
    return socket.on('messages-status-update', (data) => {
      if (data.conversationId === activeConversationId) {
        setInlineMessages(prev => prev.map(msg => {
          if (data.messageIds?.includes(msg.id)) {
            return { ...msg, status: data.status as Message['status'] };
          }
          return msg;
        }));
      }
    });
  }, [socket.connected, activeConversationId, socket]);

  // ─── SERVICE WORKER + WEB PUSH REGISTRATION ────────────────
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        // 1. Register Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] Service Worker enregistré');

        // 2. Get VAPID public key
        const vapidResp = await api.get('/api/push/vapid-key') as unknown;
        if (!vapidResp?.publicKey) return;

        // 3. Subscribe to push (or get existing subscription)
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          // Ask permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;

          // Convert VAPID key
          const urlBase64ToUint8Array = (base64String: string) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const raw = window.atob(base64);
            const arr = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
            return arr;
          };

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidResp.publicKey),
          });
        }

        // 4. Send subscription to backend
        const subJSON = subscription.toJSON();
        await api.post('/api/push/subscribe', {
          endpoint: subJSON.endpoint,
          keys: subJSON.keys,
        });
        console.log('[PUSH] ✅ Notifications push activées');
      } catch (err) {
        console.warn('[SW] Erreur enregistrement push:', err);
      }
    };

    registerSW();

    // Listen for messages from Service Worker (e.g. when user clicks notification)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'INCOMING_CALL' && event.data?.callId) {
        // SW tells us about an incoming call click — the polling will pick it up
        console.log('[SW] Notification call clicked:', event.data.callId);
      }
      if (event.data?.type === 'INCOMING_TELNYX_CALL') {
        // Open dialer on incoming Telnyx call notification click
        setIsListOpen(true);
        setShowDialer(true);
        setActiveConversationId(null);
      }
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND' && event.data?.soundType) {
        // SW asked us to play a sound (SW can't use Web Audio API)
        playNotificationSound(event.data.soundType);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [user, api]);

  const fetchInlineMessages = useCallback(async (convId?: string) => {
    const id = convId || activeConversationId;
    if (!id) return;
    try {
      const data = await api.get(`/api/messenger/conversations/${id}/messages`) as unknown;
      if (data?.messages) setInlineMessages(data.messages);
    } catch { /* silent */ }
  }, [api, activeConversationId]);

  // Socket.io: Reaction events (must be after fetchInlineMessages declaration)
  useEffect(() => {
    if (!socket.connected) return;
    const cleanup1 = socket.on('reaction-added', () => { if (activeConversationId) fetchInlineMessages(); });
    const cleanup2 = socket.on('reaction-removed', () => { if (activeConversationId) fetchInlineMessages(); });
    return () => { cleanup1(); cleanup2(); };
  }, [socket.connected, activeConversationId, socket, fetchInlineMessages]);

  // Socket.io: Pin events
  useEffect(() => {
    if (!socket.connected) return;
    return socket.on('message-pinned', () => { if (activeConversationId) fetchInlineMessages(); });
  }, [socket.connected, activeConversationId, socket, fetchInlineMessages]);

  // Poll for new messages every 15s, refresh friends every 60s for online status
  const friendsPollCountRef = useRef(0);
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchUnread();
      if (isListOpen || openChats.length > 0) fetchConversations();
      if (activeConversationId) fetchInlineMessages();
      // Refresh friends list every 60s (every 4th poll) for online status updates
      friendsPollCountRef.current++;
      if (friendsPollCountRef.current >= 4) {
        friendsPollCountRef.current = 0;
        fetchFriends();
      }
    }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isListOpen, openChats, activeConversationId, fetchUnread, fetchConversations, fetchInlineMessages, fetchFriends]);

  // 🔊 Play notification sound when new unread messages arrive
  useEffect(() => {
    if (totalUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      playSound('messageNotification');
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread, playSound]);

  // Listen for open-messenger custom events (from ExplorePanel People tab, etc.)
  useEffect(() => {
    const handleOpenMessenger = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.conversationId) {
        setIsListOpen(true);
        setShowDialer(false);
        setActiveConversationId(detail.conversationId);
        setInlineMessages([]);
        setInlineNewMessage('');
        fetchInlineMessages(detail.conversationId);
        api.post(`/api/messenger/conversations/${detail.conversationId}/read`, {}).catch(() => {});
      }
    };
    window.addEventListener('open-messenger', handleOpenMessenger);
    return () => window.removeEventListener('open-messenger', handleOpenMessenger);
  }, [api, fetchInlineMessages]);

  // Listen for open-messenger-call events (click-to-call from Lead/Chantier)
  useEffect(() => {
    const handleOpenCall = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.phoneNumber && telnyxEligibility?.eligible) {
        setIsListOpen(true);
        setActiveConversationId(null);
        setShowNewChat(false);
        setShowDialer(true);
        setDialerInitialNumber(detail.phoneNumber);
      }
    };
    window.addEventListener('open-messenger-call', handleOpenCall);
    return () => window.removeEventListener('open-messenger-call', handleOpenCall);
  }, [telnyxEligibility?.eligible]);

  // Auto-scroll inline messages
  useEffect(() => {
    if (activeConversationId) {
      inlineMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [inlineMessages, activeConversationId]);

  // Poll for incoming calls every 10s
  useEffect(() => {
    if (activeCall) return; // don't poll while in a call
    const incomingPoll = setInterval(async () => {
      try {
        const data = await api.get('/api/calls/check/incoming') as unknown;
        if (data?.incoming) {
          const call = data.incoming;
          // Skip if this is the call we just ended (prevents re-triggering)
          if (call.id === lastEndedCallIdRef.current) return;
          const callerName = call.initiator ? `${call.initiator.firstName} ${call.initiator.lastName}` : 'Incoming call';

          // Browser notification (works even when tab is in background)
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`📞 ${call.callType === 'video' ? 'Video' : 'Audio'} call incoming`, {
                body: `${callerName} is calling...`,
                icon: call.initiator?.avatarUrl || '/favicon.ico',
                tag: `call-${call.id}`,
                requireInteraction: true,
              });
            } catch { /* silent - not all browsers support Notification */ }
          } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }

          setActiveCall({
            callId: call.id,
            callType: call.callType,
            isIncoming: true,
            conversationName: callerName,
          });
        }
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(incomingPoll);
  }, [api, activeCall]);

  // ─── ACTIONS ───────────────────────────────────────────────
  const openChat = (convId: string) => {
    // Open conversation inside the popup instead of a separate window
    setActiveConversationId(convId);
    setInlineMessages([]);
    setInlineNewMessage('');
    // Mark as read
    api.post(`/api/messenger/conversations/${convId}/read`, {}).catch(() => {});
    // Fetch messages
    fetchInlineMessages(convId);
  };

  const sendInlineMessage = async () => {
    // If files are pending, upload them first
    if (pendingFiles.length > 0) {
      await uploadAndSendFiles();
      return;
    }
    if (!inlineNewMessage.trim() || inlineSending || !activeConversationId) return;
    setInlineSending(true);
    try {
      const payload: Record<string, unknown> = { content: inlineNewMessage.trim() };
      if (ephemeralMode) {
        payload.isEphemeral = true;
        payload.ephemeralTtl = ephemeralTtl;
      }
      // Extract @mentions from content — find participant IDs matching @FirstName
      const mentionRegex = /@(\w+)/g;
      let match;
      const mentionIds: string[] = [];
      while ((match = mentionRegex.exec(inlineNewMessage)) !== null) {
        const name = match[1].toLowerCase();
        const found = currentParticipants.find(p => p.firstName.toLowerCase() === name);
        if (found) mentionIds.push(found.id);
      }
      if (mentionIds.length > 0) payload.mentions = mentionIds;

      await api.post(`/api/messenger/conversations/${activeConversationId}/messages`, payload);
      setInlineNewMessage('');
      setMentionQuery(null);
      await fetchInlineMessages();
      fetchConversations();
      inlineInputRef.current?.focus();
    } catch (e) { console.error('[MESSENGER] Send error:', e); }
    setInlineSending(false);
  };

  // 🎭 Wizz (MSN Messenger Nudge) — send + trigger
  const sendWizz = async () => {
    if (wizzCooldownRef.current || inlineSending || !activeConversationId) return;
    wizzCooldownRef.current = true;
    setInlineSending(true);
    try {
      await api.post(`/api/messenger/conversations/${activeConversationId}/messages`, {
        content: '😊~ Wizz!',
        mediaType: 'wizz',
      });
      // Trigger own shake + sound
      triggerWizz();
      await fetchInlineMessages();
      fetchConversations();
    } catch (e) { console.error('[MESSENGER] Wizz error:', e); }
    setInlineSending(false);
    setTimeout(() => { wizzCooldownRef.current = false; }, 3000);
  };

  // Detect incoming wizz messages from others
  useEffect(() => {
    if (!inlineMessages.length || !user?.id) return;
    const lastMsg = inlineMessages[inlineMessages.length - 1];
    if (
      lastMsg.mediaType === 'wizz' &&
      lastMsg.senderId !== user.id &&
      lastMsg.id !== lastSeenWizzIdRef.current
    ) {
      lastSeenWizzIdRef.current = lastMsg.id;
      triggerWizz();
    }
  }, [inlineMessages, user?.id, triggerWizz]);

  const goBackToList = () => {
    setActiveConversationId(null);
    setInlineMessages([]);
    setInlineNewMessage('');
    fetchConversations();
    fetchUnread();
  };

  const closeChat = (convId: string) => {
    setOpenChats(prev => prev.filter(id => id !== convId));
  };

  // ─── PHASE 2 ACTIONS ──────────────────────────────────────
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      await api.post(`/api/messenger/messages/${messageId}/reactions`, { emoji });
      fetchInlineMessages();
    } catch (e) { console.error('[MESSENGER] Reaction error:', e); }
  };

  const togglePin = async (messageId: string) => {
    try {
      await api.post(`/api/messenger/messages/${messageId}/pin`, {});
      fetchInlineMessages();
    } catch (e) { console.error('[MESSENGER] Pin error:', e); }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await api.delete(`/api/messenger/messages/${messageId}`);
      fetchInlineMessages();
      fetchConversations();
    } catch (e) { console.error('[MESSENGER] Delete error:', e); }
  };

  const sendVoiceMessage = async (blob: Blob, duration: number) => {
    if (!activeConversationId) return;
    try {
      // Step 1: Upload the voice file
      const uploadForm = new FormData();
      uploadForm.append('file', blob, 'voice.webm');
      const uploadResult = await api.post('/api/messenger/upload', uploadForm) as unknown;
      const urls = uploadResult?.urls;
      if (!urls || !urls.length) throw new Error('Voice upload failed');

      // Step 2: Send message with voice URLs
      await api.post(`/api/messenger/conversations/${activeConversationId}/messages`, {
        content: null,
        mediaUrls: urls,
        mediaType: 'voice',
        voiceDuration: Math.round(duration),
      });
      fetchInlineMessages();
      fetchConversations();
    } catch (e) { console.error('[MESSENGER] Voice send error:', e); }
    setShowVoiceRecorder(false);
  };

  const handleInputTyping = useCallback(() => {
    if (!activeConversationId || !socket.connected) return;
    socket.sendTyping(activeConversationId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.sendTyping(activeConversationId, false);
    }, 3000);
  }, [activeConversationId, socket]);

  const handleUpdateCustomStatus = async (status: string, emoji: string, expiresInMinutes?: number) => {
    try {
      await api.put('/api/messenger/status', { customStatus: status, customStatusEmoji: emoji, expiresInMinutes });
      if (socket.connected) socket.updateStatus(status, emoji, expiresInMinutes);
    } catch (e) { console.error('[MESSENGER] Status error:', e); }
  };

  // ─── FILE UPLOAD ───────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setPendingFiles(prev => [...prev, ...Array.from(files)]);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAndSendFiles = async () => {
    if (!activeConversationId || pendingFiles.length === 0) return;
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      pendingFiles.forEach(f => formData.append('file', f));
      const uploadResult = await api.post('/api/messenger/upload', formData) as unknown;
      const urls = uploadResult?.urls;
      const mediaType = uploadResult?.mediaType || 'file';
      if (!urls || !urls.length) throw new Error('Upload returned no URLs');
      // Send message with media
      await api.post(`/api/messenger/conversations/${activeConversationId}/messages`, {
        content: inlineNewMessage.trim() || null,
        mediaUrls: urls,
        mediaType,
      });
      setPendingFiles([]);
      setInlineNewMessage('');
      await fetchInlineMessages();
      fetchConversations();
    } catch (e) { console.error('[MESSENGER] File upload error:', e); antMessage.error('Erreur lors de l\'envoi du fichier'); }
    setUploadingFiles(false);
  };

  // ─── @ MENTIONS ────────────────────────────────────────────
  const currentParticipants = useMemo(() => {
    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv) return [];
    return conv.participants.filter(p => p.id !== user?.id);
  }, [conversations, activeConversationId, user?.id]);

  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return currentParticipants.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.firstName.toLowerCase().startsWith(q) ||
      p.lastName.toLowerCase().startsWith(q)
    ).slice(0, 5);
  }, [mentionQuery, currentParticipants]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInlineNewMessage(val);
    handleInputTyping();

    // Detect @ mention
    const cursorPos = e.target.selectionStart || val.length;
    const textBefore = val.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx >= 0 && (atIdx === 0 || textBefore[atIdx - 1] === ' ')) {
      const query = textBefore.slice(atIdx + 1);
      if (!query.includes(' ') || query.length < 20) {
        setMentionQuery(query);
        mentionStartPos.current = atIdx;
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (participant: Participant) => {
    const before = inlineNewMessage.slice(0, mentionStartPos.current);
    const after = inlineNewMessage.slice(
      mentionStartPos.current + 1 + (mentionQuery?.length || 0)
    );
    const displayName = `@${participant.firstName}`;
    const newVal = `${before}${displayName} ${after}`;
    setInlineNewMessage(newVal);
    setMentionQuery(null);
    mentionStartPos.current = -1;
    inlineInputRef.current?.focus();
  };

  // Build message action menu items
  const getMessageMenuItems = (msg: Message) => {
    const items: unknown[] = [];
    items.push({
      key: 'pin',
      icon: msg.isPinned ? <PushpinFilled /> : <PushpinOutlined />,
      label: msg.isPinned ? 'Désépingler' : 'Épingler',
      onClick: () => togglePin(msg.id),
    });
    items.push({
      key: 'task',
      icon: <CheckOutlined />,
      label: 'Créer une tâche',
      onClick: () => setTaskModalMessage(msg),
    });
    if (msg.senderId === user?.id) {
      items.push({ type: 'divider' as const });
      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Supprimer',
        danger: true,
        onClick: () => deleteMessage(msg.id),
      });
    }
    return items;
  };

  const startNewChat = async (friendId: string) => {
    try {
      const conv = await api.post('/api/messenger/conversations', { participantIds: [friendId] }) as unknown;
      if (conv?.id) {
        await fetchConversations();
        openChat(conv.id);
        setShowNewChat(false);
      }
    } catch (e) { console.error('[MESSENGER] Error starting chat:', e); }
  };

  // Start a call from a chat window
  const startCall = async (conversationId: string, callType: 'video' | 'audio', conversationName: string) => {
    try {
      const result = await api.post('/api/calls/start', { conversationId, callType }) as unknown;
      if (result?.call) {
        // Don't re-open a call we just ended
        if (result.call.id === lastEndedCallIdRef.current) return;
        setActiveCall({
          callId: result.call.id,
          callType,
          isIncoming: false,
          conversationName,
        });
      }
    } catch (e) { console.error('[MESSENGER] Error starting call:', e); }
  };

  // ─── HELPER: time ago ──────────────────────────────────────
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('common.justNow');
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  // Set of online friend IDs for quick lookup
  const onlineFriendIds = useMemo(() => new Set(friends.filter(f => f.online).map(f => f.id)), [friends]);

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(f =>
    !searchQuery || `${f.firstName} ${f.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // When searching in default view, show matching friends that don't have a conversation yet
  const searchMatchedFriends = searchQuery ? filteredFriends.filter(f => {
    // Exclude friends that already appear in filtered conversations
    const friendName = `${f.firstName} ${f.lastName}`.toLowerCase();
    return !filteredConversations.some(c => c.name.toLowerCase() === friendName);
  }) : [];

  // ═══════════════════════════════════════════════════════════
  // RENDER: Conversation list panel (bottom right)
  // ═══════════════════════════════════════════════════════════
  const renderList = () => {
    if (!isListOpen) return null;

    // If a conversation is open inside the popup, render the chat view
    if (activeConversationId) {
      const conv = conversations.find(c => c.id === activeConversationId);
      const convName = conv?.name || 'Conversation';
      const convAvatar = conv?.avatarUrl;
      const isGroup = conv?.isGroup;

      const formatTime = (date: string) => {
        const d = new Date(date);
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      };

      const handleInlineKeyDown = (e: React.KeyboardEvent) => {
        // Handle mention dropdown navigation
        if (mentionQuery !== null && mentionResults.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setMentionIndex(i => Math.max(i - 1, 0));
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertMention(mentionResults[mentionIndex]);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setMentionQuery(null);
            return;
          }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendInlineMessage();
        }
      };

      return (
        <>
        <style>{`
          @keyframes messengerWizz {
            0% { transform: translate(0, 0); }
            10% { transform: translate(-4px, -2px); }
            20% { transform: translate(4px, 2px); }
            30% { transform: translate(-3px, 3px); }
            40% { transform: translate(3px, -3px); }
            50% { transform: translate(-2px, 4px); }
            60% { transform: translate(2px, -4px); }
            70% { transform: translate(-4px, 1px); }
            80% { transform: translate(4px, -1px); }
            90% { transform: translate(-1px, -3px); }
            100% { transform: translate(0, 0); }
          }
          .messenger-wizz-shake {
            animation: messengerWizz 0.5s ease-in-out;
          }
          .global-wizz-shake {
            animation: messengerWizz 0.5s ease-in-out;
          }
          @keyframes typingDot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div className={isShaking ? 'messenger-wizz-shake' : ''} style={{
          position: 'fixed', bottom: 56, right: 16, width: CHAT_WIDTH, height: LIST_HEIGHT,
          background: FB.white, borderRadius: '8px 8px 0 0', boxShadow: '0 -2px 12px ${SF.overlayDarkLight}',
          display: 'flex', flexDirection: 'column', zIndex: 1100,
          border: `1px solid ${FB.border}`,
        }}>
          {/* Header with back button */}
          <div style={{
            padding: '8px 12px', borderBottom: `1px solid ${FB.border}`,
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div role="button" tabIndex={0} onClick={goBackToList}
              style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = FB.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <ArrowLeftOutlined style={{ fontSize: 16, color: FB.blue }} />
            </div>
            <Avatar size={32} src={convAvatar} icon={isGroup ? <TeamOutlined /> : <UserOutlined />}
              style={{ backgroundColor: convAvatar ? undefined : FB.blue, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {convName}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <div role="button" tabIndex={0} onClick={() => setShowSharedFiles(true)}
                title="Fichiers partagés"
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <FolderOpenOutlined style={{ fontSize: 14, color: FB.blue }} />
              </div>
              <div role="button" tabIndex={0} onClick={() => startCall(activeConversationId, 'audio', convName)}
                title={t('messenger.audioCall')}
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <PhoneOutlined style={{ fontSize: 14, color: FB.blue }} />
              </div>
              <div role="button" tabIndex={0} onClick={() => startCall(activeConversationId, 'video', convName)}
                title={t('messenger.videoCall')}
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <VideoCameraOutlined style={{ fontSize: 14, color: FB.blue }} />
              </div>
              <div role="button" tabIndex={0} onClick={() => { setIsListOpen(false); setActiveConversationId(null); }}
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <CloseOutlined style={{ fontSize: 14, color: FB.textSecondary }} />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {inlineMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: FB.textSecondary, fontSize: 13 }}>
                <Avatar size={56} src={convAvatar} icon={isGroup ? <TeamOutlined /> : <UserOutlined />}
                  style={{ backgroundColor: convAvatar ? undefined : FB.blue, marginBottom: 8 }} />
                <div style={{ fontWeight: 600, color: FB.text }}>{convName}</div>
                <div style={{ marginTop: 4 }}>{t('messenger.startWhispering')}</div>
              </div>
            )}
            {inlineMessages.map((msg, i) => {
              const isMine = msg.senderId === user?.id;

              // 🎭 Wizz messages — render as centered system message
              if (msg.mediaType === 'wizz') {
                return (
                  <div key={msg.id} style={{
                    display: 'flex', justifyContent: 'center', padding: '6px 0',
                    marginTop: (i > 0 && inlineMessages[i - 1].senderId !== msg.senderId) ? 8 : 0,
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff', fontSize: 12, padding: '4px 14px', borderRadius: 12,
                      fontStyle: 'italic', opacity: 0.85,
                    }}>
                      <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}><WizzIcon size={16} /></span>{isMine ? t('messenger.wizzSent') : `${msg.sender.firstName} ${t('messenger.wizzReceived')}`}
                    </div>
                  </div>
                );
              }

              const showAvatar = !isMine && (i === 0 || inlineMessages[i - 1].senderId !== msg.senderId);
              const showName = !isMine && isGroup && showAvatar;
              const isEph = msg.isEphemeral === true;

              // Track ephemeral views — fire once per message for recipient
              if (isEph && !isMine && !msg.viewedAt && !ephemeralViewedRef.current.has(msg.id)) {
                ephemeralViewedRef.current.add(msg.id);
                api.post(`/api/messenger/messages/${msg.id}/view-ephemeral`, {}).catch(() => {});
              }

              // Compute TTL remaining for ephemeral messages
              let ephTtlLabel = '';
              if (isEph && msg.viewedAt && msg.ephemeralTtl) {
                const viewed = new Date(msg.viewedAt).getTime();
                const expiresAt = viewed + msg.ephemeralTtl * 1000;
                const remaining = Math.max(0, expiresAt - Date.now());
                if (remaining <= 0) {
                  ephTtlLabel = t('messenger.ephemeralExpired', 'Expiré');
                } else if (remaining < 60000) {
                  ephTtlLabel = `${Math.ceil(remaining / 1000)}s`;
                } else if (remaining < 3600000) {
                  ephTtlLabel = `${Math.ceil(remaining / 60000)}m`;
                } else {
                  ephTtlLabel = `${Math.ceil(remaining / 3600000)}h`;
                }
              }

              return (
                <div key={msg.id} style={{
                  display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end', gap: 6,
                  marginTop: (i > 0 && inlineMessages[i - 1].senderId !== msg.senderId) ? 8 : 0,
                }}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {!isMine && (
                    <div style={{ width: 28, flexShrink: 0 }}>
                      {showAvatar && (
                        <Avatar size={28} src={msg.sender.avatarUrl} icon={<UserOutlined />}
                          style={{ backgroundColor: msg.sender.avatarUrl ? undefined : FB.blue }} />
                      )}
                    </div>
                  )}
                  <div style={{ maxWidth: '70%', position: 'relative' }}>
                    {showName && (
                      <div style={{ fontSize: 11, color: FB.textSecondary, marginBottom: 2, paddingLeft: 12 }}>
                        {msg.sender.firstName}
                      </div>
                    )}
                    {/* Pin indicator */}
                    {msg.isPinned && (
                      <div style={{ fontSize: 10, color: FB.blue, marginBottom: 2, paddingLeft: 12 }}>
                        <PushpinFilled style={{ marginRight: 3, fontSize: 10 }} /> Épinglé
                      </div>
                    )}
                    {/* Message actions on hover */}
                    {hoveredMessageId === msg.id && !msg.isDeleted && (
                      <div style={{
                        position: 'absolute', top: -6, [isMine ? 'left' : 'right']: -8,
                        display: 'flex', gap: 2, zIndex: 50,
                      }}>
                        <EmojiReactionPicker
                          onSelect={(emoji) => { toggleReaction(msg.id, emoji); }}
                          placement="top"
                        >
                          <Tooltip title="Réagir" zIndex={2100}>
                            <div
                              style={{ width: 24, height: 24, borderRadius: '50%', background: FB.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, boxShadow: '0 1px 3px ${SF.overlayDarkLight}' }}>
                              <SmileOutlined />
                            </div>
                          </Tooltip>
                        </EmojiReactionPicker>
                        <Dropdown menu={{ items: getMessageMenuItems(msg) }} trigger={['click']} placement="bottomRight" overlayStyle={{ zIndex: 2000 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: FB.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, boxShadow: '0 1px 3px ${SF.overlayDarkLight}' }}>
                            <MoreOutlined />
                          </div>
                        </Dropdown>
                      </div>
                    )}
                    <div style={{
                      padding: '8px 12px', borderRadius: 18,
                      background: isEph
                        ? (isMine ? 'linear-gradient(135deg, #E17055, #FDCB6E)' : 'linear-gradient(135deg, #FDCB6E, #E17055)')
                        : (isMine ? FB.msgBlueBg : FB.msgBg),
                      color: isEph ? '#fff' : (isMine ? '#fff' : FB.text),
                      fontSize: 14, lineHeight: '1.35', wordBreak: 'break-word',
                      border: isEph ? '1px solid rgba(225,112,85,0.3)' : undefined,
                    }}>
                      {msg.isDeleted ? (
                        <span style={{ fontStyle: 'italic', opacity: 0.6 }}>{t('messenger.messageDeleted')}</span>
                      ) : (
                        <>
                          {/* Voice / media preview */}
                          {msg.mediaUrls?.length ? (
                            <div style={{ marginBottom: msg.content ? 6 : 0 }}>
                              <FilePreview
                                urls={msg.mediaUrls}
                                mediaType={msg.mediaType || 'file'}
                                voiceDuration={msg.voiceDuration}
                                voiceTranscript={msg.voiceTranscript}
                              />
                            </div>
                          ) : null}
                          {msg.content && <span>{msg.content}</span>}
                          {isEph && (
                            <HourglassOutlined style={{ marginLeft: 6, fontSize: 11, opacity: 0.7, verticalAlign: 'middle' }} />
                          )}
                        </>
                      )}
                    </div>
                    {/* Reactions display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div style={{ marginTop: 2, paddingLeft: isMine ? 0 : 12, paddingRight: isMine ? 12 : 0 }}>
                        <MessageReactions
                          reactions={(msg.reactions || []).map(r => ({
                            emoji: r.emoji,
                            userId: r.users?.[0]?.id || '',
                            user: { id: r.users?.[0]?.id || '', firstName: r.users?.[0]?.name?.split(' ')[0] || '', lastName: r.users?.[0]?.name?.split(' ').slice(1).join(' ') || '' },
                          }))}
                          currentUserId={user?.id || ''}
                          onToggleReaction={(emoji) => toggleReaction(msg.id, emoji)}
                        />
                      </div>
                    )}
                    <div style={{
                      fontSize: 10, color: FB.textSecondary, marginTop: 2, display: 'flex', gap: 4,
                      alignItems: 'center',
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      paddingLeft: isMine ? 0 : 12, paddingRight: isMine ? 12 : 0,
                    }}>
                      {(i === inlineMessages.length - 1 || inlineMessages[i + 1].senderId !== msg.senderId) && (
                        <span>{formatTime(msg.createdAt)}</span>
                      )}
                      {/* Message status indicator for sent messages */}
                      {isMine && msg.status && (i === inlineMessages.length - 1 || inlineMessages[i + 1].senderId !== msg.senderId) && (
                        <MessageStatusIndicator status={msg.status} isOwnMessage={true} />
                      )}
                      {isEph && ephTtlLabel && (
                        <span style={{ color: '#E17055', fontWeight: 600 }}>⏳ {ephTtlLabel}</span>
                      )}
                      {isEph && !msg.viewedAt && !isMine && (
                        <span style={{ color: '#E17055' }}>🕯️</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Typing indicator */}
            {typingUsers.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', marginLeft: 34 }}>
                <div style={{
                  display: 'flex', gap: 3, background: FB.msgBg, borderRadius: 18, padding: '8px 14px',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: FB.textSecondary, animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: FB.textSecondary, animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: FB.textSecondary, animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={inlineMessagesEndRef} />
          </div>

          {/* Ephemeral mode banner */}
          {ephemeralMode && (
            <div style={{
              padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(225,112,85,0.12), rgba(253,203,110,0.12))',
              borderTop: `1px solid rgba(225,112,85,0.2)`, fontSize: 12,
            }}>
              <span style={{ color: '#E17055', fontWeight: 600 }}>
                <HourglassOutlined style={{ marginRight: 4 }} />
                {t('messenger.ephemeralMode', 'Éphémère')}
              </span>
              <select
                value={ephemeralTtl}
                onChange={e => setEphemeralTtl(Number(e.target.value))}
                style={{
                  border: 'none', background: 'transparent', color: '#E17055',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', outline: 'none',
                }}
              >
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
                <option value={3600}>1h</option>
                <option value={86400}>24h</option>
              </select>
            </div>
          )}

          {/* Voice Recorder overlay */}
          {showVoiceRecorder && (
            <div style={{
              padding: '8px 12px', borderTop: `1px solid ${FB.border}`, background: FB.bg,
            }}>
              <VoiceRecorder
                onSend={sendVoiceMessage}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            </div>
          )}

          {/* Pending files preview */}
          {pendingFiles.length > 0 && !showVoiceRecorder && (
            <div style={{
              padding: '6px 12px', borderTop: `1px solid ${FB.border}`, display: 'flex',
              gap: 6, flexWrap: 'wrap', background: FB.bg,
            }}>
              {pendingFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                  borderRadius: 12, background: FB.hover, fontSize: 12, color: FB.textSecondary,
                  maxWidth: 160, overflow: 'hidden',
                }}>
                  {f.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(f)} alt="" loading="lazy" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                  ) : (
                    <FileOutlined style={{ fontSize: 14 }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {f.name}
                  </span>
                  <DeleteOutlined
                    style={{ cursor: 'pointer', fontSize: 12, color: '#E17055' }}
                    onClick={() => removePendingFile(i)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          {!showVoiceRecorder && (
          <div style={{
            padding: '8px 12px', borderTop: pendingFiles.length > 0 ? 'none' : `1px solid ${FB.border}`,
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, position: 'relative',
          }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {/* @ Mention dropdown */}
            {mentionQuery !== null && mentionResults.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 12, right: 12,
                background: '#fff', border: `1px solid ${FB.border}`,
                borderRadius: 8, boxShadow: '0 -4px 12px ${SF.overlayDarkLight}',
                maxHeight: 180, overflowY: 'auto', zIndex: 1100,
              }}>
                {mentionResults.map((p, idx) => (
                  <div
                    key={p.id}
                    role="button" tabIndex={0} onClick={() => insertMention(p)}
                    style={{
                      padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer',
                      background: idx === mentionIndex ? (FB.hover || 'rgba(0,0,0,0.05)') : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setMentionIndex(idx)}
                  >
                    <Avatar size={24} src={p.avatarUrl} style={{ fontSize: 11 }}>
                      {p.firstName?.[0]}{p.lastName?.[0]}
                    </Avatar>
                    <span style={{ fontSize: 13, color: FB.text, fontWeight: 500 }}>
                      {p.firstName} {p.lastName}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Attach file button */}
            <div
              role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()}
              title={t('messenger.attachFile', 'Joindre un fichier')}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = FB.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <PaperClipOutlined style={{ fontSize: 16, color: FB.textSecondary }} />
            </div>

            {/* Text input */}
            <input
              ref={inlineInputRef}
              value={inlineNewMessage}
              onChange={handleInputChange}
              onKeyDown={handleInlineKeyDown}
              placeholder={t('messenger.placeholder', 'Aa')}
              autoFocus
              style={{
                flex: 1, border: 'none', outline: 'none', borderRadius: 20,
                padding: '8px 14px', background: FB.bg, fontSize: 14, color: FB.text,
              }}
            />

            {/* Emoji picker for input */}
            <EmojiReactionPicker
              onSelect={(emoji) => {
                setInlineNewMessage(prev => prev + emoji);
                inlineInputRef.current?.focus();
              }}
              placement="top"
            >
              <div
                title={t('messenger.emoji', 'Emoji')}
                style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <SmileOutlined style={{ fontSize: 16, color: FB.textSecondary }} />
              </div>
            </EmojiReactionPicker>

            {/* Voice button */}
            <div
              role="button" tabIndex={0} onClick={() => setShowVoiceRecorder(true)}
              title={t('messenger.voiceMessage', 'Message vocal')}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = FB.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <AudioOutlined style={{ fontSize: 16, color: FB.textSecondary }} />
            </div>

            {/* Ephemeral toggle */}
            <div
              role="button" tabIndex={0} onClick={() => setEphemeralMode(!ephemeralMode)}
              title={ephemeralMode ? t('messenger.ephemeralOn', 'Mode éphémère activé') : t('messenger.ephemeralOff', 'Mode éphémère désactivé')}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                background: ephemeralMode ? 'linear-gradient(135deg, #E17055, #FDCB6E)' : 'transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!ephemeralMode) e.currentTarget.style.background = FB.hover; }}
              onMouseLeave={e => { if (!ephemeralMode) e.currentTarget.style.background = 'transparent'; }}
            >
              <HourglassOutlined style={{ fontSize: 16, color: ephemeralMode ? '#fff' : FB.textSecondary }} />
            </div>

            {/* Wizz button - larger */}
            <div
              role="button" tabIndex={0} onClick={sendWizz}
              title={t('messenger.wizz')}
              style={{
                width: 40, height: 40, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: wizzCooldownRef.current ? 'not-allowed' : 'pointer',
                opacity: wizzCooldownRef.current ? 0.3 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!wizzCooldownRef.current) { e.currentTarget.style.background = FB.hover; e.currentTarget.style.transform = 'scale(1.15)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <WizzIcon size={30} />
            </div>

            {/* Send button */}
            <div
              role="button" tabIndex={0} onClick={uploadingFiles ? undefined : sendInlineMessage}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: (inlineNewMessage.trim() || pendingFiles.length > 0) && !uploadingFiles ? 'pointer' : 'default',
                opacity: (inlineNewMessage.trim() || pendingFiles.length > 0) ? 1 : 0.4,
              }}
            >
              {uploadingFiles ? (
                <span style={{ fontSize: 12, color: FB.textSecondary }}>⏳</span>
              ) : (
                <SendOutlined style={{ fontSize: 18, color: FB.blue }} />
              )}
            </div>
          </div>
          )}

          {/* Shared Files Drawer */}
          <Drawer
            title="📁 Fichiers partagés"
            placement="right"
            open={showSharedFiles}
            onClose={() => setShowSharedFiles(false)}
            width={320}
            zIndex={1200}
            destroyOnClose
          >
            {activeConversationId && (
              <SharedFilesPanel conversationId={activeConversationId} api={api} />
            )}
          </Drawer>

          {/* Task creation modal */}
          {taskModalMessage && (
            <TaskFromMessage
              open={!!taskModalMessage}
              onClose={() => setTaskModalMessage(null)}
              onSubmit={async (data) => {
                try {
                  await api.post(`/api/messenger/messages/${taskModalMessage.id}/task`, data);
                  setTaskModalMessage(null);
                  antMessage.success('Tâche créée !');
                } catch (e) { console.error('[MESSENGER] Task creation error:', e); antMessage.error('Erreur'); }
              }}
              messageContent={taskModalMessage.content || ''}
              participants={(conversations.find(c => c.id === activeConversationId)?.participants || []).map(p => ({
                id: p.id, firstName: p.firstName, lastName: p.lastName,
              }))}
            />
          )}

          {/* Custom Status Picker */}
          <CustomStatusPicker
            open={showCustomStatus}
            onClose={() => setShowCustomStatus(false)}
            onSubmit={handleUpdateCustomStatus}
          />
        </div>
        </>
      );
    }

    // Default: show conversation list
    return (
      <div style={{
        position: 'fixed', bottom: 56, right: 16, width: CHAT_WIDTH, height: LIST_HEIGHT,
        background: FB.white, borderRadius: '8px 8px 0 0', boxShadow: '0 -2px 12px ${SF.overlayDarkLight}',
        display: 'flex', flexDirection: 'column', zIndex: 1100,
        border: `1px solid ${FB.border}`,
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${FB.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: FB.text }}>
            {showDialer ? t('telnyx.phone', 'Téléphone') : t('messenger.whispers')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {telnyxEligibility?.eligible && (
              <div role="button" tabIndex={0} onClick={() => { setShowDialer(!showDialer); setShowNewChat(false); setActiveConversationId(null); }}
                title={t('telnyx.phone', 'Téléphone')}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: showDialer ? FB.blue : FB.hover,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                <PhoneOutlined style={{ fontSize: 16, color: showDialer ? '#fff' : undefined }} />
              </div>
            )}
            <div role="button" tabIndex={0} onClick={() => { setShowNewChat(!showNewChat); setShowDialer(false); }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: FB.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <EditOutlined style={{ fontSize: 16 }} />
            </div>
            <div role="button" tabIndex={0} onClick={() => setIsListOpen(false)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: FB.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseOutlined style={{ fontSize: 14 }} />
            </div>
          </div>
        </div>

        {/* Search (hidden when dialer is shown) */}
        {!showDialer && (
          <div style={{ padding: '8px 12px' }}>
            <Input
              prefix={<SearchOutlined style={{ color: FB.textSecondary }} />}
              placeholder={t('messenger.searchMessenger')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ borderRadius: 20, background: FB.bg, border: 'none' }}
              size="small"
            />
          </div>
        )}

        {/* Telnyx Dialer view */}
        {showDialer ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            <TelnyxDialer
              callState={telnyxCall.callState}
              isRegistered={telnyxCall.isRegistered}
              assignedNumber={telnyxEligibility?.assignedNumber || null}
              callDuration={telnyxCall.callDuration}
              isMuted={telnyxCall.isMuted}
              isOnHold={telnyxCall.isOnHold}
              callerInfo={telnyxCall.callerInfo}
              errorMessage={telnyxCall.errorMessage}
              makeCall={telnyxCall.makeCall}
              hangup={telnyxCall.hangup}
              answer={telnyxCall.answer}
              toggleMute={telnyxCall.toggleMute}
              toggleHold={telnyxCall.toggleHold}
              sendDTMF={telnyxCall.sendDTMF}
              initialNumber={dialerInitialNumber}
              onClose={() => { setShowDialer(false); setDialerInitialNumber(''); }}
            />
          </div>
        ) : showNewChat ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            <div style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>
              {t('messenger.newWhisper')}
            </div>
            {filteredFriends.map(friend => (
              <div key={friend.id}
                role="button" tabIndex={0} onClick={() => startNewChat(friend.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar size={36} src={friend.avatarUrl} icon={!friend.avatarUrl ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: !friend.avatarUrl ? FB.blue : undefined }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: FB.text }}>
                    {friend.firstName} {friend.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: FB.textSecondary }}>
                    {friend.isOrgMember ? '⬡ Colony' : '🐝 Free Bee'}
                  </div>
                </div>
              </div>
            ))}
            {filteredFriends.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: FB.textSecondary, fontSize: 13 }}>
                {t('messenger.noFriendsFound')}
              </div>
            )}
          </div>
        ) : (
          /* Conversation list */
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {/* ─── Horizontal friends bar (like Facebook Messenger) ─── */}
            {!searchQuery && friends.length > 0 && (
              <div style={{
                display: 'flex', gap: 12, padding: '8px 12px 4px', overflowX: 'auto',
                borderBottom: `1px solid ${FB.border}`, marginBottom: 4,
                scrollbarWidth: 'none', msOverflowStyle: 'none',
              }}>
                {friends.slice(0, 20).map(f => (
                  <div key={f.id}
                    role="button" tabIndex={0} onClick={() => startNewChat(f.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0, width: 56 }}
                  >
                    <div style={{ position: 'relative' }}>
                      <Avatar size={48} src={f.avatarUrl} icon={!f.avatarUrl ? <UserOutlined /> : undefined}
                        style={{ backgroundColor: !f.avatarUrl ? FB.blue : undefined }} />
                      {f.online && (
                        <div style={{
                          position: 'absolute', bottom: 1, right: 1, width: 12, height: 12,
                          borderRadius: '50%', background: FB.green, border: '2px solid #fff',
                        }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, color: FB.text, marginTop: 4, textAlign: 'center',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                    }}>
                      {f.firstName}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Search: matching friends (no existing conversation) ─── */}
            {searchMatchedFriends.length > 0 && (
              <>
                <div style={{ padding: '8px 16px 4px', fontSize: 12, fontWeight: 600, color: FB.textSecondary, textTransform: 'uppercase' }}>
                  {t('messenger.contacts')}
                </div>
                {searchMatchedFriends.map(f => (
                  <div key={`search-${f.id}`}
                    role="button" tabIndex={0} onClick={() => startNewChat(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ position: 'relative' }}>
                      <Avatar size={48} src={f.avatarUrl} icon={!f.avatarUrl ? <UserOutlined /> : undefined}
                        style={{ backgroundColor: !f.avatarUrl ? FB.blue : undefined, flexShrink: 0 }} />
                      {f.online && (
                        <div style={{
                          position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
                          borderRadius: '50%', background: FB.green, border: '2px solid #fff',
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: FB.text }}>{f.firstName} {f.lastName}</div>
                      <div style={{ fontSize: 12, color: FB.textSecondary }}>{f.isOrgMember ? '⬡ Colony' : '🐝 Free Bee'}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {filteredConversations.map(conv => (
              <div key={conv.id}
                role="button" tabIndex={0} onClick={() => openChat(conv.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                  cursor: 'pointer', transition: 'background 0.15s',
                  background: conv.unreadCount > 0 ? 'rgba(24,119,242,0.05)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = conv.unreadCount > 0 ? 'rgba(24,119,242,0.05)' : 'transparent'}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar size={48} src={conv.avatarUrl} icon={conv.isGroup ? <TeamOutlined /> : <UserOutlined />}
                    style={{ backgroundColor: conv.avatarUrl ? undefined : (conv.isGroup ? '#7c4dff' : FB.blue) }} />
                  {!conv.isGroup && conv.participants.some(p => p.id !== user?.id && onlineFriendIds.has(p.id)) && (
                    <div style={{
                      position: 'absolute', bottom: 1, right: 1, width: 12, height: 12,
                      borderRadius: '50%', background: FB.green, border: '2px solid #fff',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 500, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.name}
                    </span>
                    <span style={{ fontSize: 11, color: conv.unreadCount > 0 ? FB.blue : FB.textSecondary, flexShrink: 0, marginLeft: 4 }}>
                      {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, color: conv.unreadCount > 0 ? FB.text : FB.textSecondary,
                    fontWeight: conv.unreadCount > 0 ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {conv.lastMessage ? (
                      conv.lastMessage.mediaType === 'wizz'
                        ? (conv.lastMessage.senderId === user?.id ? `${t('messenger.youPrefix')}😊~ Wizz!` : '😊~ Wizz!')
                        : conv.lastMessage.senderId === user?.id
                          ? `${t('messenger.youPrefix')}${conv.lastMessage.content || t('messenger.media')}`
                          : conv.lastMessage.content || t('messenger.media')
                    ) : t('messenger.startAWhisper')}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', background: FB.blue, flexShrink: 0,
                  }} />
                )}
              </div>
            ))}
            {filteredConversations.length === 0 && searchMatchedFriends.length === 0 && !_loading && (
              <div style={{ padding: 30, textAlign: 'center', color: FB.textSecondary, fontSize: 14 }}>
                <MessageOutlined style={{ fontSize: 40, marginBottom: 12, display: 'block', opacity: 0.3 }} />
                {t('messenger.noWhispersYet')}
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  {t('messenger.tapToStart')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER: Fab button (bottom right)
  // ═══════════════════════════════════════════════════════════
  const renderFab = () => (
    <div
      role="button" tabIndex={0} onClick={() => { 
        if (isListOpen) {
          setIsListOpen(false);
          setActiveConversationId(null);
        } else {
          setIsListOpen(true);
        }
        setShowNewChat(false); 
        setSearchQuery(''); 
      }}
      style={{
        position: 'fixed', bottom: 16, right: 16, width: 48, height: 48,
        borderRadius: '50%', background: FB.blue, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px ${SF.overlayDark}',
        zIndex: 1100, transition: 'transform 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <MessageOutlined style={{ fontSize: 22, color: '#fff' }} />
      {totalUnread > 0 && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          minWidth: 20, height: 20, borderRadius: 10,
          background: '#ff3b30', color: '#fff',
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 5px',
          border: '2px solid #fff',
          boxShadow: '0 1px 4px ${SF.overlayDark}',
        }}>
          {totalUnread > 99 ? '99+' : totalUnread}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: Individual chat windows
  // ═══════════════════════════════════════════════════════════
  const renderChatWindows = () => openChats.map((convId, index) => (
    <ChatWindow
      key={convId}
      conversationId={convId}
      conversation={conversations.find(c => c.id === convId)}
      index={index}
      onClose={() => closeChat(convId)}
      api={api}
      userId={user?.id || ''}
      onRefresh={fetchConversations}
      onStartCall={startCall}
    />
  ));

  return (
    <>
      {renderFab()}
      {renderList()}
      {renderChatWindows()}
      {activeCall && (
        <VideoCallModal
          callId={activeCall.callId}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          conversationName={activeCall.conversationName}
          api={api}
          userId={user?.id || ''}
          onClose={() => {
            lastEndedCallIdRef.current = activeCall.callId;
            setActiveCall(null);
          }}
        />
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL CHAT WINDOW
// ═══════════════════════════════════════════════════════════════

interface ChatWindowProps {
  conversationId: string;
  conversation?: Conversation;
  index: number;
  onClose: () => void;
  api: unknown;
  userId: string;
  onRefresh: () => void;
  onStartCall: (conversationId: string, callType: 'video' | 'audio', conversationName: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, conversation, index, onClose, api, userId, onRefresh, onStartCall }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get(`/api/messenger/conversations/${conversationId}/messages`) as unknown;
      if (data?.messages) setMessages(data.messages);
    } catch { /* silent */ }
  }, [api, conversationId]);

  useEffect(() => {
    fetchMessages();
    // Mark as read
    api.post(`/api/messenger/conversations/${conversationId}/read`, {}).catch(() => {});
  }, [conversationId, fetchMessages, api]);

  // Poll for new messages
  useEffect(() => {
    pollRef.current = setInterval(fetchMessages, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!minimized) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, minimized]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/api/messenger/conversations/${conversationId}/messages`, {
        content: newMessage.trim(),
      });
      setNewMessage('');
      await fetchMessages();
      onRefresh();
      inputRef.current?.focus();
    } catch (e) { console.error('[MESSENGER] Send error:', e); }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 📅 Planifier un événement depuis la conversation
  const handleScheduleEvent = async (values: { title: string; date: dayjs.Dayjs; startTime: dayjs.Dayjs; endTime: dayjs.Dayjs }) => {
    try {
      const startDateTime = values.date.hour(values.startTime.hour()).minute(values.startTime.minute());
      const endDateTime = values.date.hour(values.endTime.hour()).minute(values.endTime.minute());

      await api.post('/api/calendar/events', {
        title: values.title || `RDV - ${convName}`,
        description: `Planifié depuis la conversation avec ${convName}`,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        allDay: false,
        type: 'rendez-vous',
        status: 'confirmé',
      });

      // Envoyer un message dans la conversation pour informer
      await api.post(`/api/messenger/conversations/${conversationId}/messages`, {
        content: `📅 J'ai planifié : ${values.title || 'RDV'} le ${startDateTime.format('DD/MM/YYYY')} de ${startDateTime.format('HH:mm')} à ${endDateTime.format('HH:mm')}`,
      });
      await fetchMessages();
      onRefresh();

      antMessage.success('Événement planifié !');
      setScheduleModalOpen(false);
    } catch (err) {
      console.error('[Messenger] Schedule error:', err);
      antMessage.error('Erreur lors de la planification');
    }
  };

  const convName = conversation?.name || 'Conversation';
  const convAvatar = conversation?.avatarUrl;
  const isGroup = conversation?.isGroup;
  const rightOffset = 16 + (index + 1) * (CHAT_WIDTH + 12);

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (minimized) {
    return (
      <div
        role="button" tabIndex={0} onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 16, right: rightOffset, width: 48, height: 48,
          borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 8px ${SF.overlayDarkSubtle}',
          zIndex: 1100, overflow: 'hidden',
        }}
      >
        <Avatar size={48} src={convAvatar} icon={isGroup ? <TeamOutlined /> : <UserOutlined />}
          style={{ backgroundColor: convAvatar ? undefined : FB.blue }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: rightOffset, width: CHAT_WIDTH,
      height: CHAT_HEIGHT, background: FB.white, borderRadius: '8px 8px 0 0',
      boxShadow: '0 -2px 12px ${SF.overlayDarkLight}', display: 'flex', flexDirection: 'column',
      zIndex: 1100, border: `1px solid ${FB.border}`,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px', borderBottom: `1px solid ${FB.border}`,
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0,
        background: FB.white, borderRadius: '8px 8px 0 0',
      }}>
        <Avatar size={32} src={convAvatar} icon={isGroup ? <TeamOutlined /> : <UserOutlined />}
          style={{ backgroundColor: convAvatar ? undefined : FB.blue, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }} role="button" tabIndex={0} onClick={() => setMinimized(true)}>
          <div style={{ fontSize: 13, fontWeight: 700, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {convName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <div role="button" tabIndex={0} onClick={() => onStartCall(conversationId, 'audio', convName)}
            title={t('messenger.audioCall')}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <PhoneOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
          <div role="button" tabIndex={0} onClick={() => onStartCall(conversationId, 'video', convName)}
            title={t('messenger.videoCall')}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <VideoCameraOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
          <div role="button" tabIndex={0} onClick={() => setMinimized(true)}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <MinusOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
          <div role="button" tabIndex={0} onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <CloseOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: FB.textSecondary, fontSize: 13 }}>
            <Avatar size={56} src={convAvatar} icon={isGroup ? <TeamOutlined /> : <UserOutlined />}
              style={{ backgroundColor: convAvatar ? undefined : FB.blue, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, color: FB.text }}>{convName}</div>
            <div style={{ marginTop: 4 }}>{t('messenger.startWhispering')}</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.senderId === userId;
          const showAvatar = !isMine && (i === 0 || messages[i - 1].senderId !== msg.senderId);
          const showName = !isMine && isGroup && showAvatar;

          return (
            <div key={msg.id} style={{
              display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end', gap: 6,
              marginTop: (i > 0 && messages[i - 1].senderId !== msg.senderId) ? 8 : 0,
            }}>
              {!isMine && (
                <div style={{ width: 28, flexShrink: 0 }}>
                  {showAvatar && (
                    <Avatar size={28} src={msg.sender.avatarUrl} icon={<UserOutlined />}
                      style={{ backgroundColor: msg.sender.avatarUrl ? undefined : FB.blue }} />
                  )}
                </div>
              )}
              <div style={{ maxWidth: '70%' }}>
                {showName && (
                  <div style={{ fontSize: 11, color: FB.textSecondary, marginBottom: 2, paddingLeft: 12 }}>
                    {msg.sender.firstName}
                  </div>
                )}
                <div style={{
                  padding: '8px 12px', borderRadius: 18,
                  background: isMine ? FB.msgBlueBg : FB.msgBg,
                  color: isMine ? '#fff' : FB.text,
                  fontSize: 14, lineHeight: '1.35', wordBreak: 'break-word',
                }}>
                  {msg.isDeleted ? (
                    <span style={{ fontStyle: 'italic', opacity: 0.6 }}>{t('messenger.messageDeleted')}</span>
                  ) : (
                    msg.content
                  )}
                </div>
                {/* Show time on last message of a group */}
                {(i === messages.length - 1 || messages[i + 1].senderId !== msg.senderId) && (
                  <div style={{
                    fontSize: 10, color: FB.textSecondary, marginTop: 2,
                    textAlign: isMine ? 'right' : 'left', paddingLeft: isMine ? 0 : 12, paddingRight: isMine ? 12 : 0,
                  }}>
                    {formatTime(msg.createdAt)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '8px 12px', borderTop: `1px solid ${FB.border}`, display: 'flex',
        alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <div
          role="button" tabIndex={0} onClick={() => setScheduleModalOpen(true)}
          title="Planifier un RDV"
          style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = FB.hover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <CalendarOutlined style={{ fontSize: 16, color: FB.blue }} />
        </div>
        <input
          ref={inputRef}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Aa"
          style={{
            flex: 1, border: 'none', outline: 'none', borderRadius: 20,
            padding: '8px 14px', background: FB.bg, fontSize: 14, color: FB.text,
          }}
        />
        <div
          role="button" tabIndex={0} onClick={sendMessage}
          style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'default',
            opacity: newMessage.trim() ? 1 : 0.4,
          }}
        >
          <SendOutlined style={{ fontSize: 18, color: FB.blue }} />
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal
        title="📅 Planifier un événement"
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        footer={null}
        width={360}
        zIndex={1200}
      >
        <Form layout="vertical" onFinish={handleScheduleEvent} initialValues={{
          date: dayjs(),
          startTime: dayjs().add(1, 'hour').startOf('hour'),
          endTime: dayjs().add(2, 'hour').startOf('hour'),
          title: `RDV - ${convName}`,
        }}>
          <Form.Item name="title" label={t('fields.title')} rules={[{ required: true }]}>
            <Input placeholder="Titre de l'événement" />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="startTime" label="Début" style={{ flex: 1 }} rules={[{ required: true }]}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="endTime" label="Fin" style={{ flex: 1 }} rules={[{ required: true }]}>
              <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item style={{ marginBottom: 0 }}>
            <button type="submit" style={{
              width: '100%', padding: '8px 16px', borderRadius: 6, border: 'none',
              background: FB.blue, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Planifier
            </button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FRIENDS WIDGET (for right sidebar)
// ═══════════════════════════════════════════════════════════════

interface FriendsWidgetProps {
  onStartChat: (friendId: string) => void;
}

export const FriendsWidget: React.FC<FriendsWidgetProps> = ({ onStartChat }) => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [_pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get('/api/friends') as unknown;
        if (data?.friends) {
          // Sort: online friends first, then alphabetical
          const sorted = [...data.friends].sort((a: Friend, b: Friend) => {
            if (a.online && !b.online) return -1;
            if (!a.online && b.online) return 1;
            return (a.firstName || '').localeCompare(b.firstName || '');
          });
          setFriends(sorted);
        }
        if (data?.pendingReceived) setPendingCount(data.pendingReceived.length);
      } catch { /* silent */ }
    };
    fetch();
  }, [api]);

  const orgFriends = friends.filter(f => f.isOrgMember);
  const externalFriends = friends.filter(f => !f.isOrgMember);

  return (
    <div>
      {/* Org members */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>
          {t('messenger.colonyContacts')}
        </span>
        <span style={{ fontSize: 12, color: FB.textSecondary }}>{orgFriends.length}</span>
      </div>
      {orgFriends.slice(0, 8).map(friend => (
        <div key={friend.id}
          role="button" tabIndex={0} onClick={() => onStartChat(friend.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px',
            borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = FB.hover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ position: 'relative' }}>
            <Avatar size={32} src={friend.avatarUrl} icon={!friend.avatarUrl ? <UserOutlined /> : undefined}
              style={{ backgroundColor: !friend.avatarUrl ? FB.blue : undefined }} />
            {friend.online && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
                borderRadius: '50%', background: FB.green, border: '2px solid #fff',
              }} />
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: FB.text }}>
            {friend.firstName} {friend.lastName}
          </span>
        </div>
      ))}

      {/* External friends */}
      {externalFriends.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>
              {t('messenger.externalFriends')}
            </span>
            <span style={{ fontSize: 12, color: FB.textSecondary }}>{externalFriends.length}</span>
          </div>
          {externalFriends.slice(0, 5).map(friend => (
            <div key={friend.id}
              role="button" tabIndex={0} onClick={() => onStartChat(friend.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px',
                borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = FB.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ position: 'relative' }}>
                <Avatar size={32} src={friend.avatarUrl} icon={!friend.avatarUrl ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: !friend.avatarUrl ? '#7c4dff' : undefined }} />
                {friend.online && (
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
                    borderRadius: '50%', background: FB.green, border: '2px solid #fff',
                  }} />
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: FB.text }}>
                {friend.firstName} {friend.lastName}
              </span>
            </div>
          ))}
        </>
      )}

      {friends.length === 0 && (
        <div style={{ textAlign: 'center', padding: 12, color: FB.textSecondary, fontSize: 13 }}>
          {t('messenger.noContactsYet')}
        </div>
      )}
    </div>
  );
};

export default MessengerChat;

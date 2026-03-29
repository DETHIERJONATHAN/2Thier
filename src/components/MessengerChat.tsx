import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar, Input } from 'antd';
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
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import VideoCallModal from './VideoCallModal';
import TelnyxDialer from './TelnyxDialer';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { useTelnyxCall, type TelnyxEligibility } from '../hooks/useTelnyxCall';
import { useNotificationSound, playNotificationSound } from '../hooks/useNotificationSound';

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

interface Message {
  id: string;
  content: string | null;
  senderId: string;
  sender: Participant;
  mediaUrls: string[] | null;
  mediaType: string | null;
  isDeleted: boolean;
  createdAt: string;
  replyTo: { id: string; content: string | null; sender: { firstName: string; lastName: string } } | null;
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

const FB = {
  blue: '#1877f2', bg: '#f0f2f5', white: '#fff', text: '#1c1e21',
  textSecondary: '#65676b', border: '#e4e6eb', green: '#31a24c',
  hover: '#f2f3f5', msgBg: '#e4e6eb', msgBlueBg: '#0084ff',
};

const CHAT_WIDTH = 338;
const CHAT_HEIGHT = 455;
const LIST_HEIGHT = 500;

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
  const wizzCooldownRef = useRef(false);

  // Video call state
  const [activeCall, setActiveCall] = useState<{ callId: string; callType: 'video' | 'audio'; isIncoming: boolean; conversationName: string } | null>(null);
  const lastEndedCallIdRef = useRef<string | null>(null);
  const [_loading, _setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  // 🔊 Notification sounds
  const { play: playSound, stop: stopSound } = useNotificationSound();
  const prevUnreadRef = useRef(0);

  // Telnyx phone state
  const [telnyxEligibility, setTelnyxEligibility] = useState<TelnyxEligibility | null>(null);
  const [showDialer, setShowDialer] = useState(false);
  const [dialerInitialNumber, setDialerInitialNumber] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── DATA FETCHING ─────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.get('/api/messenger/conversations');
      if (Array.isArray(data)) setConversations(data);
    } catch { /* silent */ }
  }, [api]);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await api.get('/api/messenger/unread');
      if (data && typeof data.unread === 'number') setTotalUnread(data.unread);
    } catch { /* silent */ }
  }, [api]);

  const fetchFriends = useCallback(async () => {
    try {
      const data = await api.get('/api/friends');
      if (data?.friends) setFriends(data.friends);
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
    onIncomingCall: (callerNumber, callerName) => {
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

  // ─── SERVICE WORKER + WEB PUSH REGISTRATION ────────────────
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        // 1. Register Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] Service Worker enregistré');

        // 2. Get VAPID public key
        const vapidResp = await api.get('/api/push/vapid-key') as any;
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
      const data = await api.get(`/api/messenger/conversations/${id}/messages`);
      if (data?.messages) setInlineMessages(data.messages);
    } catch { /* silent */ }
  }, [api, activeConversationId]);

  // Poll for new messages every 5s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchUnread();
      if (isListOpen || openChats.length > 0) fetchConversations();
      if (activeConversationId) fetchInlineMessages();
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isListOpen, openChats, activeConversationId, fetchUnread, fetchConversations, fetchInlineMessages]);

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

  // Poll for incoming calls every 3s
  useEffect(() => {
    if (activeCall) return; // don't poll while in a call
    const incomingPoll = setInterval(async () => {
      try {
        const data = await api.get('/api/calls/check/incoming') as any;
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
    }, 3000);
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
    if (!inlineNewMessage.trim() || inlineSending || !activeConversationId) return;
    setInlineSending(true);
    try {
      await api.post(`/api/messenger/conversations/${activeConversationId}/messages`, {
        content: inlineNewMessage.trim(),
      });
      setInlineNewMessage('');
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
        content: '🎭 Wizz!',
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

  const triggerWizz = useCallback(() => {
    setIsShaking(true);
    playSound('wizz');
    setTimeout(() => setIsShaking(false), 600);
  }, [playSound]);

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

  const startNewChat = async (friendId: string) => {
    try {
      const conv = await api.post('/api/messenger/conversations', { participantIds: [friendId] });
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
      const result = await api.post('/api/calls/start', { conversationId, callType }) as any;
      if (result?.call) {
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
        `}</style>
        <div className={isShaking ? 'messenger-wizz-shake' : ''} style={{
          position: 'fixed', bottom: 56, right: 16, width: CHAT_WIDTH, height: LIST_HEIGHT,
          background: FB.white, borderRadius: '8px 8px 0 0', boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', zIndex: 1100,
          border: `1px solid ${FB.border}`,
        }}>
          {/* Header with back button */}
          <div style={{
            padding: '8px 12px', borderBottom: `1px solid ${FB.border}`,
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div onClick={goBackToList}
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
              <div onClick={() => startCall(activeConversationId, 'audio', convName)}
                title={t('messenger.audioCall')}
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <PhoneOutlined style={{ fontSize: 14, color: FB.blue }} />
              </div>
              <div onClick={() => startCall(activeConversationId, 'video', convName)}
                title={t('messenger.videoCall')}
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <VideoCameraOutlined style={{ fontSize: 14, color: FB.blue }} />
              </div>
              <div onClick={() => { setIsListOpen(false); setActiveConversationId(null); }}
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
                      🎭 {isMine ? t('messenger.wizzSent') : `${msg.sender.firstName} ${t('messenger.wizzReceived')}`}
                    </div>
                  </div>
                );
              }

              const showAvatar = !isMine && (i === 0 || inlineMessages[i - 1].senderId !== msg.senderId);
              const showName = !isMine && isGroup && showAvatar;

              return (
                <div key={msg.id} style={{
                  display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end', gap: 6,
                  marginTop: (i > 0 && inlineMessages[i - 1].senderId !== msg.senderId) ? 8 : 0,
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
                    {(i === inlineMessages.length - 1 || inlineMessages[i + 1].senderId !== msg.senderId) && (
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
            <div ref={inlineMessagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 12px', borderTop: `1px solid ${FB.border}`, display: 'flex',
            alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            <input
              ref={inlineInputRef}
              value={inlineNewMessage}
              onChange={e => setInlineNewMessage(e.target.value)}
              onKeyDown={handleInlineKeyDown}
              placeholder="Aa"
              autoFocus
              style={{
                flex: 1, border: 'none', outline: 'none', borderRadius: 20,
                padding: '8px 14px', background: FB.bg, fontSize: 14, color: FB.text,
              }}
            />
            <div
              onClick={sendWizz}
              title={t('messenger.wizz')}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: wizzCooldownRef.current ? 'not-allowed' : 'pointer',
                opacity: wizzCooldownRef.current ? 0.3 : 0.7,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { if (!wizzCooldownRef.current) e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = FB.hover; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = wizzCooldownRef.current ? '0.3' : '0.7'; e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 18 }}>🎭</span>
            </div>
            <div
              onClick={sendInlineMessage}
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: inlineNewMessage.trim() ? 'pointer' : 'default',
                opacity: inlineNewMessage.trim() ? 1 : 0.4,
              }}
            >
              <SendOutlined style={{ fontSize: 18, color: FB.blue }} />
            </div>
          </div>
        </div>
        </>
      );
    }

    // Default: show conversation list
    return (
      <div style={{
        position: 'fixed', bottom: 56, right: 16, width: CHAT_WIDTH, height: LIST_HEIGHT,
        background: FB.white, borderRadius: '8px 8px 0 0', boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
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
              <div onClick={() => { setShowDialer(!showDialer); setShowNewChat(false); setActiveConversationId(null); }}
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
            <div onClick={() => { setShowNewChat(!showNewChat); setShowDialer(false); }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: FB.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <EditOutlined style={{ fontSize: 16 }} />
            </div>
            <div onClick={() => setIsListOpen(false)}
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
                onClick={() => startNewChat(friend.id)}
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
                    onClick={() => startNewChat(f.id)}
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
                    onClick={() => startNewChat(f.id)}
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
                onClick={() => openChat(conv.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                  cursor: 'pointer', transition: 'background 0.15s',
                  background: conv.unreadCount > 0 ? 'rgba(24,119,242,0.05)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = conv.unreadCount > 0 ? 'rgba(24,119,242,0.05)' : 'transparent'}
              >
                <Avatar size={48} src={conv.avatarUrl} icon={conv.isGroup ? <TeamOutlined /> : <UserOutlined />}
                  style={{ backgroundColor: conv.avatarUrl ? undefined : (conv.isGroup ? '#7c4dff' : FB.blue), flexShrink: 0 }} />
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
                        ? (conv.lastMessage.senderId === user?.id ? `${t('messenger.youPrefix')}🎭 Wizz!` : '🎭 Wizz!')
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
      onClick={() => { 
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
        justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
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
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
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
  api: any;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get(`/api/messenger/conversations/${conversationId}/messages`);
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
    pollRef.current = setInterval(fetchMessages, 3000);
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
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 16, right: rightOffset, width: 48, height: 48,
          borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
      boxShadow: '0 -2px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
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
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setMinimized(true)}>
          <div style={{ fontSize: 13, fontWeight: 700, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {convName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <div onClick={() => onStartCall(conversationId, 'audio', convName)}
            title={t('messenger.audioCall')}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <PhoneOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
          <div onClick={() => onStartCall(conversationId, 'video', convName)}
            title={t('messenger.videoCall')}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <VideoCameraOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
          <div onClick={() => setMinimized(true)}
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <MinusOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
          <div onClick={onClose}
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
          onClick={sendMessage}
          style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'default',
            opacity: newMessage.trim() ? 1 : 0.4,
          }}
        >
          <SendOutlined style={{ fontSize: 18, color: FB.blue }} />
        </div>
      </div>
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
        const data = await api.get('/api/friends');
        if (data?.friends) setFriends(data.friends);
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
          onClick={() => onStartChat(friend.id)}
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
              onClick={() => onStartChat(friend.id)}
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

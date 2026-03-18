import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import VideoCallModal from './VideoCallModal';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';

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
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  // Panel & chat state
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null); // conversation open inside popup
  const [openChats, setOpenChats] = useState<string[]>([]); // conversation IDs of open chat windows
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [inlineMessages, setInlineMessages] = useState<Message[]>([]);
  const [inlineNewMessage, setInlineNewMessage] = useState('');
  const [inlineSending, setInlineSending] = useState(false);
  const inlineMessagesEndRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Video call state
  const [activeCall, setActiveCall] = useState<{ callId: string; callType: 'video' | 'audio'; isIncoming: boolean; conversationName: string } | null>(null);
  const [_loading, _setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

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

  // Sync org friends on first load
  useEffect(() => {
    if (!user) return;
    api.post('/api/friends/sync-org', {}).catch(() => {});
    fetchConversations();
    fetchFriends();
    fetchUnread();
  }, [user, api, fetchConversations, fetchFriends, fetchUnread]);

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
          const callerName = call.initiator ? `${call.initiator.firstName} ${call.initiator.lastName}` : 'Appel entrant';

          // Browser notification (works even when tab is in background)
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`📞 Appel ${call.callType === 'video' ? 'vidéo' : 'audio'} entrant`, {
                body: `${callerName} vous appelle...`,
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
    if (mins < 1) return 'à l\'instant';
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
        <div style={{
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
                title="Appel audio"
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = FB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <PhoneOutlined style={{ fontSize: 14, color: FB.blue }} />
              </div>
              <div onClick={() => startCall(activeConversationId, 'video', convName)}
                title="Appel vidéo"
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
                <div style={{ marginTop: 4 }}>Commencez la conversation !</div>
              </div>
            )}
            {inlineMessages.map((msg, i) => {
              const isMine = msg.senderId === user?.id;
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
                        <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Message supprimé</span>
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
          <span style={{ fontSize: 20, fontWeight: 800, color: FB.text }}>Discussions</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={() => setShowNewChat(!showNewChat)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: FB.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <EditOutlined style={{ fontSize: 16 }} />
            </div>
            <div onClick={() => setIsListOpen(false)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: FB.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CloseOutlined style={{ fontSize: 14 }} />
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: FB.textSecondary }} />}
            placeholder="Rechercher dans Messenger"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ borderRadius: 20, background: FB.bg, border: 'none' }}
            size="small"
          />
        </div>

        {/* New chat: friend list */}
        {showNewChat ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            <div style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>
              Nouvelle conversation
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
                    {friend.isOrgMember ? '🏢 Organisation' : '👤 Externe'}
                  </div>
                </div>
              </div>
            ))}
            {filteredFriends.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: FB.textSecondary, fontSize: 13 }}>
                Aucun ami trouvé
              </div>
            )}
          </div>
        ) : (
          /* Conversation list */
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
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
                      conv.lastMessage.senderId === user?.id
                        ? `Vous : ${conv.lastMessage.content || '📎 Média'}`
                        : conv.lastMessage.content || '📎 Média'
                    ) : 'Démarrer la conversation'}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', background: FB.blue, flexShrink: 0,
                  }} />
                )}
              </div>
            ))}
            {filteredConversations.length === 0 && !_loading && (
              <div style={{ padding: 30, textAlign: 'center', color: FB.textSecondary, fontSize: 14 }}>
                <MessageOutlined style={{ fontSize: 40, marginBottom: 12, display: 'block', opacity: 0.3 }} />
                Aucune conversation
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Cliquez sur <EditOutlined /> pour démarrer
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
          onClose={() => setActiveCall(null)}
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
            title="Appel audio"
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = FB.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <PhoneOutlined style={{ fontSize: 14, color: FB.blue }} />
          </div>
          <div onClick={() => onStartCall(conversationId, 'video', convName)}
            title="Appel vidéo"
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
            <div style={{ marginTop: 4 }}>Commencez la conversation !</div>
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
                    <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Message supprimé</span>
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
          Contacts de l'organisation
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
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
              borderRadius: '50%', background: FB.green, border: '2px solid #fff',
            }} />
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
              Amis externes
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
              <Avatar size={32} src={friend.avatarUrl} icon={!friend.avatarUrl ? <UserOutlined /> : undefined}
                style={{ backgroundColor: !friend.avatarUrl ? '#7c4dff' : undefined }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: FB.text }}>
                {friend.firstName} {friend.lastName}
              </span>
            </div>
          ))}
        </>
      )}

      {friends.length === 0 && (
        <div style={{ textAlign: 'center', padding: 12, color: FB.textSecondary, fontSize: 13 }}>
          Aucun contact pour l'instant
        </div>
      )}
    </div>
  );
};

export default MessengerChat;

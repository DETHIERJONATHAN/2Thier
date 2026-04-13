/**
 * 🔌 useSocket — React hook for Socket.io real-time connection
 * 
 * Manages WebSocket connection lifecycle, authentication,
 * and provides typed event emitters/listeners for the Messenger.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  /** JWT token for authentication */
  token: string | null;
  /** Whether to connect (set false to defer connection) */
  enabled?: boolean;
}

interface SocketEvents {
  // Incoming events
  'new-message': (data: unknown) => void;
  'messages-status-update': (data: { conversationId: string; messageIds?: string[]; status: string; readBy?: string; timestamp: string }) => void;
  'user-typing': (data: { userId: string; conversationId: string; isTyping: boolean }) => void;
  'reaction-added': (data: { messageId: string; userId: string; emoji: string; userName: string }) => void;
  'reaction-removed': (data: { messageId: string; userId: string; emoji: string }) => void;
  'message-pinned': (data: { messageId: string; isPinned: boolean; pinnedBy: any }) => void;
  'task-created': (data: { task: unknown; messageId: string }) => void;
  'task-updated': (data: { task: any }) => void;
  'members-added': (data: { conversationId: string; addedUserIds: string[]; addedBy: string }) => void;
  'member-removed': (data: { conversationId: string; removedUserId: string; removedBy: string }) => void;
  'permissions-updated': (data: { conversationId: string; targetUserId: string; permissions: any }) => void;
  'user-status-changed': (data: { userId: string; customStatus: string | null; customStatusEmoji: string | null }) => void;
  'message-deleted': (data: { messageId: string; conversationId: string }) => void;
}

export function useSocket({ token, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());

  // Determine server URL
  const getServerUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    // In production, Socket.io connects to the same origin
    // In development, connect to the API server
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    return window.location.origin;
  }, []);

  // Initialize connection
  useEffect(() => {
    if (!enabled || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const serverUrl = getServerUrl();
    if (!serverUrl) return;

    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('🔌 [SOCKET] Connected:', socket.id);
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [SOCKET] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('🔌 [SOCKET] Connection error:', err.message);
      setConnectionError(err.message);
      setConnected(false);
    });

    // Re-emit all registered listeners
    for (const [event, handlers] of listenersRef.current.entries()) {
      for (const handler of handlers) {
        socket.on(event, handler as unknown);
      }
    }

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, enabled, getServerUrl]);

  // Join a conversation room
  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('join-conversation', conversationId);
  }, []);

  // Leave a conversation room
  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('leave-conversation', conversationId);
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { conversationId, isTyping });
  }, []);

  // Mark messages as delivered
  const markDelivered = useCallback((conversationId: string, messageIds: string[]) => {
    socketRef.current?.emit('messages-delivered', { conversationId, messageIds });
  }, []);

  // Mark messages as read
  const markRead = useCallback((conversationId: string) => {
    socketRef.current?.emit('messages-read', { conversationId });
  }, []);

  // Update custom status
  const updateStatus = useCallback((status?: string, emoji?: string, expiresInMinutes?: number) => {
    socketRef.current?.emit('update-status', { status, emoji, expiresInMinutes });
  }, []);

  // Listen for events
  const on = useCallback(<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => {
    // Track listener
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);

    // Attach to current socket
    socketRef.current?.on(event, handler as unknown);

    // Return cleanup function
    return () => {
      listenersRef.current.get(event)?.delete(handler);
      socketRef.current?.off(event, handler as unknown);
    };
  }, []);

  // Remove listener
  const off = useCallback(<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => {
    listenersRef.current.get(event)?.delete(handler);
    socketRef.current?.off(event, handler as unknown);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    connectionError,
    joinConversation,
    leaveConversation,
    sendTyping,
    markDelivered,
    markRead,
    updateStatus,
    on,
    off,
  };
}

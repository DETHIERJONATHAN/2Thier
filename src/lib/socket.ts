/**
 * 🔌 Socket.io Server — Zhiive Messenger Real-time
 * 
 * Handles WebSocket connections for:
 * - Real-time messaging (new messages, edits, deletes)
 * - Message status (delivered/read receipts)
 * - Typing indicators
 * - Reactions
 * - Presence (online/offline/custom status)
 * - Pin/unpin notifications
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from './database';

let io: SocketIOServer | null = null;

// Map userId -> Set<socketId> (user can have multiple tabs/devices)
const userSockets = new Map<string, Set<string>>();
// Map socketId -> userId
const socketToUser = new Map<string, string>();

/**
 * Initialize Socket.io server with JWT authentication
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL || 'https://app.2thier.be']
        : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // 🔐 Authentication middleware — verify JWT before connection
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string };
      if (!decoded?.id) {
        return next(new Error('Invalid token'));
      }

      // Attach user info to socket
      (socket as any).userId = decoded.id;
      (socket as any).userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // 🔌 Connection handler
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`🔌 [SOCKET] User ${userId} connected (${socket.id})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);
    socketToUser.set(socket.id, userId);

    // Update presence
    updateUserPresence(userId, true);

    // Join user's conversation rooms
    joinUserConversations(socket, userId);

    // ── Event Handlers ──

    // Join a specific conversation room
    socket.on('join-conversation', (conversationId: string) => {
      if (typeof conversationId === 'string' && conversationId.length < 100) {
        socket.join(`conv:${conversationId}`);
      }
    });

    // Leave a conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      if (typeof conversationId === 'string') {
        socket.leave(`conv:${conversationId}`);
      }
    });

    // Typing indicator
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (!data?.conversationId || typeof data.isTyping !== 'boolean') return;
      socket.to(`conv:${data.conversationId}`).emit('user-typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // Mark messages as delivered
    socket.on('messages-delivered', async (data: { conversationId: string; messageIds: string[] }) => {
      if (!data?.conversationId || !Array.isArray(data.messageIds)) return;
      try {
        const now = new Date();
        await db.message.updateMany({
          where: {
            id: { in: data.messageIds },
            conversationId: data.conversationId,
            senderId: { not: userId },
            status: 'sent',
          },
          data: { status: 'delivered', deliveredAt: now },
        });
        // Notify sender
        socket.to(`conv:${data.conversationId}`).emit('messages-status-update', {
          conversationId: data.conversationId,
          messageIds: data.messageIds,
          status: 'delivered',
          timestamp: now.toISOString(),
        });
      } catch (err) {
        console.error('[SOCKET] Error updating delivered status:', err);
      }
    });

    // Mark messages as read
    socket.on('messages-read', async (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      try {
        const now = new Date();
        // Update participant lastReadAt
        await db.conversationParticipant.update({
          where: { conversationId_userId: { conversationId: data.conversationId, userId } },
          data: { lastReadAt: now },
        });
        // Update message statuses
        const updated = await db.message.updateMany({
          where: {
            conversationId: data.conversationId,
            senderId: { not: userId },
            status: { in: ['sent', 'delivered'] },
          },
          data: { status: 'read', readAt: now },
        });
        if (updated.count > 0) {
          socket.to(`conv:${data.conversationId}`).emit('messages-status-update', {
            conversationId: data.conversationId,
            status: 'read',
            readBy: userId,
            timestamp: now.toISOString(),
          });
        }
      } catch (err) {
        console.error('[SOCKET] Error updating read status:', err);
      }
    });

    // Custom status update
    socket.on('update-status', async (data: { status?: string; emoji?: string; expiresInMinutes?: number }) => {
      try {
        const expiresAt = data.expiresInMinutes
          ? new Date(Date.now() + data.expiresInMinutes * 60000)
          : null;
        await db.userStreak.upsert({
          where: { userId },
          update: {
            customStatus: data.status || null,
            customStatusEmoji: data.emoji || null,
            customStatusExpiresAt: expiresAt,
            lastActiveAt: new Date(),
          },
          create: {
            userId,
            customStatus: data.status || null,
            customStatusEmoji: data.emoji || null,
            customStatusExpiresAt: expiresAt,
          },
        });
        // Broadcast to all connected users who share conversations
        broadcastToUserContacts(userId, 'user-status-changed', {
          userId,
          customStatus: data.status || null,
          customStatusEmoji: data.emoji || null,
        });
      } catch (err) {
        console.error('[SOCKET] Error updating status:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [SOCKET] User ${userId} disconnected (${reason})`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          updateUserPresence(userId, false);
        }
      }
      socketToUser.delete(socket.id);
    });
  });

  console.log('🔌 [SOCKET.IO] Initialized successfully');
  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit event to a specific conversation room
 */
export function emitToConversation(conversationId: string, event: string, data: unknown) {
  if (io) {
    io.to(`conv:${conversationId}`).emit(event, data);
  }
}

/**
 * Emit event to a specific user (all their connected sockets)
 */
export function emitToUser(userId: string, event: string, data: unknown) {
  const sockets = userSockets.get(userId);
  if (io && sockets) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

/**
 * Check if a user is currently online
 */
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

/**
 * Get all online user IDs
 */
export function getOnlineUsers(): string[] {
  return Array.from(userSockets.keys());
}

// ── Internal helpers ──

async function joinUserConversations(socket: Socket, userId: string) {
  try {
    const participations = await db.conversationParticipant.findMany({
      where: { userId, isActive: true },
      select: { conversationId: true },
    });
    for (const p of participations) {
      socket.join(`conv:${p.conversationId}`);
    }
  } catch (err) {
    console.error('[SOCKET] Error joining conversation rooms:', err);
  }
}

async function updateUserPresence(userId: string, online: boolean) {
  try {
    await db.userStreak.upsert({
      where: { userId },
      update: { lastActiveAt: new Date() },
      create: { userId, lastActiveAt: new Date() },
    });
  } catch (err) {
    // Non-critical, don't log noise
  }
}

async function broadcastToUserContacts(userId: string, event: string, data: unknown) {
  if (!io) return;
  try {
    const participations = await db.conversationParticipant.findMany({
      where: { userId, isActive: true },
      select: { conversationId: true },
    });
    for (const p of participations) {
      io.to(`conv:${p.conversationId}`).emit(event, data);
    }
  } catch (err) {
    // Non-critical
  }
}

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken as any);

// ═══════════════════════════════════════════════════════════════
// GET /messenger/conversations — List user's conversations
// ═══════════════════════════════════════════════════════════════
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const participations = await db.conversationParticipant.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    const conversations = participations.map(p => {
      const conv = p.conversation;
      const otherParticipants = conv.participants.filter(pp => pp.userId !== user.id);
      const lastMessage = conv.messages[0] || null;
      const unreadCount = lastMessage && lastMessage.createdAt > p.lastReadAt ? 1 : 0;

      return {
        id: conv.id,
        name: conv.name || otherParticipants.map(pp => `${pp.user.firstName || ''} ${pp.user.lastName || ''}`.trim()).join(', ') || 'Whisper',
        avatarUrl: conv.isGroup ? conv.avatarUrl : otherParticipants[0]?.user.avatarUrl || null,
        isGroup: conv.isGroup,
        participants: conv.participants.map(pp => pp.user),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.isDeleted ? 'Whisper deleted' : lastMessage.content,
          senderName: `${lastMessage.sender.firstName || ''} ${lastMessage.sender.lastName || ''}`.trim(),
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
          mediaType: lastMessage.mediaType,
        } : null,
        unreadCount,
        lastMessageAt: conv.lastMessageAt,
        myLastReadAt: p.lastReadAt,
      };
    });

    res.json(conversations);
  } catch (err) {
    console.error('[MESSENGER] Error listing conversations:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /messenger/conversations — Create or find 1-to-1 / group
// ═══════════════════════════════════════════════════════════════
router.post('/conversations', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { participantIds, name, isGroup } = req.body;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    res.status(400).json({ error: 'participantIds requis' }); return;
  }

  try {
    const allIds = [...new Set([user.id, ...participantIds])];

    // For 1-to-1, find existing conversation
    if (!isGroup && allIds.length === 2) {
      const existing = await db.conversation.findFirst({
        where: {
          isGroup: false,
          AND: allIds.map(id => ({
            participants: { some: { userId: id, isActive: true } },
          })),
        },
        include: {
          participants: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
        },
      });

      if (existing) {
        res.json(existing); return;
      }
    }

    // Create new conversation
    const conv = await db.conversation.create({
      data: {
        name: isGroup ? (name || 'Group') : null,
        isGroup: !!isGroup,
        participants: {
          create: allIds.map(id => ({
            userId: id,
            role: id === user.id ? 'admin' : 'member',
          })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });

    res.json(conv);
  } catch (err) {
    console.error('[MESSENGER] Error creating conversation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /messenger/conversations/:id/messages — Get messages (paginated)
// ═══════════════════════════════════════════════════════════════
router.get('/conversations/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const conversationId = req.params.id;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  try {
    // Verify user is participant
    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    });
    if (!participant || !participant.isActive) {
      res.status(403).json({ error: 'Accès refusé' }); return;
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          select: { id: true, content: true, sender: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    // Mark as read
    await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[0].id : null,
    });
  } catch (err) {
    console.error('[MESSENGER] Error fetching messages:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /messenger/conversations/:id/messages — Send a message
// ═══════════════════════════════════════════════════════════════
router.post('/conversations/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const conversationId = req.params.id;
  const { content, mediaUrls, mediaType, replyToId } = req.body;

  if (!content && (!mediaUrls || mediaUrls.length === 0)) {
    res.status(400).json({ error: 'Contenu ou média requis' }); return;
  }

  try {
    // Verify user is participant
    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    });
    if (!participant || !participant.isActive) {
      res.status(403).json({ error: 'Accès refusé' }); return;
    }

    const message = await db.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: content || null,
        mediaUrls: mediaUrls || undefined,
        mediaType: mediaType || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          select: { id: true, content: true, sender: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    // Update conversation lastMessageAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Update sender's lastReadAt
    await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });

    res.json(message);
  } catch (err) {
    console.error('[MESSENGER] Error sending message:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /messenger/conversations/:id/read — Mark conversation as read
// ═══════════════════════════════════════════════════════════════
router.post('/conversations/:id/read', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: req.params.id, userId: user.id } },
      data: { lastReadAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[MESSENGER] Error marking read:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /messenger/messages/:id — Delete (soft) a message
// ═══════════════════════════════════════════════════════════════
router.delete('/messages/:id', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const message = await db.message.findUnique({ where: { id: req.params.id } });
    if (!message || message.senderId !== user.id) {
      res.status(403).json({ error: 'Accès refusé' }); return;
    }

    await db.message.update({
      where: { id: req.params.id },
      data: { isDeleted: true, content: null, mediaUrls: undefined },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[MESSENGER] Error deleting message:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /messenger/unread — Get total unread count
// ═══════════════════════════════════════════════════════════════
router.get('/unread', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const participations = await db.conversationParticipant.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        conversation: {
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    let unread = 0;
    for (const p of participations) {
      const lastMsg = p.conversation.messages[0];
      if (lastMsg && lastMsg.createdAt > p.lastReadAt && lastMsg.senderId !== user.id) {
        unread++;
      }
    }

    res.json({ unread });
  } catch (err) {
    console.error('[MESSENGER] Error getting unread:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

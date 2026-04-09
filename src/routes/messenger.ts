import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { decrypt } from '../utils/crypto';
import { sendPushToUser } from './push';
import { emitToConversation, emitToUser as _emitToUser, isUserOnline as _isUserOnline, getOnlineUsers } from '../lib/socket';
import { uploadExpressFile } from '../lib/storage';

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

    if (participations.length === 0) {
      res.json([]);
      return;
    }

    const conversations = await Promise.all(participations.map(async (p) => {
      const conv = p.conversation;
      const otherParticipants = conv.participants.filter(pp => pp.userId !== user.id);
      const lastMessage = conv.messages[0] || null;

      // Count unread: messages from others sent after my last read timestamp
      const unreadCount = await db.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: user.id },
          createdAt: { gt: p.lastReadAt },
        },
      });

      return {
        id: conv.id,
        name: conv.name || otherParticipants.map(pp => `${pp.user.firstName || ''} ${pp.user.lastName || ''}`.trim()).join(', ') || 'Whisper',
        avatarUrl: conv.isGroup ? conv.avatarUrl : otherParticipants[0]?.user.avatarUrl || null,
        isGroup: conv.isGroup,
        participants: conv.participants.map(pp => pp.user),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.isDeleted ? 'Whisper deleted' : (lastMessage.content ?? ''),
          senderName: `${lastMessage.sender.firstName || ''} ${lastMessage.sender.lastName || ''}`.trim(),
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
          mediaType: (lastMessage as any).mediaType ?? null,
        } : null,
        unreadCount,
        lastMessageAt: conv.lastMessageAt,
        myLastReadAt: p.lastReadAt,
      };
    }));

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
      where: {
        conversationId,
        // Hide expired ephemeral messages
        OR: [
          { isEphemeral: false },
          { isEphemeral: true, isExpired: false },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replyTo: {
          select: { id: true, content: true, sender: { select: { firstName: true, lastName: true } } },
        },
        reactions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        pinnedBy: { select: { id: true, firstName: true, lastName: true } },
        tasks: {
          select: { id: true, title: true, status: true, priority: true, assigneeId: true, deadline: true },
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
  const { content, mediaUrls, mediaType, replyToId, isEphemeral, ephemeralTtl, mentions, voiceDuration } = req.body;

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

    // Parse @mentions from content (format: @[userId])
    let parsedMentions = mentions || null;
    if (!parsedMentions && content) {
      const mentionRegex = /@\[([a-zA-Z0-9-]+)\]/g;
      const foundMentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        foundMentions.push(match[1]);
      }
      if (foundMentions.length > 0) parsedMentions = foundMentions;
    }

    const message = await db.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: content || null,
        mediaUrls: mediaUrls || undefined,
        mediaType: mediaType || null,
        replyToId: replyToId || null,
        mentions: parsedMentions || undefined,
        voiceDuration: mediaType === 'voice' && voiceDuration ? voiceDuration : undefined,
        isEphemeral: isEphemeral === true,
        ephemeralTtl: isEphemeral === true ? (typeof ephemeralTtl === 'number' && ephemeralTtl > 0 ? ephemeralTtl : 86400) : null,
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

    // Send push notifications to other participants
    const otherParticipants = await db.conversationParticipant.findMany({
      where: { conversationId, userId: { not: user.id }, isActive: true },
      select: { userId: true, isMuted: true, mutedUntil: true },
    });
    const senderName = `${message.sender.firstName} ${message.sender.lastName}`.trim();
    const msgPreview = mediaType === 'wizz' ? '😊~ Wizz!' : mediaType === 'voice' ? '🎤 Message vocal' : content ? (content.length > 80 ? content.slice(0, 80) + '…' : content) : '📎 Média';
    
    // 🔌 Emit via Socket.io to all participants in the conversation
    emitToConversation(conversationId, 'new-message', {
      ...message,
      reactions: [],
    });

    for (const p of otherParticipants) {
      // Check if user has muted this conversation
      const isMuted = p.isMuted && (!p.mutedUntil || new Date() < p.mutedUntil);
      if (isMuted) continue;
      
      sendPushToUser(p.userId, {
        title: `💬 ${senderName}`,
        body: msgPreview,
        icon: message.sender.avatarUrl || '/pwa-192x192.png',
        tag: `msg-${conversationId}`,
        type: 'new-message',
        url: '/',
      }).catch(() => {});
      
      // Send mention notification
      if (parsedMentions && parsedMentions.includes(p.userId)) {
        sendPushToUser(p.userId, {
          title: `📢 ${senderName} vous a mentionné`,
          body: msgPreview,
          icon: message.sender.avatarUrl || '/pwa-192x192.png',
          tag: `mention-${conversationId}`,
          type: 'mention',
          url: '/',
        }).catch(() => {});
      }
    }

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
// POST /messenger/upload — Upload files for messenger (images, videos, files, voice)
// Uses express-fileupload (global middleware in api-server-clean.ts)
// ═══════════════════════════════════════════════════════════════
router.post('/upload', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const uploadedFiles = req.files;
    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
      res.status(400).json({ error: 'Aucun fichier fourni' }); return;
    }

    // express-fileupload: files can be under 'file' or 'files' key
    const fileList = Array.isArray(uploadedFiles.file)
      ? uploadedFiles.file
      : uploadedFiles.file
        ? [uploadedFiles.file]
        : Array.isArray(uploadedFiles.files)
          ? uploadedFiles.files
          : uploadedFiles.files
            ? [uploadedFiles.files]
            : Object.values(uploadedFiles).flat();

    const urls: string[] = [];
    let detectedMediaType = 'file';

    for (const file of fileList) {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      const filename = `${Date.now()}_${safeName}`;
      const key = `messenger/${user.id}/${filename}`;
      const url = await uploadExpressFile(file as any, key);
      urls.push(url);

      // Detect media type from first file
      if (urls.length === 1) {
        if (/^image\//.test(file.mimetype)) detectedMediaType = 'image';
        else if (/^video\//.test(file.mimetype)) detectedMediaType = 'video';
        else if (/^audio\//.test(file.mimetype)) detectedMediaType = 'voice';
        else detectedMediaType = 'file';
      }
    }

    if (urls.length === 0) {
      res.status(400).json({ error: 'Aucun fichier valide' }); return;
    }

    res.json({ urls, mediaType: detectedMediaType });
  } catch (err) {
    console.error('[MESSENGER] Error uploading files:', err);
    res.status(500).json({ error: 'Erreur upload' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /messenger/messages/:id/view-ephemeral — Mark ephemeral as viewed
// ═══════════════════════════════════════════════════════════════
router.post('/messages/:id/view-ephemeral', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const msg = await db.message.findUnique({ where: { id: req.params.id } });
    if (!msg || !msg.isEphemeral) {
      res.status(404).json({ error: 'Message introuvable' }); return;
    }
    // Only the recipient (not sender) triggers the view timer
    if (msg.senderId === user.id) { res.json({ success: true }); return; }
    // Already viewed
    if (msg.viewedAt) { res.json({ success: true, viewedAt: msg.viewedAt }); return; }

    const viewedAt = new Date();
    await db.message.update({
      where: { id: req.params.id },
      data: { viewedAt },
    });
    res.json({ success: true, viewedAt });
  } catch (err) {
    console.error('[MESSENGER] Error marking ephemeral viewed:', err);
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
      select: { conversationId: true, lastReadAt: true },
    });

    // Count actual unread messages per conversation (not just 0/1)
    let unread = 0;
    for (const p of participations) {
      const count = await db.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: user.id },
          createdAt: { gt: p.lastReadAt },
        },
      });
      unread += count;
    }

    // Update presence heartbeat (marks user as online)
    db.userStreak.upsert({
      where: { userId: user.id },
      update: { lastActiveAt: new Date() },
      create: { userId: user.id, lastActiveAt: new Date() },
    }).catch(() => {}); // fire-and-forget, don't block response

    // Check for latest incoming Wizz (for global notification even when conversation is closed)
    const convIds = participations.map(p => p.conversationId);
    const latestWizz = convIds.length > 0 ? await db.message.findFirst({

      where: {
        conversationId: { in: convIds },
        senderId: { not: user.id },
        mediaType: 'wizz',
        createdAt: { gt: new Date(Date.now() - 30000) }, // Only wizz from the last 30s
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, senderId: true, conversationId: true, createdAt: true },
    }) : null;

    res.json({ unread, latestWizz: latestWizz || null });
  } catch (err) {
    console.error('[MESSENGER] Error getting unread:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /messenger/telnyx-eligibility — Check if user can make Telnyx calls
// Returns SIP credentials if eligible (org has Telnyx + user has permission)
// ═══════════════════════════════════════════════════════════════
router.get('/telnyx-eligibility', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const orgId = user.organizationId || (req.headers['x-organization-id'] as string);

    // If no org, no Telnyx
    if (!orgId) {
      res.json({ eligible: false, assignedNumber: null, canMakeCalls: false, canSendSms: false, orgHasTelnyx: false, sipCredentials: null });
      return;
    }

    // 1. Check if org has Telnyx module active
    const moduleStatus = await db.organizationModuleStatus.findFirst({
      where: {
        organizationId: orgId,
        active: true,
        Module: { feature: { contains: 'telnyx', mode: 'insensitive' } },
      },
    });

    // 2. Check if org has TelnyxConfig (API key configured)
    const telnyxConfig = await db.telnyxConfig.findUnique({
      where: { organizationId: orgId },
    });

    const orgHasTelnyx = !!(moduleStatus && telnyxConfig);

    if (!orgHasTelnyx) {
      res.json({ eligible: false, assignedNumber: null, canMakeCalls: false, canSendSms: false, orgHasTelnyx: false, sipCredentials: null });
      return;
    }

    // 3. Check user-level Telnyx config
    const userConfig = await db.telnyxUserConfig.findFirst({
      where: { userId: user.id, organizationId: orgId },
    });

    const canMakeCalls = userConfig?.canMakeCalls ?? false;
    const canSendSms = userConfig?.canSendSms ?? false;
    const assignedNumber = userConfig?.assignedNumber ?? null;

    // 4. Get SIP credentials for this user (if they can make calls)
    let sipCredentials: { sipUsername: string; sipPassword: string; sipDomain: string } | null = null;
    if (canMakeCalls) {
      const sipEndpoint = await db.telnyxSipEndpoint.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          status: 'active',
        },
        orderBy: { priority: 'asc' },
      });

      // Helper: decrypt SIP password (stored encrypted in DB)
      const decryptSipPassword = (encrypted: string): string => {
        try { return decrypt(encrypted); }
        catch { return encrypted; } // fallback if stored in plaintext
      };

      if (sipEndpoint) {
        sipCredentials = {
          sipUsername: sipEndpoint.sipUsername,
          sipPassword: decryptSipPassword(sipEndpoint.sipPassword),
          sipDomain: sipEndpoint.sipDomain,
        };
      } else {
        // Fallback: try org-level SIP endpoint without specific user
        const orgSipEndpoint = await db.telnyxSipEndpoint.findFirst({
          where: {
            organizationId: orgId,
            status: 'active',
            userId: null,
          },
          orderBy: { priority: 'asc' },
        });

        if (orgSipEndpoint) {
          sipCredentials = {
            sipUsername: orgSipEndpoint.sipUsername,
            sipPassword: decryptSipPassword(orgSipEndpoint.sipPassword),
            sipDomain: orgSipEndpoint.sipDomain,
          };
        }
      }
    }

    const eligible = canMakeCalls && !!sipCredentials;

    res.json({
      eligible,
      assignedNumber,
      canMakeCalls,
      canSendSms,
      orgHasTelnyx,
      sipCredentials: eligible ? sipCredentials : null,
    });
  } catch (err) {
    console.error('[MESSENGER] Error checking Telnyx eligibility:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MESSENGER PHASE 2 — Advanced Features
// ═══════════════════════════════════════════════════════════════

// ── REACTIONS ──

// POST /messenger/messages/:id/reactions — Add a reaction
router.post('/messages/:id/reactions', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { emoji } = req.body;
  if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
    res.status(400).json({ error: 'Emoji requis' }); return;
  }

  try {
    const message = await db.message.findUnique({
      where: { id: req.params.id },
      select: { id: true, conversationId: true },
    });
    if (!message) { res.status(404).json({ error: 'Message introuvable' }); return; }

    // Verify participant
    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId: user.id } },
    });
    if (!participant?.isActive) { res.status(403).json({ error: 'Accès refusé' }); return; }

    // Toggle reaction: if exists, remove; if not, create
    const existing = await db.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId: message.id, userId: user.id, emoji } },
    });

    if (existing) {
      await db.messageReaction.delete({ where: { id: existing.id } });
      emitToConversation(message.conversationId, 'reaction-removed', {
        messageId: message.id,
        userId: user.id,
        emoji,
      });
      res.json({ action: 'removed', emoji });
    } else {
      const reaction = await db.messageReaction.create({
        data: { messageId: message.id, userId: user.id, emoji },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });
      emitToConversation(message.conversationId, 'reaction-added', {
        messageId: message.id,
        userId: user.id,
        emoji,
        userName: `${reaction.user.firstName} ${reaction.user.lastName}`.trim(),
      });
      res.json({ action: 'added', reaction });
    }
  } catch (err) {
    console.error('[MESSENGER] Error handling reaction:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /messenger/messages/:id/reactions — Get all reactions for a message
router.get('/messages/:id/reactions', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const reactions = await db.messageReaction.findMany({
      where: { messageId: req.params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Group by emoji
    const grouped: Record<string, { emoji: string; count: number; users: any[] }> = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user);
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error('[MESSENGER] Error listing reactions:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PIN MESSAGES ──

// POST /messenger/messages/:id/pin — Pin or unpin a message
router.post('/messages/:id/pin', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const message = await db.message.findUnique({
      where: { id: req.params.id },
      select: { id: true, conversationId: true, isPinned: true },
    });
    if (!message) { res.status(404).json({ error: 'Message introuvable' }); return; }

    // Verify participant + canPin permission
    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId: user.id } },
    });
    if (!participant?.isActive) { res.status(403).json({ error: 'Accès refusé' }); return; }
    if (!participant.canPin && participant.role !== 'admin') {
      res.status(403).json({ error: 'Permission refusée: épinglage désactivé' }); return;
    }

    const newPinned = !message.isPinned;
    const updated = await db.message.update({
      where: { id: message.id },
      data: {
        isPinned: newPinned,
        pinnedAt: newPinned ? new Date() : null,
        pinnedById: newPinned ? user.id : null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        pinnedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    emitToConversation(message.conversationId, 'message-pinned', {
      messageId: message.id,
      isPinned: newPinned,
      pinnedBy: newPinned ? { id: user.id, firstName: (updated.pinnedBy as any)?.firstName, lastName: (updated.pinnedBy as any)?.lastName } : null,
    });

    res.json({ isPinned: newPinned, message: updated });
  } catch (err) {
    console.error('[MESSENGER] Error pinning message:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /messenger/conversations/:id/pinned — Get all pinned messages
router.get('/conversations/:id/pinned', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: user.id } },
    });
    if (!participant?.isActive) { res.status(403).json({ error: 'Accès refusé' }); return; }

    const pinned = await db.message.findMany({
      where: { conversationId: req.params.id, isPinned: true, isDeleted: false },
      orderBy: { pinnedAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        pinnedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json(pinned);
  } catch (err) {
    console.error('[MESSENGER] Error listing pinned:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── SHARED FILES ──

// GET /messenger/conversations/:id/files — Get all shared files in conversation
router.get('/conversations/:id/files', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: user.id } },
    });
    if (!participant?.isActive) { res.status(403).json({ error: 'Accès refusé' }); return; }

    const filterType = req.query.type as string; // 'image' | 'video' | 'file' | 'voice' | undefined (all)
    const mediaTypeFilter = filterType
      ? { mediaType: filterType }
      : { mediaType: { in: ['image', 'video', 'file', 'voice', 'signature'] } };

    const files = await db.message.findMany({
      where: {
        conversationId: req.params.id,
        isDeleted: false,
        ...mediaTypeFilter,
        mediaUrls: { not: undefined },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        mediaUrls: true,
        mediaType: true,
        content: true,
        createdAt: true,
        voiceDuration: true,
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    res.json(files);
  } catch (err) {
    console.error('[MESSENGER] Error listing files:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── TASKS FROM MESSAGES ──

// POST /messenger/messages/:id/task — Create a task from a message
router.post('/messages/:id/task', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { title, assigneeId, deadline, priority, description } = req.body;
  if (!assigneeId) { res.status(400).json({ error: 'assigneeId requis' }); return; }

  try {
    const message = await db.message.findUnique({
      where: { id: req.params.id },
      select: { id: true, conversationId: true, content: true },
    });
    if (!message) { res.status(404).json({ error: 'Message introuvable' }); return; }

    // Verify participant + canCreateTasks
    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId: user.id } },
    });
    if (!participant?.isActive) { res.status(403).json({ error: 'Accès refusé' }); return; }
    if (!participant.canCreateTasks && participant.role !== 'admin') {
      res.status(403).json({ error: 'Permission refusée: création de tâches désactivée' }); return;
    }

    const task = await db.messageTask.create({
      data: {
        messageId: message.id,
        conversationId: message.conversationId,
        title: title || (message.content ? message.content.slice(0, 200) : 'Tâche sans titre'),
        description: description || null,
        assigneeId,
        createdById: user.id,
        deadline: deadline ? new Date(deadline) : null,
        priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    emitToConversation(message.conversationId, 'task-created', {
      task,
      messageId: message.id,
    });

    // Notify assignee
    if (assigneeId !== user.id) {
      sendPushToUser(assigneeId, {
        title: '📋 Nouvelle tâche assignée',
        body: task.title,
        icon: '/pwa-192x192.png',
        tag: `task-${task.id}`,
        type: 'task-assigned',
        url: '/',
      }).catch(() => {});
    }

    res.json(task);
  } catch (err) {
    console.error('[MESSENGER] Error creating task:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /messenger/tasks — List all tasks for user
router.get('/tasks', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const statusFilter = req.query.status as string;
  try {
    const tasks = await db.messageTask.findMany({
      where: {
        OR: [
          { assigneeId: user.id },
          { createdById: user.id },
        ],
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        message: { select: { id: true, content: true, createdAt: true } },
      },
    });

    res.json(tasks);
  } catch (err) {
    console.error('[MESSENGER] Error listing tasks:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /messenger/tasks/:id — Update task status
router.put('/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { status, title, deadline, priority } = req.body;

  try {
    const task = await db.messageTask.findUnique({ where: { id: req.params.id } });
    if (!task) { res.status(404).json({ error: 'Tâche introuvable' }); return; }

    // Only assignee, creator, or conversation admin can update
    if (task.assigneeId !== user.id && task.createdById !== user.id) {
      res.status(403).json({ error: 'Accès refusé' }); return;
    }

    const updateData: any = {};
    if (status && ['todo', 'in_progress', 'done', 'cancelled'].includes(status)) {
      updateData.status = status;
      if (status === 'done') updateData.completedAt = new Date();
    }
    if (title) updateData.title = title;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) updateData.priority = priority;

    const updated = await db.messageTask.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    emitToConversation(task.conversationId, 'task-updated', { task: updated });

    res.json(updated);
  } catch (err) {
    console.error('[MESSENGER] Error updating task:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── QUICK REPLY TEMPLATES ──

// GET /messenger/templates — Get user's quick reply templates
router.get('/templates', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const orgId = user.organizationId || (req.headers['x-organization-id'] as string);
    const templates = await db.quickReplyTemplate.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(orgId ? [{ organizationId: orgId, userId: null }] : []),
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(templates);
  } catch (err) {
    console.error('[MESSENGER] Error listing templates:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /messenger/templates — Create a quick reply template
router.post('/templates', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { title, content, shortcut, category, isOrganization } = req.body;
  if (!title || !content) { res.status(400).json({ error: 'Titre et contenu requis' }); return; }

  try {
    const orgId = isOrganization ? (user.organizationId || (req.headers['x-organization-id'] as string)) : null;
    const template = await db.quickReplyTemplate.create({
      data: {
        userId: isOrganization ? null : user.id,
        organizationId: orgId || null,
        title,
        content,
        shortcut: shortcut || null,
        category: category || null,
      },
    });

    res.json(template);
  } catch (err) {
    console.error('[MESSENGER] Error creating template:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /messenger/templates/:id — Delete a template
router.delete('/templates/:id', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const template = await db.quickReplyTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) { res.status(404).json({ error: 'Template introuvable' }); return; }
    if (template.userId && template.userId !== user.id) {
      res.status(403).json({ error: 'Accès refusé' }); return;
    }

    await db.quickReplyTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[MESSENGER] Error deleting template:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── CUSTOM STATUS ──

// PUT /messenger/status — Update user's custom status
router.put('/status', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { customStatus, customStatusEmoji, expiresInMinutes } = req.body;

  try {
    const expiresAt = expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60000) : null;
    const streak = await db.userStreak.upsert({
      where: { userId: user.id },
      update: {
        customStatus: customStatus || null,
        customStatusEmoji: customStatusEmoji || null,
        customStatusExpiresAt: expiresAt,
        lastActiveAt: new Date(),
      },
      create: {
        userId: user.id,
        customStatus: customStatus || null,
        customStatusEmoji: customStatusEmoji || null,
        customStatusExpiresAt: expiresAt,
      },
    });

    res.json({
      customStatus: streak.customStatus,
      customStatusEmoji: streak.customStatusEmoji,
      customStatusExpiresAt: streak.customStatusExpiresAt,
    });
  } catch (err) {
    console.error('[MESSENGER] Error updating status:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /messenger/online — Get online users list
router.get('/online', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const onlineIds = getOnlineUsers();
    // Get user details + custom status for online users
    const users = onlineIds.length > 0 ? await db.user.findMany({
      where: { id: { in: onlineIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        UserStreak: {
          select: { customStatus: true, customStatusEmoji: true, customStatusExpiresAt: true, lastActiveAt: true },
        },
      },
    }) : [];

    // Filter expired statuses
    const now = new Date();
    const result = users.map(u => ({
      ...u,
      customStatus: u.UserStreak?.customStatusExpiresAt && u.UserStreak.customStatusExpiresAt < now
        ? null
        : u.UserStreak?.customStatus || null,
      customStatusEmoji: u.UserStreak?.customStatusExpiresAt && u.UserStreak.customStatusExpiresAt < now
        ? null
        : u.UserStreak?.customStatusEmoji || null,
      lastActiveAt: u.UserStreak?.lastActiveAt || null,
    }));

    res.json(result);
  } catch (err) {
    console.error('[MESSENGER] Error listing online users:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GRANULAR PERMISSIONS ──

// PUT /messenger/conversations/:id/permissions — Update member permissions (admin only)
router.put('/conversations/:id/permissions', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { targetUserId, permissions } = req.body;
  if (!targetUserId || !permissions) {
    res.status(400).json({ error: 'targetUserId et permissions requis' }); return;
  }

  try {
    // Verify caller is admin
    const callerParticipant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: user.id } },
    });
    if (!callerParticipant?.isActive || callerParticipant.role !== 'admin') {
      res.status(403).json({ error: 'Seul l\'administrateur peut modifier les permissions' }); return;
    }

    const allowedPerms = ['canPin', 'canManageMembers', 'canSeeFullHistory', 'canSendMedia', 'canCreateTasks', 'role'];
    const updateData: any = {};
    for (const key of allowedPerms) {
      if (permissions[key] !== undefined) {
        updateData[key] = permissions[key];
      }
    }

    const updated = await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: req.params.id, userId: targetUserId } },
      data: updateData,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    emitToConversation(req.params.id, 'permissions-updated', {
      conversationId: req.params.id,
      targetUserId,
      permissions: updateData,
    });

    res.json(updated);
  } catch (err) {
    console.error('[MESSENGER] Error updating permissions:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── MANAGE MEMBERS ──

// POST /messenger/conversations/:id/members — Add members
router.post('/conversations/:id/members', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ error: 'userIds requis' }); return;
  }

  try {
    // Verify caller has permission
    const callerParticipant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: user.id } },
    });
    if (!callerParticipant?.isActive) { res.status(403).json({ error: 'Accès refusé' }); return; }
    if (callerParticipant.role !== 'admin' && !callerParticipant.canManageMembers) {
      res.status(403).json({ error: 'Permission refusée: gestion des membres désactivée' }); return;
    }

    // Check conversation is a group
    const conv = await db.conversation.findUnique({ where: { id: req.params.id } });
    if (!conv?.isGroup) { res.status(400).json({ error: 'Impossible d\'ajouter des membres à une conversation 1-to-1' }); return; }

    const added = [];
    for (const uid of userIds) {
      try {
        const existing = await db.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId: req.params.id, userId: uid } },
        });
        if (existing && !existing.isActive) {
          await db.conversationParticipant.update({
            where: { id: existing.id },
            data: { isActive: true, joinedAt: new Date() },
          });
          added.push(uid);
        } else if (!existing) {
          await db.conversationParticipant.create({
            data: { conversationId: req.params.id, userId: uid, role: 'member' },
          });
          added.push(uid);
        }
      } catch { /* skip duplicates */ }
    }

    if (added.length > 0) {
      emitToConversation(req.params.id, 'members-added', { conversationId: req.params.id, addedUserIds: added, addedBy: user.id });
    }

    res.json({ added });
  } catch (err) {
    console.error('[MESSENGER] Error adding members:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /messenger/conversations/:id/members/:userId — Remove a member
router.delete('/conversations/:id/members/:userId', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const callerParticipant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: user.id } },
    });
    if (!callerParticipant?.isActive) { res.status(403).json({ error: 'Accès refusé' }); return; }

    // Admin or self-remove
    const isSelfRemove = req.params.userId === user.id;
    if (!isSelfRemove && callerParticipant.role !== 'admin' && !callerParticipant.canManageMembers) {
      res.status(403).json({ error: 'Permission refusée' }); return;
    }

    await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: req.params.id, userId: req.params.userId } },
      data: { isActive: false },
    });

    emitToConversation(req.params.id, 'member-removed', {
      conversationId: req.params.id,
      removedUserId: req.params.userId,
      removedBy: user.id,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[MESSENGER] Error removing member:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── VOICE MESSAGE TRANSCRIPTION ──

// POST /messenger/messages/:id/transcribe — Transcribe a voice message using Gemini
router.post('/messages/:id/transcribe', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const message = await db.message.findUnique({ where: { id: req.params.id } });
    if (!message || message.mediaType !== 'voice') {
      res.status(400).json({ error: 'Message vocal introuvable' }); return;
    }
    if (message.voiceTranscript) {
      res.json({ transcript: message.voiceTranscript }); return;
    }

    // Use Gemini for transcription (reuse existing integration)
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'Transcription AI non configurée' }); return; }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Get audio URL from mediaUrls
    const urls = message.mediaUrls as string[];
    if (!urls || urls.length === 0) { res.status(400).json({ error: 'Pas d\'URL audio' }); return; }

    const audioUrl = urls[0];
    // Download audio and convert to base64
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const audioBase64 = audioBuffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: audioBase64,
        },
      },
      'Transcris ce message vocal en texte. Retourne uniquement la transcription, sans commentaires.',
    ]);

    const transcript = result.response.text().trim();

    // Save transcript
    await db.message.update({
      where: { id: message.id },
      data: { voiceTranscript: transcript },
    });

    res.json({ transcript });
  } catch (err) {
    console.error('[MESSENGER] Error transcribing voice:', err);
    res.status(500).json({ error: 'Erreur de transcription' });
  }
});

export default router;

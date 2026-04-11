import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { sendPushToUser } from './push';

const router = Router();

// All routes require authentication
router.use(authenticateToken as any);

// ═══════════════════════════════════════════════════════════════
// GET /friends — List all friends (accepted) + pending requests
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    // Get accepted friendships (both directions)
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: user.id, status: 'accepted' },
          { addresseeId: user.id, status: 'accepted' },
        ],
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, organizationId: true, role: true } },
        addressee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, organizationId: true, role: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const friends = friendships.map(f => {
      const friend = f.requesterId === user.id ? f.addressee : f.requester;
      return {
        friendshipId: f.id,
        source: f.source,
        ...friend,
        isOrgMember: friend.organizationId === user.organizationId,
      };
    });

    // Batch fetch online status from userStreak (active within last 5 minutes)
    const friendIds = friends.map(f => f.id);
    const streaks = await db.userStreak.findMany({
      where: { userId: { in: friendIds } },
      select: { userId: true, lastActiveAt: true },
    });
    const streakMap = new Map(streaks.map(s => [s.userId, s.lastActiveAt]));
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const friendsWithOnline = friends.map(f => ({
      ...f,
      online: streakMap.has(f.id) && streakMap.get(f.id)! > fiveMinAgo,
    }));

    // Get pending requests received
    const pendingReceived = await db.friendship.findMany({
      where: { addresseeId: user.id, status: 'pending' },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, organizationId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get pending requests sent
    const pendingSent = await db.friendship.findMany({
      where: { requesterId: user.id, status: 'pending' },
      include: {
        addressee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, organizationId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      friends: friendsWithOnline,
      pendingReceived: pendingReceived.map(p => ({ friendshipId: p.id, ...p.requester })),
      pendingSent: pendingSent.map(p => ({ friendshipId: p.id, ...p.addressee })),
    });
  } catch (err) {
    console.error('[FRIENDS] Error fetching friends:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/sync-org — Auto-add org members as friends
// ═══════════════════════════════════════════════════════════════
router.post('/sync-org', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id || !user.organizationId) { res.status(400).json({ error: 'Organisation requise' }); return; }

  try {
    // Find all users in same organization
    const orgMembers = await db.user.findMany({
      where: { organizationId: user.organizationId, id: { not: user.id } },
      select: { id: true },
    });

    let added = 0;
    for (const member of orgMembers) {
      // Check if friendship already exists in either direction
      const existing = await db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: user.id, addresseeId: member.id },
            { requesterId: member.id, addresseeId: user.id },
          ],
        },
      });

      if (!existing) {
        await db.friendship.create({
          data: {
            requesterId: user.id,
            addresseeId: member.id,
            status: 'accepted', // Auto-accepted for org members
            source: 'organization',
          },
        });
        added++;
      }
    }

    res.json({ success: true, added, total: orgMembers.length });
  } catch (err) {
    console.error('[FRIENDS] Error syncing org:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/request — Send friend request
// ═══════════════════════════════════════════════════════════════
router.post('/request', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { userId } = req.body;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  if (!userId || userId === user.id) { res.status(400).json({ error: 'userId invalide' }); return; }

  try {
    // Check if friend requests are enabled for the user's org
    const orgMember = await db.organizationMember.findFirst({ where: { userId: user.id }, select: { organizationId: true } });
    if (orgMember?.organizationId) {
      const settings = await db.socialSettings.findUnique({ where: { organizationId: orgMember.organizationId }, select: { friendRequestsEnabled: true } });
      if (settings && !settings.friendRequestsEnabled) { res.status(403).json({ error: 'Les demandes d\'amis sont désactivées pour cette Colony' }); return; }
    }

    // Check if friendship already exists
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: userId },
          { requesterId: userId, addresseeId: user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') { res.json({ message: 'Déjà amis' }); return; }
      if (existing.status === 'pending') { res.json({ message: 'Demande déjà envoyée' }); return; }
      if (existing.status === 'blocked') { res.status(403).json({ error: 'Action impossible' }); return; }
    }

    const friendship = await db.friendship.create({
      data: { requesterId: user.id, addresseeId: userId, status: 'pending', source: 'manual' },
    });

    // Get requester name for notification
    const requester = await db.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, avatarUrl: true },
    });
    const requesterName = requester ? `${requester.firstName} ${requester.lastName}`.trim() : 'Quelqu\'un';

    // Create notification for the addressee
    try {
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId,
          organizationId: null,
          type: 'FRIEND_REQUEST_RECEIVED',
          data: {
            friendshipId: friendship.id,
            requesterId: user.id,
            requesterName,
            requesterAvatar: requester?.avatarUrl || null,
            message: `${requesterName} vous a envoyé une demande d'ami`,
          },          actionUrl: `/profile/${user.id}`,          priority: 'normal',
          updatedAt: new Date(),
        },
      });
      // Push notification
      sendPushToUser(userId, {
        title: 'Nouvelle demande d\'ami',
        body: `${requesterName} vous a envoyé une demande d'ami`,
        icon: '/pwa-192x192.png',
        tag: 'friend-request',
        url: `/profile/${user.id}`,
        type: 'notification',
      }).catch(() => {});
    } catch (notifErr) {
      console.error('[FRIENDS] Notification error (non-blocking):', notifErr);
    }

    res.json({ success: true, friendship });
  } catch (err) {
    console.error('[FRIENDS] Error sending request:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/block-user — Block a user (creates friendship if needed)
// ═══════════════════════════════════════════════════════════════
router.post('/block-user', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { userId } = req.body;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  if (!userId || userId === user.id) { res.status(400).json({ error: 'userId invalide' }); return; }

  try {
    // Check if friendship already exists
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: userId },
          { requesterId: userId, addresseeId: user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'blocked') {
        res.json({ success: true, alreadyBlocked: true }); return;
      }
      // Update existing friendship to blocked
      await db.friendship.update({
        where: { id: existing.id },
        data: { status: 'blocked' },
      });
      // Clean up any FRIEND_REQUEST_RECEIVED notifications
      try {
        const notifs = await db.notification.findMany({
          where: { type: 'FRIEND_REQUEST_RECEIVED', data: { path: ['friendshipId'], equals: existing.id } },
        });
        for (const notif of notifs) {
          await db.notification.update({
            where: { id: notif.id },
            data: { status: 'READ', readAt: new Date(), updatedAt: new Date(), data: { ...(notif.data as any), handled: 'blocked' } },
          });
        }
      } catch (_) {}
      res.json({ success: true, friendshipId: existing.id });
    } else {
      // Create new friendship in blocked state
      const friendship = await db.friendship.create({
        data: { requesterId: user.id, addresseeId: userId, status: 'blocked', source: 'manual' },
      });
      res.json({ success: true, friendshipId: friendship.id });
    }
  } catch (err) {
    console.error('[FRIENDS] Error blocking user:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/unblock-user — Unblock a user (removes friendship)
// ═══════════════════════════════════════════════════════════════
router.post('/unblock-user', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { userId } = req.body;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  if (!userId) { res.status(400).json({ error: 'userId requis' }); return; }

  try {
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: userId },
          { requesterId: userId, addresseeId: user.id },
        ],
        status: 'blocked',
      },
    });

    if (!existing) { res.json({ success: true, message: 'Non bloqué' }); return; }

    await db.friendship.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[FRIENDS] Error unblocking user:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /friends/blocked — List all blocked users
// ═══════════════════════════════════════════════════════════════
router.get('/blocked', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const blockedFriendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: user.id, status: 'blocked' },
          { addresseeId: user.id, status: 'blocked' },
        ],
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
        addressee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const blockedUsers = blockedFriendships.map(f => {
      const blockedUser = f.requesterId === user.id ? f.addressee : f.requester;
      return { friendshipId: f.id, ...blockedUser, blockedAt: f.updatedAt };
    });

    res.json({ blockedUsers });
  } catch (err) {
    console.error('[FRIENDS] Error listing blocked:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/:id/accept — Accept friend request
// ═══════════════════════════════════════════════════════════════
router.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const friendship = await db.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || friendship.addresseeId !== user.id) {
      res.status(404).json({ error: 'Demande non trouvée' }); return;
    }

    // Already accepted? Return success without creating duplicate notification
    if (friendship.status === 'accepted') {
      res.json({ success: true, alreadyAccepted: true }); return;
    }

    await db.friendship.update({
      where: { id: req.params.id },
      data: { status: 'accepted' },
    });

    // Mark the original FRIEND_REQUEST_RECEIVED notification as handled
    try {
      const originalNotif = await db.notification.findFirst({
        where: {
          type: 'FRIEND_REQUEST_RECEIVED',
          userId: user.id,
          data: { path: ['friendshipId'], equals: friendship.id },
        },
      });
      if (originalNotif) {
        await db.notification.update({
          where: { id: originalNotif.id },
          data: {
            status: 'READ',
            readAt: new Date(),
            updatedAt: new Date(),
            data: { ...(originalNotif.data as any), handled: 'accepted' },
          },
        });
      }
    } catch (updateErr) {
      console.error('[FRIENDS] Update original notif error (non-blocking):', updateErr);
    }

    // Send notification to the requester that their request was accepted
    try {
      const acceptor = await db.user.findUnique({
        where: { id: user.id },
        select: { firstName: true, lastName: true, avatarUrl: true },
      });
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: friendship.requesterId,
          organizationId: null,
          type: 'FRIEND_REQUEST_ACCEPTED',
          data: {
            friendshipId: friendship.id,
            acceptorId: user.id,
            acceptorName: `${acceptor?.firstName || ''} ${acceptor?.lastName || ''}`.trim(),
            acceptorAvatar: acceptor?.avatarUrl || null,
            message: `${acceptor?.firstName || ''} ${acceptor?.lastName || ''}`.trim() + ' a accepté votre demande d\'ami',
          },
          actionUrl: `/profile/${user.id}`,
          priority: 'normal',
          updatedAt: new Date(),
        },
      });
      // Push notification
      const acceptorName = `${acceptor?.firstName || ''} ${acceptor?.lastName || ''}`.trim();
      sendPushToUser(friendship.requesterId, {
        title: 'Demande d\'ami acceptée',
        body: `${acceptorName} a accepté votre demande d'ami`,
        icon: '/pwa-192x192.png',
        tag: 'friend-accepted',
        url: `/profile/${user.id}`,
        type: 'notification',
      }).catch(() => {});
    } catch (notifErr) {
      console.error('[FRIENDS] Notification error (non-blocking):', notifErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[FRIENDS] Error accepting:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/:id/block — Block a user
// ═══════════════════════════════════════════════════════════════
router.post('/:id/block', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const friendship = await db.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || (friendship.requesterId !== user.id && friendship.addresseeId !== user.id)) {
      res.status(404).json({ error: 'Relation non trouvée' }); return;
    }

    // Already blocked? Skip
    if (friendship.status === 'blocked') {
      res.json({ success: true, alreadyBlocked: true }); return;
    }

    await db.friendship.update({
      where: { id: req.params.id },
      data: { status: 'blocked' },
    });

    // Mark the notification as handled
    try {
      const originalNotif = await db.notification.findFirst({
        where: {
          type: 'FRIEND_REQUEST_RECEIVED',
          userId: user.id,
          data: { path: ['friendshipId'], equals: friendship.id },
        },
      });
      if (originalNotif) {
        await db.notification.update({
          where: { id: originalNotif.id },
          data: {
            status: 'READ',
            readAt: new Date(),
            updatedAt: new Date(),
            data: { ...(originalNotif.data as any), handled: 'blocked' },
          },
        });
      }
    } catch (updateErr) {
      console.error('[FRIENDS] Update notif on block error (non-blocking):', updateErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[FRIENDS] Error blocking:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /friends/:id — Remove friend / reject request
// ═══════════════════════════════════════════════════════════════
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const friendship = await db.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || (friendship.requesterId !== user.id && friendship.addresseeId !== user.id)) {
      res.status(404).json({ error: 'Amitié non trouvée' }); return;
    }

    // Delete FRIEND_REQUEST_RECEIVED notification for the OTHER user
    // When sender cancels: delete notification for addressee
    // When addressee rejects: delete notification for addressee (self)
    try {
      const notifs = await db.notification.findMany({
        where: {
          type: 'FRIEND_REQUEST_RECEIVED',
          data: { path: ['friendshipId'], equals: friendship.id },
        },
      });
      // Delete ALL notifications related to this friendship (both sides)
      for (const notif of notifs) {
        await db.notification.delete({ where: { id: notif.id } });
      }
    } catch (updateErr) {
      console.error('[FRIENDS] Delete notif on cancel/reject error (non-blocking):', updateErr);
    }

    await db.friendship.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[FRIENDS] Error removing:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /friends/status/:userId — Check friendship status with a user
// ═══════════════════════════════════════════════════════════════
router.get('/status/:userId', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  const { userId } = req.params;
  if (!userId || userId === user.id) { res.json({ status: null }); return; }

  try {
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: userId },
          { requesterId: userId, addresseeId: user.id },
        ],
      },
      select: { id: true, status: true, requesterId: true, addresseeId: true },
    });

    if (!friendship) {
      res.json({ status: null, friendshipId: null, direction: null });
      return;
    }

    const direction = friendship.requesterId === user.id ? 'sent' : 'received';
    res.json({ status: friendship.status, friendshipId: friendship.id, direction });
  } catch (err) {
    console.error('[FRIENDS] Error checking status:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /friends/search — Search users to add as friends
// ═══════════════════════════════════════════════════════════════
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const q = (req.query.q as string || '').trim();
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  if (q.length < 2) { res.json([]); return; }

  try {
    const users = await db.user.findMany({
      where: {
        id: { not: user.id },
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, organizationId: true },
      take: 20,
    });

    // Check existing friendship status for each
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: user.id, addresseeId: { in: users.map(u => u.id) } },
          { addresseeId: user.id, requesterId: { in: users.map(u => u.id) } },
        ],
      },
    });

    const friendshipMap = new Map<string, { id: string; status: string }>();
    for (const f of friendships) {
      const otherId = f.requesterId === user.id ? f.addresseeId : f.requesterId;
      friendshipMap.set(otherId, { id: f.id, status: f.status });
    }

    res.json(users.map(u => ({
      ...u,
      isOrgMember: u.organizationId === user.organizationId,
      friendshipStatus: friendshipMap.get(u.id)?.status || null,
      friendshipId: friendshipMap.get(u.id)?.id || null,
    })));
  } catch (err) {
    console.error('[FRIENDS] Error searching:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/block-org — Block a Colony (organization)
// ═══════════════════════════════════════════════════════════════
router.post('/block-org', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { organizationId, reason } = req.body;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  if (!organizationId) { res.status(400).json({ error: 'organizationId requis' }); return; }

  // Prevent blocking own organization
  if (organizationId === user.organizationId) {
    res.status(400).json({ error: 'Vous ne pouvez pas bloquer votre propre Colony' }); return;
  }

  try {
    const existing = await db.orgBlock.findUnique({
      where: { userId_blockedOrgId: { userId: user.id, blockedOrgId: organizationId } },
    });
    if (existing) { res.json({ success: true, alreadyBlocked: true }); return; }

    const block = await db.orgBlock.create({
      data: { id: crypto.randomUUID(), userId: user.id, blockedOrgId: organizationId, reason: reason || null },
    });
    res.json({ success: true, block });
  } catch (err) {
    console.error('[FRIENDS] Error blocking org:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/unblock-org — Unblock a Colony
// ═══════════════════════════════════════════════════════════════
router.post('/unblock-org', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { organizationId } = req.body;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }
  if (!organizationId) { res.status(400).json({ error: 'organizationId requis' }); return; }

  try {
    const existing = await db.orgBlock.findUnique({
      where: { userId_blockedOrgId: { userId: user.id, blockedOrgId: organizationId } },
    });
    if (!existing) { res.json({ success: true, message: 'Non bloqué' }); return; }

    await db.orgBlock.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[FRIENDS] Error unblocking org:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /friends/blocked-orgs — List blocked organizations
// ═══════════════════════════════════════════════════════════════
router.get('/blocked-orgs', async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const blocks = await db.orgBlock.findMany({
      where: { userId: user.id },
      include: {
        blockedOrg: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ blockedOrgs: blocks.map(b => ({ blockId: b.id, id: b.blockedOrg.id, name: b.blockedOrg.name, avatarUrl: b.blockedOrg.logoUrl, blockedAt: b.createdAt, reason: b.reason })) });
  } catch (err) {
    console.error('[FRIENDS] Error listing blocked orgs:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

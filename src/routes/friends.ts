import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken as any);

// ═══════════════════════════════════════════════════════════════
// GET /friends — List all friends (accepted) + pending requests
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
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
      friends,
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
  const user = (req as any).user;
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
  const user = (req as any).user;
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
      if (existing.status === 'accepted') { res.json({ message: 'Déjà amis' }); return; }
      if (existing.status === 'pending') { res.json({ message: 'Demande déjà envoyée' }); return; }
    }

    const friendship = await db.friendship.create({
      data: { requesterId: user.id, addresseeId: userId, status: 'pending', source: 'manual' },
    });

    res.json({ success: true, friendship });
  } catch (err) {
    console.error('[FRIENDS] Error sending request:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /friends/:id/accept — Accept friend request
// ═══════════════════════════════════════════════════════════════
router.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const friendship = await db.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || friendship.addresseeId !== user.id) {
      res.status(404).json({ error: 'Demande non trouvée' }); return;
    }

    await db.friendship.update({
      where: { id: req.params.id },
      data: { status: 'accepted' },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[FRIENDS] Error accepting:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /friends/:id — Remove friend / reject request
// ═══════════════════════════════════════════════════════════════
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  try {
    const friendship = await db.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || (friendship.requesterId !== user.id && friendship.addresseeId !== user.id)) {
      res.status(404).json({ error: 'Amitié non trouvée' }); return;
    }

    await db.friendship.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[FRIENDS] Error removing:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /friends/search — Search users to add as friends
// ═══════════════════════════════════════════════════════════════
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
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

export default router;

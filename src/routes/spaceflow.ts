import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// 🌊 SPACEFLOW API ROUTES
// "Exister, Créer, Gagner !"
// ═══════════════════════════════════════════════════════════════

// ── FOLLOW SYSTEM ──────────────────────────────────────────────

router.post('/follow/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user.id;
    const followingId = req.params.userId;
    if (followerId === followingId) return res.status(400).json({ error: 'Impossible de se suivre soi-même' });

    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) return res.status(409).json({ error: 'Déjà suivi' });

    await db.follow.create({ data: { followerId, followingId } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/follow/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user.id;
    const followingId = req.params.userId;
    await db.follow.deleteMany({ where: { followerId, followingId } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/followers/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const followers = await db.follow.findMany({
      where: { followingId: req.params.userId },
      include: { follower: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ followers: followers.map(f => f.follower), count: followers.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/following/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const following = await db.follow.findMany({
      where: { followerId: req.params.userId },
      include: { following: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ following: following.map(f => f.following), count: following.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── STORIES ────────────────────────────────────────────────────

router.get('/stories/feed', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await db.story.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { expiresAt: { gt: new Date() } },
          { isHighlight: true },
        ],
        createdAt: { gt: twentyFourHoursAgo },
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        views: { where: { viewerId: userId }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      stories: stories.map(s => ({
        id: s.id,
        userId: s.authorId,
        userName: `${s.author.firstName} ${s.author.lastName}`.trim(),
        avatarUrl: s.author.avatarUrl,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        viewed: s.views.length > 0,
        createdAt: s.createdAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/stories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;
    const { mediaUrl, mediaType, text } = req.body;

    const story = await db.story.create({
      data: {
        authorId: userId,
        organizationId: orgId,
        mediaUrl: mediaUrl || '',
        mediaType: mediaType || 'image',
        caption: text,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    res.json({ story });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/stories/:storyId/view', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const storyId = req.params.storyId;

    const existing = await db.storyView.findUnique({
      where: { storyId_viewerId: { storyId, viewerId: userId } },
    });
    if (!existing) {
      await db.storyView.create({ data: { storyId, viewerId: userId } });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── EXPLORE ────────────────────────────────────────────────────

router.get('/explore/posts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const posts = await db.wallPost.findMany({
      where: {
        mediaUrls: { not: null },
        visibility: { in: ['ALL', 'IN'] },
      },
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true, mediaUrls: true, mediaType: true, likesCount: true, commentsCount: true,
        author: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    res.json({
      posts: posts.map(p => {
        const urls = Array.isArray(p.mediaUrls) ? p.mediaUrls as string[] : [];
        return {
          id: p.id,
          mediaUrl: urls[0] || '',
          mediaType: p.mediaType || 'image',
          likesCount: p.likesCount,
          commentsCount: p.commentsCount,
          authorName: `${p.author.firstName} ${p.author.lastName}`.trim(),
          authorAvatar: p.author.avatarUrl,
        };
      }),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/explore/hashtags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const hashtags = await db.hashtag.findMany({
      orderBy: { postCount: 'desc' },
      take: limit,
    });
    res.json({ hashtags });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/explore/suggested-users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    // Users from same org that the current user doesn't follow yet
    const alreadyFollowing = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = new Set(alreadyFollowing.map(f => f.followingId));
    followingIds.add(userId); // Exclude self

    const users = await db.user.findMany({
      where: {
        organizationId: orgId,
        status: 'active',
        id: { notIn: Array.from(followingIds) },
      },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
      take: limit,
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        mutualFriends: 0, // TODO: compute from Friendship table
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── SPARKS (Anonymous Posts) ───────────────────────────────────

const createSparkSchema = z.object({
  content: z.string().min(1).max(3000),
});

router.get('/sparks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const sparks = await db.spark.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        votes: { where: { voterId: userId }, select: { id: true } },
      },
    });

    res.json({
      sparks: sparks.map(s => ({
        id: s.id,
        content: s.content,
        sparkCount: s.sparkCount,
        revealThreshold: s.revealThreshold,
        isRevealed: s.isRevealed,
        authorName: s.isRevealed ? `${s.author.firstName} ${s.author.lastName}`.trim() : undefined,
        authorAvatar: s.isRevealed ? s.author.avatarUrl : undefined,
        createdAt: s.createdAt,
        hasVoted: s.votes.length > 0,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sparks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;
    const { content } = createSparkSchema.parse(req.body);

    const spark = await db.spark.create({
      data: { content, authorId: userId, organizationId: orgId },
    });
    res.json({ spark });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: e.message });
  }
});

router.post('/sparks/:sparkId/vote', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const sparkId = req.params.sparkId;

    // Check if already voted
    const existing = await db.sparkVote.findUnique({
      where: { sparkId_voterId: { sparkId, voterId: userId } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Déjà voté' });
    }

    await db.sparkVote.create({ data: { sparkId, voterId: userId } });

    // Update spark count
    const totalVotes = await db.sparkVote.count({ where: { sparkId } });
    const spark = await db.spark.update({
      where: { id: sparkId },
      data: {
        sparkCount: totalVotes,
        isRevealed: totalVotes >= 100, // Auto-reveal at threshold
      },
    });

    res.json({ sparkCount: spark.sparkCount, isRevealed: spark.isRevealed });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── BATTLES (Creative Duels) ──────────────────────────────────

router.get('/battles', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    const battles = await db.battle.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        challenger: { select: { firstName: true, lastName: true, avatarUrl: true } },
        opponent: { select: { firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { entries: true } },
      },
    });

    res.json({
      battles: battles.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description || '',
        status: b.status,
        challengerName: `${b.challenger.firstName} ${b.challenger.lastName}`.trim(),
        challengerAvatar: b.challenger.avatarUrl,
        opponentName: b.opponent ? `${b.opponent.firstName} ${b.opponent.lastName}`.trim() : undefined,
        opponentAvatar: b.opponent?.avatarUrl,
        endsAt: b.endsAt,
        entriesCount: b._count.entries,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/battles', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;
    const { title, description, opponentId, endsAt } = req.body;

    if (!title || title.length < 3) return res.status(400).json({ error: 'Titre requis (min 3 caractères)' });

    const battle = await db.battle.create({
      data: {
        title,
        description,
        challengerId: userId,
        opponentId: opponentId || null,
        organizationId: orgId,
        endsAt: endsAt ? new Date(endsAt) : new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    res.json({ battle });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── QUESTS (Gamified Missions) ────────────────────────────────

router.get('/quests/available', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;

    const quests = await db.quest.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: orgId },
          { organizationId: null }, // Global quests
        ],
      },
      orderBy: [{ questType: 'asc' }, { rewardPoints: 'desc' }],
      include: {
        progress: { where: { userId } },
      },
    });

    res.json({
      quests: quests.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description || '',
        type: q.questType,
        rewardPoints: q.rewardPoints,
        progress: q.progress[0]?.currentProgress || 0,
        maxProgress: q.targetCount,
        expiresAt: q.endsAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── EVENTS ────────────────────────────────────────────────────

router.get('/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    const events = await db.socialEvent.findMany({
      where: {
        organizationId: orgId,
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
      include: {
        creator: { select: { firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { attendees: true } },
      },
    });

    res.json({
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        type: e.eventType,
        location: e.location,
        startDate: e.startsAt,
        endDate: e.endsAt,
        attendeesCount: e._count.attendees,
        maxAttendees: e.maxAttendees,
        organizerName: `${e.creator.firstName} ${e.creator.lastName}`.trim(),
        organizerAvatar: e.creator.avatarUrl,
        coverImage: e.coverUrl,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orgId = (req as any).user.organizationId;
    const { title, description, type, location, startDate, endDate, maxAttendees, coverImage } = req.body;

    if (!title) return res.status(400).json({ error: 'Titre requis' });
    if (!startDate) return res.status(400).json({ error: 'Date de début requise' });

    const event = await db.socialEvent.create({
      data: {
        title, description, eventType: type || 'meetup',
        location, startsAt: new Date(startDate),
        endsAt: endDate ? new Date(endDate) : null,
        maxAttendees, coverUrl: coverImage,
        creatorId: userId, organizationId: orgId,
      },
    });
    res.json({ event });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/events/:eventId/rsvp', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const eventId = req.params.eventId;
    const status = req.body.status || 'GOING';

    const existing = await db.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      await db.eventAttendee.update({ where: { id: existing.id }, data: { status } });
    } else {
      await db.eventAttendee.create({ data: { eventId, userId, status } });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── TIME CAPSULES ─────────────────────────────────────────────

router.get('/capsules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    const capsules = await db.timeCapsule.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { recipientId: userId },
        ],
      },
      orderBy: { unlocksAt: 'asc' },
      take: limit,
      include: {
        creator: { select: { firstName: true, lastName: true, avatarUrl: true } },
        recipient: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({
      capsules: capsules.map(c => ({
        id: c.id,
        title: c.title,
        creatorName: `${c.creator.firstName} ${c.creator.lastName}`.trim(),
        creatorAvatar: c.creator.avatarUrl,
        unlocksAt: c.unlocksAt,
        isUnlocked: c.isUnlocked || new Date(c.unlocksAt) <= new Date(),
        recipientName: c.recipient ? `${c.recipient.firstName} ${c.recipient.lastName}`.trim() : undefined,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/capsules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, content, mediaUrl, mediaType, unlocksAt, recipientId } = req.body;

    if (!title) return res.status(400).json({ error: 'Titre requis' });
    if (!unlocksAt) return res.status(400).json({ error: 'Date de déverrouillage requise' });

    const capsule = await db.timeCapsule.create({
      data: {
        title, content, mediaUrl, mediaType,
        unlocksAt: new Date(unlocksAt),
        creatorId: userId,
        recipientId: recipientId || null,
      },
    });
    res.json({ capsule });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ORBIT (Friend Constellation) ──────────────────────────────

router.get('/orbit', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get friends with interaction frequency
    const friendships = await db.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    const friends = friendships.map(f => {
      const friend = f.requesterId === userId ? f.receiver : f.requester;
      return {
        id: friend.id,
        name: `${friend.firstName} ${friend.lastName}`.trim(),
        avatarUrl: friend.avatarUrl,
        interactionScore: Math.floor(Math.random() * 100), // TODO: real interaction scoring
        lastInteraction: f.updatedAt || f.createdAt,
        online: false, // TODO: WebSocket presence
      };
    });

    // Sort by interaction score (most active first)
    friends.sort((a, b) => b.interactionScore - a.interactionScore);

    res.json({ friends });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GAMIFICATION (Badges, Streaks, Level) ─────────────────────

router.get('/gamification/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const [streak, badges, allBadges] = await Promise.all([
      db.userStreak.findUnique({ where: { userId } }),
      db.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      }),
      db.badgeDefinition.findMany({ orderBy: { category: 'asc' } }),
    ]);

    res.json({
      streak: streak || { currentStreak: 0, longestStreak: 0, totalPoints: 0, level: 1 },
      earnedBadges: badges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        category: ub.badge.category,
        rarity: ub.badge.rarity,
        earnedAt: ub.earnedAt,
      })),
      allBadges: allBadges.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        rarity: b.rarity,
        earned: badges.some(ub => ub.badgeId === b.id),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

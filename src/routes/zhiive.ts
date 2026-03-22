import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// 🌊 ZHIIVE API ROUTES
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
          { createdAt: { gt: twentyFourHoursAgo }, expiresAt: { gt: new Date() } },
          { isHighlight: true },
        ],
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
    const { mediaUrl, mediaType, text, visibility } = req.body;

    const story = await db.story.create({
      data: {
        authorId: userId,
        organizationId: orgId,
        mediaUrl: mediaUrl || '',
        mediaType: mediaType || 'image',
        caption: text,
        visibility: ['ALL', 'IN', 'OUT'].includes(visibility) ? visibility : 'ALL',
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

router.delete('/stories/:storyId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const storyId = req.params.storyId;
    const story = await db.story.findUnique({ where: { id: storyId } });
    if (!story) return res.status(404).json({ error: 'Story non trouvée' });
    if (story.authorId !== userId) return res.status(403).json({ error: 'Non autorisé' });
    await db.storyView.deleteMany({ where: { storyId } });
    await db.story.delete({ where: { id: storyId } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── EXPLORE ────────────────────────────────────────────────────

// Legacy endpoint kept for compatibility
router.get('/explore/posts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {
      organizationId: orgId,
      isPublished: true,
      visibility: { in: ['ALL', 'IN'] },
    };

    if (category) {
      where.category = category;
    }

    if (search && search.trim().length >= 2) {
      const term = search.trim();
      where.OR = [
        { content: { contains: term, mode: 'insensitive' } },
        { author: { firstName: { contains: term, mode: 'insensitive' } } },
        { author: { lastName: { contains: term, mode: 'insensitive' } } },
        { tags: { has: term.toLowerCase().replace('#', '') } },
      ];
    }

    const posts = await db.wallPost.findMany({
      where,
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true, mediaUrls: true, mediaType: true, likesCount: true, commentsCount: true,
        content: true, category: true,
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        reactions: { where: { userId: user.id }, select: { type: true }, take: 1 },
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
          caption: p.content || '',
          category: p.category || null,
          authorId: p.author.id,
          authorName: `${p.author.firstName} ${p.author.lastName}`.trim(),
          authorAvatar: p.author.avatarUrl,
          isLiked: p.reactions.length > 0,
        };
      }),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── EXPLORE GALLERY (Instagram-style) ──────────────────────────
// Unified media gallery: WallPost photos + videos + Stories
// Filters: scope (friends/org/all), type (photo/video/all), sort (popular/recent), category, search

router.get('/explore/gallery', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    const userId = user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 40, 100);
    const mediaFilter = (req.query.type as string) || 'all'; // 'photo' | 'video' | 'all'
    const scope = (req.query.scope as string) || 'all'; // 'friends' | 'org' | 'all'
    const sort = (req.query.sort as string) || 'popular'; // 'popular' | 'recent'
    const mode = (req.query.mode as string) || 'org'; // 'personal' | 'org'
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    // ── Build WallPost query ──
    const postWhere: any = {
      isPublished: true,
      NOT: { mediaUrls: { equals: null } },
    };

    // Media type filter
    if (mediaFilter === 'photo') {
      postWhere.mediaType = 'image';
    } else if (mediaFilter === 'video') {
      postWhere.mediaType = 'video';
    } else {
      postWhere.mediaType = { in: ['image', 'video'] };
    }

    // Scope filter
    if (scope === 'private') {
      // Only show user's own private posts
      postWhere.authorId = userId;
      postWhere.visibility = 'OUT';
    } else if (scope === 'friends') {
      const friendships = await db.friendship.findMany({
        where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { requesterId: true, addresseeId: true },
      });
      const friendIds = friendships.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId);
      friendIds.push(userId); // Include own posts
      postWhere.authorId = { in: friendIds };
      postWhere.visibility = { in: ['ALL', 'IN'] };
    } else if (scope === 'org') {
      postWhere.organizationId = orgId;
      postWhere.visibility = { in: ['ALL', 'IN'] };
    } else if (mode === 'personal') {
      // Personal mode: only public posts from the whole network + own posts
      postWhere.OR = [
        { visibility: 'ALL' },
        { authorId: userId },
      ];
    } else {
      // 'all' scope + org mode — public posts from all orgs + own org internal
      postWhere.OR = [
        { visibility: 'ALL' },
        ...(orgId ? [{ organizationId: orgId, visibility: { in: ['ALL', 'IN'] } }] : []),
      ];
    }

    // Category filter
    if (category) {
      postWhere.category = category;
    }

    // Search filter
    if (search && search.trim().length >= 2) {
      const term = search.trim();
      const searchConditions = [
        { content: { contains: term, mode: 'insensitive' as const } },
        { author: { firstName: { contains: term, mode: 'insensitive' as const } } },
        { author: { lastName: { contains: term, mode: 'insensitive' as const } } },
        { tags: { has: term.toLowerCase().replace('#', '') } },
      ];
      // Merge search OR with scope OR if both exist
      if (postWhere.OR) {
        const scopeOR = postWhere.OR;
        delete postWhere.OR;
        postWhere.AND = [
          { OR: scopeOR },
          { OR: searchConditions },
        ];
      } else {
        postWhere.OR = searchConditions;
      }
    }

    // Order
    const orderBy = sort === 'recent'
      ? [{ createdAt: 'desc' as const }]
      : [{ likesCount: 'desc' as const }, { createdAt: 'desc' as const }];

    const posts = await db.wallPost.findMany({
      where: postWhere,
      orderBy,
      take: limit * 2, // Fetch extra to compensate for empty mediaUrls filtering
      select: {
        id: true, mediaUrls: true, mediaType: true, likesCount: true, commentsCount: true,
        content: true, category: true, createdAt: true, publishAsOrg: true,
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        organization: { select: { id: true, name: true, logoUrl: true } },
        reactions: { where: { userId }, select: { type: true }, take: 1 },
      },
    });

    // Flatten: each media URL becomes a gallery item, filter out empty
    const galleryItems: any[] = [];
    for (const p of posts) {
      const urls = Array.isArray(p.mediaUrls) ? p.mediaUrls as string[] : [];
      if (urls.length === 0 || !urls[0]) continue;
      const isOrg = p.publishAsOrg && p.organization;
      galleryItems.push({
        id: p.id,
        source: 'post' as const,
        mediaUrl: urls[0],
        mediaType: p.mediaType || 'image',
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        caption: p.content || '',
        category: p.category || null,
        authorId: p.author.id,
        authorName: isOrg ? p.organization!.name : `${p.author.firstName} ${p.author.lastName}`.trim(),
        authorAvatar: isOrg ? (p.organization!.logoUrl || null) : p.author.avatarUrl,
        publishAsOrg: p.publishAsOrg,
        isLiked: p.reactions.length > 0,
        createdAt: p.createdAt,
      });
      if (galleryItems.length >= limit) break;
    }

    // ── Fetch Stories (only if not filtering video-only) ──
    let storyItems: any[] = [];
    if (mediaFilter !== 'video') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const storyWhere: any = {
        OR: [
          { createdAt: { gt: twentyFourHoursAgo }, expiresAt: { gt: new Date() } },
          { isHighlight: true },
        ],
      };

      if (scope === 'friends') {
        const friendships = await db.friendship.findMany({
          where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
          select: { requesterId: true, addresseeId: true },
        });
        const friendIds = friendships.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId);
        friendIds.push(userId);
        storyWhere.authorId = { in: friendIds };
      } else if (scope === 'org') {
        storyWhere.organizationId = orgId;
      } else {
        storyWhere.OR = [
          ...(storyWhere.OR || []),
          { organizationId: orgId },
        ];
        // For 'all' scope, only show org stories (stories are inherently org-scoped)
        storyWhere.organizationId = orgId;
      }

      if (mediaFilter === 'photo') {
        storyWhere.mediaType = 'image';
      }

      const stories = await db.story.findMany({
        where: storyWhere,
        orderBy: sort === 'recent' ? { createdAt: 'desc' } : { createdAt: 'desc' },
        take: 20,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          organization: { select: { id: true, name: true, logoUrl: true } },
          _count: { select: { views: true } },
        },
      });

      storyItems = stories
        .filter(s => s.mediaUrl && s.mediaUrl.length > 0)
        .map(s => {
          const isOrg = s.publishAsOrg && s.organization;
          return {
            id: `story-${s.id}`,
            source: 'story' as const,
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType || 'image',
            likesCount: s._count.views,
            commentsCount: 0,
            caption: s.caption || '',
            category: null,
            authorId: s.author.id,
            authorName: isOrg ? s.organization!.name : `${s.author.firstName} ${s.author.lastName}`.trim(),
            authorAvatar: isOrg ? (s.organization!.logoUrl || null) : s.author.avatarUrl,
            publishAsOrg: s.publishAsOrg,
            isLiked: false,
            createdAt: s.createdAt,
            isStory: true,
            isHighlight: s.isHighlight,
          };
        });
    }

    // ── Merge and sort ──
    const allItems = [...galleryItems, ...storyItems];

    if (sort === 'popular') {
      allItems.sort((a, b) => b.likesCount - a.likesCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json({
      items: allItems.slice(0, limit),
      total: allItems.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── REELS (video-only feed) ────────────────────────────────────

router.get('/reels', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const mode = (req.query.mode as string) || 'org';

    const whereClause: any = {
      isPublished: true,
      mediaType: 'video',
      NOT: { mediaUrls: { equals: null } },
    };

    if (mode === 'personal' || !orgId) {
      // Personal mode or free user: public videos + own posts
      whereClause.OR = [
        { visibility: 'ALL' },
        { authorId: user.id },
      ];
    } else {
      // Org mode: videos from own org
      whereClause.organizationId = orgId;
      whereClause.visibility = { in: ['ALL', 'IN'] };
    }

    const posts = await db.wallPost.findMany({
      where: whereClause,
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
      take: limit * 2, // Fetch extra to compensate for empty mediaUrls filtering
      select: {
        id: true, mediaUrls: true, mediaType: true, likesCount: true, commentsCount: true,
        content: true, publishAsOrg: true,
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        organization: { select: { id: true, name: true, logoUrl: true } },
        reactions: { where: { userId: user.id }, select: { type: true }, take: 1 },
      },
    });

    // Filter out posts with empty mediaUrls arrays (Json field can be [] or null)
    const videoPosts = posts
      .filter(p => {
        const urls = Array.isArray(p.mediaUrls) ? p.mediaUrls as string[] : [];
        return urls.length > 0 && urls[0];
      })
      .slice(0, limit);

    res.json({
      reels: videoPosts.map(p => {
        const urls = p.mediaUrls as string[];
        const isOrg = p.publishAsOrg && p.organization;
        return {
          id: p.id,
          mediaUrl: urls[0],
          mediaType: 'video' as const,
          likesCount: p.likesCount,
          commentsCount: p.commentsCount,
          caption: p.content || '',
          authorId: p.author.id,
          authorName: isOrg ? p.organization!.name : `${p.author.firstName} ${p.author.lastName}`.trim(),
          authorAvatar: isOrg ? (p.organization!.logoUrl || null) : p.author.avatarUrl,
          publishAsOrg: p.publishAsOrg,
          organizationName: p.organization?.name || null,
          isLiked: p.reactions.length > 0,
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
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (search && search.trim().length >= 1) {
      where.name = { contains: search.trim().toLowerCase().replace('#', ''), mode: 'insensitive' };
    }

    const hashtags = await db.hashtag.findMany({
      where,
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

    const scopeFilter = (req.query.scope as string) || 'all'; // 'all' | 'friends' | 'org'

    // Get follow/friendship data for current user
    const [alreadyFollowing, userFriendships] = await Promise.all([
      db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      db.friendship.findMany({
        where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { id: true, requesterId: true, addresseeId: true, status: true },
      }),
    ]);
    const followingIds = new Set(alreadyFollowing.map(f => f.followingId));
    const blockedIds = new Set(
      userFriendships.filter(f => f.status === 'blocked').map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
    );
    const myFriendIds = new Set(
      userFriendships.filter(f => f.status === 'accepted').map(f => f.requesterId === userId ? f.addresseeId : f.requesterId)
    );

    // Build friendship status map for current user (status + direction + id)
    const friendshipInfoMap = new Map<string, { status: string; direction: 'sent' | 'received'; friendshipId: string }>();
    userFriendships.forEach(f => {
      const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      const direction = f.requesterId === userId ? 'sent' : 'received';
      friendshipInfoMap.set(otherId, { status: f.status, direction, friendshipId: f.id });
    });

    // Build user query based on scope
    const userWhere: any = { status: 'active', id: { not: userId, notIn: Array.from(blockedIds) } };
    if (scopeFilter === 'friends') {
      userWhere.id = { in: Array.from(myFriendIds) };
    } else if (scopeFilter === 'org' && orgId) {
      userWhere.organizationId = orgId;
    }
    // 'all' = no additional filter

    const users = await db.user.findMany({
      where: userWhere,
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, organizationId: true },
      take: limit,
      orderBy: { firstName: 'asc' },
    });

    // Compute mutual friends for each user
    const usersWithMutual = await Promise.all(users.map(async (u) => {
      let mutualCount = 0;
      if (myFriendIds.size > 0) {
        mutualCount = await db.friendship.count({
          where: {
            status: 'accepted',
            OR: [
              { requesterId: u.id, addresseeId: { in: Array.from(myFriendIds) } },
              { addresseeId: u.id, requesterId: { in: Array.from(myFriendIds) } },
            ],
          },
        });
      }
      const friendInfo = friendshipInfoMap.get(u.id) || null;
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        mutualFriends: mutualCount,
        isFollowing: followingIds.has(u.id),
        friendStatus: friendInfo?.status || null,
        friendDirection: friendInfo?.direction || null,
        friendshipId: friendInfo?.friendshipId || null,
        sameOrg: !!orgId && u.organizationId === orgId,
      };
    }));

    res.json({ users: usersWithMutual });
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
    const mode = (req.query.mode as string) || 'org';

    const whereClause: any = {};
    if (mode === 'personal' || !orgId) {
      // Personal mode: all sparks (public network) + own sparks
      whereClause.OR = [
        { organizationId: null },
        { authorId: userId },
      ];
    } else {
      whereClause.organizationId = orgId;
    }

    const sparks = await db.spark.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        organization: { select: { id: true, name: true, logoUrl: true } },
        votes: { where: { voterId: userId }, select: { id: true } },
      },
    });

    res.json({
      sparks: sparks.map(s => {
        const isOrg = s.isRevealed && s.publishAsOrg && s.organization;
        return {
          id: s.id,
          content: s.content,
          sparkCount: s.sparkCount,
          revealThreshold: s.revealThreshold,
          isRevealed: s.isRevealed,
          authorName: s.isRevealed ? (isOrg ? s.organization!.name : `${s.author.firstName} ${s.author.lastName}`.trim()) : undefined,
          authorAvatar: s.isRevealed ? (isOrg ? (s.organization!.logoUrl || null) : s.author.avatarUrl) : undefined,
          publishAsOrg: s.publishAsOrg,
          createdAt: s.createdAt,
          hasVoted: s.votes.length > 0,
        };
      }),
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
      data: { content, authorId: userId, organizationId: orgId, visibility: ['ALL', 'IN', 'OUT'].includes(req.body.visibility) ? req.body.visibility : 'ALL', publishAsOrg: req.body.publishAsOrg && !!orgId ? true : false },
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
    const mode = (req.query.mode as string) || 'org';

    const whereClause: any = {};
    if (mode === 'personal' || !orgId) {
      whereClause.OR = [
        { organizationId: null },
        { challengerId: (req as any).user.id },
      ];
    } else {
      whereClause.organizationId = orgId;
    }

    const battles = await db.battle.findMany({
      where: whereClause,
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

router.post('/battles/:id/join', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const battleId = req.params.id;
    const battle = await db.battle.findUnique({ where: { id: battleId } });
    if (!battle) return res.status(404).json({ error: 'Battle non trouvé' });
    if (battle.challengerId === userId) return res.status(400).json({ error: 'Vous êtes le créateur de ce battle' });

    const existing = await db.battleEntry.findUnique({
      where: { battleId_userId: { battleId, userId } },
    });
    if (existing) return res.status(409).json({ error: 'Vous participez déjà' });

    const entry = await db.battleEntry.create({
      data: { battleId, userId },
    });
    res.json({ success: true, entry });
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
        progress: q.progress[0]?.currentCount || 0,
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
    const mode = (req.query.mode as string) || 'org';

    const whereClause: any = {
      startsAt: { gte: new Date() },
    };

    if (mode === 'personal' || !orgId) {
      whereClause.OR = [
        { organizationId: null },
        ...(orgId ? [{ organizationId: orgId }] : []),
      ];
    } else {
      whereClause.organizationId = orgId;
    }

    const events = await db.socialEvent.findMany({
      where: whereClause,
      orderBy: { startsAt: 'asc' },
      take: limit,
      include: {
        creator: { select: { firstName: true, lastName: true, avatarUrl: true } },
        organization: { select: { id: true, name: true, logoUrl: true } },
        _count: { select: { attendees: true } },
      },
    });

    res.json({
      events: events.map(e => {
        const isOrg = e.publishAsOrg && e.organization;
        return {
          id: e.id,
          title: e.title,
          description: e.description || '',
          type: e.eventType,
          location: e.location,
          startDate: e.startsAt,
          endDate: e.endsAt,
          attendeesCount: e._count.attendees,
          maxAttendees: e.maxAttendees,
          organizerName: isOrg ? e.organization!.name : `${e.creator.firstName} ${e.creator.lastName}`.trim(),
          organizerAvatar: isOrg ? (e.organization!.logoUrl || null) : e.creator.avatarUrl,
          publishAsOrg: e.publishAsOrg,
          coverImage: e.coverUrl,
        };
      }),
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
        visibility: ['ALL', 'IN', 'OUT'].includes(req.body.visibility) ? req.body.visibility : 'ALL',
        publishAsOrg: req.body.publishAsOrg && !!orgId ? true : false,
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

router.delete('/events/:eventId/rsvp', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const eventId = req.params.eventId;
    await db.eventAttendee.deleteMany({ where: { eventId, userId } });
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
          { authorId: userId },
          { recipientId: userId },
        ],
      },
      orderBy: { unlocksAt: 'asc' },
      take: limit,
      include: {
        author: { select: { firstName: true, lastName: true, avatarUrl: true } },
        recipient: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({
      capsules: capsules.map(c => ({
        id: c.id,
        content: c.content,
        creatorName: `${c.author.firstName} ${c.author.lastName}`.trim(),
        creatorAvatar: c.author.avatarUrl,
        unlocksAt: c.unlocksAt,
        isUnlocked: c.isOpened || new Date(c.unlocksAt) <= new Date(),
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
    const { content, mediaUrl, mediaType, unlocksAt, recipientId } = req.body;

    if (!unlocksAt) return res.status(400).json({ error: 'Date de déverrouillage requise' });

    const capsule = await db.timeCapsule.create({
      data: {
        content, mediaUrl, mediaType,
        unlocksAt: new Date(unlocksAt),
        authorId: userId,
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
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        addressee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Compute real interaction scores based on reactions and comments
    const friends = await Promise.all(friendships.map(async (f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;

      // Count mutual interactions: reactions on each other's posts + comments
      const [reactionsGiven, reactionsReceived, commentsGiven, commentsReceived] = await Promise.all([
        db.wallReaction.count({
          where: { userId, post: { authorId: friend.id } },
        }).catch(() => 0),
        db.wallReaction.count({
          where: { userId: friend.id, post: { authorId: userId } },
        }).catch(() => 0),
        db.wallComment.count({
          where: { authorId: userId, post: { authorId: friend.id } },
        }).catch(() => 0),
        db.wallComment.count({
          where: { authorId: friend.id, post: { authorId: userId } },
        }).catch(() => 0),
      ]);

      const totalInteractions = reactionsGiven + reactionsReceived + (commentsGiven + commentsReceived) * 2;
      // Normalize to 0-100 score (cap at 50 interactions = 100)
      const interactionScore = Math.min(100, Math.round((totalInteractions / 50) * 100));

      return {
        id: friend.id,
        name: `${friend.firstName} ${friend.lastName}`.trim(),
        avatarUrl: friend.avatarUrl,
        interactionScore,
        lastInteraction: f.updatedAt || f.createdAt,
        online: false,
      };
    }));

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
        earnedAt: ub.earnedAt,
      })),
      allBadges: allBadges.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        earned: badges.some(ub => ub.badgeId === b.id),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { getOrgSocialSettings } from '../lib/feed-visibility';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

// ── Validation schemas ──
const createMomentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  momentDate: z.string().refine(d => !isNaN(Date.parse(d))),
  coverUrl: z.string().optional(),
  linkedPostId: z.string().optional(),
  visibility: z.enum(['public', 'crew', 'private']).default('public'),
  sortOrder: z.number().int().optional(),
  publishToWall: z.boolean().optional(),
  media: z.array(z.object({
    url: z.string(),
    type: z.enum(['image', 'video']).default('image'),
    caption: z.string().max(500).optional(),
    sortOrder: z.number().int().optional(),
  })).optional(),
});

const updateMomentSchema = createMomentSchema.partial();

// ══════════════════════════════════════════════════════════
// GET /hive-live/org/:orgId — Fetch org lifeline (Colony timeline)
// (static route must come BEFORE /:userId to avoid param capture)
// ══════════════════════════════════════════════════════════
router.get('/org/:orgId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const moments = await db.hiveLiveMoment.findMany({
      where: {
        organizationId: orgId,
        visibility: { in: ['public', 'crew'] },
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { momentDate: 'asc' },
    });

    res.json(moments);
  } catch (error) {
    logger.error('[HIVE-LIVE] Error fetching org moments:', error);
    res.status(500).json({ error: 'Erreur lors du chargement de la lifeline Colony' });
  }
});

// ══════════════════════════════════════════════════════════
// POST /hive-live — Create a new moment
// ══════════════════════════════════════════════════════════
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const data = createMomentSchema.parse(req.body);
    const orgId = req.headers['x-organization-id'] as string || user.organizationId || null;

    const settings = await getOrgSocialSettings(orgId);
    if (!settings.hiveLiveEnabled) return res.status(403).json({ error: 'Hive Live disabled' });

    const moment = await db.hiveLiveMoment.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        title: data.title,
        description: data.description || null,
        momentDate: new Date(data.momentDate),
        coverUrl: data.coverUrl || null,
        linkedPostId: data.linkedPostId || null,
        visibility: data.visibility,
        sortOrder: data.sortOrder || 0,
        media: data.media ? {
          create: data.media.map((m, i) => ({
            url: m.url,
            type: m.type,
            caption: m.caption || null,
            sortOrder: m.sortOrder ?? i,
          })),
        } : undefined,
      },
      include: { media: true },
    });

    // Optionally create a Wall post simultaneously
    if (data.publishToWall && (data.description || (data.media && data.media.length > 0))) {
      await db.wallPost.create({
        data: {
          authorId: user.id,
          organizationId: orgId,
          content: `${data.title}${data.description ? '\n\n' + data.description : ''}`,
          mediaUrls: data.media ? data.media.map(m => m.url) : data.coverUrl ? [data.coverUrl] : [],
          mediaType: data.media?.some(m => m.type === 'video') ? 'video' : 'image',
          visibility: data.visibility === 'private' ? 'OUT' : data.visibility === 'crew' ? 'IN' : 'ALL',
          category: 'actualite',
        },
      });
    }

    res.status(201).json(moment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: error.errors });
    }
    logger.error('[HIVE-LIVE] Error creating moment:', error);
    res.status(500).json({ error: 'Erreur lors de la création du moment' });
  }
});

// ══════════════════════════════════════════════════════════
// POST /hive-live/from-post/:postId — Favorite a Wall post into Hive Live
// (static route — must come BEFORE /:id routes)
// ══════════════════════════════════════════════════════════
router.post('/from-post/:postId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const orgId = req.headers['x-organization-id'] as string || user.organizationId || null;
    const { postId } = req.params;
    const { title, momentDate, visibility } = req.body;

    const settings = await getOrgSocialSettings(orgId);
    if (!settings.hiveLiveEnabled) return res.status(403).json({ error: 'Hive Live disabled' });

    const post = await db.wallPost.findUnique({
      where: { id: postId },
      select: { id: true, content: true, mediaUrls: true, mediaType: true, createdAt: true, authorId: true },
    });
    if (!post) return res.status(404).json({ error: 'Publication non trouvée' });
    if (post.authorId !== user.id) return res.status(403).json({ error: 'Non autorisé' });

    // Extract media from post
    const mediaUrls = Array.isArray(post.mediaUrls) ? (post.mediaUrls as string[]) : [];

    const moment = await db.hiveLiveMoment.create({
      data: {
        userId: user.id,
        title: title || (post.content ? post.content.substring(0, 100) : 'Moment'),
        description: post.content || null,
        momentDate: momentDate ? new Date(momentDate) : post.createdAt,
        linkedPostId: post.id,
        visibility: visibility || 'public',
        coverUrl: mediaUrls[0] || null,
        media: mediaUrls.length > 0 ? {
          create: mediaUrls.map((url, i) => ({
            url,
            type: post.mediaType === 'video' ? 'video' : 'image',
            sortOrder: i,
          })),
        } : undefined,
      },
      include: { media: true },
    });

    res.status(201).json(moment);
  } catch (error) {
    logger.error('[HIVE-LIVE] Error creating moment from post:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout au Hive Live' });
  }
});

// ══════════════════════════════════════════════════════════
// PUT /hive-live/:id — Update a moment
// ══════════════════════════════════════════════════════════
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const orgId = req.headers['x-organization-id'] as string || user.organizationId || null;
    const { id } = req.params;
    const data = updateMomentSchema.parse(req.body);

    const settings = await getOrgSocialSettings(orgId);
    if (!settings.hiveLiveEnabled) return res.status(403).json({ error: 'Hive Live disabled' });

    // Verify ownership
    const existing = await db.hiveLiveMoment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Moment non trouvé' });
    if (existing.userId !== user.id) return res.status(403).json({ error: 'Non autorisé' });

    const updated = await db.hiveLiveMoment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.momentDate !== undefined && { momentDate: new Date(data.momentDate) }),
        ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.linkedPostId !== undefined && { linkedPostId: data.linkedPostId }),
      },
      include: { media: true },
    });

    // Update media if provided
    if (data.media) {
      await db.hiveLiveMomentMedia.deleteMany({ where: { momentId: id } });
      for (let i = 0; i < data.media.length; i++) {
        const m = data.media[i];
        await db.hiveLiveMomentMedia.create({
          data: {
            momentId: id,
            url: m.url,
            type: m.type,
            caption: m.caption || null,
            sortOrder: m.sortOrder ?? i,
          },
        });
      }
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: error.errors });
    }
    logger.error('[HIVE-LIVE] Error updating moment:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ══════════════════════════════════════════════════════════
// DELETE /hive-live/:id — Delete a moment
// ══════════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const existing = await db.hiveLiveMoment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Moment non trouvé' });
    if (existing.userId !== user.id) return res.status(403).json({ error: 'Non autorisé' });

    await db.hiveLiveMoment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('[HIVE-LIVE] Error deleting moment:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ══════════════════════════════════════════════════════════
// GET /hive-live/:userId — Fetch all moments for a user's lifeline
// (dynamic param route — must come LAST to avoid capturing static paths)
// ══════════════════════════════════════════════════════════
router.get('/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const viewer = req.user;
    const isOwner = viewer.id === userId;

    // Build visibility filter
    const visibilityFilter: string[] = ['public'];
    if (isOwner) {
      visibilityFilter.push('crew', 'private');
    } else {
      // Check if viewer is in same org (crew)
      const sameOrg = viewer.organizationId && await db.userOrganization.findFirst({
        where: { userId, organizationId: viewer.organizationId },
      });
      if (sameOrg) visibilityFilter.push('crew');
    }

    const moments = await db.hiveLiveMoment.findMany({
      where: {
        userId,
        visibility: { in: visibilityFilter },
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        linkedPost: {
          select: {
            id: true,
            content: true,
            mediaUrls: true,
            mediaType: true,
            createdAt: true,
            likesCount: true,
            commentsCount: true,
          },
        },
      },
      orderBy: { momentDate: 'asc' },
    });

    res.json(moments);
  } catch (error) {
    logger.error('[HIVE-LIVE] Error fetching moments:', error);
    res.status(500).json({ error: 'Erreur lors du chargement de la lifeline' });
  }
});

export default router;

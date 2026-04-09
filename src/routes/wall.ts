import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { getSocialContext, buildWallFeedWhere, FeedMode } from '../lib/feed-visibility';
import { z } from 'zod';
import { uploadExpressFile } from '../lib/storage';
import { sendPushToUser } from './push';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// SCHEMAS DE VALIDATION
// ═══════════════════════════════════════════════════════════════

const createPostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  mediaUrls: z.array(z.string()).optional(),
  mediaType: z.enum(['image', 'video', 'document', 'gallery']).optional(),
  visibility: z.enum(['OUT', 'IN', 'ALL', 'CLIENT']).default('IN'),
  targetLeadId: z.string().optional(),
  category: z.string().optional(),
  crmEventType: z.string().optional(),
  crmEntityType: z.string().optional(),
  crmEntityId: z.string().optional(),
  isPinned: z.boolean().optional(),
  publishAsOrg: z.boolean().optional(),
  parentPostId: z.string().optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentCommentId: z.string().optional(),
  mediaUrl: z.string().optional(),
  publishAsOrg: z.boolean().optional(),
});

const reactionSchema = z.object({
  type: z.enum(['LIKE', 'LOVE', 'BRAVO', 'UTILE', 'WOW']).default('LIKE'),
});

// ═══════════════════════════════════════════════════════════════
// GET /wall/feed — Fil d'actualité (avec filtres)
// ═══════════════════════════════════════════════════════════════
router.get('/feed', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId || req.headers['x-organization-id'] as string;
    const {
      visibility,
      category,
      targetLeadId,
      cursor,
      limit = '20',
      mode, // 'personal' | 'org' — pour les users avec org qui veulent filtrer
    } = req.query;

    const take = Math.min(parseInt(limit as string) || 20, 50);

    // ═══ Système centralisé de visibilité (feed-visibility.ts) ═══
    const feedMode: FeedMode = (mode as string) === 'personal' ? 'personal' 
      : (mode as string) === 'public' ? 'public' 
      : 'org';
    
    const isSuperAdmin = user.role === 'super_admin' || user.isSuperAdmin;
    const socialCtx = await getSocialContext(user.id, orgId, isSuperAdmin);
    
    // Client mode keeps its own specific logic
    let where: any;
    if (user.role === 'client') {
      where = {
        isPublished: true,
        OR: [
          { visibility: 'IN', organizationId: orgId },
          { visibility: 'ALL' },
          { visibility: 'CLIENT', targetLeadId: user.linkedLeadId },
        ],
      };
    } else if (visibility) {
      // Explicit visibility filter
      where = { isPublished: true, visibility };
      if (orgId) where.organizationId = orgId;
    } else {
      // Use centralized feed-visibility system
      where = buildWallFeedWhere(socialCtx, feedMode);
    }

    if (category) where.category = category;
    if (targetLeadId) where.targetLeadId = targetLeadId;
    if (cursor) where.createdAt = { lt: new Date(cursor as string) };

    const posts = await db.wallPost.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
        targetLead: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        parentPost: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            organization: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        reactions: {
          select: { id: true, userId: true, type: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 3,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: {
          select: { comments: true, reactions: true, shares: true },
        },
      },
    });

    // Enrichir avec la réaction de l'utilisateur courant
    const enriched = posts.map(post => ({
      ...post,
      myReaction: post.reactions.find(r => r.userId === user.id) || null,
      totalComments: post._count.comments,
      totalReactions: post._count.reactions,
      totalShares: post._count.shares,
    }));

    res.json({
      posts: enriched,
      nextCursor: posts.length === take ? posts[posts.length - 1].createdAt.toISOString() : null,
    });
  } catch (error) {
    console.error('[WALL] Erreur feed:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du fil' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /wall/my-feed — Mon mur personnel (mes posts + posts me ciblant)
// ═══════════════════════════════════════════════════════════════
router.get('/my-feed', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { cursor, limit = '20', mode } = req.query;
    const take = Math.min(parseInt(limit as string) || 20, 50);

    const where: any = {
      isPublished: true,
      authorId: user.id,
    };

    // Filter by identity mode: personal shows only personal posts, org shows only org posts
    if (mode === 'personal') {
      where.publishAsOrg = false;
    } else if (mode === 'org') {
      where.publishAsOrg = true;
    }

    if (cursor) where.createdAt = { lt: new Date(cursor as string) };

    const posts = await db.wallPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
        parentPost: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            organization: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        reactions: {
          select: { id: true, userId: true, type: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 3,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: {
          select: { comments: true, reactions: true, shares: true },
        },
      },
    });

    const enriched = posts.map(post => ({
      ...post,
      myReaction: post.reactions.find(r => r.userId === user.id) || null,
      totalComments: post._count.comments,
      totalReactions: post._count.reactions,
      totalShares: post._count.shares,
    }));

    res.json({
      posts: enriched,
      nextCursor: posts.length === take ? posts[posts.length - 1].createdAt.toISOString() : null,
    });
  } catch (error) {
    console.error('[WALL] Erreur my-feed:', error);
    res.status(500).json({ error: 'Erreur lors du chargement de votre mur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /wall/client-feed/:leadId — Mur du client (son parcours projet)
// ═══════════════════════════════════════════════════════════════
router.get('/client-feed/:leadId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { leadId } = req.params;
    const { cursor, limit = '20' } = req.query;
    const take = Math.min(parseInt(limit as string) || 20, 50);

    const where: any = {
      isPublished: true,
      targetLeadId: leadId,
      visibility: 'CLIENT',
    };

    if (cursor) where.createdAt = { lt: new Date(cursor as string) };

    const posts = await db.wallPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        reactions: {
          select: { id: true, userId: true, type: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 5,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: {
          select: { comments: true, reactions: true, shares: true },
        },
      },
    });

    const enriched = posts.map(post => ({
      ...post,
      myReaction: post.reactions.find(r => r.userId === user.id) || null,
      totalComments: post._count.comments,
      totalReactions: post._count.reactions,
      totalShares: post._count.shares,
    }));

    res.json({
      posts: enriched,
      nextCursor: posts.length === take ? posts[posts.length - 1].createdAt.toISOString() : null,
    });
  } catch (error) {
    console.error('[WALL] Erreur client-feed:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du mur client' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /wall/posts — Créer un post
// ═══════════════════════════════════════════════════════════════
router.post('/posts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId || req.headers['x-organization-id'] as string;
    const data = createPostSchema.parse(req.body);

    // Free users (sans org) ne peuvent poster qu'en visibilité ALL
    if (!orgId && data.visibility && data.visibility !== 'ALL') {
      data.visibility = 'ALL';
    }

    // Validation : si CLIENT, targetLeadId obligatoire
    if (data.visibility === 'CLIENT' && !data.targetLeadId) {
      return res.status(400).json({ error: 'targetLeadId requis pour les posts CLIENT' });
    }

    // Au moins du contenu ou des médias ou un partage
    if (!data.content && (!data.mediaUrls || data.mediaUrls.length === 0) && !data.parentPostId) {
      return res.status(400).json({ error: 'Contenu ou média requis' });
    }

    const post = await db.wallPost.create({
      data: {
        organizationId: orgId || null,
        authorId: user.id,
        content: data.content,
        mediaUrls: data.mediaUrls || undefined,
        mediaType: data.mediaType,
        visibility: data.visibility,
        targetLeadId: data.targetLeadId,
        category: data.category,
        crmEventType: data.crmEventType,
        crmEntityType: data.crmEntityType,
        crmEntityId: data.crmEntityId,
        isPinned: data.isPinned || false,
        publishAsOrg: data.publishAsOrg && !!orgId ? true : false,
        parentPostId: data.parentPostId || null,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
        parentPost: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            organization: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
    });


    // Incrémenter le compteur de partages du post parent
    if (data.parentPostId) {
      await db.wallPost.update({ where: { id: data.parentPostId }, data: { sharesCount: { increment: 1 } } });
    }

    // Save image media to UserPhoto collection
    if (data.mediaUrls?.length) {
      try {
        const imageUrls = (data.mediaUrls as string[]).filter((u: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(u));
        if (imageUrls.length) {
          await db.userPhoto.createMany({
            data: imageUrls.map((url: string) => ({ userId: user.id, url, category: 'wall' })),
          });
        }
      } catch { /* ignore if model not ready */ }
    }

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: error.errors });
    }
    console.error('[WALL] Erreur création post:', error);
    res.status(500).json({ error: 'Erreur lors de la création du post' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /wall/posts/:id — Supprimer un post
// ═══════════════════════════════════════════════════════════════
router.delete('/posts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const post = await db.wallPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post non trouvé' });

    // Seul l'auteur ou un admin peut supprimer
    if (post.authorId !== user.id && !user.isSuperAdmin && user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await db.wallPost.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[WALL] Erreur suppression post:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /wall/posts/:id/reactions — Réagir à un post (toggle)
// ═══════════════════════════════════════════════════════════════
router.post('/posts/:id/reactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { type } = reactionSchema.parse(req.body);

    // Vérifier que le post existe
    const post = await db.wallPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post non trouvé' });

    // Chercher réaction existante
    const existing = await db.wallReaction.findUnique({
      where: { postId_userId: { postId: id, userId: user.id } },
    });

    if (existing) {
      if (existing.type === type) {
        // Même type → supprimer (toggle off)
        await db.wallReaction.delete({ where: { id: existing.id } });
        await db.wallPost.update({ where: { id }, data: { likesCount: { decrement: 1 } } });
        return res.json({ action: 'removed', reaction: null });
      } else {
        // Type différent → update
        const updated = await db.wallReaction.update({
          where: { id: existing.id },
          data: { type },
        });
        return res.json({ action: 'updated', reaction: updated });
      }
    } else {
      // Nouvelle réaction
      const reaction = await db.wallReaction.create({
        data: { postId: id, userId: user.id, type },
      });
      await db.wallPost.update({ where: { id }, data: { likesCount: { increment: 1 } } });

      // Push notification à l'auteur du post (sauf si c'est soi-même)
      if (post.authorId && post.authorId !== user.id) {
        const reactor = await db.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true } });
        const reactorName = reactor ? `${reactor.firstName} ${reactor.lastName}`.trim() : 'Quelqu\'un';
        const emojiMap: Record<string, string> = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡' };
        sendPushToUser(post.authorId, {
          title: 'Zhiive — Réaction',
          body: `${reactorName} a réagi ${emojiMap[type] || '👍'} à votre publication`,
          icon: '/pwa-192x192.png',
          tag: `wall-reaction-${id}`,
          url: '/wall',
          type: 'notification',
        }).catch(() => {});
      }

      return res.json({ action: 'added', reaction });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Type de réaction invalide' });
    }
    console.error('[WALL] Erreur réaction:', error);
    res.status(500).json({ error: 'Erreur lors de la réaction' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /wall/posts/:id/comments — Tous les commentaires d'un post
// ═══════════════════════════════════════════════════════════════
router.get('/posts/:id/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comments = await db.wallComment.findMany({
      where: { postId: id, parentCommentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
            },
            organization: {
              select: { id: true, name: true, logoUrl: true },
            },
          },
        },
      },
    });

    res.json(comments);
  } catch (error) {
    console.error('[WALL] Erreur commentaires:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des commentaires' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /wall/posts/:id/comments — Commenter un post
// ═══════════════════════════════════════════════════════════════
router.post('/posts/:id/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const data = createCommentSchema.parse(req.body);

    // Vérifier que le post existe
    const post = await db.wallPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post non trouvé' });

    const comment = await db.wallComment.create({
      data: {
        postId: id,
        authorId: user.id,
        content: data.content,
        parentCommentId: data.parentCommentId,
        mediaUrl: data.mediaUrl,
        publishAsOrg: data.publishAsOrg && !!(user.organizationId || req.headers['x-organization-id']) ? true : false,
        organizationId: data.publishAsOrg ? (user.organizationId || req.headers['x-organization-id'] as string || null) : null,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    // Incrémenter le compteur
    await db.wallPost.update({ where: { id }, data: { commentsCount: { increment: 1 } } });

    // Push notification à l'auteur du post (sauf si c'est soi-même)
    if (post.authorId && post.authorId !== user.id) {
      const commenterName = comment.author ? `${comment.author.firstName} ${comment.author.lastName}`.trim() : 'Quelqu\'un';
      const preview = data.content.length > 60 ? data.content.substring(0, 60) + '...' : data.content;
      sendPushToUser(post.authorId, {
        title: 'Zhiive — Commentaire',
        body: `${commenterName} a commenté : "${preview}"`,
        icon: '/pwa-192x192.png',
        tag: `wall-comment-${id}`,
        url: '/wall',
        type: 'notification',
      }).catch(() => {});
    }

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Données invalides', details: error.errors });
    }
    console.error('[WALL] Erreur commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de la création du commentaire' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /wall/comments/:id — Supprimer un commentaire
// ═══════════════════════════════════════════════════════════════
router.delete('/comments/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const comment = await db.wallComment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ error: 'Commentaire non trouvé' });

    if (comment.authorId !== user.id && !user.isSuperAdmin && user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Décrémenter le compteur du post
    await db.wallPost.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });

    await db.wallComment.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[WALL] Erreur suppression commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /wall/posts/:id/share — Partager un post
// ═══════════════════════════════════════════════════════════════
router.post('/posts/:id/share', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { targetType = 'LINK' } = req.body;

    const post = await db.wallPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post non trouvé' });

    const allowedTypes = ['INTERNAL', 'FACEBOOK', 'LINKEDIN', 'WHATSAPP', 'EMAIL', 'LINK'];
    if (!allowedTypes.includes(targetType)) {
      return res.status(400).json({ error: 'Type de partage invalide' });
    }

    const share = await db.wallShare.create({
      data: { postId: id, userId: user.id, targetType },
    });

    await db.wallPost.update({ where: { id }, data: { sharesCount: { increment: 1 } } });

    res.status(201).json(share);
  } catch (error) {
    console.error('[WALL] Erreur partage:', error);
    res.status(500).json({ error: 'Erreur lors du partage' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /wall/stats — Statistiques du mur (admin)
// ═══════════════════════════════════════════════════════════════
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId || req.headers['x-organization-id'] as string;

    const [totalPosts, totalReactions, totalComments, totalShares] = await Promise.all([
      db.wallPost.count({ where: { organizationId: orgId } }),
      db.wallReaction.count({ where: { post: { organizationId: orgId } } }),
      db.wallComment.count({ where: { post: { organizationId: orgId } } }),
      db.wallShare.count({ where: { post: { organizationId: orgId } } }),
    ]);

    res.json({ totalPosts, totalReactions, totalComments, totalShares });
  } catch (error) {
    console.error('[WALL] Erreur stats:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des stats' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /wall/upload — Upload media files for wall posts
// Uses express-fileupload (global middleware in api-server-clean.ts)
// ═══════════════════════════════════════════════════════════════
router.post('/upload', authenticateToken, async (req: Request, res: Response) => {
  try {
    const uploadedFiles = req.files;
    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // express-fileupload can give single file or array under 'files' key
    const fileList = Array.isArray(uploadedFiles.files)
      ? uploadedFiles.files
      : uploadedFiles.files
        ? [uploadedFiles.files]
        : Object.values(uploadedFiles).flat();

    const allowedMime = /^(image|video)\//;
    const urls: string[] = [];

    for (const file of fileList) {
      if (!allowedMime.test(file.mimetype) && file.mimetype !== 'application/pdf') {
        continue; // skip non-allowed types
      }
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      const filename = `${Date.now()}_${safeName}`;
      const key = `wall/${filename}`;
      const url = await uploadExpressFile(file, key);
      urls.push(url);
    }

    if (urls.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier valide' });
    }

    res.json({ urls });
  } catch (error) {
    console.error('[WALL] Erreur upload:', error);
    res.status(500).json({ error: 'Erreur upload' });
  }
});

export default router;

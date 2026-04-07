import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/user/bookmarks
 * Récupère tous les bookmarks (pages favorites) de l'utilisateur
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const bookmarks = await db.userBookmark.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ bookmarks });
  } catch (error) {
    console.error('[UserBookmarks] ❌ Erreur GET /bookmarks:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des bookmarks' });
  }
});

/**
 * POST /api/user/bookmarks
 * Ajoute une page aux bookmarks
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { url, title, description, favicon, imageUrl } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url requis' });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title requis' });
    }

    // Extraire le domaine
    let domain: string | null = null;
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }

    const existing = await db.userBookmark.findUnique({
      where: { userId_url: { userId, url } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Cette page est déjà dans vos favoris', bookmark: existing });
    }

    const bookmark = await db.userBookmark.create({
      data: {
        userId,
        url,
        title: title.slice(0, 500),
        description: description?.slice(0, 1000) || null,
        favicon: favicon || null,
        imageUrl: imageUrl || null,
        domain,
      },
    });

    res.status(201).json({ bookmark });
  } catch (error) {
    console.error('[UserBookmarks] ❌ Erreur POST /bookmarks:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du bookmark' });
  }
});

/**
 * DELETE /api/user/bookmarks/:id
 * Supprime un bookmark par son id
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { id } = req.params;

    const bookmark = await db.userBookmark.findUnique({ where: { id } });
    if (!bookmark || bookmark.userId !== userId) {
      return res.status(404).json({ error: 'Bookmark non trouvé' });
    }

    await db.userBookmark.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[UserBookmarks] ❌ Erreur DELETE /bookmarks:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du bookmark' });
  }
});

/**
 * DELETE /api/user/bookmarks/by-url
 * Supprime un bookmark par son URL
 */
router.post('/remove-by-url', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url requis' });

    const bookmark = await db.userBookmark.findUnique({
      where: { userId_url: { userId, url } },
    });
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark non trouvé' });
    }

    await db.userBookmark.delete({ where: { id: bookmark.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[UserBookmarks] ❌ Erreur remove-by-url:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du bookmark' });
  }
});

/**
 * PUT /api/user/bookmarks/reorder
 * Réordonne les bookmarks (drag & drop)
 * Body: { orderedIds: string[] }
 */
router.put('/reorder', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds requis (tableau)' });
    }

    // Update sortOrder for each bookmark
    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        db.userBookmark.updateMany({
          where: { id, userId },
          data: { sortOrder: index },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[UserBookmarks] ❌ Erreur PUT /reorder:', error);
    res.status(500).json({ error: 'Erreur lors du réordonnement' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/user/favorites
 * Récupère tous les modules favoris de l'utilisateur pour son organisation actuelle
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIX: C'est .userId, pas .id
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }


    const favorites = await db.userFavoriteModule.findMany({
      where: {
        userId,
        organizationId,
      },
      select: {
        moduleKey: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const moduleKeys = favorites.map(f => f.moduleKey);

    res.json({ favorites: moduleKeys });
  } catch (error) {
    logger.error('[UserFavorites] ❌ Erreur GET /favorites:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des favoris',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

/**
 * POST /api/user/favorites
 * Ajoute un module aux favoris
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIX: C'est .userId, pas .id
    const organizationId = req.user?.organizationId;
    const { moduleKey } = req.body;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!moduleKey || typeof moduleKey !== 'string') {
      return res.status(400).json({ error: 'moduleKey requis et doit être une chaîne' });
    }


    // Vérifier si le favori existe déjà
    const existing = await db.userFavoriteModule.findUnique({
      where: {
        userId_organizationId_moduleKey: {
          userId,
          organizationId,
          moduleKey,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Ce module est déjà dans les favoris' });
    }

    // Créer le favori
    const favorite = await db.userFavoriteModule.create({
      data: {
        userId,
        organizationId,
        moduleKey,
      },
    });


    res.status(201).json({ favorite: favorite.moduleKey });
  } catch (error) {
    logger.error('[UserFavorites] ❌ Erreur POST /favorites:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'ajout du favori',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

/**
 * DELETE /api/user/favorites/:moduleKey
 * Retire un module des favoris
 */
router.delete('/:moduleKey', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIX: C'est .userId, pas .id
    const organizationId = req.user?.organizationId;
    const { moduleKey } = req.params;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!moduleKey) {
      return res.status(400).json({ error: 'moduleKey requis' });
    }


    // Supprimer le favori
    const deleted = await db.userFavoriteModule.deleteMany({
      where: {
        userId,
        organizationId,
        moduleKey,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Ce favori n\'existe pas' });
    }


    res.json({ message: 'Favori supprimé avec succès' });
  } catch (error) {
    logger.error('[UserFavorites] ❌ Erreur DELETE /favorites/:moduleKey:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du favori',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

export default router;

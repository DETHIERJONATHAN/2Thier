/**
 * User Preferences API Routes
 * Replaces ALL localStorage usage with DB persistence
 * 
 * GET    /api/user-preferences           → All preferences for current user
 * GET    /api/user-preferences/:key      → Single preference by key
 * PUT    /api/user-preferences/:key      → Upsert a preference
 * DELETE /api/user-preferences/:key      → Delete a preference
 * POST   /api/user-preferences/batch     → Upsert multiple preferences at once
 */
import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';
import { logger } from '../lib/logger';

const router = Router();

// ─── GET all preferences ───────────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const prefs = await db.userPreference.findMany({
      where: { userId },
      select: { key: true, value: true },
    });

    const result: Record<string, unknown> = {};
    for (const p of prefs) {
      result[p.key] = p.value;
    }

    res.json(result);
  } catch (error) {
    logger.error('[UserPreferences] ❌ GET /:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET single preference by key ──────────────────────────
router.get('/:key', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { key } = req.params;

    const pref = await db.userPreference.findUnique({
      where: { userId_key: { userId, key } },
      select: { value: true },
    });

    if (!pref) return res.json({ value: null });

    res.json({ value: pref.value });
  } catch (error) {
    logger.error('[UserPreferences] ❌ GET /:key:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT upsert a preference ───────────────────────────────
router.put('/:key', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'value requis' });
    }

    const pref = await db.userPreference.upsert({
      where: { userId_key: { userId, key } },
      update: { value },
      create: { userId, key, value },
    });

    res.json({ key: pref.key, value: pref.value });
  } catch (error) {
    logger.error('[UserPreferences] ❌ PUT /:key:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE a preference ───────────────────────────────────
router.delete('/:key', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { key } = req.params;

    await db.userPreference.deleteMany({ where: { userId, key } });

    res.json({ deleted: true });
  } catch (error) {
    logger.error('[UserPreferences] ❌ DELETE /:key:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST batch upsert ─────────────────────────────────────
router.post('/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences object requis' });
    }

    const entries = Object.entries(preferences);
    if (entries.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 préférences par batch' });
    }

    await db.$transaction(
      entries.map(([key, value]) =>
        db.userPreference.upsert({
          where: { userId_key: { userId, key } },
          update: { value: value as unknown },
          create: { userId, key, value: value as unknown },
        })
      )
    );

    res.json({ saved: entries.length });
  } catch (error) {
    logger.error('[UserPreferences] ❌ POST /batch:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

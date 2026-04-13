/**
 * notification-preferences.ts — API routes pour les préférences de notification par utilisateur
 * 
 * GET    /notification-preferences     → Récupérer mes préférences
 * PUT    /notification-preferences     → Mettre à jour mes préférences
 * 
 * Chaque Bee peut configurer ses canaux (Push, Email, In-App) par type d'événement.
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger';

const router = Router();

// ═══════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════

const updatePrefsSchema = z.object({
  // Push
  pushNewPost: z.boolean().optional(),
  pushComment: z.boolean().optional(),
  pushReaction: z.boolean().optional(),
  pushNewFollower: z.boolean().optional(),
  pushFriendRequest: z.boolean().optional(),
  pushMention: z.boolean().optional(),
  pushWhisper: z.boolean().optional(),
  pushWaxAlert: z.boolean().optional(),
  pushBusinessEvent: z.boolean().optional(),
  pushCalendarReminder: z.boolean().optional(),
  // Email
  emailNewPost: z.boolean().optional(),
  emailComment: z.boolean().optional(),
  emailReaction: z.boolean().optional(),
  emailNewFollower: z.boolean().optional(),
  emailFriendRequest: z.boolean().optional(),
  emailMention: z.boolean().optional(),
  emailWhisper: z.boolean().optional(),
  emailWaxAlert: z.boolean().optional(),
  emailBusinessEvent: z.boolean().optional(),
  emailCalendarReminder: z.boolean().optional(),
  emailDigestFrequency: z.enum(['none', 'instant', 'daily', 'weekly']).optional(),
  // In-App
  inAppNewPost: z.boolean().optional(),
  inAppComment: z.boolean().optional(),
  inAppReaction: z.boolean().optional(),
  inAppNewFollower: z.boolean().optional(),
  inAppFriendRequest: z.boolean().optional(),
  inAppMention: z.boolean().optional(),
  inAppWhisper: z.boolean().optional(),
  inAppWaxAlert: z.boolean().optional(),
  inAppBusinessEvent: z.boolean().optional(),
  inAppCalendarReminder: z.boolean().optional(),
  // Global
  doNotDisturb: z.boolean().optional(),
  doNotDisturbStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  doNotDisturbEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  mutedColonyIds: z.array(z.string()).optional(),
  mutedUserIds: z.array(z.string()).optional(),
});

// ═══════════════════════════════════════════════════════
// GET /notification-preferences — Mes préférences
// ═══════════════════════════════════════════════════════

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    let prefs = await db.userNotificationPreference.findUnique({
      where: { userId },
    });

    // Auto-create with defaults if not existing
    if (!prefs) {
      prefs = await db.userNotificationPreference.create({
        data: {
          id: randomUUID(),
          userId,
        },
      });
    }

    res.json(prefs);
  } catch (error) {
    logger.error('[NOTIF-PREFS] Error fetching:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// PUT /notification-preferences — Mise à jour
// ═══════════════════════════════════════════════════════

router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const parsed = updatePrefsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
    }

    const prefs = await db.userNotificationPreference.upsert({
      where: { userId },
      update: { ...parsed.data, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        userId,
        ...parsed.data,
      },
    });

    res.json(prefs);
  } catch (error) {
    logger.error('[NOTIF-PREFS] Error updating:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import webPush from 'web-push';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@2thier.be';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('[PUSH] ⚠️ VAPID keys manquantes — notifications push désactivées');
}

// ═══════════════════════════════════════════════════════════════
// GET /push/vapid-key — Return public VAPID key for browser subscription
// ═══════════════════════════════════════════════════════════════
router.get('/vapid-key', (_req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ═══════════════════════════════════════════════════════════════
// POST /push/subscribe — Save push subscription for current user
// ═══════════════════════════════════════════════════════════════
router.post('/subscribe', authenticateToken as any, async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Subscription invalide' }); return;
  }

  try {
    // Upsert: update if endpoint exists, create otherwise
    await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        isActive: true,
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        isActive: true,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[PUSH] Error saving subscription:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /push/unsubscribe — Remove push subscription
// ═══════════════════════════════════════════════════════════════
router.delete('/unsubscribe', authenticateToken as any, async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user?.id) { res.status(401).json({ error: 'Non authentifié' }); return; }

  const { endpoint } = req.body;
  if (!endpoint) { res.status(400).json({ error: 'Endpoint requis' }); return; }

  try {
    await db.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[PUSH] Error removing subscription:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════
// UTILITY: Send push notification to a specific user
// ═══════════════════════════════════════════════════════════════
export async function sendPushToUser(userId: string, payload: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  callId?: string;
  type?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string }>;
}): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId, isActive: true },
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      // If subscription expired/invalid, deactivate it
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        }).catch(() => {});
      }
      console.warn(`[PUSH] Failed to send to ${sub.endpoint.slice(0, 50)}...`, err.statusCode || err.message);
    }
  }

  return sent;
}

export default router;

// 🔌 DEVIS1MINUTE - État des intégrations (agrégateur)
import { Router } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { db, Prisma } from '../lib/database';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { logger } from '../lib/logger';

const router = Router();
const prisma = db;

const rl = rateLimit({ windowMs: 60 * 1000, max: 60 });

router.use(authMiddleware);
router.use(rl);

// 📊 GET /api/integrations/status - Synthèse des connecteurs/org
router.get('/status', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const [google, telnyx, adPlatforms] = await Promise.all([
      prisma.googleWorkspaceConfig.findUnique({ where: { organizationId } }),
      prisma.telnyxConnection.findMany({ where: { organizationId } }),
      prisma.adPlatformIntegration.findMany({ where: { organizationId } })
    ]);

    const status = {
      google: {
        enabled: !!google?.enabled || !!google?.isActive,
        gmail: !!google?.gmailEnabled,
        calendar: !!google?.calendarEnabled,
        drive: !!google?.driveEnabled,
        meet: !!google?.meetEnabled,
        sheets: !!google?.sheetsEnabled,
        voice: !!google?.voiceEnabled,
        lastSync: google?.updatedAt ?? null
      },
      telnyx: {
        connections: telnyx.map(t => ({ id: t.id, name: t.name, status: t.status, type: t.type })),
        active: telnyx.some(t => t.status === 'active')
      },
  adPlatforms: adPlatforms.map(p => ({ id: p.id, platform: p.platform, name: p.name, status: p.status, lastSync: p.lastSync })),
    };

    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('❌ [INTEGRATIONS] Erreur status:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du statut des intégrations' });
  }
});

// 🔌 POST /api/integrations/ad-platform/connect - Connecter une plateforme Ads (Google/Meta)
router.post('/ad-platform/connect', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const { platform, name, credentials, config } = req.body as {
      platform: string;
      name?: string;
      credentials?: Prisma.InputJsonValue;
      config?: Prisma.InputJsonValue;
    };
    if (!platform) return res.status(400).json({ success: false, message: 'Paramètre platform requis' });

    const existing = await prisma.adPlatformIntegration.findFirst({ where: { organizationId, platform } });
    let rec;
    if (existing) {
      rec = await prisma.adPlatformIntegration.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          credentials: credentials ?? (existing.credentials as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          config: config ?? (existing.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          status: 'connected',
          active: true,
          updatedAt: new Date()
        }
      });
    } else {
      rec = await prisma.adPlatformIntegration.create({
        data: {
          id: randomUUID(),
          organizationId,
          platform,
          name: name || platform,
          credentials: credentials ?? Prisma.JsonNull,
          config: config ?? Prisma.JsonNull,
          status: 'connected',
          active: true,
          updatedAt: new Date()
        }
      });
    }
    res.json({ success: true, data: { id: rec.id } });
  } catch (error) {
    logger.error('❌ [INTEGRATIONS] Erreur connect:', error);
    res.status(500).json({ success: false, message: 'Erreur connexion plateforme' });
  }
});

// 🔌 POST /api/integrations/ad-platform/disconnect - Déconnecter une plateforme Ads
router.post('/ad-platform/disconnect', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    const { platform } = req.body as { platform: string };
    if (!platform) return res.status(400).json({ success: false, message: 'Paramètre platform requis' });

    const existing = await prisma.adPlatformIntegration.findFirst({ where: { organizationId, platform } });
    if (!existing) return res.status(404).json({ success: false, message: 'Intégration non trouvée' });

    await prisma.adPlatformIntegration.update({
      where: { id: existing.id },
      data: { status: 'disconnected', active: false, updatedAt: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('❌ [INTEGRATIONS] Erreur disconnect:', error);
    res.status(500).json({ success: false, message: 'Erreur déconnexion plateforme' });
  }
});

// 🔄 POST /api/integrations/ad-platform/sync - Marquer une sync (placeholder, sans appels externes)
router.post('/ad-platform/sync', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    const { platform } = req.body as { platform: string };
    if (!platform) return res.status(400).json({ success: false, message: 'Paramètre platform requis' });

    const existing = await prisma.adPlatformIntegration.findFirst({ where: { organizationId, platform } });
    if (!existing) return res.status(404).json({ success: false, message: 'Intégration non trouvée' });

    const rec = await prisma.adPlatformIntegration.update({ where: { id: existing.id }, data: { lastSync: new Date(), updatedAt: new Date() } });
    res.json({ success: true, data: { id: rec.id, lastSync: rec.lastSync } });
  } catch (error) {
    logger.error('❌ [INTEGRATIONS] Erreur sync:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la synchronisation' });
  }
});

export default router;

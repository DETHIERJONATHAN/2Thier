// 🎯 DEVIS1MINUTE - Routes Lead Generation
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

// 🔒 RATE LIMITING
const leadGenRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requêtes par minute
  message: { success: false, message: 'Trop de requêtes lead generation' }
});

router.use(authMiddleware);
router.use(leadGenRateLimit);

// 📊 GET /api/lead-generation/campaigns - Liste des campagnes
// Ici, nous mappions le concept de "campagne" sur LeadSource (modèle existant)
router.get('/campaigns', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    }

    const sources = await prisma.leadSource.findMany({
      where: { organizationId },
      include: {
        _count: { select: { Lead: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Adapter aux besoins du front (structure Campaign)
    const campaigns = await Promise.all(
      sources.map(async (s) => {
        const completedLeads = await prisma.lead.count({
          where: { organizationId, sourceId: s.id, status: 'completed' }
        });
        const leadsGenerated = s._count?.Lead ?? 0;
        const conversionRate = leadsGenerated > 0 ? Math.round((completedLeads / leadsGenerated) * 100) : 0;
        return {
          id: s.id,
          name: s.name,
          description: s.description ?? '',
          category: 'source',
          targetPostalCodes: [],
          budget: 0,
          spentBudget: 0,
          costPerLead: 0,
          status: s.isActive ? 'active' : 'paused',
          utmSource: '',
          utmMedium: '',
          utmCampaign: '',
          leadsGenerated,
          leadsPublished: 0,
          conversionRate,
          qualityScore: 0,
          createdAt: (s.createdAt as unknown as Date)?.toISOString?.() ?? new Date().toISOString(),
          startDate: undefined,
          endDate: undefined,
          isAutomatic: false,
          targetAudience: [],
          landingPageUrl: undefined
        };
      })
    );

    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur récupération campagnes (LeadSource):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des campagnes' });
  }
});

// 🎯 POST /api/lead-generation/campaigns - Créer une campagne
router.post('/campaigns', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const { name, description, isActive = true } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom de campagne requis' });

    const created = await prisma.leadSource.create({
      data: { organizationId, name, description, isActive: Boolean(isActive) }
    });

    res.json({ success: true, data: created, message: 'Campagne créée avec succès' });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur création campagne (LeadSource):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la campagne' });
  }
});

// 📈 GET /api/lead-generation/stats - Statistiques globales
router.get('/stats', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Par défaut, les stats D1M ne comptent que les leads d'origine D1M
    const originParam = String((req.query as any)?.origin ?? 'd1m'); // eslint-disable-line @typescript-eslint/no-explicit-any
    const originWhere = originParam === 'd1m'
      ? {
          OR: [
            { NOT: { sourceId: null } }, // lié à une LeadSource (campagne)
            { source: { in: ['public-form', 'd1m', 'devis1minute', 'landing'] } }
          ]
        }
      : undefined;

    const [totalCampaigns, activeCampaigns, totalLeads, thisMonthLeads] = await Promise.all([
      prisma.leadSource.count({ where: { organizationId } }),
      prisma.leadSource.count({ where: { organizationId, isActive: true } }),
      prisma.lead.count({ where: { organizationId, ...(originWhere || {}) } }),
      prisma.lead.count({ where: { organizationId, createdAt: { gte: monthStart }, ...(originWhere || {}) } })
    ]);

    res.json({ success: true, data: { totalCampaigns, activeCampaigns, totalLeads, thisMonthLeads } });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur stats (LeadSource/Lead):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
  }
});

// 🎯 PUT /api/lead-generation/campaigns/:id - Modifier campagne
router.put('/campaigns/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    // S'assurer que la source appartient à l'org
    const existing = await prisma.leadSource.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Campagne non trouvée' });

    const { name, description, isActive } = req.body;
    const updated = await prisma.leadSource.update({ where: { id }, data: { name, description, isActive } });
    res.json({ success: true, data: updated, message: 'Campagne modifiée avec succès' });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur modification campagne (LeadSource):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la modification de la campagne' });
  }
});

// 🗑️ DELETE /api/lead-generation/campaigns/:id - Supprimer campagne
router.delete('/campaigns/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const deleted = await prisma.leadSource.deleteMany({ where: { id, organizationId } });
    if (deleted.count === 0) return res.status(404).json({ success: false, message: 'Campagne non trouvée' });
    res.json({ success: true, message: 'Campagne supprimée avec succès' });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur suppression campagne (LeadSource):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la campagne' });
  }
});

// PATCH /api/lead-generation/campaigns/:id/status - changer statut (active/paused)
router.patch('/campaigns/:id/status', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: 'active' | 'paused' };
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    if (!status) return res.status(400).json({ success: false, message: 'Statut requis' });

    const target = await prisma.leadSource.findFirst({ where: { id, organizationId } });
    if (!target) return res.status(404).json({ success: false, message: 'Campagne non trouvée' });

    const updated = await prisma.leadSource.update({ where: { id }, data: { isActive: status === 'active' } });
    res.json({ success: true, data: updated, message: 'Statut mis à jour' });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur MAJ statut (LeadSource):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut' });
  }
});

// POST /api/lead-generation/campaigns/:id/duplicate - dupliquer une "campagne" (LeadSource)
router.post('/campaigns/:id/duplicate', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const source = await prisma.leadSource.findFirst({ where: { id, organizationId } });
    if (!source) return res.status(404).json({ success: false, message: 'Campagne non trouvée' });

    const copy = await prisma.leadSource.create({
      data: {
        organizationId,
        name: `${source.name} (Copie)`,
        description: source.description,
        color: source.color,
        icon: source.icon,
        isActive: false
      }
    });
    res.json({ success: true, data: copy, message: 'Campagne dupliquée avec succès' });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur duplication campagne (LeadSource):', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la duplication de la campagne' });
  }
});

// 📈 GET /api/lead-generation/stats/timeseries?days=30
router.get('/stats/timeseries', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    const days = Math.min(365, Math.max(1, parseInt(String((req.query as any).days ?? '30'), 10))); // eslint-disable-line @typescript-eslint/no-explicit-any
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    // Par défaut, séries D1M uniquement (mêmes critères que /stats)
    const originParam = String((req.query as any)?.origin ?? 'd1m'); // eslint-disable-line @typescript-eslint/no-explicit-any
    const originWhere = originParam === 'd1m'
      ? {
          OR: [
            { NOT: { sourceId: null } },
            { source: { in: ['public-form', 'd1m', 'devis1minute', 'landing'] } }
          ]
        }
      : undefined;

    const leads = await prisma.lead.findMany({
      where: { organizationId, createdAt: { gte: start }, ...(originWhere || {}) },
      select: { createdAt: true, status: true }
    });

    const byDay = new Map<string, { created: number; completed: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { created: 0, completed: 0 });
    }
    for (const l of leads) {
      const key = new Date(l.createdAt as unknown as Date).toISOString().slice(0, 10);
      const rec = byDay.get(key);
      if (rec) {
        rec.created++;
        if (l.status === 'completed') rec.completed++;
      }
    }
    const series = Array.from(byDay.entries()).map(([date, v]) => ({ date, created: v.created, completed: v.completed }));
    res.json({ success: true, data: { start: start.toISOString(), days, series } });
  } catch (error) {
    console.error('❌ [LEAD-GEN] Erreur timeseries:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des séries temporelles' });
  }
});

export default router;

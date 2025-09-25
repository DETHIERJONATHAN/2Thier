// 🎯 DEVIS1MINUTE - Routes Dispatch (règles d'orientation)
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();
const prisma = new PrismaClient();

// 🔒 RATE LIMITING
const dispatchRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Trop de requêtes dispatch' }
});

router.use(authMiddleware);
router.use(dispatchRateLimit);

// 📋 GET /api/dispatch/rules - Liste des règles (AutomationRule)
router.get('/rules', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const rules = await prisma.automationRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('❌ [DISPATCH] Erreur liste:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des règles' });
  }
});

// ➕ POST /api/dispatch/rules - Créer une règle
router.post('/rules', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const { event, action, params, active = true } = req.body as { event?: string; action?: string; params?: unknown; active?: boolean };
    if (!event || !action) return res.status(400).json({ success: false, message: 'event et action sont requis' });

    const created = await prisma.automationRule.create({ data: { organizationId, event, action, params: params ?? {}, active: !!active } });
    res.json({ success: true, data: created, message: 'Règle créée' });
  } catch (error) {
    console.error('❌ [DISPATCH] Erreur création:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la règle' });
  }
});

// ✏️ PUT /api/dispatch/rules/:id - Modifier une règle
router.put('/rules/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const existing = await prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Règle non trouvée' });

    const { event, action, params, active } = req.body as { event?: string; action?: string; params?: unknown; active?: boolean };
    const updated = await prisma.automationRule.update({ where: { id }, data: { event, action, params, active } });
    res.json({ success: true, data: updated, message: 'Règle mise à jour' });
  } catch (error) {
    console.error('❌ [DISPATCH] Erreur mise à jour:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la règle' });
  }
});

// 🗑️ DELETE /api/dispatch/rules/:id - Supprimer une règle
router.delete('/rules/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });

    const deleted = await prisma.automationRule.deleteMany({ where: { id, organizationId } });
    if (!deleted.count) return res.status(404).json({ success: false, message: 'Règle non trouvée' });
    res.json({ success: true, message: 'Règle supprimée' });
  } catch (error) {
    console.error('❌ [DISPATCH] Erreur suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la règle' });
  }
});

// 🧪 POST /api/dispatch/simulate - Simuler une orientation simple
router.post('/simulate', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organization ID manquant' });
    const { lead } = req.body as { lead?: Record<string, unknown> };
    if (!lead) return res.status(400).json({ success: false, message: 'lead requis' });

    const rules = await prisma.automationRule.findMany({ where: { organizationId, active: true }, orderBy: { createdAt: 'asc' } });

    // Matching naïf: si params.conditions est un objet { key: value }, on vérifie l'égalité
    const matches: Array<{ ruleId: string; action: string; score: number }> = [];
    for (const r of rules) {
      const params = (r.params as unknown) || {};
      const conds = params.conditions && typeof params.conditions === 'object' ? params.conditions as Record<string, unknown> : {};
      let score = 0;
      let total = 0;
      for (const [k, v] of Object.entries(conds)) {
        total++;
        if ((lead as Record<string, unknown>)[k] === v) score++;
      }
      const ratio = total > 0 ? score / total : 0;
      if (total === 0 || ratio >= 0.75) {
        matches.push({ ruleId: r.id, action: r.action, score: Math.round(ratio * 100) });
      }
    }

    res.json({ success: true, data: { matches } });
  } catch (error) {
    console.error('❌ [DISPATCH] Erreur simulate:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la simulation' });
  }
});

export default router;

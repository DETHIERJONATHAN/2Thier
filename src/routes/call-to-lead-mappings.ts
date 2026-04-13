import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest, requireRole } from '../middlewares/auth.js';
import { db } from '../lib/database.js';
import { logger } from '../lib/logger';

const router = Router();
router.use(authMiddleware);

// GET /api/call-to-lead-mappings — liste des mappings de l'organisation
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user!;
    const mappings = await db.callToLeadMapping.findMany({
      where: { organizationId },
      include: { CallStatus: true, LeadStatus: true },
      orderBy: { priority: 'asc' },
    });
    res.json({ success: true, data: mappings });
  } catch (error) {
    logger.error('❌ [CallToLeadMappings] Erreur GET:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/call-to-lead-mappings — créer un mapping
router.post('/', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user!;
    const { callStatusId, leadStatusId, condition, priority, description } = req.body;
    if (!callStatusId || !leadStatusId) {
      return res.status(400).json({ success: false, message: 'callStatusId et leadStatusId sont requis' });
    }
    const mapping = await db.callToLeadMapping.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        callStatusId,
        leadStatusId,
        condition: condition ?? 'automatic',
        priority: priority ?? 1,
        description: description ?? null,
        updatedAt: new Date(),
      },
    });
    res.status(201).json({ success: true, data: mapping });
  } catch (error) {
    logger.error('❌ [CallToLeadMappings] Erreur POST:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/call-to-lead-mappings/:id — modifier un mapping
router.put('/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const existing = await db.callToLeadMapping.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Mapping introuvable' });
    const { callStatusId, leadStatusId, condition, priority, description, isActive } = req.body;
    const updated = await db.callToLeadMapping.update({
      where: { id },
      data: {
        ...(callStatusId !== undefined && { callStatusId }),
        ...(leadStatusId !== undefined && { leadStatusId }),
        ...(condition !== undefined && { condition }),
        ...(priority !== undefined && { priority }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('❌ [CallToLeadMappings] Erreur PUT:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/call-to-lead-mappings/:id — supprimer un mapping
router.delete('/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const existing = await db.callToLeadMapping.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Mapping introuvable' });
    await db.callToLeadMapping.delete({ where: { id } });
    res.json({ success: true, message: 'Mapping supprimé' });
  } catch (error) {
    logger.error('❌ [CallToLeadMappings] Erreur DELETE:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;

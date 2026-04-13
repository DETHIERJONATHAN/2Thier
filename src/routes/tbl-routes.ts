import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { db } from '../lib/database';
import { logger } from '../lib/logger';

const router = express.Router();

// POST /api/tbl/devis - Sauvegarder un devis TBL
router.post('/devis', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const {
      clientId,
      treeId,
      organizationId,
      userId,
      projectName,
      notes,
      isDraft,
      formData,
      metadata
    } = req.body;

    logger.info('💾 [TBL API] Sauvegarde devis TBL:', {
      clientId,
      treeId,
      projectName,
      isDraft,
      fieldsCount: Object.keys(formData || {}).length
    });

    // Vérification des données requises
    if (!clientId || !treeId || !organizationId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Données manquantes: clientId, treeId, organizationId et userId sont requis'
      });
    }

    // Vérifier que l'utilisateur a accès à l'organisation
    if (req.user?.organizationId && req.user.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé à cette organisation'
      });
    }

    // Créer ou mettre à jour le devis TBL
    const devisData = {
      clientId,
      treeId,
      organizationId,
      userId,
      projectName: projectName || `Projet TBL ${new Date().toLocaleDateString()}`,
      notes: notes || '',
      isDraft: isDraft || false,
      formData: formData || {},
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        version: '1.0'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Sauvegarder comme TreeBranchLeafSubmission
    const submission = await db.treeBranchLeafSubmission.upsert({
      where: { id: `tbl_${treeId}_${clientId}_${organizationId}` },
      update: {
        status: isDraft ? 'draft' : 'completed',
        summary: devisData as unknown,
        exportData: formData as unknown,
        updatedAt: new Date(),
        completedAt: isDraft ? null : new Date(),
      },
      create: {
        id: `tbl_${treeId}_${clientId}_${organizationId}`,
        treeId,
        userId,
        leadId: clientId,
        organizationId,
        status: isDraft ? 'draft' : 'completed',
        summary: devisData as unknown,
        exportData: formData as unknown,
        updatedAt: new Date(),
        completedAt: isDraft ? null : new Date(),
      },
    });
    logger.info('✅ [TBL API] Devis sauvegardé avec succès:', submission.id);

    res.json({
      success: true,
      devisId: submission.id,
      message: 'Devis TBL sauvegardé avec succès',
      data: devisData,
    });

  } catch (error) {
    logger.error('❌ [TBL API] Erreur sauvegarde devis:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la sauvegarde'
    });
  }
});

// GET /api/tbl/devis/client/:clientId - Récupérer les devis d'un client
router.get('/devis/client/:clientId', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { organizationId, role } = req.user || {};

    logger.info('📖 [TBL API] Récupération devis client:', clientId);

    if (!organizationId && role !== 'super_admin') {
      return res.status(403).json({
        error: 'Organisation non renseignée pour l’utilisateur',
        success: false
      });
    }

    const submissions = await db.treeBranchLeafSubmission.findMany({
      where: { leadId: clientId, ...(role !== 'super_admin' ? { organizationId } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(submissions.map(s => ({ devisId: s.id, ...((s.summary as Record<string, unknown>) ?? {}), formData: s.exportData, status: s.status, updatedAt: s.updatedAt })));

  } catch (error) {
    logger.error('❌ [TBL API] Erreur récupération devis client:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la récupération des devis'
    });
  }
});

// GET /api/tbl/devis/:devisId - Charger un devis spécifique
router.get('/devis/:devisId', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { devisId } = req.params;
    const { organizationId, role } = req.user || {};

    logger.info('📖 [TBL API] Chargement devis:', devisId);

    if (!organizationId && role !== 'super_admin') {
      return res.status(403).json({
        error: 'Organisation non renseignée pour l’utilisateur',
        success: false
      });
    }

    const submission = await db.treeBranchLeafSubmission.findFirst({
      where: { id: devisId, ...(role !== 'super_admin' ? { organizationId } : {}) },
    });
    if (!submission) return res.status(404).json({ error: 'Devis introuvable' });
    res.json({ devisId: submission.id, formData: submission.exportData ?? null, status: submission.status, summary: submission.summary });

  } catch (error) {
    logger.error('❌ [TBL API] Erreur chargement devis:', error);
    res.status(500).json({
      error: 'Erreur serveur lors du chargement du devis'
    });
  }
});

// GET /api/clients/:clientId/access-check - Vérifier l'accès à un client
router.get('/clients/:clientId/access-check', authenticateToken, requireRole(['user', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { organizationId, role } = req.user || {};

    logger.info('🔒 [TBL API] Vérification accès client:', clientId);

    // SuperAdmin a accès à tout
    if (role === 'super_admin') {
      return res.json({ hasAccess: true });
    }

    if (!organizationId) {
      return res.status(403).json({
        hasAccess: false,
        error: 'Organisation non renseignée pour l’utilisateur'
      });
    }

    const lead = await db.lead.findFirst({ where: { id: clientId, organizationId }, select: { id: true } });
    res.json({ hasAccess: !!lead });

  } catch (error) {
    logger.error('❌ [TBL API] Erreur vérification accès client:', error);
    res.status(500).json({
      hasAccess: false,
      error: 'Erreur serveur lors de la vérification d\'accès'
    });
  }
});

export default router;

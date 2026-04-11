import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { requireChantierAction } from '../middleware/chantierPermission';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/crypto.js';
import { sendPushToUser } from './push';
import { createBusinessAutoPost } from '../services/business-auto-post';

/** Crée une notification en DB ET envoie un push */
async function createChantierNotifWithPush(args: any) {
  const notif = await db.notification.create(args);
  const d = args.data;
  if (d?.userId) {
    const innerData = d.data || {};
    const message = innerData.message || innerData.eventDescription || d.type;
    sendPushToUser(d.userId, {
      title: 'Zhiive — Chantier',
      body: String(message).replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/gu, '').trim(),
      icon: '/pwa-192x192.png',
      tag: String(d.type || 'chantier'),
      url: d.actionUrl || '/chantiers',
      type: 'notification',
    }).catch(() => {});
  }
  return notif;
}

const router = Router();

// ═══════════════════════════════════════════════════════
// TRANSITIONS — Règles configurables entre colonnes Kanban
// ═══════════════════════════════════════════════════════

const transitionSchema = z.object({
  fromStatusId: z.string().min(1),
  toStatusId: z.string().min(1),
  triggerType: z.enum(['MANUAL', 'AUTO_INVOICE_PAID', 'AUTO_MATERIAL_RECEIVED', 'AUTO_VISIT_VALIDATED', 'AUTO_CLIENT_SIGNED', 'AUTO_DATE_REACHED']).default('MANUAL'),
  requiredConditions: z.any().optional(),
  allowedRoles: z.array(z.string()).optional(),
  notifyRoles: z.array(z.string()).optional(),
  sendEmail: z.boolean().default(false),
  emailTemplateId: z.string().optional(),
  label: z.string().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

/**
 * GET /api/chantier-workflow/transitions
 * Liste toutes les transitions configurées pour l'organisation
 */
router.get('/transitions', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const transitions = await db.chantierStatusTransition.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
      include: {
        FromStatus: { select: { id: true, name: true, color: true } },
        ToStatus: { select: { id: true, name: true, color: true } },
      }
    });

    res.json({ success: true, data: transitions });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /transitions:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/transitions
 * Crée une nouvelle règle de transition
 */
router.post('/transitions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const validation = transitionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;

    const transition = await db.chantierStatusTransition.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        fromStatusId: data.fromStatusId,
        toStatusId: data.toStatusId,
        triggerType: data.triggerType,
        requiredConditions: data.requiredConditions || undefined,
        allowedRoles: data.allowedRoles || undefined,
        notifyRoles: data.notifyRoles || undefined,
        sendEmail: data.sendEmail,
        emailTemplateId: data.emailTemplateId,
        label: data.label,
        isActive: data.isActive,
        order: data.order,
        updatedAt: new Date(),
      },
      include: {
        FromStatus: { select: { id: true, name: true, color: true } },
        ToStatus: { select: { id: true, name: true, color: true } },
      }
    });

    res.status(201).json({ success: true, data: transition });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /transitions:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * PUT /api/chantier-workflow/transitions/:id
 * Met à jour une règle de transition
 */
router.put('/transitions/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierStatusTransition.findFirst({
      where: { id, organizationId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transition non trouvée' });
    }

    const validation = transitionSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;
    const transition = await db.chantierStatusTransition.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        FromStatus: { select: { id: true, name: true, color: true } },
        ToStatus: { select: { id: true, name: true, color: true } },
      }
    });

    res.json({ success: true, data: transition });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur PUT /transitions/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * DELETE /api/chantier-workflow/transitions/:id
 * Supprime une règle de transition
 */
router.delete('/transitions/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierStatusTransition.findFirst({
      where: { id, organizationId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transition non trouvée' });
    }

    await db.chantierStatusTransition.delete({ where: { id } });
    res.json({ success: true, message: 'Transition supprimée' });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur DELETE /transitions/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * GET /api/chantier-workflow/transitions/allowed-targets
 * Retourne les statuts cibles autorisés pour l'utilisateur depuis un statut donné
 * Utilisé par le Kanban pour les indicateurs visuels de drag-drop
 */
router.get('/transitions/allowed-targets', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { fromStatusId } = req.query;
    const user = (req as any).user;
    const userRole = user?.role || 'commercial';
    const isSuperAdmin = user?.isSuperAdmin === true;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'organizationId requis' });
    }

    // Récupérer tous les statuts
    const allStatuses = await db.chantierStatus.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { order: 'asc' }
    });

    // SuperAdmin peut tout faire
    if (isSuperAdmin) {
      const allMap: Record<string, string[]> = {};
      for (const s of allStatuses) {
        allMap[s.id] = allStatuses.filter(t => t.id !== s.id).map(t => t.id);
      }
      return res.json({ success: true, data: allMap });
    }

    // Récupérer toutes les transitions actives
    const transitions = await db.chantierStatusTransition.findMany({
      where: { organizationId, isActive: true, triggerType: 'MANUAL' },
      select: { fromStatusId: true, toStatusId: true, allowedRoles: true }
    });

    // Si aucune transition configurée → tout est permis (backward compatible)
    if (transitions.length === 0) {
      const allMap: Record<string, string[]> = {};
      for (const s of allStatuses) {
        allMap[s.id] = allStatuses.filter(t => t.id !== s.id).map(t => t.id);
      }
      return res.json({ success: true, data: allMap });
    }

    // Construire la map des transitions autorisées par fromStatusId
    const allowedMap: Record<string, string[]> = {};
    for (const s of allStatuses) {
      allowedMap[s.id] = [];
    }

    for (const t of transitions) {
      const roles = t.allowedRoles as string[] | null;
      const isAllowed = !roles || roles.length === 0 || roles.includes(userRole);
      if (isAllowed && allowedMap[t.fromStatusId]) {
        if (!allowedMap[t.fromStatusId].includes(t.toStatusId)) {
          allowedMap[t.fromStatusId].push(t.toStatusId);
        }
      }
    }

    // Si fromStatusId spécifié, ne retourner que celui-là
    if (fromStatusId && typeof fromStatusId === 'string') {
      return res.json({ success: true, data: { [fromStatusId]: allowedMap[fromStatusId] || [] } });
    }

    res.json({ success: true, data: allowedMap });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /transitions/allowed-targets:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/transitions/check
 * Vérifie si une transition est autorisée pour le rôle de l'utilisateur
 */
router.post('/transitions/check', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { fromStatusId, toStatusId } = req.body;
    const user = (req as any).user;
    const userRole = user?.role || 'commercial';
    const isSuperAdmin = user?.isSuperAdmin === true;

    if (!organizationId || !fromStatusId || !toStatusId) {
      return res.status(400).json({ success: false, message: 'fromStatusId et toStatusId requis' });
    }

    // SuperAdmin peut toujours tout faire
    if (isSuperAdmin) {
      return res.json({ success: true, data: { allowed: true, reason: 'Super Admin' } });
    }

    // Chercher toutes les transitions actives depuis ce statut vers le statut cible
    const transitions = await db.chantierStatusTransition.findMany({
      where: {
        organizationId,
        fromStatusId,
        toStatusId,
        isActive: true,
      }
    });

    // Si aucune transition configurée → on autorise par défaut (backward compatible)
    if (transitions.length === 0) {
      return res.json({ success: true, data: { allowed: true, reason: 'Aucune restriction configurée' } });
    }

    // Vérifier si au moins une transition autorise ce rôle
    const allowed = transitions.some(t => {
      const roles = t.allowedRoles as string[] | null;
      if (!roles || roles.length === 0) return true; // pas de restriction de rôles
      return roles.includes(userRole);
    });

    res.json({
      success: true,
      data: {
        allowed,
        reason: allowed ? 'Transition autorisée' : `Rôle "${userRole}" non autorisé pour cette transition`,
        transitions: transitions.map(t => ({
          id: t.id,
          triggerType: t.triggerType,
          allowedRoles: t.allowedRoles,
          label: t.label,
        }))
      }
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /transitions/check:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// INVOICE TEMPLATES — Templates de factures par organisation
// ═══════════════════════════════════════════════════════

const invoiceTemplateSchema = z.object({
  statusId: z.string().nullable().optional(),
  type: z.enum(['ACOMPTE', 'MATERIEL', 'FIN_CHANTIER', 'RECEPTION', 'CUSTOM']).default('CUSTOM'),
  label: z.string().min(1, 'Le label est requis'),
  percentage: z.number().min(0).max(100).nullable().optional(),
  fixedAmount: z.number().min(0).nullable().optional(),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

/**
 * GET /api/chantier-workflow/invoice-templates
 * Liste tous les templates de factures pour l'organisation
 */
router.get('/invoice-templates', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const templates = await db.chantierInvoiceTemplate.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
      include: {
        Status: { select: { id: true, name: true, color: true } },
      }
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /invoice-templates:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/invoice-templates
 * Crée un nouveau template de facture
 */
router.post('/invoice-templates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const validation = invoiceTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;
    const template = await db.chantierInvoiceTemplate.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        statusId: data.statusId || null,
        type: data.type,
        label: data.label,
        percentage: data.percentage ?? null,
        fixedAmount: data.fixedAmount ?? null,
        isRequired: data.isRequired,
        isActive: data.isActive,
        order: data.order,
        updatedAt: new Date(),
      },
      include: {
        Status: { select: { id: true, name: true, color: true } },
      }
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /invoice-templates:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * PUT /api/chantier-workflow/invoice-templates/:id
 * Met à jour un template de facture
 */
router.put('/invoice-templates/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierInvoiceTemplate.findFirst({
      where: { id, organizationId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    const validation = invoiceTemplateSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const template = await db.chantierInvoiceTemplate.update({
      where: { id },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
      include: {
        Status: { select: { id: true, name: true, color: true } },
      }
    });

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur PUT /invoice-templates/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * DELETE /api/chantier-workflow/invoice-templates/:id
 * Supprime un template de facture
 */
router.delete('/invoice-templates/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierInvoiceTemplate.findFirst({
      where: { id, organizationId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }

    await db.chantierInvoiceTemplate.delete({ where: { id } });
    res.json({ success: true, message: 'Template supprimé' });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur DELETE /invoice-templates/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// BILLING PLAN — Plan de facturation par chantier
// ═══════════════════════════════════════════════════════

/**
 * GET /api/chantier-workflow/chantiers/:chantierId/billing-plan
 * Retourne le plan de facturation du chantier.
 * Si aucun plan n'existe, retourne les templates org comme suggestion.
 */
router.get('/chantiers/:chantierId/billing-plan', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string || (req as any).user.organizationId;

    // 1) Charger les items du plan spécifique au chantier
    const items = await db.chantierBillingPlanItem.findMany({
      where: { chantierId, organizationId },
      include: { Status: { select: { id: true, name: true, color: true } } },
      orderBy: { order: 'asc' },
    });

    if (items.length > 0) {
      return res.json({ success: true, data: items, source: 'chantier' });
    }

    // 2) Pas de plan personnalisé → retourner les templates org comme suggestion
    const templates = await db.chantierInvoiceTemplate.findMany({
      where: { organizationId, isActive: true },
      include: { Status: { select: { id: true, name: true, color: true } } },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, data: templates, source: 'templates' });
  } catch (error) {
    console.error('[BILLING-PLAN] Erreur GET:', error);
    res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

/**
 * PUT /api/chantier-workflow/chantiers/:chantierId/billing-plan
 * Sauvegarde ou met à jour le plan de facturation du chantier.
 * Reçoit un tableau complet d'items (remplace tout).
 */
router.put('/chantiers/:chantierId/billing-plan', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string || (req as any).user.organizationId;
    const { items } = req.body as { items: Array<{
      statusId?: string | null;
      type: string;
      label: string;
      percentage?: number | null;
      fixedAmount?: number | null;
      isRequired?: boolean;
      order?: number;
    }> };

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'items doit être un tableau' });
    }

    // Validation: vérifier que les % totalisent ~100% (tolérance 0.1%)
    const totalPercentage = items.reduce((sum, it) => sum + (it.percentage || 0), 0);
    if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.1) {
      return res.status(400).json({
        success: false,
        message: `Le total des pourcentages doit être 100% (actuellement ${totalPercentage.toFixed(1)}%)`,
      });
    }

    // Supprimer l'ancien plan et créer les nouveaux items dans une transaction
    const created = await db.$transaction(async (tx) => {
      await tx.chantierBillingPlanItem.deleteMany({ where: { chantierId, organizationId } });

      const items_created = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const record = await tx.chantierBillingPlanItem.create({
          data: {
            id: crypto.randomUUID(),
            chantierId,
            organizationId,
            statusId: item.statusId || null,
            type: item.type || 'CUSTOM',
            label: item.label,
            percentage: item.percentage ?? null,
            fixedAmount: item.fixedAmount ?? null,
            isRequired: item.isRequired ?? false,
            order: item.order ?? i,
            updatedAt: new Date(),
          },
        });
        items_created.push(record);
      }
      return items_created;
    });

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'BILLING_PLAN_UPDATED',
        toValue: `${items.length} lignes, total ${totalPercentage.toFixed(0)}%`,
        userId: (req as any).user.userId,
      },
    });

    res.json({ success: true, data: created });
  } catch (error) {
    console.error('[BILLING-PLAN] Erreur PUT:', error);
    res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/billing-plan/init
 * Initialise le plan de facturation depuis les templates globaux de l'organisation.
 */
router.post('/chantiers/:chantierId/billing-plan/init', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string || (req as any).user.organizationId;

    // Vérifier que le chantier existe
    const chantier = await db.chantier.findFirst({ where: { id: chantierId, organizationId } });
    if (!chantier) return res.status(404).json({ success: false, message: 'Chantier introuvable' });

    // Supprimer un éventuel plan existant
    await db.chantierBillingPlanItem.deleteMany({ where: { chantierId, organizationId } });

    // Copier les templates org actifs
    const templates = await db.chantierInvoiceTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });

    const created = [];
    for (const tpl of templates) {
      const record = await db.chantierBillingPlanItem.create({
        data: {
          id: crypto.randomUUID(),
          chantierId,
          organizationId,
          statusId: tpl.statusId,
          type: tpl.type,
          label: tpl.label,
          percentage: tpl.percentage,
          fixedAmount: tpl.fixedAmount,
          isRequired: tpl.isRequired,
          order: tpl.order,
          updatedAt: new Date(),
        },
      });
      created.push(record);
    }

    res.json({ success: true, data: created, message: `${created.length} lignes initialisées depuis les templates` });
  } catch (error) {
    console.error('[BILLING-PLAN] Erreur INIT:', error);
    res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════
// VALIDATION ADMIN — Valider un chantier avant pipeline
// ═══════════════════════════════════════════════════════

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/validate
 * Valide le chantier : vérifie que le plan de facturation est défini,
 * marque le chantier comme validé, et l'injecte dans le pipeline.
 */
router.post('/chantiers/:chantierId/validate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string || (req as any).user.organizationId;
    const userId = (req as any).user.userId;
    const { notes } = req.body || {};

    const chantier = await db.chantier.findFirst({ where: { id: chantierId, organizationId } });
    if (!chantier) return res.status(404).json({ success: false, message: 'Chantier introuvable' });

    if (chantier.isValidated) {
      return res.status(400).json({ success: false, message: 'Ce chantier est déjà validé' });
    }

    // Vérifier qu'un plan de facturation existe
    const planItems = await db.chantierBillingPlanItem.count({ where: { chantierId, organizationId } });
    if (planItems === 0) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez définir le plan de facturation avant de valider',
      });
    }

    // Marquer comme validé
    const updated = await db.chantier.update({
      where: { id: chantierId },
      data: {
        isValidated: true,
        validatedAt: new Date(),
        validatedById: userId,
        validationNotes: notes || null,
        updatedAt: new Date(),
      },
    });

    // ── Auto-création des factures depuis le plan de facturation ──
    const billingPlanItems = await db.chantierBillingPlanItem.findMany({
      where: { chantierId, organizationId },
      orderBy: { order: 'asc' },
    });

    const existingInvoices = await db.chantierInvoice.findMany({
      where: { chantierId },
      select: { type: true, label: true },
    });

    const chantierAmount = chantier.amount ? Number(chantier.amount) : 0;
    let invoicesCreated = 0;

    for (const item of billingPlanItems) {
      // Ne pas créer en double
      const alreadyExists = existingInvoices.some(inv => inv.type === item.type && inv.label === item.label);
      if (alreadyExists) continue;

      const amount = item.percentage && chantierAmount
        ? Math.round((chantierAmount * item.percentage / 100) * 100) / 100
        : (item.fixedAmount ? Number(item.fixedAmount) : 0);

      await db.chantierInvoice.create({
        data: {
          id: crypto.randomUUID(),
          chantierId,
          organizationId,
          type: item.type,
          label: item.label,
          amount,
          percentage: item.percentage,
          status: 'DRAFT', // Toutes en brouillon par défaut
          order: item.order,
          updatedAt: new Date(),
        },
      });
      invoicesCreated++;
    }

    // ── Auto-envoi de la première facture (acompte) : passer en SENT ──
    if (invoicesCreated > 0) {
      const acompteInvoice = await db.chantierInvoice.findFirst({
        where: { chantierId, type: 'ACOMPTE', status: 'DRAFT' },
        orderBy: { order: 'asc' },
      });
      if (acompteInvoice) {
        await db.chantierInvoice.update({
          where: { id: acompteInvoice.id },
          data: { status: 'SENT', sentAt: new Date(), updatedAt: new Date() },
        });
        console.log(`[VALIDATION] Facture acompte ${acompteInvoice.id} auto-envoyée pour chantier ${chantierId}`);
      }
    }

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'CHANTIER_VALIDATED',
        toValue: notes || 'Chantier validé par admin',
        userId,
      },
    });

    const invoiceMsg = invoicesCreated > 0 ? ` ${invoicesCreated} facture(s) créée(s) automatiquement.` : '';
    res.json({ success: true, data: updated, message: `Chantier validé avec succès.${invoiceMsg}` });
  } catch (error) {
    console.error('[VALIDATION] Erreur:', error);
    res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/unvalidate
 * Retire la validation d'un chantier (admin only).
 */
router.post('/chantiers/:chantierId/unvalidate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string || (req as any).user.organizationId;

    const chantier = await db.chantier.findFirst({ where: { id: chantierId, organizationId } });
    if (!chantier) return res.status(404).json({ success: false, message: 'Chantier introuvable' });

    await db.chantier.update({
      where: { id: chantierId },
      data: {
        isValidated: false,
        validatedAt: null,
        validatedById: null,
        validationNotes: null,
        updatedAt: new Date(),
      },
    });

    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'CHANTIER_UNVALIDATED',
        toValue: 'Validation retirée',
        userId: (req as any).user.userId,
      },
    });

    res.json({ success: true, message: 'Validation retirée' });
  } catch (error) {
    console.error('[VALIDATION] Erreur unvalidate:', error);
    res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════
// INVOICES — Factures réelles liées aux chantiers
// ═══════════════════════════════════════════════════════

const invoiceSchema = z.object({
  type: z.enum(['ACOMPTE', 'MATERIEL', 'FIN_CHANTIER', 'RECEPTION', 'CUSTOM']).default('CUSTOM'),
  label: z.string().min(1),
  amount: z.preprocess((v) => (v === null || v === undefined || v === '') ? 0 : Number(v), z.number().min(0)),
  percentage: z.preprocess((v) => (v === null || v === undefined || v === '') ? null : Number(v), z.number().min(0).max(100).nullable().optional()),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  dueDate: z.string().nullable().optional(),
  documentUrl: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  order: z.preprocess((v) => (v === null || v === undefined) ? 0 : Number(v), z.number().int().min(0)),
});

/**
 * GET /api/chantier-workflow/chantiers/:chantierId/invoices
 * Liste toutes les factures d'un chantier
 */
router.get('/chantiers/:chantierId/invoices', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    // Vérifier accès au chantier
    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId }
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    const invoices = await db.chantierInvoice.findMany({
      where: { chantierId },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /chantiers/:id/invoices:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/invoices
 * Crée une facture pour un chantier
 */
router.post('/chantiers/:chantierId/invoices', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId }
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    const validation = invoiceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;
    const invoice = await db.chantierInvoice.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        organizationId,
        type: data.type,
        label: data.label,
        amount: data.amount,
        percentage: data.percentage ?? null,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        documentUrl: data.documentUrl,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
        order: data.order,
        updatedAt: new Date(),
      }
    });

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'INVOICE_CREATED',
        toValue: `${data.type}: ${data.label} (${data.amount}€)`,
        userId: user?.userId || user?.id,
        data: { invoiceId: invoice.id, type: data.type, amount: data.amount },
      }
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /chantiers/:id/invoices:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * PUT /api/chantier-workflow/invoices/:id
 * Met à jour une facture
 */
router.put('/invoices/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierInvoice.findFirst({
      where: { id, organizationId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    const validation = invoiceSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;
    const updateData: any = { ...data, updatedAt: new Date() };

    // Si le statut passe à PAID, enregistrer paidAt
    if (data.status === 'PAID' && existing.status !== 'PAID') {
      updateData.paidAt = new Date();

      // Historique
      await db.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId: existing.chantierId,
          action: 'INVOICE_PAID',
          fromValue: existing.status,
          toValue: 'PAID',
          userId: user?.userId || user?.id,
          data: { invoiceId: id, type: existing.type, amount: existing.amount },
        }
      });

      // Vérifier transitions automatiques basées sur le paiement
      await checkAutoTransitions(existing.chantierId, organizationId, 'AUTO_INVOICE_PAID', user);

      // 🐝 Auto-post social : facture payée
      createBusinessAutoPost({
        orgId: organizationId,
        userId: user?.userId || user?.id,
        eventType: 'invoice_paid',
        entityId: id,
        entityLabel: existing.label || `Facture ${existing.type}`,
        amount: existing.amount ? Number(existing.amount) : undefined,
      }).catch(err => console.error('[ChantierWorkflow] Auto-post error:', err));
    }

    // Si le statut passe à SENT, enregistrer sentAt
    if (data.status === 'SENT' && existing.status !== 'SENT') {
      updateData.sentAt = new Date();
    }

    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    const invoice = await db.chantierInvoice.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur PUT /invoices/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * DELETE /api/chantier-workflow/invoices/:id
 * Supprime une facture
 */
router.delete('/invoices/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierInvoice.findFirst({
      where: { id, organizationId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    await db.chantierInvoice.delete({ where: { id } });
    res.json({ success: true, message: 'Facture supprimée' });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur DELETE /invoices/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// EVENTS — Événements liés aux chantiers
// ═══════════════════════════════════════════════════════

const eventSchema = z.object({
  calendarEventId: z.string().nullable().optional(),
  type: z.enum(['VISITE_TECHNIQUE', 'CHANTIER', 'RECEPTION', 'CUSTOM']).default('CUSTOM'),
  status: z.enum(['PLANNED', 'COMPLETED', 'CANCELLED', 'PROBLEM']).default('PLANNED'),
  problemNote: z.string().nullable().optional(),
  subcontractAmount: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/chantier-workflow/chantiers/:chantierId/events
 * Liste tous les événements d'un chantier
 */
router.get('/chantiers/:chantierId/events', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId }
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    const events = await db.chantierEvent.findMany({
      where: { chantierId },
      orderBy: { createdAt: 'asc' },
      include: {
        CalendarEvent: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            location: true,
          }
        },
        ValidatedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /chantiers/:id/events:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/events
 * Crée un événement pour un chantier
 */
router.post('/chantiers/:chantierId/events', authenticateToken, requireChantierAction('edit'), async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId }
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    const validation = eventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;
    const event = await db.chantierEvent.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        calendarEventId: data.calendarEventId,
        type: data.type,
        status: data.status,
        problemNote: data.problemNote,
        subcontractAmount: data.subcontractAmount ?? null,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: {
        CalendarEvent: {
          select: { id: true, title: true, startDate: true, endDate: true }
        },
      }
    });

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'EVENT_PLANNED',
        toValue: `${data.type}`,
        userId: user?.userId || user?.id,
        data: { eventId: event.id, type: data.type, calendarEventId: data.calendarEventId },
      }
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /chantiers/:id/events:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * PUT /api/chantier-workflow/events/:id
 * Met à jour un événement
 */
router.put('/events/:id', authenticateToken, requireChantierAction('edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierEvent.findFirst({
      where: { id },
      include: { Chantier: { select: { organizationId: true } } }
    });
    if (!existing || existing.Chantier.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // Si sous-traitance verrouillée, empêcher modification du montant
    if (existing.subcontractLocked && req.body.subcontractAmount !== undefined && req.body.subcontractAmount !== existing.subcontractAmount) {
      return res.status(403).json({ success: false, message: 'Le montant de sous-traitance est verrouillé' });
    }

    const validation = eventSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;
    const updateData: any = { ...data, updatedAt: new Date() };

    // Si problème signalé → historique + notification
    if (data.status === 'PROBLEM' && existing.status !== 'PROBLEM') {
      await db.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId: existing.chantierId,
          action: 'PROBLEM_REPORTED',
          fromValue: existing.status,
          toValue: 'PROBLEM',
          userId: user?.userId || user?.id,
          data: { eventId: id, problemNote: data.problemNote },
        }
      });

      // Envoyer notifications (CRM + email) vers commercial et admin
      await notifyProblem(existing.chantierId, organizationId, data.problemNote || 'Problème signalé', user);
    }

    // Si validé → enregistrer validation
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.validatedAt = new Date();
      updateData.validatedById = user?.userId || user?.id;

      await db.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId: existing.chantierId,
          action: 'EVENT_VALIDATED',
          fromValue: existing.status,
          toValue: 'COMPLETED',
          userId: user?.userId || user?.id,
          data: { eventId: id, type: existing.type },
        }
      });

      // Vérifier transitions automatiques basées sur la validation visite
      if (existing.type === 'VISITE_TECHNIQUE') {
        await checkAutoTransitions(existing.chantierId, organizationId, 'AUTO_VISIT_VALIDATED', user);
      }
    }

    const event = await db.chantierEvent.update({
      where: { id },
      data: updateData,
      include: {
        CalendarEvent: {
          select: { id: true, title: true, startDate: true, endDate: true }
        },
        ValidatedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur PUT /events/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * PUT /api/chantier-workflow/events/:id/lock-subcontract
 * Verrouille le montant de sous-traitance
 */
router.put('/events/:id/lock-subcontract', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierEvent.findFirst({
      where: { id },
      include: { Chantier: { select: { organizationId: true } } }
    });
    if (!existing || existing.Chantier.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    const event = await db.chantierEvent.update({
      where: { id },
      data: { subcontractLocked: true, updatedAt: new Date() },
    });

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId: existing.chantierId,
        action: 'SUBCONTRACT_LOCKED',
        toValue: `${existing.subcontractAmount}€`,
        userId: user?.userId || user?.id,
        data: { eventId: id, amount: existing.subcontractAmount },
      }
    });

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur PUT /events/:id/lock-subcontract:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * DELETE /api/chantier-workflow/events/:id
 * Supprime un événement
 */
router.delete('/events/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const existing = await db.chantierEvent.findFirst({
      where: { id },
      include: { Chantier: { select: { organizationId: true } } }
    });
    if (!existing || existing.Chantier.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    await db.chantierEvent.delete({ where: { id } });
    res.json({ success: true, message: 'Événement supprimé' });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur DELETE /events/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// HISTORY — Historique complet d'un chantier
// ═══════════════════════════════════════════════════════

/**
 * GET /api/chantier-workflow/chantiers/:chantierId/history
 * Liste l'historique complet d'un chantier
 */
router.get('/chantiers/:chantierId/history', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId }
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    const history = await db.chantierHistory.findMany({
      where: { chantierId },
      orderBy: { createdAt: 'desc' },
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /chantiers/:id/history:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/history
 * Ajoute une entrée manuelle dans l'historique (note, commentaire)
 */
router.post('/chantiers/:chantierId/history', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId }
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    const { action, note, data: extraData } = req.body;

    // Validation Zod
    const historySchema = z.object({
      action: z.string().min(1, 'Action requise'),
      note: z.string().max(2000).optional(),
      data: z.any().optional(),
    });
    const validation = historySchema.safeParse({ action, note, data: extraData });
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const entry = await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: action || 'NOTE_ADDED',
        toValue: note || null,
        userId: user?.userId || user?.id,
        data: extraData || undefined,
      },
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /chantiers/:id/history:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// HELPERS — Fonctions utilitaires internes
// ═══════════════════════════════════════════════════════

/**
 * Vérifie et exécute les transitions automatiques
 * Appelé après un événement déclencheur (paiement facture, validation visite, etc.)
 */
async function checkAutoTransitions(
  chantierId: string,
  organizationId: string,
  triggerType: string,
  user: any
): Promise<void> {
  try {
    const chantier = await db.chantier.findFirst({
      where: { id: chantierId },
      select: { id: true, statusId: true }
    });
    if (!chantier?.statusId) return;

    // Trouver les transitions automatiques actives pour ce trigger
    const transitions = await db.chantierStatusTransition.findMany({
      where: {
        organizationId,
        fromStatusId: chantier.statusId,
        triggerType,
        isActive: true,
      },
      include: {
        ToStatus: { select: { id: true, name: true } }
      }
    });

    if (transitions.length === 0) return;

    // ➤ Prendre la première transition active (order ASC)
    const transition = transitions[0];

    // Vérifier les conditions requises si définies
    if (transition.requiredConditions) {
      const conditions = transition.requiredConditions as any;

      // Condition: toutes les factures d'un type doivent être payées
      if (conditions.invoiceType && conditions.allPaid) {
        const unpaidInvoices = await db.chantierInvoice.count({
          where: {
            chantierId,
            type: conditions.invoiceType,
            status: { not: 'PAID' }
          }
        });
        if (unpaidInvoices > 0) return; // conditions non remplies
      }

      // Condition: toutes les factures required doivent être payées
      if (conditions.allRequiredPaid) {
        const templates = await db.chantierInvoiceTemplate.findMany({
          where: { organizationId, isRequired: true }
        });
        const requiredTypes = templates.map(t => t.type);
        if (requiredTypes.length > 0) {
          const unpaid = await db.chantierInvoice.count({
            where: {
              chantierId,
              type: { in: requiredTypes },
              status: { not: 'PAID' }
            }
          });
          if (unpaid > 0) return;
        }
      }
    }

    // Exécuter la transition
    const oldStatusId = chantier.statusId;
    await db.chantier.update({
      where: { id: chantierId },
      data: { statusId: transition.toStatusId, updatedAt: new Date() }
    });

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'STATUS_CHANGED',
        fromValue: oldStatusId,
        toValue: transition.toStatusId,
        userId: user?.userId || user?.id,
        data: { triggerType, transitionId: transition.id, auto: true },
      }
    });

    // Notifications si configurées
    if (transition.notifyRoles) {
      const roles = transition.notifyRoles as string[];
      await sendTransitionNotifications(chantierId, organizationId, oldStatusId, transition.toStatusId, roles, transition.sendEmail);
    }

    console.log(`[ChantierWorkflow] Auto-transition: chantier ${chantierId} → ${transition.ToStatus.name} (trigger: ${triggerType})`);
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur checkAutoTransitions:', error);
  }
}

/**
 * Envoie les notifications de transition de statut
 * Si sendEmail=true, envoie aussi un email via SMTP (utilise les credentials d'un admin de l'org)
 */
async function sendTransitionNotifications(
  chantierId: string,
  organizationId: string,
  fromStatusId: string,
  toStatusId: string,
  notifyRoles: string[],
  sendEmail: boolean
): Promise<void> {
  try {
    // Récupérer le chantier et les statuts
    const [chantier, fromStatus, toStatus] = await Promise.all([
      db.chantier.findFirst({ where: { id: chantierId }, select: { productLabel: true, clientName: true, customLabel: true } }),
      db.chantierStatus.findFirst({ where: { id: fromStatusId }, select: { name: true } }),
      db.chantierStatus.findFirst({ where: { id: toStatusId }, select: { name: true } }),
    ]);

    const chantierLabel = chantier?.customLabel || chantier?.clientName || chantier?.productLabel || 'Chantier';

    // Trouver les utilisateurs avec ces rôles dans cette organisation
    const users = await db.userOrganization.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        User: { select: { id: true, email: true, firstName: true } },
        Role: { select: { name: true } }
      }
    });

    const targetUsers = users.filter(u => {
      const roleName = u.Role?.name?.toLowerCase() || '';
      return notifyRoles.some(r => roleName.includes(r.toLowerCase()));
    });

    // Créer les notifications CRM
    for (const u of targetUsers) {
      await createChantierNotifWithPush({
        data: {
          id: crypto.randomUUID(),
          userId: u.User.id,
          organizationId,
          type: 'CHANTIER_STATUS_CHANGED',
          data: {
            chantierId,
            fromStatusId,
            toStatusId,
            title: `Chantier "${chantierLabel}" déplacé`,
            message: `${fromStatus?.name || '?'} → ${toStatus?.name || '?'}`,
          },
          status: 'PENDING',
          updatedAt: new Date(),
        }
      });
    }

    // ── Envoi d'email si activé sur la transition ──
    if (sendEmail && targetUsers.length > 0) {
      try {
        // Trouver un EmailAccount configuré dans l'org (préférence: admin)
        const emailAccount = await db.emailAccount.findFirst({
          where: { organizationId },
          select: { emailAddress: true, encryptedPassword: true, mailProvider: true }
        });

        if (emailAccount?.encryptedPassword) {
          const decryptedPassword = decrypt(emailAccount.encryptedPassword);

          // Déterminer les paramètres SMTP selon le provider
          let smtpHost = 'smtp.gmail.com';
          let smtpPort = 465;
          if (emailAccount.mailProvider === 'one.com' || emailAccount.mailProvider === 'onecom') {
            smtpHost = 'send.one.com';
            smtpPort = 465;
          } else if (emailAccount.mailProvider === 'outlook' || emailAccount.mailProvider === 'hotmail') {
            smtpHost = 'smtp.office365.com';
            smtpPort = 587;
          } else if (emailAccount.mailProvider === 'yandex') {
            smtpHost = 'smtp.yandex.com';
            smtpPort = 465;
          }

          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: emailAccount.emailAddress,
              pass: decryptedPassword,
            },
          });

          const subject = `🏗️ Chantier "${chantierLabel}" — ${fromStatus?.name || '?'} → ${toStatus?.name || '?'}`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1677ff; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">🏗️ Changement de statut</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #333;">
                  Le chantier <strong>"${chantierLabel}"</strong> a changé de statut :
                </p>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
                  <span style="font-size: 18px; font-weight: 600; color: #ff4d4f;">${fromStatus?.name || '?'}</span>
                  <span style="font-size: 24px; margin: 0 12px;">→</span>
                  <span style="font-size: 18px; font-weight: 600; color: #52c41a;">${toStatus?.name || '?'}</span>
                </div>
                <p style="font-size: 13px; color: #8c8c8c; text-align: center; margin-top: 24px;">
                  Notification automatique CRM 2Thier
                </p>
              </div>
            </div>
          `;

          // Envoyer l'email à tous les utilisateurs ciblés
          const emailTargets = targetUsers
            .map(u => u.User.email)
            .filter((email): email is string => !!email);

          if (emailTargets.length > 0) {
            await transporter.sendMail({
              from: emailAccount.emailAddress,
              to: emailTargets.join(', '),
              subject,
              html,
            });
            console.log(`[ChantierWorkflow] ✉️ Email envoyé à ${emailTargets.length} destinataires`);
          }
        } else {
          console.warn('[ChantierWorkflow] ⚠️ sendEmail=true mais aucun EmailAccount configuré dans l\'org');
        }
      } catch (emailErr) {
        // L'envoi d'email est non-bloquant
        console.error('[ChantierWorkflow] ❌ Erreur envoi email (non bloquant):', emailErr);
      }
    }

    console.log(`[ChantierWorkflow] ${targetUsers.length} notifications envoyées pour transition ${fromStatus?.name} → ${toStatus?.name}`);
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur sendTransitionNotifications:', error);
  }
}

/**
 * Notifie le commercial et l'admin quand un technicien signale un problème
 */
async function notifyProblem(
  chantierId: string,
  organizationId: string,
  problemNote: string,
  user: any
): Promise<void> {
  try {
    const chantier = await db.chantier.findFirst({
      where: { id: chantierId },
      select: { productLabel: true, clientName: true, customLabel: true, commercialId: true }
    });

    const chantierLabel = chantier?.customLabel || chantier?.clientName || chantier?.productLabel || 'Chantier';
    const reporterName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Un utilisateur';

    // Notifier le commercial assigné
    if (chantier?.commercialId) {
      await createChantierNotifWithPush({
        data: {
          id: crypto.randomUUID(),
          userId: chantier.commercialId,
          organizationId,
          type: 'CHANTIER_PROBLEM_REPORTED',
          data: {
            chantierId,
            problemNote,
            title: `⚠️ Problème signalé — ${chantierLabel}`,
            message: `${reporterName}: ${problemNote}`,
          },
          status: 'PENDING',
          updatedAt: new Date(),
        }
      });
    }

    // Notifier tous les admins de l'organisation
    const admins = await db.userOrganization.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        User: { select: { id: true } },
        Role: { select: { name: true } }
      }
    });

    const adminUsers = admins.filter(u => {
      const role = u.Role?.name?.toLowerCase() || '';
      return role.includes('admin') || role.includes('super');
    });

    for (const admin of adminUsers) {
      // Ne pas dupliquer si c'est le même que le commercial
      if (admin.User.id === chantier?.commercialId) continue;

      await createChantierNotifWithPush({
        data: {
          id: crypto.randomUUID(),
          userId: admin.User.id,
          organizationId,
          type: 'CHANTIER_PROBLEM_REPORTED',
          data: {
            chantierId,
            problemNote,
            title: `⚠️ Problème signalé — ${chantierLabel}`,
            message: `${reporterName}: ${problemNote}`,
          },
          status: 'PENDING',
          updatedAt: new Date(),
        }
      });
    }
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur notifyProblem:', error);
  }
}

// ═══════════════════════════════════════════════════════
// REVUE TECHNIQUE — Validation des champs TBL par le technicien
// ═══════════════════════════════════════════════════════

/**
 * GET /api/chantier-workflow/events/:id/review-fields
 * Charge les champs TBL marqués technicianVisible pour un événement de chantier.
 * Retourne les valeurs du devis (commercial) + les reviews existantes si déjà fait.
 */
router.get('/events/:id/review-fields', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    // Charger l'événement avec le chantier et sa soumission TBL
    const event = await db.chantierEvent.findFirst({
      where: { id },
      include: {
        Chantier: {
          select: {
            id: true,
            organizationId: true,
            submissionId: true,
            amount: true,
            clientName: true,
            siteAddress: true,
            productLabel: true,
            GeneratedDocument: {
              select: { dataSnapshot: true, paymentAmount: true }
            },
            TreeBranchLeafSubmission: {
              select: { id: true, treeId: true, status: true }
            }
          }
        },
        TechnicianFieldReviews: {
          include: {
            ReviewedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!event || event.Chantier.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    const submission = event.Chantier.TreeBranchLeafSubmission;
    if (!submission) {
      return res.json({
        success: true,
        data: { fields: [], reviews: event.TechnicianFieldReviews, chantierAmount: event.Chantier.amount }
      });
    }

    // 1. Récupérer les nodes TBL marqués technicianVisible
    const visibleNodes = await db.treeBranchLeafNode.findMany({
      where: {
        treeId: submission.treeId,
        technicianVisible: true,
        isVisible: true,
        isActive: true,
      },
      select: {
        id: true,
        label: true,
        fieldType: true,
        type: true,
        subType: true,
        order: true,
        parentId: true,
        number_unit: true,
        number_suffix: true,
        select_options: true,
      },
      orderBy: { order: 'asc' },
    });

    const nodeIds = visibleNodes.map(n => n.id);

    // 2. Récupérer les valeurs de la soumission pour ces nodes
    const submissionData = nodeIds.length > 0 ? await db.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: submission.id,
        nodeId: { in: nodeIds },
      },
    }) : [];

    // Map les valeurs par nodeId
    const valueMap = new Map(submissionData.map(d => [d.nodeId, d]));

    // Construire les champs avec leurs valeurs
    const fields = visibleNodes.map(node => {
      const data = valueMap.get(node.id);
      return {
        nodeId: node.id,
        label: node.label,
        fieldType: node.fieldType,
        type: node.type,
        subType: node.subType,
        unit: node.number_unit || node.number_suffix || null,
        options: node.select_options,
        originalValue: data?.value || null,
        fieldLabel: data?.fieldLabel || node.label,
        variableKey: data?.variableKey || null,
        variableUnit: data?.variableUnit || null,
      };
    });

    // Extraire le montant devis
    const snapshot = (event.Chantier.GeneratedDocument?.dataSnapshot as any) || {};
    const quoteData = snapshot?.quote || {};
    const chantierAmount = event.Chantier.amount
      || (quoteData.totalTTC ? Number(quoteData.totalTTC) : null)
      || (event.Chantier.GeneratedDocument?.paymentAmount ? Number(event.Chantier.GeneratedDocument.paymentAmount) : null)
      || null;

    res.json({
      success: true,
      data: {
        fields,
        reviews: event.TechnicianFieldReviews,
        chantierAmount,
        reviewStatus: event.reviewStatus,
        clientName: event.Chantier.clientName,
        siteAddress: event.Chantier.siteAddress,
        productLabel: event.Chantier.productLabel,
      }
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /events/:id/review-fields:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * GET /api/chantier-workflow/events/:id/has-subcontractors
 * Vérifie si le chantier lié à cet événement a des sous-traitants assignés
 */
router.get('/events/:id/has-subcontractors', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const event = await db.chantierEvent.findFirst({
      where: { id },
      select: { Chantier: { select: { id: true, organizationId: true } } },
    });

    if (!event || event.Chantier.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    const subcontractorAssignments = await db.chantierAssignment.findMany({
      where: {
        chantierId: event.Chantier.id,
        Technician: { type: 'SUBCONTRACTOR' },
      },
      include: {
        Technician: { select: { firstName: true, lastName: true, company: true, billingMode: true } },
      },
    });

    res.json({
      success: true,
      hasSubcontractors: subcontractorAssignments.length > 0,
      subcontractors: subcontractorAssignments.map(a => ({
        name: `${a.Technician.firstName} ${a.Technician.lastName}`,
        company: a.Technician.company,
        billingMode: a.Technician.billingMode,
      })),
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /events/:id/has-subcontractors:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/events/:id/submit-review
 * Soumet la revue technique (technicien confirme/modifie les champs)
 * Body: { reviews: [{nodeId, reviewedValue, isModified, modificationNote}], subcontractAmount?: number }
 */
const reviewItemSchema = z.object({
  nodeId: z.string().min(1),
  reviewedValue: z.string().nullable().optional(),
  isModified: z.boolean(),
  modificationNote: z.string().nullable().optional(),
});

const submitReviewSchema = z.object({
  reviews: z.array(reviewItemSchema).min(1),
  subcontractAmount: z.number().optional(),
  reviewType: z.enum(['TECHNICAL', 'RECEPTION']).default('TECHNICAL'),
});

router.post('/events/:id/submit-review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = user?.userId || user?.id;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const validation = submitReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const { reviews, subcontractAmount, reviewType } = validation.data;

    // Charger l'événement
    const event = await db.chantierEvent.findFirst({
      where: { id },
      include: {
        Chantier: {
          select: {
            id: true,
            organizationId: true,
            submissionId: true,
            amount: true,
            commercialId: true,
            leadId: true,
            TreeBranchLeafSubmission: { select: { id: true, treeId: true } }
          }
        }
      }
    });

    if (!event || event.Chantier.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // 🔍 Vérifier si le chantier a des sous-traitants assignés
    const subcontractorCount = await db.chantierAssignment.count({
      where: {
        chantierId: event.Chantier.id,
        Technician: { type: 'SUBCONTRACTOR' },
      },
    });
    const hasSubcontractors = subcontractorCount > 0;

    if (hasSubcontractors && (subcontractAmount === undefined || subcontractAmount === null || subcontractAmount <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Ce chantier a des sous-traitants assignés. Le coût sous-traitant est obligatoire et doit être supérieur à 0.',
        requiresSubcontractAmount: true,
      });
    }

    const submission = event.Chantier.TreeBranchLeafSubmission;

    // Récupérer les labels des nodes
    const nodeIds = reviews.map(r => r.nodeId);
    const nodes = submission ? await db.treeBranchLeafNode.findMany({
      where: { id: { in: nodeIds }, treeId: submission.treeId },
      select: { id: true, label: true },
    }) : [];
    const nodeLabels = new Map(nodes.map(n => [n.id, n.label]));

    // Récupérer les valeurs originales
    const originalData = submission ? await db.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: submission.id, nodeId: { in: nodeIds } },
    }) : [];
    const originalValues = new Map(originalData.map(d => [d.nodeId, d.value]));

    // Vérifier que tous les champs modifiés ont une note
    const invalidReviews = reviews.filter(r => r.isModified && (!r.modificationNote || !r.modificationNote.trim()));
    if (invalidReviews.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Une note explicative est obligatoire pour chaque champ modifié',
        fields: invalidReviews.map(r => r.nodeId),
      });
    }

    // Transaction : créer toutes les reviews + mettre à jour l'événement
    const hasModifications = reviews.some(r => r.isModified);
    const reviewStatus = hasModifications ? 'CHANGES_DETECTED' : 'CONFIRMED';

    await db.$transaction(async (tx) => {
      // Supprimer les reviews existantes pour cet événement + type
      await tx.technicianFieldReview.deleteMany({
        where: { chantierEventId: id, reviewType },
      });

      // Créer les nouvelles reviews
      for (const review of reviews) {
        await tx.technicianFieldReview.create({
          data: {
            chantierEventId: id,
            nodeId: review.nodeId,
            fieldLabel: nodeLabels.get(review.nodeId) || 'Champ inconnu',
            originalValue: originalValues.get(review.nodeId) || null,
            reviewedValue: review.isModified ? (review.reviewedValue || null) : (originalValues.get(review.nodeId) || null),
            isModified: review.isModified,
            modificationNote: review.isModified ? review.modificationNote : null,
            reviewType,
            reviewedById: userId,
          }
        });
      }

      // Mettre à jour l'événement
      const eventUpdate: any = {
        status: 'COMPLETED',
        reviewStatus,
        reviewData: {
          totalFields: reviews.length,
          modifiedFields: reviews.filter(r => r.isModified).length,
          confirmedFields: reviews.filter(r => !r.isModified).length,
          reviewType,
          reviewedAt: new Date().toISOString(),
        },
        validatedAt: new Date(),
        validatedById: userId,
        updatedAt: new Date(),
      };

      if (subcontractAmount !== undefined && subcontractAmount > 0) {
        eventUpdate.subcontractAmount = subcontractAmount;
        eventUpdate.subcontractLocked = true; // 🔒 Verrouiller le montant après validation
      }

      await tx.chantierEvent.update({ where: { id }, data: eventUpdate });

      // Historique
      await tx.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId: event.Chantier.id,
          action: reviewType === 'TECHNICAL' ? 'TECHNICAL_REVIEW_SUBMITTED' : 'RECEPTION_REVIEW_SUBMITTED',
          fromValue: event.status,
          toValue: 'COMPLETED',
          userId,
          data: {
            eventId: id,
            eventType: event.type,
            reviewStatus,
            totalFields: reviews.length,
            modifiedFields: reviews.filter(r => r.isModified).length,
            subcontractAmount,
          },
        }
      });
    });

    // Notifications si modifications détectées
    if (hasModifications) {
      try {
        // Notifier les admins (via Role relation, pas de champ 'role' sur UserOrganization)
        const adminsRaw = await db.userOrganization.findMany({
          where: { organizationId, status: 'ACTIVE' },
          include: {
            User: { select: { id: true } },
            Role: { select: { name: true } },
          },
        });
        const admins = adminsRaw
          .filter(u => {
            const roleName = u.Role?.name?.toLowerCase() || '';
            return roleName.includes('admin') || roleName.includes('super');
          })
          .map(u => ({ userId: u.User.id }));

        const modifiedLabels = reviews.filter(r => r.isModified).map(r => nodeLabels.get(r.nodeId) || r.nodeId);
        const notifMessage = `⚠️ Revue technique: ${reviews.filter(r => r.isModified).length} modifications détectées (${modifiedLabels.join(', ')})`;

        for (const admin of admins) {
          await createChantierNotifWithPush({
            data: {
              id: crypto.randomUUID(),
              userId: admin.userId,
              organizationId,
              type: 'CHANTIER_PROBLEM_REPORTED',
              data: {
                title: '⚠️ Modifications terrain détectées',
                message: notifMessage,
                link: `/chantiers/${event.Chantier.id}?tab=events`,
              },
              status: 'PENDING',
              updatedAt: new Date(),
            }
          });
        }

        // Notifier le commercial assigné
        if (event.Chantier.commercialId) {
          await createChantierNotifWithPush({
            data: {
              id: crypto.randomUUID(),
              userId: event.Chantier.commercialId,
              organizationId,
              type: 'CHANTIER_PROBLEM_REPORTED',
              data: {
                title: '⚠️ Modifications terrain sur votre chantier',
                message: notifMessage,
                link: `/chantiers/${event.Chantier.id}?tab=events`,
              },
              status: 'PENDING',
              updatedAt: new Date(),
            }
          });
        }
      } catch (notifError) {
        console.error('[ChantierWorkflow] Erreur envoi notifications review:', notifError);
      }
    }

    // 🔁 AUTO-RETURN TO LEAD: Si modifications détectées → renvoyer le lead dans la colonne "À rectifier"
    if (hasModifications && event.Chantier.leadId) {
      try {
        // Trouver ou créer le statut "À rectifier" pour cette organisation
        let rectifyStatus = await db.leadStatus.findFirst({
          where: { organizationId, name: 'À rectifier' },
        });
        if (!rectifyStatus) {
          // Trouver le plus grand order existant pour positionner la nouvelle colonne à la fin
          const maxOrder = await db.leadStatus.aggregate({
            where: { organizationId },
            _max: { order: true },
          });
          rectifyStatus = await db.leadStatus.create({
            data: {
              id: crypto.randomUUID(),
              organizationId,
              name: 'À rectifier',
              color: '#fa8c16',
              order: (maxOrder._max.order ?? 0) + 1,
              isDefault: false,
              updatedAt: new Date(),
            }
          });
          console.log(`[ChantierWorkflow] Créé LeadStatus "À rectifier" (${rectifyStatus.id}) pour org ${organizationId}`);
        }

        // Déplacer le lead vers "À rectifier"
        await db.lead.update({
          where: { id: event.Chantier.leadId },
          data: {
            statusId: rectifyStatus.id,
            status: 'à_rectifier',
            updatedAt: new Date(),
          }
        });
        console.log(`[ChantierWorkflow] Lead ${event.Chantier.leadId} déplacé vers "À rectifier"`);

        // Notifier le commercial assigné du lead
        const lead = await db.lead.findUnique({
          where: { id: event.Chantier.leadId },
          select: { assignedToId: true, firstName: true, lastName: true },
        });
        if (lead?.assignedToId) {
          await createChantierNotifWithPush({
            data: {
              id: crypto.randomUUID(),
              userId: lead.assignedToId,
              organizationId,
              type: 'CHANTIER_STATUS_CHANGED',
              data: {
                title: '🔄 Lead à rectifier',
                message: `Le lead ${lead.firstName || ''} ${lead.lastName || ''} nécessite des corrections suite à la vérification terrain.`,
                link: `/leads?openLead=${event.Chantier.leadId}`,
              },
              status: 'PENDING',
              updatedAt: new Date(),
            }
          });
        }
      } catch (leadErr) {
        console.error('[ChantierWorkflow] Erreur auto-return lead:', leadErr);
      }
    }

    // Auto-transition si visite technique ET validée (pas de problèmes)
    if (event.type === 'VISITE_TECHNIQUE' && !hasModifications) {
      await checkAutoTransitions(event.Chantier.id, organizationId, 'AUTO_VISIT_VALIDATED', user);
    }

    res.json({
      success: true,
      data: {
        reviewStatus,
        modifiedCount: reviews.filter(r => r.isModified).length,
        leadReturned: hasModifications && !!event.Chantier.leadId,
      },
      message: hasModifications
        ? `Analyse terminée — ${reviews.filter(r => r.isModified).length} problème(s) détecté(s). Lead renvoyé au commercial.`
        : 'Analyse terminée — Toutes les données confirmées ✅'
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /events/:id/submit-review:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * GET /api/chantier-workflow/chantiers/:chantierId/review-summary
 * Résumé de toutes les revues techniques d'un chantier (pour affichage admin)
 */
router.get('/chantiers/:chantierId/review-summary', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId },
      select: { id: true, amount: true },
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    // Toutes les reviews de tous les événements du chantier
    const events = await db.chantierEvent.findMany({
      where: { chantierId },
      include: {
        TechnicianFieldReviews: {
          include: {
            ReviewedBy: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { reviewedAt: 'desc' },
        },
        CalendarEvent: {
          select: { title: true, startDate: true }
        },
        ValidatedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    // Résumer
    const summary = events
      .filter(e => e.TechnicianFieldReviews.length > 0)
      .map(e => ({
        eventId: e.id,
        eventType: e.type,
        eventTitle: e.CalendarEvent?.title,
        eventDate: e.CalendarEvent?.startDate,
        reviewStatus: e.reviewStatus,
        subcontractAmount: e.subcontractAmount,
        validatedBy: e.ValidatedBy,
        validatedAt: e.validatedAt,
        reviews: e.TechnicianFieldReviews.map(r => ({
          nodeId: r.nodeId,
          fieldLabel: r.fieldLabel,
          originalValue: r.originalValue,
          reviewedValue: r.reviewedValue,
          isModified: r.isModified,
          modificationNote: r.modificationNote,
          reviewType: r.reviewType,
          reviewedBy: r.ReviewedBy,
          reviewedAt: r.reviewedAt,
        })),
        totalFields: e.TechnicianFieldReviews.length,
        modifiedFields: e.TechnicianFieldReviews.filter(r => r.isModified).length,
      }));

    const totalSubcontract = events.reduce((sum, e) => sum + (e.subcontractAmount || 0), 0);

    res.json({
      success: true,
      data: {
        summary,
        totalSubcontract,
        chantierAmount: chantier.amount,
        marginAmount: chantier.amount ? chantier.amount - totalSubcontract : null,
        marginPercent: chantier.amount ? ((chantier.amount - totalSubcontract) / chantier.amount * 100) : null,
        hasModifications: summary.some(s => s.modifiedFields > 0),
      }
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET review-summary:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/reject-to-lead
 * Admin rejette le chantier après revue technique → retour en lead
 * Désactive le chantier, réouvre le lead avec note explicative
 */
router.post('/chantiers/:chantierId/reject-to-lead', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const user = (req as any).user;
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = user?.userId || user?.id;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const rejectSchema = z.object({
      reason: z.string().min(1, 'La raison est obligatoire'),
      notifyCommercial: z.boolean().default(true),
    });

    const validation = rejectSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const { reason, notifyCommercial } = validation.data;

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId },
      select: {
        id: true,
        leadId: true,
        commercialId: true,
        clientName: true,
        statusId: true,
        submissionId: true,
        notes: true,
      }
    });

    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    if (!chantier.leadId) {
      return res.status(400).json({ success: false, message: 'Ce chantier n\'a pas de lead associé, impossible de le renvoyer' });
    }

    // Trouver le statut "Annulé" ou un statut "À revoir" pour le chantier
    const cancelStatus = await db.chantierStatus.findFirst({
      where: { organizationId, name: { in: ['Annulé', 'À revoir', 'Rejeté'] } },
      orderBy: { order: 'desc' },
    });

    await db.$transaction(async (tx) => {
      // 1. Déplacer le chantier en statut "Annulé" / "À revoir"
      if (cancelStatus) {
        await tx.chantier.update({
          where: { id: chantierId },
          data: {
            statusId: cancelStatus.id,
            notes: `${chantier.notes ? chantier.notes + '\n\n' : ''}--- REJETÉ PAR ADMIN ---\n${reason}\n(${new Date().toLocaleDateString('fr-BE')})`,
            isValidated: false,
            validatedAt: null,
            validatedById: null,
            updatedAt: new Date(),
          }
        });
      }

      // 2. Réouvrir le lead — remettre en statut "à modifier"
      // Chercher un statut lead approprié ou utiliser le premier statut
      const leadStatus = await tx.leadStatus.findFirst({
        where: { organizationId },
        orderBy: { order: 'asc' },
      });

      await tx.lead.update({
        where: { id: chantier.leadId! },
        data: {
          status: 'à_revoir_technique',
          statusId: leadStatus?.id || undefined,
          notes: `⚠️ RETOUR TECHNIQUE — Chantier rejeté par l'admin.\nRaison: ${reason}\nDate: ${new Date().toLocaleDateString('fr-BE')} ${new Date().toLocaleTimeString('fr-BE')}\n\nLe commercial doit corriger le TBL et regénérer un nouveau devis.`,
          updatedAt: new Date(),
        }
      });

      // 3. Historique
      await tx.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId,
          action: 'REJECTED_TO_LEAD',
          fromValue: chantier.statusId || 'unknown',
          toValue: 'LEAD',
          userId,
          data: {
            reason,
            leadId: chantier.leadId,
            previousStatus: chantier.statusId,
          },
        }
      });
    });

    // 4. Notification au commercial
    if (notifyCommercial && chantier.commercialId) {
      try {
        await createChantierNotifWithPush({
          data: {
            id: crypto.randomUUID(),
            userId: chantier.commercialId,
            organizationId,
            type: 'CHANTIER_STATUS_CHANGED',
            data: {
              title: '↩️ Chantier renvoyé — Correction requise',
              message: `Le chantier "${chantier.clientName}" a été renvoyé après la revue technique.\nRaison: ${reason}\n\nVeuillez corriger le TBL et regénérer le devis.`,
              link: `/leads?id=${chantier.leadId}`,
            },
            status: 'PENDING',
            updatedAt: new Date(),
          }
        });
      } catch (notifError) {
        console.error('[ChantierWorkflow] Erreur notification reject-to-lead:', notifError);
      }
    }

    res.json({
      success: true,
      message: 'Chantier renvoyé au commercial — Lead réouvert pour correction',
      data: { leadId: chantier.leadId },
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST reject-to-lead:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// RÉCEPTION CHANTIER — PV de réception client (juridique)
// ═══════════════════════════════════════════════════════

const RECEPTION_LEGAL_TEXT = `Je soussigné(e) déclare avoir réceptionné les travaux décrits ci-dessus. Je confirme que les travaux ont été réalisés conformément au devis accepté et que l'installation est fonctionnelle. Je reconnais avoir vérifié chaque point mentionné dans cette fiche de réception et confirme l'état décrit pour chacun. En cas de réserves, celles-ci sont mentionnées ci-dessus et devront être levées dans le délai convenu. Cette réception vaut acceptation définitive des travaux, sous réserve des points mentionnés ci-dessus.`;

const DEFAULT_SATISFACTION_QUESTIONS = [
  { id: 'quality', question: 'Qualité générale des travaux réalisés', type: 'rating' },
  { id: 'cleanliness', question: 'Propreté du chantier après intervention', type: 'rating' },
  { id: 'punctuality', question: 'Respect des délais et de la ponctualité', type: 'rating' },
  { id: 'communication', question: 'Communication et suivi du chantier', type: 'rating' },
  { id: 'recommendation', question: 'Recommanderiez-vous notre entreprise ?', type: 'boolean' },
  { id: 'comments', question: 'Commentaires ou suggestions', type: 'text' },
];

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/reception/prepare
 * Prépare le PV de réception (technicien initie)
 */
router.post('/chantiers/:chantierId/reception/prepare', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const user = (req as any).user;
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = user?.userId || user?.id;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId },
      select: {
        id: true,
        clientName: true,
        siteAddress: true,
        amount: true,
        productLabel: true,
        submissionId: true,
        Lead: { select: { email: true, phone: true, firstName: true, lastName: true } },
        GeneratedDocument: { select: { dataSnapshot: true } },
        ChantierEvent: {
          where: { status: 'COMPLETED' },
          select: { subcontractAmount: true },
        },
      }
    });

    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    // Vérifier qu'il n'y a pas déjà une réception
    const existingReception = await db.chantierReception.findUnique({
      where: { chantierId },
    });
    if (existingReception && existingReception.status !== 'DRAFT') {
      return res.status(409).json({ success: false, message: 'Une réception existe déjà pour ce chantier' });
    }

    // Calculer somme sous-traitance
    const subcontractTotal = chantier.ChantierEvent.reduce((sum, e) => sum + (e.subcontractAmount || 0), 0);

    // Construire la checklist depuis les champs TBL technicianVisible
    let checklist: any[] = [];
    if (chantier.submissionId) {
      const submission = await db.treeBranchLeafSubmission.findUnique({
        where: { id: chantier.submissionId },
        select: { treeId: true },
      });
      if (submission) {
        const nodes = await db.treeBranchLeafNode.findMany({
          where: { treeId: submission.treeId, technicianVisible: true, isVisible: true, isActive: true },
          select: { id: true, label: true },
          orderBy: { order: 'asc' },
        });
        const subData = await db.treeBranchLeafSubmissionData.findMany({
          where: { submissionId: chantier.submissionId, nodeId: { in: nodes.map(n => n.id) } },
        });
        const valueMap = new Map(subData.map(d => [d.nodeId, d.value]));
        checklist = nodes.map(n => ({
          nodeId: n.id,
          label: n.label,
          expectedValue: valueMap.get(n.id) || null,
          checked: false,
          note: null,
        }));
      }
    }

    // Générer token d'accès client
    const clientAccessToken = crypto.randomUUID();
    const clientTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

    const reception = existingReception
      ? await db.chantierReception.update({
          where: { chantierId },
          data: {
            checklist,
            workSummary: { product: chantier.productLabel, address: chantier.siteAddress },
            totalAmount: chantier.amount,
            subcontractTotal,
            clientName: chantier.Lead ? `${chantier.Lead.firstName || ''} ${chantier.Lead.lastName || ''}`.trim() : chantier.clientName,
            clientEmail: chantier.Lead?.email,
            clientPhone: chantier.Lead?.phone,
            clientAccessToken,
            clientTokenExpiresAt,
            legalText: RECEPTION_LEGAL_TEXT,
            satisfactionAnswers: DEFAULT_SATISFACTION_QUESTIONS,
            preparedById: userId,
            updatedAt: new Date(),
          }
        })
      : await db.chantierReception.create({
          data: {
            chantierId,
            status: 'DRAFT',
            checklist,
            workSummary: { product: chantier.productLabel, address: chantier.siteAddress },
            totalAmount: chantier.amount,
            subcontractTotal,
            clientName: chantier.Lead ? `${chantier.Lead.firstName || ''} ${chantier.Lead.lastName || ''}`.trim() : chantier.clientName,
            clientEmail: chantier.Lead?.email,
            clientPhone: chantier.Lead?.phone,
            clientAccessToken,
            clientTokenExpiresAt,
            legalText: RECEPTION_LEGAL_TEXT,
            satisfactionAnswers: DEFAULT_SATISFACTION_QUESTIONS,
            preparedById: userId,
            updatedAt: new Date(),
          }
        });

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'RECEPTION_PREPARED',
        userId,
        data: { receptionId: reception.id, checklistItems: checklist.length },
      }
    });

    res.json({
      success: true,
      data: {
        reception,
        clientLink: `/reception/${clientAccessToken}`,
        satisfactionQuestions: DEFAULT_SATISFACTION_QUESTIONS,
      },
      message: 'PV de réception préparé — Lien client généré'
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST reception/prepare:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * GET /api/chantier-workflow/reception/:token
 * Accès public (client) via token — charge le PV de réception à signer
 */
router.get('/reception/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const reception = await db.chantierReception.findUnique({
      where: { clientAccessToken: token },
      include: {
        Chantier: {
          select: {
            clientName: true,
            siteAddress: true,
            productLabel: true,
            amount: true,
            Organization: { select: { name: true } },
          }
        }
      }
    });

    if (!reception) {
      return res.status(404).json({ success: false, message: 'Lien de réception invalide ou expiré' });
    }

    if (reception.clientTokenExpiresAt && reception.clientTokenExpiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Ce lien de réception a expiré' });
    }

    if (reception.status === 'ACCEPTED' || reception.status === 'ACCEPTED_WITH_RESERVES') {
      return res.json({
        success: true,
        data: { ...reception, alreadySigned: true },
        message: 'Ce PV de réception a déjà été signé'
      });
    }

    res.json({
      success: true,
      data: {
        id: reception.id,
        status: reception.status,
        checklist: reception.checklist,
        workSummary: reception.workSummary,
        satisfactionQuestions: DEFAULT_SATISFACTION_QUESTIONS,
        legalText: reception.legalText,
        clientName: reception.clientName,
        totalAmount: reception.totalAmount,
        organizationName: reception.Chantier.Organization?.name,
        productLabel: reception.Chantier.productLabel,
        siteAddress: reception.Chantier.siteAddress,
      }
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET /reception/:token:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/reception/:token/sign
 * Client signe le PV de réception (juridiquement fort)
 */
const signReceptionSchema = z.object({
  clientName: z.string().min(1, 'Le nom est obligatoire'),
  clientSignature: z.string().min(1, 'La signature est obligatoire'),
  checklist: z.array(z.object({
    nodeId: z.string().optional(),
    label: z.string(),
    checked: z.boolean(),
    note: z.string().nullable().optional(),
  })),
  satisfactionAnswers: z.array(z.object({
    id: z.string(),
    question: z.string(),
    answer: z.any(),
    rating: z.number().min(1).max(5).optional(),
  })).optional(),
  reserves: z.array(z.object({
    description: z.string().min(1),
    severity: z.enum(['minor', 'major', 'critical']).default('minor'),
  })).optional(),
  legalAccepted: z.boolean(),
});

router.post('/reception/:token/sign', async (req, res) => {
  try {
    const { token } = req.params;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const validation = signReceptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;

    if (!data.legalAccepted) {
      return res.status(400).json({ success: false, message: 'Vous devez accepter les conditions pour signer le PV de réception' });
    }

    const reception = await db.chantierReception.findUnique({
      where: { clientAccessToken: token },
    });

    if (!reception) {
      return res.status(404).json({ success: false, message: 'Lien de réception invalide' });
    }

    if (reception.clientTokenExpiresAt && reception.clientTokenExpiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Ce lien a expiré' });
    }

    if (reception.clientSignedAt) {
      return res.status(409).json({ success: false, message: 'Ce PV a déjà été signé' });
    }

    const hasReserves = data.reserves && data.reserves.length > 0;
    const avgRating = data.satisfactionAnswers
      ? data.satisfactionAnswers.filter(a => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) / (data.satisfactionAnswers.filter(a => a.rating).length || 1)
      : null;

    await db.$transaction(async (tx) => {
      await tx.chantierReception.update({
        where: { id: reception.id },
        data: {
          status: hasReserves ? 'ACCEPTED_WITH_RESERVES' : 'ACCEPTED',
          clientName: data.clientName,
          clientSignature: data.clientSignature,
          clientSignedAt: new Date(),
          clientIpAddress: ip,
          clientUserAgent: userAgent,
          checklist: data.checklist as any,
          satisfactionRating: avgRating ? Math.round(avgRating) : null,
          satisfactionAnswers: data.satisfactionAnswers as any,
          legalAccepted: true,
          legalAcceptedAt: new Date(),
          hasReserves,
          reserves: hasReserves ? data.reserves as any : null,
          updatedAt: new Date(),
        }
      });

      // Historique
      await tx.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId: reception.chantierId,
          action: 'RECEPTION_SIGNED',
          toValue: hasReserves ? 'ACCEPTED_WITH_RESERVES' : 'ACCEPTED',
          data: {
            receptionId: reception.id,
            clientName: data.clientName,
            signedAt: new Date().toISOString(),
            ip,
            hasReserves,
            reserveCount: data.reserves?.length || 0,
            satisfactionRating: avgRating,
          },
        }
      });
    });

    // Notifier les admins
    try {
      const chantier = await db.chantier.findUnique({
        where: { id: reception.chantierId },
        select: { organizationId: true, clientName: true },
      });
      if (chantier) {
        const adminsRaw2 = await db.userOrganization.findMany({
          where: { organizationId: chantier.organizationId, status: 'ACTIVE' },
          include: {
            User: { select: { id: true } },
            Role: { select: { name: true } },
          },
        });
        const receptionAdmins = adminsRaw2
          .filter(u => {
            const roleName = u.Role?.name?.toLowerCase() || '';
            return roleName.includes('admin') || roleName.includes('super');
          })
          .map(u => ({ userId: u.User.id }));
        for (const admin of receptionAdmins) {
          await createChantierNotifWithPush({
            data: {
              id: crypto.randomUUID(),
              userId: admin.userId,
              organizationId: chantier.organizationId,
              type: hasReserves ? 'CHANTIER_PROBLEM_REPORTED' : 'CHANTIER_VISIT_VALIDATED',
              data: {
                title: hasReserves ? '⚠️ PV signé avec réserves' : '✅ PV de réception signé',
                message: `${data.clientName} a signé le PV de réception pour "${chantier.clientName}"${hasReserves ? ` avec ${data.reserves!.length} réserve(s)` : ''}`,
                link: `/chantiers/${reception.chantierId}?tab=reception`,
              },
              status: 'PENDING',
              updatedAt: new Date(),
            }
          });
        }
      }
    } catch (notifError) {
      console.error('[ChantierWorkflow] Erreur notification reception sign:', notifError);
    }

    res.json({
      success: true,
      message: hasReserves
        ? 'PV de réception signé avec réserves — L\'entreprise a été notifiée'
        : 'PV de réception signé ✅ — Merci pour votre confiance',
      data: { status: hasReserves ? 'ACCEPTED_WITH_RESERVES' : 'ACCEPTED' }
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /reception/:token/sign:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * GET /api/chantier-workflow/chantiers/:chantierId/reception
 * Récupère la réception d'un chantier (pour l'admin/tech)
 */
router.get('/chantiers/:chantierId/reception', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const chantier = await db.chantier.findFirst({
      where: { id: chantierId, organizationId },
    });
    if (!chantier) {
      return res.status(404).json({ success: false, message: 'Chantier non trouvé' });
    }

    const reception = await db.chantierReception.findUnique({
      where: { chantierId },
    });

    res.json({ success: true, data: reception });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur GET reception:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

/**
 * POST /api/chantier-workflow/chantiers/:chantierId/reception/send-to-client
 * Envoie le lien de réception au client par email
 */
router.post('/chantiers/:chantierId/reception/send-to-client', authenticateToken, async (req, res) => {
  try {
    const { chantierId } = req.params;
    const user = (req as any).user;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const reception = await db.chantierReception.findUnique({
      where: { chantierId },
    });

    if (!reception) {
      return res.status(404).json({ success: false, message: 'Réception non trouvée — veuillez d\'abord la préparer' });
    }

    if (!reception.clientEmail) {
      return res.status(400).json({ success: false, message: 'Email client manquant' });
    }

    // Mettre à jour le statut
    await db.chantierReception.update({
      where: { id: reception.id },
      data: { status: 'PENDING_CLIENT', updatedAt: new Date() },
    });

    // Récupérer les infos pour l'email
    const chantier = await db.chantier.findFirst({
      where: { id: chantierId },
      select: {
        clientName: true,
        siteAddress: true,
        Organization: { select: { name: true } },
      }
    });

    // Envoyer l'email (réutiliser le pattern existant)
    try {
      const emailAccount = await db.emailAccount.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });

      if (emailAccount?.encryptedPassword) {
        const decryptedPassword = decrypt(emailAccount.encryptedPassword);
        let smtpHost = 'smtp.gmail.com';
        let smtpPort = 587;
        const provider = (emailAccount as any).mailProvider || '';
        if (provider === 'outlook' || provider === 'hotmail') { smtpHost = 'smtp.office365.com'; smtpPort = 587; }
        else if (provider === 'one.com' || provider === 'one') { smtpHost = 'send.one.com'; smtpPort = 465; }

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: emailAccount.emailAddress, pass: decryptedPassword },
        });

        const receptionUrl = `${req.headers.origin || 'https://www.zhiive.com'}/reception/${reception.clientAccessToken}`;

        await transporter.sendMail({
          from: emailAccount.emailAddress,
          to: reception.clientEmail,
          subject: `Réception de vos travaux — ${chantier?.Organization?.name || '2Thier'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Bonjour ${reception.clientName},</h2>
              <p>Les travaux réalisés à l'adresse <strong>${chantier?.siteAddress || 'votre domicile'}</strong> sont terminés.</p>
              <p>Nous vous invitons à consulter et signer le procès-verbal de réception en cliquant sur le button ci-dessous :</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${receptionUrl}" style="background-color: #52c41a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  📝 Signer le PV de réception
                </a>
              </div>
              <p style="color: #666; font-size: 13px;">Ce lien est valide pendant 30 jours. Si vous rencontrez des problèmes, contactez-nous.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">${chantier?.Organization?.name || '2Thier'}</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error('[ChantierWorkflow] Erreur envoi email reception:', emailError);
      // Ne pas bloquer — l'email est optionnel
    }

    // Historique
    await db.chantierHistory.create({
      data: {
        id: crypto.randomUUID(),
        chantierId,
        action: 'RECEPTION_SENT_TO_CLIENT',
        userId: user?.userId || user?.id,
        data: { email: reception.clientEmail },
      }
    });

    res.json({
      success: true,
      message: `Lien de réception envoyé à ${reception.clientEmail}`,
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST send-to-client:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// SEED — Initialiser les transitions et templates par défaut
// Réutilise le même pattern que POST /api/chantier-statuses/seed
// ═══════════════════════════════════════════════════════

/**
 * POST /api/chantier-workflow/seed
 * Initialise les transitions et templates de factures par défaut pour une organisation.
 * Accepte { force: true } pour supprimer les données existantes et re-seeder.
 */
router.post('/seed', authenticateToken, isAdmin, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const { force } = req.body || {};

    // Vérifier s'il y a déjà des données
    const existingTransitions = await db.chantierStatusTransition.count({ where: { organizationId } });
    const existingTemplates = await db.chantierInvoiceTemplate.count({ where: { organizationId } });

    if ((existingTransitions > 0 || existingTemplates > 0) && !force) {
      return res.status(400).json({
        success: false,
        message: 'Le workflow est déjà configuré. Utilisez "Réinitialiser" pour re-créer les données par défaut.',
        hasData: { transitions: existingTransitions, templates: existingTemplates },
      });
    }

    // Si force, supprimer les données existantes
    if (force) {
      await db.chantierStatusTransition.deleteMany({ where: { organizationId } });
      await db.chantierInvoiceTemplate.deleteMany({ where: { organizationId } });
    }

    // Récupérer les statuts existants pour mapper par nom
    const statuses = await db.chantierStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
    });

    if (statuses.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun statut de chantier trouvé. Créez d\'abord les statuts.' });
    }

    // Match exact (case-insensitive) sur le nom du statut
    const findStatus = (name: string) =>
      statuses.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim());

    const results: { transitions: number; templates: number; skipped: string[] } = { transitions: 0, templates: 0, skipped: [] };

    // ─── SEED TRANSITIONS ───
    // Pipeline actuel (10 étapes, order 0-9):
    //   Nouveau(0) → Visite technique(1) → Commande(2) → Réception commande(3) →
    //   Planification(4) → Fin de chantier(5) → Réception(6) → Terminé(7) → SAV(8) → Annulé(9)
    const transitionDefs: Array<{
      fromName: string;
      toName: string;
      triggerType: string;
      label: string;
      allowedRoles?: string[];
      sendEmail?: boolean;
      notifyRoles?: string[];
    }> = [
      // ── Pipeline principal (avancement normal) ──
      { fromName: 'Nouveau', toName: 'Visite technique', triggerType: 'MANUAL', label: 'Planifier visite technique', allowedRoles: ['admin', 'commercial'] },
      { fromName: 'Visite technique', toName: 'Commande', triggerType: 'MANUAL', label: 'Valider visite → Commande', allowedRoles: ['admin', 'commercial'], notifyRoles: ['comptable'], sendEmail: false },
      { fromName: 'Commande', toName: 'Réception commande', triggerType: 'MANUAL', label: 'Commande passée → Attente réception', allowedRoles: ['admin', 'commercial'] },
      { fromName: 'Réception commande', toName: 'Planification', triggerType: 'MANUAL', label: 'Matériel reçu → Planifier le chantier', allowedRoles: ['admin', 'commercial'] },
      { fromName: 'Planification', toName: 'Fin de chantier', triggerType: 'MANUAL', label: 'Chantier réalisé → Fin de chantier', allowedRoles: ['admin', 'commercial', 'technicien'], notifyRoles: ['comptable', 'admin'], sendEmail: true },
      { fromName: 'Fin de chantier', toName: 'Réception', triggerType: 'MANUAL', label: 'Lancer la réception client', allowedRoles: ['admin', 'commercial'] },
      { fromName: 'Réception', toName: 'Terminé', triggerType: 'MANUAL', label: 'Réception OK → Terminé', allowedRoles: ['admin', 'commercial'], notifyRoles: ['comptable', 'admin'], sendEmail: true },

      // ── Auto-transitions ──
      { fromName: 'Visite technique', toName: 'Commande', triggerType: 'AUTO_VISIT_VALIDATED', label: 'Auto: visite validée → Commande', notifyRoles: ['comptable', 'admin'], sendEmail: true },
      { fromName: 'Réception commande', toName: 'Planification', triggerType: 'AUTO_MATERIAL_RECEIVED', label: 'Auto: matériel reçu → Planification', notifyRoles: ['admin', 'commercial'], sendEmail: true },
      { fromName: 'Fin de chantier', toName: 'Réception', triggerType: 'AUTO_INVOICE_PAID', label: 'Auto: factures payées → Réception', notifyRoles: ['admin', 'commercial'], sendEmail: true },

      // ── Retours (corrections) ──
      { fromName: 'Visite technique', toName: 'Nouveau', triggerType: 'MANUAL', label: 'Retour en attente', allowedRoles: ['admin', 'commercial'] },
      { fromName: 'Commande', toName: 'Visite technique', triggerType: 'MANUAL', label: 'Refaire visite technique', allowedRoles: ['admin'] },
      { fromName: 'Réception commande', toName: 'Commande', triggerType: 'MANUAL', label: 'Problème réception → Retour commande', allowedRoles: ['admin'] },
      { fromName: 'Planification', toName: 'Réception commande', triggerType: 'MANUAL', label: 'Retour en attente matériel', allowedRoles: ['admin'] },
      { fromName: 'Fin de chantier', toName: 'Planification', triggerType: 'MANUAL', label: 'Travaux supplémentaires', allowedRoles: ['admin'] },

      // ── SAV (depuis Terminé) ──
      { fromName: 'Terminé', toName: 'SAV', triggerType: 'MANUAL', label: 'Ouvrir un SAV', allowedRoles: ['admin', 'commercial', 'technicien'] },
      { fromName: 'SAV', toName: 'Terminé', triggerType: 'MANUAL', label: 'Clôturer le SAV', allowedRoles: ['admin', 'commercial'] },

      // ── Annulation (depuis tout statut actif) ──
      { fromName: 'Nouveau', toName: 'Annulé', triggerType: 'MANUAL', label: 'Annuler (nouveau)', allowedRoles: ['admin'] },
      { fromName: 'Visite technique', toName: 'Annulé', triggerType: 'MANUAL', label: 'Annuler (visite)', allowedRoles: ['admin'] },
      { fromName: 'Commande', toName: 'Annulé', triggerType: 'MANUAL', label: 'Annuler (commande)', allowedRoles: ['admin'], notifyRoles: ['comptable'], sendEmail: true },
      { fromName: 'Réception commande', toName: 'Annulé', triggerType: 'MANUAL', label: 'Annuler (en attente)', allowedRoles: ['admin'] },
      { fromName: 'Planification', toName: 'Annulé', triggerType: 'MANUAL', label: 'Annuler (planifié)', allowedRoles: ['admin'] },
      { fromName: 'Fin de chantier', toName: 'Annulé', triggerType: 'MANUAL', label: 'Annuler (fin chantier)', allowedRoles: ['admin'], notifyRoles: ['commercial', 'comptable'], sendEmail: true },
    ];

    let order = 0;
    for (const def of transitionDefs) {
      const fromStatus = findStatus(def.fromName);
      const toStatus = findStatus(def.toName);
      if (!fromStatus || !toStatus) {
        results.skipped.push(`${def.fromName} → ${def.toName} (statut introuvable)`);
        continue;
      }

      await db.chantierStatusTransition.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          fromStatusId: fromStatus.id,
          toStatusId: toStatus.id,
          triggerType: def.triggerType,
          label: def.label,
          allowedRoles: def.allowedRoles || undefined,
          notifyRoles: def.notifyRoles || undefined,
          sendEmail: def.sendEmail || false,
          isActive: true,
          order: order++,
          updatedAt: new Date(),
        }
      });
      results.transitions++;
    }

    // ─── SEED TEMPLATES FACTURES ───
    // Le statusName = "pour quitter CE statut, cette facture doit être payée si isRequired"
    // Pipeline: Nouveau → Visite technique → Commande → Réception commande → Planification → Fin de chantier → Réception → Terminé
    const templateDefs = [
      { type: 'ACOMPTE', label: 'Acompte 30%', percentage: 30, statusName: 'Nouveau', isRequired: true, order: 0 },
      { type: 'MATERIEL', label: 'Facture matériel', percentage: null, statusName: 'Commande', isRequired: false, order: 1 },
      { type: 'FIN_CHANTIER', label: 'Facture fin de chantier 60%', percentage: 60, statusName: 'Fin de chantier', isRequired: true, order: 2 },
      { type: 'RECEPTION', label: 'Facture réception (solde 10%)', percentage: 10, statusName: 'Réception', isRequired: true, order: 3 },
    ];

    for (const tpl of templateDefs) {
      const status = tpl.statusName ? findStatus(tpl.statusName) : null;
      if (tpl.statusName && !status) {
        results.skipped.push(`Template "${tpl.label}" → statut "${tpl.statusName}" introuvable`);
      }
      await db.chantierInvoiceTemplate.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          statusId: status?.id || null,
          type: tpl.type,
          label: tpl.label,
          percentage: tpl.percentage,
          isRequired: tpl.isRequired,
          isActive: true,
          order: tpl.order,
          updatedAt: new Date(),
        }
      });
      results.templates++;
    }

    console.log(`[ChantierWorkflow] Seed terminé pour org ${organizationId}: ${results.transitions} transitions, ${results.templates} templates${results.skipped.length ? `, ${results.skipped.length} ignorés` : ''}`);

    res.status(201).json({
      success: true,
      data: results,
      message: `Workflow initialisé : ${results.transitions} transitions, ${results.templates} templates de factures${results.skipped.length ? `. ${results.skipped.length} ignoré(s).` : ''}`
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /seed:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

export { sendTransitionNotifications };

// ═══════════════════════════════════════════════════
// ═══ COMMERCIAL CORRECTION TRACKING ═══════════════
// ═══════════════════════════════════════════════════

/**
 * POST /api/chantier-workflow/events/:id/submit-commercial-correction
 * Enregistre les corrections effectuées par le commercial sur un devis "À rectifier".
 * Crée des TechnicianFieldReview avec reviewType='COMMERCIAL_CORRECTION'
 * pour garder la trace complète : original → technicien → commercial.
 */
router.post('/events/:id/submit-commercial-correction', authenticateToken, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const user = (req as any).user;
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = user?.userId || user?.id;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const { corrections } = req.body as {
      corrections: Array<{
        nodeId: string;
        correctedValue: string | null;
        correctionNote?: string;
      }>;
    };

    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune correction fournie' });
    }

    // Charger l'événement avec les reviews technicien existantes
    const event = await db.chantierEvent.findFirst({
      where: { id: eventId },
      include: {
        Chantier: {
          select: {
            id: true,
            organizationId: true,
            leadId: true,
            submissionId: true,
            TreeBranchLeafSubmission: { select: { id: true, treeId: true } },
          },
        },
        TechnicianFieldReviews: {
          where: { reviewType: 'TECHNICAL', isModified: true },
        },
      },
    });

    if (!event || event.Chantier.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // Map des modifications technicien pour référence
    const techReviewMap = new Map(
      event.TechnicianFieldReviews.map((r) => [r.nodeId, r])
    );

    // Récupérer les labels des nodes
    const nodeIds = corrections.map((c) => c.nodeId);
    const submission = event.Chantier.TreeBranchLeafSubmission;
    const nodes = submission
      ? await db.treeBranchLeafNode.findMany({
          where: { id: { in: nodeIds }, treeId: submission.treeId },
          select: { id: true, label: true },
        })
      : [];
    const nodeLabels = new Map(nodes.map((n) => [n.id, n.label]));

    // Transaction : sauvegarder les corrections commerciales
    await db.$transaction(async (tx) => {
      // Supprimer les corrections commerciales précédentes (si re-correction)
      await tx.technicianFieldReview.deleteMany({
        where: { chantierEventId: eventId, reviewType: 'COMMERCIAL_CORRECTION' },
      });

      for (const correction of corrections) {
        const techReview = techReviewMap.get(correction.nodeId);
        await tx.technicianFieldReview.create({
          data: {
            chantierEventId: eventId,
            nodeId: correction.nodeId,
            fieldLabel: nodeLabels.get(correction.nodeId) || techReview?.fieldLabel || 'Champ inconnu',
            originalValue: techReview?.originalValue || null, // Valeur initiale du devis
            reviewedValue: correction.correctedValue, // Nouvelle valeur du commercial
            isModified: true,
            modificationNote: correction.correctionNote || 'Correction commerciale',
            reviewType: 'COMMERCIAL_CORRECTION',
            reviewedById: userId,
          },
        });
      }

      // Historique chantier
      await tx.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId: event.Chantier.id,
          action: 'COMMERCIAL_CORRECTION_SUBMITTED',
          fromValue: 'À rectifier',
          toValue: 'Corrections soumises',
          userId,
          data: {
            eventId,
            totalCorrections: corrections.length,
            correctedFields: corrections.map((c) => ({
              nodeId: c.nodeId,
              fieldLabel: nodeLabels.get(c.nodeId),
              correctedValue: c.correctedValue,
              note: c.correctionNote,
              technicianValue: techReviewMap.get(c.nodeId)?.reviewedValue,
              originalValue: techReviewMap.get(c.nodeId)?.originalValue,
            })),
            submittedAt: new Date().toISOString(),
          },
        },
      });
    });

    console.log(
      `[ChantierWorkflow] ${corrections.length} corrections commerciales enregistrées pour event ${eventId}`
    );

    res.json({
      success: true,
      message: `${corrections.length} correction(s) enregistrée(s)`,
      data: { totalCorrections: corrections.length },
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /events/:id/submit-commercial-correction:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

export default router;

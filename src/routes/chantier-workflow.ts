import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/crypto.js';

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
// INVOICES — Factures réelles liées aux chantiers
// ═══════════════════════════════════════════════════════

const invoiceSchema = z.object({
  type: z.enum(['ACOMPTE', 'MATERIEL', 'FIN_CHANTIER', 'RECEPTION', 'CUSTOM']).default('CUSTOM'),
  label: z.string().min(1),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  dueDate: z.string().optional(),
  documentUrl: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  order: z.number().int().min(0).default(0),
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
  calendarEventId: z.string().optional(),
  type: z.enum(['VISITE_TECHNIQUE', 'CHANTIER', 'RECEPTION', 'CUSTOM']).default('CUSTOM'),
  status: z.enum(['PLANNED', 'COMPLETED', 'CANCELLED', 'PROBLEM']).default('PLANNED'),
  problemNote: z.string().optional(),
  subcontractAmount: z.number().min(0).nullable().optional(),
  notes: z.string().optional(),
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
router.post('/chantiers/:chantierId/events', authenticateToken, async (req, res) => {
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
router.put('/events/:id', authenticateToken, async (req, res) => {
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
    if (!action) {
      return res.status(400).json({ success: false, message: 'Action requise' });
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
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: u.User.id,
          organizationId,
          type: 'CHANTIER_STATUS_CHANGED',
          title: `Chantier "${chantierLabel}" déplacé`,
          message: `${fromStatus?.name || '?'} → ${toStatus?.name || '?'}`,
          data: { chantierId, fromStatusId, toStatusId },
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
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: chantier.commercialId,
          organizationId,
          type: 'CHANTIER_PROBLEM_REPORTED',
          title: `⚠️ Problème signalé — ${chantierLabel}`,
          message: `${reporterName}: ${problemNote}`,
          data: { chantierId, problemNote },
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

      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: admin.User.id,
          organizationId,
          type: 'CHANTIER_PROBLEM_REPORTED',
          title: `⚠️ Problème signalé — ${chantierLabel}`,
          message: `${reporterName}: ${problemNote}`,
          data: { chantierId, problemNote },
        }
      });
    }
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur notifyProblem:', error);
  }
}

// ═══════════════════════════════════════════════════════
// SEED — Initialiser les transitions et templates par défaut
// Réutilise le même pattern que POST /api/chantier-statuses/seed
// ═══════════════════════════════════════════════════════

/**
 * POST /api/chantier-workflow/seed
 * Initialise les transitions et templates de factures par défaut pour une organisation
 * Ne fait rien si des transitions existent déjà
 */
router.post('/seed', authenticateToken, isAdmin, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    // Vérifier s'il y a déjà des données
    const existingTransitions = await db.chantierStatusTransition.count({ where: { organizationId } });
    const existingTemplates = await db.chantierInvoiceTemplate.count({ where: { organizationId } });

    if (existingTransitions > 0 && existingTemplates > 0) {
      return res.status(400).json({ success: false, message: 'Le workflow est déjà configuré pour cette organisation' });
    }

    // Récupérer les statuts existants pour mapper par nom
    const statuses = await db.chantierStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
    });

    if (statuses.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun statut de chantier trouvé. Créez d\'abord les statuts.' });
    }

    const findStatus = (name: string) => statuses.find(s => s.name.toLowerCase().includes(name.toLowerCase()));

    const results: { transitions: number; templates: number } = { transitions: 0, templates: 0 };

    // ─── SEED TRANSITIONS (si pas existantes) ───
    if (existingTransitions === 0) {
      // Défaut : tout le monde peut drag-drop entre tous les statuts (modulable ensuite)
      // On crée les transitions logiques du workflow standard
      const transitionDefs: Array<{
        fromName: string;
        toName: string;
        triggerType: string;
        label: string;
        allowedRoles?: string[];
        sendEmail?: boolean;
        notifyRoles?: string[];
      }> = [
        // ── Pipeline principal (8 étapes) ──
        // Phase pré-chantier
        { fromName: 'nouveau', toName: 'visite technique', triggerType: 'MANUAL', label: 'Planifier visite technique', allowedRoles: ['admin', 'commercial'] },
        { fromName: 'visite technique', toName: 'commande', triggerType: 'MANUAL', label: 'Valider visite → Commande', allowedRoles: ['admin', 'commercial'], notifyRoles: ['comptable'], sendEmail: false },
        { fromName: 'commande', toName: 'planifié', triggerType: 'MANUAL', label: 'Planifier le chantier', allowedRoles: ['admin', 'commercial'] },
        // Phase chantier
        { fromName: 'planifié', toName: 'en cours', triggerType: 'MANUAL', label: 'Démarrer le chantier', allowedRoles: ['admin', 'commercial', 'technicien'] },
        { fromName: 'en cours', toName: 'terminé', triggerType: 'MANUAL', label: 'Marquer terminé', allowedRoles: ['admin', 'technicien'], notifyRoles: ['commercial', 'admin', 'comptable'], sendEmail: true },
        // Phase post-chantier
        { fromName: 'terminé', toName: 'réception', triggerType: 'MANUAL', label: 'Lancer la réception', allowedRoles: ['admin', 'commercial'] },
        // Auto-transition: quand toutes les factures requises sont payées → Réception validée automatiquement
        { fromName: 'terminé', toName: 'réception', triggerType: 'AUTO_INVOICE_PAID', label: 'Auto: factures payées → Réception', notifyRoles: ['admin', 'commercial'], sendEmail: true },

        // ── Retours et mises en pause ──
        { fromName: 'visite technique', toName: 'nouveau', triggerType: 'MANUAL', label: 'Retour en attente', allowedRoles: ['admin', 'commercial'] },
        { fromName: 'commande', toName: 'visite technique', triggerType: 'MANUAL', label: 'Refaire visite technique', allowedRoles: ['admin'] },
        { fromName: 'planifié', toName: 'commande', triggerType: 'MANUAL', label: 'Retour en commande', allowedRoles: ['admin'] },

        // ── Annulation (depuis tout statut actif) ──
        { fromName: 'nouveau', toName: 'annulé', triggerType: 'MANUAL', label: 'Annuler (nouveau)', allowedRoles: ['admin'] },
        { fromName: 'visite technique', toName: 'annulé', triggerType: 'MANUAL', label: 'Annuler (visite)', allowedRoles: ['admin'] },
        { fromName: 'commande', toName: 'annulé', triggerType: 'MANUAL', label: 'Annuler (commande)', allowedRoles: ['admin'] },
        { fromName: 'planifié', toName: 'annulé', triggerType: 'MANUAL', label: 'Annuler avant démarrage', allowedRoles: ['admin'] },
        { fromName: 'en cours', toName: 'annulé', triggerType: 'MANUAL', label: 'Annuler chantier en cours', allowedRoles: ['admin'], notifyRoles: ['commercial', 'comptable'], sendEmail: true },
      ];

      let order = 0;
      for (const def of transitionDefs) {
        const fromStatus = findStatus(def.fromName);
        const toStatus = findStatus(def.toName);
        if (!fromStatus || !toStatus) continue;

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
    }

    // ─── SEED TEMPLATES FACTURES (si pas existants) ───
    if (existingTemplates === 0) {
      const templateDefs = [
        { type: 'ACOMPTE', label: 'Acompte 30%', percentage: 30, statusName: 'commande', isRequired: true, order: 0 },
        { type: 'MATERIEL', label: 'Facture matériel', percentage: null, statusName: 'en cours', isRequired: false, order: 1 },
        { type: 'FIN_CHANTIER', label: 'Facture fin de chantier 60%', percentage: 60, statusName: 'terminé', isRequired: true, order: 2 },
        { type: 'RECEPTION', label: 'Facture réception (solde 10%)', percentage: 10, statusName: 'réception', isRequired: true, order: 3 },
      ];

      for (const tpl of templateDefs) {
        const status = tpl.statusName ? findStatus(tpl.statusName) : null;
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
    }

    console.log(`[ChantierWorkflow] Seed terminé pour org ${organizationId}: ${results.transitions} transitions, ${results.templates} templates`);

    res.status(201).json({
      success: true,
      data: results,
      message: `Workflow initialisé : ${results.transitions} transitions, ${results.templates} templates de factures`
    });
  } catch (error) {
    console.error('[ChantierWorkflow] Erreur POST /seed:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

export { sendTransitionNotifications };
export default router;

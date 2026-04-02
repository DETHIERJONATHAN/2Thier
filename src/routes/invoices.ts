/**
 * Routes API Factures — Gestion unifiée des factures
 * 
 * Endpoints:
 *   GET    /api/invoices              — Lister TOUTES les factures (standalone + chantier + peppol incoming)
 *   GET    /api/invoices/stats        — Stats dashboard (total, payé, en attente, en retard)
 *   POST   /api/invoices              — Créer une facture standalone
 *   GET    /api/invoices/:id          — Détail d'une facture standalone
 *   PUT    /api/invoices/:id          — Mettre à jour une facture standalone
 *   DELETE /api/invoices/:id          — Supprimer une facture standalone (DRAFT uniquement)
 *   POST   /api/invoices/:id/mark-paid — Marquer une facture comme payée
 *   POST   /api/invoices/:id/mark-sent — Marquer une facture comme envoyée
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const router = Router();

// ── Types ──

interface AuthUser {
  userId?: string;
  id?: string;
}

interface UnifiedInvoiceRow {
  id: string;
  source: 'standalone' | 'chantier' | 'incoming';
  invoiceNumber: string;
  clientName: string;
  clientVat?: string | null;
  description?: string | null;
  amount: number;
  status: string;
  issueDate: Date | string | null;
  dueDate?: Date | string | null;
  paidAt?: Date | string | null;
  peppolStatus?: string | null;
  chantierId?: string | null;
  createdAt: Date | string;
}

// ── Helpers ──

function getOrganizationId(req: Request): string | null {
  return (req.headers['x-organization-id'] as string) || null;
}

function getUserId(req: Request): string | null {
  const user = (req as unknown as { user?: AuthUser }).user;
  return user?.userId || user?.id || null;
}

// ── GET /stats — Statistiques factures ──

router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const [standalone, chantier, incoming] = await Promise.all([
      db.standaloneInvoice.findMany({
        where: { organizationId },
        select: { status: true, totalAmount: true },
      }),
      db.chantierInvoice.findMany({
        where: { organizationId },
        select: { status: true, amount: true },
      }),
      db.peppolIncomingInvoice.findMany({
        where: { organizationId },
        select: { status: true, totalAmount: true },
      }),
    ]);

    const allOutgoing = [
      ...standalone.map(i => ({ status: i.status, amount: i.totalAmount })),
      ...chantier.map(i => ({ status: i.status, amount: i.amount })),
    ];

    const totalEmises = allOutgoing.length;
    const totalRecues = incoming.length;
    const totalPaid = allOutgoing.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.amount || 0), 0);
    const totalPending = allOutgoing.filter(i => ['SENT', 'DRAFT'].includes(i.status)).reduce((s, i) => s + (i.amount || 0), 0);
    const totalOverdue = allOutgoing.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (i.amount || 0), 0);
    const totalAmount = allOutgoing.reduce((s, i) => s + (i.amount || 0), 0);
    const totalDrafts = allOutgoing.filter(i => i.status === 'DRAFT').length;

    return res.json({
      success: true,
      data: { totalEmises, totalRecues, totalPaid, totalPending, totalOverdue, totalAmount, totalDrafts },
    });
  } catch (error: unknown) {
    console.error('[INVOICES] Stats error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── GET / — Lister toutes les factures (unifiées) ──

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const filter = (req.query.filter as string) || 'all'; // all | outgoing | incoming | draft
    const search = (req.query.search as string) || '';

    const results: UnifiedInvoiceRow[] = [];

    // ── Standalone invoices ──
    if (['all', 'outgoing', 'draft'].includes(filter)) {
      const where: Prisma.StandaloneInvoiceWhereInput = { organizationId };
      if (filter === 'draft') where.status = 'DRAFT';
      if (search) {
        where.OR = [
          { clientName: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      const invoices = await db.standaloneInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      invoices.forEach(inv => {
        results.push({
          id: inv.id,
          source: 'standalone',
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          clientVat: inv.clientVat,
          description: inv.description,
          amount: inv.totalAmount,
          status: inv.status,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          peppolStatus: inv.peppolStatus,
          createdAt: inv.createdAt,
        });
      });
    }

    // ── Chantier invoices ──
    if (['all', 'outgoing'].includes(filter)) {
      const chantierWhere: Prisma.ChantierInvoiceWhereInput = { organizationId };
      if (search) {
        chantierWhere.OR = [
          { label: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { Chantier: { clientName: { contains: search, mode: 'insensitive' } } },
        ];
      }
      const chantierInvoices = await db.chantierInvoice.findMany({
        where: chantierWhere,
        include: { Chantier: { select: { clientName: true, productLabel: true, id: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      chantierInvoices.forEach(inv => {
        results.push({
          id: inv.id,
          source: 'chantier',
          chantierId: inv.chantierId,
          invoiceNumber: inv.invoiceNumber || `CH-${inv.id.slice(0, 8)}`,
          clientName: inv.Chantier?.clientName || 'Client chantier',
          description: `${inv.Chantier?.productLabel || ''} — ${inv.label}`,
          amount: inv.amount,
          status: inv.status,
          issueDate: inv.createdAt,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          peppolStatus: inv.peppolStatus,
          createdAt: inv.createdAt,
        });
      });
    }

    // ── Peppol incoming invoices ──
    if (['all', 'incoming'].includes(filter)) {
      const incomingWhere: Prisma.PeppolIncomingInvoiceWhereInput = { organizationId };
      if (search) {
        incomingWhere.OR = [
          { senderName: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
        ];
      }
      const incoming = await db.peppolIncomingInvoice.findMany({
        where: incomingWhere,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      incoming.forEach(inv => {
        results.push({
          id: inv.id,
          source: 'incoming',
          invoiceNumber: inv.invoiceNumber || inv.peppolMessageId,
          clientName: inv.senderName || 'Fournisseur Peppol',
          description: `Facture reçue de ${inv.senderName || inv.senderEndpoint}`,
          amount: inv.totalAmount,
          status: inv.status,
          issueDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          peppolStatus: 'RECEIVED',
          createdAt: inv.createdAt,
        });
      });
    }

    // Sort by date desc
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, data: results });
  } catch (error: unknown) {
    console.error('[INVOICES] List error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── POST / — Créer une facture standalone ──

const createInvoiceSchema = z.object({
  clientName: z.string().min(1),
  clientVat: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  description: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  lines: z.array(z.object({
    description: z.string(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    taxRate: z.number().optional(),
  })).min(1),
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const userId = getUserId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Calcul des montants
    const taxRate = data.taxRate ?? 21;
    const subtotal = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // Génération du numéro de facture
    const year = new Date().getFullYear();
    const count = await db.standaloneInvoice.count({
      where: { organizationId, invoiceNumber: { startsWith: `FAC-${year}` } },
    });
    const invoiceNumber = `FAC-${year}-${String(count + 1).padStart(3, '0')}`;

    const invoice = await db.standaloneInvoice.create({
      data: {
        organizationId,
        invoiceNumber,
        clientName: data.clientName,
        clientVat: data.clientVat || null,
        clientEmail: data.clientEmail || null,
        clientAddress: data.clientAddress || null,
        description: data.description || null,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        taxRate,
        subtotal,
        taxAmount,
        totalAmount,
        notes: data.notes || null,
        paymentTerms: data.paymentTerms || null,
        lines: data.lines as Prisma.JsonArray,
        createdById: userId,
        status: 'DRAFT',
      },
    });

    return res.status(201).json({ success: true, data: invoice });
  } catch (error: unknown) {
    console.error('[INVOICES] Create error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── GET /:id — Détail d'une facture standalone ──

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const invoice = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!invoice) return res.status(404).json({ success: false, message: 'Facture introuvable' });

    return res.json({ success: true, data: invoice });
  } catch (error: unknown) {
    console.error('[INVOICES] Get error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── PUT /:id — Mettre à jour une facture standalone ──

const updateInvoiceSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientVat: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  lines: z.array(z.object({
    description: z.string(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    taxRate: z.number().optional(),
  })).optional(),
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const existing = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Facture introuvable' });
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Seuls les brouillons peuvent être modifiés' });
    }

    const parsed = updateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    const data = parsed.data;
    const update: Prisma.StandaloneInvoiceUpdateInput = {};

    if (data.clientName !== undefined) update.clientName = data.clientName;
    if (data.clientVat !== undefined) update.clientVat = data.clientVat || null;
    if (data.clientEmail !== undefined) update.clientEmail = data.clientEmail || null;
    if (data.clientAddress !== undefined) update.clientAddress = data.clientAddress || null;
    if (data.description !== undefined) update.description = data.description || null;
    if (data.dueDate !== undefined) update.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.notes !== undefined) update.notes = data.notes || null;
    if (data.paymentTerms !== undefined) update.paymentTerms = data.paymentTerms || null;

    if (data.lines) {
      const taxRate = data.taxRate ?? existing.taxRate;
      const subtotal = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
      const taxAmount = subtotal * (taxRate / 100);
      update.lines = data.lines;
      update.subtotal = subtotal;
      update.taxRate = taxRate;
      update.taxAmount = taxAmount;
      update.totalAmount = subtotal + taxAmount;
    } else if (data.taxRate !== undefined) {
      const subtotal = existing.subtotal;
      update.taxRate = data.taxRate;
      update.taxAmount = subtotal * (data.taxRate / 100);
      update.totalAmount = subtotal + update.taxAmount;
    }

    const invoice = await db.standaloneInvoice.update({
      where: { id: req.params.id },
      data: update,
    });

    return res.json({ success: true, data: invoice });
  } catch (error: unknown) {
    console.error('[INVOICES] Update error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── DELETE /:id — Supprimer une facture standalone (DRAFT uniquement) ──

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const existing = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Facture introuvable' });
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Seuls les brouillons peuvent être supprimés' });
    }

    await db.standaloneInvoice.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Facture supprimée' });
  } catch (error: unknown) {
    console.error('[INVOICES] Delete error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── POST /:id/mark-paid — Marquer comme payée ──

router.post('/:id/mark-paid', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    // Can be standalone or chantier invoice
    const standalone = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (standalone) {
      const invoice = await db.standaloneInvoice.update({
        where: { id: req.params.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
      return res.json({ success: true, data: invoice });
    }

    const chantier = await db.chantierInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (chantier) {
      const invoice = await db.chantierInvoice.update({
        where: { id: req.params.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
      return res.json({ success: true, data: invoice });
    }

    return res.status(404).json({ success: false, message: 'Facture introuvable' });
  } catch (error: unknown) {
    console.error('[INVOICES] Mark-paid error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── POST /:id/mark-sent — Marquer comme envoyée ──

router.post('/:id/mark-sent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const standalone = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (standalone) {
      if (standalone.status !== 'DRAFT') {
        return res.status(400).json({ success: false, message: 'Seuls les brouillons peuvent être envoyés' });
      }
      const invoice = await db.standaloneInvoice.update({
        where: { id: req.params.id },
        data: { status: 'SENT' },
      });
      return res.json({ success: true, data: invoice });
    }

    return res.status(404).json({ success: false, message: 'Facture introuvable' });
  } catch (error: unknown) {
    console.error('[INVOICES] Mark-sent error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

export default router;

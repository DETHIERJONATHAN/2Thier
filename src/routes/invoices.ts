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
import PDFDocument from 'pdfkit';
import { emailService } from '../services/EmailService';

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
  clientPhone?: string | null;
  description?: string | null;
  amount: number;
  status: string;
  issueDate: Date | string | null;
  dueDate?: Date | string | null;
  paidAt?: Date | string | null;
  peppolStatus?: string | null;
  chantierId?: string | null;
  organizationName?: string | null;
  organizationVat?: string | null;
  organizationAddress?: string | null;
  organizationPhone?: string | null;
  organizationEmail?: string | null;
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

    // Récupérer les infos de l'organisation (émetteur) — legalName prioritaire
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, legalName: true, vatNumber: true, address: true, phone: true, email: true },
    });
    const organizationName = org?.legalName || org?.name || null;
    const organizationVat = org?.vatNumber || null;
    const organizationAddress = org?.address || null;
    const organizationPhone = org?.phone || null;
    const organizationEmail = org?.email || null;

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
          organizationName,
          organizationVat, organizationAddress, organizationPhone, organizationEmail,
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
          organizationName,
          organizationVat, organizationAddress, organizationPhone, organizationEmail,
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
          organizationName,
          organizationVat, organizationAddress, organizationPhone, organizationEmail,
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

// ── POST /clients/save — Sauvegarder/mettre à jour les données d'un client ──

router.post('/clients/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const { name, vatNumber, email, phone, address } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nom du client requis' });
    }

    let client;
    if (vatNumber && typeof vatNumber === 'string' && vatNumber.trim()) {
      // Upsert par TVA (identifiant unique fiable)
      client = await db.invoiceClient.upsert({
        where: {
          organizationId_vatNumber: { organizationId, vatNumber: vatNumber.trim() },
        },
        create: {
          organizationId,
          name: name.trim(),
          vatNumber: vatNumber.trim(),
          email: email || null,
          phone: phone || null,
          address: address || null,
          invoiceCount: 0,
          totalInvoiced: 0,
        },
        update: {
          name: name.trim(),
          email: email || null,
          phone: phone || null,
          address: address || null,
        },
      });
    } else {
      // Sans TVA → chercher par nom exact
      const existing = await db.invoiceClient.findFirst({
        where: { organizationId, name: name.trim(), vatNumber: null },
      });
      if (existing) {
        client = await db.invoiceClient.update({
          where: { id: existing.id },
          data: {
            email: email || null,
            phone: phone || null,
            address: address || null,
          },
        });
      } else {
        client = await db.invoiceClient.create({
          data: {
            organizationId,
            name: name.trim(),
            email: email || null,
            phone: phone || null,
            address: address || null,
            invoiceCount: 0,
            totalInvoiced: 0,
          },
        });
      }
    }

    console.log(`[INVOICES] Client saved: ${client.name} (${client.vatNumber || 'no VAT'})`);
    return res.json({ success: true, data: client });
  } catch (error: unknown) {
    console.error('[INVOICES] Client save error:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

// ── GET /clients/search — Rechercher des clients enregistrés (autocomplete) ──

router.get('/clients/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const q = ((req.query.q as string) || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });

    const clients = await db.invoiceClient.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { vatNumber: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { invoiceCount: 'desc' },
      take: 10,
    });

    return res.json({ success: true, data: clients });
  } catch (error: unknown) {
    console.error('[INVOICES] Client search error:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne' });
  }
});

// ── Helper: Prochain numéro de facture ──
// Cherche dans TOUTES les tables (standalone + chantier) pour le max de l'année
async function getNextInvoiceNumber(organizationId: string): Promise<{ next: number; formatted: string }> {
  const year = new Date().getFullYear();
  const prefix = `FACTURE ${year} - `;

  // Chercher dans les deux tables en parallèle
  const [standaloneInvoices, chantierInvoices] = await Promise.all([
    db.standaloneInvoice.findMany({
      where: { organizationId, invoiceNumber: { startsWith: `FACTURE ${year}` } },
      select: { invoiceNumber: true },
    }),
    db.chantierInvoice.findMany({
      where: { organizationId, invoiceNumber: { startsWith: `FACTURE ${year}` } },
      select: { invoiceNumber: true },
    }),
  ]);

  // Aussi chercher l'ancien format FAC-YYYY-NNN pour la continuité
  const [oldStandalone, oldChantier] = await Promise.all([
    db.standaloneInvoice.findMany({
      where: { organizationId, invoiceNumber: { startsWith: `FAC-${year}` } },
      select: { invoiceNumber: true },
    }),
    db.chantierInvoice.findMany({
      where: { organizationId, invoiceNumber: { startsWith: `FAC-${year}` } },
      select: { invoiceNumber: true },
    }),
  ]);

  // Extraire les numéros de toutes les factures
  const allNumbers: number[] = [];

  // Nouveau format: "FACTURE 2026 - 005" -> 5
  for (const inv of [...standaloneInvoices, ...chantierInvoices]) {
    const match = inv.invoiceNumber?.match(/FACTURE\s+\d{4}\s*-\s*(\d+)/);
    if (match) allNumbers.push(parseInt(match[1], 10));
  }

  // Ancien format: "FAC-2026-005" -> 5
  for (const inv of [...oldStandalone, ...oldChantier]) {
    const match = inv.invoiceNumber?.match(/FAC-\d{4}-(\d+)/);
    if (match) allNumbers.push(parseInt(match[1], 10));
  }

  const maxNum = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
  const next = maxNum + 1;

  return { next, formatted: `${prefix}${String(next).padStart(3, '0')}` };
}

// ── GET /next-number — Prochain numéro de facture disponible ──
router.get('/next-number', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });
    const result = await getNextInvoiceNumber(organizationId);
    return res.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[INVOICES] Next number error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── POST / — Créer une facture standalone ──

const createInvoiceSchema = z.object({
  clientName: z.string().min(1),
  clientVat: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  description: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  invoiceNumber: z.string().optional(),
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

    // Numéro de facture : fourni par l'utilisateur ou auto-généré
    let invoiceNumber: string;
    if (data.invoiceNumber?.trim()) {
      invoiceNumber = data.invoiceNumber.trim();
    } else {
      const autoNum = await getNextInvoiceNumber(organizationId);
      invoiceNumber = autoNum.formatted;
    }

    const invoice = await db.standaloneInvoice.create({
      data: {
        organizationId,
        invoiceNumber,
        clientName: data.clientName,
        clientVat: data.clientVat || null,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
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

    // Auto-enregistrer le client pour réutilisation future
    try {
      if (data.clientVat) {
        // Upsert par TVA (identifiant unique fiable)
        await db.invoiceClient.upsert({
          where: {
            organizationId_vatNumber: { organizationId, vatNumber: data.clientVat },
          },
          create: {
            organizationId,
            name: data.clientName,
            vatNumber: data.clientVat,
            email: data.clientEmail || null,
            phone: data.clientPhone || null,
            address: data.clientAddress || null,
            invoiceCount: 1,
            totalInvoiced: totalAmount,
          },
          update: {
            name: data.clientName,
            email: data.clientEmail || null,
            phone: data.clientPhone || null,
            address: data.clientAddress || null,
            invoiceCount: { increment: 1 },
            totalInvoiced: { increment: totalAmount },
          },
        });
      } else {
        // Pas de TVA → chercher par nom exact pour éviter les doublons
        const existing = await db.invoiceClient.findFirst({
          where: { organizationId, name: data.clientName, vatNumber: null },
        });
        if (existing) {
          await db.invoiceClient.update({
            where: { id: existing.id },
            data: {
              email: data.clientEmail || null,
              phone: data.clientPhone || null,
              address: data.clientAddress || null,
              invoiceCount: { increment: 1 },
              totalInvoiced: { increment: totalAmount },
            },
          });
        } else {
          await db.invoiceClient.create({
            data: {
              organizationId,
              name: data.clientName,
              email: data.clientEmail || null,
              phone: data.clientPhone || null,
              address: data.clientAddress || null,
              invoiceCount: 1,
              totalInvoiced: totalAmount,
            },
          });
        }
      }
    } catch (clientErr) {
      // Ne pas bloquer la création de facture si le save client échoue
      console.warn('[INVOICES] Auto-save client warning:', clientErr);
    }

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
  clientPhone: z.string().optional(),
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
    if (data.clientPhone !== undefined) update.clientPhone = data.clientPhone || null;
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
    if (existing.status !== 'DRAFT' && existing.peppolStatus !== 'ERROR') {
      return res.status(400).json({ success: false, message: 'Seuls les brouillons ou factures en erreur Peppol peuvent être supprimés' });
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

// ── GET /:id/pdf — Générer le PDF de la facture ──

// ── POST /:id/mark-peppol-sent — Marquer manuellement comme envoyée via Peppol ──

router.post('/:id/mark-peppol-sent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const { peppolRecipient } = req.body as { peppolRecipient?: string };

    const standalone = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (standalone) {
      const invoice = await db.standaloneInvoice.update({
        where: { id: req.params.id },
        data: {
          peppolStatus: 'SENT',
          peppolSentAt: new Date(),
          peppolMessageId: peppolRecipient ? `manual-${peppolRecipient}` : `manual-${Date.now()}`,
          status: standalone.status === 'DRAFT' ? 'SENT' : standalone.status,
        },
      });
      return res.json({ success: true, data: invoice });
    }

    const chantier = await db.chantierInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (chantier) {
      const invoice = await db.chantierInvoice.update({
        where: { id: req.params.id },
        data: {
          peppolStatus: 'SENT',
          peppolSentAt: new Date(),
          peppolMessageId: peppolRecipient ? `manual-${peppolRecipient}` : `manual-${Date.now()}`,
          status: chantier.status === 'DRAFT' ? 'SENT' : chantier.status,
        },
      });
      return res.json({ success: true, data: invoice });
    }

    return res.status(404).json({ success: false, message: 'Facture introuvable' });
  } catch (error: unknown) {
    console.error('[INVOICES] Mark-peppol-sent error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

interface OrgData {
  name: string;
  legalName?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  iban?: string | null;
  bankAccountHolder?: string | null;
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function generateInvoicePdf(invoice: {
  invoiceNumber: string;
  clientName: string;
  clientVat?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  description?: string | null;
  issueDate: Date | null;
  dueDate?: Date | null;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  lines: any;
}, org: OrgData): Promise<Buffer> {
  const logoBuffer = org.logoUrl ? await fetchLogoBuffer(org.logoUrl) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const blue = '#2980B9';
    const darkText = '#2c3e50';
    const gray = '#7f8c8d';
    const lightBlueBg = '#EBF5FB';
    const pageW = 595.28; // A4 width
    const pageH = 841.89; // A4 height
    const margin = 50;
    const contentW = pageW - margin * 2;

    // Helper: format currency (replace narrow no-break space U+202F with regular space for PDFKit compat)
    const fmtCur = (n: number) => n.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[\u00A0\u202F]/g, ' ') + ' €';

    // Helper: write text at exact position WITHOUT triggering page breaks
    const txt = (text: string, x: number, y: number, opts?: object) => {
      doc.text(text, x, y, { lineBreak: false, ...opts });
    };

    // ── Top blue bar ──
    doc.rect(0, 0, pageW, 8).fill(blue);

    // ── Invoice number (top left) ──
    doc.fontSize(10).fillColor(blue);
    txt(invoice.invoiceNumber, margin, 20);

    // ── Dates (top right) — always display in Europe/Brussels timezone ──
    const fmtDateSafe = (d: Date | string | null | undefined): string => {
      if (!d) return '—';
      const dt = typeof d === 'string' ? new Date(d) : d;
      return dt.toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const issueStr = fmtDateSafe(invoice.issueDate);
    const dueStr = fmtDateSafe(invoice.dueDate);
    const rightEdge = pageW - margin; // 545.28 — nothing must exceed this
    doc.fontSize(8).fillColor(gray);
    txt('Émise le', rightEdge - 130, 16);
    doc.fillColor(blue);
    doc.text(issueStr, rightEdge - 80, 16, { width: 80, align: 'right', lineBreak: false, underline: true });
    doc.fillColor(gray);
    txt('Échéance', rightEdge - 130, 28);
    doc.fillColor(blue);
    doc.text(dueStr, rightEdge - 80, 28, { width: 80, align: 'right', lineBreak: false, underline: true });

    // ── Logo (centered) ──
    let afterLogo = 50;
    if (logoBuffer) {
      try {
        const logoW = 70;
        const logoX = (pageW - logoW) / 2;
        doc.image(logoBuffer, logoX, 40, { width: logoW });
        afterLogo = 115;
      } catch { afterLogo = 50; }
    }

    // ── Separator ──
    doc.moveTo(margin, afterLogo).lineTo(pageW - margin, afterLogo).strokeColor('#ddd').lineWidth(0.5).stroke();

    // ── Two columns: De (sender) | Pour (recipient) ──
    const colY = afterLogo + 8;
    const colMid = pageW / 2;
    const displayName = org.legalName || org.name;

    // De (left)
    doc.fontSize(8).fillColor(gray);
    txt('De', margin, colY);
    doc.fontSize(11).fillColor(darkText).font('Helvetica-Bold');
    txt(displayName, margin, colY + 12);
    doc.font('Helvetica').fontSize(8).fillColor(gray);
    let sY = colY + 26;
    // Helper: split address by comma or newline, render each part on its own line
    const splitAddr = (addr: string): string[] =>
      addr.split(/[,\n]+/).map((s: string) => s.trim()).filter(Boolean);

    if (org.address) {
      const parts = splitAddr(org.address);
      parts.forEach((p: string) => { txt(p, margin, sY); sY += 11; });
    }
    if (org.vatNumber) { txt(`TVA: ${org.vatNumber}`, margin, sY); sY += 11; }
    if (org.phone) { txt(org.phone, margin, sY); sY += 11; }
    if (org.email) { txt(org.email, margin, sY); sY += 11; }

    // Pour (right)
    doc.fontSize(8).fillColor(gray);
    txt('Pour', colMid + 10, colY);
    doc.fontSize(11).fillColor(darkText).font('Helvetica-Bold');
    txt(invoice.clientName, colMid + 10, colY + 12);
    doc.font('Helvetica').fontSize(8).fillColor(gray);
    let rY = colY + 26;
    if (invoice.clientAddress) {
      const parts = splitAddr(invoice.clientAddress);
      parts.forEach((p: string) => { txt(p, colMid + 10, rY); rY += 11; });
    }
    if (invoice.clientVat) { txt(`TVA: ${invoice.clientVat}`, colMid + 10, rY); rY += 11; }
    if (invoice.clientPhone) { txt(invoice.clientPhone, colMid + 10, rY); rY += 11; }
    if (invoice.clientEmail) { txt(invoice.clientEmail, colMid + 10, rY); rY += 11; }

    // ── Lines table ──
    const tableTop = Math.max(sY, rY) + 14;

    // Column layout — calculated from RIGHT to LEFT to prevent overflow
    // rightEdge = pageW - margin = 545.28
    const colTotalW = 80;
    const colTotalX = rightEdge - colTotalW;            // 465
    const colQtyW = 50;
    const colQtyX = colTotalX - colQtyW;                // 415
    const colTaxW = 60;
    const colTaxX = colQtyX - colTaxW;                  // 355
    const colPriceW = 80;
    const colPriceX = colTaxX - colPriceW;              // 275
    const colDesc = margin + 4;                          // 54
    const colDescW = colPriceX - colDesc - 5;           // ~216

    // Table header with blue bg
    doc.rect(margin, tableTop, contentW, 18).fill(blue);
    doc.fontSize(7.5).fillColor('#fff');
    txt('Description', colDesc, tableTop + 5);
    doc.text('Prix (HTVA)', colPriceX, tableTop + 5, { width: colPriceW, align: 'right', lineBreak: false });
    doc.text('Taux de TVA', colTaxX, tableTop + 5, { width: colTaxW, align: 'center', lineBreak: false });
    doc.text('Quantité', colQtyX, tableTop + 5, { width: colQtyW, align: 'center', lineBreak: false });
    doc.text('Total', colTotalX, tableTop + 5, { width: colTotalW - 4, align: 'right', lineBreak: false });

    let y = tableTop + 20;
    const lines = Array.isArray(invoice.lines) ? invoice.lines as { description: string; quantity: number; unitPrice: number; taxRate?: number }[] : [];

    lines.forEach((line, i) => {
      const lineTotal = line.quantity * line.unitPrice;
      const lineTax = line.taxRate !== undefined ? line.taxRate : invoice.taxRate;

      // Truncate long descriptions to fit in one row
      const descText = (line.description || '').substring(0, 80);
      const rowH = 18;

      // Alternating row bg
      if (i % 2 === 0) doc.rect(margin, y, contentW, rowH).fill(lightBlueBg);

      // Description (constrained to column width)
      doc.fontSize(8).fillColor(blue);
      doc.text(descText, colDesc, y + 5, { width: colDescW, lineBreak: false });

      // Price, Tax, Qty, Total
      doc.fillColor(darkText);
      doc.text(fmtCur(line.unitPrice), colPriceX, y + 5, { width: colPriceW, align: 'right', lineBreak: false });
      doc.text(`${lineTax} %`, colTaxX, y + 5, { width: colTaxW, align: 'center', lineBreak: false });
      doc.text(String(line.quantity), colQtyX, y + 5, { width: colQtyW, align: 'center', lineBreak: false });
      doc.text(fmtCur(lineTotal), colTotalX, y + 5, { width: colTotalW - 4, align: 'right', lineBreak: false });

      y += rowH;
    });

    // ── Totals (right-aligned with table columns) ──
    y += 10;
    const labW = colTaxW + colQtyW; // label width spans Tax + Qty columns
    const labX = colTaxX;           // start at Tax column

    doc.fontSize(8.5).fillColor(gray);
    doc.text('Sous-total HTVA', labX, y, { width: labW, align: 'right', lineBreak: false });
    doc.fillColor(darkText).font('Helvetica-Bold');
    doc.text(fmtCur(invoice.subtotal), colTotalX, y, { width: colTotalW - 4, align: 'right', lineBreak: false });
    doc.font('Helvetica');
    y += 16;

    if (invoice.taxRate > 0 && invoice.taxAmount > 0) {
      doc.fillColor(gray);
      doc.text(`TVA (${invoice.taxRate}%)`, labX, y, { width: labW, align: 'right', lineBreak: false });
      doc.fillColor(darkText).font('Helvetica-Bold');
      doc.text(fmtCur(invoice.taxAmount), colTotalX, y, { width: colTotalW - 4, align: 'right', lineBreak: false });
      doc.font('Helvetica');
      y += 16;
    }

    doc.fillColor(blue).font('Helvetica-Bold').fontSize(9.5);
    doc.text('Montant dû', labX, y, { width: labW, align: 'right', lineBreak: false });
    doc.text(fmtCur(invoice.totalAmount), colTotalX, y, { width: colTotalW - 4, align: 'right', lineBreak: false });
    doc.font('Helvetica');

    // ── Autoliquidation text when TVA = 0% ──
    if (invoice.taxRate === 0) {
      y += 20;
      const autoText = 'Autoliquidation : En l\'absence de contestation par écrit dans un délai d\'un mois à compter de la réception de la facture, le client est présumé reconnaître qu\'il est un assujetti tenu au dépôt de déclarations périodiques. Si cette condition n\'est pas remplie, le client endossera, par rapport à cette condition, la responsabilité quant au paiement de la taxe, des intérêts et des amendes dus. (AR 26.10.2022, MB 10.11.2022, ed. 2, 10.11.2022, art. 13)';
      doc.fontSize(6).fillColor(gray);
      // Manual word-wrap to avoid lineBreak:true triggering page breaks
      const words = autoText.split(' ');
      let currentLine = '';
      const maxLineW = contentW;
      const autoLines: string[] = [];
      words.forEach(word => {
        const test = currentLine ? currentLine + ' ' + word : word;
        if (doc.widthOfString(test) > maxLineW) {
          autoLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      });
      if (currentLine) autoLines.push(currentLine);
      autoLines.forEach(l => { txt(l, margin, y); y += 8; });
    }

    // ── Notes ──
    if (invoice.notes) {
      y += 10;
      doc.fontSize(8).fillColor(blue).font('Helvetica-Bold');
      txt('Notes', margin, y);
      doc.font('Helvetica').fontSize(7.5).fillColor(gray);
      // Truncate notes to prevent overflow
      const notesTrunc = (invoice.notes || '').substring(0, 200);
      txt(notesTrunc, margin, y + 12);
    }

    // ── Footer (blue bar at bottom) ──
    const footerH = 36;
    const footerTop = pageH - 50 - footerH;
    doc.rect(margin, footerTop, contentW, footerH).fill(blue);

    doc.fontSize(7).fillColor('#fff');
    // Left: banking info
    let fLeftY = footerTop + 7;
    {
      const holder = org.legalName || org.name || org.bankAccountHolder || displayName;
      txt(`Titulaire: ${holder}`, margin + 10, fLeftY);
      fLeftY += 10;
    }
    if (org.iban) {
      txt(`IBAN: ${org.iban}`, margin + 10, fLeftY);
    }

    // Right: contact info
    let fRightY = footerTop + 7;
    if (org.email) {
      doc.text(org.email, margin + 10, fRightY, { width: contentW - 20, align: 'right', lineBreak: false });
      fRightY += 10;
    }
    if (org.phone) {
      doc.text(org.phone, margin + 10, fRightY, { width: contentW - 20, align: 'right', lineBreak: false });
    }

    // Page number (below footer, still within page)
    doc.fontSize(7).fillColor(gray);
    doc.text('Page 1/1', margin, footerTop + footerH + 6, { width: contentW, align: 'right', lineBreak: false });

    doc.end();
  });
}

const orgSelectForPdf = {
  name: true, legalName: true, vatNumber: true, address: true,
  phone: true, email: true, logoUrl: true, iban: true, bankAccountHolder: true,
};

router.get('/:id/pdf', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const invoice = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture introuvable' });

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: orgSelectForPdf,
    });
    if (!org) return res.status(404).json({ success: false, message: 'Organisation introuvable' });

    const pdfBuffer = await generateInvoicePdf(invoice, org);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber.replace(/\s+/g, '_')}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: unknown) {
    console.error('[INVOICES] PDF error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ── POST /:id/send-email — Envoyer la facture par email ──

const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  ccOrgEmail: z.boolean().optional(),
});

router.post('/:id/send-email', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const userId = getUserId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const invoice = await db.standaloneInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture introuvable' });

    const parsed = sendEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    const { to, subject, body, ccOrgEmail } = parsed.data;

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: orgSelectForPdf,
    });
    if (!org) return res.status(404).json({ success: false, message: 'Organisation introuvable' });

    // Générer le PDF
    const pdfBuffer = await generateInvoicePdf(invoice, org);
    const pdfFilename = `${invoice.invoiceNumber.replace(/\s+/g, '_')}.pdf`;

    // Build full recipient list (include org email as CC copy)
    const allRecipients = [...to];
    if (ccOrgEmail && org.email && !allRecipients.includes(org.email)) {
      allRecipients.push(org.email);
    }

    // Envoyer à chaque destinataire
    const errors: string[] = [];
    for (const recipient of allRecipients) {
      try {
        await emailService.sendEmail({
          to: recipient,
          subject,
          html: body,
          fromName: org.legalName || org.name || 'Zhiive',
          replyTo: org.email || undefined,
          inviterId: userId || undefined,
          organizationId,
          attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }],
        });
      } catch (err) {
        console.error(`[INVOICES] Email send failed to ${recipient}:`, err);
        errors.push(recipient);
      }
    }

    // Marquer comme envoyée si c'est un brouillon
    if (invoice.status === 'DRAFT') {
      await db.standaloneInvoice.update({
        where: { id: req.params.id },
        data: { status: 'SENT' },
      });
    }

    if (errors.length > 0) {
      return res.json({ success: true, message: `Facture envoyée (${to.length - errors.length}/${to.length} emails réussis)`, warnings: errors });
    }

    return res.json({ success: true, message: `Facture envoyée à ${to.length} destinataire(s)` });
  } catch (error: unknown) {
    console.error('[INVOICES] Send-email error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

export default router;

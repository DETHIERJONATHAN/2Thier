import { Router } from 'express';
import { db, Prisma } from '../lib/database';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';

// Enum temporaire pour les devis
enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

const router = Router();
const prisma = db;

// Appliquer l'auth à toutes les routes
router.use(authMiddleware);

// Utils
const allowedTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]: [QuoteStatus.SENT, QuoteStatus.CANCELLED],
  [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.CANCELLED, QuoteStatus.EXPIRED],
  [QuoteStatus.ACCEPTED]: [],
  [QuoteStatus.REJECTED]: [],
  [QuoteStatus.CANCELLED]: [],
  [QuoteStatus.EXPIRED]: [],
};

function canTransition(from: QuoteStatus, to: QuoteStatus) {
  return allowedTransitions[from]?.includes(to) ?? false;
}

// Générateur très simple de numéro de devis (non bloquant, unique par timestamp)
function generateQuoteNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000 + 1000); // 4 chiffres
  return `Q-${y}${m}-${seq}`;
}

// Calcul des totaux côté serveur
export type IncomingItem = {
  id?: string;
  order: number;
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number; // 0-100
  taxPct?: number; // 0-100
};

function computeItemTotals(item: IncomingItem) {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const price = Math.max(0, Number(item.unitPrice) || 0);
  const discount = Math.min(100, Math.max(0, Number(item.discountPct ?? 0)));
  const tax = Math.min(100, Math.max(0, Number(item.taxPct ?? 21)));

  const lineExclBeforeDiscount = qty * price;
  const lineExcl = round4(lineExclBeforeDiscount * (1 - discount / 100));
  const lineTax = round4(lineExcl * (tax / 100));
  const lineIncl = round4(lineExcl + lineTax);

  return { totalExcl: lineExcl, totalIncl: lineIncl };
}

function aggregateTotals(items: IncomingItem[]) {
  let subtotalExcl = 0;
  let totalIncl = 0;
  for (const it of items) {
    const { totalExcl, totalIncl: lineIncl } = computeItemTotals(it);
    subtotalExcl += totalExcl;
    totalIncl += lineIncl;
  }
  const totalTax = round4(totalIncl - subtotalExcl);
  return {
    subtotalExcl: round4(subtotalExcl),
    totalTax: round4(totalTax),
    totalIncl: round4(totalIncl),
  };
}

function round4(n: number) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

function toDecimal(value: number) {
  // Passer en string pour sécuriser la précision côté Prisma.Decimal
  return new Prisma.Decimal(value.toString());
}

// GET /api/quotes?leadId=...&status=...&page=1&pageSize=20
router.get('/', async (req, res) => {
  try {
    const { leadId, status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const { user } = req as AuthenticatedRequest;
    const organizationId = user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organisation non spécifiée' });
    }

    const where: Prisma.QuoteWhereInput = {
      organizationId,
      ...(leadId ? { leadId } : {}),
      ...(status ? { status: status as QuoteStatus } : {}),
    };

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const sizeNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 20));

    const [total, data] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (pageNum - 1) * sizeNum,
        take: sizeNum,
        include: {
          documents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    res.json({ success: true, total, page: pageNum, pageSize: sizeNum, data });
  } catch (e) {
    console.error('[QUOTES] GET list error', e);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement des devis' });
  }
});

// GET /api/quotes/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req as AuthenticatedRequest;
    const organizationId = user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { order: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!quote) return res.status(404).json({ error: 'Devis introuvable' });
    res.json(quote);
  } catch (e) {
    console.error('[QUOTES] GET detail error', e);
    res.status(500).json({ error: 'Erreur lors du chargement du devis' });
  }
});

// POST /api/quotes
router.post('/', async (req, res) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const organizationId = user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const { leadId, blockId, title, currency = 'EUR', validUntil, notes, data } = req.body as {
      leadId: string; blockId: string; title?: string; currency?: string; validUntil?: string; notes?: string; data?: unknown;
    };

    if (!leadId || !blockId) return res.status(400).json({ error: 'leadId et blockId requis' });

    // Vérifier lead appartenant à l’organisation
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) return res.status(404).json({ error: 'Lead non trouvé ou non autorisé' });

    const created = await prisma.quote.create({
      data: {
        organizationId,
        leadId,
        blockId,
        createdById: user?.userId ?? null,
        number: generateQuoteNumber(),
        status: QuoteStatus.DRAFT,
        title: title ?? null,
        version: 1,
        currency,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes ?? null,
        data: data ?? {},
        totals: {},
      },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error('[QUOTES] POST create error', e);
    res.status(500).json({ error: 'Erreur lors de la création du devis' });
  }
});

// PATCH /api/quotes/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req as AuthenticatedRequest;
    const organizationId = user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const existing = await prisma.quote.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ error: 'Devis introuvable' });

    const { title, notes, currency, validUntil, status } = req.body as Partial<{ title: string; notes: string; currency: string; validUntil: string; status: QuoteStatus }>;

    const data: Prisma.QuoteUpdateInput = {};
    if (title !== undefined) data.title = title;
    if (notes !== undefined) data.notes = notes;
    if (currency !== undefined) data.currency = currency;
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;

    if (status && status !== existing.status) {
      const from = existing.status as QuoteStatus;
      const to = status as QuoteStatus;
      if (!canTransition(from, to)) {
        return res.status(400).json({ error: `Transition de statut interdite: ${from} -> ${to}` });
      }
      data.status = to;
    }

    const updated = await prisma.quote.update({ where: { id }, data });
    res.json(updated);
  } catch (e) {
    console.error('[QUOTES] PATCH update error', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du devis' });
  }
});

// DELETE /api/quotes/:id -> soft delete en CANCELLED
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req as AuthenticatedRequest;
    const organizationId = user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const existing = await prisma.quote.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ error: 'Devis introuvable' });

    await prisma.quote.update({ where: { id }, data: { status: QuoteStatus.CANCELLED } });
    res.status(204).send();
  } catch (e) {
    console.error('[QUOTES] DELETE error', e);
    res.status(500).json({ error: 'Erreur lors de l\'annulation du devis' });
  }
});

// POST /api/quotes/:id/items -> bulk upsert ordonné + recalcul totaux
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req as AuthenticatedRequest;
    const organizationId = user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const existing = await prisma.quote.findFirst({ where: { id, organizationId } });
    if (!existing) return res.status(404).json({ error: 'Devis introuvable' });

    const items = (req.body?.items || []) as IncomingItem[];
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items doit être un tableau' });

    // Recalcul et validation
    const prepared = items
      .filter((i) => i && typeof i.label === 'string')
      .map((i) => ({
        ...i,
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        discountPct: Number(i.discountPct ?? 0),
        taxPct: Number(i.taxPct ?? 21),
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const totals = aggregateTotals(prepared);

    // Transaction: on remplace l'ensemble des lignes pour simplifier et garantir l'ordre
    await prisma.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      for (const it of prepared) {
        const { totalExcl, totalIncl } = computeItemTotals(it);
        await tx.quoteItem.create({
          data: {
            quoteId: id,
            order: it.order ?? 0,
            label: it.label,
            description: it.description ?? null,
            quantity: toDecimal(it.quantity),
            unitPrice: toDecimal(it.unitPrice),
            discountPct: toDecimal(it.discountPct ?? 0),
            taxPct: toDecimal(it.taxPct ?? 21),
            totalExcl: toDecimal(totalExcl),
            totalIncl: toDecimal(totalIncl),
          },
        });
      }
      await tx.quote.update({
        where: { id },
        data: {
          totals: {
            subtotalExcl: totals.subtotalExcl,
            totalTax: totals.totalTax,
            totalIncl: totals.totalIncl,
          },
        },
      });
    });

    const updated = await prisma.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, quote: updated });
  } catch (e) {
    console.error('[QUOTES] POST items error', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des lignes' });
  }
});

// POST /api/quotes/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req as AuthenticatedRequest;
    const organizationId = user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organisation non spécifiée' });

    const existing = await prisma.quote.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ error: 'Devis introuvable' });

    const newQuote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          organizationId,
          leadId: existing.leadId,
          blockId: existing.blockId,
          createdById: user?.userId ?? null,
          number: generateQuoteNumber(),
          status: QuoteStatus.DRAFT,
          title: existing.title ? `${existing.title} (copie)` : null,
          version: 1,
          currency: existing.currency,
          validUntil: existing.validUntil,
          notes: existing.notes,
          data: existing.data,
          totals: existing.totals,
        },
      });

      // Dupliquer les lignes
      for (const it of existing.items) {
        await tx.quoteItem.create({
          data: {
            quoteId: created.id,
            order: it.order,
            label: it.label,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPct: it.discountPct,
            taxPct: it.taxPct,
            totalExcl: it.totalExcl,
            totalIncl: it.totalIncl,
          },
        });
      }

      return created;
    });

    res.status(201).json(newQuote);
  } catch (e) {
    console.error('[QUOTES] duplicate error', e);
    res.status(500).json({ error: 'Erreur lors de la duplication du devis' });
  }
});

// Phase 2: génération document -> stub pour l'instant
router.post('/:id/generate-document', (_req, res) => {
  return res.status(501).json({ error: 'Génération de document non encore implémentée (Phase 2)' });
});

export default router;

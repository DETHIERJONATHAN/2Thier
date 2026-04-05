/**
 * 💰 Routes API Dépenses / Expenses
 * 
 * Endpoints:
 *   GET    /api/expenses             — Liste des dépenses
 *   GET    /api/expenses/stats       — Statistiques dépenses
 *   GET    /api/expenses/categories  — Catégories disponibles
 *   POST   /api/expenses             — Créer une dépense
 *   POST   /api/expenses/scan        — Scanner un ticket via Gemini Vision
 *   PUT    /api/expenses/:id         — Modifier une dépense
 *   DELETE /api/expenses/:id         — Supprimer une dépense
 *   POST   /api/expenses/:id/mark-paid — Marquer comme payée
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import { GoogleGeminiService } from '../services/GoogleGeminiService';

const router = Router();

// ── Helpers ──
const getOrganizationId = (req: Request): string | null =>
  (req as any).organizationId || req.headers['x-organization-id'] as string || null;

const getUserId = (req: Request): string | null =>
  (req as any).userId || null;

// ── Catégories de dépenses ──
const EXPENSE_CATEGORIES = [
  { key: 'fuel', label: 'Carburant', icon: '⛽', color: '#e74c3c' },
  { key: 'material', label: 'Matériaux', icon: '🧱', color: '#e67e22' },
  { key: 'tools', label: 'Outillage', icon: '🔧', color: '#f39c12' },
  { key: 'food', label: 'Restauration', icon: '🍽️', color: '#27ae60' },
  { key: 'transport', label: 'Transport', icon: '🚗', color: '#3498db' },
  { key: 'office', label: 'Bureau / Fournitures', icon: '📎', color: '#9b59b6' },
  { key: 'telecom', label: 'Télécom / Internet', icon: '📱', color: '#1abc9c' },
  { key: 'insurance', label: 'Assurance', icon: '🛡️', color: '#34495e' },
  { key: 'subscription', label: 'Abonnement', icon: '📅', color: '#8e44ad' },
  { key: 'maintenance', label: 'Entretien / Réparation', icon: '🔩', color: '#d35400' },
  { key: 'other', label: 'Autre', icon: '📦', color: '#95a5a6' },
];

// ═══════════════════════════════════════════════════════════
// GET /categories — Catégories disponibles
// ═══════════════════════════════════════════════════════════

router.get('/categories', authenticateToken, (_req: Request, res: Response) => {
  res.json({ success: true, data: EXPENSE_CATEGORIES });
});

// ═══════════════════════════════════════════════════════════
// GET /stats — Statistiques dépenses
// ═══════════════════════════════════════════════════════════

router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const expenses = await db.expense.findMany({
      where: { organizationId },
      select: { totalAmount: true, category: true, status: true, expenseDate: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalExpenses = expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
    const totalThisMonth = expenses
      .filter(e => new Date(e.expenseDate) >= startOfMonth)
      .reduce((s, e) => s + (e.totalAmount || 0), 0);
    const totalPending = expenses
      .filter(e => e.status === 'PENDING')
      .reduce((s, e) => s + (e.totalAmount || 0), 0);
    const totalPaid = expenses
      .filter(e => e.status === 'PAID')
      .reduce((s, e) => s + (e.totalAmount || 0), 0);

    // Par catégorie
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.totalAmount || 0);
    }

    return res.json({
      success: true,
      data: {
        totalExpenses,
        totalThisMonth,
        totalPending,
        totalPaid,
        count: expenses.length,
        byCategory,
      },
    });
  } catch (error: unknown) {
    console.error('[EXPENSES] Stats error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET / — Liste des dépenses
// ═══════════════════════════════════════════════════════════

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const { category, status, search } = req.query;

    const where: any = { organizationId };
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { supplierName: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { reference: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      take: 200,
    });

    return res.json({ success: true, data: expenses });
  } catch (error: unknown) {
    console.error('[EXPENSES] List error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /scan — Scanner un ticket via Gemini Vision AI
// ═══════════════════════════════════════════════════════════

const scanSchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.string().refine(v => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(v)),
});

router.post('/scan', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const parsed = scanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Image invalide', errors: parsed.error.flatten() });
    }

    const { imageBase64, mimeType } = parsed.data;

    const gemini = new GoogleGeminiService();

    const prompt = `Tu es un comptable expert belge. Analyse cette image de ticket de caisse, facture ou reçu.

EXTRAIS les informations suivantes au format JSON STRICT (pas de markdown, juste le JSON) :

{
  "supplierName": "nom du magasin/fournisseur",
  "supplierVat": "numéro TVA si visible (format BE0123456789)",
  "supplierAddress": "adresse si visible",
  "totalAmount": 0.00,
  "subtotal": 0.00,
  "taxAmount": 0.00,
  "taxRate": 21,
  "currency": "EUR",
  "reference": "numéro de ticket/facture si visible",
  "expenseDate": "YYYY-MM-DD",
  "category": "une parmi: fuel, material, tools, food, transport, office, telecom, insurance, subscription, maintenance, other",
  "description": "description courte de l'achat",
  "items": [{"name": "article", "quantity": 1, "price": 0.00}],
  "confidence": 0.85
}

RÈGLES:
- Si tu ne trouves pas une valeur, mets null
- Les montants sont en EUR sauf indication contraire
- Déduis la catégorie automatiquement (station-service = fuel, restaurant = food, Brico = material, etc.)
- Le taxRate en Belgique est généralement 6%, 12% ou 21%
- Si tu vois le total TTC mais pas le HT, calcule: subtotal = totalAmount / (1 + taxRate/100)
- confidence = ton niveau de confiance de 0 à 1
- Retourne UNIQUEMENT le JSON, rien d'autre`;

    const result = await gemini.callVisionAPIPublic(imageBase64, mimeType, prompt);

    if (!result.success || !result.content) {
      console.error('[EXPENSES] ❌ Scan Vision échoué:', result.error, '| Modèle:', result.modelUsed);
      return res.json({
        success: false,
        message: `Impossible d'analyser l'image (${result.error || 'erreur inconnue'}). Veuillez saisir les données manuellement.`,
        aiError: result.error,
      });
    }

    // Parser la réponse JSON de Gemini
    let extracted: any;
    try {
      // Nettoyer la réponse (parfois Gemini enveloppe dans ```json ... ```)
      let jsonStr = result.content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      extracted = JSON.parse(jsonStr);
    } catch {
      console.warn('[EXPENSES] Gemini returned non-JSON:', result.content?.substring(0, 200));
      return res.json({
        success: false,
        message: 'L\'IA n\'a pas pu structurer les données. Veuillez saisir manuellement.',
        aiRaw: result.content,
      });
    }

    console.log(`[EXPENSES] ✅ Ticket scanné: ${extracted.supplierName || '?'} — €${extracted.totalAmount || '?'} (confiance: ${extracted.confidence || '?'})`);

    return res.json({
      success: true,
      data: {
        supplierName: extracted.supplierName || '',
        supplierVat: extracted.supplierVat || '',
        supplierAddress: extracted.supplierAddress || '',
        totalAmount: Number(extracted.totalAmount) || 0,
        subtotal: Number(extracted.subtotal) || 0,
        taxAmount: Number(extracted.taxAmount) || 0,
        taxRate: Number(extracted.taxRate) || 21,
        currency: extracted.currency || 'EUR',
        reference: extracted.reference || '',
        expenseDate: extracted.expenseDate || new Date().toISOString().split('T')[0],
        category: extracted.category || 'other',
        description: extracted.description || '',
        items: extracted.items || [],
        confidence: Number(extracted.confidence) || 0,
      },
    });
  } catch (error: unknown) {
    console.error('[EXPENSES] Scan error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST / — Créer une dépense
// ═══════════════════════════════════════════════════════════

const createExpenseSchema = z.object({
  supplierName: z.string().min(1),
  supplierVat: z.string().optional(),
  supplierAddress: z.string().optional(),
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  taxAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  currency: z.string().default('EUR'),
  category: z.string().default('other'),
  description: z.string().optional(),
  reference: z.string().optional(),
  expenseDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.string().default('PENDING'),
  receiptUrl: z.string().optional(),
  receiptMimeType: z.string().optional(),
  aiExtracted: z.boolean().default(false),
  aiConfidence: z.number().optional(),
  aiRawResponse: z.string().optional(),
  chantierId: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    const userId = getUserId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: parsed.error.flatten() });
    }

    const data = parsed.data;

    const expense = await db.expense.create({
      data: {
        organizationId,
        createdById: userId,
        supplierName: data.supplierName,
        supplierVat: data.supplierVat || null,
        supplierAddress: data.supplierAddress || null,
        subtotal: data.subtotal,
        taxRate: data.taxRate,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        currency: data.currency,
        category: data.category,
        description: data.description || null,
        reference: data.reference || null,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        paymentMethod: data.paymentMethod || null,
        status: data.status,
        receiptUrl: data.receiptUrl || null,
        receiptMimeType: data.receiptMimeType || null,
        aiExtracted: data.aiExtracted,
        aiConfidence: data.aiConfidence || null,
        aiRawResponse: data.aiRawResponse || null,
        chantierId: data.chantierId || null,
        notes: data.notes || null,
      },
    });

    console.log(`[EXPENSES] ✅ Dépense créée: ${expense.id} — ${data.supplierName} €${data.totalAmount}`);
    return res.json({ success: true, data: expense });
  } catch (error: unknown) {
    console.error('[EXPENSES] Create error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /:id — Modifier une dépense
// ═══════════════════════════════════════════════════════════

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const existing = await db.expense.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Dépense introuvable' });

    const updated = await db.expense.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : undefined,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[EXPENSES] Update error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /:id — Supprimer une dépense
// ═══════════════════════════════════════════════════════════

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const existing = await db.expense.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Dépense introuvable' });

    await db.expense.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Dépense supprimée' });
  } catch (error: unknown) {
    console.error('[EXPENSES] Delete error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /:id/mark-paid — Marquer comme payée
// ═══════════════════════════════════════════════════════════

router.post('/:id/mark-paid', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const existing = await db.expense.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Dépense introuvable' });

    const updated = await db.expense.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    return res.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[EXPENSES] Mark paid error:', error);
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

export default router;

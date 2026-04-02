/**
 * Routes API Peppol — e-Facturation
 * 
 * Endpoints:
 *   GET    /api/peppol/config                — Récupérer la config Peppol de l'organisation
 *   PUT    /api/peppol/config                — Mettre à jour la config Peppol
 *   POST   /api/peppol/register              — Enregistrer l'organisation sur Peppol
 *   GET    /api/peppol/status                — Vérifier le statut d'enregistrement
 *   POST   /api/peppol/send/:invoiceId       — Envoyer une facture via Peppol
 *   GET    /api/peppol/send/:invoiceId/status — Statut d'envoi d'une facture
 *   POST   /api/peppol/fetch-incoming        — Déclencher la réception de factures
 *   GET    /api/peppol/incoming              — Lister les factures entrantes
 *   PUT    /api/peppol/incoming/:id          — Mettre à jour une facture entrante
 *   POST   /api/peppol/verify-endpoint       — Vérifier un endpoint Peppol
 *   GET    /api/peppol/health                — État du service Odoo
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { z } from 'zod';
import { getPeppolBridge } from '../services/peppolBridge';
import { vatLookup, checkPeppolStatus, normalizeVatNumber, extractVatDigits } from '../services/vatLookupService';

const router = Router();

// ── Helpers ──

function getOrganizationId(req: Request): string | null {
  // 1. Header explicite (envoyé par useAuthenticatedApi)
  const fromHeader = req.headers['x-organization-id'] as string | undefined;
  if (fromHeader && fromHeader !== 'all') return fromHeader;
  // 2. Fallback: organisation dans le token JWT / session (super admin)
  const user = (req as any).user as { organizationId?: string; currentOrganizationId?: string } | undefined;
  const fallback = user?.organizationId || user?.currentOrganizationId || null;
  return (fallback && fallback !== 'all') ? fallback : null;
}

function getUserId(req: Request): string | null {
  const user = (req as any).user as { userId?: string; id?: string } | undefined;
  return user?.userId || user?.id || null;
}

// ── GET /config — Récupérer la config Peppol ──

router.get('/config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    console.log('[Peppol GET /config] orgId:', organizationId, '| header:', req.headers['x-organization-id']);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis. Sélectionnez une Colony.' });
    }

    let config = await db.peppolConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      // Retourner une config par défaut (non sauvegardée)
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { vatNumber: true, email: true, phone: true },
      });

      return res.json({
        success: true,
        data: {
          enabled: false,
          peppolEas: '0208',
          peppolEndpoint: org?.vatNumber?.replace(/\D/g, '') || '',
          registrationStatus: 'NOT_REGISTERED',
          contactEmail: org?.email || '',
          contactPhone: org?.phone || '',
          autoSendEnabled: false,
          autoReceiveEnabled: true,
        },
      });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[Peppol] Erreur GET /config:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── PUT /config — Mettre à jour la config Peppol ──

const configSchema = z.object({
  peppolEas: z.string().default('0208'),
  peppolEndpoint: z.string().optional().transform(v => v === '' ? undefined : v),
  contactEmail: z.string().optional().transform(v => v === '' ? undefined : v).pipe(z.string().email().optional()),
  contactPhone: z.string().optional().transform(v => v === '' ? undefined : v),
  migrationKey: z.string().nullable().optional().transform(v => v === '' || v === null ? undefined : v),
  autoSendEnabled: z.boolean().optional(),
  autoReceiveEnabled: z.boolean().optional(),
});

router.put('/config', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    console.log('[Peppol PUT /config] orgId:', organizationId, '| header:', req.headers['x-organization-id'], '| user.orgId:', (req as any).user?.organizationId, '| body keys:', Object.keys(req.body || {}));
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis. Sélectionnez une Colony.', debug: { header: req.headers['x-organization-id'], userOrgId: (req as any).user?.organizationId } });
    }

    const validation = configSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('[Peppol PUT /config] Validation failed:', JSON.stringify(validation.error.errors));
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;

    const config = await db.peppolConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        peppolEas: data.peppolEas,
        peppolEndpoint: data.peppolEndpoint,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        migrationKey: data.migrationKey,
        autoSendEnabled: data.autoSendEnabled ?? false,
        autoReceiveEnabled: data.autoReceiveEnabled ?? true,
      },
      update: {
        peppolEas: data.peppolEas,
        peppolEndpoint: data.peppolEndpoint,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        migrationKey: data.migrationKey,
        autoSendEnabled: data.autoSendEnabled,
        autoReceiveEnabled: data.autoReceiveEnabled,
      },
    });

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('[Peppol] Erreur PUT /config:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /register — Enregistrer sur le réseau Peppol ──

router.post('/register', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.peppolEndpoint) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez d\'abord configurer votre endpoint Peppol (numéro BCE)',
      });
    }

    if (config.registrationStatus === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Déjà enregistré sur Peppol' });
    }

    // Vérifier si déjà enregistré AILLEURS sur Peppol avant d'enregistrer
    const peppolCheck = await checkPeppolStatus(`${config.peppolEas === '0208' ? 'BE' : ''}${config.peppolEndpoint}`);
    if (peppolCheck.isRegistered && peppolCheck.isRegisteredElsewhere) {
      // Mettre en mode migration et sauvegarder l'ancien AP
      await db.peppolConfig.update({
        where: { organizationId },
        data: {
          registrationStatus: 'MIGRATION_PENDING',
          previousAccessPoint: peppolCheck.accessPoint || 'Fournisseur inconnu',
          previousApDetectedAt: new Date(),
        },
      });
      return res.status(409).json({
        success: false,
        message: `Ce numéro est déjà enregistré sur Peppol chez ${peppolCheck.accessPoint || 'un autre fournisseur'}. Vous devez d'abord obtenir une clé de migration.`,
        data: {
          registrationStatus: 'MIGRATION_PENDING',
          registeredAt: peppolCheck.accessPoint,
          registrationDate: peppolCheck.registrationDate,
        },
      });
    }

    const bridge = getPeppolBridge();

    // 1. Sync org vers Odoo
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, vatNumber: true, address: true, email: true, phone: true },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organisation non trouvée' });
    }

    const { odooCompanyId } = await bridge.syncOrganization({
      ...org,
      peppolEas: config.peppolEas,
      peppolEndpoint: config.peppolEndpoint,
    });

    // 2. Enregistrer sur Peppol
    const result = await bridge.registerPeppol(odooCompanyId, {
      peppolEas: config.peppolEas,
      peppolEndpoint: config.peppolEndpoint,
      contactEmail: config.contactEmail || org.email || '',
      contactPhone: config.contactPhone || org.phone || '',
      migrationKey: config.migrationKey || undefined,
    });

    // 3. Mettre à jour la config DB
    await db.peppolConfig.update({
      where: { organizationId },
      data: {
        enabled: true,
        odooCompanyId,
        registrationStatus: result.status === 'active' ? 'ACTIVE' : 'PENDING',
      },
    });

    res.json({
      success: true,
      data: { registrationStatus: result.status, odooCompanyId },
    });
  } catch (error) {
    console.error('[Peppol] Erreur POST /register:', error);
    res.status(500).json({ success: false, message: `Erreur d'enregistrement Peppol: ${(error as Error).message}` });
  }
});

// ── GET /status — Vérifier le statut d'enregistrement ──

router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.peppolEndpoint) {
      return res.json({ success: true, data: { registrationStatus: 'NOT_REGISTERED' } });
    }

    // 1. Vérifier dans l'annuaire Peppol qui détient réellement l'endpoint
    const peppolCheck = await checkPeppolStatus(`${config.peppolEas === '0208' ? 'BE' : ''}${config.peppolEndpoint}`);

    // 2. Si on a un odooCompanyId, vérifier aussi côté Odoo
    let odooStatus: string | null = null;
    if (config.odooCompanyId) {
      try {
        const bridge = getPeppolBridge();
        odooStatus = await bridge.checkRegistrationStatus(config.odooCompanyId);
      } catch {
        // Odoo peut être temporairement indisponible
      }
    }

    // 3. Déterminer le vrai statut croisé
    let realStatus = config.registrationStatus;
    let registeredAt: string | null = null;

    if (peppolCheck.isRegistered) {
      registeredAt = peppolCheck.accessPoint || null;

      if (peppolCheck.isRegisteredWithUs) {
        // Enregistré chez nous — ACTIVE
        realStatus = 'ACTIVE';
      } else if (peppolCheck.isRegisteredElsewhere) {
        // Enregistré chez un AUTRE AP — MIGRATION_PENDING
        realStatus = 'MIGRATION_PENDING';
      }
    } else {
      // Pas enregistré sur Peppol du tout
      if (odooStatus === 'active') {
        // Odoo dit actif, mais l'annuaire ne montre rien encore (propagation DNS)
        realStatus = 'PENDING';
      } else if (odooStatus === 'pending') {
        realStatus = 'PENDING';
      } else if (!config.odooCompanyId) {
        realStatus = 'NOT_REGISTERED';
      }
    }

    // 4. Persister en DB si l'ancien AP est détecté
    const updateData: Record<string, unknown> = {};
    if (realStatus !== config.registrationStatus) {
      updateData.registrationStatus = realStatus;
    }
    if (registeredAt && !peppolCheck.isRegisteredWithUs && registeredAt !== config.previousAccessPoint) {
      updateData.previousAccessPoint = registeredAt;
      updateData.previousApDetectedAt = new Date();
    }
    if (Object.keys(updateData).length > 0) {
      await db.peppolConfig.update({
        where: { organizationId },
        data: updateData,
      });
    }

    // Toujours retourner l'ancien AP (depuis la détection temps réel OU la DB)
    const effectiveRegisteredAt = registeredAt || config.previousAccessPoint || null;

    res.json({
      success: true,
      data: {
        registrationStatus: realStatus,
        registeredAt: effectiveRegisteredAt,
        peppolDirectory: {
          isRegistered: peppolCheck.isRegistered,
          isRegisteredWithUs: peppolCheck.isRegisteredWithUs,
          isRegisteredElsewhere: peppolCheck.isRegisteredElsewhere,
          accessPoint: peppolCheck.accessPoint || null,
          registrationDate: peppolCheck.registrationDate || null,
        },
      },
    });
  } catch (error) {
    console.error('[Peppol] Erreur GET /status:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /send/:invoiceId — Envoyer une facture via Peppol ──

const sendInvoiceSchema = z.object({
  partnerName: z.string().optional(),
  partnerVat: z.string().optional(),
  partnerPeppolEas: z.string().default('0208'),
  partnerPeppolEndpoint: z.string().optional(),
});

router.post('/send/:invoiceId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const { invoiceId } = req.params;

    // Vérifier que la config Peppol est active
    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.enabled || config.registrationStatus !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Peppol n\'est pas activé ou l\'enregistrement n\'est pas actif',
      });
    }

    // Récupérer la facture avec le Chantier et le Lead associé
    const invoice = await db.chantierInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { Chantier: { include: { Lead: true } } },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    if (invoice.peppolStatus === 'PROCESSING' || invoice.peppolStatus === 'DONE') {
      return res.status(400).json({
        success: false,
        message: `Facture déjà ${invoice.peppolStatus === 'DONE' ? 'envoyée' : 'en cours d\'envoi'} via Peppol`,
      });
    }

    const validation = sendInvoiceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const partnerInput = validation.data;
    const lead = invoice.Chantier?.Lead;
    const chantier = invoice.Chantier;

    // Résolution intelligente des données partenaire :
    // 1. Données explicites du body > 2. Lead > 3. Chantier.clientName
    const partnerName = partnerInput.partnerName
      || lead?.company
      || (lead?.firstName && lead?.lastName ? `${lead.firstName} ${lead.lastName}` : null)
      || chantier?.clientName
      || null;

    const partnerPeppolEndpoint = partnerInput.partnerPeppolEndpoint || null;

    if (!partnerName) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de déterminer le nom du partenaire. Renseignez un nom de société sur le Lead ou le Chantier.',
      });
    }
    if (!partnerPeppolEndpoint) {
      return res.status(400).json({
        success: false,
        message: 'L\'identifiant Peppol (n° BCE) du destinataire est requis. Renseignez-le dans le formulaire d\'envoi.',
      });
    }

    const bridge = getPeppolBridge();

    // Marquer comme en cours
    await db.chantierInvoice.update({
      where: { id: invoiceId },
      data: { peppolStatus: 'PROCESSING', updatedAt: new Date() },
    });

    // Envoyer via Odoo
    const result = await bridge.sendInvoice(config.odooCompanyId!, {
      partnerName,
      partnerVat: partnerInput.partnerVat,
      partnerPeppolEas: partnerInput.partnerPeppolEas,
      partnerPeppolEndpoint,
      invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate?.toISOString().split('T')[0],
      lines: [{
        description: invoice.label,
        quantity: 1,
        unitPrice: invoice.amount,
        taxPercent: 21, // TVA belge standard
      }],
    });

    // Mettre à jour la facture
    await db.chantierInvoice.update({
      where: { id: invoiceId },
      data: {
        peppolStatus: 'PROCESSING',
        peppolMessageId: result.peppolMessageId || null,
        peppolSentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        peppolStatus: 'PROCESSING',
        peppolMessageId: result.peppolMessageId,
        odooInvoiceId: result.odooInvoiceId,
      },
    });
  } catch (error) {
    console.error('[Peppol] Erreur POST /send/:invoiceId:', error);

    // Marquer l'erreur sur la facture
    const { invoiceId } = req.params;
    if (invoiceId) {
      await db.chantierInvoice.update({
        where: { id: invoiceId },
        data: {
          peppolStatus: 'ERROR',
          peppolError: (error as Error).message,
          updatedAt: new Date(),
        },
      }).catch(() => {});
    }

    res.status(500).json({ success: false, message: `Erreur d'envoi Peppol: ${(error as Error).message}` });
  }
});

// ── GET /send/:invoiceId/status — Statut d'envoi ──

router.get('/send/:invoiceId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const invoice = await db.chantierInvoice.findFirst({
      where: { id: req.params.invoiceId, organizationId },
      select: { peppolStatus: true, peppolMessageId: true, peppolError: true, peppolSentAt: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('[Peppol] Erreur GET /send/:id/status:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /fetch-incoming — Déclencher la réception ──

router.post('/fetch-incoming', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.enabled || !config.odooCompanyId) {
      return res.status(400).json({ success: false, message: 'Peppol n\'est pas configuré' });
    }

    const bridge = getPeppolBridge();

    // 1. Déclencher le fetch dans Odoo
    await bridge.fetchIncomingDocuments(config.odooCompanyId);

    // 2. Récupérer les nouvelles factures depuis Odoo
    const lastFetch = await db.peppolIncomingInvoice.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const incomingBills = await bridge.getIncomingInvoices(config.odooCompanyId, {
      since: lastFetch?.createdAt.toISOString(),
    });

    // 3. Importer dans Zhiive DB
    let imported = 0;
    for (const bill of incomingBills) {
      if (!bill.peppolMessageId) continue;

      const exists = await db.peppolIncomingInvoice.findUnique({
        where: { peppolMessageId: bill.peppolMessageId },
      });

      if (!exists) {
        await db.peppolIncomingInvoice.create({
          data: {
            organizationId,
            peppolMessageId: bill.peppolMessageId,
            senderEas: '0208', // Default for now
            senderEndpoint: bill.partnerVat || '',
            senderName: bill.partnerName,
            senderVat: bill.partnerVat,
            invoiceNumber: bill.name,
            invoiceDate: bill.invoiceDate ? new Date(bill.invoiceDate) : null,
            dueDate: bill.dueDate ? new Date(bill.dueDate) : null,
            totalAmount: bill.amountTotal,
            taxAmount: bill.amountTax,
            currency: bill.currency,
            status: 'RECEIVED',
          },
        });
        imported++;
      }
    }

    res.json({
      success: true,
      data: { imported, total: incomingBills.length },
    });
  } catch (error) {
    console.error('[Peppol] Erreur POST /fetch-incoming:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── GET /incoming — Lister les factures entrantes ──

router.get('/incoming', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;

    const invoices = await db.peppolIncomingInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('[Peppol] Erreur GET /incoming:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── PUT /incoming/:id — Mettre à jour une facture entrante ──

const incomingUpdateSchema = z.object({
  status: z.enum(['RECEIVED', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'ARCHIVED']),
  notes: z.string().optional(),
});

router.put('/incoming/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const validation = incomingUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const existing = await db.peppolIncomingInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Facture entrante non trouvée' });
    }

    const userId = getUserId(req);
    const data = validation.data;

    const updated = await db.peppolIncomingInvoice.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        notes: data.notes,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Peppol] Erreur PUT /incoming/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /verify-endpoint — Vérifier un endpoint Peppol ──

const verifySchema = z.object({
  eas: z.string().default('0208'),
  endpoint: z.string().min(1),
});

router.post('/verify-endpoint', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validation = verifySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const bridge = getPeppolBridge();
    const isValid = await bridge.verifyPeppolEndpoint(validation.data.eas, validation.data.endpoint);

    res.json({ success: true, data: { valid: isValid } });
  } catch (error) {
    console.error('[Peppol] Erreur POST /verify-endpoint:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── GET /health — État du service Odoo ──

router.get('/health', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const bridge = getPeppolBridge();
    const health = await bridge.healthCheck();

    res.json({ success: true, data: health });
  } catch (error) {
    console.error('[Peppol] Erreur GET /health:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /vat-lookup — Recherche entreprise par TVA + vérification Peppol ──

const vatLookupSchema = z.object({
  vatNumber: z.string().min(8, 'Numéro de TVA trop court').max(30),
});

router.post('/vat-lookup', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validation = vatLookupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Numéro de TVA invalide', errors: validation.error.errors });
    }

    const result = await vatLookup(validation.data.vatNumber);

    // Persister l'ancien AP en DB si détecté
    const organizationId = getOrganizationId(req);
    if (organizationId && result.peppol?.isRegistered && result.peppol?.accessPoint) {
      try {
        await db.peppolConfig.upsert({
          where: { organizationId },
          create: {
            organizationId,
            previousAccessPoint: result.peppol.accessPoint,
            previousApDetectedAt: new Date(),
            registrationStatus: result.peppol.isRegisteredElsewhere ? 'MIGRATION_PENDING' : 'NOT_REGISTERED',
          },
          update: {
            previousAccessPoint: result.peppol.accessPoint,
            previousApDetectedAt: new Date(),
            ...(result.peppol.isRegisteredElsewhere ? { registrationStatus: 'MIGRATION_PENDING' } : {}),
          },
        });
      } catch (e) {
        console.warn('[Peppol] Impossible de sauvegarder previousAccessPoint:', e);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Peppol] Erreur POST /vat-lookup:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la recherche' });
  }
});

// ── POST /peppol-check — Vérification rapide du statut Peppol d'un n° TVA ──

router.post('/peppol-check', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validation = vatLookupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Numéro de TVA invalide' });
    }

    const peppol = await checkPeppolStatus(validation.data.vatNumber);

    res.json({ success: true, data: peppol });
  } catch (error) {
    console.error('[Peppol] Erreur POST /peppol-check:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification Peppol' });
  }
});

// ── POST /auto-register — Enregistrement Peppol (opt-in, depuis Paramètres → e-Facturation) ──
// NOTE : L'inscription Peppol est VOLONTAIRE. Chaque Colony choisit de s'inscrire ou non
// depuis ses paramètres. Aucun enregistrement automatique à la création d'une Colony.

const autoRegisterSchema = z.object({
  organizationId: z.string().uuid(),
  vatNumber: z.string().min(8).max(30),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(6),
  migrationKey: z.string().optional(),
});

router.post('/auto-register', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const validation = autoRegisterSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const { organizationId, vatNumber, contactEmail, contactPhone, migrationKey } = validation.data;
    const normalized = normalizeVatNumber(vatNumber);
    const digits = extractVatDigits(vatNumber);
    const countryCode = normalized.substring(0, 2);
    const eas = countryCode === 'BE' ? '0208' : '9925';

    // 1. Vérifier si déjà enregistré ailleurs sur Peppol
    const peppolStatus = await checkPeppolStatus(vatNumber);

    if (peppolStatus.isRegistered && peppolStatus.isRegisteredElsewhere) {
      // Créer la config mais en mode "migration en attente"
      await db.peppolConfig.upsert({
        where: { organizationId },
        create: {
          organizationId,
          peppolEas: eas,
          peppolEndpoint: digits,
          contactEmail,
          contactPhone,
          migrationKey: migrationKey || null,
          registrationStatus: 'MIGRATION_PENDING',
          enabled: false,
          autoReceiveEnabled: true,
          autoSendEnabled: false,
        },
        update: {
          peppolEas: eas,
          peppolEndpoint: digits,
          contactEmail,
          contactPhone,
          migrationKey: migrationKey || null,
          registrationStatus: 'MIGRATION_PENDING',
        },
      });

      return res.json({
        success: true,
        data: {
          registrationStatus: 'MIGRATION_PENDING',
          peppolAlreadyRegistered: true,
          currentAccessPoint: peppolStatus.accessPoint,
          message: `Ce numéro d'entreprise est déjà enregistré sur Peppol chez ${peppolStatus.accessPoint || 'un autre fournisseur'}. Une clé de migration est nécessaire pour transférer l'enregistrement.`,
        },
      });
    }

    // 2. Pas enregistré ailleurs → on enregistre directement
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, vatNumber: true, address: true, email: true, phone: true },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organisation non trouvée' });
    }

    const bridge = getPeppolBridge();

    // Sync vers Odoo
    const { odooCompanyId } = await bridge.syncOrganization({
      ...org,
      vatNumber: normalized,
      peppolEas: eas,
      peppolEndpoint: digits,
    });

    // Enregistrer sur Peppol
    const result = await bridge.registerPeppol(odooCompanyId, {
      peppolEas: eas,
      peppolEndpoint: digits,
      contactEmail,
      contactPhone,
      migrationKey,
    });

    // Sauvegarder la config
    await db.peppolConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        peppolEas: eas,
        peppolEndpoint: digits,
        contactEmail,
        contactPhone,
        enabled: true,
        odooCompanyId,
        registrationStatus: result.status === 'active' ? 'ACTIVE' : 'PENDING',
        autoReceiveEnabled: true,
        autoSendEnabled: false,
      },
      update: {
        peppolEas: eas,
        peppolEndpoint: digits,
        contactEmail,
        contactPhone,
        enabled: true,
        odooCompanyId,
        registrationStatus: result.status === 'active' ? 'ACTIVE' : 'PENDING',
      },
    });

    res.json({
      success: true,
      data: {
        registrationStatus: result.status === 'active' ? 'ACTIVE' : 'PENDING',
        odooCompanyId,
        peppolAlreadyRegistered: false,
      },
    });
  } catch (error) {
    console.error('[Peppol] Erreur POST /auto-register:', error);
    res.status(500).json({ success: false, message: `Erreur d'enregistrement: ${(error as Error).message}` });
  }
});

// ── POST /complete-migration — Finaliser la migration avec clé ──

// ── POST /deregister — Désinscription du réseau Peppol ──

router.post('/deregister', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config) {
      return res.status(400).json({ success: false, message: 'Aucune configuration Peppol trouvée' });
    }

    if (config.registrationStatus !== 'ACTIVE' && config.registrationStatus !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Impossible de désinscrire : statut actuel "${config.registrationStatus}"`,
      });
    }

    // Vérifier qu'il n'y a pas de factures en cours d'envoi
    const pendingInvoices = await db.chantierInvoice.count({
      where: { organizationId, peppolStatus: 'PROCESSING' },
    });

    if (pendingInvoices > 0) {
      return res.status(400).json({
        success: false,
        message: `${pendingInvoices} facture(s) Peppol en cours d'envoi. Attendez leur finalisation avant de vous désinscrire.`,
      });
    }

    // Désinscrire via Odoo si on a un company ID
    if (config.odooCompanyId) {
      const bridge = getPeppolBridge();
      const result = await bridge.deregisterPeppol(config.odooCompanyId);

      if (!result.success) {
        console.warn(`[Peppol] Désinscription Odoo partielle pour org ${organizationId}`);
      }
    }

    // Mettre à jour la config DB
    await db.peppolConfig.update({
      where: { organizationId },
      data: {
        enabled: false,
        registrationStatus: 'DEREGISTERED',
        autoSendEnabled: false,
        autoReceiveEnabled: false,
      },
    });

    const userId = getUserId(req);
    console.log(`[Peppol] Organisation ${organizationId} désinscrite de Peppol par utilisateur ${userId}`);

    res.json({
      success: true,
      data: { registrationStatus: 'DEREGISTERED' },
      message: 'Désinscription Peppol effectuée. Vous ne recevrez plus de factures via Peppol.',
    });
  } catch (error) {
    console.error('[Peppol] Erreur POST /deregister:', error);
    res.status(500).json({ success: false, message: `Erreur de désinscription: ${(error as Error).message}` });
  }
});

const migrationSchema = z.object({
  migrationKey: z.string().min(1, 'Clé de migration requise'),
});

router.post('/complete-migration', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const validation = migrationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Clé de migration invalide' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config || config.registrationStatus !== 'MIGRATION_PENDING') {
      return res.status(400).json({ success: false, message: 'Aucune migration en attente' });
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, vatNumber: true, address: true, email: true, phone: true },
    });

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organisation non trouvée' });
    }

    const bridge = getPeppolBridge();

    // Sync + register avec clé de migration
    const { odooCompanyId } = await bridge.syncOrganization({
      ...org,
      peppolEas: config.peppolEas,
      peppolEndpoint: config.peppolEndpoint,
    });

    const result = await bridge.registerPeppol(odooCompanyId, {
      peppolEas: config.peppolEas,
      peppolEndpoint: config.peppolEndpoint!,
      contactEmail: config.contactEmail || org.email || '',
      contactPhone: config.contactPhone || org.phone || '',
      migrationKey: validation.data.migrationKey,
    });

    await db.peppolConfig.update({
      where: { organizationId },
      data: {
        migrationKey: validation.data.migrationKey,
        odooCompanyId,
        enabled: true,
        registrationStatus: result.status === 'active' ? 'ACTIVE' : 'PENDING',
      },
    });

    res.json({
      success: true,
      data: {
        registrationStatus: result.status === 'active' ? 'ACTIVE' : 'PENDING',
        odooCompanyId,
      },
    });
  } catch (error) {
    console.error('[Peppol] Erreur POST /complete-migration:', error);
    res.status(500).json({ success: false, message: `Erreur de migration: ${(error as Error).message}` });
  }
});

export default router;

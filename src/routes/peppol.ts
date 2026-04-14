/**
 * Routes API Peppol — e-Facturation
 * 
 * Endpoints:
 *   GET    /api/peppol/config                — Récupérer la config Peppol de l'organisation
 *   PUT    /api/peppol/config                — Mettre à jour la config Peppol
 *   POST   /api/peppol/register              — Enregistrer l'organisation sur Peppol
 *   GET    /api/peppol/status                — Vérifier le statut d'enregistrement
 *   POST   /api/peppol/send/:invoiceId       — Envoyer une facture via Peppol
 *   POST   /api/peppol/retry/:invoiceId      — Réessayer l'envoi d'une facture bloquée
 *   GET    /api/peppol/send/:invoiceId/status — Statut d'envoi d'une facture
 *   POST   /api/peppol/fetch-incoming        — Déclencher la réception de factures
 *   GET    /api/peppol/incoming              — Lister les factures entrantes
 *   PUT    /api/peppol/incoming/:id          — Mettre à jour une facture entrante
 *   POST   /api/peppol/verify-endpoint       — Vérifier un endpoint Peppol
 *   GET    /api/peppol/health                — État du service Odoo
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { SF } from '../components/zhiive/ZhiiveTheme';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { z } from 'zod';
import { getPeppolBridge } from '../services/peppolBridge';
import { vatLookup, checkPeppolStatus, normalizeVatNumber, extractVatDigits } from '../services/vatLookupService';
import { emailService } from '../services/EmailService';
import { generateInvoicePdf, orgSelectForPdf } from './invoices';
import { sendPushToUser } from './push';
import UniversalNotificationService from '../services/UniversalNotificationService';
import { getPostalService } from '../services/PostalEmailService.js';
import { logger } from '../lib/logger';
import {
  ImportedInvoiceInfo,
  getPeppolFetchErrorDetails,
  getPeppolRuntimeConfigurationError,
  syncIncomingPeppolInvoices,
} from '../services/peppolIncomingSync';

const router = Router();

// ── Helpers ──

function getOrganizationId(req: Request): string | null {
  // 1. Header explicite (envoyé par useAuthenticatedApi)
  const fromHeader = req.headers['x-organization-id'] as string | undefined;
  if (fromHeader && fromHeader !== 'all') return fromHeader;
  // 2. Fallback: organisation dans le token JWT / session (super admin)
  const user = req.user as { organizationId?: string; currentOrganizationId?: string } | undefined;
  const fallback = user?.organizationId || user?.currentOrganizationId || null;
  return (fallback && fallback !== 'all') ? fallback : null;
}

function getUserId(req: Request): string | null {
  const user = req.user as { userId?: string; id?: string } | undefined;
  return user?.userId || user?.id || null;
}

// ── Notification helper pour factures entrantes Peppol ──

async function notifyIncomingInvoices(
  organizationId: string,
  invoices: ImportedInvoiceInfo[],
  _triggeredByUserId?: string | null,
): Promise<void> {
  if (invoices.length === 0) return;

  try {
    // Récupérer l'org et ses admins
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, email: true },
    });

    const orgAdmins = await db.userOrganization.findMany({
      where: { organizationId, Role: { name: { in: ['admin', 'owner', 'super_admin'] } } },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, EmailAccount: { select: { emailAddress: true } } } },
      },
    });

    const orgName = org?.name || 'Organisation';
    const count = invoices.length;

    const title = count === 1
      ? `🧾 Nouvelle facture Peppol reçue`
      : `🧾 ${count} nouvelles factures Peppol reçues`;

    const shortBody = count === 1
      ? `${invoices[0].invoiceNumber || 'Facture'} de ${invoices[0].senderName || 'Fournisseur'} (${invoices[0].totalAmount?.toFixed(2) || '0.00'}€)`
      : `${count} factures reçues via Peppol`;

    // 1. Notification in-app (UniversalNotificationService) — pour chaque admin
    const notifService = UniversalNotificationService.getInstance();
    for (const admin of orgAdmins) {
      await notifService.createNotification({
        type: 'NEW_INVOICE',
        title,
        message: shortBody,
        userId: admin.userId,
        organizationId,
        priority: 'high',
        actionUrl: '/facture?tab=incoming',
        tags: ['peppol', 'incoming'],
        metadata: { count, invoices: invoices.map(i => i.invoiceNumber) },
      }).catch(err => logger.error('[Peppol-Notify] Erreur notification in-app:', err.message));
    }

    // 2. Push notification — pour chaque admin
    for (const admin of orgAdmins) {
      await sendPushToUser(admin.userId, {
        title,
        body: shortBody,
        icon: '/icons/peppol-incoming.png',
        tag: `peppol-incoming-${Date.now()}`,
        url: '/facture?tab=incoming',
        type: 'peppol_incoming',
      }).catch(err => logger.error('[Peppol-Notify] Erreur push:', err.message));
    }

    // 3. Email @zhiive.com — pour chaque admin qui a un EmailAccount
    const postal = getPostalService();
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${SF.primary}, #a855f7); padding: 20px; border-radius: 12px 12px 0 0; color: white;">
          <h2 style="margin: 0;">🧾 ${title}</h2>
          <p style="margin: 5px 0 0; opacity: 0.9;">${orgName} — Peppol e-Invoicing</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e9ecef;">
                <th style="padding: 8px 12px; text-align: left; border-radius: 6px 0 0 0;">Facture</th>
                <th style="padding: 8px 12px; text-align: left;">Fournisseur</th>
                <th style="padding: 8px 12px; text-align: right; border-radius: 0 6px 0 0;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(i => `
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #dee2e6;">${i.invoiceNumber || 'N/A'}</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #dee2e6;">${i.senderName || 'Fournisseur'}</td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #dee2e6; text-align: right; font-weight: 600;">${i.totalAmount != null ? i.totalAmount.toFixed(2) : '0.00'} ${i.currency}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 16px; color: #666; font-size: 13px;">
            Connectez-vous à <a href="https://app.2thier.be/facture?tab=incoming" style="color: ${SF.primary}; text-decoration: none;">Zhiive</a> pour examiner et accepter ces factures.
          </p>
        </div>
      </div>
    `;

    for (const admin of orgAdmins) {
      const zhiiveEmail = admin.User?.EmailAccount?.emailAddress;
      if (zhiiveEmail) {
        postal.sendEmail({
          from: `comptabilite@zhiive.com`,
          to: zhiiveEmail,
          subject: `${title} — ${orgName}`,
          body: htmlBody,
          isHtml: true,
        }).catch(err => logger.error(`[Peppol-Notify] Erreur email zhiive ${zhiiveEmail}:`, err.message));
      }
    }

    // 4. Email à la boîte Colony (email de l'organisation)
    if (org?.email) {
      postal.sendEmail({
        from: `comptabilite@zhiive.com`,
        to: org.email,
        subject: `${title} — ${orgName}`,
        body: htmlBody,
        isHtml: true,
      }).catch(err => logger.error(`[Peppol-Notify] Erreur email colony ${org.email}:`, err.message));
    }

  } catch (err) {
    logger.error('[Peppol-Notify] ❌ Erreur envoi notifications:', (err as Error).message);
  }
}

// ── GET /config — Récupérer la config Peppol ──

router.get('/config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
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
    logger.error('[Peppol] Erreur GET /config:', error);
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
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis. Sélectionnez une Colony.', debug: { header: req.headers['x-organization-id'], userOrgId: req.user?.organizationId } });
    }

    const validation = configSchema.safeParse(req.body);
    if (!validation.success) {
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
    logger.error('[Peppol] Erreur PUT /config:', error);
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

    // 3. Mapper le statut Odoo → statut Zhiive
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      pending: 'PENDING',
      not_verified: 'VERIFICATION_NEEDED',
      sent_verification: 'VERIFICATION_NEEDED',
    };
    const finalStatus = statusMap[result.status] || 'PENDING';

    // 4. Mettre à jour la config DB
    await db.peppolConfig.update({
      where: { organizationId },
      data: {
        enabled: true,
        odooCompanyId,
        registrationStatus: finalStatus,
      },
    });

    res.json({
      success: true,
      data: { registrationStatus: finalStatus, odooCompanyId },
    });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /register:', error);
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
      // Pas encore visible dans l'annuaire public Peppol
      if (odooStatus === 'active') {
        realStatus = 'ACTIVE';
      } else if (odooStatus === 'pending') {
        realStatus = 'PENDING';
      } else if (odooStatus === 'not_verified' || odooStatus === 'sent_verification') {
        realStatus = 'VERIFICATION_NEEDED';
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
    logger.error('[Peppol] Erreur GET /status:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /send-verification-code — Envoyer le SMS de vérification Peppol ──

router.post('/send-verification-code', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.odooCompanyId) {
      return res.status(400).json({ success: false, message: 'Organisation non enregistrée sur Peppol' });
    }

    const bridge = getPeppolBridge();
    await bridge.sendVerificationCode(config.odooCompanyId);

    await db.peppolConfig.update({
      where: { organizationId },
      data: { registrationStatus: 'VERIFICATION_NEEDED' },
    });

    res.json({ success: true, message: 'SMS de vérification envoyé' });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /send-verification-code:', error);
    res.status(500).json({ success: false, message: `Erreur d'envoi SMS: ${(error as Error).message}` });
  }
});

// ── POST /verify-code — Vérifier le code SMS Peppol ──

const verifyCodeSchema = z.object({
  code: z.string().min(4).max(10),
});

router.post('/verify-code', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const validation = verifyCodeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Code invalide' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.odooCompanyId) {
      return res.status(400).json({ success: false, message: 'Organisation non enregistrée sur Peppol' });
    }

    const bridge = getPeppolBridge();
    const result = await bridge.verifyCode(config.odooCompanyId, validation.data.code);

    // Mapper le statut Odoo → statut Zhiive
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      pending: 'PENDING',
      not_verified: 'VERIFICATION_NEEDED',
      sent_verification: 'VERIFICATION_NEEDED',
    };
    const finalStatus = statusMap[result.status] || 'PENDING';

    await db.peppolConfig.update({
      where: { organizationId },
      data: { registrationStatus: finalStatus },
    });

    res.json({
      success: true,
      data: { registrationStatus: finalStatus },
      message: finalStatus === 'PENDING'
        ? 'Code vérifié ! Activation en cours sur le réseau Peppol...'
        : finalStatus === 'ACTIVE'
          ? 'Peppol activé avec succès !'
          : 'Code vérifié',
    });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /verify-code:', error);
    res.status(500).json({ success: false, message: `Erreur de vérification: ${(error as Error).message}` });
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
  const { invoiceId } = req.params;
  let invoiceSource: 'chantier' | 'standalone' = 'chantier';
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    // Vérifier que la config Peppol est active
    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.enabled || config.registrationStatus !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Peppol n\'est pas activé ou l\'enregistrement n\'est pas actif',
      });
    }

    // Récupérer la facture — chercher d'abord dans ChantierInvoice, puis StandaloneInvoice
    let invoiceData: {
      id: string;
      peppolStatus: string | null;
      invoiceNumber: string | null;
      dueDate: Date | null;
      label: string;
      amount: number;
      taxRate: number;
      clientName: string | null;
      clientVat: string | null;
      clientEmail: string | null;
    } | null = null;

    const chantierInvoice = await db.chantierInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { Chantier: { include: { Lead: true } } },
    });

    if (chantierInvoice) {
      invoiceSource = 'chantier';
      const lead = chantierInvoice.Chantier?.Lead;
      invoiceData = {
        id: chantierInvoice.id,
        peppolStatus: chantierInvoice.peppolStatus,
        invoiceNumber: chantierInvoice.invoiceNumber,
        dueDate: chantierInvoice.dueDate,
        label: chantierInvoice.label,
        amount: chantierInvoice.amount,
        taxRate: 21,
        clientName: lead?.company
          || (lead?.firstName && lead?.lastName ? `${lead.firstName} ${lead.lastName}` : null)
          || chantierInvoice.Chantier?.clientName
          || null,
        clientVat: null,
        clientEmail: lead?.email || null,
      };
    } else {
      const standaloneInvoice = await db.standaloneInvoice.findFirst({
        where: { id: invoiceId, organizationId },
      });
      if (standaloneInvoice) {
        invoiceSource = 'standalone';
        invoiceData = {
          id: standaloneInvoice.id,
          peppolStatus: standaloneInvoice.peppolStatus,
          invoiceNumber: standaloneInvoice.invoiceNumber,
          dueDate: standaloneInvoice.dueDate,
          label: standaloneInvoice.description || `Facture ${standaloneInvoice.invoiceNumber}`,
          amount: standaloneInvoice.totalAmount,
          taxRate: standaloneInvoice.taxRate,
          clientName: standaloneInvoice.clientName,
          clientVat: standaloneInvoice.clientVat,
          clientEmail: standaloneInvoice.clientEmail,
        };
      }
    }

    if (!invoiceData) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    if (invoiceData.peppolStatus === 'DONE' || invoiceData.peppolStatus === 'SENT') {
      return res.status(400).json({
        success: false,
        message: 'Facture déjà envoyée via Peppol',
      });
    }

    const validation = sendInvoiceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const partnerInput = validation.data;

    // Résolution intelligente des données partenaire :
    // 1. Données explicites du body > 2. Données de la facture
    const partnerName = partnerInput.partnerName || invoiceData.clientName || null;
    // Nettoyer l'endpoint Peppol : retirer préfixe BE, points, tirets, espaces
    // Fallback: dériver depuis partnerVat ou clientVat de la facture
    const rawEndpoint = partnerInput.partnerPeppolEndpoint || partnerInput.partnerVat || invoiceData.clientVat || null;
    const partnerPeppolEndpoint = rawEndpoint
      ? rawEndpoint.replace(/^BE/i, '').replace(/[\s.\-]/g, '')
      : null;

    if (!partnerName) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de déterminer le nom du partenaire. Renseignez un nom de société.',
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
    if (invoiceSource === 'chantier') {
      await db.chantierInvoice.update({
        where: { id: invoiceId },
        data: { peppolStatus: 'PROCESSING', updatedAt: new Date() },
      });
    } else {
      await db.standaloneInvoice.update({
        where: { id: invoiceId },
        data: { peppolStatus: 'PROCESSING' },
      });
    }

    // Construire les lignes pour l'envoi
    let sendLines: { description: string; quantity: number; unitPrice: number; taxPercent: number }[];
    if (invoiceSource === 'standalone') {
      // Utiliser les lignes détaillées de la StandaloneInvoice si disponibles
      const standaloneInv = await db.standaloneInvoice.findUnique({ where: { id: invoiceId }, select: { lines: true, taxRate: true } });
      const parsedLines = standaloneInv?.lines as { description: string; quantity: number; unitPrice: number }[] | null;
      if (parsedLines && Array.isArray(parsedLines) && parsedLines.length > 0) {
        sendLines = parsedLines.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxPercent: invoiceData!.taxRate,
        }));
      } else {
        sendLines = [{ description: invoiceData.label, quantity: 1, unitPrice: invoiceData.amount, taxPercent: invoiceData.taxRate }];
      }
    } else {
      sendLines = [{ description: invoiceData.label, quantity: 1, unitPrice: invoiceData.amount, taxPercent: 21 }];
    }

    // Envoyer via Odoo
    const result = await bridge.sendInvoice(config.odooCompanyId!, {
      partnerName,
      partnerVat: partnerInput.partnerVat || invoiceData.clientVat || undefined,
      partnerPeppolEas: partnerInput.partnerPeppolEas,
      partnerPeppolEndpoint,
      invoiceNumber: invoiceData.invoiceNumber || `INV-${invoiceData.id.slice(0, 8)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate?.toISOString().split('T')[0],
      lines: sendLines,
    });

    // Mettre à jour la facture
    if (invoiceSource === 'chantier') {
      await db.chantierInvoice.update({
        where: { id: invoiceId },
        data: {
          peppolStatus: 'PROCESSING',
          peppolMessageId: result.peppolMessageId || null,
          peppolSentAt: new Date(),
          peppolOdooInvoiceId: result.odooInvoiceId,
          peppolRetryCount: 0,
          peppolError: null,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.standaloneInvoice.update({
        where: { id: invoiceId },
        data: {
          peppolStatus: 'PROCESSING',
          peppolMessageId: result.peppolMessageId || null,
          peppolSentAt: new Date(),
          peppolOdooInvoiceId: result.odooInvoiceId,
          peppolRetryCount: 0,
          peppolError: null,
        },
      });
    }

    // 📧 Envoyer une copie email à l'adresse zhiive.com de l'utilisateur + email de la Colony + facture au client
    try {
      const userId = getUserId(req);
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: orgSelectForPdf,
      });
      const orgName = org?.legalName || org?.name || 'Zhiive';
      const invoiceNum = invoiceData.invoiceNumber || invoiceId;
      const clientName = invoiceData.clientName || 'destinataire';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${SF.primary};">Facture envoyée via Peppol</h2>
          <p>La facture <strong>${invoiceNum}</strong> a été transmise au réseau Peppol.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; color: #666;">Destinataire</td><td style="padding: 8px; font-weight: 600;">${clientName}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Montant</td><td style="padding: 8px; font-weight: 600;">&euro;${invoiceData.amount.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Statut</td><td style="padding: 8px; font-weight: 600; color: ${SF.primary};">En cours de livraison Peppol</td></tr>
          </table>
          <p style="font-size: 13px; color: #888;">Une confirmation sera envoyée dès que la facture sera délivrée au destinataire.</p>
          <p style="font-size: 12px; color: #aaa;">— ${orgName} via Zhiive</p>
        </div>
      `;
      const emailSubject = `Copie Peppol — ${invoiceNum} envoyée à ${clientName}`;

      // Collecter les destinataires internes (sans doublons)
      const copyRecipients = new Set<string>();

      // 1. Email zhiive.com de l'utilisateur
      if (userId) {
        const emailAccount = await db.emailAccount.findUnique({ where: { userId }, select: { emailAddress: true } });
        if (emailAccount?.emailAddress) copyRecipients.add(emailAccount.emailAddress);
      }

      // 2. Email de la Colony (organisation)
      if (org?.email) copyRecipients.add(org.email);

      // Envoyer copie interne (sans PDF)
      for (const recipient of copyRecipients) {
        try {
          await emailService.sendEmail({
            to: recipient,
            subject: emailSubject,
            html: emailHtml,
            fromName: orgName,
            replyTo: org?.email || undefined,
            organizationId,
          });
        } catch (err) {
          logger.warn(`[Peppol] Erreur copie email vers ${recipient}:`, (err as Error).message);
        }
      }

      // 3. Email au CLIENT avec la facture PDF en pièce jointe
      const clientEmail = invoiceData.clientEmail;
      if (clientEmail && org) {
        try {
          // Charger la facture complète pour générer le PDF
          const fullInvoice = invoiceSource === 'standalone'
            ? await db.standaloneInvoice.findUnique({ where: { id: invoiceId } })
            : null; // ChantierInvoice: PDF non supporté pour l'instant

          if (fullInvoice) {
            const pdfBuffer = await generateInvoicePdf(fullInvoice, org);
            const pdfFilename = `${(invoiceNum || 'facture').replace(/\s+/g, '_')}.pdf`;

            const clientEmailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2980B9;">Facture ${invoiceNum}</h2>
                <p>Bonjour,</p>
                <p>Veuillez trouver ci-joint la facture <strong>${invoiceNum}</strong> émise par <strong>${orgName}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px; color: #666;">Montant total</td><td style="padding: 8px; font-weight: 600;">&euro;${invoiceData.amount.toFixed(2)}</td></tr>
                  ${invoiceData.dueDate ? `<tr><td style="padding: 8px; color: #666;">Échéance</td><td style="padding: 8px; font-weight: 600;">${new Date(invoiceData.dueDate).toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })}</td></tr>` : ''}
                </table>
                <p>Cette facture a également été transmise via le réseau Peppol.</p>
                <p style="font-size: 12px; color: #aaa;">— ${orgName}</p>
              </div>
            `;

            await emailService.sendEmail({
              to: clientEmail,
              subject: `${invoiceNum} — ${orgName}`,
              html: clientEmailHtml,
              fromName: orgName,
              replyTo: org.email || undefined,
              organizationId,
              attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }],
            });
          }
        } catch (clientErr) {
          logger.warn(`[Peppol] Erreur envoi facture au client ${clientEmail}:`, (clientErr as Error).message);
        }
      }
    } catch (emailErr) {
      // Non bloquant — l'envoi Peppol a réussi même si l'email échoue
      logger.warn('[Peppol] Erreur envoi copie email:', (emailErr as Error).message);
    }

    res.json({
      success: true,
      data: {
        peppolStatus: 'PROCESSING',
        peppolMessageId: result.peppolMessageId,
        odooInvoiceId: result.odooInvoiceId,
      },
    });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /send/:invoiceId:', error);

    // Marquer l'erreur sur la facture
    if (invoiceId) {
      if (invoiceSource === 'chantier') {
        await db.chantierInvoice.update({
          where: { id: invoiceId },
          data: { peppolStatus: 'ERROR', peppolError: (error as Error).message, updatedAt: new Date() },
        }).catch(() => {});
      } else {
        await db.standaloneInvoice.update({
          where: { id: invoiceId },
          data: { peppolStatus: 'ERROR', peppolError: (error as Error).message },
        }).catch(() => {});
      }
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

    // Chercher dans ChantierInvoice puis StandaloneInvoice
    let invoice = await db.chantierInvoice.findFirst({
      where: { id: req.params.invoiceId, organizationId },
      select: { peppolStatus: true, peppolMessageId: true, peppolError: true, peppolSentAt: true },
    });

    if (!invoice) {
      invoice = await db.standaloneInvoice.findFirst({
        where: { id: req.params.invoiceId, organizationId },
        select: { peppolStatus: true, peppolMessageId: true, peppolError: true, peppolSentAt: true },
      });
    }

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error('[Peppol] Erreur GET /send/:id/status:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /retry/:invoiceId — Réessayer l'envoi Peppol d'une facture bloquée ──

router.post('/retry/:invoiceId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'ID d\'organisation requis' });
    }

    const config = await db.peppolConfig.findUnique({ where: { organizationId } });
    if (!config?.enabled || config.registrationStatus !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Peppol n\'est pas activé' });
    }

    // Trouver la facture dans les deux tables
    let invoiceSource: 'chantier' | 'standalone' = 'standalone';
    let invoice: { id: string; peppolStatus: string | null; peppolOdooInvoiceId: number | null; invoiceNumber: string | null } | null = null;

    const chantierInv = await db.chantierInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true, peppolStatus: true, peppolOdooInvoiceId: true, invoiceNumber: true },
    });

    if (chantierInv) {
      invoiceSource = 'chantier';
      invoice = chantierInv;
    } else {
      const standaloneInv = await db.standaloneInvoice.findFirst({
        where: { id: invoiceId, organizationId },
        select: { id: true, peppolStatus: true, peppolOdooInvoiceId: true, invoiceNumber: true },
      });
      if (standaloneInv) {
        invoiceSource = 'standalone';
        invoice = standaloneInv;
      }
    }

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    // Seules les factures PROCESSING ou ERROR peuvent être retentées
    if (!['PROCESSING', 'ERROR'].includes(invoice.peppolStatus || '')) {
      return res.status(400).json({
        success: false,
        message: `Impossible de réessayer : statut actuel "${invoice.peppolStatus}"`,
      });
    }

    if (!invoice.peppolOdooInvoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Pas d\'ID Odoo enregistré pour cette facture. Renvoyez-la via le bouton Peppol standard.',
      });
    }

    const bridge = getPeppolBridge();

    // Vérifier l'état actuel dans Odoo
    const odooInvoiceData = await bridge.call('account.move', 'read', [
      [invoice.peppolOdooInvoiceId],
    ], { fields: ['peppol_move_state', 'peppol_message_uuid', 'state'] }) as Array<{
      peppol_move_state: string; peppol_message_uuid?: string; state: string;
    }>;

    if (!odooInvoiceData?.length) {
      return res.status(400).json({ success: false, message: 'Facture non trouvée dans Odoo' });
    }

    const odooState = odooInvoiceData[0].peppol_move_state;

    // Si déjà done dans Odoo, juste mettre à jour en base
    if (odooState === 'done') {
      const updateData = {
        peppolStatus: 'SENT',
        peppolMessageId: odooInvoiceData[0].peppol_message_uuid || invoice.id,
        peppolError: null,
      };

      if (invoiceSource === 'chantier') {
        await db.chantierInvoice.update({ where: { id: invoiceId }, data: { ...updateData, updatedAt: new Date() } });
      } else {
        await db.standaloneInvoice.update({ where: { id: invoiceId }, data: updateData });
      }

      return res.json({ success: true, data: { peppolStatus: 'SENT', message: 'Facture déjà livrée dans Odoo !' } });
    }

    // Re-trigger l'envoi Peppol via le wizard Odoo 17
    const wizardSuccess = await bridge.sendViaWizard(invoice.peppolOdooInvoiceId, config.odooCompanyId!);
    if (!wizardSuccess) {
      logger.warn(`[Peppol] Retry wizard partiel pour invoice ${invoiceId}`);
    }

    // Remettre en PROCESSING avec compteur reset
    const retryData = {
      peppolStatus: 'PROCESSING' as const,
      peppolSentAt: new Date(),
      peppolRetryCount: 0,
      peppolError: 'Retry lancé manuellement',
    };

    if (invoiceSource === 'chantier') {
      await db.chantierInvoice.update({ where: { id: invoiceId }, data: { ...retryData, updatedAt: new Date() } });
    } else {
      await db.standaloneInvoice.update({ where: { id: invoiceId }, data: retryData });
    }


    res.json({
      success: true,
      data: {
        peppolStatus: 'PROCESSING',
        message: 'Envoi Peppol relancé. Le cron vérifiera le statut toutes les 2 minutes.',
      },
    });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /retry/:invoiceId:', error);
    res.status(500).json({ success: false, message: `Erreur de retry: ${(error as Error).message}` });
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

    const runtimeConfigError = getPeppolRuntimeConfigurationError();
    if (runtimeConfigError) {
      return res.status(503).json({ success: false, message: runtimeConfigError });
    }

    const syncResult = await syncIncomingPeppolInvoices({
      organizationId,
      odooCompanyId: config.odooCompanyId,
    });

    // 4. Envoyer notifications pour les nouvelles factures
    const userId = getUserId(req);
    await notifyIncomingInvoices(organizationId, syncResult.newlyImported, userId);


    res.json({
      success: true,
      data: { imported: syncResult.imported, total: syncResult.total, skipped: syncResult.skipped },
      message: syncResult.imported > 0
        ? `${syncResult.imported} nouvelle(s) facture(s) importée(s)`
        : syncResult.total > 0
          ? 'Aucune nouvelle facture (déjà importées)'
          : 'Aucune facture entrante trouvée',
    });
  } catch (error) {
    const details = getPeppolFetchErrorDetails(error);
    logger.error('[Peppol] Erreur POST /fetch-incoming:', error);
    res.status(details.statusCode).json({ success: false, message: details.message });
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
    logger.error('[Peppol] Erreur GET /incoming:', error);
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

    // Note: L'auto-comptabilisation en Expense se fait exclusivement via POST /incoming/:id/accept
    // Le PUT ne sert qu'à mettre à jour le statut/notes sans créer de dépense

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[Peppol] Erreur PUT /incoming/:id:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── POST /incoming/:id/accept — Accepter et auto-comptabiliser ──

router.post('/incoming/:id/accept', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const invoice = await db.peppolIncomingInvoice.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture entrante non trouvée' });

    const userId = getUserId(req);
    const category = req.body.category || 'other';

    // 1. Mettre à jour le statut
    const updated = await db.peppolIncomingInvoice.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED', reviewedBy: userId, reviewedAt: new Date(), notes: req.body.notes },
    });

    // 2. Créer l'expense associée
    const existingExpense = await db.expense.findFirst({
      where: { organizationId, reference: `PEPPOL-${invoice.peppolMessageId}` },
    });

    let expense = existingExpense;
    if (!existingExpense) {
      expense = await db.expense.create({
        data: {
          organizationId,
          createdById: userId,
          supplierName: invoice.senderName || invoice.senderEndpoint || 'Fournisseur Peppol',
          supplierVat: invoice.senderVat || null,
          subtotal: invoice.totalAmount ? (invoice.totalAmount - (invoice.taxAmount || 0)) : 0,
          taxRate: invoice.totalAmount && invoice.taxAmount ? Math.round((invoice.taxAmount / (invoice.totalAmount - invoice.taxAmount)) * 100) : 21,
          taxAmount: invoice.taxAmount || 0,
          totalAmount: invoice.totalAmount || 0,
          currency: invoice.currency || 'EUR',
          category,
          description: `Facture Peppol ${invoice.invoiceNumber || invoice.peppolMessageId}`,
          reference: `PEPPOL-${invoice.peppolMessageId}`,
          expenseDate: invoice.invoiceDate || new Date(),
          status: 'PENDING',
          notes: `Auto-importé depuis facture Peppol. Fournisseur: ${invoice.senderName || '?'}`,
        },
      });
    }

    res.json({ success: true, data: { incoming: updated, expense } });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /incoming/:id/accept:', error);
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
    logger.error('[Peppol] Erreur POST /verify-endpoint:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// ── GET /health — État du service Odoo ──

router.get('/health', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const runtimeConfigError = getPeppolRuntimeConfigurationError();
    if (runtimeConfigError) {
      return res.status(503).json({
        success: false,
        message: runtimeConfigError,
        data: { ok: false, misconfigured: true },
      });
    }

    const bridge = getPeppolBridge();
    const health = await bridge.healthCheck();

    res.json({ success: true, data: health });
  } catch (error) {
    const details = getPeppolFetchErrorDetails(error);
    logger.error('[Peppol] Erreur GET /health:', error);
    res.status(details.statusCode).json({
      success: false,
      message: details.message,
      data: { ok: false },
    });
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
        logger.warn('[Peppol] Impossible de sauvegarder previousAccessPoint:', e);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /vat-lookup:', error);
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
    logger.error('[Peppol] Erreur POST /peppol-check:', error);
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
    logger.error('[Peppol] Erreur POST /auto-register:', error);
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
        logger.warn(`[Peppol] Désinscription Odoo partielle pour org ${organizationId}`);
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
    logger.info(`[Peppol] Organisation ${organizationId} désinscrite de Peppol par utilisateur ${userId}`);

    res.json({
      success: true,
      data: { registrationStatus: 'DEREGISTERED' },
      message: 'Désinscription Peppol effectuée. Vous ne recevrez plus de factures via Peppol.',
    });
  } catch (error) {
    logger.error('[Peppol] Erreur POST /deregister:', error);
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
    logger.error('[Peppol] Erreur POST /complete-migration:', error);
    res.status(500).json({ success: false, message: `Erreur de migration: ${(error as Error).message}` });
  }
});

export default router;

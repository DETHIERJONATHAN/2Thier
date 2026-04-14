import { db } from '../lib/database';
import { logger } from '../lib/logger';
import { getPeppolBridge } from './peppolBridge';

export interface ImportedInvoiceInfo {
  invoiceNumber: string | null;
  senderName: string | null;
  totalAmount: number | null;
  currency: string;
}

export interface IncomingBill {
  id?: number;
  name?: string;
  partnerName?: string;
  partnerVat?: string;
  partnerId?: number;
  amountTotal?: number | string | null;
  amountTax?: number | string | null;
  currency?: string;
  invoiceDate?: string;
  dueDate?: string;
  state?: string;
  peppolMessageId?: string | null;
}

export interface PeppolIncomingSyncResult {
  imported: number;
  skipped: number;
  total: number;
  newlyImported: ImportedInvoiceInfo[];
}

export interface PeppolFetchErrorDetails {
  statusCode: number;
  message: string;
}

const LOCALHOST_URL_REGEX = /^https?:\/\/(?:localhost|127(?:\.\d+){3})(?::\d+)?(?:\/|$)/i;

function getCurrentOdooUrl(): string {
  return process.env.ODOO_URL?.trim() || 'http://localhost:8069';
}

function isLocalhostOdooUrl(url: string): boolean {
  return LOCALHOST_URL_REGEX.test(url);
}

export function getPeppolRuntimeConfigurationError(): string | null {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  const requiredEnvVars = ['ODOO_URL', 'ODOO_DB_NAME', 'ODOO_USER', 'ODOO_PASSWORD'] as const;
  const missing = requiredEnvVars.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    return `Peppol Odoo n'est pas configure en production (${missing.join(', ')} manquant(s)).`;
  }

  const odooUrl = process.env.ODOO_URL!.trim();
  if (isLocalhostOdooUrl(odooUrl)) {
    return 'Peppol Odoo pointe vers localhost en production. Configurez une URL Odoo accessible depuis Cloud Run.';
  }

  return null;
}

export function getPeppolFetchErrorDetails(error: unknown): PeppolFetchErrorDetails {
  const runtimeConfigError = getPeppolRuntimeConfigurationError();
  if (runtimeConfigError) {
    return {
      statusCode: 503,
      message: runtimeConfigError,
    };
  }

  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Erreur inconnue');
  const odooUrl = getCurrentOdooUrl();
  const odooDb = process.env.ODOO_DB_NAME?.trim() || 'odoo_peppol';
  const odooUser = process.env.ODOO_USER?.trim() || 'admin';

  if (/authentication failed|access denied|invalid credentials|login/i.test(rawMessage)) {
    return {
      statusCode: 503,
      message: `Connexion Odoo refusee pour ${odooUrl}. Verifiez ODOO_DB_NAME (${odooDb}), ODOO_USER (${odooUser}) et ODOO_PASSWORD.`,
    };
  }

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|network/i.test(rawMessage)) {
    if (isLocalhostOdooUrl(odooUrl)) {
      return {
        statusCode: 503,
        message: `Aucun service Odoo local ne repond sur ${odooUrl}. Lancez docker compose -f docker-compose.peppol.yml up -d, ou configurez ODOO_URL vers votre instance distante.`,
      };
    }

    return {
      statusCode: 503,
      message: `Service Odoo Peppol inaccessible sur ${odooUrl}. Verifiez ODOO_URL et la connectivite reseau.`,
    };
  }

  if (/invalid field|unknown field|does not exist|traceback|rpc error/i.test(rawMessage)) {
    return {
      statusCode: 502,
      message: 'Odoo a rejete la lecture des factures entrantes. Verifiez la version et les modules Peppol de l\'instance Odoo.',
    };
  }

  return {
    statusCode: 502,
    message: `Erreur Peppol Odoo: ${rawMessage}`,
  };
}

function toOptionalDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toOptionalNumber(value?: number | string | null): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function sanitizeSenderEndpoint(bill: IncomingBill): string {
  const vatEndpoint = typeof bill.partnerVat === 'string'
    ? bill.partnerVat.replace(/^BE/i, '').replace(/[\s.\-]/g, '').trim()
    : '';
  if (vatEndpoint) {
    return vatEndpoint;
  }

  const partnerName = typeof bill.partnerName === 'string'
    ? bill.partnerName.trim().replace(/\s+/g, ' ')
    : '';
  if (partnerName) {
    return partnerName;
  }

  const peppolMessageId = typeof bill.peppolMessageId === 'string' ? bill.peppolMessageId.trim() : '';
  if (peppolMessageId) {
    return peppolMessageId;
  }

  return 'unknown-sender';
}

export async function syncIncomingPeppolInvoices(params: {
  organizationId: string;
  odooCompanyId: number;
  limit?: number;
}): Promise<PeppolIncomingSyncResult> {
  const runtimeConfigError = getPeppolRuntimeConfigurationError();
  if (runtimeConfigError) {
    throw new Error(runtimeConfigError);
  }

  const { organizationId, odooCompanyId, limit } = params;
  const bridge = getPeppolBridge();

  try {
    await bridge.fetchIncomingDocuments(odooCompanyId);
  } catch (error) {
    logger.warn('[PeppolIncomingSync] fetchIncomingDocuments failed, continuing with existing Odoo bills', {
      organizationId,
      odooCompanyId,
      error: error instanceof Error ? error.message : error,
    });
  }

  const lastFetch = await db.peppolIncomingInvoice.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const incomingBills = await bridge.getIncomingInvoices(odooCompanyId, {
    since: lastFetch?.createdAt.toISOString(),
    limit,
  }) as IncomingBill[];

  let imported = 0;
  let skipped = 0;
  const newlyImported: ImportedInvoiceInfo[] = [];

  for (const bill of incomingBills) {
    try {
      const peppolMessageId = typeof bill.peppolMessageId === 'string'
        ? bill.peppolMessageId.trim()
        : '';
      if (!peppolMessageId) {
        skipped++;
        continue;
      }

      if (peppolMessageId.toLowerCase().includes('demo')) {
        skipped++;
        continue;
      }

      const exists = await db.peppolIncomingInvoice.findUnique({
        where: { peppolMessageId },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const senderName = typeof bill.partnerName === 'string' && bill.partnerName.trim()
        ? bill.partnerName.trim()
        : 'Fournisseur Peppol';
      const totalAmount = toOptionalNumber(bill.amountTotal);
      const taxAmount = toOptionalNumber(bill.amountTax);
      const currency = typeof bill.currency === 'string' && bill.currency.trim()
        ? bill.currency.trim()
        : 'EUR';

      await db.peppolIncomingInvoice.create({
        data: {
          organizationId,
          peppolMessageId,
          senderEas: bill.partnerVat?.toUpperCase().startsWith('BE') ? '0208' : '0208',
          senderEndpoint: sanitizeSenderEndpoint({ ...bill, peppolMessageId }),
          senderName,
          senderVat: typeof bill.partnerVat === 'string' && bill.partnerVat.trim() ? bill.partnerVat.trim() : null,
          invoiceNumber: typeof bill.name === 'string' && bill.name.trim() ? bill.name.trim() : null,
          invoiceDate: toOptionalDate(bill.invoiceDate),
          dueDate: toOptionalDate(bill.dueDate),
          totalAmount,
          taxAmount,
          currency,
          status: 'RECEIVED',
        },
      });

      imported++;
      newlyImported.push({
        invoiceNumber: typeof bill.name === 'string' && bill.name.trim() ? bill.name.trim() : null,
        senderName,
        totalAmount,
        currency,
      });
    } catch (error) {
      skipped++;
      logger.error('[PeppolIncomingSync] failed to import incoming bill', {
        organizationId,
        odooCompanyId,
        peppolMessageId: bill.peppolMessageId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  return {
    imported,
    skipped,
    total: incomingBills.length,
    newlyImported,
  };
}

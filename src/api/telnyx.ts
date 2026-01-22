import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { z } from 'zod';
import axios from 'axios';
import { AuthenticatedRequest } from '../middlewares/auth';
import { TelnyxCascadeService } from '../services/TelnyxCascadeService';
import { decrypt, encrypt } from '../utils/crypto';
import { getBackendBaseUrl, joinUrl } from '../utils/baseUrl';
import crypto from 'crypto';

const router = Router();
const prisma = db;

router.use(async (_req, _res, next) => {
  await ensureTelnyxCascadeSchema();
  next();
});

// Configuration Telnyx
const TELNYX_API_URL = 'https://api.telnyx.com/v2';

// ------------------------ Ensure Telnyx cascade schema (non destructif) ------------------------
let telnyxCascadeSchemaEnsured: Promise<void> | null = null;
async function ensureTelnyxCascadeSchema() {
  if (!telnyxCascadeSchemaEnsured) {
    telnyxCascadeSchemaEnsured = (async () => {
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxCall" ADD COLUMN IF NOT EXISTS "answeredBy" TEXT;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConnection" ADD COLUMN IF NOT EXISTS "sipDomain" TEXT;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConnection" ADD COLUMN IF NOT EXISTS "callControlAppId" TEXT;');

        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TelnyxConfig" (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT NOT NULL UNIQUE,
          "encryptedApiKey" TEXT NOT NULL,
          "webhookSigningSecret" TEXT,
          "webhookUrl" TEXT NOT NULL DEFAULT '__AUTO__',
          "defaultConnectionId" TEXT,
          "callControlAppId" TEXT,
          "fallbackPstnNumber" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`);

        // Si la table existait déjà (ancienne version), on ajoute les colonnes manquantes.
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConfig" ADD COLUMN IF NOT EXISTS "webhookSigningSecret" TEXT;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConfig" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConfig" ADD COLUMN IF NOT EXISTS "defaultConnectionId" TEXT;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConfig" ADD COLUMN IF NOT EXISTS "callControlAppId" TEXT;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConfig" ADD COLUMN IF NOT EXISTS "fallbackPstnNumber" TEXT;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;');
        await prisma.$executeRawUnsafe('ALTER TABLE IF EXISTS "TelnyxConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;');

        await prisma.$executeRawUnsafe(`DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxConfig_organizationId_fkey') THEN
            ALTER TABLE "TelnyxConfig"
              ADD CONSTRAINT "TelnyxConfig_organizationId_fkey"
              FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
              ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$;`);
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxConfig_organizationId_idx" ON "TelnyxConfig"("organizationId");');

        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TelnyxSipEndpoint" (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "userId" TEXT,
          name TEXT NOT NULL,
          "sipUsername" TEXT NOT NULL,
          "sipPassword" TEXT NOT NULL,
          "sipDomain" TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          priority INTEGER NOT NULL DEFAULT 1,
          timeout INTEGER NOT NULL DEFAULT 10,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`);
        await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TelnyxSipEndpoint_sipUsername_key" ON "TelnyxSipEndpoint"("sipUsername");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_organizationId_idx" ON "TelnyxSipEndpoint"("organizationId");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_userId_idx" ON "TelnyxSipEndpoint"("userId");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_priority_idx" ON "TelnyxSipEndpoint"(priority);');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxSipEndpoint_status_idx" ON "TelnyxSipEndpoint"(status);');
        await prisma.$executeRawUnsafe(`DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxSipEndpoint_organizationId_fkey') THEN
            ALTER TABLE "TelnyxSipEndpoint"
              ADD CONSTRAINT "TelnyxSipEndpoint_organizationId_fkey"
              FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
              ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxSipEndpoint_userId_fkey') THEN
            ALTER TABLE "TelnyxSipEndpoint"
              ADD CONSTRAINT "TelnyxSipEndpoint_userId_fkey"
              FOREIGN KEY ("userId") REFERENCES "User"("id")
              ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
        END $$;`);

        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TelnyxCallLeg" (
          id TEXT PRIMARY KEY,
          "callId" TEXT NOT NULL,
          "legType" TEXT NOT NULL,
          "endpointId" TEXT,
          destination TEXT NOT NULL,
          status TEXT NOT NULL,
          "dialedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "answeredAt" TIMESTAMP(3),
          "endedAt" TIMESTAMP(3),
          duration INTEGER,
          priority INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`);
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_callId_idx" ON "TelnyxCallLeg"("callId");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_endpointId_idx" ON "TelnyxCallLeg"("endpointId");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_status_idx" ON "TelnyxCallLeg"(status);');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "TelnyxCallLeg_dialedAt_idx" ON "TelnyxCallLeg"("dialedAt");');
        await prisma.$executeRawUnsafe(`DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxCallLeg_callId_fkey') THEN
            ALTER TABLE "TelnyxCallLeg"
              ADD CONSTRAINT "TelnyxCallLeg_callId_fkey"
              FOREIGN KEY ("callId") REFERENCES "TelnyxCall"("callId")
              ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelnyxCallLeg_endpointId_fkey') THEN
            ALTER TABLE "TelnyxCallLeg"
              ADD CONSTRAINT "TelnyxCallLeg_endpointId_fkey"
              FOREIGN KEY ("endpointId") REFERENCES "TelnyxSipEndpoint"("id")
              ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
        END $$;`);
      } catch (e) {
        console.warn('⚠️ [Telnyx API] Impossible de garantir le schéma Telnyx cascade (continuation best-effort):', (e as Error).message);
      }
    })();
  }
  return telnyxCascadeSchemaEnsured;
}

function getHeaderString(req: Request, headerName: string): string | null {
  const value = req.headers[headerName.toLowerCase()];
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim() || null;
  return null;
}

function getOrganizationIdFromRequest(req: AuthenticatedRequest): string | null {
  return req.user?.organizationId || getHeaderString(req, 'x-organization-id');
}

function isSuperAdminFromRequest(req: AuthenticatedRequest): boolean {
  if (req.user?.isSuperAdmin) return true;
  if ((req.user?.role || '').toLowerCase() === 'super_admin') return true;
  const header = (getHeaderString(req, 'x-is-super-admin') || '').toLowerCase();
  return header === 'true' || header === '1' || header === 'yes';
}

type TelnyxAuthResult =
  | { ok: true; headers: Record<string, string>; source: 'db' | 'env' }
  | { ok: false; status: number; code: string; message: string };

async function getTelnyxAuth(organizationId: string): Promise<TelnyxAuthResult> {
  const config = await prisma.telnyxConfig.findUnique({ where: { organizationId } }).catch(() => null);

  const envApiKey = (process.env.TELNYX_API_KEY || '').trim();
  if (!config?.encryptedApiKey && !envApiKey) {
    return {
      ok: false,
      status: 412,
      code: 'TELNYX_NOT_CONFIGURED',
      message: 'Configuration Telnyx manquante. Veuillez enregistrer une clé API Telnyx.',
    };
  }

  let apiKey = envApiKey;
  let source: 'db' | 'env' = envApiKey ? 'env' : 'db';
  if (config?.encryptedApiKey) {
    try {
      apiKey = decrypt(config.encryptedApiKey).trim();
      source = 'db';
    } catch {
      return {
        ok: false,
        status: 400,
        code: 'TELNYX_API_KEY_DECRYPT_FAILED',
        message: "Clé API Telnyx illisible (ENCRYPTION_KEY modifiée ?). Ré-enregistrez la configuration Telnyx.",
      };
    }
  }

  apiKey = apiKey.replace(/^Bearer\s+/i, '').trim();

  if (!apiKey) {
    return {
      ok: false,
      status: 412,
      code: 'TELNYX_NOT_CONFIGURED',
      message: 'Configuration Telnyx manquante. Veuillez enregistrer une clé API Telnyx.',
    };
  }

  return {
    ok: true,
    source,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
}

function getApiKeyMeta(rawKey: string): { length: number; prefix: string | null; fingerprint: string } {
  const trimmed = rawKey.replace(/^Bearer\s+/i, '').trim();
  const prefix = trimmed.length >= 4 ? trimmed.slice(0, 4) : (trimmed.length > 0 ? trimmed : null);
  const fingerprint = crypto.createHash('sha256').update(trimmed).digest('hex').slice(0, 12);
  return { length: trimmed.length, prefix, fingerprint };
}

function normalizeE164(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  // tolérance: + suivi de 6 à 15 chiffres (E.164)
  if (!/^\+[1-9]\d{5,14}$/.test(v)) return null;
  return v;
}

function deriveCountryCodeFromE164(phoneNumber: string): string {
  const v = phoneNumber.trim();
  if (v.startsWith('+32')) return 'BE';
  if (v.startsWith('+33')) return 'FR';
  if (v.startsWith('+31')) return 'NL';
  if (v.startsWith('+49')) return 'DE';
  if (v.startsWith('+44')) return 'GB';
  if (v.startsWith('+352')) return 'LU';
  if (v.startsWith('+34')) return 'ES';
  if (v.startsWith('+39')) return 'IT';
  if (v.startsWith('+41')) return 'CH';
  if (v.startsWith('+1')) return 'US';
  return 'UN';
}

async function getFallbackPstnNumberRaw(organizationId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ fallbackPstnNumber: string | null }>>`
      SELECT "fallbackPstnNumber" FROM "TelnyxConfig" WHERE "organizationId" = ${organizationId} LIMIT 1
    `;
    const raw = rows?.[0]?.fallbackPstnNumber || null;
    return normalizeE164(raw);
  } catch {
    return null;
  }
}

function safeDecryptMaybe(value: string): string {
  try {
    return decrypt(value);
  } catch {
    // rétro-compat: certaines valeurs ont pu être sauvegardées en clair
    return value;
  }
}

function computeTelnyxWebhookUrlFromRequest(req: Request): string {
  return joinUrl(getBackendBaseUrl({ req }), '/api/telnyx/webhooks');
}

function isUnsafeTelnyxWebhookUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return true;
  // Telnyx doit pouvoir atteindre l'URL; on évite les URL de test/loopback qui cassent la prod.
  if (u.includes('webhook.site')) return true;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u)) return true;
  // Ports front Vite en dev (Codespaces): pas routables/pertinents pour les webhooks Telnyx.
  if (/-5173\b|-5174\b/.test(u)) return true;
  return false;
}

function selectTelnyxWebhookUrl(req: Request, configuredWebhookUrl: string | null | undefined): { webhookUrl: string; warnings: string[] } {
  const computed = computeTelnyxWebhookUrlFromRequest(req);
  if (!configuredWebhookUrl || configuredWebhookUrl === '__AUTO__') return { webhookUrl: computed, warnings: [] };
  const custom = configuredWebhookUrl.trim();
  if (isUnsafeTelnyxWebhookUrl(custom)) return { webhookUrl: computed, warnings: ['WEBHOOK_URL_IGNORED_UNSAFE'] };
  return { webhookUrl: custom, warnings: [] };
}

// Garde-fou anti double-clic / spam sur les appels tests (lock relâché en finally)
// Note: on conserve un TTL de sécurité pour éviter un lock “bloqué” en cas de crash.
const sipTestInFlightByOrg = new Map<string, { token: string; expiresAt: number }>();
function acquireSipTestLock(organizationId: string, ttlMs: number = 60_000): string | null {
  const now = Date.now();
  const existing = sipTestInFlightByOrg.get(organizationId);
  if (existing && existing.expiresAt > now) return null;
  const token = `${now}-${Math.random().toString(36).slice(2)}`;
  sipTestInFlightByOrg.set(organizationId, { token, expiresAt: now + ttlMs });
  return token;
}

function releaseSipTestLock(organizationId: string, token: string | null) {
  if (!token) return;
  const current = sipTestInFlightByOrg.get(organizationId);
  if (current?.token === token) sipTestInFlightByOrg.delete(organizationId);
}

async function getActiveOutboundCallsCount(organizationId: string, windowMinutes: number = 20): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  return prisma.telnyxCall.count({
    where: {
      organizationId,
      direction: 'outbound',
      endedAt: null,
      startedAt: { gte: since },
      NOT: [{ status: 'completed' }],
    },
  }).catch(() => 0);
}

async function getOrganizationIdFromCallPayload(callData: any): Promise<string | null> {
  const connectionId = typeof callData?.connection_id === 'string' ? callData.connection_id : null;
  if (connectionId) {
    const conn = await prisma.telnyxConnection.findUnique({ where: { id: connectionId } }).catch(() => null);
    if (conn?.organizationId) return conn.organizationId;
  }

  const to = typeof callData?.to === 'string' ? callData.to.trim() : null;
  if (to) {
    const num = await prisma.telnyxPhoneNumber.findUnique({ where: { phoneNumber: to } }).catch(() => null);
    if (num?.organizationId) return num.organizationId;
  }

  return null;
}

async function getOrganizationIdFromMessagePayload(messageData: any): Promise<string | null> {
  const connectionId = typeof messageData?.connection_id === 'string' ? messageData.connection_id : null;
  if (connectionId) {
    const conn = await prisma.telnyxConnection.findUnique({ where: { id: connectionId } }).catch(() => null);
    if (conn?.organizationId) return conn.organizationId;
  }

  const toCandidate =
    normalizeE164(messageData?.to?.[0]?.phone_number) ||
    normalizeE164(messageData?.to?.phone_number) ||
    normalizeE164(messageData?.to);
  const fromCandidate =
    normalizeE164(messageData?.from?.phone_number) ||
    normalizeE164(messageData?.from);

  // Inbound: to = notre numéro. Outbound: from = notre numéro.
  const candidates = [toCandidate, fromCandidate].filter(Boolean) as string[];
  for (const phoneNumber of candidates) {
    const num = await prisma.telnyxPhoneNumber.findUnique({ where: { phoneNumber } }).catch(() => null);
    if (num?.organizationId) return num.organizationId;
  }

  return null;
}

type PlannedCascadeLeg =
  | { type: 'sip'; destination: string; endpointId?: string; priority: number; timeout: number; sipAuthUsername: string; sipAuthPassword: string }
  | { type: 'pstn'; destination: string; priority: number; timeout: number };

async function planInboundCascadeLegs(organizationId: string): Promise<PlannedCascadeLeg[]> {
  const endpoints = await prisma.telnyxSipEndpoint.findMany({
    where: { organizationId, status: 'active' },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  const legs: PlannedCascadeLeg[] = endpoints.map(ep => {
    const sipPassword = safeDecryptMaybe(ep.sipPassword).trim();
    return {
      type: 'sip',
      destination: `sip:${ep.sipUsername}@${ep.sipDomain}`,
      endpointId: ep.id,
      priority: ep.priority,
      timeout: ep.timeout || 10,
      sipAuthUsername: ep.sipUsername,
      sipAuthPassword: sipPassword,
    };
  });

  const cfg = await prisma.telnyxConfig.findUnique({ where: { organizationId } }).catch(() => null);
  const fallback = normalizeE164((cfg as any)?.fallbackPstnNumber) || (await getFallbackPstnNumberRaw(organizationId));
  if (fallback) {
    const maxPriority = legs.reduce((max, leg) => Math.max(max, leg.priority), 0);
    legs.push({ type: 'pstn', destination: fallback, priority: maxPriority + 1, timeout: 30 });
  }

  return legs;
}

async function transferCallToLeg(params: {
  callControlId: string;
  organizationId: string;
  leg: PlannedCascadeLeg;
  webhookUrl: string;
}): Promise<void> {
  const { callControlId, organizationId, leg, webhookUrl } = params;
  const auth = await getTelnyxAuth(organizationId);
  if (!auth.ok) throw new Error(auth.message);

  const commandId = `xfer-${callControlId}-${Date.now()}`;
  const body: any = {
    to: leg.destination,
    timeout_secs: leg.timeout,
    webhook_url: webhookUrl,
    command_id: commandId,
  };
  if (leg.type === 'sip') {
    body.sip_auth_username = leg.sipAuthUsername;
    body.sip_auth_password = leg.sipAuthPassword;
  }

  try {
    await axios.post(`${TELNYX_API_URL}/calls/${callControlId}/actions/transfer`, body, { headers: auth.headers });
  } catch (error: any) {
    const status = error?.response?.status;
    const details = error?.response?.data;
    const errors = Array.isArray(details?.errors) ? details.errors : undefined;
    console.warn('⚠️ [Telnyx Transfer] échec', {
      status,
      callControlId,
      legType: leg.type,
      destination: leg.destination,
      errors,
      details,
    });
    throw error;
  }
}

// --- DIAGNOSTIC ---
router.get('/diagnostic', async (req: AuthenticatedRequest, res: Response) => {
  const organizationId = getOrganizationIdFromRequest(req);
  if (!organizationId) return res.status(401).json({ ok: false, error: 'Non autorisé' });

  const computedWebhookUrl = computeTelnyxWebhookUrlFromRequest(req);
  const result: any = {
    ok: false,
    organizationId,
    computedWebhookUrl,
    checks: [] as Array<{ name: string; ok: boolean; details?: any }>,
  };

  const config = await prisma.telnyxConfig.findUnique({ where: { organizationId } }).catch(() => null);
  const fallbackPstnNumber = (await getFallbackPstnNumberRaw(organizationId)) || normalizeE164((config as any)?.fallbackPstnNumber);
  const storedWebhookUrl = config?.webhookUrl || null;
  const webhookMode = (!storedWebhookUrl || storedWebhookUrl === '__AUTO__') ? 'auto' : 'custom';
  result.config = {
    exists: Boolean(config),
    hasEncryptedApiKey: Boolean(config?.encryptedApiKey),
    webhookMode,
    webhookUrl: webhookMode === 'custom' ? storedWebhookUrl : null,
    defaultConnectionId: config?.defaultConnectionId || null,
    callControlAppId: config?.callControlAppId || null,
    fallbackPstnNumber: fallbackPstnNumber || null,
  };

  // Vérifier la présence du schéma requis (sans reset): TelnyxConfig/TelnyxSipEndpoint/TelnyxCallLeg
  // (méthode robuste: tente de requêter chaque table, sans dépendre de pg_catalog/to_regclass)
  try {
    const present: Record<string, boolean> = {
      TelnyxConfig: false,
      TelnyxSipEndpoint: false,
      TelnyxCallLeg: false,
    };

    for (const tableName of Object.keys(present)) {
      try {
        await prisma.$queryRawUnsafe(`SELECT 1 FROM "${tableName}" LIMIT 1`);
        present[tableName] = true;
      } catch {
        present[tableName] = false;
      }
    }

    result.checks.push({
      name: 'db_telnyx_cascade_schema',
      ok: Boolean(present.TelnyxConfig && present.TelnyxSipEndpoint && present.TelnyxCallLeg),
      details: {
        present,
        hint: 'Si un élément manque: exécuter add-telnyx-cascade-schema.sql (aucun reset).',
      },
    });
  } catch {
    result.checks.push({
      name: 'db_telnyx_cascade_schema',
      ok: false,
      details: {
        message: 'Impossible de vérifier le schéma DB (connexion indisponible).',
      },
    });
  }

  // Vérifier déchiffrement (si config DB)
  if (config?.encryptedApiKey) {
    try {
      const decrypted = decrypt(config.encryptedApiKey);
      result.checks.push({ name: 'decrypt', ok: true });
      try {
        result.apiKeyMeta = getApiKeyMeta(String(decrypted || ''));
      } catch {
        // ignore meta failures
      }
    } catch {
      result.checks.push({
        name: 'decrypt',
        ok: false,
        details: {
          code: 'TELNYX_API_KEY_DECRYPT_FAILED',
          message: "Clé API chiffrée illisible (ENCRYPTION_KEY modifiée ?). Ré-enregistrez la configuration.",
        },
      });
      return res.json(result);
    }
  }

  // Vérifier auth (clé présente)
  const auth = await getTelnyxAuth(organizationId);
  if (!auth.ok) {
    result.checks.push({ name: 'auth', ok: false, details: { code: auth.code, message: auth.message } });
    return res.json(result);
  }
  result.apiKeySource = auth.source;
  result.checks.push({ name: 'auth', ok: true, details: { source: auth.source } });

  // Vérifier que le webhook_event_url de la (ou des) Call Control App(s) pointe bien vers le CRM
  const expected = selectTelnyxWebhookUrl(req, config?.webhookUrl || '__AUTO__').webhookUrl;

  const numberConnectionIds = await prisma.telnyxPhoneNumber.findMany({
    where: { organizationId },
    select: { connectionId: true },
  }).then(rows => rows.map(r => String(r.connectionId || '').trim()).filter(Boolean)).catch(() => [] as string[]);

  const connectionIds = await prisma.telnyxConnection.findMany({
    where: { organizationId },
    select: { id: true },
  }).then(rows => rows.map(r => String(r.id || '').trim()).filter(Boolean)).catch(() => [] as string[]);

  const envConnectionId = String(process.env.TELNYX_CONNECTION_ID || '').trim();

  const candidateAppIds = Array.from(new Set([
    (config?.callControlAppId || '').trim(),
    (config?.defaultConnectionId || '').trim(),
    envConnectionId,
    ...numberConnectionIds,
    ...connectionIds,
  ].filter(Boolean)));

  if (candidateAppIds.length > 0) {
    const details: Array<{ id: string; kind: 'call_control_app' | 'connection' | 'unknown'; current: string | null; failover: string | null; ok: boolean; found: boolean; applicationName?: string | null; connectionName?: string | null }> = [];
    for (const id of candidateAppIds) {
      try {
        const appRes = await axios.get(`${TELNYX_API_URL}/call_control_applications/${id}`, { headers: auth.headers });
        const current = String(appRes?.data?.data?.webhook_event_url || '').trim() || null;
        const failover = String(appRes?.data?.data?.webhook_event_failover_url || '').trim() || null;
        const applicationName = String(appRes?.data?.data?.application_name || '').trim() || null;
        const ok = Boolean(current && current === expected) && (!failover || failover === expected);
        details.push({ id, kind: 'call_control_app', current, failover, ok, found: true, applicationName });
      } catch {
        // Peut-être une Connection (ex: SIP trunking / call control via connection webhook)
        try {
          const connRes = await axios.get(`${TELNYX_API_URL}/connections/${id}`, { headers: auth.headers });
          const fields = pickTelnyxWebhookFields(connRes?.data?.data);
          const connectionName = String(connRes?.data?.data?.connection_name || '').trim() || null;
          const ok = Boolean(fields.webhook_event_url && fields.webhook_event_url === expected) && (!fields.webhook_event_failover_url || fields.webhook_event_failover_url === expected);
          details.push({ id, kind: 'connection', current: fields.webhook_event_url, failover: fields.webhook_event_failover_url, ok, found: true, connectionName });
        } catch {
          details.push({ id, kind: 'unknown', current: null, failover: null, ok: false, found: false });
        }
      }
    }
    const okAny = details.some(d => d.ok);
    result.checks.push({
      name: 'telnyx_call_control_app_webhook',
      ok: okAny,
      details: {
        expected,
        candidateSources: {
          config_callControlAppId: config?.callControlAppId || null,
          config_defaultConnectionId: config?.defaultConnectionId || null,
          env_TELNYX_CONNECTION_ID: envConnectionId || null,
          phoneNumbers_connectionIds: numberConnectionIds,
          connections_ids: connectionIds,
        },
        candidates: details,
        hint: okAny ? null : 'Aucune cible Telnyx (Call Control App ou Connection) ne pointe vers le CRM. Clique “Appliquer à Telnyx” après synchronisation.',
      },
    });
  }

  // Ping Telnyx: connections (permission la plus commune)
  try {
    const response = await axios.get(`${TELNYX_API_URL}/connections`, {
      headers: auth.headers,
      params: { 'page[size]': 1 },
    });

    const count = Array.isArray(response.data?.data) ? response.data.data.length : null;
    result.checks.push({ name: 'telnyx_connections', ok: true, details: { sampleCount: count } });
    result.ok = true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data: any = error.response?.data;
      const detail = data?.errors?.[0]?.detail || data?.error || data?.message;
      result.checks.push({
        name: 'telnyx_connections',
        ok: false,
        details: {
          status: status ?? null,
          code: status === 401 || status === 403 ? 'TELNYX_UNAUTHORIZED' : 'TELNYX_API_ERROR',
          message: detail || 'Erreur Telnyx',
        },
      });
      return res.json(result);
    }

    result.checks.push({ name: 'telnyx_connections', ok: false, details: { message: 'Erreur inconnue' } });
    return res.json(result);
  }

  return res.json(result);
});

function respondTelnyxAxiosError(res: Response, error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data: any = error.response?.data;
    const detail = data?.errors?.[0]?.detail || data?.error || data?.message;

    if (status === 401 || status === 403) {
      return res.status(status).json({
        error: 'Accès Telnyx refusé (clé API invalide ou permissions insuffisantes).',
        details: detail,
        code: 'TELNYX_UNAUTHORIZED',
      });
    }

    if (typeof status === 'number') {
      return res.status(status).json({
        error: fallbackMessage,
        details: detail,
        code: 'TELNYX_API_ERROR',
      });
    }
  }

  return res.status(500).json({ error: fallbackMessage });
}

function pickTelnyxWebhookFields(resource: any): { webhook_event_url: string | null; webhook_event_failover_url: string | null } {
  const current = String(resource?.webhook_event_url || '').trim() || null;
  const failover = String(resource?.webhook_event_failover_url || '').trim() || null;
  return { webhook_event_url: current, webhook_event_failover_url: failover };
}

function shouldDebugTelnyxWebhooks(): boolean {
  return (process.env.TELNYX_DEBUG_WEBHOOKS || '').trim() === '1';
}

function telnyxWebhookDebugLog(...args: any[]) {
  if (!shouldDebugTelnyxWebhooks()) return;
  // eslint-disable-next-line no-console
  console.log('🧷 [Telnyx Webhook Debug]', ...args);
}

async function patchTelnyxCallControlApplicationWebhook(params: {
  id: string;
  desiredWebhookUrl: string;
  headers: Record<string, string>;
  applicationName?: string;
}): Promise<
  | { ok: true; before: any; after: any }
  | { ok: false; status?: number | null; detail?: string | null }
> {
  const { id, desiredWebhookUrl, headers, applicationName } = params;
  try {
    const beforeRes = await axios.get(`${TELNYX_API_URL}/call_control_applications/${id}`, { headers });
    const before = beforeRes?.data?.data;

    const baseFields: any = {
      webhook_event_url: desiredWebhookUrl,
      webhook_event_failover_url: desiredWebhookUrl,
    };
    if (applicationName && applicationName.trim()) {
      baseFields.application_name = applicationName.trim();
    }

    // Tolérance: certains endpoints Telnyx acceptent {data:{...}}.
    const payloads = [baseFields, { data: baseFields }];

    let patched = false;
    let lastErr: unknown = null;
    for (const body of payloads) {
      try {
        await axios.patch(`${TELNYX_API_URL}/call_control_applications/${id}`, body, { headers });
        patched = true;
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!patched) {
      const status = axios.isAxiosError(lastErr) ? (lastErr.response?.status ?? null) : null;
      const data: any = axios.isAxiosError(lastErr) ? lastErr.response?.data : null;
      const detail = data?.errors?.[0]?.detail || data?.error || data?.message || null;
      return { ok: false, status, detail };
    }

    const afterRes = await axios.get(`${TELNYX_API_URL}/call_control_applications/${id}`, { headers });
    const after = afterRes?.data?.data;
    return { ok: true, before, after };
  } catch (e) {
    const status = axios.isAxiosError(e) ? (e.response?.status ?? null) : null;
    const data: any = axios.isAxiosError(e) ? e.response?.data : null;
    const detail = data?.errors?.[0]?.detail || data?.error || data?.message || null;
    return { ok: false, status, detail };
  }
}

async function patchTelnyxConnectionWebhook(params: {
  id: string;
  desiredWebhookUrl: string;
  headers: Record<string, string>;
  outboundVoiceProfileId?: string | null;
}): Promise<
  | { ok: true; before: any; after: any; skippedOutboundProfile?: boolean }
  | { ok: false; status?: number | null; detail?: string | null }
> {
  const { id, desiredWebhookUrl, headers, outboundVoiceProfileId } = params;
  try {
    const beforeRes = await axios.get(`${TELNYX_API_URL}/connections/${id}`, { headers });
    const before = beforeRes?.data?.data;

    // Telnyx peut basculer sur un URL failover; on force les deux vers le CRM.
    const currentOutboundProfileId =
      (typeof before?.outbound_voice_profile_id === 'string' ? before.outbound_voice_profile_id : null)
      || (typeof before?.outbound?.outbound_voice_profile_id === 'string' ? before.outbound.outbound_voice_profile_id : null);

    const shouldSetOutboundProfile = Boolean(
      outboundVoiceProfileId && outboundVoiceProfileId.trim() && outboundVoiceProfileId !== currentOutboundProfileId
    );

    const basePayload: Record<string, any> = {
      webhook_event_url: desiredWebhookUrl,
      webhook_event_failover_url: desiredWebhookUrl,
    };

    if (shouldSetOutboundProfile) {
      basePayload.outbound_voice_profile_id = outboundVoiceProfileId;
    }

    const payloads = [
      basePayload,
      { data: basePayload },
    ];

    let patched = false;
    let lastErr: unknown = null;
    for (const body of payloads) {
      try {
        await axios.patch(`${TELNYX_API_URL}/connections/${id}`, body, { headers });
        patched = true;
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!patched) {
      const status = axios.isAxiosError(lastErr) ? (lastErr.response?.status ?? null) : null;
      const data: any = axios.isAxiosError(lastErr) ? lastErr.response?.data : null;
      const detail = data?.errors?.[0]?.detail || data?.error || data?.message || null;
      return { ok: false, status, detail };
    }

    const afterRes = await axios.get(`${TELNYX_API_URL}/connections/${id}`, { headers });
    const after = afterRes?.data?.data;
    return { ok: true, before, after, skippedOutboundProfile: !shouldSetOutboundProfile };
  } catch (e) {
    const status = axios.isAxiosError(e) ? (e.response?.status ?? null) : null;
    const data: any = axios.isAxiosError(e) ? e.response?.data : null;
    const detail = data?.errors?.[0]?.detail || data?.error || data?.message || null;
    return { ok: false, status, detail };
  }
}

// Schemas de validation
const makeCallSchema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  connection_id: z.string().optional(),
  lead_id: z.string().optional(),
  webhook_url: z.string().url().optional()
});

const sendMessageSchema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  text: z.string().min(1).max(1600),
  type: z.enum(['SMS', 'MMS']).default('SMS'),
  lead_id: z.string().optional(),
  media_urls: z.array(z.string().url()).optional()
});

const purchaseNumberSchema = z.object({
  country: z.string().length(2),
  type: z.enum(['local', 'toll-free', 'national', 'mobile']),
  area_code: z.string().optional()
});

// Interfaces TypeScript pour Telnyx API
interface TelnyxConnectionResponse {
  id: string;
  connection_name?: string;
  active: boolean;
  outbound?: { type: string };
  outbound_voice_profile_id?: string;
  webhook_event_url?: string;
  created_at: string;
  updated_at: string;
}

interface TelnyxPhoneNumberResponse {
  id: string;
  phone_number: string;
  status: string;
  country_code: string;
  phone_number_type: string;
  features?: string[];
  monthly_recurring_cost?: string;
  connection_id?: string;
  purchased_at: string;
}

interface TelnyxCallUpdateData {
  status?: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  updatedAt: Date;
}

// --- CONNEXIONS ---
router.get('/connections', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔍 [Telnyx API] Récupération des connexions...');

    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log('[Telnyx API] organizationId:', organizationId);
    
    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      const cached = await prisma.telnyxConnection.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
      });

      res.setHeader('x-telnyx-warning', auth.code);
      return res.json(
        cached.map(conn => ({
          id: conn.id,
          name: conn.name,
          status: conn.status,
          type: conn.type,
          webhook_url: conn.webhookUrl,
          created_at: conn.createdAt?.toISOString?.() ?? new Date().toISOString(),
          updated_at: conn.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        }))
      );
    }
    
    // Récupérer depuis Telnyx
    const response = await axios.get(`${TELNYX_API_URL}/connections`, {
      headers: auth.headers,
    });

    const connections = response.data.data.map((conn: TelnyxConnectionResponse) => ({
      id: conn.id,
      name: conn.connection_name || `Connection ${conn.id.substring(0, 8)}`,
      status: conn.active ? 'active' : 'inactive',
      type: conn.outbound?.type || 'voice',
      webhook_url: conn.webhook_event_url,
      created_at: conn.created_at,
      updated_at: conn.updated_at
    }));

    // Sauvegarder en base
    for (const conn of connections) {
      try {
        await prisma.telnyxConnection.upsert({
          where: { id: conn.id },
          update: {
            name: conn.name,
            status: conn.status,
            type: conn.type,
            webhookUrl: conn.webhook_url,
            updatedAt: new Date(),
          },
          create: {
            id: conn.id,
            name: conn.name,
            status: conn.status,
            type: conn.type,
            webhookUrl: conn.webhook_url,
            organizationId: organizationId,
            createdAt: new Date(conn.created_at),
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.warn('⚠️ [Telnyx API] Connexion non sauvegardée en DB:', conn.id, dbError);
      }
    }

    console.log(`✅ [Telnyx API] ${connections.length} connexions synchronisées`);
    res.json(connections);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur connexions:', error);
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    const cached = await prisma.telnyxConnection.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => []);

    if (cached.length > 0) {
      res.setHeader('x-telnyx-warning', 'TELNYX_CONNECTIONS_FALLBACK_CACHE');
      return res.json(
        cached.map(conn => ({
          id: conn.id,
          name: conn.name,
          status: conn.status,
          type: conn.type,
          webhook_url: conn.webhookUrl,
          created_at: conn.createdAt?.toISOString?.() ?? new Date().toISOString(),
          updated_at: conn.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        }))
      );
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        res.setHeader('x-telnyx-warning', 'TELNYX_UNAUTHORIZED');
        return res.json([]);
      }
    }

    res.setHeader('x-telnyx-warning', 'TELNYX_CONNECTIONS_UNAVAILABLE');
    return res.json([]);
  }
});

// --- NUMÉROS DE TÉLÉPHONE ---
router.get('/phone-numbers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔍 [Telnyx API] Récupération des numéros...');

    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    
    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      const cached = await prisma.telnyxPhoneNumber.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
      });

      res.setHeader('x-telnyx-warning', auth.code);
      return res.json(
        cached.map(number => ({
          id: number.id,
          phone_number: number.phoneNumber,
          status: number.status,
          country_code: number.countryCode,
          number_type: number.numberType,
          features: number.features || [],
          monthly_cost: Number(number.monthlyCost || 0),
          connection_id: number.connectionId,
          purchased_at: number.purchasedAt?.toISOString?.(),
        }))
      );
    }
    
    const response = await axios.get(`${TELNYX_API_URL}/phone_numbers`, {
      headers: auth.headers,
      params: { 'page[size]': 250 }
    });

    const phoneNumbers = response.data.data.map((number: TelnyxPhoneNumberResponse) => ({
      id: number.id,
      phone_number: number.phone_number,
      status: number.status,
      country_code: number.country_code,
      number_type: number.phone_number_type,
      features: number.features || [],
      monthly_cost: parseFloat(number.monthly_recurring_cost || '0'),
      connection_id: number.connection_id,
      purchased_at: number.purchased_at
    }));

    // Sauvegarder en base
    for (const number of phoneNumbers) {
      try {
        const safeCountryCode = (number.country_code && String(number.country_code).trim().length > 0)
          ? String(number.country_code).trim()
          : deriveCountryCodeFromE164(String(number.phone_number || ''));
        await prisma.telnyxPhoneNumber.upsert({
          where: { id: number.id },
          update: {
            phoneNumber: number.phone_number,
            status: number.status,
            countryCode: safeCountryCode,
            numberType: number.number_type,
            features: number.features,
            monthlyCost: number.monthly_cost,
            connectionId: number.connection_id,
            updatedAt: new Date(),
          },
          create: {
            id: number.id,
            phoneNumber: number.phone_number,
            status: number.status,
            countryCode: safeCountryCode,
            numberType: number.number_type,
            features: number.features,
            monthlyCost: number.monthly_cost,
            connectionId: number.connection_id,
            organizationId: organizationId,
            purchasedAt: new Date(number.purchased_at),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.warn('⚠️ [Telnyx API] Numéro non sauvegardé en DB:', number.id, dbError);
      }
    }

    console.log(`✅ [Telnyx API] ${phoneNumbers.length} numéros synchronisés`);
    res.json(phoneNumbers);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur numéros:', error);
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    const cached = await prisma.telnyxPhoneNumber.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    }).catch(() => []);

    if (cached.length > 0) {
      res.setHeader('x-telnyx-warning', 'TELNYX_PHONE_NUMBERS_FALLBACK_CACHE');
      return res.json(
        cached.map(number => ({
          id: number.id,
          phone_number: number.phoneNumber,
          status: number.status,
          country_code: number.countryCode,
          number_type: number.numberType,
          features: number.features || [],
          monthly_cost: Number(number.monthlyCost || 0),
          connection_id: number.connectionId,
          purchased_at: number.purchasedAt?.toISOString?.(),
        }))
      );
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        res.setHeader('x-telnyx-warning', 'TELNYX_UNAUTHORIZED');
        return res.json([]);
      }
    }

    res.setHeader('x-telnyx-warning', 'TELNYX_PHONE_NUMBERS_UNAVAILABLE');
    return res.json([]);
  }
});

router.post('/phone-numbers/purchase', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = purchaseNumberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Paramètres invalides pour l\'achat de numéro',
        code: 'TELNYX_INVALID_PURCHASE_PARAMS',
        issues: parsed.error.issues,
      });
    }

    const data = parsed.data;
    console.log('🛒 [Telnyx API] Achat de numéro:', data);

    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });

    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.message, code: auth.code });
    }

    // Rechercher des numéros disponibles
    const searchResponse = await axios.get(`${TELNYX_API_URL}/available_phone_numbers`, {
      headers: auth.headers,
      params: {
        'filter[country_code]': data.country,
        'filter[phone_number_type]': data.type,
        'filter[area_code]': data.area_code,
        'page[size]': 10
      }
    });

    if (!searchResponse.data.data.length) {
      return res.status(404).json({ error: 'Aucun numéro disponible avec ces critères' });
    }

    // Acheter le premier numéro disponible
    const availableNumber = searchResponse.data.data[0];
    const purchaseResponse = await axios.post(`${TELNYX_API_URL}/phone_number_orders`, {
      phone_numbers: [{ phone_number: availableNumber.phone_number }]
    }, { headers: auth.headers });

    console.log('✅ [Telnyx API] Numéro acheté:', availableNumber.phone_number);
    res.json({ 
      success: true, 
      phone_number: availableNumber.phone_number,
      order_id: purchaseResponse.data.data.id 
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur achat numéro:', error);
    return respondTelnyxAxiosError(res, error, "Erreur lors de l'achat du numéro");
  }
});

// --- APPELS ---
router.get('/calls', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log(`🔍 [Telnyx API] Récupération des appels (${limit})...`);
    
    const calls = await prisma.telnyxCall.findMany({
      where: { organizationId: organizationId },
      orderBy: { startedAt: 'desc' },
      take: limit
    });

    const formattedCalls = calls.map(call => ({
      id: call.id,
      call_id: call.callId,
      from: call.fromNumber,
      to: call.toNumber,
      direction: call.direction,
      status: call.status,
      duration: call.duration || 0,
      cost: call.cost || 0,
      started_at: call.startedAt.toISOString(),
      ended_at: call.endedAt?.toISOString(),
      recording_url: call.recordingUrl,
      lead_id: call.leadId
    }));

    console.log(`✅ [Telnyx API] ${formattedCalls.length} appels récupérés`);
    res.json(formattedCalls);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération appels:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des appels' });
  }
});

router.post('/calls', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = makeCallSchema.parse(req.body);
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log('📞 [Telnyx API] Initiation appel AVEC CASCADE:', data);

    // 🧠 UTILISER LE SERVICE DE CASCADE TELNYX
    const result = await TelnyxCascadeService.initiateCallWithCascade({
      organizationId,
      fromNumber: data.from,
      toNumber: data.to,
      leadId: data.lead_id
    }, req);

    console.log('✅ [Telnyx API] Appel initié avec cascade:', result.callControlId);
    
    res.json({
      success: true,
      id: result.callId,
      call_id: result.callControlId,
      from: data.from,
      to: data.to,
      status: 'initiated',
      cascade: result.cascade
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur initiation appel:', error);
    return respondTelnyxAxiosError(res, error, "Erreur lors de l'initiation de l'appel");
  }
});

// Raccrocher tous les appels outbound actifs (utile quand Telnyx refuse pour limite de concurrence)
router.post('/calls/hangup-active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    const organizationId = (req.body?.organizationId as string | undefined) || requesterOrgId;
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    if (!isSuperAdmin && requesterOrgId && organizationId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.message, code: auth.code });

    const since = new Date(Date.now() - 30 * 60_000);
    const active = await prisma.telnyxCall.findMany({
      where: {
        organizationId,
        direction: 'outbound',
        endedAt: null,
        startedAt: { gte: since },
        NOT: [{ status: 'completed' }],
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    }).catch(() => []);

    let hangupAttempted = 0;
    let hangupOk = 0;
    let clearedStale = 0;
    const errors: Array<{ callId: string; status?: number | null; detail?: string | null }> = [];

    for (const call of active) {
      const callControlId = call.callId;
      if (!callControlId) continue;
      hangupAttempted += 1;
      try {
        await axios.post(`${TELNYX_API_URL}/calls/${callControlId}/actions/hangup`, {}, { headers: auth.headers });
        hangupOk += 1;
        await prisma.telnyxCall.update({
          where: { id: call.id },
          data: { status: 'completed', endedAt: new Date(), updatedAt: new Date() },
        }).catch(() => null);
      } catch (err) {
        const status = axios.isAxiosError(err) ? (err.response?.status ?? null) : null;
        const data: any = axios.isAxiosError(err) ? err.response?.data : null;
        const detail = data?.errors?.[0]?.detail || data?.error || data?.message || null;
        errors.push({ callId: callControlId, status, detail });

        // Si Telnyx dit que l'appel n'existe plus / n'est plus valide, on nettoie quand même la DB.
        // Ça évite de bloquer les tests quand les webhooks ne reviennent pas.
        if (status === 404 || status === 422) {
          await prisma.telnyxCall.update({
            where: { id: call.id },
            data: { status: 'completed', endedAt: new Date(), updatedAt: new Date() },
          }).catch(() => null);
          clearedStale += 1;
        }
      }
    }

    return res.json({
      success: true,
      organizationId,
      activeFound: active.length,
      hangupAttempted,
      hangupOk,
      clearedStale,
      errors,
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur hangup-active:', error);
    return respondTelnyxAxiosError(res, error, 'Erreur lors du raccrochage des appels actifs');
  }
});

router.post('/calls/:callId/hangup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log('☎️ [Telnyx API] Raccrocher appel:', callId);

    // Rechercher l'appel en base
    const call = await prisma.telnyxCall.findFirst({
      where: { 
        callId: callId,
        organizationId: organizationId
      }
    });

    if (!call) {
      return res.status(404).json({ error: 'Appel non trouvé' });
    }

    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.message, code: auth.code });
    }

    // Raccrocher via Telnyx
    await axios.post(`${TELNYX_API_URL}/calls/${callId}/actions/hangup`, {}, {
      headers: auth.headers
    });

    // Mettre à jour en base
    await prisma.telnyxCall.update({
      where: { id: call.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [Telnyx API] Appel raccroché:', callId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur raccrocher:', error);
    return respondTelnyxAxiosError(res, error, 'Erreur lors du raccrochage');
  }
});

router.post('/calls/:callId/mute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log('🔇 [Telnyx API] Couper micro:', callId);

    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.message, code: auth.code });
    }

    await axios.post(`${TELNYX_API_URL}/calls/${callId}/actions/mute`, {}, {
      headers: auth.headers
    });

    console.log('✅ [Telnyx API] Micro coupé:', callId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur mute:', error);
    return respondTelnyxAxiosError(res, error, 'Erreur lors de la coupure du micro');
  }
});

router.post('/calls/:callId/unmute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { callId } = req.params;
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log('🔊 [Telnyx API] Activer micro:', callId);

    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.message, code: auth.code });
    }

    await axios.post(`${TELNYX_API_URL}/calls/${callId}/actions/unmute`, {}, {
      headers: auth.headers
    });

    console.log('✅ [Telnyx API] Micro activé:', callId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur unmute:', error);
    return respondTelnyxAxiosError(res, error, "Erreur lors de l'activation du micro");
  }
});

// --- MESSAGES ---
router.get('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log(`🔍 [Telnyx API] Récupération des messages (${limit})...`);
    
    const messages = await prisma.telnyxMessage.findMany({
      where: { organizationId: organizationId },
      orderBy: { sentAt: 'desc' },
      take: limit
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      message_id: msg.messageId,
      from: msg.fromNumber,
      to: msg.toNumber,
      direction: msg.direction,
      type: msg.type,
      text: msg.text,
      status: msg.status,
      cost: msg.cost || 0,
      sent_at: msg.sentAt.toISOString(),
      delivered_at: msg.deliveredAt?.toISOString(),
      media_urls: msg.mediaUrls || [],
      lead_id: msg.leadId
    }));

    console.log(`✅ [Telnyx API] ${formattedMessages.length} messages récupérés`);
    res.json(formattedMessages);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération messages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

router.post('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = sendMessageSchema.parse(req.body);
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log('💬 [Telnyx API] Envoi message:', data);

    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.message, code: auth.code });
    }

    // Envoi via Telnyx
    const response = await axios.post(`${TELNYX_API_URL}/messages`, {
      to: data.to,
      from: data.from,
      text: data.text,
      type: data.type,
      media_urls: data.media_urls,
      webhook_url: joinUrl(getBackendBaseUrl({ req }), '/api/telnyx/webhooks/messages')
    }, { headers: auth.headers });

    const messageData = response.data.data;

    // Sauvegarder en base
    const message = await prisma.telnyxMessage.create({
      data: {
        id: `msg-${Date.now()}`,
        messageId: messageData.id,
        fromNumber: data.from,
        toNumber: data.to,
        direction: 'outbound',
        type: data.type,
        text: data.text,
        status: 'sent',
        organizationId: organizationId,
        leadId: data.lead_id,
        mediaUrls: data.media_urls || [],
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [Telnyx API] Message envoyé:', message.messageId);
    res.json({
      id: message.id,
      message_id: message.messageId,
      status: message.status
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur envoi message:', error);
    return respondTelnyxAxiosError(res, error, "Erreur lors de l'envoi du message");
  }
});

// --- WEBHOOKS ---
router.post('/webhooks/calls', async (req: Request, res: Response) => {
  try {
    const webhook = req.body;
    console.log('🪝 [Telnyx Webhook] Appel:', webhook.data?.event_type);

    const callData = webhook.data?.payload;
    if (!callData) {
      return res.json({ received: true });
    }

    // Mettre à jour l'appel en base
    const call = await prisma.telnyxCall.findFirst({
      where: { callId: callData.call_control_id }
    });

    if (call) {
      const updateData: TelnyxCallUpdateData = {
        status: callData.state || call.status,
        updatedAt: new Date()
      };

      if (callData.state === 'bridged') {
        updateData.startedAt = new Date();
      } else if (['hangup', 'completed'].includes(callData.state)) {
        updateData.endedAt = new Date();
        updateData.duration = callData.hangup_duration_millis ? 
          Math.floor(callData.hangup_duration_millis / 1000) : 0;
      }

      await prisma.telnyxCall.update({
        where: { id: call.id },
        data: updateData
      });

      console.log(`✅ [Telnyx Webhook] Appel mis à jour: ${call.callId} -> ${callData.state}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ [Telnyx Webhook] Erreur appel:', error);
    res.status(500).json({ error: 'Erreur webhook appel' });
  }
});

router.post('/webhooks/messages', async (req: Request, res: Response) => {
  try {
    const webhook = req.body;
    console.log('🪝 [Telnyx Webhook] Message:', webhook.data?.event_type);

    const messageData = webhook.data?.payload;
    if (!messageData) {
      return res.json({ received: true });
    }

    // Traiter selon le type d'événement
    const eventType = webhook.data.event_type;
    
    if (eventType === 'message.received') {
      const organizationId = await getOrganizationIdFromMessagePayload(messageData);
      if (!organizationId) {
        console.warn('⚠️ [Telnyx Webhook] SMS entrant: org introuvable, skip:', messageData?.id);
        return res.json({ received: true });
      }
      // Message entrant
      await prisma.telnyxMessage.create({
        data: {
          id: `msg-${Date.now()}`,
          messageId: messageData.id,
          fromNumber: messageData.from.phone_number,
          toNumber: messageData.to[0].phone_number,
          direction: 'inbound',
          type: messageData.type,
          text: messageData.text,
          status: 'delivered',
          organizationId,
          sentAt: new Date(messageData.received_at),
          deliveredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ [Telnyx Webhook] Message entrant sauvegardé:', messageData.id);
    } else if (eventType === 'message.sent') {
      // Mettre à jour le statut du message sortant
      const message = await prisma.telnyxMessage.findFirst({
        where: { messageId: messageData.id }
      });

      if (message) {
        await prisma.telnyxMessage.update({
          where: { id: message.id },
          data: {
            status: 'delivered',
            deliveredAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log('✅ [Telnyx Webhook] Message livré:', messageData.id);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ [Telnyx Webhook] Erreur message:', error);
    res.status(500).json({ error: 'Erreur webhook message' });
  }
});

// --- SYNCHRONISATION ---
router.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔄 [Telnyx API] Synchronisation complète...');

    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });

    const auth = await getTelnyxAuth(organizationId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.message, code: auth.code });
    }

    // Synchroniser toutes les données
    const [connectionsRes, numbersRes] = await Promise.all([
      axios.get(`${TELNYX_API_URL}/connections`, { headers: auth.headers }),
      axios.get(`${TELNYX_API_URL}/phone_numbers`, { 
        headers: auth.headers,
        params: { 'page[size]': 250 }
      })
    ]);

    // Mettre à jour les connexions
    for (const conn of connectionsRes.data.data) {
      try {
        await prisma.telnyxConnection.upsert({
          where: { id: conn.id },
          update: {
            name: conn.connection_name || `Connection ${conn.id.substring(0, 8)}`,
            status: conn.active ? 'active' : 'inactive',
            type: conn.outbound?.type || 'voice',
            webhookUrl: conn.webhook_event_url,
            updatedAt: new Date(),
          },
          create: {
            id: conn.id,
            name: conn.connection_name || `Connection ${conn.id.substring(0, 8)}`,
            status: conn.active ? 'active' : 'inactive',
            type: conn.outbound?.type || 'voice',
            webhookUrl: conn.webhook_event_url,
            organizationId: organizationId,
            createdAt: new Date(conn.created_at),
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.warn('⚠️ [Telnyx API] Connexion non sauvegardée en DB:', conn.id, dbError);
      }
    }

    // Mettre à jour les numéros
    for (const number of numbersRes.data.data) {
      try {
        const safeCountryCode = (number.country_code && String(number.country_code).trim().length > 0)
          ? String(number.country_code).trim()
          : deriveCountryCodeFromE164(String(number.phone_number || ''));
        await prisma.telnyxPhoneNumber.upsert({
          where: { id: number.id },
          update: {
            phoneNumber: number.phone_number,
            status: number.status,
            countryCode: safeCountryCode,
            numberType: number.phone_number_type,
            features: number.features || [],
            monthlyCost: parseFloat(number.monthly_recurring_cost || '0'),
            connectionId: number.connection_id,
            updatedAt: new Date(),
          },
          create: {
            id: number.id,
            phoneNumber: number.phone_number,
            status: number.status,
            countryCode: safeCountryCode,
            numberType: number.phone_number_type,
            features: number.features || [],
            monthlyCost: parseFloat(number.monthly_recurring_cost || '0'),
            connectionId: number.connection_id,
            organizationId: organizationId,
            purchasedAt: new Date(number.purchased_at),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.warn('⚠️ [Telnyx API] Numéro non sauvegardé en DB:', number.id, dbError);
      }
    }

    console.log('✅ [Telnyx API] Synchronisation terminée');
    res.json({ 
      success: true,
      connections: connectionsRes.data.data.length,
      numbers: numbersRes.data.data.length
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur synchronisation:', error);
    return respondTelnyxAxiosError(res, error, 'Erreur lors de la synchronisation');
  }
});

// --- CONFIGURATION ORGANISATION ---
router.post('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      api_key: z.string().optional().or(z.literal('')),
      webhook_url: z.string().url().optional().or(z.literal('')).or(z.literal('__AUTO__')),
      default_connection: z.string().optional().or(z.literal('')),
      call_control_app_id: z.string().optional().or(z.literal('')),
      webhook_signing_secret: z.string().optional().or(z.literal('')),
      fallback_pstn_number: z.string().optional().or(z.literal('')),
      organizationId: z.string().optional().or(z.literal('')),
    });

    let parsed: z.infer<typeof schema>;
    try {
      parsed = schema.parse(req.body);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          code: 'TELNYX_CONFIG_INVALID_PAYLOAD',
          message: 'Payload invalide pour la configuration Telnyx',
          error: 'Payload invalide pour la configuration Telnyx',
          details: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      throw e;
    }
    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);

    const targetOrgId = (parsed.organizationId && parsed.organizationId.length > 0)
      ? parsed.organizationId
      : requesterOrgId;

    if (!targetOrgId) {
      return res.status(400).json({ error: 'organizationId manquant' });
    }

    if (!isSuperAdmin && requesterOrgId && targetOrgId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    const incomingKey = (parsed.api_key || '').replace(/^Bearer\s+/i, '').trim();
    const existingConfig = await prisma.telnyxConfig.findUnique({ where: { organizationId: targetOrgId } }).catch(() => null);
    if (!existingConfig && !incomingKey) {
      return res.status(400).json({ error: 'api_key manquante (première configuration)' });
    }

    const now = new Date();
    const computedWebhookUrl = joinUrl(getBackendBaseUrl({ req }), '/api/telnyx/webhooks');

    const desiredWebhookUrl = (parsed.webhook_url === '__AUTO__')
      ? '__AUTO__'
      : ((parsed.webhook_url && parsed.webhook_url.length > 0) ? parsed.webhook_url : undefined);

    const fallbackPstnNumber = (typeof parsed.fallback_pstn_number === 'string')
      ? (parsed.fallback_pstn_number.trim() || null)
      : undefined;

    if (fallbackPstnNumber && !normalizeE164(fallbackPstnNumber)) {
      return res.status(400).json({
        error: 'fallback_pstn_number invalide (format E.164 attendu, ex: +32477123456)',
        message: 'fallback_pstn_number invalide (format E.164 attendu, ex: +32477123456)',
        code: 'TELNYX_FALLBACK_PSTN_INVALID',
      });
    }

    // Best-effort: s'assurer que le schéma existe avant l'upsert (sans reset)
    await ensureTelnyxCascadeSchema();

    const doUpsert = () => prisma.telnyxConfig.upsert({
      where: { organizationId: targetOrgId },
      update: {
        ...(incomingKey ? { encryptedApiKey: encrypt(incomingKey) } : {}),
        webhookUrl: desiredWebhookUrl,
        defaultConnectionId: parsed.default_connection ? parsed.default_connection : null,
        callControlAppId: parsed.call_control_app_id ? parsed.call_control_app_id : null,
        webhookSigningSecret: parsed.webhook_signing_secret ? parsed.webhook_signing_secret : null,
        updatedAt: now,
      },
      create: {
        id: `telnyx-config-${targetOrgId}`,
        organizationId: targetOrgId,
        encryptedApiKey: encrypt(incomingKey),
        webhookUrl: desiredWebhookUrl || '__AUTO__',
        defaultConnectionId: parsed.default_connection ? parsed.default_connection : null,
        callControlAppId: parsed.call_control_app_id ? parsed.call_control_app_id : null,
        webhookSigningSecret: parsed.webhook_signing_secret ? parsed.webhook_signing_secret : null,
        createdAt: now,
        updatedAt: now,
      }
    });

    let saved;
    try {
      saved = await doUpsert();
    } catch {
      // Si la table existait mais colonnes manquantes, on retente une fois après ensure
      await ensureTelnyxCascadeSchema();
      saved = await doUpsert();
    }

    // Persister le fallback PSTN via SQL brut (Prisma Client peut ne pas connaître cette colonne sans `prisma generate`)
    if (fallbackPstnNumber !== undefined) {
      await prisma.$executeRaw`
        UPDATE "TelnyxConfig"
        SET "fallbackPstnNumber" = ${fallbackPstnNumber}, "updatedAt" = ${now}
        WHERE "organizationId" = ${targetOrgId}
      `;
    }

    const webhookUrlForResponse = (!saved.webhookUrl || saved.webhookUrl === '__AUTO__')
      ? computedWebhookUrl
      : saved.webhookUrl;

    const fallbackForResponse =
      (fallbackPstnNumber !== undefined ? (normalizeE164(fallbackPstnNumber) || null) : null)
      || (await getFallbackPstnNumberRaw(targetOrgId));

    res.json({
      success: true,
      message: 'Configuration Telnyx sauvegardée',
      organizationId: targetOrgId,
      hasApiKey: Boolean(saved.encryptedApiKey),
      webhookUrl: webhookUrlForResponse,
      defaultConnectionId: saved.defaultConnectionId,
      callControlAppId: saved.callControlAppId,
      fallbackPstnNumber: fallbackForResponse || null,
      ...(incomingKey ? { apiKeyMeta: getApiKeyMeta(incomingKey) } : {}),
    });
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`❌ [Telnyx API] Erreur sauvegarde configuration (errorId=${errorId}):`, error);

    const anyErr: any = error as any;
    const prismaCode = anyErr?.code as string | undefined;
    const dbCode = anyErr?.meta?.code as string | undefined;
    const msg = String(anyErr?.message || '');

    // Cas fréquent si le schéma DB n'a pas encore été appliqué (colonne/table manquante)
    if (prismaCode === 'P2022' || prismaCode === 'P2021' || msg.includes('column') || msg.includes('does not exist') || dbCode === '42703') {
      return res.status(500).json({
        code: 'TELNYX_DB_SCHEMA_MISSING',
        message: `Schéma DB Telnyx incomplet (ref: ${errorId}).`,
        error: `Schéma DB Telnyx incomplet (ref: ${errorId}).`,
        hint: 'Appliquez add-telnyx-cascade-schema.sql (aucun reset) puis réessayez.',
        meta: { errorId, prismaCode: prismaCode || null, dbCode: dbCode || null },
      });
    }

    if (msg.toLowerCase().includes('permission denied')) {
      return res.status(500).json({
        code: 'TELNYX_DB_PERMISSION_DENIED',
        message: `Droits DB insuffisants pour créer/altérer le schéma Telnyx (ref: ${errorId}).`,
        error: `Droits DB insuffisants pour créer/altérer le schéma Telnyx (ref: ${errorId}).`,
        hint: 'Vérifiez les droits SQL (CREATE/ALTER) sur la base.',
        meta: { errorId, prismaCode: prismaCode || null, dbCode: dbCode || null },
      });
    }

    res.status(500).json({
      code: 'TELNYX_CONFIG_SAVE_FAILED',
      message: `Erreur lors de la sauvegarde de la configuration (ref: ${errorId}).`,
      error: `Erreur lors de la sauvegarde de la configuration (ref: ${errorId}).`,
      meta: { errorId, prismaCode: prismaCode || null, dbCode: dbCode || null },
    });
  }
});

// --- PROVISION: APPLIQUER CONFIG À TELNYX (1 clic CRM) ---
router.post('/provision', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    const targetOrgId = (req.body?.organizationId as string | undefined) || requesterOrgId;

    if (!targetOrgId) return res.status(401).json({ error: 'Non autorisé' });
    if (!isSuperAdmin && requesterOrgId && targetOrgId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    await ensureTelnyxCascadeSchema();

    const config = await prisma.telnyxConfig.findUnique({ where: { organizationId: targetOrgId } }).catch(() => null);
    if (!config?.encryptedApiKey) {
      return res.status(400).json({
        code: 'TELNYX_CONFIG_MISSING',
        error: 'Configuration Telnyx manquante',
        message: 'Configure la clé API et enregistre avant de provisionner.',
      });
    }

    const auth = await getTelnyxAuth(targetOrgId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.message, code: auth.code });
    }

    const { webhookUrl: desiredWebhookUrl, warnings: webhookWarnings } = selectTelnyxWebhookUrl(req, config.webhookUrl);

    telnyxWebhookDebugLog('provision', {
      organizationId: targetOrgId,
      computedWebhookUrl: computeTelnyxWebhookUrlFromRequest(req),
      desiredWebhookUrl,
      host: req.get('host') || null,
      xForwardedHost: getHeaderString(req, 'x-forwarded-host'),
      xForwardedProto: getHeaderString(req, 'x-forwarded-proto'),
    });

    const warnings: string[] = [];
    warnings.push(...webhookWarnings);
    if (/localhost|127\.0\.0\.1/.test(desiredWebhookUrl)) {
      warnings.push('WEBHOOK_LOCALHOST');
    }
    if (!config.callControlAppId) warnings.push('CALL_CONTROL_APP_ID_MISSING');
    if (!config.defaultConnectionId) warnings.push('DEFAULT_CONNECTION_MISSING');

    const actions: Array<Record<string, any>> = [];

    // --- OUTBOUND VOICE PROFILE (sortant) ---
    let desiredOutboundVoiceProfileId: string | null = null;
    const envOutboundVoiceProfileId = String(process.env.TELNYX_OUTBOUND_VOICE_PROFILE_ID || '').trim();
    if (envOutboundVoiceProfileId) {
      desiredOutboundVoiceProfileId = envOutboundVoiceProfileId;
    }

    try {
      const outboundProfilesRes = await axios.get(`${TELNYX_API_URL}/outbound_voice_profiles`, {
        headers: auth.headers,
        params: { 'page[size]': 250 },
      });

      const outboundProfiles = Array.isArray(outboundProfilesRes?.data?.data) ? outboundProfilesRes.data.data : [];
      const enabledProfiles = outboundProfiles.filter((p: any) => p?.enabled !== false);

      if (!desiredOutboundVoiceProfileId) {
        desiredOutboundVoiceProfileId = (enabledProfiles[0]?.id || outboundProfiles[0]?.id || null) as string | null;
      }

      if (!desiredOutboundVoiceProfileId) {
        warnings.push('OUTBOUND_VOICE_PROFILE_MISSING');
      } else if (outboundProfiles.length > 1 && !envOutboundVoiceProfileId) {
        warnings.push('OUTBOUND_VOICE_PROFILE_MULTIPLE');
      }

      actions.push({
        type: 'outbound_voice_profiles',
        ok: true,
        selectedId: desiredOutboundVoiceProfileId,
        total: outboundProfiles.length,
        enabled: enabledProfiles.length,
      });
    } catch (err) {
      warnings.push('OUTBOUND_VOICE_PROFILE_FETCH_FAILED');
      actions.push({
        type: 'outbound_voice_profiles',
        ok: false,
        error: 'OUTBOUND_VOICE_PROFILE_FETCH_FAILED',
      });
    }

    // 1) Mettre à jour l’URL webhook de la/les Call Control App(s)
    // Auto: inclure aussi les connection_id des numéros (souvent l'ID réellement utilisé) + env.
    const numberConnectionIds = await prisma.telnyxPhoneNumber.findMany({
      where: { organizationId: targetOrgId },
      select: { connectionId: true },
    }).then(rows => rows.map(r => String(r.connectionId || '').trim()).filter(Boolean)).catch(() => [] as string[]);

    const connectionIds = await prisma.telnyxConnection.findMany({
      where: { organizationId: targetOrgId },
      select: { id: true },
    }).then(rows => rows.map(r => String(r.id || '').trim()).filter(Boolean)).catch(() => [] as string[]);

    const envConnectionId = String(process.env.TELNYX_CONNECTION_ID || '').trim();

    const candidateAppIds = Array.from(new Set([
      (config.callControlAppId || '').trim(),
      (config.defaultConnectionId || '').trim(),
      envConnectionId,
      ...numberConnectionIds,
      ...connectionIds,
    ].filter(Boolean)));

    telnyxWebhookDebugLog('candidateAppIds', {
      organizationId: targetOrgId,
      count: candidateAppIds.length,
      candidateAppIds,
      sources: {
        config_callControlAppId: (config.callControlAppId || '').trim() || null,
        config_defaultConnectionId: (config.defaultConnectionId || '').trim() || null,
        env_TELNYX_CONNECTION_ID: envConnectionId || null,
        phoneNumbers_connectionIds: numberConnectionIds,
        connections_ids: connectionIds,
      },
    });

    let callControlUpdated = 0;
    const patchedCallControlAppIds: string[] = [];
    if (candidateAppIds.length === 0) {
      warnings.push('CALL_CONTROL_APP_ID_MISSING');
    } else {
      for (const appId of candidateAppIds) {
        let applicationName = `CRM-${targetOrgId}`;
        let exists = false;
        try {
          const existing = await axios.get(`${TELNYX_API_URL}/call_control_applications/${appId}`, { headers: auth.headers });
          exists = true;
          const nameFromApi = existing?.data?.data?.application_name;
          if (typeof nameFromApi === 'string' && nameFromApi.trim().length > 0) {
            applicationName = nameFromApi.trim();
          }
        } catch {
          // Cet ID n'est peut-être pas une Call Control App. On tente une Connection.
          const patchedConn = await patchTelnyxConnectionWebhook({
            id: appId,
            desiredWebhookUrl,
            headers: auth.headers,
            outboundVoiceProfileId: desiredOutboundVoiceProfileId,
          });
          if (patchedConn.ok) {
            const connectionName = String(patchedConn.after?.connection_name || patchedConn.before?.connection_name || '').trim() || null;
            callControlUpdated += 1;
            patchedCallControlAppIds.push(appId);
            actions.push({
              type: 'connection',
              id: appId,
              ok: true,
              connection_name: connectionName,
              outbound_voice_profile_id: patchedConn.after?.outbound_voice_profile_id || patchedConn.before?.outbound_voice_profile_id || null,
              outbound_voice_profile_updated: patchedConn.skippedOutboundProfile === false,
              before: pickTelnyxWebhookFields(patchedConn.before),
              after: pickTelnyxWebhookFields(patchedConn.after),
            });
          } else {
            actions.push({ type: 'call_control_app', id: appId, ok: false, error: 'NOT_A_CALL_CONTROL_APP_OR_CONNECTION', status: patchedConn.status ?? null, detail: patchedConn.detail ?? null });
          }
          continue;
        }

        if (exists) {
          const patchedApp = await patchTelnyxCallControlApplicationWebhook({
            id: appId,
            desiredWebhookUrl,
            headers: auth.headers,
            applicationName,
          });

          if (!patchedApp.ok) {
            actions.push({
              type: 'call_control_app',
              id: appId,
              ok: false,
              error: 'CALL_CONTROL_APP_PATCH_FAILED',
              status: patchedApp.status ?? null,
              detail: patchedApp.detail ?? null,
            });
            continue;
          }

          callControlUpdated += 1;
          patchedCallControlAppIds.push(appId);
          actions.push({
            type: 'call_control_app',
            id: appId,
            ok: true,
            application_name: String(patchedApp.after?.application_name || patchedApp.before?.application_name || applicationName).trim() || null,
            before: pickTelnyxWebhookFields(patchedApp.before),
            after: pickTelnyxWebhookFields(patchedApp.after),
          });
        }
      }
    }

    if (candidateAppIds.length > 0 && callControlUpdated === 0) {
      warnings.push('CALL_CONTROL_APP_UPDATE_FAILED');
      actions.push({
        type: 'call_control_app_candidates',
        ok: false,
        candidatesCount: candidateAppIds.length,
        candidates: candidateAppIds,
      });
    }

    // 1bis) Si on a réussi à patcher une Call Control App, mémoriser l'ID réellement utilisé
    // (souvent celui issu des phone_numbers.connection_id) afin de ne plus dépendre d'une saisie manuelle.
    if (patchedCallControlAppIds.length > 0) {
      const preferredFromNumbers = patchedCallControlAppIds.find(id => numberConnectionIds.includes(id)) || null;
      const preferred = preferredFromNumbers || patchedCallControlAppIds[0];
      if (preferred && preferred !== (config.callControlAppId || '').trim()) {
        await prisma.telnyxConfig.update({
          where: { organizationId: targetOrgId },
          data: {
            callControlAppId: preferred,
            updatedAt: new Date(),
          },
        }).catch(() => null);
        actions.push({ type: 'config_update', ok: true, callControlAppId: preferred });
      }
    }

    // 2) Associer les numéros à la connexion par défaut (supprime “Required for calls”)
    const assignConnectionId = config.callControlAppId || config.defaultConnectionId || null;
    if (assignConnectionId) {
      let phoneNumbers: string[] = [];
      const cached = await prisma.telnyxPhoneNumber.findMany({ where: { organizationId: targetOrgId } }).catch(() => []);
      phoneNumbers = cached.map(n => n.phoneNumber).filter(Boolean);

      if (phoneNumbers.length === 0) {
        try {
          const numbersRes = await axios.get(`${TELNYX_API_URL}/phone_numbers`, {
            headers: auth.headers,
            params: { 'page[size]': 250 },
          });
          const fromApi = Array.isArray(numbersRes?.data?.data)
            ? numbersRes.data.data.map((n: any) => String(n.phone_number || '')).filter(Boolean)
            : [];
          phoneNumbers = fromApi;
        } catch {
          warnings.push('TELNYX_PHONE_NUMBERS_FETCH_FAILED');
        }
      }

      if (phoneNumbers.length > 0) {
        const jobRes = await axios.post(
          `${TELNYX_API_URL}/phone_numbers/jobs/update_phone_numbers`,
          {
            phone_numbers: phoneNumbers,
            connection_id: assignConnectionId,
          },
          { headers: auth.headers }
        );

        actions.push({
          type: 'assign_numbers',
          connection_id: assignConnectionId,
          count: phoneNumbers.length,
          jobId: jobRes?.data?.data?.id || null,
        });
      } else {
        actions.push({ type: 'assign_numbers', connection_id: assignConnectionId, count: 0 });
      }
    }

    return res.json({
      ok: true,
      organizationId: targetOrgId,
      webhookUrl: desiredWebhookUrl,
      actions,
      warnings,
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur provisioning:', error);
    return respondTelnyxAxiosError(res, error, 'Erreur provisioning Telnyx');
  }
});

// GET utilisateurs d'une organisation (pour assigner un softphone)
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    const organizationId = (req.query.organizationId as string) || requesterOrgId;

    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    if (!isSuperAdmin && requesterOrgId && organizationId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    const memberships = await prisma.userOrganization.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: {
        User: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const users = memberships
      .map(m => m.User)
      .filter(Boolean)
      .map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      }));

    return res.json(users);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération users org:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// --- CONFIGURATION UTILISATEUR ---
router.post('/user-config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, assignedNumber, canMakeCalls, canSendSms, monthlyLimit } = req.body;
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });

    console.log('⚙️ [Telnyx API] Configuration utilisateur:', { userId, assignedNumber });

    // Créer ou mettre à jour la configuration utilisateur Telnyx
    const userConfig = await prisma.telnyxUserConfig.upsert({
      where: { userId: userId },
      update: {
        assignedNumber,
        canMakeCalls: canMakeCalls || false,
        canSendSms: canSendSms || false,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : null,
        updatedAt: new Date()
      },
      create: {
        id: `telnyx-usercfg-${userId}`,
        userId,
        organizationId,
        assignedNumber,
        canMakeCalls: canMakeCalls || false,
        canSendSms: canSendSms || false,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Si un numéro est assigné, le marquer comme utilisé
    if (assignedNumber) {
      await prisma.telnyxPhoneNumber.updateMany({
        where: { 
          phoneNumber: assignedNumber,
          organizationId: organizationId 
        },
        data: { 
          assignedUserId: userId,
          updatedAt: new Date()
        }
      });
      
      // Libérer les autres numéros de cet utilisateur
      await prisma.telnyxPhoneNumber.updateMany({
        where: { 
          assignedUserId: userId,
          phoneNumber: { not: assignedNumber },
          organizationId: organizationId 
        },
        data: { 
          assignedUserId: null,
          updatedAt: new Date()
        }
      });
    } else {
      // Libérer tous les numéros de cet utilisateur
      await prisma.telnyxPhoneNumber.updateMany({
        where: { 
          assignedUserId: userId,
          organizationId: organizationId 
        },
        data: { 
          assignedUserId: null,
          updatedAt: new Date()
        }
      });
    }

    console.log('✅ [Telnyx API] Configuration utilisateur sauvegardée');
    res.json({ success: true, config: userConfig });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur config utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration' });
  }
});

router.get('/user-config/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });

    console.log('🔍 [Telnyx API] Récupération config utilisateur:', userId);

    const userConfig = await prisma.telnyxUserConfig.findFirst({
      where: { 
        userId: userId,
        organizationId: organizationId 
      }
    });

    res.json(userConfig || {
      userId,
      organizationId,
      canMakeCalls: false,
      canSendSms: false,
      assignedNumber: null,
      monthlyLimit: null
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération config:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration' });
  }
});

router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = getOrganizationIdFromRequest(req);
    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    console.log('📊 [Telnyx API] Récupération statistiques...');

    const [totalCalls, totalSms, activeNumbers] = await Promise.all([
      prisma.telnyxCall.count({
        where: { 
          organizationId: organizationId,
          startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      prisma.telnyxMessage.count({
        where: { 
          organizationId: organizationId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      prisma.telnyxPhoneNumber.count({
        where: { 
          organizationId: organizationId,
          status: 'active'
        }
      })
    ]);

    // Calculer le coût mensuel (approximatif)
    const calls = await prisma.telnyxCall.findMany({
      where: { 
        organizationId: organizationId,
        startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      },
      select: { cost: true }
    });

    const numbers = await prisma.telnyxPhoneNumber.findMany({
      where: { 
        organizationId: organizationId,
        status: 'active'
      },
      select: { monthlyCost: true }
    });

    const callsCost = calls.reduce((sum, call) => sum + (call.cost || 0), 0);
    const numbersCost = numbers.reduce((sum, number) => sum + (number.monthlyCost || 0), 0);
    const monthlyCost = callsCost + numbersCost;

    console.log('✅ [Telnyx API] Statistiques récupérées');
    res.json({
      totalCalls,
      totalSms,
      activeNumbers,
      monthlyCost
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// --- WEBHOOK UNIQUE POUR TOUT (🧠 ARCHITECTURE TELNYX COMME CERVEAU) ---
router.post('/webhooks', async (req: Request, res: Response) => {
  const debug = process.env.TELNYX_DEBUG_WEBHOOKS === '1';
  const webhook = req.body;
  const eventType = webhook?.data?.event_type;
  const payload = webhook?.data?.payload;

  if (debug) {
    console.log('🧷 [Telnyx Webhook Debug] inbound', {
      path: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent'],
      hasBody: Boolean(webhook && Object.keys(webhook || {}).length > 0),
      eventType,
      callControlId: payload?.call_control_id || payload?.id || null,
    });
  }

  try {
    console.log('🪝 [Telnyx Webhook]', eventType, payload?.call_control_id || payload?.id);

    // Gestion des événements d'appel (CALL LEGS TRACKING)
    if (eventType?.startsWith('call.')) {
      await handleCallWebhook(eventType, payload, req);
    }

    // Gestion des événements de message
    else if (eventType?.startsWith('message.')) {
      await handleMessageWebhook(eventType, payload);
    }

    else {
      console.log('🪝 [Telnyx Webhook] Événement non géré:', eventType);
    }
  } catch (error) {
    console.error('❌ [Telnyx Webhook] Erreur:', error);
    if (debug) {
      console.error('🧷 [Telnyx Webhook Debug] failed', {
        eventType,
        callControlId: payload?.call_control_id || payload?.id || null,
      });
    }
    // Ne jamais renvoyer d'erreur HTTP à Telnyx pour éviter les retries en boucle.
  }

  return res.status(200).json({ received: true });
});

// Handler pour les webhooks d'appel (avec tracking call legs)
async function handleCallWebhook(eventType: string, callData: any, req?: Request): Promise<void> {
  if (!callData || !callData.call_control_id) {
    return;
  }

  const callControlId = callData.call_control_id;
  const state = callData.state;
  let isLegEvent = false;

  // Récupérer le call en base (créer si inbound)
  let call = await prisma.telnyxCall.findFirst({ where: { callId: callControlId } });

  if (!call) {
    const possibleDid = typeof callData.from === 'string' ? callData.from.trim() : '';
    if (possibleDid) {
      const byDid = await prisma.telnyxCall.findFirst({
        where: {
          toNumber: possibleDid,
          status: { not: 'completed' },
        },
        orderBy: [{ startedAt: 'desc' }],
      }).catch(() => null);

      if (byDid) {
        call = byDid;
        isLegEvent = true;
      }
    }
  }

  if (!call) {
    const directionRaw = typeof callData.direction === 'string' ? callData.direction : 'incoming';
    const isInbound = directionRaw === 'incoming' || directionRaw === 'inbound';
    if (!isInbound) {
      console.warn(`⚠️ [Telnyx Webhook] Call non trouvé (non-inbound): ${callControlId}`);
      return;
    }

    const organizationId = await getOrganizationIdFromCallPayload(callData);
    if (!organizationId) {
      console.warn(`⚠️ [Telnyx Webhook] Impossible de déterminer l'organisation pour inbound: ${callControlId}`);
      return;
    }

    call = await prisma.telnyxCall.create({
      data: {
        id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        callId: callControlId,
        fromNumber: String(callData.from || ''),
        toNumber: String(callData.to || ''),
        direction: 'inbound',
        status: 'initiated',
        organizationId,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`🪝 [Telnyx Webhook] ${eventType} pour call ${call.id} -> state: ${state}`);
  const mainCallControlId = call.callId;

  // Mettre à jour le call selon l'événement
  const updateData: any = {
    updatedAt: new Date()
  };

  switch (eventType) {
    case 'call.initiated':
      if (isLegEvent) {
        try {
          const destination = String(callData.to || callData.destination || '').trim();
          if (destination) {
            await TelnyxCascadeService.updateCallLegStatus(call.callId, destination, 'dialing', new Date());
          }
        } catch (e) {
          console.warn('⚠️ [Telnyx Webhook] call.initiated (leg): tracking leg failed:', e);
        }
        break;
      }

      updateData.status = 'initiated';

      // 🔁 Amorcer la cascade inbound (transfers) si on a des legs
      try {
        const existingLegs = await prisma.telnyxCallLeg.findMany({ where: { callId: call.callId } });
        const cfg = await prisma.telnyxConfig.findUnique({ where: { organizationId: call.organizationId } }).catch(() => null);
        const webhookUrl = selectTelnyxWebhookUrl((req as any) || ({ headers: {} } as any), cfg?.webhookUrl || '__AUTO__').webhookUrl;

        if (existingLegs.length === 0) {
          const planned = await planInboundCascadeLegs(call.organizationId);
          if (planned.length > 0) {
            for (const leg of planned) {
              await prisma.telnyxCallLeg.create({
                data: {
                  id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  callId: call.callId,
                  legType: leg.type,
                  endpointId: leg.type === 'sip' ? (leg.endpointId || null) : null,
                  destination: leg.destination,
                  status: 'pending',
                  priority: leg.priority,
                  dialedAt: new Date(),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
            }

            // Première tentative = plus petite priorité
            const first = planned.slice().sort((a, b) => a.priority - b.priority)[0];
            await prisma.telnyxCallLeg.updateMany({
              where: { callId: call.callId, destination: first.destination },
              data: { status: 'dialing', updatedAt: new Date() },
            });

            try {
              await transferCallToLeg({ callControlId, organizationId: call.organizationId, leg: first, webhookUrl });
            } catch {
              // Si le transfer échoue immédiatement (ex: mauvais SIP domain/credentials), on ne doit pas bloquer la cascade.
              await prisma.telnyxCallLeg.updateMany({
                where: { callId: call.callId, destination: first.destination },
                data: { status: 'failed', endedAt: new Date(), updatedAt: new Date() },
              });

              try {
                const pending = await prisma.telnyxCallLeg.findMany({
                  where: { callId: call.callId, status: 'pending' },
                  orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
                });

                if (pending.length > 0 && req) {
                  const next = pending[0];
                  if (next.legType === 'pstn') {
                    await prisma.telnyxCallLeg.update({
                      where: { id: next.id },
                      data: { status: 'dialing', dialedAt: new Date(), updatedAt: new Date() },
                    });
                    await transferCallToLeg({
                      callControlId,
                      organizationId: call.organizationId,
                      webhookUrl,
                      leg: { type: 'pstn', destination: next.destination, priority: next.priority, timeout: 30 },
                    });
                  } else {
                    const match = next.endpointId
                      ? await prisma.telnyxSipEndpoint.findUnique({ where: { id: next.endpointId } }).catch(() => null)
                      : await prisma.telnyxSipEndpoint.findFirst({
                          where: { organizationId: call.organizationId, sipUsername: next.destination.replace(/^sip:/, '').split('@')[0] },
                        });
                    const sipAuthPassword = match ? safeDecryptMaybe(match.sipPassword).trim() : '';
                    const sipAuthUsername = match ? match.sipUsername : next.destination.replace(/^sip:/, '').split('@')[0];

                    await prisma.telnyxCallLeg.update({
                      where: { id: next.id },
                      data: { status: 'dialing', dialedAt: new Date(), updatedAt: new Date() },
                    });
                    await transferCallToLeg({
                      callControlId,
                      organizationId: call.organizationId,
                      webhookUrl,
                      leg: {
                        type: 'sip',
                        destination: next.destination,
                        endpointId: match?.id || next.endpointId || undefined,
                        priority: next.priority,
                        timeout: 30,
                        sipAuthUsername,
                        sipAuthPassword,
                      },
                    });
                  }
                }
              } catch (e2) {
                console.warn('⚠️ [Telnyx Webhook] Impossible de basculer vers le leg suivant après échec transfer:', e2);
              }
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ [Telnyx Webhook] Impossible de démarrer la cascade inbound:', e);
      }
      break;

    case 'call.ringing':
      if (isLegEvent) {
        try {
          const destination = String(callData.to || callData.destination || '').trim();
          if (destination) {
            await TelnyxCascadeService.updateCallLegStatus(call.callId, destination, 'dialing', new Date());
          }
        } catch (e) {
          console.warn('⚠️ [Telnyx Webhook] call.ringing (leg): tracking leg failed:', e);
        }
        break;
      }

      updateData.status = 'ringing';
      // Si on ne trouve pas de leg correspondant, on le crée (utile si Telnyx envoie ringing sans call.initiated)
      try {
        const destRaw =
          (typeof callData?.to === 'string' ? callData.to : null) ||
          (typeof callData?.destination === 'string' ? callData.destination : null) ||
          (typeof callData?.to?.phone_number === 'string' ? callData.to.phone_number : null) ||
          (Array.isArray(callData?.to) && typeof callData?.to?.[0]?.phone_number === 'string' ? callData.to[0].phone_number : null);
        const destination = typeof destRaw === 'string' ? destRaw.trim() : '';
        if (destination) {
          const existing = await prisma.telnyxCallLeg.findFirst({ where: { callId: call.callId, destination } }).catch(() => null);
          if (existing) {
            await prisma.telnyxCallLeg.update({
              where: { id: existing.id },
              data: { status: 'dialing', dialedAt: new Date(), updatedAt: new Date() },
            });
          } else {
            const isSip = destination.startsWith('sip:');
            let endpointId: string | null = null;
            let priority = 999;
            if (isSip) {
              const username = destination.replace(/^sip:/, '').split('@')[0];
              const endpoint = await prisma.telnyxSipEndpoint.findFirst({ where: { organizationId: call.organizationId, sipUsername: username } }).catch(() => null);
              if (endpoint) {
                endpointId = endpoint.id;
                priority = endpoint.priority;
              }
            }

            await prisma.telnyxCallLeg.create({
              data: {
                id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                callId: call.callId,
                legType: isSip ? 'sip' : 'pstn',
                endpointId,
                destination,
                status: 'dialing',
                priority,
                dialedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ [Telnyx Webhook] call.ringing: tracking leg failed:', e);
      }
      break;

    case 'call.answered':
    case 'call.bridged':
      updateData.status = 'in-progress';
      updateData.startedAt = new Date();
      
      // 🎯 CRUCIAL: Déterminer QUI a répondu
      const answeredEndpoint = callData.to || callData.destination;
      if (answeredEndpoint) {
        updateData.answeredBy = answeredEndpoint;
        
        // Mettre à jour le call leg correspondant
        await TelnyxCascadeService.updateCallLegStatus(
          call.callId,
          answeredEndpoint,
          'answered',
          new Date()
        );
      }
      break;

    case 'call.hangup':
    case 'call.completed':
      if (!isLegEvent) {
        updateData.status = 'completed';
        updateData.endedAt = new Date();
      }
      
      if (callData.hangup_duration_millis) {
        if (!isLegEvent) {
          updateData.duration = Math.floor(callData.hangup_duration_millis / 1000);
        }
      }

      // Si la cascade est en cours et que l'appel n'est pas answered, tenter la prochaine destination
      try {
        if (isLegEvent && !call.answeredBy) {
          if (call.status === 'completed' || call.endedAt) {
            break;
          }
          const cause = String(callData.hangup_cause || '').toLowerCase();
          const failedDest = String(callData.to || callData.destination || '').trim();
          const failureStatus =
            cause === 'timeout' ? 'timeout'
            : (cause === 'busy' ? 'busy' : 'failed');

          if (failedDest) {
            await TelnyxCascadeService.updateCallLegStatus(call.callId, failedDest, failureStatus as any, undefined, new Date());
          }

          const pending = await prisma.telnyxCallLeg.findMany({
            where: { callId: call.callId, status: 'pending' },
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          });

          if (pending.length > 0 && req) {
            const cfg = await prisma.telnyxConfig.findUnique({ where: { organizationId: call.organizationId } }).catch(() => null);
            const webhookUrl = (cfg?.webhookUrl && cfg.webhookUrl !== '__AUTO__')
              ? cfg.webhookUrl
              : joinUrl(getBackendBaseUrl({ req: req as any }), '/api/telnyx/webhooks');

            const next = pending[0];
            // Reconstituer un PlannedLeg minimal pour transfer
            if (next.legType === 'pstn') {
              await prisma.telnyxCallLeg.update({ where: { id: next.id }, data: { status: 'dialing', updatedAt: new Date() } });
              await transferCallToLeg({
                callControlId: mainCallControlId,
                organizationId: call.organizationId,
                webhookUrl,
                leg: { type: 'pstn', destination: next.destination, priority: next.priority, timeout: 30 },
              });
            } else {
              const match = next.endpointId
                ? await prisma.telnyxSipEndpoint.findUnique({ where: { id: next.endpointId } }).catch(() => null)
                : await prisma.telnyxSipEndpoint.findFirst({
                    where: { organizationId: call.organizationId, sipUsername: next.destination.replace(/^sip:/, '').split('@')[0] },
                  });
              const sipAuthPassword = match ? safeDecryptMaybe(match.sipPassword).trim() : '';
              const sipAuthUsername = match ? match.sipUsername : next.destination.replace(/^sip:/, '').split('@')[0];

              await prisma.telnyxCallLeg.update({ where: { id: next.id }, data: { status: 'dialing', updatedAt: new Date() } });
              await transferCallToLeg({
                callControlId: mainCallControlId,
                organizationId: call.organizationId,
                webhookUrl,
                leg: {
                  type: 'sip',
                  destination: next.destination,
                  endpointId: match?.id || next.endpointId || undefined,
                  priority: next.priority,
                  timeout: 30,
                  sipAuthUsername,
                  sipAuthPassword,
                },
              });
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ [Telnyx Webhook] Next-leg cascade failed:', e);
      }
      break;

    case 'call.machine.detection.ended':
      // Détection répondeur
      if (callData.result === 'human') {
        console.log('✅ [Telnyx Webhook] Humain détecté');
      } else {
        console.log('🤖 [Telnyx Webhook] Répondeur/machine détecté');
      }
      break;
  }

  // Appliquer les updates
  await prisma.telnyxCall.update({
    where: { id: call.id },
    data: updateData
  });

  console.log(`✅ [Telnyx Webhook] Call mis à jour: ${call.callId} -> ${updateData.status || state}`);
}

// Handler pour les webhooks de message (inchangé)
async function handleMessageWebhook(eventType: string, messageData: any): Promise<void> {
  if (!messageData) {
    return;
  }

  const organizationId = await getOrganizationIdFromMessagePayload(messageData);
  if (!organizationId) {
    console.warn('⚠️ [Telnyx Webhook] Message: org introuvable, skip:', messageData?.id, eventType);
    return;
  }

  if (eventType === 'message.received') {
    // Message entrant
    await prisma.telnyxMessage.create({
      data: {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        messageId: messageData.id,
        fromNumber: messageData.from.phone_number,
        toNumber: messageData.to[0].phone_number,
        direction: 'inbound',
        type: messageData.type,
        text: messageData.text,
        status: 'delivered',
        organizationId,
        sentAt: new Date(messageData.received_at),
        deliveredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [Telnyx Webhook] Message entrant sauvegardé:', messageData.id);
  } else if (eventType === 'message.sent') {
    // Mettre à jour le statut du message sortant
    const message = await prisma.telnyxMessage.findFirst({
      where: { messageId: messageData.id }
    });

    if (message) {
      await prisma.telnyxMessage.update({
        where: { id: message.id },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ [Telnyx Webhook] Message sortant mis à jour:', messageData.id);
    }
  }
}

// ===========================
// GESTION SIP ENDPOINTS (CASCADE)
// ===========================

function normalizeSipEndpointInput(input: { sipUsername: unknown; sipDomain: unknown }): { sipUsername: string; sipDomain: string } {
  let sipUsername = String(input.sipUsername ?? '').trim();
  sipUsername = sipUsername.replace(/^sip:/i, '').trim();
  if (sipUsername.includes('@')) sipUsername = sipUsername.split('@')[0].trim();

  let sipDomain = String(input.sipDomain ?? '').trim();
  sipDomain = sipDomain.replace(/^sip:/i, '').trim();
  sipDomain = sipDomain.replace(/^\/\//, '').trim();
  if (sipDomain.includes('@')) sipDomain = sipDomain.split('@').slice(-1)[0].trim();
  sipDomain = sipDomain.split(/[\/;?]/)[0].trim();

  return { sipUsername, sipDomain };
}

// GET tous les SIP endpoints d'une organisation
router.get('/sip-endpoints', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    const organizationId = (req.query.organizationId as string) || requesterOrgId;

    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    if (!isSuperAdmin && requesterOrgId && organizationId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }
    
    const endpoints = await prisma.telnyxSipEndpoint.findMany({
      where: { organizationId },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    // Formater la réponse avec userName
    const formattedEndpoints = endpoints.map(ep => ({
      id: ep.id,
      name: ep.name,
      sipUsername: ep.sipUsername,
      sipDomain: ep.sipDomain,
      status: ep.status,
      priority: ep.priority,
      timeout: ep.timeout,
      userId: ep.userId,
      userName: ep.User ? `${ep.User.firstName || ''} ${ep.User.lastName || ''}`.trim() : null,
      createdAt: ep.createdAt,
      updatedAt: ep.updatedAt,
    }));

    res.json(formattedEndpoints);
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur récupération SIP endpoints:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des endpoints SIP' });
  }
});

// --- DEBUG: Derniers appels + legs ---
router.get('/recent-calls', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    const organizationId = (req.query.organizationId as string) || requesterOrgId;

    if (!organizationId) return res.status(401).json({ error: 'Non autorisé' });
    if (!isSuperAdmin && requesterOrgId && organizationId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    const rawLimit = parseInt(String(req.query.limit || '10'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;

    const calls = await prisma.telnyxCall.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        callId: true,
        direction: true,
        status: true,
        fromNumber: true,
        toNumber: true,
        answeredBy: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        TelnyxCallLeg: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            legType: true,
            destination: true,
            status: true,
            priority: true,
            dialedAt: true,
            answeredAt: true,
            endedAt: true,
            endpointId: true,
            Endpoint: {
              select: {
                id: true,
                name: true,
                sipUsername: true,
                sipDomain: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    res.json({ calls });
  } catch (error) {
    console.error('❌ [Telnyx API] recent-calls error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des derniers appels' });
  }
});

// POST créer un SIP endpoint
router.post('/sip-endpoints', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, name, sipUsername, sipPassword, sipDomain, priority, timeout, userId } = req.body;

    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    const targetOrgId = (organizationId && String(organizationId).length > 0) ? String(organizationId) : requesterOrgId;
    if (!targetOrgId) return res.status(401).json({ error: 'Non autorisé' });
    if (!isSuperAdmin && requesterOrgId && targetOrgId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }
    
    const normalized = normalizeSipEndpointInput({ sipUsername, sipDomain });

    if (!name || !normalized.sipUsername || !sipPassword || !normalized.sipDomain || priority === undefined) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    const encryptedPassword = encrypt(String(sipPassword));

    const endpoint = await prisma.telnyxSipEndpoint.create({
      data: {
        id: `sip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        organizationId: targetOrgId,
        userId: userId || null,
        name,
        sipUsername: normalized.sipUsername,
        sipPassword: encryptedPassword,
        sipDomain: normalized.sipDomain,
        status: 'active',
        priority: parseInt(priority),
        timeout: parseInt(timeout) || 10,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [Telnyx API] SIP endpoint créé:', endpoint.id);
    res.json({
      success: true,
      endpoint: {
        id: endpoint.id,
        organizationId: endpoint.organizationId,
        userId: endpoint.userId,
        name: endpoint.name,
        sipUsername: endpoint.sipUsername,
        sipDomain: endpoint.sipDomain,
        status: endpoint.status,
        priority: endpoint.priority,
        timeout: endpoint.timeout,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur création SIP endpoint:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'endpoint SIP' });
  }
});

// PUT modifier un SIP endpoint
router.put('/sip-endpoints/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, sipUsername, sipPassword, sipDomain, priority, timeout, userId } = req.body;

    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    if (!requesterOrgId && !isSuperAdmin) return res.status(401).json({ error: 'Non autorisé' });

    const existing = await prisma.telnyxSipEndpoint.findUnique({ where: { id } }).catch(() => null);
    if (!existing) return res.status(404).json({ error: 'Endpoint non trouvé' });
    if (!isSuperAdmin && requesterOrgId && existing.organizationId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (sipUsername) updateData.sipUsername = normalizeSipEndpointInput({ sipUsername, sipDomain: 'placeholder.invalid' }).sipUsername;
    if (typeof sipPassword === 'string') {
      const trimmed = sipPassword.trim();
      if (trimmed.length > 0) updateData.sipPassword = encrypt(trimmed);
    }
    if (sipDomain) updateData.sipDomain = normalizeSipEndpointInput({ sipUsername: 'placeholder', sipDomain }).sipDomain;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (timeout !== undefined) updateData.timeout = parseInt(timeout);
    if (userId !== undefined) updateData.userId = userId || null;

    const endpoint = await prisma.telnyxSipEndpoint.update({
      where: { id },
      data: updateData
    });

    console.log('✅ [Telnyx API] SIP endpoint modifié:', id);
    res.json({
      success: true,
      endpoint: {
        id: endpoint.id,
        organizationId: endpoint.organizationId,
        userId: endpoint.userId,
        name: endpoint.name,
        sipUsername: endpoint.sipUsername,
        sipDomain: endpoint.sipDomain,
        status: endpoint.status,
        priority: endpoint.priority,
        timeout: endpoint.timeout,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur modification SIP endpoint:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'endpoint SIP' });
  }
});

// DELETE supprimer un SIP endpoint
router.delete('/sip-endpoints/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    if (!requesterOrgId && !isSuperAdmin) return res.status(401).json({ error: 'Non autorisé' });

    const existing = await prisma.telnyxSipEndpoint.findUnique({ where: { id } }).catch(() => null);
    if (!existing) return res.status(404).json({ error: 'Endpoint non trouvé' });
    if (!isSuperAdmin && requesterOrgId && existing.organizationId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    await prisma.telnyxSipEndpoint.delete({
      where: { id }
    });

    console.log('✅ [Telnyx API] SIP endpoint supprimé:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur suppression SIP endpoint:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'endpoint SIP' });
  }
});

// POST tester un SIP endpoint
router.post('/sip-endpoints/:id/test', async (req: AuthenticatedRequest, res: Response) => {
  let lockToken: string | null = null;
  let lockOrgId: string | null = null;
  try {
    const { id } = req.params;

    const requesterOrgId = getOrganizationIdFromRequest(req);
    const isSuperAdmin = isSuperAdminFromRequest(req);
    if (!requesterOrgId && !isSuperAdmin) return res.status(401).json({ error: 'Non autorisé' });

    const endpoint = await prisma.telnyxSipEndpoint.findUnique({ where: { id } }).catch(() => null);
    if (!endpoint) return res.status(404).json({ error: 'Endpoint non trouvé' });
    if (!isSuperAdmin && requesterOrgId && endpoint.organizationId !== requesterOrgId) {
      return res.status(403).json({ error: 'Accès refusé à cette organisation' });
    }

    // Limiter le nombre d'appels outbound actifs qu'on déclenche via le CRM
    // Fenêtre courte: les appels tests s'auto-raccrochent (≈25s). On évite les faux positifs dus aux webhooks manquants.
    const activeOutbound = await getActiveOutboundCallsCount(endpoint.organizationId, 3);
    if (activeOutbound >= 2) {
      return res.status(409).json({
        error: `Limite d’appels sortants atteinte (actifs: ${activeOutbound}). Raccroche les appels actifs puis réessaie.`,
        code: 'TELNYX_CONCURRENT_CALL_LIMIT',
        activeOutbound,
        hint: 'Utilise le bouton “Raccrocher appels actifs”, puis réessaie.',
      });
    }

    // Anti double-clic / spam (après les validations rapides pour éviter un lock “inutile”)
    lockOrgId = endpoint.organizationId;
    lockToken = acquireSipTestLock(endpoint.organizationId);
    if (!lockToken) {
      return res.status(429).json({
        error: 'Test déjà en cours. Réessaie dans quelques secondes.',
        code: 'TELNYX_SIP_TEST_IN_FLIGHT',
      });
    }

    // Préparer un appel test (fait sonner Linphone) via Telnyx Call Control
    const auth = await getTelnyxAuth(endpoint.organizationId);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.message, code: auth.code });

    const cfg = await prisma.telnyxConfig.findUnique({ where: { organizationId: endpoint.organizationId } }).catch(() => null);
    const connectionId = (cfg?.callControlAppId || cfg?.defaultConnectionId || process.env.TELNYX_CONNECTION_ID || '').trim();
    if (!connectionId) {
      return res.status(412).json({ error: 'TELNYX_CONNECTION_ID manquant (configurez une connexion par défaut Telnyx)' });
    }

    const fromNumber = await prisma.telnyxPhoneNumber
      .findFirst({ where: { organizationId: endpoint.organizationId, status: 'active' }, orderBy: { purchasedAt: 'desc' }, select: { phoneNumber: true } })
      .then(r => r?.phoneNumber || null)
      .catch(() => null);

    if (!fromNumber) {
      return res.status(412).json({
        error: 'Aucun numéro Telnyx actif trouvé pour initier un appel test. Clique “Synchroniser” ou assure-toi d’avoir un numéro actif.',
      });
    }

    const toSipUri = `sip:${endpoint.sipUsername}@${endpoint.sipDomain}`;
    const webhookUrl = selectTelnyxWebhookUrl(req as any, cfg?.webhookUrl || '__AUTO__').webhookUrl;

    const autoHangupSecsRaw = req.body?.autoHangupSecs;
    const autoHangupSecs = (typeof autoHangupSecsRaw === 'number' && Number.isFinite(autoHangupSecsRaw))
      ? Math.max(5, Math.min(120, Math.floor(autoHangupSecsRaw)))
      : 25;

    console.log('🧪 [Telnyx API] Test SIP endpoint (appel):', { toSipUri, fromNumber, connectionId });

    try {
      const response = await axios.post(`${TELNYX_API_URL}/calls`, {
        to: toSipUri,
        from: fromNumber,
        connection_id: connectionId,
        webhook_url: webhookUrl,
        command_id: `siptest-${Date.now()}`,
      }, { headers: auth.headers });

      const callControlId = response.data?.data?.call_control_id;
      if (typeof callControlId === 'string' && callControlId.trim().length > 0) {
        // Enregistrer en base pour le diagnostic UI
        await prisma.telnyxCall.create({
          data: {
            id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            callId: callControlId,
            fromNumber: fromNumber,
            toNumber: toSipUri,
            direction: 'outbound',
            status: 'initiated',
            organizationId: endpoint.organizationId,
            startedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }).catch(() => null);

        await prisma.telnyxCallLeg.create({
          data: {
            id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            callId: callControlId,
            legType: 'sip',
            endpointId: endpoint.id,
            destination: toSipUri,
            status: 'dialing',
            priority: endpoint.priority,
            dialedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }).catch(() => null);

        // Auto-hangup: évite de saturer la limite Telnyx si les webhooks sont mal configurés
        setTimeout(async () => {
          try {
            await axios.post(`${TELNYX_API_URL}/calls/${callControlId}/actions/hangup`, {}, { headers: auth.headers });
          } catch {
            // ignore
          }
        }, autoHangupSecs * 1000).unref?.();
      }

      return res.json({
        success: true,
        message: 'Appel test lancé. Linphone devrait sonner dans quelques secondes.',
        callControlId: callControlId || null,
        to: toSipUri,
        from: fromNumber,
        webhookUrl,
        autoHangupSecs,
      });
    } catch (error) {
      return respondTelnyxAxiosError(res, error, 'Erreur lors du test (appel SIP)');
    }
  } catch (error) {
    console.error('❌ [Telnyx API] Erreur test SIP endpoint:', error);
    res.status(500).json({ error: 'Erreur lors du test de l\'endpoint SIP' });
  } finally {
    if (lockOrgId) releaseSipTestLock(lockOrgId, lockToken);
  }
});

export default router;

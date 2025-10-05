import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { PrismaClient, AdPlatformIntegration, Prisma } from '@prisma/client';
import axios from 'axios';
import { google } from 'googleapis';
import { randomUUID, createHash } from 'crypto';

import { googleOAuthConfig } from '../auth/googleConfig';

const prisma = new PrismaClient();
const router = Router();

// Cache en mémoire (léger) pour éviter des rafales d'appels côté UI et vers Google Ads
// Clé: string -> Valeur: { expiresAt: number; payload: unknown }
const memCache = new Map<string, { expiresAt: number; payload: unknown }>();
function cacheGet<T = unknown>(key: string): T | undefined {
  const it = memCache.get(key);
  if (!it) return undefined;
  if (Date.now() > it.expiresAt) {
    memCache.delete(key);
    return undefined;
  }
  return it.payload as T;
}
function cacheSet(key: string, payload: unknown, ttlMs: number) {
  memCache.set(key, { expiresAt: Date.now() + ttlMs, payload });
}

// Utilitaire: sécuriser/normaliser le redirectUri provenant des variables d'environnement
const DEFAULT_ADS_REDIRECT = (() => {
  const explicit = process.env.GOOGLE_ADS_REDIRECT_URI || googleOAuthConfig.redirectUri;
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  return googleOAuthConfig.redirectUri;
})();
function sanitizeRedirectUri(raw?: string): { uri: string; raw?: string; sanitized: boolean; warning?: string } {
  if (!raw) return { uri: DEFAULT_ADS_REDIRECT, sanitized: false };
  const original = raw;
  let val = raw.trim();
  // Retirer guillemets d'encadrement
  val = val.replace(/^['"]/g, '').replace(/['"]$/g, '');
  // Extraire la première sous-chaîne http(s)://... si du bruit est présent autour
  const match = val.match(/https?:\/\/[^\s"']+/);
  if (match) {
    val = match[0];
  }
  try {
    // Valider via URL; si invalide: fallback
    const u = new URL(val);
    if (!/^https?:$/.test(u.protocol)) throw new Error('Unsupported protocol');
    return { uri: u.toString(), raw: original, sanitized: val !== original, warning: val !== original ? 'Redirect URI corrigé depuis la variable d\'environnement (guillemets/texte parasite retirés)' : undefined };
  } catch {
    return { uri: DEFAULT_ADS_REDIRECT, raw: original, sanitized: true, warning: 'Redirect URI invalide détecté dans GOOGLE_ADS_REDIRECT_URI — fallback appliqué' };
  }
}

// Utilitaire: nettoyer client_id / client_secret (espaces/guillemets parasites)
function sanitizeClientValue(raw?: string): { value: string | undefined; sanitized: boolean; warning?: string; looksQuoted?: boolean } {
  if (!raw) return { value: undefined, sanitized: false };
  const original = raw;
  let v = raw.trim();
  const looksQuoted = /^['"].*['"]$/.test(v);
  if (looksQuoted) {
    v = v.replace(/^['"]/, '').replace(/['"]$/, '');
  }
  const sanitized = v !== original;
  const warning = sanitized ? 'Credential nettoyé (espaces/guillemets retirés) — vérifiez votre .env' : undefined;
  return { value: v, sanitized, warning, looksQuoted };
}

// Utilitaire: fingerprint non réversible pour vérifier quel secret est chargé sans l'exposer
function fingerprintSecret(secret?: string | null): string | null {
  if (!secret) return null;
  try {
    const hex = createHash('sha256').update(secret).digest('hex');
    return hex.slice(0, 12); // 12 hex chars (~48 bits) suffisent pour identifier sans divulguer
  } catch {
    return null;
  }
}

function maskValue(value?: string | null, prefix = 4, suffix = 4): string | null {
  if (!value) return null;
  const len = value.length;
  if (len <= prefix + suffix + 1) return value;
  return `${value.slice(0, prefix)}…${value.slice(len - suffix)}`;
}

function normalizeGoogleAdsCustomerId(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const digitsOnly = String(raw).replace(/[^0-9]/g, '');
  if (digitsOnly.length !== 10) return undefined;
  return digitsOnly;
}

function formatGoogleAdsCustomerId(raw?: string | null): string | undefined {
  const normalized = normalizeGoogleAdsCustomerId(raw);
  if (!normalized) return undefined;
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

// ===== ROUTES PUBLIQUES (sans authentification) =====
// Callbacks OAuth - accessibles sans authentification car appelés directement par les plateformes

// Route callback Facebook standard (https://localhost/)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  // Vérifier si c'est un callback Facebook
  const { code, state } = req.query;
  if (code && state) {
    try {
      let parsed: { platform?: string };
      try {
        parsed = JSON.parse(decodeURIComponent(state as string));
      } catch {
        const raw = Buffer.from(String(state), 'base64url').toString('utf8');
        parsed = JSON.parse(raw);
      }
      
      if (parsed.platform === 'meta_ads') {
        // Rediriger vers le callback Meta Ads avec les paramètres
        const redirectUrl = `/api/integrations/advertising/oauth/meta_ads/callback?code=${encodeURIComponent(code as string)}&state=${encodeURIComponent(state as string)}`;
        return res.redirect(redirectUrl);
      }
    } catch (e) {
      console.error('Erreur parsing state Facebook:', e);
    }
  }
  
  // Si pas de callback Facebook, page normale
  res.send('CRM API Server - Facebook OAuth Callback Handler');
});

// Route callback simplifiée pour Facebook (qui refuse les URIs complexes)
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  // Rediriger vers le callback spécialisé Meta Ads
  const { code, state } = req.query;
  if (code && state) {
    // Déterminer la plateforme depuis le state
    try {
      let parsed: { platform?: string };
      try {
        parsed = JSON.parse(decodeURIComponent(state as string));
      } catch {
        const raw = Buffer.from(String(state), 'base64url').toString('utf8');
        parsed = JSON.parse(raw);
      }
      
      if (parsed.platform === 'meta_ads') {
        // Rediriger vers le callback Meta Ads avec les paramètres
        const redirectUrl = `/api/integrations/advertising/oauth/meta_ads/callback?code=${encodeURIComponent(code as string)}&state=${encodeURIComponent(state as string)}`;
        return res.redirect(redirectUrl);
      }
    } catch (e) {
      console.error('Erreur parsing state:', e);
    }
  }
  
  res.status(400).send('Callback invalide');
});

router.get('/advertising/oauth/:platform/callback', async (req: Request, res: Response): Promise<void> => {
  // Ajouter les en-têtes pour contourner la page d'avertissement ngrok
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('User-Agent', 'CRM-OAuth-Handler');
  
  try {
    const platform = req.params.platform as 'google_ads' | 'meta_ads';
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    if (error) {
      console.warn('OAuth error from provider:', error);
    }
    if (!code || !state) {
      res.status(400).send('Missing code/state');
      return;
    }
    // Décodage robuste du state: JSON direct puis base64url -> JSON en fallback
    let parsed: { organizationId: string; userId: string };
    try {
      // Essai 1: JSON direct (compatibilité ancienne génération)
      parsed = JSON.parse(decodeURIComponent(state));
    } catch {
      try {
        // Essai 2: base64url -> JSON (nouvelle génération sécurisée)
        const raw = Buffer.from(String(state), 'base64url').toString('utf8');
        parsed = JSON.parse(raw);
      } catch {
        res.status(400).send('Invalid state');
        return;
      }
    }
    const organizationId = parsed.organizationId;
    const userId = parsed.userId;

    // Upsert integration row helper
    const upsertIntegration = async (data: Partial<{ name: string; credentials: unknown; config: unknown }>) => {
      const existing = await prisma.adPlatformIntegration.findFirst({ where: { organizationId, platform } });
      if (existing) {
        await prisma.adPlatformIntegration.update({ where: { id: existing.id }, data: { ...data, status: 'connected', active: true, updatedAt: new Date() } });
        return existing.id;
      }
      const created = await prisma.adPlatformIntegration.create({
        data: {
          id: randomUUID(),
          organizationId,
          platform,
          name: data.name || platform,
          credentials: (data.credentials as unknown) ?? {},
          config: (data.config as unknown) ?? {},
          status: 'connected',
          active: true,
          updatedAt: new Date()
        }
      });
      return created.id;
    };

    if (platform === 'google_ads') {
      const idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID);
      const secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET);
      const clientId = idSan.value as string;
      const clientSecret = secretSan.value as string;
      const { uri: redirectUri } = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI);
      if (!clientId || !clientSecret) {
        await upsertIntegration({ name: 'Google Ads (OAuth pending)', credentials: { authCode: code, error: 'missing_client_creds', userId } });
      } else {
        try {
          const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
          const { tokens } = await oauth2.getToken(code);
          console.log('✅ Google Ads OAuth tokens received successfully');
          await upsertIntegration({ name: 'Google Ads OAuth', credentials: { tokens, userId } });
        } catch (e: unknown) {
          const idSanMasked = clientId ? (clientId.length > 8 ? clientId.slice(0,4) + '...' + clientId.slice(-4) : 'defined') : 'MISSING';
          const secretFp = fingerprintSecret(clientSecret);
          console.error(`Google Ads token exchange failed (clientId=${idSanMasked}, secretFp=${secretFp ?? 'null'}):`, e);
          const errorMsg = (e as Error).message || (e as { code?: string }).code || 'unknown_error';
          let userFriendlyError = 'Erreur d\'authentification';
          
          if (errorMsg.includes('invalid_client')) {
            userFriendlyError = 'Client OAuth non autorisé pour Google Ads API';
          } else if (errorMsg.includes('invalid_scope')) {
            userFriendlyError = 'Scope Google Ads non activé';
          }
          
          await upsertIntegration({ 
            name: `Google Ads (${userFriendlyError})`, 
            credentials: { authCode: code, error: errorMsg, userError: userFriendlyError, userId } 
          });
        }
      }
    } else if (platform === 'meta_ads') {
      const appId = process.env.META_APP_ID as string;
      const appSecret = process.env.META_APP_SECRET as string;
      const redirectUri = process.env.META_REDIRECT_URI || 'https://localhost:3000/';
      if (!appId || !appSecret) {
        await upsertIntegration({ name: 'Meta Ads (OAuth pending)', credentials: { authCode: code, error: 'missing_app_creds', userId } });
      } else {
        try {
          const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: { client_id: appId, redirect_uri: redirectUri, client_secret: appSecret, code }
          });
          const accessToken = tokenRes.data?.access_token;
          let longLived = accessToken;
          try {
            const ll = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
              params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: accessToken }
            });
            longLived = ll.data?.access_token || accessToken;
          } catch {
            // ignore, keep short token
          }
          await upsertIntegration({ name: 'Meta Ads OAuth', credentials: { accessToken: longLived, userId } });
        } catch (e) {
          console.error('Meta token exchange failed:', e);
          await upsertIntegration({ name: 'Meta Ads (OAuth error)', credentials: { authCode: code, error: 'token_exchange_failed', userId } });
        }
      }
    } else {
      res.status(400).send('Unsupported platform');
      return;
    }

    // Simple page to close popup and notify opener
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><html><body style="font-family:sans-serif; padding:16px">\
      <p>Authentification ${platform} terminée. Vous pouvez fermer cette fenêtre.</p>\
      <script src="/api/integrations/advertising/oauth/callback-close.js?platform=${encodeURIComponent(platform)}"></script>\
    </body></html>`);
  } catch (error) {
    console.error('Erreur oauth callback:', error);
    res.status(500).send('OAuth callback error');
  }
});

// Sert un script JS externe qui notifie l'onglet parent et tente de fermer le popup (meilleure compatibilité CSP)
router.get('/advertising/oauth/callback-close.js', (req: Request, res: Response): void => {
  const platform = (req.query.platform as string) || 'google_ads';
  const js = `(() => {\n  const payload = { type: 'ads_oauth_done', platform: ${JSON.stringify(platform)}, ts: Date.now() };\n  const notify = () => { try { window.opener && window.opener.postMessage(payload, '*'); } catch (e) {} };\n  // Notifier plusieurs fois\n  notify();\n  let n = 0;\n  const t1 = setInterval(() => { n++; notify(); if (n > 10) clearInterval(t1); }, 250);\n  // Fermer à répétition\n  let c = 0;\n  const t2 = setInterval(() => {\n    c++;\n    try { window.close(); } catch (e) {}\n    try { window.open('', '_self'); window.close(); } catch (e) {}\n    if (c > 20 || window.closed) clearInterval(t2);\n  }, 300);\n  // Sécurité: arrêt des timers\n  setTimeout(() => { try { clearInterval(t1); clearInterval(t2); } catch (e) {} }, 8000);\n})();`;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(js);
});

// ===== ROUTES AUTHENTIFIÉES =====
// Toutes les autres routes nécessitent une authentification
router.use(authMiddleware, impersonationMiddleware);
const getEffectiveOrgId = (req: Request): string | undefined => {
  // 1) Header (source standard via useAuthenticatedApi)
  const headerOrgId = req.headers['x-organization-id'];
  if (typeof headerOrgId === 'string' && headerOrgId !== 'all') return headerOrgId;
  // 2) Query param (utile pour tests directs dans le navigateur)
  const qOrg = (req.query.organizationId || req.query.orgId) as string | undefined;
  if (qOrg && qOrg !== 'all') return qOrg;
  // 3) Fallback utilisateur (pour utilisateurs non super-admin)
  const user = (req as AuthenticatedRequest).user;
  return user?.organizationId;
};

// GET all integrations for the selected organization
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const organizationId = getEffectiveOrgId(req);

  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  
  if (!organizationId) {
    // Return empty array if no specific organization is selected (e.g., "All organizations" view)
    res.json({ success: true, data: [] });
    return;
  }

  try {
    const integrationsSettings = await prisma.integrationsSettings.findMany({
      where: { organizationId: organizationId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, data: integrationsSettings });
  } catch (error) {
    console.error('Failed to get integrations:', error);
    res.status(500).json({ success: false, message: 'Failed to get integrations' });
  }
});

// POST to create or update an integration
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const organizationId = getEffectiveOrgId(req);
  const { type, config, enabled } = req.body;

  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required to create or update an integration.' });
    return;
  }

  if (!type) {
    res.status(400).json({ success: false, message: 'Integration type is required.' });
    return;
  }

  try {
    const upsertedIntegration = await prisma.integrationsSettings.upsert({
      where: {
        organizationId_type: {
          organizationId: organizationId,
          type: type,
        },
      },
      update: {
        config,
        enabled,
        userId: user.id,
      },
      create: {
        type,
        config,
        enabled,
        organizationId: organizationId,
        userId: user.id,
      },
    });

    res.status(201).json({ success: true, data: upsertedIntegration });
  } catch (error) {
    console.error('Failed to upsert integration:', error);
    res.status(500).json({ success: false, message: 'Failed to upsert integration' });
  }
});

// DELETE to remove an integration by type
router.delete('/:type', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const organizationId = getEffectiveOrgId(req);
  const { type } = req.params;

  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization context is missing.' });
    return;
  }

  try {
    await prisma.integrationsSettings.delete({
      where: {
        organizationId_type: {
          organizationId: organizationId,
          type: type,
        },
      },
    });

    res.status(200).json({ success: true, message: 'Integration deleted successfully.' });
  } catch (error: unknown) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }
    console.error('Failed to delete integration:', error);
    res.status(500).json({ success: false, message: 'Failed to delete integration' });
  }
});

// ==================== ROUTES ARCHITECTURE SCALABLE ====================
// Import des nouveaux services (ajouté ici pour éviter les conflits)
import { AdPlatformService, AD_PLATFORMS } from '../services/adPlatformService';
import { EcommerceService, ECOMMERCE_PLATFORMS } from '../services/ecommerceService';

/**
 * GET /api/integrations/advertising/platforms
 * Récupère la liste des plateformes publicitaires disponibles
 */
router.get('/advertising/platforms', (req, res) => {
  res.json({
    success: true,
    platforms: Object.values(AD_PLATFORMS)
  });
});

/**
 * GET /api/integrations/advertising/env-check
 * Vérifie la présence des variables d'environnement nécessaires (Google/Meta)
 */
router.get('/advertising/env-check', (_req, res) => {
  const backendUrl = process.env.BACKEND_URL;

  const googleClientId = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID);
  const googleClientSecret = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET);
  const googleDeveloperToken = sanitizeClientValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
  const googleApiVersionRaw = (process.env.GOOGLE_ADS_API_VERSION || 'v18').trim();
  const googleRedirect = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI);
  const googleManagerCustomer = normalizeGoogleAdsCustomerId(process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID);
  const googleLoginCustomer = normalizeGoogleAdsCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);

  const googleWarnings: string[] = [];
  if (googleClientId.sanitized || googleClientId.looksQuoted) {
    googleWarnings.push('GOOGLE_ADS_CLIENT_ID semblait contenir des guillemets/espaces — valeur nettoyée.');
  }
  if (googleClientSecret.sanitized || googleClientSecret.looksQuoted) {
    googleWarnings.push('GOOGLE_ADS_CLIENT_SECRET semblait contenir des guillemets/espaces — valeur nettoyée.');
  }
  if (googleDeveloperToken.sanitized || googleDeveloperToken.looksQuoted) {
    googleWarnings.push('GOOGLE_ADS_DEVELOPER_TOKEN semblait contenir des guillemets/espaces — valeur nettoyée.');
  }
  if (googleRedirect.warning) {
    googleWarnings.push(googleRedirect.warning);
  }

  const metaAppId = sanitizeClientValue(process.env.META_APP_ID);
  const metaAppSecret = sanitizeClientValue(process.env.META_APP_SECRET);
  const metaRedirect = sanitizeRedirectUri(process.env.META_REDIRECT_URI);

  const metaWarnings: string[] = [];
  if (metaAppId.sanitized || metaAppId.looksQuoted) {
    metaWarnings.push('META_APP_ID semblait contenir des guillemets/espaces — valeur nettoyée.');
  }
  if (metaAppSecret.sanitized || metaAppSecret.looksQuoted) {
    metaWarnings.push('META_APP_SECRET semblait contenir des guillemets/espaces — valeur nettoyée.');
  }
  if (metaRedirect.warning) {
    metaWarnings.push(metaRedirect.warning);
  }

  const vars = {
    BACKEND_URL: !!backendUrl,
    GOOGLE_ADS_CLIENT_ID: !!googleClientId.value,
    GOOGLE_ADS_CLIENT_SECRET: !!googleClientSecret.value,
    GOOGLE_ADS_DEVELOPER_TOKEN: !!googleDeveloperToken.value,
    META_APP_ID: !!metaAppId.value,
    META_APP_SECRET: !!metaAppSecret.value,
  } as const;

  const missing = Object.entries(vars)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  const maskOrNull = (value?: string | null) => maskValue(value ?? undefined);

  const details = {
    backend: {
      backendUrlDefined: !!backendUrl,
    },
    google: {
      clientId: {
        defined: !!googleClientId.value,
        sanitized: googleClientId.sanitized,
        looksQuoted: googleClientId.looksQuoted,
        length: googleClientId.value?.length ?? 0,
        masked: maskOrNull(googleClientId.value),
      },
      clientSecret: {
        defined: !!googleClientSecret.value,
        sanitized: googleClientSecret.sanitized,
        looksQuoted: googleClientSecret.looksQuoted,
        length: googleClientSecret.value?.length ?? 0,
        fingerprint: fingerprintSecret(googleClientSecret.value),
      },
      developerToken: {
        defined: !!googleDeveloperToken.value,
        sanitized: googleDeveloperToken.sanitized,
        looksQuoted: googleDeveloperToken.looksQuoted,
        length: googleDeveloperToken.value?.length ?? 0,
        fingerprint: fingerprintSecret(googleDeveloperToken.value),
        masked: maskOrNull(googleDeveloperToken.value),
      },
      managerCustomerId: {
        raw: process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID ?? null,
        normalized: googleManagerCustomer ?? null,
        formatted: formatGoogleAdsCustomerId(googleManagerCustomer) ?? null,
      },
      loginCustomerId: {
        raw: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? null,
        normalized: googleLoginCustomer ?? null,
        formatted: formatGoogleAdsCustomerId(googleLoginCustomer) ?? null,
      },
      apiVersion: {
        value: googleApiVersionRaw,
        defaultApplied: !process.env.GOOGLE_ADS_API_VERSION,
      },
      redirectUri: {
        value: googleRedirect.uri,
        sanitized: googleRedirect.sanitized,
        warning: googleRedirect.warning ?? null,
      },
    },
    meta: {
      appId: {
        defined: !!metaAppId.value,
        sanitized: metaAppId.sanitized,
        looksQuoted: metaAppId.looksQuoted,
        length: metaAppId.value?.length ?? 0,
        masked: maskOrNull(metaAppId.value),
      },
      appSecret: {
        defined: !!metaAppSecret.value,
        sanitized: metaAppSecret.sanitized,
        looksQuoted: metaAppSecret.looksQuoted,
        length: metaAppSecret.value?.length ?? 0,
        fingerprint: fingerprintSecret(metaAppSecret.value),
      },
      redirectUri: {
        value: metaRedirect.uri,
        sanitized: metaRedirect.sanitized,
        warning: metaRedirect.warning ?? null,
      },
    },
  } as const;

  res.json({
    success: true,
    vars,
    missing,
    ready: missing.length === 0,
    warnings: [...googleWarnings, ...metaWarnings],
    details,
  });
});

/**
 * GET /api/integrations/advertising
 * Récupère toutes les intégrations publicitaires de l'organisation
 */
router.get('/advertising', async (req, res) => {
  try {
    const organizationId = getEffectiveOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organisation requise' });
    }

    const integrations = await AdPlatformService.getIntegrations(organizationId);
    res.json({
      success: true,
      integrations
    });
  } catch (error) {
    console.error('Erreur récupération intégrations publicitaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * OAuth: Obtenir l'URL d'authentification pour une plateforme publicitaire
 * GET /api/integrations/advertising/oauth/:platform/url
 */
router.get('/advertising/oauth/:platform/url', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as 'google_ads' | 'meta_ads';
    const user = (req as AuthenticatedRequest).user;
    const organizationId = getEffectiveOrgId(req);
    if (!user || !organizationId) {
      return res.status(401).json({ success: false, message: 'Auth requise' });
    }

    const stateObj = {
      platform,
      organizationId,
      userId: user.userId,
      ts: Date.now()
    };
  const stateRaw = JSON.stringify(stateObj);
  // Encodage base64url pour éviter tout caractère problématique dans l'URL
  const stateEncoded = Buffer.from(stateRaw, 'utf8').toString('base64url');

    if (platform === 'google_ads') {
      const idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID);
      const secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
      const clientId = idSan.value;
      const clientSecret = secretSan.value || '';
      const { uri: redirectUri, warning } = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI);
      if (!clientId) {
        const missing = ['GOOGLE_ADS_CLIENT_ID'];
  const backend = (process.env.BACKEND_URL || process.env.API_URL || '').trim() || 'http://localhost:4000';
        const demoUrl = `${backend}/api/integrations/advertising/oauth/google_ads/demo?missing=${encodeURIComponent(missing.join(','))}`;
        return res.json({ success: true, platform, demo: true, requiredEnv: missing, authUrl: demoUrl, message: 'Mode démo: variables d\'environnement manquantes' });
      }
      try {
        const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const authUrl = oauth2.generateAuthUrl({
          access_type: 'offline',
          prompt: 'consent',
          scope: ['https://www.googleapis.com/auth/adwords'],
          state: stateEncoded
        });
        // Log léger pour debug (masque le clientId)
        const masked = clientId.length > 8 ? clientId.slice(0, 4) + '...' + clientId.slice(-4) : 'defined';
        const warns: string[] = [];
        if (warning) warns.push(warning);
        if (idSan.sanitized || idSan.looksQuoted) warns.push('GOOGLE_ADS_CLIENT_ID semblait contenir des guillemets/espaces — valeur nettoyée');
        if (secretSan.sanitized || secretSan.looksQuoted) warns.push('GOOGLE_ADS_CLIENT_SECRET semblait contenir des guillemets/espaces — valeur nettoyée');
        console.log(`[ADS OAUTH] Génération URL Google Ads OAuth | clientId=${masked} | redirectUri=${redirectUri}`);
        return res.json({ success: true, platform, authUrl, warnings: warns });
      } catch (err) {
        console.error('Erreur génération URL OAuth Google Ads:', err);
        return res.status(500).json({ success: false, message: 'Erreur génération URL OAuth (Google Ads)' });
      }
    }

    if (platform === 'meta_ads') {
  const appId = process.env.META_APP_ID;
      const redirectUri = process.env.META_REDIRECT_URI || 'https://localhost:3000/';
      if (!appId) {
        const missing = ['META_APP_ID'];
  const backend = (process.env.BACKEND_URL || process.env.API_URL || '').trim() || 'http://localhost:4000';
        const demoUrl = `${backend}/api/integrations/advertising/oauth/meta_ads/demo?missing=${encodeURIComponent(missing.join(','))}`;
        return res.json({ success: true, platform, demo: true, requiredEnv: missing, authUrl: demoUrl, message: 'Mode démo: variables d\'environnement manquantes' });
      }
  // Utiliser seulement public_profile (email nécessite approbation Facebook)
  const basicScope = 'public_profile';
  // Pour la publicité Meta : ads_read,ads_management,business_management (nécessite approbation Facebook)
  const scope = encodeURIComponent(basicScope);
  
  // Si utilisation de l'URI Facebook universelle, utiliser le SDK JavaScript
  if (redirectUri === 'https://www.facebook.com/connect/login_success.html') {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${encodeURIComponent(stateRaw)}&display=popup`;
    return res.json({ 
      success: true, 
      platform, 
      authUrl,
      usePopup: true,
      message: 'Utilisation de l\'URI Facebook universelle avec popup'
    });
  } else {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${encodeURIComponent(stateRaw)}`;
    return res.json({ success: true, platform, authUrl });
  }
    }

    return res.status(400).json({ success: false, message: 'Plateforme non supportée' });
  } catch (error) {
    console.error('Erreur oauth url:', error);
    res.status(500).json({ success: false, message: 'Erreur génération URL OAuth' });
  }
});

/**
 * Endpoint de debug: affiche les paramètres OAuth Google Ads calculés
 * GET /api/integrations/advertising/oauth/google_ads/debug
 */
router.get('/advertising/oauth/google_ads/debug', async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const organizationId = getEffectiveOrgId(req);
    if (!user || !organizationId) {
      return res.status(401).json({ success: false, message: 'Auth requise' });
    }

  const idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID || '');
  const secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
  const clientId = idSan.value || '';
  const clientSecret = secretSan.value || '';
  const { uri: redirectUri, warning: redirectWarning } = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI);
    const masked = clientId ? (clientId.length > 8 ? clientId.slice(0, 4) + '...' + clientId.slice(-4) : 'defined') : 'MISSING';
    const warnings: string[] = [];
    if (!clientId) warnings.push('GOOGLE_ADS_CLIENT_ID manquant');
    if (!redirectUri) warnings.push('Redirect URI manquant');
  if (redirectWarning) warnings.push(redirectWarning);
  if (idSan.sanitized || idSan.looksQuoted) warnings.push('GOOGLE_ADS_CLIENT_ID semblait contenir des guillemets/espaces — valeur nettoyée');
  if (secretSan.sanitized || secretSan.looksQuoted) warnings.push('GOOGLE_ADS_CLIENT_SECRET semblait contenir des guillemets/espaces — valeur nettoyée');

    // Scopes
    const defaultScopes = ['https://www.googleapis.com/auth/adwords'];
    const testScopes = ['openid','email','profile'];

    let authUrl: string | null = null;
    let testAuthUrl: string | null = null;
    try {
      if (clientId) {
        const stateRaw = JSON.stringify({ platform: 'google_ads', organizationId, userId: user.userId, ts: Date.now() });
        const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        // URL principale (Ads)
        authUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: defaultScopes, state: stateRaw });
        // URL de test (scopes simples)
        testAuthUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: testScopes, state: stateRaw });
      }
    } catch (e) {
      warnings.push('Erreur lors de la génération de l\'URL OAuth: ' + (e as Error).message);
    }

    return res.json({
      success: true,
      platform: 'google_ads',
      clientIdMasked: masked,
      clientSecretFingerprint: fingerprintSecret(clientSecret),
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientSecretStartsWithGOCSPX: clientSecret ? clientSecret.startsWith('GOCSPX-') : false,
      redirectUri,
      scope: defaultScopes,
      testScopes,
      organizationId,
      userId: user.userId,
      authUrl,
      testAuthUrl,
      warnings
    });
  } catch (error) {
    console.error('Erreur debug OAuth Google Ads:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur (debug OAuth)' });
  }
});

/**
 * Page démo quand les variables d'environnement OAuth manquent.
 * GET /api/integrations/advertising/oauth/:platform/demo?missing=VAR1,VAR2
 */
router.get('/advertising/oauth/:platform/demo', (req: Request, res: Response) => {
  const platform = req.params.platform as 'google_ads' | 'meta_ads';
  const missing = String(req.query.missing || '').split(',').filter(Boolean);
  const platformLabel = platform === 'google_ads' ? 'Google Ads' : platform === 'meta_ads' ? 'Meta Ads' : platform;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Mode démo — OAuth non configuré</title>
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; }
        .card { max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 10px 18px rgba(2,6,23,0.06); }
        h1 { font-size: 20px; margin: 0 0 8px; }
        .muted { color: #475569; }
        code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
        ul { margin: 8px 0 16px 22px; }
        .actions { display: flex; gap: 8px; }
        button { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; }
        button.primary { background: #2563eb; color: white; border-color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Mode démo — ${platformLabel} OAuth non configuré</h1>
  <p class="muted">Pour activer l'authentification ${platformLabel}, définissez les variables d'environnement suivantes côté serveur :</p>
        ${missing.length ? `<ul>${missing.map(v => `<li><code>${v}</code></li>`).join('')}</ul>` : ''}
        <p class="muted">Après configuration, relancez l'API puis réessayez. Cette fenêtre se fermera automatiquement.</p>
        <div class="actions">
          <button class="primary" id="close">Fermer maintenant</button>
        </div>
      </div>
      <script>
        const notify = () => { try { window.opener && window.opener.postMessage({ type: 'ads_oauth_done', platform: '${platform}', demo: true }, '*'); } catch (e) {} };
        document.getElementById('close').addEventListener('click', () => { notify(); window.close(); });
        setTimeout(() => { notify(); window.close(); }, 1600);
      </script>
    </body>
  </html>`);
});

/**
 * Lister les comptes accessibles pour une plateforme
 * GET /api/integrations/advertising/:platform/accounts
 */
router.get('/advertising/:platform/accounts', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as 'google_ads' | 'meta_ads';
    const organizationId = getEffectiveOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    let integration = await prisma.adPlatformIntegration.findFirst({ where: { organizationId, platform } });
    
    // Si pas d'intégration, retourner un statut simple
    if (!integration) {
      return res.json({ success: true, platform, integration: null, accounts: [], note: 'Aucune intégration configurée' });
    }

    // Par plateforme: Google Ads — lister les comptes accessibles
    if (platform === 'google_ads') {
      const devTokenSan = sanitizeClientValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '');
      const devToken = devTokenSan.value || '';
      const idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID || '');
      const secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
      const clientId = idSan.value || '';
      const clientSecret = secretSan.value || '';
      const { uri: redirectUri } = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI);

      type GoogleOAuthTokens = {
        access_token?: string;
        refresh_token?: string;
        expiry_date?: number;
        token_type?: string;
        scope?: string;
      };

      const creds = (integration.credentials as unknown) as Record<string, unknown> | null;
      const cfg = (integration.config as unknown) as { selectedAccount?: { id?: string } } | null;
      const loginCustomerIdSelected = normalizeGoogleAdsCustomerId(cfg?.selectedAccount?.id);
      const loginCustomerIdSelectedFormatted = formatGoogleAdsCustomerId(loginCustomerIdSelected);

      const envLoginCandidatesRaw = [
        process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID,
        process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
        process.env.GOOGLE_ADS_MANAGER_ID
      ];
      const envLoginCandidates = envLoginCandidatesRaw
        .map((value) => normalizeGoogleAdsCustomerId(value))
        .filter((value): value is string => Boolean(value));
      const loginCustomerCandidates = Array.from(
        new Set([loginCustomerIdSelected, ...envLoginCandidates].filter((value): value is string => Boolean(value)))
      );

      const sendLoginOnListEnv = (() => {
        const v = String(process.env.GOOGLE_ADS_LIST_SEND_LOGIN_CUSTOMER || '').trim().toLowerCase();
        return v === '1' || v === 'true' || v === 'yes';
      })();
      const loginRequirementKey = `ads.accounts.force-login:${organizationId}`;
      const forcedLoginFromCache = cacheGet<boolean>(loginRequirementKey) === true;
      const primaryCandidate = loginCustomerCandidates[0];
      const shouldSendLoginHeaderFirst = Boolean(primaryCandidate) &&
        (sendLoginOnListEnv || forcedLoginFromCache || Boolean(loginCustomerIdSelected));
      const primaryLoginCustomerId = shouldSendLoginHeaderFirst ? primaryCandidate : undefined;

      const cloneIntegrationCredentials = (): Prisma.JsonObject | null => {
        const raw = integration?.credentials;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          return raw && typeof raw === 'object' ? { ...(raw as Prisma.JsonObject) } : null;
        }
        return { ...(raw as Prisma.JsonObject) };
      };

      const credentialsForSuccess = (): Prisma.JsonObject | undefined => {
        const clone = cloneIntegrationCredentials();
        if (!clone) return undefined;
        let mutated = false;
        if (Object.prototype.hasOwnProperty.call(clone, 'userError')) {
          delete clone.userError;
          mutated = true;
        }
        if (Object.prototype.hasOwnProperty.call(clone, 'error')) {
          delete clone.error;
          mutated = true;
        }
        return mutated ? clone : undefined;
      };

      const credentialsForError = (userError?: string): Prisma.JsonObject | undefined => {
        const clone = (cloneIntegrationCredentials() ?? {}) as Prisma.JsonObject;
        let mutated = false;
        if (userError && clone.userError !== userError) {
          clone.userError = userError;
          mutated = true;
        }
        return mutated ? clone : undefined;
      };

      const markIntegrationStatus = async (status: 'connected' | 'error', userError?: string) => {
        if (!integration) return;
        const data: Prisma.AdPlatformIntegrationUpdateInput = {
          status,
          updatedAt: new Date(),
        };
        if (status === 'connected') {
          data.lastSync = new Date();
          const sanitized = credentialsForSuccess();
          if (sanitized) data.credentials = sanitized;
        } else if (status === 'error') {
          const credsWithError = credentialsForError(userError);
          if (credsWithError) data.credentials = credsWithError;
        }
        const updated = await prisma.adPlatformIntegration.update({
          where: { id: integration.id },
          data,
        });
        integration = updated;
      };

      const tokensRaw = creds && typeof creds === 'object' && 'tokens' in (creds as Record<string, unknown>)
        ? (creds as Record<string, unknown>)['tokens']
        : undefined;
      const storedTokens: GoogleOAuthTokens = (tokensRaw && typeof tokensRaw === 'object')
        ? (tokensRaw as GoogleOAuthTokens)
        : {};

      const warnings: string[] = [];
      if (!devToken) warnings.push('GOOGLE_ADS_DEVELOPER_TOKEN manquant — requêtes Google Ads refusées');
      if (devTokenSan.sanitized || devTokenSan.looksQuoted) warnings.push('GOOGLE_ADS_DEVELOPER_TOKEN semblait contenir des guillemets/espaces — valeur nettoyée');
      if (!clientId || !clientSecret) warnings.push('Client OAuth Google Ads incomplet — rafraîchissement du token impossible');

      let accessToken: string | undefined = storedTokens.access_token;
      const refreshToken: string | undefined = storedTokens.refresh_token;

      try {
        if ((!accessToken || storedTokens.expiry_date) && clientId && clientSecret && (refreshToken || storedTokens.expiry_date)) {
          const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
          oauth2.setCredentials({
            access_token: storedTokens.access_token,
            refresh_token: storedTokens.refresh_token,
            expiry_date: storedTokens.expiry_date,
            token_type: storedTokens.token_type,
            scope: storedTokens.scope,
          });
          const tk = await oauth2.getAccessToken();
          accessToken = tk?.token || oauth2.credentials.access_token || accessToken;
        }
      } catch {
        warnings.push('Échec du rafraîchissement de l’access token — tentative avec le token stocké');
      }

      if (!accessToken) {
        return res.json({ success: true, platform, integration, accounts: [], warnings, disabledReason: 'missing_access_token', message: 'Access token indisponible', connectionState: 'disconnected' as const });
      }
      if (!devToken) {
        return res.json({ success: true, platform, integration, accounts: [], warnings, disabledReason: 'missing_developer_token', message: 'Developer token manquant', connectionState: 'disconnected' as const });
      }

      const candidateApiVersions = (() => {
        const envValue = (process.env.GOOGLE_ADS_API_VERSION || '').trim();
        const defaults = ['v19', 'v18', 'v17'];
        const ordered = envValue ? [envValue, ...defaults] : defaults;
        return Array.from(new Set(ordered)).filter(Boolean);
      })();
      const unsupportedVersions: string[] = [];

      type GoogleAdsSuccessPayload = {
        success: true;
        platform: typeof platform;
        integration: AdPlatformIntegration;
        accounts: { id: string }[];
        warnings: string[];
        diagnostics: Record<string, unknown>;
        cached: boolean;
        cacheTtlMs: number;
        connectionState: 'connected';
      } & Record<string, unknown>;

      type GoogleAdsErrorPayload = {
        success: true;
        platform: typeof platform;
        integration: AdPlatformIntegration;
        accounts: { id: string }[];
        warnings: string[];
        apiError?: unknown;
        apiErrorSummary?: string;
        apiStatus: string;
        disabledReason: string;
        diagnostics: Record<string, unknown>;
        cached: boolean;
        cacheTtlMs: number;
        connectionState: 'error';
      } & Record<string, unknown>;

      type LoginHeaderFormat = 'digits' | 'formatted' | 'raw';

      type AttemptResult =
        | { type: 'success'; payload: GoogleAdsSuccessPayload; apiStatus?: undefined; loginCustomerId?: string; headerFormatUsed: LoginHeaderFormat | 'none'; fromCache: boolean; cacheKeyBase: string; cacheKeyUsed: string; apiVersion: string }
        | { type: 'error'; payload: GoogleAdsErrorPayload; apiStatus: string; loginCustomerId?: string; headerFormatUsed: LoginHeaderFormat | 'none'; fromCache: boolean; cacheKeyBase: string; cacheKeyUsed: string; apiVersion: string };

      const extractGoogleAdsError = (err: unknown) => {
        const ax = err as { response?: { status?: number; data?: { error?: { message?: string; status?: string; details?: unknown[] } } } };
        const data = ax?.response?.data;
        const apiError = data?.error;
        const apiMsg = apiError?.message || 'Erreur Google Ads API';
        const apiStatus = apiError?.status || 'UNKNOWN';
        const detailMsgs: string[] = [];
        const errorCodeKeys: string[] = [];
        try {
          interface GoogleAdsInnerError { message?: string; errorCode?: Record<string, unknown>; }
          interface GoogleAdsDetailShapeA { errors?: GoogleAdsInnerError[] }
          interface GoogleAdsDetailShapeB { data?: { errors?: GoogleAdsInnerError[] } }
          type GoogleAdsDetail = GoogleAdsDetailShapeA | GoogleAdsDetailShapeB | unknown;

          const detailsArr: GoogleAdsDetail[] = Array.isArray(apiError?.details) ? (apiError.details as GoogleAdsDetail[]) : [];
          for (const d of detailsArr) {
            const dA = d as GoogleAdsDetailShapeA;
            const dB = d as GoogleAdsDetailShapeB;
            const errorsContainer: GoogleAdsInnerError[] = Array.isArray(dA?.errors)
              ? dA.errors as GoogleAdsInnerError[]
              : Array.isArray(dB?.data?.errors)
                ? (dB.data?.errors as GoogleAdsInnerError[])
                : [];
            for (const e of errorsContainer) {
              if (e?.message) detailMsgs.push(String(e.message));
              const ec = e?.errorCode;
              if (ec && typeof ec === 'object') {
                for (const k of Object.keys(ec)) {
                  const val = (ec as Record<string, unknown>)[k];
                  if (val) errorCodeKeys.push(`${k}:${String(val)}`);
                }
              }
            }
          }
        } catch { /* ignore detail extraction errors */ }

        const apiErrorSummary = `${apiStatus}: ${apiMsg}${detailMsgs.length ? ' — ' + detailMsgs[0] : ''}`;
        return { data, apiErrorSummary, apiStatus, errorCodeKeys };
      };

      const buildCacheKeyBase = (apiVersion: string, loginCustomerId?: string, headerFormat?: LoginHeaderFormat | 'none') => {
        const loginKey = loginCustomerId ?? 'none';
        const formatKey = headerFormat ?? 'none';
        return `ads.accounts:${organizationId}:${apiVersion}:${loginKey}:${formatKey}:${fingerprintSecret(devToken) || 'no-dev'}`;
      };

      const runWithApiVersion = async (apiVersion: string): Promise<AttemptResult> => {
        const cacheTtlSuccessMs = 30000;
        const cacheTtlErrorMs = 20000;

        const attemptList = async (
          loginCustomerId?: string,
          allowCacheRead = true,
          options?: { headerFormat?: LoginHeaderFormat }
        ): Promise<AttemptResult> => {
        const headerFormat = options?.headerFormat ?? 'digits';
        const sanitizedLoginForKey = normalizeGoogleAdsCustomerId(loginCustomerId);
          const cacheKeyBase = buildCacheKeyBase(apiVersion, sanitizedLoginForKey ?? loginCustomerId, headerFormat);
        const cacheKeyOk = cacheKeyBase;
        const cacheKeyErr = `${cacheKeyBase}:error`;

        if (allowCacheRead) {
          const cachedOk = cacheGet<GoogleAdsSuccessPayload>(cacheKeyOk);
          if (cachedOk) {
            const headerFmtDiag = (cachedOk?.diagnostics as Record<string, unknown> | undefined)?.loginCustomerHeaderFormatUsed;
            const headerFormatFromCache: LoginHeaderFormat | 'none' = headerFmtDiag === 'formatted' || headerFmtDiag === 'raw' || headerFmtDiag === 'digits'
              ? headerFmtDiag
              : 'none';
            return {
              type: 'success',
              payload: { ...cachedOk, cached: true },
              loginCustomerId: sanitizedLoginForKey ?? loginCustomerId,
              headerFormatUsed: headerFormatFromCache,
              fromCache: true,
              cacheKeyBase,
                cacheKeyUsed: cacheKeyOk,
                apiVersion
            };
          }
          const cachedErr = cacheGet<GoogleAdsErrorPayload>(cacheKeyErr);
          if (cachedErr) {
            const cachedStatus = typeof cachedErr.apiStatus === 'string' ? cachedErr.apiStatus : 'UNKNOWN';
            const headerFmtDiag = (cachedErr?.diagnostics as Record<string, unknown> | undefined)?.loginCustomerHeaderFormatUsed;
            const headerFormatFromCache: LoginHeaderFormat | 'none' = headerFmtDiag === 'formatted' || headerFmtDiag === 'raw' || headerFmtDiag === 'digits'
              ? headerFmtDiag
              : 'none';
            return {
              type: 'error',
              payload: { ...cachedErr, cached: true },
              apiStatus: cachedStatus,
              loginCustomerId: sanitizedLoginForKey ?? loginCustomerId,
              headerFormatUsed: headerFormatFromCache,
              fromCache: true,
              cacheKeyBase,
                cacheKeyUsed: cacheKeyErr,
                apiVersion
            };
          }
        }

        const url = `https://googleads.googleapis.com/${apiVersion}/customers:listAccessibleCustomers`;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': devToken,
          Accept: 'application/json'
        };
  const sanitizedLoginHeader = sanitizedLoginForKey;
        const formattedLoginHeader = sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : undefined;
        const rawLoginHeader = typeof loginCustomerId === 'string' ? loginCustomerId.trim() : undefined;
        const loginHeaderValue = (() => {
          if (headerFormat === 'formatted') return formattedLoginHeader;
          if (headerFormat === 'raw') return rawLoginHeader;
          return sanitizedLoginHeader;
        })();
        const loginHeaderSent = Boolean(loginHeaderValue);
        if (loginHeaderSent && loginHeaderValue) {
          headers['login-customer-id'] = loginHeaderValue;
        }

        try {
          const resp = await axios.get(url, { headers });
          const names: string[] = resp.data?.resourceNames || resp.data?.resource_names || [];
          const accounts = names.map((rn) => {
            const m = String(rn).match(/customers\/(\d+)/);
            return { id: m ? m[1] : rn };
          });
          const payload: GoogleAdsSuccessPayload = {
            success: true,
            platform,
            integration,
            accounts,
            warnings: [...warnings],
            diagnostics: {
              loginCustomerIdSelected,
              loginCustomerIdSelectedFormatted,
              loginCustomerHeaderSent: loginHeaderSent,
              loginCustomerAttempted: sanitizedLoginHeader ?? null,
              loginCustomerAttemptFormatted: sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : null,
              loginCustomerAttemptRaw: rawLoginHeader ?? null,
              loginCustomerHeaderValue: loginHeaderValue ?? null,
              loginCustomerHeaderFormatUsed: loginHeaderSent ? headerFormat : 'none',
              loginHeaderSource: sanitizedLoginHeader
                ? sanitizedLoginHeader === loginCustomerIdSelected
                  ? 'selected_account'
                  : envLoginCandidates.includes(sanitizedLoginHeader)
                    ? 'environment'
                    : 'manual'
                : null,
                apiVersion,
              availableLoginCustomerCandidates: loginCustomerCandidates,
              forcedLoginHeader: forcedLoginFromCache,
              fallbackTriggered: false
            },
            cached: false,
            cacheTtlMs: cacheTtlSuccessMs,
            connectionState: 'connected'
          };
          cacheSet(cacheKeyOk, payload, cacheTtlSuccessMs);
            return { type: 'success', payload, loginCustomerId: sanitizedLoginHeader ?? loginCustomerId, headerFormatUsed: loginHeaderSent ? headerFormat : 'none', fromCache: false, cacheKeyBase, cacheKeyUsed: cacheKeyOk, apiVersion };
        } catch (error: unknown) {
          const { data, apiErrorSummary, apiStatus, errorCodeKeys } = extractGoogleAdsError(error);
          console.error('Erreur Google Ads listAccessibleCustomers:', data || error);
          console.error('Google Ads diagnostics (listAccessibleCustomers):', {
            organizationId,
            apiStatus,
            loginHeader: {
              sent: loginHeaderSent,
              valueLength: loginHeaderValue ? loginHeaderValue.length : 0,
              normalized: sanitizedLoginHeader ?? null,
              formatted: sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : null,
              formatUsed: loginHeaderSent ? headerFormat : 'none',
              source: sanitizedLoginHeader
                ? sanitizedLoginHeader === loginCustomerIdSelected
                  ? 'selected_account'
                  : envLoginCandidates.includes(sanitizedLoginHeader)
                    ? 'environment'
                    : 'manual'
                : null,
            },
            developerToken: {
              defined: Boolean(devToken),
              fingerprint: fingerprintSecret(devToken),
              length: devToken ? devToken.length : 0,
            },
            clientId: {
              defined: Boolean(clientId),
              masked: clientId
                ? clientId.length > 8
                  ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}`
                  : 'defined'
                : 'MISSING',
            },
            redirectUri,
            errorCodeKeys,
              apiVersion,
          });

          const warningsForPayload = [...warnings];
          let humanHint: string | undefined;
          if (apiStatus === 'INVALID_ARGUMENT') {
            humanHint = 'INVALID_ARGUMENT reçu. Vérifiez GOOGLE_ADS_DEVELOPER_TOKEN (sans guillemets/espaces), l’approbation API et redémarrez l’API après modification du .env.';
            if (devTokenSan.sanitized || devTokenSan.looksQuoted) {
              humanHint += ' Le token a été nettoyé automatiquement côté serveur (indice: guillemets/espaces détectés).';
            }
            if (!loginHeaderSent && loginCustomerCandidates.length === 0) {
              warningsForPayload.push('INVALID_ARGUMENT sans login-customer-id et aucun identifiant de repli disponible. Définissez GOOGLE_ADS_MANAGER_CUSTOMER_ID ou sélectionnez un compte Google Ads.');
            }
          }

          const payload: GoogleAdsErrorPayload = {
            success: true,
            platform,
            integration,
            accounts: [],
            warnings: warningsForPayload,
            apiError: data,
            apiErrorSummary,
            apiStatus,
            disabledReason: 'ads_api_error',
            diagnostics: {
              apiVersion,
              devTokenFingerprint: fingerprintSecret(devToken),
              devTokenLength: devToken ? devToken.length : 0,
              clientIdMasked: (idSan.value ? (idSan.value.length > 8 ? idSan.value.slice(0, 4) + '...' + idSan.value.slice(-4) : 'defined') : 'MISSING'),
              redirectUri,
              loginCustomerIdSelected,
              loginCustomerIdSelectedFormatted,
              loginCustomerHeaderSent: loginHeaderSent,
              loginCustomerAttempted: sanitizedLoginHeader ?? null,
              loginCustomerAttemptFormatted: sanitizedLoginHeader ? formatGoogleAdsCustomerId(sanitizedLoginHeader) : null,
              loginCustomerAttemptRaw: rawLoginHeader ?? null,
              loginCustomerHeaderValue: loginHeaderValue ?? null,
              loginCustomerHeaderFormatUsed: loginHeaderSent ? headerFormat : 'none',
              loginHeaderSource: sanitizedLoginHeader
                ? sanitizedLoginHeader === loginCustomerIdSelected
                  ? 'selected_account'
                  : envLoginCandidates.includes(sanitizedLoginHeader)
                    ? 'environment'
                    : 'manual'
                : null,
              availableLoginCustomerCandidates: loginCustomerCandidates,
              primaryErrorCode: errorCodeKeys[0] || null,
              errorCodeKeys,
              humanHint,
              forcedLoginHeader: forcedLoginFromCache,
              fallbackTriggered: false
            },
            cached: false,
            cacheTtlMs: cacheTtlErrorMs,
            connectionState: 'error'
          };
          cacheSet(cacheKeyErr, payload, cacheTtlErrorMs);
            return { type: 'error', payload, apiStatus, loginCustomerId: sanitizedLoginHeader ?? loginCustomerId, headerFormatUsed: loginHeaderSent ? headerFormat : 'none', fromCache: false, cacheKeyBase, cacheKeyUsed: cacheKeyErr, apiVersion };
        }
      };
        const applyFormattedFallback = async (
          current: AttemptResult,
          loginCustomerId?: string,
          context: 'initial' | 'secondary'
        ): Promise<AttemptResult> => {
          if (!loginCustomerId) return current;
          if (current.type === 'success') return current;
          if (current.apiStatus !== 'INVALID_ARGUMENT') return current;
          if (current.headerFormatUsed === 'formatted') return current;

          const formattedAttempt = await attemptList(loginCustomerId, false, { headerFormat: 'formatted' });
          const warningNoteSuccess = 'La requête Google Ads a abouti après réémission du login-customer-id au format 123-456-7890.';
          const warningNoteFailure = `Tentative supplémentaire avec login-customer-id formaté (tirets) également en échec (${formattedAttempt.apiStatus}).`;
          const diagAugmentation = {
            formatFallbackTriggered: true,
            formatFallbackContext: context,
          } as Record<string, unknown>;

          if (formattedAttempt.type === 'success') {
            formattedAttempt.payload.warnings = [...formattedAttempt.payload.warnings, warningNoteSuccess];
            formattedAttempt.payload.diagnostics = {
              ...formattedAttempt.payload.diagnostics,
              ...diagAugmentation,
            };
          } else {
            formattedAttempt.payload.warnings = [...formattedAttempt.payload.warnings, warningNoteFailure];
            formattedAttempt.payload.diagnostics = {
              ...formattedAttempt.payload.diagnostics,
              ...diagAugmentation,
            };
          }

          return formattedAttempt;
        };

        let initialAttempt = await attemptList(primaryLoginCustomerId, true);
        initialAttempt = await applyFormattedFallback(initialAttempt, primaryLoginCustomerId, 'initial');
        if (initialAttempt.type === 'success') {
          if (!initialAttempt.fromCache) {
            await markIntegrationStatus('connected');
            initialAttempt.payload.integration = integration;
            cacheSet(initialAttempt.cacheKeyUsed, initialAttempt.payload, initialAttempt.payload.cacheTtlMs);
          } else {
            initialAttempt.payload.integration = integration;
          }
          initialAttempt.payload.diagnostics = {
            ...initialAttempt.payload.diagnostics,
            apiVersion,
          };
          return initialAttempt;
        }

        const shouldRetryWithLoginHeader = initialAttempt.apiStatus === 'INVALID_ARGUMENT'
          && !primaryLoginCustomerId
          && loginCustomerCandidates.length > 0;

        if (shouldRetryWithLoginHeader) {
          const fallbackLoginCustomerId = loginCustomerCandidates[0];
          const fallbackLabel = formatGoogleAdsCustomerId(fallbackLoginCustomerId) ?? fallbackLoginCustomerId;
          cacheSet(loginRequirementKey, true, 10 * 60 * 1000); // 10 minutes

          let fallbackAttempt = await attemptList(fallbackLoginCustomerId, false);
          fallbackAttempt = await applyFormattedFallback(fallbackAttempt, fallbackLoginCustomerId, 'secondary');
          if (fallbackAttempt.type === 'success') {
            fallbackAttempt.payload.warnings = [
              ...fallbackAttempt.payload.warnings,
              `La requête initiale sans login-customer-id a retourné INVALID_ARGUMENT. Relance réussie avec l'identifiant ${fallbackLabel}.`
            ];
            fallbackAttempt.payload.diagnostics = {
              ...fallbackAttempt.payload.diagnostics,
              fallbackTriggered: true,
              fallbackLoginCustomerId,
              fallbackLoginCustomerFormatted: fallbackLabel,
              fallbackReason: 'INVALID_ARGUMENT_without_login_header',
              apiVersion,
            };
            await markIntegrationStatus('connected');
            fallbackAttempt.payload.integration = integration;
            cacheSet(fallbackAttempt.cacheKeyUsed, fallbackAttempt.payload, fallbackAttempt.payload.cacheTtlMs);
            return fallbackAttempt;
          }

          fallbackAttempt.payload.warnings = [
            ...fallbackAttempt.payload.warnings,
            `La requête initiale sans login-customer-id a retourné INVALID_ARGUMENT. La relance avec ${fallbackLabel} a également échoué (${fallbackAttempt.apiStatus}).`
          ];
          fallbackAttempt.payload.diagnostics = {
            ...fallbackAttempt.payload.diagnostics,
            fallbackTriggered: true,
            fallbackLoginCustomerId,
            fallbackLoginCustomerFormatted: fallbackLabel,
            fallbackReason: 'INVALID_ARGUMENT_without_login_header',
            apiVersion,
          };
          const fallbackErrorSummary = fallbackAttempt.payload.apiErrorSummary || fallbackAttempt.apiStatus;
          await markIntegrationStatus('error', fallbackErrorSummary);
          fallbackAttempt.payload.integration = integration;
          cacheSet(fallbackAttempt.cacheKeyUsed, fallbackAttempt.payload, fallbackAttempt.payload.cacheTtlMs);
          return fallbackAttempt;
        }

        const initialErrorSummary = initialAttempt.payload.apiErrorSummary || initialAttempt.apiStatus;
        if (!initialAttempt.fromCache) {
          await markIntegrationStatus('error', initialErrorSummary);
          initialAttempt.payload.integration = integration;
          cacheSet(initialAttempt.cacheKeyUsed, initialAttempt.payload, initialAttempt.payload.cacheTtlMs);
        } else {
          initialAttempt.payload.integration = integration;
        }

        initialAttempt.payload.diagnostics = {
          ...initialAttempt.payload.diagnostics,
          apiVersion,
        };

        return initialAttempt;
      };

      let finalResult: AttemptResult | undefined;
      for (const apiVersion of candidateApiVersions) {
        const result = await runWithApiVersion(apiVersion);
        if (result.type === 'success') {
          finalResult = result;
          break;
        }
        const primaryError = (result.payload?.diagnostics as Record<string, unknown> | undefined)?.primaryErrorCode;
        if (result.apiStatus === 'INVALID_ARGUMENT' && primaryError === 'requestError:UNSUPPORTED_VERSION') {
          unsupportedVersions.push(apiVersion);
          continue;
        }
        finalResult = result;
        break;
      }

      if (!finalResult) {
        // fallback: renvoyer dernière tentative avec version par défaut
        finalResult = await runWithApiVersion(candidateApiVersions[candidateApiVersions.length - 1] || 'v18');
      }

      if (unsupportedVersions.length) {
        const diag = (finalResult.payload?.diagnostics ?? {}) as Record<string, unknown>;
        finalResult.payload.diagnostics = {
          ...diag,
          unsupportedApiVersions: unsupportedVersions,
        };
        finalResult.payload.warnings = [
          ...(finalResult.payload.warnings || []),
          `Versions Google Ads non supportées détectées: ${unsupportedVersions.join(', ')}`
        ];
      }

      console.log('[Google Ads] Résultat listAccessibleCustomers', {
        organizationId,
        type: finalResult.type,
        apiVersion: finalResult.apiVersion,
        unsupportedVersions,
        fromCache: finalResult.fromCache,
      });

      if (finalResult.type === 'success') {
        if (!finalResult.fromCache) {
          await markIntegrationStatus('connected');
          finalResult.payload.integration = integration;
          cacheSet(finalResult.cacheKeyUsed, finalResult.payload, finalResult.payload.cacheTtlMs);
        } else {
          finalResult.payload.integration = integration;
        }
        return res.json(finalResult.payload);
      }

      const finalErrorSummary = finalResult.payload.apiErrorSummary || finalResult.apiStatus;
      if (!finalResult.fromCache) {
        await markIntegrationStatus('error', finalErrorSummary);
        finalResult.payload.integration = integration;
        cacheSet(finalResult.cacheKeyUsed, finalResult.payload, finalResult.payload.cacheTtlMs);
      } else {
        finalResult.payload.integration = integration;
      }

      return res.json(finalResult.payload);
    }

    if (platform === 'meta_ads') {
      const appIdSan = sanitizeClientValue(process.env.META_APP_ID || '');
      const appSecretSan = sanitizeClientValue(process.env.META_APP_SECRET || '');
      const warnings: string[] = [];
      if (!appIdSan.value) warnings.push('META_APP_ID manquant — authentification Meta impossible');
      if (!appSecretSan.value) warnings.push('META_APP_SECRET manquant — échanges de tokens impossibles');
      if (appIdSan.sanitized || appIdSan.looksQuoted) warnings.push('META_APP_ID semblait contenir des guillemets/espaces — valeur nettoyée');
      if (appSecretSan.sanitized || appSecretSan.looksQuoted) warnings.push('META_APP_SECRET semblait contenir des guillemets/espaces — valeur nettoyée');

      const rawCreds = integration.credentials as Prisma.JsonObject | null;
      const rawAccessToken = rawCreds && typeof rawCreds === 'object' ? (rawCreds as Record<string, unknown>).accessToken : undefined;
      const trimmedAccessToken = typeof rawAccessToken === 'string' ? rawAccessToken.trim() : undefined;
      const accessToken = trimmedAccessToken;

      const cloneIntegrationCredentials = (): Prisma.JsonObject | null => {
        const raw = integration?.credentials;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          return raw && typeof raw === 'object' ? { ...(raw as Prisma.JsonObject) } : null;
        }
        return { ...(raw as Prisma.JsonObject) };
      };

      const credentialsForSuccess = (): Prisma.JsonObject | undefined => {
        const clone = cloneIntegrationCredentials();
        if (!clone) return undefined;
        let mutated = false;
        if (accessToken && clone.accessToken !== accessToken) {
          clone.accessToken = accessToken;
          mutated = true;
        }
        if (Object.prototype.hasOwnProperty.call(clone, 'userError')) {
          delete clone.userError;
          mutated = true;
        }
        if (Object.prototype.hasOwnProperty.call(clone, 'error')) {
          delete clone.error;
          mutated = true;
        }
        return mutated ? clone : undefined;
      };

      const credentialsForError = (userError?: string, errorCode?: string): Prisma.JsonObject | undefined => {
        const clone = (cloneIntegrationCredentials() ?? {}) as Prisma.JsonObject;
        let mutated = false;
        if (userError && clone.userError !== userError) {
          clone.userError = userError;
          mutated = true;
        }
        if (errorCode && clone.error !== errorCode) {
          clone.error = errorCode;
          mutated = true;
        }
        return mutated ? clone : undefined;
      };

      const markIntegrationStatus = async (status: 'connected' | 'error', userError?: string, errorCode?: string) => {
        if (!integration) return;
        const data: Prisma.AdPlatformIntegrationUpdateInput = {
          status,
          updatedAt: new Date()
        };
        if (status === 'connected') {
          data.lastSync = new Date();
          const sanitized = credentialsForSuccess();
          if (sanitized) data.credentials = sanitized;
        } else if (status === 'error') {
          const credsWithError = credentialsForError(userError, errorCode);
          if (credsWithError) data.credentials = credsWithError;
        }
        const updated = await prisma.adPlatformIntegration.update({
          where: { id: integration.id },
          data
        });
        integration = updated;
      };

      if (!accessToken) {
        return res.json({
          success: true,
          platform,
          integration,
          accounts: [],
          warnings,
          disabledReason: 'missing_access_token',
          message: 'Access token Meta Ads indisponible',
          connectionState: 'disconnected' as const
        });
      }

      const cacheKeyBase = `meta.accounts:${organizationId}:${fingerprintSecret(accessToken) || 'anon'}`;
      const cacheKeyOk = `${cacheKeyBase}:ok`;
      const cacheKeyError = `${cacheKeyBase}:error`;
      const cacheTtlSuccessMs = 30000;
      const cacheTtlErrorMs = 20000;

      const cachedOk = cacheGet<Record<string, unknown>>(cacheKeyOk);
      if (cachedOk) {
        const diagnostics = cachedOk?.diagnostics && typeof cachedOk.diagnostics === 'object' && !Array.isArray(cachedOk.diagnostics)
          ? { ...(cachedOk.diagnostics as Record<string, unknown>), cached: true }
          : { cached: true };
        return res.json({ ...cachedOk, diagnostics });
      }
      const cachedErr = cacheGet<Record<string, unknown>>(cacheKeyError);
      if (cachedErr) {
        const diagnostics = cachedErr?.diagnostics && typeof cachedErr.diagnostics === 'object' && !Array.isArray(cachedErr.diagnostics)
          ? { ...(cachedErr.diagnostics as Record<string, unknown>), cached: true }
          : { cached: true };
        return res.json({ ...cachedErr, diagnostics });
      }

      try {
        const accountsResp = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
          params: {
            fields: 'id,account_id,name,account_status,currency,timezone_id,business_name',
            access_token: accessToken
          }
        });
        const rawAccounts: Array<Record<string, unknown>> = Array.isArray(accountsResp.data?.data)
          ? (accountsResp.data.data as Array<Record<string, unknown>>)
          : [];
        const accounts = rawAccounts.map((acc) => {
          const accountId = typeof acc.account_id === 'string' ? acc.account_id : undefined;
          const actId = typeof acc.id === 'string' ? acc.id : accountId;
          return {
            id: actId || accountId || 'unknown',
            accountId: accountId || null,
            name: typeof acc.name === 'string' ? acc.name : 'Compte Meta',
            status: typeof acc.account_status === 'number' ? acc.account_status : acc.account_status ?? null,
            currency: typeof acc.currency === 'string' ? acc.currency : null,
            timezoneId: typeof acc.timezone_id === 'string' ? acc.timezone_id : null,
            businessName: typeof acc.business_name === 'string' ? acc.business_name : null
          };
        });

        await markIntegrationStatus('connected');

        const payload = {
          success: true,
          platform,
          integration,
          accounts,
          warnings,
          diagnostics: {
            tokenFingerprint: fingerprintSecret(accessToken),
            accountCount: accounts.length,
            cached: false
          },
          connectionState: 'connected' as const
        };
        cacheSet(cacheKeyOk, payload, cacheTtlSuccessMs);
        return res.json(payload);
      } catch (error: unknown) {
        const ax = error as { response?: { data?: { error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string } } } };
        const fbError = ax?.response?.data?.error;
        const fbType = fbError?.type || 'MetaApiError';
        const fbMessage = fbError?.message || 'Erreur Meta Ads API';
        const fbCode = typeof fbError?.code === 'number' ? fbError?.code : null;
        const fbSubcode = typeof fbError?.error_subcode === 'number' ? fbError?.error_subcode : null;
        const fbTraceId = fbError?.fbtrace_id || null;
        let userFriendly = fbMessage;
        if (fbCode === 190) {
          userFriendly = 'Session Meta expirée — reconnectez-vous à Meta Ads.';
        } else if (fbCode === 102) {
          userFriendly = 'Jeton Meta invalide — relancez l’authentification.';
        }

        await markIntegrationStatus('error', userFriendly, fbType);

        const payload = {
          success: true,
          platform,
          integration,
          accounts: [],
          warnings,
          apiError: fbError,
          apiErrorSummary: `${fbType}${fbCode ? ` (${fbCode}${fbSubcode ? `/${fbSubcode}` : ''})` : ''}: ${fbMessage}`,
          disabledReason: 'ads_api_error',
          connectionState: 'error' as const,
          diagnostics: {
            tokenFingerprint: fingerprintSecret(accessToken),
            appIdPresent: !!appIdSan.value,
            errorCode: fbCode,
            errorSubcode: fbSubcode,
            errorType: fbType,
            fbTraceId,
            cached: false
          }
        };
        cacheSet(cacheKeyError, payload, cacheTtlErrorMs);
        return res.json(payload);
      }
    }

    // Par défaut pour autres plateformes (placeholder)
    return res.json({ success: true, platform, integration, accounts: [], note: 'Intégration configurée', connectionState: 'unknown' as const });
  } catch (error) {
    console.error('Erreur listing comptes:', error);
    res.status(500).json({ success: false, message: 'Erreur listing comptes' });
  }
});

/**
 * Endpoint de test ciblé Google Ads: GET customer
 * Objectif: diagnostiquer les erreurs INVALID_ARGUMENT en testant un customerId précis
 * GET /api/integrations/advertising/google_ads/test/customers-get?customerId=XXX&withLoginHeader=true&apiVersion=v18
 */
router.get('/advertising/google_ads/test/customers-get', async (req: Request, res: Response) => {
  try {
    const organizationId = getEffectiveOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const integ = await prisma.adPlatformIntegration.findFirst({ where: { organizationId, platform: 'google_ads' } });
    if (!integ) return res.status(404).json({ success: false, message: 'Intégration Google Ads manquante' });

    const devTokenSan = sanitizeClientValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '');
    const devToken = devTokenSan.value || '';
    const idSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_ID || '');
    const secretSan = sanitizeClientValue(process.env.GOOGLE_ADS_CLIENT_SECRET || '');
    const clientId = idSan.value || '';
    const clientSecret = secretSan.value || '';
    const { uri: redirectUri } = sanitizeRedirectUri(process.env.GOOGLE_ADS_REDIRECT_URI);

    const qCustomerId = String(req.query.customerId || '').trim();
    const normalizedCustomerId = qCustomerId.replace(/[^0-9]/g, '');
    const apiVersion = String(req.query.apiVersion || process.env.GOOGLE_ADS_API_VERSION || 'v18').trim();
    const withLoginHeader = String(req.query.withLoginHeader || '').toLowerCase();
    const sendLoginHeader = withLoginHeader === '1' || withLoginHeader === 'true' || withLoginHeader === 'yes';

    const warnings: string[] = [];
    if (!normalizedCustomerId || normalizedCustomerId.length < 8) return res.status(400).json({ success: false, message: 'Paramètre customerId invalide' });
    if (!devToken) warnings.push('GOOGLE_ADS_DEVELOPER_TOKEN manquant — requêtes Google Ads refusées');
    if (devTokenSan.sanitized || devTokenSan.looksQuoted) warnings.push('GOOGLE_ADS_DEVELOPER_TOKEN semblait contenir des guillemets/espaces — valeur nettoyée');
    if (!clientId || !clientSecret) warnings.push('Client OAuth Google Ads incomplet — rafraîchissement du token impossible');

    type GoogleOAuthTokens = {
      access_token?: string;
      refresh_token?: string;
      expiry_date?: number;
      token_type?: string;
      scope?: string;
    };
    const creds = (integ.credentials as unknown) as Record<string, unknown> | null;
    const tokensRaw = creds && typeof creds === 'object' && 'tokens' in (creds as Record<string, unknown>)
      ? (creds as Record<string, unknown>)['tokens']
      : undefined;
    const storedTokens: GoogleOAuthTokens = (tokensRaw && typeof tokensRaw === 'object')
      ? (tokensRaw as GoogleOAuthTokens)
      : {};
    let accessToken: string | undefined = storedTokens.access_token;
    const refreshToken: string | undefined = storedTokens.refresh_token;

    try {
      if ((!accessToken || storedTokens.expiry_date) && clientId && clientSecret && (refreshToken || storedTokens.expiry_date)) {
        const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        oauth2.setCredentials({
          access_token: storedTokens.access_token,
          refresh_token: storedTokens.refresh_token,
          expiry_date: storedTokens.expiry_date,
          token_type: storedTokens.token_type,
          scope: storedTokens.scope,
        });
        const tk = await oauth2.getAccessToken();
        accessToken = tk?.token || oauth2.credentials.access_token || accessToken;
      }
    } catch {
      warnings.push('Échec du rafraîchissement de l’access token — tentative avec le token stocké');
    }

    if (!accessToken) {
      return res.json({ success: true, test: 'customers.get', customerId: normalizedCustomerId, warnings, disabledReason: 'missing_access_token' });
    }
    if (!devToken) {
      return res.json({ success: true, test: 'customers.get', customerId: normalizedCustomerId, warnings, disabledReason: 'missing_developer_token' });
    }

    const url = `https://googleads.googleapis.com/${apiVersion}/customers/${normalizedCustomerId}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
      Accept: 'application/json'
    };
    const loginHeaderSent = !!(sendLoginHeader && normalizedCustomerId);
    if (loginHeaderSent) headers['login-customer-id'] = normalizedCustomerId;

    try {
      const resp = await axios.get(url, { headers });
      return res.json({
        success: true,
        test: 'customers.get',
        customerId: normalizedCustomerId,
        apiVersion,
        loginCustomerHeaderSent: loginHeaderSent,
        warnings,
        data: resp.data
      });
    } catch (error: unknown) {
      const ax = error as { response?: { status?: number; data?: { error?: { message?: string; status?: string; details?: unknown[] } } } };
      const data = ax?.response?.data;
      const apiError = data?.error;
      const apiMsg = apiError?.message || 'Erreur Google Ads API';
      const apiStatus = apiError?.status || 'UNKNOWN';
      const detailMsgs: string[] = [];
      const errorCodeKeys: string[] = [];
      try {
        interface GoogleAdsInnerError { message?: string; errorCode?: Record<string, unknown>; }
        interface GoogleAdsDetailShapeA { errors?: GoogleAdsInnerError[] }
        interface GoogleAdsDetailShapeB { data?: { errors?: GoogleAdsInnerError[] } }
        type GoogleAdsDetail = GoogleAdsDetailShapeA | GoogleAdsDetailShapeB | unknown;
        const detailsArr: GoogleAdsDetail[] = Array.isArray(apiError?.details) ? (apiError.details as GoogleAdsDetail[]) : [];
        for (const d of detailsArr) {
          const dA = d as GoogleAdsDetailShapeA;
          const dB = d as GoogleAdsDetailShapeB;
          const errorsContainer: GoogleAdsInnerError[] = Array.isArray(dA?.errors)
            ? dA.errors as GoogleAdsInnerError[]
            : Array.isArray(dB?.data?.errors)
              ? (dB.data?.errors as GoogleAdsInnerError[])
              : [];
          for (const e of errorsContainer) {
            if (e?.message) detailMsgs.push(String(e.message));
            const ec = e?.errorCode;
            if (ec && typeof ec === 'object') {
              for (const k of Object.keys(ec)) {
                const val = (ec as Record<string, unknown>)[k];
                if (val) errorCodeKeys.push(`${k}:${String(val)}`);
              }
            }
          }
        }
      } catch { /* ignore */ }
      const apiErrorSummary = `${apiStatus}: ${apiMsg}${detailMsgs.length ? ' — ' + detailMsgs[0] : ''}`;
      return res.json({
        success: true,
        test: 'customers.get',
        customerId: normalizedCustomerId,
        apiVersion,
        loginCustomerHeaderSent: loginHeaderSent,
        warnings,
        apiError: data,
        apiErrorSummary,
        diagnostics: {
          devTokenFingerprint: fingerprintSecret(devToken),
          devTokenLength: devToken ? devToken.length : 0,
          clientIdMasked: (idSan.value ? (idSan.value.length > 8 ? idSan.value.slice(0,4)+'...'+idSan.value.slice(-4) : 'defined') : 'MISSING'),
          redirectUri,
          primaryErrorCode: errorCodeKeys[0] || null,
          errorCodeKeys
        }
      });
    }
  } catch (error) {
    console.error('Erreur test customers.get:', error);
    res.status(500).json({ success: false, message: 'Erreur test customers.get' });
  }
});

/**
 * Supprimer une intégration publicitaire
 * DELETE /api/integrations/advertising/:platform
 */
router.delete('/advertising/:platform', async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const organizationId = getEffectiveOrgId(req);
  const platform = req.params.platform as 'google_ads' | 'meta_ads';

  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  
  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization context is missing.' });
    return;
  }

  try {
    const deleted = await prisma.adPlatformIntegration.deleteMany({
      where: {
        organizationId,
        platform
      }
    });

    if (deleted.count === 0) {
      res.status(404).json({ success: false, message: 'Integration not found' });
      return;
    }

    res.status(200).json({ success: true, message: `Intégration ${platform} supprimée avec succès` });
  } catch (error) {
    console.error('Failed to delete platform integration:', error);
    res.status(500).json({ success: false, message: 'Failed to delete integration' });
  }
});
/**
 * Sélectionner un compte pour une intégration publicitaire
 * POST /api/integrations/advertising/:platform/select-account
 * body: { account: { id: string; name?: string; currency?: string } }
 */
router.post('/advertising/:platform/select-account', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as 'google_ads' | 'meta_ads';
    const organizationId = getEffectiveOrgId(req);
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const { account } = req.body as { account?: { id?: string; name?: string; currency?: string } };
    if (!account || !account.id) {
      return res.status(400).json({ success: false, message: 'Compte invalide' });
    }

    const integ = await prisma.adPlatformIntegration.findFirst({ where: { organizationId, platform } });
    if (!integ) return res.status(404).json({ success: false, message: 'Intégration non trouvée' });

    const currentConfig = (integ.config as unknown) as Record<string, unknown> | null;
    const newConfig: Record<string, unknown> = { ...(currentConfig || {}), selectedAccount: { id: account.id, name: account.name, currency: account.currency } };

    // Optionnel: si le nom est générique, on l’enrichit avec le nom du compte
    let newName = integ.name;
    const genericNames = new Set<string>(['google_ads', 'meta_ads', 'Google Ads OAuth', 'Meta Ads OAuth']);
    if (!newName || genericNames.has(newName)) {
      newName = `${platform} - ${account.name || account.id}`;
    }

    await prisma.adPlatformIntegration.update({
      where: { id: integ.id },
      data: { config: newConfig, name: newName, updatedAt: new Date() }
    });

    return res.json({ success: true, platform, selectedAccount: { id: account.id, name: account.name, currency: account.currency } });
  } catch (error) {
    console.error('Erreur select account:', error);
    res.status(500).json({ success: false, message: 'Erreur sélection compte' });
  }
});

/**
 * POST /api/integrations/advertising
 * Crée une nouvelle intégration publicitaire
 */
router.post('/advertising', async (req, res) => {
  try {
    const organizationId = getEffectiveOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organisation requise' });
    }

    const { platform, name, config, credentials } = req.body;

    if (!platform || !name || !config || !credentials) {
      return res.status(400).json({ 
        error: 'Plateforme, nom, configuration et identifiants requis' 
      });
    }

    if (!AD_PLATFORMS[platform]) {
      return res.status(400).json({ 
        error: 'Plateforme publicitaire non supportée' 
      });
    }

    const integration = await AdPlatformService.createIntegration(
      organizationId,
      platform,
      name,
      config,
      credentials
    );

    res.status(201).json({
      success: true,
      integration
    });
  } catch (error) {
    console.error('Erreur création intégration publicitaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/integrations/ecommerce/platforms
 * Récupère la liste des plateformes e-commerce disponibles
 */
router.get('/ecommerce/platforms', (req, res) => {
  res.json({
    success: true,
    platforms: Object.values(ECOMMERCE_PLATFORMS)
  });
});

/**
 * GET /api/integrations/ecommerce
 * Récupère toutes les intégrations e-commerce de l'organisation
 */
router.get('/ecommerce', async (req, res) => {
  try {
    const organizationId = getEffectiveOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organisation requise' });
    }

    const integrations = await EcommerceService.getIntegrations(organizationId);
    res.json({
      success: true,
      integrations
    });
  } catch (error) {
    console.error('Erreur récupération intégrations e-commerce:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/integrations/ecommerce
 * Crée une nouvelle intégration e-commerce
 */
router.post('/ecommerce', async (req, res) => {
  try {
    const organizationId = getEffectiveOrgId(req);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organisation requise' });
    }

    const { platform, name, url, config, credentials } = req.body;

    if (!platform || !name || !url || !config || !credentials) {
      return res.status(400).json({ 
        error: 'Plateforme, nom, URL, configuration et identifiants requis' 
      });
    }

    if (!ECOMMERCE_PLATFORMS[platform]) {
      return res.status(400).json({ 
        error: 'Plateforme e-commerce non supportée' 
      });
    }

    const integration = await EcommerceService.createIntegration(
      organizationId,
      platform,
      name,
      url,
      config,
      credentials
    );

    res.status(201).json({
      success: true,
      integration
    });
  } catch (error) {
    console.error('Erreur création intégration e-commerce:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

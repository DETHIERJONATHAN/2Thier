import type { OAuth2ClientOptions } from 'google-auth-library';

/**
 * Source unique de vérité pour la configuration Google OAuth / Workspace.
 * Centralise les accès aux variables d'environnement afin d'éviter les divergences
 * entre l'API, les jobs (Cloud Run) et le frontend.
 */

type EnvSource = Record<string, unknown> | undefined;

const envCache = new Map<string, string | undefined>();

const DEFAULT_PROD_API_BASE = 'https://api.2thier.com';
const DEFAULT_DEV_API_BASE = 'http://localhost:4000';

function readEnvFromImportMeta(key: string): string | undefined {
  try {
    const meta = import.meta as unknown as { env?: EnvSource };
    const candidate = meta?.env?.[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  } catch {
    // ignore – import.meta non disponible dans le contexte
  }
  return undefined;
}

function readEnv(key: string): string | undefined {
  if (envCache.has(key)) {
    return envCache.get(key);
  }

  let value: string | undefined;

  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    value = process.env[key]?.trim();
  }

  if (!value) {
    value = readEnvFromImportMeta(key);
  }

  if (value) {
    envCache.set(key, value);
  } else {
    envCache.set(key, undefined);
  }

  return value;
}

function computeRedirectUri(): string {
  const explicit = readEnv('GOOGLE_REDIRECT_URI');
  if (explicit) {
    return explicit;
  }

  const base =
    readEnv('API_URL') ||
    readEnv('BACKEND_URL') ||
    readEnv('FRONTEND_URL');

  const fallbackBase = (readEnv('NODE_ENV') || '').toLowerCase() === 'production'
    ? DEFAULT_PROD_API_BASE
    : DEFAULT_DEV_API_BASE;

  const trimmedBase = (base || fallbackBase).replace(/\/$/, '');
  return `${trimmedBase}/api/google-auth/callback`;
}

export const GOOGLE_OAUTH_SCOPES: readonly string[] = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/meetings',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/forms',
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.orgunit',
  'https://www.googleapis.com/auth/admin.directory.resource.calendar',
];

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  projectId?: string;
  oauthOptions: OAuth2ClientOptions;
}

function buildOAuthOptions(clientId: string, clientSecret: string, redirectUri: string): OAuth2ClientOptions {
  return {
    clientId: clientId || undefined,
    clientSecret: clientSecret || undefined,
    redirectUri,
  };
}

export const googleOAuthConfig: GoogleOAuthConfig = (() => {
  const clientId = readEnv('GOOGLE_CLIENT_ID') ?? '';
  const clientSecret = readEnv('GOOGLE_CLIENT_SECRET') ?? '';
  const redirectUri = computeRedirectUri();
  const projectId =
    readEnv('GOOGLE_PROJECT_ID') ||
    readEnv('GOOGLE_CLOUD_PROJECT') ||
    readEnv('GOOGLE_CLOUD_PROJECT_ID') ||
    readEnv('GOOGLE_PROJECT_NUMBER');

  return {
    clientId,
    clientSecret,
    redirectUri,
    projectId,
    oauthOptions: buildOAuthOptions(clientId, clientSecret, redirectUri),
  };
})();

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(googleOAuthConfig.clientId && googleOAuthConfig.clientSecret);
}

export function describeGoogleOAuthConfig(): Record<string, string | boolean | undefined> {
  return {
    clientId: googleOAuthConfig.clientId ? '[set]' : '[missing]',
    clientSecret: googleOAuthConfig.clientSecret ? '[set]' : '[missing]',
    redirectUri: googleOAuthConfig.redirectUri,
    projectId: googleOAuthConfig.projectId,
    scopes: GOOGLE_OAUTH_SCOPES.length,
    isConfigured: isGoogleOAuthConfigured(),
  };
}

export function resetGoogleOAuthConfigCache(): void {
  envCache.clear();
}

import type { OAuth2ClientOptions } from 'google-auth-library';

/**
 * 🔧 CONFIGURATION GOOGLE OAUTH - Source unique de vérité
 * 
 * Ce fichier centralise la configuration Google OAuth depuis les variables d'environnement.
 * 
 * ⚠️ ATTENTION - USAGE CRITIQUE :
 * 
 * ✅ UTILISER googleOAuthConfig POUR :
 *   - Services système qui n'ont pas de configuration BDD par organisation
 *   - Scripts de maintenance et d'administration
 *   - Refresh automatique des tokens (GoogleTokenRefreshScheduler)
 *   - Notifications Gmail système (GoogleGmailNotificationService)
 *   - Tout code qui s'exécute SANS contexte d'organisation
 * 
 * ❌ NE PAS UTILISER googleOAuthConfig.redirectUri POUR :
 *   - Routes d'authentification OAuth (/api/google-auth/*)
 *   - Génération d'URL d'autorisation Google
 *   - Échange de code OAuth contre tokens
 *   → UTILISER PLUTÔT config.redirectUri depuis googleWorkspaceConfig (BDD)
 * 
 * 🎯 POURQUOI ?
 *   - Chaque organisation peut avoir son propre Client ID/Secret/redirectUri
 *   - Le redirectUri DOIT correspondre EXACTEMENT à celui configuré dans Google Cloud Console
 *   - googleOAuthConfig.redirectUri est auto-détecté (peut varier selon l'environnement)
 *   - config.redirectUri (BDD) est la source de vérité pour l'OAuth par organisation
 * 
 * 📋 EXPORTS DISPONIBLES :
 *   - googleOAuthConfig: Configuration complète (clientId, clientSecret, redirectUri, etc.)
 *   - GOOGLE_OAUTH_SCOPES: Liste des permissions Google demandées
 *   - isGoogleOAuthConfigured(): Vérifie si les credentials sont présents
 *   - describeGoogleOAuthConfig(): Résumé de la config pour debug
 *   - resetGoogleOAuthConfigCache(): Réinitialiser le cache des variables d'env
 * 
 * 🔗 VOIR AUSSI :
 *   - src/routes/google-auth.ts - Utilise config.redirectUri (BDD) ✅
 *   - FIX-GOOGLE-OAUTH-UNAUTHORIZED.md - Explication du problème résolu
 */

type EnvSource = Record<string, unknown> | undefined;

const envCache = new Map<string, string | undefined>();

const DEFAULT_PROD_API_BASE = 'https://app.2thier.be';
const DEFAULT_DEV_API_BASE = 'http://localhost:4000';

function readEnvFromImportMeta(key: string): string | undefined {
  try {
    const meta = import.meta as unknown as { env?: EnvSource };
    const candidate = meta?.env?.[key];
    if (typeof candidate === 'string' && candidate.trim()) {
/**
 * 🎯 Calcule le redirectUri depuis les variables d'environnement
 * 
 * ⚠️ IMPORTANT : Cette fonction est utilisée comme FALLBACK pour les services système.
 * Pour les routes OAuth (/api/google-auth/*), utiliser config.redirectUri (BDD) à la place !
 * 
 * Ordre de priorité :
 * 1. GitHub Codespaces → https://<codespace>-5173.app.github.dev/auth/google/callback
 * 2. GOOGLE_REDIRECT_URI explicite
 * 3. Déduction depuis BACKEND_URL/FRONTEND_URL/API_URL
 * 4. Fallback : production = https://app.2thier.be, dev = http://localhost:4000
 */
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
/**
 * 🔐 SCOPES GOOGLE OAUTH - Permissions demandées lors de l'authentification
 * 
 * Cette liste définit toutes les permissions que l'application demande aux utilisateurs.
 * Ces scopes sont utilisés partout dans l'application (routes OAuth, services, etc.)
 */
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
  // 🚀 PRIORITÉ 1: Détection automatique GitHub Codespaces
  const codespaceName = readEnv('CODESPACE_NAME');
  if (codespaceName) {
    // Format: https://<codespace-name>-5173.app.github.dev/auth/google/callback (FRONTEND)
    const codespaceUrl = `https://${codespaceName}-5173.app.github.dev`;
/**
 * 📦 Interface de configuration Google OAuth
 */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string; // ⚠️ Auto-détecté - NE PAS utiliser pour les routes OAuth ! Utiliser config.redirectUri (BDD)
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

/**
 * 🌐 CONFIGURATION GLOBALE GOOGLE OAUTH
 * 
 * Chargée depuis les variables d'environnement au démarrage de l'application.
 * 
 * ⚠️ USAGE RESTREINT :
 * - ✅ Services système sans contexte d'organisation
 * - ✅ Scripts d'administration
 * - ✅ Refresh automatique de tokens
 * - ❌ Routes OAuth (utiliser googleWorkspaceConfig depuis BDD)
 */    readEnv('FRONTEND_URL');

  const fallbackBase = (readEnv('NODE_ENV') || '').toLowerCase() === 'production'
    ? DEFAULT_PROD_API_BASE
    : DEFAULT_DEV_API_BASE;

/**
 * ✅ Vérifie si les credentials Google OAuth sont configurés
 * Utile pour les checks avant d'utiliser les services Google
 */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(googleOAuthConfig.clientId && googleOAuthConfig.clientSecret);
}

/**
 * 📊 Retourne un résumé de la configuration pour debug/monitoring
 * Masque les valeurs sensibles (clientId/Secret)
 */
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

/**
 * 🔄 Réinitialise le cache des variables d'environnement
 * Utile pour forcer le rechargement de la config (tests, hot-reload)
 */  'https://www.googleapis.com/auth/calendar.events',
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

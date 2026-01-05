import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
// import { requireRole } from '../middlewares/requireRole.js';
import { db } from '../lib/database.js';
import { decrypt } from '../utils/crypto.js';
import { google } from 'googleapis';
// import axios from 'axios';
import { refreshGoogleTokenIfNeeded } from '../utils/googleTokenRefresh.js';
import { googleOAuthService, GOOGLE_SCOPES_LIST } from '../google-auth/core/GoogleOAuthCore.js';
import gmailRoutes from '../google-auth/routes/gmail'; // Routes Gmail centralisées
import { logSecurityEvent } from '../security/securityLogger.js';
// import { googleOAuthConfig } from '../auth/googleConfig.js';

/**
 * ⚠️ IMPORTANT - GESTION DU redirectUri :
 * 
 * Le redirectUri OAuth est maintenant détecté AUTOMATIQUEMENT selon l'environnement
 * via la fonction getOAuthRedirectUri(). Cela permet de supporter plusieurs environnements
 * sans modifier la configuration en BDD.
 * 
 * PRIORITÉ DE DÉTECTION :
 * 1. Codespaces → https://<codespace-name>-4000.app.github.dev/api/google-auth/callback
 * 2. Production → https://app.2thier.be/api/google-auth/callback
 * 3. Local → http://localhost:4000/api/google-auth/callback
 * 
 * ⚠️ TOUS ces URIs doivent être enregistrés dans Google Cloud Console !
 * 
 * La config BDD (googleWorkspaceConfig) est toujours utilisée pour :
 * - clientId et clientSecret (propres à chaque organisation)
 * - adminEmail (email de l'admin Google Workspace)
 */

const router = Router();

const GOOGLE_SCOPES = GOOGLE_SCOPES_LIST.join(' ');

/**
 * 🚀 Helper pour obtenir la FRONTEND_URL correcte selon l'environnement
 * Détecte automatiquement GitHub Codespaces et construit l'URL appropriée
 * 
 * Ordre de priorité:
 * 1. Codespaces → https://<codespace-name>-5173.app.github.dev
 * 2. FRONTEND_URL explicite (production: https://app.2thier.be)
 * 3. Production sans FRONTEND_URL → https://app.2thier.be
 * 4. Local → http://localhost:5173
 */
function getFrontendUrl(): string {
  // PRIORITÉ 1: Détection automatique GitHub Codespaces
  const codespaceName = process.env.CODESPACE_NAME;
  if (codespaceName) {
    // Format Codespaces: https://<codespace-name>-5173.app.github.dev (sans port explicite)
    const codespaceUrl = `https://${codespaceName}-5173.app.github.dev`;
    console.log('[GOOGLE-AUTH] 🚀 Codespaces détecté, FRONTEND_URL:', codespaceUrl);
    return codespaceUrl;
  }
  
  // PRIORITÉ 2: Variable d'environnement explicite
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    console.log('[GOOGLE-AUTH] 📌 FRONTEND_URL explicite:', frontendUrl);
    return frontendUrl;
  }
  
  // PRIORITÉ 3: Production → https://app.2thier.be
  if (process.env.NODE_ENV === 'production') {
    console.log('[GOOGLE-AUTH] 🌐 Production détectée, FRONTEND_URL: https://app.2thier.be');
    return 'https://app.2thier.be';
  }
  
  // PRIORITÉ 4: Fallback local
  console.log('[GOOGLE-AUTH] 🏠 Local détecté, FRONTEND_URL: http://localhost:5173');
  return 'http://localhost:5173';
}

/**
 * 🔗 Helper pour obtenir le redirectUri OAuth correct selon l'environnement
 * CRITIQUE: Ce redirectUri DOIT correspondre EXACTEMENT à celui configuré dans Google Cloud Console
 * 
 * Ordre de priorité:
 * 1. Codespaces → https://<codespace-name>-4000.app.github.dev/api/google-auth/callback (backend direct)
 * 2. Production → https://app.2thier.be/api/google-auth/callback
 * 3. Local → http://localhost:4000/api/google-auth/callback
 * 
 * ⚠️ IMPORTANT: Tous ces URIs doivent être enregistrés dans Google Cloud Console !
 */
function getOAuthRedirectUri(hostHeader?: string): string {
  // Déterminer le host
  const host = hostHeader || 'localhost:4000';
  
  console.log('[GOOGLE-AUTH] 📍 Détection environnement - Host reçu:', host);
  
  // CAS 1: Codespaces (hostname contient app.github.dev)
  if (host.includes('app.github.dev')) {
    // Extraire le nom du Codespaces et reconstruire l'URI avec le port 4000
    // De "cautious-space-guide-7q4w46vpr6gfwqqg-5173.app.github.dev" 
    // À "cautious-space-guide-7q4w46vpr6gfwqqg-4000.app.github.dev"
    const hostWithoutPort = host.split(':')[0]; // Enlever le port si présent: cautious-space-guide-7q4w46vpr6gfwqqg-5173.app.github.dev
    
    // Extraire le nom du codespace en supprimant le port (qui est à la fin avant .app.github.dev)
    // "cautious-space-guide-7q4w46vpr6gfwqqg-5173.app.github.dev" -> "cautious-space-guide-7q4w46vpr6gfwqqg"
    const match = hostWithoutPort.match(/^(.+?)-\d+\.app\.github\.dev$/);
    const codespaceName = match ? match[1] : hostWithoutPort.replace('.app.github.dev', '');
    
    const redirectUri = `https://${codespaceName}-4000.app.github.dev/api/google-auth/callback`;
    
    console.log('[GOOGLE-AUTH] 🚀 Codespaces détecté:', {
      originalHost: host,
      hostWithoutPort,
      codespaceName,
      redirectUri
    });
    return redirectUri;
  }
  
  // CAS 2: Production (app.2thier.be)
  if (host.includes('app.2thier.be') || host.includes('2thier.be')) {
    const redirectUri = 'https://app.2thier.be/api/google-auth/callback';
    console.log('[GOOGLE-AUTH] 🌐 Production détectée:', { host, redirectUri });
    return redirectUri;
  }
  
  // CAS 3: Local (localhost ou 127.0.0.1)
  const redirectUri = 'http://localhost:4000/api/google-auth/callback';
  console.log('[GOOGLE-AUTH] 🏠 Local détecté:', { host, redirectUri });
  return redirectUri;
}

type OAuthState = {
  organizationId?: string;
  userId?: string;
  platform?: string;
  redirectUri?: string;
};

function encodeOAuthState(stateObj: OAuthState): string {
  // base64url(JSON) pour éviter les soucis d'encodage et garantir une lecture robuste côté callback
  return Buffer.from(JSON.stringify(stateObj), 'utf8').toString('base64url');
}

function parseOAuthState(raw: string): OAuthState {
  // Le state peut être JSON direct ou base64url(JSON)
  try {
    return JSON.parse(raw) as OAuthState;
  } catch {
    const decoded = Buffer.from(String(raw), 'base64url').toString('utf8');
    return JSON.parse(decoded) as OAuthState;
  }
}

// Fonction utilitaire pour récupérer la configuration Google Workspace
async function getGoogleWorkspaceConfig(organizationId: string) {
  try {
    console.log('[GOOGLE-AUTH] 📋 Recherche config pour organisation:', organizationId);
    
    const config = await db.googleWorkspaceConfig.findUnique({
      where: { organizationId }
    });

    console.log('[GOOGLE-AUTH] 📊 Config brute depuis BDD:', config ? 'Trouvée' : 'Non trouvée');
    if (config) {
      console.log('[GOOGLE-AUTH] 🔑 clientId crypté:', config.clientId ? 'Présent' : 'Manquant');
      console.log('[GOOGLE-AUTH] 🔐 clientSecret crypté:', config.clientSecret ? 'Présent' : 'Manquant');
      console.log('[GOOGLE-AUTH] 🔗 redirectUri:', config.redirectUri);
    }

    if (!config) {
      console.log('[GOOGLE-AUTH] ❌ Aucune configuration trouvée');
      return null;
    }

    const decryptedConfig = {
      clientId: config.clientId ? decrypt(config.clientId) : null,
      clientSecret: config.clientSecret ? decrypt(config.clientSecret) : null,
      redirectUri: config.redirectUri,
      adminEmail: config.adminEmail, // Ajout de l'email admin
      isConfigured: !!config.clientId && !!config.clientSecret && !!config.redirectUri
    };

    console.log('[GOOGLE-AUTH] 🔓 Config décryptée:');
    console.log('[GOOGLE-AUTH] 🆔 clientId décrypté:', decryptedConfig.clientId ? 'OK' : 'ERREUR');
    console.log('[GOOGLE-AUTH] 🔐 clientSecret décrypté:', decryptedConfig.clientSecret ? 'OK' : 'ERREUR');
    console.log('[GOOGLE-AUTH] 🔗 redirectUri final:', decryptedConfig.redirectUri);
    console.log('[GOOGLE-AUTH] 📧 adminEmail:', decryptedConfig.adminEmail);
    console.log('[GOOGLE-AUTH] ✅ isConfigured:', decryptedConfig.isConfigured);

    return decryptedConfig;
  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur récupération config:', error);
    return null;
  }
}

// Fonction pour activer automatiquement les modules Google Workspace
async function activateGoogleModules(organizationId: string, grantedScopes: string) {
  try {
    console.log('[GOOGLE-AUTH] 🔧 Début activation modules pour org:', organizationId);
    console.log('[GOOGLE-AUTH] 🔐 Scopes accordés:', grantedScopes);

    const scopesArray = grantedScopes.split(' ');
    
    // Mapping des scopes vers les modules
    const moduleMapping = [
      {
        name: 'Gmail',
        scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify'],
        configField: 'gmailEnabled'
      },
      {
        name: 'Calendar',
        scopes: ['https://www.googleapis.com/auth/calendar'],
        configField: 'calendarEnabled'
      },
      {
        name: 'Drive',
        scopes: ['https://www.googleapis.com/auth/drive'],
        configField: 'driveEnabled'
      },
      {
        name: 'Docs',
        scopes: ['https://www.googleapis.com/auth/documents'],
        configField: 'docsEnabled'
      },
      {
        name: 'Sheets',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        configField: 'sheetsEnabled'
      },
      {
        name: 'Meet',
        scopes: ['https://www.googleapis.com/auth/meetings'],
        configField: 'meetEnabled'
      }
    ];

    const modulesToActivate = [];
    const configUpdates: Record<string, boolean> = {};

    // Vérifier quels modules peuvent être activés
    for (const module of moduleMapping) {
      const hasRequiredScopes = module.scopes.some(scope => scopesArray.includes(scope));
      if (hasRequiredScopes) {
        modulesToActivate.push(module.name);
        configUpdates[module.configField] = true;
        console.log('[GOOGLE-AUTH] ✅ Module activable:', module.name);
      } else {
        console.log('[GOOGLE-AUTH] ❌ Module non activable (scopes manquants):', module.name);
      }
    }

    // Mettre à jour la configuration Google Workspace
    if (Object.keys(configUpdates).length > 0) {
      console.log('[GOOGLE-AUTH] 💾 Mise à jour config avec modules:', configUpdates);
      await db.googleWorkspaceConfig.update({
        where: { organizationId },
        data: {
          ...configUpdates,
          enabled: true,
          isActive: true,
          updatedAt: new Date()
        }
      });
    }

    // Activer les modules correspondants dans la table modules
    console.log('[GOOGLE-AUTH] 🔧 Activation des modules CRM...');
    for (const moduleName of modulesToActivate) {
      try {
        // Trouver le module par nom
        const module = await db.module.findFirst({
          where: {
            label: {
              contains: moduleName,
              mode: 'insensitive'
            }
          }
        });

        if (module) {
          // Activer le module pour l'organisation
          await db.organizationModule.upsert({
            where: {
              organizationId_moduleId: {
                organizationId,
                moduleId: module.id
              }
            },
            update: {
              isActive: true,
              activatedAt: new Date(),
              updatedAt: new Date()
            },
            create: {
              organizationId,
              moduleId: module.id,
              isActive: true,
              activatedAt: new Date()
            }
          });

          console.log('[GOOGLE-AUTH] ✅ Module CRM activé:', moduleName, '(', module.id, ')');
        } else {
          console.log('[GOOGLE-AUTH] ⚠️ Module CRM non trouvé:', moduleName);
        }
      } catch (moduleError) {
        console.error('[GOOGLE-AUTH] ❌ Erreur activation module', moduleName, ':', moduleError);
      }
    }

    console.log('[GOOGLE-AUTH] ✅ Activation des modules terminée. Modules activés:', modulesToActivate);
    return modulesToActivate;

  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur activation modules:', error);
    return [];
  }
}

// GET /api/google-auth/debug - DEBUG: Voir exactement quelle URI est générée
router.get('/debug', (req, res) => {
  const hostHeader = req.headers.host || 'localhost:4000';
  const redirectUri = getOAuthRedirectUri(hostHeader);
  
  res.json({
    debug: {
      host_header: hostHeader,
      generated_redirect_uri: redirectUri,
      environment: hostHeader.includes('app.github.dev') ? 'Codespaces' : 
                   hostHeader.includes('2thier.be') ? 'Production' : 'Local'
    }
  });
});

// GET /api/google-auth/redirect-uri - Récupérer l'URI de redirection pour l'environnement actuel
router.get('/redirect-uri', (req, res) => {
  const hostHeader = req.headers.host || 'localhost:4000';
  const redirectUri = getOAuthRedirectUri(hostHeader);
  
  res.json({
    redirectUri,
    environment: hostHeader.includes('app.github.dev') ? 'Codespaces' : 
                 hostHeader.includes('2thier.be') ? 'Production' : 'Local'
  });
});

// GET /api/google-auth/url - Générer l'URL d'authentification Google
router.get('/url', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID requis'
      });
    }

    // Récupérer la configuration Google Workspace pour cette organisation
    const config = await getGoogleWorkspaceConfig(organizationId);
    
    if (!config || !config.isConfigured) {
      return res.status(400).json({
        success: false,
        message: 'Google Workspace non configuré pour cette organisation'
      });
    }

    // Générer l'URL d'authentification Google avec auto-détection de l'environnement
    const stateObj: OAuthState = {
      userId: req.user?.userId || undefined,
      organizationId
    };
    // DYNAMIQUE: Utiliser getOAuthRedirectUri() avec le Host header pour détecter l'environnement automatiquement
    const hostHeader1 = req.headers.host || 'localhost:4000';
    const actualRedirectUri = getOAuthRedirectUri(hostHeader1);
    console.log('[GOOGLE-AUTH] 🎯 Redirect URI (auto-détecté):', actualRedirectUri);

    // 🔒 Verrouiller le redirectUri dans le state pour garantir qu'il sera IDENTIQUE lors de l'échange de tokens
    stateObj.redirectUri = actualRedirectUri;
    const stateParam = encodeOAuthState(stateObj);
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(actualRedirectUri)}&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `include_granted_scopes=true&` +
      `enable_granular_consent=true&` +
      `state=${encodeURIComponent(stateParam)}`;

    res.json({
      success: true,
      data: {
        authUrl,
        scopes: GOOGLE_SCOPES.split(' '),
        clientConfigured: true
      }
    });

  } catch (error) {
    console.error('[GOOGLE-AUTH] Erreur génération URL:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération de l\'URL d\'authentification'
    });
  }
});

// GET /api/auth/google/connect - Alias pour /url (compatibilité UI)
router.get('/connect', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // Récupérer l'organizationId depuis l'utilisateur connecté
    const organizationId = req.query.organizationId as string || req.user?.organizationId?.toString();
    const forceConsent = req.query.force_consent === 'true'; // Nouveau paramètre pour forcer le consentement
    
    console.log('[GOOGLE-AUTH] 🔍 OrganizationId extrait:', organizationId);
    console.log('[GOOGLE-AUTH] 🔄 Force consent:', forceConsent);
    console.log('[GOOGLE-AUTH] 👤 User info:', req.user ? 'Présent' : 'Absent');
    console.log('[GOOGLE-AUTH] 🏢 User organizationId:', req.user?.organizationId);
    
    if (!organizationId) {
      console.log('[GOOGLE-AUTH] ❌ Aucun organizationId trouvé (query ou user)');
      return res.status(400).json({
        success: false,
        message: 'Organization ID requis (non trouvé dans query ou profil utilisateur)'
      });
    }

    // Si force_consent, supprimer l'ancien token pour forcer un nouveau consentement
    if (forceConsent && req.user?.userId) {
      console.log('[GOOGLE-AUTH] 🗑️ Suppression de l\'ancien token pour forcer le consentement...');
      try {
        await db.googleToken.deleteMany({
          where: {
            userId: req.user.userId,
            organizationId: organizationId
          }
        });
        console.log('[GOOGLE-AUTH] ✅ Ancien token supprimé');
      } catch (deleteError) {
        console.warn('[GOOGLE-AUTH] ⚠️ Erreur suppression ancien token:', deleteError);
        // Continue anyway
      }
    }

    // Récupérer la configuration Google Workspace pour cette organisation
    const config = await getGoogleWorkspaceConfig(organizationId);
    
    console.log('[GOOGLE-AUTH] 🔍 Configuration récupérée pour org:', organizationId);
    console.log('[GOOGLE-AUTH] 🔧 Config complète:', JSON.stringify(config, null, 2));
    
    if (!config || !config.isConfigured) {
      console.log('[GOOGLE-AUTH] ❌ Configuration manquante ou incomplète');
      return res.status(400).json({
        success: false,
        message: 'Google Workspace non configuré pour cette organisation'
      });
    }

    console.log('[GOOGLE-AUTH] ✅ Configuration valide détectée');
    console.log('[GOOGLE-AUTH] 🆔 ClientId:', config.clientId);
    console.log('[GOOGLE-AUTH] 🏢 Domain:', config.domain);

    // DYNAMIQUE: Utiliser getOAuthRedirectUri() avec le Host header pour détecter l'environnement automatiquement
    const hostHeader = req.headers.host || 'localhost:4000';
    const actualRedirectUri = getOAuthRedirectUri(hostHeader);
    console.log('[GOOGLE-AUTH] 🎯 Redirect URI (auto-détecté):', actualRedirectUri);

    // 🔒 Verrouiller le redirectUri dans le state (évite redirect_uri_mismatch entre /connect et /callback)
    const stateParam = encodeOAuthState({
      userId: req.user?.userId || undefined,
      organizationId,
      redirectUri: actualRedirectUri
    });
    
    // Toujours forcer le consentement pour obtenir le refresh_token
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(actualRedirectUri)}&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +  // ✅ Toujours forcer le consentement pour obtenir refresh_token
      `include_granted_scopes=true&` +
      `enable_granular_consent=true&` +
      `state=${encodeURIComponent(stateParam)}`;

    console.log('[GOOGLE-AUTH] 🌐 URL générée:', authUrl);

    res.json({
      success: true,
      data: {
        authUrl,
        scopes: GOOGLE_SCOPES.split(' '),
        clientConfigured: true,
        forceConsent: true // Indique qu'on force le consentement
      }
    });

  } catch (error) {
    console.error('[GOOGLE-AUTH] Erreur génération URL connect:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération de l\'URL d\'authentification'
    });
  }
});

// GET /api/google-auth/callback - Callback OAuth Google
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    console.log('[GOOGLE-AUTH] 🔄 Callback OAuth reçu');
    console.log('[GOOGLE-AUTH] 📋 State (organizationId):', state);
    console.log('[GOOGLE-AUTH] 🔑 Code présent:', !!code);
    console.log('[GOOGLE-AUTH] ❌ Erreur présente:', !!error);

    if (error) {
      console.log('[GOOGLE-AUTH] ❌ Erreur OAuth:', error);
      return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_error=${error}`);
    }

    if (!code || !state) {
      console.log('[GOOGLE-AUTH] ❌ Paramètres manquants - Code:', !!code, 'State:', !!state);
      return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_error=missing_params`);
    }

    let organizationId: string;
    let userId: string;
    let platform: string | undefined;
    let redirectUriFromState: string | undefined;

    try {
      const parsedState = parseOAuthState(state as string);
      organizationId = parsedState.organizationId;
      userId = parsedState.userId;
      platform = parsedState.platform;
      redirectUriFromState = parsedState.redirectUri;
      
      if (!organizationId || !userId) {
        throw new Error('State object is missing organizationId or userId');
      }
      
      // Si c'est un callback pour les intégrations publicitaires, rediriger
      if (platform && (platform === 'google_ads' || platform === 'meta_ads')) {
        console.log('[GOOGLE-AUTH] 🔄 Redirection vers gestionnaire intégrations publicitaires:', platform);
        const callbackPath = `/api/integrations/advertising/oauth/${platform}/callback`;
        const redirectUrl = `${callbackPath}?${new URLSearchParams(req.query as Record<string, string>).toString()}`;
        return res.redirect(redirectUrl);
      }
      
    } catch {
      console.error('[GOOGLE-AUTH] ❌ State invalide, non-JSON ou champs manquants:', state);
      return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_error=invalid_state`);
    }

    console.log('[GOOGLE-AUTH] 🏢 Organisation cible:', organizationId, 'pour utilisateur:', userId);
    
    // Récupérer la configuration Google Workspace pour cette organisation
    const config = await getGoogleWorkspaceConfig(organizationId);
    
    if (!config || !config.isConfigured || !config.adminEmail) {
      console.log('[GOOGLE-AUTH] ❌ Configuration manquante ou email admin non défini pour org:', organizationId);
      return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_error=config_incomplete`);
    }

    console.log('[GOOGLE-AUTH] ✅ Configuration trouvée, email admin cible:', config.adminEmail);
    console.log('[GOOGLE-AUTH] 🔄 Échange du code contre les tokens...');

    // DYNAMIQUE: Utiliser getOAuthRedirectUri() avec le Host header pour détecter l'environnement automatiquement
    // L'URI DOIT être identique à celle utilisée lors de l'initiation OAuth
    const hostHeader2 = req.headers.host || 'localhost:4000';
    const actualRedirectUri = (redirectUriFromState && typeof redirectUriFromState === 'string')
      ? redirectUriFromState
      : getOAuthRedirectUri(hostHeader2);
    console.log('[GOOGLE-AUTH] 🎯 Callback - Redirect URI pour échange de tokens:', {
      hostHeader: hostHeader2,
      redirectUri: actualRedirectUri,
      environment: hostHeader2.includes('app.github.dev') ? 'Codespaces' : 
                   hostHeader2.includes('2thier.be') ? 'Production' : 'Local'
    });

    // Créer le client OAuth2 Google
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      actualRedirectUri
    );

    try {
      // Échanger le code d'autorisation contre les tokens
      console.log('[GOOGLE-AUTH] 🔑 Tentative d\'échange de code avec Google:', {
        clientId: config.clientId.substring(0, 20) + '...',
        redirectUri: actualRedirectUri,
        code: (code as string).substring(0, 20) + '...'
      });
      
      const { tokens } = await oauth2Client.getToken(code as string);
      console.log('[GOOGLE-AUTH] ✅ Tokens reçus:', {
        accessToken: !!tokens.access_token,
        refreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope
      });

      // Configurer le client avec les tokens pour récupérer les infos utilisateur
      oauth2Client.setCredentials(tokens);
      
      // Récupérer les informations de l'utilisateur Google
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      console.log('[GOOGLE-AUTH] ✅ Informations du compte Google connecté:', {
        email: userInfo.data.email,
        name: userInfo.data.name,
      });

      // VÉRIFICATION CRUCIALE : L'email du compte Google connecté doit correspondre à l'adminEmail de la config
      if (userInfo.data.email?.toLowerCase() !== config.adminEmail.toLowerCase()) {
        console.log(`[GOOGLE-AUTH] ❌ ERREUR DE COMPTE : L'utilisateur s'est connecté avec ${userInfo.data.email}, mais la configuration attendait ${config.adminEmail}.`);
        return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_error=account_mismatch&expected=${encodeURIComponent(config.adminEmail)}&connected_as=${encodeURIComponent(userInfo.data.email || '')}`);
      }

      console.log('[GOOGLE-AUTH] ✅ Connexion Google validée pour l\'admin:', config.adminEmail);

      // Sauvegarder ou mettre à jour les tokens pour l'utilisateur dans cette organisation
      console.log('[GOOGLE-AUTH] 💾 Sauvegarde des tokens pour l\'utilisateur:', userId, 'dans l\'organisation:', organizationId);
      await googleOAuthService.saveUserTokens(userId, organizationId, tokens, userInfo.data.email || undefined);
      const googleTokenRecord = await db.googleToken.findFirst({ 
        where: { userId, organizationId } 
      });

      console.log('[GOOGLE-AUTH] ✅ Tokens sauvegardés pour l\'utilisateur:', googleTokenRecord?.id);

      // Activer automatiquement les modules Google Workspace pour cette organisation
      console.log('[GOOGLE-AUTH] 🔧 Activation des modules Google Workspace...');
      await activateGoogleModules(organizationId, tokens.scope || '');

      console.log('[GOOGLE-AUTH] 🎉 Authentification Google complète avec succès !');
      
      // Redirection vers notre page de callback spécialisée
      return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_success=1&organizationId=${organizationId}&admin_email=${encodeURIComponent(config.adminEmail)}`);

    } catch (tokenError: unknown) {
      const error = tokenError as { response?: { status?: number; data?: { error?: string } }; message?: string; config?: { url?: string } };
      console.error('[GOOGLE-AUTH] ❌ Erreur lors de l\'échange des tokens:', error);
      console.error('[GOOGLE-AUTH] 📊 Détails erreur:');
      console.error('[GOOGLE-AUTH] 🆔 Status:', error.response?.status);
      console.error('[GOOGLE-AUTH] 📝 Message:', error.message);
      console.error('[GOOGLE-AUTH] 📋 Data:', error.response?.data);
      console.error('[GOOGLE-AUTH] 🔗 URL appelée:', error.config?.url);
      
      let errorType = 'token_exchange_failed';
      if (error.response?.status === 400) {
        if (error.response?.data?.error === 'invalid_client') {
          errorType = 'invalid_client_config';
        } else if (error.response?.data?.error === 'invalid_grant') {
          errorType = 'invalid_authorization_code';
        }
      } else if (error.response?.status === 401) {
        errorType = 'unauthorized_client';
      }
      
      return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_error=${errorType}&details=${encodeURIComponent(error.message || 'Erreur inconnue')}`);
    }

  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur callback générale:', error);
    return res.redirect(`${getFrontendUrl()}/google-auth-callback?google_error=callback_error`);
  }
});

// GET /api/google-auth/status - Statut de la connexion Google  
router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[GOOGLE-AUTH] 📊 Vérification statut connexion pour user:', req.user?.userId);
    
    if (!req.user?.userId) {
      return res.json({
        success: true,
        data: {
          connected: false,
          email: null,
          scopes: [],
          lastSync: null,
          error: 'Utilisateur non authentifié'
        }
      });
    }

    // Récupérer l'organizationId depuis le query parameter
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.json({
        success: true,
        data: {
          connected: false,
          email: null,
          scopes: [],
          lastSync: null,
          error: 'Organization ID requis'
        }
      });
    }

    const userId = req.user?.userId;
    console.log('[GOOGLE-AUTH] 🔄 Tentative de refresh automatique pour organisation:', organizationId, 'userId:', userId);

    // 🆕 NOUVEAU: Utiliser le système de refresh automatique avec userId
    const refreshResult = await refreshGoogleTokenIfNeeded(organizationId, userId);
    
    if (!refreshResult.success) {
      console.log('[GOOGLE-AUTH] ❌ Refresh automatique échoué:', refreshResult.error);
      
      // Gérer les différents types d'erreurs
      if (refreshResult.error === 'no_token_found') {
        return res.json({
          success: true,
          data: {
            connected: false,
            email: null,
            scopes: [],
            lastSync: null,
            error: 'Aucun token Google trouvé'
          }
        });
      } else if (refreshResult.error === 'no_refresh_token') {
        return res.json({
          success: true,
          data: {
            connected: false,
            email: null,
            scopes: [],
            lastSync: null,
            error: 'Token expiré, reconnexion requise'
          }
        });
      } else if (refreshResult.error === 'invalid_refresh_token') {
        return res.json({
          success: true,
          data: {
            connected: false,
            email: null,
            scopes: [],
            lastSync: null,
            error: 'Token révoqué, reconnexion requise'
          }
        });
      } else {
        return res.json({
          success: true,
          data: {
            connected: false,
            email: null,
            scopes: [],
            lastSync: null,
            error: 'Erreur de connexion Google'
          }
        });
      }
    }

    console.log('[GOOGLE-AUTH] ✅ Token valide ou rafraîchi avec succès');

    // Récupérer les informations utilisateur avec le token valide
    let userEmail = null;
    let tokenValid = false;
    let scopes: string[] = [];

    try {
      // Créer le client OAuth avec le token valide
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: refreshResult.accessToken,
        refresh_token: refreshResult.refreshToken,
        expiry_date: refreshResult.expiresAt?.getTime()
      });

      // Tester le token en récupérant les infos utilisateur
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      userEmail = userInfo.data.email;
      tokenValid = true;
      
      // Récupérer les scopes depuis la base de données
      let googleToken;
      if (userId) {
        googleToken = await db.googleToken.findUnique({
          where: { userId_organizationId: { userId, organizationId } }
        });
      } else {
        googleToken = await db.googleToken.findFirst({
          where: { organizationId }
        });
      }
      scopes = googleToken?.scope ? googleToken.scope.split(' ') : [];
      
      console.log('[GOOGLE-AUTH] ✅ Token validé avec succès, email:', userEmail);

    } catch (tokenError) {
      console.log('[GOOGLE-AUTH] ❌ Erreur validation token final:', tokenError);
      tokenValid = false;
    }

    // Récupérer les informations de dernière synchronisation
    let googleTokenInfo;
    if (userId) {
      googleTokenInfo = await db.googleToken.findUnique({
        where: { userId_organizationId: { userId, organizationId } }
      });
    } else {
      googleTokenInfo = await db.googleToken.findFirst({
        where: { organizationId }
      });
    }

    res.json({
      success: true,
      data: {
        connected: tokenValid,
        isValid: tokenValid, // ✅ Ajout explicite pour vérification côté client
        email: userEmail,
        scopes: scopes,
        lastSync: googleTokenInfo?.updatedAt,
        expiresAt: refreshResult.expiresAt,
        isExpired: false, // Le token est maintenant garanti valide
        autoRefreshEnabled: true // Indicateur que le refresh automatique est actif
      }
    });

  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut'
    });
  }
});

// POST /api/google-auth/disconnect - Déconnecter Google
router.post('/disconnect', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[GOOGLE-AUTH] 🔄 Début déconnexion pour user:', req.user?.userId);
    
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    // Récupérer l'organizationId depuis le body
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID requis'
      });
    }

    // Journalisation de l'intention de déconnexion (traçabilité)
    try {
      logSecurityEvent('GOOGLE_DISCONNECT_REQUESTED', {
        userId: req.user.userId,
        organizationId,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null
      }, 'info');
    } catch (e) {
      console.warn('[GOOGLE-AUTH] Warn: échec logSecurityEvent (REQUESTED):', (e as Error)?.message);
    }

    const currentUserId = req.user.userId;
    
    // Chercher les tokens Google de l'utilisateur dans cette organisation
    let googleToken;
    if (currentUserId) {
      googleToken = await db.googleToken.findUnique({
        where: { userId_organizationId: { userId: currentUserId, organizationId } }
      });
    } else {
      googleToken = await db.googleToken.findFirst({
        where: { organizationId }
      });
    }

    if (googleToken) {
      try {
        // Révoquer le token côté Google
        console.log('[GOOGLE-AUTH] 🚫 Révocation du token côté Google...');
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: googleToken.accessToken
        });

        await oauth2Client.revokeCredentials();
        console.log('[GOOGLE-AUTH] ✅ Token révoqué côté Google');

      } catch (revokeError) {
        console.log('[GOOGLE-AUTH] ⚠️ Erreur révocation côté Google (peut-être déjà révoqué):', revokeError);
      }

      // Supprimer le token de notre base de données
      console.log('[GOOGLE-AUTH] 🗑️ Suppression du token de la base...');
      if (currentUserId) {
        await db.googleToken.delete({
          where: { userId_organizationId: { userId: currentUserId, organizationId } }
        });
      } else if (googleToken.id) {
        await db.googleToken.delete({
          where: { id: googleToken.id }
        });
      }

      console.log('[GOOGLE-AUTH] ✅ Token supprimé de la base');
    }

    // Désactiver les modules Google Workspace pour l'organisation
    console.log('[GOOGLE-AUTH] 🔧 Désactivation des modules Google...');
    await db.googleWorkspaceConfig.update({
      where: { organizationId: organizationId },
      data: {
        enabled: false,
        gmailEnabled: false,
        calendarEnabled: false,
        driveEnabled: false,
        docsEnabled: false,
        sheetsEnabled: false,
        meetEnabled: false,
        voiceEnabled: false,
        updatedAt: new Date()
      }
    });

    // Désactiver aussi les modules dans la table organizationModule
    const googleModules = await db.module.findMany({
      where: {
        name: {
          in: ['Gmail', 'Calendar', 'Drive', 'Docs', 'Sheets', 'Meet'],
          mode: 'insensitive'
        }
      }
    });

    for (const module of googleModules) {
      await db.organizationModule.updateMany({
        where: {
          organizationId: organizationId,
          moduleId: module.id
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    }

    console.log('[GOOGLE-AUTH] ✅ Modules Google désactivés');

    console.log('[GOOGLE-AUTH] 🎉 Déconnexion Google complète');
    try {
      logSecurityEvent('GOOGLE_DISCONNECT_COMPLETED', {
        userId: req.user.userId,
        organizationId,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null
      }, 'info');
    } catch (e) {
      console.warn('[GOOGLE-AUTH] Warn: échec logSecurityEvent (COMPLETED):', (e as Error)?.message);
    }
    
    res.json({
      success: true,
      message: 'Déconnecté de Google Workspace avec succès'
    });

  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur déconnexion:', error);
    try {
      const orgIdFromBody = (req.body && typeof (req.body as Record<string, unknown>).organizationId === 'string')
        ? (req.body as Record<string, string>).organizationId
        : null;
      const errMsg = (error instanceof Error) ? error.message : String(error);
      logSecurityEvent('GOOGLE_DISCONNECT_ERROR', {
        userId: req.user?.userId || null,
        organizationId: orgIdFromBody,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null,
        error: errMsg
      }, 'error');
    } catch (e) {
      console.warn('[GOOGLE-AUTH] Warn: échec logSecurityEvent (ERROR):', (e as Error)?.message);
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
});

// POST /api/google-auth/toggle-module - Activer/désactiver un module Google spécifique
router.post('/toggle-module', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // Récupérer l'organizationId depuis le body
    const { moduleName, enabled, organizationId } = req.body;
    
    console.log('[GOOGLE-AUTH] 🔧 Toggle module:', moduleName, 'enabled:', enabled, 'pour organization:', organizationId);
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID requis'
      });
    }

    if (!moduleName || typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides (moduleName et enabled requis)'
      });
    }

    // Vérifier que l'utilisateur a des tokens Google valides pour cette organisation
    const userId = req.user?.userId;
    let googleToken;
    if (userId) {
      googleToken = await db.googleToken.findUnique({
        where: { userId_organizationId: { userId, organizationId } }
      });
    } else {
      googleToken = await db.googleToken.findFirst({
        where: { organizationId }
      });
    }

    if (!googleToken && enabled) {
      return res.status(400).json({
        success: false,
        message: 'Connexion Google requise pour activer les modules'
      });
    }

    // Mapping des noms de modules vers les champs de configuration
    const moduleConfigMap: Record<string, string> = {
      'Gmail': 'gmailEnabled',
      'Calendar': 'calendarEnabled',
      'Drive': 'driveEnabled',
      'Docs': 'docsEnabled',
      'Sheets': 'sheetsEnabled',
      'Meet': 'meetEnabled',
      'Voice': 'voiceEnabled'
    };

    const configField = moduleConfigMap[moduleName];
    if (!configField) {
      return res.status(400).json({
        success: false,
        message: 'Module non reconnu'
      });
    }

    // Mettre à jour la configuration Google Workspace
    const updateData: Record<string, boolean | Date> = {
      [configField]: enabled,
      updatedAt: new Date()
    };

    await db.googleWorkspaceConfig.update({
      where: { organizationId: organizationId },
      data: updateData
    });

    // Mettre à jour aussi le module dans la table organizationModule
    const module = await db.module.findFirst({
      where: {
        name: {
          contains: moduleName,
          mode: 'insensitive'
        }
      }
    });

    if (module) {
      await db.organizationModule.upsert({
        where: {
          organizationId_moduleId: {
            organizationId: organizationId,
            moduleId: module.id
          }
        },
        update: {
          isActive: enabled,
          activatedAt: enabled ? new Date() : null,
          updatedAt: new Date()
        },
        create: {
          organizationId: organizationId,
          moduleId: module.id,
          isActive: enabled,
          activatedAt: enabled ? new Date() : null
        }
      });
    }

    console.log('[GOOGLE-AUTH] ✅ Module', moduleName, enabled ? 'activé' : 'désactivé');

    res.json({
      success: true,
      message: `Module ${moduleName} ${enabled ? 'activé' : 'désactivé'} avec succès`,
      data: {
        moduleName,
        enabled
      }
    });

  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur toggle module:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du module'
    });
  }
});

// Routes Gmail centralisées (avec authentification middleware)
router.use('/gmail', authMiddleware, gmailRoutes);
console.log('[GOOGLE-AUTH] Routes Gmail centralisées montées sur /gmail');

export default router;

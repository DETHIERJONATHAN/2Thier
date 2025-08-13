import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { prisma } from '../lib/prisma.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { google } from 'googleapis';
import axios from 'axios';
import { refreshGoogleTokenIfNeeded } from '../utils/googleTokenRefresh.js';
import { googleOAuthService, GOOGLE_SCOPES_LIST } from '../google-auth/core/GoogleOAuthCore.js';
import gmailRoutes from '../google-auth/routes/gmail'; // Routes Gmail centralisées

const router = Router();

const GOOGLE_SCOPES = GOOGLE_SCOPES_LIST.join(' ');

// Fonction utilitaire pour récupérer la configuration Google Workspace
async function getGoogleWorkspaceConfig(organizationId: string) {
  try {
    console.log('[GOOGLE-AUTH] 📋 Recherche config pour organisation:', organizationId);
    
    const config = await prisma.googleWorkspaceConfig.findUnique({
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
      await prisma.googleWorkspaceConfig.update({
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
        const module = await prisma.module.findFirst({
          where: {
            name: {
              contains: moduleName,
              mode: 'insensitive'
            }
          }
        });

        if (module) {
          // Activer le module pour l'organisation
          await prisma.organizationModule.upsert({
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

    // Générer l'URL d'authentification Google avec la configuration de la BDD
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${organizationId}`;

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
    
    console.log('[GOOGLE-AUTH] 🔍 OrganizationId extrait:', organizationId);
    console.log('[GOOGLE-AUTH] 👤 User info:', req.user ? 'Présent' : 'Absent');
    console.log('[GOOGLE-AUTH] 🏢 User organizationId:', req.user?.organizationId);
    
    if (!organizationId) {
      console.log('[GOOGLE-AUTH] ❌ Aucun organizationId trouvé (query ou user)');
      return res.status(400).json({
        success: false,
        message: 'Organization ID requis (non trouvé dans query ou profil utilisateur)'
      });
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
    console.log('[GOOGLE-AUTH] 🔗 RedirectUri:', config.redirectUri);
    console.log('[GOOGLE-AUTH] 🏢 Domain:', config.domain);

    // Générer l'URL d'authentification Google avec la configuration de la BDD
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${organizationId}`;

    console.log('[GOOGLE-AUTH] 🌐 URL générée:', authUrl);

    res.json({
      success: true,
      data: {
        authUrl,
        scopes: GOOGLE_SCOPES.split(' '),
        clientConfigured: true
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
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_error=${error}`);
    }

    if (!code || !state) {
      console.log('[GOOGLE-AUTH] ❌ Paramètres manquants - Code:', !!code, 'State:', !!state);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_error=missing_params`);
    }

    let organizationId: string;
    let userId: string;

    try {
      // Le state est maintenant un objet JSON stringifié
      const parsedState = JSON.parse(state as string);
      organizationId = parsedState.organizationId;
      userId = parsedState.userId; // On récupère aussi l'userId
      if (!organizationId || !userId) {
        throw new Error('State object is missing organizationId or userId');
      }
    } catch (e) {
      console.error('[GOOGLE-AUTH] ❌ State invalide, non-JSON ou champs manquants:', state);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_error=invalid_state`);
    }

    console.log('[GOOGLE-AUTH] 🏢 Organisation cible:', organizationId, 'pour utilisateur:', userId);
    
    // Récupérer la configuration Google Workspace pour cette organisation
    const config = await getGoogleWorkspaceConfig(organizationId);
    
    if (!config || !config.isConfigured || !config.adminEmail) {
      console.log('[GOOGLE-AUTH] ❌ Configuration manquante ou email admin non défini pour org:', organizationId);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_error=config_incomplete`);
    }

    console.log('[GOOGLE-AUTH] ✅ Configuration trouvée, email admin cible:', config.adminEmail);
    console.log('[GOOGLE-AUTH] 🔄 Échange du code contre les tokens...');

    // Créer le client OAuth2 Google
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    try {
      // Échanger le code d'autorisation contre les tokens
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
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_error=account_mismatch&expected=${encodeURIComponent(config.adminEmail)}&connected_as=${encodeURIComponent(userInfo.data.email || '')}`);
      }

      console.log('[GOOGLE-AUTH] ✅ Connexion Google validée pour l\'admin:', config.adminEmail);

      // Sauvegarder ou mettre à jour les tokens pour l'organisation
      console.log('[GOOGLE-AUTH] 💾 Sauvegarde des tokens pour l\'organisation:', organizationId);
      await googleOAuthService.saveUserTokens(userId, organizationId, tokens);
      const googleTokenRecord = await prisma.googleToken.findUnique({ where: { organizationId } });

      console.log('[GOOGLE-AUTH] ✅ Tokens sauvegardés pour l\'organisation:', googleTokenRecord?.id);

      // Activer automatiquement les modules Google Workspace pour cette organisation
      console.log('[GOOGLE-AUTH] 🔧 Activation des modules Google Workspace...');
      await activateGoogleModules(organizationId, tokens.scope || '');

      console.log('[GOOGLE-AUTH] 🎉 Authentification Google complète avec succès !');
      
      // Redirection vers notre page de callback spécialisée
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_success=1&organizationId=${organizationId}&admin_email=${encodeURIComponent(config.adminEmail)}`);

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
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_error=${errorType}&details=${encodeURIComponent(error.message || 'Erreur inconnue')}`);
    }

  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur callback générale:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/google-auth-callback?google_error=callback_error`);
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

    console.log('[GOOGLE-AUTH] 🔄 Tentative de refresh automatique pour organisation:', organizationId);

    // 🆕 NOUVEAU: Utiliser le système de refresh automatique
    const refreshResult = await refreshGoogleTokenIfNeeded(organizationId);
    
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
      const googleToken = await prisma.googleToken.findUnique({
        where: { organizationId }
      });
      scopes = googleToken?.scope ? googleToken.scope.split(' ') : [];
      
      console.log('[GOOGLE-AUTH] ✅ Token validé avec succès, email:', userEmail);

    } catch (tokenError) {
      console.log('[GOOGLE-AUTH] ❌ Erreur validation token final:', tokenError);
      tokenValid = false;
    }

    // Récupérer les informations de dernière synchronisation
    const googleToken = await prisma.googleToken.findUnique({
      where: { organizationId }
    });

    res.json({
      success: true,
      data: {
        connected: tokenValid,
        email: userEmail,
        scopes: scopes,
        lastSync: googleToken?.updatedAt,
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

    // Chercher les tokens Google de l'organisation
    const googleToken = await prisma.googleToken.findUnique({
      where: { organizationId: organizationId }
    });

    if (googleToken) {
      try {
        // Révoquer le token côté Google
        console.log('[GOOGLE-AUTH] 🚫 Révocation du token côté Google...');
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: decrypt(googleToken.accessToken)
        });

        await oauth2Client.revokeCredentials();
        console.log('[GOOGLE-AUTH] ✅ Token révoqué côté Google');

      } catch (revokeError) {
        console.log('[GOOGLE-AUTH] ⚠️ Erreur révocation côté Google (peut-être déjà révoqué):', revokeError);
      }

      // Supprimer le token de notre base de données
      console.log('[GOOGLE-AUTH] 🗑️ Suppression du token de la base...');
      await prisma.googleToken.delete({
        where: { organizationId: organizationId }
      });

      console.log('[GOOGLE-AUTH] ✅ Token supprimé de la base');
    }

    // Désactiver les modules Google Workspace pour l'organisation
    console.log('[GOOGLE-AUTH] 🔧 Désactivation des modules Google...');
    await prisma.googleWorkspaceConfig.update({
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
    const googleModules = await prisma.module.findMany({
      where: {
        name: {
          in: ['Gmail', 'Calendar', 'Drive', 'Docs', 'Sheets', 'Meet'],
          mode: 'insensitive'
        }
      }
    });

    for (const module of googleModules) {
      await prisma.organizationModule.updateMany({
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
    
    res.json({
      success: true,
      message: 'Déconnecté de Google Workspace avec succès'
    });

  } catch (error) {
    console.error('[GOOGLE-AUTH] ❌ Erreur déconnexion:', error);
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

    // Vérifier que l'organisation a des tokens Google valides
    const googleToken = await prisma.googleToken.findUnique({
      where: { organizationId: organizationId }
    });

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

    await prisma.googleWorkspaceConfig.update({
      where: { organizationId: organizationId },
      data: updateData
    });

    // Mettre à jour aussi le module dans la table organizationModule
    const module = await prisma.module.findFirst({
      where: {
        name: {
          contains: moduleName,
          mode: 'insensitive'
        }
      }
    });

    if (module) {
      await prisma.organizationModule.upsert({
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

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { googleOAuthService } from '../../google-auth/core/GoogleOAuthCore.js';
import { googleOrganizationService } from '../services/GoogleOrganizationService.js';

const router = Router();

// GET /api/auth/google/connect - Obtenir l'URL de connexion Google
router.get('/connect', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[GoogleAuth] /connect - Début de la route');
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId; // Récupérer l'organizationId
    console.log(`[GoogleAuth] userId: ${userId}, organizationId: ${organizationId}`);
    
    if (!userId || !organizationId) { // Vérifier les deux
      console.log('[GoogleAuth] Erreur: ID utilisateur ou organisation manquant');
      return res.status(400).json({ error: 'ID utilisateur et ID organisation manquants' });
    }

    // ✅ Vérifier si un refresh token existe pour décider si on force le consentement
    const existingTokens = await googleOAuthService.getUserTokens(userId, organizationId);
    const hasRefreshToken = existingTokens && existingTokens.refreshToken;
    const forceConsent = !hasRefreshToken; // Force consent si pas de refresh token
    
    console.log('[GoogleAuth] Token existant:', !!existingTokens);
    console.log('[GoogleAuth] Refresh token présent:', hasRefreshToken);
    console.log('[GoogleAuth] Force consent:', forceConsent);
    console.log('[GoogleAuth] Génération URL d\'autorisation...');
    
    // ⭐ IMPORTANT: Passer le Host header pour cohérence avec le callback
    const hostHeader = req.headers.host || 'localhost:4000';
    const authUrl = googleOAuthService.getAuthUrl(userId, organizationId, hostHeader);
    console.log('[GoogleAuth] URL générée:', authUrl);
    
    const response = { authUrl };
    console.log('[GoogleAuth] Réponse JSON envoyée:', response);
    res.json(response);
  } catch (error) {
    console.error('[GoogleAuth] Erreur génération URL Google:', error);
    console.error('[GoogleAuth] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/google/callback - Callback OAuth2 Google
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/profile?google_error=${error}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/profile?google_error=missing_params`);
    }

    const { userId, organizationId } = JSON.parse(state as string);

    if (!userId || !organizationId) {
      return res.redirect(`${process.env.FRONTEND_URL}/profile?google_error=invalid_state`);
    }

    // Échanger le code contre des tokens
    const tokens = await googleOAuthService.getTokenFromCode(code as string);
    
    // Sauvegarder les tokens
    await googleOAuthService.saveUserTokens(userId, organizationId, tokens);

    // Rediriger vers le frontend avec succès
    res.redirect(`${process.env.FRONTEND_URL}/profile?google_connected=true`);
  } catch (error) {
    console.error('Erreur callback Google:', error);
    res.redirect(`${process.env.FRONTEND_URL}/profile?google_error=callback_failed`);
  }
});

// GET /api/auth/google/status - Vérifier le statut de connexion Google
router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID utilisateur manquant' });
    }

    // Si pas d'organisation, utiliser l'ancien système (connexion individuelle)
    if (!organizationId) {
      const isConnected = await googleOAuthService.isUserConnected(userId);
      
      if (isConnected) {
        const connectionTest = await googleOAuthService.testConnection(userId);
        res.json({
          isConnected: true,
          userInfo: connectionTest.userInfo,
          error: connectionTest.error
        });
      } else {
        res.json({ isConnected: false });
      }
      return;
    }

    // Nouveau système : Statut Google au niveau organisation
    const status = await googleOrganizationService.getUserGoogleStatus(userId, organizationId);
    
    res.json({
      isConnected: status.canUseGoogle,
      hasPersonalConnection: status.hasPersonalConnection,
      hasOrganizationAccess: status.hasOrganizationAccess,
      accessType: status.accessType,
      organizationInfo: status.organizationInfo,
      userInfo: status.organizationInfo?.userInfo
    });
  } catch (error) {
    console.error('[GoogleAuth] Erreur vérification statut Google:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/google/disconnect - Déconnecter le compte Google
router.post('/disconnect', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID utilisateur manquant' });
    }

    // Si l'utilisateur est super admin et qu'il y a une organisation, 
    // lui permettre de déconnecter Google pour toute l'organisation
    if (userRole === 'super_admin' && organizationId && req.body.disconnectOrganization) {
      console.log('[GoogleAuth] Déconnexion organisation demandée par super admin');
      
      const result = await googleOrganizationService.disconnectOrganizationGoogle(organizationId, userId);
      
      res.json({ 
        success: true, 
        message: `Compte Google déconnecté pour l'organisation (${result.disconnectedUsers} utilisateurs)`,
        disconnectedUsers: result.disconnectedUsers
      });
      return;
    }

    // Déconnexion individuelle standard
    const tokens = await googleOAuthService.getUserTokens(userId);
    if (tokens?.accessToken) {
      // TODO: Révoquer le token Google
    }

    await googleOAuthService.disconnectUser(userId);

    res.json({ success: true, message: 'Votre compte Google a été déconnecté' });
  } catch (error) {
    console.error('[GoogleAuth] Erreur déconnexion Google:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

// GET /api/auth/google/organization-info - Informations Google de l'organisation
router.get('/organization-info', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organisation manquante' });
    }

    const orgInfo = await googleOrganizationService.getOrganizationGoogleInfo(organizationId);
    res.json(orgInfo);
  } catch (error) {
    console.error('[GoogleAuth] Erreur récupération infos organisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

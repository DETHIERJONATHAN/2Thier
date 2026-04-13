import { Router } from 'express';
import { googleOAuthService } from '../google-auth/core/GoogleOAuthCore.js';
import { db } from '../lib/database.js';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { logger } from '../lib/logger';

const router = Router();

// GET /api/auto-google-auth/status
// Retourne le statut de connexion Google pour l'utilisateur/organisation
router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  
  const { userId, organizationId } = req.query as { userId?: string; organizationId?: string };
  
  if (!userId || !organizationId) {
    return res.json({
      success: true,
      data: {
        connected: false,
        email: null,
        scopes: [],
        lastSync: null,
        error: !organizationId ? 'Organization ID requis' : 'User ID requis'
      }
    });
  }

  try {
    // Vérifier si des tokens existent pour cet utilisateur dans cette organisation
    // IMPORTANT: On utilise la clé composite userId_organizationId
    const tokens = await db.googleToken.findUnique({
      where: { 
        userId_organizationId: { userId, organizationId }
      }
    });

    if (!tokens || !tokens.accessToken) {
      return res.json({
        success: true,
        data: {
          connected: false,
          email: null,
          scopes: tokens?.scope?.split(' ') || [],
          lastSync: null
        }
      });
    }

    // L'email Google est maintenant stocké directement dans le token
    return res.json({
      success: true,
      data: {
        connected: true,
        email: tokens.googleEmail || null,
        scopes: tokens.scope?.split(' ') || [],
        lastSync: tokens.updatedAt || null,
        expiresAt: tokens.expiresAt
      }
    });

  } catch (error) {
    logger.error('[AutoGoogleAuth] Erreur status:', error);
    return res.json({
      success: true,
      data: {
        connected: false,
        email: null,
        scopes: [],
        lastSync: null,
        error: 'Erreur serveur'
      }
    });
  }
});

// POST /api/auto-google-auth/connect
// Tente de connecter l'utilisateur à Google Workspace en arrière-plan.
// Si les tokens existent et sont valides (ou peuvent être rafraîchis), c'est transparent.
// Sinon, renvoie une URL d'autorisation pour que le frontend puisse rediriger l'utilisateur.
router.post('/connect', authMiddleware, async (req: AuthenticatedRequest, res) => {
  
  const { userId, organizationId } = req.body;
  const caller = req.user;

  if (!userId || !organizationId) {
    return res.status(400).json({ success: false, error: 'userId et organizationId sont requis.' });
  }

  // 🔒 Validation d'autorisation: l'appelant doit être lui-même OU super_admin
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Authentification requise.' });
  }
  const isSuperAdmin = caller.role === 'super_admin' || caller.isSuperAdmin === true;
  if (!isSuperAdmin && caller.userId !== userId) {
    return res.status(403).json({ success: false, error: "Accès interdit: utilisateur non autorisé." });
  }

  // 🔒 Vérifier l'appartenance à l'organisation (sauf super_admin)
  if (!isSuperAdmin) {
    const membership = await db.userOrganization.findFirst({ where: { userId: caller.userId, organizationId } });
    if (!membership) {
      return res.status(403).json({ success: false, error: "Accès interdit: organisation non autorisée." });
    }
  }

  try {
    // 1. Vérifier uniquement la présence/validité locale du token (sans appeler Google).
    // L'auto-OAuth est désactivé: on ne tente PAS de refresh ici.
    const tokens = await db.googleToken.findUnique({
      where: {
        userId_organizationId: { userId, organizationId }
      }
    });

    const nowDate = new Date();
    const isLocallyValid = !!tokens?.accessToken && !!tokens?.expiresAt && tokens.expiresAt > nowDate;
    if (isLocallyValid) {
      return res.json({
        success: true,
        isConnected: true,
        needsManualAuth: false,
        message: 'Connexion Google déjà active (token local valide).',
      });
    }

    // 2. Aucun token local valide → on ne lance PLUS l'OAuth ici.
    // Désormais, tout passe par la page Admin Organisation Google Workspace + le scheduler.

    return res.json({
      success: true,
      isConnected: false,
      needsManualAuth: true,
      message: 'Connexion Google requise: demandez à un admin d\'activer Google Workspace via la page Organisation (Admin) et le scheduler.',
      requiresAdmin: true,
    });

  } catch (error) {
    logger.error('[AutoGoogleAuth] Erreur lors de la connexion automatique:', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur lors de la connexion Google.' });
  }
});

// POST /api/auto-google-auth/trigger-logout
router.post('/trigger-logout', authMiddleware, async (req: AuthenticatedRequest, res) => {
  
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId requis.' });
  }

  // Politique voulue: NE JAMAIS déconnecter Google automatiquement.
  // On ne révoque pas les tokens, on ne supprime rien. On retourne juste un succès "no-op".
  try {
    // Ancien comportement (désactivé): await googleOAuthService.disconnectUser(userId);
    return res.status(200).json({ success: true, message: 'Aucune déconnexion Google effectuée (politique persistante).' });
  } catch (error) {
    logger.error('[AutoGoogleAuth] Erreur inattendue trigger-logout (no-op):', error);
    return res.status(200).json({ success: true, message: 'Aucune déconnexion Google effectuée (no-op avec erreur interne ignorée).' });
  }
});

export default router;

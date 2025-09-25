import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { autoGoogleAuthService } from '../services/AutoGoogleAuthService.js';

const router = Router();

/**
 * GET /api/auto-google-auth/status
 * Obtient le statut de connexion Google automatique pour un utilisateur
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const { userId, organizationId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    console.log(`📊 [AutoGoogleAuthAPI] Vérification statut Google pour user ${userId}...`);
    
    const status = await autoGoogleAuthService.getGoogleConnectionStatus(
      userId, 
      organizationId && typeof organizationId === 'string' ? organizationId : undefined
    );

    console.log(`📊 [AutoGoogleAuthAPI] Statut Google pour user ${userId}:`, status);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('❌ [AutoGoogleAuthAPI] Erreur récupération statut:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du statut Google'
    });
  }
});

/**
 * POST /api/auto-google-auth/connect
 * Force la connexion automatique à Google pour un utilisateur
 */
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { userId, organizationId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    console.log(`🚀 [AutoGoogleAuthAPI] Connexion automatique Google pour user ${userId}...`);
    
    const result = await autoGoogleAuthService.autoConnectToGoogle(userId, organizationId);

    console.log(`🚀 [AutoGoogleAuthAPI] Résultat connexion automatique pour user ${userId}:`, result);

    res.json(result);
  } catch (error) {
    console.error('❌ [AutoGoogleAuthAPI] Erreur connexion automatique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion automatique à Google'
    });
  }
});

/**
 * POST /api/auto-google-auth/trigger-login
 * Déclenche la connexion automatique lors du login (usage interne)
 */
router.post('/trigger-login', authMiddleware, async (req, res) => {
  try {
    const { userId, organizationId } = req.body;
    
    console.log(`🔐 [AutoGoogleAuthAPI] DÉBUT trigger-login - Body reçu:`, req.body);
    console.log(`🔐 [AutoGoogleAuthAPI] userId: ${userId}, organizationId: ${organizationId}`);
    
    if (!userId) {
      console.log(`❌ [AutoGoogleAuthAPI] userId manquant dans trigger-login`);
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    console.log(`🔐 [AutoGoogleAuthAPI] Déclenchement connexion login pour user ${userId}...`);
    
    // Déclencher la connexion automatique en arrière-plan
    console.log(`📞 [AutoGoogleAuthAPI] Appel handleLoginGoogleConnection pour user ${userId}...`);
    await autoGoogleAuthService.handleLoginGoogleConnection(userId, organizationId);
    console.log(`✅ [AutoGoogleAuthAPI] handleLoginGoogleConnection terminé pour user ${userId}`);

    res.json({
      success: true,
      message: 'Connexion automatique Google déclenchée'
    });
  } catch (error) {
    console.error('❌ [AutoGoogleAuthAPI] Erreur déclenchement connexion login:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déclenchement de la connexion automatique'
    });
  }
});

/**
 * POST /api/auto-google-auth/trigger-logout
 * Déclenche la déconnexion automatique lors du logout (usage interne)
 */
router.post('/trigger-logout', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    console.log(`🔓 [AutoGoogleAuthAPI] Déclenchement déconnexion logout pour user ${userId}...`);
    
    // Déclencher la déconnexion automatique
    await autoGoogleAuthService.handleLogoutGoogleDisconnection(userId);

    res.json({
      success: true,
      message: 'Déconnexion automatique Google déclenchée'
    });
  } catch (error) {
    console.error('❌ [AutoGoogleAuthAPI] Erreur déclenchement déconnexion logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déclenchement de la déconnexion automatique'
    });
  }
});

export default router;

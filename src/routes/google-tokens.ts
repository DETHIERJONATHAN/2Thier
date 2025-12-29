/**
 * ROUTES SPÉCIFIQUES POUR LE MONITORING DES TOKENS GOOGLE
 * 
 * Ces routes sont utilisées par le composant GoogleTokenMonitor pour :
 * - Obtenir le statut détaillé du scheduler
 * - Obtenir les informations d'un token spécifique
 * - Contrôler le scheduler (start/stop)
 * - Obtenir l'historique des refresh
 */

import { Router, type RequestHandler } from 'express';
import { googleTokenScheduler } from '../services/GoogleTokenRefreshScheduler';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middlewares/requireRole';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// Auth obligatoire puis contrôle de rôle (évite 403 quand req.user est vide)
router.use(authMiddleware as unknown as RequestHandler);
// Middleware : Seuls les admins ou super_admin peuvent accéder à ces routes
router.use(requireRole(['admin', 'super_admin']));

/**
 * GET /api/google-tokens/scheduler/status
 * Statut détaillé du scheduler pour le monitoring
 */
router.get('/scheduler/status', async (_req, res) => {
  try {
    const status = googleTokenScheduler.getStatus();
    
    // Compter le nombre total d'utilisateurs avec des tokens Google
    const totalTokens = await prisma.googleToken.count();
    const activeTokens = await prisma.googleToken.count({
      where: {
        expiresAt: {
          gt: new Date()
        }
      }
    });

    // Obtenir les dernières erreurs (s'il y en a)
    // Pour l'instant, nous retournons un tableau vide, mais cela peut être étendu
    const recentErrors: Array<{ timestamp: string; message: string; organizationId: string }> = [];

    const schedulerStatus = {
      isRunning: status.isRunning,
      nextRefresh: status.isRunning ? new Date(Date.now() + 50 * 60 * 1000).toISOString() : null, // 50 min dans le futur
      lastRefresh: null, // À implémenter si nécessaire
      refreshCount: 0, // À implémenter si nécessaire
      totalUsers: totalTokens,
      activeTokens: activeTokens,
      errors: recentErrors
    };

    res.json({
      success: true,
      data: schedulerStatus
    });
  } catch (error) {
    console.error('[GoogleTokensAPI] Erreur status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/google-tokens/organization/:organizationId
 * Informations détaillées sur les tokens d'une organisation
 * Note: Retourne le premier token trouvé (pour compatibilité admin)
 */
router.get('/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Avec le nouveau modèle, il peut y avoir plusieurs tokens par organisation
    // (un par utilisateur). On retourne le premier trouvé pour l'admin.
    const token = await prisma.googleToken.findFirst({
      where: { organizationId },
      include: { User: { select: { email: true, firstName: true, lastName: true } } }
    });

    if (!token) {
      return res.json({
        success: false,
        message: 'Aucun token trouvé pour cette organisation'
      });
    }

    const now = new Date();
    const expiresAt = token.expiresAt;
    const isExpired = expiresAt ? expiresAt <= now : true;
    
    let timeUntilExpiry = 'N/A';
    if (expiresAt && !isExpired) {
      const diff = expiresAt.getTime() - now.getTime();
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      timeUntilExpiry = `${minutes}m ${seconds}s`;
    } else if (isExpired) {
      timeUntilExpiry = 'Expiré';
    }

    const tokenInfo = {
      id: token.id,
      organizationId: token.organizationId,
      userId: token.userId,
      userEmail: token.User?.email,
      userName: token.User ? `${token.User.firstName} ${token.User.lastName}` : null,
      googleEmail: token.googleEmail,
      accessToken: token.accessToken ? `${token.accessToken.substring(0, 20)}...` : '', // Masquer le token
      refreshToken: token.refreshToken ? 'Présent' : 'Absent',
      tokenType: token.tokenType || 'Bearer',
      expiresIn: 3600, // Les tokens Google durent 1 heure
      scope: token.scope || '',
      createdAt: token.createdAt?.toISOString() || '',
      updatedAt: token.updatedAt?.toISOString() || '',
      expiresAt: expiresAt?.toISOString() || '',
      isExpired,
      timeUntilExpiry
    };

    res.json({
      success: true,
      data: tokenInfo
    });
  } catch (error) {
    console.error('[GoogleTokensAPI] Erreur organization token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du token',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/google-tokens/scheduler/start
 * Démarre le scheduler
 */
router.post('/scheduler/start', (_req, res) => {
  try {
    googleTokenScheduler.start();
    
    res.json({
      success: true,
      message: 'Scheduler démarré avec succès'
    });
  } catch (error) {
    console.error('[GoogleTokensAPI] Erreur start scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage du scheduler',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/google-tokens/scheduler/stop
 * Arrête le scheduler
 */
router.post('/scheduler/stop', (_req, res) => {
  try {
    googleTokenScheduler.stop();
    
    res.json({
      success: true,
      message: 'Scheduler arrêté avec succès'
    });
  } catch (error) {
    console.error('[GoogleTokensAPI] Erreur stop scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'arrêt du scheduler',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/google-tokens/scheduler/refresh-now
 * Force un refresh immédiat de tous les tokens
 */
router.post('/scheduler/refresh-now', async (_req, res) => {
  try {
    await googleTokenScheduler.forceRefreshAll();
    
    res.json({
      success: true,
      message: 'Refresh immédiat lancé avec succès'
    });
  } catch (error) {
    console.error('[GoogleTokensAPI] Erreur refresh now:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du refresh immédiat',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/google-tokens/refresh-history/:organizationId
 * Historique des refresh pour une organisation
 */
router.get('/refresh-history/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Récupérer l'historique des refresh pour cette organisation
    const history = await prisma.googleTokenRefreshHistory.findMany({
      where: {
        organizationId
      },
      orderBy: {
        refreshedAt: 'desc'
      },
      take: 50 // Limiter aux 50 derniers
    });

    // Transformer les données pour l'interface
    const formattedHistory = history.map(entry => ({
      id: entry.id,
      timestamp: entry.refreshedAt.toISOString(),
      success: entry.success,
      message: entry.message,
      errorDetails: entry.errorDetails,
      oldExpiresAt: entry.oldExpiresAt?.toISOString(),
      newExpiresAt: entry.newExpiresAt?.toISOString()
    }));

    res.json({
      success: true,
      data: formattedHistory
    });
  } catch (error) {
    console.error('[GoogleTokensAPI] Erreur refresh history:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;

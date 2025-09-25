/**
 * ROUTES POUR LA GESTION DU SCHEDULER DE REFRESH DES TOKENS GOOGLE
 * 
 * Permet de :
 * - Vérifier l'état du scheduler
 * - Forcer un refresh de tous les tokens
 * - Refresh un token spécifique
 * - Redémarrer le scheduler
 */

import { Router, type RequestHandler } from 'express';
import { googleTokenScheduler } from '../services/GoogleTokenRefreshScheduler';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// Sécuriser toutes les routes du scheduler: nécessite authentification + rôle admin/super_admin
router.use(authMiddleware as unknown as RequestHandler);
router.use(requireRole(['admin', 'super_admin']));

/**
 * GET /api/google/scheduler/status
 * Obtient l'état du scheduler de refresh automatique
 */
router.get('/status', (_req, res) => {
  try {
    const status = googleTokenScheduler.getStatus();
    
    res.json({
      success: true,
      scheduler: {
        isRunning: status.isRunning,
        checkIntervalMinutes: status.checkIntervalMinutes,
        refreshMarginMinutes: status.refreshMarginMinutes,
        description: status.isRunning 
          ? `Scheduler actif - vérifications toutes les ${status.checkIntervalMinutes} min, refresh ${status.refreshMarginMinutes} min avant expiration`
          : 'Scheduler arrêté'
      },
      message: status.isRunning 
        ? '✅ Le scheduler de refresh automatique est actif' 
        : '⚠️ Le scheduler de refresh automatique est arrêté'
    });
  } catch (error) {
    console.error('[GoogleSchedulerAPI] Erreur status:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du statut',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/google/scheduler/refresh-all
 * Force un refresh immédiat de tous les tokens
 */
router.post('/refresh-all', async (_req, res) => {
  try {
    console.log('[GoogleSchedulerAPI] 🔧 Refresh forcé demandé pour tous les tokens');
    
    await googleTokenScheduler.forceRefreshAll();
    
    res.json({
      success: true,
      message: '✅ Refresh forcé de tous les tokens terminé - vérifiez les logs serveur pour les détails'
    });
  } catch (error) {
    console.error('[GoogleSchedulerAPI] Erreur refresh-all:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du refresh forcé',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/google/scheduler/refresh/:organizationId
 * Force un refresh d'un token spécifique
 */
router.post('/refresh/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'ID d\'organisation requis'
      });
    }
    
    console.log(`[GoogleSchedulerAPI] 🔧 Refresh forcé demandé pour organisation: ${organizationId}`);
    
    await googleTokenScheduler.refreshTokenForOrganization(organizationId);
    
    res.json({
      success: true,
      message: `✅ Refresh forcé pour l'organisation ${organizationId} terminé - vérifiez les logs serveur pour les détails`
    });
  } catch (error) {
    console.error('[GoogleSchedulerAPI] Erreur refresh specific:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du refresh spécifique',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * POST /api/google/scheduler/restart
 * Redémarre le scheduler
 */
router.post('/restart', (_req, res) => {
  try {
    console.log('[GoogleSchedulerAPI] 🔄 Redémarrage du scheduler demandé');
    
    googleTokenScheduler.stop();
    googleTokenScheduler.start();
    
    res.json({
      success: true,
      message: '✅ Scheduler redémarré avec succès'
    });
  } catch (error) {
    console.error('[GoogleSchedulerAPI] Erreur restart:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du redémarrage du scheduler',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/google/scheduler/tokens-info
 * Obtient des informations sur tous les tokens Google en base
 */
router.get('/tokens-info', async (_req, res) => {
  try {
    const tokens = await prisma.googleToken.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const now = new Date();
    const tokensInfo = tokens.map(token => {
      const expiresAt = token.expiresAt;
      let status = 'unknown';
      let minutesToExpiry = null;
      
      if (expiresAt) {
        const timeToExpiry = expiresAt.getTime() - now.getTime();
        minutesToExpiry = Math.round(timeToExpiry / 1000 / 60);
        
        if (expiresAt <= now) {
          status = 'expired';
        } else if (minutesToExpiry <= 10) {
          status = 'expiring_soon';
        } else {
          status = 'valid';
        }
      }
      
      return {
        organizationId: token.organizationId,
        organizationName: token.organization?.name || 'Unknown',
        status,
        expiresAt: expiresAt?.toISOString(),
        minutesToExpiry,
        hasRefreshToken: !!token.refreshToken,
        lastUpdated: token.updatedAt?.toISOString()
      };
    });

    const summary = {
      total: tokens.length,
      valid: tokensInfo.filter(t => t.status === 'valid').length,
      expiring_soon: tokensInfo.filter(t => t.status === 'expiring_soon').length,
      expired: tokensInfo.filter(t => t.status === 'expired').length,
      unknown: tokensInfo.filter(t => t.status === 'unknown').length
    };

    res.json({
      success: true,
      summary,
      tokens: tokensInfo
    });
  } catch (error) {
    console.error('[GoogleSchedulerAPI] Erreur tokens-info:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des informations tokens',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;

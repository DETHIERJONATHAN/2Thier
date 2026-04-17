/**
 * API Routes pour gérer les domaines Cloud Run mappés
 * Permet de lister et vérifier les domaines configurés dans Google Cloud Run
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/cloud-run-domains
 * Liste les domaines mappés connus (configurés manuellement ou récupérés via GCP)
 * Requiert: Super Admin uniquement
 */
router.get('/cloud-run-domains', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Vérification Super Admin
    if (!user.isSuperAdmin) {
      return res.status(403).json({ 
        error: 'Accès refusé. Fonctionnalité réservée aux Super Admins.' 
      });
    }

    // Liste des domaines mappés dans Cloud Run (basé sur votre console)
    // Static list; could be replaced with Cloud Run Admin API calls
    const mappedDomains = [
      {
        domain: '2thier.be',
        serviceName: 'crm2thier-vite-prod',
        region: 'europe-west1',
        status: 'active',
        mappedAt: '2024-12-01', // Date approximative
        description: 'Site principal 2Thier Energy'
      },
      {
        domain: 'devis1minute.be',
        serviceName: 'crm2thier-vite-prod',
        region: 'europe-west1',
        status: 'active',
        mappedAt: '2024-12-01',
        description: 'Landing page Devis1Minute'
      }
      // Ajoutez ici vos autres domaines mappés dans Cloud Run
    ];

    
    res.json({
      success: true,
      domains: mappedDomains,
      count: mappedDomains.length
    });

  } catch (error: unknown) {
    logger.error('❌ [CloudRunDomains] Erreur:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des domaines Cloud Run',
      details: error.message 
    });
  }
});

/**
 * POST /api/cloud-run-domains/verify
 * Vérifie qu'un domaine est bien accessible et mappé correctement
 */
router.post('/cloud-run-domains/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { domain } = req.body;

    if (!user.isSuperAdmin) {
      return res.status(403).json({ 
        error: 'Accès refusé. Fonctionnalité réservée aux Super Admins.' 
      });
    }

    if (!domain) {
      return res.status(400).json({ error: 'Le domaine est requis' });
    }

    // Vérification simple: on teste si le domaine répond
    // Simple reachability check; Cloud Run API health check can be added
    const isReachable = await checkDomainReachability(domain);

    res.json({
      success: true,
      domain,
      verified: isReachable,
      verifiedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    logger.error('❌ [CloudRunDomains] Erreur vérification:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la vérification du domaine',
      details: error.message 
    });
  }
});

/**
 * Fonction utilitaire pour vérifier qu'un domaine est accessible
 */
async function checkDomainReachability(domain: string): Promise<boolean> {
  try {
    const https = await import('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname: domain,
        port: 443,
        path: '/',
        method: 'HEAD',
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  } catch (error) {
    logger.error('❌ Erreur lors de la vérification du domaine:', error);
    return false;
  }
}

export default router;

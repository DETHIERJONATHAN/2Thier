import { Router } from 'express';
import { Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    organizationId?: string;
  };
}

const router = Router();

// Route pour gérer l'usurpation d'identité
// POST /api/impersonate
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, organizationId } = req.body;
    
    console.log('[Impersonate Route] Nouvelle demande d\'usurpation:', { userId, organizationId });
    
    // Vérifier que l'utilisateur actuel est un super admin
    const currentUser = req.user;
    if (!currentUser || currentUser.role !== 'super_admin') {
      console.log('[Impersonate Route] Accès refusé - utilisateur non super admin');
      return res.status(403).json({ 
        success: false, 
        message: 'Seuls les super administrateurs peuvent usurper l\'identité' 
      });
    }
    
    // Cette route ne fait que valider les droits
    // L'usurpation réelle se fait via les headers dans les requêtes suivantes
    // grâce au middleware impersonation.ts
    
    console.log('[Impersonate Route] Usurpation autorisée pour:', { userId, organizationId });
    
    return res.json({
      success: true,
      message: 'Usurpation d\'identité activée',
      impersonation: {
        userId: userId || null,
        organizationId: organizationId || null
      }
    });
    
  } catch (error) {
    console.error('[Impersonate Route] Erreur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la configuration de l\'usurpation'
    });
  }
});

// Route pour arrêter l'usurpation
// DELETE /api/impersonate
router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user;
    if (!currentUser || currentUser.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Seuls les super administrateurs peuvent arrêter l\'usurpation' 
      });
    }
    
    console.log('[Impersonate Route] Arrêt de l\'usurpation demandé');
    
    return res.json({
      success: true,
      message: 'Usurpation d\'identité désactivée'
    });
    
  } catch (error) {
    console.error('[Impersonate Route] Erreur lors de l\'arrêt:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'arrêt de l\'usurpation'
    });
  }
});

export default router;

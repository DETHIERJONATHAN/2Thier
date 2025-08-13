import { Router } from 'express';
import { createOrUpdateEmailAccount, getUserEmailAccount } from '../services/EmailAccountService';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

/**
 * POST /api/email-accounts/create
 * Crée ou récupère le compte email de l'utilisateur connecté
 */
router.post('/create', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    const emailAccount = await createOrUpdateEmailAccount(userId);
    
    res.json({
      success: true,
      emailAccount: {
        id: emailAccount.id,
        emailAddress: emailAccount.emailAddress,
        createdAt: emailAccount.createdAt,
        updatedAt: emailAccount.updatedAt,
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du compte email:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du compte email',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/email-accounts/me
 * Récupère le compte email de l'utilisateur connecté
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    const emailAccount = await getUserEmailAccount(userId);
    
    if (!emailAccount) {
      return res.status(404).json({ 
        error: 'Aucun compte email trouvé',
        hasAccount: false
      });
    }

    res.json({
      success: true,
      hasAccount: true,
      emailAccount: {
        id: emailAccount.id,
        emailAddress: emailAccount.emailAddress,
        createdAt: emailAccount.createdAt,
        updatedAt: emailAccount.updatedAt,
        organization: {
          id: emailAccount.organization.id,
          name: emailAccount.organization.name,
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du compte email:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du compte email',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;

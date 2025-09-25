import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../auth/middleware';
import { createOrUpdateEmailAccount, getUserEmailAccount } from '../services/EmailAccountService.js';

const router = Router();

/**
 * @route   POST /api/email-accounts
 * @desc    Crée ou met à jour le compte email pour l'utilisateur authentifié.
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const emailAccount = await createOrUpdateEmailAccount(req.user.userId);
    
    res.status(201).json({
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
    const message = error instanceof Error ? error.message : 'Une erreur interne est survenue.';
    res.status(500).json({ 
      error: message,
      success: false 
    });
  }
});

/**
 * @route   GET /api/email-accounts/me
 * @desc    Récupère le compte email de l'utilisateur authentifié
 * @access  Private
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const emailAccount = await getUserEmailAccount(req.user.userId);
    
    if (!emailAccount) {
      return res.status(404).json({ 
        error: 'Aucun compte email trouvé',
        hasAccount: false,
        success: false
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
    const message = error instanceof Error ? error.message : 'Une erreur interne est survenue.';
    res.status(500).json({ 
      error: message,
      success: false 
    });
  }
});

export default router;

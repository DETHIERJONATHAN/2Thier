/**
 * ============================================================
 *  ROUTE: /api/mail/provider
 * ============================================================
 *
 *  Détecte le fournisseur de messagerie de l'utilisateur connecté.
 *
 *  Logique de détection :
 *    1. Si l'utilisateur a un EmailAccount avec mailProvider renseigné → on le retourne.
 *    2. Sinon, on tente une auto-détection :
 *       - Présence d'un GoogleToken valide → "gmail"
 *       - Présence d'un EmailAccount avec encryptedPassword → "yandex"
 *       - Par défaut → "none" (pas de fournisseur configuré)
 *
 *  Réponse : { provider: "gmail" | "yandex" | "none", email?: string }
 * ============================================================
 */

import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { db } from '../lib/database.js';

const router = Router();

/**
 * @route   GET /api/mail/provider
 * @desc    Retourne le fournisseur de messagerie de l'utilisateur connecté
 * @access  Private (authentifié)
 */
router.get('/provider', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const organizationId = req.user?.organizationId;

    // ─── 1. Vérifier si l'utilisateur a un EmailAccount avec provider explicite ───
    const emailAccount = await db.emailAccount.findUnique({
      where: { userId },
      select: { mailProvider: true, emailAddress: true, encryptedPassword: true }
    });

    if (emailAccount?.mailProvider && emailAccount.mailProvider !== 'gmail') {
      // Le provider a été explicitement configuré (yandex, etc.)
      return res.json({
        provider: emailAccount.mailProvider,
        email: emailAccount.emailAddress
      });
    }

    // ─── 2. Auto-détection : vérifier la présence de tokens Google ───
    // Note : le modèle GoogleToken n'a pas de champ "isValid",
    //        la simple présence d'un token indique un accès Gmail configuré.
    const googleToken = await db.googleToken.findFirst({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: { id: true, googleEmail: true }
    });

    if (googleToken) {
      return res.json({
        provider: 'gmail',
        email: googleToken.googleEmail || emailAccount?.emailAddress || null
      });
    }

    // ─── 3. Fallback: EmailAccount avec mot de passe chiffré → Yandex ───
    if (emailAccount?.encryptedPassword) {
      return res.json({
        provider: 'yandex',
        email: emailAccount.emailAddress
      });
    }

    // ─── 4. Aucun provider configuré ───
    return res.json({
      provider: 'none',
      email: null
    });

  } catch (error) {
    console.error('❌ [MAIL-PROVIDER] Erreur détection provider:', error);
    return res.status(500).json({
      error: 'Erreur lors de la détection du fournisseur de messagerie',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;

/**
 * ============================================================
 *  ROUTE: /api/mail/provider
 * ============================================================
 *
 *  Retourne le fournisseur de messagerie de l'utilisateur connecté.
 *
 *  Logique :
 *    - Postal (@zhiive.com) est TOUJOURS le provider principal.
 *    - Auto-provisionne le compte Postal si nécessaire.
 *    - Les comptes externes (Gmail, Outlook, etc.) sont secondaires.
 *
 *  Réponse : { provider: "postal", email: "prenom.nom@zhiive.com" }
 * ============================================================
 */

import { Router } from 'express';
import crypto from 'crypto';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { db } from '../lib/database.js';

const router = Router();

/**
 * Génère l'adresse email Zhiive à partir du prénom/nom.
 * Format: prenom.nom@zhiive.com (normalisé: sans accents, minuscules)
 */
function generateZhiiveEmail(firstName?: string | null, lastName?: string | null, fallbackEmail?: string): string {
  if (firstName && lastName) {
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    return `${normalize(firstName)}.${normalize(lastName)}@zhiive.com`;
  }
  // Fallback: utiliser la partie locale du login email
  if (fallbackEmail) {
    const local = fallbackEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '');
    return `${local}@zhiive.com`;
  }
  return 'user@zhiive.com';
}

/**
 * @route   GET /api/mail/provider
 * @desc    Retourne le fournisseur de messagerie de l'utilisateur connecté.
 *          La boîte Zhiive (@zhiive.com) est TOUJOURS le provider principal.
 *          Auto-provisionne le compte Postal si nécessaire.
 * @access  Private (authentifié)
 */
router.get('/provider', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const organizationId = req.user?.organizationId;

    // ─── 1. Récupérer le user pour générer l'email Zhiive ───
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, organizationId: true }
    });

    // ─── 2. Récupérer ou créer l'EmailAccount Postal ───
    let emailAccount = await db.emailAccount.findUnique({
      where: { userId },
      select: { id: true, mailProvider: true, emailAddress: true }
    });

    const zhiiveEmail = generateZhiiveEmail(user?.firstName, user?.lastName, user?.email);

    if (!emailAccount) {
      // Auto-provisionnement : créer le compte Postal Zhiive
      const orgId = organizationId || user?.organizationId;
      if (orgId) {
        emailAccount = await db.emailAccount.create({
          data: {
            id: crypto.randomUUID(),
            emailAddress: zhiiveEmail,
            encryptedPassword: '', // Postal n'a pas besoin de mot de passe utilisateur
            mailProvider: 'postal',
            userId,
            organizationId: orgId,
            updatedAt: new Date(),
          },
          select: { id: true, mailProvider: true, emailAddress: true }
        });
        console.log(`📬 [MAIL-PROVIDER] Auto-provisionnement Zhiive: ${zhiiveEmail}`);
      }
    } else if (emailAccount.mailProvider === 'gmail' || emailAccount.mailProvider === 'none') {
      // Migration: les anciens comptes "gmail" sans Google tokens → passer en postal
      await db.emailAccount.update({
        where: { userId },
        data: {
          mailProvider: 'postal',
          emailAddress: emailAccount.emailAddress || zhiiveEmail,
          updatedAt: new Date(),
        }
      });
      emailAccount = { ...emailAccount, mailProvider: 'postal', emailAddress: emailAccount.emailAddress || zhiiveEmail };
      console.log(`🔄 [MAIL-PROVIDER] Migration vers Postal: ${emailAccount.emailAddress}`);
    }

    // ─── 3. Réponse : toujours Postal comme provider principal ───
    return res.json({
      provider: 'postal',
      email: emailAccount?.emailAddress || zhiiveEmail,
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

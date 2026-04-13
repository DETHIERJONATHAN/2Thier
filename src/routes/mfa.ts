/**
 * Routes 2FA/MFA — TOTP avec Google Authenticator, Authy, etc.
 * Flux: setup → verify enroll → enable → login verify
 */
import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db } from '../lib/database';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';

const router = express.Router();
router.use(authMiddleware as express.RequestHandler);

const APP_NAME = 'Zhiive';
// Nombre de codes de secours générés à l'activation
const BACKUP_CODES_COUNT = 8;

// Générer des codes de secours aléatoires (format: XXXX-XXXX)
function generateBackupCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    plain.push(formatted);
    hashed.push(bcrypt.hashSync(formatted, 10));
  }
  return { plain, hashed };
}

/**
 * GET /api/mfa/setup
 * Génère un secret TOTP et retourne le QR code (data URI).
 * Ne sauvegarde pas encore en DB (attendre confirm).
 */
router.get('/setup', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, mfaEnabled: true } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    if (user.mfaEnabled) {
      return res.status(400).json({ error: '2FA déjà activé. Désactivez-le d\'abord.' });
    }

    const secretObj = speakeasy.generateSecret({ length: 20, name: `${APP_NAME} (${user.email})`, issuer: APP_NAME });
    const secret = secretObj.base32;
    const qrDataUrl = await QRCode.toDataURL(secretObj.otpauth_url ?? '');

    // Stocker temporairement en session (pas en DB avant confirmation)
    (req.session as Record<string, unknown>).mfaSetupSecret = secret;

    res.json({ secret, qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la configuration 2FA' });
  }
});

/**
 * POST /api/mfa/enable
 * Body: { token: string } — code TOTP de confirmation
 * Active le 2FA en DB et retourne les codes de secours.
 */
router.post('/enable', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'Code TOTP requis' });

    const secret = (req.session as Record<string, unknown>).mfaSetupSecret as string | undefined;
    if (!secret) return res.status(400).json({ error: 'Session expirée. Recommencez la configuration.' });

    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!isValid) return res.status(400).json({ error: 'Code TOTP invalide ou expiré' });

    const { plain, hashed } = generateBackupCodes();

    await db.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: true, mfaBackupCodes: hashed },
    });

    // Nettoyer le secret temporaire de session
    delete (req.session as Record<string, unknown>).mfaSetupSecret;

    res.json({ success: true, backupCodes: plain, message: '2FA activé avec succès. Sauvegardez vos codes de secours.' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de l\'activation 2FA' });
  }
});

/**
 * POST /api/mfa/disable
 * Body: { token: string } — code TOTP pour confirmer la désactivation
 */
router.post('/disable', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'Code TOTP ou code de secours requis' });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ error: '2FA non activé sur ce compte' });
    }

    // Vérifier via TOTP ou backup code
    const isValidTotp = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token, window: 1 });
    const matchedBackup = !isValidTotp && user.mfaBackupCodes.some(h => bcrypt.compareSync(token, h));

    if (!isValidTotp && !matchedBackup) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    await db.user.update({
      where: { id: userId },
      data: { mfaSecret: null, mfaEnabled: false, mfaBackupCodes: [] },
    });

    res.json({ success: true, message: '2FA désactivé' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la désactivation 2FA' });
  }
});

/**
 * POST /api/mfa/verify
 * Body: { token: string } — vérification durant le flux de connexion
 * (appelé depuis AuthProvider après login si mfaRequired: true)
 */
router.post('/verify', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'Code requis' });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ error: '2FA non activé' });
    }

    // Vérifier TOTP
    const isValidTotp = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token, window: 1 });

    // Vérifier backup code (usage unique)
    let usedBackupIndex = -1;
    if (!isValidTotp) {
      usedBackupIndex = user.mfaBackupCodes.findIndex(h => bcrypt.compareSync(token, h));
    }

    if (!isValidTotp && usedBackupIndex === -1) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    // Consommer le backup code s'il a été utilisé
    if (usedBackupIndex !== -1) {
      const updatedCodes = [...user.mfaBackupCodes];
      updatedCodes.splice(usedBackupIndex, 1);
      await db.user.update({ where: { id: userId }, data: { mfaBackupCodes: updatedCodes } });
    }

    // Marquer la session comme MFA vérifié
    (req.session as Record<string, unknown>).mfaVerified = true;

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la vérification 2FA' });
  }
});

/**
 * GET /api/mfa/status
 * Retourne l'état 2FA de l'utilisateur courant
 */
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaBackupCodes: true },
    });

    res.json({
      mfaEnabled: user?.mfaEnabled ?? false,
      backupCodesRemaining: user?.mfaBackupCodes?.length ?? 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;

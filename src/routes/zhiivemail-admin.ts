/**
 * ============================================================
 *  ROUTES ADMIN ZHIIVEMAIL — /api/zhiivemail/*
 * ============================================================
 *
 *  Interface d'administration pour le système email Zhiive.
 *  Gère :
 *    - Configuration SMTP globale (envoi via One.com / Postal)
 *    - Provisionnement des boîtes @zhiive.com par utilisateur
 *    - Configuration de boîtes externes (IMAP/SMTP perso)
 *    - Statut et diagnostics du système email
 *    - Test d'envoi SMTP
 *
 *  Accès : Super Admin uniquement.
 * ============================================================
 */

import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { db } from '../lib/database.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = Router();

// ─── Middleware Super Admin ─────────────────────────────────
function requireSuperAdmin(req: AuthenticatedRequest, res: any, next: any) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès réservé aux Super Admins' });
  }
  next();
}

// ─── Helper: Générer email Zhiive ───────────────────────────
function generateZhiiveEmail(firstName?: string | null, lastName?: string | null, fallbackEmail?: string): string {
  if (firstName && lastName) {
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    return `${normalize(firstName)}.${normalize(lastName)}@zhiive.com`;
  }
  if (fallbackEmail) {
    const local = fallbackEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '');
    return `${local}@zhiive.com`;
  }
  return 'user@zhiive.com';
}

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/status
//  Vue globale du système email : config SMTP, nb comptes, etc.
// ═════════════════════════════════════════════════════════════
router.get('/status', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const smtpHost = process.env.SMTP_HOST || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER || '';
    const smtpConfigured = !!(smtpHost && smtpUser);

    const postalUrl = process.env.POSTAL_API_URL || '';
    const postalKey = process.env.POSTAL_API_KEY || '';
    const postalConfigured = !!(postalUrl && postalKey);

    // Stats comptes
    const totalAccounts = await db.emailAccount.count();
    const postalAccounts = await db.emailAccount.count({ where: { mailProvider: 'postal' } });
    const gmailAccounts = await db.emailAccount.count({ where: { mailProvider: 'gmail' } });
    const totalEmails = await db.email.count();

    res.json({
      smtp: {
        configured: smtpConfigured,
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        from: process.env.SMTP_FROM || smtpUser,
      },
      postal: {
        configured: postalConfigured,
        url: postalUrl || null,
      },
      stats: {
        totalAccounts,
        postalAccounts,
        gmailAccounts,
        totalEmails,
      },
      mode: postalConfigured ? 'postal-api' : smtpConfigured ? 'smtp' : 'non-configuré',
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur status:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/test-smtp
//  Teste la connexion SMTP en envoyant un email test.
// ═════════════════════════════════════════════════════════════
router.post('/test-smtp', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { to } = req.body;
  const recipient = to || req.user?.email || process.env.SMTP_USER;

  if (!recipient) {
    return res.status(400).json({ error: 'Destinataire requis' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Configuration SMTP manquante (SMTP_HOST, SMTP_USER, SMTP_PASS)' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Vérifier la connexion
    await transporter.verify();

    // Envoyer un test
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: recipient,
      subject: '✅ Test ZhiiveMail - Connexion SMTP OK',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #6C5CE7;">🐝 ZhiiveMail - Test SMTP</h2>
          <p>La connexion SMTP fonctionne correctement.</p>
          <ul>
            <li><strong>Serveur:</strong> ${smtpHost}:${smtpPort}</li>
            <li><strong>Expéditeur:</strong> ${process.env.SMTP_FROM || smtpUser}</li>
            <li><strong>Date:</strong> ${new Date().toLocaleString('fr-BE')}</li>
          </ul>
          <p style="color: #65676b; font-size: 12px;">Ce message a été envoyé depuis l'interface d'administration ZhiiveMail.</p>
        </div>
      `,
    });

    console.log(`✅ [ZHIIVEMAIL] Test SMTP réussi → ${recipient} (messageId: ${info.messageId})`);

    res.json({
      success: true,
      messageId: info.messageId,
      recipient,
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Test SMTP échoué:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur SMTP inconnue',
    });
  }
});

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/accounts
//  Liste tous les comptes email Zhiive (avec info user).
// ═════════════════════════════════════════════════════════════
router.get('/accounts', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const accounts = await db.emailAccount.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(accounts);
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur liste comptes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des comptes' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/provision
//  Provisionne un compte @zhiive.com pour un utilisateur.
// ═════════════════════════════════════════════════════════════
router.post('/provision', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier s'il a déjà un compte
    const existing = await db.emailAccount.findUnique({ where: { userId } });
    if (existing) {
      return res.status(400).json({ error: 'Cet utilisateur a déjà un compte email', account: existing });
    }

    const zhiiveEmail = generateZhiiveEmail(user.firstName, user.lastName, user.email);

    const account = await db.emailAccount.create({
      data: {
        id: crypto.randomUUID(),
        emailAddress: zhiiveEmail,
        encryptedPassword: '',
        mailProvider: 'postal',
        userId: user.id,
        organizationId: user.organizationId || '',
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      }
    });

    console.log(`📬 [ZHIIVEMAIL] Compte provisionné: ${zhiiveEmail} pour ${user.firstName} ${user.lastName}`);

    res.json({ success: true, account });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur provisionnement:', error);
    res.status(500).json({ error: 'Erreur lors du provisionnement' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/provision-all
//  Provisionne les comptes @zhiive.com pour TOUS les users
//  qui n'en ont pas encore.
// ═════════════════════════════════════════════════════════════
router.post('/provision-all', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // Récupérer tous les users sans EmailAccount
    const usersWithoutEmail = await db.user.findMany({
      where: {
        emailAccounts: { none: {} }
      },
      select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
    });

    let created = 0;
    const results: Array<{ userId: string; email: string; status: string }> = [];

    for (const user of usersWithoutEmail) {
      try {
        const zhiiveEmail = generateZhiiveEmail(user.firstName, user.lastName, user.email);
        await db.emailAccount.create({
          data: {
            id: crypto.randomUUID(),
            emailAddress: zhiiveEmail,
            encryptedPassword: '',
            mailProvider: 'postal',
            userId: user.id,
            organizationId: user.organizationId || '',
            updatedAt: new Date(),
          }
        });
        results.push({ userId: user.id, email: zhiiveEmail, status: 'created' });
        created++;
      } catch (e) {
        results.push({ userId: user.id, email: user.email || '', status: 'error' });
      }
    }

    console.log(`📬 [ZHIIVEMAIL] Provisionnement en masse: ${created}/${usersWithoutEmail.length} créés`);

    res.json({
      success: true,
      total: usersWithoutEmail.length,
      created,
      results,
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur provisionnement masse:', error);
    res.status(500).json({ error: 'Erreur lors du provisionnement en masse' });
  }
});

// ═════════════════════════════════════════════════════════════
//  DELETE /api/zhiivemail/accounts/:id
//  Supprime un compte email.
// ═════════════════════════════════════════════════════════════
router.delete('/accounts/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    await db.emailAccount.delete({ where: { id } });
    console.log(`🗑️ [ZHIIVEMAIL] Compte supprimé: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ═════════════════════════════════════════════════════════════
//  PATCH /api/zhiivemail/accounts/:id
//  Modifie un compte email (adresse, provider).
// ═════════════════════════════════════════════════════════════
router.patch('/accounts/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { emailAddress, mailProvider } = req.body;

  try {
    const updated = await db.emailAccount.update({
      where: { id },
      data: {
        ...(emailAddress && { emailAddress }),
        ...(mailProvider && { mailProvider }),
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      }
    });

    console.log(`✏️ [ZHIIVEMAIL] Compte mis à jour: ${updated.emailAddress}`);
    res.json({ success: true, account: updated });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur mise à jour:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

export default router;

/**
 * ============================================================
 *  ROUTES POSTAL MAIL — /api/postal/*
 * ============================================================
 *
 *  API complète pour la messagerie via Postal (self-hosted).
 *  Fournisseur natif @zhiive.com — pas besoin de mot de passe
 *  utilisateur, tout passe par l'API Postal côté serveur.
 *
 *  Routes :
 *    POST /api/postal/send         → Envoyer un email
 *    POST /api/postal/sync         → Sync manuelle (no-op, les emails arrivent par webhook)
 *    POST /api/postal/test         → Tester la connexion Postal
 *    GET  /api/postal/emails       → Lister les emails depuis la DB
 *    GET  /api/postal/emails/:id   → Récupérer un email par ID
 *    DELETE /api/postal/emails/:id → Supprimer un email
 *    POST /api/postal/emails/:id/star → Toggle étoile
 *    POST /api/postal/emails/:id/read → Marquer lu/non lu
 *    GET  /api/postal/folders      → Liste des dossiers
 *    POST /api/postal/inbound      → Webhook réception (appelé par Postal)
 * ============================================================
 */

import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { db } from '../lib/database.js';
import { getPostalService } from '../services/PostalEmailService.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// ─── Vérifie si Postal API est configuré ────────────────────
function isPostalApiConfigured(): boolean {
  return !!(process.env.POSTAL_API_URL && process.env.POSTAL_API_KEY);
}

// ─── SMTP Transporter (fallback si Postal API non configuré) ──
function getSmtpTransporter() {
  // Si POSTAL_SMTP_HOST est configuré, utiliser le SMTP Postal
  const host = process.env.POSTAL_SMTP_HOST || process.env.SMTP_HOST || 'send.one.com';
  const port = parseInt(process.env.POSTAL_SMTP_PORT || process.env.SMTP_PORT || '465', 10);

  // SMTP Postal (port 25) n'a pas besoin d'auth — les credentials sont optionnels
  if (host.includes('postal') && port === 25) {
    return nodemailer.createTransport({
      host,
      port,
      secure: false,
      tls: { rejectUnauthorized: false },
    });
  }

  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    throw new Error('Configuration SMTP manquante: SMTP_USER et SMTP_PASS requis');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const router = Router();

// ─────────────────────────────────────────────────────────────
//  POST /api/postal/send
//  Envoie un email via Postal.
//  Body: { to, subject, body, isHtml?, cc?, bcc?, replyTo? }
// ─────────────────────────────────────────────────────────────
router.post('/send', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { to, subject, body, isHtml = false, cc, bcc, replyTo } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Destinataire (to), sujet (subject) et message (body) requis' });
  }

  try {
    // Récupérer l'adresse email de l'utilisateur
    const emailAccount = await db.emailAccount.findUnique({
      where: { userId: req.user.userId },
      select: { emailAddress: true, mailProvider: true },
    });

    if (!emailAccount) {
      return res.status(400).json({ error: 'Aucun compte email configuré pour cet utilisateur' });
    }

    const fromEmail = emailAccount.emailAddress;
    let messageId: string | undefined;

    // ─── Priorité 1 : API Postal (recommandé) ───
    if (isPostalApiConfigured()) {
      console.log(`📤 [POSTAL] Envoi email de ${fromEmail} vers ${to} (via API Postal)`);
      const postal = getPostalService();
      const result = await postal.sendEmail({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        body,
        isHtml: isHtml || (body.includes('<') && body.includes('>')),
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        replyTo,
      });
      messageId = result.message_id;
    }
    // ─── Priorité 2 : SMTP Postal (port 25) ───
    else {
      console.log(`📤 [POSTAL] Envoi email de ${fromEmail} vers ${to} (via SMTP)`);
      const transporter = getSmtpTransporter();

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${fromEmail}" <${fromEmail}>`,
        replyTo: replyTo || fromEmail,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        ...(isHtml ? { html: body } : { text: body }),
      };

      if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
      if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;

      const info = await transporter.sendMail(mailOptions);
      messageId = info.messageId;
    }

    // Sauvegarder l'email envoyé dans la DB
    await db.email.create({
      data: {
        id: crypto.randomUUID(),
        userId: req.user.userId,
        from: fromEmail,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        body,
        contentType: isHtml ? 'text/html' : 'text/plain',
        folder: 'sent',
        isRead: true,
        isStarred: false,
        uid: messageId || null,
      },
    });

    console.log(`✅ [POSTAL] Email envoyé (messageId: ${messageId})`);

    res.json({
      success: true,
      message: 'Email envoyé avec succès',
      messageId,
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur envoi:', error);
    res.status(500).json({
      error: "Erreur lors de l'envoi de l'email",
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/postal/sync
//  Sync manuelle — avec Postal les emails arrivent par webhook,
//  donc c'est un no-op mais on garde l'endpoint pour cohérence.
// ─────────────────────────────────────────────────────────────
router.post('/sync', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    // Compter les emails existants pour l'utilisateur
    const emailCount = await db.email.count({
      where: { userId: req.user.userId },
    });

    res.json({
      success: true,
      message: 'Postal utilise des webhooks en temps réel — pas de synchronisation nécessaire',
      emailCount,
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur sync:', error);
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/postal/test
//  Teste la connexion au serveur Postal.
// ─────────────────────────────────────────────────────────────
router.post('/test', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const emailAccount = await db.emailAccount.findUnique({
      where: { userId: req.user.userId },
      select: { emailAddress: true, mailProvider: true },
    });

    // Test connexion — API Postal en priorité, SMTP en fallback
    let isConnected = false;
    let method = '';
    try {
      if (isPostalApiConfigured()) {
        const postal = getPostalService();
        isConnected = await postal.testConnection();
        method = 'API Postal';
      } else {
        const transporter = getSmtpTransporter();
        await transporter.verify();
        isConnected = true;
        method = 'SMTP';
      }
    } catch (e) {
      console.warn(`⚠️ [POSTAL] Test connexion failed:`, e);
    }

    console.log(`${isConnected ? '✅' : '❌'} [POSTAL] Test connexion ${method}: ${isConnected ? 'SUCCESS' : 'FAILED'}`);

    res.json({
      success: isConnected,
      message: isConnected
        ? `Connexion ${method} réussie`
        : `Échec de la connexion — vérifiez POSTAL_API_URL/POSTAL_API_KEY`,
      emailAddress: emailAccount?.emailAddress || null,
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur test:', error);
    res.status(500).json({
      error: 'Erreur lors du test de connexion',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/postal/emails
//  Liste les emails de l'utilisateur depuis la DB.
//  Query: ?folder=inbox&maxResults=25&page=1&q=recherche
// ─────────────────────────────────────────────────────────────
router.get('/emails', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const {
      folder = 'inbox',
      maxResults = '25',
      page = '1',
      q,
    } = req.query as Record<string, string>;

    const take = Math.min(parseInt(maxResults, 10) || 25, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    // Construction du filtre
    const where: Record<string, unknown> = {
      userId: req.user.userId,
    };

    if (folder === 'starred') {
      where.isStarred = true;
    } else {
      const folderMap: Record<string, string> = {
        inbox: 'inbox',
        sent: 'sent',
        drafts: 'drafts',
        trash: 'trash',
        spam: 'spam',
      };
      where.folder = folderMap[folder] || folder;
    }

    // Recherche textuelle
    if (q) {
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { from: { contains: q, mode: 'insensitive' } },
        { to: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [emails, totalCount] = await Promise.all([
      db.email.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          from: true,
          to: true,
          subject: true,
          body: true,
          folder: true,
          isRead: true,
          isStarred: true,
          contentType: true,
          createdAt: true,
        },
      }),
      db.email.count({ where }),
    ]);

    // Format compatible avec FormattedGmailMessage (cohérence frontend)
    const formattedEmails = emails.map((email) => ({
      id: email.id,
      snippet: email.body?.substring(0, 200)?.replace(/<[^>]*>/g, '') || '',
      subject: email.subject || 'Sans sujet',
      from: email.from || '',
      to: email.to || '',
      timestamp: email.createdAt.toISOString(),
      isRead: email.isRead,
      isStarred: email.isStarred,
      hasAttachments: false,
      labels: [email.folder.toUpperCase()],
      htmlBody: email.contentType === 'text/html' ? email.body : undefined,
    }));

    res.json({
      messages: formattedEmails,
      totalCount,
      hasMore: skip + take < totalCount,
      page: parseInt(page, 10) || 1,
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur listing emails:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des emails',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/postal/emails/:id
//  Récupère un email unique par son ID.
// ─────────────────────────────────────────────────────────────
router.get('/emails/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const email = await db.email.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    // Marquer comme lu
    if (!email.isRead) {
      await db.email.update({
        where: { id: email.id },
        data: { isRead: true },
      });
    }

    res.json({
      id: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      body: email.body,
      contentType: email.contentType,
      folder: email.folder,
      isRead: true,
      isStarred: email.isStarred,
      createdAt: email.createdAt,
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur récupération email:', error);
    res.status(500).json({
      error: "Erreur lors de la récupération de l'email",
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  DELETE /api/postal/emails/:id
//  Supprime un email (corbeille puis définitif).
// ─────────────────────────────────────────────────────────────
router.delete('/emails/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const email = await db.email.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    if (email.folder === 'trash') {
      await db.email.delete({ where: { id: email.id } });
      return res.json({ success: true, message: 'Email supprimé définitivement' });
    }

    await db.email.update({
      where: { id: email.id },
      data: { folder: 'trash' },
    });

    res.json({ success: true, message: 'Email déplacé dans la corbeille' });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur suppression email:', error);
    res.status(500).json({
      error: "Erreur lors de la suppression de l'email",
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/postal/emails/:id/star
//  Toggle l'étoile (favori) sur un email.
// ─────────────────────────────────────────────────────────────
router.post('/emails/:id/star', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const email = await db.email.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    const updated = await db.email.update({
      where: { id: email.id },
      data: { isStarred: !email.isStarred },
    });

    res.json({
      success: true,
      isStarred: updated.isStarred,
      message: updated.isStarred ? 'Email ajouté aux favoris' : 'Email retiré des favoris',
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur toggle star:', error);
    res.status(500).json({
      error: 'Erreur lors de la modification du favori',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/postal/emails/:id/read
//  Marquer un email comme lu ou non lu.
//  Body: { isRead: boolean }
// ─────────────────────────────────────────────────────────────
router.post('/emails/:id/read', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const { isRead } = req.body;
    const email = await db.email.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    const updated = await db.email.update({
      where: { id: email.id },
      data: { isRead: isRead !== undefined ? isRead : !email.isRead },
    });

    res.json({
      success: true,
      isRead: updated.isRead,
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur toggle read:', error);
    res.status(500).json({
      error: "Erreur lors de la modification de l'état de lecture",
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/postal/folders
//  Retourne la liste des dossiers disponibles.
// ─────────────────────────────────────────────────────────────
router.get('/folders', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const folders = [
      { id: 'INBOX', name: 'Boîte de réception', type: 'system' },
      { id: 'SENT', name: 'Messages envoyés', type: 'system' },
      { id: 'DRAFT', name: 'Brouillons', type: 'system' },
      { id: 'STARRED', name: 'Messages suivis', type: 'system' },
      { id: 'TRASH', name: 'Corbeille', type: 'system' },
      { id: 'SPAM', name: 'Courriers indésirables', type: 'system' },
    ];

    const unreadCount = await db.email.count({
      where: {
        userId: req.user.userId,
        folder: 'inbox',
        isRead: false,
      },
    });

    (folders[0] as Record<string, unknown>).messagesUnread = unreadCount;

    res.json(folders);
  } catch (error) {
    console.error('❌ [POSTAL] Erreur listing dossiers:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des dossiers',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/postal/inbound
//  Webhook appelé par Postal quand un email arrive.
//  PAS d'authentification utilisateur — sécurisé par HMAC.
// ─────────────────────────────────────────────────────────────
router.post('/inbound', async (req, res) => {
  try {
    // Vérifier la signature du webhook si un secret est configuré
    const webhookSecret = process.env.POSTAL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-postal-signature'] as string;
      if (!signature) {
        console.warn('⚠️ [POSTAL] Webhook sans signature — rejeté');
        return res.status(401).json({ error: 'Signature manquante' });
      }

      const bodyString = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyString)
        .digest('hex');

      if (!crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )) {
        console.warn('⚠️ [POSTAL] Signature webhook invalide — rejeté');
        return res.status(401).json({ error: 'Signature invalide' });
      }
    }

    const payload = req.body;
    console.log(`📥 [POSTAL] Webhook reçu: ${payload.subject || 'no subject'} de ${payload.mail_from}`);

    const postal = getPostalService();
    const emailId = await postal.processInboundEmail(payload);

    res.json({
      success: true,
      emailId,
    });
  } catch (error) {
    console.error('❌ [POSTAL] Erreur webhook inbound:', error);
    // On retourne 200 quand même pour que Postal ne réessaie pas indéfiniment
    res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
});

export default router;

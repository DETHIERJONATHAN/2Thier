/**
 * ============================================================
 *  ROUTES YANDEX MAIL — /api/yandex/*
 * ============================================================
 *
 *  Fournit une API complète pour la messagerie Yandex, permettant
 *  aux utilisateurs dont le fournisseur est "yandex" d'envoyer,
 *  recevoir et gérer leurs emails depuis le CRM.
 *
 *  Architecture :
 *    - Les emails sont synchronisés depuis IMAP Yandex → base de données.
 *    - Le frontend lit ensuite la DB pour afficher les emails (rapide).
 *    - L'envoi passe par SMTP Yandex.
 *    - Le mot de passe Yandex est stocké chiffré dans EmailAccount.encryptedPassword.
 *
 *  Routes :
 *    POST /api/yandex/setup     → Configurer les identifiants Yandex
 *    POST /api/yandex/sync      → Synchroniser les emails depuis IMAP
 *    POST /api/yandex/send      → Envoyer un email (utilise le mdp stocké)
 *    POST /api/yandex/test      → Tester la connexion Yandex
 *    GET  /api/yandex/emails    → Lister les emails depuis la DB
 *    GET  /api/yandex/emails/:id → Récupérer un email par son ID
 *    DELETE /api/yandex/emails/:id → Supprimer un email
 *    POST /api/yandex/emails/:id/star → Toggle étoile (favori)
 *    GET  /api/yandex/folders   → Liste des dossiers disponibles
 * ============================================================
 */

import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { YandexMailService } from '../services/YandexMailService.js';
import { db } from '../lib/database.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
//  Utilitaire : récupère le service Yandex pour un utilisateur
//  en utilisant le mot de passe chiffré stocké en base.
// ─────────────────────────────────────────────────────────────
async function getYandexServiceForUser(userId: string): Promise<{ service: YandexMailService; emailAddress: string }> {
  const emailAccount = await db.emailAccount.findUnique({
    where: { userId }
  });

  if (!emailAccount) {
    throw new Error('Aucun compte email trouvé pour cet utilisateur');
  }

  if (!emailAccount.encryptedPassword) {
    throw new Error('Mot de passe email non configuré. Configurez d\'abord votre mot de passe Yandex.');
  }

  const decryptedPassword = decrypt(emailAccount.encryptedPassword);
  const service = new YandexMailService(emailAccount.emailAddress, decryptedPassword);

  return { service, emailAddress: emailAccount.emailAddress };
}

// ─────────────────────────────────────────────────────────────
//  POST /api/yandex/setup
//  Configure les identifiants Yandex pour l'utilisateur.
//  Body: { password: string }
// ─────────────────────────────────────────────────────────────
router.post('/setup', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Mot de passe Yandex requis' });
  }

  try {
    // Récupérer le compte email de l'utilisateur
    const emailAccount = await db.emailAccount.findUnique({
      where: { userId: req.user.userId }
    });

    if (!emailAccount) {
      return res.status(404).json({ error: 'Aucun compte email trouvé. Créez d\'abord un compte email.' });
    }

    console.log(`🔐 [YANDEX] Configuration pour ${emailAccount.emailAddress}`);

    // Tester la connexion avec le mot de passe fourni
    const yandexService = new YandexMailService(emailAccount.emailAddress, password);
    const connectionTest = await yandexService.testConnection();

    if (!connectionTest) {
      return res.status(400).json({
        error: 'Impossible de se connecter à Yandex avec ces identifiants',
        details: 'Vérifiez votre mot de passe Yandex'
      });
    }

    // Chiffrer et sauvegarder le mot de passe + marquer le provider comme "yandex"
    const encryptedPassword = encrypt(password);
    await db.emailAccount.update({
      where: { userId: req.user.userId },
      data: {
        encryptedPassword,
        mailProvider: 'yandex'
      }
    });

    console.log(`✅ [YANDEX] Configuration réussie pour ${emailAccount.emailAddress}`);

    res.json({
      success: true,
      message: 'Configuration Yandex réussie',
      emailAddress: emailAccount.emailAddress
    });

  } catch (error) {
    console.error('❌ [YANDEX] Erreur configuration:', error);
    res.status(500).json({
      error: 'Erreur lors de la configuration Yandex',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/yandex/sync
//  Synchronise les emails depuis IMAP Yandex vers la DB.
//  Query: ?folder=INBOX (optionnel, défaut: INBOX)
// ─────────────────────────────────────────────────────────────
router.post('/sync', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const folder = (req.query.folder as string) || 'INBOX';
    const { service, emailAddress } = await getYandexServiceForUser(req.user.userId);

    console.log(`🔄 [YANDEX] Début synchronisation pour ${emailAddress} — dossier: ${folder}`);

    const emailCount = await service.syncEmails(req.user.userId, folder);

    console.log(`✅ [YANDEX] Synchronisation terminée: ${emailCount} emails`);

    res.json({
      success: true,
      message: `Synchronisation réussie: ${emailCount} emails récupérés`,
      emailCount
    });

  } catch (error) {
    console.error('❌ [YANDEX] Erreur synchronisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la synchronisation',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/yandex/send
//  Envoie un email via SMTP Yandex.
//  ✅ Utilise le mot de passe stocké en base (plus besoin de
//     l'envoyer dans le body !)
//  Body: { to, subject, body, isHtml?, cc?, bcc? }
// ─────────────────────────────────────────────────────────────
router.post('/send', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { to, subject, body, isHtml = false } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Destinataire (to), sujet (subject) et message (body) requis' });
  }

  try {
    // ✅ On récupère le mot de passe stocké et chiffré — plus de password dans le body
    const { service, emailAddress } = await getYandexServiceForUser(req.user.userId);

    console.log(`📤 [YANDEX] Envoi email de ${emailAddress} vers ${to}`);

    await service.sendEmail(to, subject, body, isHtml);

    // Sauvegarder l'email envoyé dans la base pour traçabilité
    await db.email.create({
      data: {
        userId: req.user.userId,
        from: emailAddress,
        to,
        subject,
        body,
        contentType: isHtml ? 'text/html' : 'text/plain',
        folder: 'sent',
        isRead: true,
        isStarred: false,
      }
    });

    console.log(`✅ [YANDEX] Email envoyé et sauvegardé`);

    res.json({
      success: true,
      message: 'Email envoyé avec succès'
    });

  } catch (error) {
    console.error('❌ [YANDEX] Erreur envoi:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi de l\'email',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/yandex/test
//  Teste la connexion Yandex avec le mot de passe stocké.
// ─────────────────────────────────────────────────────────────
router.post('/test', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const { service, emailAddress } = await getYandexServiceForUser(req.user.userId);

    console.log(`🔍 [YANDEX] Test connexion pour ${emailAddress}`);
    const isConnected = await service.testConnection();

    console.log(`${isConnected ? '✅' : '❌'} [YANDEX] Test connexion: ${isConnected ? 'SUCCESS' : 'FAILED'}`);

    res.json({
      success: isConnected,
      message: isConnected
        ? 'Connexion Yandex réussie'
        : 'Échec de la connexion Yandex — Vérifiez vos identifiants',
      emailAddress
    });

  } catch (error) {
    console.error('❌ [YANDEX] Erreur test:', error);
    res.status(500).json({
      error: 'Erreur lors du test de connexion',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/yandex/emails
//  Liste les emails de l'utilisateur depuis la DB (pas d'IMAP).
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
      q
    } = req.query as Record<string, string>;

    const take = Math.min(parseInt(maxResults, 10) || 25, 100); // Max 100 par page
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    // ─── Construction du filtre ───
    const where: Record<string, unknown> = {
      userId: req.user.userId,
    };

    // Dossier : mapper les noms standards
    const folderMap: Record<string, string> = {
      inbox: 'inbox',
      sent: 'sent',
      drafts: 'drafts',
      starred: undefined as unknown as string, // Géré via isStarred ci-dessous
      trash: 'trash',
      spam: 'spam',
    };

    if (folder === 'starred') {
      where.isStarred = true;
    } else {
      where.folder = folderMap[folder] || folder;
    }

    // Recherche textuelle (sujet, from, to, body)
    if (q) {
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { from: { contains: q, mode: 'insensitive' } },
        { to: { contains: q, mode: 'insensitive' } },
      ];
    }

    // ─── Requête ───
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
        }
      }),
      db.email.count({ where })
    ]);

    // ─── Formater les emails pour correspondre au format FormattedGmailMessage ───
    const formattedEmails = emails.map(email => ({
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
    console.error('❌ [YANDEX] Erreur listing emails:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des emails',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/yandex/emails/:id
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
        userId: req.user.userId, // Sécurité : l'utilisateur ne peut voir que ses propres emails
      }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    // Marquer automatiquement comme lu quand on l'ouvre
    if (!email.isRead) {
      await db.email.update({
        where: { id: email.id },
        data: { isRead: true }
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
    console.error('❌ [YANDEX] Erreur récupération email:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de l\'email',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  DELETE /api/yandex/emails/:id
//  Supprime un email (le déplace dans le dossier "trash").
// ─────────────────────────────────────────────────────────────
router.delete('/emails/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const email = await db.email.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    if (email.folder === 'trash') {
      // Si déjà dans la corbeille → suppression définitive
      await db.email.delete({ where: { id: email.id } });
      return res.json({ success: true, message: 'Email supprimé définitivement' });
    }

    // Sinon → déplacer dans la corbeille
    await db.email.update({
      where: { id: email.id },
      data: { folder: 'trash' }
    });

    res.json({ success: true, message: 'Email déplacé dans la corbeille' });

  } catch (error) {
    console.error('❌ [YANDEX] Erreur suppression email:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de l\'email',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/yandex/emails/:id/star
//  Toggle l'étoile (favori) sur un email.
// ─────────────────────────────────────────────────────────────
router.post('/emails/:id/star', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const email = await db.email.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    const updated = await db.email.update({
      where: { id: email.id },
      data: { isStarred: !email.isStarred }
    });

    res.json({
      success: true,
      isStarred: updated.isStarred,
      message: updated.isStarred ? 'Email ajouté aux favoris' : 'Email retiré des favoris'
    });

  } catch (error) {
    console.error('❌ [YANDEX] Erreur toggle star:', error);
    res.status(500).json({
      error: 'Erreur lors de la modification du favori',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/yandex/folders
//  Retourne la liste des dossiers Yandex disponibles.
//  (Dossiers standards — pas d'appel IMAP, purement local)
// ─────────────────────────────────────────────────────────────
router.get('/folders', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    // Dossiers standards Yandex (identiques à Gmail pour cohérence)
    const folders = [
      { id: 'INBOX',   name: 'Boîte de réception', type: 'system' },
      { id: 'SENT',    name: 'Messages envoyés',   type: 'system' },
      { id: 'DRAFT',   name: 'Brouillons',         type: 'system' },
      { id: 'STARRED', name: 'Messages suivis',    type: 'system' },
      { id: 'TRASH',   name: 'Corbeille',          type: 'system' },
      { id: 'SPAM',    name: 'Courriers indésirables', type: 'system' },
    ];

    // Compter les emails non lus dans la boîte de réception  
    const unreadCount = await db.email.count({
      where: {
        userId: req.user.userId,
        folder: 'inbox',
        isRead: false
      }
    });

    // Ajouter le compteur au dossier INBOX  
    folders[0] = { ...folders[0], messagesUnread: unreadCount } as typeof folders[0] & { messagesUnread: number };

    res.json(folders);

  } catch (error) {
    console.error('❌ [YANDEX] Erreur listing dossiers:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des dossiers',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;

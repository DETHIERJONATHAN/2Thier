import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { YandexMailService } from '../services/YandexMailService.js';
import prisma from '../prisma.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = Router();

/**
 * @route   POST /api/yandex/setup
 * @desc    Configure les identifiants Yandex pour l'utilisateur
 * @access  Private
 */
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
    const emailAccount = await prisma.emailAccount.findUnique({
      where: { userId: req.user.userId }
    });

    if (!emailAccount) {
      return res.status(404).json({ error: 'Aucun compte email trouvé' });
    }

    console.log(`🔐 [YANDEX] Configuration pour ${emailAccount.emailAddress}`);

    // Créer le service Yandex avec le mot de passe fourni
    const yandexService = new YandexMailService(emailAccount.emailAddress, password);

    // Tester la connexion
    const connectionTest = await yandexService.testConnection();
    
    if (!connectionTest) {
      return res.status(400).json({ 
        error: 'Impossible de se connecter à Yandex avec ces identifiants',
        details: 'Vérifiez votre mot de passe Yandex'
      });
    }

    // Chiffrer et sauvegarder le mot de passe avec encrypt() pour pouvoir le récupérer
    const encryptedPassword = encrypt(password);
    await prisma.emailAccount.update({
      where: { userId: req.user.userId },
      data: { encryptedPassword }
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

/**
 * @route   POST /api/yandex/sync
 * @desc    Synchronise les emails depuis Yandex avec le mot de passe sauvegardé
 * @access  Private
 */
router.post('/sync', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const emailAccount = await prisma.emailAccount.findUnique({
      where: { userId: req.user.userId }
    });

    if (!emailAccount) {
      return res.status(404).json({ error: 'Aucun compte email trouvé' });
    }

    if (!emailAccount.encryptedPassword) {
      return res.status(400).json({ error: 'Mot de passe email non configuré. Utilisez d\'abord la page "Mots de Passe Unifiés" pour configurer votre mot de passe.' });
    }

    console.log(`🔄 [YANDEX] Début synchronisation pour ${emailAccount.emailAddress}`);

    // Déchiffrer le mot de passe sauvegardé
    const decryptedPassword = decrypt(emailAccount.encryptedPassword);
    
    const yandexService = new YandexMailService(emailAccount.emailAddress, decryptedPassword);
    
    // Synchroniser la boîte de réception
    const emailCount = await yandexService.syncEmails(req.user.userId, 'INBOX');

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

/**
 * @route   POST /api/yandex/send
 * @desc    Envoie un email via Yandex
 * @access  Private
 */
router.post('/send', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { to, subject, body, password, isHtml = false } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Destinataire, sujet et message requis' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Mot de passe Yandex requis' });
  }

  try {
    const emailAccount = await prisma.emailAccount.findUnique({
      where: { userId: req.user.userId }
    });

    if (!emailAccount) {
      return res.status(404).json({ error: 'Aucun compte email trouvé' });
    }

    console.log(`📤 [YANDEX] Envoi email de ${emailAccount.emailAddress} vers ${to}`);

    const yandexService = new YandexMailService(emailAccount.emailAddress, password);
    await yandexService.sendEmail(to, subject, body, isHtml);

    // Sauvegarder l'email envoyé dans la base
    await prisma.email.create({
      data: {
        userId: req.user.userId,
        from: emailAccount.emailAddress,
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

/**
 * @route   POST /api/yandex/test
 * @desc    Test la connexion Yandex avec le mot de passe sauvegardé
 * @access  Private
 */
router.post('/test', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const emailAccount = await prisma.emailAccount.findUnique({
      where: { userId: req.user.userId }
    });

    if (!emailAccount) {
      return res.status(404).json({ error: 'Aucun compte email trouvé' });
    }

    if (!emailAccount.encryptedPassword) {
      return res.status(400).json({ error: 'Mot de passe email non configuré. Utilisez d\'abord la page "Mots de Passe Unifiés" pour configurer votre mot de passe.' });
    }

    console.log(`🔍 [YANDEX] Test connexion pour ${emailAccount.emailAddress}`);

    // Déchiffrer le mot de passe sauvegardé
    const decryptedPassword = decrypt(emailAccount.encryptedPassword);
    
    const yandexService = new YandexMailService(emailAccount.emailAddress, decryptedPassword);
    const isConnected = await yandexService.testConnection();

    console.log(`${isConnected ? '✅' : '❌'} [YANDEX] Test connexion: ${isConnected ? 'SUCCESS' : 'FAILED'}`);

    res.json({
      success: isConnected,
      message: isConnected 
        ? 'Connexion Yandex réussie' 
        : 'Échec de la connexion Yandex - Vérifiez vos identifiants',
      emailAddress: emailAccount.emailAddress
    });

  } catch (error) {
    console.error('❌ [YANDEX] Erreur test:', error);
    res.status(500).json({
      error: 'Erreur lors du test de connexion',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;

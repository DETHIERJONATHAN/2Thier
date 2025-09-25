import express from 'express';
import { authMiddleware, requireSuperAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';
import GoogleVoiceService from '../services/GoogleVoiceService.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = express.Router();

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware);

/**
 * GET /google-voice/config
 * Récupération de la configuration Google Voice
 */
router.get('/config', requireSuperAdmin, async (req, res) => {
  try {
    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config) {
      return res.json({
        configured: false,
        message: 'Google Voice non configuré'
      });
    }

    // Retourner la configuration sans les clés sensibles
    res.json({
      configured: true,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail,
      isActive: config.isActive,
      lastSync: config.lastSync,
      createdAt: config.createdAt
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la config Google Voice:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /google-voice/config
 * Configuration de Google Voice
 */
router.post('/config', requireSuperAdmin, async (req, res) => {
  try {
    const { privateKey, clientEmail, domain, delegatedUserEmail } = req.body;

    if (!privateKey || !clientEmail || !domain || !delegatedUserEmail) {
      return res.status(400).json({ 
        error: 'Tous les champs sont requis' 
      });
    }

    // Chiffrement des clés sensibles
    const encryptedPrivateKey = encrypt(privateKey);
    const encryptedClientEmail = encrypt(clientEmail);

    // Sauvegarde ou mise à jour de la configuration
    const config = await prisma.googleVoiceConfig.upsert({
      where: { organizationId: req.user!.organizationId },
      update: {
        encryptedPrivateKey,
        encryptedClientEmail,
        domain,
        delegatedUserEmail,
        isActive: true,
        lastSync: new Date()
      },
      create: {
        organizationId: req.user!.organizationId,
        encryptedPrivateKey,
        encryptedClientEmail,
        domain,
        delegatedUserEmail,
        isActive: true,
        lastSync: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Configuration Google Voice sauvegardée',
      configId: config.id
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la config Google Voice:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

/**
 * POST /google-voice/test-connection
 * Test de connexion à Google Voice
 */
router.post('/test-connection', requireSuperAdmin, async (req, res) => {
  try {
    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config) {
      return res.status(404).json({ 
        error: 'Configuration Google Voice non trouvée' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Test de connexion
    const result = await voiceService.testConnection();

    if (result.success) {
      // Mise à jour du statut
      await prisma.googleVoiceConfig.update({
        where: { id: config.id },
        data: { 
          isActive: true,
          lastSync: new Date()
        }
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur lors du test de connexion Google Voice:', error);
    res.status(500).json({ 
      error: 'Erreur lors du test de connexion',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /google-voice/users
 * Récupération des utilisateurs Google Voice
 */
router.get('/users', async (req, res) => {
  try {
    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré ou inactif' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Récupération des utilisateurs Voice
    const voiceUsers = await voiceService.getVoiceUsers();

    res.json({
      users: voiceUsers,
      count: voiceUsers.length,
      domain: config.domain
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs Voice:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /google-voice/assign-number
 * Attribution d'un numéro Google Voice à un utilisateur
 */
router.post('/assign-number', requireSuperAdmin, async (req, res) => {
  try {
    const { userEmail, phoneNumber } = req.body;

    if (!userEmail || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Email utilisateur et numéro de téléphone requis' 
      });
    }

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Attribution du numéro
    const success = await voiceService.assignPhoneNumber(userEmail, phoneNumber);

    if (success) {
      res.json({
        success: true,
        message: `Numéro ${phoneNumber} attribué à ${userEmail}`,
        userEmail,
        phoneNumber
      });
    } else {
      res.status(500).json({ 
        error: 'Échec de l\'attribution du numéro' 
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'attribution du numéro:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /google-voice/initialize-user
 * Initialisation Google Voice pour un utilisateur
 */
router.post('/initialize-user', requireSuperAdmin, async (req, res) => {
  try {
    const { userEmail, displayName } = req.body;

    if (!userEmail || !displayName) {
      return res.status(400).json({ 
        error: 'Email utilisateur et nom d\'affichage requis' 
      });
    }

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Initialisation Voice pour l'utilisateur
    const voiceUser = await voiceService.initializeVoiceForUser(userEmail, displayName);

    res.json({
      success: true,
      message: `Google Voice initialisé pour ${userEmail}`,
      voiceUser
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation Voice:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /google-voice/make-call
 * Initiation d'un appel Google Voice
 */
router.post('/make-call', async (req, res) => {
  try {
    const { fromNumber, toNumber } = req.body;

    if (!fromNumber || !toNumber) {
      return res.status(400).json({ 
        error: 'Numéros source et destination requis' 
      });
    }

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Initiation de l'appel
    const callRecord = await voiceService.makeCall(fromNumber, toNumber, req.user!.email);

    res.json({
      success: true,
      message: 'Appel initié',
      callRecord
    });
  } catch (error) {
    console.error('Erreur lors de l\'initiation de l\'appel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /google-voice/send-sms
 * Envoi d'un SMS via Google Voice
 */
router.post('/send-sms', async (req, res) => {
  try {
    const { fromNumber, toNumber, message } = req.body;

    if (!fromNumber || !toNumber || !message) {
      return res.status(400).json({ 
        error: 'Numéros source, destination et message requis' 
      });
    }

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Envoi du SMS
    const smsMessage = await voiceService.sendSMS(fromNumber, toNumber, message, req.user!.email);

    res.json({
      success: true,
      message: 'SMS envoyé',
      smsMessage
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /google-voice/call-history/:userEmail
 * Récupération de l'historique des appels
 */
router.get('/call-history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Récupération de l'historique
    const callHistory = await voiceService.getCallHistory(userEmail, limit);

    res.json({
      userEmail,
      calls: callHistory,
      count: callHistory.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /google-voice/sms-history/:userEmail
 * Récupération de l'historique des SMS
 */
router.get('/sms-history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Récupération de l'historique SMS
    const smsHistory = await voiceService.getSMSHistory(userEmail, limit);

    res.json({
      userEmail,
      messages: smsHistory,
      count: smsHistory.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique SMS:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /google-voice/settings/:userEmail
 * Mise à jour des paramètres Voice d'un utilisateur
 */
router.put('/settings/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const { voiceSettings, callForwarding } = req.body;

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Mise à jour des paramètres
    if (voiceSettings) {
      await voiceService.configureVoiceSettings(userEmail, voiceSettings);
    }

    if (callForwarding) {
      await voiceService.updateCallForwarding(userEmail, callForwarding);
    }

    res.json({
      success: true,
      message: `Paramètres mis à jour pour ${userEmail}`,
      userEmail,
      voiceSettings,
      callForwarding
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /google-voice/do-not-disturb
 * Activation/désactivation du mode Ne pas déranger
 */
router.post('/do-not-disturb', async (req, res) => {
  try {
    const { userEmail, enabled } = req.body;

    if (!userEmail || typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        error: 'Email utilisateur et statut enabled requis' 
      });
    }

    const config = await prisma.googleVoiceConfig.findFirst({
      where: { organizationId: req.user!.organizationId }
    });

    if (!config || !config.isActive) {
      return res.status(404).json({ 
        error: 'Google Voice non configuré' 
      });
    }

    // Déchiffrement des clés
    const privateKey = decrypt(config.encryptedPrivateKey);
    const clientEmail = decrypt(config.encryptedClientEmail);

    // Création du service Google Voice
    const voiceService = new GoogleVoiceService({
      privateKey,
      clientEmail,
      domain: config.domain,
      delegatedUserEmail: config.delegatedUserEmail
    });

    // Activation/désactivation du mode Ne pas déranger
    await voiceService.toggleDoNotDisturb(userEmail, enabled);

    res.json({
      success: true,
      message: `Mode Ne pas déranger ${enabled ? 'activé' : 'désactivé'} pour ${userEmail}`,
      userEmail,
      doNotDisturb: enabled
    });
  } catch (error) {
    console.error('Erreur lors de la modification du mode Ne pas déranger:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

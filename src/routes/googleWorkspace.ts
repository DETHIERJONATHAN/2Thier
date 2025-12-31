import { Router, type RequestHandler } from 'express';
import { type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { db } from '../lib/database';
import { z } from 'zod';
import { decrypt, encrypt } from '../utils/crypto.js';
import { authMiddleware } from '../middlewares/auth.js';
import { nanoid } from 'nanoid';

const router = Router();
const prisma = db;

// Auth obligatoire avant vérification de rôles
router.use(authMiddleware as unknown as RequestHandler);

// Schéma de validation pour la configuration Google Workspace
const googleWorkspaceConfigSchema = z.object({
  clientId: z.string().optional().default(''), // Optionnel pour l'activation simple
  clientSecret: z.string().optional(), // Optionnel pour la mise à jour
  redirectUri: z.string().optional(), // URL optionnelle
  domain: z.string().optional().default(''), // Optionnel pour l'activation simple
  adminEmail: z.string().optional().default(''), // Optionnel pour l'activation simple
  
  // Champs compte de service
  serviceAccountEmail: z.string().optional(),
  privateKey: z.string().optional(),
  
  // État de la configuration
  isActive: z.boolean().default(false),
  
  // Modules à activer
  gmailEnabled: z.boolean().default(false),
  calendarEnabled: z.boolean().default(false),
  driveEnabled: z.boolean().default(false),
  meetEnabled: z.boolean().default(false),
  docsEnabled: z.boolean().default(false),
  sheetsEnabled: z.boolean().default(false),
  voiceEnabled: z.boolean().default(false),
});

// GET /api/organizations/:id/google-workspace/config - Récupérer la configuration
router.get('/:id/google-workspace/config', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[GOOGLE-WORKSPACE] GET /organizations/:id/google-workspace/config');
  
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // Vérification des permissions
    if (requestingUser?.role !== 'super_admin' && requestingUser?.organizationId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette organisation'
      });
    }
    
    // Récupérer la configuration existante
    const config = await prisma.googleWorkspaceConfig.findUnique({
      where: { organizationId: id }
    });
    
    if (!config) {
      // Retourner une configuration par défaut
      return res.json({
        success: true,
        data: {
          isConfigured: false,
          clientId: '',
          clientSecret: '',
          redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/google/callback`,
          domain: '',
          adminEmail: '',
          serviceAccountEmail: '',
          privateKey: '',
          isActive: false,
          gmailEnabled: false,
          calendarEnabled: false,
          driveEnabled: false,
          meetEnabled: false,
          docsEnabled: false,
          sheetsEnabled: false,
          voiceEnabled: false,
          enabled: false
        }
      });
    }
    
    // Décrypter les valeurs sensibles pour les afficher dans l'interface
    const isCompleteConfig = !!(config.clientId && config.clientSecret && config.domain && config.adminEmail);
    
    const safeConfig = {
      isConfigured: isCompleteConfig,
      clientId: config.clientId ? decrypt(config.clientId) : '', // 🔓 Décrypter pour affichage
      clientSecret: config.clientSecret ? decrypt(config.clientSecret) : '', // 🔓 Décrypter pour affichage
      hasClientSecret: !!config.clientSecret,
      redirectUri: config.redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      domain: config.domain || '',
      adminEmail: config.adminEmail || '',
      serviceAccountEmail: config.serviceAccountEmail || '',
      privateKey: config.privateKey ? decrypt(config.privateKey) : '', // 🔓 Décrypter pour affichage
      hasPrivateKey: !!config.privateKey,
      isActive: config.enabled || false,
      gmailEnabled: config.gmailEnabled,
      calendarEnabled: config.calendarEnabled,
      driveEnabled: config.driveEnabled,
      meetEnabled: config.meetEnabled,
      docsEnabled: config.docsEnabled,
      sheetsEnabled: config.sheetsEnabled,
      voiceEnabled: config.voiceEnabled,
      enabled: config.enabled && isCompleteConfig // Enabled seulement si config complète
    };
    
    res.json({
      success: true,
      data: safeConfig
    });
    
  } catch (error) {
    console.error('[GOOGLE-WORKSPACE] Erreur GET config:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de la configuration'
    });
  }
});

// POST /api/organizations/:id/google-workspace/config - Sauvegarder la configuration
router.post('/:id/google-workspace/config', requireRole(['super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[GOOGLE-WORKSPACE] POST /organizations/:id/google-workspace/config');
  
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // Seuls les super admins peuvent configurer Google Workspace
    if (requestingUser?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les Super Admins peuvent configurer Google Workspace'
      });
    }
    
    // Validation des données
    const validationResult = googleWorkspaceConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validationResult.error.errors
      });
    }
    
    const data = validationResult.data;
    
    // Vérifier que l'organisation existe
    const organization = await prisma.organization.findUnique({
      where: { id }
    });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organisation non trouvée'
      });
    }
    
    // URL de redirection par défaut si non fournie
    const redirectUri = data.redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    
    // Récupérer la configuration existante
    const existingConfig = await prisma.googleWorkspaceConfig.findUnique({
      where: { organizationId: id }
    });
    
    // 🔐 CRYPTER les credentials avant de sauvegarder
    const encryptedClientId = data.clientId ? encrypt(data.clientId) : existingConfig?.clientId;
    const encryptedClientSecret = data.clientSecret ? encrypt(data.clientSecret) : existingConfig?.clientSecret;
    const encryptedPrivateKey = data.privateKey ? encrypt(data.privateKey) : existingConfig?.privateKey;
    
    // Préparer les données à sauvegarder
    const configData = {
      clientId: encryptedClientId,
      clientSecret: encryptedClientSecret,
      redirectUri: redirectUri,
      domain: data.domain,
      adminEmail: data.adminEmail,
      serviceAccountEmail: data.serviceAccountEmail || existingConfig?.serviceAccountEmail,
      privateKey: encryptedPrivateKey,
      enabled: data.isActive || false,
      gmailEnabled: data.gmailEnabled,
      calendarEnabled: data.calendarEnabled,
      driveEnabled: data.driveEnabled,
      meetEnabled: data.meetEnabled,
      docsEnabled: data.docsEnabled,
      sheetsEnabled: data.sheetsEnabled,
      voiceEnabled: data.voiceEnabled,
      updatedAt: new Date()
    };
    
    // Upsert de la configuration
    const config = await prisma.googleWorkspaceConfig.upsert({
      where: { organizationId: id },
      update: configData,
      create: {
        id: nanoid(), // Génération d'un ID unique pour le nouveau record
        organizationId: id,
        ...configData
      }
    });
    
    console.log(`[GOOGLE-WORKSPACE] Configuration sauvegardée pour l'organisation ${id}`);
    
    res.json({
      success: true,
      message: 'Configuration Google Workspace sauvegardée avec succès',
      data: {
        id: config.id,
        enabled: config.enabled
      }
    });
    
  } catch (error) {
    console.error('[GOOGLE-WORKSPACE] Erreur POST config:', error);
    console.error('[GOOGLE-WORKSPACE] Détails erreur:', error instanceof Error ? error.message : String(error));
    console.error('[GOOGLE-WORKSPACE] Stack:', error instanceof Error ? error.stack : 'N/A');
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la sauvegarde de la configuration',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/organizations/:id/google-workspace/auth-url - Générer l'URL d'authentification
router.get('/:id/google-workspace/auth-url', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[GOOGLE-WORKSPACE] GET /organizations/:id/google-workspace/auth-url');
  
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    
    // Vérification des permissions
    if (requestingUser?.role !== 'super_admin' && requestingUser?.organizationId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette organisation'
      });
    }
    
    // Récupérer la configuration Google Workspace
    const config = await prisma.googleWorkspaceConfig.findUnique({
      where: { organizationId: id }
    });
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuration Google Workspace non trouvée. Veuillez d\'abord configurer les credentials.'
      });
    }
    
    // Vérifier que tous les champs requis sont présents
    const missingFields = [];
    if (!config.clientId) missingFields.push('Client ID');
    if (!config.clientSecret) missingFields.push('Client Secret');
    if (!config.domain) missingFields.push('Domaine');
    if (!config.adminEmail) missingFields.push('Email Admin');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Configuration incomplète. Champs manquants : ${missingFields.join(', ')}`
      });
    }
    
    if (!config.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Configuration Google Workspace désactivée'
      });
    }
    
    // Générer l'URL d'authentification OAuth
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
    
    // Ajouter les scopes selon les modules activés
    if (config.gmailEnabled) {
      scopes.push('https://mail.google.com/'); // SCOPE COMPLET pour suppression définitive
      scopes.push('https://www.googleapis.com/auth/gmail.readonly');
      scopes.push('https://www.googleapis.com/auth/gmail.send');
      scopes.push('https://www.googleapis.com/auth/gmail.modify');
    }
    if (config.calendarEnabled) {
      scopes.push('https://www.googleapis.com/auth/calendar');
      scopes.push('https://www.googleapis.com/auth/calendar.events');
    }
    if (config.driveEnabled) {
      scopes.push('https://www.googleapis.com/auth/drive');
    }
    // Scopes additionnels pour fonctionnalités complètes
    if (config.docsEnabled) {
      scopes.push('https://www.googleapis.com/auth/documents');
    }
    if (config.sheetsEnabled) {
      scopes.push('https://www.googleapis.com/auth/spreadsheets');
    }
    if (config.meetEnabled) {
      scopes.push('https://www.googleapis.com/auth/meetings');
    }
    // Scopes avancés pour CRM complet
    scopes.push('https://www.googleapis.com/auth/presentations');
    scopes.push('https://www.googleapis.com/auth/contacts');
    scopes.push('https://www.googleapis.com/auth/forms');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(config.clientId)}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri || '')}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `state=${encodeURIComponent(JSON.stringify({ organizationId: id, userId: requestingUser?.id }))}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    res.json({
      success: true,
      data: {
        authUrl,
        scopes: scopes
      }
    });
    
  } catch (error) {
    console.error('[GOOGLE-WORKSPACE] Erreur GET auth-url:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la génération de l\'URL d\'authentification'
    });
  }
});

// ===================================
// ROUTES POUR LA GESTION DES UTILISATEURS GOOGLE WORKSPACE
// ===================================

// GET /api/google-workspace/users/:userId/status - Récupérer le statut Google Workspace d'un utilisateur
router.get('/users/:userId/status', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[GOOGLE-WORKSPACE] GET /users/:userId/status');
  
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    
    // Récupérer l'utilisateur cible
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: {
          include: {
            Organization: {
              include: {
                GoogleWorkspaceConfig: true
              }
            }
          }
        }
      }
    });
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier les permissions
    const userOrg = targetUser.UserOrganization?.[0];
    if (requestingUser?.role !== 'super_admin' && requestingUser?.organizationId !== userOrg?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      });
    }
    
    // Récupérer la configuration Google Workspace de l'organisation
    const googleConfig = userOrg?.Organization?.GoogleWorkspaceConfig;
    
    // Récupérer le statut Google de l'utilisateur
    const googleUserStatus = await prisma.googleWorkspaceUser.findUnique({
      where: { userId: userId }
    });
    
    // Générer l'email automatiquement si pas encore défini
    const normalizeString = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-zA-Z0-9]/g, '') // Supprimer caractères spéciaux
        .trim();
    };
    
    const generateEmail = (firstName: string, lastName: string, domain: string): string => {
      const normalizedFirstName = normalizeString(firstName);
      const normalizedLastName = normalizeString(lastName);
      return `${normalizedFirstName}.${normalizedLastName}@${domain}`;
    };
    
    let suggestedEmail = '';
    if (googleConfig?.domain) {
      suggestedEmail = generateEmail(targetUser.firstName, targetUser.lastName, googleConfig.domain);
    }
    
    const status = {
      hasGoogleAccount: !!googleUserStatus,
      email: googleUserStatus?.email || suggestedEmail,
      isActivated: googleUserStatus?.isActive || false,
      organizationDomain: googleConfig?.domain || null,
      lastSync: googleUserStatus?.lastSync?.toISOString() || null,
      services: {
        gmail: googleUserStatus?.gmailEnabled || false,
        calendar: googleUserStatus?.calendarEnabled || false,
        drive: googleUserStatus?.driveEnabled || false,
        meet: googleUserStatus?.meetEnabled || false,
      }
    };
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('[GOOGLE-WORKSPACE] Erreur GET status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du statut'
    });
  }
});

// POST /api/google-workspace/users/create - Créer un compte Google Workspace pour un utilisateur
router.post('/users/create', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[GOOGLE-WORKSPACE] POST /users/create');
  
  try {
    const { userId, email, activateServices = true } = req.body;
    const requestingUser = req.user;
    
    // Validation basique
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'userId et email sont requis'
      });
    }
    
    // Récupérer l'utilisateur cible
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserOrganization: {
          include: {
            Organization: {
              include: {
                GoogleWorkspaceConfig: true
              }
            }
          }
        }
      }
    });
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérifier les permissions
    const userOrg = targetUser.UserOrganization?.[0];
    if (requestingUser?.role !== 'super_admin' && requestingUser?.organizationId !== userOrg?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      });
    }
    
    // Vérifier que l'organisation a Google Workspace configuré
    const googleConfig = userOrg?.Organization?.GoogleWorkspaceConfig;
    if (!googleConfig || !googleConfig.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Google Workspace n\'est pas configuré pour cette organisation'
      });
    }
    
    // Vérifier si l'utilisateur a déjà un compte Google Workspace
    const existingGoogleUser = await prisma.googleWorkspaceUser.findUnique({
      where: { userId: userId }
    });
    
    if (existingGoogleUser) {
      // Mettre à jour le compte existant
      const updatedGoogleUser = await prisma.googleWorkspaceUser.update({
        where: { userId: userId },
        data: {
          email: email,
          isActive: activateServices,
          gmailEnabled: activateServices && googleConfig.gmailEnabled,
          calendarEnabled: activateServices && googleConfig.calendarEnabled,
          driveEnabled: activateServices && googleConfig.driveEnabled,
          meetEnabled: activateServices && googleConfig.meetEnabled,
          lastSync: new Date()
        }
      });
      
      res.json({
        success: true,
        message: 'Compte Google Workspace mis à jour avec succès',
        data: updatedGoogleUser
      });
    } else {
      // Créer un nouveau compte Google Workspace
      const newGoogleUser = await prisma.googleWorkspaceUser.create({
        data: {
          userId: userId,
          email: email,
          isActive: activateServices,
          gmailEnabled: activateServices && googleConfig.gmailEnabled,
          calendarEnabled: activateServices && googleConfig.calendarEnabled,
          driveEnabled: activateServices && googleConfig.driveEnabled,
          meetEnabled: activateServices && googleConfig.meetEnabled,
          lastSync: new Date()
        }
      });
      
      res.json({
        success: true,
        message: 'Compte Google Workspace créé avec succès',
        data: newGoogleUser
      });
    }
    
  } catch (error) {
    console.error('[GOOGLE-WORKSPACE] Erreur POST create:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du compte'
    });
  }
});

// POST /api/google-workspace/users/:userId/sync - Synchroniser un utilisateur avec Google Workspace
router.post('/users/:userId/sync', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[GOOGLE-WORKSPACE] POST /users/:userId/sync');
  
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    
    // Récupérer l'utilisateur Google Workspace
    const googleUser = await prisma.googleWorkspaceUser.findUnique({
      where: { userId: userId },
      include: {
        User: {
          include: {
            UserOrganization: true
          }
        }
      }
    });
    
    if (!googleUser) {
      return res.status(404).json({
        success: false,
        message: 'Compte Google Workspace non trouvé pour cet utilisateur'
      });
    }
    
    // Vérifier les permissions
    const userOrg = googleUser.User.UserOrganization?.[0];
    if (requestingUser?.role !== 'super_admin' && requestingUser?.organizationId !== userOrg?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      });
    }
    
    // Mettre à jour la date de synchronisation
    const updatedGoogleUser = await prisma.googleWorkspaceUser.update({
      where: { userId: userId },
      data: {
        lastSync: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Synchronisation réussie',
      data: updatedGoogleUser
    });
    
  } catch (error) {
    console.error('[GOOGLE-WORKSPACE] Erreur POST sync:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la synchronisation'
    });
  }
});

// POST /api/google-workspace/users/:userId/deactivate - Désactiver un utilisateur Google Workspace
router.post('/users/:userId/deactivate', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  console.log('[GOOGLE-WORKSPACE] POST /users/:userId/deactivate');
  
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    
    // Récupérer l'utilisateur Google Workspace
    const googleUser = await prisma.googleWorkspaceUser.findUnique({
      where: { userId: userId },
      include: {
        User: {
          include: {
            UserOrganization: true
          }
        }
      }
    });
    
    if (!googleUser) {
      return res.status(404).json({
        success: false,
        message: 'Compte Google Workspace non trouvé pour cet utilisateur'
      });
    }
    
    // Vérifier les permissions
    const userOrg = googleUser.User.UserOrganization?.[0];
    if (requestingUser?.role !== 'super_admin' && requestingUser?.organizationId !== userOrg?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      });
    }
    
    // Désactiver le compte
    const updatedGoogleUser = await prisma.googleWorkspaceUser.update({
      where: { userId: userId },
      data: {
        isActive: false,
        gmailEnabled: false,
        calendarEnabled: false,
        driveEnabled: false,
        meetEnabled: false,
        lastSync: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Compte Google Workspace désactivé avec succès',
      data: updatedGoogleUser
    });
    
  } catch (error) {
    console.error('[GOOGLE-WORKSPACE] Erreur POST deactivate:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la désactivation'
    });
  }
});

export default router;

import { Router, type Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth.js";
import { impersonationMiddleware } from "../middlewares/impersonation.js";
import { PrismaClient } from '@prisma/client';
import { decrypt, encrypt } from '../utils/crypto.js';
import nodemailer from 'nodemailer';
import imapSimple from 'imap-simple';

const prisma = new PrismaClient();
const router = Router();

// Cache global pour les connexions IMAP persistantes
const imapConnections = new Map<string, { connection: imapSimple.ImapSimple, lastUsed: number }>();

// Nettoyer les connexions inactives toutes les 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of imapConnections.entries()) {
    if (now - data.lastUsed > 10 * 60 * 1000) { // 10 minutes
      try {
        data.connection.end();
      } catch (error) {
        console.log(`[IMAP CACHE] ⚠️ Erreur fermeture connexion ${key}:`, error);
      }
      imapConnections.delete(key);
      console.log(`[IMAP CACHE] 🗑️ Connexion expirée supprimée: ${key}`);
    }
  }
}, 10 * 60 * 1000);

// Cache simple pour éviter les connexions IMAP multiples
const activeConnections = new Map<string, Promise<imapSimple.ImapSimple>>();

// Types pour IMAP
interface ImapHeader {
  subject?: string[];
  from?: string[];
  to?: string[];
  date?: string[];
  [key: string]: string[] | undefined;
}

interface ImapMessage {
  parts: Array<{
    which: string;
    body: ImapHeader | string;
  }>;
  attributes: {
    uid: number;
    flags: string[];
    size: number;
    struct: unknown;
  };
}

interface ImapBox {
  messages: {
    total: number;
  };
}

router.use(authMiddleware, impersonationMiddleware);

// ✅ RÉCUPÉRER LES PARAMÈTRES MAIL
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, role } = req.user!;
    
    console.log(`[MAIL SETTINGS] 📧 Récupération paramètres - User: ${userId}, Role: ${role}`);
    
    // Récupérer les informations utilisateur
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log('[MAIL SETTINGS] ❌ Utilisateur non trouvé');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer l'adresse email selon vos règles
    let emailAddress: string;
    if (role === 'super_admin') {
      // Super Admin : prénom.nom@2thier.be
      const firstName = (user.firstName || '').toLowerCase().replace(/\s+/g, '');
      const lastName = (user.lastName || '').toLowerCase().replace(/\s+/g, '');
      emailAddress = `${firstName}.${lastName}@2thier.be`;
    } else {
      // Autres utilisateurs : prénom.nom@organisation.be
      const organization = await prisma.organization.findFirst(); // TODO: gérer multi-org
      const orgDomain = organization?.name?.toLowerCase().replace(/\s+/g, '').replace('crm', '') || 'organisation';
      const firstName = (user.firstName || '').toLowerCase().replace(/\s+/g, '');
      const lastName = (user.lastName || '').toLowerCase().replace(/\s+/g, '');
      emailAddress = `${firstName}.${lastName}@${orgDomain}.be`;
    }

    console.log(`[MAIL SETTINGS] 📬 Email généré: ${emailAddress}`);

    // Vérifier si des paramètres existent déjà
    const mailSettings = await prisma.mailSettings.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        emailAddress: true,
        imapHost: true,
        imapPort: true,
        smtpHost: true,
        smtpPort: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true,
        encryptedPassword: true
      }
    });

    if (mailSettings) {
      console.log('[MAIL SETTINGS] ✅ Paramètres existants trouvés');
      // Retourner les paramètres existants (sans le mot de passe)
      const { encryptedPassword, ...safeSettings } = mailSettings;
      return res.json({
        ...safeSettings,
        hasPassword: !!encryptedPassword
      });
    }

    // Pas de paramètres existants - retourner la configuration par défaut
    console.log('[MAIL SETTINGS] 📝 Retour configuration par défaut');
    res.json({
      id: null,
      userId: userId,
      emailAddress: emailAddress,
      imapHost: 'imap.one.com',
      imapPort: 993,
      smtpHost: 'send.one.com',
      smtpPort: 465,
      isVerified: false,
      hasPassword: false
    });
    
  } catch (error) {
    console.error('[MAIL SETTINGS] ❌ Erreur récupération paramètres mail:', error);
    res.status(500).json({ error: 'Impossible de récupérer les paramètres mail' });
  }
});

// ✅ SAUVEGARDER LES PARAMÈTRES MAIL
router.post('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user!;
    const { emailAddress, password, imapHost, imapPort, smtpHost, smtpPort } = req.body;

    console.log('Configuration mail pour utilisateur:', userId);

    // Chiffrer le mot de passe
    const encryptedPassword = encrypt(password);

    // Upsert des paramètres
    const mailSettings = await prisma.mailSettings.upsert({
      where: { userId },
      create: {
        userId,
        emailAddress,
        encryptedPassword,
        imapHost,
        imapPort: parseInt(imapPort),
        smtpHost,
        smtpPort: parseInt(smtpPort)
      },
      update: {
        emailAddress,
        encryptedPassword,
        imapHost,
        imapPort: parseInt(imapPort),
        smtpHost,
        smtpPort: parseInt(smtpPort)
      }
    });

    console.log('Paramètres mail sauvegardés:', mailSettings.id);

    res.json({ message: "Paramètres enregistrés avec succès." });
  } catch (error) {
    console.error('Erreur sauvegarde paramètres mail:', error);
    res.status(500).json({ error: 'Impossible de sauvegarder les paramètres mail' });
  }
});

// ✅ RÉCUPÉRER LES EMAILS DEPUIS IMAP
router.get('/fetch', async (req: AuthenticatedRequest, res: Response) => {
  let connection: imapSimple.ImapSimple | null = null;
  
  try {
    const { userId } = req.user!;
    const { folder = 'inbox' } = req.query;
    
    console.log(`[MAIL FETCH] 🔥 RÉCUPÉRATION EMAILS IMAP - User: ${userId}, Dossier: ${folder}`);

    // Vérifier s'il y a déjà une connexion active pour cet utilisateur
    const cacheKey = `mail-fetch-${userId}`;
    if (activeConnections.has(cacheKey)) {
      console.log('[MAIL FETCH] ⏳ Connexion déjà en cours, attente...');
      return res.status(429).json({ 
        error: 'Connexion IMAP déjà en cours', 
        message: 'Veuillez patienter avant de relancer la requête'
      });
    }

    // Marquer cette connexion comme active
    const connectionPromise = (async () => {
      const mailSettings = await prisma.mailSettings.findUnique({ where: { userId } });

      if (!mailSettings?.encryptedPassword) {
        console.log('[MAIL FETCH] ❌ Paramètres mail manquants');
        throw new Error('Paramètres mail non configurés');
      }

      // Vérification de la validité des paramètres
      if (!mailSettings.emailAddress || !mailSettings.imapHost || !mailSettings.imapPort) {
        throw new Error('Paramètres IMAP incomplets');
      }

      const decryptedPassword = decrypt(mailSettings.encryptedPassword);

      const config = {
        imap: {
          user: mailSettings.emailAddress,
          password: decryptedPassword,
          host: mailSettings.imapHost,
          port: mailSettings.imapPort,
          tls: true, // SSL/TLS toujours activé pour One.com
          authTimeout: 45000, // 45s - augmenté pour One.com
          connTimeout: 45000, // 45s - augmenté pour One.com
          socketTimeout: 60000, // 60s - timeout socket
          keepalive: {
            interval: 10000, // 10s
            idleInterval: 300000 // 5min
          },
          tlsOptions: { 
            rejectUnauthorized: false,
            secureProtocol: 'TLSv1_2_method' // Force TLS 1.2
          }
        }
      };

      console.log(`[MAIL FETCH] 📡 Connexion à ${config.imap.host}:${config.imap.port}...`);
      connection = await imapSimple.connect(config);
      console.log('[MAIL FETCH] ✅ Connexion IMAP réussie');

      return connection;
    })();

    activeConnections.set(cacheKey, connectionPromise);

    try {
      connection = await connectionPromise;

    // OPTIMISATION: Ouverture du dossier avec callback natif (plus fiable)
    const selectedFolder = 'INBOX';
    
    console.log(`[MAIL FETCH] 📂 Ouverture directe du dossier: "${selectedFolder}"`);
    console.log(`[MAIL FETCH] ⏱️ Ouverture dossier avec timeout 30s...`);
    
    let box: ImapBox;
    
    try {
      // Utiliser une Promise wrapper pour le callback natif d'imap-simple
      box = await new Promise<ImapBox>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout ouverture dossier (30s)'));
        }, 30000);

        // Utiliser l'API callback native d'imap-simple
        connection.openBox(selectedFolder, false, (err: Error | null, boxResult: ImapBox) => {
          clearTimeout(timeout);
          
          if (err) {
            console.log('[MAIL FETCH] ❌ ERREUR callback openBox:', err);
            reject(err);
          } else {
            console.log(`[MAIL FETCH] ✅ Dossier "${selectedFolder}" ouvert avec callback - Total: ${boxResult.messages.total} messages`);
            resolve(boxResult);
          }
        });
      });

    } catch (openError) {
      console.log('[MAIL FETCH] ❌ ERREUR ouverture dossier:', openError);
      
      if (connection) {
        try { 
          connection.end(); 
        } catch (closeError) {
          console.log('[MAIL FETCH] ⚠️ Erreur fermeture:', closeError);
        }
        connection = null;
      }
      
      return res.status(500).json({ 
        error: 'Erreur ouverture dossier IMAP',
        details: String(openError),
        folder: selectedFolder,
        suggestion: 'Le serveur One.com peut être lent. Réessayez dans quelques secondes.'
      });
    }

    // OPTIMISATION: Recherche des emails avec stratégies multiples
    console.log('[MAIL FETCH] 🔍 Recherche des emails...');
    
    try {
      let messages: ImapMessage[] = [];
      
      // Strategy 1: Recherche limitée des emails récents (plus rapide)
      try {
        console.log('[MAIL FETCH] � Recherche des 20 emails les plus récents...');
        
        const recentSearchPromise = connection.search(['ALL'], { 
          bodies: ['HEADER'], // Seulement les headers, pas le contenu complet
          struct: false // Pas de structure complète
        });
        const recentTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout recherche récente (30s)')), 30000);
        });
        
        const allMessages = await Promise.race([recentSearchPromise, recentTimeoutPromise]);
        
        // Prendre seulement les 20 derniers messages (plus récents)
        messages = (allMessages as ImapMessage[]).slice(-20).reverse();
        console.log(`[MAIL FETCH] 📬 Trouvé ${messages.length} emails récents sur ${allMessages.length} total`);
        
      } catch (recentError) {
        console.log('[MAIL FETCH] ⚠️ Recherche récente échouée:', recentError);
        
        // Strategy 2: Fallback - recherche basique sans timeout strict
        console.log('[MAIL FETCH] 🔄 Fallback: recherche basique...');
        
        const basicSearchPromise = connection.search(['ALL'], { bodies: ['HEADER'] });
        const basicTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout recherche basique (60s)')), 60000);
        });
        
        const basicMessages = await Promise.race([basicSearchPromise, basicTimeoutPromise]);
        messages = (basicMessages as ImapMessage[]).slice(-10).reverse(); // Seulement 10 emails
        console.log(`[MAIL FETCH] 📬 Fallback: ${messages.length} emails trouvés`);
      }

      const emails = messages.map((item) => {
        const header = item.parts?.find((part) => part.which === 'HEADER');
        const headerObj = header?.body || {};

        return {
          id: item.attributes?.uid || Math.random(),
          subject: headerObj.subject?.[0] || 'Pas de sujet',
          from: headerObj.from?.[0] || 'Expéditeur inconnu',
          to: headerObj.to?.[0] || '',
          date: headerObj.date?.[0] || new Date().toISOString(),
          flags: item.attributes?.flags || [],
          size: item.attributes?.size || 0
        };
      });

      console.log(`[MAIL FETCH] ✅ Retour de ${emails.length} emails traités`);
      res.json({ 
        emails, 
        folder: selectedFolder, 
        total: box.messages?.total || messages.length,
        info: 'Affichage des emails les plus récents pour optimiser les performances'
      });

    } catch (searchError) {
      console.log('[MAIL FETCH] ❌ ERREUR recherche emails:', searchError);
      
      // Strategy 3: Retour d'un résultat vide plutôt qu'une erreur
      console.log('[MAIL FETCH] 🔄 Retour de résultat vide pour éviter l\'erreur...');
      
      res.json({ 
        emails: [], 
        folder: selectedFolder, 
        total: box.messages?.total || 0,
        warning: 'Impossible de récupérer les emails. Vérifiez votre connexion.',
        details: String(searchError)
      });
    }
    
    } catch (connectionError) {
      console.log('[MAIL FETCH] ❌ ERREUR connexion:', connectionError);
      return res.status(500).json({ 
        error: 'Erreur connexion IMAP',
        details: String(connectionError)
      });
    }

  } catch (error) {
    console.error('[MAIL FETCH] ❌ ERREUR FATALE:', error);
    
    res.status(500).json({ 
      error: 'Erreur IMAP',
      details: String(error)
    });
  } finally {
    // Nettoyer le cache
    const cacheKey = `mail-fetch-${req.user?.userId}`;
    activeConnections.delete(cacheKey);
    
    if (connection) {
      try {
        console.log('[MAIL FETCH] 🔌 Fermeture connexion IMAP');
        connection.end();
      } catch (closeError) {
        console.log('[MAIL FETCH] ⚠️ Erreur fermeture connexion:', closeError);
      }
    }
  }
});

// ✅ RÉCUPÉRER UN EMAIL SPÉCIFIQUE
router.get('/email/:id', async (req: AuthenticatedRequest, res: Response) => {
  let connection: imapSimple.ImapSimple | null = null;
  
  try {
    const { userId } = req.user!;
    const { id } = req.params;
    const { folder = 'inbox' } = req.query;
    
    console.log(`[MAIL EMAIL] 📧 RÉCUPÉRATION EMAIL ${id} - User: ${userId}`);

    const mailSettings = await prisma.mailSettings.findUnique({ where: { userId } });

    if (!mailSettings?.encryptedPassword) {
      return res.status(400).json({ error: 'Paramètres mail non configurés' });
    }

    // Vérification de la validité des paramètres
    if (!mailSettings.emailAddress || !mailSettings.imapHost || !mailSettings.imapPort) {
      return res.status(400).json({ error: 'Paramètres IMAP incomplets' });
    }

    const decryptedPassword = decrypt(mailSettings.encryptedPassword);

    const config = {
      imap: {
        user: mailSettings.emailAddress,
        password: decryptedPassword,
        host: mailSettings.imapHost,
        port: mailSettings.imapPort,
        tls: true, // SSL/TLS toujours activé pour One.com
        authTimeout: 15000,
        connTimeout: 15000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    connection = await imapSimple.connect(config);
    
    const folderMapping: Record<string, string> = {
      'inbox': 'INBOX',
      'sent': 'INBOX.Sent',
      'drafts': 'INBOX.Drafts',
      'trash': 'INBOX.Trash',
      'spam': 'INBOX.Spam'
    };
    
    const imapFolderName = folderMapping[folder as string] || 'INBOX';
    await connection.openBox(imapFolderName);

    const messages = await connection.search([['UID', id]], { 
      bodies: ['HEADER', 'TEXT', ''], 
      struct: true 
    });

    if (!messages.length) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    const message = messages[0] as ImapMessage;
    const header = message.parts.find((part) => part.which === 'HEADER');
    const text = message.parts.find((part) => part.which === 'TEXT');
    const full = message.parts.find((part) => part.which === '');

    const email = {
      id: message.attributes.uid,
      subject: header?.body.subject?.[0] || 'Pas de sujet',
      from: header?.body.from?.[0] || 'Expéditeur inconnu',
      to: header?.body.to?.[0] || '',
      date: header?.body.date?.[0] || new Date().toISOString(),
      flags: message.attributes.flags || [],
      size: message.attributes.size || 0,
      body: text?.body || full?.body || 'Contenu non disponible',
      structure: message.attributes.struct
    };

    res.json(email);

  } catch (error) {
    console.error('[MAIL EMAIL] ❌ ERREUR:', error);
    res.status(500).json({ 
      error: 'Erreur récupération email',
      details: String(error)
    });
  } finally {
    if (connection) {
      try {
        connection.end();
      } catch (closeError) {
        console.log('[MAIL EMAIL] ⚠️ Erreur fermeture connexion:', closeError);
      }
    }
  }
});

// ✅ ENVOYER UN EMAIL
router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user!;
    const { to, subject, body, attachments } = req.body;

    console.log(`[MAIL SEND] 📤 ENVOI EMAIL - User: ${userId}, To: ${to}`);

    const mailSettings = await prisma.mailSettings.findUnique({ where: { userId } });

    if (!mailSettings?.encryptedPassword) {
      return res.status(400).json({ error: 'Paramètres mail non configurés' });
    }

    const decryptedPassword = decrypt(mailSettings.encryptedPassword);

    // Vérification de la validité des paramètres
    if (!mailSettings.emailAddress || !mailSettings.smtpHost || !mailSettings.smtpPort) {
      return res.status(400).json({ error: 'Paramètres SMTP incomplets' });
    }

    const transporter = nodemailer.createTransport({
      host: mailSettings.smtpHost,
      port: mailSettings.smtpPort,
      secure: true, // SSL/TLS toujours activé pour One.com (port 465)
      auth: {
        user: mailSettings.emailAddress,
        pass: decryptedPassword
      }
    });

    const mailOptions = {
      from: mailSettings.emailAddress,
      to,
      subject,
      html: body,
      attachments: attachments || []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAIL SEND] ✅ Email envoyé - ID: ${info.messageId}`);

    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email envoyé avec succès'
    });

  } catch (error) {
    console.error('[MAIL SEND] ❌ ERREUR:', error);
    res.status(500).json({ 
      error: 'Erreur envoi email',
      details: String(error)
    });
  }
});

export default router;

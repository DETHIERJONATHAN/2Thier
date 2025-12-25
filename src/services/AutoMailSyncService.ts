import { EventEmitter } from 'events';
import imapSimple from 'imap-simple';
import { decrypt } from '../utils/crypto.js';
import RealTimeEmailNotificationService from './RealTimeEmailNotificationService.js';
import { prisma } from '../lib/prisma';

interface SyncResult {
  userId: string;
  newEmails: number;
  updatedEmails: number;
  totalEmails: number;
}

// Fonction pour décoder les en-têtes MIME encodés
function decodeMimeHeader(header: string): string {
  if (!header) return header;
  
  // Décoder les en-têtes MIME-encodés (=?charset?encoding?encoded-text?=)
  const mimePattern = /=\?([^?]+)\?([QqBb])\?([^?]*)\?=/g;
  
  return header.replace(mimePattern, (match, charset, encoding, encodedText) => {
    try {
      charset = charset.toLowerCase();
      encoding = encoding.toUpperCase();
      
      if (encoding === 'Q' || encoding === 'q') {
        // Quoted-printable
        let decoded = encodedText.replace(/_/g, ' ');
        decoded = decoded.replace(/=([0-9A-F]{2})/gi, (_, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        return decoded;
      } else if (encoding === 'B' || encoding === 'b') {
        // Base64
        return Buffer.from(encodedText, 'base64').toString('utf8');
      }
      
      return encodedText;
    } catch (error) {
      console.warn('Erreur de décodage MIME:', error);
      return match; // Retourner le texte original en cas d'erreur
    }
  });
}

// Fonction pour corriger automatiquement l'encodage UTF-8 mal interprété
function fixUtf8Encoding(text: string): string {
  if (!text) return text;
  
  const utf8Fixes = {
    'Ã©': 'é',
    'Ã¨': 'è',
    'Ã ': 'à',
    'Ã§': 'ç',
    'Ã¢': 'â',
    'Ã´': 'ô',
    'Ã¹': 'ù',
    'Ã»': 'û',
    'Ã®': 'î',
    'Ã«': 'ë',
    'Ã¯': 'ï',
    'Ã±': 'ñ',
    'Ãª': 'ê',
    'Ã¼': 'ü',
    'Â ': ' ', // Espace mal encodé
    'Â': '', // Caractères résiduels
  };

  let fixedText = text;
  for (const [bad, good] of Object.entries(utf8Fixes)) {
    fixedText = fixedText.replace(new RegExp(bad, 'g'), good);
  }

  return fixedText;
}

class AutoMailSyncService extends EventEmitter {
  public isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncFrequency = 60000; // 🚀 CHANGÉ : 1 minute au lieu de 10 (plus réactif pour notifications)
  private maxRetries = 3; // Nombre maximum de tentatives en cas d'erreur
  private retryDelay = 5000; // Délai entre les tentatives (5 secondes)

  constructor() {
    super();
  }

  start() {
    if (this.isRunning) {
      console.log('🔄 [AUTO-SYNC] Service déjà en cours d\'exécution');
      return;
    }

    this.isRunning = true;
    console.log('🚀 [AUTO-SYNC] Démarrage du service de synchronisation automatique (toutes les 1 minute - TEMPS RÉEL)');

    // Synchronisation immédiate avec retry
    this.performSyncWithRetry();

    // Puis toutes les 1 minute avec retry
    this.syncInterval = setInterval(() => {
      this.performSyncWithRetry();
    }, this.syncFrequency);
  }

  /**
   * 🚀 NOUVELLE MÉTHODE : Synchroniser un utilisateur spécifique immédiatement
   */
  async syncForUser(userId: string): Promise<SyncResult | null> {
    try {
      console.log(`🎯 [AUTO-SYNC] Synchronisation manuelle pour l'utilisateur: ${userId}`);
      
      // Récupérer les paramètres mail de cet utilisateur
      const emailAccount = await prisma.emailAccount.findFirst({
        where: { 
          userId,
          isActive: true 
        }
      });

      if (!emailAccount) {
        console.log(`⚠️ [AUTO-SYNC] Aucun compte email actif trouvé pour l'utilisateur ${userId}`);
        return null;
      }

      // Synchroniser cet utilisateur
      const result = await this.syncUserEmails(emailAccount);
      
      console.log(`✅ [AUTO-SYNC] Sync manuelle terminée pour ${userId}: ${result.newEmails} nouveaux, ${result.updatedEmails} mis à jour`);
      return result;
      
    } catch (error) {
      console.error(`❌ [AUTO-SYNC] Erreur sync manuelle pour l'utilisateur ${userId}:`, error);
      throw error;
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ [AUTO-SYNC] Service de synchronisation automatique arrêté');
  }

  // 🎛️ NOUVEAU: Méthode pour changer la fréquence de synchronisation
  setSyncFrequency(minutes: number) {
    const newFrequency = minutes * 60000; // Convertir en millisecondes
    console.log(`⚙️ [AUTO-SYNC] Changement de fréquence: ${minutes} minutes (${newFrequency}ms)`);
    
    this.syncFrequency = newFrequency;
    
    // Si le service est en cours, le redémarrer avec la nouvelle fréquence
    if (this.isRunning) {
      console.log('🔄 [AUTO-SYNC] Redémarrage avec nouvelle fréquence...');
      this.stop();
      this.start();
    }
  }

  // 📊 NOUVEAU: Obtenir la fréquence actuelle
  getSyncFrequency(): number {
    return this.syncFrequency / 60000; // Retourner en minutes
  }

  private async performSyncWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.performSync();
    } catch (error) {
      console.error(`❌ [AUTO-SYNC] Erreur de synchronisation (tentative ${retryCount + 1}/${this.maxRetries}):`, error);
      
      if (retryCount < this.maxRetries - 1) {
        console.log(`🔄 [AUTO-SYNC] Nouvelle tentative dans ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.performSyncWithRetry(retryCount + 1);
      } else {
        console.error(`💥 [AUTO-SYNC] Échec définitif après ${this.maxRetries} tentatives`);
      }
    }
  }

  private async performSync(): Promise<void> {
    try {
      console.log('⏰ [AUTO-SYNC] Début de la synchronisation automatique...');
      
      // Vérification de sécurité : pas plus de 10 utilisateurs à synchroniser pour éviter la surcharge
      const usersWithMail = await prisma.emailAccount.findMany({
        where: {
          isActive: true,
          encryptedPassword: { not: null }
        },
        take: 10 // Limite de sécurité
      });

      console.log(`👥 [AUTO-SYNC] ${usersWithMail.length} utilisateurs à synchroniser`);

      const totalResults: SyncResult[] = [];

      for (const emailAccount of usersWithMail) {
        try {
          // Validation des données critiques (pas besoin de imapHost car auto-détecté)
          if (!emailAccount.emailAddress || !emailAccount.encryptedPassword) {
            console.warn(`⚠️ [AUTO-SYNC] Configuration incomplète pour l'utilisateur ${emailAccount.userId}, ignoré`);
            continue;
          }

          const result = await this.syncUserEmails(emailAccount);
          totalResults.push(result);
          
          // Attendre un peu entre chaque utilisateur pour éviter la surcharge
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (userError) {
          console.error(`❌ [AUTO-SYNC] Erreur pour l'utilisateur ${emailAccount.userId}:`, userError);
        }
      }

      // Résumé de la synchronisation
      const totalNew = totalResults.reduce((sum, r) => sum + r.newEmails, 0);
      const totalUpdated = totalResults.reduce((sum, r) => sum + r.updatedEmails, 0);
      
      console.log(`✅ [AUTO-SYNC] Synchronisation terminée: ${totalNew} nouveaux emails, ${totalUpdated} mis à jour`);

    } catch (error) {
      console.error('❌ [AUTO-SYNC] Erreur lors de la synchronisation automatique:', error);
      throw error; // Relancer pour le système de retry
    }
  }

  /**
   * Configuration automatique IMAP basée sur le domaine email
   */
  private getImapConfig(domain: string): { host: string; port: number; tls: boolean } {
    const configs: { [key: string]: { host: string; port: number; tls: boolean } } = {
      'gmail.com': { host: 'imap.gmail.com', port: 993, tls: true },
      'one.com': { host: 'imap.one.com', port: 993, tls: true },
      'yandex.com': { host: 'imap.yandex.com', port: 993, tls: true },
      'yandex.ru': { host: 'imap.yandex.ru', port: 993, tls: true },
      'outlook.com': { host: 'outlook.office365.com', port: 993, tls: true },
      'hotmail.com': { host: 'outlook.office365.com', port: 993, tls: true },
      'live.com': { host: 'outlook.office365.com', port: 993, tls: true },
      'yahoo.com': { host: 'imap.mail.yahoo.com', port: 993, tls: true },
      'yahoo.fr': { host: 'imap.mail.yahoo.com', port: 993, tls: true }
    };

    return configs[domain] || { host: `imap.${domain}`, port: 993, tls: true };
  }

  private async syncUserEmails(emailAccount: any): Promise<SyncResult> {
    const startTime = Date.now();
    let newEmails = 0;
    let updatedEmails = 0;

    try {
      console.log(`🔄 [AUTO-SYNC] Synchronisation pour ${emailAccount.emailAddress}...`);

      // Configuration automatique IMAP/SMTP basée sur le domaine
      const emailDomain = emailAccount.emailAddress.split('@')[1];
      const imapConfig = this.getImapConfig(emailDomain);

      const config = {
        imap: {
          user: emailAccount.emailAddress as string,
          password: decrypt(emailAccount.encryptedPassword as string),
          host: imapConfig.host,
          port: imapConfig.port,
          tls: imapConfig.tls,
          tlsOptions: { 
            rejectUnauthorized: false,
            servername: imapConfig.host
          },
          authTimeout: 10000,
          connTimeout: 10000,
          keepalive: false
        }
      };

      let connection: any;
      try {
        connection = await imapSimple.connect(config);

        // Dossiers One.com à synchroniser
        const foldersToSync = [
          { imapName: 'INBOX', dbName: 'inbox' },
          { imapName: 'INBOX.Sent', dbName: 'sent' },
          { imapName: 'INBOX.Drafts', dbName: 'drafts' },
          { imapName: 'INBOX.Trash', dbName: 'trash' },
          { imapName: 'INBOX.Spam', dbName: 'spam' }
        ];

        for (const folder of foldersToSync) {
          try {
            await connection.openBox(folder.imapName);

            // 🆕 RÉPARATION: Vérifier si c'est le premier sync pour ce dossier
            const existingEmailsCount = await prisma.email.count({
              where: {
                userId: emailAccount.userId,
                folder: folder.dbName
              }
            });

            console.log(`📊 [AUTO-SYNC] ${folder.imapName}: ${existingEmailsCount} emails existants en base`);

            let results: any[] = [];

            // 🎯 LOGIQUE RÉPARÉE: Si premier sync, récupérer TOUS les emails
            if (existingEmailsCount === 0) {
              console.log(`🔄 [AUTO-SYNC] Premier sync pour ${folder.imapName} - Récupération de TOUS les emails`);
              
              try {
                results = await connection.search(['ALL'], {
                  bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT', '1.1', '1.2', '2', '1'],
                  markSeen: false,
                  struct: true
                });
                console.log(`📧 [AUTO-SYNC] ${folder.imapName}: ${results.length} emails trouvés (sync complet)`);
              } catch (allError) {
                console.log(`⚠️ [AUTO-SYNC] Erreur recherche ALL dans ${folder.imapName}:`, allError);
              }
            } else {
              // Sync normal : chercher seulement les emails récents
              console.log(`🔄 [AUTO-SYNC] Sync normal pour ${folder.imapName} - Emails récents seulement`);
              
              const searchDate = new Date();
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const day = String(searchDate.getDate());
              const month = months[searchDate.getMonth()];
              const year = searchDate.getFullYear();
              const formattedDate = `${day}-${month}-${year}`;
              
              try {
                results = await connection.search(['SINCE', formattedDate], {
                  bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT', '1.1', '1.2', '2', '1'],
                  markSeen: false,
                  struct: true
                });
                console.log(`📧 [AUTO-SYNC] ${folder.imapName}: ${results.length} emails depuis ${formattedDate}`);
              } catch (sinceError) {
                console.log(`⚠️ [AUTO-SYNC] Erreur SINCE dans ${folder.imapName}, fallback vers récents:`, sinceError);
                
                try {
                  const allResults = await connection.search(['ALL'], {
                    bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT', '1.1', '1.2', '2', '1'],
                    markSeen: false,
                    struct: true
                  });
                  results = allResults.slice(-50); // 50 plus récents
                  console.log(`📧 [AUTO-SYNC] ${folder.imapName}: ${results.length} emails (fallback récents)`);
                } catch (fallbackError) {
                  console.log(`❌ [AUTO-SYNC] Erreur fallback dans ${folder.imapName}:`, fallbackError);
                }
              }
            }

            // Traitement des emails trouvés
            const maxEmailsToProcess = existingEmailsCount === 0 ? 1000 : 100;
            const emailsToProcess = results.slice(0, maxEmailsToProcess);
            
            if (results.length > maxEmailsToProcess) {
              console.warn(`⚠️ [AUTO-SYNC] ${folder.imapName}: Limite de ${maxEmailsToProcess} emails appliquée (${results.length} trouvés)`);
            }

            for (const item of emailsToProcess) {
              try {
                console.log(`🔍 [AUTO-SYNC] Traitement email dans ${folder.imapName}...`);
                
                // ✅ RÉPARATION: Recherche correcte des headers
                const headerPart = item.parts.find((part: any) => 
                  part.which && part.which.includes('HEADER')
                );
                
                let header = null;
                if (headerPart && headerPart.body) {
                  header = headerPart.body;
                  console.log(`✅ [AUTO-SYNC] Headers trouvés pour email dans ${folder.imapName}`);
                } else {
                  // Fallback: chercher dans toutes les parties
                  for (const part of item.parts || []) {
                    if (part.body && typeof part.body === 'object') {
                      if (part.body.subject || part.body.from || part.body.date) {
                        header = part.body;
                        console.log(`✅ [AUTO-SYNC] Headers trouvés via fallback pour email dans ${folder.imapName}`);
                        break;
                      }
                    }
                  }
                }
                
                if (header) {
                  let subject = decodeMimeHeader(header.subject ? header.subject[0] : 'Pas de sujet');
                  let from = decodeMimeHeader(header.from ? header.from[0] : 'Expéditeur inconnu');
                  let to = decodeMimeHeader(header.to ? header.to[0] : emailAccount.emailAddress);
                  
                  // 🔧 CORRECTION AUTOMATIQUE DE L'ENCODAGE
                  subject = fixUtf8Encoding(subject);
                  from = fixUtf8Encoding(from);
                  to = fixUtf8Encoding(to);
                  
                  const messageId = header['message-id'] ? header['message-id'][0] : null;
                  const date = header.date ? new Date(header.date[0]) : new Date();
                  const isRead = item.attributes.flags.includes('\\Seen');
                  
                  // ✅ CORRECTION: Récupérer l'UID IMAP pour la synchronisation bidirectionnelle
                  const uid = item.attributes.uid;
                  
                  console.log(`📧 [AUTO-SYNC] Email "${subject}" de ${from} - Date: ${date} - UID: ${uid}`);
                  
                  // Extraction intelligente du contenu de l'email (HTML ou TEXT)
                  let body = 'Corps récupéré en arrière-plan';
                  let contentType = 'text/plain';
                  
                  // Analyser la structure MIME
                  let htmlBody = null;
                  let textBody = null;
                  
                  if (item.struct) {
                    const extractBodies = (struct: any, partPath = '') => {
                      if (Array.isArray(struct)) {
                        struct.forEach((part, index) => {
                          const currentPath = partPath ? `${partPath}.${index + 1}` : `${index + 1}`;
                          extractBodies(part, currentPath);
                        });
                      } else if (struct.type && struct.subtype) {
                        const mimeType = `${struct.type}/${struct.subtype}`.toLowerCase();
                        const currentPath = partPath || '1';
                        
                        const bodyPart = item.parts.find((p: any) => p.which === currentPath)?.body;
                        
                        if (bodyPart) {
                          const bodyContent = bodyPart.toString();
                          
                          if (mimeType === 'text/html' && !htmlBody) {
                            htmlBody = bodyContent;
                          } else if (mimeType === 'text/plain' && !textBody) {
                            textBody = bodyContent;
                          }
                        }
                        
                        if (struct.body) {
                          extractBodies(struct.body, currentPath);
                        }
                      }
                    };
                    
                    extractBodies(item.struct);
                  }
                  
                  // Fallback: examiner toutes les parties disponibles
                  if (!htmlBody && !textBody) {
                    const allParts = item.parts || [];
                    
                    for (const part of allParts) {
                      if (part.which && part.body) {
                        const bodyContent = part.body.toString();
                        
                        if (bodyContent.includes('<html') || bodyContent.includes('<HTML') || 
                            bodyContent.includes('<!DOCTYPE') || bodyContent.includes('<body') ||
                            bodyContent.includes('<div') || bodyContent.includes('<p>') ||
                            bodyContent.includes('<br') || bodyContent.includes('<a ')) {
                          htmlBody = bodyContent;
                        } else if (part.which === 'TEXT' || bodyContent.length > 10) {
                          textBody = bodyContent;
                        }
                      }
                    }
                  }
                  
                  // Priorité au HTML s'il existe, sinon utiliser le texte
                  if (htmlBody) {
                    body = this.cleanHtmlContent(htmlBody);
                    contentType = 'text/html';
                  } else if (textBody) {
                    body = this.cleanTextContent(textBody);
                    contentType = 'text/plain';
                  }

                  // ✅ CORRECTION: Vérification d'existence avec UID IMAP en priorité
                  let existingEmail;
                  
                  // 1. Chercher d'abord par UID IMAP (le plus fiable)
                  if (uid) {
                    existingEmail = await prisma.email.findFirst({
                      where: {
                        userId: emailAccount.userId,
                        uid: uid.toString(),
                        folder: folder.dbName
                      },
                      select: { id: true, isRead: true }
                    });
                  }
                  
                  // 2. Fallback vers Message-ID si pas d'UID ou pas trouvé
                  if (!existingEmail && messageId) {
                    existingEmail = await prisma.email.findFirst({
                      where: {
                        userId: emailAccount.userId,
                        body: { contains: messageId },
                        folder: folder.dbName
                      },
                      select: { id: true, isRead: true }
                    });
                  }
                  
                  // 3. Fallback vers subject+from+date (ancienne méthode)
                  if (!existingEmail) {
                    const dateStart = new Date(date.getTime() - 30000);
                    const dateEnd = new Date(date.getTime() + 30000);
                    
                    existingEmail = await prisma.email.findFirst({
                      where: {
                        userId: emailAccount.userId,
                        subject,
                        from,
                        folder: folder.dbName,
                        createdAt: {
                          gte: dateStart,
                          lte: dateEnd
                        }
                      },
                      select: { id: true, isRead: true }
                    });
                  }

                  if (!existingEmail) {
                    // 🚨 VÉRIFICATION BLACKLIST: Ne pas recréer des emails supprimés
                    let isInBlacklist = false;
                    
                    if (uid) {
                      const deletedByUID = await prisma.deletedEmail.findFirst({
                        where: {
                          userId: emailAccount.userId,
                          uid: uid.toString(),
                          folder: folder.dbName
                        }
                      });
                      isInBlacklist = !!deletedByUID;
                    }
                    
                    if (!isInBlacklist && messageId) {
                      const deletedByMessageId = await prisma.deletedEmail.findFirst({
                        where: {
                          userId: emailAccount.userId,
                          messageId: messageId,
                          folder: folder.dbName
                        }
                      });
                      isInBlacklist = !!deletedByMessageId;
                    }
                    
                    if (isInBlacklist) {
                      console.log(`🚫 [AUTO-SYNC] Email en blacklist, ignoré: "${subject}" (UID: ${uid})`);
                      continue; // Passer au prochain email
                    }
                    
                    console.log(`💾 [AUTO-SYNC] Création nouvel email: "${subject}"`);
                    
                    // 🔧 CORRECTION AUTOMATIQUE DE L'ENCODAGE DU CORPS DU MESSAGE
                    const cleanBody = fixUtf8Encoding(body);
                    const finalBody = messageId ? `Message-ID: ${messageId}\n\n${cleanBody}` : cleanBody;
                    
                    const newEmail = await prisma.email.create({
                      data: {
                        userId: emailAccount.userId,
                        from,
                        to,
                        subject,
                        body: finalBody,
                        contentType,
                        isRead,
                        folder: folder.dbName,
                        uid: uid ? uid.toString() : null, // ✅ CORRECTION: Stocker l'UID IMAP
                        createdAt: date
                      }
                    });
                    newEmails++;

                    // 🚀 NOUVELLE FONCTIONNALITÉ : NOTIFICATION TEMPS RÉEL !
                    if (folder.dbName === 'inbox' && !isRead) {
                      console.log('🔔 [AUTO-SYNC] Déclenchement notification temps réel !');
                      
                      // Récupérer l'organisation de l'utilisateur
                      const userOrg = await prisma.userOrganization.findFirst({
                        where: { userId: emailAccount.userId },
                        select: { organizationId: true }
                      });

                      if (userOrg) {
                        // 🚀 NOUVELLE FONCTIONNALITÉ : ÉMETTRE UN ÉVÉNEMENT
                        this.emit('newEmailFound', {
                          emailId: newEmail.id,
                          from,
                          subject,
                          folder: folder.dbName,
                          receivedAt: date,
                          userId: emailAccount.userId,
                          organizationId: userOrg.organizationId
                        });

                        const notificationService = RealTimeEmailNotificationService.getInstance();
                        notificationService.notifyNewEmail({
                          emailId: newEmail.id,
                          from,
                          subject,
                          folder: folder.dbName,
                          receivedAt: date,
                          userId: emailAccount.userId,
                          organizationId: userOrg.organizationId
                        });
                      }
                    }

                    console.log(`✅ [AUTO-SYNC] Nouvel email créé: "${subject}" (UID: ${uid}, ${contentType})`);
                  } else if (existingEmail.isRead !== isRead) {
                    console.log(`📝 [AUTO-SYNC] Mise à jour statut email: "${subject}"`);
                    
                    await prisma.email.update({
                      where: { id: existingEmail.id },
                      data: { isRead }
                    });
                    updatedEmails++;
                    console.log(`📝 [AUTO-SYNC] Email mis à jour: "${subject}"`);
                  } else {
                    console.log(`⏭️ [AUTO-SYNC] Email déjà existant: "${subject}"`);
                  }
                } else {
                  console.warn(`⚠️ [AUTO-SYNC] Pas de header trouvé pour un email dans ${folder.imapName}`);
                  console.log(`🔍 [AUTO-SYNC] Debug - Parties disponibles:`, item.parts?.map((p: any) => ({ which: p.which, hasBody: !!p.body, bodyType: typeof p.body })));
                  console.log(`🔍 [AUTO-SYNC] Debug - Attributs:`, item.attributes);
                }
              } catch (emailError) {
                console.error(`❌ [AUTO-SYNC] Erreur traitement email dans ${folder.imapName}:`, emailError);
              }
            }
          } catch (folderError) {
            console.log(`⚠️ [AUTO-SYNC] Dossier ${folder.imapName} inaccessible, ignoré:`, folderError);
          }
        }

        connection.end();
        
        const duration = Date.now() - startTime;
        console.log(`⚡ [AUTO-SYNC] ${emailAccount.emailAddress}: ${newEmails} nouveaux, ${updatedEmails} mis à jour (${duration}ms)`);

      } catch (imapError) {
        if (connection) {
          try { connection.end(); } catch { /* ignore */ }
        }
        throw imapError;
      }

    } catch (error) {
      console.error(`❌ [AUTO-SYNC] Erreur pour ${emailAccount.emailAddress}:`, error);
    }

    const totalEmails = await prisma.email.count({
      where: { userId: emailAccount.userId }
    });

    return {
      userId: emailAccount.userId,
      newEmails,
      updatedEmails,
      totalEmails
    };
  }

  async forceSync(): Promise<void> {
    console.log('🔄 [AUTO-SYNC] Synchronisation forcée demandée...');
    await this.performSyncWithRetry();
  }

  private cleanHtmlContent(htmlContent: string): string {
    try {
      let cleanContent = htmlContent;

      // 🎯 PARSING MIME AVANCÉ - Gérer tous les types de délimiteurs
      if (cleanContent.includes('This is a multi-part message') || 
          cleanContent.match(/^--[a-zA-Z0-9]/m) ||
          cleanContent.includes('------=_NextPart_') ||
          cleanContent.includes('Content-Type:')) {
        
        console.log('🔧 [AUTO-SYNC] Email MIME multi-part détecté, parsing avancé...');
        
        // Extraire les parties MIME avec différents délimiteurs
        let parts = [];
        
        // Méthode 1: Délimiteurs --XXXXX
        if (cleanContent.match(/^--[a-zA-Z0-9]/m)) {
          parts = cleanContent.split(/^--[a-zA-Z0-9][^\n]*$/m);
        }
        // Méthode 2: Délimiteurs ------=_NextPart_
        else if (cleanContent.includes('------=_NextPart_')) {
          parts = cleanContent.split(/^------=_NextPart_[^\n]*$/m);
        }
        // Méthode 3: Autres délimiteurs MIME
        else {
          parts = cleanContent.split(/^--[=a-zA-Z0-9][^\n]*$/m);
        }
        
        let htmlPart = null;
        let textPart = null;
        
        // Analyser chaque partie
        for (const part of parts) {
          if (!part.trim()) continue;
          
          // Chercher la partie HTML
          if (part.includes('Content-Type: text/html') || 
              part.includes('Content-Type:text/html')) {
            
            console.log('✅ [AUTO-SYNC] Partie HTML trouvée');
            
            // Extraire le contenu après les en-têtes
            const lines = part.split('\n');
            let contentStartIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].trim() === '') {
                contentStartIndex = i + 1;
                break;
              }
            }
            
            if (contentStartIndex !== -1) {
              htmlPart = lines.slice(contentStartIndex).join('\n').trim();
              
              // Décoder quoted-printable si nécessaire
              if (part.includes('quoted-printable')) {
                htmlPart = htmlPart.replace(/=([0-9A-F]{2})/gi, (_, hex) => {
                  return String.fromCharCode(parseInt(hex, 16));
                });
                htmlPart = htmlPart.replace(/=\r?\n/g, '');
              }
              
              break;
            }
          }
          // Partie texte comme fallback
          else if (part.includes('Content-Type: text/plain') || 
                   part.includes('Content-Type:text/plain')) {
            
            const lines = part.split('\n');
            let contentStartIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].trim() === '') {
                contentStartIndex = i + 1;
                break;
              }
            }
            
            if (contentStartIndex !== -1) {
              textPart = lines.slice(contentStartIndex).join('\n').trim();
            }
          }
        }
        
        // Utiliser la partie HTML si trouvée, sinon le texte
        if (htmlPart) {
          console.log('🎯 [AUTO-SYNC] Utilisation de la partie HTML extraite');
          cleanContent = htmlPart;
        } else if (textPart) {
          console.log('📝 [AUTO-SYNC] Conversion texte → HTML');
          cleanContent = `<div style="white-space: pre-wrap; font-family: Arial, sans-serif; padding: 20px;">${textPart.replace(/\n/g, '<br>')}</div>`;
        } else {
          console.log('⚠️ [AUTO-SYNC] Aucune partie exploitable trouvée, nettoyage basique');
        }
      }

      // Décoder les caractères quoted-printable restants
      cleanContent = cleanContent.replace(/=([0-9A-F]{2})/gi, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      cleanContent = cleanContent.replace(/=\r?\n/g, '');

      // Corriger l'encodage UTF-8 mal interprété automatiquement
      cleanContent = fixUtf8Encoding(cleanContent);

      // Nettoyer les en-têtes MIME restants
      cleanContent = cleanContent.replace(/^[A-Za-z-]+:\s*.*$/gm, '');
      cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      cleanContent = cleanContent.replace(/^------=_NextPart_.*$/gm, '');
      cleanContent = cleanContent.replace(/This is a multi-part message in MIME format\./g, '');
      cleanContent = cleanContent.replace(/^Content-Type:.*$/gm, '');
      cleanContent = cleanContent.replace(/^Content-Transfer-Encoding:.*$/gm, '');
      cleanContent = cleanContent.replace(/^\s*charset.*$/gm, '');
      cleanContent = cleanContent.trim();

      // Chercher le début du HTML si ce n'est pas déjà fait
      const htmlTagIndex = cleanContent.search(/<html|<!DOCTYPE/i);
      if (htmlTagIndex >= 0) {
        cleanContent = cleanContent.substring(htmlTagIndex);
      }

      return cleanContent;
    } catch (error) {
      console.error('❌ [AUTO-SYNC] Erreur lors du nettoyage HTML:', error);
      return htmlContent;
    }
  }

  private cleanTextContent(textContent: string): string {
    try {
      let cleanContent = textContent;
      
      // Corriger l'encodage UTF-8 mal interprété automatiquement
      cleanContent = fixUtf8Encoding(cleanContent);
      
      const mimeHeaderPattern = /^[A-Za-z-]+:\s*.*$/gm;
      cleanContent = cleanContent.replace(mimeHeaderPattern, '');
      cleanContent = cleanContent.replace(/^------=_NextPart_.*$/gm, '');
      cleanContent = cleanContent.replace(/This is a multi-part message in MIME format\./g, '');
      cleanContent = cleanContent.trim();
      
      return cleanContent;
      
    } catch (error) {
      console.error('❌ [AUTO-SYNC] Erreur lors du nettoyage texte:', error);
      return textContent;
    }
  }
}

// Instance singleton
export const autoMailSync = new AutoMailSyncService();

export default AutoMailSyncService;

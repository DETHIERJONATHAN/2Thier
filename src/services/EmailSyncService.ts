import Imap from 'imap';
import { simpleParser } from 'mailparser';
import prisma from '../prisma.js';

interface ImapConfig {
  host: string;
  port: number;
  tls: boolean;
  user: string;
  password: string;
}

export class EmailSyncService {
  private imapConfig: ImapConfig;

  constructor(emailAddress: string, password: string) {
    // Configuration pour différents fournisseurs
    const domain = emailAddress.split('@')[1];
    
    this.imapConfig = this.getImapConfig(domain, emailAddress, password);
  }

  private getImapConfig(domain: string, email: string, password: string): ImapConfig {
    // Configuration pour différents fournisseurs
    const configs: { [key: string]: Partial<ImapConfig> } = {
      'gmail.com': {
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
      },
      'outlook.com': {
        host: 'outlook.office365.com',
        port: 993,
        tls: true,
      },
      'hotmail.com': {
        host: 'outlook.office365.com',
        port: 993,
        tls: true,
      },
      'yahoo.com': {
        host: 'imap.mail.yahoo.com',
        port: 993,
        tls: true,
      },
      // Configuration par défaut pour les domaines personnalisés
      'default': {
        host: `mail.${domain}`,
        port: 993,
        tls: true,
      }
    };

    const config = configs[domain] || configs['default'];
    
    return {
      host: config.host!,
      port: config.port!,
      tls: config.tls!,
      user: email,
      password: password,
    };
  }

  async syncEmails(userId: string, folder: string = 'INBOX'): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.imapConfig);

      imap.once('ready', () => {
        console.log(`📧 [IMAP] Connexion réussie pour ${this.imapConfig.user}`);
        
        imap.openBox(folder, false, (err, box) => {
          if (err) {
            console.error('Erreur ouverture boîte:', err);
            return reject(err);
          }

          console.log(`📧 [IMAP] Boîte ${folder} ouverte, ${box.messages.total} messages`);

          // Récupérer les 50 derniers emails
          const f = imap.seq.fetch(`${Math.max(1, box.messages.total - 49)}:*`, {
            bodies: '',
            struct: true
          });

          f.on('message', (msg, seqno) => {
            console.log(`📧 [IMAP] Traitement message ${seqno}`);
            let buffer = '';

            msg.on('body', (stream, _info) => {
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                
                await this.saveEmailToDatabase(userId, parsed, folder);
                console.log(`✅ [IMAP] Email ${seqno} sauvegardé`);
              } catch (error) {
                console.error(`❌ [IMAP] Erreur parsing email ${seqno}:`, error);
              }
            });
          });

          f.once('error', (err) => {
            console.error('Erreur fetch:', err);
            reject(err);
          });

          f.once('end', () => {
            console.log('✅ [IMAP] Synchronisation terminée');
            imap.end();
            resolve();
          });
        });
      });

      imap.once('error', (err) => {
        console.error('❌ [IMAP] Erreur connexion:', err);
        reject(err);
      });

      imap.once('end', () => {
        console.log('📧 [IMAP] Connexion fermée');
      });

      imap.connect();
    });
  }

  private async saveEmailToDatabase(userId: string, parsed: any, folder: string) {
    try {
      // Vérifier si l'email existe déjà
      const existingEmail = await prisma.email.findFirst({
        where: {
          userId,
          from: parsed.from?.text || '',
          subject: parsed.subject || '',
          // Utiliser la date comme identifiant unique approximatif
          createdAt: parsed.date || new Date(),
        }
      });

      if (existingEmail) {
        console.log('📧 Email déjà existant, ignoré');
        return;
      }

      await prisma.email.create({
        data: {
          userId,
          from: parsed.from?.text || '',
          to: parsed.to?.text || '',
          subject: parsed.subject || 'Sans sujet',
          body: parsed.html || parsed.text || '',
          contentType: parsed.html ? 'text/html' : 'text/plain',
          folder: this.mapFolderName(folder),
          isRead: false,
          isStarred: false,
          createdAt: parsed.date || new Date(),
          uid: parsed.messageId || null,
        }
      });
    } catch (error) {
      console.error('❌ Erreur sauvegarde email:', error);
    }
  }

  private mapFolderName(imapFolder: string): string {
    const folderMap: { [key: string]: string } = {
      'INBOX': 'inbox',
      'Sent': 'sent',
      'Drafts': 'drafts',
      'Trash': 'trash',
      'Junk': 'spam',
    };
    
    return folderMap[imapFolder] || 'inbox';
  }
}

/**
 * Synchronise les emails pour un utilisateur donné
 */
export async function syncUserEmails(userId: string): Promise<void> {
  try {
    // Récupérer le compte email de l'utilisateur
    const emailAccount = await prisma.emailAccount.findUnique({
      where: { userId }
    });

    if (!emailAccount) {
      throw new Error('Aucun compte email trouvé pour cet utilisateur');
    }

    // Déchiffrer le mot de passe (pour l'instant on utilise le même)
    // TODO: Implémenter le déchiffrement
    const password = emailAccount.encryptedPassword || '';
    if (!password) {
      throw new Error('Aucun mot de passe configuré pour ce compte email');
    }

    const syncService = new EmailSyncService(emailAccount.emailAddress, password);
    
    console.log(`🔄 [SYNC] Début synchronisation pour ${emailAccount.emailAddress}`);
    await syncService.syncEmails(userId);
    console.log(`✅ [SYNC] Synchronisation terminée pour ${emailAccount.emailAddress}`);
    
  } catch (error) {
    console.error('❌ [SYNC] Erreur synchronisation:', error);
    throw error;
  }
}

import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import prisma from '../prisma.js';

export class YandexMailService {
  private smtpTransporter: nodemailer.Transporter;
  private imapConfig: any;
  private userEmail: string;

  constructor(emailAddress: string, password: string) {
    this.userEmail = emailAddress;
    
    // Configuration SMTP Yandex
    this.smtpTransporter = nodemailer.createTransport({
      host: 'smtp.yandex.com',
      port: 465,
      secure: true,
      auth: {
        user: emailAddress,
        pass: password
      }
    });

    // Configuration IMAP Yandex
    this.imapConfig = {
      user: emailAddress,
      password: password,
      host: 'imap.yandex.com',
      port: 993,
      tls: true,
      authTimeout: 3000,
      connTimeout: 10000
    };
  }

  /**
   * Envoie un email via SMTP Yandex
   */
  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = false): Promise<nodemailer.SentMessageInfo> {
    try {
      const mailOptions = {
        from: this.userEmail,
        to: to,
        subject: subject,
        [isHtml ? 'html' : 'text']: body
      };

      console.log(`📤 [YANDEX] Envoi email de ${this.userEmail} vers ${to}`);
      const info = await this.smtpTransporter.sendMail(mailOptions);
      console.log(`✅ [YANDEX] Email envoyé: ${info.messageId}`);
      
      return info;
    } catch (error) {
      console.error('❌ [YANDEX] Erreur envoi email:', error);
      throw error;
    }
  }

  /**
   * Synchronise les emails depuis IMAP Yandex
   */
  async syncEmails(userId: string, folder: string = 'INBOX'): Promise<number> {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.imapConfig);
      let emailCount = 0;

      console.log(`📥 [YANDEX] Connexion IMAP pour ${this.userEmail}`);

      imap.once('ready', () => {
        console.log(`✅ [YANDEX] Connexion IMAP réussie`);
        
        imap.openBox(folder, false, (err, box) => {
          if (err) {
            console.error('❌ [YANDEX] Erreur ouverture boîte:', err);
            return reject(err);
          }

          console.log(`📂 [YANDEX] Boîte ${folder} ouverte: ${box.messages.total} messages`);

          if (box.messages.total === 0) {
            imap.end();
            return resolve(0);
          }

          // Récupérer les 50 derniers emails
          const start = Math.max(1, box.messages.total - 49);
          const fetch = imap.seq.fetch(`${start}:*`, {
            bodies: '',
            struct: true,
            envelope: true
          });

          fetch.on('message', (msg, seqno) => {
            console.log(`📧 [YANDEX] Traitement message ${seqno}`);
            let buffer = '';
            let uid = null;

            msg.on('body', (stream, _info) => {
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
            });

            msg.once('attributes', (attrs) => {
              uid = attrs.uid;
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                await this.saveEmailToDatabase(userId, parsed, folder, uid);
                emailCount++;
                console.log(`✅ [YANDEX] Email ${seqno} sauvegardé (${emailCount} total)`);
              } catch (error) {
                console.error(`❌ [YANDEX] Erreur traitement email ${seqno}:`, error);
              }
            });
          });

          fetch.once('error', (err) => {
            console.error('❌ [YANDEX] Erreur fetch:', err);
            reject(err);
          });

          fetch.once('end', () => {
            console.log(`✅ [YANDEX] Synchronisation terminée: ${emailCount} emails traités`);
            imap.end();
            resolve(emailCount);
          });
        });
      });

      imap.once('error', (err) => {
        console.error('❌ [YANDEX] Erreur connexion IMAP:', err);
        reject(err);
      });

      imap.once('end', () => {
        console.log('📥 [YANDEX] Connexion IMAP fermée');
      });

      imap.connect();
    });
  }

  /**
   * Sauvegarde un email dans la base de données
   */
  private async saveEmailToDatabase(userId: string, parsed: any, folder: string, uid: number | null) {
    try {
      // Vérifier si l'email existe déjà par UID
      if (uid) {
        const existing = await prisma.email.findFirst({
          where: { userId, uid: uid.toString() }
        });
        if (existing) {
          console.log(`📧 [YANDEX] Email UID ${uid} déjà existant`);
          return;
        }
      }

      // Déterminer le dossier correct
      const folderName = this.mapYandexFolder(folder);
      
      // Extraire les adresses email proprement
      const fromEmail = this.extractEmail(parsed.from);
      const toEmail = this.extractEmail(parsed.to);

      await prisma.email.create({
        data: {
          userId,
          from: fromEmail,
          to: toEmail,
          subject: parsed.subject || 'Sans sujet',
          body: parsed.html || parsed.text || '',
          contentType: parsed.html ? 'text/html' : 'text/plain',
          folder: folderName,
          isRead: false,
          isStarred: false,
          uid: uid ? uid.toString() : null,
          createdAt: parsed.date || new Date(),
        }
      });

      console.log(`💾 [YANDEX] Email sauvegardé: ${parsed.subject}`);
    } catch (error) {
      console.error('❌ [YANDEX] Erreur sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Extrait l'adresse email d'un objet address
   */
  private extractEmail(addressObj: any): string {
    if (!addressObj) return '';
    if (typeof addressObj === 'string') return addressObj;
    if (Array.isArray(addressObj) && addressObj.length > 0) {
      return addressObj[0].address || addressObj[0].text || '';
    }
    if (addressObj.address) return addressObj.address;
    if (addressObj.text) return addressObj.text;
    return '';
  }

  /**
   * Mappe les dossiers Yandex vers nos dossiers
   */
  private mapYandexFolder(yandexFolder: string): string {
    const folderMap: { [key: string]: string } = {
      'INBOX': 'inbox',
      'Sent': 'sent',
      'Отправленные': 'sent', // Yandex en russe
      'Drafts': 'drafts',
      'Черновики': 'drafts', // Yandex en russe
      'Trash': 'trash',
      'Удалённые': 'trash', // Yandex en russe
      'Junk': 'spam',
      'Спам': 'spam', // Yandex en russe
    };
    
    return folderMap[yandexFolder] || 'inbox';
  }

  /**
   * Test de connexion Yandex
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🧪 [YANDEX] Test connexion pour ${this.userEmail}`);
      
      // Test SMTP
      await this.smtpTransporter.verify();
      console.log(`✅ [YANDEX] Connexion SMTP OK`);
      
      // Test IMAP (connexion rapide)
      const imap = new Imap(this.imapConfig);
      
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          console.log(`✅ [YANDEX] Connexion IMAP OK`);
          imap.end();
          resolve(true);
        });

        imap.once('error', (err) => {
          console.error('❌ [YANDEX] Erreur test IMAP:', err);
          reject(false);
        });

        imap.connect();
      });
      
    } catch (error) {
      console.error('❌ [YANDEX] Erreur test connexion:', error);
      return false;
    }
  }
}

/**
 * Fonction utilitaire pour créer un service Yandex pour un utilisateur
 */
export async function createYandexServiceForUser(userId: string): Promise<YandexMailService> {
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { userId }
  });

  if (!emailAccount) {
    throw new Error('Aucun compte email trouvé pour cet utilisateur');
  }

  // TODO: Déchiffrer le mot de passe
  // Pour l'instant, nous devons demander à l'utilisateur de saisir son mot de passe Yandex
  const password = 'MOT_DE_PASSE_TEMPORAIRE'; // À remplacer par le vrai mot de passe

  return new YandexMailService(emailAccount.emailAddress, password);
}

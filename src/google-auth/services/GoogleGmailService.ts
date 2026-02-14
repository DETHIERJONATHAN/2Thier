/**
 * GOOGLE GMAIL SERVICE - SERVICE CENTRALISÉ
 * 
 * Service pour toutes les opérations Gmail utilisant l'authentification centralisée.
 * Ce service garantit l'utilisation correcte des tokens d'organisation.
 */

import { google, gmail_v1 } from 'googleapis';
import { googleAuthManager } from '../core/GoogleAuthManager';

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface FormattedGmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  snippet: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  htmlBody?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayloadPart {
  mimeType?: string;
  filename?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailPayloadPart[];
}

export interface GmailDraft {
  draftId: string;
  messageId: string;
  subject: string;
  to: string;
  cc?: string;
  bcc?: string;
  body: string;
  isHtml?: boolean;
  date: Date;
}

export class GoogleGmailService {
  private gmail: gmail_v1.Gmail;
  private organizationId: string;
  private userId: string | null = null;
  private adminEmail: string | null = null;
  private userEmail: string | null = null;
  private userFullName: string | null = null;

  constructor(gmail: gmail_v1.Gmail, organizationId: string, userId?: string) {
    this.gmail = gmail;
    this.organizationId = organizationId;
    this.userId = userId || null;
  }

  /**
   * Crée une instance du service Gmail pour un utilisateur dans une organisation
   */
  static async create(organizationId: string, userId?: string): Promise<GoogleGmailService | null> {
    console.log(`[GoogleGmailService] Création du service pour l'organisation: ${organizationId}, utilisateur: ${userId || 'non spécifié'}`);
    
    const authClient = await googleAuthManager.getAuthenticatedClient(organizationId, userId);
    if (!authClient) {
      console.error(`[GoogleGmailService] Impossible d'obtenir le client authentifié pour l'organisation: ${organizationId}`);
      return null;
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient });
    const service = new GoogleGmailService(gmail, organizationId, userId);
    
    // Récupérer l'email administrateur pour l'utiliser comme expéditeur
    await service.loadOrganizationInfo();
    
    return service;
  }

  /**
   * Charge les informations de l'organisation (email admin, etc.)
   */
  private async loadOrganizationInfo(): Promise<void> {
    try {
      // Utilisation du singleton centralisé
      const { db } = await import('../../lib/database');
      
      const organization = await db.organization.findUnique({
        where: { id: this.organizationId },
        include: {
          GoogleWorkspaceConfig: true,
        },
      });

      if (organization?.GoogleWorkspaceConfig?.adminEmail) {
        this.adminEmail = organization.GoogleWorkspaceConfig.adminEmail;
        console.log(`[GoogleGmailService] 📧 Email admin chargé: ${this.adminEmail}`);
      } else {
        console.warn(`[GoogleGmailService] ⚠️ Email admin non trouvé pour l'organisation ${this.organizationId}`);
      }

      // 🎯 Charger l'email du user connecté (pour envoyer depuis SON adresse)
      if (this.userId) {
        const googleToken = await db.googleToken.findUnique({
          where: { userId_organizationId: { userId: this.userId, organizationId: this.organizationId } },
        });
        if (googleToken?.googleEmail) {
          this.userEmail = googleToken.googleEmail;
          console.log(`[GoogleGmailService] 📧 Email user Google chargé: ${this.userEmail}`);
        }
        // Charger aussi le nom complet du user
        const user = await db.user.findUnique({ where: { id: this.userId } });
        if (user) {
          this.userFullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
        }
      }
    } catch (error) {
      console.error('[GoogleGmailService] Erreur lors du chargement des infos organisation:', error);
    }
  }

  /**
   * Récupère la liste des messages Gmail
   */
  async getMessages(options: {
    maxResults?: number;
    pageToken?: string;
    q?: string; // Query de recherche Gmail
    labelIds?: string[];
  } = {}): Promise<{
    messages: FormattedGmailMessage[];
    nextPageToken?: string;
    totalEstimate?: number;
  }> {
    console.log('[GoogleGmailService] Récupération des messages Gmail...');

    const {
      maxResults = 10,
      pageToken,
      q,
      labelIds
    } = options;

    try {
      // Récupérer la liste des messages
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken,
        q,
        labelIds
      });

      const messages = messagesResponse.data.messages || [];
      console.log(`[GoogleGmailService] ${messages.length} messages trouvés`);

      // Récupérer les détails de chaque message
      const formattedMessages: FormattedGmailMessage[] = [];
      
      for (const message of messages) {
        if (message.id) {
          const messageDetails = await this.getMessageDetails(message.id);
          if (messageDetails) {
            formattedMessages.push(messageDetails);
          }
        }
      }

      return {
        messages: formattedMessages,
        nextPageToken: messagesResponse.data.nextPageToken,
        totalEstimate: messagesResponse.data.resultSizeEstimate
      };
    } catch (error) {
      console.error('[GoogleGmailService] Erreur lors de la récupération des messages:', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un message Gmail
   */
  async getMessageDetails(messageId: string): Promise<FormattedGmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      if (!message.payload || !message.payload.headers) {
        return null;
      }

      const headers = message.payload.headers;
      const getHeader = (name: string): string => {
        const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
        return header?.value || '';
      };

      // Extraire le contenu HTML
      let htmlBody = '';
      if (message.payload.parts) {
        htmlBody = this.extractHtmlFromParts(message.payload.parts);
      } else if (message.payload.body?.data) {
        htmlBody = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      }

      // Extraire les pièces jointes
      const attachments = this.extractAttachments(message.payload);

      return {
        id: message.id!,
        threadId: message.threadId!,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: new Date(parseInt(message.internalDate || '0')),
        snippet: message.snippet || '',
        labels: message.labelIds || [],
        isRead: !message.labelIds?.includes('UNREAD'),
        isStarred: message.labelIds?.includes('STARRED') || false,
        hasAttachments: attachments.length > 0,
        attachments,
        htmlBody
      };
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la récupération du message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Envoie un email - COMME GMAIL FAIT
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    cc?: string;
    bcc?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      mimeType: string;
    }>;
    fromName?: string;
  }): Promise<{ messageId: string } | null> {
    console.log(`[GoogleGmailService] 📧 Envoi email à: ${options.to}`);

    try {
      const boundary = '----=_Part_' + Date.now();
      let messageParts: string[] = [];
      
      // HEADERS - envoyer depuis l'email du user connecté (fallback vers admin)
      const fromEmail = this.userEmail || this.adminEmail;
      const fromName = options.fromName || this.userFullName || '2Thier CRM';
      messageParts.push(`From: ${fromName} <${fromEmail}>`);
      messageParts.push(`To: ${options.to}`);
      messageParts.push(`Subject: ${options.subject}`);
      messageParts.push(`Reply-To: ${fromName} <${fromEmail}>`);
      messageParts.push(`Date: ${new Date().toUTCString()}`);
      messageParts.push(`Message-ID: <${Date.now()}.${Math.random().toString(36).substring(2)}@${fromEmail.split('@')[1] || '2thier.be'}>`);
      messageParts.push(`X-Mailer: 2Thier CRM`);
      
      if (options.cc) messageParts.push(`Cc: ${options.cc}`);
      if (options.bcc) messageParts.push(`Bcc: ${options.bcc}`);
      
      messageParts.push(`MIME-Version: 1.0`);
      
      if (options.attachments && options.attachments.length > 0) {
        // Avec pièces jointes
        messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        messageParts.push('');
        messageParts.push(`--${boundary}`);
        messageParts.push(`Content-Type: ${options.isHtml ? 'text/html' : 'text/plain'}; charset="UTF-8"`);
        messageParts.push('');
        messageParts.push(options.body);
        
        for (const att of options.attachments) {
          messageParts.push(`--${boundary}`);
          messageParts.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
          messageParts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
          messageParts.push(`Content-Transfer-Encoding: base64`);
          messageParts.push('');
          messageParts.push(att.content.toString('base64'));
        }
        messageParts.push(`--${boundary}--`);
      } else {
        // Sans pièces jointes - SIMPLE comme Gmail
        messageParts.push(`Content-Type: ${options.isHtml ? 'text/html' : 'text/plain'}; charset="UTF-8"`);
        messageParts.push('');
        messageParts.push(options.body);
      }
      
      const rawMessage = messageParts.join('\r\n');
      
      // Encoder pour Gmail API (URL-safe base64)
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      console.log(`[GoogleGmailService] ✅ Email envoyé: ${response.data.id}`);
      return { messageId: response.data.id! };
    } catch (error) {
      console.error('[GoogleGmailService] ❌ Erreur envoi:', error);
      return null;
    }
  }

  /**
   * Récupère les labels Gmail
   */
  async getLabels(): Promise<GmailLabel[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      return (response.data.labels || []).map(label => ({
        id: label.id!,
        name: label.name!,
        type: label.type!,
        messageListVisibility: label.messageListVisibility,
        labelListVisibility: label.labelListVisibility
      }));
    } catch (error) {
      console.error('[GoogleGmailService] Erreur lors de la récupération des labels:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau label/dossier personnalisé
   */
  async createLabel(name: string): Promise<GmailLabel | null> {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          messageListVisibility: 'show',
          labelListVisibility: 'labelShow'
        }
      });

      if (response.data) {
        console.log(`[GoogleGmailService] Label "${name}" créé avec l'ID: ${response.data.id}`);
        return {
          id: response.data.id!,
          name: response.data.name!,
          type: response.data.type!,
          messageListVisibility: response.data.messageListVisibility,
          labelListVisibility: response.data.labelListVisibility
        };
      }
      return null;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la création du label "${name}":`, error);
      return null;
    }
  }

  /**
   * Modifie un label existant
   */
  async updateLabel(labelId: string, name: string): Promise<boolean> {
    try {
      await this.gmail.users.labels.update({
        userId: 'me',
        id: labelId,
        requestBody: {
          name,
          messageListVisibility: 'show',
          labelListVisibility: 'labelShow'
        }
      });

      console.log(`[GoogleGmailService] Label ${labelId} renommé en "${name}"`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la modification du label ${labelId}:`, error);
      return false;
    }
  }

  /**
   * Supprime un label (seuls les labels personnalisés peuvent être supprimés)
   */
  async deleteLabel(labelId: string): Promise<boolean> {
    try {
      await this.gmail.users.labels.delete({
        userId: 'me',
        id: labelId
      });

      console.log(`[GoogleGmailService] Label ${labelId} supprimé`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la suppression du label ${labelId}:`, error);
      return false;
    }
  }

  /**
   * Marque un message comme lu/non lu
   */
  async markAsRead(messageId: string, read: boolean = true): Promise<boolean> {
    try {
      const labelsToAdd = read ? [] : ['UNREAD'];
      const labelsToRemove = read ? ['UNREAD'] : [];

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: labelsToAdd,
          removeLabelIds: labelsToRemove
        }
      });

      console.log(`[GoogleGmailService] Message ${messageId} marqué comme ${read ? 'lu' : 'non lu'}`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors du marquage du message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Supprime un message
   */
  /**
   * Marque ou enlève l'étoile d'un message
   * LOGIQUE PRÉCISE : 
   * - Ajouter étoile = SEULEMENT ajouter STARRED (ne pas toucher aux autres labels)
   * - Retirer étoile = SEULEMENT retirer STARRED (ne pas toucher aux autres labels)
   */
  async markAsStarred(messageId: string, starred: boolean = true): Promise<boolean> {
    try {
      const labelChanges: { addLabelIds?: string[]; removeLabelIds?: string[] } = {};
      
      if (starred) {
        // ⭐ AJOUTER seulement STARRED, ne pas toucher aux autres labels
        labelChanges.addLabelIds = ['STARRED'];
        console.log(`[GoogleGmailService] ⭐ Ajout STARRED uniquement (autres labels préservés)`);
      } else {
        // ⭐ RETIRER seulement STARRED, ne pas toucher aux autres labels
        labelChanges.removeLabelIds = ['STARRED'];
        console.log(`[GoogleGmailService] ⭐ Retrait STARRED uniquement (autres labels préservés)`);
      }

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: labelChanges
      });

      console.log(`[GoogleGmailService] Message ${messageId} ${starred ? 'marqué en favori' : 'retiré des favoris'} - autres labels intacts`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la modification du favori pour ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Déplace un message vers la corbeille
   * LOGIQUE SIMPLE : Ajoute SEULEMENT le label TRASH, sans retirer d'autres labels
   * Pour supprimer complètement, utiliser deleteMessage
   */
  async trashMessage(messageId: string): Promise<boolean> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['TRASH']
          // Ne pas retirer INBOX automatiquement - gestion indépendante
        }
      });

      console.log(`[GoogleGmailService] Message ${messageId} déplacé vers la corbeille (autres labels préservés)`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors du déplacement vers la corbeille pour ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Supprime un message d'un emplacement spécifique (retire seulement le label demandé)
   * Utilisé pour supprimer de boîte de réception, favoris, ou dossier sans affecter les autres emplacements
   */
  async removeFromLocation(messageId: string, labelToRemove: string): Promise<boolean> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: [labelToRemove]
          // Ne retire QUE le label spécifié, garde tous les autres
        }
      });

      console.log(`[GoogleGmailService] Message ${messageId} retiré de l'emplacement ${labelToRemove} (autres emplacements préservés)`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la suppression de ${labelToRemove} pour ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Restaure un message de la corbeille
   * LOGIQUE SIMPLE : Retire SEULEMENT le label TRASH
   */
  async untrashMessage(messageId: string): Promise<boolean> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['TRASH']
          // Ne pas ajouter INBOX automatiquement - l'utilisateur choisira où le remettre
        }
      });

      console.log(`[GoogleGmailService] Message ${messageId} restauré de la corbeille`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la restauration de ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Modifie les labels d'un message (pour gestion des dossiers)
   * LOGIQUE SIMPLE ET PRÉCISE :
   * - Suppression spécifique = retire SEULEMENT le label demandé
   * - Ajout spécifique = ajoute SEULEMENT le label demandé
   * - Chaque emplacement (INBOX, STARRED, dossier) est géré INDÉPENDAMMENT
   */
  async modifyLabels(messageId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []): Promise<boolean> {
    try {
      const requestBody: { addLabelIds?: string[]; removeLabelIds?: string[] } = {};
      
      // ✅ AJOUT SIMPLE : Ajouter exactement les labels demandés
      if (addLabelIds.length > 0) {
        requestBody.addLabelIds = addLabelIds;
        console.log(`[GoogleGmailService] ➕ Ajout des labels: ${addLabelIds.join(', ')}`);
      }
      
      // ✅ SUPPRESSION SIMPLE : Retirer exactement les labels demandés
      if (removeLabelIds.length > 0) {
        requestBody.removeLabelIds = removeLabelIds;
        console.log(`[GoogleGmailService] ➖ Suppression des labels: ${removeLabelIds.join(', ')}`);
      }

      // Effectuer la modification EXACTE
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody
      });

      console.log(`[GoogleGmailService] ✅ Labels modifiés pour ${messageId}:`, { 
        ajoutés: requestBody.addLabelIds, 
        retirés: requestBody.removeLabelIds,
        logique: 'Gestion indépendante - aucune protection automatique'
      });
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la modification des labels pour ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Supprime définitivement un message (suppression irréversible)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId
      });

      console.log(`[GoogleGmailService] Message ${messageId} supprimé définitivement`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] Erreur lors de la suppression du message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Sauvegarde un email en brouillon
   * FONCTIONNALITÉ ESSENTIELLE : Auto-sauvegarde pour ne jamais perdre un email en cours
   */
  async saveDraft(options: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    cc?: string;
    bcc?: string;
    draftId?: string; // Pour mettre à jour un brouillon existant
  }): Promise<{ draftId: string; messageId: string } | null> {
    console.log(`[GoogleGmailService] 💾 Sauvegarde en brouillon: "${options.subject}" -> ${options.to}`);

    try {
      // Construction du message MIME
      let message = '';
      
      // Headers
      message += `To: ${options.to}\r\n`;
      message += `Subject: ${options.subject}\r\n`;
      if (options.cc) {
        message += `Cc: ${options.cc}\r\n`;
      }
      if (options.bcc) {
        message += `Bcc: ${options.bcc}\r\n`;
      }
      
      const contentType = options.isHtml ? 'text/html' : 'text/plain';
      message += `Content-Type: ${contentType}; charset=utf-8\r\n`;
      message += `\r\n`;
      message += options.body;

      // Encoder en base64
      const encodedMessage = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      let response;
      
      if (options.draftId) {
        // 🔄 MISE À JOUR d'un brouillon existant
        console.log(`[GoogleGmailService] 🔄 Mise à jour du brouillon existant: ${options.draftId}`);
        response = await this.gmail.users.drafts.update({
          userId: 'me',
          id: options.draftId,
          requestBody: {
            message: {
              raw: encodedMessage
            }
          }
        });
      } else {
        // ✨ CRÉATION d'un nouveau brouillon
        console.log(`[GoogleGmailService] ✨ Création d'un nouveau brouillon`);
        response = await this.gmail.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: {
              raw: encodedMessage
            }
          }
        });
      }

      const draftId = response.data.id!;
      const messageId = response.data.message?.id || '';
      
      console.log(`[GoogleGmailService] ✅ Brouillon sauvegardé - ID: ${draftId}, Message: ${messageId}`);
      return { draftId, messageId };
    } catch (error) {
      console.error('[GoogleGmailService] ❌ Erreur lors de la sauvegarde en brouillon:', error);
      return null;
    }
  }

  /**
   * Récupère tous les brouillons
   */
  async getDrafts(): Promise<{
    drafts: Array<{
      draftId: string;
      messageId: string;
      subject: string;
      to: string;
      body: string;
      date: Date;
    }>;
  }> {
    console.log('[GoogleGmailService] 📄 Récupération des brouillons...');

    try {
      const draftsResponse = await this.gmail.users.drafts.list({
        userId: 'me'
      });

      const drafts = draftsResponse.data.drafts || [];
      console.log(`[GoogleGmailService] ${drafts.length} brouillons trouvés`);

      // Récupérer les détails de chaque brouillon
      const formattedDrafts = [];
      
      for (const draft of drafts) {
        if (draft.id && draft.message?.id) {
          try {
            const draftDetails = await this.gmail.users.drafts.get({
              userId: 'me',
              id: draft.id,
              format: 'full'
            });

            const message = draftDetails.data.message;
            if (message?.payload?.headers) {
              const headers = message.payload.headers;
              const getHeader = (name: string): string => {
                const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
                return header?.value || '';
              };

              // Extraire le contenu
              let body = '';
              if (message.payload.parts) {
                body = this.extractTextFromParts(message.payload.parts);
              } else if (message.payload.body?.data) {
                body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
              }

              formattedDrafts.push({
                draftId: draft.id,
                messageId: draft.message.id,
                subject: getHeader('Subject'),
                to: getHeader('To'),
                body: body,
                date: new Date(parseInt(message.internalDate || '0'))
              });
            }
          } catch (error) {
            console.error(`[GoogleGmailService] Erreur lors de la récupération du brouillon ${draft.id}:`, error);
          }
        }
      }

      console.log(`[GoogleGmailService] ✅ ${formattedDrafts.length} brouillons formatés récupérés`);
      return { drafts: formattedDrafts };
    } catch (error) {
      console.error('[GoogleGmailService] ❌ Erreur lors de la récupération des brouillons:', error);
      return { drafts: [] };
    }
  }

  /**
   * Supprime un brouillon
   */
  async deleteDraft(draftId: string): Promise<boolean> {
    try {
      await this.gmail.users.drafts.delete({
        userId: 'me',
        id: draftId
      });

      console.log(`[GoogleGmailService] 🗑️ Brouillon ${draftId} supprimé`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] ❌ Erreur lors de la suppression du brouillon ${draftId}:`, error);
      return false;
    }
  }

  /**
   * Envoie un brouillon (convertit le brouillon en email envoyé)
   */
  async sendDraft(draftId: string): Promise<{ messageId: string } | null> {
    console.log(`[GoogleGmailService] 📤 Envoi du brouillon: ${draftId}`);

    try {
      const response = await this.gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: draftId
        }
      });

      console.log(`[GoogleGmailService] ✅ Brouillon envoyé - Message ID: ${response.data.id}`);
      return { messageId: response.data.id! };
    } catch (error) {
      console.error(`[GoogleGmailService] ❌ Erreur lors de l'envoi du brouillon ${draftId}:`, error);
      return null;
    }
  }

  /**
   * Vide complètement la corbeille (supprime tous les messages avec le label TRASH)
   */
  async emptyTrash(): Promise<boolean> {
    try {
      console.log(`[GoogleGmailService] 🔥 DÉBUT du vidage de la corbeille...`);
      
      let allMessages: { id?: string | null }[] = [];
      let pageToken: string | undefined = undefined;
      let totalPages = 0;
      
      // 🔄 ÉTAPE 1: Récupérer TOUS les messages de la corbeille (pagination complète)
      do {
        totalPages++;
        console.log(`[GoogleGmailService] 📄 Récupération page ${totalPages} des messages de la corbeille...`);
        
        const trashMessages = await this.gmail.users.messages.list({
          userId: 'me',
          labelIds: ['TRASH'],
          maxResults: 100, // Maximum par page
          pageToken: pageToken
        });

        const pageMessages = trashMessages.data.messages || [];
        allMessages = allMessages.concat(pageMessages);
        pageToken = trashMessages.data.nextPageToken;
        
        console.log(`[GoogleGmailService] 📄 Page ${totalPages}: ${pageMessages.length} messages trouvés`);
      } while (pageToken);
      
      console.log(`[GoogleGmailService] 📊 TOTAL: ${allMessages.length} messages trouvés dans la corbeille sur ${totalPages} pages`);
      
      if (allMessages.length === 0) {
        console.log(`[GoogleGmailService] ✅ La corbeille est déjà vide`);
        return true;
      }

      // 🗑️ ÉTAPE 2: Supprimer chaque message définitivement
      let deletedCount = 0;
      for (const message of allMessages) {
        if (message.id) {
          try {
            await this.deleteMessage(message.id);
            deletedCount++;
            if (deletedCount % 10 === 0) {
              console.log(`[GoogleGmailService] 🗑️ Progression: ${deletedCount}/${allMessages.length} messages supprimés...`);
            }
          } catch (error) {
            console.error(`[GoogleGmailService] ❌ Erreur lors de la suppression du message ${message.id}:`, error);
          }
        }
      }

      console.log(`[GoogleGmailService] ✅ Vidage terminé: ${deletedCount}/${allMessages.length} messages supprimés de la corbeille`);
      return true;
    } catch (error) {
      console.error(`[GoogleGmailService] ❌ Erreur lors du vidage de la corbeille:`, error);
      return false;
    }
  }

  // Méthodes utilitaires privées

  private extractHtmlFromParts(parts: GmailPayloadPart[]): string {
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const html = this.extractHtmlFromParts(part.parts);
        if (html) return html;
      }
    }
    return '';
  }

  private extractTextFromParts(parts: GmailPayloadPart[]): string {
    for (const part of parts) {
      // Priorité au texte brut pour les brouillons
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      // Sinon prendre le HTML
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const text = this.extractTextFromParts(part.parts);
        if (text) return text;
      }
    }
    return '';
  }

  /**
   * Récupère une pièce jointe d'un message Gmail
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<{
    data: Buffer;
    filename: string;
    mimeType: string;
  } | null> {
    try {
      console.log(`[GoogleGmailService] 📎 Récupération pièce jointe: ${attachmentId} du message: ${messageId}`);
      
      // D'abord, récupérer les informations du message pour obtenir le nom et type de fichier
      const messageResponse = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      let attachmentInfo = { filename: '', mimeType: 'application/octet-stream' };

      // Rechercher les informations de la pièce jointe dans le payload
      const findAttachmentInfo = (parts: any[]): void => {
        for (const part of parts) {
          if (part.body?.attachmentId === attachmentId) {
            attachmentInfo = {
              filename: part.filename || `attachment_${attachmentId}`,
              mimeType: part.mimeType || 'application/octet-stream'
            };
            return;
          }
          if (part.parts) {
            findAttachmentInfo(part.parts);
          }
        }
      };

      if (messageResponse.data.payload?.parts) {
        findAttachmentInfo(messageResponse.data.payload.parts);
      } else if (messageResponse.data.payload?.body?.attachmentId === attachmentId) {
        attachmentInfo = {
          filename: messageResponse.data.payload.filename || `attachment_${attachmentId}`,
          mimeType: messageResponse.data.payload.mimeType || 'application/octet-stream'
        };
      }

      // Récupérer les données de la pièce jointe
      const attachmentResponse = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      });

      if (attachmentResponse.data.data) {
        // Décoder les données base64url
        const data = attachmentResponse.data.data.replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(data, 'base64');
        
        console.log(`[GoogleGmailService] ✅ Pièce jointe récupérée: ${attachmentInfo.filename} (${buffer.length} bytes)`);
        
        return {
          data: buffer,
          filename: attachmentInfo.filename,
          mimeType: attachmentInfo.mimeType
        };
      }

      console.log(`[GoogleGmailService] ❌ Aucune donnée trouvée pour la pièce jointe: ${attachmentId}`);
      return null;
    } catch (error) {
      console.error('[GoogleGmailService] Erreur récupération pièce jointe:', error);
      throw error;
    }
  }

  private extractAttachments(payload: any): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const findAttachments = (parts: any[]): void => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            attachmentId: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0
          });
        }
        if (part.parts) {
          findAttachments(part.parts);
        }
      }
    };

    if (payload.parts) {
      findAttachments(payload.parts);
    }

    return attachments;
  }
}

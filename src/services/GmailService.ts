import { google } from 'googleapis';
import { Auth } from 'google-auth-library';
import { AutoGoogleAuthService } from './AutoGoogleAuthService.js';
import { GaxiosError } from 'gaxios';

class GmailService {
  private getOAuthClientForUser(userId: string): Auth.OAuth2Client {
    const authService = AutoGoogleAuthService.getInstance();
    const oauth2Client = authService.getOAuth2ClientForUser(userId);
    if (!oauth2Client) {
      throw new Error(`User ${userId} is not authenticated with Google.`);
    }
    return oauth2Client;
  }

  private async getGmailClient(userId: string) {
    const oauth2Client = this.getOAuthClientForUser(userId);
    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  // Extrait un header spécifique d'une liste de headers
  private extractHeader(headers: any[], name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  }

  // Décode le corps d'un message (Base64URL)
  private decodeBody(bodyData: string | undefined): string {
    if (!bodyData) return '';
    return Buffer.from(bodyData, 'base64url').toString('utf-8');
  }

  // Trouve la meilleure partie du corps de l'email à afficher
  private getMessageBody(payload: any): string {
    let body = '';
    if (payload.parts) {
      // Préférer le HTML
      const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
      if (htmlPart && htmlPart.body?.data) {
        body = this.decodeBody(htmlPart.body.data);
      } else {
        // Sinon, prendre le texte brut
        const textPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
        if (textPart && textPart.body?.data) {
          body = this.decodeBody(textPart.body.data);
        }
      }
    } else if (payload.body?.data) {
      body = this.decodeBody(payload.body.data);
    }
    return body;
  }

  async listThreads(userId: string, mailbox: string) {
    try {
      const gmail = await this.getGmailClient(userId);
      const response = await gmail.users.threads.list({
        userId: 'me',
        labelIds: [mailbox.toUpperCase()],
        maxResults: 30,
      });

      const threads = response.data.threads || [];
      if (threads.length === 0) {
        return [];
      }

      const threadDetailsPromises = threads.map(thread =>
        gmail.users.threads.get({ userId: 'me', id: thread.id!, format: 'metadata', metadataHeaders: ['Subject', 'From', 'To', 'Date'] })
      );

      const detailedThreads = await Promise.all(threadDetailsPromises);

      const formattedThreads = detailedThreads.map(res => {
        const firstMessage = res.data.messages?.[0];
        const headers = firstMessage?.payload?.headers || [];
        
        return {
          id: res.data.id!,
          subject: this.extractHeader(headers, 'Subject'),
          snippet: res.data.snippet || '',
          timestamp: firstMessage?.internalDate ? new Date(parseInt(firstMessage.internalDate, 10)).toISOString() : new Date().toISOString(),
          from: this.extractHeader(headers, 'From'),
          to: this.extractHeader(headers, 'To'),
          unread: firstMessage?.labelIds?.includes('UNREAD') || false,
          hasAttachments: firstMessage?.payload?.parts?.some(p => p.filename) || false,
          isStarred: firstMessage?.labelIds?.includes('STARRED') || false,
          messages: [], // Sera chargé au clic
        };
      });

      return formattedThreads;
    } catch (error) {
      const gaxiosError = error as GaxiosError;
      console.error('Error listing Gmail threads:', gaxiosError.message);
      if (gaxiosError.response?.status === 401) {
        throw new Error('Authentication failed. Please reconnect your Google account.');
      }
      throw new Error('Could not retrieve Gmail threads.');
    }
  }

  async getThreadDetails(userId: string, threadId: string) {
    try {
      const gmail = await this.getGmailClient(userId);
      const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
      });

      const thread = response.data;
      if (!thread || !thread.messages) {
        throw new Error('Thread not found or empty.');
      }

      const messages = thread.messages.map(msg => {
        const headers = msg.payload?.headers || [];
        return {
          id: msg.id!,
          body: this.getMessageBody(msg.payload),
          from: this.extractHeader(headers, 'From'),
          to: this.extractHeader(headers, 'To'),
          subject: this.extractHeader(headers, 'Subject'),
          timestamp: msg.internalDate ? new Date(parseInt(msg.internalDate, 10)).toISOString() : new Date().toISOString(),
          isRead: !msg.labelIds?.includes('UNREAD'),
          headers: headers.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}),
        };
      });

      const firstMessageHeaders = thread.messages[0]?.payload?.headers || [];
      return {
        id: thread.id!,
        subject: this.extractHeader(firstMessageHeaders, 'Subject'),
        snippet: thread.snippet || '',
        timestamp: thread.messages[0]?.internalDate ? new Date(parseInt(thread.messages[0].internalDate, 10)).toISOString() : new Date().toISOString(),
        from: this.extractHeader(firstMessageHeaders, 'From'),
        to: this.extractHeader(firstMessageHeaders, 'To'),
        unread: thread.messages[0]?.labelIds?.includes('UNREAD') || false,
        hasAttachments: thread.messages.some(m => m.payload?.parts?.some(p => p.filename)),
        isStarred: thread.messages[0]?.labelIds?.includes('STARRED') || false,
        messages: messages,
      };
    } catch (error) {
      console.error('Error getting Gmail thread details:', error);
      throw new Error('Could not retrieve thread details.');
    }
  }

  async sendEmail(userId: string, to: string, subject: string, body: string) {
    try {
      const gmail = await this.getGmailClient(userId);
      const userProfile = await gmail.users.getProfile({ userId: 'me' });
      const fromEmail = userProfile.data.emailAddress;

      if (!fromEmail) {
        throw new Error("Could not determine user's email address.");
      }

      const emailLines = [
        `From: "${fromEmail}" <${fromEmail}>`,
        `To: ${to}`,
        'Content-type: text/html;charset=iso-8859-1',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        '',
        body,
      ];
      const email = emailLines.join('\r\n');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(email).toString('base64url'),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Could not send email.');
    }
  }
}

export default new GmailService();

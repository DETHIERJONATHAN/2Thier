import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

class GoogleAppsService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Authentification et configuration des tokens
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  // **GMAIL SERVICE**
  async getGmailThreads(userEmail: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    
    try {
      const response = await gmail.users.threads.list({
        userId: 'me',
        q: `from:${userEmail} OR to:${userEmail}`,
        maxResults: 10
      });

      const threads = [];
      for (const thread of response.data.threads || []) {
        const threadDetails = await gmail.users.threads.get({
          userId: 'me',
          id: thread.id!
        });

        const firstMessage = threadDetails.data.messages?.[0];
        if (firstMessage) {
          threads.push({
            id: thread.id,
            subject: this.extractHeader(firstMessage.payload?.headers, 'Subject'),
            snippet: threadDetails.data.snippet,
            timestamp: new Date(parseInt(firstMessage.internalDate || '0')).toISOString(),
            from: this.extractHeader(firstMessage.payload?.headers, 'From'),
            to: this.extractHeader(firstMessage.payload?.headers, 'To'),
            unread: firstMessage.labelIds?.includes('UNREAD') || false,
            hasAttachments: firstMessage.payload?.parts?.some(part => 
              part.filename && part.filename.length > 0) || false
          });
        }
      }

      return { threads };
    } catch (error) {
      console.error('Erreur Gmail:', error);
      throw error;
    }
  }

  async sendGmailEmail(to: string, subject: string, body: string, context: any) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      body
    ].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return { messageId: response.data.id };
    } catch (error) {
      console.error('Erreur envoi email:', error);
      throw error;
    }
  }

  // **CALENDAR SERVICE**
  async getCalendarEvents(attendeeEmail: string) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
        q: attendeeEmail
      });

      const events = response.data.items?.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        attendees: event.attendees?.map(a => a.email) || [],
        meetLink: event.hangoutLink,
        status: event.status
      })) || [];

      return { events };
    } catch (error) {
      console.error('Erreur Calendar:', error);
      throw error;
    }
  }

  async createCalendarEvent(eventData: {
    title: string;
    start: string;
    end: string;
    description?: string;
    attendees: string[];
    createMeetLink: boolean;
    context: any;
  }) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.start,
          timeZone: 'Europe/Brussels'
        },
        end: {
          dateTime: eventData.end,
          timeZone: 'Europe/Brussels'
        },
        attendees: eventData.attendees.map(email => ({ email })),
        conferenceData: eventData.createMeetLink ? {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        } : undefined
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: eventData.createMeetLink ? 1 : 0,
        sendUpdates: 'all'
      });

      return { 
        eventId: response.data.id,
        meetLink: response.data.hangoutLink
      };
    } catch (error) {
      console.error('Erreur création événement:', error);
      throw error;
    }
  }

  // **DRIVE SERVICE**
  async getDriveFiles(leadId: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    try {
      // Chercher le dossier du lead ou le créer
      const folderName = `Lead_${leadId}`;
      
      const response = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      let folderId = response.data.files?.[0]?.id;
      
      if (!folderId) {
        // Créer le dossier
        const folderResponse = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          }
        });
        folderId = folderResponse.data.id!;
      }

      // Lister les fichiers dans le dossier
      const filesResponse = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, thumbnailLink, owners)',
        orderBy: 'modifiedTime desc'
      });

      const files = filesResponse.data.files?.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : undefined,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        thumbnailLink: file.thumbnailLink,
        shared: false, // TODO: Vérifier les permissions
        owner: file.owners?.[0]?.emailAddress || 'Unknown'
      })) || [];

      return { files };
    } catch (error) {
      console.error('Erreur Drive:', error);
      throw error;
    }
  }

  async uploadDriveFile(file: Buffer, fileName: string, leadId: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    try {
      // Trouver ou créer le dossier du lead
      const folderName = `Lead_${leadId}`;
      let folderId = await this.findOrCreateFolder(folderName);

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId]
        },
        media: {
          body: file
        }
      });

      return { fileId: response.data.id };
    } catch (error) {
      console.error('Erreur upload Drive:', error);
      throw error;
    }
  }

  async shareDriveFile(fileId: string, email: string, permission: string, context: any) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: permission, // reader, writer, commenter
          type: 'user',
          emailAddress: email
        },
        sendNotificationEmail: true
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur partage Drive:', error);
      throw error;
    }
  }

  // **DOCS SERVICE**
  async createGoogleDoc(docData: {
    name: string;
    template: string;
    leadId: string;
    leadName: string;
    leadEmail: string;
    shareWith: Array<{ email: string; permission: string }>;
    context: any;
  }) {
    const docs = google.docs({ version: 'v1', auth: this.oauth2Client });
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    try {
      // Créer le document
      const docResponse = await docs.documents.create({
        requestBody: {
          title: docData.name
        }
      });

      const documentId = docResponse.data.documentId!;

      // Ajouter du contenu selon le template
      const content = this.generateDocTemplate(docData.template, docData.leadName, docData.leadEmail);
      
      if (content) {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: {
                    index: 1
                  },
                  text: content
                }
              }
            ]
          }
        });
      }

      // Partager le document
      for (const share of docData.shareWith) {
        await drive.permissions.create({
          fileId: documentId,
          requestBody: {
            role: share.permission,
            type: 'user',
            emailAddress: share.email
          },
          sendNotificationEmail: true
        });
      }

      return { documentId };
    } catch (error) {
      console.error('Erreur création Docs:', error);
      throw error;
    }
  }

  // **SHEETS SERVICE**
  async createGoogleSheet(sheetData: {
    name: string;
    template: string;
    leadId: string;
    leadName: string;
    leadEmail: string;
    shareWith: string[];
    context: any;
  }) {
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    try {
      // Créer la feuille
      const sheetResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: sheetData.name
          }
        }
      });

      const sheetId = sheetResponse.data.spreadsheetId!;

      // Ajouter du contenu selon le template
      const templateData = this.generateSheetTemplate(sheetData.template, sheetData.leadName);
      
      if (templateData.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'A1',
          valueInputOption: 'RAW',
          requestBody: {
            values: templateData
          }
        });
      }

      // Partager la feuille
      for (const email of sheetData.shareWith) {
        await drive.permissions.create({
          fileId: sheetId,
          requestBody: {
            role: 'reader',
            type: 'user',
            emailAddress: email
          },
          sendNotificationEmail: true
        });
      }

      return { sheetId };
    } catch (error) {
      console.error('Erreur création Sheets:', error);
      throw error;
    }
  }

  // **MEET SERVICE** (via Calendar)
  async createMeetEvent(meetData: {
    title: string;
    startTime: string;
    endTime: string;
    description?: string;
    attendees: string[];
    enableRecording: boolean;
    context: any;
  }) {
    // Utilise Calendar pour créer un événement avec Meet
    return this.createCalendarEvent({
      ...meetData,
      start: meetData.startTime,
      end: meetData.endTime,
      createMeetLink: true
    });
  }

  // **FONCTIONS UTILITAIRES**
  private extractHeader(headers: any[], name: string): string {
    const header = headers?.find(h => h.name === name);
    return header?.value || '';
  }

  private async findOrCreateFolder(folderName: string): Promise<string> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id)'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    const folderResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      }
    });

    return folderResponse.data.id!;
  }

  private generateDocTemplate(template: string, leadName: string, leadEmail: string): string {
    const templates: { [key: string]: string } = {
      'proposal': `PROPOSITION COMMERCIALE

À l'attention de : ${leadName} (${leadEmail})
Date : ${new Date().toLocaleDateString()}

Objet : Proposition de services

Madame, Monsieur,

Suite à nos échanges, nous avons le plaisir de vous soumettre notre proposition commerciale.

[Votre contenu ici]

Cordialement,`,
      
      'contract': `CONTRAT DE PRESTATION

Client : ${leadName}
Email : ${leadEmail}
Date : ${new Date().toLocaleDateString()}

Article 1 - Objet du contrat
[À compléter]

Article 2 - Modalités d'exécution
[À compléter]`,
      
      'meeting_notes': `NOTES DE RÉUNION

Participant : ${leadName} (${leadEmail})
Date : ${new Date().toLocaleDateString()}

1. Points abordés :
-

2. Décisions prises :
-

3. Actions à suivre :
-`
    };

    return templates[template] || '';
  }

  private generateSheetTemplate(template: string, leadName: string): string[][] {
    const templates: { [key: string]: string[][] } = {
      'lead_tracking': [
        ['Date', 'Action', 'Statut', 'Notes', 'Prochaine étape'],
        [new Date().toLocaleDateString(), 'Premier contact', 'Terminé', `Contact avec ${leadName}`, 'Envoi proposition']
      ],
      'project_timeline': [
        ['Phase', 'Début', 'Fin', 'Responsable', 'Statut'],
        ['Analyse', '', '', '', 'À planifier']
      ],
      'budget_calculation': [
        ['Poste', 'Quantité', 'Prix unitaire', 'Total'],
        ['Consultation', '1', '500', '=B2*C2']
      ]
    };

    return templates[template] || [['Colonne 1', 'Colonne 2'], ['Données', 'Exemple']];
  }
}

export default GoogleAppsService;

/**
 * GOOGLE AUTHENTICATION MODULE - API PUBLIQUE
 * 
 * Ce fichier expose l'API publique du module d'authentification Google.
 * Tous les autres modules de l'application doivent importer depuis ce fichier uniquement.
 * 
 * UTILISATION :
 * 
 * import { googleAuthManager } from '../google-auth';
 * 
 * const client = await googleAuthManager.getAuthenticatedClient(organizationId);
 * if (client) {
 *   // Utiliser le client pour appeler les APIs Google
 * }
 */

// Export du manager principal
export { googleAuthManager, GoogleAuthManager } from './core/GoogleAuthManager';

// Export des services Google Workspace
export { googleCalendarService } from './services/GoogleCalendarService';
export { GoogleGmailService } from './services/GoogleGmailService';
export { googleDriveService } from './services/GoogleDriveService';

// Export des types utiles
export { GOOGLE_SCOPES_LIST } from './core/GoogleOAuthCore';
export type { CalendarEvent } from './types/CalendarEvent';
export type { 
  EmailAttachment, 
  FormattedGmailMessage, 
  GmailLabel 
} from './services/GoogleGmailService';
export type { DriveFile, DriveFolder } from './services/GoogleDriveService';

// Export de la classe de service pour les cas avancés (utilisation déconseillée)
export { GoogleOAuthService } from './core/GoogleOAuthCore';

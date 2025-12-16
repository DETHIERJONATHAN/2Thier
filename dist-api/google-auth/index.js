"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOAuthService = exports.GOOGLE_SCOPES_LIST = exports.GoogleGmailService = exports.googleCalendarService = exports.GoogleAuthManager = exports.googleAuthManager = void 0;
// Export du manager principal
var GoogleAuthManager_1 = require("./core/GoogleAuthManager");
Object.defineProperty(exports, "googleAuthManager", { enumerable: true, get: function () { return GoogleAuthManager_1.googleAuthManager; } });
Object.defineProperty(exports, "GoogleAuthManager", { enumerable: true, get: function () { return GoogleAuthManager_1.GoogleAuthManager; } });
// Export des services Google Workspace
var GoogleCalendarService_1 = require("./services/GoogleCalendarService");
Object.defineProperty(exports, "googleCalendarService", { enumerable: true, get: function () { return GoogleCalendarService_1.googleCalendarService; } });
var GoogleGmailService_1 = require("./services/GoogleGmailService");
Object.defineProperty(exports, "GoogleGmailService", { enumerable: true, get: function () { return GoogleGmailService_1.GoogleGmailService; } });
// Export des types utiles
var GoogleOAuthCore_1 = require("./core/GoogleOAuthCore");
Object.defineProperty(exports, "GOOGLE_SCOPES_LIST", { enumerable: true, get: function () { return GoogleOAuthCore_1.GOOGLE_SCOPES_LIST; } });
// Export de la classe de service pour les cas avancés (utilisation déconseillée)
var GoogleOAuthCore_2 = require("./core/GoogleOAuthCore");
Object.defineProperty(exports, "GoogleOAuthService", { enumerable: true, get: function () { return GoogleOAuthCore_2.GoogleOAuthService; } });

"use strict";
/**
 * GOOGLE AUTHENTICATION MANAGER - MODULE CENTRAL
 *
 * Ce module centralise toute la logique d'authentification Google Workspace.
 * Il est le SEUL point d'entrée pour obtenir un client Google authentifié.
 *
 * Logique d'authentification :
 * - L'utilisateur se connecte au CRM avec son email personnel (ex: dethier.jls@gmail.com)
 * - Pour Google Workspace, on utilise l'email administrateur de l'organisation (ex: jonathan.dethier@2thier.be)
 * - Cet email administrateur est configuré dans googleWorkspaceConfig.adminEmail
 * - Les tokens sont stockés au niveau de l'organisation, pas de l'utilisateur
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthManager = exports.GoogleAuthManager = void 0;
var GoogleOAuthCore_1 = require("./GoogleOAuthCore");
var GoogleAuthManager = /** @class */ (function () {
    function GoogleAuthManager() {
        // Utilise l'instance singleton existante du service
    }
    GoogleAuthManager.getInstance = function () {
        if (!GoogleAuthManager.instance) {
            GoogleAuthManager.instance = new GoogleAuthManager();
        }
        return GoogleAuthManager.instance;
    };
    /**
     * Obtient un client Google authentifié pour une organisation
     *
     * @param organizationId - ID de l'organisation
     * @returns Client OAuth2 authentifié ou null si échec
     */
    GoogleAuthManager.prototype.getAuthenticatedClient = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!organizationId) {
                            console.error('[GoogleAuthManager] ❌ organizationId est requis');
                            return [2 /*return*/, null];
                        }
                        console.log("[GoogleAuthManager] \uD83D\uDD10 Demande de client authentifi\u00E9 pour l'organisation: ".concat(organizationId));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, GoogleOAuthCore_1.googleOAuthService.getAuthenticatedClientForOrganization(organizationId)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        console.error('[GoogleAuthManager] ❌ Erreur lors de l\'obtention du client authentifié:', error_1);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Génère une URL d'autorisation Google
     *
     * @param userId - ID de l'utilisateur
     * @param organizationId - ID de l'organisation
     * @returns URL d'autorisation
     */
    GoogleAuthManager.prototype.getAuthorizationUrl = function (userId, organizationId) {
        return GoogleOAuthCore_1.googleOAuthService.getAuthUrl(userId, organizationId);
    };
    /**
     * Échange un code d'autorisation contre des tokens
     *
     * @param code - Code d'autorisation reçu de Google
     * @param userId - ID de l'utilisateur
     * @param organizationId - ID de l'organisation
     */
    GoogleAuthManager.prototype.exchangeCodeForTokens = function (code, userId, organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, GoogleOAuthCore_1.googleOAuthService.getTokenFromCode(code)];
                    case 1:
                        tokens = _a.sent();
                        return [4 /*yield*/, GoogleOAuthCore_1.googleOAuthService.saveUserTokens(userId, organizationId, tokens)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return GoogleAuthManager;
}());
exports.GoogleAuthManager = GoogleAuthManager;
// Export de l'instance singleton
exports.googleAuthManager = GoogleAuthManager.getInstance();

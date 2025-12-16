"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleOAuthService = exports.GoogleOAuthService = exports.GOOGLE_SCOPES_LIST = void 0;
var googleapis_1 = require("googleapis");
var client_1 = require("@prisma/client");
var crypto_1 = require("crypto");
var googleConfig_1 = require("../../auth/googleConfig");
var prisma = new client_1.PrismaClient();
var GOOGLE_CLIENT_ID = googleConfig_1.googleOAuthConfig.clientId, GOOGLE_CLIENT_SECRET = googleConfig_1.googleOAuthConfig.clientSecret, GOOGLE_REDIRECT_URI = googleConfig_1.googleOAuthConfig.redirectUri;
exports.GOOGLE_SCOPES_LIST = __spreadArray([], googleConfig_1.GOOGLE_OAUTH_SCOPES, true);
var SCOPES = exports.GOOGLE_SCOPES_LIST;
var GoogleOAuthService = /** @class */ (function () {
    function GoogleOAuthService() {
        console.log('[GoogleOAuthService] Initialisation configuration Google OAuth (core)');
        if (!(0, googleConfig_1.isGoogleOAuthConfigured)()) {
            console.warn('[GoogleOAuthService] ⚠️ Configuration Google OAuth incomplète', (0, googleConfig_1.describeGoogleOAuthConfig)());
        }
        else {
            console.log('[GoogleOAuthService] ✅ Configuration détectée', (0, googleConfig_1.describeGoogleOAuthConfig)());
        }
        console.log('[GoogleOAuthService] GOOGLE_REDIRECT_URI:', GOOGLE_REDIRECT_URI);
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    }
    // Générer l'URL d'autorisation Google
    GoogleOAuthService.prototype.getAuthUrl = function (userId, organizationId) {
        console.log("[GoogleOAuthService] G\u00E9n\u00E9ration URL pour userId: ".concat(userId, ", organizationId: ").concat(organizationId));
        console.log('[GoogleOAuthService] Scopes:', SCOPES);
        var state = JSON.stringify({ userId: userId, organizationId: organizationId });
        var authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: state,
            prompt: 'consent'
        });
        console.log('[GoogleOAuthService] URL générée:', authUrl);
        return authUrl;
    };
    // Échanger le code contre des tokens
    GoogleOAuthService.prototype.getTokenFromCode = function (code) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.oauth2Client.getToken(code)];
                    case 1:
                        tokens = (_a.sent()).tokens;
                        return [2 /*return*/, tokens];
                }
            });
        });
    };
    // Sauvegarder les tokens
    GoogleOAuthService.prototype.saveUserTokens = function (userId, organizationId, tokens) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData, existingToken;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!organizationId) {
                            throw new Error("L'ID de l'organisation est requis pour sauvegarder les tokens Google.");
                        }
                        updateData = {
                            accessToken: tokens.access_token,
                            // IMPORTANT : Toujours mettre à jour le refresh_token s'il est fourni.
                            // Google peut en envoyer un nouveau lors du 'consent'.
                            refreshToken: tokens.refresh_token,
                            tokenType: tokens.token_type || 'Bearer',
                            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                            scope: tokens.scope,
                            updatedAt: new Date()
                        };
                        return [4 /*yield*/, prisma.googleToken.findUnique({
                                where: { organizationId: organizationId }
                            })];
                    case 1:
                        existingToken = _b.sent();
                        if (!existingToken) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma.googleToken.update({
                                where: { organizationId: organizationId },
                                data: {
                                    accessToken: updateData.accessToken,
                                    // Ne met à jour le refresh token que s'il est nouveau, sinon conserve l'ancien
                                    refreshToken: (_a = updateData.refreshToken) !== null && _a !== void 0 ? _a : existingToken.refreshToken,
                                    expiresAt: updateData.expiresAt,
                                    scope: updateData.scope,
                                    updatedAt: updateData.updatedAt,
                                    lastRefreshAt: new Date(),
                                    refreshCount: { increment: 1 }
                                }
                            })];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, prisma.googleToken.create({
                            data: {
                                id: (0, crypto_1.randomUUID)(),
                                organizationId: organizationId,
                                accessToken: updateData.accessToken,
                                refreshToken: updateData.refreshToken,
                                tokenType: updateData.tokenType,
                                expiresAt: updateData.expiresAt,
                                scope: updateData.scope,
                                updatedAt: new Date(),
                            }
                        })];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        console.log("[GoogleOAuthService] Tokens sauvegard\u00E9s/mis \u00E0 jour pour l'utilisateur ".concat(userId, " (org: ").concat(organizationId, ")"));
                        return [2 /*return*/];
                }
            });
        });
    };
    // Récupérer les tokens par userId (en passant par l'utilisateur et son organisation)
    GoogleOAuthService.prototype.getUserTokens = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userWithOrg, organizationId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { id: userId },
                            include: {
                                UserOrganization: {
                                    take: 1, // Prendre la première organisation
                                    orderBy: { createdAt: 'desc' }
                                }
                            }
                        })];
                    case 1:
                        userWithOrg = _a.sent();
                        if (!userWithOrg || !userWithOrg.UserOrganization[0]) {
                            console.log("[GoogleOAuthService] Utilisateur ".concat(userId, " ou organisation non trouv\u00E9"));
                            return [2 /*return*/, null];
                        }
                        organizationId = userWithOrg.UserOrganization[0].organizationId;
                        return [4 /*yield*/, prisma.googleToken.findUnique({
                                where: { organizationId: organizationId }
                            })];
                    case 2: 
                    // Puis récupérer les tokens pour cette organisation
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Client authentifié avec email administrateur Google Workspace
    GoogleOAuthService.prototype.getAuthenticatedClientForOrganization = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var organization, googleConfig, tokens, credentials, adminOAuth2Client, now, expiryDate, newCredentials, error_1;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        console.log("[GoogleOAuthService] \u26A1 getAuthenticatedClientForOrganization appel\u00E9 pour organizationId: ".concat(organizationId));
                        return [4 /*yield*/, prisma.organization.findUnique({
                                where: { id: organizationId },
                                include: {
                                    GoogleWorkspaceConfig: true,
                                },
                            })];
                    case 1:
                        organization = _e.sent();
                        if (!organization) {
                            console.log("[GoogleOAuthService] \u274C Organisation ".concat(organizationId, " non trouv\u00E9e"));
                            return [2 /*return*/, null];
                        }
                        googleConfig = organization.GoogleWorkspaceConfig;
                        if (!googleConfig || !googleConfig.adminEmail || !googleConfig.domain) {
                            console.log("[GoogleOAuthService] \u274C Configuration Google Workspace (adminEmail ou domain) manquante pour l'organisation ".concat(organization.name));
                            return [2 /*return*/, null];
                        }
                        console.log("[GoogleOAuthService] \uD83D\uDCE7 Email administrateur Google Workspace: ".concat(googleConfig.adminEmail));
                        console.log("[GoogleOAuthService] \uD83C\uDFE2 Domaine: ".concat(googleConfig.domain));
                        return [4 /*yield*/, prisma.googleToken.findUnique({
                                where: { organizationId: organization.id }
                            })];
                    case 2:
                        tokens = _e.sent();
                        if (!tokens) {
                            console.log("[GoogleOAuthService] \u274C Aucun token trouv\u00E9 pour l'organisation ".concat(organization.name));
                            return [2 /*return*/, null];
                        }
                        console.log("[GoogleOAuthService] \uD83D\uDD0D Tokens trouv\u00E9s pour l'organisation ".concat(organization.name, ":"));
                        console.log("[GoogleOAuthService] - Access token: ".concat(tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'MANQUANT'));
                        console.log("[GoogleOAuthService] - Refresh token: ".concat(tokens.refreshToken ? tokens.refreshToken.substring(0, 20) + '...' : 'MANQUANT'));
                        console.log("[GoogleOAuthService] - Expires at: ".concat(tokens.expiresAt));
                        credentials = {
                            access_token: tokens.accessToken,
                            refresh_token: tokens.refreshToken,
                            token_type: tokens.tokenType,
                            expiry_date: (_a = tokens.expiresAt) === null || _a === void 0 ? void 0 : _a.getTime()
                        };
                        console.log("[GoogleOAuthService] \uD83D\uDD27 Configuration credentials pour ".concat(googleConfig.adminEmail, ":"), {
                            hasAccessToken: !!credentials.access_token,
                            accessTokenLength: (_b = credentials.access_token) === null || _b === void 0 ? void 0 : _b.length,
                            hasRefreshToken: !!credentials.refresh_token,
                            refreshTokenLength: (_c = credentials.refresh_token) === null || _c === void 0 ? void 0 : _c.length,
                            tokenType: credentials.token_type,
                            expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'NON_DÉFINI'
                        });
                        adminOAuth2Client = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
                        adminOAuth2Client.setCredentials(credentials);
                        console.log("[GoogleOAuthService] \uD83D\uDCCB Credentials d\u00E9finies sur OAuth2Client pour admin ".concat(googleConfig.adminEmail));
                        now = new Date();
                        expiryDate = tokens.expiresAt;
                        console.log("[GoogleOAuthService] \u23F0 V\u00E9rification expiration: maintenant=".concat(now.toISOString(), ", expiry=").concat(expiryDate === null || expiryDate === void 0 ? void 0 : expiryDate.toISOString()));
                        if (!(expiryDate && expiryDate <= now)) return [3 /*break*/, 9];
                        console.log("[GoogleOAuthService] \u26A0\uFE0F Token expir\u00E9 pour l'admin ".concat(googleConfig.adminEmail, ", rafra\u00EEchissement..."));
                        _e.label = 3;
                    case 3:
                        _e.trys.push([3, 7, , 8]);
                        return [4 /*yield*/, adminOAuth2Client.refreshAccessToken()];
                    case 4:
                        newCredentials = (_e.sent()).credentials;
                        console.log("[GoogleOAuthService] \u2705 Rafra\u00EEchissement r\u00E9ussi pour admin");
                        if (!(newCredentials.access_token && newCredentials.expiry_date)) return [3 /*break*/, 6];
                        return [4 /*yield*/, prisma.googleToken.update({
                                where: { organizationId: organization.id },
                                data: {
                                    accessToken: newCredentials.access_token,
                                    // Mettre à jour le refresh token SEULEMENT s'il est nouveau
                                    refreshToken: (_d = newCredentials.refresh_token) !== null && _d !== void 0 ? _d : tokens.refreshToken,
                                    tokenType: newCredentials.token_type || 'Bearer',
                                    expiresAt: new Date(newCredentials.expiry_date),
                                    updatedAt: new Date(),
                                    lastRefreshAt: new Date(),
                                    refreshCount: { increment: 1 }
                                }
                            })];
                    case 5:
                        _e.sent();
                        _e.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_1 = _e.sent();
                        console.error("[GoogleOAuthService] \u274C \u00C9chec du rafra\u00EEchissement pour admin ".concat(googleConfig.adminEmail, ":"), error_1);
                        return [2 /*return*/, null];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        if (expiryDate) {
                            console.log("[GoogleOAuthService] \u2705 Token encore valide pour admin ".concat(googleConfig.adminEmail, " (expire dans ").concat(Math.round((expiryDate.getTime() - now.getTime()) / 1000 / 60), " minutes)"));
                        }
                        _e.label = 10;
                    case 10:
                        console.log("[GoogleOAuthService] \uD83D\uDE80 Retour du client OAuth2 configur\u00E9 pour admin ".concat(googleConfig.adminEmail));
                        return [2 /*return*/, adminOAuth2Client];
                }
            });
        });
    };
    // Client authentifié
    GoogleOAuthService.prototype.getAuthenticatedClient = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens, credentials, userOAuth2Client, now, expiryDate, credentials_1, error_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log("[GoogleOAuthService] \u26A1 getAuthenticatedClient appel\u00E9 pour userId: ".concat(userId));
                        return [4 /*yield*/, this.getUserTokens(userId)];
                    case 1:
                        tokens = _d.sent();
                        if (!tokens) {
                            console.log("[GoogleOAuthService] \u274C Aucun token trouv\u00E9 pour l'utilisateur ".concat(userId));
                            return [2 /*return*/, null];
                        }
                        console.log("[GoogleOAuthService] \uD83D\uDD0D Tokens trouv\u00E9s pour ".concat(userId, ":"));
                        console.log("[GoogleOAuthService] - Access token: ".concat(tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'MANQUANT'));
                        console.log("[GoogleOAuthService] - Refresh token: ".concat(tokens.refreshToken ? tokens.refreshToken.substring(0, 20) + '...' : 'MANQUANT'));
                        console.log("[GoogleOAuthService] - Expires at: ".concat(tokens.expiresAt));
                        credentials = {
                            access_token: tokens.accessToken,
                            refresh_token: tokens.refreshToken,
                            token_type: tokens.tokenType,
                            expiry_date: (_a = tokens.expiresAt) === null || _a === void 0 ? void 0 : _a.getTime()
                        };
                        console.log("[GoogleOAuthService] \uD83D\uDD27 Configuration credentials:", {
                            hasAccessToken: !!credentials.access_token,
                            accessTokenLength: (_b = credentials.access_token) === null || _b === void 0 ? void 0 : _b.length,
                            hasRefreshToken: !!credentials.refresh_token,
                            refreshTokenLength: (_c = credentials.refresh_token) === null || _c === void 0 ? void 0 : _c.length,
                            tokenType: credentials.token_type,
                            expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'NON_DÉFINI'
                        });
                        userOAuth2Client = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
                        userOAuth2Client.setCredentials(credentials);
                        console.log("[GoogleOAuthService] \uD83D\uDCCB Credentials d\u00E9finies sur nouveau OAuth2Client");
                        now = new Date();
                        expiryDate = tokens.expiresAt;
                        console.log("[GoogleOAuthService] \u23F0 V\u00E9rification expiration: maintenant=".concat(now.toISOString(), ", expiry=").concat(expiryDate === null || expiryDate === void 0 ? void 0 : expiryDate.toISOString()));
                        if (!(expiryDate && expiryDate <= now)) return [3 /*break*/, 8];
                        console.log("[GoogleOAuthService] \u26A0\uFE0F Token expir\u00E9 pour l'utilisateur ".concat(userId, ", rafra\u00EEchissement..."));
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 6, , 7]);
                        return [4 /*yield*/, userOAuth2Client.refreshAccessToken()];
                    case 3:
                        credentials_1 = (_d.sent()).credentials;
                        console.log("[GoogleOAuthService] \u2705 Rafra\u00EEchissement r\u00E9ussi, nouvelles credentials:", {
                            hasAccessToken: !!credentials_1.access_token,
                            hasRefreshToken: !!credentials_1.refresh_token,
                            newExpiry: credentials_1.expiry_date ? new Date(credentials_1.expiry_date).toISOString() : 'NON_DÉFINI'
                        });
                        if (!(credentials_1.access_token && credentials_1.expiry_date)) return [3 /*break*/, 5];
                        // Mettre à jour les tokens en base
                        return [4 /*yield*/, this.updateUserTokens(userId, {
                                accessToken: credentials_1.access_token,
                                refreshToken: credentials_1.refresh_token || tokens.refreshToken, // Garde l'ancien si pas de nouveau
                                tokenType: credentials_1.token_type || 'Bearer',
                                expiresAt: new Date(credentials_1.expiry_date)
                            })];
                    case 4:
                        // Mettre à jour les tokens en base
                        _d.sent();
                        console.log("[GoogleOAuthService] \u2705 Token rafra\u00EEchi avec succ\u00E8s pour l'utilisateur ".concat(userId));
                        _d.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_2 = _d.sent();
                        console.error("[GoogleOAuthService] \u274C \u00C9chec du rafra\u00EEchissement du token pour ".concat(userId, ":"), error_2);
                        return [2 /*return*/, null];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        if (expiryDate) {
                            console.log("[GoogleOAuthService] \u2705 Token encore valide pour ".concat(userId, " (expire dans ").concat(Math.round((expiryDate.getTime() - now.getTime()) / 1000 / 60), " minutes)"));
                        }
                        else {
                            console.log("[GoogleOAuthService] \u26A0\uFE0F Pas de date d'expiration d\u00E9finie pour ".concat(userId));
                        }
                        _d.label = 9;
                    case 9:
                        console.log("[GoogleOAuthService] \uD83D\uDE80 Retour du nouveau client OAuth2 configur\u00E9 pour ".concat(userId));
                        return [2 /*return*/, userOAuth2Client];
                }
            });
        });
    };
    // Méthode pour mettre à jour les tokens existants
    GoogleOAuthService.prototype.updateUserTokens = function (userId, tokenData) {
        return __awaiter(this, void 0, void 0, function () {
            var userWithOrg, organizationId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { id: userId },
                            include: {
                                UserOrganization: {
                                    take: 1,
                                    orderBy: { createdAt: 'desc' }
                                }
                            }
                        })];
                    case 1:
                        userWithOrg = _a.sent();
                        if (!userWithOrg || !userWithOrg.UserOrganization[0]) {
                            throw new Error("Utilisateur ".concat(userId, " ou organisation non trouv\u00E9"));
                        }
                        organizationId = userWithOrg.UserOrganization[0].organizationId;
                        return [4 /*yield*/, prisma.googleToken.update({
                                where: { organizationId: organizationId },
                                data: {
                                    accessToken: tokenData.accessToken,
                                    refreshToken: tokenData.refreshToken,
                                    tokenType: tokenData.tokenType,
                                    expiresAt: tokenData.expiresAt
                                }
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Vérifier si connecté
    GoogleOAuthService.prototype.isUserConnected = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserTokens(userId)];
                    case 1:
                        tokens = _a.sent();
                        return [2 /*return*/, !!tokens];
                }
            });
        });
    };
    // Déconnecter l'utilisateur
    GoogleOAuthService.prototype.disconnectUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens, error_3, userWithOrg, organizationId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getUserTokens(userId)];
                    case 1:
                        tokens = _a.sent();
                        if (!(tokens === null || tokens === void 0 ? void 0 : tokens.refreshToken)) return [3 /*break*/, 3];
                        // Révoquer le refresh token, ce qui invalide l'accès.
                        return [4 /*yield*/, this.oauth2Client.revokeToken(tokens.refreshToken)];
                    case 2:
                        // Révoquer le refresh token, ce qui invalide l'accès.
                        _a.sent();
                        console.log("[GoogleOAuthService] Token r\u00E9voqu\u00E9 pour l'utilisateur ".concat(userId));
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        console.error("[GoogleOAuthService] \u00C9chec de la r\u00E9vocation du token pour ".concat(userId, ":"), error_3);
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, prisma.user.findUnique({
                            where: { id: userId },
                            include: {
                                UserOrganization: {
                                    take: 1, // Prendre la première organisation
                                    orderBy: { createdAt: 'desc' }
                                }
                            }
                        })];
                    case 6:
                        userWithOrg = _a.sent();
                        if (!(userWithOrg === null || userWithOrg === void 0 ? void 0 : userWithOrg.UserOrganization[0])) return [3 /*break*/, 8];
                        organizationId = userWithOrg.UserOrganization[0].organizationId;
                        // Supprimer de la base de données avec organizationId
                        return [4 /*yield*/, prisma.googleToken.delete({ where: { organizationId: organizationId } })];
                    case 7:
                        // Supprimer de la base de données avec organizationId
                        _a.sent();
                        console.log("[GoogleOAuthService] Tokens supprim\u00E9s de la DB pour l'utilisateur ".concat(userId, " (org: ").concat(organizationId, ")"));
                        return [3 /*break*/, 9];
                    case 8:
                        console.log("[GoogleOAuthService] Impossible de trouver l'organization pour l'utilisateur ".concat(userId));
                        _a.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // Tester la connexion
    GoogleOAuthService.prototype.testConnection = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var auth, oauth2, response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAuthenticatedClient(userId)];
                    case 1:
                        auth = _a.sent();
                        if (!auth)
                            return [2 /*return*/, { success: false, error: 'Non connecté' }];
                        oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: auth });
                        return [4 /*yield*/, oauth2.userinfo.get()];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, { success: true, userInfo: response.data }];
                    case 3:
                        error_4 = _a.sent();
                        console.error("[GoogleOAuthService] Erreur lors du test de connexion pour ".concat(userId, ":"), error_4);
                        if (error_4 instanceof Error) {
                            return [2 /*return*/, { success: false, error: error_4.message }];
                        }
                        return [2 /*return*/, { success: false, error: 'Une erreur inconnue est survenue' }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return GoogleOAuthService;
}());
exports.GoogleOAuthService = GoogleOAuthService;
exports.googleOAuthService = new GoogleOAuthService();

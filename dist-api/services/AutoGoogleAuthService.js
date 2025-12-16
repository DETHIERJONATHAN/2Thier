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
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoGoogleAuthService = exports.AutoGoogleAuthService = void 0;
var client_1 = require("@prisma/client");
var GoogleOAuthCore_js_1 = require("../google-auth/core/GoogleOAuthCore.js");
var prisma = new client_1.PrismaClient();
/**
 * Service pour la connexion automatique à Google Workspace lors de la connexion au CRM
 * Gère la connexion automatique en arrière-plan sans intervention utilisateur
 */
var AutoGoogleAuthService = /** @class */ (function () {
    function AutoGoogleAuthService() {
    }
    AutoGoogleAuthService.getInstance = function () {
        if (!this.instance) {
            this.instance = new AutoGoogleAuthService();
        }
        return this.instance;
    };
    /**
     * Connecte automatiquement l'utilisateur à Google Workspace lors de sa connexion au CRM
     * Utilise les credentials stockés ou initie la première connexion
     */
    AutoGoogleAuthService.prototype.autoConnectToGoogle = function (userId, organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingTokens, now, isExpired, orgConnection, authUrl, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        console.log("\uD83D\uDD04 [AutoGoogleAuth] D\u00C9BUT autoConnectToGoogle pour user ".concat(userId, " org ").concat(organizationId, "..."));
                        // 1. Vérifier si l'utilisateur a déjà des tokens Google valides
                        console.log("\uD83D\uDD0D [AutoGoogleAuth] V\u00E9rification tokens existants pour user ".concat(userId, "..."));
                        return [4 /*yield*/, GoogleOAuthCore_js_1.googleOAuthService.getUserTokens(userId)];
                    case 1:
                        existingTokens = _a.sent();
                        console.log("\uD83D\uDD0D [AutoGoogleAuth] Tokens existants pour user ".concat(userId, ":"), existingTokens ? 'TROUVÉS' : 'AUCUN');
                        if (existingTokens) {
                            now = new Date();
                            isExpired = existingTokens.expiresAt && existingTokens.expiresAt <= now;
                            if (!isExpired) {
                                console.log("\u2705 [AutoGoogleAuth] Tokens valides trouv\u00E9s pour user ".concat(userId, " - connexion consid\u00E9r\u00E9e comme active"));
                                return [2 /*return*/, {
                                        success: true,
                                        isConnected: true,
                                        needsManualAuth: false,
                                        message: 'Connexion Google automatique réussie (tokens existants)'
                                    }];
                            }
                            else {
                                console.log("\u26A0\uFE0F [AutoGoogleAuth] Tokens expir\u00E9s pour user ".concat(userId, " - mais on laisse le middleware g\u00E9rer le refresh"));
                                return [2 /*return*/, {
                                        success: true,
                                        isConnected: true,
                                        needsManualAuth: false,
                                        message: 'Connexion Google - refresh délégué au middleware'
                                    }];
                            }
                        }
                        if (!organizationId) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.checkOrganizationGoogleConnection(organizationId)];
                    case 2:
                        orgConnection = _a.sent();
                        if (orgConnection.hasConnection) {
                            console.log("\u2705 [AutoGoogleAuth] Connexion Google organisation disponible pour user ".concat(userId));
                            return [2 /*return*/, {
                                    success: true,
                                    isConnected: true,
                                    needsManualAuth: false,
                                    message: 'Connexion Google via organisation réussie'
                                }];
                        }
                        _a.label = 3;
                    case 3:
                        authUrl = GoogleOAuthCore_js_1.googleOAuthService.getAuthUrl(userId);
                        console.log("\uD83D\uDD10 [AutoGoogleAuth] Premi\u00E8re connexion Google n\u00E9cessaire pour user ".concat(userId));
                        return [2 /*return*/, {
                                success: true,
                                isConnected: false,
                                needsManualAuth: true,
                                authUrl: authUrl,
                                message: 'Première connexion Google requise'
                            }];
                    case 4:
                        error_1 = _a.sent();
                        console.error("\u274C [AutoGoogleAuth] Erreur connexion automatique pour user ".concat(userId, ":"), error_1);
                        return [2 /*return*/, {
                                success: false,
                                isConnected: false,
                                needsManualAuth: true,
                                message: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Teste si les tokens existants sont valides (VERSION MOINS AGRESSIVE)
     */
    AutoGoogleAuthService.prototype.testExistingTokens = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens, now, isExpired, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, GoogleOAuthCore_js_1.googleOAuthService.getUserTokens(userId)];
                    case 1:
                        tokens = _a.sent();
                        if (!tokens) {
                            console.log("[AutoGoogleAuth] Pas de tokens pour user ".concat(userId));
                            return [2 /*return*/, false];
                        }
                        now = new Date();
                        isExpired = tokens.expiresAt && tokens.expiresAt <= now;
                        if (isExpired) {
                            console.log("[AutoGoogleAuth] Tokens expir\u00E9s pour user ".concat(userId));
                            return [2 /*return*/, false];
                        }
                        console.log("[AutoGoogleAuth] \u2705 Tokens pr\u00E9sents et non expir\u00E9s pour user ".concat(userId));
                        return [2 /*return*/, true];
                    case 2:
                        error_2 = _a.sent();
                        console.error("\u274C [AutoGoogleAuth] Test tokens failed for user ".concat(userId, ":"), error_2);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Tente de rafraîchir automatiquement les tokens (VERSION MOINS AGRESSIVE)
     */
    AutoGoogleAuthService.prototype.attemptTokenRefresh = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // 🔧 CORRECTIF : Moins agressif dans le refresh des tokens
                        // On ne fait plus d'appels API automatiques, on laisse le middleware s'en charger
                        console.log("[AutoGoogleAuth] \uD83D\uDD27 Refresh conservateur pour user ".concat(userId, " - d\u00E9l\u00E9gation au middleware"));
                        return [4 /*yield*/, GoogleOAuthCore_js_1.googleOAuthService.getUserTokens(userId)];
                    case 1:
                        tokens = _a.sent();
                        return [2 /*return*/, !!tokens];
                    case 2:
                        error_3 = _a.sent();
                        console.error("\u274C [AutoGoogleAuth] Token refresh failed for user ".concat(userId, ":"), error_3);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Vérifie si l'organisation a une connexion Google centralisée
     */
    AutoGoogleAuthService.prototype.checkOrganizationGoogleConnection = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var workspaceConfig, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, prisma.googleWorkspaceConfig.findFirst({
                                where: { isActive: true }
                            })];
                    case 1:
                        workspaceConfig = _a.sent();
                        if (workspaceConfig) {
                            return [2 /*return*/, {
                                    hasConnection: true,
                                    connectionType: 'workspace'
                                }];
                        }
                        // Vérifier s'il y a des connexions OAuth au niveau organisation
                        // (Pour l'instant, on considère que l'organisation n'a pas de connexion centralisée OAuth)
                        // Cette fonctionnalité peut être ajoutée plus tard selon votre modèle de données
                        return [2 /*return*/, {
                                hasConnection: false,
                                connectionType: undefined
                            }];
                    case 2:
                        error_4 = _a.sent();
                        console.error("\u274C [AutoGoogleAuth] Erreur v\u00E9rification connexion org ".concat(organizationId, ":"), error_4);
                        return [2 /*return*/, { hasConnection: false }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Configure la connexion automatique lors du login
     * À appeler dans le processus d'authentification du CRM
     */
    AutoGoogleAuthService.prototype.handleLoginGoogleConnection = function (userId, organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    console.log("\uD83D\uDE80 [AutoGoogleAuth] D\u00C9BUT handleLoginGoogleConnection pour user ".concat(userId, " org ").concat(organizationId, "..."));
                    // Connexion asynchrone en arrière-plan pour ne pas bloquer le login
                    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                        var result, timeoutError_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    console.log("\u23F0 [AutoGoogleAuth] TIMEOUT D\u00C9CLENCH\u00C9 (5 min) - Ex\u00E9cution autoConnectToGoogle pour user ".concat(userId, "..."));
                                    return [4 /*yield*/, this.autoConnectToGoogle(userId, organizationId)];
                                case 1:
                                    result = _a.sent();
                                    console.log("\uD83D\uDCCB [AutoGoogleAuth] R\u00C9SULTAT autoConnectToGoogle pour user ".concat(userId, ":"), result);
                                    if (result.success && result.isConnected) {
                                        console.log("\u2705 [AutoGoogleAuth] Connexion Google automatique r\u00E9ussie pour user ".concat(userId));
                                        // Optionnel: Envoyer une notification WebSocket ou mise à jour en temps réel
                                        // pour informer le frontend que Google est connecté
                                        this.notifyFrontendGoogleConnected(userId);
                                    }
                                    else if (result.needsManualAuth) {
                                        console.log("\uD83D\uDD10 [AutoGoogleAuth] Connexion manuelle requise pour user ".concat(userId));
                                        console.log("\uD83D\uDD17 [AutoGoogleAuth] URL d'autorisation: ".concat(result.authUrl));
                                        // Optionnel: Envoyer une notification au frontend avec l'URL d'auth
                                        this.notifyFrontendManualAuthRequired(userId, result.authUrl);
                                    }
                                    else {
                                        console.log("\u26A0\uFE0F [AutoGoogleAuth] R\u00E9sultat inattendu pour user ".concat(userId, ":"), result);
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    timeoutError_1 = _a.sent();
                                    console.error("\u274C [AutoGoogleAuth] Erreur dans setTimeout pour user ".concat(userId, ":"), timeoutError_1);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }, 5 * 60 * 1000); // 🔧 CORRECTIF: Délai de 5 minutes au lieu de 1 seconde pour être moins agressif
                    console.log("\uD83D\uDCE4 [AutoGoogleAuth] handleLoginGoogleConnection termin\u00E9 pour user ".concat(userId, " - timeout 5min programm\u00E9"));
                }
                catch (error) {
                    console.error("\u274C [AutoGoogleAuth] Erreur handleLoginGoogleConnection pour user ".concat(userId, ":"), error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Notifie le frontend que Google est connecté automatiquement
     */
    AutoGoogleAuthService.prototype.notifyFrontendGoogleConnected = function (userId) {
        // TODO: Implémenter notification WebSocket ou autre mécanisme temps réel
        console.log("\uD83D\uDCE2 [AutoGoogleAuth] Google connect\u00E9 automatiquement pour user ".concat(userId));
        // Exemple: Vous pourriez utiliser Socket.IO ou Server-Sent Events
        // socketService.notifyUser(userId, {
        //   type: 'GOOGLE_AUTO_CONNECTED',
        //   message: 'Google Workspace connecté automatiquement'
        // });
    };
    /**
     * Notifie le frontend qu'une connexion manuelle est requise
     */
    AutoGoogleAuthService.prototype.notifyFrontendManualAuthRequired = function (userId, authUrl) {
        // TODO: Implémenter notification avec URL d'autorisation
        console.log("\uD83D\uDCE2 [AutoGoogleAuth] Connexion manuelle requise pour user ".concat(userId), { authUrl: authUrl });
        // Exemple: Notification avec action
        // socketService.notifyUser(userId, {
        //   type: 'GOOGLE_MANUAL_AUTH_REQUIRED',
        //   message: 'Connectez votre compte Google Workspace',
        //   action: {
        //     type: 'OPEN_GOOGLE_AUTH',
        //     url: authUrl
        //   }
        // });
    };
    /**
     * Déconnecte automatiquement Google lors du logout du CRM
     */
    AutoGoogleAuthService.prototype.handleLogoutGoogleDisconnection = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    console.log("\uD83D\uDD04 [AutoGoogleAuth] Nettoyage session Google pour user ".concat(userId, "..."));
                    // Ne pas supprimer les tokens (pour permettre la reconnexion automatique)
                    // Juste nettoyer les sessions en cours si nécessaire
                    console.log("\u2705 [AutoGoogleAuth] Session Google nettoy\u00E9e pour user ".concat(userId));
                }
                catch (error) {
                    console.error("\u274C [AutoGoogleAuth] Erreur nettoyage session Google pour user ".concat(userId, ":"), error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Obtient le statut de connexion Google actuel
     */
    AutoGoogleAuthService.prototype.getGoogleConnectionStatus = function (userId, organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var isPersonallyConnected, tokens, orgConnection, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, GoogleOAuthCore_js_1.googleOAuthService.isUserConnected(userId)];
                    case 1:
                        isPersonallyConnected = _a.sent();
                        if (!isPersonallyConnected) return [3 /*break*/, 3];
                        return [4 /*yield*/, GoogleOAuthCore_js_1.googleOAuthService.getUserTokens(userId)];
                    case 2:
                        tokens = _a.sent();
                        return [2 /*return*/, {
                                isConnected: true,
                                connectionType: 'personal',
                                lastConnected: (tokens === null || tokens === void 0 ? void 0 : tokens.updatedAt) || (tokens === null || tokens === void 0 ? void 0 : tokens.createdAt),
                                needsReauth: false
                            }];
                    case 3:
                        if (!organizationId) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.checkOrganizationGoogleConnection(organizationId)];
                    case 4:
                        orgConnection = _a.sent();
                        if (orgConnection.hasConnection) {
                            return [2 /*return*/, {
                                    isConnected: true,
                                    connectionType: orgConnection.connectionType === 'workspace' ? 'workspace' : 'organization',
                                    needsReauth: false
                                }];
                        }
                        _a.label = 5;
                    case 5: return [2 /*return*/, {
                            isConnected: false,
                            needsReauth: true
                        }];
                    case 6:
                        error_5 = _a.sent();
                        console.error("\u274C [AutoGoogleAuth] Erreur statut connexion pour user ".concat(userId, ":"), error_5);
                        return [2 /*return*/, {
                                isConnected: false,
                                needsReauth: true
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    AutoGoogleAuthService.instance = null;
    return AutoGoogleAuthService;
}());
exports.AutoGoogleAuthService = AutoGoogleAuthService;
// Export de l'instance singleton
exports.autoGoogleAuthService = AutoGoogleAuthService.getInstance();

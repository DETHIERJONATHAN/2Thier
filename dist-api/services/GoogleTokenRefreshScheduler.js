"use strict";
/**
 * SCHEDULER DE REFRESH AUTOMATIQUE DES TOKENS GOOGLE
 *
 * Ce service s'exécute en arrière-plan et refresh automatiquement tous les tokens Google
 * avant qu'ils n'expirent, éliminant complètement le besoin de reconnexion manuelle.
 *
 * PROBLÈME RÉSOLU :
 * - Les tokens Google expirent toutes les heures (3600s)
 * - Sans utilisation active, ils expirent et l'utilisateur doit se reconnecter
 * - Ce scheduler refresh automatiquement AVANT expiration
 *
 * FONCTIONNEMENT :
 * - Vérifie toutes les 50 minutes tous les tokens
 * - Refresh automatiquement ceux qui expirent dans les 10 prochaines minutes
 * - Enregistre l'historique complet dans la base
 * - Logs détaillés pour monitoring
 * - Gestion d'erreurs robuste
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.googleTokenScheduler = exports.GoogleTokenRefreshScheduler = void 0;
var prisma_1 = require("../lib/prisma");
var googleConfig_1 = require("../auth/googleConfig");
var GoogleTokenRefreshScheduler = /** @class */ (function () {
    function GoogleTokenRefreshScheduler() {
        this.intervalId = null;
        this.isRunning = false;
        this.REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes
        this.refreshCount = 0;
        this.lastRefreshTime = null;
        console.log('🔄 [GoogleTokenScheduler] Scheduler initialisé');
    }
    GoogleTokenRefreshScheduler.prototype.start = function () {
        var _this = this;
        if (this.isRunning) {
            console.log('⚠️ [GoogleTokenScheduler] Scheduler déjà en cours d\'exécution');
            return;
        }
        this.isRunning = true;
        // Démarrer immédiatement un refresh
        this.refreshAllTokens();
        // Puis programmer les refreshs périodiques
        this.intervalId = setInterval(function () {
            _this.refreshAllTokens();
        }, this.REFRESH_INTERVAL);
        console.log('🚀 [GoogleTokenScheduler] Scheduler démarré - refresh toutes les 50 minutes');
    };
    GoogleTokenRefreshScheduler.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('⏹️ [GoogleTokenScheduler] Scheduler arrêté');
    };
    GoogleTokenRefreshScheduler.prototype.getStatus = function () {
        return {
            isRunning: this.isRunning,
            refreshInterval: this.REFRESH_INTERVAL,
            refreshCount: this.refreshCount,
            lastRefresh: this.lastRefreshTime
        };
    };
    GoogleTokenRefreshScheduler.prototype.forceRefreshAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔥 [GoogleTokenScheduler] Refresh forcé de tous les tokens');
                        return [4 /*yield*/, this.refreshAllTokens()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GoogleTokenRefreshScheduler.prototype.refreshAllTokens = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tokensToRefresh, successCount, errorCount, _i, tokensToRefresh_1, token, success, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        console.log('🔄 [GoogleTokenScheduler] Début du refresh de tous les tokens...');
                        this.lastRefreshTime = new Date();
                        return [4 /*yield*/, prisma_1.prisma.googleToken.findMany({
                                where: {
                                    OR: [
                                        // Tokens qui expirent dans moins de 10 minutes
                                        {
                                            expiresAt: {
                                                lte: new Date(Date.now() + 10 * 60 * 1000)
                                            }
                                        },
                                        // Ou tokens sans date d'expiration (considérés comme expirés)
                                        {
                                            expiresAt: null
                                        }
                                    ]
                                },
                                include: {
                                    Organization: true
                                }
                            })];
                    case 1:
                        tokensToRefresh = _a.sent();
                        console.log("\uD83D\uDD0D [GoogleTokenScheduler] ".concat(tokensToRefresh.length, " tokens trouv\u00E9s \u00E0 refresher"));
                        successCount = 0;
                        errorCount = 0;
                        _i = 0, tokensToRefresh_1 = tokensToRefresh;
                        _a.label = 2;
                    case 2:
                        if (!(_i < tokensToRefresh_1.length)) return [3 /*break*/, 5];
                        token = tokensToRefresh_1[_i];
                        return [4 /*yield*/, this.refreshSingleToken(token)];
                    case 3:
                        success = _a.sent();
                        if (success) {
                            successCount++;
                        }
                        else {
                            errorCount++;
                        }
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        this.refreshCount++;
                        console.log("\u2705 [GoogleTokenScheduler] Refresh termin\u00E9: ".concat(successCount, " succ\u00E8s, ").concat(errorCount, " erreurs"));
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error('❌ [GoogleTokenScheduler] Erreur lors du refresh général:', error_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    GoogleTokenRefreshScheduler.prototype.refreshSingleToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var oldExpiresAt, errorMsg, clientId, clientSecret, response, errorData, errorMsg, tokenData, newExpiresAt, successMsg, error_2, errorMsg, errorDetails;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oldExpiresAt = token.expiresAt;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 11, , 13]);
                        console.log("\uD83D\uDD04 [GoogleTokenScheduler] Refresh token pour org ".concat(token.organizationId));
                        if (!!token.refreshToken) return [3 /*break*/, 3];
                        errorMsg = 'Aucun refresh token disponible';
                        console.error("\u274C [GoogleTokenScheduler] ".concat(errorMsg, " pour org ").concat(token.organizationId));
                        return [4 /*yield*/, this.logRefreshHistory({
                                organizationId: token.organizationId,
                                success: false,
                                message: errorMsg,
                                errorDetails: 'Missing refresh token',
                                oldExpiresAt: oldExpiresAt,
                                newExpiresAt: null
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 3:
                        if (!(0, googleConfig_1.isGoogleOAuthConfigured)()) {
                            throw new Error('Configuration Google OAuth manquante pour GoogleTokenRefreshScheduler.');
                        }
                        clientId = googleConfig_1.googleOAuthConfig.clientId, clientSecret = googleConfig_1.googleOAuthConfig.clientSecret;
                        return [4 /*yield*/, fetch('https://oauth2.googleapis.com/token', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                                body: new URLSearchParams({
                                    client_id: clientId,
                                    client_secret: clientSecret,
                                    refresh_token: token.refreshToken,
                                    grant_type: 'refresh_token',
                                }),
                            })];
                    case 4:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 7];
                        return [4 /*yield*/, response.text()];
                    case 5:
                        errorData = _a.sent();
                        errorMsg = "Erreur Google OAuth: ".concat(response.status);
                        console.error("\u274C [GoogleTokenScheduler] ".concat(errorMsg, " pour org ").concat(token.organizationId, ":"), errorData);
                        return [4 /*yield*/, this.logRefreshHistory({
                                organizationId: token.organizationId,
                                success: false,
                                message: errorMsg,
                                errorDetails: errorData,
                                oldExpiresAt: oldExpiresAt,
                                newExpiresAt: null
                            })];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 7: return [4 /*yield*/, response.json()];
                    case 8:
                        tokenData = _a.sent();
                        newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
                        // Mettre à jour le token dans la base
                        return [4 /*yield*/, prisma_1.prisma.googleToken.update({
                                where: { organizationId: token.organizationId },
                                data: __assign(__assign({ accessToken: tokenData.access_token, expiresAt: newExpiresAt, updatedAt: new Date() }, (tokenData.refresh_token && { refreshToken: tokenData.refresh_token })), (tokenData.scope && { scope: tokenData.scope }))
                            })];
                    case 9:
                        // Mettre à jour le token dans la base
                        _a.sent();
                        successMsg = 'Token refreshed successfully';
                        console.log("\u2705 [GoogleTokenScheduler] ".concat(successMsg, " pour org ").concat(token.organizationId, ", expire \u00E0 ").concat(newExpiresAt.toISOString()));
                        return [4 /*yield*/, this.logRefreshHistory({
                                organizationId: token.organizationId,
                                success: true,
                                message: successMsg,
                                errorDetails: null,
                                oldExpiresAt: oldExpiresAt,
                                newExpiresAt: newExpiresAt
                            })];
                    case 10:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 11:
                        error_2 = _a.sent();
                        errorMsg = 'Erreur lors du refresh du token';
                        errorDetails = error_2 instanceof Error ? error_2.message : 'Erreur inconnue';
                        console.error("\u274C [GoogleTokenScheduler] ".concat(errorMsg, " pour org ").concat(token.organizationId, ":"), error_2);
                        return [4 /*yield*/, this.logRefreshHistory({
                                organizationId: token.organizationId,
                                success: false,
                                message: errorMsg,
                                errorDetails: errorDetails,
                                oldExpiresAt: oldExpiresAt,
                                newExpiresAt: null
                            })];
                    case 12:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    GoogleTokenRefreshScheduler.prototype.logRefreshHistory = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var error_3;
            var organizationId = _b.organizationId, success = _b.success, message = _b.message, errorDetails = _b.errorDetails, oldExpiresAt = _b.oldExpiresAt, newExpiresAt = _b.newExpiresAt;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, prisma_1.prisma.googleTokenRefreshHistory.create({
                                data: {
                                    organizationId: organizationId,
                                    success: success,
                                    message: message,
                                    errorDetails: errorDetails,
                                    oldExpiresAt: oldExpiresAt,
                                    newExpiresAt: newExpiresAt,
                                    refreshedAt: new Date()
                                }
                            })];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _c.sent();
                        console.error('❌ [GoogleTokenScheduler] Erreur lors de l\'enregistrement de l\'historique:', error_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return GoogleTokenRefreshScheduler;
}());
exports.GoogleTokenRefreshScheduler = GoogleTokenRefreshScheduler;
// Instance singleton
exports.googleTokenScheduler = new GoogleTokenRefreshScheduler();

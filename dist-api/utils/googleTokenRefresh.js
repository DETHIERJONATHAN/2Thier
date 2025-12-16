"use strict";
/**
 * Système de refresh automatique des tokens Google - Version intégrée
 * Cette version évite les problèmes de compilation en intégrant directement le code
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
exports.refreshGoogleTokenIfNeeded = refreshGoogleTokenIfNeeded;
var googleapis_1 = require("googleapis");
var prisma_js_1 = require("../lib/prisma.js");
/**
 * Vérifie et rafraîchit automatiquement un token Google si nécessaire
 */
function refreshGoogleTokenIfNeeded(organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var googleToken, now, thirtyMinutesFromNow, isExpiring, isExpired, googleConfig, oauth2Client, credentials, newExpiresAt, refreshError_1, errorMessage, error_1, errorMessage;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 8, , 9]);
                    console.log('[REFRESH-TOKEN] 🔍 Vérification token pour organisation:', organizationId);
                    return [4 /*yield*/, prisma_js_1.prisma.googleToken.findUnique({
                            where: { organizationId: organizationId }
                        })];
                case 1:
                    googleToken = _b.sent();
                    if (!googleToken) {
                        console.log('[REFRESH-TOKEN] ❌ Aucun token trouvé pour l\'organisation:', organizationId);
                        return [2 /*return*/, { success: false, error: 'no_token_found' }];
                    }
                    console.log('[REFRESH-TOKEN] 📋 Token trouvé, expiration:', googleToken.expiresAt);
                    now = new Date();
                    thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
                    isExpiring = googleToken.expiresAt && googleToken.expiresAt <= thirtyMinutesFromNow;
                    isExpired = googleToken.expiresAt && googleToken.expiresAt <= now;
                    console.log('[REFRESH-TOKEN] ⏰ Maintenant:', now.toISOString());
                    console.log('[REFRESH-TOKEN] ⏰ Token expire le:', (_a = googleToken.expiresAt) === null || _a === void 0 ? void 0 : _a.toISOString());
                    console.log('[REFRESH-TOKEN] ⚠️ Token expirant bientôt (30min)?', isExpiring);
                    console.log('[REFRESH-TOKEN] ❌ Token déjà expiré?', isExpired);
                    console.log('[REFRESH-TOKEN] ⏰ État du token (délai 30min):');
                    console.log('  - Expire le:', googleToken.expiresAt);
                    console.log('  - Maintenant:', now);
                    console.log('  - Expiré:', isExpired);
                    console.log('  - Expire bientôt (30min):', isExpiring);
                    // 3. Si le token n'est pas expiré et pas proche de l'expiration, on le retourne tel quel
                    if (!isExpiring && !isExpired) {
                        console.log('[REFRESH-TOKEN] ✅ Token encore valide (plus de 30min), pas de refresh nécessaire');
                        return [2 /*return*/, {
                                success: true,
                                accessToken: googleToken.accessToken,
                                refreshToken: googleToken.refreshToken || undefined,
                                expiresAt: googleToken.expiresAt
                            }];
                    }
                    // 4. Le token est expiré ou expire bientôt (moins de 30min), tentative de refresh
                    if (!googleToken.refreshToken) {
                        console.log('[REFRESH-TOKEN] ❌ Token expiré mais pas de refresh token disponible');
                        return [2 /*return*/, { success: false, error: 'no_refresh_token' }];
                    }
                    console.log('[REFRESH-TOKEN] 🔄 Token expiré/expirant (moins de 30min), tentative de refresh...');
                    return [4 /*yield*/, prisma_js_1.prisma.googleWorkspaceConfig.findUnique({
                            where: { organizationId: organizationId }
                        })];
                case 2:
                    googleConfig = _b.sent();
                    if (!googleConfig || !googleConfig.clientId || !googleConfig.clientSecret) {
                        console.log('[REFRESH-TOKEN] ❌ Configuration OAuth manquante pour l\'organisation:', organizationId);
                        console.log('[REFRESH-TOKEN] 📋 Config trouvée:', !!googleConfig);
                        if (googleConfig) {
                            console.log('[REFRESH-TOKEN] 📋 ClientId présent:', !!googleConfig.clientId);
                            console.log('[REFRESH-TOKEN] 📋 ClientSecret présent:', !!googleConfig.clientSecret);
                        }
                        return [2 /*return*/, { success: false, error: 'missing_oauth_config' }];
                    }
                    // 6. Créer le client OAuth et tenter le refresh
                    console.log('[REFRESH-TOKEN] 🔧 Configuration OAuth client...');
                    oauth2Client = new googleapis_1.google.auth.OAuth2(googleConfig.clientId, googleConfig.clientSecret, googleConfig.redirectUri);
                    // Configurer le refresh token
                    console.log('[REFRESH-TOKEN] 🔑 Configuration des credentials...');
                    oauth2Client.setCredentials({
                        refresh_token: googleToken.refreshToken || undefined
                    });
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 6, , 7]);
                    console.log('[REFRESH-TOKEN] 🚀 Tentative de refresh du token...');
                    return [4 /*yield*/, oauth2Client.refreshAccessToken()];
                case 4:
                    credentials = (_b.sent()).credentials;
                    console.log('[REFRESH-TOKEN] ✅ Refresh réussi!');
                    console.log('[REFRESH-TOKEN] 📋 Nouveau token expire le:', new Date(credentials.expiry_date || 0));
                    console.log('[REFRESH-TOKEN] 📋 Token reçu:', !!credentials.access_token);
                    console.log('[REFRESH-TOKEN] 📋 Nouveau refresh token reçu:', !!credentials.refresh_token);
                    newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
                    console.log('[REFRESH-TOKEN] 💾 Sauvegarde du nouveau token...');
                    return [4 /*yield*/, prisma_js_1.prisma.googleToken.update({
                            where: { organizationId: organizationId },
                            data: __assign({ accessToken: credentials.access_token, expiresAt: newExpiresAt, updatedAt: new Date() }, (credentials.refresh_token && {
                                refreshToken: credentials.refresh_token
                            }))
                        })];
                case 5:
                    _b.sent();
                    console.log('[REFRESH-TOKEN] 💾 Token mis à jour en base de données');
                    return [2 /*return*/, {
                            success: true,
                            accessToken: credentials.access_token,
                            refreshToken: credentials.refresh_token || googleToken.refreshToken || undefined,
                            expiresAt: newExpiresAt
                        }];
                case 6:
                    refreshError_1 = _b.sent();
                    console.error('[REFRESH-TOKEN] ❌ Erreur lors du refresh:', refreshError_1);
                    errorMessage = refreshError_1 instanceof Error ? refreshError_1.message : String(refreshError_1);
                    console.log('[REFRESH-TOKEN] 🔍 Message d\'erreur:', errorMessage);
                    if (errorMessage.includes('invalid_grant')) {
                        console.log('[REFRESH-TOKEN] 🚨 Refresh token invalide ou révoqué');
                        return [2 /*return*/, { success: false, error: 'invalid_refresh_token' }];
                    }
                    else if (errorMessage.includes('invalid_client')) {
                        console.log('[REFRESH-TOKEN] 🚨 Configuration OAuth invalide');
                        return [2 /*return*/, { success: false, error: 'invalid_oauth_config' }];
                    }
                    else {
                        console.log('[REFRESH-TOKEN] 🚨 Erreur générique:', errorMessage);
                        return [2 /*return*/, { success: false, error: 'refresh_failed' }];
                    }
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _b.sent();
                    console.error('[REFRESH-TOKEN] ❌ Erreur générale dans refreshGoogleTokenIfNeeded:', error_1);
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    console.log('[REFRESH-TOKEN] 🔍 Détails de l\'erreur générale:', errorMessage);
                    return [2 /*return*/, { success: false, error: 'general_error' }];
                case 9: return [2 /*return*/];
            }
        });
    });
}

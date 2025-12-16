"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
// import { requireRole } from '../middlewares/requireRole.js';
var prisma_js_1 = require("../lib/prisma.js");
var crypto_js_1 = require("../utils/crypto.js");
var googleapis_1 = require("googleapis");
// import axios from 'axios';
var googleTokenRefresh_js_1 = require("../utils/googleTokenRefresh.js");
var GoogleOAuthCore_js_1 = require("../google-auth/core/GoogleOAuthCore.js");
var gmail_1 = __importDefault(require("../google-auth/routes/gmail")); // Routes Gmail centralisées
var securityLogger_js_1 = require("../security/securityLogger.js");
var router = (0, express_1.Router)();
var GOOGLE_SCOPES = GoogleOAuthCore_js_1.GOOGLE_SCOPES_LIST.join(' ');
// Fonction utilitaire pour récupérer la configuration Google Workspace
function getGoogleWorkspaceConfig(organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var config, decryptedConfig, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('[GOOGLE-AUTH] 📋 Recherche config pour organisation:', organizationId);
                    return [4 /*yield*/, prisma_js_1.prisma.googleWorkspaceConfig.findUnique({
                            where: { organizationId: organizationId }
                        })];
                case 1:
                    config = _a.sent();
                    console.log('[GOOGLE-AUTH] 📊 Config brute depuis BDD:', config ? 'Trouvée' : 'Non trouvée');
                    if (config) {
                        console.log('[GOOGLE-AUTH] 🔑 clientId crypté:', config.clientId ? 'Présent' : 'Manquant');
                        console.log('[GOOGLE-AUTH] 🔐 clientSecret crypté:', config.clientSecret ? 'Présent' : 'Manquant');
                        console.log('[GOOGLE-AUTH] 🔗 redirectUri:', config.redirectUri);
                    }
                    if (!config) {
                        console.log('[GOOGLE-AUTH] ❌ Aucune configuration trouvée');
                        return [2 /*return*/, null];
                    }
                    decryptedConfig = {
                        clientId: config.clientId ? (0, crypto_js_1.decrypt)(config.clientId) : null,
                        clientSecret: config.clientSecret ? (0, crypto_js_1.decrypt)(config.clientSecret) : null,
                        redirectUri: config.redirectUri,
                        adminEmail: config.adminEmail, // Ajout de l'email admin
                        isConfigured: !!config.clientId && !!config.clientSecret && !!config.redirectUri
                    };
                    console.log('[GOOGLE-AUTH] 🔓 Config décryptée:');
                    console.log('[GOOGLE-AUTH] 🆔 clientId décrypté:', decryptedConfig.clientId ? 'OK' : 'ERREUR');
                    console.log('[GOOGLE-AUTH] 🔐 clientSecret décrypté:', decryptedConfig.clientSecret ? 'OK' : 'ERREUR');
                    console.log('[GOOGLE-AUTH] 🔗 redirectUri final:', decryptedConfig.redirectUri);
                    console.log('[GOOGLE-AUTH] 📧 adminEmail:', decryptedConfig.adminEmail);
                    console.log('[GOOGLE-AUTH] ✅ isConfigured:', decryptedConfig.isConfigured);
                    return [2 /*return*/, decryptedConfig];
                case 2:
                    error_1 = _a.sent();
                    console.error('[GOOGLE-AUTH] ❌ Erreur récupération config:', error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Fonction pour activer automatiquement les modules Google Workspace
function activateGoogleModules(organizationId, grantedScopes) {
    return __awaiter(this, void 0, void 0, function () {
        var scopesArray_1, moduleMapping, modulesToActivate, configUpdates, _i, moduleMapping_1, module_1, hasRequiredScopes, _a, modulesToActivate_1, moduleName, module_2, moduleError_1, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 12, , 13]);
                    console.log('[GOOGLE-AUTH] 🔧 Début activation modules pour org:', organizationId);
                    console.log('[GOOGLE-AUTH] 🔐 Scopes accordés:', grantedScopes);
                    scopesArray_1 = grantedScopes.split(' ');
                    moduleMapping = [
                        {
                            name: 'Gmail',
                            scopes: ['https://mail.google.com/', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify'],
                            configField: 'gmailEnabled'
                        },
                        {
                            name: 'Calendar',
                            scopes: ['https://www.googleapis.com/auth/calendar'],
                            configField: 'calendarEnabled'
                        },
                        {
                            name: 'Drive',
                            scopes: ['https://www.googleapis.com/auth/drive'],
                            configField: 'driveEnabled'
                        },
                        {
                            name: 'Docs',
                            scopes: ['https://www.googleapis.com/auth/documents'],
                            configField: 'docsEnabled'
                        },
                        {
                            name: 'Sheets',
                            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                            configField: 'sheetsEnabled'
                        },
                        {
                            name: 'Meet',
                            scopes: ['https://www.googleapis.com/auth/meetings'],
                            configField: 'meetEnabled'
                        }
                    ];
                    modulesToActivate = [];
                    configUpdates = {};
                    // Vérifier quels modules peuvent être activés
                    for (_i = 0, moduleMapping_1 = moduleMapping; _i < moduleMapping_1.length; _i++) {
                        module_1 = moduleMapping_1[_i];
                        hasRequiredScopes = module_1.scopes.some(function (scope) { return scopesArray_1.includes(scope); });
                        if (hasRequiredScopes) {
                            modulesToActivate.push(module_1.name);
                            configUpdates[module_1.configField] = true;
                            console.log('[GOOGLE-AUTH] ✅ Module activable:', module_1.name);
                        }
                        else {
                            console.log('[GOOGLE-AUTH] ❌ Module non activable (scopes manquants):', module_1.name);
                        }
                    }
                    if (!(Object.keys(configUpdates).length > 0)) return [3 /*break*/, 2];
                    console.log('[GOOGLE-AUTH] 💾 Mise à jour config avec modules:', configUpdates);
                    return [4 /*yield*/, prisma_js_1.prisma.googleWorkspaceConfig.update({
                            where: { organizationId: organizationId },
                            data: __assign(__assign({}, configUpdates), { enabled: true, isActive: true, updatedAt: new Date() })
                        })];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    // Activer les modules correspondants dans la table modules
                    console.log('[GOOGLE-AUTH] 🔧 Activation des modules CRM...');
                    _a = 0, modulesToActivate_1 = modulesToActivate;
                    _b.label = 3;
                case 3:
                    if (!(_a < modulesToActivate_1.length)) return [3 /*break*/, 11];
                    moduleName = modulesToActivate_1[_a];
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 9, , 10]);
                    return [4 /*yield*/, prisma_js_1.prisma.module.findFirst({
                            where: {
                                label: {
                                    contains: moduleName,
                                    mode: 'insensitive'
                                }
                            }
                        })];
                case 5:
                    module_2 = _b.sent();
                    if (!module_2) return [3 /*break*/, 7];
                    // Activer le module pour l'organisation
                    return [4 /*yield*/, prisma_js_1.prisma.organizationModule.upsert({
                            where: {
                                organizationId_moduleId: {
                                    organizationId: organizationId,
                                    moduleId: module_2.id
                                }
                            },
                            update: {
                                isActive: true,
                                activatedAt: new Date(),
                                updatedAt: new Date()
                            },
                            create: {
                                organizationId: organizationId,
                                moduleId: module_2.id,
                                isActive: true,
                                activatedAt: new Date()
                            }
                        })];
                case 6:
                    // Activer le module pour l'organisation
                    _b.sent();
                    console.log('[GOOGLE-AUTH] ✅ Module CRM activé:', moduleName, '(', module_2.id, ')');
                    return [3 /*break*/, 8];
                case 7:
                    console.log('[GOOGLE-AUTH] ⚠️ Module CRM non trouvé:', moduleName);
                    _b.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    moduleError_1 = _b.sent();
                    console.error('[GOOGLE-AUTH] ❌ Erreur activation module', moduleName, ':', moduleError_1);
                    return [3 /*break*/, 10];
                case 10:
                    _a++;
                    return [3 /*break*/, 3];
                case 11:
                    console.log('[GOOGLE-AUTH] ✅ Activation des modules terminée. Modules activés:', modulesToActivate);
                    return [2 /*return*/, modulesToActivate];
                case 12:
                    error_2 = _b.sent();
                    console.error('[GOOGLE-AUTH] ❌ Erreur activation modules:', error_2);
                    return [2 /*return*/, []];
                case 13: return [2 /*return*/];
            }
        });
    });
}
// GET /api/google-auth/url - Générer l'URL d'authentification Google
router.get('/url', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, config, stateObj, authUrl, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                organizationId = req.query.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID requis'
                        })];
                }
                return [4 /*yield*/, getGoogleWorkspaceConfig(organizationId)];
            case 1:
                config = _b.sent();
                if (!config || !config.isConfigured) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Google Workspace non configuré pour cette organisation'
                        })];
                }
                stateObj = {
                    userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || null,
                    organizationId: organizationId
                };
                authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=".concat(config.clientId, "&") +
                    "redirect_uri=".concat(encodeURIComponent(config.redirectUri), "&") +
                    "scope=".concat(encodeURIComponent(GOOGLE_SCOPES), "&") +
                    "response_type=code&" +
                    "access_type=offline&" +
                    "prompt=consent&" +
                    "state=".concat(encodeURIComponent(JSON.stringify(stateObj)));
                res.json({
                    success: true,
                    data: {
                        authUrl: authUrl,
                        scopes: GOOGLE_SCOPES.split(' '),
                        clientConfigured: true
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('[GOOGLE-AUTH] Erreur génération URL:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la génération de l\'URL d\'authentification'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/auth/google/connect - Alias pour /url (compatibilité UI)
router.get('/connect', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, config, stateObj, authUrl, error_4;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                organizationId = req.query.organizationId || ((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId) === null || _b === void 0 ? void 0 : _b.toString());
                console.log('[GOOGLE-AUTH] 🔍 OrganizationId extrait:', organizationId);
                console.log('[GOOGLE-AUTH] 👤 User info:', req.user ? 'Présent' : 'Absent');
                console.log('[GOOGLE-AUTH] 🏢 User organizationId:', (_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId);
                if (!organizationId) {
                    console.log('[GOOGLE-AUTH] ❌ Aucun organizationId trouvé (query ou user)');
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID requis (non trouvé dans query ou profil utilisateur)'
                        })];
                }
                return [4 /*yield*/, getGoogleWorkspaceConfig(organizationId)];
            case 1:
                config = _e.sent();
                console.log('[GOOGLE-AUTH] 🔍 Configuration récupérée pour org:', organizationId);
                console.log('[GOOGLE-AUTH] 🔧 Config complète:', JSON.stringify(config, null, 2));
                if (!config || !config.isConfigured) {
                    console.log('[GOOGLE-AUTH] ❌ Configuration manquante ou incomplète');
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Google Workspace non configuré pour cette organisation'
                        })];
                }
                console.log('[GOOGLE-AUTH] ✅ Configuration valide détectée');
                console.log('[GOOGLE-AUTH] 🆔 ClientId:', config.clientId);
                console.log('[GOOGLE-AUTH] 🔗 RedirectUri:', config.redirectUri);
                console.log('[GOOGLE-AUTH] 🏢 Domain:', config.domain);
                stateObj = {
                    userId: ((_d = req.user) === null || _d === void 0 ? void 0 : _d.userId) || null,
                    organizationId: organizationId
                };
                authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=".concat(config.clientId, "&") +
                    "redirect_uri=".concat(encodeURIComponent(config.redirectUri), "&") +
                    "scope=".concat(encodeURIComponent(GOOGLE_SCOPES), "&") +
                    "response_type=code&" +
                    "access_type=offline&" +
                    "prompt=consent&" +
                    "state=".concat(encodeURIComponent(JSON.stringify(stateObj)));
                console.log('[GOOGLE-AUTH] 🌐 URL générée:', authUrl);
                res.json({
                    success: true,
                    data: {
                        authUrl: authUrl,
                        scopes: GOOGLE_SCOPES.split(' '),
                        clientConfigured: true
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _e.sent();
                console.error('[GOOGLE-AUTH] Erreur génération URL connect:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la génération de l\'URL d\'authentification'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/google-auth/callback - Callback OAuth Google
router.get('/callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, state, error, organizationId, userId, platform, parsedState, raw, callbackPath, redirectUrl, config, oauth2Client, tokens, oauth2, userInfo, googleTokenRecord, tokenError_1, error_6, errorType, error_5;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    return __generator(this, function (_m) {
        switch (_m.label) {
            case 0:
                _m.trys.push([0, 10, , 11]);
                _a = req.query, code = _a.code, state = _a.state, error = _a.error;
                console.log('[GOOGLE-AUTH] 🔄 Callback OAuth reçu');
                console.log('[GOOGLE-AUTH] 📋 State (organizationId):', state);
                console.log('[GOOGLE-AUTH] 🔑 Code présent:', !!code);
                console.log('[GOOGLE-AUTH] ❌ Erreur présente:', !!error);
                if (error) {
                    console.log('[GOOGLE-AUTH] ❌ Erreur OAuth:', error);
                    return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_error=").concat(error))];
                }
                if (!code || !state) {
                    console.log('[GOOGLE-AUTH] ❌ Paramètres manquants - Code:', !!code, 'State:', !!state);
                    return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_error=missing_params"))];
                }
                organizationId = void 0;
                userId = void 0;
                platform = void 0;
                try {
                    parsedState = void 0;
                    try {
                        parsedState = JSON.parse(state);
                    }
                    catch (_o) {
                        raw = Buffer.from(String(state), 'base64url').toString('utf8');
                        parsedState = JSON.parse(raw);
                    }
                    organizationId = parsedState.organizationId;
                    userId = parsedState.userId; // On récupère aussi l'userId
                    platform = parsedState.platform; // Nouveau: détection de la plateforme publicitaire
                    if (!organizationId || !userId) {
                        throw new Error('State object is missing organizationId or userId');
                    }
                    // Si c'est un callback pour les intégrations publicitaires, rediriger
                    if (platform && (platform === 'google_ads' || platform === 'meta_ads')) {
                        console.log('[GOOGLE-AUTH] 🔄 Redirection vers gestionnaire intégrations publicitaires:', platform);
                        callbackPath = "/api/integrations/advertising/oauth/".concat(platform, "/callback");
                        redirectUrl = "".concat(callbackPath, "?").concat(new URLSearchParams(req.query).toString());
                        return [2 /*return*/, res.redirect(redirectUrl)];
                    }
                }
                catch (_p) {
                    console.error('[GOOGLE-AUTH] ❌ State invalide, non-JSON ou champs manquants:', state);
                    return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_error=invalid_state"))];
                }
                console.log('[GOOGLE-AUTH] 🏢 Organisation cible:', organizationId, 'pour utilisateur:', userId);
                return [4 /*yield*/, getGoogleWorkspaceConfig(organizationId)];
            case 1:
                config = _m.sent();
                if (!config || !config.isConfigured || !config.adminEmail) {
                    console.log('[GOOGLE-AUTH] ❌ Configuration manquante ou email admin non défini pour org:', organizationId);
                    return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_error=config_incomplete"))];
                }
                console.log('[GOOGLE-AUTH] ✅ Configuration trouvée, email admin cible:', config.adminEmail);
                console.log('[GOOGLE-AUTH] 🔄 Échange du code contre les tokens...');
                oauth2Client = new googleapis_1.google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
                _m.label = 2;
            case 2:
                _m.trys.push([2, 8, , 9]);
                return [4 /*yield*/, oauth2Client.getToken(code)];
            case 3:
                tokens = (_m.sent()).tokens;
                console.log('[GOOGLE-AUTH] ✅ Tokens reçus:', {
                    accessToken: !!tokens.access_token,
                    refreshToken: !!tokens.refresh_token,
                    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                    scope: tokens.scope
                });
                // Configurer le client avec les tokens pour récupérer les infos utilisateur
                oauth2Client.setCredentials(tokens);
                oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
                return [4 /*yield*/, oauth2.userinfo.get()];
            case 4:
                userInfo = _m.sent();
                console.log('[GOOGLE-AUTH] ✅ Informations du compte Google connecté:', {
                    email: userInfo.data.email,
                    name: userInfo.data.name,
                });
                // VÉRIFICATION CRUCIALE : L'email du compte Google connecté doit correspondre à l'adminEmail de la config
                if (((_b = userInfo.data.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== config.adminEmail.toLowerCase()) {
                    console.log("[GOOGLE-AUTH] \u274C ERREUR DE COMPTE : L'utilisateur s'est connect\u00E9 avec ".concat(userInfo.data.email, ", mais la configuration attendait ").concat(config.adminEmail, "."));
                    return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_error=account_mismatch&expected=").concat(encodeURIComponent(config.adminEmail), "&connected_as=").concat(encodeURIComponent(userInfo.data.email || '')))];
                }
                console.log('[GOOGLE-AUTH] ✅ Connexion Google validée pour l\'admin:', config.adminEmail);
                // Sauvegarder ou mettre à jour les tokens pour l'organisation
                console.log('[GOOGLE-AUTH] 💾 Sauvegarde des tokens pour l\'organisation:', organizationId);
                return [4 /*yield*/, GoogleOAuthCore_js_1.googleOAuthService.saveUserTokens(userId, organizationId, tokens)];
            case 5:
                _m.sent();
                return [4 /*yield*/, prisma_js_1.prisma.googleToken.findUnique({ where: { organizationId: organizationId } })];
            case 6:
                googleTokenRecord = _m.sent();
                console.log('[GOOGLE-AUTH] ✅ Tokens sauvegardés pour l\'organisation:', googleTokenRecord === null || googleTokenRecord === void 0 ? void 0 : googleTokenRecord.id);
                // Activer automatiquement les modules Google Workspace pour cette organisation
                console.log('[GOOGLE-AUTH] 🔧 Activation des modules Google Workspace...');
                return [4 /*yield*/, activateGoogleModules(organizationId, tokens.scope || '')];
            case 7:
                _m.sent();
                console.log('[GOOGLE-AUTH] 🎉 Authentification Google complète avec succès !');
                // Redirection vers notre page de callback spécialisée
                return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_success=1&organizationId=").concat(organizationId, "&admin_email=").concat(encodeURIComponent(config.adminEmail)))];
            case 8:
                tokenError_1 = _m.sent();
                error_6 = tokenError_1;
                console.error('[GOOGLE-AUTH] ❌ Erreur lors de l\'échange des tokens:', error_6);
                console.error('[GOOGLE-AUTH] 📊 Détails erreur:');
                console.error('[GOOGLE-AUTH] 🆔 Status:', (_c = error_6.response) === null || _c === void 0 ? void 0 : _c.status);
                console.error('[GOOGLE-AUTH] 📝 Message:', error_6.message);
                console.error('[GOOGLE-AUTH] 📋 Data:', (_d = error_6.response) === null || _d === void 0 ? void 0 : _d.data);
                console.error('[GOOGLE-AUTH] 🔗 URL appelée:', (_e = error_6.config) === null || _e === void 0 ? void 0 : _e.url);
                errorType = 'token_exchange_failed';
                if (((_f = error_6.response) === null || _f === void 0 ? void 0 : _f.status) === 400) {
                    if (((_h = (_g = error_6.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.error) === 'invalid_client') {
                        errorType = 'invalid_client_config';
                    }
                    else if (((_k = (_j = error_6.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.error) === 'invalid_grant') {
                        errorType = 'invalid_authorization_code';
                    }
                }
                else if (((_l = error_6.response) === null || _l === void 0 ? void 0 : _l.status) === 401) {
                    errorType = 'unauthorized_client';
                }
                return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_error=").concat(errorType, "&details=").concat(encodeURIComponent(error_6.message || 'Erreur inconnue')))];
            case 9: return [3 /*break*/, 11];
            case 10:
                error_5 = _m.sent();
                console.error('[GOOGLE-AUTH] ❌ Erreur callback générale:', error_5);
                return [2 /*return*/, res.redirect("".concat(process.env.FRONTEND_URL || 'http://localhost:5173', "/google-auth-callback?google_error=callback_error"))];
            case 11: return [2 /*return*/];
        }
    });
}); });
// GET /api/google-auth/status - Statut de la connexion Google  
router.get('/status', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, refreshResult, userEmail, tokenValid, scopes, oauth2Client, oauth2, userInfo, googleToken_1, tokenError_2, googleToken, error_7;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 8, , 9]);
                console.log('[GOOGLE-AUTH] 📊 Vérification statut connexion pour user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
                if (!((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId)) {
                    return [2 /*return*/, res.json({
                            success: true,
                            data: {
                                connected: false,
                                email: null,
                                scopes: [],
                                lastSync: null,
                                error: 'Utilisateur non authentifié'
                            }
                        })];
                }
                organizationId = req.query.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.json({
                            success: true,
                            data: {
                                connected: false,
                                email: null,
                                scopes: [],
                                lastSync: null,
                                error: 'Organization ID requis'
                            }
                        })];
                }
                console.log('[GOOGLE-AUTH] 🔄 Tentative de refresh automatique pour organisation:', organizationId);
                return [4 /*yield*/, (0, googleTokenRefresh_js_1.refreshGoogleTokenIfNeeded)(organizationId)];
            case 1:
                refreshResult = _d.sent();
                if (!refreshResult.success) {
                    console.log('[GOOGLE-AUTH] ❌ Refresh automatique échoué:', refreshResult.error);
                    // Gérer les différents types d'erreurs
                    if (refreshResult.error === 'no_token_found') {
                        return [2 /*return*/, res.json({
                                success: true,
                                data: {
                                    connected: false,
                                    email: null,
                                    scopes: [],
                                    lastSync: null,
                                    error: 'Aucun token Google trouvé'
                                }
                            })];
                    }
                    else if (refreshResult.error === 'no_refresh_token') {
                        return [2 /*return*/, res.json({
                                success: true,
                                data: {
                                    connected: false,
                                    email: null,
                                    scopes: [],
                                    lastSync: null,
                                    error: 'Token expiré, reconnexion requise'
                                }
                            })];
                    }
                    else if (refreshResult.error === 'invalid_refresh_token') {
                        return [2 /*return*/, res.json({
                                success: true,
                                data: {
                                    connected: false,
                                    email: null,
                                    scopes: [],
                                    lastSync: null,
                                    error: 'Token révoqué, reconnexion requise'
                                }
                            })];
                    }
                    else {
                        return [2 /*return*/, res.json({
                                success: true,
                                data: {
                                    connected: false,
                                    email: null,
                                    scopes: [],
                                    lastSync: null,
                                    error: 'Erreur de connexion Google'
                                }
                            })];
                    }
                }
                console.log('[GOOGLE-AUTH] ✅ Token valide ou rafraîchi avec succès');
                userEmail = null;
                tokenValid = false;
                scopes = [];
                _d.label = 2;
            case 2:
                _d.trys.push([2, 5, , 6]);
                oauth2Client = new googleapis_1.google.auth.OAuth2();
                oauth2Client.setCredentials({
                    access_token: refreshResult.accessToken,
                    refresh_token: refreshResult.refreshToken,
                    expiry_date: (_c = refreshResult.expiresAt) === null || _c === void 0 ? void 0 : _c.getTime()
                });
                oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
                return [4 /*yield*/, oauth2.userinfo.get()];
            case 3:
                userInfo = _d.sent();
                userEmail = userInfo.data.email;
                tokenValid = true;
                return [4 /*yield*/, prisma_js_1.prisma.googleToken.findUnique({
                        where: { organizationId: organizationId }
                    })];
            case 4:
                googleToken_1 = _d.sent();
                scopes = (googleToken_1 === null || googleToken_1 === void 0 ? void 0 : googleToken_1.scope) ? googleToken_1.scope.split(' ') : [];
                console.log('[GOOGLE-AUTH] ✅ Token validé avec succès, email:', userEmail);
                return [3 /*break*/, 6];
            case 5:
                tokenError_2 = _d.sent();
                console.log('[GOOGLE-AUTH] ❌ Erreur validation token final:', tokenError_2);
                tokenValid = false;
                return [3 /*break*/, 6];
            case 6: return [4 /*yield*/, prisma_js_1.prisma.googleToken.findUnique({
                    where: { organizationId: organizationId }
                })];
            case 7:
                googleToken = _d.sent();
                res.json({
                    success: true,
                    data: {
                        connected: tokenValid,
                        email: userEmail,
                        scopes: scopes,
                        lastSync: googleToken === null || googleToken === void 0 ? void 0 : googleToken.updatedAt,
                        expiresAt: refreshResult.expiresAt,
                        isExpired: false, // Le token est maintenant garanti valide
                        autoRefreshEnabled: true // Indicateur que le refresh automatique est actif
                    }
                });
                return [3 /*break*/, 9];
            case 8:
                error_7 = _d.sent();
                console.error('[GOOGLE-AUTH] ❌ Erreur statut:', error_7);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la vérification du statut'
                });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// POST /api/google-auth/disconnect - Déconnecter Google
router.post('/disconnect', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, googleToken, oauth2Client, revokeError_1, googleModules, _i, googleModules_1, module_3, error_8, orgIdFromBody, errMsg;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 14, , 15]);
                console.log('[GOOGLE-AUTH] 🔄 Début déconnexion pour user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
                if (!((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId)) {
                    return [2 /*return*/, res.status(401).json({
                            success: false,
                            message: 'Utilisateur non authentifié'
                        })];
                }
                organizationId = req.body.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID requis'
                        })];
                }
                // Journalisation de l'intention de déconnexion (traçabilité)
                try {
                    (0, securityLogger_js_1.logSecurityEvent)('GOOGLE_DISCONNECT_REQUESTED', {
                        userId: req.user.userId,
                        organizationId: organizationId,
                        ip: req.ip,
                        userAgent: req.headers['user-agent'] || null
                    }, 'info');
                }
                catch (e) {
                    console.warn('[GOOGLE-AUTH] Warn: échec logSecurityEvent (REQUESTED):', e === null || e === void 0 ? void 0 : e.message);
                }
                return [4 /*yield*/, prisma_js_1.prisma.googleToken.findUnique({
                        where: { organizationId: organizationId }
                    })];
            case 1:
                googleToken = _d.sent();
                if (!googleToken) return [3 /*break*/, 7];
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                // Révoquer le token côté Google
                console.log('[GOOGLE-AUTH] 🚫 Révocation du token côté Google...');
                oauth2Client = new googleapis_1.google.auth.OAuth2();
                oauth2Client.setCredentials({
                    access_token: googleToken.accessToken
                });
                return [4 /*yield*/, oauth2Client.revokeCredentials()];
            case 3:
                _d.sent();
                console.log('[GOOGLE-AUTH] ✅ Token révoqué côté Google');
                return [3 /*break*/, 5];
            case 4:
                revokeError_1 = _d.sent();
                console.log('[GOOGLE-AUTH] ⚠️ Erreur révocation côté Google (peut-être déjà révoqué):', revokeError_1);
                return [3 /*break*/, 5];
            case 5:
                // Supprimer le token de notre base de données
                console.log('[GOOGLE-AUTH] 🗑️ Suppression du token de la base...');
                return [4 /*yield*/, prisma_js_1.prisma.googleToken.delete({
                        where: { organizationId: organizationId }
                    })];
            case 6:
                _d.sent();
                console.log('[GOOGLE-AUTH] ✅ Token supprimé de la base');
                _d.label = 7;
            case 7:
                // Désactiver les modules Google Workspace pour l'organisation
                console.log('[GOOGLE-AUTH] 🔧 Désactivation des modules Google...');
                return [4 /*yield*/, prisma_js_1.prisma.googleWorkspaceConfig.update({
                        where: { organizationId: organizationId },
                        data: {
                            enabled: false,
                            gmailEnabled: false,
                            calendarEnabled: false,
                            driveEnabled: false,
                            docsEnabled: false,
                            sheetsEnabled: false,
                            meetEnabled: false,
                            voiceEnabled: false,
                            updatedAt: new Date()
                        }
                    })];
            case 8:
                _d.sent();
                return [4 /*yield*/, prisma_js_1.prisma.module.findMany({
                        where: {
                            name: {
                                in: ['Gmail', 'Calendar', 'Drive', 'Docs', 'Sheets', 'Meet'],
                                mode: 'insensitive'
                            }
                        }
                    })];
            case 9:
                googleModules = _d.sent();
                _i = 0, googleModules_1 = googleModules;
                _d.label = 10;
            case 10:
                if (!(_i < googleModules_1.length)) return [3 /*break*/, 13];
                module_3 = googleModules_1[_i];
                return [4 /*yield*/, prisma_js_1.prisma.organizationModule.updateMany({
                        where: {
                            organizationId: organizationId,
                            moduleId: module_3.id
                        },
                        data: {
                            isActive: false,
                            updatedAt: new Date()
                        }
                    })];
            case 11:
                _d.sent();
                _d.label = 12;
            case 12:
                _i++;
                return [3 /*break*/, 10];
            case 13:
                console.log('[GOOGLE-AUTH] ✅ Modules Google désactivés');
                console.log('[GOOGLE-AUTH] 🎉 Déconnexion Google complète');
                try {
                    (0, securityLogger_js_1.logSecurityEvent)('GOOGLE_DISCONNECT_COMPLETED', {
                        userId: req.user.userId,
                        organizationId: organizationId,
                        ip: req.ip,
                        userAgent: req.headers['user-agent'] || null
                    }, 'info');
                }
                catch (e) {
                    console.warn('[GOOGLE-AUTH] Warn: échec logSecurityEvent (COMPLETED):', e === null || e === void 0 ? void 0 : e.message);
                }
                res.json({
                    success: true,
                    message: 'Déconnecté de Google Workspace avec succès'
                });
                return [3 /*break*/, 15];
            case 14:
                error_8 = _d.sent();
                console.error('[GOOGLE-AUTH] ❌ Erreur déconnexion:', error_8);
                try {
                    orgIdFromBody = (req.body && typeof req.body.organizationId === 'string')
                        ? req.body.organizationId
                        : null;
                    errMsg = (error_8 instanceof Error) ? error_8.message : String(error_8);
                    (0, securityLogger_js_1.logSecurityEvent)('GOOGLE_DISCONNECT_ERROR', {
                        userId: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId) || null,
                        organizationId: orgIdFromBody,
                        ip: req.ip,
                        userAgent: req.headers['user-agent'] || null,
                        error: errMsg
                    }, 'error');
                }
                catch (e) {
                    console.warn('[GOOGLE-AUTH] Warn: échec logSecurityEvent (ERROR):', e === null || e === void 0 ? void 0 : e.message);
                }
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la déconnexion'
                });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
// POST /api/google-auth/toggle-module - Activer/désactiver un module Google spécifique
router.post('/toggle-module', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, moduleName, enabled, organizationId, googleToken, moduleConfigMap, configField, updateData, module_4, error_9;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 6, , 7]);
                _a = req.body, moduleName = _a.moduleName, enabled = _a.enabled, organizationId = _a.organizationId;
                console.log('[GOOGLE-AUTH] 🔧 Toggle module:', moduleName, 'enabled:', enabled, 'pour organization:', organizationId);
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID requis'
                        })];
                }
                if (!moduleName || typeof enabled !== 'boolean') {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Paramètres invalides (moduleName et enabled requis)'
                        })];
                }
                return [4 /*yield*/, prisma_js_1.prisma.googleToken.findUnique({
                        where: { organizationId: organizationId }
                    })];
            case 1:
                googleToken = _c.sent();
                if (!googleToken && enabled) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Connexion Google requise pour activer les modules'
                        })];
                }
                moduleConfigMap = {
                    'Gmail': 'gmailEnabled',
                    'Calendar': 'calendarEnabled',
                    'Drive': 'driveEnabled',
                    'Docs': 'docsEnabled',
                    'Sheets': 'sheetsEnabled',
                    'Meet': 'meetEnabled',
                    'Voice': 'voiceEnabled'
                };
                configField = moduleConfigMap[moduleName];
                if (!configField) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Module non reconnu'
                        })];
                }
                updateData = (_b = {},
                    _b[configField] = enabled,
                    _b.updatedAt = new Date(),
                    _b);
                return [4 /*yield*/, prisma_js_1.prisma.googleWorkspaceConfig.update({
                        where: { organizationId: organizationId },
                        data: updateData
                    })];
            case 2:
                _c.sent();
                return [4 /*yield*/, prisma_js_1.prisma.module.findFirst({
                        where: {
                            name: {
                                contains: moduleName,
                                mode: 'insensitive'
                            }
                        }
                    })];
            case 3:
                module_4 = _c.sent();
                if (!module_4) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma_js_1.prisma.organizationModule.upsert({
                        where: {
                            organizationId_moduleId: {
                                organizationId: organizationId,
                                moduleId: module_4.id
                            }
                        },
                        update: {
                            isActive: enabled,
                            activatedAt: enabled ? new Date() : null,
                            updatedAt: new Date()
                        },
                        create: {
                            organizationId: organizationId,
                            moduleId: module_4.id,
                            isActive: enabled,
                            activatedAt: enabled ? new Date() : null
                        }
                    })];
            case 4:
                _c.sent();
                _c.label = 5;
            case 5:
                console.log('[GOOGLE-AUTH] ✅ Module', moduleName, enabled ? 'activé' : 'désactivé');
                res.json({
                    success: true,
                    message: "Module ".concat(moduleName, " ").concat(enabled ? 'activé' : 'désactivé', " avec succ\u00E8s"),
                    data: {
                        moduleName: moduleName,
                        enabled: enabled
                    }
                });
                return [3 /*break*/, 7];
            case 6:
                error_9 = _c.sent();
                console.error('[GOOGLE-AUTH] ❌ Erreur toggle module:', error_9);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la modification du module'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Routes Gmail centralisées (avec authentification middleware)
router.use('/gmail', auth_js_1.authMiddleware, gmail_1.default);
console.log('[GOOGLE-AUTH] Routes Gmail centralisées montées sur /gmail');
exports.default = router;

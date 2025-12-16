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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var client_1 = require("@prisma/client");
var zod_1 = require("zod");
var crypto_js_1 = require("../utils/crypto.js");
var auth_js_1 = require("../middlewares/auth.js");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Auth obligatoire avant vérification de rôles
router.use(auth_js_1.authMiddleware);
// Schéma de validation pour la configuration Google Workspace
var googleWorkspaceConfigSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, 'Client ID requis'),
    clientSecret: zod_1.z.string().optional(), // Optionnel pour la mise à jour
    redirectUri: zod_1.z.string().url('URL de redirection invalide').optional(),
    domain: zod_1.z.string().min(1, 'Domaine requis'),
    adminEmail: zod_1.z.string().email('Email admin invalide'),
    // Champs compte de service
    serviceAccountEmail: zod_1.z.string().email('Email du compte de service invalide').optional(),
    privateKey: zod_1.z.string().optional(),
    // État de la configuration
    isActive: zod_1.z.boolean().default(false),
    // Modules à activer
    gmailEnabled: zod_1.z.boolean().default(false),
    calendarEnabled: zod_1.z.boolean().default(false),
    driveEnabled: zod_1.z.boolean().default(false),
    meetEnabled: zod_1.z.boolean().default(false),
    docsEnabled: zod_1.z.boolean().default(false),
    sheetsEnabled: zod_1.z.boolean().default(false),
    voiceEnabled: zod_1.z.boolean().default(false),
});
// GET /api/organizations/:id/google-workspace/config - Récupérer la configuration
router.get('/:id/google-workspace/config', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, requestingUser, config, isCompleteConfig, safeConfig, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[GOOGLE-WORKSPACE] GET /organizations/:id/google-workspace/config');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                id = req.params.id;
                requestingUser = req.user;
                // Vérification des permissions
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin' && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId) !== id) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cette organisation'
                        })];
                }
                return [4 /*yield*/, prisma.googleWorkspaceConfig.findUnique({
                        where: { organizationId: id }
                    })];
            case 2:
                config = _a.sent();
                if (!config) {
                    // Retourner une configuration par défaut
                    return [2 /*return*/, res.json({
                            success: true,
                            data: {
                                isConfigured: false,
                                clientId: '',
                                clientSecret: '',
                                redirectUri: "".concat(process.env.FRONTEND_URL || 'http://localhost:3000', "/api/auth/google/callback"),
                                domain: '',
                                adminEmail: '',
                                serviceAccountEmail: '',
                                privateKey: '',
                                isActive: false,
                                gmailEnabled: false,
                                calendarEnabled: false,
                                driveEnabled: false,
                                meetEnabled: false,
                                docsEnabled: false,
                                sheetsEnabled: false,
                                voiceEnabled: false,
                                enabled: false
                            }
                        })];
                }
                isCompleteConfig = !!(config.clientId && config.clientSecret && config.domain && config.adminEmail);
                safeConfig = {
                    isConfigured: isCompleteConfig,
                    clientId: config.clientId || '',
                    clientSecret: config.clientSecret ? (0, crypto_js_1.decrypt)(config.clientSecret) : '', // Afficher la vraie valeur décryptée
                    hasClientSecret: !!config.clientSecret,
                    redirectUri: config.redirectUri || "".concat(process.env.FRONTEND_URL || 'http://localhost:3000', "/api/auth/google/callback"),
                    domain: config.domain || '',
                    adminEmail: config.adminEmail || '',
                    serviceAccountEmail: config.serviceAccountEmail || '',
                    privateKey: config.privateKey ? (0, crypto_js_1.decrypt)(config.privateKey) : '', // Afficher la vraie valeur décryptée
                    hasPrivateKey: !!config.privateKey,
                    isActive: config.enabled || false,
                    gmailEnabled: config.gmailEnabled,
                    calendarEnabled: config.calendarEnabled,
                    driveEnabled: config.driveEnabled,
                    meetEnabled: config.meetEnabled,
                    docsEnabled: config.docsEnabled,
                    sheetsEnabled: config.sheetsEnabled,
                    voiceEnabled: config.voiceEnabled,
                    enabled: config.enabled && isCompleteConfig // Enabled seulement si config complète
                };
                res.json({
                    success: true,
                    data: safeConfig
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('[GOOGLE-WORKSPACE] Erreur GET config:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération de la configuration'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/organizations/:id/google-workspace/config - Sauvegarder la configuration
router.post('/:id/google-workspace/config', (0, requireRole_js_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, requestingUser, validationResult, data, organization, redirectUri, existingConfig, configData, config, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[GOOGLE-WORKSPACE] POST /organizations/:id/google-workspace/config');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                id = req.params.id;
                requestingUser = req.user;
                // Seuls les super admins peuvent configurer Google Workspace
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin') {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Seuls les Super Admins peuvent configurer Google Workspace'
                        })];
                }
                validationResult = googleWorkspaceConfigSchema.safeParse(req.body);
                if (!validationResult.success) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Données invalides',
                            errors: validationResult.error.errors
                        })];
                }
                data = validationResult.data;
                return [4 /*yield*/, prisma.organization.findUnique({
                        where: { id: id }
                    })];
            case 2:
                organization = _a.sent();
                if (!organization) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Organisation non trouvée'
                        })];
                }
                redirectUri = data.redirectUri || "".concat(process.env.FRONTEND_URL || 'http://localhost:3000', "/api/auth/google/callback");
                return [4 /*yield*/, prisma.googleWorkspaceConfig.findUnique({
                        where: { organizationId: id }
                    })];
            case 3:
                existingConfig = _a.sent();
                configData = {
                    clientId: data.clientId,
                    clientSecret: data.clientSecret || (existingConfig === null || existingConfig === void 0 ? void 0 : existingConfig.clientSecret), // Garder l'ancien si vide
                    redirectUri: redirectUri,
                    domain: data.domain,
                    adminEmail: data.adminEmail,
                    serviceAccountEmail: data.serviceAccountEmail || (existingConfig === null || existingConfig === void 0 ? void 0 : existingConfig.serviceAccountEmail),
                    privateKey: data.privateKey || (existingConfig === null || existingConfig === void 0 ? void 0 : existingConfig.privateKey),
                    enabled: data.isActive || false,
                    gmailEnabled: data.gmailEnabled,
                    calendarEnabled: data.calendarEnabled,
                    driveEnabled: data.driveEnabled,
                    meetEnabled: data.meetEnabled,
                    docsEnabled: data.docsEnabled,
                    sheetsEnabled: data.sheetsEnabled,
                    voiceEnabled: data.voiceEnabled,
                    updatedAt: new Date()
                };
                return [4 /*yield*/, prisma.googleWorkspaceConfig.upsert({
                        where: { organizationId: id },
                        update: configData,
                        create: __assign({ organizationId: id }, configData)
                    })];
            case 4:
                config = _a.sent();
                console.log("[GOOGLE-WORKSPACE] Configuration sauvegard\u00E9e pour l'organisation ".concat(id));
                res.json({
                    success: true,
                    message: 'Configuration Google Workspace sauvegardée avec succès',
                    data: {
                        id: config.id,
                        enabled: config.enabled
                    }
                });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _a.sent();
                console.error('[GOOGLE-WORKSPACE] Erreur POST config:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la sauvegarde de la configuration'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// GET /api/organizations/:id/google-workspace/auth-url - Générer l'URL d'authentification
router.get('/:id/google-workspace/auth-url', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, requestingUser, config, missingFields, scopes, authUrl, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[GOOGLE-WORKSPACE] GET /organizations/:id/google-workspace/auth-url');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                id = req.params.id;
                requestingUser = req.user;
                // Vérification des permissions
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin' && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId) !== id) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cette organisation'
                        })];
                }
                return [4 /*yield*/, prisma.googleWorkspaceConfig.findUnique({
                        where: { organizationId: id }
                    })];
            case 2:
                config = _a.sent();
                if (!config) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Configuration Google Workspace non trouvée. Veuillez d\'abord configurer les credentials.'
                        })];
                }
                missingFields = [];
                if (!config.clientId)
                    missingFields.push('Client ID');
                if (!config.clientSecret)
                    missingFields.push('Client Secret');
                if (!config.domain)
                    missingFields.push('Domaine');
                if (!config.adminEmail)
                    missingFields.push('Email Admin');
                if (missingFields.length > 0) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: "Configuration incompl\u00E8te. Champs manquants : ".concat(missingFields.join(', '))
                        })];
                }
                if (!config.enabled) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Configuration Google Workspace désactivée'
                        })];
                }
                scopes = [
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ];
                // Ajouter les scopes selon les modules activés
                if (config.gmailEnabled) {
                    scopes.push('https://mail.google.com/'); // SCOPE COMPLET pour suppression définitive
                    scopes.push('https://www.googleapis.com/auth/gmail.readonly');
                    scopes.push('https://www.googleapis.com/auth/gmail.send');
                    scopes.push('https://www.googleapis.com/auth/gmail.modify');
                }
                if (config.calendarEnabled) {
                    scopes.push('https://www.googleapis.com/auth/calendar');
                    scopes.push('https://www.googleapis.com/auth/calendar.events');
                }
                if (config.driveEnabled) {
                    scopes.push('https://www.googleapis.com/auth/drive');
                }
                // Scopes additionnels pour fonctionnalités complètes
                if (config.docsEnabled) {
                    scopes.push('https://www.googleapis.com/auth/documents');
                }
                if (config.sheetsEnabled) {
                    scopes.push('https://www.googleapis.com/auth/spreadsheets');
                }
                if (config.meetEnabled) {
                    scopes.push('https://www.googleapis.com/auth/meetings');
                }
                // Scopes avancés pour CRM complet
                scopes.push('https://www.googleapis.com/auth/presentations');
                scopes.push('https://www.googleapis.com/auth/contacts');
                scopes.push('https://www.googleapis.com/auth/forms');
                authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=".concat(encodeURIComponent(config.clientId), "&") +
                    "redirect_uri=".concat(encodeURIComponent(config.redirectUri || ''), "&") +
                    "response_type=code&" +
                    "scope=".concat(encodeURIComponent(scopes.join(' ')), "&") +
                    "state=".concat(encodeURIComponent(JSON.stringify({ organizationId: id, userId: requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.id })), "&") +
                    "access_type=offline&" +
                    "prompt=consent";
                res.json({
                    success: true,
                    data: {
                        authUrl: authUrl,
                        scopes: scopes
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error('[GOOGLE-WORKSPACE] Erreur GET auth-url:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la génération de l\'URL d\'authentification'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ===================================
// ROUTES POUR LA GESTION DES UTILISATEURS GOOGLE WORKSPACE
// ===================================
// GET /api/google-workspace/users/:userId/status - Récupérer le statut Google Workspace d'un utilisateur
router.get('/users/:userId/status', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, requestingUser, targetUser, userOrg, googleConfig, googleUserStatus, normalizeString_1, generateEmail, suggestedEmail, status_1, error_4;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                console.log('[GOOGLE-WORKSPACE] GET /users/:userId/status');
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                userId = req.params.userId;
                requestingUser = req.user;
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: userId },
                        include: {
                            UserOrganization: {
                                include: {
                                    Organization: {
                                        include: {
                                            GoogleWorkspaceConfig: true
                                        }
                                    }
                                }
                            }
                        }
                    })];
            case 2:
                targetUser = _d.sent();
                if (!targetUser) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Utilisateur non trouvé'
                        })];
                }
                userOrg = (_a = targetUser.UserOrganization) === null || _a === void 0 ? void 0 : _a[0];
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin' && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId) !== (userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId)) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cet utilisateur'
                        })];
                }
                googleConfig = (_b = userOrg === null || userOrg === void 0 ? void 0 : userOrg.Organization) === null || _b === void 0 ? void 0 : _b.GoogleWorkspaceConfig;
                return [4 /*yield*/, prisma.googleWorkspaceUser.findUnique({
                        where: { userId: userId }
                    })];
            case 3:
                googleUserStatus = _d.sent();
                normalizeString_1 = function (str) {
                    return str
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
                        .replace(/[^a-zA-Z0-9]/g, '') // Supprimer caractères spéciaux
                        .trim();
                };
                generateEmail = function (firstName, lastName, domain) {
                    var normalizedFirstName = normalizeString_1(firstName);
                    var normalizedLastName = normalizeString_1(lastName);
                    return "".concat(normalizedFirstName, ".").concat(normalizedLastName, "@").concat(domain);
                };
                suggestedEmail = '';
                if (googleConfig === null || googleConfig === void 0 ? void 0 : googleConfig.domain) {
                    suggestedEmail = generateEmail(targetUser.firstName, targetUser.lastName, googleConfig.domain);
                }
                status_1 = {
                    hasGoogleAccount: !!googleUserStatus,
                    email: (googleUserStatus === null || googleUserStatus === void 0 ? void 0 : googleUserStatus.email) || suggestedEmail,
                    isActivated: (googleUserStatus === null || googleUserStatus === void 0 ? void 0 : googleUserStatus.isActive) || false,
                    organizationDomain: (googleConfig === null || googleConfig === void 0 ? void 0 : googleConfig.domain) || null,
                    lastSync: ((_c = googleUserStatus === null || googleUserStatus === void 0 ? void 0 : googleUserStatus.lastSync) === null || _c === void 0 ? void 0 : _c.toISOString()) || null,
                    services: {
                        gmail: (googleUserStatus === null || googleUserStatus === void 0 ? void 0 : googleUserStatus.gmailEnabled) || false,
                        calendar: (googleUserStatus === null || googleUserStatus === void 0 ? void 0 : googleUserStatus.calendarEnabled) || false,
                        drive: (googleUserStatus === null || googleUserStatus === void 0 ? void 0 : googleUserStatus.driveEnabled) || false,
                        meet: (googleUserStatus === null || googleUserStatus === void 0 ? void 0 : googleUserStatus.meetEnabled) || false,
                    }
                };
                res.json({
                    success: true,
                    data: status_1
                });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _d.sent();
                console.error('[GOOGLE-WORKSPACE] Erreur GET status:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération du statut'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// POST /api/google-workspace/users/create - Créer un compte Google Workspace pour un utilisateur
router.post('/users/create', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, email, _b, activateServices, requestingUser, targetUser, userOrg, googleConfig, existingGoogleUser, updatedGoogleUser, newGoogleUser, error_5;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                console.log('[GOOGLE-WORKSPACE] POST /users/create');
                _e.label = 1;
            case 1:
                _e.trys.push([1, 8, , 9]);
                _a = req.body, userId = _a.userId, email = _a.email, _b = _a.activateServices, activateServices = _b === void 0 ? true : _b;
                requestingUser = req.user;
                // Validation basique
                if (!userId || !email) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'userId et email sont requis'
                        })];
                }
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: userId },
                        include: {
                            UserOrganization: {
                                include: {
                                    Organization: {
                                        include: {
                                            GoogleWorkspaceConfig: true
                                        }
                                    }
                                }
                            }
                        }
                    })];
            case 2:
                targetUser = _e.sent();
                if (!targetUser) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Utilisateur non trouvé'
                        })];
                }
                userOrg = (_c = targetUser.UserOrganization) === null || _c === void 0 ? void 0 : _c[0];
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin' && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId) !== (userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId)) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cet utilisateur'
                        })];
                }
                googleConfig = (_d = userOrg === null || userOrg === void 0 ? void 0 : userOrg.Organization) === null || _d === void 0 ? void 0 : _d.GoogleWorkspaceConfig;
                if (!googleConfig || !googleConfig.isActive) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Google Workspace n\'est pas configuré pour cette organisation'
                        })];
                }
                return [4 /*yield*/, prisma.googleWorkspaceUser.findUnique({
                        where: { userId: userId }
                    })];
            case 3:
                existingGoogleUser = _e.sent();
                if (!existingGoogleUser) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.googleWorkspaceUser.update({
                        where: { userId: userId },
                        data: {
                            email: email,
                            isActive: activateServices,
                            gmailEnabled: activateServices && googleConfig.gmailEnabled,
                            calendarEnabled: activateServices && googleConfig.calendarEnabled,
                            driveEnabled: activateServices && googleConfig.driveEnabled,
                            meetEnabled: activateServices && googleConfig.meetEnabled,
                            lastSync: new Date()
                        }
                    })];
            case 4:
                updatedGoogleUser = _e.sent();
                res.json({
                    success: true,
                    message: 'Compte Google Workspace mis à jour avec succès',
                    data: updatedGoogleUser
                });
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, prisma.googleWorkspaceUser.create({
                    data: {
                        userId: userId,
                        email: email,
                        isActive: activateServices,
                        gmailEnabled: activateServices && googleConfig.gmailEnabled,
                        calendarEnabled: activateServices && googleConfig.calendarEnabled,
                        driveEnabled: activateServices && googleConfig.driveEnabled,
                        meetEnabled: activateServices && googleConfig.meetEnabled,
                        lastSync: new Date()
                    }
                })];
            case 6:
                newGoogleUser = _e.sent();
                res.json({
                    success: true,
                    message: 'Compte Google Workspace créé avec succès',
                    data: newGoogleUser
                });
                _e.label = 7;
            case 7: return [3 /*break*/, 9];
            case 8:
                error_5 = _e.sent();
                console.error('[GOOGLE-WORKSPACE] Erreur POST create:', error_5);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la création du compte'
                });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// POST /api/google-workspace/users/:userId/sync - Synchroniser un utilisateur avec Google Workspace
router.post('/users/:userId/sync', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, requestingUser, googleUser, userOrg, updatedGoogleUser, error_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('[GOOGLE-WORKSPACE] POST /users/:userId/sync');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                userId = req.params.userId;
                requestingUser = req.user;
                return [4 /*yield*/, prisma.googleWorkspaceUser.findUnique({
                        where: { userId: userId },
                        include: {
                            User: {
                                include: {
                                    UserOrganization: true
                                }
                            }
                        }
                    })];
            case 2:
                googleUser = _b.sent();
                if (!googleUser) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Compte Google Workspace non trouvé pour cet utilisateur'
                        })];
                }
                userOrg = (_a = googleUser.User.UserOrganization) === null || _a === void 0 ? void 0 : _a[0];
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin' && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId) !== (userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId)) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cet utilisateur'
                        })];
                }
                return [4 /*yield*/, prisma.googleWorkspaceUser.update({
                        where: { userId: userId },
                        data: {
                            lastSync: new Date()
                        }
                    })];
            case 3:
                updatedGoogleUser = _b.sent();
                res.json({
                    success: true,
                    message: 'Synchronisation réussie',
                    data: updatedGoogleUser
                });
                return [3 /*break*/, 5];
            case 4:
                error_6 = _b.sent();
                console.error('[GOOGLE-WORKSPACE] Erreur POST sync:', error_6);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la synchronisation'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// POST /api/google-workspace/users/:userId/deactivate - Désactiver un utilisateur Google Workspace
router.post('/users/:userId/deactivate', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, requestingUser, googleUser, userOrg, updatedGoogleUser, error_7;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('[GOOGLE-WORKSPACE] POST /users/:userId/deactivate');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                userId = req.params.userId;
                requestingUser = req.user;
                return [4 /*yield*/, prisma.googleWorkspaceUser.findUnique({
                        where: { userId: userId },
                        include: {
                            User: {
                                include: {
                                    UserOrganization: true
                                }
                            }
                        }
                    })];
            case 2:
                googleUser = _b.sent();
                if (!googleUser) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Compte Google Workspace non trouvé pour cet utilisateur'
                        })];
                }
                userOrg = (_a = googleUser.User.UserOrganization) === null || _a === void 0 ? void 0 : _a[0];
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin' && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId) !== (userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId)) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cet utilisateur'
                        })];
                }
                return [4 /*yield*/, prisma.googleWorkspaceUser.update({
                        where: { userId: userId },
                        data: {
                            isActive: false,
                            gmailEnabled: false,
                            calendarEnabled: false,
                            driveEnabled: false,
                            meetEnabled: false,
                            lastSync: new Date()
                        }
                    })];
            case 3:
                updatedGoogleUser = _b.sent();
                res.json({
                    success: true,
                    message: 'Compte Google Workspace désactivé avec succès',
                    data: updatedGoogleUser
                });
                return [3 /*break*/, 5];
            case 4:
                error_7 = _b.sent();
                console.error('[GOOGLE-WORKSPACE] Erreur POST deactivate:', error_7);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la désactivation'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

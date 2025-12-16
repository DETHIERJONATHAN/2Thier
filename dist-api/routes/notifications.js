"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
var client_1 = require("@prisma/client");
var auth_1 = require("../middlewares/auth");
var UniversalNotificationService_js_1 = __importDefault(require("../services/UniversalNotificationService.js"));
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
// Middleware to protect routes
router.use(auth_1.authMiddleware);
/**
 * @route GET /api/notifications
 * @description Fetch pending notifications for the current user.
 * It fetches notifications for the organizations the user belongs to,
 * or notifications directly assigned to the user.
 */
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, userId, notifications_1, userOrganizations, orgIds, notifications, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                user = req.user;
                if (!user || !user.userId) {
                    // authMiddleware should prevent this, but as a safeguard:
                    res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
                    return [2 /*return*/];
                }
                userId = user.userId;
                if (!(user.role === 'super_admin')) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.notification.findMany({
                        where: {
                            status: 'PENDING',
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        include: {
                            Organization: true // Include organization details for context
                        }
                    })];
            case 1:
                notifications_1 = _a.sent();
                res.json({ success: true, data: notifications_1 });
                return [2 /*return*/];
            case 2: return [4 /*yield*/, prisma.userOrganization.findMany({
                    where: { userId: userId },
                    select: { organizationId: true }
                })];
            case 3:
                userOrganizations = _a.sent();
                orgIds = userOrganizations.map(function (uo) { return uo.organizationId; });
                return [4 /*yield*/, prisma.notification.findMany({
                        where: {
                            OR: [
                                { organizationId: { in: orgIds } },
                                { userId: userId }
                            ],
                            status: 'PENDING',
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        include: {
                            Organization: true // Include organization details for context
                        }
                    })];
            case 4:
                notifications = _a.sent();
                res.json({ success: true, data: notifications });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error('Échec de la récupération des notifications:', error_1);
                res.status(500).json({ success: false, message: 'Échec de la récupération des notifications' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/notifications
 * @description Create a new notification for the current user.
 */
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, userId, _a, type, data, organizationId, targetOrgId, userOrg, notification, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                user = req.user;
                if (!user || !user.userId) {
                    res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
                    return [2 /*return*/];
                }
                userId = user.userId;
                _a = req.body, type = _a.type, data = _a.data, organizationId = _a.organizationId;
                if (!type || !data) {
                    res.status(400).json({ success: false, message: 'Type et data sont requis' });
                    return [2 /*return*/];
                }
                targetOrgId = organizationId;
                if (!!targetOrgId) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.userOrganization.findFirst({
                        where: { userId: userId },
                        select: { organizationId: true }
                    })];
            case 1:
                userOrg = _b.sent();
                targetOrgId = userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId;
                _b.label = 2;
            case 2: return [4 /*yield*/, prisma.notification.create({
                    data: {
                        type: type,
                        data: data,
                        userId: userId,
                        organizationId: targetOrgId,
                        status: 'PENDING'
                    },
                    include: {
                        Organization: true
                    }
                })];
            case 3:
                notification = _b.sent();
                res.status(201).json({ success: true, data: notification });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _b.sent();
                console.error('Échec de la création de la notification:', error_2);
                res.status(500).json({ success: false, message: 'Échec de la création de la notification' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * @route PATCH /api/notifications/:id/read
 * @description Mark a specific notification as read.
 */
router.patch('/:id/read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var notificationId, user, userId, notification, userOrganizations, orgIds, canAccess, updatedNotification, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                notificationId = req.params.id;
                user = req.user;
                if (!user || !user.userId) {
                    res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
                    return [2 /*return*/];
                }
                userId = user.userId;
                return [4 /*yield*/, prisma.notification.findUnique({
                        where: { id: notificationId },
                    })];
            case 1:
                notification = _a.sent();
                if (!notification) {
                    res.status(404).json({ success: false, message: 'Notification non trouvée' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.userOrganization.findMany({
                        where: { userId: userId },
                        select: { organizationId: true }
                    })];
            case 2:
                userOrganizations = _a.sent();
                orgIds = userOrganizations.map(function (uo) { return uo.organizationId; });
                canAccess = notification.userId === userId ||
                    (notification.organizationId && orgIds.includes(notification.organizationId));
                if (!canAccess) {
                    res.status(403).json({ success: false, message: 'Interdit: Vous n\'avez pas accès à cette notification.' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.notification.update({
                        where: { id: notificationId },
                        data: { status: 'READ' },
                    })];
            case 3:
                updatedNotification = _a.sent();
                res.json({ success: true, data: updatedNotification });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _a.sent();
                console.error('Échec de la mise à jour de la notification:', error_3);
                res.status(500).json({ success: false, message: 'Échec de la mise à jour de la notification' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * @route DELETE /api/notifications/:id
 * @description Delete a specific notification.
 */
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var notificationId, user, userId, notification, userOrganizations, orgIds, canAccess, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                notificationId = req.params.id;
                user = req.user;
                if (!user || !user.userId) {
                    res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
                    return [2 /*return*/];
                }
                userId = user.userId;
                return [4 /*yield*/, prisma.notification.findUnique({
                        where: { id: notificationId },
                    })];
            case 1:
                notification = _a.sent();
                if (!notification) {
                    res.status(404).json({ success: false, message: 'Notification non trouvée' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.userOrganization.findMany({
                        where: { userId: userId },
                        select: { organizationId: true }
                    })];
            case 2:
                userOrganizations = _a.sent();
                orgIds = userOrganizations.map(function (uo) { return uo.organizationId; });
                canAccess = notification.userId === userId ||
                    (notification.organizationId && orgIds.includes(notification.organizationId));
                if (!canAccess) {
                    res.status(403).json({ success: false, message: 'Interdit: Vous n\'avez pas accès à cette notification.' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.notification.delete({
                        where: { id: notificationId },
                    })];
            case 3:
                _a.sent();
                res.json({ success: true, message: 'Notification supprimée avec succès.' });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _a.sent();
                console.error('Échec de la suppression de la notification:', error_4);
                res.status(500).json({ success: false, message: 'Échec de la suppression de la notification' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/notifications/check-emails
 * @description Déclencher manuellement une vérification des nouveaux emails pour l'utilisateur actuel
 */
router.post('/check-emails', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, autoMailSync, syncError_1, notificationService, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                user = req.user;
                if (!user || !user.userId) {
                    res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
                    return [2 /*return*/];
                }
                console.log("\uD83D\uDD14 [API] V\u00E9rification manuelle des emails pour l'utilisateur ".concat(user.userId));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../services/AutoMailSyncService.js')); })];
            case 2:
                autoMailSync = (_a.sent()).autoMailSync;
                // Déclencher la synchronisation pour l'utilisateur actuel
                console.log('🔥 [API] Déclenchement sync manuelle immédiate...');
                return [4 /*yield*/, autoMailSync.syncForUser(user.userId)];
            case 3:
                _a.sent();
                console.log('✅ [API] Synchronisation manuelle terminée avec succès');
                return [3 /*break*/, 5];
            case 4:
                syncError_1 = _a.sent();
                console.error('❌ [API] Erreur sync manuelle:', syncError_1);
                return [3 /*break*/, 5];
            case 5:
                notificationService = UniversalNotificationService_js_1.default.getInstance();
                // Déclencher une vérification manuelle de tous les types d'événements
                console.log('🌟 [API] Vérification manuelle de TOUS les types d\'événements...');
                // Émettre un événement pour déclencher les vérifications
                notificationService.emit('manual-check-requested', { userId: user.userId });
                res.json({
                    success: true,
                    message: 'Vérification des nouveaux emails effectuée avec succès.'
                });
                return [3 /*break*/, 7];
            case 6:
                error_5 = _a.sent();
                console.error('Échec de la vérification des emails:', error_5);
                res.status(500).json({ success: false, message: 'Échec de la vérification des emails' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/notifications/check-emails-all
 * @description Déclencher manuellement une vérification des nouveaux emails pour tous les utilisateurs (Admin uniquement)
 */
router.post('/check-emails-all', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, notificationService, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                user = req.user;
                if (!user || !user.userId) {
                    res.status(401).json({ success: false, message: 'Utilisateur non authentifié.' });
                    return [2 /*return*/];
                }
                // Vérifier les permissions (admin ou super_admin seulement)
                if (user.role !== 'admin' && user.role !== 'super_admin') {
                    res.status(403).json({ success: false, message: 'Permissions insuffisantes. Admin requis.' });
                    return [2 /*return*/];
                }
                console.log("\uD83D\uDD14 [API] V\u00E9rification manuelle globale des emails par ".concat(user.role, " ").concat(user.userId));
                notificationService = RealTimeEmailNotificationService.getInstance();
                return [4 /*yield*/, notificationService.performBackupCheck()];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: 'Vérification des nouveaux emails effectuée pour tous les utilisateurs.'
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('Échec de la vérification globale des emails:', error_6);
                res.status(500).json({ success: false, message: 'Échec de la vérification globale des emails' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

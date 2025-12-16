"use strict";
/**
 * 🔧 ROUTES API DE DIAGNOSTIC DU SYSTÈME DE NOTIFICATIONS
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var notificationSystemInit_js_1 = require("../services/notificationSystemInit.js");
var UniversalNotificationService_js_1 = __importDefault(require("../services/UniversalNotificationService.js"));
var router = (0, express_1.Router)();
// Authentification requise pour toutes les routes
router.use(auth_js_1.authMiddleware);
/**
 * GET /api/notifications-system/status
 * Obtenir le statut du système de notifications
 */
router.get('/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status_1;
    return __generator(this, function (_a) {
        try {
            status_1 = (0, notificationSystemInit_js_1.getNotificationSystemStatus)();
            res.json({
                success: true,
                data: status_1,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('❌ [NotificationSystemAPI] Erreur statut:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du statut'
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * POST /api/notifications-system/test-email
 * Créer une notification email de test (Admin seulement)
 */
router.post('/test-email', (0, auth_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, organizationId, universalService, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.user, userId = _a.userId, organizationId = _a.organizationId;
                universalService = UniversalNotificationService_js_1.default.getInstance();
                return [4 /*yield*/, universalService.notifyNewEmail({
                        emailId: 'test-' + Date.now(),
                        from: 'system@2thier.be',
                        subject: 'Test de notification - ' + new Date().toLocaleTimeString('fr-FR'),
                        userId: userId,
                        organizationId: organizationId
                    })];
            case 1:
                _b.sent();
                res.json({
                    success: true,
                    message: 'Notification email de test créée avec succès'
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('❌ [NotificationSystemAPI] Erreur test email:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de la notification test'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/notifications-system/test-lead
 * Créer une notification lead de test (Admin seulement)
 */
router.post('/test-lead', (0, auth_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, organizationId, universalService, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.user, userId = _a.userId, organizationId = _a.organizationId;
                universalService = UniversalNotificationService_js_1.default.getInstance();
                return [4 /*yield*/, universalService.notifyNewLead({
                        leadId: 'test-lead-' + Date.now(),
                        name: 'Lead de Test',
                        email: 'test@example.com',
                        phone: '+32 123 456 789',
                        source: 'Test API',
                        userId: userId,
                        organizationId: organizationId
                    })];
            case 1:
                _b.sent();
                res.json({
                    success: true,
                    message: 'Notification lead de test créée avec succès'
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error('❌ [NotificationSystemAPI] Erreur test lead:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de la notification test'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/notifications-system/test-call
 * Créer une notification appel manqué de test (Admin seulement)
 */
router.post('/test-call', (0, auth_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, organizationId, universalService, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.user, userId = _a.userId, organizationId = _a.organizationId;
                universalService = UniversalNotificationService_js_1.default.getInstance();
                return [4 /*yield*/, universalService.notifyMissedCall({
                        from: '+32 123 456 789',
                        duration: 0,
                        userId: userId,
                        organizationId: organizationId
                    })];
            case 1:
                _b.sent();
                res.json({
                    success: true,
                    message: 'Notification appel manqué de test créée avec succès'
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('❌ [NotificationSystemAPI] Erreur test appel:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la création de la notification test'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/notifications-system/stats/:organizationId
 * Obtenir les statistiques des notifications (Admin seulement)
 */
router.get('/stats/:organizationId', (0, auth_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, universalService, stats, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.params.organizationId;
                universalService = UniversalNotificationService_js_1.default.getInstance();
                return [4 /*yield*/, universalService.getStats(organizationId)];
            case 1:
                stats = _a.sent();
                res.json({
                    success: true,
                    data: stats,
                    organizationId: organizationId
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('❌ [NotificationSystemAPI] Erreur stats:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des statistiques'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/notifications-system/restart
 * Redémarrer le système de notifications (Super Admin seulement)
 */
router.post('/restart', (0, auth_js_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var system, error_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                console.log("\uD83D\uDD04 [NotificationSystemAPI] Red\u00E9marrage demand\u00E9 par ".concat((_a = req.user) === null || _a === void 0 ? void 0 : _a.email));
                system = (0, notificationSystemInit_js_1.getNotificationSystemInstance)();
                if (!system) return [3 /*break*/, 3];
                return [4 /*yield*/, system.stop()];
            case 1:
                _b.sent();
                return [4 /*yield*/, system.start()];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                res.json({
                    success: true,
                    message: 'Système de notifications redémarré avec succès'
                });
                return [3 /*break*/, 5];
            case 4:
                error_5 = _b.sent();
                console.error('❌ [NotificationSystemAPI] Erreur redémarrage:', error_5);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du redémarrage du système'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

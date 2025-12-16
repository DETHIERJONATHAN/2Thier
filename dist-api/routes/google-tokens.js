"use strict";
/**
 * ROUTES SPÉCIFIQUES POUR LE MONITORING DES TOKENS GOOGLE
 *
 * Ces routes sont utilisées par le composant GoogleTokenMonitor pour :
 * - Obtenir le statut détaillé du scheduler
 * - Obtenir les informations d'un token spécifique
 * - Contrôler le scheduler (start/stop)
 * - Obtenir l'historique des refresh
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
var express_1 = require("express");
var GoogleTokenRefreshScheduler_1 = require("../services/GoogleTokenRefreshScheduler");
var prisma_1 = require("../lib/prisma");
var requireRole_1 = require("../middlewares/requireRole");
var auth_js_1 = require("../middlewares/auth.js");
var router = (0, express_1.Router)();
// Auth obligatoire puis contrôle de rôle (évite 403 quand req.user est vide)
router.use(auth_js_1.authMiddleware);
// Middleware : Seuls les admins ou super_admin peuvent accéder à ces routes
router.use((0, requireRole_1.requireRole)(['admin', 'super_admin']));
/**
 * GET /api/google-tokens/scheduler/status
 * Statut détaillé du scheduler pour le monitoring
 */
router.get('/scheduler/status', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status_1, totalTokens, activeTokens, recentErrors, schedulerStatus, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                status_1 = GoogleTokenRefreshScheduler_1.googleTokenScheduler.getStatus();
                return [4 /*yield*/, prisma_1.prisma.googleToken.count()];
            case 1:
                totalTokens = _a.sent();
                return [4 /*yield*/, prisma_1.prisma.googleToken.count({
                        where: {
                            expiresAt: {
                                gt: new Date()
                            }
                        }
                    })];
            case 2:
                activeTokens = _a.sent();
                recentErrors = [];
                schedulerStatus = {
                    isRunning: status_1.isRunning,
                    nextRefresh: status_1.isRunning ? new Date(Date.now() + 50 * 60 * 1000).toISOString() : null, // 50 min dans le futur
                    lastRefresh: null, // À implémenter si nécessaire
                    refreshCount: 0, // À implémenter si nécessaire
                    totalUsers: totalTokens,
                    activeTokens: activeTokens,
                    errors: recentErrors
                };
                res.json({
                    success: true,
                    data: schedulerStatus
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('[GoogleTokensAPI] Erreur status:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération du statut',
                    error: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/google-tokens/organization/:organizationId
 * Informations détaillées sur le token d'une organisation
 */
router.get('/organization/:organizationId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, token, now, expiresAt, isExpired, timeUntilExpiry, diff, minutes, seconds, tokenInfo, error_2;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                organizationId = req.params.organizationId;
                return [4 /*yield*/, prisma_1.prisma.googleToken.findUnique({
                        where: { organizationId: organizationId }
                    })];
            case 1:
                token = _c.sent();
                if (!token) {
                    return [2 /*return*/, res.json({
                            success: false,
                            message: 'Aucun token trouvé pour cette organisation'
                        })];
                }
                now = new Date();
                expiresAt = token.expiresAt;
                isExpired = expiresAt ? expiresAt <= now : true;
                timeUntilExpiry = 'N/A';
                if (expiresAt && !isExpired) {
                    diff = expiresAt.getTime() - now.getTime();
                    minutes = Math.floor(diff / 1000 / 60);
                    seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    timeUntilExpiry = "".concat(minutes, "m ").concat(seconds, "s");
                }
                else if (isExpired) {
                    timeUntilExpiry = 'Expiré';
                }
                tokenInfo = {
                    id: token.id,
                    organizationId: token.organizationId,
                    accessToken: token.accessToken ? "".concat(token.accessToken.substring(0, 20), "...") : '', // Masquer le token
                    refreshToken: token.refreshToken ? 'Présent' : 'Absent',
                    tokenType: token.tokenType || 'Bearer',
                    expiresIn: 3600, // Les tokens Google durent 1 heure
                    scope: token.scope || '',
                    createdAt: ((_a = token.createdAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || '',
                    updatedAt: ((_b = token.updatedAt) === null || _b === void 0 ? void 0 : _b.toISOString()) || '',
                    expiresAt: (expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toISOString()) || '',
                    isExpired: isExpired,
                    timeUntilExpiry: timeUntilExpiry
                };
                res.json({
                    success: true,
                    data: tokenInfo
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _c.sent();
                console.error('[GoogleTokensAPI] Erreur organization token:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération du token',
                    error: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/google-tokens/scheduler/start
 * Démarre le scheduler
 */
router.post('/scheduler/start', function (_req, res) {
    try {
        GoogleTokenRefreshScheduler_1.googleTokenScheduler.start();
        res.json({
            success: true,
            message: 'Scheduler démarré avec succès'
        });
    }
    catch (error) {
        console.error('[GoogleTokensAPI] Erreur start scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du démarrage du scheduler',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
/**
 * POST /api/google-tokens/scheduler/stop
 * Arrête le scheduler
 */
router.post('/scheduler/stop', function (_req, res) {
    try {
        GoogleTokenRefreshScheduler_1.googleTokenScheduler.stop();
        res.json({
            success: true,
            message: 'Scheduler arrêté avec succès'
        });
    }
    catch (error) {
        console.error('[GoogleTokensAPI] Erreur stop scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'arrêt du scheduler',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
/**
 * POST /api/google-tokens/scheduler/refresh-now
 * Force un refresh immédiat de tous les tokens
 */
router.post('/scheduler/refresh-now', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, GoogleTokenRefreshScheduler_1.googleTokenScheduler.forceRefreshAll()];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: 'Refresh immédiat lancé avec succès'
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('[GoogleTokensAPI] Erreur refresh now:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du refresh immédiat',
                    error: error_3 instanceof Error ? error_3.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/google-tokens/refresh-history/:organizationId
 * Historique des refresh pour une organisation
 */
router.get('/refresh-history/:organizationId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, history_1, formattedHistory, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.params.organizationId;
                return [4 /*yield*/, prisma_1.prisma.googleTokenRefreshHistory.findMany({
                        where: {
                            organizationId: organizationId
                        },
                        orderBy: {
                            refreshedAt: 'desc'
                        },
                        take: 50 // Limiter aux 50 derniers
                    })];
            case 1:
                history_1 = _a.sent();
                formattedHistory = history_1.map(function (entry) {
                    var _a, _b;
                    return ({
                        id: entry.id,
                        timestamp: entry.refreshedAt.toISOString(),
                        success: entry.success,
                        message: entry.message,
                        errorDetails: entry.errorDetails,
                        oldExpiresAt: (_a = entry.oldExpiresAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
                        newExpiresAt: (_b = entry.newExpiresAt) === null || _b === void 0 ? void 0 : _b.toISOString()
                    });
                });
                res.json({
                    success: true,
                    data: formattedHistory
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('[GoogleTokensAPI] Erreur refresh history:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération de l\'historique',
                    error: error_4 instanceof Error ? error_4.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

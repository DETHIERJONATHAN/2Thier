"use strict";
/**
 * ROUTES POUR LA GESTION DU SCHEDULER DE REFRESH DES TOKENS GOOGLE
 *
 * Permet de :
 * - Vérifier l'état du scheduler
 * - Forcer un refresh de tous les tokens
 * - Refresh un token spécifique
 * - Redémarrer le scheduler
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
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var router = (0, express_1.Router)();
// Sécuriser toutes les routes du scheduler: nécessite authentification + rôle admin/super_admin
router.use(auth_js_1.authMiddleware);
router.use((0, requireRole_js_1.requireRole)(['admin', 'super_admin']));
/**
 * GET /api/google/scheduler/status
 * Obtient l'état du scheduler de refresh automatique
 */
router.get('/status', function (_req, res) {
    try {
        var status_1 = GoogleTokenRefreshScheduler_1.googleTokenScheduler.getStatus();
        res.json({
            success: true,
            scheduler: {
                isRunning: status_1.isRunning,
                checkIntervalMinutes: status_1.checkIntervalMinutes,
                refreshMarginMinutes: status_1.refreshMarginMinutes,
                description: status_1.isRunning
                    ? "Scheduler actif - v\u00E9rifications toutes les ".concat(status_1.checkIntervalMinutes, " min, refresh ").concat(status_1.refreshMarginMinutes, " min avant expiration")
                    : 'Scheduler arrêté'
            },
            message: status_1.isRunning
                ? '✅ Le scheduler de refresh automatique est actif'
                : '⚠️ Le scheduler de refresh automatique est arrêté'
        });
    }
    catch (error) {
        console.error('[GoogleSchedulerAPI] Erreur status:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du statut',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
/**
 * POST /api/google/scheduler/refresh-all
 * Force un refresh immédiat de tous les tokens
 */
router.post('/refresh-all', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('[GoogleSchedulerAPI] 🔧 Refresh forcé demandé pour tous les tokens');
                return [4 /*yield*/, GoogleTokenRefreshScheduler_1.googleTokenScheduler.forceRefreshAll()];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: '✅ Refresh forcé de tous les tokens terminé - vérifiez les logs serveur pour les détails'
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('[GoogleSchedulerAPI] Erreur refresh-all:', error_1);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors du refresh forcé',
                    details: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/google/scheduler/refresh/:organizationId
 * Force un refresh d'un token spécifique
 */
router.post('/refresh/:organizationId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.params.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'ID d\'organisation requis'
                        })];
                }
                console.log("[GoogleSchedulerAPI] \uD83D\uDD27 Refresh forc\u00E9 demand\u00E9 pour organisation: ".concat(organizationId));
                return [4 /*yield*/, GoogleTokenRefreshScheduler_1.googleTokenScheduler.refreshTokenForOrganization(organizationId)];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: "\u2705 Refresh forc\u00E9 pour l'organisation ".concat(organizationId, " termin\u00E9 - v\u00E9rifiez les logs serveur pour les d\u00E9tails")
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[GoogleSchedulerAPI] Erreur refresh specific:', error_2);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors du refresh spécifique',
                    details: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/google/scheduler/restart
 * Redémarre le scheduler
 */
router.post('/restart', function (_req, res) {
    try {
        console.log('[GoogleSchedulerAPI] 🔄 Redémarrage du scheduler demandé');
        GoogleTokenRefreshScheduler_1.googleTokenScheduler.stop();
        GoogleTokenRefreshScheduler_1.googleTokenScheduler.start();
        res.json({
            success: true,
            message: '✅ Scheduler redémarré avec succès'
        });
    }
    catch (error) {
        console.error('[GoogleSchedulerAPI] Erreur restart:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du redémarrage du scheduler',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
/**
 * GET /api/google/scheduler/tokens-info
 * Obtient des informations sur tous les tokens Google en base
 */
router.get('/tokens-info', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tokens, now_1, tokensInfo, summary, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.prisma.googleToken.findMany({
                        include: {
                            organization: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    })];
            case 1:
                tokens = _a.sent();
                now_1 = new Date();
                tokensInfo = tokens.map(function (token) {
                    var _a, _b;
                    var expiresAt = token.expiresAt;
                    var status = 'unknown';
                    var minutesToExpiry = null;
                    if (expiresAt) {
                        var timeToExpiry = expiresAt.getTime() - now_1.getTime();
                        minutesToExpiry = Math.round(timeToExpiry / 1000 / 60);
                        if (expiresAt <= now_1) {
                            status = 'expired';
                        }
                        else if (minutesToExpiry <= 10) {
                            status = 'expiring_soon';
                        }
                        else {
                            status = 'valid';
                        }
                    }
                    return {
                        organizationId: token.organizationId,
                        organizationName: ((_a = token.organization) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                        status: status,
                        expiresAt: expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toISOString(),
                        minutesToExpiry: minutesToExpiry,
                        hasRefreshToken: !!token.refreshToken,
                        lastUpdated: (_b = token.updatedAt) === null || _b === void 0 ? void 0 : _b.toISOString()
                    };
                });
                summary = {
                    total: tokens.length,
                    valid: tokensInfo.filter(function (t) { return t.status === 'valid'; }).length,
                    expiring_soon: tokensInfo.filter(function (t) { return t.status === 'expiring_soon'; }).length,
                    expired: tokensInfo.filter(function (t) { return t.status === 'expired'; }).length,
                    unknown: tokensInfo.filter(function (t) { return t.status === 'unknown'; }).length
                };
                res.json({
                    success: true,
                    summary: summary,
                    tokens: tokensInfo
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('[GoogleSchedulerAPI] Erreur tokens-info:', error_3);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des informations tokens',
                    details: error_3 instanceof Error ? error_3.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

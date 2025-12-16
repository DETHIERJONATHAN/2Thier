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
// 🎯 DEVIS1MINUTE - Routes Marketplace (VERSION CORRIGÉE)
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var client_1 = require("@prisma/client");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🔒 RATE LIMITING
var marketplaceRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requêtes par minute
    message: { success: false, message: 'Trop de requêtes marketplace' }
});
router.use(auth_js_1.authMiddleware);
router.use(marketplaceRateLimit);
// 📊 GET /api/marketplace/leads - Leads marketplace disponibles
router.get('/leads', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, _b, status_1, minPrice, maxPrice, targetSectors, targetRegions, _c, limit, _d, offset, availableOnly, where, leads, total, transformedLeads, error_1;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 3, , 4]);
                organizationId = (_e = req.user) === null || _e === void 0 ? void 0 : _e.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                _a = req.query, _b = _a.status, status_1 = _b === void 0 ? 'AVAILABLE' : _b, minPrice = _a.minPrice, maxPrice = _a.maxPrice, targetSectors = _a.targetSectors, targetRegions = _a.targetRegions, _c = _a.limit, limit = _c === void 0 ? 50 : _c, _d = _a.offset, offset = _d === void 0 ? 0 : _d, availableOnly = _a.availableOnly;
                where = {};
                // Filtre par statut (correspond au schéma)
                if (availableOnly === 'true' || status_1) {
                    where.status = status_1;
                }
                // Filtres de prix
                if (minPrice) {
                    where.price = __assign(__assign({}, where.price), { gte: parseFloat(minPrice) });
                }
                if (maxPrice) {
                    where.price = __assign(__assign({}, where.price), { lte: parseFloat(maxPrice) });
                }
                // Filtres géographiques/secteurs (arrays dans le schéma)
                if (targetSectors) {
                    where.targetSectors = { hasSome: [targetSectors] };
                }
                if (targetRegions) {
                    where.targetRegions = { hasSome: [targetRegions] };
                }
                console.log('🔍 [MARKETPLACE] Requête leads avec filtres:', where);
                return [4 /*yield*/, prisma.leadMarketplace.findMany({
                        where: where,
                        include: {
                            Lead: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    phone: true,
                                    company: true,
                                    aiScore: true,
                                    createdAt: true,
                                    organizationId: true,
                                    data: true
                                }
                            },
                            LeadPurchase: {
                                select: {
                                    id: true,
                                    price: true,
                                    purchasedAt: true,
                                    partnerOrganizationId: true
                                }
                            }
                        },
                        orderBy: {
                            publishedAt: 'desc'
                        },
                        take: parseInt(limit),
                        skip: parseInt(offset)
                    })];
            case 1:
                leads = _f.sent();
                return [4 /*yield*/, prisma.leadMarketplace.count({ where: where })];
            case 2:
                total = _f.sent();
                transformedLeads = leads.map(function (marketplace) {
                    var _a, _b;
                    return ({
                        id: marketplace.id,
                        leadId: marketplace.leadId,
                        price: marketplace.price,
                        exclusivePrice: marketplace.exclusivePrice,
                        maxPartners: marketplace.maxPartners,
                        currentPartners: marketplace.currentPartners,
                        status: marketplace.status,
                        targetSectors: marketplace.targetSectors,
                        targetRegions: marketplace.targetRegions,
                        minRating: marketplace.minRating,
                        publishedAt: (_a = marketplace.publishedAt) === null || _a === void 0 ? void 0 : _a.toISOString(),
                        expiresAt: (_b = marketplace.expiresAt) === null || _b === void 0 ? void 0 : _b.toISOString(),
                        aiScore: marketplace.aiScore || 0,
                        urgencyScore: marketplace.urgencyScore,
                        qualityScore: marketplace.qualityScore,
                        aiAnalysis: marketplace.aiAnalysis,
                        createdAt: marketplace.createdAt.toISOString(),
                        updatedAt: marketplace.updatedAt.toISOString(),
                        lead: {
                            id: marketplace.Lead.id,
                            firstName: marketplace.Lead.firstName || '',
                            lastName: marketplace.Lead.lastName || '',
                            email: marketplace.Lead.email || '',
                            phone: marketplace.Lead.phone || '',
                            company: marketplace.Lead.company || ''
                        },
                        purchases: marketplace.LeadPurchase || []
                    });
                });
                console.log("\u2705 [MARKETPLACE] ".concat(transformedLeads.length, " leads trouv\u00E9s"));
                res.json({
                    success: true,
                    data: {
                        leads: transformedLeads,
                        pagination: {
                            total: total,
                            limit: parseInt(limit),
                            offset: parseInt(offset),
                            hasMore: parseInt(offset) + parseInt(limit) < total
                        }
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _f.sent();
                console.error('❌ [MARKETPLACE] Erreur récupération leads:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des leads marketplace',
                    details: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 📊 GET /api/marketplace/stats - Statistiques marketplace
router.get('/stats', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, availableLeads, soldLeads, totalPurchases, myPublishedLeads, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                return [4 /*yield*/, Promise.all([
                        prisma.leadMarketplace.count({
                            where: { status: 'AVAILABLE' }
                        }),
                        prisma.leadMarketplace.count({
                            where: { status: 'PURCHASED' }
                        }),
                        prisma.leadPurchase.count().catch(function () { return 0; }), // En cas d'erreur
                        prisma.leadMarketplace.count({
                            where: {
                                Lead: {
                                    organizationId: organizationId
                                }
                            }
                        })
                    ])];
            case 1:
                _a = _c.sent(), availableLeads = _a[0], soldLeads = _a[1], totalPurchases = _a[2], myPublishedLeads = _a[3];
                res.json({
                    success: true,
                    data: {
                        totalLeads: availableLeads + soldLeads,
                        availableLeads: availableLeads,
                        avgPrice: 0, // TODO: calculer la moyenne des prix
                        newToday: 0, // TODO: compter les leads d'aujourd'hui
                        marketplace: {
                            availableLeads: availableLeads,
                            soldLeads: soldLeads
                        },
                        organization: {
                            totalPurchases: totalPurchases,
                            myPublishedLeads: myPublishedLeads,
                            currentCredits: 0 // TODO: système de crédits si nécessaire
                        }
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _c.sent();
                console.error('❌ [MARKETPLACE] Erreur stats:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des statistiques',
                    details: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🔍 GET /api/marketplace/saved-searches - Recherches sauvegardées
router.get('/saved-searches', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId;
    var _a;
    return __generator(this, function (_b) {
        try {
            organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
            if (!organizationId) {
                return [2 /*return*/, res.status(400).json({
                        success: false,
                        message: 'Organization ID manquant'
                    })];
            }
            // Pour l'instant, retourner un tableau vide (fonctionnalité à implémenter)
            res.json({
                success: true,
                data: []
            });
        }
        catch (error) {
            console.error('❌ [MARKETPLACE] Erreur recherches sauvegardées:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des recherches sauvegardées',
                details: error instanceof Error ? error.message : 'Erreur inconnue'
            });
        }
        return [2 /*return*/];
    });
}); });
// 💰 POST /api/marketplace/purchase/:leadId - Acheter un lead (version simplifiée pour test)
router.post('/purchase/:leadId', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var leadId, organizationId, userId, leadMarketplace, error_3;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                leadId = req.params.leadId;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id);
                if (!organizationId || !userId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID ou User ID manquant'
                        })];
                }
                return [4 /*yield*/, prisma.leadMarketplace.findUnique({
                        where: { leadId: leadId },
                        include: { Lead: true }
                    })];
            case 1:
                leadMarketplace = _d.sent();
                if (!leadMarketplace || leadMarketplace.status !== 'AVAILABLE') {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Lead non disponible'
                        })];
                }
                // Pour l'instant, on simule l'achat (à implémenter complètement plus tard)
                res.json({
                    success: true,
                    message: 'Fonctionnalité d\'achat en cours d\'implémentation',
                    data: {
                        leadId: leadId,
                        price: leadMarketplace.price,
                        status: 'simulation'
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _d.sent();
                console.error('❌ [MARKETPLACE] Erreur achat lead:', error_3);
                res.status(500).json({
                    success: false,
                    message: error_3 instanceof Error ? error_3.message : 'Erreur lors de l\'achat du lead',
                    details: error_3 instanceof Error ? error_3.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

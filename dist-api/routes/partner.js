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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 🎯 DEVIS1MINUTE - Routes Partner Portal
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var client_1 = require("@prisma/client");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🔒 RATE LIMITING
var partnerRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requêtes par minute
    message: { success: false, message: 'Trop de requêtes partner portal' }
});
router.use(auth_js_1.authMiddleware);
router.use(partnerRateLimit);
// 🤝 GET /api/partner/dashboard - Dashboard partenaire
router.get('/dashboard', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, partnerOrg, startOfMonth, _a, totalLeadsGenerated, monthlyLeadsGenerated, totalRevenue, monthlyRevenue, activeCampaigns, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                return [4 /*yield*/, prisma.partnerOrganization.findUnique({
                        where: { organizationId: organizationId },
                        include: {
                            organization: {
                                select: {
                                    name: true,
                                    credits: true
                                }
                            }
                        }
                    })];
            case 1:
                partnerOrg = _c.sent();
                if (!partnerOrg) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès partenaire non autorisé'
                        })];
                }
                startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                return [4 /*yield*/, Promise.all([
                        prisma.lead.count({
                            where: { organizationId: organizationId }
                        }),
                        prisma.lead.count({
                            where: {
                                organizationId: organizationId,
                                createdAt: { gte: startOfMonth }
                            }
                        }),
                        prisma.creditTransaction.aggregate({
                            where: {
                                organizationId: organizationId,
                                type: 'SALE'
                            },
                            _sum: { amount: true }
                        }),
                        prisma.creditTransaction.aggregate({
                            where: {
                                organizationId: organizationId,
                                type: 'SALE',
                                createdAt: { gte: startOfMonth }
                            },
                            _sum: { amount: true }
                        }),
                        prisma.campaign.count({
                            where: {
                                organizationId: organizationId,
                                status: 'ACTIVE'
                            }
                        })
                    ])];
            case 2:
                _a = _c.sent(), totalLeadsGenerated = _a[0], monthlyLeadsGenerated = _a[1], totalRevenue = _a[2], monthlyRevenue = _a[3], activeCampaigns = _a[4];
                res.json({
                    success: true,
                    data: {
                        partner: partnerOrg,
                        stats: {
                            totalLeadsGenerated: totalLeadsGenerated,
                            monthlyLeadsGenerated: monthlyLeadsGenerated,
                            totalRevenue: totalRevenue._sum.amount || 0,
                            monthlyRevenue: monthlyRevenue._sum.amount || 0,
                            activeCampaigns: activeCampaigns,
                            currentCredits: partnerOrg.organization.credits || 0
                        }
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _c.sent();
                console.error('❌ [PARTNER] Erreur dashboard:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération du dashboard partenaire'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 💰 GET /api/partner/earnings - Revenus partenaire
router.get('/earnings', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, _b, period, _c, offset, _d, limit, startDate, earnings, totalEarnings, error_2;
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
                _a = req.query, _b = _a.period, period = _b === void 0 ? '30' : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c, _d = _a.limit, limit = _d === void 0 ? 50 : _d;
                startDate = new Date();
                startDate.setDate(startDate.getDate() - parseInt(period));
                return [4 /*yield*/, prisma.creditTransaction.findMany({
                        where: {
                            organizationId: organizationId,
                            type: 'SALE',
                            createdAt: { gte: startDate }
                        },
                        include: {
                            relatedLead: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    company: true,
                                    marketplacePrice: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: parseInt(limit),
                        skip: parseInt(offset)
                    })];
            case 1:
                earnings = _f.sent();
                return [4 /*yield*/, prisma.creditTransaction.aggregate({
                        where: {
                            organizationId: organizationId,
                            type: 'SALE',
                            createdAt: { gte: startDate }
                        },
                        _sum: { amount: true },
                        _count: true
                    })];
            case 2:
                totalEarnings = _f.sent();
                res.json({
                    success: true,
                    data: {
                        earnings: earnings,
                        summary: {
                            totalAmount: totalEarnings._sum.amount || 0,
                            totalTransactions: totalEarnings._count,
                            period: parseInt(period)
                        }
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _f.sent();
                console.error('❌ [PARTNER] Erreur earnings:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des revenus'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🎯 GET /api/partner/leads - Leads générés par le partenaire
router.get('/leads', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, status_1, _b, marketplaceOnly, _c, offset, _d, limit, where, leads, total, error_3;
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
                _a = req.query, status_1 = _a.status, _b = _a.marketplaceOnly, marketplaceOnly = _b === void 0 ? false : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c, _d = _a.limit, limit = _d === void 0 ? 50 : _d;
                where = { organizationId: organizationId };
                if (status_1) {
                    where.status = status_1;
                }
                if (marketplaceOnly === 'true') {
                    where.LeadMarketplace = {
                        isNot: null
                    };
                }
                return [4 /*yield*/, prisma.lead.findMany({
                        where: where,
                        include: {
                            campaign: {
                                select: {
                                    name: true,
                                    type: true
                                }
                            },
                            LeadMarketplace: {
                                select: {
                                    marketplacePrice: true,
                                    marketplaceVisible: true,
                                    status: true,
                                    soldAt: true
                                }
                            },
                            aiRecommendations: {
                                select: {
                                    score: true,
                                    recommendation: true
                                },
                                orderBy: {
                                    createdAt: 'desc'
                                },
                                take: 1
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: parseInt(limit),
                        skip: parseInt(offset)
                    })];
            case 1:
                leads = _f.sent();
                return [4 /*yield*/, prisma.lead.count({ where: where })];
            case 2:
                total = _f.sent();
                res.json({
                    success: true,
                    data: {
                        leads: leads,
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
                error_3 = _f.sent();
                console.error('❌ [PARTNER] Erreur récupération leads:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des leads partenaire'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🏪 POST /api/partner/register - S'enregistrer comme partenaire
router.post('/register', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, contactPerson, contactEmail, contactPhone, website, description, _b, specialties, _c, commissionRate, existingPartner, partnerOrg, error_4;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 3, , 4]);
                organizationId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                _a = req.body, contactPerson = _a.contactPerson, contactEmail = _a.contactEmail, contactPhone = _a.contactPhone, website = _a.website, description = _a.description, _b = _a.specialties, specialties = _b === void 0 ? [] : _b, _c = _a.commissionRate, commissionRate = _c === void 0 ? 10 : _c;
                // Validation
                if (!contactPerson || !contactEmail) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Personne de contact et email requis'
                        })];
                }
                return [4 /*yield*/, prisma.partnerOrganization.findUnique({
                        where: { organizationId: organizationId }
                    })];
            case 1:
                existingPartner = _e.sent();
                if (existingPartner) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organisation déjà enregistrée comme partenaire'
                        })];
                }
                return [4 /*yield*/, prisma.partnerOrganization.create({
                        data: {
                            organizationId: organizationId,
                            partnerType: 'LEAD_GENERATOR',
                            status: 'PENDING',
                            contactPerson: contactPerson,
                            contactEmail: contactEmail,
                            contactPhone: contactPhone,
                            website: website,
                            description: description,
                            specialties: specialties,
                            commissionRate: parseFloat(commissionRate.toString())
                        },
                        include: {
                            organization: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    })];
            case 2:
                partnerOrg = _e.sent();
                res.json({
                    success: true,
                    data: partnerOrg,
                    message: 'Demande de partenariat enregistrée avec succès'
                });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _e.sent();
                console.error('❌ [PARTNER] Erreur enregistrement:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'enregistrement du partenariat'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

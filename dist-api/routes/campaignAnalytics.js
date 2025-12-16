"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 🎯 DEVIS1MINUTE - Routes Campaign Analytics
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var client_1 = require("@prisma/client");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🔒 RATE LIMITING
var campaignAnalyticsRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requêtes par minute
    message: { success: false, message: 'Trop de requêtes campaign analytics' }
});
router.use(auth_js_1.authMiddleware);
router.use(campaignAnalyticsRateLimit);
// 📊 GET /api/campaign-analytics/dashboard - Dashboard analytics général
router.get('/dashboard', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, period, startDate, _b, totalLeads, periodLeads, activeCampaigns, totalRevenue, averageAiScore, conversionFunnel, dailyLeads, topCampaigns, leadsSources, error_1;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 5, , 6]);
                organizationId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                _a = req.query.period, period = _a === void 0 ? '30' : _a;
                startDate = new Date();
                startDate.setDate(startDate.getDate() - parseInt(period));
                return [4 /*yield*/, Promise.all([
                        // Total des leads
                        prisma.lead.count({
                            where: { organizationId: organizationId }
                        }),
                        // Leads de la période
                        prisma.lead.count({
                            where: {
                                organizationId: organizationId,
                                createdAt: { gte: startDate }
                            }
                        }),
                        // Campagnes actives
                        prisma.campaign.count({
                            where: {
                                organizationId: organizationId,
                                status: 'ACTIVE'
                            }
                        }),
                        // Revenus totaux
                        prisma.creditTransaction.aggregate({
                            where: {
                                organizationId: organizationId,
                                type: 'SALE'
                            },
                            _sum: { amount: true }
                        }),
                        // Score IA moyen
                        prisma.lead.aggregate({
                            where: {
                                organizationId: organizationId,
                                aiScore: { not: null }
                            },
                            _avg: { aiScore: true }
                        }),
                        // Funnel de conversion
                        prisma.lead.groupBy({
                            by: ['status'],
                            where: { organizationId: organizationId },
                            _count: true
                        })
                    ])];
            case 1:
                _b = _d.sent(), totalLeads = _b[0], periodLeads = _b[1], activeCampaigns = _b[2], totalRevenue = _b[3], averageAiScore = _b[4], conversionFunnel = _b[5];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT \n        DATE(created_at) as date,\n        COUNT(*) as count\n      FROM \"Lead\" \n      WHERE organization_id = ", "\n        AND created_at >= ", "\n      GROUP BY DATE(created_at)\n      ORDER BY date ASC\n    "], ["\n      SELECT \n        DATE(created_at) as date,\n        COUNT(*) as count\n      FROM \"Lead\" \n      WHERE organization_id = ", "\n        AND created_at >= ", "\n      GROUP BY DATE(created_at)\n      ORDER BY date ASC\n    "])), organizationId, startDate)];
            case 2:
                dailyLeads = _d.sent();
                return [4 /*yield*/, prisma.campaign.findMany({
                        where: { organizationId: organizationId },
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            _count: {
                                select: { leads: true }
                            }
                        },
                        orderBy: {
                            leads: { _count: 'desc' }
                        },
                        take: 5
                    })];
            case 3:
                topCampaigns = _d.sent();
                return [4 /*yield*/, prisma.lead.groupBy({
                        by: ['source'],
                        where: {
                            organizationId: organizationId,
                            createdAt: { gte: startDate }
                        },
                        _count: true
                    })];
            case 4:
                leadsSources = _d.sent();
                res.json({
                    success: true,
                    data: {
                        period: parseInt(period),
                        metrics: {
                            totalLeads: totalLeads,
                            periodLeads: periodLeads,
                            activeCampaigns: activeCampaigns,
                            totalRevenue: totalRevenue._sum.amount || 0,
                            averageAiScore: Math.round((averageAiScore._avg.aiScore || 0) * 100) / 100
                        },
                        conversionFunnel: conversionFunnel.map(function (item) { return ({
                            status: item.status,
                            count: item._count
                        }); }),
                        dailyLeads: dailyLeads,
                        topCampaigns: topCampaigns.map(function (campaign) { return (__assign(__assign({}, campaign), { leadsCount: campaign._count.leads })); }),
                        leadsSources: leadsSources.map(function (source) { return ({
                            source: source.source,
                            count: source._count
                        }); })
                    }
                });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _d.sent();
                console.error('❌ [CAMPAIGN-ANALYTICS] Erreur dashboard:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération du dashboard analytics'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// 📈 GET /api/campaign-analytics/campaign/:id - Analytics d'une campagne spécifique
router.get('/campaign/:id', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, _a, period, startDate, campaign, _b, periodLeads, leadsRevenue, averageAiScore, statusBreakdown, sourceBreakdown, regionBreakdown, dailyLeadsEvolution, formsPerformance, landingPagesPerformance, error_2;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 6, , 7]);
                id = req.params.id;
                organizationId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                _a = req.query.period, period = _a === void 0 ? '30' : _a;
                startDate = new Date();
                startDate.setDate(startDate.getDate() - parseInt(period));
                return [4 /*yield*/, prisma.campaign.findFirst({
                        where: {
                            id: id,
                            organizationId: organizationId
                        },
                        include: {
                            _count: {
                                select: {
                                    leads: true,
                                    publicForms: true,
                                    landingPages: true
                                }
                            }
                        }
                    })];
            case 1:
                campaign = _d.sent();
                if (!campaign) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Campagne non trouvée'
                        })];
                }
                return [4 /*yield*/, Promise.all([
                        // Leads de la période
                        prisma.lead.count({
                            where: {
                                campaignId: id,
                                createdAt: { gte: startDate }
                            }
                        }),
                        // Revenus générés par les leads de cette campagne
                        prisma.leadMarketplace.aggregate({
                            where: {
                                campaignId: id,
                                status: 'SOLD'
                            },
                            _sum: { marketplacePrice: true }
                        }),
                        // Score IA moyen
                        prisma.lead.aggregate({
                            where: {
                                campaignId: id,
                                aiScore: { not: null }
                            },
                            _avg: { aiScore: true }
                        }),
                        // Répartition par statut
                        prisma.lead.groupBy({
                            by: ['status'],
                            where: { campaignId: id },
                            _count: true
                        }),
                        // Répartition par source
                        prisma.lead.groupBy({
                            by: ['source'],
                            where: { campaignId: id },
                            _count: true
                        }),
                        // Répartition par région
                        prisma.lead.groupBy({
                            by: ['region'],
                            where: {
                                campaignId: id,
                                region: { not: null }
                            },
                            _count: true
                        })
                    ])];
            case 2:
                _b = _d.sent(), periodLeads = _b[0], leadsRevenue = _b[1], averageAiScore = _b[2], statusBreakdown = _b[3], sourceBreakdown = _b[4], regionBreakdown = _b[5];
                return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      SELECT \n        DATE(created_at) as date,\n        COUNT(*) as count,\n        AVG(ai_score) as avg_score\n      FROM \"Lead\" \n      WHERE campaign_id = ", "\n        AND created_at >= ", "\n      GROUP BY DATE(created_at)\n      ORDER BY date ASC\n    "], ["\n      SELECT \n        DATE(created_at) as date,\n        COUNT(*) as count,\n        AVG(ai_score) as avg_score\n      FROM \"Lead\" \n      WHERE campaign_id = ", "\n        AND created_at >= ", "\n      GROUP BY DATE(created_at)\n      ORDER BY date ASC\n    "])), id, startDate)];
            case 3:
                dailyLeadsEvolution = _d.sent();
                return [4 /*yield*/, prisma.publicForm.findMany({
                        where: { campaignId: id },
                        select: {
                            id: true,
                            title: true,
                            submissionsCount: true,
                            isActive: true,
                            _count: {
                                select: { leads: true }
                            }
                        }
                    })];
            case 4:
                formsPerformance = _d.sent();
                return [4 /*yield*/, prisma.landingPage.findMany({
                        where: { campaignId: id },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            viewsCount: true,
                            clicksCount: true,
                            conversionsCount: true,
                            isPublished: true
                        }
                    })];
            case 5:
                landingPagesPerformance = _d.sent();
                res.json({
                    success: true,
                    data: {
                        campaign: __assign(__assign({}, campaign), { totalLeads: campaign._count.leads, totalForms: campaign._count.publicForms, totalLandingPages: campaign._count.landingPages }),
                        period: parseInt(period),
                        metrics: {
                            periodLeads: periodLeads,
                            leadsRevenue: leadsRevenue._sum.marketplacePrice || 0,
                            averageAiScore: Math.round((averageAiScore._avg.aiScore || 0) * 100) / 100,
                            costPerLead: campaign.budget && campaign._count.leads > 0
                                ? Math.round((campaign.budget / campaign._count.leads) * 100) / 100
                                : 0
                        },
                        breakdowns: {
                            status: statusBreakdown.map(function (item) { return ({
                                status: item.status,
                                count: item._count
                            }); }),
                            source: sourceBreakdown.map(function (item) { return ({
                                source: item.source,
                                count: item._count
                            }); }),
                            region: regionBreakdown.map(function (item) { return ({
                                region: item.region,
                                count: item._count
                            }); })
                        },
                        dailyEvolution: dailyLeadsEvolution,
                        formsPerformance: formsPerformance.map(function (form) { return (__assign(__assign({}, form), { conversionRate: form.submissionsCount > 0
                                ? Math.round((form._count.leads / form.submissionsCount) * 100 * 100) / 100
                                : 0 })); }),
                        landingPagesPerformance: landingPagesPerformance.map(function (page) { return (__assign(__assign({}, page), { conversionRate: page.viewsCount > 0
                                ? Math.round((page.conversionsCount / page.viewsCount) * 100 * 100) / 100
                                : 0, clickThroughRate: page.viewsCount > 0
                                ? Math.round((page.clicksCount / page.viewsCount) * 100 * 100) / 100
                                : 0 })); })
                    }
                });
                return [3 /*break*/, 7];
            case 6:
                error_2 = _d.sent();
                console.error('❌ [CAMPAIGN-ANALYTICS] Erreur campagne:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des analytics de campagne'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// 🤖 GET /api/campaign-analytics/ai-insights - Insights IA
router.get('/ai-insights', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, aiRecommendations, scoreDistribution, campaignScores, campaignScoresAnalysis, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                return [4 /*yield*/, prisma.aiRecommendation.findMany({
                        where: {
                            lead: {
                                organizationId: organizationId
                            }
                        },
                        include: {
                            lead: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    company: true,
                                    aiScore: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 20
                    })];
            case 1:
                aiRecommendations = _b.sent();
                return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n      SELECT \n        CASE \n          WHEN ai_score >= 90 THEN 'Excellent (90-100)'\n          WHEN ai_score >= 80 THEN 'Tr\u00E8s bon (80-89)'\n          WHEN ai_score >= 70 THEN 'Bon (70-79)'\n          WHEN ai_score >= 60 THEN 'Moyen (60-69)'\n          ELSE 'Faible (0-59)'\n        END as score_range,\n        COUNT(*) as count\n      FROM \"Lead\" \n      WHERE organization_id = ", "\n        AND ai_score IS NOT NULL\n      GROUP BY score_range\n      ORDER BY MIN(ai_score) DESC\n    "], ["\n      SELECT \n        CASE \n          WHEN ai_score >= 90 THEN 'Excellent (90-100)'\n          WHEN ai_score >= 80 THEN 'Tr\u00E8s bon (80-89)'\n          WHEN ai_score >= 70 THEN 'Bon (70-79)'\n          WHEN ai_score >= 60 THEN 'Moyen (60-69)'\n          ELSE 'Faible (0-59)'\n        END as score_range,\n        COUNT(*) as count\n      FROM \"Lead\" \n      WHERE organization_id = ", "\n        AND ai_score IS NOT NULL\n      GROUP BY score_range\n      ORDER BY MIN(ai_score) DESC\n    "])), organizationId)];
            case 2:
                scoreDistribution = _b.sent();
                return [4 /*yield*/, prisma.campaign.findMany({
                        where: { organizationId: organizationId },
                        select: {
                            id: true,
                            name: true,
                            leads: {
                                select: {
                                    aiScore: true
                                },
                                where: {
                                    aiScore: { not: null }
                                }
                            }
                        }
                    })];
            case 3:
                campaignScores = _b.sent();
                campaignScoresAnalysis = campaignScores.map(function (campaign) {
                    var scores = campaign.leads.map(function (lead) { return lead.aiScore; }).filter(Boolean);
                    return {
                        campaignId: campaign.id,
                        campaignName: campaign.name,
                        averageScore: scores.length > 0
                            ? Math.round((scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) * 100) / 100
                            : 0,
                        leadsCount: scores.length,
                        scoreRange: {
                            min: Math.min.apply(Math, scores),
                            max: Math.max.apply(Math, scores)
                        }
                    };
                }).filter(function (campaign) { return campaign.leadsCount > 0; });
                res.json({
                    success: true,
                    data: {
                        aiRecommendations: aiRecommendations,
                        scoreDistribution: scoreDistribution,
                        campaignScoresAnalysis: campaignScoresAnalysis,
                        insights: __spreadArray(__spreadArray([], (aiRecommendations.length > 0 ? [{
                                type: 'recommendation',
                                title: 'Nouvelles recommandations IA',
                                description: "".concat(aiRecommendations.length, " nouvelles recommandations disponibles"),
                                actionable: true
                            }] : []), true), (campaignScoresAnalysis.length > 0 ? [{
                                type: 'performance',
                                title: 'Meilleure campagne par score IA',
                                description: "La campagne \"".concat(campaignScoresAnalysis.sort(function (a, b) { return b.averageScore - a.averageScore; })[0].campaignName, "\" a le meilleur score moyen (").concat(campaignScoresAnalysis[0].averageScore, ")"),
                                actionable: false
                            }] : []), true)
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                console.error('❌ [CAMPAIGN-ANALYTICS] Erreur AI insights:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des insights IA'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 📊 GET /api/campaign-analytics/export - Export des données
router.get('/export', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, _b, format, campaignId, startDate, endDate, where, leads, error_4;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                _a = req.query, _b = _a.format, format = _b === void 0 ? 'json' : _b, campaignId = _a.campaignId, startDate = _a.startDate, endDate = _a.endDate;
                where = { organizationId: organizationId };
                if (campaignId) {
                    where.campaignId = campaignId;
                }
                if (startDate || endDate) {
                    where.createdAt = {};
                    if (startDate)
                        where.createdAt.gte = new Date(startDate);
                    if (endDate)
                        where.createdAt.lte = new Date(endDate);
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
                                    status: true
                                }
                            },
                            aiRecommendations: {
                                select: {
                                    score: true,
                                    recommendation: true,
                                    createdAt: true
                                },
                                orderBy: {
                                    createdAt: 'desc'
                                },
                                take: 1
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    })];
            case 1:
                leads = _d.sent();
                if (format === 'csv') {
                    // TODO: Implémenter export CSV si nécessaire
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', 'attachment; filename="leads-export.csv"');
                    res.send('CSV export à implémenter');
                }
                else {
                    res.json({
                        success: true,
                        data: {
                            exportDate: new Date().toISOString(),
                            filters: { campaignId: campaignId, startDate: startDate, endDate: endDate },
                            totalRecords: leads.length,
                            leads: leads
                        }
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_4 = _d.sent();
                console.error('❌ [CAMPAIGN-ANALYTICS] Erreur export:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'export des données'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
var templateObject_1, templateObject_2, templateObject_3;

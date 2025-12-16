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
exports.AdPlatformService = exports.AD_PLATFORMS = void 0;
// Service d'intégration publicitaire - Architecture scalable
var prisma_1 = require("../lib/prisma");
// Plateformes publicitaires supportées
exports.AD_PLATFORMS = {
    google_ads: {
        id: 'google_ads',
        name: 'google_ads',
        displayName: 'Google Ads',
        icon: 'GoogleOutlined',
        // URL de callback dynamique (évite le hardcode localhost dans le bundle)
        authUrl: (function () {
            var _a, _b;
            var env = ((_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.process) === null || _a === void 0 ? void 0 : _a.env) || {};
            var explicit = env.GOOGLE_ADS_REDIRECT || env.GOOGLE_REDIRECT_URI;
            if (explicit)
                return explicit;
            // Frontend build time variables (Vite)
            var viteEnv = ((_b = import.meta) === null || _b === void 0 ? void 0 : _b.env) || {};
            var frontendBase = viteEnv.VITE_API_BASE_URL || viteEnv.API_URL || '';
            if (frontendBase)
                return "".concat(frontendBase.replace(/\/$/, ''), "/api/google-auth/callback");
            if (typeof window !== 'undefined')
                return "".concat(window.location.origin, "/api/google-auth/callback");
            return '/api/google-auth/callback';
        })(),
        scopes: [
            'https://www.googleapis.com/auth/adwords'
        ],
        fields: [
            {
                key: 'account_id',
                label: 'ID du compte Google Ads',
                type: 'text',
                required: true
            },
            {
                key: 'customer_id',
                label: 'ID client',
                type: 'text',
                required: true
            }
        ]
    },
    meta_ads: {
        id: 'meta_ads',
        name: 'meta_ads',
        displayName: 'Meta Ads (Facebook/Instagram)',
        icon: 'FacebookOutlined',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        scopes: [
            'read_insights',
            'pages_show_list',
            'instagram_basic'
        ],
        fields: [
            {
                key: 'app_id',
                label: 'App ID Facebook',
                type: 'text',
                required: true
            },
            {
                key: 'business_account_id',
                label: 'ID du compte Business Manager',
                type: 'text',
                required: true
            }
        ]
    },
    linkedin_ads: {
        id: 'linkedin_ads',
        name: 'linkedin_ads',
        displayName: 'LinkedIn Ads',
        icon: 'LinkedinOutlined',
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        scopes: [
            'r_ads',
            'rw_ads',
            'r_organization_social'
        ],
        fields: [
            {
                key: 'organization_id',
                label: 'ID de l\'organisation LinkedIn',
                type: 'text',
                required: true
            }
        ]
    },
    tiktok_ads: {
        id: 'tiktok_ads',
        name: 'tiktok_ads',
        displayName: 'TikTok Ads',
        icon: 'TikTokOutlined',
        authUrl: 'https://ads.tiktok.com/marketing_api/auth',
        scopes: [
            'advertiser_read',
            'campaign_read',
            'campaign_write'
        ],
        fields: [
            {
                key: 'advertiser_id',
                label: 'ID de l\'annonceur TikTok',
                type: 'text',
                required: true
            }
        ]
    }
};
var AdPlatformService = /** @class */ (function () {
    function AdPlatformService() {
    }
    /**
     * Récupère toutes les intégrations publicitaires d'une organisation
     */
    AdPlatformService.getIntegrations = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.adPlatformIntegration.findMany({
                        where: {
                            organizationId: organizationId,
                            active: true
                        },
                        include: {
                            AdCampaign: {
                                include: {
                                    AdMetrics: {
                                        orderBy: {
                                            date: 'desc'
                                        },
                                        take: 30 // 30 derniers jours
                                    }
                                }
                            }
                        }
                    })];
            });
        });
    };
    /**
     * Crée une nouvelle intégration publicitaire
     */
    AdPlatformService.createIntegration = function (organizationId, platform, name, config, credentials) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.adPlatformIntegration.create({
                        data: {
                            organizationId: organizationId,
                            platform: platform,
                            name: name,
                            config: config,
                            credentials: credentials,
                            status: 'connected'
                        }
                    })];
            });
        });
    };
    /**
     * Met à jour le statut d'une intégration
     */
    AdPlatformService.updateIntegrationStatus = function (integrationId, status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.adPlatformIntegration.update({
                        where: { id: integrationId },
                        data: {
                            status: status,
                            lastSync: new Date()
                        }
                    })];
            });
        });
    };
    /**
     * Crée une nouvelle campagne publicitaire
     */
    AdPlatformService.createCampaign = function (organizationId, platformIntegrationId, campaignData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.adCampaign.create({
                        data: __assign({ organizationId: organizationId, platformIntegrationId: platformIntegrationId }, campaignData)
                    })];
            });
        });
    };
    /**
     * Met à jour les métriques d'une campagne
     */
    AdPlatformService.updateCampaignMetrics = function (campaignId, date, metrics) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.adMetrics.upsert({
                        where: {
                            campaignId_date: {
                                campaignId: campaignId,
                                date: date
                            }
                        },
                        create: __assign({ campaignId: campaignId, date: date }, metrics),
                        update: __assign({}, metrics)
                    })];
            });
        });
    };
    /**
     * Récupère les métriques d'une campagne sur une période
     */
    AdPlatformService.getCampaignMetrics = function (campaignId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma_1.prisma.adMetrics.findMany({
                        where: {
                            campaignId: campaignId,
                            date: {
                                gte: startDate,
                                lte: endDate
                            }
                        },
                        orderBy: {
                            date: 'asc'
                        }
                    })];
            });
        });
    };
    /**
     * Calcule le ROI global d'une organisation
     */
    AdPlatformService.calculateOrganizationROI = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var campaigns, totalSpent, totalRevenue, totalLeads, _i, campaigns_1, campaign, _a, _b, metric, avgLeadValue, roi;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma_1.prisma.adCampaign.findMany({
                            where: {
                                organizationId: organizationId
                            },
                            include: {
                                AdMetrics: true
                            }
                        })];
                    case 1:
                        campaigns = _c.sent();
                        totalSpent = 0;
                        totalRevenue = 0;
                        totalLeads = 0;
                        for (_i = 0, campaigns_1 = campaigns; _i < campaigns_1.length; _i++) {
                            campaign = campaigns_1[_i];
                            for (_a = 0, _b = campaign.AdMetrics; _a < _b.length; _a++) {
                                metric = _b[_a];
                                totalSpent += Number(metric.spend);
                                totalLeads += metric.conversions;
                            }
                        }
                        avgLeadValue = 500;
                        totalRevenue = totalLeads * avgLeadValue;
                        roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
                        return [2 /*return*/, {
                                totalSpent: totalSpent,
                                totalRevenue: totalRevenue,
                                totalLeads: totalLeads,
                                roi: roi,
                                avgCostPerLead: totalLeads > 0 ? totalSpent / totalLeads : 0
                            }];
                }
            });
        });
    };
    /**
     * Synchronise les données depuis les APIs externes
     */
    AdPlatformService.syncPlatformData = function (integrationId) {
        return __awaiter(this, void 0, void 0, function () {
            var integration, _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, prisma_1.prisma.adPlatformIntegration.findUnique({
                            where: { id: integrationId },
                            include: {
                                AdCampaign: true
                            }
                        })];
                    case 1:
                        integration = _b.sent();
                        if (!integration) {
                            throw new Error('Intégration non trouvée');
                        }
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 14, , 16]);
                        _a = integration.platform;
                        switch (_a) {
                            case 'google_ads': return [3 /*break*/, 3];
                            case 'meta_ads': return [3 /*break*/, 5];
                            case 'linkedin_ads': return [3 /*break*/, 7];
                            case 'tiktok_ads': return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 11];
                    case 3: return [4 /*yield*/, this.syncGoogleAds(integration)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 5: return [4 /*yield*/, this.syncMetaAds(integration)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 7: return [4 /*yield*/, this.syncLinkedInAds(integration)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, this.syncTikTokAds(integration)];
                    case 10:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 11: 
                    // Enregistrement de l'événement analytique
                    return [4 /*yield*/, prisma_1.prisma.analyticsEvent.create({
                            data: {
                                organizationId: integration.organizationId,
                                eventType: 'platform_sync_completed',
                                source: 'advertising',
                                sourceId: integrationId,
                                data: {
                                    platform: integration.platform,
                                    campaignCount: integration.AdCampaign.length
                                }
                            }
                        })];
                    case 12:
                        // Enregistrement de l'événement analytique
                        _b.sent();
                        return [4 /*yield*/, this.updateIntegrationStatus(integrationId, 'connected')];
                    case 13:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 14:
                        error_1 = _b.sent();
                        return [4 /*yield*/, this.updateIntegrationStatus(integrationId, 'error')];
                    case 15:
                        _b.sent();
                        throw error_1;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Synchronisation Google Ads (à implémenter)
     */
    AdPlatformService.syncGoogleAds = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter l'API Google Ads
                console.log('Synchronisation Google Ads pour:', integration.name);
                return [2 /*return*/];
            });
        });
    };
    /**
     * Synchronisation Meta Ads (à implémenter)
     */
    AdPlatformService.syncMetaAds = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter l'API Facebook Marketing
                console.log('Synchronisation Meta Ads pour:', integration.name);
                return [2 /*return*/];
            });
        });
    };
    /**
     * Synchronisation LinkedIn Ads (à implémenter)
     */
    AdPlatformService.syncLinkedInAds = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter l'API LinkedIn Marketing
                console.log('Synchronisation LinkedIn Ads pour:', integration.name);
                return [2 /*return*/];
            });
        });
    };
    /**
     * Synchronisation TikTok Ads (à implémenter)
     */
    AdPlatformService.syncTikTokAds = function (integration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implémenter l'API TikTok for Business
                console.log('Synchronisation TikTok Ads pour:', integration.name);
                return [2 /*return*/];
            });
        });
    };
    return AdPlatformService;
}());
exports.AdPlatformService = AdPlatformService;

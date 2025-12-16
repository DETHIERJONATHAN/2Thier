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
// 🎯 DEVIS1MINUTE - Routes Landing Pages
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var client_1 = require("@prisma/client");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🔒 RATE LIMITING PUBLIC
var publicLandingRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 vues par minute par IP
    message: { success: false, message: 'Trop de requêtes landing pages' }
});
// 🔒 RATE LIMITING ADMIN
var adminLandingRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requêtes par minute
    message: { success: false, message: 'Trop de requêtes landing admin' }
});
var isJsonObject = function (value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
var toJsonObject = function (value) {
    return (isJsonObject(value) ? value : {});
};
var toStringOrNull = function (value) {
    return (typeof value === 'string' ? value : null);
};
var toStringArray = function (value) {
    return Array.isArray(value) ? value.filter(function (item) { return typeof item === 'string'; }) : [];
};
var toSnapshots = function (value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter(function (item) { return isJsonObject(item); })
        .map(function (item) {
        var _a, _b, _c, _d;
        var id = toStringOrNull(item.id);
        var label = (_a = toStringOrNull(item.label)) !== null && _a !== void 0 ? _a : "Snapshot ".concat(new Date().toLocaleString());
        var createdAt = (_b = toStringOrNull(item.createdAt)) !== null && _b !== void 0 ? _b : new Date().toISOString();
        var content = toJsonObject((_c = item.content) !== null && _c !== void 0 ? _c : {});
        var settings = toJsonObject((_d = item.settings) !== null && _d !== void 0 ? _d : {});
        if (!id) {
            return null;
        }
        var snapshot = {
            id: id,
            label: label,
            createdAt: createdAt,
            content: content,
            settings: settings
        };
        return snapshot;
    })
        .filter(function (snapshot) { return snapshot !== null; });
};
// 🌐 GET /api/landing-pages/public/:slug - Affichage public d'une landing page
router.get('/public/:slug', publicLandingRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, landingPage, content, styling, seo, tracking, title, subtitle, ctaButton, ctaUrl, seoTitle, seoDescription, keywords, error_1;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 3, , 4]);
                slug = req.params.slug;
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: {
                            category: 'landing',
                            isPublic: true,
                            OR: [
                                { id: slug },
                                { name: slug }
                            ]
                        },
                        include: { Organization: { select: { name: true } } }
                    })];
            case 1:
                landingPage = _f.sent();
                if (!landingPage) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Landing page non trouvée'
                        })];
                }
                // Incrémenter le compteur de vues
                // Compte de vues: créer un enregistrement dans TreeBranchLeafSubmission comme trace minimaliste
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.create({
                        data: {
                            treeId: landingPage.id,
                            status: 'view',
                            summary: {},
                            exportData: {},
                        }
                    })];
            case 2:
                // Incrémenter le compteur de vues
                // Compte de vues: créer un enregistrement dans TreeBranchLeafSubmission comme trace minimaliste
                _f.sent();
                content = toJsonObject(landingPage.metadata);
                styling = toJsonObject(landingPage.settings);
                seo = toJsonObject((_a = content.seo) !== null && _a !== void 0 ? _a : null);
                tracking = toJsonObject((_b = styling.tracking) !== null && _b !== void 0 ? _b : null);
                title = (_c = toStringOrNull(content.title)) !== null && _c !== void 0 ? _c : landingPage.name;
                subtitle = toStringOrNull(content.subtitle);
                ctaButton = toStringOrNull(content.ctaButton);
                ctaUrl = toStringOrNull(content.ctaUrl);
                seoTitle = (_d = toStringOrNull(seo.title)) !== null && _d !== void 0 ? _d : landingPage.name;
                seoDescription = toStringOrNull(seo.description);
                keywords = toStringArray(seo.keywords);
                res.json({
                    success: true,
                    data: {
                        id: landingPage.id,
                        title: title,
                        subtitle: subtitle,
                        content: content,
                        seo: {
                            title: seoTitle,
                            description: seoDescription,
                            keywords: keywords
                        },
                        styling: styling,
                        tracking: tracking, // { googleTagId?: string; metaPixelId?: string; enable?: boolean }
                        ctaButton: ctaButton,
                        ctaUrl: ctaUrl,
                        campaign: { name: (_e = landingPage.Organization) === null || _e === void 0 ? void 0 : _e.name }
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _f.sent();
                console.error('❌ [LANDING-PAGES] Erreur affichage public:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'affichage de la landing page'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 📊 POST /api/landing-pages/public/:slug/track - Tracking d'événements sur landing page
router.post('/public/:slug/track', publicLandingRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, _a, event_1, _b, data, landingPage, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                slug = req.params.slug;
                _a = req.body, event_1 = _a.event, _b = _a.data, data = _b === void 0 ? {} : _b;
                // Validation
                if (!event_1) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Type d\'événement requis'
                        })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        where: {
                            category: 'landing',
                            OR: [{ id: slug }, { name: slug }]
                        },
                        select: { id: true, organizationId: true }
                    })];
            case 1:
                landingPage = _c.sent();
                if (!landingPage) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Landing page non trouvée'
                        })];
                }
                // Enregistrer l'événement de tracking
                // Utiliser TreeBranchLeafSubmission comme log d'événement minimal
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.create({
                        data: {
                            treeId: landingPage.id,
                            status: event_1,
                            summary: data || {},
                            exportData: {
                                userAgent: req.get('User-Agent'),
                                ip: req.ip,
                                referer: req.get('Referer')
                            }
                        }
                    })];
            case 2:
                // Enregistrer l'événement de tracking
                // Utiliser TreeBranchLeafSubmission comme log d'événement minimal
                _c.sent();
                // Incrémenter les compteurs spécifiques selon l'événement
                // Compteurs dérivés via agrégations, pas d'update direct requis ici.
                res.json({
                    success: true,
                    message: 'Événement trackė avec succès'
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _c.sent();
                console.error('❌ [LANDING-PAGES] Erreur tracking:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du tracking'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// === ROUTES ADMINISTRATEUR (AUTHENTIFIÉES) ===
router.use('/admin', auth_js_1.authMiddleware);
router.use('/admin', adminLandingRateLimit);
// 📋 GET /api/landing-pages/admin/list - Liste des landing pages
router.get('/admin/list', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, trees, data, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organization ID manquant'
                        })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafTree.findMany({
                        where: { organizationId: organizationId, category: 'landing' },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                trees = _b.sent();
                return [4 /*yield*/, Promise.all(trees.map(function (t) { return __awaiter(void 0, void 0, void 0, function () {
                        var _a, views, conversions, conversionRate, content, status;
                        var _b, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0: return [4 /*yield*/, Promise.all([
                                        prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'view' } }),
                                        prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'form_submit' } })
                                    ])];
                                case 1:
                                    _a = _d.sent(), views = _a[0], conversions = _a[1];
                                    conversionRate = views > 0 ? Math.round((conversions / views) * 100) : 0;
                                    content = toJsonObject(t.metadata);
                                    status = ((_b = t.status) !== null && _b !== void 0 ? _b : 'draft').toUpperCase();
                                    return [2 /*return*/, {
                                            id: t.id,
                                            title: t.name,
                                            slug: t.id,
                                            description: (_c = t.description) !== null && _c !== void 0 ? _c : '',
                                            content: content,
                                            status: status,
                                            metaTitle: t.name,
                                            metaDescription: '',
                                            keywords: [],
                                            customCSS: '',
                                            customJS: '',
                                            trackingPixels: [],
                                            publishedAt: t.status === 'published' ? t.updatedAt : null,
                                            views: views,
                                            conversions: conversions,
                                            conversionRate: conversionRate,
                                            createdAt: t.createdAt,
                                            updatedAt: t.updatedAt
                                        }];
                            }
                        });
                    }); }))];
            case 2:
                data = _b.sent();
                res.json({ success: true, data: data });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('❌ [LANDING-ADMIN] Erreur liste:', error_3);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des landing pages' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/landing-pages - alias simple pour la page front existante
router.get('/', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, trees, data, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findMany({ where: { organizationId: organizationId, category: 'landing' }, orderBy: { createdAt: 'desc' } })];
            case 1:
                trees = _b.sent();
                return [4 /*yield*/, Promise.all(trees.map(function (t) { return __awaiter(void 0, void 0, void 0, function () {
                        var _a, views, conversions, conversionRate, content, status;
                        var _b, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0: return [4 /*yield*/, Promise.all([
                                        prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'view' } }),
                                        prisma.treeBranchLeafSubmission.count({ where: { treeId: t.id, status: 'form_submit' } })
                                    ])];
                                case 1:
                                    _a = _d.sent(), views = _a[0], conversions = _a[1];
                                    conversionRate = views > 0 ? Math.round((conversions / views) * 100) : 0;
                                    content = toJsonObject(t.metadata);
                                    status = ((_b = t.status) !== null && _b !== void 0 ? _b : 'draft').toUpperCase();
                                    return [2 /*return*/, {
                                            id: t.id,
                                            title: t.name,
                                            slug: t.id,
                                            description: (_c = t.description) !== null && _c !== void 0 ? _c : '',
                                            content: content,
                                            status: status,
                                            metaTitle: t.name,
                                            metaDescription: '',
                                            keywords: [],
                                            customCSS: '',
                                            customJS: '',
                                            trackingPixels: [],
                                            publishedAt: t.status === 'published' ? t.updatedAt : null,
                                            views: views,
                                            conversions: conversions,
                                            conversionRate: conversionRate,
                                            createdAt: t.createdAt,
                                            updatedAt: t.updatedAt
                                        }];
                            }
                        });
                    }); }))];
            case 2:
                data = _b.sent();
                res.json({ success: true, data: data });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _b.sent();
                console.error('❌ [LANDING] Erreur / (list):', error_4);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des landing pages' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/landing-pages/stats - statistiques globales
router.get('/stats', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, totalPages, publishedPages, draftPages, _a, totalViews, totalConversions, avgConversionRate, error_5;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.count({ where: { organizationId: organizationId, category: 'landing' } })];
            case 1:
                totalPages = _c.sent();
                return [4 /*yield*/, prisma.treeBranchLeafTree.count({ where: { organizationId: organizationId, category: 'landing', status: 'published' } })];
            case 2:
                publishedPages = _c.sent();
                draftPages = totalPages - publishedPages;
                return [4 /*yield*/, Promise.all([
                        prisma.treeBranchLeafSubmission.count({ where: { status: 'view', TreeBranchLeafTree: { organizationId: organizationId, category: 'landing' } } }),
                        prisma.treeBranchLeafSubmission.count({ where: { status: 'form_submit', TreeBranchLeafTree: { organizationId: organizationId, category: 'landing' } } })
                    ])];
            case 3:
                _a = _c.sent(), totalViews = _a[0], totalConversions = _a[1];
                avgConversionRate = totalViews > 0 ? Math.round((totalConversions / totalViews) * 100) : 0;
                res.json({ success: true, data: { totalPages: totalPages, publishedPages: publishedPages, draftPages: draftPages, totalViews: totalViews, totalConversions: totalConversions, avgConversionRate: avgConversionRate } });
                return [3 /*break*/, 5];
            case 4:
                error_5 = _c.sent();
                console.error('❌ [LANDING] Erreur /stats:', error_5);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 📈 GET /api/landing-pages/stats/timeseries?days=30
router.get('/stats/timeseries', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, daysParam, requestedDays, safeDays, days, start, submissions, byDay, i, d, _i, submissions_1, s, key, rec, series, error_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                daysParam = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
                requestedDays = Number.parseInt(daysParam !== null && daysParam !== void 0 ? daysParam : '30', 10);
                safeDays = Number.isNaN(requestedDays) ? 30 : requestedDays;
                days = Math.min(365, Math.max(1, safeDays));
                start = new Date();
                start.setDate(start.getDate() - (days - 1));
                start.setHours(0, 0, 0, 0);
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findMany({
                        where: { createdAt: { gte: start }, TreeBranchLeafTree: { organizationId: organizationId, category: 'landing' } },
                        select: { createdAt: true, status: true }
                    })];
            case 1:
                submissions = _b.sent();
                byDay = new Map();
                for (i = 0; i < days; i++) {
                    d = new Date(start.getTime());
                    d.setDate(start.getDate() + i);
                    byDay.set(d.toISOString().slice(0, 10), { views: 0, conversions: 0 });
                }
                for (_i = 0, submissions_1 = submissions; _i < submissions_1.length; _i++) {
                    s = submissions_1[_i];
                    key = new Date(s.createdAt).toISOString().slice(0, 10);
                    rec = byDay.get(key);
                    if (!rec)
                        continue;
                    if (s.status === 'view')
                        rec.views++;
                    if (s.status === 'form_submit')
                        rec.conversions++;
                }
                series = Array.from(byDay.entries()).map(function (_a) {
                    var date = _a[0], v = _a[1];
                    return ({ date: date, views: v.views, conversions: v.conversions });
                });
                res.json({ success: true, data: { start: start.toISOString(), days: days, series: series } });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _b.sent();
                console.error('❌ [LANDING] Erreur timeseries:', error_6);
                res.status(500).json({ success: false, message: 'Erreur séries temporelles landing' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// === CRUD minimal pour la compatibilité avec la page front ===
// Créer
router.post('/', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, title, description, content, status_1, settings, created, error_7;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                _a = req.body, title = _a.title, description = _a.description, content = _a.content, status_1 = _a.status, settings = _a.settings;
                if (!title)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Titre requis' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.create({
                        data: {
                            organizationId: organizationId,
                            name: title,
                            description: description || '',
                            category: 'landing',
                            status: (status_1 || 'DRAFT').toLowerCase(),
                            metadata: content || {},
                            settings: settings || {}
                        }
                    })];
            case 1:
                created = _c.sent();
                res.json({ success: true, data: { id: created.id } });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _c.sent();
                console.error('❌ [LANDING] Erreur création:', error_7);
                res.status(500).json({ success: false, message: 'Erreur lors de la création' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Mettre à jour
router.put('/:id', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, tree, _a, title, description, content, status_2, settings, updated, error_8;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                tree = _c.sent();
                if (!tree)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                _a = req.body, title = _a.title, description = _a.description, content = _a.content, status_2 = _a.status, settings = _a.settings;
                return [4 /*yield*/, prisma.treeBranchLeafTree.update({
                        where: { id: id },
                        data: {
                            name: title !== null && title !== void 0 ? title : tree.name,
                            description: description !== null && description !== void 0 ? description : tree.description,
                            metadata: content !== null && content !== void 0 ? content : tree.metadata,
                            settings: settings !== null && settings !== void 0 ? settings : tree.settings,
                            status: status_2 ? status_2.toLowerCase() : tree.status
                        }
                    })];
            case 2:
                updated = _c.sent();
                res.json({ success: true, data: { id: updated.id } });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _c.sent();
                console.error('❌ [LANDING] Erreur mise à jour:', error_8);
                res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Supprimer
router.delete('/:id', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, deleted, error_9;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.deleteMany({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                deleted = _b.sent();
                if (deleted.count === 0)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _b.sent();
                console.error('❌ [LANDING] Erreur suppression:', error_9);
                res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Publier / Dépublier
router.patch('/:id/publish', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, publish, organizationId, tree, updated, error_10;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                publish = req.body.publish;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                if (publish === undefined)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Paramètre publish manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                tree = _b.sent();
                if (!tree)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.update({ where: { id: id }, data: { status: publish ? 'published' : 'draft', isPublic: !!publish } })];
            case 2:
                updated = _b.sent();
                res.json({ success: true, data: { id: updated.id, status: updated.status } });
                return [3 /*break*/, 4];
            case 3:
                error_10 = _b.sent();
                console.error('❌ [LANDING] Erreur publish:', error_10);
                res.status(500).json({ success: false, message: 'Erreur lors de la publication' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 📄 GET /api/landing-pages/admin/:id - Détails d'une landing page (TreeBranchLeafTree)
router.get('/admin/:id', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, tree, content, styling, seo, tracking, status_3, seoTitle, seoDescription, keywords, error_11;
    var _a, _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 2, , 3]);
                id = req.params.id;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                tree = _h.sent();
                if (!tree)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                content = toJsonObject(tree.metadata);
                styling = toJsonObject(tree.settings);
                seo = toJsonObject((_b = content.seo) !== null && _b !== void 0 ? _b : null);
                tracking = toJsonObject((_c = styling.tracking) !== null && _c !== void 0 ? _c : null);
                status_3 = ((_d = tree.status) !== null && _d !== void 0 ? _d : 'draft').toUpperCase();
                seoTitle = (_e = toStringOrNull(seo.title)) !== null && _e !== void 0 ? _e : tree.name;
                seoDescription = (_f = toStringOrNull(seo.description)) !== null && _f !== void 0 ? _f : '';
                keywords = toStringArray(seo.keywords);
                res.json({
                    success: true,
                    data: {
                        id: tree.id,
                        title: tree.name,
                        description: (_g = tree.description) !== null && _g !== void 0 ? _g : '',
                        status: status_3,
                        content: content,
                        seo: {
                            title: seoTitle,
                            description: seoDescription,
                            keywords: keywords
                        },
                        styling: styling,
                        tracking: tracking,
                        isPublic: !!tree.isPublic,
                        createdAt: tree.createdAt,
                        updatedAt: tree.updatedAt
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_11 = _h.sent();
                console.error('❌ [LANDING-ADMIN] Erreur détail:', error_11);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération du détail' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🧬 POST /api/landing-pages/:id/duplicate - Dupliquer la landing (draft)
router.post('/:id/duplicate', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, tree, suffix, copy, error_12;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                tree = _b.sent();
                if (!tree)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                suffix = Math.random().toString(36).slice(2, 6);
                return [4 /*yield*/, prisma.treeBranchLeafTree.create({
                        data: {
                            organizationId: organizationId,
                            name: "".concat(tree.name, " (copie ").concat(suffix, ")"),
                            description: tree.description || '',
                            category: 'landing',
                            status: 'draft',
                            isPublic: false,
                            metadata: toJsonObject(tree.metadata),
                            settings: toJsonObject(tree.settings)
                        }
                    })];
            case 2:
                copy = _b.sent();
                res.json({ success: true, data: { id: copy.id } });
                return [3 /*break*/, 4];
            case 3:
                error_12 = _b.sent();
                console.error('❌ [LANDING] Erreur duplication:', error_12);
                res.status(500).json({ success: false, message: 'Erreur lors de la duplication' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🧱 POST /api/landing-pages/:id/snapshot - Créer un snapshot (versionnage sans migration)
router.post('/:id/snapshot', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, label, organizationId, tree, settings, versions, snapshotId, snapshot, updatedSettings, updated, error_13;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                label = req.body.label;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                tree = _b.sent();
                if (!tree)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                settings = toJsonObject(tree.settings);
                versions = toSnapshots(settings._versions);
                snapshotId = "".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 6));
                snapshot = {
                    id: snapshotId,
                    label: label || "Snapshot ".concat(new Date().toLocaleString()),
                    createdAt: new Date().toISOString(),
                    content: toJsonObject(tree.metadata),
                    settings: toJsonObject(tree.settings)
                };
                updatedSettings = __assign(__assign({}, settings), { _versions: __spreadArray([snapshot], versions, true) });
                return [4 /*yield*/, prisma.treeBranchLeafTree.update({ where: { id: id }, data: { settings: updatedSettings } })];
            case 2:
                updated = _b.sent();
                res.json({ success: true, data: { id: updated.id, snapshotId: snapshotId } });
                return [3 /*break*/, 4];
            case 3:
                error_13 = _b.sent();
                console.error('❌ [LANDING] Erreur snapshot:', error_13);
                res.status(500).json({ success: false, message: 'Erreur lors de la création du snapshot' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🗂️ GET /api/landing-pages/:id/versions - Lister les versions
router.get('/:id/versions', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, tree, settings, versions, error_14;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                tree = _b.sent();
                if (!tree)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                settings = toJsonObject(tree.settings);
                versions = toSnapshots(settings._versions);
                res.json({
                    success: true,
                    data: versions.map(function (version) { return ({
                        id: version.id,
                        label: version.label,
                        createdAt: version.createdAt
                    }); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_14 = _b.sent();
                console.error('❌ [LANDING] Erreur versions:', error_14);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des versions' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ♻️ POST /api/landing-pages/:id/restore - Restaurer une version
router.post('/:id/restore', auth_js_1.authMiddleware, adminLandingRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, snapshotId_1, organizationId, tree, settings, versions, snap, updated, error_15;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                snapshotId_1 = req.body.snapshotId;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                if (!snapshotId_1)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'snapshotId requis' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ where: { id: id, organizationId: organizationId, category: 'landing' } })];
            case 1:
                tree = _b.sent();
                if (!tree)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Landing page non trouvée' })];
                settings = toJsonObject(tree.settings);
                versions = toSnapshots(settings._versions);
                snap = versions.find(function (version) { return version.id === snapshotId_1; });
                if (!snap)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Snapshot non trouvé' })];
                return [4 /*yield*/, prisma.treeBranchLeafTree.update({
                        where: { id: id },
                        data: {
                            metadata: snap.content,
                            settings: __assign(__assign({}, snap.settings), { _versions: versions })
                        }
                    })];
            case 2:
                updated = _b.sent();
                res.json({ success: true, data: { id: updated.id } });
                return [3 /*break*/, 4];
            case 3:
                error_15 = _b.sent();
                console.error('❌ [LANDING] Erreur restore:', error_15);
                res.status(500).json({ success: false, message: 'Erreur lors de la restauration' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

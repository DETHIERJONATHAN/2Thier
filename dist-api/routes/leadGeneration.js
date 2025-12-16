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
// 🎯 DEVIS1MINUTE - Routes Lead Generation
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var client_1 = require("@prisma/client");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🔒 RATE LIMITING
var leadGenRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requêtes par minute
    message: { success: false, message: 'Trop de requêtes lead generation' }
});
router.use(auth_js_1.authMiddleware);
router.use(leadGenRateLimit);
var getQueryString = function (value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value)) {
        var firstString = value.find(function (item) { return typeof item === 'string'; });
        if (firstString)
            return firstString;
    }
    return undefined;
};
var buildOriginFilter = function (origin) {
    if (origin !== 'd1m')
        return undefined;
    return {
        OR: [
            { NOT: { sourceId: null } },
            { source: { in: ['public-form', 'd1m', 'devis1minute', 'landing'] } }
        ]
    };
};
// 📊 GET /api/lead-generation/campaigns - Liste des campagnes
// Ici, nous mappions le concept de "campagne" sur LeadSource (modèle existant)
router.get('/campaigns', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId_1, sources, campaigns, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId_1 = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId_1) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                }
                return [4 /*yield*/, prisma.leadSource.findMany({
                        where: { organizationId: organizationId_1 },
                        include: {
                            _count: { select: { Lead: true } }
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                sources = _b.sent();
                return [4 /*yield*/, Promise.all(sources.map(function (s) { return __awaiter(void 0, void 0, void 0, function () {
                        var completedLeads, leadsGenerated, conversionRate;
                        var _a, _b, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0: return [4 /*yield*/, prisma.lead.count({
                                        where: { organizationId: organizationId_1, sourceId: s.id, status: 'completed' }
                                    })];
                                case 1:
                                    completedLeads = _d.sent();
                                    leadsGenerated = (_b = (_a = s._count) === null || _a === void 0 ? void 0 : _a.Lead) !== null && _b !== void 0 ? _b : 0;
                                    conversionRate = leadsGenerated > 0 ? Math.round((completedLeads / leadsGenerated) * 100) : 0;
                                    return [2 /*return*/, {
                                            id: s.id,
                                            name: s.name,
                                            description: (_c = s.description) !== null && _c !== void 0 ? _c : '',
                                            category: 'source',
                                            targetPostalCodes: [],
                                            budget: 0,
                                            spentBudget: 0,
                                            costPerLead: 0,
                                            status: s.isActive ? 'active' : 'paused',
                                            utmSource: '',
                                            utmMedium: '',
                                            utmCampaign: '',
                                            leadsGenerated: leadsGenerated,
                                            leadsPublished: 0,
                                            conversionRate: conversionRate,
                                            qualityScore: 0,
                                            createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date().toISOString(),
                                            startDate: undefined,
                                            endDate: undefined,
                                            isAutomatic: false,
                                            targetAudience: [],
                                            landingPageUrl: undefined
                                        }];
                            }
                        });
                    }); }))];
            case 2:
                campaigns = _b.sent();
                res.json({ success: true, data: campaigns });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                console.error('❌ [LEAD-GEN] Erreur récupération campagnes (LeadSource):', error_1);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des campagnes' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🎯 POST /api/lead-generation/campaigns - Créer une campagne
router.post('/campaigns', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, name_1, description, _b, isActive, created, error_2;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                _a = req.body, name_1 = _a.name, description = _a.description, _b = _a.isActive, isActive = _b === void 0 ? true : _b;
                if (!name_1)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Nom de campagne requis' })];
                return [4 /*yield*/, prisma.leadSource.create({
                        data: { organizationId: organizationId, name: name_1, description: description, isActive: Boolean(isActive) }
                    })];
            case 1:
                created = _d.sent();
                res.json({ success: true, data: created, message: 'Campagne créée avec succès' });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _d.sent();
                console.error('❌ [LEAD-GEN] Erreur création campagne (LeadSource):', error_2);
                res.status(500).json({ success: false, message: 'Erreur lors de la création de la campagne' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 📈 GET /api/lead-generation/stats - Statistiques globales
router.get('/stats', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, monthStart, originParam, originWhere, _a, totalCampaigns, activeCampaigns, totalLeads, thisMonthLeads, error_3;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                originParam = (_c = getQueryString(req.query.origin)) !== null && _c !== void 0 ? _c : 'd1m';
                originWhere = buildOriginFilter(originParam);
                return [4 /*yield*/, Promise.all([
                        prisma.leadSource.count({ where: { organizationId: organizationId } }),
                        prisma.leadSource.count({ where: { organizationId: organizationId, isActive: true } }),
                        prisma.lead.count({ where: __assign({ organizationId: organizationId }, (originWhere !== null && originWhere !== void 0 ? originWhere : {})) }),
                        prisma.lead.count({ where: __assign({ organizationId: organizationId, createdAt: { gte: monthStart } }, (originWhere !== null && originWhere !== void 0 ? originWhere : {})) })
                    ])];
            case 1:
                _a = _d.sent(), totalCampaigns = _a[0], activeCampaigns = _a[1], totalLeads = _a[2], thisMonthLeads = _a[3];
                res.json({ success: true, data: { totalCampaigns: totalCampaigns, activeCampaigns: activeCampaigns, totalLeads: totalLeads, thisMonthLeads: thisMonthLeads } });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _d.sent();
                console.error('❌ [LEAD-GEN] Erreur stats (LeadSource/Lead):', error_3);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🎯 PUT /api/lead-generation/campaigns/:id - Modifier campagne
router.put('/campaigns/:id', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, existing, _a, name_2, description, isActive, updated, error_4;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.leadSource.findFirst({ where: { id: id, organizationId: organizationId } })];
            case 1:
                existing = _c.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Campagne non trouvée' })];
                _a = req.body, name_2 = _a.name, description = _a.description, isActive = _a.isActive;
                return [4 /*yield*/, prisma.leadSource.update({ where: { id: id }, data: { name: name_2, description: description, isActive: isActive } })];
            case 2:
                updated = _c.sent();
                res.json({ success: true, data: updated, message: 'Campagne modifiée avec succès' });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _c.sent();
                console.error('❌ [LEAD-GEN] Erreur modification campagne (LeadSource):', error_4);
                res.status(500).json({ success: false, message: 'Erreur lors de la modification de la campagne' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🗑️ DELETE /api/lead-generation/campaigns/:id - Supprimer campagne
router.delete('/campaigns/:id', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, deleted, error_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.leadSource.deleteMany({ where: { id: id, organizationId: organizationId } })];
            case 1:
                deleted = _b.sent();
                if (deleted.count === 0)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Campagne non trouvée' })];
                res.json({ success: true, message: 'Campagne supprimée avec succès' });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _b.sent();
                console.error('❌ [LEAD-GEN] Erreur suppression campagne (LeadSource):', error_5);
                res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la campagne' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PATCH /api/lead-generation/campaigns/:id/status - changer statut (active/paused)
router.patch('/campaigns/:id/status', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, status_1, organizationId, target, updated, error_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                status_1 = req.body.status;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                if (!status_1)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Statut requis' })];
                return [4 /*yield*/, prisma.leadSource.findFirst({ where: { id: id, organizationId: organizationId } })];
            case 1:
                target = _b.sent();
                if (!target)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Campagne non trouvée' })];
                return [4 /*yield*/, prisma.leadSource.update({ where: { id: id }, data: { isActive: status_1 === 'active' } })];
            case 2:
                updated = _b.sent();
                res.json({ success: true, data: updated, message: 'Statut mis à jour' });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _b.sent();
                console.error('❌ [LEAD-GEN] Erreur MAJ statut (LeadSource):', error_6);
                res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/lead-generation/campaigns/:id/duplicate - dupliquer une "campagne" (LeadSource)
router.post('/campaigns/:id/duplicate', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, source, copy, error_7;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.leadSource.findFirst({ where: { id: id, organizationId: organizationId } })];
            case 1:
                source = _b.sent();
                if (!source)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Campagne non trouvée' })];
                return [4 /*yield*/, prisma.leadSource.create({
                        data: {
                            organizationId: organizationId,
                            name: "".concat(source.name, " (Copie)"),
                            description: source.description,
                            color: source.color,
                            icon: source.icon,
                            isActive: false
                        }
                    })];
            case 2:
                copy = _b.sent();
                res.json({ success: true, data: copy, message: 'Campagne dupliquée avec succès' });
                return [3 /*break*/, 4];
            case 3:
                error_7 = _b.sent();
                console.error('❌ [LEAD-GEN] Erreur duplication campagne (LeadSource):', error_7);
                res.status(500).json({ success: false, message: 'Erreur lors de la duplication de la campagne' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 📈 GET /api/lead-generation/stats/timeseries?days=30
router.get('/stats/timeseries', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, daysParam, requestedDays, days, start, originParam, originWhere, leads, byDay, i, d, key, _i, leads_1, lead, key, rec, series, error_8;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                daysParam = getQueryString(req.query.days);
                requestedDays = Number.parseInt(daysParam !== null && daysParam !== void 0 ? daysParam : '30', 10);
                days = Math.min(365, Math.max(1, Number.isNaN(requestedDays) ? 30 : requestedDays));
                start = new Date();
                start.setDate(start.getDate() - (days - 1));
                start.setHours(0, 0, 0, 0);
                originParam = (_b = getQueryString(req.query.origin)) !== null && _b !== void 0 ? _b : 'd1m';
                originWhere = buildOriginFilter(originParam);
                return [4 /*yield*/, prisma.lead.findMany({
                        where: __assign({ organizationId: organizationId, createdAt: { gte: start } }, (originWhere !== null && originWhere !== void 0 ? originWhere : {})),
                        select: { createdAt: true, status: true }
                    })];
            case 1:
                leads = _c.sent();
                byDay = new Map();
                for (i = 0; i < days; i++) {
                    d = new Date(start.getTime());
                    d.setDate(start.getDate() + i);
                    key = d.toISOString().slice(0, 10);
                    byDay.set(key, { created: 0, completed: 0 });
                }
                for (_i = 0, leads_1 = leads; _i < leads_1.length; _i++) {
                    lead = leads_1[_i];
                    key = lead.createdAt instanceof Date ? lead.createdAt.toISOString().slice(0, 10) : new Date(lead.createdAt).toISOString().slice(0, 10);
                    rec = byDay.get(key);
                    if (rec) {
                        rec.created++;
                        if (lead.status === 'completed')
                            rec.completed++;
                    }
                }
                series = Array.from(byDay.entries()).map(function (_a) {
                    var date = _a[0], v = _a[1];
                    return ({ date: date, created: v.created, completed: v.completed });
                });
                res.json({ success: true, data: { start: start.toISOString(), days: days, series: series } });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _c.sent();
                console.error('❌ [LEAD-GEN] Erreur timeseries:', error_8);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des séries temporelles' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

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
// 🎯 DEVIS1MINUTE - Routes Dispatch (règles d'orientation)
var express_1 = require("express");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🔒 RATE LIMITING
var dispatchRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 60,
    message: { success: false, message: 'Trop de requêtes dispatch' }
});
router.use(auth_js_1.authMiddleware);
router.use(dispatchRateLimit);
// 📋 GET /api/dispatch/rules - Liste des règles (AutomationRule)
router.get('/rules', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, rules, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.automationRule.findMany({
                        where: { organizationId: organizationId },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                rules = _b.sent();
                res.json({ success: true, data: rules });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('❌ [DISPATCH] Erreur liste:', error_1);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des règles' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ➕ POST /api/dispatch/rules - Créer une règle
router.post('/rules', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, event_1, action, params, _b, active, created, error_2;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                _a = req.body, event_1 = _a.event, action = _a.action, params = _a.params, _b = _a.active, active = _b === void 0 ? true : _b;
                if (!event_1 || !action)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'event et action sont requis' })];
                return [4 /*yield*/, prisma.automationRule.create({ data: { organizationId: organizationId, event: event_1, action: action, params: params !== null && params !== void 0 ? params : {}, active: !!active } })];
            case 1:
                created = _d.sent();
                res.json({ success: true, data: created, message: 'Règle créée' });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _d.sent();
                console.error('❌ [DISPATCH] Erreur création:', error_2);
                res.status(500).json({ success: false, message: 'Erreur lors de la création de la règle' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ✏️ PUT /api/dispatch/rules/:id - Modifier une règle
router.put('/rules/:id', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, existing, _a, event_2, action, params, active, updated, error_3;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                id = req.params.id;
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.automationRule.findFirst({ where: { id: id, organizationId: organizationId } })];
            case 1:
                existing = _c.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Règle non trouvée' })];
                _a = req.body, event_2 = _a.event, action = _a.action, params = _a.params, active = _a.active;
                return [4 /*yield*/, prisma.automationRule.update({ where: { id: id }, data: { event: event_2, action: action, params: params, active: active } })];
            case 2:
                updated = _c.sent();
                res.json({ success: true, data: updated, message: 'Règle mise à jour' });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _c.sent();
                console.error('❌ [DISPATCH] Erreur mise à jour:', error_3);
                res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la règle' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🗑️ DELETE /api/dispatch/rules/:id - Supprimer une règle
router.delete('/rules/:id', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, organizationId, deleted, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, prisma.automationRule.deleteMany({ where: { id: id, organizationId: organizationId } })];
            case 1:
                deleted = _b.sent();
                if (!deleted.count)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Règle non trouvée' })];
                res.json({ success: true, message: 'Règle supprimée' });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                console.error('❌ [DISPATCH] Erreur suppression:', error_4);
                res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la règle' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🧪 POST /api/dispatch/simulate - Simuler une orientation simple
router.post('/simulate', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, lead, rules, matches, _i, rules_1, r, params, conds, score, total, _a, _b, _c, k, v, ratio, error_5;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                organizationId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                lead = req.body.lead;
                if (!lead)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'lead requis' })];
                return [4 /*yield*/, prisma.automationRule.findMany({ where: { organizationId: organizationId, active: true }, orderBy: { createdAt: 'asc' } })];
            case 1:
                rules = _e.sent();
                matches = [];
                for (_i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
                    r = rules_1[_i];
                    params = r.params || {};
                    conds = params.conditions && typeof params.conditions === 'object' ? params.conditions : {};
                    score = 0;
                    total = 0;
                    for (_a = 0, _b = Object.entries(conds); _a < _b.length; _a++) {
                        _c = _b[_a], k = _c[0], v = _c[1];
                        total++;
                        if (lead[k] === v)
                            score++;
                    }
                    ratio = total > 0 ? score / total : 0;
                    if (total === 0 || ratio >= 0.75) {
                        matches.push({ ruleId: r.id, action: r.action, score: Math.round(ratio * 100) });
                    }
                }
                res.json({ success: true, data: { matches: matches } });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _e.sent();
                console.error('❌ [DISPATCH] Erreur simulate:', error_5);
                res.status(500).json({ success: false, message: 'Erreur lors de la simulation' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

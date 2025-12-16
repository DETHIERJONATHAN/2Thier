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
// 🔌 DEVIS1MINUTE - État des intégrations (agrégateur)
var express_1 = require("express");
var crypto_1 = require("crypto");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
var rl = (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 60 });
router.use(auth_js_1.authMiddleware);
router.use(rl);
// 📊 GET /api/integrations/status - Synthèse des connecteurs/org
router.get('/status', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, google_1, telnyx, adPlatforms, status_1, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                return [4 /*yield*/, Promise.all([
                        prisma.googleWorkspaceConfig.findUnique({ where: { organizationId: organizationId } }),
                        prisma.telnyxConnection.findMany({ where: { organizationId: organizationId } }),
                        prisma.adPlatformIntegration.findMany({ where: { organizationId: organizationId } })
                    ])];
            case 1:
                _a = _d.sent(), google_1 = _a[0], telnyx = _a[1], adPlatforms = _a[2];
                status_1 = {
                    google: {
                        enabled: !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.enabled) || !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.isActive),
                        gmail: !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.gmailEnabled),
                        calendar: !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.calendarEnabled),
                        drive: !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.driveEnabled),
                        meet: !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.meetEnabled),
                        sheets: !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.sheetsEnabled),
                        voice: !!(google_1 === null || google_1 === void 0 ? void 0 : google_1.voiceEnabled),
                        lastSync: (_c = google_1 === null || google_1 === void 0 ? void 0 : google_1.updatedAt) !== null && _c !== void 0 ? _c : null
                    },
                    telnyx: {
                        connections: telnyx.map(function (t) { return ({ id: t.id, name: t.name, status: t.status, type: t.type }); }),
                        active: telnyx.some(function (t) { return t.status === 'active'; })
                    },
                    adPlatforms: adPlatforms.map(function (p) { return ({ id: p.id, platform: p.platform, name: p.name, status: p.status, lastSync: p.lastSync }); }),
                };
                res.json({ success: true, data: status_1 });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('❌ [INTEGRATIONS] Erreur status:', error_1);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération du statut des intégrations' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🔌 POST /api/integrations/ad-platform/connect - Connecter une plateforme Ads (Google/Meta)
router.post('/ad-platform/connect', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, _a, platform, name_1, credentials, config, existing, rec, error_2;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 6, , 7]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                _a = req.body, platform = _a.platform, name_1 = _a.name, credentials = _a.credentials, config = _a.config;
                if (!platform)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Paramètre platform requis' })];
                return [4 /*yield*/, prisma.adPlatformIntegration.findFirst({ where: { organizationId: organizationId, platform: platform } })];
            case 1:
                existing = _e.sent();
                rec = void 0;
                if (!existing) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.adPlatformIntegration.update({
                        where: { id: existing.id },
                        data: {
                            name: name_1 !== null && name_1 !== void 0 ? name_1 : existing.name,
                            credentials: (_c = credentials !== null && credentials !== void 0 ? credentials : existing.credentials) !== null && _c !== void 0 ? _c : Prisma.JsonNull,
                            config: (_d = config !== null && config !== void 0 ? config : existing.config) !== null && _d !== void 0 ? _d : Prisma.JsonNull,
                            status: 'connected',
                            active: true,
                            updatedAt: new Date()
                        }
                    })];
            case 2:
                rec = _e.sent();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, prisma.adPlatformIntegration.create({
                    data: {
                        id: (0, crypto_1.randomUUID)(),
                        organizationId: organizationId,
                        platform: platform,
                        name: name_1 || platform,
                        credentials: credentials !== null && credentials !== void 0 ? credentials : Prisma.JsonNull,
                        config: config !== null && config !== void 0 ? config : Prisma.JsonNull,
                        status: 'connected',
                        active: true,
                        updatedAt: new Date()
                    }
                })];
            case 4:
                rec = _e.sent();
                _e.label = 5;
            case 5:
                res.json({ success: true, data: { id: rec.id } });
                return [3 /*break*/, 7];
            case 6:
                error_2 = _e.sent();
                console.error('❌ [INTEGRATIONS] Erreur connect:', error_2);
                res.status(500).json({ success: false, message: 'Erreur connexion plateforme' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// 🔌 POST /api/integrations/ad-platform/disconnect - Déconnecter une plateforme Ads
router.post('/ad-platform/disconnect', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, platform, existing, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                platform = req.body.platform;
                if (!platform)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Paramètre platform requis' })];
                return [4 /*yield*/, prisma.adPlatformIntegration.findFirst({ where: { organizationId: organizationId, platform: platform } })];
            case 1:
                existing = _b.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Intégration non trouvée' })];
                return [4 /*yield*/, prisma.adPlatformIntegration.update({
                        where: { id: existing.id },
                        data: { status: 'disconnected', active: false, updatedAt: new Date() }
                    })];
            case 2:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('❌ [INTEGRATIONS] Erreur disconnect:', error_3);
                res.status(500).json({ success: false, message: 'Erreur déconnexion plateforme' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🔄 POST /api/integrations/ad-platform/sync - Marquer une sync (placeholder, sans appels externes)
router.post('/ad-platform/sync', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, platform, existing, rec, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Organization ID manquant' })];
                platform = req.body.platform;
                if (!platform)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Paramètre platform requis' })];
                return [4 /*yield*/, prisma.adPlatformIntegration.findFirst({ where: { organizationId: organizationId, platform: platform } })];
            case 1:
                existing = _b.sent();
                if (!existing)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Intégration non trouvée' })];
                return [4 /*yield*/, prisma.adPlatformIntegration.update({ where: { id: existing.id }, data: { lastSync: new Date(), updatedAt: new Date() } })];
            case 2:
                rec = _b.sent();
                res.json({ success: true, data: { id: rec.id, lastSync: rec.lastSync } });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _b.sent();
                console.error('❌ [INTEGRATIONS] Erreur sync:', error_4);
                res.status(500).json({ success: false, message: 'Erreur lors de la synchronisation' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

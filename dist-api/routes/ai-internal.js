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
var express_1 = __importDefault(require("express"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var client_1 = require("@prisma/client");
var auth_1 = require("../middlewares/auth");
var crypto_1 = require("crypto");
// NOTE: On utilise authMiddleware + requireSuperAdmin pour protéger strictement.
var prisma = new client_1.PrismaClient();
var router = express_1.default.Router();
router.use(auth_1.authMiddleware);
router.use(auth_1.requireSuperAdmin);
// ---------- Logging interne (réutilise table AiUsageLog SANS migration) ----------
var internalLogTableEnsured = null;
function ensureAiLog() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (!internalLogTableEnsured) {
                internalLogTableEnsured = (function () { return __awaiter(_this, void 0, void 0, function () {
                    var e_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, prisma.$executeRawUnsafe("CREATE TABLE IF NOT EXISTS \"AiUsageLog\" (\n          id TEXT PRIMARY KEY,\n          \"userId\" TEXT NULL,\n          \"organizationId\" TEXT NULL,\n          type TEXT NOT NULL,\n          model TEXT NULL,\n          \"tokensPrompt\" INTEGER DEFAULT 0,\n          \"tokensOutput\" INTEGER DEFAULT 0,\n          \"latencyMs\" INTEGER NULL,\n          success BOOLEAN DEFAULT true,\n          \"errorCode\" TEXT NULL,\n          \"errorMessage\" TEXT NULL,\n          meta JSONB NULL,\n          \"createdAt\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n        );")];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                e_1 = _a.sent();
                                console.warn('[AI-INT] Impossible de garantir AiUsageLog:', e_1.message);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); })();
            }
            return [2 /*return*/, internalLogTableEnsured];
        });
    });
}
function logInternal(type, meta, content) {
    return __awaiter(this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, ensureAiLog()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, prisma.$executeRawUnsafe('INSERT INTO "AiUsageLog" (id, type, success, meta, "errorMessage") VALUES ($1,$2,$3,$4,$5);', (0, crypto_1.randomUUID)(), type, true, JSON.stringify(meta), content || null)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    console.warn('[AI-INT] logInternal failed:', e_2.message);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function parsePrismaSchema(schemaPath) {
    try {
        var content = fs_1.default.readFileSync(schemaPath, 'utf8');
        var models = [];
        var modelRegex = /model\s+(\w+)\s+{([\s\S]*?)}/g;
        var match = void 0;
        while ((match = modelRegex.exec(content))) {
            var name_1 = match[1];
            var body = match[2];
            var fields = body.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && !l.startsWith('//') && !l.startsWith('@@'); }).map(function (l) { return l.split(/\s+/)[0]; });
            models.push({ name: name_1, fields: fields });
        }
        return models;
    }
    catch (_a) {
        return []; // silencieux: snapshot partiel acceptable
    }
}
function scanRoutes(dir) {
    var out = [];
    try {
        var files = fs_1.default.readdirSync(dir); // simple, pas de récursivité profonde MVP
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var f = files_1[_i];
            if (!f.endsWith('.ts') && !f.endsWith('.js'))
                continue;
            var full = path_1.default.join(dir, f);
            var content = fs_1.default.readFileSync(full, 'utf8');
            var methods = Array.from(new Set(__spreadArray([], content.matchAll(/router\.(get|post|put|delete|patch)\(/g), true).map(function (m) { return m[1]; })));
            if (methods.length)
                out.push({ file: f, methods: methods });
        }
    }
    catch (_a) {
        // ignore échec scan routes
    }
    return out;
}
function buildSnapshot() {
    return __awaiter(this, void 0, void 0, function () {
        var timestamp, modules, prismaModels, apiRoutes, _a, users, leads, events, packages, pkg, versions;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    timestamp = new Date().toISOString();
                    return [4 /*yield*/, prisma.module.findMany({ select: { id: true, key: true, feature: true, label: true, route: true, isGlobal: true } })];
                case 1:
                    modules = _b.sent();
                    prismaModels = parsePrismaSchema(path_1.default.join(process.cwd(), 'prisma', 'schema.prisma'));
                    apiRoutes = scanRoutes(path_1.default.join(process.cwd(), 'src', 'routes'));
                    return [4 /*yield*/, Promise.all([
                            prisma.user.count(), prisma.lead.count(), prisma.calendarEvent.count()
                        ])];
                case 2:
                    _a = _b.sent(), users = _a[0], leads = _a[1], events = _a[2];
                    packages = {};
                    try {
                        pkg = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'package.json'), 'utf8'));
                        packages = __assign(__assign({}, (pkg.dependencies || {})), (pkg.devDependencies || {}));
                    }
                    catch ( /* ignore lecture package.json */_c) { /* ignore lecture package.json */ }
                    versions = { node: process.version, packages: packages };
                    return [2 /*return*/, { timestamp: timestamp, modules: modules, prismaModels: prismaModels, apiRoutes: apiRoutes, metrics: { users: users, leads: leads, events: events }, versions: versions }];
            }
        });
    });
}
// ---------- /snapshot ----------
router.get('/snapshot', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var snap, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, buildSnapshot()];
            case 1:
                snap = _a.sent();
                res.json({ success: true, data: snap });
                return [3 /*break*/, 3];
            case 2:
                e_3 = _a.sent();
                res.status(500).json({ success: false, error: 'Snapshot failed', details: e_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ---------- /analyze ----------
router.get('/analyze', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var snap, issues, routeNames_1, modulesSansRoute, emptyModels, recommendations, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, buildSnapshot()];
            case 1:
                snap = _a.sent();
                issues = [];
                routeNames_1 = new Set(snap.apiRoutes.map(function (r) { return r.file.replace(/\.(ts|js)$/, '').toLowerCase(); }));
                modulesSansRoute = snap.modules.filter(function (m) { return m.route && !Array.from(routeNames_1).some(function (r) { var _a; return (_a = m.route) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(r); }); });
                if (modulesSansRoute.length)
                    issues.push("".concat(modulesSansRoute.length, " module(s) avec route potentiellement absente: ").concat(modulesSansRoute.map(function (m) { return m.key; }).join(', ')));
                emptyModels = snap.prismaModels.filter(function (m) { return m.fields.length === 0; });
                if (emptyModels.length)
                    issues.push("Mod\u00E8les vides: ".concat(emptyModels.map(function (m) { return m.name; }).join(',')));
                // Taille base approximative (counts) -> alerte si > 10k leads
                if (snap.metrics.leads > 10000)
                    issues.push('Volume leads > 10k: prévoir index / archivage');
                recommendations = [];
                if (!issues.length)
                    recommendations.push('Structure saine au niveau des heuristiques de base.');
                if (snap.metrics.events === 0)
                    recommendations.push('Activer la capture d\'événements planning pour enrichir l\'IA.');
                res.json({ success: true, data: { snapshotTimestamp: snap.timestamp, issues: issues, recommendations: recommendations, metrics: snap.metrics, counts: { models: snap.prismaModels.length, routes: snap.apiRoutes.length, modules: snap.modules.length } } });
                return [3 /*break*/, 3];
            case 2:
                e_4 = _a.sent();
                res.status(500).json({ success: false, error: 'Analyze failed', details: e_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
// ---------- Mémoire Système (utilise AiUsageLog.type = system_memory) ----------
// POST /api/ai/internal/memory { content, topic?, tags?[] }
router.post('/memory', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var t0, _a, content, topic, tags, meta, e_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                t0 = Date.now();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                _a = req.body || {}, content = _a.content, topic = _a.topic, tags = _a.tags;
                if (!content || typeof content !== 'string')
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Champ content requis' })];
                meta = { kind: 'memory', topic: topic || null, tags: Array.isArray(tags) ? tags.slice(0, 8) : [], length: content.length };
                return [4 /*yield*/, logInternal('system_memory', __assign(__assign({}, meta), { op: 'add', ms: Date.now() - t0 }), content.slice(0, 5000))];
            case 2:
                _b.sent();
                res.json({ success: true, data: { stored: true } });
                return [3 /*break*/, 4];
            case 3:
                e_5 = _b.sent();
                res.status(500).json({ success: false, error: 'Memory add failed', details: e_5.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/ai/internal/memory?limit=&q=&tag=
router.get('/memory', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rawLimit, limit, q_1, tag_1, rows, filtered, e_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, ensureAiLog()];
            case 1:
                _a.sent();
                rawLimit = parseInt(String(req.query.limit || '50'), 10);
                limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
                q_1 = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
                tag_1 = typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';
                return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT id, \"createdAt\", meta, \"errorMessage\" FROM \"AiUsageLog\" WHERE type='system_memory' ORDER BY \"createdAt\" DESC LIMIT ".concat(limit))];
            case 2:
                rows = _a.sent();
                filtered = rows.filter(function (r) {
                    var meta = r.meta || {};
                    var content = r.errorMessage || '';
                    if (q_1 && !content.toLowerCase().includes(q_1) && !(meta.topic || '').toLowerCase().includes(q_1))
                        return false;
                    if (tag_1) {
                        var tags = (meta.tags || []).map(function (t) { return t.toLowerCase(); });
                        if (!tags.includes(tag_1))
                            return false;
                    }
                    return true;
                });
                res.json({ success: true, data: filtered.map(function (r) { var _a, _b; return ({ id: r.id, createdAt: r.createdAt, topic: ((_a = r.meta) === null || _a === void 0 ? void 0 : _a.topic) || null, tags: ((_b = r.meta) === null || _b === void 0 ? void 0 : _b.tags) || [], content: r.errorMessage }); }) });
                return [3 /*break*/, 4];
            case 3:
                e_6 = _a.sent();
                res.status(500).json({ success: false, error: 'Memory list failed', details: e_6.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ---------- Générateur de plan ----------
// POST /api/ai/internal/plan { objective: string, area?: string }
router.post('/plan', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    // Heuristique effort/impact
    function estimateEffort(step) {
        var l = step.length;
        return l > 120 ? 5 : l > 80 ? 4 : l > 50 ? 3 : l > 30 ? 2 : 1;
    }
    var t0, _a, objective_1, area, snap, baseSteps, steps, plan, e_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                t0 = Date.now();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                _a = req.body || {}, objective_1 = _a.objective, area = _a.area;
                if (!objective_1 || typeof objective_1 !== 'string')
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'objective requis' })];
                return [4 /*yield*/, buildSnapshot()];
            case 2:
                snap = _b.sent();
                baseSteps = [
                    "Analyse d\u00E9taill\u00E9e de la zone ".concat(area || 'générale', " et identification des points de friction"),
                    "Conception technique (sch\u00E9ma donn\u00E9es / patterns) pour: ".concat(objective_1.slice(0, 80)),
                    'Préparation patch(s) et refactor minimal sécurisé',
                    'Tests unitaires + scénarios de régression critiques',
                    'Déploiement progressif + monitoring + rollback plan documenté'
                ];
                steps = baseSteps.map(function (s, i) { return ({
                    id: 'S' + (i + 1),
                    title: s.split(':')[0].slice(0, 60),
                    description: s,
                    effort: estimateEffort(s),
                    impact: Math.min(5, 3 + i),
                    risk: i === 2 ? 'medium' : i === 4 ? 'low' : 'medium',
                    prerequisites: i === 0 ? [] : ['S' + i],
                    diffSketch: i === 2 ? "*** Begin Patch\n*** Update File: path/to/file.ts\n@@\n-old code\n+// TODO: Impl\u00E9mentation ".concat(objective_1.slice(0, 40), "\n*** End Patch") : undefined
                }); });
                plan = {
                    objective: objective_1,
                    area: area || null,
                    generatedAt: new Date().toISOString(),
                    stats: { models: snap.prismaModels.length, routes: snap.apiRoutes.length, modules: snap.modules.length },
                    steps: steps,
                    nextActions: ['Valider le périmètre', 'Créer branche feature', 'Démarrer implémentation étape S1'],
                    effortTotal: steps.reduce(function (a, b) { return a + b.effort; }, 0)
                };
                return [4 /*yield*/, logInternal('system_plan_generate', { ms: Date.now() - t0, objective: objective_1.slice(0, 80), area: area || null }, JSON.stringify(plan).slice(0, 4000))];
            case 3:
                _b.sent();
                res.json({ success: true, data: plan });
                return [3 /*break*/, 5];
            case 4:
                e_7 = _b.sent();
                res.status(500).json({ success: false, error: 'Plan generation failed', details: e_7.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });

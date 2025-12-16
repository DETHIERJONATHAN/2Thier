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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
// Implémentation MINIMALE restaurée pour éviter les 404 côté frontend
// et rétablir l'affichage des modules. Conçue pour être sûre et simple.
// TODO: Affiner la logique d'activation par organisation si nécessaire.
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
// Utilitaire: dériver une route cohérente à partir d'une clé si route absente.
// Règles:
//  - Préserver la route fournie si déjà présente (mais remplacer les underscores par des tirets)
//  - Si absente: / + key transformée (google_agenda => google-agenda)
//  - Garantir un leading '/'
function deriveRoute(key, provided) {
    if (!key && !provided)
        return null;
    var route = provided && provided.trim() !== '' ? provided.trim() : '';
    if (!route && key) {
        // Construire depuis la clé
        route = key.replace(/^google_/, 'google-').replace(/_/g, '-');
    }
    else if (route) {
        // Normaliser underscores
        route = route.replace(/_/g, '-');
        // Retirer double slash éventuel
        route = route.replace(/\/{2,}/g, '/');
        if (route.startsWith('/api/')) {
            // Ne pas normaliser les routes API ici
            return route;
        }
    }
    if (!route.startsWith('/'))
        route = '/' + route;
    return route;
}
function mapModule(m, orgStatuses, organizationId) {
    var _a, _b, _c, _d;
    // Statut global
    var activeGlobal = m.active !== false;
    var isActiveForOrg = undefined;
    if (organizationId) {
        // Si un organizationId est fourni, tenter de lire le status spécifique
        if (orgStatuses && orgStatuses[m.id] !== undefined) {
            isActiveForOrg = orgStatuses[m.id];
        }
        else if (m.organizationId && m.organizationId === organizationId) {
            // Module spécifique à l'organisation
            isActiveForOrg = activeGlobal;
        }
        else if (!m.organizationId) {
            // Module global sans statut spécifique enregistré → permissif
            isActiveForOrg = activeGlobal; // fallback true si actif globalement
        }
        else {
            // Module d'une autre organisation
            isActiveForOrg = false;
        }
    }
    return {
        id: m.id,
        key: m.key,
        label: m.label,
        feature: m.feature,
        icon: m.icon,
        route: m.route,
        description: m.description,
        page: m.page,
        order: (_a = m.order) !== null && _a !== void 0 ? _a : 0,
        active: activeGlobal,
        parameters: m.parameters, // 🔧 Inclure les paramètres
        organizationId: m.organizationId,
        isActiveForOrg: isActiveForOrg,
        // ✅ Ajouter les informations de catégorie
        category: ((_b = m.Category) === null || _b === void 0 ? void 0 : _b.name) || null,
        categoryIcon: ((_c = m.Category) === null || _c === void 0 ? void 0 : _c.icon) || null,
        categoryColor: ((_d = m.Category) === null || _d === void 0 ? void 0 : _d.iconColor) || null,
    };
}
// GET /api/modules?organizationId=xxx
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, modules, orgStatuses_1, statuses, mapped, filtered, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                organizationId = req.query.organizationId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.module.findMany({
                        orderBy: { order: 'asc' },
                        include: {
                            Category: {
                                select: {
                                    id: true,
                                    name: true,
                                    icon: true,
                                    iconColor: true
                                }
                            }
                        }
                    })];
            case 2:
                modules = _a.sent();
                orgStatuses_1 = null;
                if (!organizationId) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.organizationModuleStatus.findMany({
                        where: { organizationId: organizationId },
                        select: { moduleId: true, active: true },
                    })];
            case 3:
                statuses = _a.sent();
                orgStatuses_1 = statuses.reduce(function (acc, s) {
                    acc[s.moduleId] = s.active;
                    return acc;
                }, {});
                _a.label = 4;
            case 4:
                mapped = modules.map(function (m) { return mapModule(m, orgStatuses_1, organizationId); });
                filtered = organizationId
                    ? mapped.filter(function (m) { return !m.organizationId || m.organizationId === organizationId; })
                    : mapped;
                res.json({ success: true, data: filtered });
                return [3 /*break*/, 6];
            case 5:
                e_1 = _a.sent();
                console.error('[modules] GET / erreur', e_1);
                res.status(500).json({ success: false, message: 'Erreur récupération modules' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// GET /api/modules/all → tous les modules (mode super-admin vue globale)
router.get('/all', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var modules, mapped, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.module.findMany({
                        orderBy: { order: 'asc' },
                        include: {
                            Category: {
                                select: {
                                    id: true,
                                    name: true,
                                    icon: true,
                                    iconColor: true
                                }
                            }
                        }
                    })];
            case 1:
                modules = _a.sent();
                mapped = modules.map(function (m) { return mapModule(m, null); });
                res.json({ success: true, data: mapped });
                return [3 /*break*/, 3];
            case 2:
                e_2 = _a.sent();
                console.error('[modules] GET /all erreur', e_2);
                res.status(500).json({ success: false, message: 'Erreur récupération modules (all)' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PATCH /api/modules/status { moduleId, organizationId, active }
router.patch('/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, moduleId, organizationId, active, status_1, e_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, moduleId = _a.moduleId, organizationId = _a.organizationId, active = _a.active;
                if (!moduleId || !organizationId || typeof active !== 'boolean') {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Paramètres invalides' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.organizationModuleStatus.upsert({
                        where: { organizationId_moduleId: { organizationId: organizationId, moduleId: moduleId } },
                        update: { active: active },
                        create: { organizationId: organizationId, moduleId: moduleId, active: active },
                    })];
            case 2:
                status_1 = _b.sent();
                res.json({ success: true, data: status_1 });
                return [3 /*break*/, 4];
            case 3:
                e_3 = _b.sent();
                console.error('[modules] PATCH /status erreur', e_3);
                res.status(500).json({ success: false, message: 'Erreur mise à jour statut module' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/modules  (création)
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, key, label, feature, icon, route, description, page, order, active, organizationId, parameters, finalRoute, created, e_4, message;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, key = _a.key, label = _a.label, feature = _a.feature, icon = _a.icon, route = _a.route, description = _a.description, page = _a.page, order = _a.order, active = _a.active, organizationId = _a.organizationId, parameters = _a.parameters;
                if (!key || !label) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'key et label requis' })];
                }
                finalRoute = deriveRoute(key, route);
                return [4 /*yield*/, prisma.module.create({
                        data: {
                            key: key,
                            label: label,
                            feature: feature || key, // fallback
                            icon: icon || null,
                            route: finalRoute,
                            description: description || null,
                            page: page || null,
                            order: typeof order === 'number' ? order : 0,
                            active: active !== false,
                            parameters: parameters || null, // 🔧 Paramètres JSON
                            organizationId: organizationId || null,
                        },
                    })];
            case 1:
                created = _b.sent();
                res.json({ success: true, data: mapModule(created, null, organizationId) });
                return [3 /*break*/, 3];
            case 2:
                e_4 = _b.sent();
                message = e_4 instanceof Error ? e_4.message : 'Erreur inconnue';
                console.error('[modules] POST / erreur', e_4);
                res.status(500).json({ success: false, message: 'Erreur création module', detail: message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/modules/:id (mise à jour)
router.put('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, label, feature, icon, route, description, page, order, active, key, organizationId, parameters, categoryId, normalizedRoute, updated, e_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                _a = req.body, label = _a.label, feature = _a.feature, icon = _a.icon, route = _a.route, description = _a.description, page = _a.page, order = _a.order, active = _a.active, key = _a.key, organizationId = _a.organizationId, parameters = _a.parameters, categoryId = _a.categoryId;
                normalizedRoute = void 0;
                if (route !== undefined || key !== undefined) {
                    normalizedRoute = deriveRoute(key, route);
                }
                console.log("[modules] PUT /".concat(id, " - Mise \u00E0 jour module avec categoryId:"), categoryId);
                console.log("[modules] PUT /".concat(id, " - Body complet:"), req.body);
                return [4 /*yield*/, prisma.module.update({
                        where: { id: id },
                        data: {
                            label: label !== undefined ? label : undefined,
                            feature: feature !== undefined ? feature : undefined,
                            icon: icon !== undefined ? icon : undefined,
                            route: normalizedRoute !== undefined ? normalizedRoute : undefined,
                            description: description !== undefined ? description : undefined,
                            page: page !== undefined ? page : undefined,
                            order: order !== undefined ? order : undefined,
                            active: active !== undefined ? active : undefined,
                            parameters: parameters !== undefined ? parameters : undefined, // 🔧 Paramètres JSON
                            key: key !== undefined ? key : undefined,
                            organizationId: organizationId !== undefined ? organizationId : undefined,
                            categoryId: categoryId !== undefined ? categoryId : undefined,
                        },
                    })];
            case 2:
                updated = _b.sent();
                res.json({ success: true, data: mapModule(updated, null) });
                return [3 /*break*/, 4];
            case 3:
                e_5 = _b.sent();
                console.error('[modules] PUT /:id erreur', e_5);
                if ((e_5 === null || e_5 === void 0 ? void 0 : e_5.code) === 'P2002') {
                    return [2 /*return*/, res.status(409).json({ success: false, message: 'Conflit d\'unicité (clé ou feature déjà utilisée)' })];
                }
                res.status(500).json({ success: false, message: 'Erreur mise à jour module' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/modules/:id
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, deleted, e_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                // Supprimer d'abord les statuses organisation
                return [4 /*yield*/, prisma.organizationModuleStatus.deleteMany({ where: { moduleId: id } })];
            case 2:
                // Supprimer d'abord les statuses organisation
                _a.sent();
                return [4 /*yield*/, prisma.permission.deleteMany({ where: { moduleId: id } }).catch(function () { })];
            case 3:
                _a.sent(); // best effort
                return [4 /*yield*/, prisma.module.delete({ where: { id: id } })];
            case 4:
                deleted = _a.sent();
                res.json({ success: true, data: { id: deleted.id } });
                return [3 /*break*/, 6];
            case 5:
                e_6 = _a.sent();
                console.error('[modules] DELETE /:id erreur', e_6);
                res.status(500).json({ success: false, message: 'Erreur suppression module' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Health (optionnel)
router.get('/health', function (_req, res) { return res.json({ success: true, message: 'modules ok' }); });
exports.default = router;

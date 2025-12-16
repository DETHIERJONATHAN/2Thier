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
var express_1 = __importDefault(require("express"));
var auth_1 = require("../../../../../middlewares/auth");
var client_1 = require("@prisma/client");
var router = express_1.default.Router();
/**
 * 🔧 ENDPOINTS DE CONFIGURATION TBL (DYNAMIQUES)
 * Objectif: fournir 0 code en dur. Toutes les données proviennent de Prisma.
 *
 * Sources de vérité utilisées:
 * - treeBranchLeafNodeVariable      → variables exposées (exposedKey, displayName...)
 * - treeBranchLeafNode (fields)     → extraction des champs (leaf_*) pour construire une config minimale
 * - (calculation-modes)             → Pas encore de table dédiée: construit dynamiquement via heuristique de regroupement
 *
 * Contrats de réponse:
 * GET /api/tbl/variables -> { variables: Array<{ id, nodeId, exposedKey, displayName, sourceRef, displayFormat, unit, precision }> }
 * GET /api/tbl/fields -> { fields: Array<{ id, nodeId, type, label, required, defaultValue }> }
 * GET /api/tbl/calculation-modes -> { modes: Array<{ id, code, label, fields: Array<{ id, code, label, type, unit? }> }> }
 * GET /api/tbl/modes (alias)
 *
 * Filtres d'organisation:
 * - Si super_admin → visibilité globale
 * - Sinon → restreint aux nodes dont l'arbre appartient à l'organisation de l'utilisateur
 */
var prisma = new client_1.PrismaClient();
function getAuthCtx(req) {
    var _a, _b, _c;
    var role = (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || '').toLowerCase();
    // @ts-expect-error propriété potentielle côté backend
    var possibleFlag = (_b = req.user) === null || _b === void 0 ? void 0 : _b.isSuperAdmin;
    var isSuperAdmin = role === 'super_admin' || possibleFlag === true;
    var organizationId = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId) || null;
    return { isSuperAdmin: isSuperAdmin, organizationId: organizationId };
}
// ✅ Variables exposées dynamiques
router.get('/variables', auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, isSuperAdmin_1, organizationId_1, raw, variables, e_1, err;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), isSuperAdmin_1 = _a.isSuperAdmin, organizationId_1 = _a.organizationId;
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    treeId: true,
                                    TreeBranchLeafTree: { select: { organizationId: true } }
                                }
                            }
                        },
                        orderBy: { updatedAt: 'desc' }
                    })];
            case 1:
                raw = _b.sent();
                variables = raw
                    .filter(function (v) {
                    var _a, _b;
                    if (isSuperAdmin_1)
                        return true;
                    var nodeOrg = (_b = (_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                    return !organizationId_1 || !nodeOrg || nodeOrg === organizationId_1;
                })
                    .map(function (v) {
                    var _a, _b, _c, _d;
                    return ({
                        id: v.id,
                        nodeId: v.nodeId,
                        exposedKey: v.exposedKey,
                        displayName: v.displayName,
                        sourceRef: (_a = v.sourceRef) !== null && _a !== void 0 ? _a : null,
                        sourceType: (_b = v.sourceType) !== null && _b !== void 0 ? _b : null,
                        displayFormat: v.displayFormat,
                        unit: (_c = v.unit) !== null && _c !== void 0 ? _c : null,
                        precision: (_d = v.precision) !== null && _d !== void 0 ? _d : null,
                        updatedAt: v.updatedAt
                    });
                });
                return [2 /*return*/, res.json({ variables: variables, count: variables.length, source: 'database' })];
            case 2:
                e_1 = _b.sent();
                err = e_1;
                console.error('❌ [TBL API] Erreur GET /variables:', err.message, err.stack);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur serveur variables', details: err.message })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ✅ Modes / Capacités dynamiques (VRAIE détection, pas d'heuristique par unité)
// Règle: on dérive une "capacité" à partir de sourceRef / tables associées.
// Capacités: 1=neutre (variable simple), 2=formule, 3=condition, 4=tableau
// Réponse: { modes: [{ id, code, label, capacity, fields: [{ id, code, label, type, capacity }] }] }
router.get(['/calculation-modes', '/modes'], auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    function detectCapacity(sourceRef) {
        if (!sourceRef)
            return '1';
        if (sourceRef.startsWith('formula:'))
            return '2';
        if (sourceRef.startsWith('condition:'))
            return '3';
        if (sourceRef.startsWith('table:'))
            return '4';
        // UUID direct => neutre
        return '1';
    }
    var _a, isSuperAdmin_2, organizationId_2, rawVariables, accessible, capacityBuckets, _i, accessible_1, v, capacity, fieldType, f, capacityMeta_1, modes, e_2, err;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), isSuperAdmin_2 = _a.isSuperAdmin, organizationId_2 = _a.organizationId;
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    treeId: true,
                                    parentId: true,
                                    type: true,
                                    TreeBranchLeafTree: { select: { organizationId: true } }
                                }
                            }
                        }
                    })];
            case 1:
                rawVariables = _b.sent();
                accessible = rawVariables.filter(function (v) {
                    var _a, _b;
                    if (isSuperAdmin_2)
                        return true;
                    var nodeOrg = (_b = (_a = v.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                    return !organizationId_2 || !nodeOrg || nodeOrg === organizationId_2;
                });
                capacityBuckets = { '1': [], '2': [], '3': [], '4': [] };
                for (_i = 0, accessible_1 = accessible; _i < accessible_1.length; _i++) {
                    v = accessible_1[_i];
                    capacity = detectCapacity(v.sourceRef);
                    fieldType = (v.displayFormat || '').startsWith('number') ? 'number' : 'text';
                    f = {
                        id: v.id,
                        code: v.exposedKey || v.id,
                        label: v.displayName || v.exposedKey || v.id,
                        type: fieldType,
                        capacity: capacity,
                        sourceRef: v.sourceRef || null
                    };
                    capacityBuckets[capacity].push(f);
                }
                capacityMeta_1 = {
                    '1': { code: 'neutral', label: 'Variables neutres' },
                    '2': { code: 'formulas', label: 'Formules' },
                    '3': { code: 'conditions', label: 'Conditions' },
                    '4': { code: 'tables', label: 'Tableaux' }
                };
                modes = Object.entries(capacityBuckets)
                    .filter(function (_a) {
                    var list = _a[1];
                    return list.length > 0;
                })
                    .map(function (_a) {
                    var cap = _a[0], list = _a[1];
                    return ({
                        id: "capacity_".concat(cap),
                        code: capacityMeta_1[cap].code,
                        label: capacityMeta_1[cap].label,
                        capacity: cap,
                        fields: list.slice(0, 100) // limite de sécurité
                    });
                });
                // Si aucune variable → mode vide neutre
                if (modes.length === 0) {
                    modes.push({ id: 'capacity_1', code: 'neutral', label: 'Variables neutres', capacity: '1', fields: [] });
                }
                return [2 /*return*/, res.json({ modes: modes, count: modes.length, source: 'derived_capacity', generatedAt: new Date().toISOString() })];
            case 2:
                e_2 = _b.sent();
                err = e_2;
                console.error('❌ [TBL API] Erreur GET /calculation-modes (capacity detection):', err.message, err.stack);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur serveur calculation-modes', details: err.message })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ✅ Fields dynamiques: extraction des nodes de type leaf_* (ou avec hasData=true)
router.get('/fields', auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, isSuperAdmin_3, organizationId_3, nodes, filtered, fields, e_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = getAuthCtx(req), isSuperAdmin_3 = _a.isSuperAdmin, organizationId_3 = _a.organizationId;
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                        where: {
                            OR: [
                                { type: { startsWith: 'leaf_' } },
                                { hasData: true }
                            ]
                        },
                        select: {
                            id: true,
                            label: true,
                            type: true,
                            fieldType: true,
                            fieldSubType: true,
                            hasData: true,
                            treeId: true,
                            parentId: true,
                            order: true,
                            // 🏷️ COLONNES TOOLTIP - CRITIQUES POUR TBL
                            text_helpTooltipType: true,
                            text_helpTooltipText: true,
                            text_helpTooltipImage: true,
                            TreeBranchLeafTree: { select: { organizationId: true } }
                        },
                        orderBy: { updatedAt: 'desc' }
                    })];
            case 1:
                nodes = _b.sent();
                filtered = nodes.filter(function (n) {
                    var _a;
                    if (isSuperAdmin_3)
                        return true;
                    var nodeOrg = (_a = n.TreeBranchLeafTree) === null || _a === void 0 ? void 0 : _a.organizationId;
                    return !organizationId_3 || !nodeOrg || nodeOrg === organizationId_3;
                });
                fields = filtered.map(function (n) { return ({
                    id: n.id,
                    nodeId: n.id,
                    type: (n.fieldType || n.fieldSubType || n.type || '').replace(/^leaf_/, '') || 'text',
                    label: n.label || n.id,
                    required: false,
                    defaultValue: null,
                    category: n.fieldSubType || null,
                    order: n.order,
                    // 🏷️ DONNÉES TOOLTIP - ESSENTIELLES POUR TBL
                    text_helpTooltipType: n.text_helpTooltipType,
                    text_helpTooltipText: n.text_helpTooltipText,
                    text_helpTooltipImage: n.text_helpTooltipImage
                }); });
                return [2 /*return*/, res.json({ fields: fields, count: fields.length, source: 'database' })];
            case 2:
                e_3 = _b.sent();
                console.error('❌ [TBL API] Erreur GET /fields:', e_3);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur serveur fields' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/tbl/devis - Sauvegarder un devis TBL
router.post('/devis', auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, clientId, treeId, organizationId, userId, projectName, notes, isDraft, formData, metadata, devisId, payload;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        try {
            _a = req.body || {}, clientId = _a.clientId, treeId = _a.treeId, organizationId = _a.organizationId, userId = _a.userId, projectName = _a.projectName, notes = _a.notes, isDraft = _a.isDraft, formData = _a.formData, metadata = _a.metadata;
            if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId) && organizationId && req.user.organizationId !== organizationId) {
                return [2 /*return*/, res.status(403).json({ success: false, error: 'Accès refusé à cette organisation' })];
            }
            devisId = "tbl_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 9));
            payload = {
                devisId: devisId,
                clientId: clientId || null,
                treeId: treeId || null,
                organizationId: organizationId || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId) || null,
                userId: userId || ((_d = req.user) === null || _d === void 0 ? void 0 : _d.id) || null,
                projectName: projectName || "Projet TBL ".concat(new Date().toLocaleDateString()),
                notes: notes || '',
                isDraft: Boolean(isDraft),
                formData: typeof formData === 'object' && formData ? formData : {},
                metadata: __assign(__assign({}, (metadata || {})), { savedAt: new Date().toISOString(), version: '1.0' }),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            return [2 /*return*/, res.json(__assign(__assign({ success: true }, payload), { message: 'Devis TBL sauvegardé (simulation)' }))];
        }
        catch (error) {
            console.error('❌ [TBL API] Erreur sauvegarde devis:', error);
            return [2 /*return*/, res.status(500).json({ success: false, error: 'Erreur serveur lors de la sauvegarde du devis' })];
        }
        return [2 /*return*/];
    });
}); });
// ✅ Endpoint de santé / meta configuration TBL
router.get('/config/health', auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, varCount, formulaCount, conditionCount, tableCount, sample, capacityCounts, _i, sample_1, v, sr, e_4, err;
    var _b, _c, _d, _e, _f, _g, _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                _k.trys.push([0, 3, , 4]);
                return [4 /*yield*/, Promise.all([
                        prisma.treeBranchLeafNodeVariable.count(),
                        prisma.treeBranchLeafNodeFormula.count().catch(function () { return 0; }),
                        // @ts-expect-error table potentielle condition pas toujours générée
                        ((_e = (_c = (_b = prisma.treeBranchLeafNodeCondition) === null || _b === void 0 ? void 0 : _b.count) === null || _c === void 0 ? void 0 : (_d = _c.call(_b)).catch) === null || _e === void 0 ? void 0 : _e.call(_d, function () { return 0; })) || 0,
                        // @ts-expect-error table potentielle table pas toujours générée
                        ((_j = (_g = (_f = prisma.treeBranchLeafNodeTable) === null || _f === void 0 ? void 0 : _f.count) === null || _g === void 0 ? void 0 : (_h = _g.call(_f)).catch) === null || _j === void 0 ? void 0 : _j.call(_h, function () { return 0; })) || 0
                    ])];
            case 1:
                _a = _k.sent(), varCount = _a[0], formulaCount = _a[1], conditionCount = _a[2], tableCount = _a[3];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        select: { id: true, sourceRef: true },
                        take: 500,
                        orderBy: { updatedAt: 'desc' }
                    })];
            case 2:
                sample = _k.sent();
                capacityCounts = { '1': 0, '2': 0, '3': 0, '4': 0 };
                for (_i = 0, sample_1 = sample; _i < sample_1.length; _i++) {
                    v = sample_1[_i];
                    sr = v.sourceRef || '';
                    if (sr.startsWith('formula:'))
                        capacityCounts['2']++;
                    else if (sr.startsWith('condition:'))
                        capacityCounts['3']++;
                    else if (sr.startsWith('table:'))
                        capacityCounts['4']++;
                    else
                        capacityCounts['1']++;
                }
                return [2 /*return*/, res.json({
                        success: true,
                        timestamp: new Date().toISOString(),
                        counts: {
                            variables: varCount,
                            formulas: formulaCount,
                            conditions: conditionCount,
                            tables: tableCount
                        },
                        capacitySample: capacityCounts,
                        sampleSize: sample.length
                    })];
            case 3:
                e_4 = _k.sent();
                err = e_4;
                return [2 /*return*/, res.status(500).json({ success: false, error: 'Erreur health config', details: err.message })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/tbl/devis/client/:clientId - Récupérer les devis d'un client
router.get('/devis/client/:clientId', auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        try {
            // const { clientId } = req.params; // (non utilisé pour l'instant)
            // Pour l'instant, retourner un tableau vide
            res.json([]);
        }
        catch (error) {
            console.error('❌ [TBL API] Erreur récupération devis client:', error);
            res.status(500).json({
                error: 'Erreur serveur lors de la récupération des devis'
            });
        }
        return [2 /*return*/];
    });
}); });
// GET /api/tbl/devis/:devisId - Charger un devis spécifique
router.get('/devis/:devisId', auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var devisId;
    return __generator(this, function (_a) {
        try {
            devisId = req.params.devisId;
            // console.log('📖 [TBL API] Chargement devis:', devisId); // ✨ Log réduit
            // Pour l'instant, retourner un devis vide
            res.json({
                devisId: devisId,
                clientId: null,
                treeId: null,
                organizationId: null,
                userId: null,
                projectName: '',
                notes: '',
                isDraft: true,
                formData: {},
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('❌ [TBL API] Erreur chargement devis:', error);
            res.status(500).json({
                error: 'Erreur serveur lors du chargement du devis'
            });
        }
        return [2 /*return*/];
    });
}); });
// GET /api/clients/:clientId/access-check - Vérifier l'accès à un client
router.get('/clients/:clientId/access-check', auth_1.authMiddleware, (0, auth_1.requireRole)(['user', 'admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clientId, role;
    return __generator(this, function (_a) {
        try {
            clientId = req.params.clientId;
            role = (req.user || {}).role;
            // console.log('🔍 [TBL API] Vérification accès client:', { clientId, userRole: role }); // ✨ Log réduit
            // Pour l'instant, toujours autoriser l'accès
            res.json({
                hasAccess: true,
                clientId: clientId,
                userRole: role
            });
        }
        catch (error) {
            console.error('❌ [TBL API] Erreur vérification accès client:', error);
            res.status(500).json({
                error: 'Erreur serveur lors de la vérification d\'accès'
            });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;

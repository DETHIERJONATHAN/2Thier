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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
var auth_1 = require("../middlewares/auth");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Fallback SQL supprimés: on s’appuie désormais sur Prisma Client uniquement.
router.use(auth_1.authMiddleware);
function buildTree(nodes) {
    var byId = new Map(nodes.map(function (n) { return [n.id, __assign(__assign({}, n), { children: [] })]; }));
    var roots = [];
    nodes.forEach(function (n) {
        if (n.parentId && byId.has(n.parentId)) {
            var parent_1 = byId.get(n.parentId);
            parent_1.children.push(byId.get(n.id));
        }
        else {
            roots.push(byId.get(n.id));
        }
    });
    // trier par order
    var sortRec = function (arr) {
        arr.sort(function (a, b) { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 0) - ((_b = b.order) !== null && _b !== void 0 ? _b : 0); });
        arr.forEach(function (c) { return sortRec(c.children || []); });
    };
    sortRec(roots);
    return roots;
}
// GET /api/option-nodes/:id -> détails d'un nœud (incl. data)
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, node, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                return [4 /*yield*/, prisma.fieldOptionNode.findUnique({ where: { id: id }, select: { id: true, label: true, value: true, parentId: true, order: true, data: true, fieldId: true } })];
            case 1:
                node = _a.sent();
                if (!node)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Not found' })];
                return [2 /*return*/, res.json({ success: true, data: node })];
            case 2:
                e_1 = _a.sent();
                console.error('[API] GET option-node detail error:', e_1);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/option-nodes/field/:fieldId/tree -> arborescence complète
router.get('/field/:fieldId/tree', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, nodes, tree, childrenCount_1, enrich_1, enriched, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                fieldId = req.params.fieldId;
                return [4 /*yield*/, prisma.fieldOptionNode.findMany({
                        where: { fieldId: fieldId },
                        orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
                        select: { id: true, label: true, value: true, parentId: true, order: true, data: true },
                    })];
            case 1:
                nodes = _a.sent();
                tree = buildTree(nodes);
                childrenCount_1 = new Map();
                tree.forEach(function collect(n) {
                    n.children.forEach(function (c) { return collect(c); });
                    if (n.parentId) {
                        childrenCount_1.set(n.parentId, (childrenCount_1.get(n.parentId) || 0) + 1);
                    }
                });
                enrich_1 = function (n, pathIds, pathLabels) {
                    var nextIds = __spreadArray(__spreadArray([], pathIds, true), [n.id], false);
                    var nextLabels = __spreadArray(__spreadArray([], pathLabels, true), [n.label], false);
                    var children = n.children.map(function (c) { return enrich_1(c, nextIds, nextLabels); });
                    var dataObj = (n.data && typeof n.data === 'object') ? n.data : {};
                    var hasExtra = Object.prototype.hasOwnProperty.call(dataObj, 'nextField') && !!dataObj.nextField;
                    return {
                        id: n.id,
                        label: n.label,
                        value: n.value,
                        parentId: n.parentId,
                        order: n.order,
                        data: n.data,
                        children: children,
                        hasChildren: children.length > 0,
                        hasExtra: hasExtra,
                        pathIds: nextIds,
                        pathLabels: nextLabels,
                    };
                };
                enriched = tree.map(function (r) { return enrich_1(r, [], []); });
                return [2 /*return*/, res.json({ success: true, data: enriched, _v: 1 })];
            case 2:
                e_2 = _a.sent();
                console.error('[API] GET option-nodes tree error:', e_2);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/option-nodes/field/:fieldId/children?parentId=xxx
router.get('/field/:fieldId/children', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, parentId, base, children, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                fieldId = req.params.fieldId;
                parentId = req.query.parentId || null;
                return [4 /*yield*/, prisma.fieldOptionNode.findMany({ where: { fieldId: fieldId, parentId: parentId }, orderBy: { order: 'asc' } })];
            case 1:
                base = _a.sent();
                children = base.map(function (b) { var _a; return ({ id: b.id, label: b.label, value: (_a = b.value) !== null && _a !== void 0 ? _a : undefined }); });
                return [2 /*return*/, res.json({ success: true, data: children })];
            case 2:
                e_3 = _a.sent();
                console.error('[API] GET option-nodes children error:', e_3);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/option-nodes -> create
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, fieldId, parentId, label, value, order, data, created, e_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, fieldId = _a.fieldId, parentId = _a.parentId, label = _a.label, value = _a.value, order = _a.order, data = _a.data;
                if (!fieldId || !label)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'fieldId et label requis' })];
                return [4 /*yield*/, prisma.fieldOptionNode.create({
                        data: {
                            fieldId: fieldId,
                            parentId: parentId !== null && parentId !== void 0 ? parentId : null,
                            label: label,
                            value: value !== null && value !== void 0 ? value : label, // Use label as value if not provided
                            order: order !== null && order !== void 0 ? order : 0,
                            data: data !== null && data !== void 0 ? data : undefined
                        }
                    })];
            case 1:
                created = _b.sent();
                return [2 /*return*/, res.json({ success: true, data: created })];
            case 2:
                e_4 = _b.sent();
                console.error('[API] POST option-nodes create error:', e_4);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/option-nodes/:id -> update
router.put('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, label, value, order, data, parentId, updated, e_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, label = _a.label, value = _a.value, order = _a.order, data = _a.data, parentId = _a.parentId;
                return [4 /*yield*/, prisma.fieldOptionNode.update({ where: { id: id }, data: { label: label !== null && label !== void 0 ? label : undefined, value: value === undefined ? undefined : value, order: order !== null && order !== void 0 ? order : undefined, data: data === undefined ? undefined : data, parentId: parentId === undefined ? undefined : parentId } })];
            case 1:
                updated = _b.sent();
                return [2 /*return*/, res.json({ success: true, data: updated })];
            case 2:
                e_5 = _b.sent();
                console.error('[API] PUT option-nodes update error:', e_5);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/option-nodes/:id -> delete subtree or node only (query mode=with-children|only)
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, mode, node, collectIds_1, allIds, e_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                id = req.params.id;
                mode = req.query.mode || 'with-children';
                if (!(mode === 'only')) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.fieldOptionNode.findUnique({ where: { id: id }, select: { parentId: true } })];
            case 1:
                node = _a.sent();
                if (!node)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Not found' })];
                return [4 /*yield*/, prisma.$transaction([
                        prisma.fieldOptionNode.updateMany({ where: { parentId: id }, data: { parentId: node.parentId } }),
                        prisma.fieldOptionNode.delete({ where: { id: id } }),
                    ])];
            case 2:
                _a.sent();
                return [2 /*return*/, res.json({ success: true })];
            case 3:
                collectIds_1 = function (ids) { return __awaiter(void 0, void 0, void 0, function () {
                    var children, childIds, all;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, prisma.fieldOptionNode.findMany({ where: { parentId: { in: ids } }, select: { id: true } })];
                            case 1:
                                children = _a.sent();
                                if (children.length === 0)
                                    return [2 /*return*/, ids];
                                childIds = children.map(function (c) { return c.id; });
                                return [4 /*yield*/, collectIds_1(childIds)];
                            case 2:
                                all = _a.sent();
                                return [2 /*return*/, __spreadArray(__spreadArray([], ids, true), all, true)];
                        }
                    });
                }); };
                return [4 /*yield*/, collectIds_1([id])];
            case 4:
                allIds = _a.sent();
                return [4 /*yield*/, prisma.fieldOptionNode.deleteMany({ where: { id: { in: allIds } } })];
            case 5:
                _a.sent();
                return [2 /*return*/, res.json({ success: true })];
            case 6:
                e_6 = _a.sent();
                console.error('[API] DELETE option-nodes error:', e_6);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 7: return [2 /*return*/];
        }
    });
}); });
// POST /api/option-nodes/reorder -> réordonner sous un parent
router.post('/reorder', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, fieldId, orderedIds, e_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, fieldId = _a.fieldId, orderedIds = _a.orderedIds;
                if (!fieldId || !Array.isArray(orderedIds))
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Payload invalide' })];
                return [4 /*yield*/, prisma.$transaction(orderedIds.map(function (id, idx) { return prisma.fieldOptionNode.update({ where: { id: id }, data: { order: idx } }); }))];
            case 1:
                _b.sent();
                return [2 /*return*/, res.json({ success: true })];
            case 2:
                e_7 = _b.sent();
                console.error('[API] POST option-nodes reorder error:', e_7);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/option-nodes/import -> remplacer tout l'arbre d'un champ à partir d'un JSON
router.post('/import', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, fieldId_1, tree, inserts_1, walk_1, e_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, fieldId_1 = _a.fieldId, tree = _a.tree;
                if (!fieldId_1 || !Array.isArray(tree))
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Payload invalide' })];
                return [4 /*yield*/, prisma.fieldOptionNode.deleteMany({ where: { fieldId: fieldId_1 } })];
            case 1:
                _b.sent();
                inserts_1 = [];
                walk_1 = function (nodes, parentId) {
                    nodes.forEach(function (n, idx) {
                        var _a, _b;
                        var id = n.id || undefined; // laisser Prisma générer si absent
                        inserts_1.push(prisma.fieldOptionNode.create({ data: { id: id, fieldId: fieldId_1, parentId: parentId, label: n.label, value: (_a = n.value) !== null && _a !== void 0 ? _a : null, order: idx, data: (_b = n.data) !== null && _b !== void 0 ? _b : undefined } }));
                        if (Array.isArray(n.children) && n.children.length > 0) {
                            if (!n.id) {
                                throw new Error('Chaque nœud avec enfants doit fournir un id pour import');
                            }
                            walk_1(n.children, n.id);
                        }
                    });
                };
                walk_1(tree, null);
                return [4 /*yield*/, Promise.all(inserts_1)];
            case 2:
                _b.sent();
                return [2 /*return*/, res.json({ success: true })];
            case 3:
                e_8 = _b.sent();
                console.error('[API] POST option-nodes import error:', e_8);
                return [2 /*return*/, res.status(500).json({ success: false, message: (e_8 === null || e_8 === void 0 ? void 0 : e_8.message) || 'Erreur serveur' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/option-nodes/export/:fieldId -> exporter l'arbre
router.get('/export/:fieldId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, nodes, e_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                fieldId = req.params.fieldId;
                return [4 /*yield*/, prisma.fieldOptionNode.findMany({ where: { fieldId: fieldId }, orderBy: [{ parentId: 'asc' }, { order: 'asc' }], select: { id: true, label: true, value: true, parentId: true, order: true, data: true } })];
            case 1:
                nodes = _a.sent();
                return [2 /*return*/, res.json({ success: true, data: buildTree(nodes) })];
            case 2:
                e_9 = _a.sent();
                console.error('[API] GET option-nodes export error:', e_9);
                return [2 /*return*/, res.status(500).json({ success: false, message: 'Erreur serveur' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

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
var express_1 = __importDefault(require("express"));
var client_1 = require("@prisma/client");
var auth_1 = require("../middleware/auth");
// NOTE: requireRole peut être importé si restriction fine nécessaire
// import { requireRole } from '../middleware/auth';
var prisma = new client_1.PrismaClient();
var router = express_1.default.Router();
function extractFormulaDependencies(tokens) {
    var deps = [];
    for (var _i = 0, _a = tokens || []; _i < _a.length; _i++) {
        var t = _a[_i];
        if (!t)
            continue;
        if (typeof t === 'object' && 'type' in t && t.type === 'ref' && typeof t.value === 'string') {
            deps.push(t.value);
        }
        else if (typeof t === 'string') {
            var m = t.match(/@value\.[0-9a-fA-F-]{36}/g);
            if (m)
                m.forEach(function (ref) { return deps.push(ref.replace('@value.', '')); });
        }
    }
    return Array.from(new Set(deps));
}
// ConditionSet structure libre
function extractConditionDependencies(conditionSet) {
    if (!conditionSet || typeof conditionSet !== 'object')
        return [];
    var deps = new Set();
    var scan = function (obj) {
        if (!obj || typeof obj !== 'object')
            return;
        if (Array.isArray(obj)) {
            obj.forEach(scan);
            return;
        }
        // obj est un record
        var rec = obj;
        if (typeof rec.ref === 'string') {
            var cleaned = rec.ref.startsWith('@value.') ? rec.ref.substring(7) : rec.ref;
            deps.add(cleaned);
        }
        for (var _i = 0, _a = Object.keys(rec); _i < _a.length; _i++) {
            var k = _a[_i];
            scan(rec[k]);
        }
    };
    scan(conditionSet);
    return Array.from(deps);
}
/**
 * Résout les capabilities pour un tree donné.
 * Stratégie: charger variables + formules + conditions + tables en batch, puis fusionner par nodeId.
 */
function resolveCapabilities(treeId_1) {
    return __awaiter(this, arguments, void 0, function (treeId, opts) {
        var _a, variables, formulas, conditions, tables, formulaByNode, conditionByNode, tableByNode, capabilities, _i, variables_1, v, capacity, deps, formula, condition, table, cap;
        if (opts === void 0) { opts = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        prisma.treeBranchLeafNodeVariable.findMany({
                            where: { TreeBranchLeafNode: { treeId: treeId } },
                            select: {
                                id: true,
                                nodeId: true,
                                sourceRef: true,
                                sourceType: true,
                                exposedKey: true,
                                displayName: true,
                                fixedValue: true,
                                selectedNodeId: true
                            }
                        }),
                        prisma.treeBranchLeafNodeFormula.findMany({
                            where: { TreeBranchLeafNode: { treeId: treeId } },
                            select: { id: true, nodeId: true, tokens: true, name: true }
                        }),
                        prisma.treeBranchLeafNodeCondition.findMany({
                            where: { TreeBranchLeafNode: { treeId: treeId } },
                            select: { id: true, nodeId: true, conditionSet: true, name: true }
                        }),
                        prisma.treeBranchLeafNodeTable.findMany({
                            where: { TreeBranchLeafNode: { treeId: treeId } },
                            select: { id: true, nodeId: true, type: true, name: true, meta: true }
                        })
                    ])];
                case 1:
                    _a = _b.sent(), variables = _a[0], formulas = _a[1], conditions = _a[2], tables = _a[3];
                    formulaByNode = new Map();
                    formulas.forEach(function (f) { return formulaByNode.set(f.nodeId, f); });
                    conditionByNode = new Map();
                    conditions.forEach(function (c) { return conditionByNode.set(c.nodeId, c); });
                    tableByNode = new Map();
                    tables.forEach(function (t) { return tableByNode.set(t.nodeId, t); });
                    capabilities = [];
                    for (_i = 0, variables_1 = variables; _i < variables_1.length; _i++) {
                        v = variables_1[_i];
                        capacity = 'unknown';
                        deps = [];
                        // Détection par sourceRef si présent
                        if (v.sourceRef) {
                            if (v.sourceRef.startsWith('formula:') || v.sourceRef.startsWith('node-formula:'))
                                capacity = 'formula';
                            else if (v.sourceRef.startsWith('condition:'))
                                capacity = 'condition';
                            else if (v.sourceRef.startsWith('table:'))
                                capacity = 'table';
                            else if (v.sourceType === 'fixed' || v.fixedValue)
                                capacity = 'fixed';
                            else
                                capacity = 'data';
                        }
                        else if (v.fixedValue) {
                            capacity = 'fixed';
                        }
                        else {
                            // fallback: regarder existence de ressources associées au node
                            if (formulaByNode.has(v.nodeId))
                                capacity = 'formula';
                            else if (conditionByNode.has(v.nodeId))
                                capacity = 'condition';
                            else if (tableByNode.has(v.nodeId))
                                capacity = 'table';
                            else
                                capacity = 'data';
                        }
                        formula = formulaByNode.get(v.nodeId);
                        condition = conditionByNode.get(v.nodeId);
                        table = tableByNode.get(v.nodeId);
                        if (opts.extractDependencies) {
                            if (formula === null || formula === void 0 ? void 0 : formula.tokens)
                                deps = extractFormulaDependencies(formula.tokens);
                            else if (condition === null || condition === void 0 ? void 0 : condition.conditionSet)
                                deps = extractConditionDependencies(condition.conditionSet);
                            // Table dependencies: à définir plus tard (ex: références colonnes)
                        }
                        cap = {
                            nodeId: v.nodeId,
                            variableId: v.id,
                            sourceRef: v.sourceRef,
                            sourceType: v.sourceType,
                            exposedKey: v.exposedKey,
                            displayName: v.displayName,
                            fixedValue: v.fixedValue,
                            capacity: capacity,
                            hasFormula: !!formula,
                            hasCondition: !!condition,
                            hasTable: !!table,
                            dependencies: deps.length ? deps : undefined,
                            raw: opts.includeRaw ? { variable: v, formula: formula, condition: condition, table: table } : undefined
                        };
                        capabilities.push(cap);
                    }
                    return [2 /*return*/, capabilities];
            }
        });
    });
}
/**
 * GET /api/tbl/capabilities?treeId=xxx&raw=1&deps=1
 * Retourne la liste des capabilities pour toutes les variables d'un tree.
 */
router.get('/capabilities', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var treeId, includeRaw, extractDeps, data, error_1, err;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                treeId = String(req.query.treeId || '');
                if (!treeId) {
                    return [2 /*return*/, res.status(400).json({ error: 'treeId requis' })];
                }
                includeRaw = req.query.raw === '1' || req.query.raw === 'true';
                extractDeps = req.query.deps === '1' || req.query.deps === 'true';
                return [4 /*yield*/, resolveCapabilities(treeId, { includeRaw: includeRaw, extractDependencies: extractDeps })];
            case 1:
                data = _a.sent();
                res.json({
                    treeId: treeId,
                    count: data.length,
                    capabilities: data,
                    meta: {
                        extractedAt: new Date().toISOString(),
                        raw: includeRaw,
                        deps: extractDeps,
                        version: 'v1'
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                err = error_1;
                console.error('❌ [TBL Capabilities] Erreur:', err);
                res.status(500).json({ error: 'Erreur serveur capabilities', details: err.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

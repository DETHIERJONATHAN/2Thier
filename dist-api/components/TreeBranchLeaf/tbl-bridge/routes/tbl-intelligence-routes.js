"use strict";
/**
 * 🌐 TBL API V2.0 - ROUTES INTELLIGENTES
 *
 * ⚠️ AVERTISSEMENT : Ce fichier contient du code obsolète utilisant l'ancien CapacityCalculator.
 * Il a été partiellement migré vers operation-interpreter mais nécessite une refonte complète.
 *
 * Nouvelles routes API qui remplacent TOUT l'ancien système !
 * - Évaluation par codes TBL
 * - Résolution intelligente des dépendances
 * - Support complet formules/conditions/tableaux
 *
 * TODO: Refactoriser complètement pour utiliser operation-interpreter partout
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
var TBLEvaluationEngine_1 = __importDefault(require("../intelligence/TBLEvaluationEngine"));
var operation_interpreter_1 = require("../../treebranchleaf-new/api/operation-interpreter");
var router = express_1.default.Router();
console.log('🧠 [TBL INTELLIGENCE] Initialisation du routeur tbl-intelligence-routes (avec operation-interpreter)');
var evaluationEngine = new TBLEvaluationEngine_1.default();
// Petit helper interne pour log
function logRouteHit(route) {
    console.log("\uD83D\uDEF0\uFE0F  [TBL INTELLIGENCE] Hit ".concat(route, " @ ").concat(new Date().toISOString()));
}
/**
 * 🚀 POST /api/tbl/evaluate
 * Réactivée en mode MINIMAL pour ne pas bloquer le frontend.
 * Fournit uniquement un echo des éléments reçus + structure standard.
 */
router.post('/evaluate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var PrismaClient, prisma, _a, elementId, elementIds, _b, contextData, evalType, startedAt, results, traces, _i, elementIds_1, id, single, e_1, trace, resolvedNodeId, variable, byKey, node, formula, PrismaClient_1, prismaInstance, submissionId, valueMap, _c, _d, _e, key, value, valuesCache, labelMap, result, evalError_1, viaSourceFormula, viaSourceRaw, v, sr, capacity, result, e_2;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                logRouteHit('POST /api/tbl/evaluate');
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 1:
                PrismaClient = (_f.sent()).PrismaClient;
                prisma = new PrismaClient();
                _f.label = 2;
            case 2:
                _f.trys.push([2, 30, 31, 33]);
                _a = req.body || {}, elementId = _a.elementId, elementIds = _a.elementIds, _b = _a.contextData, contextData = _b === void 0 ? {} : _b, evalType = _a.evalType;
                if (!(Array.isArray(elementIds) && elementIds.length > 0)) return [3 /*break*/, 9];
                startedAt = Date.now();
                results = {};
                traces = {};
                _i = 0, elementIds_1 = elementIds;
                _f.label = 3;
            case 3:
                if (!(_i < elementIds_1.length)) return [3 /*break*/, 8];
                id = elementIds_1[_i];
                if (!id || typeof id !== 'string') {
                    results[id || ''] = { success: false, error: 'elementId invalide' };
                    return [3 /*break*/, 7];
                }
                _f.label = 4;
            case 4:
                _f.trys.push([4, 6, , 7]);
                return [4 /*yield*/, resolveSingleEvaluation(prisma, id, contextData)];
            case 5:
                single = _f.sent();
                results[id] = single.payload;
                traces[id] = single.trace;
                return [3 /*break*/, 7];
            case 6:
                e_1 = _f.sent();
                results[id] = { success: false, error: 'Erreur interne (batch item)', details: e_1 instanceof Error ? e_1.message : 'unknown' };
                return [3 /*break*/, 7];
            case 7:
                _i++;
                return [3 /*break*/, 3];
            case 8: return [2 /*return*/, res.json({
                    success: true,
                    mode: 'batch',
                    evalType: evalType || 'batch',
                    count: elementIds.length,
                    durationMs: Date.now() - startedAt,
                    results: results,
                    traces: traces
                })];
            case 9:
                // === MODE SINGLE ========================================================
                if (!elementId || typeof elementId !== 'string') {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Paramètre elementId manquant ou invalide (ni elementIds[] fourni).' })];
                }
                trace = [];
                resolvedNodeId = null;
                variable = null;
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } })];
            case 10:
                byKey = _f.sent();
                if (byKey) {
                    resolvedNodeId = byKey.nodeId;
                    variable = { exposedKey: byKey.exposedKey, displayName: byKey.displayName, sourceRef: byKey.sourceRef };
                    trace.push({ step: 'variable_exposedKey', info: 'Résolu via variable.exposedKey', success: true });
                }
                else {
                    trace.push({ step: 'variable_exposedKey', info: 'Aucune variable avec cet exposedKey', success: false });
                }
                if (!!resolvedNodeId) return [3 /*break*/, 12];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: elementId }, select: { id: true } })];
            case 11:
                node = _f.sent();
                if (node) {
                    resolvedNodeId = node.id;
                    trace.push({ step: 'node_direct', info: 'Correspondance trouvée dans TreeBranchLeafNode', success: true });
                }
                else {
                    trace.push({ step: 'node_direct', info: 'Pas de node avec cet id', success: false });
                }
                _f.label = 12;
            case 12:
                if (!!resolvedNodeId) return [3 /*break*/, 21];
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: elementId },
                        select: { id: true, nodeId: true, name: true, tokens: true }
                    })];
            case 13:
                formula = _f.sent();
                if (!formula) return [3 /*break*/, 20];
                resolvedNodeId = formula.nodeId;
                trace.push({ step: 'formula_id', info: "Formule trouv\u00E9e: ".concat(formula.name), success: true });
                _f.label = 14;
            case 14:
                _f.trys.push([14, 18, , 19]);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 15:
                PrismaClient_1 = (_f.sent()).PrismaClient;
                prismaInstance = new PrismaClient_1();
                submissionId = contextData.submissionId || 'temp-evaluation';
                valueMap = new Map();
                for (_c = 0, _d = Object.entries(contextData); _c < _d.length; _c++) {
                    _e = _d[_c], key = _e[0], value = _e[1];
                    valueMap.set(key, value);
                    if (!key.startsWith('@')) {
                        valueMap.set("@value.".concat(key), value);
                    }
                }
                console.log("\uD83E\uDDEE [TBL EVALUATE] \u00C9valuation directe formule: ".concat(formula.name, " (").concat(formula.id, ")"));
                valuesCache = new Map();
                labelMap = new Map();
                return [4 /*yield*/, (0, operation_interpreter_1.interpretFormula)(formula.id, submissionId, prismaInstance, valuesCache, 0, valueMap, labelMap)];
            case 16:
                result = _f.sent();
                return [4 /*yield*/, prismaInstance.$disconnect()];
            case 17:
                _f.sent();
                trace.push({ step: 'formula_direct_eval', info: "R\u00E9sultat: ".concat(result.result), success: true });
                return [2 /*return*/, res.json({
                        success: true,
                        type: 'formula',
                        capacity: '2',
                        value: result.result,
                        humanText: result.humanText,
                        details: result.details,
                        trace: trace
                    })];
            case 18:
                evalError_1 = _f.sent();
                console.error("\u274C [TBL EVALUATE] Erreur \u00E9valuation directe formule:", evalError_1);
                trace.push({ step: 'formula_direct_eval', info: "Erreur: ".concat(evalError_1 instanceof Error ? evalError_1.message : 'unknown'), success: false });
                return [3 /*break*/, 19];
            case 19: return [3 /*break*/, 21];
            case 20:
                trace.push({ step: 'formula_id', info: 'Aucune formule avec cet id', success: false });
                _f.label = 21;
            case 21:
                if (!!resolvedNodeId) return [3 /*break*/, 23];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: "formula:".concat(elementId) }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } })];
            case 22:
                viaSourceFormula = _f.sent();
                if (viaSourceFormula) {
                    resolvedNodeId = viaSourceFormula.nodeId;
                    variable = { exposedKey: viaSourceFormula.exposedKey, displayName: viaSourceFormula.displayName, sourceRef: viaSourceFormula.sourceRef };
                    trace.push({ step: 'variable_sourceRef_formula', info: 'Résolu via variable.sourceRef=formula:<id>', success: true });
                }
                else {
                    trace.push({ step: 'variable_sourceRef_formula', info: 'Aucune variable.sourceRef=formula:<id>', success: false });
                }
                _f.label = 23;
            case 23:
                if (!!resolvedNodeId) return [3 /*break*/, 25];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } })];
            case 24:
                viaSourceRaw = _f.sent();
                if (viaSourceRaw) {
                    resolvedNodeId = viaSourceRaw.nodeId;
                    variable = { exposedKey: viaSourceRaw.exposedKey, displayName: viaSourceRaw.displayName, sourceRef: viaSourceRaw.sourceRef };
                    trace.push({ step: 'variable_sourceRef_raw', info: 'Résolu via variable.sourceRef = id', success: true });
                }
                else {
                    trace.push({ step: 'variable_sourceRef_raw', info: 'Aucune variable.sourceRef = id', success: false });
                }
                _f.label = 25;
            case 25:
                if (!resolvedNodeId) {
                    return [2 /*return*/, res.status(422).json({
                            success: false,
                            error: 'Impossible de résoudre elementId',
                            code: 'ELEMENT_UNRESOLVED',
                            hint: 'Vérifier que la variable ou formule est créée avant l\'évaluation',
                            trace: trace
                        })];
                }
                if (!!variable) return [3 /*break*/, 27];
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({ where: { nodeId: resolvedNodeId }, select: { exposedKey: true, displayName: true, sourceRef: true } })];
            case 26:
                v = _f.sent();
                if (v) {
                    variable = { exposedKey: v.exposedKey, displayName: v.displayName, sourceRef: v.sourceRef };
                    trace.push({ step: 'variable_from_node', info: 'Variable trouvée via nodeId', success: true });
                }
                _f.label = 27;
            case 27:
                if (!variable || !variable.exposedKey) {
                    return [2 /*return*/, res.status(422).json({ success: false, error: 'Variable associée introuvable ou sans exposedKey', trace: trace })];
                }
                sr = variable.sourceRef || '';
                capacity = '1';
                if (sr.startsWith('formula:'))
                    capacity = '2';
                else if (sr.startsWith('condition:'))
                    capacity = '3';
                else if (sr.startsWith('table:'))
                    capacity = '4';
                trace.push({ step: 'capacity_detect', info: "Capacit\u00E9 d\u00E9tect\u00E9e=".concat(capacity), success: true });
                if (!(capacity === '2')) return [3 /*break*/, 29];
                return [4 /*yield*/, evaluationEngine.evaluate({
                        element_code: variable.exposedKey,
                        context_values: contextData,
                        evaluation_mode: 'auto',
                        deep_resolution: true
                    })];
            case 28:
                result = _f.sent();
                if (result.success) {
                    return [2 /*return*/, res.json({ success: true, type: 'formula', capacity: capacity, value: result.final_value, dependencies: result.dependencies_used, performance: result.performance, trace: trace })];
                }
                return [2 /*return*/, res.status(422).json({ success: false, type: 'formula', capacity: capacity, error: 'Échec moteur', details: result.errors, trace: trace })];
            case 29:
                if (capacity === '3') {
                    // TODO: implémenter moteur conditions
                    return [2 /*return*/, res.json({ success: true, type: 'condition', capacity: capacity, status: 'not_implemented', value: null, trace: trace })];
                }
                if (capacity === '4') {
                    // TODO: implémenter moteur tableaux
                    return [2 /*return*/, res.json({ success: true, type: 'table', capacity: capacity, status: 'not_implemented', value: null, trace: trace })];
                }
                // Neutre
                return [2 /*return*/, res.json({ success: true, type: 'neutral', capacity: capacity, value: null, trace: trace })];
            case 30:
                e_2 = _f.sent();
                console.error('💥 [TBL INTELLIGENCE] Erreur /evaluate:', e_2);
                return [2 /*return*/, res.status(500).json({ success: false, error: 'Erreur interne /evaluate', details: e_2 instanceof Error ? e_2.message : 'unknown' })];
            case 31: return [4 /*yield*/, prisma.$disconnect()];
            case 32:
                _f.sent();
                return [7 /*endfinally*/];
            case 33: return [2 /*return*/];
        }
    });
}); });
function resolveSingleEvaluation(prisma, elementId, contextData) {
    return __awaiter(this, void 0, void 0, function () {
        var evaluationEngine, trace, resolvedNodeId, variable, byKey, node, formula, PrismaClient, prismaInstance, submissionId, valueMap, _i, _a, _b, key, value, valuesCache, labelMap, result, evalError_2, viaSourceFormula, viaSourceRaw, v, sr, capacity, PrismaClient, prismaInstance, formulaId, submissionId, allNodes, labelToNodeId, _c, allNodes_1, node, valueMap, _d, _e, _f, key, value, nodeId, valuesCache, labelMap, result, error_1, result, PrismaClient, prismaInstance, conditionId, submissionId, allNodes, labelToNodeId, nodeIdToLabel, _g, allNodes_2, node, valueMap, _h, _j, _k, key, value, nodeId, valuesCache, labelMap, result, error_2;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    evaluationEngine = new TBLEvaluationEngine_1.default();
                    trace = [];
                    resolvedNodeId = null;
                    variable = null;
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } })];
                case 1:
                    byKey = _l.sent();
                    if (byKey) {
                        resolvedNodeId = byKey.nodeId;
                        variable = { exposedKey: byKey.exposedKey, displayName: byKey.displayName, sourceRef: byKey.sourceRef };
                        trace.push({ step: 'variable_exposedKey', info: 'Résolu via variable.exposedKey', success: true });
                    }
                    else {
                        trace.push({ step: 'variable_exposedKey', info: 'Aucune variable avec cet exposedKey', success: false });
                    }
                    if (!!resolvedNodeId) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: elementId }, select: { id: true } })];
                case 2:
                    node = _l.sent();
                    if (node) {
                        resolvedNodeId = node.id;
                        trace.push({ step: 'node_direct', info: 'Correspondance trouvée dans TreeBranchLeafNode', success: true });
                    }
                    else {
                        trace.push({ step: 'node_direct', info: 'Pas de node avec cet id', success: false });
                    }
                    _l.label = 3;
                case 3:
                    if (!!resolvedNodeId) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: elementId },
                            select: { id: true, nodeId: true, name: true, tokens: true }
                        })];
                case 4:
                    formula = _l.sent();
                    if (!formula) return [3 /*break*/, 11];
                    resolvedNodeId = formula.nodeId;
                    trace.push({ step: 'formula_id', info: "Formule trouv\u00E9e: ".concat(formula.name), success: true });
                    _l.label = 5;
                case 5:
                    _l.trys.push([5, 9, , 10]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
                case 6:
                    PrismaClient = (_l.sent()).PrismaClient;
                    prismaInstance = new PrismaClient();
                    submissionId = contextData.submissionId || 'temp-evaluation';
                    valueMap = new Map();
                    for (_i = 0, _a = Object.entries(contextData); _i < _a.length; _i++) {
                        _b = _a[_i], key = _b[0], value = _b[1];
                        valueMap.set(key, value);
                        if (!key.startsWith('@')) {
                            valueMap.set("@value.".concat(key), value);
                        }
                    }
                    console.log("\uD83E\uDDEE [TBL EVALUATE BATCH] \u00C9valuation directe formule: ".concat(formula.name, " (").concat(formula.id, ")"));
                    valuesCache = new Map();
                    labelMap = new Map();
                    return [4 /*yield*/, (0, operation_interpreter_1.interpretFormula)(formula.id, submissionId, prismaInstance, valuesCache, 0, valueMap, labelMap)];
                case 7:
                    result = _l.sent();
                    return [4 /*yield*/, prismaInstance.$disconnect()];
                case 8:
                    _l.sent();
                    trace.push({ step: 'formula_direct_eval', info: "R\u00E9sultat: ".concat(result.result), success: true });
                    return [2 /*return*/, {
                            payload: {
                                success: true,
                                type: 'formula',
                                capacity: '2',
                                value: result.result,
                                humanText: result.humanText,
                                details: result.details
                            },
                            trace: trace
                        }];
                case 9:
                    evalError_2 = _l.sent();
                    console.error("\u274C [TBL EVALUATE BATCH] Erreur \u00E9valuation directe formule:", evalError_2);
                    trace.push({ step: 'formula_direct_eval', info: "Erreur: ".concat(evalError_2 instanceof Error ? evalError_2.message : 'unknown'), success: false });
                    return [3 /*break*/, 10];
                case 10: return [3 /*break*/, 12];
                case 11:
                    trace.push({ step: 'formula_id', info: 'Aucune formule avec cet id', success: false });
                    _l.label = 12;
                case 12:
                    if (!!resolvedNodeId) return [3 /*break*/, 14];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: "formula:".concat(elementId) }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } })];
                case 13:
                    viaSourceFormula = _l.sent();
                    if (viaSourceFormula) {
                        resolvedNodeId = viaSourceFormula.nodeId;
                        variable = { exposedKey: viaSourceFormula.exposedKey, displayName: viaSourceFormula.displayName, sourceRef: viaSourceFormula.sourceRef };
                        trace.push({ step: 'variable_sourceRef_formula', info: 'Résolu via variable.sourceRef=formula:<id>', success: true });
                    }
                    else {
                        trace.push({ step: 'variable_sourceRef_formula', info: 'Aucune variable.sourceRef=formula:<id>', success: false });
                    }
                    _l.label = 14;
                case 14:
                    if (!!resolvedNodeId) return [3 /*break*/, 16];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({ where: { sourceRef: elementId }, select: { nodeId: true, exposedKey: true, displayName: true, sourceRef: true } })];
                case 15:
                    viaSourceRaw = _l.sent();
                    if (viaSourceRaw) {
                        resolvedNodeId = viaSourceRaw.nodeId;
                        variable = { exposedKey: viaSourceRaw.exposedKey, displayName: viaSourceRaw.displayName, sourceRef: viaSourceRaw.sourceRef };
                        trace.push({ step: 'variable_sourceRef_raw', info: 'Résolu via variable.sourceRef = id', success: true });
                    }
                    else {
                        trace.push({ step: 'variable_sourceRef_raw', info: 'Aucune variable.sourceRef = id', success: false });
                    }
                    _l.label = 16;
                case 16:
                    if (!resolvedNodeId) {
                        return [2 /*return*/, { payload: { success: false, error: 'Impossible de résoudre elementId', trace: trace }, trace: trace }];
                    }
                    if (!!variable) return [3 /*break*/, 18];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({ where: { nodeId: resolvedNodeId }, select: { exposedKey: true, displayName: true, sourceRef: true } })];
                case 17:
                    v = _l.sent();
                    if (v) {
                        variable = { exposedKey: v.exposedKey, displayName: v.displayName, sourceRef: v.sourceRef };
                        trace.push({ step: 'variable_from_node', info: 'Variable trouvée via nodeId', success: true });
                    }
                    _l.label = 18;
                case 18:
                    if (!variable || !variable.exposedKey) {
                        return [2 /*return*/, { payload: { success: false, error: 'Variable associée introuvable ou sans exposedKey', trace: trace }, trace: trace }];
                    }
                    sr = variable.sourceRef || '';
                    capacity = '1';
                    if (sr.startsWith('formula:'))
                        capacity = '2';
                    else if (sr.startsWith('condition:'))
                        capacity = '3';
                    else if (sr.startsWith('table:'))
                        capacity = '4';
                    trace.push({ step: 'capacity_detect', info: "Capacit\u00E9 d\u00E9tect\u00E9e=".concat(capacity), success: true });
                    if (!(capacity === '2')) return [3 /*break*/, 26];
                    _l.label = 19;
                case 19:
                    _l.trys.push([19, 24, , 26]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
                case 20:
                    PrismaClient = (_l.sent()).PrismaClient;
                    prismaInstance = new PrismaClient();
                    formulaId = sr.replace(/^(formula:|node-formula:)/, '');
                    submissionId = contextData.submissionId || 'temp-evaluation';
                    return [4 /*yield*/, prismaInstance.treeBranchLeafNode.findMany({
                            select: { id: true, label: true }
                        })];
                case 21:
                    allNodes = _l.sent();
                    labelToNodeId = new Map();
                    for (_c = 0, allNodes_1 = allNodes; _c < allNodes_1.length; _c++) {
                        node = allNodes_1[_c];
                        labelToNodeId.set(node.label.toLowerCase(), node.id);
                    }
                    valueMap = new Map();
                    for (_d = 0, _e = Object.entries(contextData); _d < _e.length; _d++) {
                        _f = _e[_d], key = _f[0], value = _f[1];
                        valueMap.set(key, value);
                        // Aussi ajouter avec préfixe @value. pour compatibilité
                        if (!key.startsWith('@')) {
                            valueMap.set("@value.".concat(key), value);
                        }
                        nodeId = labelToNodeId.get(key.toLowerCase());
                        if (nodeId) {
                            valueMap.set(nodeId, value);
                            valueMap.set("@value.".concat(nodeId), value);
                        }
                    }
                    console.log("\uD83E\uDDEE [TBL EVALUATE] Utilisation de operation-interpreter pour formule: ".concat(formulaId));
                    console.log("   \uD83D\uDCCA ValueMap: ".concat(valueMap.size, " entr\u00E9es"));
                    valuesCache = new Map();
                    labelMap = new Map();
                    return [4 /*yield*/, (0, operation_interpreter_1.interpretFormula)(formulaId, submissionId, prismaInstance, valuesCache, 0, // depth
                        valueMap, labelMap)];
                case 22:
                    result = _l.sent();
                    return [4 /*yield*/, prismaInstance.$disconnect()];
                case 23:
                    _l.sent();
                    trace.push({ step: 'formula_interpret', info: "R\u00E9sultat: ".concat(result.result), success: true });
                    return [2 /*return*/, {
                            payload: {
                                success: true,
                                type: 'formula',
                                capacity: capacity,
                                value: result.result,
                                humanText: result.humanText,
                                details: result.details
                            },
                            trace: trace
                        }];
                case 24:
                    error_1 = _l.sent();
                    console.error("\u274C [TBL EVALUATE] Erreur interpretFormula:", error_1);
                    trace.push({ step: 'formula_interpret', info: "Erreur: ".concat(error_1 instanceof Error ? error_1.message : 'unknown'), success: false });
                    return [4 /*yield*/, evaluationEngine.evaluate({
                            element_code: variable.exposedKey,
                            context_values: contextData,
                            evaluation_mode: 'auto',
                            deep_resolution: true
                        })];
                case 25:
                    result = _l.sent();
                    if (result.success) {
                        return [2 /*return*/, { payload: { success: true, type: 'formula', capacity: capacity, value: result.final_value, dependencies: result.dependencies_used, performance: result.performance }, trace: trace }];
                    }
                    return [2 /*return*/, { payload: { success: false, type: 'formula', capacity: capacity, error: 'Échec moteur', details: result.errors }, trace: trace }];
                case 26:
                    if (!(capacity === '3')) return [3 /*break*/, 33];
                    _l.label = 27;
                case 27:
                    _l.trys.push([27, 32, , 33]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
                case 28:
                    PrismaClient = (_l.sent()).PrismaClient;
                    prismaInstance = new PrismaClient();
                    conditionId = sr.replace(/^condition:/, '');
                    submissionId = contextData.submissionId || 'temp-evaluation';
                    return [4 /*yield*/, prismaInstance.treeBranchLeafNode.findMany({
                            select: { id: true, label: true }
                        })];
                case 29:
                    allNodes = _l.sent();
                    labelToNodeId = new Map();
                    nodeIdToLabel = new Map();
                    for (_g = 0, allNodes_2 = allNodes; _g < allNodes_2.length; _g++) {
                        node = allNodes_2[_g];
                        labelToNodeId.set(node.label.toLowerCase(), node.id);
                        nodeIdToLabel.set(node.id, node.label);
                    }
                    valueMap = new Map();
                    for (_h = 0, _j = Object.entries(contextData); _h < _j.length; _h++) {
                        _k = _j[_h], key = _k[0], value = _k[1];
                        valueMap.set(key, value);
                        // Aussi ajouter avec préfixe @value. pour compatibilité
                        if (!key.startsWith('@')) {
                            valueMap.set("@value.".concat(key), value);
                        }
                        nodeId = labelToNodeId.get(key.toLowerCase());
                        if (nodeId) {
                            valueMap.set(nodeId, value);
                            valueMap.set("@value.".concat(nodeId), value);
                            console.log("   \uD83D\uDD17 Mapping label \"".concat(key, "\" \u2192 nodeId \"").concat(nodeId, "\" = ").concat(value));
                        }
                    }
                    console.log("\u2696\uFE0F [TBL EVALUATE] Utilisation de operation-interpreter pour condition: ".concat(conditionId));
                    console.log("   \uD83D\uDCCA ValueMap: ".concat(valueMap.size, " entr\u00E9es"));
                    valuesCache = new Map();
                    labelMap = new Map();
                    return [4 /*yield*/, (0, operation_interpreter_1.interpretCondition)(conditionId, submissionId, prismaInstance, valuesCache, 0, // depth
                        valueMap, labelMap)];
                case 30:
                    result = _l.sent();
                    return [4 /*yield*/, prismaInstance.$disconnect()];
                case 31:
                    _l.sent();
                    trace.push({ step: 'condition_interpret', info: "R\u00E9sultat: ".concat(result.result), success: true });
                    return [2 /*return*/, {
                            payload: {
                                success: true,
                                type: 'condition',
                                capacity: capacity,
                                value: result.result,
                                humanText: result.humanText,
                                details: result.details
                            },
                            trace: trace
                        }];
                case 32:
                    error_2 = _l.sent();
                    console.error("\u274C [TBL EVALUATE] Erreur interpretCondition:", error_2);
                    trace.push({ step: 'condition_interpret', info: "Erreur: ".concat(error_2 instanceof Error ? error_2.message : 'unknown'), success: false });
                    return [2 /*return*/, { payload: { success: false, type: 'condition', capacity: capacity, error: 'Échec évaluation condition', details: error_2 instanceof Error ? error_2.message : 'unknown' }, trace: trace }];
                case 33:
                    if (capacity === '4') {
                        return [2 /*return*/, { payload: { success: true, type: 'table', capacity: capacity, status: 'not_implemented', value: null }, trace: trace }];
                    }
                    return [2 /*return*/, { payload: { success: true, type: 'neutral', capacity: capacity, value: null }, trace: trace }];
            }
        });
    });
}
// Route de debug pour confirmer le montage côté serveur
router.get('/_debug_list', function (req, res) {
    logRouteHit('GET /api/tbl/_debug_list');
    return res.json({
        routes: [
            'POST /api/tbl/evaluate (minimal)',
            'POST /api/tbl/evaluate/formula/:tblCode (disabled)',
            'POST /api/tbl/condition (✅ ACTIVE avec CapacityCalculator)',
            'POST /api/tbl/evaluate/condition/:tblCode (✅ ACTIVE avec CapacityCalculator)',
            'POST /api/tbl/evaluate/table/:tblCode (disabled)',
            'GET /api/tbl/analyze/:tblCode (disabled)',
            'GET /api/tbl/status (disabled)'
        ],
        timestamp: new Date().toISOString()
    });
});
/**
 * 🧮 POST /api/tbl/evaluate/formula/:tblCode
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.post('/evaluate/formula/:tblCode', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' })];
    });
}); });
/**
 * ⚖️ POST /api/tbl/condition
 * RÉACTIVÉE avec CapacityCalculator
 */
router.post('/condition', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, elementId, _b, contextData, _c, submissionId, calculator, context, result, error_3;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                logRouteHit('POST /api/tbl/condition');
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                _a = req.body || {}, elementId = _a.elementId, _b = _a.contextData, contextData = _b === void 0 ? {} : _b, _c = _a.submissionId, submissionId = _c === void 0 ? 'df833cac-0b44-4b2b-bb1c-de3878f00182' : _c;
                if (!elementId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'elementId requis'
                        })];
                }
                console.log('🔧 [TBL CONDITION] Évaluation avec CapacityCalculator:', elementId);
                calculator = new CapacityCalculator();
                context = {
                    submissionId: submissionId,
                    organizationId: 'test-org',
                    userId: 'test-user'
                };
                return [4 /*yield*/, calculator.evaluateCondition(elementId, context)];
            case 2:
                result = _d.sent();
                console.log('✅ [TBL CONDITION] Résultat CapacityCalculator:', result);
                return [2 /*return*/, res.json({
                        success: true,
                        evaluation: result,
                        elementId: elementId,
                        timestamp: new Date().toISOString()
                    })];
            case 3:
                error_3 = _d.sent();
                console.error('❌ [TBL CONDITION] Erreur:', error_3);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_3 instanceof Error ? error_3.message : 'unknown'
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * ⚖️ POST /api/tbl/evaluate/condition/:tblCode
 * RÉACTIVÉE avec CapacityCalculator
 */
router.post('/evaluate/condition/:tblCode', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tblCode, _a, submissionId, PrismaClient, prisma, conditionRecord, result, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logRouteHit('POST /api/tbl/evaluate/condition/:tblCode');
                tblCode = req.params.tblCode;
                _a = (req.body || {}).submissionId, submissionId = _a === void 0 ? 'df833cac-0b44-4b2b-bb1c-de3878f00182' : _a;
                if (!tblCode) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'tblCode requis'
                        })];
                }
                console.log('🔧 [TBL EVALUATE CONDITION] Évaluation avec operation-interpreter:', tblCode);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 1:
                PrismaClient = (_b.sent()).PrismaClient;
                prisma = new PrismaClient();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 5, 6, 8]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                        where: { id: tblCode },
                        select: { nodeId: true }
                    })];
            case 3:
                conditionRecord = _b.sent();
                if (!(conditionRecord === null || conditionRecord === void 0 ? void 0 : conditionRecord.nodeId)) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: "Condition ".concat(tblCode, " introuvable")
                        })];
                }
                return [4 /*yield*/, (0, operation_interpreter_1.evaluateVariableOperation)(conditionRecord.nodeId, submissionId || tblCode, prisma)];
            case 4:
                result = _b.sent();
                console.log('✅ [TBL EVALUATE CONDITION] Résultat operation-interpreter:', result);
                return [2 /*return*/, res.json({
                        success: true,
                        evaluation: result,
                        operationResult: result.operationResult,
                        operationDetail: result.operationDetail,
                        operationSource: result.operationSource,
                        tblCode: tblCode,
                        timestamp: new Date().toISOString()
                    })];
            case 5:
                error_4 = _b.sent();
                console.error('❌ [TBL EVALUATE CONDITION] Erreur:', error_4);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_4 instanceof Error ? error_4.message : 'unknown'
                    })];
            case 6: return [4 /*yield*/, prisma.$disconnect()];
            case 7:
                _b.sent();
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/];
        }
    });
}); });
/**
 * 📊 POST /api/tbl/evaluate/table/:tblCode
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.post('/evaluate/table/:tblCode', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' })];
    });
}); });
/**
 * 🔍 GET /api/tbl/analyze/:tblCode
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.get('/analyze/:tblCode', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' })];
    });
}); });
/**
 * 📈 GET /api/tbl/status
 * ⚠️ DÉSACTIVÉE TEMPORAIREMENT
 */
router.get('/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, res.status(503).json({ success: false, error: 'Route désactivée pour débogage.' })];
    });
}); });
/**
 * 🔄 POST /api/tbl/update-database-results
 * NOUVEAU : Met à jour la base de données avec les résultats du CapacityCalculator
 */
router.post('/update-database-results', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, submissionId, PrismaClient, prisma, submissionData, calculator, context, updated, errors, _i, submissionData_1, data, conditionId, result, newOperationResult, error_5, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logRouteHit('POST /api/tbl/update-database-results');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 12, , 13]);
                _a = (req.body || {}).submissionId, submissionId = _a === void 0 ? 'df833cac-0b44-4b2b-bb1c-de3878f00182' : _a;
                console.log('🔄 [TBL UPDATE] Début mise à jour base de données avec CapacityCalculator');
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 2:
                PrismaClient = (_b.sent()).PrismaClient;
                prisma = new PrismaClient();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: {
                            submissionId: submissionId,
                            operationSource: 'condition' // Seulement les conditions (en minuscules)
                        }
                    })];
            case 3:
                submissionData = _b.sent();
                console.log("\uD83D\uDD04 [TBL UPDATE] Trouv\u00E9 ".concat(submissionData.length, " donn\u00E9es de conditions \u00E0 mettre \u00E0 jour"));
                calculator = new CapacityCalculator();
                context = {
                    submissionId: submissionId,
                    organizationId: 'test-org',
                    userId: 'test-user'
                };
                updated = 0;
                errors = [];
                _i = 0, submissionData_1 = submissionData;
                _b.label = 4;
            case 4:
                if (!(_i < submissionData_1.length)) return [3 /*break*/, 10];
                data = submissionData_1[_i];
                _b.label = 5;
            case 5:
                _b.trys.push([5, 8, , 9]);
                conditionId = data.sourceRef;
                if (!conditionId) {
                    console.log("\u26A0\uFE0F [TBL UPDATE] Pas de sourceRef pour ".concat(data.id, ", ignor\u00E9"));
                    return [3 /*break*/, 9];
                }
                return [4 /*yield*/, calculator.evaluateCondition(conditionId, context)];
            case 6:
                result = _b.sent();
                newOperationResult = result.success
                    ? {
                        success: true,
                        conditionId: conditionId,
                        result: result.result,
                        evaluated: true,
                        timestamp: new Date().toISOString(),
                        method: 'CapacityCalculator'
                    }
                    : {
                        success: false,
                        conditionId: conditionId,
                        error: result.error,
                        timestamp: new Date().toISOString(),
                        method: 'CapacityCalculator'
                    };
                // Mettre à jour en base dans TreeBranchLeafSubmissionData
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.update({
                        where: { id: data.id },
                        data: {
                            operationResult: newOperationResult
                        }
                    })];
            case 7:
                // Mettre à jour en base dans TreeBranchLeafSubmissionData
                _b.sent();
                updated++;
                console.log("\u2705 [TBL UPDATE] Condition ".concat(conditionId, " mise \u00E0 jour:"), newOperationResult);
                return [3 /*break*/, 9];
            case 8:
                error_5 = _b.sent();
                errors.push({
                    dataId: data.id,
                    sourceRef: data.sourceRef,
                    error: error_5 instanceof Error ? error_5.message : 'unknown'
                });
                console.error("\u274C [TBL UPDATE] Erreur data ".concat(data.id, ":"), error_5);
                return [3 /*break*/, 9];
            case 9:
                _i++;
                return [3 /*break*/, 4];
            case 10: return [4 /*yield*/, prisma.$disconnect()];
            case 11:
                _b.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        updated: updated,
                        total: submissionData.length,
                        errors: errors,
                        timestamp: new Date().toISOString()
                    })];
            case 12:
                error_6 = _b.sent();
                console.error('❌ [TBL UPDATE] Erreur globale:', error_6);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_6 instanceof Error ? error_6.message : 'unknown'
                    })];
            case 13: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔍 POST /api/tbl/check-submission-data
 * NOUVEAU : Inspecter les données de soumission
 */
router.post('/check-submission-data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, submissionId, PrismaClient, prisma, allData, grouped, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logRouteHit('POST /api/tbl/check-submission-data');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                _a = (req.body || {}).submissionId, submissionId = _a === void 0 ? 'df833cac-0b44-4b2b-bb1c-de3878f00182' : _a;
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 2:
                PrismaClient = (_b.sent()).PrismaClient;
                prisma = new PrismaClient();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: submissionId }
                    })];
            case 3:
                allData = _b.sent();
                grouped = allData.reduce(function (acc, item) {
                    var source = item.operationSource || 'null';
                    if (!acc[source])
                        acc[source] = [];
                    acc[source].push({
                        id: item.id,
                        sourceRef: item.sourceRef,
                        operationResult: item.operationResult
                    });
                    return acc;
                }, {});
                return [4 /*yield*/, prisma.$disconnect()];
            case 4:
                _b.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        submissionId: submissionId,
                        total: allData.length,
                        bySource: grouped,
                        timestamp: new Date().toISOString()
                    })];
            case 5:
                error_7 = _b.sent();
                console.error('❌ [TBL CHECK] Erreur:', error_7);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_7 instanceof Error ? error_7.message : 'unknown'
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔄 POST /api/tbl/update-database-with-intelligent-translations
 * NOUVEAU : Met à jour la base de données avec les traductions intelligentes
 */
router.post('/update-database-with-intelligent-translations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, submissionId, PrismaClient, prisma, TBLIntelligentTranslator, translatorModule, error_8, translator, submissionData, updated, errors, _i, submissionData_2, data, intelligentResult, error_9, error_10;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                logRouteHit('POST /api/tbl/update-database-with-intelligent-translations');
                _d.label = 1;
            case 1:
                _d.trys.push([1, 16, , 17]);
                _a = (req.body || {}).submissionId, submissionId = _a === void 0 ? 'df833cac-0b44-4b2b-bb1c-de3878f00182' : _a;
                console.log('🧠 [TBL INTELLIGENT UPDATE] Début mise à jour avec traductions intelligentes');
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 2:
                PrismaClient = (_d.sent()).PrismaClient;
                prisma = new PrismaClient();
                TBLIntelligentTranslator = void 0;
                _d.label = 3;
            case 3:
                _d.trys.push([3, 5, , 6]);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../../../../../tbl-intelligent-translator.cjs')); })];
            case 4:
                translatorModule = _d.sent();
                TBLIntelligentTranslator = translatorModule.default;
                return [3 /*break*/, 6];
            case 5:
                error_8 = _d.sent();
                console.error('❌ [TBL INTELLIGENT] Impossible de charger TBLIntelligentTranslator:', error_8);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'TBLIntelligentTranslator non disponible'
                    })];
            case 6:
                translator = new TBLIntelligentTranslator(prisma);
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: {
                            submissionId: submissionId,
                            operationSource: {
                                in: ['condition', 'formula', 'table']
                            },
                            operationDetail: {
                                not: null
                            }
                        },
                        include: {
                            TreeBranchLeafNode: true
                        }
                    })];
            case 7:
                submissionData = _d.sent();
                console.log("\uD83E\uDDE0 [TBL INTELLIGENT UPDATE] Trouv\u00E9 ".concat(submissionData.length, " donn\u00E9es \u00E0 traduire"));
                updated = 0;
                errors = [];
                _i = 0, submissionData_2 = submissionData;
                _d.label = 8;
            case 8:
                if (!(_i < submissionData_2.length)) return [3 /*break*/, 14];
                data = submissionData_2[_i];
                _d.label = 9;
            case 9:
                _d.trys.push([9, 12, , 13]);
                console.log("\uD83D\uDD27 [TBL INTELLIGENT] Traduction: ".concat(((_b = data.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.label) || 'Sans nom', " (").concat(data.operationSource, ")"));
                return [4 /*yield*/, translator.translateCapacity(data.operationSource, data.operationDetail, data.sourceRef || data.nodeId, data.submissionId)];
            case 10:
                intelligentResult = _d.sent();
                console.log("\u2705 [TBL INTELLIGENT] Traduction g\u00E9n\u00E9r\u00E9e: ".concat(intelligentResult.substring(0, 100), "..."));
                // Mettre à jour en base
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.update({
                        where: { id: data.id },
                        data: {
                            operationResult: intelligentResult,
                            lastResolved: new Date()
                        }
                    })];
            case 11:
                // Mettre à jour en base
                _d.sent();
                updated++;
                console.log("\u2705 [TBL INTELLIGENT] Mis \u00E0 jour: ".concat(data.id));
                return [3 /*break*/, 13];
            case 12:
                error_9 = _d.sent();
                errors.push({
                    dataId: data.id,
                    nodeLabel: (_c = data.TreeBranchLeafNode) === null || _c === void 0 ? void 0 : _c.label,
                    error: error_9 instanceof Error ? error_9.message : 'unknown'
                });
                console.error("\u274C [TBL INTELLIGENT] Erreur data ".concat(data.id, ":"), error_9);
                return [3 /*break*/, 13];
            case 13:
                _i++;
                return [3 /*break*/, 8];
            case 14: return [4 /*yield*/, prisma.$disconnect()];
            case 15:
                _d.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        message: 'Traductions intelligentes appliquées',
                        updated: updated,
                        total: submissionData.length,
                        errors: errors,
                        timestamp: new Date().toISOString()
                    })];
            case 16:
                error_10 = _d.sent();
                console.error('❌ [TBL INTELLIGENT UPDATE] Erreur globale:', error_10);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_10 instanceof Error ? error_10.message : 'unknown'
                    })];
            case 17: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔍 GET /api/tbl/check-intelligent-translations
 * NOUVEAU : Vérifier les traductions intelligentes en base
 */
router.get('/check-intelligent-translations', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, submissionId, PrismaClient, prisma, recentData, translations, error_11;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logRouteHit('GET /api/tbl/check-intelligent-translations');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                _a = req.query.submissionId, submissionId = _a === void 0 ? 'df833cac-0b44-4b2b-bb1c-de3878f00182' : _a;
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 2:
                PrismaClient = (_b.sent()).PrismaClient;
                prisma = new PrismaClient();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: {
                            submissionId: submissionId,
                            operationSource: {
                                in: ['condition', 'formula', 'table']
                            },
                            operationResult: {
                                not: null
                            }
                        },
                        include: {
                            TreeBranchLeafNode: true
                        },
                        orderBy: {
                            lastResolved: 'desc'
                        },
                        take: 10
                    })];
            case 3:
                recentData = _b.sent();
                return [4 /*yield*/, prisma.$disconnect()];
            case 4:
                _b.sent();
                translations = recentData.map(function (data) {
                    var _a;
                    return ({
                        id: data.id,
                        nodeLabel: (_a = data.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label,
                        operationSource: data.operationSource,
                        operationResult: data.operationResult,
                        lastResolved: data.lastResolved,
                        isIntelligent: typeof data.operationResult === 'string' &&
                            !data.operationResult.includes('Évalué dynamiquement par TBL Prisma') &&
                            (data.operationResult.includes('Si ') ||
                                data.operationResult.includes('(/)') ||
                                data.operationResult.includes('Tableau'))
                    });
                });
                return [2 /*return*/, res.json({
                        success: true,
                        submissionId: submissionId,
                        total: recentData.length,
                        translations: translations,
                        stats: {
                            intelligent: translations.filter(function (t) { return t.isIntelligent; }).length,
                            old: translations.filter(function (t) { return !t.isIntelligent; }).length
                        },
                        timestamp: new Date().toISOString()
                    })];
            case 5:
                error_11 = _b.sent();
                console.error('❌ [TBL CHECK INTELLIGENT] Erreur:', error_11);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_11 instanceof Error ? error_11.message : 'unknown'
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.get('/nodes/:nodeId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, PrismaClient, prisma, node, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logRouteHit('GET /api/tbl/nodes/:nodeId');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                nodeId = req.params.nodeId;
                console.log('🔄 [TBL NODES] Récupération node via TBL:', nodeId);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 2:
                PrismaClient = (_a.sent()).PrismaClient;
                prisma = new PrismaClient();
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId }
                    })];
            case 3:
                node = _a.sent();
                return [4 /*yield*/, prisma.$disconnect()];
            case 4:
                _a.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Node non trouvé' })];
                }
                return [2 /*return*/, res.json(node)];
            case 5:
                error_12 = _a.sent();
                console.error('❌ [TBL NODES] Erreur:', error_12);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_12 instanceof Error ? error_12.message : 'unknown'
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔄 GET /api/tbl/reusables/conditions
 * NOUVEAU : Remplace /api/treebranchleaf/reusables/conditions
 */
router.get('/reusables/conditions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var PrismaClient, prisma, conditions, error_13;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logRouteHit('GET /api/tbl/reusables/conditions');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                console.log('🔄 [TBL CONDITIONS] Récupération conditions via TBL');
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 2:
                PrismaClient = (_a.sent()).PrismaClient;
                prisma = new PrismaClient();
                return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findMany({
                        include: {
                            node: true
                        }
                    })];
            case 3:
                conditions = _a.sent();
                return [4 /*yield*/, prisma.$disconnect()];
            case 4:
                _a.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        conditions: conditions,
                        count: conditions.length
                    })];
            case 5:
                error_13 = _a.sent();
                console.error('❌ [TBL CONDITIONS] Erreur:', error_13);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_13 instanceof Error ? error_13.message : 'unknown'
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔄 GET /api/tbl/reusables/formulas
 * NOUVEAU : Remplace /api/treebranchleaf/reusables/formulas
 */
router.get('/reusables/formulas', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var PrismaClient, prisma, formulas, error_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logRouteHit('GET /api/tbl/reusables/formulas');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                console.log('🔄 [TBL FORMULAS] Récupération formules via TBL');
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('@prisma/client')); })];
            case 2:
                PrismaClient = (_a.sent()).PrismaClient;
                prisma = new PrismaClient();
                return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({
                        include: {
                            node: true
                        }
                    })];
            case 3:
                formulas = _a.sent();
                return [4 /*yield*/, prisma.$disconnect()];
            case 4:
                _a.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        formulas: formulas,
                        count: formulas.length
                    })];
            case 5:
                error_14 = _a.sent();
                console.error('❌ [TBL FORMULAS] Erreur:', error_14);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur interne',
                        details: error_14 instanceof Error ? error_14.message : 'unknown'
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

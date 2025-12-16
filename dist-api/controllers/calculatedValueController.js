"use strict";
/**
 * 🎯 Contrôleur pour gérer les valeurs calculées
 *
 * GET  /api/tree-nodes/:nodeId/calculated-value
 * POST /api/tree-nodes/:nodeId/store-calculated-value
 * POST /api/tree-nodes/store-batch-calculated-values
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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var crypto_1 = require("crypto");
var prisma_1 = require("../lib/prisma");
var router = (0, express_1.Router)();
var parseStoredStringValue = function (raw) {
    if (raw === null || raw === undefined) {
        return null;
    }
    var trimmed = String(raw).trim();
    if (!trimmed || trimmed === '∅') {
        return null;
    }
    var looksJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
    if (looksJson) {
        try {
            var parsed = JSON.parse(trimmed);
            if (typeof parsed === 'object' && parsed !== null) {
                var candidate = parsed;
                if (candidate.value !== undefined)
                    return candidate.value;
                if (candidate.result !== undefined)
                    return candidate.result;
            }
            if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
                return parsed;
            }
        }
        catch (_a) {
            // ignore JSON parse errors and keep raw string
        }
    }
    if (trimmed === 'true')
        return true;
    if (trimmed === 'false')
        return false;
    var numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && trimmed === numeric.toString()) {
        return numeric;
    }
    return trimmed;
};
var extractValueFromOperationResult = function (raw) {
    var _a, _b, _c;
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
        return raw;
    }
    if (typeof raw === 'object') {
        var record = raw;
        var candidate = (_c = (_b = (_a = record.value) !== null && _a !== void 0 ? _a : record.result) !== null && _b !== void 0 ? _b : record.humanText) !== null && _c !== void 0 ? _c : record.text;
        if (candidate === undefined || candidate === null) {
            return null;
        }
        if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
            return candidate;
        }
    }
    return null;
};
var hasMeaningfulValue = function (val) {
    if (val === null || val === undefined)
        return false;
    if (typeof val === 'string') {
        return val.trim() !== '' && val.trim() !== '∅';
    }
    return true;
};
var toIsoString = function (date) {
    if (!date) {
        return undefined;
    }
    try {
        return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    }
    catch (_a) {
        return undefined;
    }
};
/**
 * GET /api/tree-nodes/:nodeId/calculated-value
 *
 * Récupère la valeur calculée stockée dans Prisma
 * 🔥 NOUVEAU: Invoke operation-interpreter for TBL fields if needed
 */
router.get('/:nodeId/calculated-value', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, pickQueryString, submissionId, node, preferSubmissionData, forceFlag, forceRecompute, submissionDataEntry, submissionResolvedValue, needsSubmissionRecompute, variableMeta, evaluateVariableOperation, evaluation, recomputedValue, persistedValue, resolvedAt, recomputeErr_1, isTBLField, hasTableLookup, variableMeta2, hasFormulaVariable, now, calculatedAt, isStale, hasNoValue, evaluateVariableOperation, result, stringValue, operationErr_1, error_1;
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                _j.trys.push([0, 19, , 20]);
                nodeId = req.params.nodeId;
                pickQueryString = function (key) {
                    var rawValue = req.query[key];
                    if (typeof rawValue === 'string')
                        return rawValue;
                    if (Array.isArray(rawValue) && rawValue.length > 0 && typeof rawValue[0] === 'string') {
                        return rawValue[0];
                    }
                    return undefined;
                };
                submissionId = pickQueryString('submissionId') ||
                    pickQueryString('_submissionId') ||
                    pickQueryString('subId') ||
                    pickQueryString('tblSubmissionId');
                if (!nodeId) {
                    return [2 /*return*/, res.status(400).json({ error: 'nodeId requis' })];
                }
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.findUnique({
                        where: {
                            id: nodeId
                        },
                        select: {
                            id: true,
                            label: true,
                            calculatedValue: true,
                            metadata: true,
                            calculatedAt: true,
                            calculatedBy: true,
                            type: true,
                            fieldType: true,
                            treeId: true // ✨ Ajouté pour operation-interpreter
                        }
                    })];
            case 1:
                node = _j.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                preferSubmissionData = Boolean(submissionId);
                forceFlag = pickQueryString('force') ||
                    pickQueryString('forceRefresh') ||
                    pickQueryString('refresh') ||
                    pickQueryString('forceRecompute');
                forceRecompute = Boolean(forceFlag && ['1', 'true', 'yes', 'force'].includes(forceFlag.toLowerCase()));
                submissionDataEntry = null;
                submissionResolvedValue = null;
                if (!(preferSubmissionData && submissionId)) return [3 /*break*/, 10];
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafSubmissionData.findUnique({
                        where: { submissionId_nodeId: { submissionId: submissionId, nodeId: nodeId } },
                        select: {
                            value: true,
                            lastResolved: true,
                            operationResult: true,
                            operationDetail: true,
                            operationSource: true,
                            sourceRef: true,
                            fieldLabel: true
                        }
                    })];
            case 2:
                submissionDataEntry = _j.sent();
                if (submissionDataEntry) {
                    submissionResolvedValue = parseStoredStringValue(submissionDataEntry.value);
                    if (!hasMeaningfulValue(submissionResolvedValue)) {
                        submissionResolvedValue = extractValueFromOperationResult(submissionDataEntry.operationResult);
                    }
                }
                needsSubmissionRecompute = forceRecompute ||
                    !submissionDataEntry ||
                    !hasMeaningfulValue(submissionResolvedValue);
                if (!needsSubmissionRecompute) return [3 /*break*/, 9];
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNodeVariable.findUnique({
                        where: { nodeId: nodeId },
                        select: { nodeId: true, displayName: true, exposedKey: true, unit: true }
                    })];
            case 3:
                variableMeta = _j.sent();
                if (!variableMeta) return [3 /*break*/, 9];
                _j.label = 4;
            case 4:
                _j.trys.push([4, 8, , 9]);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js')); })];
            case 5:
                evaluateVariableOperation = (_j.sent()).evaluateVariableOperation;
                return [4 /*yield*/, evaluateVariableOperation(nodeId, submissionId, prisma_1.prisma)];
            case 6:
                evaluation = _j.sent();
                recomputedValue = (_b = (_a = evaluation.value) !== null && _a !== void 0 ? _a : evaluation.operationResult) !== null && _b !== void 0 ? _b : null;
                persistedValue = recomputedValue === null || recomputedValue === undefined
                    ? null
                    : String(recomputedValue);
                resolvedAt = new Date();
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafSubmissionData.upsert({
                        where: { submissionId_nodeId: { submissionId: submissionId, nodeId: nodeId } },
                        update: {
                            value: persistedValue,
                            operationDetail: evaluation.operationDetail,
                            operationResult: evaluation.operationResult,
                            operationSource: evaluation.operationSource,
                            sourceRef: evaluation.sourceRef,
                            fieldLabel: node.label,
                            isVariable: true,
                            variableDisplayName: variableMeta.displayName,
                            variableKey: variableMeta.exposedKey,
                            variableUnit: variableMeta.unit,
                            lastResolved: resolvedAt
                        },
                        create: {
                            id: (0, crypto_1.randomUUID)(),
                            submissionId: submissionId,
                            nodeId: nodeId,
                            value: persistedValue,
                            operationDetail: evaluation.operationDetail,
                            operationResult: evaluation.operationResult,
                            operationSource: evaluation.operationSource,
                            sourceRef: evaluation.sourceRef,
                            fieldLabel: node.label,
                            isVariable: true,
                            variableDisplayName: variableMeta.displayName,
                            variableKey: variableMeta.exposedKey,
                            variableUnit: variableMeta.unit,
                            lastResolved: resolvedAt
                        }
                    })];
            case 7:
                _j.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        nodeId: node.id,
                        label: node.label,
                        value: recomputedValue,
                        calculatedAt: resolvedAt.toISOString(),
                        calculatedBy: evaluation.operationSource || 'operation-interpreter-auto',
                        type: node.type,
                        fieldType: node.fieldType,
                        submissionId: submissionId,
                        sourceRef: evaluation.sourceRef,
                        operationDetail: evaluation.operationDetail,
                        operationResult: evaluation.operationResult,
                        freshCalculation: true
                    })];
            case 8:
                recomputeErr_1 = _j.sent();
                console.error('❌ [CalculatedValueController] Recompute error:', recomputeErr_1);
                return [3 /*break*/, 9];
            case 9:
                if (submissionDataEntry && hasMeaningfulValue(submissionResolvedValue)) {
                    return [2 /*return*/, res.json({
                            success: true,
                            nodeId: node.id,
                            label: node.label || submissionDataEntry.fieldLabel,
                            value: submissionResolvedValue,
                            calculatedAt: toIsoString(submissionDataEntry.lastResolved) || toIsoString(node.calculatedAt),
                            calculatedBy: submissionDataEntry.operationSource || node.calculatedBy,
                            type: node.type,
                            fieldType: node.fieldType,
                            submissionId: submissionId,
                            sourceRef: submissionDataEntry.sourceRef,
                            operationDetail: submissionDataEntry.operationDetail,
                            operationResult: submissionDataEntry.operationResult,
                            fromSubmission: true
                        })];
                }
                _j.label = 10;
            case 10:
                isTBLField = node.type === 'field' && node.metadata && typeof node.metadata === 'object';
                hasTableLookup = isTBLField &&
                    ((_d = (_c = node.metadata) === null || _c === void 0 ? void 0 : _c.lookup) === null || _d === void 0 ? void 0 : _d.enabled) === true &&
                    ((_f = (_e = node.metadata) === null || _e === void 0 ? void 0 : _e.lookup) === null || _f === void 0 ? void 0 : _f.tableReference);
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNodeVariable.findUnique({
                        where: { nodeId: nodeId },
                        select: { sourceType: true, sourceRef: true }
                    })];
            case 11:
                variableMeta2 = _j.sent();
                hasFormulaVariable = (variableMeta2 === null || variableMeta2 === void 0 ? void 0 : variableMeta2.sourceType) === 'formula' && ((_g = variableMeta2 === null || variableMeta2 === void 0 ? void 0 : variableMeta2.sourceRef) === null || _g === void 0 ? void 0 : _g.startsWith('node-formula:'));
                if (!((hasTableLookup || hasFormulaVariable) && node.treeId)) return [3 /*break*/, 18];
                now = new Date();
                calculatedAt = node.calculatedAt ? new Date(node.calculatedAt) : null;
                isStale = !calculatedAt || (now.getTime() - calculatedAt.getTime()) > 10000;
                hasNoValue = !node.calculatedValue || node.calculatedValue === '' || node.calculatedValue === '[]' || node.calculatedValue === '0';
                if (!(isStale || hasNoValue || hasFormulaVariable)) return [3 /*break*/, 18];
                console.log("\uD83D\uDD25 [CalculatedValueController] Node \"".concat(node.label, "\" n\u00E9cessite recalcul:"), {
                    nodeId: nodeId,
                    hasTableLookup: hasTableLookup,
                    hasFormulaVariable: hasFormulaVariable,
                    sourceRef: variableMeta2 === null || variableMeta2 === void 0 ? void 0 : variableMeta2.sourceRef,
                    isStale: isStale,
                    hasNoValue: hasNoValue,
                    calculatedAt: calculatedAt,
                    submissionId: submissionId
                });
                _j.label = 12;
            case 12:
                _j.trys.push([12, 17, , 18]);
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js')); })];
            case 13:
                evaluateVariableOperation = (_j.sent()).evaluateVariableOperation;
                return [4 /*yield*/, evaluateVariableOperation(nodeId, submissionId || 'preview-calculated-value-request', prisma_1.prisma)];
            case 14:
                result = _j.sent();
                console.log('🎯 [CalculatedValueController] Résultat operation-interpreter:', result);
                if (!(result && (result.value !== undefined || result.operationResult !== undefined))) return [3 /*break*/, 16];
                stringValue = String((_h = result.value) !== null && _h !== void 0 ? _h : result.operationResult);
                // Stocker dans la base
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            calculatedValue: stringValue,
                            calculatedAt: new Date(),
                            calculatedBy: 'operation-interpreter-auto'
                        }
                    })];
            case 15:
                // Stocker dans la base
                _j.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        nodeId: node.id,
                        label: node.label,
                        value: stringValue,
                        calculatedAt: new Date().toISOString(),
                        calculatedBy: 'operation-interpreter-auto',
                        type: node.type,
                        fieldType: node.fieldType,
                        freshCalculation: true // 🔥 Marquer comme nouveau calcul
                    })];
            case 16: return [3 /*break*/, 18];
            case 17:
                operationErr_1 = _j.sent();
                console.error('❌ [CalculatedValueController] Erreur operation-interpreter:', operationErr_1);
                return [3 /*break*/, 18];
            case 18: 
            // ✅ Retourner la valeur calculée du Nœud (par défaut)
            return [2 /*return*/, res.json({
                    success: true,
                    nodeId: node.id,
                    label: node.label,
                    value: node.calculatedValue,
                    calculatedAt: node.calculatedAt,
                    calculatedBy: node.calculatedBy,
                    type: node.type,
                    fieldType: node.fieldType
                })];
            case 19:
                error_1 = _j.sent();
                console.error('[CalculatedValueController] GET erreur:', error_1);
                return [2 /*return*/, res.status(500).json({ error: String(error_1) })];
            case 20: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/tree-nodes/:nodeId/store-calculated-value
 *
 * Stocke une valeur calculée dans le nœud
 */
router.post('/:nodeId/store-calculated-value', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, calculatedValue, calculatedBy, submissionId, updated, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                nodeId = req.params.nodeId;
                _a = req.body, calculatedValue = _a.calculatedValue, calculatedBy = _a.calculatedBy, submissionId = _a.submissionId;
                if (!nodeId) {
                    return [2 /*return*/, res.status(400).json({ error: 'nodeId requis' })];
                }
                if (calculatedValue === undefined) {
                    return [2 /*return*/, res.status(400).json({ error: 'calculatedValue requis' })];
                }
                // 🎯 Log: debug trace de la requête
                console.log('[CalculatedValueController] POST store-calculated-value', {
                    nodeId: nodeId,
                    calculatedValue: calculatedValue,
                    calculatedBy: calculatedBy,
                    submissionId: submissionId,
                    headers: {
                        organization: req.headers['x-organization-id'],
                        referer: req.headers['referer']
                    }
                });
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            calculatedValue: String(calculatedValue),
                            calculatedAt: new Date(),
                            calculatedBy: calculatedBy || 'unknown'
                        },
                        select: {
                            id: true,
                            label: true,
                            calculatedValue: true,
                            calculatedAt: true,
                            calculatedBy: true
                        }
                    })];
            case 1:
                updated = _b.sent();
                console.log('✅ [CalculatedValueController] Valeur stockée:', {
                    nodeId: nodeId,
                    calculatedValue: calculatedValue,
                    calculatedBy: calculatedBy,
                    submissionId: submissionId
                });
                return [2 /*return*/, res.json({
                        success: true,
                        nodeId: updated.id,
                        calculatedValue: updated.calculatedValue,
                        calculatedAt: updated.calculatedAt,
                        calculatedBy: updated.calculatedBy
                    })];
            case 2:
                error_2 = _b.sent();
                console.error('[CalculatedValueController] POST erreur:', error_2);
                return [2 /*return*/, res.status(500).json({ error: String(error_2) })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * BATCH POST /api/tree-nodes/store-batch-calculated-values
 *
 * Stocke plusieurs valeurs calculées à la fois
 * Utile après une soumission de formulaire complet
 */
router.post('/store-batch-calculated-values', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, values, submissionId, results, _i, values_1, _b, nodeId, calculatedValue, calculatedBy, updated, err_1, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                _a = req.body, values = _a.values, submissionId = _a.submissionId;
                if (!Array.isArray(values) || values.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'values doit être un tableau non-vide' })];
                }
                results = [];
                _i = 0, values_1 = values;
                _c.label = 1;
            case 1:
                if (!(_i < values_1.length)) return [3 /*break*/, 6];
                _b = values_1[_i], nodeId = _b.nodeId, calculatedValue = _b.calculatedValue, calculatedBy = _b.calculatedBy;
                if (!nodeId)
                    return [3 /*break*/, 5];
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 5]);
                return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: {
                            calculatedValue: String(calculatedValue),
                            calculatedAt: new Date(),
                            calculatedBy: calculatedBy || 'unknown'
                        }
                    })];
            case 3:
                updated = _c.sent();
                results.push({
                    nodeId: nodeId,
                    success: true,
                    calculatedValue: updated.calculatedValue
                });
                return [3 /*break*/, 5];
            case 4:
                err_1 = _c.sent();
                results.push({
                    nodeId: nodeId,
                    success: false,
                    error: String(err_1)
                });
                return [3 /*break*/, 5];
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6:
                console.log('✅ [CalculatedValueController] BATCH stockage:', {
                    submissionId: submissionId,
                    total: values.length,
                    success: results.filter(function (r) { return r.success; }).length,
                    failed: results.filter(function (r) { return !r.success; }).length
                });
                return [2 /*return*/, res.json({
                        success: true,
                        results: results,
                        submissionId: submissionId
                    })];
            case 7:
                error_3 = _c.sent();
                console.error('[CalculatedValueController] BATCH POST erreur:', error_3);
                return [2 /*return*/, res.status(500).json({ error: String(error_3) })];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

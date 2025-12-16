"use strict";
/**
 * 🎯 TBL PRISMA SUBMISSION EVALUATOR - ENDPOINT POUR ÉVALUATION COMPLÈTE
 *
 * Endpoint qui évalue TOUTES les capacités (conditions, formules, tableaux)
 * d'une soumission avec operation-interpreter.ts (système unifié) et sauvegarde
 * les traductions intelligentes directement en base TreeBranchLeafSubmissionData.
 */
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
var operation_interpreter_1 = require("../../treebranchleaf-new/api/operation-interpreter");
var calculatedValuesService_1 = require("../../../../services/calculatedValuesService");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
var stagingStore = new Map();
var STAGE_TTL_MS = 1000 * 60 * 60; // 1h
function pruneStages() {
    var now = Date.now();
    for (var _i = 0, stagingStore_1 = stagingStore; _i < stagingStore_1.length; _i++) {
        var _a = stagingStore_1[_i], k = _a[0], v = _a[1];
        if (now - v.updatedAt > STAGE_TTL_MS)
            stagingStore.delete(k);
    }
}
function newStageId() {
    return "stage-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 9));
}
// Utilitaire: nettoyer les formData des clés techniques (__mirror_, __formula_, __condition_, __*)
function sanitizeFormData(input) {
    if (Array.isArray(input)) {
        return input.map(sanitizeFormData);
    }
    if (input && typeof input === 'object') {
        var result = {};
        for (var _i = 0, _a = Object.entries(input); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], v = _b[1];
            if (k.startsWith('__') || k.startsWith('__mirror_') || k.startsWith('__formula_') || k.startsWith('__condition_')) {
                continue;
            }
            // Omettre valeurs vides (null/undefined/"")
            if (v === null || v === undefined || v === '')
                continue;
            result[k] = sanitizeFormData(v);
        }
        return result;
    }
    return input;
}
var UUID_NODE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var GENERATED_NODE_REGEX = /^node_[0-9]+_[a-z0-9]+$/i;
var SHARED_REFERENCE_REGEX = /^shared-ref-[a-z0-9-]+$/i;
function isSharedReferenceId(nodeId) {
    return SHARED_REFERENCE_REGEX.test(nodeId);
}
function isAcceptedNodeId(nodeId) {
    return UUID_NODE_REGEX.test(nodeId) || GENERATED_NODE_REGEX.test(nodeId) || isSharedReferenceId(nodeId);
}
function resolveSharedReferenceAliases(sharedRefs, treeId) {
    return __awaiter(this, void 0, void 0, function () {
        var where, aliases, map, _i, aliases_1, alias;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!sharedRefs.length) {
                        return [2 /*return*/, new Map()];
                    }
                    where = {
                        sharedReferenceId: { in: sharedRefs }
                    };
                    if (treeId) {
                        where.treeId = treeId;
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: where,
                            select: { id: true, sharedReferenceId: true }
                        })];
                case 1:
                    aliases = _a.sent();
                    map = new Map();
                    for (_i = 0, aliases_1 = aliases; _i < aliases_1.length; _i++) {
                        alias = aliases_1[_i];
                        if (!alias.sharedReferenceId)
                            continue;
                        if (!map.has(alias.sharedReferenceId)) {
                            map.set(alias.sharedReferenceId, []);
                        }
                        map.get(alias.sharedReferenceId).push(alias.id);
                    }
                    return [2 /*return*/, map];
            }
        });
    });
}
function applySharedReferenceValues(target, entries, treeId) {
    return __awaiter(this, void 0, void 0, function () {
        var sharedRefKeys, aliasMap, _a, _i, entries_1, _b, key, value, aliases, _c, aliases_2, alias;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!entries.length)
                        return [2 /*return*/];
                    sharedRefKeys = entries
                        .map(function (_a) {
                        var key = _a[0];
                        return key;
                    })
                        .filter(isSharedReferenceId);
                    if (!sharedRefKeys.length) return [3 /*break*/, 2];
                    return [4 /*yield*/, resolveSharedReferenceAliases(sharedRefKeys, treeId)];
                case 1:
                    _a = _d.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = new Map();
                    _d.label = 3;
                case 3:
                    aliasMap = _a;
                    for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                        _b = entries_1[_i], key = _b[0], value = _b[1];
                        target.set(key, value);
                        if (!isSharedReferenceId(key))
                            continue;
                        aliases = aliasMap.get(key) || [];
                        for (_c = 0, aliases_2 = aliases; _c < aliases_2.length; _c++) {
                            alias = aliases_2[_c];
                            target.set(alias, value);
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Réutilisables: sauvegarde des entrées utilisateur (neutral) avec NO-OP
function saveUserEntriesNeutral(submissionId, formData, treeId) {
    return __awaiter(this, void 0, void 0, function () {
        var saved, entries, sharedRefKeys, sharedRefAliasMap, _a, _i, _b, _c, key, value, storageIds, _d, storageIds_1, nodeId, serializedValue, entry, _e, _f, entry, key, existing, normalize, changed;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (!formData || typeof formData !== 'object')
                        return [2 /*return*/, 0];
                    saved = 0;
                    entries = new Map();
                    sharedRefKeys = Object.keys(formData).filter(isSharedReferenceId);
                    if (!sharedRefKeys.length) return [3 /*break*/, 2];
                    return [4 /*yield*/, resolveSharedReferenceAliases(sharedRefKeys, treeId)];
                case 1:
                    _a = _g.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = new Map();
                    _g.label = 3;
                case 3:
                    sharedRefAliasMap = _a;
                    for (_i = 0, _b = Object.entries(formData); _i < _b.length; _i++) {
                        _c = _b[_i], key = _c[0], value = _c[1];
                        if (key.startsWith('__mirror_') || key.startsWith('__formula_') || key.startsWith('__condition_')) {
                            continue;
                        }
                        if (!isAcceptedNodeId(key))
                            continue;
                        storageIds = isSharedReferenceId(key)
                            ? __spreadArray([key], (sharedRefAliasMap.get(key) || []), true) : [key];
                        for (_d = 0, storageIds_1 = storageIds; _d < storageIds_1.length; _d++) {
                            nodeId = storageIds_1[_d];
                            if (!isAcceptedNodeId(nodeId))
                                continue;
                            serializedValue = value === null || value === undefined
                                ? null
                                : typeof value === 'string'
                                    ? value
                                    : JSON.stringify(value);
                            entry = {
                                id: "".concat(submissionId, "-").concat(nodeId, "-").concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9)),
                                submissionId: submissionId,
                                nodeId: nodeId,
                                value: serializedValue,
                                operationSource: 'neutral',
                                operationDetail: {
                                    inputValue: value,
                                    nodeId: nodeId,
                                    action: 'user_input',
                                    sourceNodeId: key,
                                    aliasResolved: nodeId !== key
                                },
                                operationResult: {
                                    processedValue: value,
                                    status: 'stored'
                                }
                            };
                            entries.set(nodeId, entry);
                        }
                    }
                    _e = 0, _f = entries.values();
                    _g.label = 4;
                case 4:
                    if (!(_e < _f.length)) return [3 /*break*/, 11];
                    entry = _f[_e];
                    key = { submissionId_nodeId: { submissionId: entry.submissionId, nodeId: entry.nodeId } };
                    return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findUnique({ where: key })];
                case 5:
                    existing = _g.sent();
                    normalize = function (v) {
                        if (v === null || v === undefined)
                            return null;
                        if (typeof v === 'string')
                            return v;
                        try {
                            return JSON.stringify(v);
                        }
                        catch (_a) {
                            return String(v);
                        }
                    };
                    if (!existing) return [3 /*break*/, 8];
                    changed = (normalize(existing.value) !== normalize(entry.value) ||
                        (existing.operationSource || null) !== (entry.operationSource || null));
                    if (!changed) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.update({
                            where: key,
                            data: {
                                value: entry.value,
                                operationSource: 'neutral',
                                operationDetail: entry.operationDetail,
                                operationResult: entry.operationResult
                            }
                        })];
                case 6:
                    _g.sent();
                    saved++;
                    _g.label = 7;
                case 7: return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.create({ data: entry })];
                case 9:
                    _g.sent();
                    saved++;
                    _g.label = 10;
                case 10:
                    _e++;
                    return [3 /*break*/, 4];
                case 11: return [2 /*return*/, saved];
            }
        });
    });
}
// Réutilisables: évaluation et sauvegarde des capacités pour une soumission (NO-OP)
function evaluateCapacitiesForSubmission(submissionId, organizationId, userId, treeId) {
    return __awaiter(this, void 0, void 0, function () {
        var capacities, _tblContext, results, calculatedValuesToStore, _i, capacities_1, capacity, sourceRef, capacityResult, normalizedOperationSource, parsedDetail, key, existing, normalize, changed, rawValue, stringified, normalizedValue, error_1, storeResult, storeError_1;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: { TreeBranchLeafNode: { treeId: treeId }, sourceRef: { not: null } },
                        include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
                    })];
                case 1:
                    capacities = _f.sent();
                    _tblContext = {
                        submissionId: submissionId,
                        labelMap: new Map(),
                        valueMap: new Map(),
                        organizationId: organizationId,
                        userId: userId || 'unknown-user',
                        treeId: treeId
                    };
                    results = { updated: 0, created: 0, stored: 0 };
                    calculatedValuesToStore = [];
                    _i = 0, capacities_1 = capacities;
                    _f.label = 2;
                case 2:
                    if (!(_i < capacities_1.length)) return [3 /*break*/, 13];
                    capacity = capacities_1[_i];
                    sourceRef = capacity.sourceRef;
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 11, , 12]);
                    return [4 /*yield*/, (0, operation_interpreter_1.evaluateVariableOperation)(capacity.nodeId, submissionId, prisma)];
                case 4:
                    capacityResult = _f.sent();
                    normalizedOperationSource = (typeof capacityResult.operationSource === 'string'
                        ? capacityResult.operationSource.toLowerCase()
                        : 'neutral');
                    parsedDetail = null;
                    try {
                        parsedDetail = typeof capacityResult.operationDetail === 'string'
                            ? JSON.parse(capacityResult.operationDetail)
                            : capacityResult.operationDetail;
                    }
                    catch (_g) {
                        parsedDetail = capacityResult.operationDetail;
                    }
                    key = { submissionId_nodeId: { submissionId: submissionId, nodeId: capacity.nodeId } };
                    return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findUnique({ where: key })];
                case 5:
                    existing = _f.sent();
                    normalize = function (v) {
                        if (v === null || v === undefined)
                            return null;
                        if (typeof v === 'string')
                            return v;
                        try {
                            return JSON.stringify(v);
                        }
                        catch (_a) {
                            return String(v);
                        }
                    };
                    if (!existing) return [3 /*break*/, 8];
                    changed = ((existing.sourceRef || null) !== (sourceRef || null) ||
                        (existing.operationSource || null) !== (normalizedOperationSource || null) ||
                        (existing.fieldLabel || null) !== ((((_a = capacity.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || null)) ||
                        normalize(existing.operationDetail) !== normalize(parsedDetail) ||
                        normalize(existing.operationResult) !== normalize(capacityResult.operationResult));
                    if (!changed) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.update({
                            where: key,
                            data: {
                                value: null,
                                sourceRef: sourceRef,
                                operationSource: normalizedOperationSource,
                                fieldLabel: ((_b = capacity.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.label) || null,
                                operationDetail: parsedDetail,
                                operationResult: capacityResult.operationResult,
                                lastResolved: new Date()
                            }
                        })];
                case 6:
                    _f.sent();
                    results.updated++;
                    _f.label = 7;
                case 7: return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.create({
                        data: {
                            id: "".concat(submissionId, "-").concat(capacity.nodeId, "-cap-").concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9)),
                            submissionId: submissionId,
                            nodeId: capacity.nodeId,
                            value: null,
                            sourceRef: sourceRef,
                            operationSource: normalizedOperationSource,
                            fieldLabel: ((_c = capacity.TreeBranchLeafNode) === null || _c === void 0 ? void 0 : _c.label) || null,
                            operationDetail: parsedDetail,
                            operationResult: capacityResult.operationResult,
                            lastResolved: new Date()
                        }
                    })];
                case 9:
                    _f.sent();
                    results.created++;
                    _f.label = 10;
                case 10:
                    rawValue = (_e = (_d = capacityResult.value) !== null && _d !== void 0 ? _d : capacityResult.calculatedValue) !== null && _e !== void 0 ? _e : capacityResult.result;
                    stringified = rawValue === null || rawValue === undefined ? null : String(rawValue).trim();
                    if (rawValue !== null && rawValue !== undefined && stringified !== '' && stringified !== '∅') {
                        normalizedValue = void 0;
                        if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
                            normalizedValue = rawValue;
                        }
                        else {
                            normalizedValue = String(rawValue);
                        }
                        calculatedValuesToStore.push({
                            nodeId: capacity.nodeId,
                            calculatedValue: normalizedValue,
                            calculatedBy: "submission-".concat(submissionId)
                        });
                    }
                    return [3 /*break*/, 12];
                case 11:
                    error_1 = _f.sent();
                    console.error("[TBL CAPACITY ERROR] ".concat(sourceRef, ":"), error_1);
                    return [3 /*break*/, 12];
                case 12:
                    _i++;
                    return [3 /*break*/, 2];
                case 13:
                    if (!(calculatedValuesToStore.length > 0)) return [3 /*break*/, 17];
                    _f.label = 14;
                case 14:
                    _f.trys.push([14, 16, , 17]);
                    return [4 /*yield*/, (0, calculatedValuesService_1.storeCalculatedValues)(calculatedValuesToStore, submissionId)];
                case 15:
                    storeResult = _f.sent();
                    results.stored = storeResult.stored;
                    if (!storeResult.success && storeResult.errors.length > 0) {
                        console.warn('[TBL CAPACITY STORE] Certaines valeurs n\'ont pas pu être enregistrées:', storeResult.errors);
                    }
                    return [3 /*break*/, 17];
                case 16:
                    storeError_1 = _f.sent();
                    console.error('[TBL CAPACITY STORE] Erreur lors du stockage des valeurs calculées:', storeError_1);
                    return [3 /*break*/, 17];
                case 17: return [2 /*return*/, results];
            }
        });
    });
}
/**
 * 🔥 POST /api/tbl/submissions/:submissionId/evaluate-all
 *
 * Évalue TOUTES les capacités d'une soumission avec TBL Prisma
 * et sauvegarde les traductions intelligentes en base
 */
router.post('/submissions/:submissionId/evaluate-all', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissionId, _a, forceUpdate, organizationId, userId, submissionData, _context, evaluatedCount, errorCount, results, _loop_1, _i, submissionData_1, data, error_2;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 6, , 7]);
                submissionId = req.params.submissionId;
                _a = (req.body || {}).forceUpdate, forceUpdate = _a === void 0 ? false : _a;
                organizationId = req.headers['x-organization-id'] || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId);
                userId = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId) || 'unknown-user';
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Organisation ID manquant - authentification requise'
                        })];
                }
                console.log('🔥 [TBL EVALUATE ALL] Début évaluation complète:', submissionId);
                console.log("\uD83C\uDFE2 [TBL EVALUATE ALL] Organisation: ".concat(organizationId, ", Utilisateur: ").concat(userId));
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: {
                            submissionId: submissionId,
                            sourceRef: { not: null }
                        },
                        include: {
                            TreeBranchLeafNode: {
                                select: { label: true, type: true }
                            }
                        }
                    })];
            case 1:
                submissionData = _f.sent();
                console.log("\uD83D\uDCCA [TBL EVALUATE ALL] ".concat(submissionData.length, " \u00E9l\u00E9ments avec capacit\u00E9s trouv\u00E9s"));
                if (submissionData.length === 0) {
                    return [2 /*return*/, res.json({
                            success: true,
                            message: 'Aucune capacité à évaluer',
                            evaluated: 0
                        })];
                }
                _context = {
                    submissionId: submissionId,
                    organizationId: organizationId, // ✅ VRAIE ORGANISATION!
                    userId: userId, // ✅ VRAI UTILISATEUR!
                    labelMap: new Map(), // 🔥 MAPS INITIALISÉES
                    valueMap: new Map()
                };
                evaluatedCount = 0;
                errorCount = 0;
                results = [];
                _loop_1 = function (data) {
                    var calculationResult_1, normalize, normalizedSource, nextDetail, nextResult, changed, error_3;
                    return __generator(this, function (_g) {
                        switch (_g.label) {
                            case 0:
                                _g.trys.push([0, 5, , 6]);
                                // Skip si déjà évalué (sauf si forceUpdate)
                                if (!forceUpdate && data.operationResult && data.lastResolved) {
                                    console.log("\u23ED\uFE0F [TBL EVALUATE ALL] Skip ".concat(data.sourceRef, " (d\u00E9j\u00E0 \u00E9valu\u00E9)"));
                                    return [2 /*return*/, "continue"];
                                }
                                console.log("\uD83D\uDD04 [TBL EVALUATE ALL] \u00C9valuation ".concat(data.sourceRef, "..."));
                                return [4 /*yield*/, (0, operation_interpreter_1.evaluateVariableOperation)(data.nodeId, submissionId, prisma)];
                            case 1:
                                calculationResult_1 = _g.sent();
                                console.log("\u2705 [TBL EVALUATE ALL] R\u00E9sultat pour ".concat(data.sourceRef, ":"), calculationResult_1.operationResult);
                                normalize = function (v) {
                                    if (v === null || v === undefined)
                                        return null;
                                    if (typeof v === 'string')
                                        return v;
                                    try {
                                        return JSON.stringify(v);
                                    }
                                    catch (_a) {
                                        return String(v);
                                    }
                                };
                                normalizedSource = (typeof calculationResult_1.operationSource === 'string'
                                    ? calculationResult_1.operationSource.toLowerCase()
                                    : 'neutral');
                                nextDetail = (function () {
                                    try {
                                        return typeof calculationResult_1.operationDetail === 'string'
                                            ? JSON.parse(calculationResult_1.operationDetail)
                                            : calculationResult_1.operationDetail;
                                    }
                                    catch (_a) {
                                        return calculationResult_1.operationDetail;
                                    }
                                })();
                                nextResult = calculationResult_1.operationResult;
                                changed = ((data.operationSource || null) !== (normalizedSource || null) ||
                                    normalize(data.operationDetail) !== normalize(nextDetail) ||
                                    normalize(data.operationResult) !== normalize(nextResult));
                                if (!changed) return [3 /*break*/, 3];
                                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.update({
                                        where: { id: data.id },
                                        data: {
                                            operationDetail: nextDetail,
                                            operationResult: nextResult, // 🔥 TRADUCTION INTELLIGENTE !
                                            operationSource: normalizedSource,
                                            lastResolved: new Date()
                                        }
                                    })];
                            case 2:
                                _g.sent();
                                return [3 /*break*/, 4];
                            case 3:
                                console.log("\u23ED\uFE0F [TBL EVALUATE ALL] NO-OP ".concat(data.sourceRef, " (inchang\u00E9)"));
                                _g.label = 4;
                            case 4:
                                results.push({
                                    id: data.id,
                                    sourceRef: data.sourceRef,
                                    nodeLabel: (_d = data.TreeBranchLeafNode) === null || _d === void 0 ? void 0 : _d.label,
                                    operationResult: calculationResult_1.operationResult,
                                    success: true
                                });
                                evaluatedCount++;
                                return [3 /*break*/, 6];
                            case 5:
                                error_3 = _g.sent();
                                console.error("\u274C [TBL EVALUATE ALL] Erreur pour ".concat(data.sourceRef, ":"), error_3);
                                results.push({
                                    id: data.id,
                                    sourceRef: data.sourceRef,
                                    nodeLabel: (_e = data.TreeBranchLeafNode) === null || _e === void 0 ? void 0 : _e.label,
                                    error: error_3 instanceof Error ? error_3.message : 'Erreur inconnue',
                                    success: false
                                });
                                errorCount++;
                                return [3 /*break*/, 6];
                            case 6: return [2 /*return*/];
                        }
                    });
                };
                _i = 0, submissionData_1 = submissionData;
                _f.label = 2;
            case 2:
                if (!(_i < submissionData_1.length)) return [3 /*break*/, 5];
                data = submissionData_1[_i];
                return [5 /*yield**/, _loop_1(data)];
            case 3:
                _f.sent();
                _f.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5:
                console.log("\uD83C\uDF89 [TBL EVALUATE ALL] Termin\u00E9: ".concat(evaluatedCount, " \u00E9valu\u00E9s, ").concat(errorCount, " erreurs"));
                return [2 /*return*/, res.json({
                        success: true,
                        submissionId: submissionId,
                        evaluated: evaluatedCount,
                        errors: errorCount,
                        total: submissionData.length,
                        results: results,
                        timestamp: new Date().toISOString()
                    })];
            case 6:
                error_2 = _f.sent();
                console.error('❌ [TBL EVALUATE ALL] Erreur globale:', error_2);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de l\'évaluation complète',
                        details: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                    })];
            case 7: return [2 /*return*/];
        }
    });
}); });
/**
 * 📊 GET /api/tbl/submissions/:submissionId/verification
 *
 * Vérifie que toutes les traductions intelligentes sont bien sauvegardées
 */
router.get('/submissions/:submissionId/verification', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissionId, rows, total, toStringSafely, withIntelligentTranslations, withOldMessages, withErrors, _i, rows_1, r, s, successRate, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                submissionId = req.params.submissionId;
                console.log('🔍 [TBL VERIFICATION] Vérification soumission:', submissionId);
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: submissionId, sourceRef: { not: null } },
                        select: { operationResult: true }
                    })];
            case 1:
                rows = _a.sent();
                total = rows.length;
                toStringSafely = function (val) {
                    if (val === null || val === undefined)
                        return '';
                    if (typeof val === 'string')
                        return val;
                    try {
                        return JSON.stringify(val);
                    }
                    catch (_a) {
                        return String(val);
                    }
                };
                withIntelligentTranslations = 0;
                withOldMessages = 0;
                withErrors = 0;
                for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                    r = rows_1[_i];
                    s = toStringSafely(r.operationResult).trim();
                    if (!s) {
                        withErrors++;
                        continue;
                    }
                    if (s.includes('Évalué dynamiquement par TBL Prisma')) {
                        withOldMessages++;
                    }
                    if (s.includes('Si ') || /(=) Result \(/.test(s) || s.includes('(/)')) {
                        withIntelligentTranslations++;
                    }
                }
                successRate = total > 0 ? Math.round(((total - withOldMessages - withErrors) / total) * 100) : 100;
                return [2 /*return*/, res.json({
                        success: true,
                        submissionId: submissionId,
                        verification: {
                            total: total,
                            withIntelligentTranslations: withIntelligentTranslations,
                            withOldMessages: withOldMessages,
                            withErrors: withErrors,
                            successRate: "".concat(successRate, "%")
                        },
                        status: withOldMessages === 0 && withErrors === 0 ? 'perfect' : 'needs_improvement',
                        timestamp: new Date().toISOString()
                    })];
            case 2:
                error_4 = _a.sent();
                console.error('❌ [TBL VERIFICATION] Erreur:', error_4);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la vérification'
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔥 POST /api/tbl/submissions/create-and-evaluate
 *
 * ENDPOINT TOUT-EN-UN : Crée une soumission ET l'évalue avec TBL Prisma
 * SANS JAMAIS passer par les routes TreeBranchLeaf legacy !
 */
router.post('/submissions/create-and-evaluate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, treeId, clientId, formData, _b, status_1, providedName, reuseSubmissionId, cleanFormData, organizationId, userId, effectiveTreeId, firstTree, treeExists, firstTree, effectiveLeadId, leadExists, defaultLead, effectiveUserId, userExists, submissionId, existing, savedCount, capacities, evalStats, finalSubmission, error_5;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 25, , 26]);
                _a = req.body, treeId = _a.treeId, clientId = _a.clientId, formData = _a.formData, _b = _a.status, status_1 = _b === void 0 ? 'draft' : _b, providedName = _a.providedName, reuseSubmissionId = _a.reuseSubmissionId;
                cleanFormData = formData && typeof formData === 'object' ? sanitizeFormData(formData) : undefined;
                organizationId = req.headers['x-organization-id'] || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.organizationId);
                userId = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.userId) || 'unknown-user';
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Organisation ID manquant - authentification requise'
                        })];
                }
                console.log('🔥 [TBL CREATE-AND-EVALUATE] Début création complète TBL Prisma');
                console.log("\uD83C\uDFE2 [TBL CREATE-AND-EVALUATE] Organisation: ".concat(organizationId, ", Utilisateur: ").concat(userId));
                console.log("\uD83D\uDCCB [TBL CREATE-AND-EVALUATE] TreeId re\u00E7u: ".concat(treeId, ", ClientId: ").concat(clientId));
                effectiveTreeId = treeId;
                if (!!effectiveTreeId) return [3 /*break*/, 2];
                console.log('⚠️ [TBL CREATE-AND-EVALUATE] Aucun treeId fourni, recherche du premier arbre disponible...');
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        select: { id: true, name: true }
                    })];
            case 1:
                firstTree = _e.sent();
                if (!firstTree) {
                    throw new Error('Aucun arbre TreeBranchLeaf trouvé dans la base de données');
                }
                effectiveTreeId = firstTree.id;
                console.log("\uD83C\uDF33 [TBL CREATE-AND-EVALUATE] Arbre par d\u00E9faut s\u00E9lectionn\u00E9: ".concat(effectiveTreeId, " (").concat(firstTree.name, ")"));
                return [3 /*break*/, 6];
            case 2: return [4 /*yield*/, prisma.treeBranchLeafTree.findUnique({
                    where: { id: effectiveTreeId },
                    select: { id: true, name: true }
                })];
            case 3:
                treeExists = _e.sent();
                if (!!treeExists) return [3 /*break*/, 5];
                console.log("\u274C [TBL CREATE-AND-EVALUATE] Arbre ".concat(effectiveTreeId, " introuvable, recherche d'un arbre alternatif..."));
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                        select: { id: true, name: true }
                    })];
            case 4:
                firstTree = _e.sent();
                if (!firstTree) {
                    throw new Error('Aucun arbre TreeBranchLeaf trouvé dans la base de données');
                }
                effectiveTreeId = firstTree.id;
                console.log("\uD83C\uDF33 [TBL CREATE-AND-EVALUATE] Arbre alternatif s\u00E9lectionn\u00E9: ".concat(effectiveTreeId, " (").concat(firstTree.name, ")"));
                return [3 /*break*/, 6];
            case 5:
                console.log("\u2705 [TBL CREATE-AND-EVALUATE] Arbre valid\u00E9: ".concat(effectiveTreeId, " (").concat(treeExists.name, ")"));
                _e.label = 6;
            case 6:
                effectiveLeadId = clientId;
                if (!effectiveLeadId) return [3 /*break*/, 11];
                return [4 /*yield*/, prisma.lead.findUnique({
                        where: { id: effectiveLeadId },
                        select: { id: true, firstName: true, lastName: true, email: true }
                    })];
            case 7:
                leadExists = _e.sent();
                if (!!leadExists) return [3 /*break*/, 9];
                console.log("\u274C [TBL CREATE-AND-EVALUATE] Lead ".concat(effectiveLeadId, " introuvable, cr\u00E9ation d'un lead par d\u00E9faut..."));
                return [4 /*yield*/, prisma.lead.create({
                        data: {
                            id: "lead-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9)),
                            firstName: "Client",
                            lastName: "Défaut",
                            email: "client-".concat(Date.now(), "@example.com"),
                            phone: "",
                            organizationId: organizationId,
                            updatedAt: new Date()
                        }
                    })];
            case 8:
                defaultLead = _e.sent();
                effectiveLeadId = defaultLead.id;
                console.log("\uD83D\uDC64 [TBL CREATE-AND-EVALUATE] Lead par d\u00E9faut cr\u00E9\u00E9: ".concat(effectiveLeadId, " (").concat(defaultLead.firstName, " ").concat(defaultLead.lastName, ")"));
                return [3 /*break*/, 10];
            case 9:
                console.log("\u2705 [TBL CREATE-AND-EVALUATE] Lead valid\u00E9: ".concat(effectiveLeadId, " (").concat(leadExists.firstName, " ").concat(leadExists.lastName, ")"));
                _e.label = 10;
            case 10: return [3 /*break*/, 12];
            case 11:
                console.log('ℹ️ [TBL CREATE-AND-EVALUATE] Aucun leadId fourni, soumission sans lead associé');
                _e.label = 12;
            case 12:
                effectiveUserId = userId;
                if (!effectiveUserId) return [3 /*break*/, 14];
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: effectiveUserId },
                        select: { id: true, firstName: true, lastName: true }
                    })];
            case 13:
                userExists = _e.sent();
                if (!userExists) {
                    console.log("\u274C [TBL CREATE-AND-EVALUATE] User ".concat(effectiveUserId, " introuvable, soumission sans utilisateur"));
                    effectiveUserId = null;
                }
                else {
                    console.log("\u2705 [TBL CREATE-AND-EVALUATE] User valid\u00E9: ".concat(effectiveUserId, " (").concat(userExists.firstName, " ").concat(userExists.lastName, ")"));
                }
                _e.label = 14;
            case 14:
                submissionId = reuseSubmissionId;
                if (!submissionId) return [3 /*break*/, 16];
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({ where: { id: submissionId }, select: { id: true } })];
            case 15:
                existing = _e.sent();
                if (!existing)
                    submissionId = undefined;
                _e.label = 16;
            case 16:
                if (!!submissionId) return [3 /*break*/, 18];
                submissionId = "tbl-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.create({
                        data: {
                            id: submissionId,
                            treeId: effectiveTreeId,
                            userId: effectiveUserId,
                            leadId: effectiveLeadId,
                            status: status_1 || 'completed',
                            summary: { name: providedName || "Devis TBL ".concat(new Date().toLocaleDateString()) },
                            exportData: cleanFormData || {},
                            completedAt: status_1 === 'completed' ? new Date() : null,
                            updatedAt: new Date()
                        }
                    })];
            case 17:
                _e.sent();
                console.log("\u2705 [TBL CREATE-AND-EVALUATE] Soumission cr\u00E9\u00E9e: ".concat(submissionId));
                return [3 /*break*/, 19];
            case 18:
                console.log("\uFFFD [TBL CREATE-AND-EVALUATE] R\u00E9utilisation de la soumission: ".concat(submissionId));
                _e.label = 19;
            case 19:
                if (!(cleanFormData && typeof cleanFormData === 'object')) return [3 /*break*/, 23];
                return [4 /*yield*/, saveUserEntriesNeutral(submissionId, cleanFormData, effectiveTreeId)];
            case 20:
                savedCount = _e.sent();
                if (savedCount > 0)
                    console.log("\u2705 [TBL CREATE-AND-EVALUATE] ".concat(savedCount, " entr\u00E9es utilisateur enregistr\u00E9es"));
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                        where: {
                            TreeBranchLeafNode: {
                                treeId: effectiveTreeId
                            },
                            sourceRef: { not: null }
                        },
                        include: {
                            TreeBranchLeafNode: {
                                select: { id: true, label: true }
                            }
                        }
                    })];
            case 21:
                capacities = _e.sent();
                console.log("\uD83C\uDFAF [TBL CREATE-AND-EVALUATE] ".concat(capacities.length, " capacit\u00E9s trouv\u00E9es"));
                return [4 /*yield*/, evaluateCapacitiesForSubmission(submissionId, organizationId, userId || null, effectiveTreeId)];
            case 22:
                evalStats = _e.sent();
                console.log("\u2705 [TBL CREATE-AND-EVALUATE] Capacit\u00E9s: ".concat(evalStats.updated, " mises \u00E0 jour, ").concat(evalStats.created, " cr\u00E9\u00E9es, ").concat(evalStats.stored, " valeurs stock\u00E9es"));
                _e.label = 23;
            case 23: return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                    where: { id: submissionId },
                    include: {
                        TreeBranchLeafSubmissionData: true
                    }
                })];
            case 24:
                finalSubmission = _e.sent();
                return [2 /*return*/, res.status(201).json({
                        success: true,
                        message: 'Soumission créée et évaluée avec TBL Prisma',
                        submission: finalSubmission
                    })];
            case 25:
                error_5 = _e.sent();
                console.error('❌ [TBL CREATE-AND-EVALUATE] Erreur:', error_5);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: error_5 instanceof Error ? error_5.message : 'Erreur interne'
                    })];
            case 26: return [2 /*return*/];
        }
    });
}); });
/**
 * 🔄 PUT /api/tbl/submissions/:submissionId/update-and-evaluate
 *
 * Met à jour les données utilisateur d'une soumission existante (sans recréer)
 * puis évalue toutes les capacités et sauvegarde les résultats (NO-OP).
 */
router.put('/submissions/:submissionId/update-and-evaluate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissionId, _a, formData, status_2, cleanFormData, organizationId, userId, submission, saved, updateData, normalize, stats, finalSubmission, error_6;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                submissionId = req.params.submissionId;
                _a = req.body || {}, formData = _a.formData, status_2 = _a.status;
                cleanFormData = formData && typeof formData === 'object' ? sanitizeFormData(formData) : undefined;
                organizationId = req.headers['x-organization-id'] || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId);
                userId = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId) || null;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Organisation ID manquant - authentification requise' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: submissionId },
                        select: { id: true, treeId: true, status: true, exportData: true }
                    })];
            case 1:
                submission = _d.sent();
                if (!submission) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Soumission introuvable' })];
                }
                return [4 /*yield*/, saveUserEntriesNeutral(submissionId, cleanFormData, submission.treeId)];
            case 2:
                saved = _d.sent();
                updateData = {};
                if (status_2 && status_2 !== submission.status) {
                    updateData.status = status_2;
                }
                // 2b) Mettre à jour exportData si fourni (NO-OP)
                if (cleanFormData) {
                    normalize = function (v) {
                        if (v === null || v === undefined)
                            return null;
                        if (typeof v === 'string')
                            return v;
                        try {
                            return JSON.stringify(v);
                        }
                        catch (_a) {
                            return String(v);
                        }
                    };
                    if (normalize(submission.exportData) !== normalize(cleanFormData)) {
                        updateData.exportData = cleanFormData;
                    }
                }
                if (!(Object.keys(updateData).length > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.update({ where: { id: submissionId }, data: updateData })];
            case 3:
                _d.sent();
                _d.label = 4;
            case 4: return [4 /*yield*/, evaluateCapacitiesForSubmission(submissionId, organizationId, userId, submission.treeId)];
            case 5:
                stats = _d.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({
                        where: { id: submissionId },
                        include: { TreeBranchLeafSubmissionData: true }
                    })];
            case 6:
                finalSubmission = _d.sent();
                return [2 /*return*/, res.json({
                        success: true,
                        message: "Soumission mise \u00E0 jour (".concat(saved, " entr\u00E9es) et \u00E9valu\u00E9e (").concat(stats.updated, " mises \u00E0 jour, ").concat(stats.created, " cr\u00E9\u00E9es, ").concat(stats.stored, " valeurs stock\u00E9es)"),
                        submission: finalSubmission
                    })];
            case 7:
                error_6 = _d.sent();
                console.error('❌ [TBL UPDATE-AND-EVALUATE] Erreur:', error_6);
                return [2 /*return*/, res.status(500).json({ success: false, error: error_6 instanceof Error ? error_6.message : 'Erreur interne' })];
            case 8: return [2 /*return*/];
        }
    });
}); });
/**
 * 🧪 POST /api/tbl/submissions/preview-evaluate
 *
 * Évalue les capacités pour un arbre donné EN MÉMOIRE uniquement (aucune écriture en base).
 * Permet un flux "prévisualisation" pour un nouveau devis ou pour tester des changements
 * avant de sauvegarder. Peut fusionner les données d'une soumission existante (baseSubmissionId)
 * avec des overrides (formData) pour simuler l'état final sans persister.
 */
router.post('/submissions/preview-evaluate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, treeId, formData, baseSubmissionId, leadId, organizationId, userId_1, effectiveTreeId, firstTree, exists, nodes, labelMap, _i, nodes_1, n, valueMap, lead, leadData, postalCodeMatch, extractedPostalCode, existingData, existingEntries, overrides, formEntries, sharedReferenceMapping, _loop_2, _b, formEntries_1, _c, nodeId, value, capacitiesRaw, capacities, submissionId, _d, _e, _f, key, val, context, results, evaluated, _g, capacities_2, cap, evaluation, e_1, errorMessage, calculatedValues, storeError_2, error_7;
    var _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    return __generator(this, function (_t) {
        switch (_t.label) {
            case 0:
                _t.trys.push([0, 29, , 30]);
                _a = req.body || {}, treeId = _a.treeId, formData = _a.formData, baseSubmissionId = _a.baseSubmissionId, leadId = _a.leadId;
                organizationId = req.headers['x-organization-id'] || ((_h = req.user) === null || _h === void 0 ? void 0 : _h.organizationId);
                userId_1 = ((_j = req.user) === null || _j === void 0 ? void 0 : _j.userId) || 'unknown-user';
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Organisation ID manquant - authentification requise' })];
                }
                effectiveTreeId = treeId;
                if (!!effectiveTreeId) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ select: { id: true } })];
            case 1:
                firstTree = _t.sent();
                if (!firstTree) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Aucun arbre TreeBranchLeaf trouvé' })];
                }
                effectiveTreeId = firstTree.id;
                return [3 /*break*/, 4];
            case 2: return [4 /*yield*/, prisma.treeBranchLeafTree.findUnique({ where: { id: effectiveTreeId }, select: { id: true } })];
            case 3:
                exists = _t.sent();
                if (!exists) {
                    return [2 /*return*/, res.status(404).json({ success: false, error: "Arbre introuvable: ".concat(effectiveTreeId) })];
                }
                _t.label = 4;
            case 4: return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: effectiveTreeId }, select: { id: true, label: true } })];
            case 5:
                nodes = _t.sent();
                labelMap = new Map();
                for (_i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                    n = nodes_1[_i];
                    labelMap.set(n.id, n.label);
                }
                valueMap = new Map();
                if (!leadId) return [3 /*break*/, 7];
                return [4 /*yield*/, prisma.lead.findUnique({
                        where: { id: leadId },
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            company: true,
                            leadNumber: true,
                            linkedin: true,
                            website: true,
                            status: true,
                            notes: true,
                            data: true
                        }
                    })];
            case 6:
                lead = _t.sent();
                if (lead) {
                    // Ajouter les champs du Lead dans le valueMap avec le préfixe "lead."
                    valueMap.set('lead.id', lead.id);
                    valueMap.set('lead.firstName', lead.firstName);
                    valueMap.set('lead.lastName', lead.lastName);
                    valueMap.set('lead.email', lead.email);
                    valueMap.set('lead.phone', lead.phone);
                    valueMap.set('lead.company', lead.company);
                    valueMap.set('lead.leadNumber', lead.leadNumber);
                    valueMap.set('lead.linkedin', lead.linkedin);
                    valueMap.set('lead.website', lead.website);
                    valueMap.set('lead.status', lead.status);
                    valueMap.set('lead.notes', lead.notes);
                    // ✅ Extraire les données de l'objet JSON `data` s'il existe
                    if (lead.data && typeof lead.data === 'object') {
                        leadData = lead.data;
                        // Ajouter le code postal s'il existe dans data
                        if (leadData.postalCode) {
                            valueMap.set('lead.postalCode', leadData.postalCode);
                            console.log("[PREVIEW-EVALUATE] \u2705 Code postal Lead: ".concat(leadData.postalCode));
                        }
                        else if (leadData.address && typeof leadData.address === 'string') {
                            postalCodeMatch = leadData.address.match(/\b(\d{4})\b/);
                            if (postalCodeMatch) {
                                extractedPostalCode = postalCodeMatch[1];
                                valueMap.set('lead.postalCode', extractedPostalCode);
                                console.log("[PREVIEW-EVALUATE] \u2705 Code postal extrait: ".concat(extractedPostalCode, " depuis \"").concat(leadData.address, "\""));
                            }
                            else {
                                console.log("[PREVIEW-EVALUATE] \u26A0\uFE0F Aucun code postal trouv\u00E9 dans l'adresse: \"".concat(leadData.address, "\""));
                            }
                        }
                        if (leadData.address) {
                            valueMap.set('lead.address', leadData.address);
                        }
                        if (leadData.city) {
                            valueMap.set('lead.city', leadData.city);
                        }
                        if (leadData.country) {
                            valueMap.set('lead.country', leadData.country);
                        }
                    }
                }
                _t.label = 7;
            case 7:
                if (!baseSubmissionId) return [3 /*break*/, 10];
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: baseSubmissionId },
                        select: { nodeId: true, value: true }
                    })];
            case 8:
                existingData = _t.sent();
                existingEntries = existingData.map(function (row) { return [row.nodeId, row.value]; });
                return [4 /*yield*/, applySharedReferenceValues(valueMap, existingEntries, effectiveTreeId)];
            case 9:
                _t.sent();
                _t.label = 10;
            case 10:
                if (!(formData && typeof formData === 'object')) return [3 /*break*/, 12];
                overrides = Object.entries(formData).filter(function (_a) {
                    var k = _a[0];
                    return !k.startsWith('__');
                });
                return [4 /*yield*/, applySharedReferenceValues(valueMap, overrides, effectiveTreeId)];
            case 11:
                _t.sent();
                _t.label = 12;
            case 12:
                if (!(formData && typeof formData === 'object')) return [3 /*break*/, 16];
                formEntries = Object.entries(formData);
                console.log("\uD83D\uDD0D [Auto-Clean DEBUG] V\u00E9rification auto-nettoyage sur ".concat(formEntries.length, " champs formData"));
                sharedReferenceMapping = {
                    'plan': ['shared-ref-1764095668124-l53956', 'shared-ref-1764095679973-fad7d7', 'shared-ref-1764093957109-52vog', 'shared-ref-1764093355187-f83m8h'],
                    'inclinaison': ['shared-ref-1764093957109-52vog', 'shared-ref-1764093355187-f83m8h']
                };
                _loop_2 = function (nodeId, value) {
                    var nodeInfo, options, selectedOption, optionType, referencesToClean, nodesToClean, _u, nodesToClean_1, nodeToClean, oldValue;
                    return __generator(this, function (_v) {
                        switch (_v.label) {
                            case 0:
                                if (!(!nodeId.startsWith('__') && value !== null && value !== undefined && value !== '')) return [3 /*break*/, 3];
                                console.log("\uD83D\uDD0D [Auto-Clean DEBUG] Analyse du champ ".concat(nodeId, " = \"").concat(value, "\""));
                                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                                        where: { id: nodeId },
                                        select: {
                                            id: true,
                                            label: true,
                                            sharedReferenceIds: true,
                                            TreeBranchLeafSelectConfig: {
                                                select: {
                                                    id: true,
                                                    options: true
                                                }
                                            }
                                        }
                                    })];
                            case 1:
                                nodeInfo = _v.sent();
                                if (!((_k = nodeInfo === null || nodeInfo === void 0 ? void 0 : nodeInfo.TreeBranchLeafSelectConfig) === null || _k === void 0 ? void 0 : _k.options)) return [3 /*break*/, 3];
                                options = Array.isArray(nodeInfo.TreeBranchLeafSelectConfig.options)
                                    ? nodeInfo.TreeBranchLeafSelectConfig.options
                                    : [];
                                console.log("\uD83D\uDD0D [Auto-Clean DEBUG] Node ".concat(nodeId, " (").concat(nodeInfo.label, ") a ").concat(options.length, " options"));
                                selectedOption = options.find(function (opt) { return opt.value === value; });
                                if (!((_l = selectedOption === null || selectedOption === void 0 ? void 0 : selectedOption.sharedReferenceIds) === null || _l === void 0 ? void 0 : _l.length)) return [3 /*break*/, 3];
                                console.log("\uD83D\uDD0D [Auto-Clean DEBUG] Option s\u00E9lectionn\u00E9e \"".concat(selectedOption.label, "\" (").concat(selectedOption.value, ") a des r\u00E9f\u00E9rences partag\u00E9es:"), selectedOption.sharedReferenceIds);
                                optionType = null;
                                if (JSON.stringify(selectedOption.sharedReferenceIds) === JSON.stringify(sharedReferenceMapping.plan)) {
                                    optionType = 'plan';
                                }
                                else if (JSON.stringify(selectedOption.sharedReferenceIds) === JSON.stringify(sharedReferenceMapping.inclinaison)) {
                                    optionType = 'inclinaison';
                                }
                                if (!optionType) return [3 /*break*/, 3];
                                console.log("\uD83D\uDD0D [Auto-Clean DEBUG] Option de type \"".concat(optionType, "\" d\u00E9tect\u00E9e"));
                                referencesToClean = optionType === 'plan'
                                    ? sharedReferenceMapping.inclinaison
                                    : sharedReferenceMapping.plan;
                                console.log("\uD83D\uDD0D [Auto-Clean DEBUG] Nettoyage des r\u00E9f\u00E9rences:", referencesToClean);
                                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                                        where: {
                                            treeId: effectiveTreeId,
                                            sharedReferenceIds: { hasSome: referencesToClean }
                                        },
                                        select: { id: true, label: true, sharedReferenceIds: true }
                                    })];
                            case 2:
                                nodesToClean = _v.sent();
                                console.log("\uD83D\uDD0D [Auto-Clean DEBUG] ".concat(nodesToClean.length, " nodes \u00E0 nettoyer trouv\u00E9s"));
                                // Nettoyer ces nodes dans le valueMap (données temporaires)
                                for (_u = 0, nodesToClean_1 = nodesToClean; _u < nodesToClean_1.length; _u++) {
                                    nodeToClean = nodesToClean_1[_u];
                                    if (valueMap.has(nodeToClean.id)) {
                                        oldValue = valueMap.get(nodeToClean.id);
                                        valueMap.delete(nodeToClean.id);
                                        console.log("\uD83D\uDD0D [Auto-Clean DEBUG] \u2705 Node ".concat(nodeToClean.id, " (").concat(nodeToClean.label, ") nettoy\u00E9 (\u00E9tait: \"").concat(oldValue, "\")"));
                                    }
                                }
                                _v.label = 3;
                            case 3: return [2 /*return*/];
                        }
                    });
                };
                _b = 0, formEntries_1 = formEntries;
                _t.label = 13;
            case 13:
                if (!(_b < formEntries_1.length)) return [3 /*break*/, 16];
                _c = formEntries_1[_b], nodeId = _c[0], value = _c[1];
                return [5 /*yield**/, _loop_2(nodeId, value)];
            case 14:
                _t.sent();
                _t.label = 15;
            case 15:
                _b++;
                return [3 /*break*/, 13];
            case 16: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                    where: { TreeBranchLeafNode: { treeId: effectiveTreeId }, sourceRef: { not: null } },
                    include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
                })];
            case 17:
                capacitiesRaw = _t.sent();
                capacities = capacitiesRaw.sort(function (a, b) {
                    var _a, _b, _c, _d;
                    var aIsSumFormula = ((_a = a.sourceRef) === null || _a === void 0 ? void 0 : _a.includes('sum-formula')) || ((_b = a.sourceRef) === null || _b === void 0 ? void 0 : _b.includes('sum-total')) ? 1 : 0;
                    var bIsSumFormula = ((_c = b.sourceRef) === null || _c === void 0 ? void 0 : _c.includes('sum-formula')) || ((_d = b.sourceRef) === null || _d === void 0 ? void 0 : _d.includes('sum-total')) ? 1 : 0;
                    return aIsSumFormula - bIsSumFormula; // Les sum-formulas sont évaluées en dernier
                });
                console.log("[UNIVERSAL] \uD83D\uDD04 Ordre d'\u00E9valuation:", capacities.map(function (c) { var _a, _b; return "".concat(((_a = c.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || c.nodeId, " (").concat(((_b = c.sourceRef) === null || _b === void 0 ? void 0 : _b.includes('sum-formula')) ? 'SUM' : 'SIMPLE', ")"); }));
                submissionId = baseSubmissionId || "preview-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 9));
                // 🔍 DEBUG: Afficher le contenu du valueMap
                console.log("[UNIVERSAL] \uD83D\uDCE6 valueMap contient ".concat(valueMap.size, " entr\u00E9es:"));
                for (_d = 0, _e = valueMap.entries(); _d < _e.length; _d++) {
                    _f = _e[_d], key = _f[0], val = _f[1];
                    console.log("  - ".concat(key, " = ").concat(val));
                }
                context = {
                    submissionId: submissionId,
                    organizationId: organizationId,
                    userId: userId_1,
                    treeId: effectiveTreeId,
                    labelMap: labelMap,
                    valueMap: valueMap
                };
                results = [];
                evaluated = 0;
                _g = 0, capacities_2 = capacities;
                _t.label = 18;
            case 18:
                if (!(_g < capacities_2.length)) return [3 /*break*/, 23];
                cap = capacities_2[_g];
                _t.label = 19;
            case 19:
                _t.trys.push([19, 21, , 22]);
                console.log("[UNIVERSAL] \uD83D\uDE80 \u00C9valuation preview pour nodeId: ".concat(cap.nodeId, ", sourceRef: ").concat(cap.sourceRef));
                return [4 /*yield*/, (0, operation_interpreter_1.evaluateVariableOperation)(cap.nodeId, // variableNodeId
                    context.submissionId, // submissionId
                    prisma, // prismaClient
                    context.valueMap // valueMap (données temporaires du formulaire)
                    )];
            case 20:
                evaluation = _t.sent();
                console.log("[UNIVERSAL] \u2705 R\u00E9sultat: value=\"".concat(evaluation.value, "\", operationResult=\"").concat(evaluation.operationResult, "\""));
                // 🔑 CRITIQUE: Ajouter la valeur calculée au valueMap pour que les formules suivantes puissent l'utiliser
                // Cela permet aux formules composées (ex: sum-total) de récupérer les valeurs des formules simples (ex: Mur)
                if (evaluation.value !== null && evaluation.value !== undefined && evaluation.value !== '∅') {
                    context.valueMap.set(cap.nodeId, evaluation.value);
                    console.log("[UNIVERSAL] \uD83D\uDCE5 Valeur ajout\u00E9e au valueMap: ".concat(cap.nodeId, " = ").concat(evaluation.value));
                }
                results.push({
                    nodeId: cap.nodeId,
                    nodeLabel: ((_m = cap.TreeBranchLeafNode) === null || _m === void 0 ? void 0 : _m.label) || null,
                    sourceRef: cap.sourceRef,
                    operationSource: evaluation.operationSource,
                    // 🔥 STRUCTURE CORRECTE: value directement au niveau racine pour SmartCalculatedField
                    value: evaluation.value, // ✅ VALEUR CALCULÉE (utilisée par SmartCalculatedField)
                    calculatedValue: evaluation.value, // ✅ ALIAS pour compatibilité
                    operationResult: {
                        value: evaluation.value, // ✅ Aussi dans operationResult pour traçabilité
                        humanText: evaluation.operationResult, // ✅ Le texte explicatif
                        detail: evaluation.operationDetail
                    },
                    operationDetail: evaluation.operationDetail,
                    // 🎨 NOUVEAU: Configuration d'affichage depuis TreeBranchLeafNodeVariable
                    displayConfig: {
                        displayFormat: cap.displayFormat || 'number',
                        unit: cap.unit || null,
                        precision: (_o = cap.precision) !== null && _o !== void 0 ? _o : 2,
                        visibleToUser: (_p = cap.visibleToUser) !== null && _p !== void 0 ? _p : true
                    }
                });
                evaluated++;
                return [3 /*break*/, 22];
            case 21:
                e_1 = _t.sent();
                console.error("[UNIVERSAL] \u274C Erreur \u00E9valuation pour nodeId ".concat(cap.nodeId, ":"), e_1);
                errorMessage = e_1 instanceof Error ? e_1.message : 'Erreur inconnue';
                results.push({
                    nodeId: cap.nodeId,
                    nodeLabel: ((_q = cap.TreeBranchLeafNode) === null || _q === void 0 ? void 0 : _q.label) || null,
                    sourceRef: cap.sourceRef,
                    operationSource: 'error',
                    value: null, // ✅ Valeur nulle pour les erreurs
                    calculatedValue: null, // ✅ ALIAS
                    operationResult: {
                        value: null, // ✅ Valeur nulle
                        humanText: errorMessage, // ✅ Message d'erreur
                        error: errorMessage
                    },
                    operationDetail: null,
                    // 🎨 Configuration d'affichage même en cas d'erreur
                    displayConfig: {
                        displayFormat: cap.displayFormat || 'number',
                        unit: cap.unit || null,
                        precision: (_r = cap.precision) !== null && _r !== void 0 ? _r : 2,
                        visibleToUser: (_s = cap.visibleToUser) !== null && _s !== void 0 ? _s : true
                    }
                });
                return [3 /*break*/, 22];
            case 22:
                _g++;
                return [3 /*break*/, 18];
            case 23:
                // 🔍 DEBUG: Log final des résultats avant envoi
                console.log("[PREVIEW-EVALUATE] \uD83D\uDCE4 Envoi r\u00E9ponse avec ".concat(results.length, " r\u00E9sultats:"));
                results.forEach(function (r, i) {
                    console.log("  [".concat(i, "] nodeId=\"").concat(r.nodeId, "\", label=\"").concat(r.nodeLabel, "\", value=\"").concat(r.value, "\" (calculatedValue=\"").concat(r.calculatedValue, "\")"));
                });
                _t.label = 24;
            case 24:
                _t.trys.push([24, 27, , 28]);
                calculatedValues = results
                    .map(function (r) {
                    var _a;
                    var candidate = (_a = r.value) !== null && _a !== void 0 ? _a : r.calculatedValue;
                    return __assign(__assign({}, r), { candidate: candidate });
                })
                    .filter(function (r) {
                    // Exclure null, undefined, chaînes vides, et symboles de vide (∅)
                    if (r.candidate === null || r.candidate === undefined)
                        return false;
                    var strValue = String(r.candidate).trim();
                    if (strValue === '' || strValue === '∅')
                        return false;
                    return true;
                })
                    .map(function (r) { return ({
                    nodeId: r.nodeId,
                    calculatedValue: String(r.candidate),
                    calculatedBy: "preview-".concat(userId_1)
                }); });
                if (!(calculatedValues.length > 0)) return [3 /*break*/, 26];
                return [4 /*yield*/, (0, calculatedValuesService_1.storeCalculatedValues)(calculatedValues, submissionId)];
            case 25:
                _t.sent();
                console.log("[PREVIEW-EVALUATE] \u2705 ".concat(calculatedValues.length, " valeurs stock\u00E9es dans Prisma"));
                _t.label = 26;
            case 26: return [3 /*break*/, 28];
            case 27:
                storeError_2 = _t.sent();
                console.error("[PREVIEW-EVALUATE] \u26A0\uFE0F Erreur stockage valeurs calcul\u00E9es:", storeError_2);
                return [3 /*break*/, 28];
            case 28: return [2 /*return*/, res.json({
                    success: true,
                    mode: 'preview',
                    submissionId: submissionId,
                    treeId: effectiveTreeId,
                    evaluated: evaluated,
                    results: results
                })];
            case 29:
                error_7 = _t.sent();
                console.error('❌ [TBL PREVIEW-EVALUATE] Erreur:', error_7);
                return [2 /*return*/, res.status(500).json({ success: false, error: error_7 instanceof Error ? error_7.message : 'Erreur interne' })];
            case 30: return [2 /*return*/];
        }
    });
}); });
/**
 * 🧱 STAGING API — aucune écriture DB tant que non "commit"
 */
router.post('/submissions/stage', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, stageId, treeId, submissionId, formData, organizationId, userId, effectiveTreeId, firstTree, id, clean, existing, merged, e_2;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                pruneStages();
                _a = req.body || {}, stageId = _a.stageId, treeId = _a.treeId, submissionId = _a.submissionId, formData = _a.formData;
                organizationId = req.headers['x-organization-id'] || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId);
                userId = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId) || 'unknown-user';
                if (!organizationId)
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Organisation ID manquant' })];
                effectiveTreeId = treeId;
                if (!!effectiveTreeId) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({ select: { id: true } })];
            case 1:
                firstTree = _d.sent();
                if (!firstTree)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Aucun arbre trouvé' })];
                effectiveTreeId = firstTree.id;
                _d.label = 2;
            case 2:
                id = stageId || newStageId();
                clean = formData && typeof formData === 'object' ? sanitizeFormData(formData) : {};
                existing = stagingStore.get(id);
                merged = {
                    id: id,
                    organizationId: organizationId,
                    userId: userId,
                    treeId: effectiveTreeId,
                    submissionId: submissionId || (existing === null || existing === void 0 ? void 0 : existing.submissionId),
                    formData: __assign(__assign({}, ((existing === null || existing === void 0 ? void 0 : existing.formData) || {})), clean),
                    updatedAt: Date.now()
                };
                stagingStore.set(id, merged);
                return [2 /*return*/, res.json({ success: true, stage: merged })];
            case 3:
                e_2 = _d.sent();
                return [2 /*return*/, res.status(500).json({ success: false, error: e_2 instanceof Error ? e_2.message : 'Erreur interne' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post('/submissions/stage/preview', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stageId, stage, nodes, labelMap, valueMap, existingData, existingEntries, stageEntries, capacitiesRaw, capacities, context, results, _i, capacities_3, c, r, e_3, errorMessage, e_4;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 13, , 14]);
                pruneStages();
                stageId = (req.body || {}).stageId;
                stage = stageId ? stagingStore.get(stageId) : undefined;
                if (!stage)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Stage introuvable' })];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: stage.treeId }, select: { id: true, label: true } })];
            case 1:
                nodes = _c.sent();
                labelMap = new Map(nodes.map(function (n) { return [n.id, n.label]; }));
                valueMap = new Map();
                if (!stage.submissionId) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: stage.submissionId },
                        select: { nodeId: true, value: true }
                    })];
            case 2:
                existingData = _c.sent();
                existingEntries = existingData.map(function (r) { return [r.nodeId, r.value]; });
                return [4 /*yield*/, applySharedReferenceValues(valueMap, existingEntries, stage.treeId)];
            case 3:
                _c.sent();
                _c.label = 4;
            case 4:
                stageEntries = Object.entries(stage.formData);
                return [4 /*yield*/, applySharedReferenceValues(valueMap, stageEntries, stage.treeId)];
            case 5:
                _c.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({ where: { TreeBranchLeafNode: { treeId: stage.treeId }, sourceRef: { not: null } }, include: { TreeBranchLeafNode: { select: { id: true, label: true } } } })];
            case 6:
                capacitiesRaw = _c.sent();
                capacities = capacitiesRaw.sort(function (a, b) {
                    var _a, _b, _c, _d;
                    var aIsSumFormula = ((_a = a.sourceRef) === null || _a === void 0 ? void 0 : _a.includes('sum-formula')) || ((_b = a.sourceRef) === null || _b === void 0 ? void 0 : _b.includes('sum-total')) ? 1 : 0;
                    var bIsSumFormula = ((_c = b.sourceRef) === null || _c === void 0 ? void 0 : _c.includes('sum-formula')) || ((_d = b.sourceRef) === null || _d === void 0 ? void 0 : _d.includes('sum-total')) ? 1 : 0;
                    return aIsSumFormula - bIsSumFormula;
                });
                context = { submissionId: stage.submissionId || "preview-".concat(Date.now()), organizationId: stage.organizationId, userId: stage.userId, treeId: stage.treeId, labelMap: labelMap, valueMap: valueMap };
                results = [];
                _i = 0, capacities_3 = capacities;
                _c.label = 7;
            case 7:
                if (!(_i < capacities_3.length)) return [3 /*break*/, 12];
                c = capacities_3[_i];
                _c.label = 8;
            case 8:
                _c.trys.push([8, 10, , 11]);
                return [4 /*yield*/, (0, operation_interpreter_1.evaluateVariableOperation)(c.nodeId, context.submissionId, prisma, context.valueMap)];
            case 9:
                r = _c.sent();
                // 🔑 CRITIQUE: Ajouter la valeur calculée au valueMap pour les formules suivantes
                if (r.value !== null && r.value !== undefined && r.value !== '∅') {
                    context.valueMap.set(c.nodeId, r.value);
                }
                results.push({
                    nodeId: c.nodeId,
                    nodeLabel: ((_a = c.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.label) || null,
                    sourceRef: c.sourceRef,
                    operationSource: (r.operationSource || 'neutral'),
                    value: r.value, // ✅ VALEUR CALCULÉE
                    calculatedValue: r.value, // ✅ ALIAS
                    operationResult: {
                        value: r.value,
                        humanText: r.operationResult,
                        detail: r.operationDetail
                    },
                    operationDetail: r.operationDetail
                });
                return [3 /*break*/, 11];
            case 10:
                e_3 = _c.sent();
                errorMessage = e_3 instanceof Error ? e_3.message : 'Erreur';
                results.push({
                    nodeId: c.nodeId,
                    nodeLabel: ((_b = c.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.label) || null,
                    sourceRef: c.sourceRef,
                    operationSource: 'error',
                    value: null, // ✅ Valeur nulle
                    calculatedValue: null, // ✅ ALIAS
                    operationResult: {
                        value: null,
                        humanText: errorMessage,
                        error: errorMessage
                    },
                    operationDetail: null
                });
                return [3 /*break*/, 11];
            case 11:
                _i++;
                return [3 /*break*/, 7];
            case 12: return [2 /*return*/, res.json({ success: true, stageId: stage.id, results: results })];
            case 13:
                e_4 = _c.sent();
                return [2 /*return*/, res.status(500).json({ success: false, error: e_4 instanceof Error ? e_4.message : 'Erreur interne' })];
            case 14: return [2 /*return*/];
        }
    });
}); });
router.post('/submissions/stage/commit', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, stageId, asNew, stage, submission, saved_1, stats_1, submissionId, saved, stats, e_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 9, , 10]);
                pruneStages();
                _a = req.body || {}, stageId = _a.stageId, asNew = _a.asNew;
                stage = stageId ? stagingStore.get(stageId) : undefined;
                if (!stage)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Stage introuvable' })];
                if (!(!asNew && stage.submissionId)) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.findUnique({ where: { id: stage.submissionId } })];
            case 1:
                submission = _b.sent();
                if (!submission)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Soumission introuvable' })];
                // update exportData (NO-OP) + données neutral + évaluations
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.update({ where: { id: stage.submissionId }, data: { exportData: stage.formData } })];
            case 2:
                // update exportData (NO-OP) + données neutral + évaluations
                _b.sent();
                return [4 /*yield*/, saveUserEntriesNeutral(stage.submissionId, stage.formData, stage.treeId)];
            case 3:
                saved_1 = _b.sent();
                return [4 /*yield*/, evaluateCapacitiesForSubmission(stage.submissionId, stage.organizationId, stage.userId, stage.treeId)];
            case 4:
                stats_1 = _b.sent();
                return [2 /*return*/, res.json({ success: true, submissionId: stage.submissionId, saved: saved_1, stats: stats_1 })];
            case 5:
                submissionId = "tbl-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 9));
                return [4 /*yield*/, prisma.treeBranchLeafSubmission.create({ data: { id: submissionId, treeId: stage.treeId, userId: stage.userId, status: 'draft', summary: { name: "Devis TBL ".concat(new Date().toLocaleDateString()) }, exportData: stage.formData, updatedAt: new Date() } })];
            case 6:
                _b.sent();
                return [4 /*yield*/, saveUserEntriesNeutral(submissionId, stage.formData, stage.treeId)];
            case 7:
                saved = _b.sent();
                return [4 /*yield*/, evaluateCapacitiesForSubmission(submissionId, stage.organizationId, stage.userId, stage.treeId)];
            case 8:
                stats = _b.sent();
                // attacher l’id créé au stage pour permettre des commit suivants sur ce même devis
                stage.submissionId = submissionId;
                stage.updatedAt = Date.now();
                stagingStore.set(stage.id, stage);
                return [2 /*return*/, res.status(201).json({ success: true, submissionId: submissionId, saved: saved, stats: stats })];
            case 9:
                e_5 = _b.sent();
                return [2 /*return*/, res.status(500).json({ success: false, error: e_5 instanceof Error ? e_5.message : 'Erreur interne' })];
            case 10: return [2 /*return*/];
        }
    });
}); });
router.post('/submissions/stage/discard', function (req, res) {
    pruneStages();
    var stageId = (req.body || {}).stageId;
    if (!stageId || !stagingStore.has(stageId))
        return res.json({ success: true, discarded: false });
    stagingStore.delete(stageId);
    return res.json({ success: true, discarded: true });
});
/**
 * 🔥 GET /api/tbl/tables/:tableId
 *
 * Récupère les informations complètes d'une table (structure + lookup config)
 * Utilisé par SmartCalculatedField pour les références @table.xxx
 */
router.get('/tables/:tableId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tableId, table, meta, lookupConfig, tableData, columns, rows, data, error_8;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                tableId = req.params.tableId;
                console.log("\uD83D\uDCCA [GET TABLE] R\u00E9cup\u00E9ration table: ".concat(tableId));
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                        where: { id: tableId },
                        select: {
                            id: true,
                            name: true,
                            nodeId: true,
                            meta: true,
                        }
                    })];
            case 1:
                table = _c.sent();
                if (!table) {
                    console.log("\u274C [GET TABLE] Table introuvable: ".concat(tableId));
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Table introuvable'
                        })];
                }
                console.log("\u2705 [GET TABLE] Table trouv\u00E9e: ".concat(table.name || tableId));
                meta = table.meta;
                lookupConfig = (meta === null || meta === void 0 ? void 0 : meta.lookup) || {};
                tableData = (meta === null || meta === void 0 ? void 0 : meta.data) || {};
                columns = tableData.columns || [];
                rows = tableData.rows || [];
                data = tableData.matrix || [];
                console.log("\uD83D\uDCCA [GET TABLE] Donn\u00E9es extraites:", {
                    columnsCount: columns.length,
                    rowsCount: rows.length,
                    dataRowsCount: data.length,
                    lookupEnabled: lookupConfig.rowLookupEnabled || lookupConfig.columnLookupEnabled
                });
                // Retourner les informations de la table AVEC les données
                return [2 /*return*/, res.json({
                        success: true,
                        table: {
                            id: table.id,
                            nodeId: table.nodeId,
                            name: table.name || null,
                            type: 'matrix', // Type de table
                            sourceRef: "@table.".concat(table.id),
                            // 🔥 DONNÉES DE LA TABLE (colonnes, lignes, data)
                            columns: columns,
                            rows: rows,
                            data: data,
                            // 🔥 CONFIGURATION DE LOOKUP
                            meta: {
                                lookup: {
                                    enabled: lookupConfig.rowLookupEnabled || lookupConfig.columnLookupEnabled || false,
                                    mode: lookupConfig.mode || 'columns',
                                    rowLookupEnabled: lookupConfig.rowLookupEnabled || false,
                                    columnLookupEnabled: lookupConfig.columnLookupEnabled || false,
                                    selectors: {
                                        rowFieldId: ((_a = lookupConfig.selectors) === null || _a === void 0 ? void 0 : _a.rowFieldId) || null,
                                        columnFieldId: ((_b = lookupConfig.selectors) === null || _b === void 0 ? void 0 : _b.columnFieldId) || null,
                                    },
                                    displayRow: lookupConfig.displayRow || null,
                                    displayColumn: lookupConfig.displayColumn || null
                                }
                            }
                        }
                    })];
            case 2:
                error_8 = _c.sent();
                console.error('❌ [GET TABLE] Erreur:', error_8);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la récupération de la table',
                        details: error_8 instanceof Error ? error_8.message : 'Erreur inconnue'
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

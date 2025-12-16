"use strict";
/**
 * 🎯 Service Backend pour stocker les valeurs calculées dans Prisma
 *
 * Après que le backend calcule les formules/tables/conditions,
 * ce service stocke les résultats dans TreeBranchLeafNode.calculatedValue
 *
 * Utilisation:
 * const results = await storeCalculatedValues(nodeValues, submissionId);
 */
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
exports.storeCalculatedValues = storeCalculatedValues;
exports.storeCalculatedValue = storeCalculatedValue;
exports.getCalculatedValue = getCalculatedValue;
exports.getCalculatedValues = getCalculatedValues;
exports.clearCalculatedValues = clearCalculatedValues;
var prisma_1 = require("../lib/prisma");
/**
 * Stocke plusieurs valeurs calculées à la fois
 *
 * @param values - Liste des valeurs à stocker
 * @param submissionId - (Optionnel) ID de la soumission pour contexte
 * @returns Résultat du stockage
 */
function storeCalculatedValues(values, submissionId) {
    return __awaiter(this, void 0, void 0, function () {
        var result, _i, values_1, value, nodeId, calculatedValue, _a, calculatedBy, node, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    result = {
                        success: true,
                        stored: 0,
                        failed: 0,
                        errors: []
                    };
                    console.log("\uD83D\uDCCA [StoreCalculatedValues] D\u00E9but stockage de ".concat(values.length, " valeurs"), {
                        submissionId: submissionId,
                        timestamp: new Date().toISOString()
                    });
                    _i = 0, values_1 = values;
                    _b.label = 1;
                case 1:
                    if (!(_i < values_1.length)) return [3 /*break*/, 7];
                    value = values_1[_i];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 5, , 6]);
                    nodeId = value.nodeId, calculatedValue = value.calculatedValue, _a = value.calculatedBy, calculatedBy = _a === void 0 ? 'unknown' : _a;
                    if (!nodeId) {
                        result.errors.push({ nodeId: 'unknown', error: 'nodeId manquant' });
                        result.failed++;
                        return [3 /*break*/, 6];
                    }
                    return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: { id: true, label: true }
                        })];
                case 3:
                    node = _b.sent();
                    if (!node) {
                        result.errors.push({
                            nodeId: nodeId,
                            error: 'Nœud non trouvé'
                        });
                        result.failed++;
                        return [3 /*break*/, 6];
                    }
                    // 🎯 Stocker la valeur calculée
                    return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: {
                                calculatedValue: String(calculatedValue),
                                calculatedAt: new Date(),
                                calculatedBy: calculatedBy
                            }
                        })];
                case 4:
                    // 🎯 Stocker la valeur calculée
                    _b.sent();
                    result.stored++;
                    console.log("\u2705 [StoreCalculatedValues] Valeur stock\u00E9e:", {
                        nodeId: nodeId,
                        label: node.label,
                        calculatedValue: calculatedValue,
                        calculatedBy: calculatedBy,
                        submissionId: submissionId
                    });
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    result.failed++;
                    result.errors.push({
                        nodeId: value.nodeId,
                        error: error_1 instanceof Error ? error_1.message : String(error_1)
                    });
                    console.error("\u274C [StoreCalculatedValues] Erreur stockage:", {
                        nodeId: value.nodeId,
                        error: error_1,
                        submissionId: submissionId
                    });
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 1];
                case 7:
                    console.log("\uD83D\uDCCA [StoreCalculatedValues] Fin stockage:", {
                        stored: result.stored,
                        failed: result.failed,
                        total: values.length,
                        submissionId: submissionId,
                        errors: result.errors.length > 0 ? result.errors : undefined
                    });
                    result.success = result.failed === 0;
                    return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Stocke UNE SEULE valeur calculée
 *
 * @param nodeId - ID du nœud
 * @param calculatedValue - Valeur à stocker
 * @param calculatedBy - Source du calcul (optionnel)
 * @returns La valeur stockée
 */
function storeCalculatedValue(nodeId_1, calculatedValue_1) {
    return __awaiter(this, arguments, void 0, function (nodeId, calculatedValue, calculatedBy) {
        var updated, error_2;
        if (calculatedBy === void 0) { calculatedBy = 'unknown'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: {
                                calculatedValue: String(calculatedValue),
                                calculatedAt: new Date(),
                                calculatedBy: calculatedBy
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
                    updated = _a.sent();
                    console.log('✅ [storeCalculatedValue] Valeur stockée:', {
                        nodeId: nodeId,
                        label: updated.label,
                        value: updated.calculatedValue,
                        calculatedBy: updated.calculatedBy
                    });
                    return [2 /*return*/, {
                            success: true,
                            value: updated.calculatedValue || undefined
                        }];
                case 2:
                    error_2 = _a.sent();
                    console.error('❌ [storeCalculatedValue] Erreur:', {
                        nodeId: nodeId,
                        error: error_2
                    });
                    return [2 /*return*/, {
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : String(error_2)
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Récupère UNE valeur calculée (sans requête API)
 *
 * @param nodeId - ID du nœud
 * @returns La valeur calculée
 */
function getCalculatedValue(nodeId) {
    return __awaiter(this, void 0, void 0, function () {
        var node, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: { calculatedValue: true }
                        })];
                case 1:
                    node = _b.sent();
                    return [2 /*return*/, (_a = node === null || node === void 0 ? void 0 : node.calculatedValue) !== null && _a !== void 0 ? _a : null];
                case 2:
                    error_3 = _b.sent();
                    console.error('❌ [getCalculatedValue] Erreur:', { nodeId: nodeId, error: error_3 });
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Récupère TOUTES les valeurs calculées pour des nœuds donnés
 *
 * @param nodeIds - Liste des IDs de nœuds
 * @returns Map nodeId -> calculatedValue
 */
function getCalculatedValues(nodeIds) {
    return __awaiter(this, void 0, void 0, function () {
        var nodes, result, _loop_1, _i, nodeIds_1, nodeId, error_4;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.findMany({
                            where: {
                                id: { in: nodeIds }
                            },
                            select: {
                                id: true,
                                calculatedValue: true
                            }
                        })];
                case 1:
                    nodes = _b.sent();
                    result = {};
                    _loop_1 = function (nodeId) {
                        var node = nodes.find(function (n) { return n.id === nodeId; });
                        result[nodeId] = (_a = node === null || node === void 0 ? void 0 : node.calculatedValue) !== null && _a !== void 0 ? _a : null;
                    };
                    for (_i = 0, nodeIds_1 = nodeIds; _i < nodeIds_1.length; _i++) {
                        nodeId = nodeIds_1[_i];
                        _loop_1(nodeId);
                    }
                    return [2 /*return*/, result];
                case 2:
                    error_4 = _b.sent();
                    console.error('❌ [getCalculatedValues] Erreur:', { error: error_4 });
                    return [2 /*return*/, {}];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Efface les valeurs calculées pour réinitialiser
 *
 * @param nodeIds - Liste des IDs de nœuds à réinitialiser
 * @returns Nombre de nœuds réinitialisés
 */
function clearCalculatedValues(nodeIds) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_1.prisma.treeBranchLeafNode.updateMany({
                            where: {
                                id: { in: nodeIds }
                            },
                            data: {
                                calculatedValue: null,
                                calculatedAt: null,
                                calculatedBy: null
                            }
                        })];
                case 1:
                    result = _a.sent();
                    console.log('🗑️ [clearCalculatedValues] Valeurs réinitialisées:', {
                        count: result.count,
                        nodeIds: nodeIds.length
                    });
                    return [2 /*return*/, result.count];
                case 2:
                    error_5 = _a.sent();
                    console.error('❌ [clearCalculatedValues] Erreur:', { error: error_5 });
                    return [2 /*return*/, 0];
                case 3: return [2 /*return*/];
            }
        });
    });
}

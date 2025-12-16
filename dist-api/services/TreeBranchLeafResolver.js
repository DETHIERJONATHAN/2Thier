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
exports.TreeBranchLeafResolver = void 0;
exports.getResolver = getResolver;
var TreeBranchLeafResolver = /** @class */ (function () {
    function TreeBranchLeafResolver(prisma) {
        this.prisma = prisma;
    }
    /**
     * Résout le contenu d'une opération selon sa source
     */
    TreeBranchLeafResolver.prototype.resolveOperation = function (source, sourceRef) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, sourceType, id, _b, condition, formula, table, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 9, , 10]);
                        _a = sourceRef.split(':'), sourceType = _a[0], id = _a[1];
                        if (sourceType !== source) {
                            throw new Error("Source mismatch: expected ".concat(source, ", got ").concat(sourceType));
                        }
                        _b = source;
                        switch (_b) {
                            case 'condition': return [3 /*break*/, 1];
                            case 'formula': return [3 /*break*/, 3];
                            case 'table': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: return [4 /*yield*/, this.prisma.treeBranchLeafNodeCondition.findUnique({
                            where: { id: id },
                            select: { conditionSet: true }
                        })];
                    case 2:
                        condition = _c.sent();
                        return [2 /*return*/, (condition === null || condition === void 0 ? void 0 : condition.conditionSet) || null];
                    case 3: return [4 /*yield*/, this.prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: id },
                            select: { tokens: true }
                        })];
                    case 4:
                        formula = _c.sent();
                        return [2 /*return*/, (formula === null || formula === void 0 ? void 0 : formula.tokens) || null];
                    case 5: return [4 /*yield*/, this.prisma.treeBranchLeafNodeTable.findUnique({
                            where: { id: id },
                            select: {
                                data: true,
                                type: true,
                                columns: true,
                                rows: true,
                                lookupSelectColumn: true,
                                lookupDisplayColumns: true
                            }
                        })];
                    case 6:
                        table = _c.sent();
                        return [2 /*return*/, table || null];
                    case 7: throw new Error("Unknown operation source: ".concat(source));
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_1 = _c.sent();
                        console.error("Failed to resolve operation ".concat(sourceRef, ":"), error_1);
                        return [2 /*return*/, null];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Met à jour une entrée de soumission avec les données résolues
     */
    TreeBranchLeafResolver.prototype.updateSubmissionWithResolvedOperation = function (submissionDataId, sourceRef, operationSource) {
        return __awaiter(this, void 0, void 0, function () {
            var operationDetail, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.resolveOperation(operationSource, sourceRef)];
                    case 1:
                        operationDetail = _a.sent();
                        if (operationDetail === null) {
                            console.warn("Could not resolve operation ".concat(sourceRef));
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.update({
                                where: { id: submissionDataId },
                                data: {
                                    operationDetail: operationDetail,
                                    lastResolved: new Date()
                                }
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_2 = _a.sent();
                        console.error("Failed to update submission ".concat(submissionDataId, ":"), error_2);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Job en arrière-plan pour résoudre toutes les opérations non résolues
     */
    TreeBranchLeafResolver.prototype.resolveOperationsInBackground = function () {
        return __awaiter(this, void 0, void 0, function () {
            var unresolvedEntries, resolved, failed, _i, unresolvedEntries_1, entry, success, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔄 Starting background operation resolution...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.findMany({
                                where: {
                                    sourceRef: { not: null },
                                    operationDetail: null,
                                    operationSource: { not: null }
                                },
                                select: {
                                    id: true,
                                    sourceRef: true,
                                    operationSource: true
                                }
                            })];
                    case 2:
                        unresolvedEntries = _a.sent();
                        console.log("\uD83D\uDCCA Found ".concat(unresolvedEntries.length, " unresolved operations"));
                        resolved = 0;
                        failed = 0;
                        _i = 0, unresolvedEntries_1 = unresolvedEntries;
                        _a.label = 3;
                    case 3:
                        if (!(_i < unresolvedEntries_1.length)) return [3 /*break*/, 6];
                        entry = unresolvedEntries_1[_i];
                        if (!(entry.sourceRef && entry.operationSource)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.updateSubmissionWithResolvedOperation(entry.id, entry.sourceRef, entry.operationSource)];
                    case 4:
                        success = _a.sent();
                        if (success) {
                            resolved++;
                        }
                        else {
                            failed++;
                        }
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        console.log("\u2705 Background resolution completed: ".concat(resolved, " resolved, ").concat(failed, " failed"));
                        return [3 /*break*/, 8];
                    case 7:
                        error_3 = _a.sent();
                        console.error('❌ Background resolution failed:', error_3);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Invalide le cache d'une opération spécifique
     */
    TreeBranchLeafResolver.prototype.invalidateCache = function (sourceRef) {
        return __awaiter(this, void 0, void 0, function () {
            var entries, _i, entries_1, entry, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.findMany({
                                where: { sourceRef: sourceRef },
                                select: { id: true, operationSource: true }
                            })];
                    case 1:
                        entries = _a.sent();
                        _i = 0, entries_1 = entries;
                        _a.label = 2;
                    case 2:
                        if (!(_i < entries_1.length)) return [3 /*break*/, 5];
                        entry = entries_1[_i];
                        if (!entry.operationSource) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.updateSubmissionWithResolvedOperation(entry.id, sourceRef, entry.operationSource)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        console.log("\uD83D\uDD04 Cache invalidated for ".concat(entries.length, " entries referencing ").concat(sourceRef));
                        return [3 /*break*/, 7];
                    case 6:
                        error_4 = _a.sent();
                        console.error("Failed to invalidate cache for ".concat(sourceRef, ":"), error_4);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Calcule et met en cache le résultat d'une opération
     */
    TreeBranchLeafResolver.prototype.calculateAndCacheResult = function (submissionDataId) {
        return __awaiter(this, void 0, void 0, function () {
            var submissionData, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.findUnique({
                                where: { id: submissionDataId },
                                select: {
                                    operationSource: true,
                                    operationDetail: true,
                                    value: true
                                }
                            })];
                    case 1:
                        submissionData = _a.sent();
                        if (!(submissionData === null || submissionData === void 0 ? void 0 : submissionData.operationDetail)) {
                            return [2 /*return*/, null];
                        }
                        result = null;
                        // Logique de calcul selon le type d'opération
                        switch (submissionData.operationSource) {
                            case 'condition':
                                result = this.evaluateCondition(submissionData.operationDetail, submissionData.value);
                                break;
                            case 'formula':
                                result = this.evaluateFormula(submissionData.operationDetail, submissionData.value);
                                break;
                            case 'table':
                                result = this.evaluateTable(submissionData.operationDetail, submissionData.value);
                                break;
                        }
                        if (!(result !== null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.update({
                                where: { id: submissionDataId },
                                data: { operationResult: result }
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, result];
                    case 4:
                        error_5 = _a.sent();
                        console.error("Failed to calculate result for ".concat(submissionDataId, ":"), error_5);
                        return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Évalue une condition (placeholder pour la logique métier)
     */
    TreeBranchLeafResolver.prototype.evaluateCondition = function (conditionSet, value) {
        // TODO: Implémenter la logique d'évaluation des conditions
        return { evaluated: true, conditionSet: conditionSet, inputValue: value };
    };
    /**
     * Évalue une formule (placeholder pour la logique métier)
     */
    TreeBranchLeafResolver.prototype.evaluateFormula = function (tokens, value) {
        // TODO: Implémenter la logique d'évaluation des formules
        return { calculated: true, tokens: tokens, inputValue: value };
    };
    /**
     * Évalue une table avec support du lookup
     */
    TreeBranchLeafResolver.prototype.evaluateTable = function (tableData, value) {
        if (!tableData || typeof tableData !== 'object') {
            return null;
        }
        var table = tableData;
        // Si c'est une table avec lookup et qu'une valeur est sélectionnée
        if (table.type === 'columns' && table.lookupSelectColumn && value && table.rows) {
            // Trouver la ligne correspondant à la valeur sélectionnée
            var selectedRow_1 = table.rows.find(function (row) { return String(row[table.lookupSelectColumn]) === value; });
            if (!selectedRow_1) {
                return { error: 'Ligne non trouvée', selectedValue: value };
            }
            // Extraire les données des colonnes configurées
            var extractedData_1 = {
                selected: value
            };
            if (table.lookupDisplayColumns && table.lookupDisplayColumns.length > 0) {
                table.lookupDisplayColumns.forEach(function (colName) {
                    extractedData_1[colName] = selectedRow_1[colName];
                });
            }
            return {
                processed: true,
                type: 'lookup',
                selectedValue: value,
                data: extractedData_1,
                fullRow: selectedRow_1
            };
        }
        // Fallback pour les autres types de tables
        return { processed: true, tableData: tableData, inputValue: value };
    };
    return TreeBranchLeafResolver;
}());
exports.TreeBranchLeafResolver = TreeBranchLeafResolver;
// Instance singleton
var resolverInstance = null;
function getResolver(prisma) {
    if (!resolverInstance) {
        resolverInstance = new TreeBranchLeafResolver(prisma);
    }
    return resolverInstance;
}

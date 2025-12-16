"use strict";
/**
 * 🚀 TBL EVALUATION ENGINE V2.0
 *
 * Moteur d'évaluation intelligent qui remplace TOUS les anciens systèmes !
 * - Formules avec codes TBL
 * - Conditions avec options + champs
 * - Tableaux avec sources intelligentes
 * - Résolution automatique des dépendances
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TBLEvaluationEngine = void 0;
var TBLIntelligence_1 = __importDefault(require("./TBLIntelligence"));
var TBLEvaluationEngine = /** @class */ (function () {
    function TBLEvaluationEngine() {
        this.evaluationCache = new Map();
        this.CACHE_TTL = 5000; // 5 secondes
        this.intelligence = new TBLIntelligence_1.default();
    }
    /**
     * 🎯 ÉVALUATION PRINCIPALE
     * Point d'entrée unique pour toutes les évaluations TBL
     */
    TBLEvaluationEngine.prototype.evaluate = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, result, cacheKey, cached, analysis, _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        console.log("\uD83D\uDE80 [TBL Evaluation] D\u00E9but \u00E9valuation ".concat(request.element_code));
                        console.log("   Mode: ".concat(request.evaluation_mode, ", Deep: ").concat(request.deep_resolution));
                        result = {
                            success: false,
                            element_code: request.element_code,
                            final_value: null,
                            evaluation_path: [],
                            dependencies_used: [],
                            options_triggered: [],
                            formulas_calculated: [],
                            conditions_evaluated: [],
                            performance: {
                                total_time_ms: 0,
                                elements_analyzed: 0,
                                cache_hits: 0
                            },
                            errors: [],
                            warnings: []
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 14, , 15]);
                        cacheKey = this.getCacheKey(request);
                        cached = this.getCachedResult(cacheKey);
                        if (cached) {
                            console.log("\uD83D\uDCBE [TBL Evaluation] Cache HIT pour ".concat(request.element_code));
                            result.performance.cache_hits = 1;
                            result.final_value = cached;
                            result.success = true;
                            return [2 /*return*/, result];
                        }
                        return [4 /*yield*/, this.intelligence.analyzeElement(request.element_code)];
                    case 2:
                        analysis = _b.sent();
                        result.performance.elements_analyzed++;
                        result.evaluation_path.push(request.element_code);
                        _a = request.evaluation_mode;
                        switch (_a) {
                            case 'formula': return [3 /*break*/, 3];
                            case 'condition': return [3 /*break*/, 5];
                            case 'table': return [3 /*break*/, 7];
                            case 'auto': return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, this.evaluateFormulas(analysis, request, result)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 5: return [4 /*yield*/, this.evaluateConditions(analysis, request, result)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 7: return [4 /*yield*/, this.evaluateTables(analysis, request, result)];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, this.evaluateAuto(analysis, request, result)];
                    case 10:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 11:
                        if (!request.deep_resolution) return [3 /*break*/, 13];
                        return [4 /*yield*/, this.resolveDeepDependencies(analysis, request, result)];
                    case 12:
                        _b.sent();
                        _b.label = 13;
                    case 13:
                        // 5. Mise en cache du résultat
                        this.setCachedResult(cacheKey, result.final_value);
                        result.success = true;
                        console.log("\u2705 [TBL Evaluation] \u00C9valuation r\u00E9ussie: ".concat(request.element_code, " = ").concat(result.final_value));
                        return [3 /*break*/, 15];
                    case 14:
                        error_1 = _b.sent();
                        console.error("\u274C [TBL Evaluation] Erreur:", error_1);
                        result.errors.push(error_1 instanceof Error ? error_1.message : 'Erreur inconnue');
                        return [3 /*break*/, 15];
                    case 15:
                        result.performance.total_time_ms = Date.now() - startTime;
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * 🧮 ÉVALUATION DES FORMULES
     */
    TBLEvaluationEngine.prototype.evaluateFormulas = function (analysis, request, result) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, formula, fieldValues, _b, _c, fieldCode, value, formulaResult;
            return __generator(this, function (_d) {
                console.log("\uD83E\uDDEE [TBL Evaluation] \u00C9valuation de ".concat(analysis.formulas.length, " formules"));
                for (_i = 0, _a = analysis.formulas; _i < _a.length; _i++) {
                    formula = _a[_i];
                    try {
                        fieldValues = {};
                        for (_b = 0, _c = formula.referenced_fields; _b < _c.length; _b++) {
                            fieldCode = _c[_b];
                            if (fieldCode in request.context_values) {
                                value = request.context_values[fieldCode];
                                fieldValues[fieldCode] = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
                                result.dependencies_used.push(fieldCode);
                            }
                            else {
                                result.warnings.push("Champ manquant pour formule: ".concat(fieldCode));
                            }
                        }
                        formulaResult = this.calculateFormula(formula.formula_content, fieldValues);
                        result.formulas_calculated.push({
                            formula_id: formula.id,
                            referenced_codes: formula.referenced_fields,
                            result: formulaResult
                        });
                        // La dernière formule donne la valeur finale
                        result.final_value = formulaResult;
                        console.log("   \u2705 Formule ".concat(formula.id, ": ").concat(formulaResult));
                    }
                    catch (error) {
                        console.error("   \u274C Erreur formule ".concat(formula.id, ":"), error);
                        result.errors.push("Formule ".concat(formula.id, ": ").concat(error instanceof Error ? error.message : 'Erreur'));
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * ⚖️ ÉVALUATION DES CONDITIONS
     */
    TBLEvaluationEngine.prototype.evaluateConditions = function (analysis, request, result) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, condition, conditionResult, usedTriggers, _b, _c, triggerCode, triggerValue, triggerResult, _d, _e, mapping, optionValue, shouldShowField;
            return __generator(this, function (_f) {
                console.log("\u2696\uFE0F [TBL Evaluation] \u00C9valuation de ".concat(analysis.conditions.length, " conditions"));
                for (_i = 0, _a = analysis.conditions; _i < _a.length; _i++) {
                    condition = _a[_i];
                    try {
                        conditionResult = true;
                        usedTriggers = [];
                        for (_b = 0, _c = condition.trigger_elements; _b < _c.length; _b++) {
                            triggerCode = _c[_b];
                            if (triggerCode in request.context_values) {
                                triggerValue = request.context_values[triggerCode];
                                triggerResult = Boolean(triggerValue);
                                conditionResult = conditionResult && triggerResult;
                                usedTriggers.push(triggerCode);
                                result.dependencies_used.push(triggerCode);
                            }
                        }
                        // Évaluer les mappings options + champs
                        for (_d = 0, _e = condition.option_mappings; _d < _e.length; _d++) {
                            mapping = _e[_d];
                            optionValue = request.context_values[mapping.option_code];
                            shouldShowField = Boolean(optionValue) && mapping.show_when_selected;
                            result.options_triggered.push({
                                option_code: mapping.option_code,
                                field_code: mapping.field_code,
                                show_field: shouldShowField
                            });
                            console.log("   \uD83C\uDFAF Option ".concat(mapping.option_code, " \u2192 Champ ").concat(mapping.field_code, ": ").concat(shouldShowField ? 'AFFICHÉ' : 'MASQUÉ'));
                        }
                        result.conditions_evaluated.push({
                            condition_id: condition.id,
                            trigger_codes: usedTriggers,
                            result: conditionResult
                        });
                        result.final_value = conditionResult;
                        console.log("   \u2705 Condition ".concat(condition.id, ": ").concat(conditionResult));
                    }
                    catch (error) {
                        console.error("   \u274C Erreur condition ".concat(condition.id, ":"), error);
                        result.errors.push("Condition ".concat(condition.id, ": ").concat(error instanceof Error ? error.message : 'Erreur'));
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 📊 ÉVALUATION DES TABLEAUX
     */
    TBLEvaluationEngine.prototype.evaluateTables = function (analysis, request, result) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, table, tableData, _b, _c, sourceCode, sourceValue, _d, _e, computedCode;
            var _f;
            return __generator(this, function (_g) {
                console.log("\uD83D\uDCCA [TBL Evaluation] \u00C9valuation de ".concat(analysis.tables.length, " tableaux"));
                for (_i = 0, _a = analysis.tables; _i < _a.length; _i++) {
                    table = _a[_i];
                    try {
                        tableData = [];
                        for (_b = 0, _c = table.data_sources; _b < _c.length; _b++) {
                            sourceCode = _c[_b];
                            if (sourceCode in request.context_values) {
                                sourceValue = request.context_values[sourceCode];
                                // Simulation - adapter selon la structure réelle
                                tableData.push((_f = {}, _f[sourceCode] = sourceValue, _f));
                                result.dependencies_used.push(sourceCode);
                            }
                        }
                        // Calculer les colonnes computées
                        for (_d = 0, _e = table.computed_columns; _d < _e.length; _d++) {
                            computedCode = _e[_d];
                            // Ici on pourrait appeler récursivement l'évaluation pour les formules
                            console.log("   \uD83E\uDDEE Colonne calcul\u00E9e: ".concat(computedCode));
                        }
                        result.final_value = tableData;
                        console.log("   \u2705 Tableau ".concat(table.id, ": ").concat(tableData.length, " lignes"));
                    }
                    catch (error) {
                        console.error("   \u274C Erreur tableau ".concat(table.id, ":"), error);
                        result.errors.push("Tableau ".concat(table.id, ": ").concat(error instanceof Error ? error.message : 'Erreur'));
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 🤖 ÉVALUATION AUTOMATIQUE
     * Détecte automatiquement le type d'évaluation selon la capacité TBL
     */
    TBLEvaluationEngine.prototype.evaluateAuto = function (analysis, request, result) {
        return __awaiter(this, void 0, void 0, function () {
            var capacity, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        capacity = analysis.element.tbl_capacity;
                        console.log("\uD83E\uDD16 [TBL Evaluation] Mode auto - capacit\u00E9 d\u00E9tect\u00E9e: ".concat(capacity));
                        _a = capacity;
                        switch (_a) {
                            case 2: return [3 /*break*/, 1];
                            case 3: return [3 /*break*/, 3];
                            case 4: return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: // Formule
                    return [4 /*yield*/, this.evaluateFormulas(analysis, request, result)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 3: // Condition
                    return [4 /*yield*/, this.evaluateConditions(analysis, request, result)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 5: // Tableau
                    return [4 /*yield*/, this.evaluateTables(analysis, request, result)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        result.final_value = request.context_values[request.element_code] || null;
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔄 RÉSOLUTION RÉCURSIVE DES DÉPENDANCES
     */
    TBLEvaluationEngine.prototype.resolveDeepDependencies = function (analysis, request, result) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, dependency, subRequest, subResult;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log("\uD83D\uDD04 [TBL Evaluation] R\u00E9solution profonde des d\u00E9pendances");
                        _i = 0, _a = analysis.dependencies;
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        dependency = _a[_i];
                        if (!!result.evaluation_path.includes(dependency.source_code)) return [3 /*break*/, 3];
                        subRequest = __assign(__assign({}, request), { element_code: dependency.source_code, deep_resolution: false // Éviter la récursion infinie
                         });
                        return [4 /*yield*/, this.evaluate(subRequest)];
                    case 2:
                        subResult = _d.sent();
                        if (subResult.success) {
                            (_b = result.evaluation_path).push.apply(_b, subResult.evaluation_path);
                            (_c = result.dependencies_used).push.apply(_c, subResult.dependencies_used);
                            result.performance.elements_analyzed += subResult.performance.elements_analyzed;
                        }
                        _d.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🧮 CALCUL RÉEL DE FORMULE
     */
    TBLEvaluationEngine.prototype.calculateFormula = function (formulaContent, fieldValues) {
        try {
            // Simulation simple - remplacer par le vrai moteur de formules
            var sequence = JSON.parse(formulaContent);
            // Logique de calcul basique pour démonstration
            var result = 0;
            for (var _i = 0, sequence_1 = sequence; _i < sequence_1.length; _i++) {
                var token = sequence_1[_i];
                if (token.type === 'number') {
                    result += parseFloat(token.value) || 0;
                }
                else if (token.type === 'variable' && token.reference_code) {
                    result += fieldValues[token.reference_code] || 0;
                }
            }
            return result;
        }
        catch (_a) {
            return 0;
        }
    };
    /**
     * 💾 GESTION DU CACHE
     */
    TBLEvaluationEngine.prototype.getCacheKey = function (request) {
        var contextHash = JSON.stringify(request.context_values);
        return "".concat(request.element_code, ":").concat(request.evaluation_mode, ":").concat(contextHash);
    };
    TBLEvaluationEngine.prototype.getCachedResult = function (key) {
        var cached = this.evaluationCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.result;
        }
        return null;
    };
    TBLEvaluationEngine.prototype.setCachedResult = function (key, result) {
        this.evaluationCache.set(key, {
            result: result,
            timestamp: Date.now()
        });
    };
    return TBLEvaluationEngine;
}());
exports.TBLEvaluationEngine = TBLEvaluationEngine;
exports.default = TBLEvaluationEngine;

"use strict";
/**
 * 🌟 MOTEUR DE FORMULES DYNAMIQUES UNIVERSEL
 *
 * Ce service s'adapte automatiquement aux configurations des formulaires
 * et respecte toutes les conditions encodées pour TOUS les devis et formules.
 *
 * Fonctionnalités :
 * - Lecture dynamique des configurations
 * - Adaptation automatique aux changements
 * - Support de toutes les conditions complexes
 * - Gestion des advanced_select avec logique conditionnelle
 * - Calculs en  async applyFormulas(fieldValues: Record<string, unknown>, options?: {
    changedFieldId?: string;
    debug?: boolean;
    preloadedRules?: Record<string, { formulas?: any[] }>;
  }): Promise<{
    success: boolean;
    calculatedValues: Record<string, unknown>;
    appliedFormulas: { id: string; name: string }[];
    errors?: string[];
  }> {el
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicFormulaEngine = void 0;
var client_1 = require("@prisma/client");
var fieldMapping_1 = require("../config/fieldMapping");
var DynamicFormulaEngine = /** @class */ (function () {
    function DynamicFormulaEngine() {
        this.configCache = new Map();
        this.formulaCache = new Map();
        this.fieldMapping = (0, fieldMapping_1.getFieldMapping)(); // Mapping des champs centralisé
        this.prisma = new client_1.PrismaClient();
    }
    /**
     * 🔄 Charge toutes les configurations de champs dynamiquement
     */
    DynamicFormulaEngine.prototype.loadFieldConfigurations = function (organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var fields, configurations, _i, fields_1, field, config, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('🔄 [DynamicFormulaEngine] Chargement des configurations pour org:', organizationId);
                        return [4 /*yield*/, this.prisma.field.findMany({
                                include: {
                                    FieldFormula: true,
                                    FieldDependency_FieldDependency_fieldIdToField: {
                                        include: {
                                            Field_FieldDependency_dependsOnIdToField: true
                                        }
                                    },
                                    FieldValidation: true,
                                    optionNodes: true
                                }
                            })];
                    case 1:
                        fields = _a.sent();
                        configurations = {};
                        for (_i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
                            field = fields_1[_i];
                            config = {
                                id: field.id,
                                label: field.label,
                                type: field.type,
                                advancedConfig: field.advancedConfig,
                                options: field.optionNodes.map(function (node) { return ({
                                    id: node.id,
                                    label: node.label,
                                    value: node.value,
                                    fieldId: node.fieldId
                                }); }),
                                formulas: field.FieldFormula.map(function (formula) { return ({
                                    id: formula.id,
                                    formula: formula.formula || '',
                                    sequence: formula.sequence,
                                    fieldId: formula.fieldId
                                }); }),
                                dependencies: field.FieldDependency_FieldDependency_fieldIdToField.map(function (dep) { return ({
                                    id: dep.id,
                                    fieldId: dep.fieldId,
                                    dependsOnId: dep.dependsOnId,
                                    condition: dep.condition,
                                    value: dep.value || ''
                                }); }),
                                validations: field.FieldValidation.map(function (val) { return ({
                                    id: val.id,
                                    fieldId: val.fieldId,
                                    rule: val.rule,
                                    message: val.message || ''
                                }); })
                            };
                            configurations[field.id] = config;
                            this.configCache.set(field.id, config);
                        }
                        console.log('✅ [DynamicFormulaEngine] Configurations chargées:', Object.keys(configurations).length);
                        return [2 /*return*/, configurations];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ [DynamicFormulaEngine] Erreur chargement configurations:', error_1);
                        throw new Error("Erreur lors du chargement des configurations: ".concat(error_1.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🧠 Analyse et interprète les logiques conditionnelles automatiquement
     */
    DynamicFormulaEngine.prototype.analyzeConditionalLogic = function (fieldConfig) {
        var logics = [];
        // 1. Analyse des advanced_select (comme Prix Kw/h)
        if (fieldConfig.type === 'advanced_select' && fieldConfig.options) {
            for (var _i = 0, _a = fieldConfig.options; _i < _a.length; _i++) {
                var option = _a[_i];
                // Exemple: "Prix Kw/h" vs "Calcul du prix Kw/h"
                var logic = this.interpretAdvancedSelectOption(fieldConfig, option);
                if (logic) {
                    logics.push(logic);
                }
            }
        }
        // 2. Analyse des formules existantes
        if (fieldConfig.formulas) {
            for (var _b = 0, _c = fieldConfig.formulas; _b < _c.length; _b++) {
                var formula = _c[_b];
                var logic = this.parseFormulaToConditionalLogic(formula);
                if (logic) {
                    logics.push(logic);
                }
            }
        }
        // 3. Analyse des dépendances
        if (fieldConfig.dependencies) {
            for (var _d = 0, _e = fieldConfig.dependencies; _d < _e.length; _d++) {
                var dependency = _e[_d];
                var logic = this.interpretDependencyAsLogic(dependency);
                if (logic) {
                    logics.push(logic);
                }
            }
        }
        return logics;
    };
    /**
     * 🎯 Interprète une option d'advanced_select en logique conditionnelle
     */
    DynamicFormulaEngine.prototype.interpretAdvancedSelectOption = function (fieldConfig, option) {
        // Exemple pour Prix Kw/h
        if (fieldConfig.label.includes('Prix Kw/h')) {
            if (option.value === 'prix-kwh') {
                // Logique: SI "Prix Kw/h - Défini" = "Prix Kw/h (number)" ALORS copier
                return {
                    condition: "IF_".concat(fieldConfig.id, "_EQUALS_DIRECT_VALUE"),
                    field1: '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
                    operator: 'EQUALS',
                    field2: 'direct_price_value', // Valeur directe saisie
                    thenAction: 'COPY_VALUE',
                    elseAction: 'CALCULATE_DIVISION',
                    resultField: fieldConfig.id
                };
            }
            else if (option.value === 'calcul-du-prix-kwh') {
                // Logique: Division par consommation annuelle
                return {
                    condition: "IF_".concat(fieldConfig.id, "_EQUALS_CALCULATION"),
                    field1: 'calcul_du_prix_base', // Champ base de calcul
                    operator: 'DIVIDE_BY',
                    field2: 'aa448cfa-3d97-4c23-8995-8e013577e27d', // Consommation annuelle
                    thenAction: 'PERFORM_DIVISION',
                    elseAction: 'USE_DEFAULT',
                    resultField: '52c7f63b-7e57-4ba8-86da-19a176f09220' // Prix Kw/h - Défini
                };
            }
        }
        return null;
    };
    /**
     * 📐 Parse une formule textuelle en logique conditionnelle
     */
    DynamicFormulaEngine.prototype.parseFormulaToConditionalLogic = function (formula) {
        if (!formula.formula)
            return null;
        // Patterns de reconnaissance automatique
        var patterns = [
            {
                regex: /IF\s+(.+?)\s*=\s*(.+?)\s+THEN\s+(.+?)\s+ELSE\s+(.+)/i,
                handler: function (matches) { return ({
                    condition: "PARSED_".concat(formula.id),
                    field1: matches[1].trim(),
                    operator: 'EQUALS',
                    field2: matches[2].trim(),
                    thenAction: matches[3].trim(),
                    elseAction: matches[4].trim(),
                    resultField: formula.fieldId
                }); }
            },
            {
                regex: /(.+?)\s*\/\s*(.+)/,
                handler: function (matches) { return ({
                    condition: "DIVISION_".concat(formula.id),
                    field1: matches[1].trim(),
                    operator: 'DIVIDE_BY',
                    field2: matches[2].trim(),
                    thenAction: 'PERFORM_DIVISION',
                    elseAction: 'USE_DEFAULT',
                    resultField: formula.fieldId
                }); }
            }
        ];
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var pattern = patterns_1[_i];
            var matches = formula.formula.match(pattern.regex);
            if (matches) {
                return pattern.handler(matches);
            }
        }
        return null;
    };
    /**
     * 🔗 Interprète une dépendance comme logique conditionnelle
     */
    DynamicFormulaEngine.prototype.interpretDependencyAsLogic = function (dependency) {
        return {
            condition: "DEPENDENCY_".concat(dependency.id),
            field1: dependency.fieldId,
            operator: dependency.condition,
            field2: dependency.dependsOnId,
            thenAction: 'UPDATE_FIELD',
            elseAction: 'NO_ACTION',
            resultField: dependency.fieldId
        };
    };
    /**
     * 🧮 Exécute les calculs dynamiques selon les configurations
     */
    DynamicFormulaEngine.prototype.executeCalculations = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var results, conditionalFields, _i, conditionalFields_1, fieldConfig, logics, _a, logics_1, logic, result, prixKwhResult, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('🧮 [DynamicFormulaEngine] Exécution des calculs dynamiques...');
                        results = {};
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, , 11]);
                        conditionalFields = Object.values(context.fieldConfigs)
                            .filter(function (config) { return config.type === 'advanced_select' ||
                            (config.formulas && config.formulas.length > 0) ||
                            (config.dependencies && config.dependencies.length > 0); });
                        console.log('🎯 Champs conditionnels trouvés:', conditionalFields.length);
                        _i = 0, conditionalFields_1 = conditionalFields;
                        _b.label = 2;
                    case 2:
                        if (!(_i < conditionalFields_1.length)) return [3 /*break*/, 7];
                        fieldConfig = conditionalFields_1[_i];
                        logics = this.analyzeConditionalLogic(fieldConfig);
                        _a = 0, logics_1 = logics;
                        _b.label = 3;
                    case 3:
                        if (!(_a < logics_1.length)) return [3 /*break*/, 6];
                        logic = logics_1[_a];
                        return [4 /*yield*/, this.executeConditionalLogic(logic, context)];
                    case 4:
                        result = _b.sent();
                        if (result !== null) {
                            results[logic.resultField || fieldConfig.id] = result;
                        }
                        _b.label = 5;
                    case 5:
                        _a++;
                        return [3 /*break*/, 3];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        if (!context.fieldValues[this.fieldMapping.prix_kwh]) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.executePrixKwhLogic(context)];
                    case 8:
                        prixKwhResult = _b.sent();
                        if (prixKwhResult !== null) {
                            results[this.fieldMapping.prix_mois] = prixKwhResult;
                        }
                        _b.label = 9;
                    case 9:
                        console.log('✅ [DynamicFormulaEngine] Calculs terminés:', Object.keys(results).length);
                        return [2 /*return*/, results];
                    case 10:
                        error_2 = _b.sent();
                        console.error('❌ [DynamicFormulaEngine] Erreur dans les calculs:', error_2);
                        throw error_2;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ⚡ Logique spécifique Prix Kw/h selon vos spécifications
     */
    DynamicFormulaEngine.prototype.executePrixKwhLogic = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var selectedOption, prixDefini, consommation, directValue, calculBase, consommationValue, result;
            return __generator(this, function (_a) {
                selectedOption = context.fieldValues[this.fieldMapping.prix_kwh];
                prixDefini = context.fieldValues[this.fieldMapping.prix_mois];
                consommation = context.fieldValues[this.fieldMapping.consommation_kwh];
                console.log('⚡ [Prix Kw/h Logic] Option sélectionnée:', selectedOption);
                console.log('⚡ [Prix Kw/h Logic] Prix défini actuel:', prixDefini);
                console.log('⚡ [Prix Kw/h Logic] Consommation:', consommation);
                // Logique selon votre formule : 
                // "Si Prix Kw/h - Défini = Prix Kw/h (number) alors copier, sinon diviser Calcul du prix par Consommation annuelle"
                if (selectedOption === 'prix-kwh') {
                    directValue = context.fieldValues['direct_prix_kwh_input'];
                    console.log('💡 Utilisation valeur directe:', directValue);
                    return [2 /*return*/, directValue || prixDefini || 0];
                }
                else if (selectedOption === 'calcul-du-prix-kwh') {
                    calculBase = context.fieldValues['calcul_du_prix_base'] || prixDefini || 0;
                    consommationValue = parseFloat(consommation) || 1;
                    result = calculBase / consommationValue;
                    console.log('🧮 Calcul division:', calculBase, '/', consommationValue, '=', result);
                    return [2 /*return*/, result];
                }
                return [2 /*return*/, null];
            });
        });
    };
    /**
     * 🎯 Exécute une logique conditionnelle spécifique
     */
    DynamicFormulaEngine.prototype.executeConditionalLogic = function (logic, context) {
        return __awaiter(this, void 0, void 0, function () {
            var value1, value2, conditionMet, num1, num2, action;
            return __generator(this, function (_a) {
                value1 = context.fieldValues[logic.field1] || '';
                value2 = context.fieldValues[logic.field2] || '';
                console.log('🎯 Exécution logique:', logic.condition);
                console.log('   Field1:', logic.field1, '=', value1);
                console.log('   Operator:', logic.operator);
                console.log('   Field2:', logic.field2, '=', value2);
                conditionMet = false;
                // Évaluation de la condition
                switch (logic.operator) {
                    case 'EQUALS':
                        conditionMet = value1 === value2;
                        break;
                    case 'DIVIDE_BY': {
                        num1 = parseFloat(String(value1)) || 0;
                        num2 = parseFloat(String(value2)) || 1;
                        return [2 /*return*/, num1 / num2];
                    }
                    case 'MULTIPLY_BY':
                        return [2 /*return*/, (parseFloat(String(value1)) || 0) * (parseFloat(String(value2)) || 1)];
                    case 'GREATER_THAN':
                        conditionMet = parseFloat(String(value1)) > parseFloat(String(value2));
                        break;
                    case 'LESS_THAN':
                        conditionMet = parseFloat(String(value1)) < parseFloat(String(value2));
                        break;
                    default:
                        console.log('⚠️ Opérateur non reconnu:', logic.operator);
                }
                action = conditionMet ? logic.thenAction : logic.elseAction;
                console.log('✨ Action à exécuter:', action, '(condition met:', conditionMet, ')');
                switch (action) {
                    case 'COPY_VALUE':
                        return [2 /*return*/, value1];
                    case 'PERFORM_DIVISION':
                        return [2 /*return*/, (parseFloat(String(value1)) || 0) / (parseFloat(String(value2)) || 1)];
                    case 'USE_DEFAULT':
                        return [2 /*return*/, context.fieldValues[logic.resultField || ''] || 0];
                    case 'NO_ACTION':
                        return [2 /*return*/, null];
                    default:
                        console.log('⚠️ Action non reconnue:', action);
                        return [2 /*return*/, null];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 🔄 Met à jour une configuration de champ (adaptatif)
     */
    DynamicFormulaEngine.prototype.updateFieldConfiguration = function (fieldId, newConfig) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.log('🔄 [DynamicFormulaEngine] Mise à jour configuration:', fieldId);
                        updateData = {};
                        if (newConfig.advancedConfig) {
                            updateData.advancedConfig = newConfig.advancedConfig;
                        }
                        if (!(Object.keys(updateData).length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.prisma.field.update({
                                where: { id: fieldId },
                                data: updateData
                            })];
                    case 1:
                        _a.sent();
                        // Invalidation du cache
                        this.configCache.delete(fieldId);
                        console.log('✅ Configuration mise à jour et cache invalidé');
                        _a.label = 2;
                    case 2: return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('❌ Erreur mise à jour configuration:', error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * � Méthode principale appelée par DevisPage
     * Applique toutes les formules dynamiques selon les configurations de la base de données
     */
    DynamicFormulaEngine.prototype.applyFormulas = function (fieldValues, options) {
        return __awaiter(this, void 0, void 0, function () {
            var debug, changedFieldId, preloadedRules, calculatedValues, appliedFormulas, errors, formulas_2, _i, formulas_1, formula, sequence, result, formulaError_1, errorMsg, error_4, errorMsg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug = (options === null || options === void 0 ? void 0 : options.debug) || false;
                        changedFieldId = options === null || options === void 0 ? void 0 : options.changedFieldId;
                        preloadedRules = options === null || options === void 0 ? void 0 : options.preloadedRules;
                        if (debug)
                            console.log('🚀 [DynamicFormulaEngine] Application des formules - déclenchée par:', changedFieldId, 'règles préchargées:', !!preloadedRules);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 11, , 12]);
                        calculatedValues = {};
                        appliedFormulas = [];
                        errors = [];
                        formulas_2 = [];
                        if (!preloadedRules) return [3 /*break*/, 2];
                        // Utiliser les règles préchargées du DevisPage
                        if (debug)
                            console.log('📋 Utilisation des règles préchargées');
                        Object.entries(preloadedRules).forEach(function (_a) {
                            var fieldId = _a[0], rules = _a[1];
                            if (rules.formulas && Array.isArray(rules.formulas)) {
                                rules.formulas.forEach(function (formula) {
                                    formulas_2.push(__assign(__assign({}, formula), { fieldId: fieldId }));
                                });
                            }
                        });
                        if (debug)
                            console.log("\uD83D\uDCCA ".concat(formulas_2.length, " formules trouv\u00E9es dans les r\u00E8gles pr\u00E9charg\u00E9es"));
                        return [3 /*break*/, 4];
                    case 2:
                        // Fallback: requêtes à la base de données
                        if (debug)
                            console.log('🔄 Chargement des formules depuis la base de données');
                        return [4 /*yield*/, this.prisma.fieldFormula.findMany({
                                orderBy: { order: 'asc' }
                            })];
                    case 3:
                        formulas_2 = _a.sent();
                        _a.label = 4;
                    case 4:
                        _i = 0, formulas_1 = formulas_2;
                        _a.label = 5;
                    case 5:
                        if (!(_i < formulas_1.length)) return [3 /*break*/, 10];
                        formula = formulas_1[_i];
                        if (!formula.sequence)
                            return [3 /*break*/, 9];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        sequence = void 0;
                        // Gérer les deux formats : string JSON (ancien modèle direct) ou array déjà parsé (API)
                        if (typeof formula.sequence === 'string') {
                            try {
                                sequence = JSON.parse(formula.sequence);
                            }
                            catch (_b) {
                                if (debug)
                                    console.warn('⚠️ Formule avec séquence JSON invalide:', formula.id);
                                return [3 /*break*/, 9];
                            }
                        }
                        else if (Array.isArray(formula.sequence)) {
                            sequence = formula.sequence;
                        }
                        else {
                            if (debug)
                                console.warn('⚠️ Formule avec format de séquence non supporté:', formula.id);
                            return [3 /*break*/, 9];
                        }
                        if (!Array.isArray(sequence) || sequence.length === 0)
                            return [3 /*break*/, 9];
                        return [4 /*yield*/, this.evaluateFormulaSequence(sequence, fieldValues, { debug: debug })];
                    case 7:
                        result = _a.sent();
                        if (result.success && result.value !== undefined) {
                            calculatedValues[formula.fieldId] = result.value;
                            appliedFormulas.push({ id: formula.id, name: formula.name || formula.id });
                            if (debug) {
                                console.log("\u2705 Formule appliqu\u00E9e: ".concat(formula.name, " \u2192 ").concat(formula.fieldId, " = ").concat(result.value));
                            }
                        }
                        else if (result.error) {
                            errors.push("Erreur formule ".concat(formula.name, ": ").concat(result.error));
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        formulaError_1 = _a.sent();
                        errorMsg = formulaError_1 instanceof Error ? formulaError_1.message : String(formulaError_1);
                        errors.push("Erreur formule ".concat(formula.name || formula.id, ": ").concat(errorMsg));
                        if (debug)
                            console.error('❌ Erreur formule:', formula.id, errorMsg);
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 5];
                    case 10: return [2 /*return*/, {
                            success: true,
                            calculatedValues: calculatedValues,
                            appliedFormulas: appliedFormulas,
                            errors: errors.length > 0 ? errors : undefined
                        }];
                    case 11:
                        error_4 = _a.sent();
                        errorMsg = error_4 instanceof Error ? error_4.message : String(error_4);
                        if (debug)
                            console.error('❌ [DynamicFormulaEngine] Erreur générale:', errorMsg);
                        return [2 /*return*/, {
                                success: false,
                                calculatedValues: {},
                                appliedFormulas: [],
                                errors: [errorMsg]
                            }];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🎯 Évalue une séquence de formule (comme notre formule Prix Kw/h)
     */
    DynamicFormulaEngine.prototype.evaluateFormulaSequence = function (sequence_1, fieldValues_1) {
        return __awaiter(this, arguments, void 0, function (sequence, fieldValues, options) {
            var debug, _i, sequence_2, item, element;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                debug = options.debug || false;
                for (_i = 0, sequence_2 = sequence; _i < sequence_2.length; _i++) {
                    item = sequence_2[_i];
                    if (!item || typeof item !== 'object')
                        continue;
                    element = item;
                    // Traitement conditionnel (comme notre formule Prix Kw/h)
                    if (element.type === 'cond') {
                        return [2 /*return*/, this.evaluateConditionalElement(element, fieldValues, { debug: debug })];
                    }
                }
                return [2 /*return*/, { success: false, error: 'Aucun élément évaluable dans la séquence' }];
            });
        });
    };
    /**
     * 🔀 Évalue un élément conditionnel (IF/THEN/ELSE)
     */
    DynamicFormulaEngine.prototype.evaluateConditionalElement = function (element_1, fieldValues_1) {
        return __awaiter(this, arguments, void 0, function (element, fieldValues, options) {
            var debug, condition, fieldId, operator, expectedValue, part, actualValue, fieldValue, obj, conditionMet, branch;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                debug = options.debug || false;
                condition = element.condition;
                if (!condition) {
                    return [2 /*return*/, { success: false, error: 'Condition manquante' }];
                }
                fieldId = condition.fieldId;
                operator = condition.operator;
                expectedValue = condition.value;
                part = condition.part || 'selection';
                fieldValue = fieldValues[fieldId];
                if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
                    obj = fieldValue;
                    actualValue = obj[part];
                }
                else {
                    actualValue = fieldValue;
                }
                if (debug) {
                    console.log("\uD83D\uDD0D Condition: ".concat(fieldId, ".").concat(part, " ").concat(operator, " ").concat(expectedValue));
                    console.log("\uD83D\uDD0D Valeur actuelle: ".concat(actualValue));
                }
                conditionMet = false;
                if (operator === '=') {
                    conditionMet = actualValue === expectedValue;
                }
                if (debug) {
                    console.log("\uD83D\uDD0D Condition remplie: ".concat(conditionMet));
                }
                branch = conditionMet ? element.then : element.else;
                if (!Array.isArray(branch)) {
                    return [2 /*return*/, { success: false, error: 'Branche manquante' }];
                }
                // Évaluer la branche
                return [2 /*return*/, this.evaluateBranch(branch, fieldValues, { debug: debug })];
            });
        });
    };
    /**
     * 🌿 Évalue une branche (THEN ou ELSE)
     */
    DynamicFormulaEngine.prototype.evaluateBranch = function (branch_1, fieldValues_1) {
        return __awaiter(this, arguments, void 0, function (branch, fieldValues, options) {
            var debug, action, value1Action, operatorAction, value2Action, val1Result, val2Result, operator, num1, num2, result;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug = options.debug || false;
                        if (debug) {
                            console.log("\uD83C\uDF3F evaluateBranch: longueur = ".concat(branch.length));
                            console.log("\uD83C\uDF3F Structure branche:", JSON.stringify(branch, null, 2));
                        }
                        if (!(branch.length === 1)) return [3 /*break*/, 1];
                        action = branch[0];
                        return [2 /*return*/, this.evaluateAction(action, fieldValues, { debug: debug })];
                    case 1:
                        if (!(branch.length === 3)) return [3 /*break*/, 4];
                        value1Action = branch[0];
                        operatorAction = branch[1];
                        value2Action = branch[2];
                        if (debug) {
                            console.log("\uD83E\uDDEE \u00C9valuation branche 3 \u00E9l\u00E9ments:");
                            console.log("\uD83E\uDDEE \u00C9l\u00E9ment 1:", JSON.stringify(value1Action, null, 2));
                            console.log("\uD83E\uDDEE \u00C9l\u00E9ment 2:", JSON.stringify(operatorAction, null, 2));
                            console.log("\uD83E\uDDEE \u00C9l\u00E9ment 3:", JSON.stringify(value2Action, null, 2));
                        }
                        return [4 /*yield*/, this.evaluateAction(value1Action, fieldValues, { debug: debug })];
                    case 2:
                        val1Result = _a.sent();
                        return [4 /*yield*/, this.evaluateAction(value2Action, fieldValues, { debug: debug })];
                    case 3:
                        val2Result = _a.sent();
                        if (debug) {
                            console.log("\uD83E\uDDEE R\u00E9sultat val1:", val1Result);
                            console.log("\uD83E\uDDEE R\u00E9sultat val2:", val2Result);
                        }
                        if (!val1Result.success || !val2Result.success) {
                            return [2 /*return*/, { success: false, error: 'Erreur évaluation des opérandes' }];
                        }
                        operator = operatorAction.value;
                        num1 = parseFloat(String(val1Result.value)) || 0;
                        num2 = parseFloat(String(val2Result.value)) || 0;
                        if (debug) {
                            console.log("\uD83E\uDDEE Calcul: ".concat(num1, " ").concat(operator, " ").concat(num2));
                        }
                        if (operator === '/') {
                            if (num2 === 0) {
                                return [2 /*return*/, { success: false, error: 'Division par zéro' }];
                            }
                            result = num1 / num2;
                            if (debug)
                                console.log("\uD83E\uDDEE R\u00E9sultat division: ".concat(result));
                            return [2 /*return*/, { success: true, value: result }];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        if (debug) {
                            console.log("\uD83C\uDF3F Branche non trait\u00E9e - longueur: ".concat(branch.length));
                            console.log("\uD83C\uDF3F Contenu:", JSON.stringify(branch, null, 2));
                        }
                        _a.label = 5;
                    case 5: return [2 /*return*/, { success: false, error: 'Structure de branche non supportée' }];
                }
            });
        });
    };
    /**
     * ⚡ Évalue une action individuelle
     */
    DynamicFormulaEngine.prototype.evaluateAction = function (action_1, fieldValues_1) {
        return __awaiter(this, arguments, void 0, function (action, fieldValues, options) {
            var debug, type, value, nextFieldId, _i, _a, _b, _fieldId, fieldValue, obj, result, _c, _d, _e, fieldValue, obj, node, nodeData, nextField, nextFieldObj, result, _f, fieldValue, numValue, numValue;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        debug = options.debug || false;
                        type = action.type;
                        value = action.value;
                        if (debug) {
                            console.log("\u26A1 Action: ".concat(type, " = ").concat(value));
                        }
                        if (!(type === 'value' && typeof value === 'string' && value.startsWith('nextField:'))) return [3 /*break*/, 7];
                        nextFieldId = value.substring('nextField:'.length);
                        if (debug)
                            console.log("\uD83D\uDD0D Recherche NextField: ".concat(nextFieldId));
                        // CORRECTION: Chercher directement le nodeId qui correspond
                        for (_i = 0, _a = Object.entries(fieldValues); _i < _a.length; _i++) {
                            _b = _a[_i], _fieldId = _b[0], fieldValue = _b[1];
                            if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
                                obj = fieldValue;
                                // Si c'est un advanced_select avec nodeId qui correspond DIRECTEMENT
                                if (obj.nodeId === nextFieldId && obj.extra !== undefined) {
                                    result = parseFloat(String(obj.extra)) || 0;
                                    if (debug)
                                        console.log("\uD83D\uDCCB NextField trouv\u00E9 directement: ".concat(result, " (nodeId: ").concat(nextFieldId, ")"));
                                    return [2 /*return*/, { success: true, value: result }];
                                }
                            }
                        }
                        _c = 0, _d = Object.entries(fieldValues);
                        _g.label = 1;
                    case 1:
                        if (!(_c < _d.length)) return [3 /*break*/, 6];
                        _e = _d[_c], fieldValue = _e[1];
                        if (!(fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue))) return [3 /*break*/, 5];
                        obj = fieldValue;
                        if (!(obj.nodeId && obj.extra !== undefined)) return [3 /*break*/, 5];
                        _g.label = 2;
                    case 2:
                        _g.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.prisma.optionNode.findUnique({
                                where: { id: obj.nodeId }
                            })];
                    case 3:
                        node = _g.sent();
                        if (node && node.data) {
                            nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data;
                            if (nodeData && typeof nodeData === 'object') {
                                nextField = nodeData.nextField;
                                if (nextField && typeof nextField === 'object') {
                                    nextFieldObj = nextField;
                                    if (nextFieldObj.id === nextFieldId) {
                                        result = parseFloat(String(obj.extra)) || 0;
                                        if (debug)
                                            console.log("\uD83D\uDCCB NextField trouv\u00E9: ".concat(result));
                                        return [2 /*return*/, { success: true, value: result }];
                                    }
                                }
                            }
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        _f = _g.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _c++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, { success: false, error: "NextField ".concat(nextFieldId, " non trouv\u00E9") }];
                    case 7:
                        if (type === 'field') {
                            fieldValue = fieldValues[value];
                            numValue = parseFloat(String(fieldValue)) || 0;
                            if (debug)
                                console.log("\uD83D\uDCCB Field ".concat(value, ": ").concat(numValue));
                            return [2 /*return*/, { success: true, value: numValue }];
                        }
                        else if (type === 'value') {
                            numValue = parseFloat(String(value)) || 0;
                            if (debug)
                                console.log("\uD83D\uDCCB Value: ".concat(numValue));
                            return [2 /*return*/, { success: true, value: numValue }];
                        }
                        _g.label = 8;
                    case 8: return [2 /*return*/, { success: false, error: "Type d'action non support\u00E9: ".concat(type) }];
                }
            });
        });
    };
    /**
     * �🗑️ Nettoyage des ressources
     */
    DynamicFormulaEngine.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.configCache.clear();
                        this.formulaCache.clear();
                        return [4 /*yield*/, this.prisma.$disconnect()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return DynamicFormulaEngine;
}());
exports.DynamicFormulaEngine = DynamicFormulaEngine;
exports.default = DynamicFormulaEngine;

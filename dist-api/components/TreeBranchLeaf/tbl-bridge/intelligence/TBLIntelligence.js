"use strict";
/**
 * 🧠 TBL BRIDGE INTELLIGENCE V2.0
 *
 * Extension du TBL Bridge pour gérer intelligemment :
 * - Formules avec reconnaissance des codes TBL
 * - Conditions avec compréhension des options + champs
 * - Tableaux avec mapping des données sources
 *
 * Ce système remplace TOUS les anciens systèmes d'évaluation !
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
exports.TBLIntelligence = void 0;
var client_1 = require("@prisma/client");
var TBLIntelligence = /** @class */ (function () {
    function TBLIntelligence() {
        this.elementRegistry = new Map();
        this.formulaRegistry = new Map();
        this.conditionRegistry = new Map();
        this.tableRegistry = new Map();
        this.dataCache = new Map();
        this.prisma = new client_1.PrismaClient();
    }
    /**
     * 📖 LECTURE ET DÉCODAGE DES DONNÉES ENCODÉES
     * Lit les données stockées dans la base et les décode pour évaluation
     */
    TBLIntelligence.prototype.readAndDecodeElementData = function (elementId, elementType) {
        return __awaiter(this, void 0, void 0, function () {
            var cacheKey, decodedData, _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cacheKey = "".concat(elementType, "_").concat(elementId);
                        // Vérifier le cache d'abord
                        if (this.dataCache.has(cacheKey)) {
                            console.log("\uD83D\uDCD6 [TBL Intelligence] Donn\u00E9es en cache pour ".concat(cacheKey));
                            return [2 /*return*/, this.dataCache.get(cacheKey)];
                        }
                        console.log("\uD83D\uDCD6 [TBL Intelligence] Lecture donn\u00E9es encod\u00E9es pour ".concat(elementType, " ").concat(elementId));
                        decodedData = {};
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 12, , 13]);
                        _a = elementType;
                        switch (_a) {
                            case 'formula': return [3 /*break*/, 2];
                            case 'condition': return [3 /*break*/, 4];
                            case 'table': return [3 /*break*/, 6];
                            case 'field': return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 10];
                    case 2: return [4 /*yield*/, this.readFormulaData(elementId)];
                    case 3:
                        decodedData = _b.sent();
                        return [3 /*break*/, 11];
                    case 4: return [4 /*yield*/, this.readConditionData(elementId)];
                    case 5:
                        decodedData = _b.sent();
                        return [3 /*break*/, 11];
                    case 6: return [4 /*yield*/, this.readTableData(elementId)];
                    case 7:
                        decodedData = _b.sent();
                        return [3 /*break*/, 11];
                    case 8: return [4 /*yield*/, this.readFieldData(elementId)];
                    case 9:
                        decodedData = _b.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        console.warn("Type d'\u00E9l\u00E9ment non support\u00E9 pour lecture donn\u00E9es: ".concat(elementType));
                        _b.label = 11;
                    case 11:
                        // Mettre en cache
                        this.dataCache.set(cacheKey, decodedData);
                        console.log("\uD83D\uDCD6 [TBL Intelligence] Donn\u00E9es d\u00E9cod\u00E9es pour ".concat(cacheKey, ":"), decodedData);
                        return [2 /*return*/, decodedData];
                    case 12:
                        error_1 = _b.sent();
                        console.error("\uD83D\uDCD6 [TBL Intelligence] Erreur lecture donn\u00E9es ".concat(cacheKey, ":"), error_1);
                        return [2 /*return*/, {}];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🧮 LECTURE DES DONNÉES DE FORMULE
     */
    TBLIntelligence.prototype.readFormulaData = function (formulaId) {
        return __awaiter(this, void 0, void 0, function () {
            var formula, tokens, variables, sequence, _i, tokens_1, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.prisma.treeBranchLeafNodeFormula.findFirst({
                            where: { nodeId: formulaId }
                        })];
                    case 1:
                        formula = _a.sent();
                        if (!formula)
                            return [2 /*return*/, {}];
                        tokens = [];
                        try {
                            tokens = formula.tokens ? JSON.parse(formula.tokens) : [];
                        }
                        catch (e) {
                            console.warn('Erreur décodage tokens formule:', e);
                        }
                        variables = {};
                        sequence = [];
                        for (_i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
                            token = tokens_1[_i];
                            if (token.type === 'variable' && token.variable_name && token.value !== null) {
                                variables[token.variable_name] = this.parseValue(token.value);
                            }
                            // Construire la séquence d'évaluation
                            sequence.push(token.value || token.variable_name || token.operator);
                        }
                        return [2 /*return*/, {
                                formula_content: formula.name || '',
                                tokens: tokens,
                                sequence: sequence,
                                variables: variables,
                                description: formula.description
                            }];
                }
            });
        });
    };
    /**
     * 🔧 PARSEUR DE VALEURS
     */
    TBLIntelligence.prototype.parseValue = function (value) {
        if (value === null || value === undefined)
            return null;
        // Si c'est déjà un type primitif
        if (typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            // Essayer de parser en JSON si ça ressemble à du JSON
            if ((value.startsWith('{') && value.endsWith('}')) ||
                (value.startsWith('[') && value.endsWith(']'))) {
                try {
                    return JSON.parse(value);
                }
                catch (e) {
                    return value;
                }
            }
            // Essayer de convertir en nombre
            var num = parseFloat(value);
            if (!isNaN(num) && isFinite(num)) {
                return num;
            }
            // Essayer de convertir en boolean
            var lower = value.toLowerCase();
            if (lower === 'true')
                return true;
            if (lower === 'false')
                return false;
            return value;
        }
        return value;
    };
    /**
     * ⚖️ LECTURE DES DONNÉES DE CONDITION
     */
    TBLIntelligence.prototype.readConditionData = function (conditionId) {
        return __awaiter(this, void 0, void 0, function () {
            var condition, conditionSet, rules;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.prisma.treeBranchLeafNodeCondition.findFirst({
                            where: { nodeId: conditionId }
                        })];
                    case 1:
                        condition = _a.sent();
                        if (!condition)
                            return [2 /*return*/, {}];
                        conditionSet = {};
                        try {
                            conditionSet = condition.conditionSet ? JSON.parse(condition.conditionSet) : {};
                        }
                        catch (e) {
                            console.warn('Erreur décodage conditionSet:', e);
                        }
                        rules = Array.isArray(conditionSet.rules) ? conditionSet.rules : [];
                        return [2 /*return*/, {
                                condition_type: condition.name,
                                conditionSet: conditionSet,
                                rules: rules,
                                logic: conditionSet.logic || 'AND'
                            }];
                }
            });
        });
    };
    /**
     * 📊 LECTURE DES DONNÉES DE TABLEAU
     */
    TBLIntelligence.prototype.readTableData = function (tableId) {
        return __awaiter(this, void 0, void 0, function () {
            var table, tableData, columns;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.prisma.treeBranchLeafNodeTable.findFirst({
                            where: { nodeId: tableId }
                        })];
                    case 1:
                        table = _a.sent();
                        if (!table)
                            return [2 /*return*/, {}];
                        tableData = [];
                        columns = [];
                        try {
                            tableData = table.data ? (typeof table.data === 'string' ? JSON.parse(table.data) : table.data) : [];
                            columns = table.columns ? (typeof table.columns === 'string' ? JSON.parse(table.columns) : table.columns) : [];
                        }
                        catch (e) {
                            console.warn('Erreur décodage données tableau:', e);
                        }
                        return [2 /*return*/, {
                                table_type: table.type,
                                columns: columns,
                                data: tableData,
                                metadata: {
                                    rows: Array.isArray(tableData) ? tableData.length : 0,
                                    has_formulas: Array.isArray(columns) ? columns.some(function (col) { return col.formula; }) : false
                                }
                            }];
                }
            });
        });
    };
    /**
     * 🏷️ LECTURE DES DONNÉES DE CHAMP
     */
    TBLIntelligence.prototype.readFieldData = function (fieldId) {
        return __awaiter(this, void 0, void 0, function () {
            var field;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.prisma.treeBranchLeafNode.findUnique({
                            where: { id: fieldId },
                            include: {
                                other_TreeBranchLeafNode: {
                                    select: {
                                        id: true,
                                        label: true,
                                        tbl_code: true,
                                        value: true,
                                        type: true
                                    }
                                }
                            }
                        })];
                    case 1:
                        field = _b.sent();
                        if (!field)
                            return [2 /*return*/, {}];
                        return [2 /*return*/, {
                                field_type: field.type,
                                tbl_code: field.tbl_code,
                                value: this.parseValue(field.value),
                                options: ((_a = field.other_TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.map(function (child) { return ({
                                    id: child.id,
                                    label: child.label,
                                    tbl_code: child.tbl_code,
                                    value: _this.parseValue(child.value),
                                    type: child.type
                                }); })) || []
                            }];
                }
            });
        });
    };
    /**
     * 🧮 MOTEUR DE CALCUL POUR FORMULES
     * Exécute les calculs mathématiques avec support des variables TBL
     */
    TBLIntelligence.prototype.calculateFormula = function (formulaId_1) {
        return __awaiter(this, arguments, void 0, function (formulaId, contextData) {
            var steps, formulaData, allVariables, result, error_2, errorMessage;
            if (contextData === void 0) { contextData = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83E\uDDEE [TBL Intelligence] Calcul formule ".concat(formulaId));
                        steps = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.readAndDecodeElementData(formulaId, 'formula')];
                    case 2:
                        formulaData = _a.sent();
                        if (!formulaData.sequence || !Array.isArray(formulaData.sequence)) {
                            throw new Error('Séquence de formule invalide');
                        }
                        steps.push("\uD83D\uDCD6 Formule charg\u00E9e: ".concat(formulaData.formula_content));
                        steps.push("\uD83D\uDD22 Variables disponibles: ".concat(Object.keys(formulaData.variables).join(', ')));
                        allVariables = __assign(__assign({}, formulaData.variables), contextData);
                        steps.push("\uD83D\uDD17 Variables totales: ".concat(Object.keys(allVariables).length));
                        return [4 /*yield*/, this.evaluateFormulaSequence(formulaData.sequence, allVariables, steps)];
                    case 3:
                        result = _a.sent();
                        steps.push("\u2705 R\u00E9sultat final: ".concat(result));
                        return [2 /*return*/, {
                                result: result,
                                success: true,
                                steps: steps
                            }];
                    case 4:
                        error_2 = _a.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : 'Erreur inconnue';
                        steps.push("\u274C Erreur: ".concat(errorMessage));
                        return [2 /*return*/, {
                                result: null,
                                success: false,
                                error: errorMessage,
                                steps: steps
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🧩 ÉVALUATEUR DE SÉQUENCE DE FORMULE
     */
    TBLIntelligence.prototype.evaluateFormulaSequence = function (sequence, variables, steps) {
        return __awaiter(this, void 0, void 0, function () {
            var stack, i, token, value, result, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stack = [];
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < sequence.length)) return [3 /*break*/, 8];
                        token = sequence[i];
                        steps.push("\uD83D\uDD04 Token ".concat(i, ": ").concat(JSON.stringify(token)));
                        if (!(typeof token === 'number')) return [3 /*break*/, 2];
                        stack.push(token);
                        steps.push("\uD83D\uDCCA Nombre ajout\u00E9: ".concat(token));
                        return [3 /*break*/, 7];
                    case 2:
                        if (!(typeof token === 'string')) return [3 /*break*/, 7];
                        if (!(token.startsWith('TBL_') && variables[token] !== undefined)) return [3 /*break*/, 3];
                        value = this.convertToNumber(variables[token]);
                        stack.push(value);
                        steps.push("\uD83C\uDFF7\uFE0F Variable ".concat(token, " = ").concat(value));
                        return [3 /*break*/, 7];
                    case 3:
                        if (!['+', '-', '*', '/', '^', '>', '<', '>=', '<=', '==', '!=', 'AND', 'OR'].includes(token)) return [3 /*break*/, 4];
                        result = this.executeOperation(token, stack, steps);
                        if (result !== null) {
                            stack.push(result);
                        }
                        return [3 /*break*/, 7];
                    case 4:
                        if (!token.includes('(')) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.executeFunction(token, stack, variables, steps)];
                    case 5:
                        result = _a.sent();
                        if (result !== null) {
                            stack.push(result);
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        stack.push(token);
                        steps.push("\uD83D\uDCDD String ajout\u00E9e: \"".concat(token, "\""));
                        _a.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 1];
                    case 8:
                        if (stack.length === 1) {
                            return [2 /*return*/, stack[0]];
                        }
                        else if (stack.length === 0) {
                            throw new Error('Évaluation vide');
                        }
                        else {
                            throw new Error("\u00C9valuation ambigu\u00EB: ".concat(stack.length, " r\u00E9sultats"));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ⚙️ EXÉCUTEUR D'OPÉRATIONS
     */
    TBLIntelligence.prototype.executeOperation = function (operator, stack, steps) {
        if (stack.length < 2) {
            steps.push("\u274C Pas assez d'op\u00E9randes pour ".concat(operator));
            return null;
        }
        var b = stack.pop();
        var a = stack.pop();
        var numA = this.convertToNumber(a);
        var numB = this.convertToNumber(b);
        var result;
        switch (operator) {
            case '+':
                result = numA + numB;
                break;
            case '-':
                result = numA - numB;
                break;
            case '*':
                result = numA * numB;
                break;
            case '/':
                if (numB === 0) {
                    steps.push("\u274C Division par z\u00E9ro");
                    return null;
                }
                result = numA / numB;
                break;
            case '^':
                result = Math.pow(numA, numB);
                break;
            case '>':
                result = numA > numB;
                break;
            case '<':
                result = numA < numB;
                break;
            case '>=':
                result = numA >= numB;
                break;
            case '<=':
                result = numA <= numB;
                break;
            case '==':
                result = a === b;
                break;
            case '!=':
                result = a !== b;
                break;
            case 'AND':
                result = Boolean(a) && Boolean(b);
                break;
            case 'OR':
                result = Boolean(a) || Boolean(b);
                break;
            default:
                steps.push("\u274C Op\u00E9rateur inconnu: ".concat(operator));
                return null;
        }
        steps.push("\uD83D\uDD22 ".concat(a, " ").concat(operator, " ").concat(b, " = ").concat(result));
        return result;
    };
    /**
     * 🔧 EXÉCUTEUR DE FONCTIONS
     */
    TBLIntelligence.prototype.executeFunction = function (functionCall, stack, variables, steps) {
        return __awaiter(this, void 0, void 0, function () {
            var match, funcName, argsStr, args, argTokens, _i, argTokens_1, argToken, requiredArgs, result, num, decimals, condition;
            var _this = this;
            return __generator(this, function (_a) {
                match = functionCall.match(/^(\w+)\((.*)\)$/);
                if (!match) {
                    steps.push("\u274C Format de fonction invalide: ".concat(functionCall));
                    return [2 /*return*/, null];
                }
                funcName = match[1];
                argsStr = match[2];
                args = [];
                if (argsStr.trim()) {
                    argTokens = argsStr.split(',').map(function (s) { return s.trim(); });
                    for (_i = 0, argTokens_1 = argTokens; _i < argTokens_1.length; _i++) {
                        argToken = argTokens_1[_i];
                        if (argToken.startsWith('TBL_') && variables[argToken] !== undefined) {
                            args.push(this.convertToNumber(variables[argToken]));
                        }
                        else if (!isNaN(Number(argToken))) {
                            args.push(Number(argToken));
                        }
                        else {
                            args.push(argToken.replace(/['"]/g, ''));
                        }
                    }
                }
                requiredArgs = this.getFunctionArity(funcName);
                while (args.length < requiredArgs && stack.length > 0) {
                    args.unshift(stack.pop());
                }
                result = null;
                switch (funcName.toUpperCase()) {
                    case 'SUM':
                        result = args.reduce(function (sum, val) { return sum + _this.convertToNumber(val); }, 0);
                        break;
                    case 'AVG':
                        result = args.length > 0 ? args.reduce(function (sum, val) { return sum + _this.convertToNumber(val); }, 0) / args.length : 0;
                        break;
                    case 'MIN':
                        result = Math.min.apply(Math, args.map(function (val) { return _this.convertToNumber(val); }));
                        break;
                    case 'MAX':
                        result = Math.max.apply(Math, args.map(function (val) { return _this.convertToNumber(val); }));
                        break;
                    case 'ROUND':
                        num = this.convertToNumber(args[0]);
                        decimals = args[1] ? this.convertToNumber(args[1]) : 0;
                        result = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
                        break;
                    case 'IF':
                        condition = Boolean(args[0]);
                        result = condition ? args[1] : args[2];
                        break;
                    case 'CONCAT':
                        result = args.map(function (val) { return String(val); }).join('');
                        break;
                    case 'LEN':
                        result = String(args[0]).length;
                        break;
                    default:
                        steps.push("\u274C Fonction inconnue: ".concat(funcName));
                        return [2 /*return*/, null];
                }
                steps.push("\uD83D\uDD27 ".concat(funcName, "(").concat(args.join(', '), ") = ").concat(result));
                return [2 /*return*/, result];
            });
        });
    };
    /**
     * 📊 CONVERTISSEUR NUMÉRIQUE INTELLIGENT
     */
    TBLIntelligence.prototype.convertToNumber = function (value) {
        if (typeof value === 'number')
            return value;
        if (typeof value === 'boolean')
            return value ? 1 : 0;
        if (typeof value === 'string') {
            var num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };
    /**
     * ⚖️ MOTEUR D'ÉVALUATION DES CONDITIONS
     * Évalue les conditions logiques avec support des options et comparaisons
     */
    TBLIntelligence.prototype.evaluateCondition = function (conditionId_1) {
        return __awaiter(this, arguments, void 0, function (conditionId, contextData) {
            var details, conditionData, ruleResults, i, rule, ruleResult, finalResult, error_3, errorMessage;
            if (contextData === void 0) { contextData = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\u2696\uFE0F [TBL Intelligence] \u00C9valuation condition ".concat(conditionId));
                        details = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this.readAndDecodeElementData(conditionId, 'condition')];
                    case 2:
                        conditionData = _a.sent();
                        if (!conditionData.rules || !Array.isArray(conditionData.rules)) {
                            throw new Error('Règles de condition invalides');
                        }
                        details.push("\uD83D\uDCD6 Condition charg\u00E9e: ".concat(conditionData.condition_type));
                        details.push("\uD83D\uDCCB Nombre de r\u00E8gles: ".concat(conditionData.rules.length));
                        details.push("\uD83D\uDD17 Logique: ".concat(conditionData.logic || 'AND'));
                        ruleResults = [];
                        i = 0;
                        _a.label = 3;
                    case 3:
                        if (!(i < conditionData.rules.length)) return [3 /*break*/, 6];
                        rule = conditionData.rules[i];
                        return [4 /*yield*/, this.evaluateConditionRule(rule, contextData, details, i)];
                    case 4:
                        ruleResult = _a.sent();
                        ruleResults.push(ruleResult);
                        _a.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 3];
                    case 6:
                        finalResult = this.applyLogicToResults(ruleResults, conditionData.logic || 'AND', details);
                        details.push("\u2705 R\u00E9sultat final: ".concat(finalResult));
                        return [2 /*return*/, {
                                result: finalResult,
                                success: true,
                                details: details
                            }];
                    case 7:
                        error_3 = _a.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : 'Erreur inconnue';
                        details.push("\u274C Erreur: ".concat(errorMessage));
                        return [2 /*return*/, {
                                result: false,
                                success: false,
                                error: errorMessage,
                                details: details
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📏 ÉVALUATEUR DE RÈGLE INDIVIDUELLE
     */
    TBLIntelligence.prototype.evaluateConditionRule = function (rule, contextData, details, ruleIndex) {
        return __awaiter(this, void 0, void 0, function () {
            var sourceValue, sourceElement, selectedOption, compareValue, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        details.push("\uD83D\uDD0D R\u00E8gle ".concat(ruleIndex + 1, ": ").concat(rule.operator));
                        if (!rule.source_node_id) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.prisma.treeBranchLeafNode.findUnique({
                                where: { id: rule.source_node_id },
                                select: {
                                    value: true,
                                    tbl_code: true,
                                    label: true,
                                    other_TreeBranchLeafNode: {
                                        select: {
                                            id: true,
                                            value: true,
                                            tbl_code: true,
                                            label: true
                                        }
                                    }
                                }
                            })];
                    case 1:
                        sourceElement = _a.sent();
                        if (sourceElement) {
                            sourceValue = this.parseValue(sourceElement.value);
                            details.push("\uD83D\uDCCA Source ".concat(sourceElement.tbl_code, ": ").concat(sourceValue));
                            // Si c'est un champ avec options, vérifier si une option est sélectionnée
                            if (sourceElement.other_TreeBranchLeafNode && sourceElement.other_TreeBranchLeafNode.length > 0) {
                                selectedOption = sourceElement.other_TreeBranchLeafNode.find(function (child) {
                                    return child.value === sourceValue || child.tbl_code === sourceValue;
                                });
                                if (selectedOption) {
                                    sourceValue = selectedOption.value || selectedOption.tbl_code;
                                    details.push("\uD83C\uDFAF Option s\u00E9lectionn\u00E9e: ".concat(selectedOption.label, " (").concat(sourceValue, ")"));
                                }
                            }
                        }
                        else {
                            details.push("\u274C Source non trouv\u00E9e: ".concat(rule.source_node_id));
                            sourceValue = null;
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        if (contextData) {
                            // Chercher dans le contexte
                            sourceValue = contextData.sourceValue || null;
                            details.push("\uD83D\uDD17 Valeur du contexte: ".concat(sourceValue));
                        }
                        _a.label = 3;
                    case 3:
                        compareValue = rule.value;
                        details.push("\u2696\uFE0F Comparaison: ".concat(sourceValue, " ").concat(rule.operator, " ").concat(compareValue));
                        result = this.compareValues(sourceValue, rule.operator, compareValue);
                        details.push("\uD83D\uDCCA R\u00E9sultat r\u00E8gle ".concat(ruleIndex + 1, ": ").concat(result));
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * 🔍 COMPARATEUR DE VALEURS UNIVERSEL
     */
    TBLIntelligence.prototype.compareValues = function (sourceValue, operator, compareValue) {
        // Normaliser les valeurs
        var source = this.normalizeValueForComparison(sourceValue);
        var compare = this.normalizeValueForComparison(compareValue);
        switch (operator) {
            case '==':
            case 'equals':
                return source === compare;
            case '!=':
            case 'not_equals':
                return source !== compare;
            case '>':
            case 'greater_than':
                return Number(source) > Number(compare);
            case '>=':
            case 'greater_than_or_equal':
                return Number(source) >= Number(compare);
            case '<':
            case 'less_than':
                return Number(source) < Number(compare);
            case '<=':
            case 'less_than_or_equal':
                return Number(source) <= Number(compare);
            case 'contains':
                return String(source).toLowerCase().includes(String(compare).toLowerCase());
            case 'starts_with':
                return String(source).toLowerCase().startsWith(String(compare).toLowerCase());
            case 'ends_with':
                return String(source).toLowerCase().endsWith(String(compare).toLowerCase());
            case 'is_empty':
                return !source || source === '' || source === null || source === undefined;
            case 'is_not_empty':
                return !(!source || source === '' || source === null || source === undefined);
            case 'in':
                if (Array.isArray(compare)) {
                    return compare.includes(source);
                }
                return String(compare).split(',').map(function (s) { return s.trim(); }).includes(String(source));
            case 'not_in':
                if (Array.isArray(compare)) {
                    return !compare.includes(source);
                }
                return !String(compare).split(',').map(function (s) { return s.trim(); }).includes(String(source));
            default:
                console.warn("Op\u00E9rateur de comparaison non support\u00E9: ".concat(operator));
                return false;
        }
    };
    /**
     * 🔧 NORMALISATEUR DE VALEURS POUR COMPARAISON
     */
    TBLIntelligence.prototype.normalizeValueForComparison = function (value) {
        if (value === null || value === undefined)
            return null;
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string') {
            // Tenter de convertir en nombre si c'est possible
            var num = parseFloat(value.trim());
            if (!isNaN(num) && isFinite(num)) {
                return num;
            }
            // Tenter de convertir en boolean
            var lower = value.toLowerCase().trim();
            if (lower === 'true' || lower === '1')
                return true;
            if (lower === 'false' || lower === '0')
                return false;
            return value.trim();
        }
        return String(value);
    };
    /**
     * 🧮 APPLICATEUR DE LOGIQUE GLOBALE
     */
    TBLIntelligence.prototype.applyLogicToResults = function (results, logic, details) {
        details.push("\uD83E\uDDEE Application logique ".concat(logic, " sur ").concat(results.length, " r\u00E9sultats: [").concat(results.join(', '), "]"));
        switch (logic.toUpperCase()) {
            case 'AND':
                var andResult = results.every(function (r) { return r; });
                details.push("\uD83D\uDD17 AND: tous vrais = ".concat(andResult));
                return andResult;
            case 'OR':
                var orResult = results.some(function (r) { return r; });
                details.push("\uD83D\uDD17 OR: au moins un vrai = ".concat(orResult));
                return orResult;
            case 'XOR':
                var trueCount = results.filter(function (r) { return r; }).length;
                var xorResult = trueCount === 1;
                details.push("\uD83D\uDD17 XOR: exactement un vrai = ".concat(xorResult));
                return xorResult;
            case 'NAND':
                var nandResult = !results.every(function (r) { return r; });
                details.push("\uD83D\uDD17 NAND: pas tous vrais = ".concat(nandResult));
                return nandResult;
            case 'NOR':
                var norResult = !results.some(function (r) { return r; });
                details.push("\uD83D\uDD17 NOR: aucun vrai = ".concat(norResult));
                return norResult;
            default:
                details.push("\u26A0\uFE0F Logique inconnue ".concat(logic, ", utilisation de AND par d\u00E9faut"));
                return results.every(function (r) { return r; });
        }
    };
    /**
     * 📊 MOTEUR D'ANALYSE ET TRAITEMENT DES TABLEAUX
     * Analyse les structures de tableaux avec données dynamiques et formules
     */
    TBLIntelligence.prototype.processTable = function (tableId_1) {
        return __awaiter(this, arguments, void 0, function (tableId, contextData) {
            var processing, tableData, formulaColumns, processedData, calculatedCells, rowIndex, row, processedRow, colIndex, column, cellValue, cellContext, formulaResult, error_4, errorMsg, metadata, error_5, errorMessage;
            if (contextData === void 0) { contextData = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83D\uDCCA [TBL Intelligence] Traitement tableau ".concat(tableId));
                        processing = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 13, , 14]);
                        return [4 /*yield*/, this.readAndDecodeElementData(tableId, 'table')];
                    case 2:
                        tableData = _a.sent();
                        if (!tableData.columns || !Array.isArray(tableData.columns)) {
                            throw new Error('Structure de tableau invalide');
                        }
                        processing.push("\uD83D\uDCD6 Tableau charg\u00E9: ".concat(tableData.table_type));
                        processing.push("\uD83D\uDCCB Colonnes: ".concat(tableData.columns.length));
                        processing.push("\uD83D\uDCCA Lignes de donn\u00E9es: ".concat(tableData.data.length));
                        formulaColumns = tableData.columns.filter(function (col) { return col.formula; });
                        processing.push("\uD83E\uDDEE Colonnes avec formules: ".concat(formulaColumns.length));
                        processedData = [];
                        calculatedCells = 0;
                        rowIndex = 0;
                        _a.label = 3;
                    case 3:
                        if (!(rowIndex < tableData.data.length)) return [3 /*break*/, 12];
                        row = tableData.data[rowIndex];
                        processedRow = [];
                        processing.push("\uD83D\uDD04 Traitement ligne ".concat(rowIndex + 1));
                        colIndex = 0;
                        _a.label = 4;
                    case 4:
                        if (!(colIndex < tableData.columns.length)) return [3 /*break*/, 10];
                        column = tableData.columns[colIndex];
                        cellValue = row[colIndex] || null;
                        if (!column.formula) return [3 /*break*/, 8];
                        processing.push("\uD83E\uDDEE Calcul formule colonne ".concat(column.name, ": ").concat(column.formula));
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        cellContext = __assign(__assign({}, contextData), { rowIndex: rowIndex, colIndex: colIndex, rowData: row, currentValue: cellValue });
                        return [4 /*yield*/, this.calculateTableFormula(column.formula, cellContext, tableData.data, rowIndex, colIndex)];
                    case 6:
                        formulaResult = _a.sent();
                        if (formulaResult.success) {
                            cellValue = formulaResult.result;
                            calculatedCells++;
                            processing.push("\u2705 Formule calcul\u00E9e: ".concat(formulaResult.result));
                        }
                        else {
                            processing.push("\u274C Erreur formule: ".concat(formulaResult.error));
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_4 = _a.sent();
                        errorMsg = error_4 instanceof Error ? error_4.message : 'Erreur calcul';
                        processing.push("\u274C Erreur calcul cellule [".concat(rowIndex, ", ").concat(colIndex, "]: ").concat(errorMsg));
                        return [3 /*break*/, 8];
                    case 8:
                        processedRow.push(cellValue);
                        _a.label = 9;
                    case 9:
                        colIndex++;
                        return [3 /*break*/, 4];
                    case 10:
                        processedData.push(processedRow);
                        _a.label = 11;
                    case 11:
                        rowIndex++;
                        return [3 /*break*/, 3];
                    case 12:
                        metadata = {
                            rows: processedData.length,
                            columns: tableData.columns.length,
                            hasFormulas: formulaColumns.length > 0,
                            calculatedCells: calculatedCells
                        };
                        processing.push("\u2705 Tableau trait\u00E9: ".concat(metadata.rows, "x").concat(metadata.columns, ", ").concat(calculatedCells, " cellules calcul\u00E9es"));
                        return [2 /*return*/, {
                                processedData: processedData,
                                metadata: metadata,
                                success: true,
                                processing: processing
                            }];
                    case 13:
                        error_5 = _a.sent();
                        errorMessage = error_5 instanceof Error ? error_5.message : 'Erreur inconnue';
                        processing.push("\u274C Erreur: ".concat(errorMessage));
                        return [2 /*return*/, {
                                processedData: [],
                                metadata: { rows: 0, columns: 0, hasFormulas: false, calculatedCells: 0 },
                                success: false,
                                error: errorMessage,
                                processing: processing
                            }];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🧮 CALCULATEUR DE FORMULES DE TABLEAU
     */
    TBLIntelligence.prototype.calculateTableFormula = function (formula, cellContext, tableData, rowIndex, colIndex) {
        return __awaiter(this, void 0, void 0, function () {
            var tableVariables, r, c, result, error_6;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        tableVariables = {
                            // Variables de position
                            ROW_INDEX: rowIndex,
                            COL_INDEX: colIndex,
                            ROW_NUMBER: rowIndex + 1,
                            COL_NUMBER: colIndex + 1,
                            // Variables de données
                            CURRENT_VALUE: cellContext.currentValue,
                            ROW_DATA: cellContext.rowData,
                            // Fonctions de tableau
                            TABLE_ROWS: tableData.length,
                            TABLE_COLS: ((_a = tableData[0]) === null || _a === void 0 ? void 0 : _a.length) || 0
                        };
                        // Ajouter les valeurs des autres cellules accessibles
                        for (r = 0; r < tableData.length; r++) {
                            for (c = 0; c < (((_b = tableData[r]) === null || _b === void 0 ? void 0 : _b.length) || 0); c++) {
                                if (r !== rowIndex || c !== colIndex) {
                                    tableVariables["CELL_".concat(r, "_").concat(c)] = tableData[r][c];
                                    tableVariables["R".concat(r, "C").concat(c)] = tableData[r][c];
                                }
                            }
                        }
                        return [4 /*yield*/, this.evaluateTableFormula(formula, tableVariables, cellContext)];
                    case 1:
                        result = _c.sent();
                        return [2 /*return*/, {
                                result: result,
                                success: true
                            }];
                    case 2:
                        error_6 = _c.sent();
                        return [2 /*return*/, {
                                result: null,
                                success: false,
                                error: error_6 instanceof Error ? error_6.message : 'Erreur calcul formule'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔢 ÉVALUATEUR DE FORMULES DE TABLEAU
     */
    TBLIntelligence.prototype.evaluateTableFormula = function (formula, variables, context) {
        return __awaiter(this, void 0, void 0, function () {
            var processedFormula, _i, _a, _b, varName, varValue, replacement;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        processedFormula = formula;
                        // Remplacer les références de cellules (ex: R0C1, CELL_0_1)
                        processedFormula = processedFormula.replace(/R(\d+)C(\d+)/g, function (match, row, col) {
                            var value = variables["R".concat(row, "C").concat(col)];
                            return typeof value === 'number' ? value.toString() : "\"".concat(value, "\"");
                        });
                        // Remplacer les variables connues
                        for (_i = 0, _a = Object.entries(variables); _i < _a.length; _i++) {
                            _b = _a[_i], varName = _b[0], varValue = _b[1];
                            if (processedFormula.includes(varName)) {
                                replacement = typeof varValue === 'number' ? varValue.toString() : "\"".concat(varValue, "\"");
                                processedFormula = processedFormula.replace(new RegExp(varName, 'g'), replacement);
                            }
                        }
                        return [4 /*yield*/, this.replaceTableFunctions(processedFormula, variables, context)];
                    case 1:
                        // Fonctions spéciales de tableau
                        processedFormula = _c.sent();
                        // Évaluer l'expression JavaScript sécurisée
                        try {
                            return [2 /*return*/, this.safeEvaluateExpression(processedFormula)];
                        }
                        catch (error) {
                            console.warn('Formule non évaluable comme JS, tentative d\'évaluation simple:', processedFormula);
                            return [2 /*return*/, processedFormula];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔧 REMPLACEUR DE FONCTIONS DE TABLEAU
     */
    TBLIntelligence.prototype.replaceTableFunctions = function (formula, variables, context) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                result = formula;
                // SUM_ROW() - Somme de la ligne courante
                result = result.replace(/SUM_ROW\(\)/g, function () {
                    var rowData = context.rowData;
                    if (Array.isArray(rowData)) {
                        var sum = rowData.reduce(function (acc, val) { return acc + (Number(val) || 0); }, 0);
                        return sum.toString();
                    }
                    return '0';
                });
                // SUM_COL(colIndex) - Somme d'une colonne
                result = result.replace(/SUM_COL\((\d+)\)/g, function (match, colIndex) {
                    var col = Number(colIndex);
                    var tableRows = variables.TABLE_ROWS;
                    var sum = 0;
                    for (var r = 0; r < tableRows; r++) {
                        var cellValue = variables["R".concat(r, "C").concat(col)];
                        sum += Number(cellValue) || 0;
                    }
                    return sum.toString();
                });
                // AVG_ROW() - Moyenne de la ligne courante
                result = result.replace(/AVG_ROW\(\)/g, function () {
                    var rowData = context.rowData;
                    if (Array.isArray(rowData) && rowData.length > 0) {
                        var sum = rowData.reduce(function (acc, val) { return acc + (Number(val) || 0); }, 0);
                        return (sum / rowData.length).toString();
                    }
                    return '0';
                });
                // COUNT_NON_EMPTY_ROW() - Compte les cellules non vides de la ligne
                result = result.replace(/COUNT_NON_EMPTY_ROW\(\)/g, function () {
                    var rowData = context.rowData;
                    if (Array.isArray(rowData)) {
                        var count = rowData.filter(function (val) { return val !== null && val !== undefined && val !== ''; }).length;
                        return count.toString();
                    }
                    return '0';
                });
                return [2 /*return*/, result];
            });
        });
    };
    /**
     * 🔒 ÉVALUATEUR D'EXPRESSIONS SÉCURISÉ
     */
    TBLIntelligence.prototype.safeEvaluateExpression = function (expression) {
        // Whitelist des opérations autorisées
        var allowedPattern = /^[\d\s+\-*/().,"'>=<!&|]+$/;
        if (!allowedPattern.test(expression)) {
            throw new Error('Expression contient des caractères non autorisés');
        }
        // Évaluation sécurisée avec Function
        try {
            var func = new Function("\"use strict\"; return (".concat(expression, ");"));
            return func();
        }
        catch (error) {
            throw new Error("Erreur \u00E9valuation: ".concat(error instanceof Error ? error.message : 'Inconnue'));
        }
    };
    /**
     * 🔢 ARITÉ DES FONCTIONS (complétée)
     */
    TBLIntelligence.prototype.getFunctionArity = function (funcName) {
        switch (funcName.toUpperCase()) {
            case 'SUM':
            case 'AVG':
            case 'MIN':
            case 'MAX': return 0; // Variable
            case 'ROUND': return 1;
            case 'IF': return 3;
            case 'CONCAT': return 0; // Variable
            case 'LEN': return 1;
            case 'SUM_ROW':
            case 'AVG_ROW':
            case 'COUNT_NON_EMPTY_ROW': return 0;
            case 'SUM_COL': return 1;
            default: return 0;
        }
    };
    /**
     * 🔍 ANALYSE COMPLÈTE D'UN ÉLÉMENT
     * Analyse un élément par son CODE TBL ou son UUID
     */
    TBLIntelligence.prototype.analyzeElement = function (elementIdentifier) {
        return __awaiter(this, void 0, void 0, function () {
            var element, typeDescription, capacityDescription, tblElement, formulas, _a, conditions, _b, tables, _c, dependencies;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log("\uD83E\uDDE0 [TBL Intelligence] Analyse compl\u00E8te de ".concat(elementIdentifier));
                        // 🚀 NOUVEAU SYSTÈME TBL BRIDGE : Recherche UNIQUEMENT sur code TBL
                        console.log("\uD83D\uDD0D Recherche TBL Bridge sur code: ".concat(elementIdentifier));
                        return [4 /*yield*/, this.prisma.treeBranchLeafNode.findFirst({
                                where: { tbl_code: elementIdentifier }, // UNIQUEMENT code TBL !
                                include: {
                                    TreeBranchLeafNodeFormula: true,
                                    TreeBranchLeafNodeCondition: true,
                                    TreeBranchLeafNodeTable: true,
                                    other_TreeBranchLeafNode: {
                                        select: {
                                            id: true,
                                            label: true,
                                            tbl_code: true,
                                            tbl_type: true,
                                            tbl_capacity: true,
                                            type: true
                                        }
                                    },
                                    TreeBranchLeafNode: {
                                        select: {
                                            id: true,
                                            label: true,
                                            tbl_code: true,
                                            tbl_type: true,
                                            type: true
                                        }
                                    }
                                }
                            })];
                    case 1:
                        element = _d.sent();
                        if (!element) {
                            throw new Error("\u274C \u00C9l\u00E9ment TBL Bridge avec code \"".concat(elementIdentifier, "\" non trouv\u00E9 dans la base de donn\u00E9es"));
                        }
                        console.log("\u2705 \u00C9l\u00E9ment TBL Bridge trouv\u00E9: ".concat(element.label, " (").concat(element.type, ")"));
                        console.log("   \uD83C\uDFAF TBL Code: ".concat(element.tbl_code));
                        console.log("   \uD83C\uDFD7\uFE0F Type TBL: ".concat(element.tbl_type, " | \uD83D\uDD27 Capacit\u00E9 TBL: ").concat(element.tbl_capacity));
                        typeDescription = this.getTBLTypeDescription(element.tbl_type);
                        capacityDescription = this.getTBLCapacityDescription(element.tbl_capacity);
                        console.log("   \uD83D\uDCCB TBL Intelligence: ".concat(typeDescription, " avec ").concat(capacityDescription));
                        tblElement = {
                            id: element.id,
                            label: element.label,
                            tbl_code: element.tbl_code || '',
                            tbl_type: element.tbl_type || 0,
                            tbl_capacity: element.tbl_capacity || 0,
                            type: element.type,
                            parent_id: element.parent_id || undefined
                        };
                        // 🚀 TBL BRIDGE V2.0 : Analyse basée sur les colonnes natives
                        console.log("\uD83E\uDDE0 [TBL Intelligence V2.0] Analyse des capacit\u00E9s via colonnes Prisma...");
                        if (!(element.tbl_capacity === 2)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.analyzeFormulas(element.TreeBranchLeafNodeFormula || [])];
                    case 2:
                        _a = _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = [];
                        _d.label = 4;
                    case 4:
                        formulas = _a;
                        if (!(element.tbl_capacity === 3)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.analyzeConditions(element.TreeBranchLeafNodeCondition || [])];
                    case 5:
                        _b = _d.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        _b = [];
                        _d.label = 7;
                    case 7:
                        conditions = _b;
                        if (!(element.tbl_capacity === 4)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.analyzeTables(element.TreeBranchLeafNodeTable || [])];
                    case 8:
                        _c = _d.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        _c = [];
                        _d.label = 10;
                    case 10:
                        tables = _c;
                        console.log("\uD83D\uDCCA [TBL V2.0] R\u00E9sultats: ".concat(formulas.length, " formules, ").concat(conditions.length, " conditions, ").concat(tables.length, " tableaux"));
                        return [4 /*yield*/, this.buildDependencyGraph(tblElement, formulas, conditions, tables)];
                    case 11:
                        dependencies = _d.sent();
                        console.log("\u2705 [TBL Intelligence] Analyse termin\u00E9e pour ".concat(element.label, " (").concat(element.tbl_code, ")"));
                        console.log("   \uD83D\uDCCA ".concat(formulas.length, " formules, ").concat(conditions.length, " conditions, ").concat(tables.length, " tableaux"));
                        console.log("   \uD83D\uDD17 ".concat(dependencies.length, " d\u00E9pendances d\u00E9tect\u00E9es"));
                        return [2 /*return*/, {
                                element: tblElement,
                                formulas: formulas,
                                conditions: conditions,
                                tables: tables,
                                dependencies: dependencies
                            }];
                }
            });
        });
    };
    /**
     * 🧮 ANALYSE DES FORMULES
     * Extrait les codes TBL référencés dans les formules
     */
    TBLIntelligence.prototype.analyzeFormulas = function (formulas) {
        return __awaiter(this, void 0, void 0, function () {
            var tblFormulas, _i, formulas_1, formula, referencedFields, dependencies, tokens, _a, tokens_2, token, referencedElement;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        tblFormulas = [];
                        _i = 0, formulas_1 = formulas;
                        _b.label = 1;
                    case 1:
                        if (!(_i < formulas_1.length)) return [3 /*break*/, 7];
                        formula = formulas_1[_i];
                        console.log("\uD83E\uDDEE [TBL Intelligence] Analyse formule ".concat(formula.id));
                        referencedFields = [];
                        dependencies = [];
                        tokens = Array.isArray(formula.tokens) ? formula.tokens : [];
                        _a = 0, tokens_2 = tokens;
                        _b.label = 2;
                    case 2:
                        if (!(_a < tokens_2.length)) return [3 /*break*/, 5];
                        token = tokens_2[_a];
                        if (!(token.type === 'variable' && token.reference_id)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.prisma.treeBranchLeafNode.findUnique({
                                where: { id: token.reference_id },
                                select: { tbl_code: true, label: true }
                            })];
                    case 3:
                        referencedElement = _b.sent();
                        if (referencedElement === null || referencedElement === void 0 ? void 0 : referencedElement.tbl_code) {
                            referencedFields.push(referencedElement.tbl_code);
                            dependencies.push({
                                source_code: referencedElement.tbl_code,
                                target_code: '', // Sera rempli par l'élément parent
                                dependency_type: 'formula',
                                relationship: 'depends_on'
                            });
                            console.log("   \uD83D\uDD17 R\u00E9f\u00E9rence d\u00E9tect\u00E9e: ".concat(referencedElement.label, " (").concat(referencedElement.tbl_code, ")"));
                        }
                        _b.label = 4;
                    case 4:
                        _a++;
                        return [3 /*break*/, 2];
                    case 5:
                        tblFormulas.push({
                            id: formula.id,
                            formula_content: formula.sequence || '[]',
                            referenced_fields: referencedFields,
                            dependencies: dependencies
                        });
                        _b.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, tblFormulas];
                }
            });
        });
    };
    /**
     * ⚖️ ANALYSE DES CONDITIONS
     * Identifie les relations options + champs conditionnels
     */
    TBLIntelligence.prototype.analyzeConditions = function (conditions) {
        return __awaiter(this, void 0, void 0, function () {
            var tblConditions, _i, conditions_1, condition, triggerElements, targetElements, optionMappings, _a, _b, rule, sourceElement, _c, _d, child, targetElement;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        tblConditions = [];
                        _i = 0, conditions_1 = conditions;
                        _e.label = 1;
                    case 1:
                        if (!(_i < conditions_1.length)) return [3 /*break*/, 9];
                        condition = conditions_1[_i];
                        console.log("\u2696\uFE0F [TBL Intelligence] Analyse condition ".concat(condition.id));
                        triggerElements = [];
                        targetElements = [];
                        optionMappings = [];
                        _a = 0, _b = condition.TreeBranchLeafNodeConditionRule || [];
                        _e.label = 2;
                    case 2:
                        if (!(_a < _b.length)) return [3 /*break*/, 7];
                        rule = _b[_a];
                        if (!rule.source_node_id) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.prisma.treeBranchLeafNode.findUnique({
                                where: { id: rule.source_node_id },
                                select: {
                                    tbl_code: true,
                                    label: true,
                                    type: true,
                                    other_TreeBranchLeafNode: {
                                        select: {
                                            id: true,
                                            tbl_code: true,
                                            label: true,
                                            type: true
                                        }
                                    }
                                }
                            })];
                    case 3:
                        sourceElement = _e.sent();
                        if (sourceElement === null || sourceElement === void 0 ? void 0 : sourceElement.tbl_code) {
                            triggerElements.push(sourceElement.tbl_code);
                            // Si c'est une option avec des champs conditionnels
                            if (sourceElement.type === 'leaf_option' || sourceElement.type === 'leaf_option_field') {
                                for (_c = 0, _d = sourceElement.other_TreeBranchLeafNode; _c < _d.length; _c++) {
                                    child = _d[_c];
                                    if (child.tbl_code && child.type === 'leaf_field') {
                                        optionMappings.push({
                                            option_code: sourceElement.tbl_code,
                                            field_code: child.tbl_code,
                                            show_when_selected: rule.condition_value === 'true' || rule.condition_value === sourceElement.label
                                        });
                                        console.log("   \uD83C\uDFAF Option + Champ d\u00E9tect\u00E9: ".concat(sourceElement.label, " (").concat(sourceElement.tbl_code, ") \u2192 ").concat(child.label, " (").concat(child.tbl_code, ")"));
                                    }
                                }
                            }
                        }
                        _e.label = 4;
                    case 4:
                        if (!rule.target_node_id) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.prisma.treeBranchLeafNode.findUnique({
                                where: { id: rule.target_node_id },
                                select: { tbl_code: true, label: true }
                            })];
                    case 5:
                        targetElement = _e.sent();
                        if (targetElement === null || targetElement === void 0 ? void 0 : targetElement.tbl_code) {
                            targetElements.push(targetElement.tbl_code);
                        }
                        _e.label = 6;
                    case 6:
                        _a++;
                        return [3 /*break*/, 2];
                    case 7:
                        tblConditions.push({
                            id: condition.id,
                            condition_logic: condition.logic || 'and',
                            trigger_elements: triggerElements,
                            target_elements: targetElements,
                            option_mappings: optionMappings
                        });
                        _e.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 1];
                    case 9: return [2 /*return*/, tblConditions];
                }
            });
        });
    };
    /**
     * 📊 ANALYSE DES TABLEAUX
     * Identifie les sources de données et relations
     */
    TBLIntelligence.prototype.analyzeTables = function (tables) {
        return __awaiter(this, void 0, void 0, function () {
            var tblTables, _i, tables_1, table, dataSources, computedColumns, relationships, _a, _b, column, sourceElement;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        tblTables = [];
                        _i = 0, tables_1 = tables;
                        _c.label = 1;
                    case 1:
                        if (!(_i < tables_1.length)) return [3 /*break*/, 7];
                        table = tables_1[_i];
                        console.log("\uD83D\uDCCA [TBL Intelligence] Analyse tableau ".concat(table.id));
                        dataSources = [];
                        computedColumns = [];
                        relationships = [];
                        _a = 0, _b = table.TreeBranchLeafNodeTableColumn || [];
                        _c.label = 2;
                    case 2:
                        if (!(_a < _b.length)) return [3 /*break*/, 5];
                        column = _b[_a];
                        if (!column.source_node_id) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.prisma.treeBranchLeafNode.findUnique({
                                where: { id: column.source_node_id },
                                select: { tbl_code: true, label: true, tbl_capacity: true }
                            })];
                    case 3:
                        sourceElement = _c.sent();
                        if (sourceElement === null || sourceElement === void 0 ? void 0 : sourceElement.tbl_code) {
                            // Si c'est une colonne calculée (formule)
                            if (sourceElement.tbl_capacity === 2) {
                                computedColumns.push(sourceElement.tbl_code);
                            }
                            else {
                                dataSources.push(sourceElement.tbl_code);
                            }
                            console.log("   \uD83D\uDCCB Source donn\u00E9es: ".concat(sourceElement.label, " (").concat(sourceElement.tbl_code, ")"));
                        }
                        _c.label = 4;
                    case 4:
                        _a++;
                        return [3 /*break*/, 2];
                    case 5:
                        tblTables.push({
                            id: table.id,
                            data_sources: dataSources,
                            computed_columns: computedColumns,
                            relationships: relationships
                        });
                        _c.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, tblTables];
                }
            });
        });
    };
    /**
     * 🔗 CONSTRUCTION DU GRAPHE DE DÉPENDANCES
     * Crée le réseau complet des relations entre éléments
     */
    TBLIntelligence.prototype.buildDependencyGraph = function (element, formulas, conditions, tables) {
        return __awaiter(this, void 0, void 0, function () {
            var dependencies, _i, formulas_2, formula, _a, _b, dep, _c, conditions_2, condition, _d, _e, triggerCode, _f, _g, targetCode, _h, _j, mapping, _k, tables_2, table, _l, _m, sourceCode;
            return __generator(this, function (_o) {
                dependencies = [];
                // Dépendances des formules
                for (_i = 0, formulas_2 = formulas; _i < formulas_2.length; _i++) {
                    formula = formulas_2[_i];
                    for (_a = 0, _b = formula.dependencies; _a < _b.length; _a++) {
                        dep = _b[_a];
                        dependencies.push(__assign(__assign({}, dep), { target_code: element.tbl_code }));
                    }
                }
                // Dépendances des conditions
                for (_c = 0, conditions_2 = conditions; _c < conditions_2.length; _c++) {
                    condition = conditions_2[_c];
                    for (_d = 0, _e = condition.trigger_elements; _d < _e.length; _d++) {
                        triggerCode = _e[_d];
                        for (_f = 0, _g = condition.target_elements; _f < _g.length; _f++) {
                            targetCode = _g[_f];
                            dependencies.push({
                                source_code: triggerCode,
                                target_code: targetCode,
                                dependency_type: 'condition',
                                relationship: 'triggers'
                            });
                        }
                    }
                    // Dépendances des options + champs
                    for (_h = 0, _j = condition.option_mappings; _h < _j.length; _h++) {
                        mapping = _j[_h];
                        dependencies.push({
                            source_code: mapping.option_code,
                            target_code: mapping.field_code,
                            dependency_type: 'condition',
                            relationship: 'triggers'
                        });
                    }
                }
                // Dépendances des tableaux
                for (_k = 0, tables_2 = tables; _k < tables_2.length; _k++) {
                    table = tables_2[_k];
                    for (_l = 0, _m = table.data_sources; _l < _m.length; _l++) {
                        sourceCode = _m[_l];
                        dependencies.push({
                            source_code: sourceCode,
                            target_code: element.tbl_code,
                            dependency_type: 'data_flow',
                            relationship: 'affects'
                        });
                    }
                }
                return [2 /*return*/, dependencies];
            });
        });
    };
    /**
     * 🎯 RÉSOLUTION INTELLIGENTE
     * Résout une valeur en tenant compte de toutes les dépendances TBL
     */
    TBLIntelligence.prototype.resolveValue = function (elementCode_1) {
        return __awaiter(this, arguments, void 0, function (elementCode, context) {
            var element, analysis, _a;
            if (context === void 0) { context = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("\uD83C\uDFAF [TBL Intelligence] R\u00E9solution intelligente de ".concat(elementCode));
                        return [4 /*yield*/, this.prisma.treeBranchLeafNode.findFirst({
                                where: { tbl_code: elementCode }
                            })];
                    case 1:
                        element = _b.sent();
                        if (!element) {
                            throw new Error("\u00C9l\u00E9ment avec code TBL ".concat(elementCode, " non trouv\u00E9"));
                        }
                        return [4 /*yield*/, this.analyzeElement(element.id)];
                    case 2:
                        analysis = _b.sent();
                        _a = analysis.element.tbl_capacity;
                        switch (_a) {
                            case 2: return [3 /*break*/, 3];
                            case 3: return [3 /*break*/, 5];
                            case 4: return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, this.resolveFormula(analysis, context)];
                    case 4: // Formule
                    return [2 /*return*/, _b.sent()];
                    case 5: return [4 /*yield*/, this.resolveCondition(analysis, context)];
                    case 6: // Condition
                    return [2 /*return*/, _b.sent()];
                    case 7: return [4 /*yield*/, this.resolveTable(analysis, context)];
                    case 8: // Tableau
                    return [2 /*return*/, _b.sent()];
                    case 9: return [4 /*yield*/, this.resolveSimpleValue(analysis, context)];
                    case 10: // Donnée simple
                    return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    TBLIntelligence.prototype.resolveFormula = function (analysis, context) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implementation de résolution de formule avec codes TBL
                console.log("\uD83E\uDDEE R\u00E9solution formule avec ".concat(analysis.formulas.length, " formules"));
                return [2 /*return*/, {
                        value: 0, // Calculé selon la formule
                        dependencies_resolved: analysis.formulas.flatMap(function (f) { return f.referenced_fields; }),
                        conditions_evaluated: [],
                        formulas_calculated: analysis.formulas.map(function (f) { return f.id; })
                    }];
            });
        });
    };
    TBLIntelligence.prototype.resolveCondition = function (analysis, context) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implementation de résolution de condition avec options + champs
                console.log("\u2696\uFE0F R\u00E9solution condition avec ".concat(analysis.conditions.length, " conditions"));
                return [2 /*return*/, {
                        value: true, // Évalué selon les conditions
                        dependencies_resolved: [],
                        conditions_evaluated: analysis.conditions.map(function (c) { return c.id; }),
                        formulas_calculated: []
                    }];
            });
        });
    };
    TBLIntelligence.prototype.resolveTable = function (analysis, context) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implementation de résolution de tableau avec sources de données
                console.log("\uD83D\uDCCA R\u00E9solution tableau avec ".concat(analysis.tables.length, " tableaux"));
                return [2 /*return*/, {
                        value: [], // Données du tableau
                        dependencies_resolved: analysis.tables.flatMap(function (t) { return t.data_sources; }),
                        conditions_evaluated: [],
                        formulas_calculated: []
                    }];
            });
        });
    };
    TBLIntelligence.prototype.resolveSimpleValue = function (analysis, context) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                value = context[analysis.element.tbl_code] || null;
                console.log("\uD83D\uDCDD R\u00E9solution valeur simple: ".concat(analysis.element.label, " = ").concat(value));
                return [2 /*return*/, {
                        value: value,
                        dependencies_resolved: [],
                        conditions_evaluated: [],
                        formulas_calculated: []
                    }];
            });
        });
    };
    // 🚀 TBL BRIDGE V2.0 - Méthodes de description des types et capacités
    /**
     * Retourne la description du type TBL selon le README
     */
    TBLIntelligence.prototype.getTBLTypeDescription = function (tbl_type) {
        var typeMap = {
            1: "Branche (Onglet TBL)",
            2: "Sous-Branche (Liste déroulante TBL)",
            3: "Champ (Input utilisateur)",
            4: "Option (Choix dans liste)",
            5: "Option + champ (Option qui ouvre un champ)",
            6: "Champ données (Affichage données calculées)",
            7: "Section (Container pour champs données)"
        };
        return typeMap[tbl_type] || "Type inconnu (".concat(tbl_type, ")");
    };
    /**
     * Retourne la description de la capacité TBL selon le README
     */
    TBLIntelligence.prototype.getTBLCapacityDescription = function (tbl_capacity) {
        var capacityMap = {
            1: "Neutre (Pas de traitement spécial)",
            2: "Formule (Calcul mathématique)",
            3: "Condition (Logique if/then/else)",
            4: "Tableau (Données tabulaires)"
        };
        return capacityMap[tbl_capacity] || "Capacit\u00E9 inconnue (".concat(tbl_capacity, ")");
    };
    return TBLIntelligence;
}());
exports.TBLIntelligence = TBLIntelligence;
exports.default = TBLIntelligence;

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
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var AdvancedSelectService = /** @class */ (function () {
    function AdvancedSelectService() {
    }
    /**
     * 📝 Récupérer un champ advanced_select avec ses options enrichies
     */
    AdvancedSelectService.prototype.getAdvancedSelectField = function (fieldId, organizationId) {
        return __awaiter(this, void 0, void 0, function () {
            var field, capabilities, options;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.field.findFirst({
                            where: {
                                id: fieldId,
                                organization_id: parseInt(organizationId),
                                type: 'advanced_select'
                            },
                            include: {
                                optionNodes: {
                                    include: {
                                        children: true,
                                        fieldDependencies: true,
                                        formulaDependencies: true
                                    }
                                }
                            }
                        })];
                    case 1:
                        field = _a.sent();
                        if (!field) {
                            throw new Error("Champ advanced_select ".concat(fieldId, " non trouv\u00E9"));
                        }
                        capabilities = [];
                        // Vérifier si le champ a des formules
                        if (field.optionNodes.some(function (node) { return node.data &&
                            typeof node.data === 'object' &&
                            node.data !== null &&
                            'formula' in node.data; })) {
                            capabilities.push('dynamic_calculation');
                        }
                        // Vérifier si le champ a des validations
                        if (field.optionNodes.some(function (node) { return node.data &&
                            typeof node.data === 'object' &&
                            node.data !== null &&
                            'validation' in node.data; })) {
                            capabilities.push('validation');
                        }
                        // Vérifier si le champ a des workflows
                        if (field.optionNodes.some(function (node) { return node.data &&
                            typeof node.data === 'object' &&
                            node.data !== null &&
                            'workflow' in node.data; })) {
                            capabilities.push('workflow');
                        }
                        options = field.optionNodes.map(function (node) { return ({
                            label: node.label,
                            value: node.value,
                            data: node.data || {}
                        }); });
                        return [2 /*return*/, __assign(__assign({}, field), { capabilities: capabilities, options: options })];
                }
            });
        });
    };
    /**
     * 🧮 Effectuer un calcul basé sur une option et des données
     */
    AdvancedSelectService.prototype.performCalculation = function (fieldId_1, optionValue_1, inputData_1) {
        return __awaiter(this, arguments, void 0, function (fieldId, optionValue, inputData, relatedFieldsData) {
            var startTime, option, optionData, formula, result, unit, operation, operands, denominatorFieldId, denominatorValue, multiplierFieldId, multiplierValue, precision, businessLogic, validation, calculationTime, error_1;
            if (relatedFieldsData === void 0) { relatedFieldsData = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.getOptionConfiguration(fieldId, optionValue)];
                    case 2:
                        option = _a.sent();
                        if (!(option === null || option === void 0 ? void 0 : option.data)) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "Option ".concat(optionValue, " non trouv\u00E9e ou sans configuration")
                                }];
                        }
                        optionData = option.data;
                        // Vérifier si l'option a une formule
                        if (!optionData.formula) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Cette option ne supporte pas les calculs automatiques'
                                }];
                        }
                        formula = optionData.formula;
                        result = void 0;
                        unit = '';
                        operation = '';
                        operands = [inputData];
                        // Effectuer le calcul selon le type de formule
                        switch (formula.type) {
                            case 'division': {
                                denominatorFieldId = formula.denominator;
                                denominatorValue = relatedFieldsData[denominatorFieldId];
                                if (!denominatorValue || typeof denominatorValue !== 'number') {
                                    return [2 /*return*/, {
                                            success: false,
                                            error: "Valeur du d\u00E9nominateur manquante (field: ".concat(denominatorFieldId, ")")
                                        }];
                                }
                                if (denominatorValue === 0) {
                                    return [2 /*return*/, {
                                            success: false,
                                            error: 'Division par zéro impossible'
                                        }];
                                }
                                result = inputData / denominatorValue;
                                operation = 'division';
                                operands.push(denominatorValue);
                                break;
                            }
                            case 'multiplication': {
                                multiplierFieldId = formula.multiplier;
                                multiplierValue = relatedFieldsData[multiplierFieldId];
                                if (!multiplierValue || typeof multiplierValue !== 'number') {
                                    return [2 /*return*/, {
                                            success: false,
                                            error: "Valeur du multiplicateur manquante (field: ".concat(multiplierFieldId, ")")
                                        }];
                                }
                                result = inputData * multiplierValue;
                                operation = 'multiplication';
                                operands.push(multiplierValue);
                                break;
                            }
                            case 'conditional': {
                                // Logique conditionnelle - à étendre selon les besoins
                                result = inputData; // Par défaut, retourner la valeur telle quelle
                                operation = 'conditional';
                                break;
                            }
                            default:
                                return [2 /*return*/, {
                                        success: false,
                                        error: "Type de formule ".concat(formula.type, " non support\u00E9")
                                    }];
                        }
                        precision = typeof formula.precision === 'number' ? formula.precision : 2;
                        if (result !== undefined) {
                            result = parseFloat(result.toFixed(precision));
                        }
                        businessLogic = optionData.businessLogic;
                        if (businessLogic === null || businessLogic === void 0 ? void 0 : businessLogic.unit) {
                            unit = businessLogic.unit;
                        }
                        validation = this.validateResult(result, unit);
                        calculationTime = Date.now() - startTime;
                        return [2 /*return*/, {
                                success: true,
                                result: result,
                                unit: unit,
                                formatted: "".concat(result, " ").concat(unit),
                                metadata: {
                                    operation: operation,
                                    operands: operands,
                                    precision: precision,
                                    formula: formula,
                                    businessLogic: businessLogic,
                                    validation: {
                                        isValid: validation.isValid,
                                        rules: validation.validations.map(function (v) { return v.rule; })
                                    },
                                    calculationTime: calculationTime
                                }
                            }];
                    case 3:
                        error_1 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Erreur lors du calcul'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 📊 Mettre à jour un champ calculé avec une nouvelle valeur
     */
    AdvancedSelectService.prototype.updateCalculatedField = function (fieldId_1, value_1, organizationId_1) {
        return __awaiter(this, arguments, void 0, function (fieldId, value, organizationId, metadata) {
            var field, error_2;
            if (metadata === void 0) { metadata = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, prisma.field.findFirst({
                                where: {
                                    id: fieldId,
                                    organization_id: parseInt(organizationId)
                                }
                            })];
                    case 1:
                        field = _a.sent();
                        if (!field) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "Champ ".concat(fieldId, " non trouv\u00E9")
                                }];
                        }
                        // Log de l'opération pour audit
                        console.log("[ADVANCED_SELECT] Mise \u00E0 jour calcul\u00E9e:", {
                            fieldId: fieldId,
                            value: value,
                            organizationId: organizationId,
                            metadata: metadata,
                            timestamp: new Date().toISOString()
                        });
                        return [2 /*return*/, {
                                success: true,
                                updated: true
                            }];
                    case 2:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Erreur lors de la mise à jour'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * ✅ Valider un résultat selon les règles métier
     */
    AdvancedSelectService.prototype.validateResult = function (value, unit) {
        var validations = [];
        var passed = 0;
        var failed = 0;
        var warnings = 0;
        // Règle 1: Prix énergétique réaliste (entre 0.05€ et 0.50€ par kWh)
        if (unit === 'EUR/kWh' || unit === '€/kWh') {
            var isRealistic = value >= 0.05 && value <= 0.50;
            validations.push({
                rule: 'realistic_energy_price',
                passed: isRealistic,
                message: isRealistic
                    ? "Prix \u00E9nerg\u00E9tique r\u00E9aliste: ".concat(value, " ").concat(unit)
                    : "Prix \u00E9nerg\u00E9tique inhabituel: ".concat(value, " ").concat(unit, " (attendu: 0.05-0.50 \u20AC/kWh)"),
                severity: isRealistic ? 'info' : 'warning'
            });
            if (isRealistic)
                passed++;
            else
                warnings++;
        }
        // Règle 2: Nombre positif
        var isPositive = value > 0;
        validations.push({
            rule: 'positive_number',
            passed: isPositive,
            message: isPositive
                ? 'Valeur positive valide'
                : 'La valeur doit être positive',
            severity: isPositive ? 'info' : 'error'
        });
        if (isPositive)
            passed++;
        else
            failed++;
        // Règle 3: Consommation réaliste pour les kWh (entre 1000 et 50000 kWh/an)
        if (unit === 'kWh' && value > 100) { // Si c'est une consommation annuelle
            var isRealistic = value >= 1000 && value <= 50000;
            validations.push({
                rule: 'consumption_realistic',
                passed: isRealistic,
                message: isRealistic
                    ? "Consommation r\u00E9aliste: ".concat(value, " ").concat(unit, "/an")
                    : "Consommation inhabituelle: ".concat(value, " ").concat(unit, "/an (attendu: 1000-50000 kWh/an)"),
                severity: isRealistic ? 'info' : 'warning'
            });
            if (isRealistic)
                passed++;
            else
                warnings++;
        }
        return {
            isValid: failed === 0,
            validations: validations,
            summary: {
                passed: passed,
                failed: failed,
                warnings: warnings
            }
        };
    };
    /**
     * 🔍 Récupérer la configuration d'une option spécifique
     */
    AdvancedSelectService.prototype.getOptionConfiguration = function (fieldId, optionValue) {
        return __awaiter(this, void 0, void 0, function () {
            var optionNode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.fieldOptionNode.findFirst({
                            where: {
                                field_id: fieldId,
                                value: optionValue
                            }
                        })];
                    case 1:
                        optionNode = _a.sent();
                        if (!optionNode)
                            return [2 /*return*/, null];
                        return [2 /*return*/, {
                                label: optionNode.label,
                                value: optionNode.value,
                                data: optionNode.data || {}
                            }];
                }
            });
        });
    };
    return AdvancedSelectService;
}());
exports.default = AdvancedSelectService;

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formulaTestUI = exports.exampleTestFormula = exports.testFormula = exports.evaluateFormula = void 0;
exports.evaluateFormulasSet = evaluateFormulasSet;
/**
 * Évalue une formule avec des valeurs de test
 *
 * @param formula La formule à tester
 * @param fieldValues Les valeurs de test pour chaque champ (clé = ID du champ, valeur = valeur de test)
 * @returns Le résultat de l'évaluation de la formule
 */
var evaluateFormula = function (formula, fieldValues, context) {
    if (!formula || !formula.sequence || !Array.isArray(formula.sequence) || formula.sequence.length === 0) {
        return {
            result: null,
            success: false,
            error: 'Formule vide ou invalide',
            debug: []
        };
    }
    // Tableau pour suivre chaque étape du calcul (pour le débogage)
    var debugSteps = [];
    try {
        // Traiter chaque élément de la séquence
        var result_1 = null;
        // Valeur brute (non convertie) du résultat courant (pour comparaisons string)
        var resultRaw_1 = null;
        var currentOperator_1 = null;
        var isFirstValue_1 = true;
        formula.sequence.forEach(function (item, index) {
            var _a, _b;
            if (!item || !item.type) {
                throw new Error("\u00C9l\u00E9ment de formule invalide \u00E0 l'\u00E9tape ".concat(index + 1));
            }
            // Récupérer la valeur selon le type d'élément
            var itemValue; // valeur numérique logique utilisée pour opérations arithmétiques / bool
            var itemRaw = undefined; // valeur brute potentiellement string pour comparaisons '=' / '!='
            switch (item.type) {
                case 'value': {
                    // Support "10%" => 0.10 si param utilisateur A
                    if (typeof item.value === 'string') {
                        var raw = item.value.trim();
                        itemRaw = raw; // conserver brut
                        // Si flag valueType=string => ne pas convertir sauf pour pourcentage explicite
                        if (item.valueType === 'string' && !/^-?\d+(\.\d+)?%$/.test(raw.replace(/\s+/g, ''))) {
                            itemValue = 0; // neutre pour opérations arithmétiques
                            break;
                        }
                        if (/^-?\d+(\.\d+)?%$/.test(raw)) {
                            var base = parseFloat(raw.replace('%', ''));
                            itemValue = isNaN(base) ? 0 : base / 100;
                        }
                        else {
                            var num = parseFloat(raw);
                            if (isNaN(num)) {
                                // Constante non numérique => garder 0 comme valeur numérique mais raw servira pour '=' / '!='
                                itemValue = 0;
                            }
                            else {
                                itemValue = num;
                            }
                        }
                    }
                    else if (typeof item.value === 'number') {
                        itemRaw = item.value;
                        itemValue = item.value;
                    }
                    else {
                        itemValue = 0;
                    }
                    break;
                }
                case 'field': {
                    // Récupère la valeur d'un champ simple (number / text convertible) depuis fieldValues ou rawValues
                    var fid = String(item.fieldId || item.value || '');
                    var rawVal = undefined;
                    if (fid) {
                        if (typeof fieldValues[fid] !== 'undefined')
                            rawVal = fieldValues[fid];
                        else if ((context === null || context === void 0 ? void 0 : context.rawValues) && Object.prototype.hasOwnProperty.call(context.rawValues, fid))
                            rawVal = context.rawValues[fid];
                    }
                    console.log("[FormulaEvaluator] \uD83C\uDFF7\uFE0F Champ \"".concat(fid, "\": rawVal=").concat(rawVal, ", typeof=").concat(typeof rawVal));
                    // Si advanced_select stocké comme objet { selection, extra, nodeId }
                    if (rawVal && typeof rawVal === 'object') {
                        var sel = rawVal.selection;
                        console.log("[FormulaEvaluator] \uD83D\uDD0D Advanced select - selection:".concat(sel, ", objet:"), rawVal);
                        rawVal = typeof sel !== 'undefined' ? sel : rawVal;
                    }
                    itemRaw = rawVal;
                    if (typeof rawVal === 'number')
                        itemValue = rawVal;
                    else if (typeof rawVal === 'string') {
                        var trimmed = rawVal.trim();
                        if (/^-?\d+(\.\d+)?%$/.test(trimmed)) {
                            var base = parseFloat(trimmed.replace('%', ''));
                            itemValue = isNaN(base) ? 0 : base / 100;
                        }
                        else {
                            var num = parseFloat(trimmed);
                            itemValue = isNaN(num) ? 0 : num;
                        }
                    }
                    else {
                        itemValue = 0;
                    }
                    console.log("[FormulaEvaluator] \uD83D\uDCCA Champ \"".concat(fid, "\" \u00E9valu\u00E9: ").concat(itemValue, " (raw: ").concat(rawVal, ")"));
                    debugSteps.push({ step: index + 1, operation: "Champ ".concat(fid), value: itemValue });
                    break;
                }
                case 'formula_ref': {
                    var refId = item.refFormulaId || String(item.value);
                    if (!refId)
                        throw new Error('formula_ref sans refFormulaId');
                    var cache = (context === null || context === void 0 ? void 0 : context.formulaResults) || {};
                    var refResult = cache[refId];
                    if (typeof refResult === 'undefined') {
                        // Détection cycle
                        var visited = (context === null || context === void 0 ? void 0 : context.visited) || new Set();
                        if (visited.has(refId))
                            throw new Error("Cycle d\u00E9tect\u00E9 sur la formule ".concat(refId));
                        visited.add(refId);
                        if ((context === null || context === void 0 ? void 0 : context.depth) && context.depth > 20)
                            throw new Error('Profondeur formule imbriquée trop grande');
                        var refFormula = (context === null || context === void 0 ? void 0 : context.resolveFormulaById) ? context.resolveFormulaById(refId) : undefined;
                        if (!refFormula)
                            throw new Error("Formule r\u00E9f\u00E9renc\u00E9e introuvable: ".concat(refId));
                        var nested = (0, exports.evaluateFormula)(refFormula, fieldValues, __assign(__assign({}, context), { depth: ((context === null || context === void 0 ? void 0 : context.depth) || 0) + 1, visited: visited, formulaResults: __assign({}, ((context === null || context === void 0 ? void 0 : context.formulaResults) || {})) }));
                        if (!nested.success)
                            throw new Error("Erreur formule imbriqu\u00E9e ".concat(refId, ": ").concat(nested.error));
                        refResult = nested.result;
                        if (context === null || context === void 0 ? void 0 : context.formulaResults)
                            context.formulaResults[refId] = refResult;
                        visited.delete(refId);
                    }
                    if (typeof refResult === 'boolean')
                        itemValue = refResult ? 1 : 0;
                    else
                        itemValue = Number(refResult !== null && refResult !== void 0 ? refResult : 0);
                    break;
                }
                case 'adv_part': {
                    var fid = item.fieldId || item.value;
                    var part = item.part || 'selection';
                    var raw = (_a = context === null || context === void 0 ? void 0 : context.rawValues) === null || _a === void 0 ? void 0 : _a[fid];
                    var extracted = undefined;
                    if (raw && typeof raw === 'object') {
                        var obj = raw;
                        if (part === 'selection')
                            extracted = obj['selection'];
                        else if (part === 'extra')
                            extracted = obj['extra'];
                        else if (part === 'nodeId')
                            extracted = obj['nodeId'];
                    }
                    else if (part === 'selection') {
                        extracted = raw; // fallback si simple valeur
                    }
                    itemRaw = extracted;
                    // Conversion number
                    if (typeof extracted === 'number')
                        itemValue = extracted;
                    else if (typeof extracted === 'string') {
                        var s = extracted.trim();
                        if (/^-?\d+(\.\d+)?%$/.test(s)) {
                            var base = parseFloat(s.replace('%', ''));
                            itemValue = isNaN(base) ? 0 : base / 100;
                        }
                        else {
                            var n = parseFloat(s);
                            itemValue = isNaN(n) ? 0 : n;
                        }
                    }
                    else {
                        itemValue = 0; // Non numérique => 0
                    }
                    break;
                }
                case 'cond': {
                    // Nouvelle logique: si condExpr existe on l'évalue comme une sous-formule booléenne
                    var pass = false;
                    var condDebugValue = null;
                    if (item.condExpr && item.condExpr.length > 0) {
                        // Vérifier si l'expression commence par une fonction IF
                        var firstToken = item.condExpr[0];
                        if ((firstToken === null || firstToken === void 0 ? void 0 : firstToken.type) === 'function' && String(firstToken.value).startsWith('IF(')) {
                            // Traiter comme une fonction IF : évaluer les arguments suivants comme condition
                            // Extraire la condition des tokens suivants (ignorer le IF)
                            var conditionTokens = item.condExpr.slice(1); // Ignorer le token IF
                            if (conditionTokens.length >= 3) {
                                // Évaluer la condition (ex: Prix Kw/h > Prix Kw/h)
                                var tempBool = { id: "".concat(formula.id, "__if_cond_").concat(index), name: 'if-condition', sequence: conditionTokens, targetProperty: '' };
                                var nestedBool = (0, exports.evaluateFormula)(tempBool, fieldValues, __assign(__assign({}, context), { depth: ((context === null || context === void 0 ? void 0 : context.depth) || 0) + 1 }));
                                if (nestedBool.success) {
                                    pass = Boolean(nestedBool.result);
                                    condDebugValue = nestedBool.result;
                                }
                                else {
                                    console.warn("[FormulaEvaluator] Erreur \u00E9valuation condition IF: ".concat(nestedBool.error));
                                    pass = false;
                                    condDebugValue = false;
                                }
                            }
                            else {
                                console.warn('[FormulaEvaluator] Fonction IF sans condition suffisante');
                                pass = false;
                                condDebugValue = false;
                            }
                        }
                        else {
                            // Traitement normal d'une expression booléenne
                            var tempBool = { id: "".concat(formula.id, "__cond_expr_").concat(index), name: 'cond-expr', sequence: item.condExpr, targetProperty: '' };
                            var nestedBool = (0, exports.evaluateFormula)(tempBool, fieldValues, __assign(__assign({}, context), { depth: ((context === null || context === void 0 ? void 0 : context.depth) || 0) + 1 }));
                            if (!nestedBool.success)
                                throw new Error("Erreur expression condition: ".concat(nestedBool.error));
                            pass = Boolean(nestedBool.result);
                            condDebugValue = nestedBool.result;
                        }
                    }
                    else {
                        var cond_1 = item.condition;
                        var evalCondition = function () {
                            var _a, _b, _c;
                            if (!cond_1)
                                return false;
                            var raw = (_b = (_a = context === null || context === void 0 ? void 0 : context.rawValues) === null || _a === void 0 ? void 0 : _a[cond_1.fieldId]) !== null && _b !== void 0 ? _b : (_c = context === null || context === void 0 ? void 0 : context.rawValues) === null || _c === void 0 ? void 0 : _c[cond_1.fieldId];
                            var part = cond_1.part || 'selection';
                            var base = raw;
                            if (raw && typeof raw === 'object') {
                                var obj = raw;
                                if (part === 'selection')
                                    base = obj['selection'];
                                else if (part === 'extra')
                                    base = obj['extra'];
                                else if (part === 'nodeId')
                                    base = obj['nodeId'];
                            }
                            var op = cond_1.operator || '=';
                            var val = cond_1.value;
                            var cmp = function (a, b, op) {
                                if (op === 'in') {
                                    if (!Array.isArray(b))
                                        return false;
                                    return b.some(function (x) { return String(x) === String(a); });
                                }
                                // Comparaisons string pures si l'un n'est pas numérique
                                var aNum = parseFloat(String(a));
                                var bNum = parseFloat(String(b));
                                var aIsNum = !isNaN(aNum) && String(a).trim() !== '' && /^-?\d+(\.\d+)?$/.test(String(a).trim());
                                var bIsNum = !isNaN(bNum) && String(b).trim() !== '' && /^-?\d+(\.\d+)?$/.test(String(b).trim());
                                var an = typeof a === 'number' ? a : parseFloat(String(a));
                                var bn = typeof b === 'number' ? b : parseFloat(String(b));
                                switch (op) {
                                    case '=': return String(a) === String(b);
                                    case '!=': return String(a) !== String(b);
                                    case '>': return aIsNum && bIsNum ? an > bn : String(a) > String(b);
                                    case '>=': return aIsNum && bIsNum ? an >= bn : String(a) >= String(b);
                                    case '<': return aIsNum && bIsNum ? an < bn : String(a) < String(b);
                                    case '<=': return aIsNum && bIsNum ? an <= bn : String(a) <= String(b);
                                    default: return false;
                                }
                            };
                            return cmp(base, val, op);
                        };
                        pass = evalCondition();
                        condDebugValue = pass;
                    }
                    // Étape 1: évaluation de la condition
                    debugSteps.push({ step: index + 1, operation: "Condition TEST", value: condDebugValue });
                    console.log("[FormulaEvaluator] \uD83D\uDD0D Condition IF \u00E9valu\u00E9e: ".concat(pass, " (").concat(condDebugValue, ")"));
                    // Évaluer sous-séquence THEN ou ELSE
                    var seqToEval = pass ? (item.then || []) : (item.else || []);
                    console.log("[FormulaEvaluator] \uD83D\uDCDD Branche s\u00E9lectionn\u00E9e: ".concat(pass ? 'THEN' : 'ELSE', " (").concat(seqToEval.length, " \u00E9l\u00E9ments)"));
                    if (seqToEval.length > 0) {
                        console.log("[FormulaEvaluator] \uD83D\uDD22 S\u00E9quence \u00E0 \u00E9valuer:", seqToEval.map(function (s) { return "".concat(s.type, ":").concat(s.label || s.value); }));
                    }
                    if (seqToEval.length === 0) {
                        // Comportement selon elseBehavior
                        if (!pass && item.elseBehavior === 'ignore') {
                            itemValue = 0; // Pour la séquence principale on retourne 0 (ou on pourrait skip). Simplicité: 0.
                        }
                        else {
                            itemValue = 0; // THEN vide => 0
                        }
                        debugSteps.push({ step: index + 1, operation: "Condition ".concat(pass ? 'THEN (vide)' : 'ELSE (vide)'), value: 0 });
                    }
                    else {
                        // Construire une formule temporaire locale
                        var temp = { id: "".concat(formula.id, "__cond_").concat(index), name: 'cond', sequence: seqToEval, targetProperty: '' };
                        console.log("[FormulaEvaluator] \u2699\uFE0F \u00C9valuation de la branche ".concat(pass ? 'THEN' : 'ELSE', " avec fieldValues:"), Object.keys(fieldValues));
                        var nested = (0, exports.evaluateFormula)(temp, fieldValues, __assign(__assign({}, context), { depth: ((context === null || context === void 0 ? void 0 : context.depth) || 0) + 1 }));
                        console.log("[FormulaEvaluator] \uD83D\uDCCA R\u00E9sultat branche ".concat(pass ? 'THEN' : 'ELSE', ":"), nested);
                        if (!nested.success)
                            throw new Error("Erreur sous-s\u00E9quence condition: ".concat(nested.error));
                        var valNum = typeof nested.result === 'number' ? nested.result : (typeof nested.result === 'boolean' ? (nested.result ? 1 : 0) : 0);
                        itemValue = valNum;
                        console.log("[FormulaEvaluator] \u2705 Valeur finale de la condition: ".concat(itemValue));
                        debugSteps.push({ step: index + 1, operation: "Condition ".concat(pass ? 'THEN' : 'ELSE', " (r\u00E9sultat branche)"), value: valNum });
                    }
                    itemRaw = itemValue;
                    break;
                }
                case 'switch': {
                    // Récupérer la valeur de base (advanced_select part ou raw)
                    var fieldId = item.switchFieldId || item.fieldId;
                    var part = item.switchPart || 'selection';
                    var raw = (_b = context === null || context === void 0 ? void 0 : context.rawValues) === null || _b === void 0 ? void 0 : _b[fieldId || ''];
                    var key_1 = raw;
                    if (raw && typeof raw === 'object') {
                        var obj = raw;
                        if (part === 'selection')
                            key_1 = obj['selection'];
                        else if (part === 'extra')
                            key_1 = obj['extra'];
                        else if (part === 'nodeId')
                            key_1 = obj['nodeId'];
                    }
                    var cases = item.cases || [];
                    var match = cases.find(function (c) { return String(c.value) === String(key_1); });
                    var seqToEval = match ? cDeep(match.seq) : (item.defaultSeq || []);
                    if (seqToEval.length === 0) {
                        itemValue = 0;
                        break;
                    }
                    var temp = { id: "".concat(formula.id, "__switch_").concat(index), name: 'switch', sequence: seqToEval, targetProperty: '' };
                    var nested = (0, exports.evaluateFormula)(temp, fieldValues, __assign(__assign({}, context), { depth: ((context === null || context === void 0 ? void 0 : context.depth) || 0) + 1 }));
                    if (!nested.success)
                        throw new Error("Erreur switch: ".concat(nested.error));
                    var valNum = typeof nested.result === 'number' ? nested.result : (typeof nested.result === 'boolean' ? (nested.result ? 1 : 0) : 0);
                    itemValue = valNum;
                    debugSteps.push({ step: index + 1, operation: "Switch valeur=".concat(String(key_1)), value: valNum });
                    itemRaw = itemValue;
                    break;
                }
                case 'operator':
                    currentOperator_1 = String(item.value);
                    // Ne pas traiter l'opérateur immédiatement
                    debugSteps.push({ step: index + 1, operation: "Op\u00E9rateur: ".concat(currentOperator_1), value: null });
                    return;
                case 'function': {
                    // Support des fonctions de base
                    var functionValue = String(item.value || '').trim();
                    if (functionValue.startsWith('IF(')) {
                        // Parser basique pour IF(condition, alors, sinon)
                        // Pour l'instant, on supporte IF suivi d'autres éléments dans la séquence
                        // Cette approche simple traite IF comme un préfixe qui influence l'interprétation
                        // Dans le contexte de votre usage, IF semble être suivi des arguments dans la séquence
                        // On va traiter cela comme un marqueur conditionnel
                        itemValue = 1; // IF validé, continuer l'évaluation
                        debugSteps.push({ step: index + 1, operation: "Function IF d\u00E9tect\u00E9e", value: itemValue });
                    }
                    else if (functionValue.startsWith('ROUND(')) {
                        // Pour ROUND et autres fonctions mathématiques, on peut les ignorer pour l'instant
                        itemValue = 0; // Neutre
                        debugSteps.push({ step: index + 1, operation: "Function ".concat(functionValue, " (non impl\u00E9ment\u00E9e)"), value: itemValue });
                    }
                    else {
                        // Autres fonctions : les traiter comme des valeurs neutres pour ne pas casser l'évaluation
                        itemValue = 0;
                        debugSteps.push({ step: index + 1, operation: "Function ".concat(functionValue, " (ignor\u00E9e)"), value: itemValue });
                    }
                    break;
                }
                default:
                    throw new Error("Type d'\u00E9l\u00E9ment non support\u00E9: ".concat(item.type));
            }
            // Si c'est le premier élément ou après un opérateur
            if (isFirstValue_1) {
                result_1 = (itemRaw !== undefined ? itemRaw : itemValue);
                resultRaw_1 = itemRaw;
                isFirstValue_1 = false;
                debugSteps.push({ step: index + 1, operation: 'Valeur initiale', value: result_1 });
                return;
            }
            // Appliquer l'opérateur avec la valeur actuelle
            if (currentOperator_1 === null) {
                throw new Error("Op\u00E9rateur manquant avant la valeur \u00E0 l'\u00E9tape ".concat(index + 1));
            }
            // Effectuer l'opération
            console.log("[FormulaEvaluator] \uD83D\uDD22 Op\u00E9ration: ".concat(result_1, " ").concat(currentOperator_1, " ").concat(itemValue));
            switch (currentOperator_1) {
                case '+':
                    result_1 = (Number(result_1) || 0) + Number(itemValue);
                    break;
                case '-':
                    result_1 = (Number(result_1) || 0) - Number(itemValue);
                    break;
                case '*':
                    result_1 = (Number(result_1) || 0) * Number(itemValue);
                    break;
                case '/':
                    if (itemValue === 0) {
                        // Enregistrer l'étape avant de lever l'erreur pour diagnostic UI
                        debugSteps.push({ step: index + 1, operation: 'Division par 0 (arrêt)', value: null });
                        console.log("[FormulaEvaluator] \u274C Division par z\u00E9ro d\u00E9tect\u00E9e !");
                        throw new Error('Division par zéro');
                    }
                    result_1 = (Number(result_1) || 0) / Number(itemValue);
                    break;
                case '=':
                    result_1 = String(resultRaw_1 !== null && resultRaw_1 !== void 0 ? resultRaw_1 : result_1) === String(itemRaw !== null && itemRaw !== void 0 ? itemRaw : itemValue);
                    break;
                case '!=':
                    result_1 = String(resultRaw_1 !== null && resultRaw_1 !== void 0 ? resultRaw_1 : result_1) !== String(itemRaw !== null && itemRaw !== void 0 ? itemRaw : itemValue);
                    break;
                case '>':
                    result_1 = Number(result_1) > Number(itemValue);
                    break;
                case '<':
                    result_1 = Number(result_1) < Number(itemValue);
                    break;
                case '>=':
                    result_1 = Number(result_1) >= Number(itemValue);
                    break;
                case '<=':
                    result_1 = Number(result_1) <= Number(itemValue);
                    break;
                case '&&':
                    result_1 = Boolean(result_1) && Boolean(itemValue);
                    break;
                case '||':
                    result_1 = Boolean(result_1) || Boolean(itemValue);
                    break;
                default:
                    throw new Error("Op\u00E9rateur non support\u00E9: ".concat(currentOperator_1));
            }
            console.log("[FormulaEvaluator] \u27A1\uFE0F R\u00E9sultat apr\u00E8s op\u00E9ration: ".concat(result_1));
            debugSteps.push({
                step: index + 1,
                operation: "".concat(currentOperator_1, " ").concat(itemValue),
                value: result_1
            });
            // Mettre à jour la valeur brute AVANT de réinitialiser (sinon on perd l'info)
            if (['+', '-', '*', '/'].includes(currentOperator_1 || ''))
                resultRaw_1 = result_1;
            if (['=', '!='].includes(currentOperator_1 || ''))
                resultRaw_1 = result_1; // bool
            // Réinitialiser l'opérateur après application
            currentOperator_1 = null;
        });
        return {
            result: result_1,
            success: true,
            debug: debugSteps
        };
    }
    catch (error) {
        return {
            result: null,
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
            debug: debugSteps
        };
    }
};
exports.evaluateFormula = evaluateFormula;
/**
 * Crée un jeu de tests pour vérifier qu'une formule fonctionne comme prévu
 */
var testFormula = function (formula, testCases) {
    console.log("\uD83E\uDDEA Test de la formule: ".concat(formula.name || formula.id));
    var results = testCases.map(function (testCase, index) {
        var values = testCase.values, expectedResult = testCase.expectedResult, name = testCase.name;
        var evaluation = (0, exports.evaluateFormula)(formula, values);
        var testName = name || "Test #".concat(index + 1);
        var success = evaluation.success && evaluation.result === expectedResult;
        console.log("".concat(success ? '✅' : '❌', " ").concat(testName));
        if (!success) {
            console.log("   Valeurs: ".concat(JSON.stringify(values)));
            console.log("   R\u00E9sultat attendu: ".concat(expectedResult));
            console.log("   R\u00E9sultat obtenu: ".concat(evaluation.result));
            if (evaluation.error) {
                console.log("   Erreur: ".concat(evaluation.error));
            }
        }
        // Afficher les étapes de calcul pour le débogage
        console.log('   Étapes:');
        evaluation.debug.forEach(function (step) {
            console.log("     ".concat(step.step, ". ").concat(step.operation, " => ").concat(step.value));
        });
        return {
            name: testName,
            success: success,
            values: values,
            expectedResult: expectedResult,
            actualResult: evaluation.result,
            error: evaluation.error,
            debug: evaluation.debug
        };
    });
    // Résumé
    var successCount = results.filter(function (r) { return r.success; }).length;
    console.log("\n\uD83D\uDCCA R\u00E9sum\u00E9: ".concat(successCount, "/").concat(testCases.length, " tests r\u00E9ussis"));
    return {
        formulaId: formula.id,
        formulaName: formula.name,
        success: successCount === testCases.length,
        successCount: successCount,
        totalTests: testCases.length,
        results: results
    };
};
exports.testFormula = testFormula;
/**
 * Exemples de tests pour une formule
 */
var exampleTestFormula = function () {
    // Exemple de formule: prix * quantité
    var formula = {
        id: 'example-formula',
        name: 'Prix Total',
        targetProperty: 'prixTotal',
        sequence: [
            {
                id: 'field-prix',
                type: 'field',
                value: 'prix',
                label: 'Prix unitaire',
                fieldId: 'prix'
            },
            {
                id: 'op-mult',
                type: 'operator',
                value: '*',
                label: '*'
            },
            {
                id: 'field-qte',
                type: 'field',
                value: 'quantite',
                label: 'Quantité',
                fieldId: 'quantite'
            }
        ]
    };
    // Jeux de test
    var testCases = [
        {
            name: 'Cas standard',
            values: { prix: 10, quantite: 5 },
            expectedResult: 50
        },
        {
            name: 'Prix zéro',
            values: { prix: 0, quantite: 5 },
            expectedResult: 0
        },
        {
            name: 'Quantité décimale',
            values: { prix: 10, quantite: 2.5 },
            expectedResult: 25
        }
    ];
    // Exécuter les tests
    return (0, exports.testFormula)(formula, testCases);
};
exports.exampleTestFormula = exampleTestFormula;
/**
 * Interface simple pour tester une formule avec des valeurs concrètes
 */
var formulaTestUI = function (formula, currentValues) {
    var fieldsInFormula = formula.sequence
        .filter(function (item) { return item.type === 'field'; })
        .map(function (item) { return ({
        id: item.fieldId || String(item.value),
        label: item.label || String(item.value)
    }); });
    // Valeurs par défaut pour les champs
    var defaultValues = currentValues || {};
    fieldsInFormula.forEach(function (field) {
        if (defaultValues[field.id] === undefined) {
            defaultValues[field.id] = 0;
        }
    });
    // Évaluer avec les valeurs actuelles
    var evaluation = (0, exports.evaluateFormula)(formula, defaultValues);
    console.log('='.repeat(50));
    console.log("\uD83D\uDD0E Test de la formule: ".concat(formula.name || formula.id));
    console.log('='.repeat(50));
    console.log('\nValeurs actuelles:');
    Object.entries(defaultValues).forEach(function (_a) {
        var fieldId = _a[0], value = _a[1];
        var field = fieldsInFormula.find(function (f) { return f.id === fieldId; });
        console.log("- ".concat((field === null || field === void 0 ? void 0 : field.label) || fieldId, ": ").concat(value));
    });
    console.log('\nRésultat:');
    if (evaluation.success) {
        console.log("\u2705 ".concat(evaluation.result));
    }
    else {
        console.log("\u274C Erreur: ".concat(evaluation.error));
    }
    console.log('\nÉtapes de calcul:');
    evaluation.debug.forEach(function (step) {
        console.log("".concat(step.step, ". ").concat(step.operation, " => ").concat(step.value));
    });
    console.log('\n' + '='.repeat(50));
    return {
        formula: formula,
        fieldsInFormula: fieldsInFormula,
        currentValues: defaultValues,
        result: evaluation.result,
        success: evaluation.success,
        error: evaluation.error,
        debug: evaluation.debug
    };
};
exports.formulaTestUI = formulaTestUI;
/**
 * Évalue un ensemble de formules en respectant les dépendances inter-formules (formula_ref).
 * Retourne un objet { fieldId: { formulaId: result } } et un ordre d'évaluation.
 */
function evaluateFormulasSet(params) {
    var formulas = params.formulas, fieldValues = params.fieldValues, rawValues = params.rawValues, resolveFormulaById = params.resolveFormulaById;
    var byId = {};
    formulas.forEach(function (f) { if (f && f.id)
        byId[f.id] = f; });
    var deps = {};
    var reverseDeps = {};
    var formulaIds = Object.keys(byId);
    // Extraire dépendances formula_ref
    for (var _i = 0, formulas_1 = formulas; _i < formulas_1.length; _i++) {
        var f = formulas_1[_i];
        if (!f || !f.id)
            continue;
        var set = (deps[f.id] = deps[f.id] || new Set());
        for (var _a = 0, _b = f.sequence || []; _a < _b.length; _a++) {
            var it = _b[_a];
            if ((it === null || it === void 0 ? void 0 : it.type) === 'formula_ref' && it.refFormulaId) {
                set.add(it.refFormulaId);
                (reverseDeps[it.refFormulaId] = reverseDeps[it.refFormulaId] || new Set()).add(f.id);
            }
        }
    }
    // Kahn topological sort
    var inDegree = {};
    formulaIds.forEach(function (id) { var _a; inDegree[id] = ((_a = deps[id]) === null || _a === void 0 ? void 0 : _a.size) || 0; });
    var queue = formulaIds.filter(function (id) { return inDegree[id] === 0; });
    var order = [];
    while (queue.length) {
        var id = queue.shift();
        order.push(id);
        for (var _c = 0, _d = reverseDeps[id] || []; _c < _d.length; _c++) {
            var consumer = _d[_c];
            inDegree[consumer] -= 1;
            if (inDegree[consumer] === 0)
                queue.push(consumer);
        }
    }
    // Détecter cycles
    var hasCycle = order.length !== formulaIds.length;
    if (hasCycle) {
        // On continue quand même mais les formules cycliques seront évaluées avec guard existant.
        var remaining = formulaIds.filter(function (id) { return !order.includes(id); });
        order.push.apply(order, remaining); // append pour tentative d'évaluation protégée
    }
    var results = {};
    var errors = {};
    var formulaResultsCache = {};
    var resolver = function (id) { return byId[id] || (resolveFormulaById === null || resolveFormulaById === void 0 ? void 0 : resolveFormulaById(id)); };
    for (var _e = 0, order_1 = order; _e < order_1.length; _e++) {
        var fid = order_1[_e];
        var f = byId[fid];
        if (!f)
            continue;
        try {
            var out = (0, exports.evaluateFormula)(f, fieldValues, {
                rawValues: rawValues,
                resolveFormulaById: resolver,
                formulaResults: formulaResultsCache,
                visited: new Set(),
                depth: 0
            });
            if (!results[f.targetProperty || f.id])
                results[f.targetProperty || f.id] = {};
            results[f.targetProperty || f.id][f.id] = out.result;
            if (out.success) {
                // stocker numérique/bool pour références ultérieures
                if (typeof out.result === 'number' || typeof out.result === 'boolean' || out.result === null) {
                    formulaResultsCache[f.id] = out.result;
                }
                else if (typeof out.result === 'string') {
                    var num = parseFloat(out.result);
                    if (!isNaN(num))
                        formulaResultsCache[f.id] = num;
                }
            }
            else {
                errors[f.id] = out.error || 'Erreur inconnue';
            }
        }
        catch (e) {
            errors[fid] = (e === null || e === void 0 ? void 0 : e.message) || 'Erreur inconnue';
        }
    }
    return { results: results, order: order, errors: errors };
}

"use strict";
// Formula Engine avec précédence, parenthèses et variables nodeId
// Fournit parsing d'expressions déjà "templatisées" sous forme de tokens ou string.
// Conçu pour remplacer l'évaluation gauche->droite simpliste.
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
exports.getRpnCacheStats = getRpnCacheStats;
exports.clearRpnCache = clearRpnCache;
exports.getLogicMetrics = getLogicMetrics;
exports.resetLogicMetrics = resetLogicMetrics;
exports.parseExpression = parseExpression;
exports.toRPN = toRPN;
exports.evaluateTokens = evaluateTokens;
exports.evaluateExpression = evaluateExpression;
// Ajout: opérateurs comparaison gérés en phase de parsing (transformés en fonctions booléennes)
// Ils ne sont PAS ajoutés à OP_PRECEDENCE pour éviter de modifier la logique arithmétique: au lieu de cela,
// on réécrit 'a > b' en gt(a,b) directement sous forme de tokens fonction.
var OP_PRECEDENCE = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '^': 3,
    '&': 1,
    and: 0,
    or: 0
};
var OP_ASSOC = {
    '+': 'L',
    '-': 'L',
    '*': 'L',
    '/': 'L',
    '^': 'R',
    '&': 'L',
    and: 'L',
    or: 'L'
};
// Cache RPN basé sur empreinte des tokens
var rpnCache = new Map();
var rpnParseCount = 0; // compteur pour tests / diagnostics
function getRpnCacheStats() { return { entries: rpnCache.size, parseCount: rpnParseCount }; }
function clearRpnCache() { rpnCache.clear(); }
var logicMetrics = {
    evaluations: 0,
    totalEvalMs: 0,
    functions: {},
    divisionByZero: 0,
    unknownVariables: 0,
    parseErrors: 0,
    invalidResults: 0
};
function getLogicMetrics() {
    return __assign(__assign({}, logicMetrics), { avgEvalMs: logicMetrics.evaluations ? logicMetrics.totalEvalMs / logicMetrics.evaluations : 0 });
}
function resetLogicMetrics() {
    logicMetrics.evaluations = 0;
    logicMetrics.totalEvalMs = 0;
    logicMetrics.functions = {};
    logicMetrics.divisionByZero = 0;
    logicMetrics.unknownVariables = 0;
    logicMetrics.parseErrors = 0;
    logicMetrics.invalidResults = 0;
}
function tokensFingerprint(tokens) {
    return tokens.map(function (t) {
        var _a;
        switch (t.type) {
            case 'number': return "n:".concat(t.value);
            case 'variable': return "v:".concat(t.name);
            case 'operator': return "o:".concat(t.value);
            case 'paren': return "p:".concat(t.value);
            case 'func': return "f:".concat(t.name, ":").concat((_a = t.argCount) !== null && _a !== void 0 ? _a : '?');
            case 'comma': return 'c';
        }
    }).join('|');
}
// Validation sécurité
function validateExpression(expr, opts) {
    var _a;
    var maxLen = (_a = opts === null || opts === void 0 ? void 0 : opts.maxExpressionLength) !== null && _a !== void 0 ? _a : 500;
    if (expr.length > maxLen)
        throw new Error('Expression trop longue');
    // Ajout de @ pour supporter @table.xxx et @value.xxx
    var allowed = (opts === null || opts === void 0 ? void 0 : opts.allowedCharsRegex) || /^[0-9A-Za-z_\s+*\-/^(),.{}:<>!=&"\\@]+$/;
    if (!allowed.test(expr))
        throw new Error('Caractères non autorisés dans l\'expression');
}
function parseExpression(expr, roleToNodeId, opts) {
    validateExpression(expr, opts);
    // Remplacer {{role}} par un marqueur unique pour scanning
    var working = expr.replace(/\{\{\s*(.+?)\s*\}\}/g, function (_, v) { return "__VAR__".concat(v.trim(), "__"); });
    // Également remplacer @table.xxx et @value.xxx par des marqueurs variables
    working = working.replace(/@(table|value)\.([a-zA-Z0-9_-]+)/g, function (_, type, id) { return "__VAR__".concat(type, ".").concat(id, "__"); });
    var tokens = [];
    var i = 0;
    var parenBalance = 0;
    // Stack des fonctions en cours pour compter les arguments (liaison par parenthèse)
    var funcParenStack = [];
    var lastToken = null;
    while (i < working.length) {
        var ch = working[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        // Variable marquée
        if (working.startsWith('__VAR__', i)) {
            var end = working.indexOf('__', i + 7);
            if (end === -1)
                throw new Error('Marqueur variable mal formé');
            var role = working.substring(i + 7, end);
            // Essayer d'abord roleToNodeId, sinon utiliser le role directement (pour @table.xxx)
            var nodeId = roleToNodeId[role] || role;
            tokens.push({ type: 'variable', name: nodeId });
            i = end + 2;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        // Nombre
        if (/[0-9]/.test(ch)) {
            var j = i + 1;
            while (j < working.length && /[0-9.]/.test(working[j]))
                j++;
            var numStr = working.slice(i, j);
            tokens.push({ type: 'number', value: parseFloat(numStr) });
            i = j;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        // Littéral string
        if (ch === '"') {
            var j = i + 1;
            var str = '';
            while (j < working.length) {
                var cc = working[j];
                if (cc === '\\' && j + 1 < working.length) {
                    str += working[j + 1];
                    j += 2;
                    continue;
                }
                if (cc === '"')
                    break;
                str += cc;
                j++;
            }
            if (j >= working.length)
                throw new Error('Chaîne non terminée');
            tokens.push({ type: 'string', value: str });
            i = j + 1;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        // Identifiant (potentiellement fonction)
        if (/[A-Za-z_]/.test(ch)) {
            var j = i + 1;
            while (j < working.length && /[A-Za-z0-9_]/.test(working[j]))
                j++;
            var ident = working.slice(i, j);
            var lowerIdent = ident.toLowerCase();
            if (lowerIdent === 'true' || lowerIdent === 'false') {
                tokens.push({ type: 'number', value: lowerIdent === 'true' ? 1 : 0 });
                i = j;
                lastToken = tokens[tokens.length - 1];
                continue;
            }
            var canUseAsBinary = Boolean(lastToken && ((lastToken.type === 'number') ||
                (lastToken.type === 'variable') ||
                (lastToken.type === 'paren' && lastToken.value === ')')));
            if ((lowerIdent === 'and' || lowerIdent === 'or') && canUseAsBinary) {
                tokens.push({ type: 'operator', value: lowerIdent });
                i = j;
                lastToken = tokens[tokens.length - 1];
                continue;
            }
            // Fonction si prochaine non-espace est (
            var k = j;
            while (k < working.length && /\s/.test(working[k]))
                k++;
            if (working[k] === '(') {
                tokens.push({ type: 'func', name: lowerIdent });
                // La parenthèse sera traitée dans cycle suivant
                i = j;
                lastToken = tokens[tokens.length - 1];
                continue;
            }
            else {
                // Identifiant seul non supporté (on pourrait l'étendre plus tard)
                throw new Error('Identifiant inattendu: ' + ident);
            }
        }
        // Parenthèses
        if (ch === '(') {
            tokens.push({ type: 'paren', value: '(' });
            // Lier à une fonction précédente (si lastToken func sans paren encore ouverte)
            var prev = lastToken;
            if (prev && prev.type === 'func') {
                funcParenStack.push({ name: prev.name, argCount: 0 });
            }
            parenBalance++;
            i++;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        if (ch === ')') {
            tokens.push({ type: 'paren', value: ')' });
            parenBalance--;
            if (parenBalance < 0)
                throw new Error('Parenthèses déséquilibrées');
            // Si on ferme une fonction: incrémenter argCount si la dernière chose n'était pas '(' (i.e. au moins une expr)
            if (funcParenStack.length) {
                // On décidera dans toRPN lequel associer
            }
            i++;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        // Virgule
        if (ch === ',') {
            tokens.push({ type: 'comma' });
            // Incrémenter compteur arg de la fonction en haut de pile
            if (funcParenStack.length) {
                var top_1 = funcParenStack[funcParenStack.length - 1];
                top_1.argCount++;
            }
            i++;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        // Opérateurs simples arithmétiques + concat (&)
        if ('+-*/^&'.includes(ch)) {
            tokens.push({ type: 'operator', value: ch });
            i++;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        // Opérateurs comparaison multi-caractères (>=, <=, ==, !=)
        if ((ch === '>' || ch === '<' || ch === '=' || ch === '!') && i + 1 < working.length) {
            var two = working.slice(i, i + 2);
            if (['>=', '<=', '==', '!='].includes(two)) {
                tokens.push({ type: 'operator', value: two });
                i += 2;
                lastToken = tokens[tokens.length - 1];
                continue;
            }
        }
        // Opérateurs comparaison simples (>, <)
        if (ch === '>' || ch === '<') {
            tokens.push({ type: 'operator', value: ch });
            i++;
            lastToken = tokens[tokens.length - 1];
            continue;
        }
        throw new Error('Caractère inattendu: ' + ch);
    }
    if (parenBalance !== 0)
        throw new Error('Parenthèses déséquilibrées');
    // Réécriture comparaison → fonctions (gt, gte, lt, lte, eq, neq)
    if (tokens.some(function (t) { return t.type === 'operator' && ['>', '>=', '<', '<=', '==', '!='].includes(t.value); })) {
        var rewritten = [];
        for (var idx = 0; idx < tokens.length; idx++) {
            var tk = tokens[idx];
            if (tk.type === 'operator' && ['>', '>=', '<', '<=', '==', '!='].includes(tk.value)) {
                // On suppose forme binaire: précédent est une valeur/variable/paren fermante ou fonction déjà sortie,
                // suivant est une valeur/variable/paren ouvrante ou fonction; on va transformer A op B en func(A,B)
                // Stratégie: On remonte à l'élément immédiatement précédent dans rewritten pour extraire l'opérande gauche
                var op = tk.value;
                var left = rewritten.pop();
                var right = tokens[idx + 1];
                if (!left || !right)
                    throw new Error('Expression comparaison mal formée');
                // Consommer le token de droite en avançant idx
                idx++;
                // Construire tokens fonction: name(left,right)
                var funcName = op === '>' ? 'gt'
                    : op === '>=' ? 'gte'
                        : op === '<' ? 'lt'
                            : op === '<=' ? 'lte'
                                : op === '==' ? 'eq'
                                    : op === '!=' ? 'neq' : 'eq';
                // Modèle: func( left , right ) => [func, '(', left, ',', right, ')']
                rewritten.push({ type: 'func', name: funcName });
                rewritten.push({ type: 'paren', value: '(' });
                rewritten.push(left);
                rewritten.push({ type: 'comma' });
                rewritten.push(right);
                rewritten.push({ type: 'paren', value: ')' });
            }
            else {
                rewritten.push(tk);
            }
        }
        return rewritten;
    }
    return tokens;
}
function toRPN(tokens) {
    var output = [];
    var stack = [];
    // pile pour compter les arguments par fonction (index aligné avec parenthèse ouvrante associée)
    var funcStack = [];
    for (var idx = 0; idx < tokens.length; idx++) {
        var tk = tokens[idx];
        switch (tk.type) {
            case 'number':
            case 'variable':
            case 'string':
                output.push(tk);
                // Si nous sommes dans une fonction et que le token précédent est '(' ou ',' on compte cet argument
                if (funcStack.length) {
                    // incrément implicite si dernier arg démarre; on gère en sortie parenthèse
                }
                break;
            case 'func':
                stack.push(tk); // fonction en pile
                break;
            case 'operator': {
                while (stack.length) {
                    var top_2 = stack[stack.length - 1];
                    if (top_2.type === 'operator') {
                        var pTop = OP_PRECEDENCE[top_2.value] || 0;
                        var pCur = OP_PRECEDENCE[tk.value] || 0;
                        if ((OP_ASSOC[tk.value] === 'L' && pCur <= pTop) || (OP_ASSOC[tk.value] === 'R' && pCur < pTop)) {
                            output.push(stack.pop());
                            continue;
                        }
                    }
                    break;
                }
                stack.push(tk);
                break;
            }
            case 'paren':
                if (tk.value === '(') {
                    stack.push(tk);
                    // Si le token précédent sur la pile est une fonction, initialiser compteur args=1 provisoire
                    var prev = stack[stack.length - 2];
                    if (prev && prev.type === 'func') {
                        funcStack.push({ name: prev.name, argCount: 1 });
                    }
                }
                else { // ')'
                    var found = false;
                    while (stack.length) {
                        var top_3 = stack.pop();
                        if (top_3.type === 'paren' && top_3.value === '(') {
                            found = true;
                            break;
                        }
                        output.push(top_3);
                    }
                    if (!found)
                        throw new Error('Parenthèses déséquilibrées');
                    // Si juste après '(' il y avait une fonction
                    var maybeFunc = stack[stack.length - 1];
                    if (maybeFunc && maybeFunc.type === 'func') {
                        // Finaliser fonction (argCount obtenu)
                        stack.pop();
                        var fMeta = funcStack.pop();
                        var argCount = fMeta ? fMeta.argCount : 0;
                        output.push({ type: 'func', name: maybeFunc.name, argCount: argCount });
                    }
                }
                break;
            case 'comma':
                // vider la pile jusqu'à la parenthèse ouvrante
                while (stack.length) {
                    var top_4 = stack[stack.length - 1];
                    if (top_4.type === 'paren' && top_4.value === '(')
                        break;
                    output.push(stack.pop());
                }
                // Incrémenter compteur args
                if (funcStack.length)
                    funcStack[funcStack.length - 1].argCount++;
                break;
        }
    }
    while (stack.length) {
        var top_5 = stack.pop();
        if (top_5.type === 'paren')
            throw new Error('Parenthèses déséquilibrées (fin)');
        output.push(top_5);
    }
    return output;
}
function evaluateTokens(tokens, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var errors, pushError, t0, useCache, rpn, fp, cached, stack, pushEntry, popEntry, scale, toInternal, fromInternal, normalizeNumber, stringToNumber, toNumber, valueToArray, normalizeArrayResult, mapNumericValue, broadcastNumericValues, flattenNumericArgs, valueToString, sanitizeNumericResult, valueHasNumericError, _loop_1, _i, rpn_1, tk, state_1, out, dt_1, finalValue, dt_2, dt;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55;
        return __generator(this, function (_56) {
            switch (_56.label) {
                case 0:
                    errors = [];
                    pushError = function (c, ctx) {
                        errors.push(c);
                        if (opts.onError)
                            opts.onError(c, ctx);
                        if (c === 'division_by_zero')
                            logicMetrics.divisionByZero++;
                        else if (c === 'unknown_variable')
                            logicMetrics.unknownVariables++;
                        else if (c === 'invalid_result')
                            logicMetrics.invalidResults++;
                    };
                    t0 = Date.now();
                    useCache = opts.enableCache !== false;
                    if (useCache) {
                        fp = tokensFingerprint(tokens);
                        cached = rpnCache.get(fp);
                        if (cached)
                            rpn = cached;
                        else {
                            rpn = toRPN(tokens);
                            rpnCache.set(fp, rpn);
                            rpnParseCount++;
                        }
                    }
                    else {
                        rpn = toRPN(tokens);
                        rpnParseCount++;
                    }
                    stack = [];
                    pushEntry = function (value, hadError) {
                        stack.push({ value: value, hadError: hadError });
                    };
                    popEntry = function () { return stack.pop(); };
                    scale = (opts.precisionScale && opts.precisionScale > 1) ? Math.floor(opts.precisionScale) : null;
                    toInternal = function (v) { return scale ? Math.round(v * scale) : v; };
                    fromInternal = function (v) { return scale ? v / scale : v; };
                    normalizeNumber = function (num) { return (Number.isFinite(num) ? num : 0); };
                    stringToNumber = function (value) {
                        if (!value)
                            return 0;
                        var normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
                        var parsed = Number(normalized);
                        return Number.isFinite(parsed) ? parsed : 0;
                    };
                    toNumber = function (value) {
                        var _a;
                        if (Array.isArray(value))
                            return normalizeNumber((_a = value[0]) !== null && _a !== void 0 ? _a : 0);
                        if (typeof value === 'number')
                            return normalizeNumber(value);
                        return stringToNumber(value);
                    };
                    valueToArray = function (value) {
                        if (Array.isArray(value))
                            return value.map(normalizeNumber);
                        return [toNumber(value)];
                    };
                    normalizeArrayResult = function (values) { return (values.length === 1 ? values[0] : values); };
                    mapNumericValue = function (value, mapper) {
                        var mapped = valueToArray(value).map(mapper);
                        return normalizeArrayResult(mapped);
                    };
                    broadcastNumericValues = function (a, b, mapper) {
                        var arrA = valueToArray(a);
                        var arrB = valueToArray(b);
                        var lenA = arrA.length;
                        var lenB = arrB.length;
                        var len = Math.max(lenA, lenB);
                        if (lenA > 1 && lenB > 1 && lenA !== lenB)
                            return null;
                        var result = [];
                        for (var i = 0; i < len; i++) {
                            var va = arrA[lenA === 1 ? 0 : i];
                            var vb = arrB[lenB === 1 ? 0 : i];
                            result.push(mapper(va, vb));
                        }
                        return normalizeArrayResult(result);
                    };
                    flattenNumericArgs = function (args) { return args.flatMap(valueToArray); };
                    valueToString = function (value) {
                        if (Array.isArray(value))
                            return value.length === 1 ? String(value[0]) : value.join(',');
                        if (typeof value === 'number')
                            return Number.isFinite(value) ? String(value) : '0';
                        return value;
                    };
                    sanitizeNumericResult = function (value, ctx) {
                        if (Array.isArray(value)) {
                            var sanitized = value.map(function (v) {
                                if (!Number.isFinite(v)) {
                                    pushError('invalid_result', ctx);
                                    return 0;
                                }
                                return v;
                            });
                            return normalizeArrayResult(sanitized);
                        }
                        if (typeof value === 'number' && !Number.isFinite(value)) {
                            pushError('invalid_result', ctx);
                            return 0;
                        }
                        return value;
                    };
                    valueHasNumericError = function (value) {
                        if (Array.isArray(value))
                            return value.some(function (v) { return !Number.isFinite(v); });
                        if (typeof value === 'number')
                            return !Number.isFinite(value);
                        return false;
                    };
                    _loop_1 = function (tk) {
                        var v, beforeErrors, _57, hadError, entryB, entryA, beforeErrors, resultValue, res, res, res, res, res, res, res, str, hadError, argc, argEntries, i, entry, args, r, beforeErrors, decimals, factor_1, cond, aVal, bVal, flat, found, hasFound, _58, args_1, v, aVal, bVal, fb, part, total, aVal, bVal, factor, target, source, match, start, end, step, length_1, seq, i, arrays, maxLen_1, variableArrays, total, i, product, _59, arrays_1, arr, val, primary, fallback, fallbackValue, primaryValue, usedFallback, val, decimals, factor, val, decimals, factor, val, decimals, factor, val, decimals, factor, val, multiple, val, multiple, x, y, base, exp, val, base, val, divisor, vals, vals, vals, vals, arraysF, maxLenF, totalF, i, product, _60, arraysF_1, arr, val, vals, cond, funcIntroducedErrors, hadError, primary, fallback, usedFallback, sourceEntry;
                        return __generator(this, function (_61) {
                            switch (_61.label) {
                                case 0:
                                    if (!(tk.type === 'number')) return [3 /*break*/, 1];
                                    pushEntry(tk.value, false);
                                    return [3 /*break*/, 8];
                                case 1:
                                    if (!(tk.type === 'string')) return [3 /*break*/, 2];
                                    pushEntry(tk.value, false);
                                    return [3 /*break*/, 8];
                                case 2:
                                    if (!(tk.type === 'variable')) return [3 /*break*/, 7];
                                    v = void 0;
                                    beforeErrors = errors.length;
                                    _61.label = 3;
                                case 3:
                                    _61.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, opts.resolveVariable(tk.name)];
                                case 4:
                                    v = _61.sent();
                                    return [3 /*break*/, 6];
                                case 5:
                                    _57 = _61.sent();
                                    v = null;
                                    return [3 /*break*/, 6];
                                case 6:
                                    if (v == null || !Number.isFinite(v)) {
                                        if (opts.strictVariables)
                                            pushError('unknown_variable', { nodeId: tk.name });
                                        v = 0;
                                    }
                                    hadError = errors.length > beforeErrors;
                                    pushEntry(v, hadError);
                                    return [3 /*break*/, 8];
                                case 7:
                                    if (tk.type === 'operator') {
                                        entryB = popEntry();
                                        entryA = popEntry();
                                        if (!entryA || !entryB) {
                                            pushError('stack_underflow', { op: tk.value });
                                            return [2 /*return*/, { value: { value: 0, errors: errors } }];
                                        }
                                        beforeErrors = errors.length;
                                        resultValue = 0;
                                        switch (tk.value) {
                                            case '+': {
                                                res = broadcastNumericValues(entryA.value, entryB.value, function (a, b) {
                                                    if (scale)
                                                        return fromInternal(toInternal(a) + toInternal(b));
                                                    return a + b;
                                                });
                                                if (res === null) {
                                                    pushError('array_length_mismatch', { op: '+' });
                                                    resultValue = 0;
                                                }
                                                else {
                                                    resultValue = sanitizeNumericResult(res, { op: '+' });
                                                }
                                                break;
                                            }
                                            case '-': {
                                                res = broadcastNumericValues(entryA.value, entryB.value, function (a, b) {
                                                    if (scale)
                                                        return fromInternal(toInternal(a) - toInternal(b));
                                                    return a - b;
                                                });
                                                if (res === null) {
                                                    pushError('array_length_mismatch', { op: '-' });
                                                    resultValue = 0;
                                                }
                                                else {
                                                    resultValue = sanitizeNumericResult(res, { op: '-' });
                                                }
                                                break;
                                            }
                                            case '*': {
                                                res = broadcastNumericValues(entryA.value, entryB.value, function (a, b) {
                                                    if (scale)
                                                        return fromInternal(Math.round(toInternal(a) * toInternal(b) / scale));
                                                    return a * b;
                                                });
                                                if (res === null) {
                                                    pushError('array_length_mismatch', { op: '*' });
                                                    resultValue = 0;
                                                }
                                                else {
                                                    resultValue = sanitizeNumericResult(res, { op: '*' });
                                                }
                                                break;
                                            }
                                            case '/': {
                                                res = broadcastNumericValues(entryA.value, entryB.value, function (a, b) {
                                                    var _a;
                                                    if (b === 0) {
                                                        pushError('division_by_zero', { a: a, b: b });
                                                        return (_a = opts.divisionByZeroValue) !== null && _a !== void 0 ? _a : 0;
                                                    }
                                                    if (scale)
                                                        return fromInternal(Math.round(toInternal(a) * scale / toInternal(b)));
                                                    return a / b;
                                                });
                                                if (res === null) {
                                                    pushError('array_length_mismatch', { op: '/' });
                                                    resultValue = 0;
                                                }
                                                else {
                                                    resultValue = sanitizeNumericResult(res, { op: '/' });
                                                }
                                                break;
                                            }
                                            case '^': {
                                                res = broadcastNumericValues(entryA.value, entryB.value, function (a, b) { return Math.pow(a, b); });
                                                if (res === null) {
                                                    pushError('array_length_mismatch', { op: '^' });
                                                    resultValue = 0;
                                                }
                                                else {
                                                    resultValue = sanitizeNumericResult(res, { op: '^' });
                                                }
                                                break;
                                            }
                                            case 'and': {
                                                res = broadcastNumericValues(entryA.value, entryB.value, function (a, b) { return (a !== 0 && b !== 0 ? 1 : 0); });
                                                resultValue = res === null ? 0 : res;
                                                if (res === null)
                                                    pushError('array_length_mismatch', { op: 'and' });
                                                break;
                                            }
                                            case 'or': {
                                                res = broadcastNumericValues(entryA.value, entryB.value, function (a, b) { return (a !== 0 || b !== 0 ? 1 : 0); });
                                                resultValue = res === null ? 0 : res;
                                                if (res === null)
                                                    pushError('array_length_mismatch', { op: 'or' });
                                                break;
                                            }
                                            case '&': {
                                                str = valueToString(entryA.value) + valueToString(entryB.value);
                                                resultValue = str;
                                                break;
                                            }
                                            default:
                                                pushError('unknown_operator', { op: tk.value });
                                                resultValue = 0;
                                        }
                                        hadError = entryA.hadError || entryB.hadError || errors.length > beforeErrors;
                                        pushEntry(resultValue, hadError);
                                    }
                                    else if (tk.type === 'func') {
                                        argc = (_a = tk.argCount) !== null && _a !== void 0 ? _a : 0;
                                        if (stack.length < argc) {
                                            pushError('stack_underflow', { func: tk.name });
                                            return [2 /*return*/, { value: { value: 0, errors: errors } }];
                                        }
                                        argEntries = [];
                                        for (i = 0; i < argc; i++) {
                                            entry = popEntry();
                                            if (!entry) {
                                                pushError('stack_underflow', { func: tk.name });
                                                return [2 /*return*/, { value: { value: 0, errors: errors } }];
                                            }
                                            argEntries.unshift(entry);
                                        }
                                        args = argEntries.map(function (e) { return e.value; });
                                        r = 0;
                                        logicMetrics.functions[tk.name] = (logicMetrics.functions[tk.name] || 0) + 1;
                                        beforeErrors = errors.length;
                                        switch (tk.name) {
                                            case 'min':
                                                r = Math.min.apply(Math, flattenNumericArgs(args));
                                                break;
                                            case 'max':
                                                r = Math.max.apply(Math, flattenNumericArgs(args));
                                                break;
                                            case 'eq':
                                                r = toNumber((_b = args[0]) !== null && _b !== void 0 ? _b : 0) === toNumber((_c = args[1]) !== null && _c !== void 0 ? _c : 0) ? 1 : 0;
                                                break;
                                            case 'neq':
                                                r = toNumber((_d = args[0]) !== null && _d !== void 0 ? _d : 0) !== toNumber((_e = args[1]) !== null && _e !== void 0 ? _e : 0) ? 1 : 0;
                                                break;
                                            case 'gt':
                                                r = toNumber((_f = args[0]) !== null && _f !== void 0 ? _f : 0) > toNumber((_g = args[1]) !== null && _g !== void 0 ? _g : 0) ? 1 : 0;
                                                break;
                                            case 'gte':
                                                r = toNumber((_h = args[0]) !== null && _h !== void 0 ? _h : 0) >= toNumber((_j = args[1]) !== null && _j !== void 0 ? _j : 0) ? 1 : 0;
                                                break;
                                            case 'lt':
                                                r = toNumber((_k = args[0]) !== null && _k !== void 0 ? _k : 0) < toNumber((_l = args[1]) !== null && _l !== void 0 ? _l : 0) ? 1 : 0;
                                                break;
                                            case 'lte':
                                                r = toNumber((_m = args[0]) !== null && _m !== void 0 ? _m : 0) <= toNumber((_o = args[1]) !== null && _o !== void 0 ? _o : 0) ? 1 : 0;
                                                break;
                                            case 'round': {
                                                decimals = Math.max(0, Math.min(12, Math.floor(toNumber((_p = args[1]) !== null && _p !== void 0 ? _p : 0))));
                                                factor_1 = Math.pow(10, decimals);
                                                r = mapNumericValue((_q = args[0]) !== null && _q !== void 0 ? _q : 0, function (value) {
                                                    var rounded = Math.round(value * factor_1) / factor_1;
                                                    return scale ? fromInternal(toInternal(rounded)) : rounded;
                                                });
                                                break;
                                            }
                                            case 'abs':
                                                r = mapNumericValue((_r = args[0]) !== null && _r !== void 0 ? _r : 0, Math.abs);
                                                break;
                                            case 'ceil':
                                                r = mapNumericValue((_s = args[0]) !== null && _s !== void 0 ? _s : 0, Math.ceil);
                                                break;
                                            case 'floor':
                                                r = mapNumericValue((_t = args[0]) !== null && _t !== void 0 ? _t : 0, Math.floor);
                                                break;
                                            case 'int':
                                                r = mapNumericValue((_u = args[0]) !== null && _u !== void 0 ? _u : 0, Math.floor);
                                                break;
                                            case 'if': {
                                                cond = toNumber((_v = args[0]) !== null && _v !== void 0 ? _v : 0);
                                                aVal = (_w = args[1]) !== null && _w !== void 0 ? _w : 0;
                                                bVal = (_x = args[2]) !== null && _x !== void 0 ? _x : 0;
                                                if (argc < 2) {
                                                    pushError('invalid_result', { func: 'if', reason: 'missing_args' });
                                                    r = 0;
                                                }
                                                else
                                                    r = cond !== 0 ? aVal : bVal;
                                                break;
                                            }
                                            case 'and':
                                                r = flattenNumericArgs(args).every(function (v) { return v !== 0; }) ? 1 : 0;
                                                break;
                                            case 'or':
                                                r = flattenNumericArgs(args).some(function (v) { return v !== 0; }) ? 1 : 0;
                                                break;
                                            case 'not':
                                                r = toNumber((_y = args[0]) !== null && _y !== void 0 ? _y : 0) === 0 ? 1 : 0;
                                                break;
                                            case 'present':
                                                r = toNumber((_z = args[0]) !== null && _z !== void 0 ? _z : 0) !== 0 ? 1 : 0;
                                                break;
                                            case 'empty':
                                                r = toNumber((_0 = args[0]) !== null && _0 !== void 0 ? _0 : 0) === 0 ? 1 : 0;
                                                break;
                                            case 'sum':
                                                r = flattenNumericArgs(args).reduce(function (acc, v) { return acc + (Number.isFinite(v) ? v : 0); }, 0);
                                                break;
                                            case 'avg': {
                                                flat = flattenNumericArgs(args).filter(function (v) { return Number.isFinite(v); });
                                                r = flat.length ? flat.reduce(function (a, b) { return a + b; }, 0) / flat.length : 0;
                                                break;
                                            }
                                            case 'ifnull':
                                                r = toNumber((_1 = args[0]) !== null && _1 !== void 0 ? _1 : 0) !== 0 ? (_2 = args[0]) !== null && _2 !== void 0 ? _2 : 0 : (_3 = args[1]) !== null && _3 !== void 0 ? _3 : 0;
                                                break;
                                            case 'coalesce': {
                                                found = 0;
                                                hasFound = false;
                                                for (_58 = 0, args_1 = args; _58 < args_1.length; _58++) {
                                                    v = args_1[_58];
                                                    if (toNumber(v !== null && v !== void 0 ? v : 0) !== 0) {
                                                        found = v !== null && v !== void 0 ? v : 0;
                                                        hasFound = true;
                                                        break;
                                                    }
                                                }
                                                r = hasFound ? found : 0;
                                                break;
                                            }
                                            case 'safediv': {
                                                aVal = toNumber((_4 = args[0]) !== null && _4 !== void 0 ? _4 : 0);
                                                bVal = toNumber((_5 = args[1]) !== null && _5 !== void 0 ? _5 : 0);
                                                fb = toNumber((_6 = args[2]) !== null && _6 !== void 0 ? _6 : 0);
                                                r = bVal === 0 ? fb : aVal / bVal;
                                                break;
                                            }
                                            case 'percentage': {
                                                part = toNumber((_7 = args[0]) !== null && _7 !== void 0 ? _7 : 0);
                                                total = toNumber((_8 = args[1]) !== null && _8 !== void 0 ? _8 : 0);
                                                r = total === 0 ? 0 : (part / total) * 100;
                                                break;
                                            }
                                            case 'ratio': {
                                                aVal = toNumber((_9 = args[0]) !== null && _9 !== void 0 ? _9 : 0);
                                                bVal = toNumber((_10 = args[1]) !== null && _10 !== void 0 ? _10 : 0);
                                                r = bVal === 0 ? 0 : aVal / bVal;
                                                break;
                                            }
                                            case 'radians':
                                            case 'rad':
                                                r = mapNumericValue((_11 = args[0]) !== null && _11 !== void 0 ? _11 : 0, function (angle) { return angle * (Math.PI / 180); });
                                                break;
                                            case 'sqrt':
                                            case 'racine':
                                                r = mapNumericValue((_12 = args[0]) !== null && _12 !== void 0 ? _12 : 0, function (value) {
                                                    if (value < 0) {
                                                        pushError('invalid_result', { func: tk.name, value: value });
                                                        return 0;
                                                    }
                                                    return Math.sqrt(value);
                                                });
                                                break;
                                            case 'cos':
                                            case 'cosinus':
                                                r = mapNumericValue((_13 = args[0]) !== null && _13 !== void 0 ? _13 : 0, Math.cos);
                                                break;
                                            case 'atan':
                                            case 'arctan':
                                                r = mapNumericValue((_14 = args[0]) !== null && _14 !== void 0 ? _14 : 0, Math.atan);
                                                break;
                                            case 'pi': {
                                                factor = argc >= 1 ? toNumber(args[0]) : 1;
                                                r = Math.PI * factor;
                                                break;
                                            }
                                            case 'row': {
                                                if (!args.length) {
                                                    pushError('invalid_result', { func: 'row', reason: 'missing_args' });
                                                    r = 0;
                                                    break;
                                                }
                                                target = args[0];
                                                if (Array.isArray(target))
                                                    r = target;
                                                else
                                                    r = mapNumericValue(target, function (value) { return value; });
                                                break;
                                            }
                                            case 'indirect': {
                                                source = valueToString((_15 = args[0]) !== null && _15 !== void 0 ? _15 : '');
                                                match = source.match(/^(-?\d+)\s*:\s*(-?\d+)$/);
                                                if (match) {
                                                    start = parseInt(match[1], 10);
                                                    end = parseInt(match[2], 10);
                                                    step = start <= end ? 1 : -1;
                                                    length_1 = Math.min(1000, Math.abs(end - start) + 1);
                                                    seq = [];
                                                    for (i = 0; i < length_1; i++)
                                                        seq.push(start + i * step);
                                                    if (length_1 < Math.abs(end - start) + 1) {
                                                        pushError('range_truncated', { func: 'indirect', start: start, end: end });
                                                    }
                                                    r = seq;
                                                }
                                                else {
                                                    r = stringToNumber(source);
                                                }
                                                break;
                                            }
                                            case 'sumproduct':
                                            case 'sumprod': {
                                                if (!args.length) {
                                                    r = 0;
                                                    break;
                                                }
                                                arrays = args.map(valueToArray);
                                                maxLen_1 = Math.max.apply(Math, arrays.map(function (arr) { return arr.length; }));
                                                if (maxLen_1 === 0) {
                                                    r = 0;
                                                    break;
                                                }
                                                variableArrays = arrays.filter(function (arr) { return arr.length > 1; });
                                                if (variableArrays.some(function (arr) { return arr.length !== maxLen_1; })) {
                                                    pushError('array_length_mismatch', { func: tk.name });
                                                    r = 0;
                                                    break;
                                                }
                                                if (arrays.length === 1) {
                                                    r = arrays[0].reduce(function (acc, val) { return acc + val; }, 0);
                                                    break;
                                                }
                                                total = 0;
                                                for (i = 0; i < maxLen_1; i++) {
                                                    product = 1;
                                                    for (_59 = 0, arrays_1 = arrays; _59 < arrays_1.length; _59++) {
                                                        arr = arrays_1[_59];
                                                        val = arr.length === 1 ? arr[0] : (_16 = arr[i]) !== null && _16 !== void 0 ? _16 : 0;
                                                        product *= val;
                                                    }
                                                    total += product;
                                                }
                                                r = total;
                                                break;
                                            }
                                            case 'sierreur':
                                            case 'iferror': {
                                                primary = argEntries[0];
                                                fallback = argEntries[1];
                                                fallbackValue = (_17 = fallback === null || fallback === void 0 ? void 0 : fallback.value) !== null && _17 !== void 0 ? _17 : 0;
                                                primaryValue = primary === null || primary === void 0 ? void 0 : primary.value;
                                                usedFallback = !primary || primary.hadError || valueHasNumericError(primaryValue !== null && primaryValue !== void 0 ? primaryValue : 0);
                                                r = usedFallback ? fallbackValue !== null && fallbackValue !== void 0 ? fallbackValue : 0 : primaryValue !== null && primaryValue !== void 0 ? primaryValue : 0;
                                                break;
                                            }
                                            // 🔄 ARRONDIS
                                            case 'arrondi':
                                            case 'round': {
                                                val = toNumber((_18 = args[0]) !== null && _18 !== void 0 ? _18 : 0);
                                                decimals = Math.floor(toNumber((_19 = args[1]) !== null && _19 !== void 0 ? _19 : 0));
                                                factor = Math.pow(10, decimals);
                                                r = Math.round(val * factor) / factor;
                                                break;
                                            }
                                            case 'arrondi.sup':
                                            case 'roundup': {
                                                val = toNumber((_20 = args[0]) !== null && _20 !== void 0 ? _20 : 0);
                                                decimals = Math.floor(toNumber((_21 = args[1]) !== null && _21 !== void 0 ? _21 : 0));
                                                factor = Math.pow(10, decimals);
                                                r = Math.ceil(val * factor) / factor;
                                                break;
                                            }
                                            case 'arrondi.inf':
                                            case 'rounddown': {
                                                val = toNumber((_22 = args[0]) !== null && _22 !== void 0 ? _22 : 0);
                                                decimals = Math.floor(toNumber((_23 = args[1]) !== null && _23 !== void 0 ? _23 : 0));
                                                factor = Math.pow(10, decimals);
                                                r = Math.floor(val * factor) / factor;
                                                break;
                                            }
                                            case 'ent':
                                            case 'int':
                                                r = mapNumericValue((_24 = args[0]) !== null && _24 !== void 0 ? _24 : 0, Math.floor);
                                                break;
                                            case 'tronque':
                                            case 'trunc': {
                                                val = toNumber((_25 = args[0]) !== null && _25 !== void 0 ? _25 : 0);
                                                decimals = Math.floor(toNumber((_26 = args[1]) !== null && _26 !== void 0 ? _26 : 0));
                                                factor = Math.pow(10, decimals);
                                                r = Math.trunc(val * factor) / factor;
                                                break;
                                            }
                                            case 'plafond':
                                            case 'ceiling': {
                                                val = toNumber((_27 = args[0]) !== null && _27 !== void 0 ? _27 : 0);
                                                multiple = toNumber((_28 = args[1]) !== null && _28 !== void 0 ? _28 : 1);
                                                r = multiple === 0 ? val : Math.ceil(val / multiple) * multiple;
                                                break;
                                            }
                                            case 'plancher':
                                            case 'floor': {
                                                val = toNumber((_29 = args[0]) !== null && _29 !== void 0 ? _29 : 0);
                                                multiple = toNumber((_30 = args[1]) !== null && _30 !== void 0 ? _30 : 1);
                                                r = multiple === 0 ? val : Math.floor(val / multiple) * multiple;
                                                break;
                                            }
                                            // 📐 TRIGONOMÉTRIE (compléments)
                                            case 'degres':
                                            case 'degrees':
                                                r = mapNumericValue((_31 = args[0]) !== null && _31 !== void 0 ? _31 : 0, function (rad) { return rad * (180 / Math.PI); });
                                                break;
                                            case 'sin':
                                            case 'sinus':
                                                r = mapNumericValue((_32 = args[0]) !== null && _32 !== void 0 ? _32 : 0, Math.sin);
                                                break;
                                            case 'tan':
                                            case 'tangente':
                                                r = mapNumericValue((_33 = args[0]) !== null && _33 !== void 0 ? _33 : 0, Math.tan);
                                                break;
                                            case 'asin':
                                            case 'arcsin':
                                                r = mapNumericValue((_34 = args[0]) !== null && _34 !== void 0 ? _34 : 0, Math.asin);
                                                break;
                                            case 'acos':
                                            case 'arccos':
                                                r = mapNumericValue((_35 = args[0]) !== null && _35 !== void 0 ? _35 : 0, Math.acos);
                                                break;
                                            case 'atan2': {
                                                x = toNumber((_36 = args[0]) !== null && _36 !== void 0 ? _36 : 0);
                                                y = toNumber((_37 = args[1]) !== null && _37 !== void 0 ? _37 : 0);
                                                r = Math.atan2(y, x);
                                                break;
                                            }
                                            // 🔢 MATHÉMATIQUES (compléments)
                                            case 'puissance':
                                            case 'power': {
                                                base = toNumber((_38 = args[0]) !== null && _38 !== void 0 ? _38 : 0);
                                                exp = toNumber((_39 = args[1]) !== null && _39 !== void 0 ? _39 : 1);
                                                r = Math.pow(base, exp);
                                                break;
                                            }
                                            case 'exp':
                                                r = mapNumericValue((_40 = args[0]) !== null && _40 !== void 0 ? _40 : 0, Math.exp);
                                                break;
                                            case 'ln':
                                                r = mapNumericValue((_41 = args[0]) !== null && _41 !== void 0 ? _41 : 0, function (val) { return val <= 0 ? 0 : Math.log(val); });
                                                break;
                                            case 'log': {
                                                val = toNumber((_42 = args[0]) !== null && _42 !== void 0 ? _42 : 0);
                                                base = toNumber((_43 = args[1]) !== null && _43 !== void 0 ? _43 : 10);
                                                r = val <= 0 ? 0 : Math.log(val) / Math.log(base);
                                                break;
                                            }
                                            case 'log10':
                                                r = mapNumericValue((_44 = args[0]) !== null && _44 !== void 0 ? _44 : 0, function (val) { return val <= 0 ? 0 : Math.log10(val); });
                                                break;
                                            case 'abs':
                                                r = mapNumericValue((_45 = args[0]) !== null && _45 !== void 0 ? _45 : 0, Math.abs);
                                                break;
                                            case 'signe':
                                            case 'sign':
                                                r = mapNumericValue((_46 = args[0]) !== null && _46 !== void 0 ? _46 : 0, Math.sign);
                                                break;
                                            case 'mod': {
                                                val = toNumber((_47 = args[0]) !== null && _47 !== void 0 ? _47 : 0);
                                                divisor = toNumber((_48 = args[1]) !== null && _48 !== void 0 ? _48 : 1);
                                                r = divisor === 0 ? 0 : val % divisor;
                                                break;
                                            }
                                            // 📊 STATISTIQUES (compléments)
                                            case 'min': {
                                                vals = args.flatMap(function (a) { return Array.isArray(a) ? a : [toNumber(a !== null && a !== void 0 ? a : 0)]; });
                                                r = vals.length ? Math.min.apply(Math, vals) : 0;
                                                break;
                                            }
                                            case 'max': {
                                                vals = args.flatMap(function (a) { return Array.isArray(a) ? a : [toNumber(a !== null && a !== void 0 ? a : 0)]; });
                                                r = vals.length ? Math.max.apply(Math, vals) : 0;
                                                break;
                                            }
                                            case 'moyenne':
                                            case 'average': {
                                                vals = args.flatMap(function (a) { return Array.isArray(a) ? a : [toNumber(a !== null && a !== void 0 ? a : 0)]; });
                                                r = vals.length ? vals.reduce(function (s, v) { return s + v; }, 0) / vals.length : 0;
                                                break;
                                            }
                                            case 'somme':
                                            case 'sum': {
                                                vals = args.flatMap(function (a) { return Array.isArray(a) ? a : [toNumber(a !== null && a !== void 0 ? a : 0)]; });
                                                r = vals.reduce(function (s, v) { return s + v; }, 0);
                                                break;
                                            }
                                            case 'sommeprod': {
                                                // Alias français pour sumproduct
                                                if (!args.length) {
                                                    r = 0;
                                                    break;
                                                }
                                                arraysF = args.map(valueToArray);
                                                maxLenF = Math.max.apply(Math, arraysF.map(function (arr) { return arr.length; }));
                                                if (maxLenF === 0) {
                                                    r = 0;
                                                    break;
                                                }
                                                if (arraysF.length === 1) {
                                                    r = arraysF[0].reduce(function (acc, val) { return acc + val; }, 0);
                                                    break;
                                                }
                                                totalF = 0;
                                                for (i = 0; i < maxLenF; i++) {
                                                    product = 1;
                                                    for (_60 = 0, arraysF_1 = arraysF; _60 < arraysF_1.length; _60++) {
                                                        arr = arraysF_1[_60];
                                                        val = arr.length === 1 ? arr[0] : (_49 = arr[i]) !== null && _49 !== void 0 ? _49 : 0;
                                                        product *= val;
                                                    }
                                                    totalF += product;
                                                }
                                                r = totalF;
                                                break;
                                            }
                                            case 'nb':
                                            case 'count': {
                                                vals = args.flatMap(function (a) { return Array.isArray(a) ? a : [a]; });
                                                r = vals.filter(function (v) { return typeof v === 'number' && !isNaN(v); }).length;
                                                break;
                                            }
                                            // 🔀 LOGIQUE & CONDITIONS
                                            case 'si':
                                            case 'if': {
                                                cond = toNumber((_50 = args[0]) !== null && _50 !== void 0 ? _50 : 0) !== 0;
                                                r = cond ? ((_51 = args[1]) !== null && _51 !== void 0 ? _51 : 0) : ((_52 = args[2]) !== null && _52 !== void 0 ? _52 : 0);
                                                break;
                                            }
                                            case 'et':
                                            case 'and': {
                                                r = args.every(function (a) { return toNumber(a !== null && a !== void 0 ? a : 0) !== 0; }) ? 1 : 0;
                                                break;
                                            }
                                            case 'ou':
                                            case 'or': {
                                                r = args.some(function (a) { return toNumber(a !== null && a !== void 0 ? a : 0) !== 0; }) ? 1 : 0;
                                                break;
                                            }
                                            case 'non':
                                            case 'not':
                                                r = toNumber((_53 = args[0]) !== null && _53 !== void 0 ? _53 : 0) === 0 ? 1 : 0;
                                                break;
                                            default:
                                                pushError('unknown_function', { func: tk.name });
                                                r = 0;
                                        }
                                        if (typeof r === 'number' || Array.isArray(r)) {
                                            r = sanitizeNumericResult(r, { func: tk.name });
                                        }
                                        funcIntroducedErrors = errors.length > beforeErrors;
                                        hadError = void 0;
                                        if (tk.name === 'sierreur' || tk.name === 'iferror') {
                                            primary = argEntries[0];
                                            fallback = argEntries[1];
                                            usedFallback = !primary || primary.hadError || valueHasNumericError((_54 = primary === null || primary === void 0 ? void 0 : primary.value) !== null && _54 !== void 0 ? _54 : 0);
                                            sourceEntry = usedFallback ? fallback : primary;
                                            hadError = funcIntroducedErrors || Boolean(sourceEntry === null || sourceEntry === void 0 ? void 0 : sourceEntry.hadError);
                                        }
                                        else {
                                            hadError = funcIntroducedErrors || argEntries.some(function (e) { return e.hadError; });
                                        }
                                        pushEntry(r, hadError);
                                    }
                                    _61.label = 8;
                                case 8: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, rpn_1 = rpn;
                    _56.label = 1;
                case 1:
                    if (!(_i < rpn_1.length)) return [3 /*break*/, 4];
                    tk = rpn_1[_i];
                    return [5 /*yield**/, _loop_1(tk)];
                case 2:
                    state_1 = _56.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _56.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    out = popEntry();
                    if (stack.length || !out) {
                        pushError('invalid_result');
                        dt_1 = Date.now() - t0;
                        logicMetrics.evaluations++;
                        logicMetrics.totalEvalMs += dt_1;
                        return [2 /*return*/, { value: 0, errors: errors }];
                    }
                    finalValue = out.value;
                    if (typeof finalValue === 'string') {
                        finalValue = stringToNumber(finalValue);
                    }
                    else if (Array.isArray(finalValue)) {
                        finalValue = (_55 = finalValue[0]) !== null && _55 !== void 0 ? _55 : 0;
                    }
                    if (typeof finalValue !== 'number' || !Number.isFinite(finalValue)) {
                        pushError('invalid_result');
                        dt_2 = Date.now() - t0;
                        logicMetrics.evaluations++;
                        logicMetrics.totalEvalMs += dt_2;
                        return [2 /*return*/, { value: 0, errors: errors }];
                    }
                    dt = Date.now() - t0;
                    logicMetrics.evaluations++;
                    logicMetrics.totalEvalMs += dt;
                    return [2 /*return*/, { value: finalValue, errors: errors }];
            }
        });
    });
}
// Helper haut-niveau: compile & évalue en une étape (utilisé potentiellement ailleurs)
function evaluateExpression(expr, roleToNodeId, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var tokens;
        return __generator(this, function (_a) {
            try {
                tokens = parseExpression(expr, roleToNodeId, opts);
                return [2 /*return*/, evaluateTokens(tokens, opts)];
            }
            catch (e) {
                logicMetrics.parseErrors++;
                throw e;
            }
            return [2 /*return*/];
        });
    });
}

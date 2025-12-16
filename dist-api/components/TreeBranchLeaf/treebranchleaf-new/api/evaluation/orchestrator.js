"use strict";
// Orchestrateur d'évaluation TBL – v1
// Focalisé sur la résolution améliorée des variables pour les formules.
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
exports.evaluateFormulaOrchestrated = evaluateFormulaOrchestrated;
var normalize = function (s) { return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); };
var isNumericLike = function (v) {
    if (v == null || v === '')
        return false;
    var str = String(v).trim().replace(/\s+/g, '').replace(/,/g, '.');
    return str !== '' && !isNaN(Number(str));
};
var toNumber = function (v) {
    if (!isNumericLike(v))
        return 0;
    var n = parseFloat(String(v).replace(/\s+/g, '').replace(/,/g, '.'));
    return isNaN(n) ? 0 : n;
};
function evaluateFormulaOrchestrated(opts) {
    var _a;
    var trace = [];
    var fieldValues = opts.fieldValues, tokens = opts.tokens, variableMap = opts.variableMap, rawExpression = opts.rawExpression, hasOperatorsOverride = opts.hasOperatorsOverride;
    var tokenVariables = tokens.filter(function (t) { return t.type === 'variable' && t.name; }).map(function (t) { return t.name; });
    trace.push({ step: 'extract_token_variables', output: tokenVariables });
    var operatorsDetected = hasOperatorsOverride !== null && hasOperatorsOverride !== void 0 ? hasOperatorsOverride : (rawExpression ? /[+\-*/]/.test(rawExpression) : tokens.some(function (t) { return t.type === 'operator'; }));
    trace.push({ step: 'detect_operators', output: operatorsDetected, meta: { rawExpression: rawExpression } });
    // Mirroirs
    var mirrors = Object.entries(fieldValues).filter(function (_a) {
        var k = _a[0];
        return k.startsWith('__mirror_data_');
    });
    var mirrorsByNorm = {};
    for (var _i = 0, mirrors_1 = mirrors; _i < mirrors_1.length; _i++) {
        var _b = mirrors_1[_i], k = _b[0], v = _b[1];
        var norm = normalize(k.replace(/^__mirror_data_/, ''));
        mirrorsByNorm[norm] = mirrorsByNorm[norm] || [];
        mirrorsByNorm[norm].push({ key: k, value: v });
    }
    trace.push({ step: 'collect_mirrors', output: Object.keys(mirrorsByNorm) });
    var resolvedVariables = {};
    var pickBest = function (cands) {
        var scored = cands.filter(function (c) { return isNumericLike(c.value); }).map(function (c) { return (__assign(__assign({}, c), { num: toNumber(c.value), len: String(c.value).length })); }).sort(function (a, b) { return b.len - a.len; });
        if (scored.length === 0)
            return { value: 0, source: 'none' };
        return { value: scored[0].num, source: scored[0].source };
    };
    var _loop_1 = function (varName) {
        var varTrace = { step: 'resolve_variable', input: varName, meta: {} };
        var candidates = [];
        if (variableMap && variableMap[varName]) {
            candidates.push({ value: (_a = variableMap[varName].numeric) !== null && _a !== void 0 ? _a : variableMap[varName].raw, source: 'variableMap' });
            varTrace.meta.variableMap = true;
        }
        if (fieldValues[varName] != null)
            candidates.push({ value: fieldValues[varName], source: 'direct' });
        var suffixKey = "".concat(varName, "_field");
        if (fieldValues[suffixKey] != null)
            candidates.push({ value: fieldValues[suffixKey], source: '_field_suffix' });
        // Contains pattern
        Object.entries(fieldValues).forEach(function (_a) {
            var k = _a[0], v = _a[1];
            if (k !== varName && k !== suffixKey && k.includes(varName) && v != null) {
                candidates.push({ value: v, source: 'contains_pattern' });
            }
        });
        var norm = normalize(varName);
        if (mirrorsByNorm[norm]) {
            mirrorsByNorm[norm].forEach(function (m) { return candidates.push({ value: m.value, source: 'mirror' }); });
            varTrace.meta.mirrorMatched = true;
        }
        // Generic fallback (legacy)
        if (!candidates.some(function (c) { return c.source === '_field_suffix'; })) {
            var anyField = Object.keys(fieldValues).find(function (k) { return k.endsWith('_field') && fieldValues[k] != null && fieldValues[k] !== ''; });
            if (anyField)
                candidates.push({ value: fieldValues[anyField], source: 'generic_field_fallback' });
        }
        var chosen = pickBest(candidates);
        resolvedVariables[varName] = chosen.value;
        varTrace.output = chosen.value;
        varTrace.meta.candidates = candidates.slice(0, 6).map(function (c) { return ({ source: c.source, sample: String(c.value).slice(0, 20) }); });
        varTrace.meta.chosenSource = chosen.source;
        trace.push(varTrace);
    };
    for (var _c = 0, tokenVariables_1 = tokenVariables; _c < tokenVariables_1.length; _c++) {
        var varName = tokenVariables_1[_c];
        _loop_1(varName);
    }
    var strategy = 'FULL_CALCULATION';
    if (!operatorsDetected) {
        var nonZero = Object.values(resolvedVariables).filter(function (v) { return v !== 0; });
        if (nonZero.length === 1 && tokenVariables.length === 1)
            strategy = 'DIRECT_VALUE';
    }
    trace.push({ step: 'select_strategy', output: strategy });
    return { resolvedVariables: resolvedVariables, strategy: strategy, operatorsDetected: operatorsDetected, trace: trace };
}

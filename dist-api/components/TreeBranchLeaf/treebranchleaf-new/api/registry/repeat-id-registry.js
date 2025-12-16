"use strict";
/*
 * Repeat ID Registry
 * -------------------
 * Central place to track which IDs (variables, capacities, totals) are produced when
 * templates/repeaters duplicate nodes. For now it simply stores metadata in memory so
 * existing routes can start reporting events without changing the DB layer. Later this
 * registry will drive blueprint generation for the repeat button.
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
exports.registerVariable = registerVariable;
exports.registerCapacityLink = registerCapacityLink;
exports.recordTotalFieldConfig = recordTotalFieldConfig;
exports.captureRepeatTemplate = captureRepeatTemplate;
exports.instantiateRepeatBlueprint = instantiateRepeatBlueprint;
exports.resetRepeatRegistry = resetRepeatRegistry;
var DEFAULT_SCOPE = 'global';
var registryStore = new Map();
function resolveScopeId(ctx) {
    return ((ctx === null || ctx === void 0 ? void 0 : ctx.scopeId) ||
        (ctx === null || ctx === void 0 ? void 0 : ctx.repeaterNodeId) ||
        (ctx === null || ctx === void 0 ? void 0 : ctx.templateNodeId) ||
        (ctx === null || ctx === void 0 ? void 0 : ctx.duplicatedFromNodeId) ||
        DEFAULT_SCOPE);
}
function resolveRegistryScopes(ctx) {
    var scopes = new Set();
    var primary = resolveScopeId(ctx);
    if (primary) {
        scopes.add(primary);
    }
    if (ctx === null || ctx === void 0 ? void 0 : ctx.repeaterNodeId) {
        scopes.add(ctx.repeaterNodeId);
    }
    return Array.from(scopes);
}
function appendVariableRecord(scopeId, input) {
    var record = getRecord(scopeId);
    record.variables.push(__assign(__assign({}, input), { copyContext: __assign(__assign({}, input.copyContext), { scopeId: scopeId }) }));
    record.lastUpdatedAt = new Date().toISOString();
}
function appendCapacityRecord(scopeId, input) {
    var record = getRecord(scopeId);
    record.capacities.push(__assign(__assign({}, input), { copyContext: __assign(__assign({}, input.copyContext), { scopeId: scopeId }) }));
    record.lastUpdatedAt = new Date().toISOString();
}
function getRecord(scopeId) {
    var existing = registryStore.get(scopeId);
    if (existing) {
        return existing;
    }
    var fresh = {
        variables: [],
        capacities: [],
        lastUpdatedAt: new Date().toISOString()
    };
    registryStore.set(scopeId, fresh);
    return fresh;
}
function registerVariable(input) {
    if (!(input === null || input === void 0 ? void 0 : input.nodeId) || !(input === null || input === void 0 ? void 0 : input.variableId)) {
        return;
    }
    var scopeIds = resolveRegistryScopes(input.copyContext);
    scopeIds.forEach(function (scopeId) { return appendVariableRecord(scopeId, input); });
}
function registerCapacityLink(input) {
    if (!(input === null || input === void 0 ? void 0 : input.ownerNodeId) || !(input === null || input === void 0 ? void 0 : input.capacityId)) {
        return;
    }
    var scopeIds = resolveRegistryScopes(input.copyContext);
    scopeIds.forEach(function (scopeId) { return appendCapacityRecord(scopeId, input); });
}
function recordTotalFieldConfig(config) {
    if (!(config === null || config === void 0 ? void 0 : config.repeaterNodeId)) {
        return;
    }
    var scopeId = config.repeaterNodeId;
    var record = getRecord(scopeId);
    record.totalField = __assign({}, config);
    record.lastUpdatedAt = new Date().toISOString();
}
function captureRepeatTemplate(repeaterNodeId) {
    if (!repeaterNodeId) {
        return null;
    }
    var record = registryStore.get(repeaterNodeId);
    if (!record) {
        return null;
    }
    return {
        scopeId: repeaterNodeId,
        variables: __spreadArray([], record.variables, true),
        capacities: __spreadArray([], record.capacities, true),
        totalField: record.totalField ? __assign({}, record.totalField) : undefined,
        capturedAt: new Date().toISOString(),
        lastUpdatedAt: record.lastUpdatedAt
    };
}
function instantiateRepeatBlueprint(repeaterNodeId, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var blueprint = captureRepeatTemplate(repeaterNodeId);
    if (!blueprint) {
        return null;
    }
    var scopeId = options.scopeId || "".concat(repeaterNodeId, ":").concat((_a = options.suffix) !== null && _a !== void 0 ? _a : '').replace(/:+$/, '') || repeaterNodeId;
    var instantiated = __assign(__assign({}, blueprint), { scopeId: scopeId, capturedAt: blueprint.capturedAt, lastUpdatedAt: new Date().toISOString() });
    registryStore.set(scopeId, {
        variables: __spreadArray([], instantiated.variables, true),
        capacities: __spreadArray([], instantiated.capacities, true),
        totalField: instantiated.totalField,
        lastUpdatedAt: instantiated.lastUpdatedAt
    });
    return instantiated;
}
function resetRepeatRegistry(scopeId) {
    if (scopeId) {
        registryStore.delete(scopeId);
        return;
    }
    registryStore.clear();
}

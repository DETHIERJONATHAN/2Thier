"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveRepeatContextFromMetadata = deriveRepeatContextFromMetadata;
var toRecord = function (metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {};
    }
    return metadata;
};
var pickString = function (value) {
    return typeof value === 'string' && value.trim().length ? value : undefined;
};
var pickNumericLike = function (value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim().length) {
        return value;
    }
    return undefined;
};
function deriveRepeatContextFromMetadata(carrier, fallback) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (fallback === void 0) { fallback = {}; }
    var meta = toRecord(carrier.metadata);
    var repeaterNodeId = (_a = pickString(meta.duplicatedFromRepeater)) !== null && _a !== void 0 ? _a : fallback.repeaterNodeId;
    var templateNodeId = (_b = pickString(meta.sourceTemplateId)) !== null && _b !== void 0 ? _b : fallback.templateNodeId;
    var duplicatedFromNodeId = (_e = (_d = (_c = pickString(meta.copiedFromNodeId)) !== null && _c !== void 0 ? _c : templateNodeId) !== null && _d !== void 0 ? _d : fallback.templateNodeId) !== null && _e !== void 0 ? _e : carrier.id;
    var scopeId = (_h = (_g = (_f = pickString(meta.repeatScopeId)) !== null && _f !== void 0 ? _f : pickString(meta.repeaterScopeId)) !== null && _g !== void 0 ? _g : fallback.scopeId) !== null && _h !== void 0 ? _h : repeaterNodeId;
    var suffix = (_l = (_k = (_j = pickNumericLike(meta.copySuffix)) !== null && _j !== void 0 ? _j : pickNumericLike(meta.suffixNum)) !== null && _k !== void 0 ? _k : pickNumericLike(meta.suffix)) !== null && _l !== void 0 ? _l : fallback.suffix;
    if (!repeaterNodeId && !scopeId) {
        return undefined;
    }
    return {
        repeaterNodeId: repeaterNodeId,
        templateNodeId: templateNodeId !== null && templateNodeId !== void 0 ? templateNodeId : carrier.id,
        duplicatedFromNodeId: duplicatedFromNodeId,
        scopeId: scopeId,
        suffix: suffix,
        mode: 'repeater'
    };
}

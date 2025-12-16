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
exports.isRealNodeRef = void 0;
exports.getAuthCtx = getAuthCtx;
exports.normalizeRefId = normalizeRefId;
exports.extractNodeIdsFromConditionSet = extractNodeIdsFromConditionSet;
exports.extractNodeIdsFromTokens = extractNodeIdsFromTokens;
exports.getNodeLinkedField = getNodeLinkedField;
exports.setNodeLinkedField = setNodeLinkedField;
exports.addToNodeLinkedField = addToNodeLinkedField;
exports.removeFromNodeLinkedField = removeFromNodeLinkedField;
exports.buildResponseFromColumns = buildResponseFromColumns;
function getAuthCtx(req) {
    var _a, _b, _c;
    var user = (req && req.user) || {};
    var headerOrg = ((_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a['x-organization-id'])
        || ((_b = req === null || req === void 0 ? void 0 : req.headers) === null || _b === void 0 ? void 0 : _b['x-organization'])
        || ((_c = req === null || req === void 0 ? void 0 : req.headers) === null || _c === void 0 ? void 0 : _c['organization-id']);
    var role = user.role || user.userRole;
    var isSuperAdmin = Boolean(user.isSuperAdmin || role === 'super_admin' || role === 'superadmin');
    var organizationId = user.organizationId || headerOrg || null;
    return { organizationId: organizationId, isSuperAdmin: isSuperAdmin };
}
var uniq = function (arr) { return Array.from(new Set(arr)); };
var uuidLikeRef = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var isRealNodeRef = function (ref) {
    if (!ref)
        return false;
    return uuidLikeRef.test(ref) || ref.startsWith('node_') || ref.startsWith('shared-ref-');
};
exports.isRealNodeRef = isRealNodeRef;
function normalizeRefId(ref) {
    if (!ref)
        return ref;
    if (ref.startsWith('node-formula:'))
        return ref.replace(/^node-formula:/, '');
    return ref;
}
function extractNodeIdsFromConditionSet(conditionSet) {
    var ids = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return ids;
    var obj = conditionSet;
    if (Array.isArray(obj.tokens)) {
        for (var _i = 0, _a = obj.tokens; _i < _a.length; _i++) {
            var t = _a[_i];
            var asStr = typeof t === 'string' ? t : JSON.stringify(t);
            var re = /@value\.([a-f0-9-]{36})/gi;
            var m = void 0;
            while ((m = re.exec(asStr)) !== null) {
                ids.add(m[1]);
            }
        }
    }
    if (Array.isArray(obj.branches)) {
        var _loop_1 = function (br) {
            var b = br;
            var when = b.when;
            var scanWhen = function (node) {
                if (!node)
                    return;
                var ref = node.ref;
                if (typeof ref === 'string') {
                    var m = /@value\.([a-f0-9-]{36})/i.exec(ref);
                    if (m && m[1])
                        ids.add(m[1]);
                }
                if (node.left && typeof node.left === 'object')
                    scanWhen(node.left);
                if (node.right && typeof node.right === 'object')
                    scanWhen(node.right);
            };
            scanWhen(when);
            var actions = b.actions;
            if (Array.isArray(actions)) {
                for (var _f = 0, actions_2 = actions; _f < actions_2.length; _f++) {
                    var a = actions_2[_f];
                    var aa = a;
                    var nodeIds = aa.nodeIds;
                    if (Array.isArray(nodeIds)) {
                        for (var _g = 0, nodeIds_2 = nodeIds; _g < nodeIds_2.length; _g++) {
                            var nid = nodeIds_2[_g];
                            ids.add(normalizeRefId(nid));
                        }
                    }
                }
            }
        };
        for (var _b = 0, _c = obj.branches; _b < _c.length; _b++) {
            var br = _c[_b];
            _loop_1(br);
        }
    }
    if (obj.fallback && typeof obj.fallback === 'object') {
        var fb = obj.fallback;
        var actions = fb.actions;
        if (Array.isArray(actions)) {
            for (var _d = 0, actions_1 = actions; _d < actions_1.length; _d++) {
                var a = actions_1[_d];
                var aa = a;
                var nodeIds = aa.nodeIds;
                if (Array.isArray(nodeIds)) {
                    for (var _e = 0, nodeIds_1 = nodeIds; _e < nodeIds_1.length; _e++) {
                        var nid = nodeIds_1[_e];
                        ids.add(normalizeRefId(nid));
                    }
                }
            }
        }
    }
    var str = JSON.stringify(obj);
    if (str) {
        var re = /@value\.([a-f0-9-]{36})/gi;
        var m = void 0;
        while ((m = re.exec(str)) !== null)
            ids.add(m[1]);
    }
    return ids;
}
function extractNodeIdsFromTokens(tokens) {
    var ids = new Set();
    if (!tokens)
        return ids;
    var addFromString = function (s) {
        var m;
        var re = /@value\.([A-Za-z0-9_:-]+)/gi;
        while ((m = re.exec(s)) !== null)
            ids.add(m[1]);
    };
    if (Array.isArray(tokens)) {
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var t = tokens_1[_i];
            if (typeof t === 'string')
                addFromString(t);
            else
                addFromString(JSON.stringify(t));
        }
    }
    else if (typeof tokens === 'string') {
        addFromString(tokens);
    }
    else {
        addFromString(JSON.stringify(tokens));
    }
    return ids;
}
function getNodeLinkedField(client, nodeId, field) {
    return __awaiter(this, void 0, void 0, function () {
        var node;
        var _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, client.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        select: (_a = {}, _a[field] = true, _a)
                    })];
                case 1:
                    node = _c.sent();
                    return [2 /*return*/, ((_b = node === null || node === void 0 ? void 0 : node[field]) !== null && _b !== void 0 ? _b : [])];
            }
        });
    });
}
function setNodeLinkedField(client, nodeId, field, values) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, client.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: (_a = {}, _a[field] = { set: uniq(values) }, _a)
                        })];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _b.sent();
                    console.warn('[TreeBranchLeaf API] setNodeLinkedField skipped:', { nodeId: nodeId, field: field, error: e_1.message });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function addToNodeLinkedField(client, nodeId, field, idsToAdd) {
    return __awaiter(this, void 0, void 0, function () {
        var sanitized, current, next;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sanitized = (_a = idsToAdd === null || idsToAdd === void 0 ? void 0 : idsToAdd.filter(function (id) { return id && (0, exports.isRealNodeRef)(id); })) !== null && _a !== void 0 ? _a : [];
                    if (!sanitized.length)
                        return [2 /*return*/];
                    return [4 /*yield*/, getNodeLinkedField(client, nodeId, field)];
                case 1:
                    current = _b.sent();
                    next = uniq(__spreadArray(__spreadArray([], current, true), sanitized, true));
                    return [4 /*yield*/, setNodeLinkedField(client, nodeId, field, next)];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function removeFromNodeLinkedField(client, nodeId, field, idsToRemove) {
    return __awaiter(this, void 0, void 0, function () {
        var sanitized, current, toRemove, next;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    sanitized = (_a = idsToRemove === null || idsToRemove === void 0 ? void 0 : idsToRemove.filter(function (id) { return id && (0, exports.isRealNodeRef)(id); })) !== null && _a !== void 0 ? _a : [];
                    if (!sanitized.length)
                        return [2 /*return*/];
                    return [4 /*yield*/, getNodeLinkedField(client, nodeId, field)];
                case 1:
                    current = _b.sent();
                    toRemove = new Set(sanitized);
                    next = current.filter(function (id) { return !toRemove.has(id); });
                    return [4 /*yield*/, setNodeLinkedField(client, nodeId, field, next)];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function buildResponseFromColumns(node) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    var appearance = {
        size: node.appearance_size || 'md',
        width: node.appearance_width || null,
        variant: node.appearance_variant || null,
        helpTooltipType: node.text_helpTooltipType || 'none',
        helpTooltipText: node.text_helpTooltipText || null,
        helpTooltipImage: node.text_helpTooltipImage || null
    };
    var legacyRepeater = (function () {
        if (node.metadata && typeof node.metadata === 'object' && node.metadata.repeater) {
            var legacy = node.metadata.repeater;
            return typeof legacy === 'object' && legacy !== null ? legacy : null;
        }
        return null;
    })();
    var repeater = {
        templateNodeIds: (function () {
            if (node.repeater_templateNodeIds) {
                try {
                    var parsed = JSON.parse(node.repeater_templateNodeIds);
                    console.log('✅ [buildResponseFromColumns] repeater_templateNodeIds reconstruit:', parsed);
                    return Array.isArray(parsed) ? parsed : [];
                }
                catch (e) {
                    console.error('❌ [buildResponseFromColumns] Erreur parse repeater_templateNodeIds:', e);
                    return [];
                }
            }
            var legacyIds = legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.templateNodeIds;
            if (Array.isArray(legacyIds)) {
                return legacyIds;
            }
            return [];
        })(),
        templateNodeLabels: (function () {
            if (node.repeater_templateNodeLabels) {
                try {
                    var parsedLabels = JSON.parse(node.repeater_templateNodeLabels);
                    return parsedLabels && typeof parsedLabels === 'object' ? parsedLabels : null;
                }
                catch (e) {
                    console.error('❌ [buildResponseFromColumns] Erreur parse repeater_templateNodeLabels:', e);
                }
            }
            var legacyLabels = legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.templateNodeLabels;
            if (legacyLabels && typeof legacyLabels === 'object') {
                return legacyLabels;
            }
            return null;
        })(),
        minItems: (_b = (_a = node.repeater_minItems) !== null && _a !== void 0 ? _a : legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.minItems) !== null && _b !== void 0 ? _b : 0,
        maxItems: (_d = (_c = node.repeater_maxItems) !== null && _c !== void 0 ? _c : legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.maxItems) !== null && _d !== void 0 ? _d : null,
        addButtonLabel: node.repeater_addButtonLabel || (legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.addButtonLabel) || null,
        buttonSize: node.repeater_buttonSize || (legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.buttonSize) || 'middle',
        buttonWidth: node.repeater_buttonWidth || (legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.buttonWidth) || 'auto',
        iconOnly: (_f = (_e = node.repeater_iconOnly) !== null && _e !== void 0 ? _e : legacyRepeater === null || legacyRepeater === void 0 ? void 0 : legacyRepeater.iconOnly) !== null && _f !== void 0 ? _f : false
    };
    var appearanceConfig = {
        size: node.appearance_size || 'md',
        variant: node.appearance_variant || 'singleline',
        placeholder: node.text_placeholder || '',
        maxLength: node.text_maxLength || 255,
        mask: node.text_mask || '',
        regex: node.text_regex || '',
        helpTooltipType: node.text_helpTooltipType || 'none',
        helpTooltipText: node.text_helpTooltipText || null,
        helpTooltipImage: node.text_helpTooltipImage || null
    };
    var fieldConfig = {
        text: {
            placeholder: node.text_placeholder || null,
            maxLength: node.text_maxLength || null,
            minLength: node.text_minLength || null,
            mask: node.text_mask || null,
            regex: node.text_regex || null,
            rows: node.text_rows || 3
        },
        number: {
            min: node.number_min || null,
            max: node.number_max || null,
            step: node.number_step || 1,
            // 🔧 FIX: Priorité à data_precision pour les champs d'affichage (cartes bleues), sinon number_decimals
            decimals: (_h = (_g = node.data_precision) !== null && _g !== void 0 ? _g : node.number_decimals) !== null && _h !== void 0 ? _h : 0,
            prefix: node.number_prefix || null,
            suffix: node.number_suffix || null,
            unit: (_k = (_j = node.number_unit) !== null && _j !== void 0 ? _j : node.data_unit) !== null && _k !== void 0 ? _k : null,
            defaultValue: node.number_defaultValue || null
        },
        select: {
            multiple: node.select_multiple || false,
            searchable: node.select_searchable !== false,
            allowClear: node.select_allowClear !== false,
            defaultValue: node.select_defaultValue || null,
            options: node.select_options || []
        },
        bool: {
            trueLabel: node.bool_trueLabel || null,
            falseLabel: node.bool_falseLabel || null,
            defaultValue: node.bool_defaultValue || null
        },
        date: {
            format: node.date_format || 'DD/MM/YYYY',
            showTime: node.date_showTime || false,
            minDate: node.date_minDate || null,
            maxDate: node.date_maxDate || null
        },
        image: {
            maxSize: node.image_maxSize || null,
            ratio: node.image_ratio || null,
            crop: node.image_crop || false,
            thumbnails: node.image_thumbnails || null
        }
    };
    Object.keys(fieldConfig).forEach(function (key) {
        var config = fieldConfig[key];
        var hasValues = Object.values(config).some(function (val) { return val !== null && val !== undefined && val !== false && val !== 0 && val !== ''; });
        if (!hasValues)
            delete fieldConfig[key];
    });
    var cleanedMetadata = __assign(__assign({}, (node.metadata || {})), { appearance: appearance });
    if (node.subtabs) {
        try {
            var parsed = JSON.parse(node.subtabs);
            if (Array.isArray(parsed)) {
                cleanedMetadata.subTabs = parsed;
                console.log('📝 [buildResponseFromColumns] Reconstruit subTabs depuis colonne subtabs:', parsed);
            }
        }
        catch (_w) {
            // noop
        }
    }
    if (node.subtab !== undefined && node.subtab !== null) {
        var rawSubTab = node.subtab;
        var parsedSubTab = rawSubTab;
        if (typeof rawSubTab === 'string') {
            var trimmed = rawSubTab.trim();
            if (trimmed.startsWith('[')) {
                try {
                    var candidate = JSON.parse(trimmed);
                    if (Array.isArray(candidate)) {
                        parsedSubTab = candidate;
                    }
                }
                catch (_x) {
                    parsedSubTab = rawSubTab;
                }
            }
            else if (trimmed.includes(',')) {
                parsedSubTab = trimmed.split(',').map(function (part) { return part.trim(); }).filter(Boolean);
            }
            else {
                parsedSubTab = trimmed;
            }
        }
        try {
            cleanedMetadata.subTab = parsedSubTab;
            console.log('📝 [buildResponseFromColumns] Reconstruit subTab depuis colonne subtab:', cleanedMetadata.subTab);
        }
        catch (_y) {
            // noop
        }
    }
    if (node.id === '131a7b51-97d5-4f40-8a5a-9359f38939e8') {
        console.log('📝 [buildResponseFromColumns][Test - liste] node.metadata BRUT:', node.metadata);
        console.log('📝 [buildResponseFromColumns][Test - liste] cleanedMetadata:', cleanedMetadata);
        console.log('📝 [buildResponseFromColumns][Test - liste] metadata.capabilities:', (node.metadata && typeof node.metadata === 'object') ? node.metadata.capabilities : 'N/A');
    }
    if (cleanedMetadata && cleanedMetadata.subTabs) {
        try {
            console.log('📝 [buildResponseFromColumns] metadata.subTabs present for node', node.id, JSON.stringify(cleanedMetadata.subTabs));
        }
        catch (_z) {
            // noop
        }
    }
    var metadataWithRepeater = __assign(__assign({}, cleanedMetadata), { repeater: repeater });
    if (repeater.templateNodeIds && repeater.templateNodeIds.length > 0) {
        console.log('🚨🚨🚨 [REPEATER NODE FOUND]', {
            nodeId: node.id,
            nodeName: node.name,
            nodeLabel: node.label,
            nodeType: node.type,
            parentId: node.parentId,
            repeaterConfig: repeater
        });
    }
    console.log('🎯 [buildResponseFromColumns] metadata.repeater final:', metadataWithRepeater.repeater);
    var result = __assign(__assign({}, node), { metadata: metadataWithRepeater, fieldConfig: fieldConfig, appearance: appearance, appearanceConfig: appearanceConfig, fieldType: node.fieldType || node.type, fieldSubType: node.fieldSubType || node.subType, text_helpTooltipType: node.text_helpTooltipType, text_helpTooltipText: node.text_helpTooltipText, text_helpTooltipImage: node.text_helpTooltipImage, tables: node.TreeBranchLeafNodeTable || [], sharedReferenceIds: node.sharedReferenceIds || undefined });
    try {
        var legacyMetaCaps = (node.metadata && typeof node.metadata === 'object') ? node.metadata.capabilities : undefined;
        var buildInstances = function (raw) {
            if (!raw)
                return undefined;
            if (typeof raw === 'object' && raw !== null)
                return raw;
            return undefined;
        };
        var capabilities_1 = {
            data: (node.hasData || node.data_activeId || node.data_instances) ? {
                enabled: !!node.hasData,
                activeId: node.data_activeId || null,
                instances: buildInstances(node.data_instances) || {},
                unit: node.data_unit || null,
                precision: typeof node.data_precision === 'number' ? node.data_precision : 2,
                exposedKey: node.data_exposedKey || null,
                displayFormat: node.data_displayFormat || null,
                visibleToUser: node.data_visibleToUser === true
            } : undefined,
            formula: (node.hasFormula || node.formula_activeId || node.formula_instances) ? {
                enabled: !!node.hasFormula,
                activeId: node.formula_activeId || null,
                instances: buildInstances(node.formula_instances) || {},
                tokens: buildInstances(node.formula_tokens) || undefined,
                name: node.formula_name || null
            } : undefined,
            table: (node.hasTable || node.table_activeId || node.table_instances) ? {
                enabled: !!node.hasTable,
                activeId: node.table_activeId || null,
                instances: buildInstances(node.table_instances) || {},
                name: node.table_name || null,
                meta: buildInstances(node.table_meta) || {},
                type: node.table_type || 'columns',
                isImported: node.table_isImported === true,
                importSource: node.table_importSource || null,
                columns: Array.isArray(node.table_columns) ? node.table_columns : null,
                rows: Array.isArray(node.table_rows) ? node.table_rows : null
            } : undefined,
            select: (node.select_options || node.select_defaultValue) ? {
                options: Array.isArray(node.select_options) ? node.select_options : [],
                allowClear: node.select_allowClear !== false,
                multiple: node.select_multiple === true,
                searchable: node.select_searchable !== false,
                defaultValue: node.select_defaultValue || null
            } : undefined,
            number: (node.number_min !== undefined || node.number_max !== undefined || node.number_defaultValue !== undefined) ? {
                min: (_l = node.number_min) !== null && _l !== void 0 ? _l : null,
                max: (_m = node.number_max) !== null && _m !== void 0 ? _m : null,
                step: (_o = node.number_step) !== null && _o !== void 0 ? _o : 1,
                // 🔧 FIX: Priorité à data_precision pour les champs d'affichage
                decimals: (_q = (_p = node.data_precision) !== null && _p !== void 0 ? _p : node.number_decimals) !== null && _q !== void 0 ? _q : 0,
                unit: (_s = (_r = node.number_unit) !== null && _r !== void 0 ? _r : node.data_unit) !== null && _s !== void 0 ? _s : null,
                prefix: node.number_prefix || null,
                suffix: node.number_suffix || null,
                defaultValue: node.number_defaultValue || null
            } : undefined,
            bool: (node.bool_trueLabel || node.bool_falseLabel || node.bool_defaultValue !== undefined) ? {
                trueLabel: node.bool_trueLabel || null,
                falseLabel: node.bool_falseLabel || null,
                defaultValue: (_t = node.bool_defaultValue) !== null && _t !== void 0 ? _t : null
            } : undefined,
            date: (node.date_format || node.date_showTime || node.date_minDate || node.date_maxDate) ? {
                format: node.date_format || 'DD/MM/YYYY',
                showTime: node.date_showTime === true,
                minDate: node.date_minDate || null,
                maxDate: node.date_maxDate || null
            } : undefined,
            image: (node.image_maxSize || node.image_ratio || node.image_crop || node.image_thumbnails) ? {
                maxSize: node.image_maxSize || null,
                ratio: node.image_ratio || null,
                crop: node.image_crop === true,
                thumbnails: node.image_thumbnails || null
            } : undefined,
            link: (node.link_activeId || node.link_instances) ? {
                enabled: !!node.hasLink,
                activeId: node.link_activeId || null,
                instances: buildInstances(node.link_instances) || {},
                mode: node.link_mode || 'JUMP',
                name: node.link_name || null,
                carryContext: node.link_carryContext === true,
                params: buildInstances(node.link_params) || {},
                targetNodeId: node.link_targetNodeId || null,
                targetTreeId: node.link_targetTreeId || null
            } : undefined,
            markers: (node.markers_activeId || node.markers_instances || node.markers_selectedIds) ? {
                enabled: !!node.hasMarkers,
                activeId: node.markers_activeId || null,
                instances: buildInstances(node.markers_instances) || {},
                available: buildInstances(node.markers_available) || {},
                selectedIds: buildInstances(node.markers_selectedIds) || {}
            } : undefined,
            api: (node.api_activeId || node.api_instances) ? {
                enabled: !!node.hasAPI,
                activeId: node.api_activeId || null,
                instances: buildInstances(node.api_instances) || {},
                bodyVars: buildInstances(node.api_bodyVars) || {},
                name: node.api_name || null
            } : undefined
        };
        Object.keys(capabilities_1).forEach(function (key) {
            if (capabilities_1[key] === undefined)
                delete capabilities_1[key];
        });
        var mergedCaps = capabilities_1;
        if (legacyMetaCaps && typeof legacyMetaCaps === 'object') {
            mergedCaps = __assign(__assign({}, legacyMetaCaps), capabilities_1);
        }
        result.capabilities = mergedCaps;
    }
    catch (e) {
        console.error('❌ [buildResponseFromColumns] Erreur adaptation legacy capabilities:', e);
    }
    if (node.sharedReferenceIds && node.sharedReferenceIds.length > 0) {
        console.log('📌 [buildResponseFromColumns] OPTION AVEC SHARED REFS:', {
            nodeId: node.id,
            label: node.label || node.option_label,
            type: node.type,
            sharedReferenceIds: node.sharedReferenceIds
        });
    }
    if (node.text_helpTooltipType && node.text_helpTooltipType !== 'none') {
        console.log('🔥 [buildResponseFromColumns] TOOLTIP TROUVÉ:', {
            id: node.id,
            name: node.name,
            tooltipType: node.text_helpTooltipType,
            hasTooltipText: !!node.text_helpTooltipText,
            hasTooltipImage: !!node.text_helpTooltipImage,
            textLength: ((_u = node.text_helpTooltipText) === null || _u === void 0 ? void 0 : _u.length) || 0,
            imageLength: ((_v = node.text_helpTooltipImage) === null || _v === void 0 ? void 0 : _v.length) || 0
        });
    }
    return result;
}

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
exports.deepCopyNodeInternal = deepCopyNodeInternal;
var repeat_blueprint_writer_js_1 = require("../repeat-blueprint-writer.js");
var shared_helpers_js_1 = require("./shared-helpers.js");
var variable_copy_engine_js_1 = require("./variable-copy-engine.js");
var repeat_context_utils_js_1 = require("./repeat-context-utils.js");
var copy_capacity_formula_js_1 = require("../../copy-capacity-formula.js");
function deepCopyNodeInternal(prisma, req, nodeId, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, targetParentId, suffixNum, _b, preserveSharedReferences, forcedSuffix, repeatContext, _c, cloneExternalParents, _d, isFromRepeaterDuplication, replaceIdsInTokens, replaceIdsInConditionSet, source, _e, organizationId, isSuperAdmin, sanitizedForcedSuffix, copySuffixNum, baseSourceId, existingIdsWithSuffix, maxSuffix, _i, existingIdsWithSuffix_1, rec, rest, num, suffixToken, computedLabelSuffix, suffixPattern, numericSuffixPattern, hasCurrentSuffix, stripNumericSuffix, hasAnySuffix, ensureSuffix, buildParentSuffix, appendSuffix, normalizeLabelWithSuffix, metadataCopySuffix, derivedRepeatContext, normalizedRepeatContext, allNodes, byId, existingNodeIds, childrenByParent, _f, allNodes_1, n, arr, toCopy, queue, cur, children, _g, children_1, c, idMap, _h, toCopy_1, oldId, candidateId, formulaIdMap, conditionIdMap, tableIdMap, displayNodeIds, directVariableIdByNodeId, nodeVariables, _j, nodeVariables_1, variable, buildCreationOrder, nodesToCreate, createdNodes, shouldCloneExternalParents, resolvedExternalParents, buildCloneData, ensureExternalParentChain, resolveParentId, _k, nodesToCreate_1, oldId, oldNode, newId, isRoot, newParentId, cloneData, _loop_1, _l, createdNodes_1, _o, oldId, newId, newParentId, variableCopyCache, _p, toCopy_2, oldNodeId, newNodeId, oldNode, newLinkedFormulaIds, newLinkedConditionIds, newLinkedTableIds, sourceLinkedVariableIds, _q, _r, rawId, normalized, baseId, directVarIds, _s, directVarIds_1, directVarIdForNode, baseId, _t, sourceLinkedVariableIds_1, linkedVarId, isSharedRef, copyResult, e_1, e_2, rootNewId, _u, displayNodeIds_1, nodeId_1, copiedNode, originalNodeId, originalVar, newVarId, newExposedKey, varError_1, newNodeIds, copiedVariables, _v, copiedVariables_1, variable, syncError_1, syncPassThroughError_1;
        var _this = this;
        var _w, _x, _y;
        return __generator(this, function (_z) {
            switch (_z.label) {
                case 0:
                    _a = opts || {}, targetParentId = _a.targetParentId, suffixNum = _a.suffixNum, _b = _a.preserveSharedReferences, preserveSharedReferences = _b === void 0 ? false : _b, forcedSuffix = _a.forcedSuffix, repeatContext = _a.repeatContext, _c = _a.cloneExternalParents, cloneExternalParents = _c === void 0 ? false : _c, _d = _a.isFromRepeaterDuplication, isFromRepeaterDuplication = _d === void 0 ? false : _d;
                    replaceIdsInTokens = function (tokens, idMap) {
                        console.log("\n[\uD83D\uDD25 REPLACE-TOKENS] Called with ".concat(Array.isArray(tokens) ? tokens.length : typeof tokens, " tokens"));
                        if (!tokens)
                            return tokens;
                        var mapOne = function (s) { return s.replace(/@value\.([A-Za-z0-9_:-]+)/g, function (_m, p1) {
                            // 🎯 ÉTAPE 1: Chercher dans idMap (nœuds copiés dans cette copie)
                            if (idMap.has(p1)) {
                                var newId = idMap.get(p1);
                                console.log("[DEBUG-REPLACE] \u2705 Trouv\u00E9 dans idMap: @value.".concat(p1, " \u2192 @value.").concat(newId));
                                return "@value.".concat(newId);
                            }
                            // 🎯 ÉTAPE 2: Si le nœud n'est pas dans idMap, c'est une référence EXTERNE
                            // On doit TOUJOURS suffixer pour créer la copie référencée
                            var suffixedId = appendSuffix(p1);
                            console.log("[DEBUG-REPLACE] \u2705 R\u00E9f\u00E9rence externe suffix\u00E9e: @value.".concat(p1, " \u2192 @value.").concat(suffixedId));
                            return "@value.".concat(suffixedId);
                        }); };
                        if (Array.isArray(tokens))
                            return tokens.map(function (t) { return (typeof t === 'string' ? mapOne(t) : t); });
                        if (typeof tokens === 'string')
                            return mapOne(tokens);
                        try {
                            var asStr = JSON.stringify(tokens);
                            var replaced = mapOne(asStr);
                            return JSON.parse(replaced);
                        }
                        catch (_a) {
                            return tokens;
                        }
                    };
                    replaceIdsInConditionSet = function (conditionSet, idMap, formulaIdMap) {
                        if (!conditionSet)
                            return conditionSet;
                        try {
                            var str = JSON.stringify(conditionSet);
                            // 🎯 Remplacer les références @value.nodeId
                            str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, function (_m, p1) {
                                // Chercher dans idMap d'abord (nœuds copiés dans cette copie)
                                if (idMap.has(p1)) {
                                    var newId = idMap.get(p1);
                                    console.log("[DEBUG-CONDITION] \u2705 @value.".concat(p1, " \u2192 @value.").concat(newId));
                                    return "@value.".concat(newId);
                                }
                                // TOUJOURS suffixer les références externes
                                var suffixedId = appendSuffix(p1);
                                console.log("[DEBUG-CONDITION] \u2705 @value.".concat(p1, " \u2192 @value.").concat(suffixedId, " (auto-suffix externe)"));
                                return "@value.".concat(suffixedId);
                            });
                            // 🎯 Remplacer les références node-formula:
                            str = str.replace(/node-formula:([a-f0-9-]{36})/gi, function (_m, p1) {
                                var newId = formulaIdMap.get(p1) || p1;
                                console.log("[DEBUG-CONDITION] Formula: node-formula:".concat(p1, " \u2192 node-formula:").concat(newId));
                                return "node-formula:".concat(newId);
                            });
                            // 🎯 Remplacer les nodeIds directs dans les actions (shared-ref, node IDs)
                            str = str.replace(/("nodeIds":\s*\["?)([a-zA-Z0-9_:-]+)/g, function (_m, prefix, nodeId) {
                                // Si c'est une référence avec : (node-formula:, condition:, etc), on l'a déjà traitée
                                if (nodeId.includes(':')) {
                                    return _m;
                                }
                                // Si c'est un shared-ref- ou un node ID, on doit le suffixer
                                if (nodeId.startsWith('shared-ref-') || !nodeId.includes('-')) {
                                    // C'est un shared-ref ou un simple ID, doit être suffixé
                                    if (idMap.has(nodeId)) {
                                        var newId = idMap.get(nodeId);
                                        console.log("[DEBUG-CONDITION] NodeId in actions: ".concat(nodeId, " \u2192 ").concat(newId));
                                        return prefix + newId;
                                    }
                                    // Suffixer directement
                                    var suffixedId = appendSuffix(nodeId);
                                    console.log("[DEBUG-CONDITION] NodeId in actions (auto-suffix): ".concat(nodeId, " \u2192 ").concat(suffixedId));
                                    return prefix + suffixedId;
                                }
                                return _m;
                            });
                            return JSON.parse(str);
                        }
                        catch (_a) {
                            return conditionSet;
                        }
                    };
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            include: { TreeBranchLeafTree: { select: { organizationId: true } } }
                        })];
                case 1:
                    source = _z.sent();
                    if (!source) {
                        throw new Error('Nœud source introuvable');
                    }
                    _e = (0, shared_helpers_js_1.getAuthCtx)(req), organizationId = _e.organizationId, isSuperAdmin = _e.isSuperAdmin;
                    if (!isSuperAdmin && organizationId && ((_w = source.TreeBranchLeafTree) === null || _w === void 0 ? void 0 : _w.organizationId) !== organizationId) {
                        throw new Error('Accès non autorisé à cet arbre');
                    }
                    sanitizedForcedSuffix = (function () {
                        if (forcedSuffix === undefined || forcedSuffix === null)
                            return '';
                        var token = "".concat(forcedSuffix).trim();
                        return token;
                    })();
                    console.log("\uD83D\uDD0D [DEBUG-DEEP-COPY] nodeId: ".concat(nodeId, ", forcedSuffix: ").concat(forcedSuffix, ", suffixNum: ").concat(suffixNum));
                    copySuffixNum = typeof forcedSuffix === 'number' && Number.isFinite(forcedSuffix)
                        ? forcedSuffix
                        : (suffixNum !== null && suffixNum !== void 0 ? suffixNum : null);
                    console.log("\uD83D\uDD0D [DEBUG-DEEP-COPY] copySuffixNum initial: ".concat(copySuffixNum));
                    if (!!sanitizedForcedSuffix) return [3 /*break*/, 6];
                    if (!(suffixNum != null && Number.isFinite(suffixNum))) return [3 /*break*/, 2];
                    console.log("\u2705 [DEBUG-DEEP-COPY] SuffixNum fourni explicitement: ".concat(suffixNum, " - UTILISATION DIRECTE"));
                    copySuffixNum = suffixNum;
                    return [3 /*break*/, 5];
                case 2:
                    if (!(copySuffixNum != null && Number.isFinite(copySuffixNum))) return [3 /*break*/, 3];
                    console.log("\u2705 [DEBUG-DEEP-COPY] CopySuffixNum valide: ".concat(copySuffixNum, " - UTILISATION DIRECTE"));
                    return [3 /*break*/, 5];
                case 3:
                    console.log("\uD83D\uDD04 [DEBUG-DEEP-COPY] Aucun suffix fourni - calcul automatique n\u00E9cessaire");
                    baseSourceId = source.id.replace(/-\d+(?:-\d+)*$/, '');
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: {
                                treeId: source.treeId,
                                id: {
                                    startsWith: "".concat(baseSourceId, "-"),
                                    // Exclure les suffixes composés (on cherche juste -1, -2, -3, pas -1-1)
                                }
                            },
                            select: { id: true }
                        })];
                case 4:
                    existingIdsWithSuffix = _z.sent();
                    maxSuffix = 0;
                    for (_i = 0, existingIdsWithSuffix_1 = existingIdsWithSuffix; _i < existingIdsWithSuffix_1.length; _i++) {
                        rec = existingIdsWithSuffix_1[_i];
                        rest = rec.id.slice(baseSourceId.length + 1);
                        // Ne considérer que les suffixes simples: uniquement des chiffres
                        if (/^\d+$/.test(rest)) {
                            num = Number(rest);
                            if (Number.isFinite(num) && num > maxSuffix)
                                maxSuffix = num;
                        }
                    }
                    copySuffixNum = maxSuffix + 1;
                    _z.label = 5;
                case 5:
                    console.log("\uD83C\uDFAF [DEBUG-DEEP-COPY] copySuffixNum final: ".concat(copySuffixNum));
                    _z.label = 6;
                case 6:
                    suffixToken = sanitizedForcedSuffix || "".concat(copySuffixNum);
                    computedLabelSuffix = "-".concat(suffixToken);
                    suffixPattern = new RegExp("-".concat(suffixToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "$"));
                    numericSuffixPattern = /-\d+$/;
                    hasCurrentSuffix = function (value) { return suffixPattern.test(value); };
                    stripNumericSuffix = function (value) { return value.replace(/-\d+(?:-\d+)*$/, ''); };
                    hasAnySuffix = function (value) { return hasCurrentSuffix(value) || numericSuffixPattern.test(value); };
                    ensureSuffix = function (value) {
                        if (!value)
                            return value;
                        if (hasCurrentSuffix(value))
                            return value;
                        // ⚠️ Toujours recalculer le suffixe lorsqu'il est différent (ex: passer de -1 à -2)
                        var base = stripNumericSuffix(value);
                        return "".concat(base, "-").concat(suffixToken);
                    };
                    buildParentSuffix = function (value) {
                        if (!value)
                            return value !== null && value !== void 0 ? value : null;
                        var base = value.replace(/-\d+$/, '');
                        return "".concat(base, "-").concat(suffixToken);
                    };
                    appendSuffix = function (value) { return "".concat(value, "-").concat(suffixToken); };
                    normalizeLabelWithSuffix = function (value) {
                        if (!value)
                            return value;
                        var base = value.replace(/-\d+(?:-\d+)*$/, '');
                        // Si déjà suffixé par ce token, ne pas doubler
                        if (hasCurrentSuffix(value))
                            return "".concat(base, "-").concat(suffixToken);
                        return "".concat(base, "-").concat(suffixToken);
                    };
                    metadataCopySuffix = Number.isFinite(Number(suffixToken)) ? Number(suffixToken) : suffixToken;
                    derivedRepeatContext = repeatContext !== null && repeatContext !== void 0 ? repeatContext : (0, repeat_context_utils_js_1.deriveRepeatContextFromMetadata)(source, { suffix: suffixToken });
                    normalizedRepeatContext = derivedRepeatContext
                        ? __assign(__assign({}, derivedRepeatContext), { suffix: (_x = derivedRepeatContext.suffix) !== null && _x !== void 0 ? _x : suffixToken }) : undefined;
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({ where: { treeId: source.treeId } })];
                case 7:
                    allNodes = _z.sent();
                    byId = new Map(allNodes.map(function (n) { return [n.id, n]; }));
                    existingNodeIds = new Set(byId.keys());
                    childrenByParent = new Map();
                    for (_f = 0, allNodes_1 = allNodes; _f < allNodes_1.length; _f++) {
                        n = allNodes_1[_f];
                        if (!n.parentId)
                            continue;
                        arr = childrenByParent.get(n.parentId) || [];
                        arr.push(n.id);
                        childrenByParent.set(n.parentId, arr);
                    }
                    toCopy = new Set();
                    queue = [source.id];
                    while (queue.length) {
                        cur = queue.shift();
                        if (toCopy.has(cur))
                            continue;
                        toCopy.add(cur);
                        children = childrenByParent.get(cur) || [];
                        for (_g = 0, children_1 = children; _g < children_1.length; _g++) {
                            c = children_1[_g];
                            queue.push(c);
                        }
                    }
                    idMap = new Map();
                    // Les templateNodeIds sont maintenant garantis sans suffixes grâce au filtrage en amont
                    // On applique directement le suffixe sans normalisation
                    for (_h = 0, toCopy_1 = toCopy; _h < toCopy_1.length; _h++) {
                        oldId = toCopy_1[_h];
                        candidateId = appendSuffix(oldId);
                        idMap.set(oldId, candidateId);
                    }
                    formulaIdMap = new Map();
                    conditionIdMap = new Map();
                    tableIdMap = new Map();
                    displayNodeIds = [];
                    directVariableIdByNodeId = new Map();
                    if (!(toCopy.size > 0)) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                            where: { nodeId: { in: Array.from(toCopy) } },
                            select: { nodeId: true, id: true }
                        })];
                case 8:
                    nodeVariables = _z.sent();
                    for (_j = 0, nodeVariables_1 = nodeVariables; _j < nodeVariables_1.length; _j++) {
                        variable = nodeVariables_1[_j];
                        if (variable.nodeId && variable.id) {
                            if (!directVariableIdByNodeId.has(variable.nodeId)) {
                                directVariableIdByNodeId.set(variable.nodeId, new Set());
                            }
                            directVariableIdByNodeId.get(variable.nodeId).add(variable.id);
                        }
                    }
                    _z.label = 9;
                case 9:
                    buildCreationOrder = function () {
                        var edges = new Map();
                        var indegree = new Map();
                        var ensureNode = function (id) {
                            if (!edges.has(id))
                                edges.set(id, new Set());
                            if (!indegree.has(id))
                                indegree.set(id, 0);
                        };
                        for (var _i = 0, toCopy_3 = toCopy; _i < toCopy_3.length; _i++) {
                            var id = toCopy_3[_i];
                            ensureNode(id);
                        }
                        for (var _a = 0, toCopy_4 = toCopy; _a < toCopy_4.length; _a++) {
                            var id = toCopy_4[_a];
                            var n = byId.get(id);
                            if ((n === null || n === void 0 ? void 0 : n.parentId) && toCopy.has(n.parentId)) {
                                var from = n.parentId;
                                var to = id;
                                var set = edges.get(from);
                                if (!set.has(to)) {
                                    set.add(to);
                                    indegree.set(to, (indegree.get(to) || 0) + 1);
                                }
                            }
                        }
                        var localQueue = [];
                        var zeroIndegreeNodes = [];
                        for (var _b = 0, _c = indegree.entries(); _b < _c.length; _b++) {
                            var _d = _c[_b], id = _d[0], deg = _d[1];
                            if (deg === 0)
                                zeroIndegreeNodes.push(id);
                        }
                        // Trier les nœuds sans dépendance par leur ordre pour garantir une création cohérente
                        zeroIndegreeNodes.sort(function (a, b) {
                            var _a, _b;
                            var nodeA = byId.get(a);
                            var nodeB = byId.get(b);
                            var orderA = (_a = nodeA === null || nodeA === void 0 ? void 0 : nodeA.order) !== null && _a !== void 0 ? _a : 0;
                            var orderB = (_b = nodeB === null || nodeB === void 0 ? void 0 : nodeB.order) !== null && _b !== void 0 ? _b : 0;
                            return orderA - orderB;
                        });
                        localQueue.push.apply(localQueue, zeroIndegreeNodes);
                        var ordered = [];
                        while (localQueue.length) {
                            var id = localQueue.shift();
                            ordered.push(id);
                            var nextNodes = [];
                            for (var _e = 0, _f = edges.get(id) || []; _e < _f.length; _e++) {
                                var next = _f[_e];
                                var d = (indegree.get(next) || 0) - 1;
                                indegree.set(next, d);
                                if (d === 0)
                                    nextNodes.push(next);
                            }
                            // Trier les enfants avant de les ajouter à la queue
                            nextNodes.sort(function (a, b) {
                                var _a, _b;
                                var nodeA = byId.get(a);
                                var nodeB = byId.get(b);
                                var orderA = (_a = nodeA === null || nodeA === void 0 ? void 0 : nodeA.order) !== null && _a !== void 0 ? _a : 0;
                                var orderB = (_b = nodeB === null || nodeB === void 0 ? void 0 : nodeB.order) !== null && _b !== void 0 ? _b : 0;
                                return orderA - orderB;
                            });
                            localQueue.push.apply(localQueue, nextNodes);
                        }
                        if (ordered.length !== toCopy.size) {
                            var remaining = new Set(Array.from(toCopy).filter(function (id) { return !ordered.includes(id); }));
                            var depth_1 = new Map();
                            var getDepth_1 = function (id) {
                                if (depth_1.has(id))
                                    return depth_1.get(id);
                                var n = byId.get(id);
                                if (!n || !n.parentId || !toCopy.has(n.parentId)) {
                                    depth_1.set(id, 0);
                                    return 0;
                                }
                                var d = getDepth_1(n.parentId) + 1;
                                depth_1.set(id, d);
                                return d;
                            };
                            var rest = Array.from(remaining).sort(function (a, b) { return getDepth_1(a) - getDepth_1(b); });
                            return __spreadArray(__spreadArray([], ordered, true), rest, true);
                        }
                        return ordered;
                    };
                    nodesToCreate = buildCreationOrder();
                    createdNodes = [];
                    shouldCloneExternalParents = cloneExternalParents === true;
                    resolvedExternalParents = new Map();
                    buildCloneData = function (oldNode, newId, newParentId) {
                        var _a;
                        return ({
                            id: newId,
                            treeId: oldNode.treeId,
                            type: oldNode.type,
                            subType: oldNode.subType,
                            fieldType: oldNode.fieldType,
                            label: (_a = normalizeLabelWithSuffix(oldNode.label)) !== null && _a !== void 0 ? _a : oldNode.label,
                            description: oldNode.description,
                            parentId: newParentId,
                            order: oldNode.order,
                            isVisible: oldNode.isVisible,
                            isActive: oldNode.isActive,
                            isRequired: oldNode.isRequired,
                            isMultiple: oldNode.isMultiple,
                            hasData: oldNode.hasData,
                            hasFormula: oldNode.hasFormula,
                            hasCondition: oldNode.hasCondition,
                            hasTable: oldNode.hasTable,
                            hasAPI: oldNode.hasAPI,
                            hasLink: oldNode.hasLink,
                            hasMarkers: oldNode.hasMarkers,
                            // 🔧 FIX: Copier les propriétés data_* pour hériter de l'unité et de la précision
                            data_unit: oldNode.data_unit,
                            data_precision: oldNode.data_precision,
                            data_displayFormat: oldNode.data_displayFormat,
                            data_exposedKey: oldNode.data_exposedKey,
                            data_visibleToUser: oldNode.data_visibleToUser,
                            defaultValue: oldNode.defaultValue,
                            calculatedValue: (oldNode.hasFormula || oldNode.hasCondition || oldNode.hasTable)
                                ? null
                                : oldNode.calculatedValue,
                            appearance_size: oldNode.appearance_size,
                            appearance_variant: oldNode.appearance_variant,
                            appearance_width: oldNode.appearance_width,
                            text_placeholder: oldNode.text_placeholder,
                            text_maxLength: oldNode.text_maxLength,
                            text_minLength: oldNode.text_minLength,
                            text_mask: oldNode.text_mask,
                            text_regex: oldNode.text_regex,
                            text_rows: oldNode.text_rows,
                            text_helpTooltipType: oldNode.text_helpTooltipType,
                            text_helpTooltipText: oldNode.text_helpTooltipText,
                            text_helpTooltipImage: oldNode.text_helpTooltipImage,
                            number_min: oldNode.number_min,
                            number_max: oldNode.number_max,
                            number_step: oldNode.number_step,
                            number_decimals: oldNode.number_decimals,
                            number_prefix: oldNode.number_prefix,
                            number_suffix: oldNode.number_suffix,
                            number_unit: oldNode.number_unit,
                            number_defaultValue: oldNode.number_defaultValue,
                            select_multiple: oldNode.select_multiple,
                            select_searchable: oldNode.select_searchable,
                            select_allowClear: oldNode.select_allowClear,
                            select_source: oldNode.select_source
                                ? (function () {
                                    var sourceValue = oldNode.select_source;
                                    if (sourceValue.startsWith('@table.')) {
                                        var tableId = sourceValue.substring(7);
                                        var newTableId = idMap.get(tableId);
                                        if (newTableId) {
                                            return "@table.".concat(newTableId);
                                        }
                                    }
                                    return sourceValue;
                                })()
                                : oldNode.select_source,
                            select_defaultValue: oldNode.select_defaultValue,
                            select_options: oldNode.select_options
                                ? (function () {
                                    try {
                                        var str = JSON.stringify(oldNode.select_options);
                                        var replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, function (uuid) { return idMap.get(uuid) || uuid; });
                                        replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, function (id) { return idMap.get(id) || id; });
                                        return JSON.parse(replaced);
                                    }
                                    catch (_a) {
                                        return oldNode.select_options;
                                    }
                                })()
                                : oldNode.select_options,
                            bool_trueLabel: oldNode.bool_trueLabel,
                            bool_falseLabel: oldNode.bool_falseLabel,
                            bool_defaultValue: oldNode.bool_defaultValue,
                            date_format: oldNode.date_format,
                            date_minDate: oldNode.date_minDate,
                            date_maxDate: oldNode.date_maxDate,
                            date_showTime: oldNode.date_showTime,
                            image_maxSize: oldNode.image_maxSize,
                            image_ratio: oldNode.image_ratio,
                            image_crop: oldNode.image_crop,
                            image_thumbnails: oldNode.image_thumbnails
                                ? (function () {
                                    try {
                                        var str = JSON.stringify(oldNode.image_thumbnails);
                                        var replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, function (uuid) { return idMap.get(uuid) || uuid; });
                                        replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, function (id) { return idMap.get(id) || id; });
                                        return JSON.parse(replaced);
                                    }
                                    catch (_a) {
                                        return oldNode.image_thumbnails;
                                    }
                                })()
                                : oldNode.image_thumbnails,
                            link_activeId: oldNode.link_activeId,
                            link_carryContext: oldNode.link_carryContext,
                            link_mode: oldNode.link_mode,
                            link_name: oldNode.link_name,
                            link_params: oldNode.link_params
                                ? (function () {
                                    try {
                                        var str = JSON.stringify(oldNode.link_params);
                                        var replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, function (uuid) { return idMap.get(uuid) || uuid; });
                                        replaced = replaced.replace(/(node_[a-z0-9_-]+)/gi, function (id) { return idMap.get(id) || id; });
                                        return JSON.parse(replaced);
                                    }
                                    catch (_a) {
                                        return oldNode.link_params;
                                    }
                                })()
                                : oldNode.link_params,
                            link_targetNodeId: oldNode.link_targetNodeId && idMap.has(oldNode.link_targetNodeId)
                                ? idMap.get(oldNode.link_targetNodeId)
                                : oldNode.link_targetNodeId,
                            link_targetTreeId: oldNode.link_targetTreeId,
                            table_activeId: oldNode.table_activeId ? ensureSuffix(oldNode.table_activeId) : null,
                            table_instances: (function () {
                                if (!oldNode.table_instances) {
                                    return oldNode.table_instances;
                                }
                                var rawInstances;
                                try {
                                    if (typeof oldNode.table_instances === 'string') {
                                        rawInstances = JSON.parse(oldNode.table_instances);
                                    }
                                    else if (typeof oldNode.table_instances === 'object') {
                                        rawInstances = JSON.parse(JSON.stringify(oldNode.table_instances));
                                    }
                                    else {
                                        return oldNode.table_instances;
                                    }
                                }
                                catch (_a) {
                                    return oldNode.table_instances;
                                }
                                var updatedInstances = {};
                                for (var _i = 0, _b = Object.entries(rawInstances); _i < _b.length; _i++) {
                                    var _c = _b[_i], key = _c[0], value = _c[1];
                                    var hasSuffixRegex = /-\d+$/;
                                    var newKey = hasSuffixRegex.test(key) ? key : appendSuffix(key);
                                    if (value && typeof value === 'object') {
                                        var tableInstanceObj = value;
                                        var updatedObj = __assign({}, tableInstanceObj);
                                        if (tableInstanceObj.tableId && typeof tableInstanceObj.tableId === 'string') {
                                            var oldTableId = tableInstanceObj.tableId;
                                            updatedObj.tableId = hasSuffixRegex.test(oldTableId)
                                                ? oldTableId
                                                : appendSuffix(oldTableId);
                                        }
                                        updatedInstances[newKey] = updatedObj;
                                    }
                                    else {
                                        updatedInstances[newKey] = value;
                                    }
                                }
                                return updatedInstances;
                            })(),
                            table_name: oldNode.table_name,
                            // 🔴 CRITIQUE: Garder TOUJOURS les repeater_templateNodeIds ORIGINAUX (pas de suffixe!)
                            // Les templateNodeIds doivent être les UUIDs purs des templates originaux,
                            // JAMAIS les IDs suffixés des copies (-1, -2, etc.)
                            // Si on mappe vers les suffixés, la 2e duplication trouvera uuid-A-1 au lieu de uuid-A!
                            repeater_templateNodeIds: (function () {
                                // 🔴 CRITIQUE: Ne PAS copier la configuration de repeater lors d'une duplication via repeater
                                // Si on copie un template en tant que partie d'un repeater, la copie ne doit PAS
                                // conserver `repeater_templateNodeIds` (la copie ne doit pas devenir un repeater).
                                if (normalizedRepeatContext)
                                    return null;
                                // ✅ FIX: JAMAIS mapper les IDs! Garder les IDs originaux sans suffixes
                                if (!oldNode.repeater_templateNodeIds)
                                    return oldNode.repeater_templateNodeIds;
                                // Retourner tel quel - les templateNodeIds doivent rester inchangés
                                // (ils contiennent déjà les IDs originaux purs sans suffixes)
                                return oldNode.repeater_templateNodeIds;
                            })(),
                            repeater_templateNodeLabels: oldNode.repeater_templateNodeLabels,
                            repeater_minItems: oldNode.repeater_minItems,
                            repeater_maxItems: oldNode.repeater_maxItems,
                            repeater_addButtonLabel: oldNode.repeater_addButtonLabel,
                            repeater_buttonSize: oldNode.repeater_buttonSize,
                            repeater_buttonWidth: oldNode.repeater_buttonWidth,
                            repeater_iconOnly: oldNode.repeater_iconOnly,
                            metadata: (function () {
                                var origMeta = (typeof oldNode.metadata === 'object' ? oldNode.metadata : {});
                                var newMeta = __assign(__assign({}, origMeta), { copiedFromNodeId: oldNode.id, copySuffix: metadataCopySuffix });
                                // 🔴 Ne pas copier la configuration de repeater dans les clones créés via un repeater
                                if (normalizedRepeatContext && newMeta.repeater) {
                                    delete newMeta.repeater;
                                }
                                return newMeta;
                            })(),
                            // 🔧 TRAITER LE fieldConfig: suffix les références aux nodes
                            fieldConfig: (function () {
                                if (!oldNode.fieldConfig) {
                                    return oldNode.fieldConfig;
                                }
                                try {
                                    var str = JSON.stringify(oldNode.fieldConfig);
                                    // Remplacer les UUIDs par leurs versions suffixées
                                    var replaced = str.replace(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi, function (uuid) {
                                        var mapped = idMap.get(uuid);
                                        if (mapped) {
                                            console.log("[fieldConfig] UUID remapp\u00E9: ".concat(uuid, " \u2192 ").concat(mapped));
                                            return mapped;
                                        }
                                        // Si pas dans la map et suffixe pas déjà appliqué, l'ajouter
                                        if (!uuid.match(/-\d+$/)) {
                                            console.log("[fieldConfig] UUID suffix\u00E9: ".concat(uuid, " \u2192 ").concat(uuid, "-").concat(suffixNum));
                                            return "".concat(uuid, "-").concat(suffixNum);
                                        }
                                        return uuid;
                                    });
                                    return JSON.parse(replaced);
                                }
                                catch (_a) {
                                    console.warn('[fieldConfig] Erreur traitement fieldConfig, copie tel quel');
                                    return oldNode.fieldConfig;
                                }
                            })(),
                            isSharedReference: preserveSharedReferences ? oldNode.isSharedReference : false,
                            sharedReferenceId: preserveSharedReferences ? oldNode.sharedReferenceId : null,
                            sharedReferenceIds: preserveSharedReferences ? oldNode.sharedReferenceIds : [],
                            sharedReferenceName: preserveSharedReferences ? oldNode.sharedReferenceName : null,
                            sharedReferenceDescription: preserveSharedReferences ? oldNode.sharedReferenceDescription : null,
                            linkedFormulaIds: Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [],
                            linkedConditionIds: Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [],
                            linkedTableIds: Array.isArray(oldNode.linkedTableIds)
                                ? oldNode.linkedTableIds.map(function (id) { return ensureSuffix(id) || id; })
                                : [],
                            // Suffixer aussi les linkedVariableIds pour que les copies pointent vers les variables copiées
                            linkedVariableIds: Array.isArray(oldNode.linkedVariableIds)
                                ? oldNode.linkedVariableIds.map(function (id) { return ensureSuffix(id) || id; })
                                : [],
                            updatedAt: new Date()
                        });
                    };
                    ensureExternalParentChain = function (parentId) { return __awaiter(_this, void 0, void 0, function () {
                        var cloneParentNodeChain, suffixedParentId_1, resolvedId, resolvedId, mappedId, suffixedParentId;
                        var _this = this;
                        return __generator(this, function (_a) {
                            if (!parentId) {
                                return [2 /*return*/, parentId !== null && parentId !== void 0 ? parentId : null];
                            }
                            cloneParentNodeChain = function (originalParentId, clonedParentId) { return __awaiter(_this, void 0, void 0, function () {
                                var parentNode, parentOfParentId, parentCloneData;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            parentNode = byId.get(originalParentId);
                                            if (!parentNode) {
                                                resolvedExternalParents.set(originalParentId, originalParentId !== null && originalParentId !== void 0 ? originalParentId : null);
                                                return [2 /*return*/, originalParentId !== null && originalParentId !== void 0 ? originalParentId : null];
                                            }
                                            // 🚫 NE PAS cloner les sections si shouldCloneExternalParents = false
                                            if (!shouldCloneExternalParents && parentNode.type === 'section') {
                                                console.log("\u23ED\uFE0F [deep-copy] Skipping section clone: \"".concat(parentNode.label, "\" (shouldCloneExternalParents=false)"));
                                                resolvedExternalParents.set(originalParentId, originalParentId !== null && originalParentId !== void 0 ? originalParentId : null);
                                                return [2 /*return*/, originalParentId !== null && originalParentId !== void 0 ? originalParentId : null];
                                            }
                                            return [4 /*yield*/, ensureExternalParentChain((_a = parentNode.parentId) !== null && _a !== void 0 ? _a : null)];
                                        case 1:
                                            parentOfParentId = _b.sent();
                                            parentCloneData = buildCloneData(parentNode, clonedParentId, parentOfParentId);
                                            return [4 /*yield*/, prisma.treeBranchLeafNode.create({ data: parentCloneData })];
                                        case 2:
                                            _b.sent();
                                            createdNodes.push({ oldId: originalParentId, newId: clonedParentId });
                                            existingNodeIds.add(clonedParentId);
                                            resolvedExternalParents.set(originalParentId, clonedParentId);
                                            idMap.set(originalParentId, clonedParentId);
                                            return [2 /*return*/, clonedParentId];
                                    }
                                });
                            }); };
                            if (!shouldCloneExternalParents) {
                                suffixedParentId_1 = buildParentSuffix(parentId);
                                if (suffixedParentId_1 && existingNodeIds.has(suffixedParentId_1)) {
                                    resolvedExternalParents.set(parentId, suffixedParentId_1);
                                    idMap.set(parentId, suffixedParentId_1);
                                    return [2 /*return*/, suffixedParentId_1];
                                }
                                resolvedId = parentId !== null && parentId !== void 0 ? parentId : null;
                                resolvedExternalParents.set(parentId, resolvedId);
                                return [2 /*return*/, resolvedId];
                            }
                            if (resolvedExternalParents.has(parentId)) {
                                resolvedId = resolvedExternalParents.get(parentId);
                                if (resolvedId) {
                                    idMap.set(parentId, resolvedId);
                                }
                                return [2 /*return*/, resolvedId];
                            }
                            if (toCopy.has(parentId)) {
                                mappedId = idMap.get(parentId);
                                resolvedExternalParents.set(parentId, mappedId);
                                idMap.set(parentId, mappedId);
                                return [2 /*return*/, mappedId];
                            }
                            suffixedParentId = buildParentSuffix(parentId);
                            if (!suffixedParentId) {
                                resolvedExternalParents.set(parentId, parentId !== null && parentId !== void 0 ? parentId : null);
                                return [2 /*return*/, parentId !== null && parentId !== void 0 ? parentId : null];
                            }
                            if (existingNodeIds.has(suffixedParentId)) {
                                resolvedExternalParents.set(parentId, suffixedParentId);
                                idMap.set(parentId, suffixedParentId);
                                return [2 /*return*/, suffixedParentId];
                            }
                            return [2 /*return*/, cloneParentNodeChain(parentId, suffixedParentId)];
                        });
                    }); };
                    resolveParentId = function (oldNode, isRoot) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            if (oldNode.parentId && toCopy.has(oldNode.parentId)) {
                                return [2 /*return*/, idMap.get(oldNode.parentId)];
                            }
                            if (isRoot && targetParentId !== undefined) {
                                return [2 /*return*/, targetParentId !== null && targetParentId !== void 0 ? targetParentId : null];
                            }
                            return [2 /*return*/, ensureExternalParentChain(oldNode.parentId)];
                        });
                    }); };
                    _k = 0, nodesToCreate_1 = nodesToCreate;
                    _z.label = 10;
                case 10:
                    if (!(_k < nodesToCreate_1.length)) return [3 /*break*/, 14];
                    oldId = nodesToCreate_1[_k];
                    oldNode = byId.get(oldId);
                    newId = idMap.get(oldId);
                    isRoot = oldId === source.id;
                    return [4 /*yield*/, resolveParentId(oldNode, isRoot)];
                case 11:
                    newParentId = _z.sent();
                    cloneData = buildCloneData(oldNode, newId, newParentId);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.create({ data: cloneData })];
                case 12:
                    _z.sent();
                    createdNodes.push({ oldId: oldId, newId: newId, newParentId: newParentId });
                    existingNodeIds.add(newId);
                    // 🆕 Si ce node a des tables liées (linkedTableIds), l'ajouter à displayNodeIds
                    // pour que le post-processing crée les variables pour afficher les données
                    if (Array.isArray(cloneData.linkedTableIds) && cloneData.linkedTableIds.length > 0) {
                        displayNodeIds.push(newId);
                        console.log("[DEEP-COPY] \uD83D\uDCCA Node ".concat(newId, " ajout\u00E9 \u00E0 displayNodeIds (linkedTableIds: ").concat(cloneData.linkedTableIds.length, ")"));
                    }
                    _z.label = 13;
                case 13:
                    _k++;
                    return [3 /*break*/, 10];
                case 14:
                    _loop_1 = function (oldId, newId, newParentId) {
                        var oldNode, linkedFormulaIdOrder, formulas, formulaMap, sortedFormulas, validLinkedIds, _0, linkedFormulaIdOrder_1, formulaId, formula, unlinkedFormulas, allFormulas, newLinkedFormulaIds, _1, allFormulas_1, f, formulaResult, newFormulaId, referencedNodeIds, error_1, e_3, conditions, linkedConditionIdOrder, copiedNodeIds, conditionMap, sortedConditions, validLinkedConditionIds, _2, linkedConditionIdOrder_1, conditionId, condition, unlinkedConditions, allConditions, newLinkedConditionIds, _3, allConditions_1, c, newConditionId, newSet, existingCondition, referencedNodeIds, refs, _4, refs_1, refId, normalizedRefId, e_4, e_5, updateActiveIds, newConditionActiveId, newFormulaActiveId, e_6, tables, additionalTableIds, _loop_2, _5, _6, linkedTableId, additionalTables, _7, linkedTableIdOrder, sortedTables, unlinkedTables, allTablesToCopy, newLinkedTableIds, _loop_3, _8, allTablesToCopy_1, t, e_7, originalSelectConfig, existingCopyConfig, newTableReference, selectConfigErr_1, originalNumberConfig, existingCopyNumberConfig, numberConfigErr_1;
                        return __generator(this, function (_9) {
                            switch (_9.label) {
                                case 0:
                                    oldNode = byId.get(oldId);
                                    linkedFormulaIdOrder = Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [];
                                    console.log("[DEBUG] Processing node ".concat(oldId, ", linkedFormulaIds order: ").concat(JSON.stringify(linkedFormulaIdOrder)));
                                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: oldId } })];
                                case 1:
                                    formulas = _9.sent();
                                    console.log("[DEBUG] Found ".concat(formulas.length, " formulas for node ").concat(oldId));
                                    formulaMap = new Map(formulas.map(function (f) { return [f.id, f]; }));
                                    sortedFormulas = [];
                                    validLinkedIds = [];
                                    for (_0 = 0, linkedFormulaIdOrder_1 = linkedFormulaIdOrder; _0 < linkedFormulaIdOrder_1.length; _0++) {
                                        formulaId = linkedFormulaIdOrder_1[_0];
                                        formula = formulaMap.get(formulaId);
                                        if (formula) {
                                            sortedFormulas.push(formula);
                                            validLinkedIds.push(formulaId);
                                            formulaMap.delete(formulaId);
                                            console.log("[DEBUG] Added formula ".concat(formula.id, " (").concat(formula.name, ") at position ").concat(sortedFormulas.length - 1));
                                        }
                                        else {
                                            console.warn("[DEBUG] \u26A0\uFE0F  Formula ID ".concat(formulaId, " in linkedFormulaIds not found - skipping"));
                                        }
                                    }
                                    unlinkedFormulas = Array.from(formulaMap.values());
                                    allFormulas = __spreadArray(__spreadArray([], sortedFormulas, true), unlinkedFormulas, true);
                                    console.log("[DEBUG] Final formula order: ".concat(allFormulas.map(function (f) { return f.id; }).join(', ')));
                                    newLinkedFormulaIds = [];
                                    _1 = 0, allFormulas_1 = allFormulas;
                                    _9.label = 2;
                                case 2:
                                    if (!(_1 < allFormulas_1.length)) return [3 /*break*/, 7];
                                    f = allFormulas_1[_1];
                                    _9.label = 3;
                                case 3:
                                    _9.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, (0, copy_capacity_formula_js_1.copyFormulaCapacity)(f.id, newId, suffixNum, prisma, {
                                            formulaIdMap: formulaIdMap,
                                            nodeIdMap: idMap
                                        })];
                                case 4:
                                    formulaResult = _9.sent();
                                    if (formulaResult.success) {
                                        newFormulaId = formulaResult.newFormulaId;
                                        formulaIdMap.set(f.id, newFormulaId);
                                        // 🔑 Ajouter au linkedFormulaIds seulement si c'était lié à l'original
                                        if (validLinkedIds.includes(f.id)) {
                                            newLinkedFormulaIds.push(newFormulaId);
                                            console.log("[DEBUG] Linked formula (centralis\u00E9): ".concat(newFormulaId, " added at position ").concat(newLinkedFormulaIds.length - 1));
                                        }
                                        if (normalizedRepeatContext) {
                                            referencedNodeIds = Array.from((0, shared_helpers_js_1.extractNodeIdsFromTokens)(formulaResult.tokens || f.tokens));
                                            (0, repeat_blueprint_writer_js_1.logCapacityEvent)({
                                                ownerNodeId: newId,
                                                capacityId: newFormulaId,
                                                capacityType: 'formula',
                                                referencedNodeIds: referencedNodeIds,
                                                context: normalizedRepeatContext
                                            });
                                        }
                                    }
                                    else {
                                        console.error("\u274C Erreur copie formule centralis\u00E9e: ".concat(f.id));
                                    }
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_1 = _9.sent();
                                    console.error("\u274C Exception copie formule ".concat(f.id, ":"), error_1);
                                    return [3 /*break*/, 6];
                                case 6:
                                    _1++;
                                    return [3 /*break*/, 2];
                                case 7:
                                    // 🔑 CRITICAL: Ajouter tous les linkedFormulaIds en UNE SEULE OPÉRATION dans le BON ORDRE!
                                    console.log("[DEBUG] Final newLinkedFormulaIds: ".concat(JSON.stringify(newLinkedFormulaIds)));
                                    if (!(newLinkedFormulaIds.length > 0)) return [3 /*break*/, 11];
                                    _9.label = 8;
                                case 8:
                                    _9.trys.push([8, 10, , 11]);
                                    return [4 /*yield*/, (0, shared_helpers_js_1.addToNodeLinkedField)(prisma, newId, 'linkedFormulaIds', newLinkedFormulaIds)];
                                case 9:
                                    _9.sent();
                                    console.log("[DEBUG] Successfully added linkedFormulaIds to node ".concat(newId));
                                    return [3 /*break*/, 11];
                                case 10:
                                    e_3 = _9.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating linkedFormulaIds for node:', e_3.message);
                                    return [3 /*break*/, 11];
                                case 11: return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: oldId } })];
                                case 12:
                                    conditions = _9.sent();
                                    linkedConditionIdOrder = Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [];
                                    copiedNodeIds = new Set(idMap.values());
                                    conditionMap = new Map(conditions.map(function (c) { return [c.id, c]; }));
                                    sortedConditions = [];
                                    validLinkedConditionIds = [];
                                    for (_2 = 0, linkedConditionIdOrder_1 = linkedConditionIdOrder; _2 < linkedConditionIdOrder_1.length; _2++) {
                                        conditionId = linkedConditionIdOrder_1[_2];
                                        condition = conditionMap.get(conditionId);
                                        if (condition) {
                                            sortedConditions.push(condition);
                                            validLinkedConditionIds.push(conditionId);
                                            conditionMap.delete(conditionId);
                                            console.log("[DEBUG] Added condition ".concat(condition.id, " (").concat(condition.name, ") at position ").concat(sortedConditions.length - 1));
                                        }
                                        else {
                                            console.warn("[DEBUG] \u26A0\uFE0F  Condition ID ".concat(conditionId, " in linkedConditionIds not found - skipping"));
                                        }
                                    }
                                    unlinkedConditions = Array.from(conditionMap.values());
                                    allConditions = __spreadArray(__spreadArray([], sortedConditions, true), unlinkedConditions, true);
                                    newLinkedConditionIds = [];
                                    _3 = 0, allConditions_1 = allConditions;
                                    _9.label = 13;
                                case 13:
                                    if (!(_3 < allConditions_1.length)) return [3 /*break*/, 23];
                                    c = allConditions_1[_3];
                                    newConditionId = appendSuffix(c.id);
                                    conditionIdMap.set(c.id, newConditionId);
                                    newSet = replaceIdsInConditionSet(c.conditionSet, idMap, formulaIdMap, conditionIdMap);
                                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                                            where: { id: newConditionId }
                                        })];
                                case 14:
                                    existingCondition = _9.sent();
                                    if (existingCondition) {
                                        // La condition existe déjà - si elle appartient à un autre nœud, c'est OK
                                        // On l'ajoute juste aux linkedConditionIds de ce nœud
                                        console.log("[DEEP-COPY] \u26A0\uFE0F Condition ".concat(newConditionId, " existe d\u00E9j\u00E0 (nodeId: ").concat(existingCondition.nodeId, "), skip cr\u00E9ation"));
                                        // Si elle appartient à ce nœud, parfait. Sinon, on la référence quand même.
                                        if (validLinkedConditionIds.includes(c.id)) {
                                            newLinkedConditionIds.push(newConditionId);
                                        }
                                        return [3 /*break*/, 22];
                                    }
                                    // La condition n'existe pas, on la crée avec le bon nodeId
                                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.create({
                                            data: {
                                                id: newConditionId,
                                                nodeId: newId,
                                                organizationId: c.organizationId,
                                                name: c.name ? "".concat(c.name).concat(computedLabelSuffix) : c.name,
                                                conditionSet: newSet,
                                                description: c.description,
                                                isDefault: c.isDefault,
                                                order: c.order,
                                                createdAt: new Date(),
                                                updatedAt: new Date()
                                            }
                                        })];
                                case 15:
                                    // La condition n'existe pas, on la crée avec le bon nodeId
                                    _9.sent();
                                    console.log("[DEEP-COPY] \u2705 Condition ".concat(newConditionId, " cr\u00E9\u00E9e pour nodeId: ").concat(newId));
                                    // 🔑 Ajouter au linkedConditionIds seulement si c'était lié à l'original (et que l'ID était valide)
                                    if (validLinkedConditionIds.includes(c.id)) {
                                        newLinkedConditionIds.push(newConditionId);
                                    }
                                    if (normalizedRepeatContext) {
                                        referencedNodeIds = Array.from((0, shared_helpers_js_1.extractNodeIdsFromConditionSet)(newSet));
                                        (0, repeat_blueprint_writer_js_1.logCapacityEvent)({
                                            ownerNodeId: newId,
                                            capacityId: newConditionId,
                                            capacityType: 'condition',
                                            referencedNodeIds: referencedNodeIds,
                                            context: normalizedRepeatContext
                                        });
                                    }
                                    _9.label = 16;
                                case 16:
                                    _9.trys.push([16, 21, , 22]);
                                    refs = Array.from((0, shared_helpers_js_1.extractNodeIdsFromConditionSet)(newSet));
                                    _4 = 0, refs_1 = refs;
                                    _9.label = 17;
                                case 17:
                                    if (!(_4 < refs_1.length)) return [3 /*break*/, 20];
                                    refId = refs_1[_4];
                                    normalizedRefId = (0, shared_helpers_js_1.normalizeRefId)(refId);
                                    // Ne pas polluer les templates originaux : lors d'une duplication, on ne met à jour
                                    // que les nœuds copiés (suffixés) présents dans idMap.values().
                                    if (normalizedRepeatContext && !copiedNodeIds.has(normalizedRefId)) {
                                        return [3 /*break*/, 19];
                                    }
                                    return [4 /*yield*/, (0, shared_helpers_js_1.addToNodeLinkedField)(prisma, normalizedRefId, 'linkedConditionIds', [newConditionId])];
                                case 18:
                                    _9.sent();
                                    _9.label = 19;
                                case 19:
                                    _4++;
                                    return [3 /*break*/, 17];
                                case 20: return [3 /*break*/, 22];
                                case 21:
                                    e_4 = _9.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds during deep copy:', e_4.message);
                                    return [3 /*break*/, 22];
                                case 22:
                                    _3++;
                                    return [3 /*break*/, 13];
                                case 23:
                                    if (!(newLinkedConditionIds.length > 0)) return [3 /*break*/, 27];
                                    _9.label = 24;
                                case 24:
                                    _9.trys.push([24, 26, , 27]);
                                    return [4 /*yield*/, (0, shared_helpers_js_1.addToNodeLinkedField)(prisma, newId, 'linkedConditionIds', newLinkedConditionIds)];
                                case 25:
                                    _9.sent();
                                    return [3 /*break*/, 27];
                                case 26:
                                    e_5 = _9.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating linkedConditionIds for node:', e_5.message);
                                    return [3 /*break*/, 27];
                                case 27:
                                    updateActiveIds = {};
                                    if (oldNode.condition_activeId) {
                                        newConditionActiveId = conditionIdMap.get(oldNode.condition_activeId);
                                        if (newConditionActiveId) {
                                            updateActiveIds.condition_activeId = newConditionActiveId;
                                            console.log("[DEEP-COPY] \uD83D\uDD17 condition_activeId remapp\u00E9: ".concat(oldNode.condition_activeId, " \u2192 ").concat(newConditionActiveId));
                                        }
                                    }
                                    if (oldNode.formula_activeId) {
                                        newFormulaActiveId = formulaIdMap.get(oldNode.formula_activeId);
                                        if (newFormulaActiveId) {
                                            updateActiveIds.formula_activeId = newFormulaActiveId;
                                            console.log("[DEEP-COPY] \uD83D\uDD17 formula_activeId remapp\u00E9: ".concat(oldNode.formula_activeId, " \u2192 ").concat(newFormulaActiveId));
                                        }
                                    }
                                    if (!(Object.keys(updateActiveIds).length > 0)) return [3 /*break*/, 31];
                                    _9.label = 28;
                                case 28:
                                    _9.trys.push([28, 30, , 31]);
                                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                                            where: { id: newId },
                                            data: updateActiveIds
                                        })];
                                case 29:
                                    _9.sent();
                                    console.log("[DEEP-COPY] \u2705 ActiveIds mis \u00E0 jour pour ".concat(newId, ":"), updateActiveIds);
                                    return [3 /*break*/, 31];
                                case 30:
                                    e_6 = _9.sent();
                                    console.warn('[DEEP-COPY] ⚠️ Erreur mise à jour activeIds:', e_6.message);
                                    return [3 /*break*/, 31];
                                case 31: return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findMany({
                                        where: { nodeId: oldId },
                                        include: { tableColumns: true, tableRows: true }
                                    })];
                                case 32:
                                    tables = _9.sent();
                                    additionalTableIds = [];
                                    if (source.table_activeId && !tables.some(function (t) { return t.id === source.table_activeId; })) {
                                        additionalTableIds.push(source.table_activeId);
                                    }
                                    // 🆕 CRITIQUE: Aussi copier les tables référencées via linkedTableIds
                                    // Cas typique: "Panneaux max" a linkedTableIds: ["Longueur panneau", "Largeur panneau"]
                                    // Ces tables ont nodeId = Panneaux max, donc déjà incluses dans `tables`
                                    // MAIS si le nodeId de la table est différent (ex: table partagée), on doit l'ajouter
                                    if (Array.isArray(oldNode.linkedTableIds)) {
                                        _loop_2 = function (linkedTableId) {
                                            if (!tables.some(function (t) { return t.id === linkedTableId; }) && !additionalTableIds.includes(linkedTableId)) {
                                                additionalTableIds.push(linkedTableId);
                                            }
                                        };
                                        for (_5 = 0, _6 = oldNode.linkedTableIds; _5 < _6.length; _5++) {
                                            linkedTableId = _6[_5];
                                            _loop_2(linkedTableId);
                                        }
                                    }
                                    if (source.table_activeId && !tables.some(function (t) { return t.id === source.table_activeId; })) {
                                        additionalTableIds.push(source.table_activeId);
                                    }
                                    if (!(additionalTableIds.length > 0)) return [3 /*break*/, 34];
                                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findMany({
                                            where: { id: { in: additionalTableIds } },
                                            include: { tableColumns: true, tableRows: true }
                                        })];
                                case 33:
                                    _7 = _9.sent();
                                    return [3 /*break*/, 35];
                                case 34:
                                    _7 = [];
                                    _9.label = 35;
                                case 35:
                                    additionalTables = _7;
                                    linkedTableIdOrder = Array.isArray(oldNode.linkedTableIds) ? oldNode.linkedTableIds : [];
                                    sortedTables = linkedTableIdOrder
                                        .map(function (id) { return __spreadArray(__spreadArray([], tables, true), additionalTables, true).find(function (t) { return t.id === id; }); })
                                        .filter(function (t) { return t !== undefined; });
                                    unlinkedTables = __spreadArray(__spreadArray([], tables, true), additionalTables, true).filter(function (t) { return !linkedTableIdOrder.includes(t.id); });
                                    allTablesToCopy = __spreadArray(__spreadArray([], sortedTables, true), unlinkedTables, true);
                                    if (additionalTables.length > 0) {
                                        console.log("[DEEP-COPY] \uD83D\uDCCA Tables additionnelles trouv\u00E9es via table_activeId: ".concat(additionalTables.map(function (t) { return t.id; }).join(', ')));
                                    }
                                    newLinkedTableIds = [];
                                    console.log("\n\n\uD83D\uDD34\uD83D\uDD34\uD83D\uDD34 [DEEP-COPY-SERVICE] D\u00C9BUT COPIE TABLES - ".concat(allTablesToCopy.length, " tables \u00E0 copier \uD83D\uDD34\uD83D\uDD34\uD83D\uDD34\n"));
                                    _loop_3 = function (t) {
                                        var newTableId, existingTable;
                                        return __generator(this, function (_10) {
                                            switch (_10.label) {
                                                case 0:
                                                    newTableId = appendSuffix(t.id);
                                                    tableIdMap.set(t.id, newTableId);
                                                    console.log("\uD83D\uDD34 [DEEP-COPY-SERVICE] Traitement table: ".concat(t.id, " -> ").concat(newTableId));
                                                    console.log("\uD83D\uDD34 [DEEP-COPY-SERVICE] META ORIGINAL:", (_y = JSON.stringify(t.meta)) === null || _y === void 0 ? void 0 : _y.substring(0, 200));
                                                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                                                            where: { id: newTableId }
                                                        })];
                                                case 1:
                                                    existingTable = _10.sent();
                                                    if (existingTable) {
                                                        console.log("[DEEP-COPY] \u23E9 Table ".concat(newTableId, " existe d\u00E9j\u00E0, skip"));
                                                        return [2 /*return*/, "continue"];
                                                    }
                                                    console.log("[DEEP-COPY] \uD83D\uDCCA Copie table: ".concat(t.id, " -> ").concat(newTableId, " (source nodeId: ").concat(t.nodeId, ", target nodeId: ").concat(newId, ")"));
                                                    // 🔑 Ajouter au linkedTableIds seulement si c'était lié à l'original
                                                    if (linkedTableIdOrder.includes(t.id)) {
                                                        newLinkedTableIds.push(newTableId);
                                                    }
                                                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.create({
                                                            data: {
                                                                id: newTableId,
                                                                nodeId: newId,
                                                                organizationId: t.organizationId,
                                                                name: t.name ? "".concat(t.name).concat(computedLabelSuffix) : t.name,
                                                                description: t.description,
                                                                type: t.type,
                                                                rowCount: t.rowCount,
                                                                columnCount: t.columnCount,
                                                                // 🔧 TRAITER LE meta: suffix les références aux nodes ET comparisonColumn
                                                                meta: (function () {
                                                                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _o;
                                                                    if (!t.meta) {
                                                                        return t.meta;
                                                                    }
                                                                    try {
                                                                        var metaObj = typeof t.meta === 'string' ? JSON.parse(t.meta) : JSON.parse(JSON.stringify(t.meta));
                                                                        console.log("[table.meta] \uD83D\uDD0D AVANT traitement:", JSON.stringify(metaObj).substring(0, 300));
                                                                        // 🔢 COPIE TABLE META: suffixer TOUS les champs dans lookup
                                                                        // Suffixer les UUIDs dans selectors
                                                                        if (((_b = (_a = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _a === void 0 ? void 0 : _a.selectors) === null || _b === void 0 ? void 0 : _b.columnFieldId) && !metaObj.lookup.selectors.columnFieldId.endsWith("-".concat(copySuffixNum))) {
                                                                            console.log("[table.meta] columnFieldId: ".concat(metaObj.lookup.selectors.columnFieldId, " \u2192 ").concat(metaObj.lookup.selectors.columnFieldId, "-").concat(copySuffixNum));
                                                                            metaObj.lookup.selectors.columnFieldId = "".concat(metaObj.lookup.selectors.columnFieldId, "-").concat(copySuffixNum);
                                                                        }
                                                                        if (((_d = (_c = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _c === void 0 ? void 0 : _c.selectors) === null || _d === void 0 ? void 0 : _d.rowFieldId) && !metaObj.lookup.selectors.rowFieldId.endsWith("-".concat(copySuffixNum))) {
                                                                            metaObj.lookup.selectors.rowFieldId = "".concat(metaObj.lookup.selectors.rowFieldId, "-").concat(copySuffixNum);
                                                                        }
                                                                        // Suffixer sourceField
                                                                        if (((_f = (_e = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _e === void 0 ? void 0 : _e.rowSourceOption) === null || _f === void 0 ? void 0 : _f.sourceField) && !metaObj.lookup.rowSourceOption.sourceField.endsWith("-".concat(copySuffixNum))) {
                                                                            metaObj.lookup.rowSourceOption.sourceField = "".concat(metaObj.lookup.rowSourceOption.sourceField, "-").concat(copySuffixNum);
                                                                        }
                                                                        if (((_h = (_g = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _g === void 0 ? void 0 : _g.columnSourceOption) === null || _h === void 0 ? void 0 : _h.sourceField) && !metaObj.lookup.columnSourceOption.sourceField.endsWith("-".concat(copySuffixNum))) {
                                                                            metaObj.lookup.columnSourceOption.sourceField = "".concat(metaObj.lookup.columnSourceOption.sourceField, "-").concat(copySuffixNum);
                                                                        }
                                                                        // Suffixer comparisonColumn si c'est du texte
                                                                        if ((_k = (_j = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _j === void 0 ? void 0 : _j.rowSourceOption) === null || _k === void 0 ? void 0 : _k.comparisonColumn) {
                                                                            var val = metaObj.lookup.rowSourceOption.comparisonColumn;
                                                                            if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(computedLabelSuffix)) {
                                                                                metaObj.lookup.rowSourceOption.comparisonColumn = "".concat(val).concat(computedLabelSuffix);
                                                                            }
                                                                        }
                                                                        if ((_o = (_l = metaObj === null || metaObj === void 0 ? void 0 : metaObj.lookup) === null || _l === void 0 ? void 0 : _l.columnSourceOption) === null || _o === void 0 ? void 0 : _o.comparisonColumn) {
                                                                            var val = metaObj.lookup.columnSourceOption.comparisonColumn;
                                                                            if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith(computedLabelSuffix)) {
                                                                                metaObj.lookup.columnSourceOption.comparisonColumn = "".concat(val).concat(computedLabelSuffix);
                                                                            }
                                                                        }
                                                                        console.log("[table.meta] \u2705 APR\u00C8S traitement:", JSON.stringify(metaObj).substring(0, 300));
                                                                        return metaObj;
                                                                    }
                                                                    catch (err) {
                                                                        console.warn('[table.meta] Erreur traitement meta, copie tel quel:', err);
                                                                        return t.meta;
                                                                    }
                                                                })(),
                                                                isDefault: t.isDefault,
                                                                order: t.order,
                                                                createdAt: new Date(),
                                                                updatedAt: new Date(),
                                                                lookupDisplayColumns: t.lookupDisplayColumns,
                                                                lookupSelectColumn: t.lookupSelectColumn,
                                                                tableColumns: {
                                                                    create: t.tableColumns.map(function (col) { return ({
                                                                        id: appendSuffix(col.id),
                                                                        columnIndex: col.columnIndex,
                                                                        // 🔢 COPIE TABLE COLUMN: suffixe seulement pour texte, pas pour nombres
                                                                        name: col.name
                                                                            ? (/^-?\d+(\.\d+)?$/.test(col.name.trim()) ? col.name : "".concat(col.name).concat(computedLabelSuffix))
                                                                            : col.name,
                                                                        type: col.type,
                                                                        width: col.width,
                                                                        format: col.format,
                                                                        metadata: col.metadata
                                                                    }); })
                                                                },
                                                                tableRows: {
                                                                    create: t.tableRows.map(function (row) { return ({
                                                                        id: appendSuffix(row.id),
                                                                        rowIndex: row.rowIndex,
                                                                        cells: row.cells
                                                                    }); })
                                                                }
                                                            }
                                                        })];
                                                case 2:
                                                    _10.sent();
                                                    if (normalizedRepeatContext) {
                                                        (0, repeat_blueprint_writer_js_1.logCapacityEvent)({
                                                            ownerNodeId: newId,
                                                            capacityId: newTableId,
                                                            capacityType: 'table',
                                                            referencedNodeIds: undefined,
                                                            context: normalizedRepeatContext
                                                        });
                                                    }
                                                    return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _8 = 0, allTablesToCopy_1 = allTablesToCopy;
                                    _9.label = 36;
                                case 36:
                                    if (!(_8 < allTablesToCopy_1.length)) return [3 /*break*/, 39];
                                    t = allTablesToCopy_1[_8];
                                    return [5 /*yield**/, _loop_3(t)];
                                case 37:
                                    _9.sent();
                                    _9.label = 38;
                                case 38:
                                    _8++;
                                    return [3 /*break*/, 36];
                                case 39:
                                    if (!(newLinkedTableIds.length > 0)) return [3 /*break*/, 43];
                                    _9.label = 40;
                                case 40:
                                    _9.trys.push([40, 42, , 43]);
                                    return [4 /*yield*/, (0, shared_helpers_js_1.addToNodeLinkedField)(prisma, newId, 'linkedTableIds', newLinkedTableIds)];
                                case 41:
                                    _9.sent();
                                    return [3 /*break*/, 43];
                                case 42:
                                    e_7 = _9.sent();
                                    console.warn('[TreeBranchLeaf API] Warning updating linkedTableIds for node:', e_7.message);
                                    return [3 /*break*/, 43];
                                case 43: return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findUnique({
                                        where: { nodeId: oldId }
                                    })];
                                case 44:
                                    originalSelectConfig = _9.sent();
                                    if (!originalSelectConfig) return [3 /*break*/, 51];
                                    return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findUnique({
                                            where: { nodeId: newId }
                                        })];
                                case 45:
                                    existingCopyConfig = _9.sent();
                                    if (!!existingCopyConfig) return [3 /*break*/, 50];
                                    newTableReference = originalSelectConfig.tableReference
                                        ? appendSuffix(originalSelectConfig.tableReference)
                                        : null;
                                    console.log("[DEEP-COPY] \uD83D\uDCCA Duplication SELECT config: ".concat(oldId, " -> ").concat(newId, " (tableRef: ").concat(newTableReference, ")"));
                                    _9.label = 46;
                                case 46:
                                    _9.trys.push([46, 48, , 49]);
                                    return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.create({
                                            data: {
                                                id: appendSuffix(originalSelectConfig.id),
                                                nodeId: newId,
                                                options: originalSelectConfig.options,
                                                multiple: originalSelectConfig.multiple,
                                                searchable: originalSelectConfig.searchable,
                                                allowCustom: originalSelectConfig.allowCustom,
                                                maxSelections: originalSelectConfig.maxSelections,
                                                optionsSource: originalSelectConfig.optionsSource,
                                                apiEndpoint: originalSelectConfig.apiEndpoint,
                                                tableReference: newTableReference,
                                                dependsOnNodeId: originalSelectConfig.dependsOnNodeId
                                                    ? (idMap.get(originalSelectConfig.dependsOnNodeId) || appendSuffix(originalSelectConfig.dependsOnNodeId))
                                                    : null,
                                                keyColumn: originalSelectConfig.keyColumn
                                                    ? "".concat(originalSelectConfig.keyColumn).concat(computedLabelSuffix)
                                                    : null,
                                                valueColumn: originalSelectConfig.valueColumn
                                                    ? "".concat(originalSelectConfig.valueColumn).concat(computedLabelSuffix)
                                                    : null,
                                                displayColumn: originalSelectConfig.displayColumn
                                                    ? "".concat(originalSelectConfig.displayColumn).concat(computedLabelSuffix)
                                                    : null,
                                                displayRow: originalSelectConfig.displayRow,
                                                keyRow: originalSelectConfig.keyRow,
                                                valueRow: originalSelectConfig.valueRow,
                                                createdAt: new Date(),
                                                updatedAt: new Date()
                                            }
                                        })];
                                case 47:
                                    _9.sent();
                                    console.log("[DEEP-COPY] \u2705 SELECT config cr\u00E9\u00E9e pour ".concat(newId));
                                    return [3 /*break*/, 49];
                                case 48:
                                    selectConfigErr_1 = _9.sent();
                                    console.warn("[DEEP-COPY] \u26A0\uFE0F Erreur cr\u00E9ation SELECT config pour ".concat(newId, ":"), selectConfigErr_1.message);
                                    return [3 /*break*/, 49];
                                case 49: return [3 /*break*/, 51];
                                case 50:
                                    console.log("[DEEP-COPY] \u267B\uFE0F SELECT config existe d\u00E9j\u00E0 pour ".concat(newId));
                                    _9.label = 51;
                                case 51: return [4 /*yield*/, prisma.treeBranchLeafNumberConfig.findUnique({
                                        where: { nodeId: oldId }
                                    })];
                                case 52:
                                    originalNumberConfig = _9.sent();
                                    if (!originalNumberConfig) return [3 /*break*/, 57];
                                    return [4 /*yield*/, prisma.treeBranchLeafNumberConfig.findUnique({
                                            where: { nodeId: newId }
                                        })];
                                case 53:
                                    existingCopyNumberConfig = _9.sent();
                                    if (!!existingCopyNumberConfig) return [3 /*break*/, 57];
                                    console.log("[DEEP-COPY] \uD83D\uDD22 Duplication NUMBER config: ".concat(oldId, " -> ").concat(newId));
                                    _9.label = 54;
                                case 54:
                                    _9.trys.push([54, 56, , 57]);
                                    return [4 /*yield*/, prisma.treeBranchLeafNumberConfig.create({
                                            data: {
                                                id: appendSuffix(originalNumberConfig.id),
                                                nodeId: newId,
                                                min: originalNumberConfig.min,
                                                max: originalNumberConfig.max,
                                                decimals: originalNumberConfig.decimals,
                                                step: originalNumberConfig.step,
                                                unit: originalNumberConfig.unit,
                                                prefix: originalNumberConfig.prefix
                                            }
                                        })];
                                case 55:
                                    _9.sent();
                                    console.log("[DEEP-COPY] \u2705 NUMBER config cr\u00E9\u00E9e pour ".concat(newId));
                                    return [3 /*break*/, 57];
                                case 56:
                                    numberConfigErr_1 = _9.sent();
                                    console.warn("[DEEP-COPY] \u26A0\uFE0F Erreur cr\u00E9ation NUMBER config pour ".concat(newId, ":"), numberConfigErr_1.message);
                                    return [3 /*break*/, 57];
                                case 57: return [2 /*return*/];
                            }
                        });
                    };
                    _l = 0, createdNodes_1 = createdNodes;
                    _z.label = 15;
                case 15:
                    if (!(_l < createdNodes_1.length)) return [3 /*break*/, 18];
                    _o = createdNodes_1[_l], oldId = _o.oldId, newId = _o.newId, newParentId = _o.newParentId;
                    return [5 /*yield**/, _loop_1(oldId, newId, newParentId)];
                case 16:
                    _z.sent();
                    _z.label = 17;
                case 17:
                    _l++;
                    return [3 /*break*/, 15];
                case 18:
                    variableCopyCache = new Map();
                    _p = 0, toCopy_2 = toCopy;
                    _z.label = 19;
                case 19:
                    if (!(_p < toCopy_2.length)) return [3 /*break*/, 32];
                    oldNodeId = toCopy_2[_p];
                    newNodeId = idMap.get(oldNodeId);
                    oldNode = byId.get(oldNodeId);
                    newLinkedFormulaIds = (Array.isArray(oldNode.linkedFormulaIds) ? oldNode.linkedFormulaIds : [])
                        .map(function (id) {
                        var mappedId = formulaIdMap.get(id);
                        if (mappedId)
                            return mappedId;
                        var ensured = ensureSuffix(id);
                        return ensured || appendSuffix(id);
                    })
                        .filter(Boolean);
                    newLinkedConditionIds = (Array.isArray(oldNode.linkedConditionIds) ? oldNode.linkedConditionIds : [])
                        .map(function (id) {
                        var mappedId = conditionIdMap.get(id);
                        if (mappedId)
                            return mappedId;
                        var ensured = ensureSuffix(id);
                        return ensured || appendSuffix(id);
                    })
                        .filter(Boolean);
                    newLinkedTableIds = (Array.isArray(oldNode.linkedTableIds) ? oldNode.linkedTableIds : [])
                        .map(function (id) {
                        var mappedId = tableIdMap.get(id);
                        if (mappedId)
                            return mappedId;
                        var ensured = ensureSuffix(id);
                        return ensured || appendSuffix(id);
                    })
                        .filter(Boolean);
                    sourceLinkedVariableIds = new Set();
                    console.log("\n\uD83D\uDD37\uD83D\uDD37\uD83D\uDD37 [LINKED_VARS] Traitement n\u0153ud ".concat(oldNodeId, " -> ").concat(newNodeId));
                    console.log("\uD83D\uDD37 [LINKED_VARS] oldNode.linkedVariableIds = ".concat(JSON.stringify(oldNode.linkedVariableIds)));
                    if (Array.isArray(oldNode.linkedVariableIds)) {
                        for (_q = 0, _r = oldNode.linkedVariableIds; _q < _r.length; _q++) {
                            rawId = _r[_q];
                            if (typeof rawId === 'string') {
                                normalized = rawId.trim();
                                if (normalized) {
                                    baseId = stripNumericSuffix(normalized);
                                    sourceLinkedVariableIds.add(baseId || normalized);
                                    console.log("\uD83D\uDD37 [LINKED_VARS] Ajout\u00E9: ".concat(baseId || normalized, " (depuis: ").concat(rawId, ")"));
                                }
                            }
                        }
                    }
                    directVarIds = directVariableIdByNodeId.get(oldNodeId);
                    if (directVarIds && directVarIds.size > 0) {
                        for (_s = 0, directVarIds_1 = directVarIds; _s < directVarIds_1.length; _s++) {
                            directVarIdForNode = directVarIds_1[_s];
                            baseId = stripNumericSuffix(directVarIdForNode);
                            sourceLinkedVariableIds.add(baseId || directVarIdForNode);
                        }
                    }
                    // ⚠️ CRITIQUE: On copie les variables pour créer les display nodes
                    // MAIS on ne met PAS à jour linkedVariableIds après !
                    // Le linkedVariableIds reste celui du template original (copié automatiquement)
                    console.log("\uD83D\uDD37 [LINKED_VARS] sourceLinkedVariableIds.size = ".concat(sourceLinkedVariableIds.size));
                    console.log("\uD83D\uDD37 [LINKED_VARS] Contenu: ".concat(JSON.stringify(__spreadArray([], sourceLinkedVariableIds, true))));
                    if (!(sourceLinkedVariableIds.size > 0)) return [3 /*break*/, 27];
                    console.log("\uD83D\uDD37 [LINKED_VARS] \u2705 Entr\u00E9e dans la boucle de copie de variables!");
                    _t = 0, sourceLinkedVariableIds_1 = sourceLinkedVariableIds;
                    _z.label = 20;
                case 20:
                    if (!(_t < sourceLinkedVariableIds_1.length)) return [3 /*break*/, 27];
                    linkedVarId = sourceLinkedVariableIds_1[_t];
                    console.log("\uD83D\uDD37 [LINKED_VARS] Traitement variable: ".concat(linkedVarId));
                    isSharedRef = linkedVarId.startsWith('shared-ref-');
                    if (!!isSharedRef) return [3 /*break*/, 25];
                    _z.label = 21;
                case 21:
                    _z.trys.push([21, 23, , 24]);
                    console.log("\uD83D\uDD37 [LINKED_VARS] \uD83D\uDCDE Appel copyVariableWithCapacities(".concat(linkedVarId, ", ").concat(suffixToken, ", ").concat(newNodeId, ")"));
                    return [4 /*yield*/, (0, variable_copy_engine_js_1.copyVariableWithCapacities)(linkedVarId, suffixToken, newNodeId, prisma, {
                            formulaIdMap: formulaIdMap,
                            conditionIdMap: conditionIdMap,
                            tableIdMap: tableIdMap,
                            nodeIdMap: idMap,
                            variableCopyCache: variableCopyCache,
                            autoCreateDisplayNode: true,
                            displayNodeAlreadyCreated: false,
                            displayParentId: newNodeId, // 🔧 FIX: Le parent doit être le nœud copié (pas son parent)
                            isFromRepeaterDuplication: isFromRepeaterDuplication,
                            repeatContext: normalizedRepeatContext
                        })];
                case 22:
                    copyResult = _z.sent();
                    console.log("\uD83D\uDD37 [LINKED_VARS] \uD83D\uDCE4 R\u00E9sultat copyVariableWithCapacities: success=".concat(copyResult.success, ", displayNodeId=").concat(copyResult.displayNodeId));
                    if (copyResult.success && copyResult.displayNodeId) {
                        displayNodeIds.push(copyResult.displayNodeId);
                        console.log("\uD83D\uDD37 [LINKED_VARS] \u2705 Display node ajout\u00E9: ".concat(copyResult.displayNodeId));
                    }
                    else {
                        console.log("\uD83D\uDD37 [LINKED_VARS] \u26A0\uFE0F Pas de display node cr\u00E9\u00E9! error=".concat(copyResult.error));
                    }
                    return [3 /*break*/, 24];
                case 23:
                    e_1 = _z.sent();
                    console.warn("[DEEP-COPY] Erreur copie variable ".concat(linkedVarId, ":"), e_1.message);
                    return [3 /*break*/, 24];
                case 24: return [3 /*break*/, 26];
                case 25:
                    console.log("\uD83D\uDD37 [LINKED_VARS] \u23ED\uFE0F Variable ignor\u00E9e (shared-ref): ".concat(linkedVarId));
                    _z.label = 26;
                case 26:
                    _t++;
                    return [3 /*break*/, 20];
                case 27:
                    if (!(newLinkedFormulaIds.length > 0 ||
                        newLinkedConditionIds.length > 0 ||
                        newLinkedTableIds.length > 0)) return [3 /*break*/, 31];
                    _z.label = 28;
                case 28:
                    _z.trys.push([28, 30, , 31]);
                    // ⚠️ CRITIQUE: Ne PAS mettre à jour linkedVariableIds !
                    // Il est copié automatiquement et doit rester intact
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: newNodeId },
                            data: {
                                linkedFormulaIds: newLinkedFormulaIds.length > 0 ? { set: newLinkedFormulaIds } : { set: [] },
                                linkedConditionIds: newLinkedConditionIds.length > 0 ? { set: newLinkedConditionIds } : { set: [] },
                                linkedTableIds: newLinkedTableIds.length > 0 ? { set: newLinkedTableIds } : { set: [] }
                                // linkedVariableIds: SUPPRIMÉ - ne doit PAS être mis à jour !
                            }
                        })];
                case 29:
                    // ⚠️ CRITIQUE: Ne PAS mettre à jour linkedVariableIds !
                    // Il est copié automatiquement et doit rester intact
                    _z.sent();
                    return [3 /*break*/, 31];
                case 30:
                    e_2 = _z.sent();
                    console.warn('[DEEP-COPY] Erreur lors du UPDATE des linked***', e_2.message);
                    return [3 /*break*/, 31];
                case 31:
                    _p++;
                    return [3 /*break*/, 19];
                case 32:
                    rootNewId = idMap.get(source.id);
                    if (!(displayNodeIds.length > 0)) return [3 /*break*/, 41];
                    console.log("[DEEP-COPY] \uD83D\uDD27 Cr\u00E9ation variables pour ".concat(displayNodeIds.length, " noeuds avec linkedTableIds"));
                    _u = 0, displayNodeIds_1 = displayNodeIds;
                    _z.label = 33;
                case 33:
                    if (!(_u < displayNodeIds_1.length)) return [3 /*break*/, 41];
                    nodeId_1 = displayNodeIds_1[_u];
                    _z.label = 34;
                case 34:
                    _z.trys.push([34, 39, , 40]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId_1 },
                            select: { id: true, label: true, field_label: true, linkedTableIds: true }
                        })];
                case 35:
                    copiedNode = _z.sent();
                    if (!copiedNode || !copiedNode.linkedTableIds || copiedNode.linkedTableIds.length === 0) {
                        return [3 /*break*/, 40];
                    }
                    originalNodeId = nodeId_1.replace(/-\d+$/, '');
                    console.log("[DEEP-COPY] \uD83D\uDD0D Recherche variable pour noeud original ".concat(originalNodeId));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findFirst({
                            where: { nodeId: originalNodeId }
                        })];
                case 36:
                    originalVar = _z.sent();
                    if (!originalVar) {
                        console.warn("[DEEP-COPY] \u26A0\uFE0F Variable originale non trouv\u00E9e pour noeud ".concat(originalNodeId));
                        return [3 /*break*/, 40];
                    }
                    console.log("[DEEP-COPY] \u2705 Variable originale trouv\u00E9e: ".concat(originalVar.id, " (").concat(originalVar.exposedKey, ")"));
                    newVarId = appendSuffix(originalVar.id);
                    newExposedKey = appendSuffix(originalVar.exposedKey);
                    console.log("[DEEP-COPY] \uD83D\uDD27 Cr\u00E9ation variable ".concat(newVarId, " avec nodeId=").concat(nodeId_1));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.create({
                            data: {
                                id: newVarId,
                                nodeId: nodeId_1,
                                exposedKey: newExposedKey,
                                displayName: copiedNode.label || copiedNode.field_label || originalVar.displayName,
                                displayFormat: originalVar.displayFormat,
                                precision: originalVar.precision,
                                unit: originalVar.unit,
                                visibleToUser: originalVar.visibleToUser,
                                isReadonly: originalVar.isReadonly,
                                defaultValue: originalVar.defaultValue,
                                metadata: originalVar.metadata || {},
                                fixedValue: originalVar.fixedValue,
                                selectedNodeId: originalVar.selectedNodeId,
                                sourceRef: originalVar.sourceRef,
                                sourceType: originalVar.sourceType,
                                updatedAt: new Date()
                            }
                        })];
                case 37:
                    _z.sent();
                    // Synchroniser data_activeId + linkedVariableIds sur le noeud copié
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: nodeId_1 },
                            data: {
                                hasData: true,
                                data_activeId: newVarId,
                                data_exposedKey: newExposedKey,
                                data_displayFormat: originalVar.displayFormat,
                                data_precision: originalVar.precision,
                                data_unit: originalVar.unit,
                                data_visibleToUser: originalVar.visibleToUser,
                                // linkedVariableIds doit contenir la variable copiée (suffixée)
                                linkedVariableIds: { set: [newVarId] }
                            }
                        })];
                case 38:
                    // Synchroniser data_activeId + linkedVariableIds sur le noeud copié
                    _z.sent();
                    console.log("[DEEP-COPY] \u2705 Variable ".concat(newVarId, " cr\u00E9\u00E9e et ").concat(nodeId_1, " synchronis\u00E9"));
                    return [3 /*break*/, 40];
                case 39:
                    varError_1 = _z.sent();
                    console.error("[DEEP-COPY] \u274C Erreur cr\u00E9ation variable pour ".concat(nodeId_1, ":"), varError_1);
                    return [3 /*break*/, 40];
                case 40:
                    _u++;
                    return [3 /*break*/, 33];
                case 41:
                    _z.trys.push([41, 49, , 50]);
                    newNodeIds = Array.from(idMap.values());
                    if (!(newNodeIds.length > 0)) return [3 /*break*/, 48];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                            where: { nodeId: { in: newNodeIds } },
                            select: {
                                nodeId: true,
                                id: true,
                                exposedKey: true,
                                displayFormat: true,
                                precision: true,
                                unit: true,
                                visibleToUser: true,
                                displayName: true
                            }
                        })];
                case 42:
                    copiedVariables = _z.sent();
                    _v = 0, copiedVariables_1 = copiedVariables;
                    _z.label = 43;
                case 43:
                    if (!(_v < copiedVariables_1.length)) return [3 /*break*/, 48];
                    variable = copiedVariables_1[_v];
                    _z.label = 44;
                case 44:
                    _z.trys.push([44, 46, , 47]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.updateMany({
                            where: {
                                id: variable.nodeId,
                                OR: [{ data_activeId: null }, { hasData: false }]
                            },
                            data: {
                                hasData: true,
                                data_activeId: variable.id,
                                data_exposedKey: variable.exposedKey,
                                data_displayFormat: variable.displayFormat,
                                data_precision: variable.precision,
                                data_unit: variable.unit,
                                data_visibleToUser: variable.visibleToUser,
                                label: variable.displayName || undefined,
                                field_label: variable.displayName || undefined
                            }
                        })];
                case 45:
                    _z.sent();
                    return [3 /*break*/, 47];
                case 46:
                    syncError_1 = _z.sent();
                    console.warn('[DEEP-COPY] Post-copy data sync failed for node', variable.nodeId, syncError_1.message);
                    return [3 /*break*/, 47];
                case 47:
                    _v++;
                    return [3 /*break*/, 43];
                case 48: return [3 /*break*/, 50];
                case 49:
                    syncPassThroughError_1 = _z.sent();
                    console.warn('[DEEP-COPY] Post-copy data sync skipped:', syncPassThroughError_1.message);
                    return [3 /*break*/, 50];
                case 50: return [2 /*return*/, {
                        root: { oldId: source.id, newId: rootNewId },
                        idMap: Object.fromEntries(idMap),
                        formulaIdMap: Object.fromEntries(formulaIdMap),
                        conditionIdMap: Object.fromEntries(conditionIdMap),
                        tableIdMap: Object.fromEntries(tableIdMap),
                        displayNodeIds: displayNodeIds
                    }];
            }
        });
    });
}

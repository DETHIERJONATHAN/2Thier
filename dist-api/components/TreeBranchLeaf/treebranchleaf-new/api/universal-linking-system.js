"use strict";
/**
 * 🔗 SYSTÈME UNIVERSEL DE LIAISON AUTOMATIQUE
 *
 * CE FICHIER EST LA SOURCE DE VÉRITÉ POUR TOUTES LES LIAISONS BIDIRECTIONNELLES
 *
 * PRINCIPE :
 * ---------
 * Quand une capacité (condition/formule/table) est créée/copiée :
 * 1. On extrait TOUS les nodeIds utilisés dans la capacité
 * 2. On met automatiquement l'ID de la capacité dans linkedXXXIds de CHAQUE nœud
 *
 * Quand une variable charge une capacité :
 * 1. On extrait TOUS les nodeIds de la capacité
 * 2. On met l'ID de la variable dans linkedVariableIds de CHAQUE nœud
 *
 * C'EST OBLIGATOIRE ET AUTOMATIQUE - AUCUNE EXCEPTION !
 *
 * @author DETHIER Jonathan
 * @version 2.0.0 - SYSTÈME COMPLET ET OBLIGATOIRE
 */
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
exports.extractNodeIdsFromCondition = extractNodeIdsFromCondition;
exports.extractNodeIdsFromFormula = extractNodeIdsFromFormula;
exports.extractNodeIdsFromTable = extractNodeIdsFromTable;
exports.addToNodeLinkedField = addToNodeLinkedField;
exports.removeFromNodeLinkedField = removeFromNodeLinkedField;
exports.linkConditionToAllNodes = linkConditionToAllNodes;
exports.linkFormulaToAllNodes = linkFormulaToAllNodes;
exports.linkTableToAllNodes = linkTableToAllNodes;
exports.linkVariableToAllCapacityNodes = linkVariableToAllCapacityNodes;
exports.unlinkCapacityFromAllNodes = unlinkCapacityFromAllNodes;
exports.unlinkVariableFromAllNodes = unlinkVariableFromAllNodes;
function normalizeCapacityRef(raw) {
    var trim = raw.trim();
    var lower = trim.toLowerCase();
    var takeId = function (s, prefix) { return s.slice(prefix.length); };
    if (lower.startsWith('condition:')) {
        var id = takeId(trim, 'condition:');
        return { type: 'condition', id: id, canonical: "condition:".concat(id) };
    }
    if (lower.startsWith('node-condition:')) {
        var id = takeId(trim, 'node-condition:');
        return { type: 'condition', id: id, canonical: "condition:".concat(id) };
    }
    if (lower.startsWith('formula:')) {
        var id = takeId(trim, 'formula:');
        return { type: 'formula', id: id, canonical: "formula:".concat(id) };
    }
    if (lower.startsWith('node-formula:')) {
        var id = takeId(trim, 'node-formula:');
        return { type: 'formula', id: id, canonical: "formula:".concat(id) };
    }
    if (lower.startsWith('table:')) {
        var id = takeId(trim, 'table:');
        return { type: 'table', id: id, canonical: "table:".concat(id) };
    }
    if (lower.startsWith('table.')) {
        var id = takeId(trim, 'table.');
        return { type: 'table', id: id, canonical: "table:".concat(id) };
    }
    if (lower.startsWith('@table.')) {
        var id = takeId(trim, '@table.');
        return { type: 'table', id: id, canonical: "table:".concat(id) };
    }
    if (lower.startsWith('@table:')) {
        var id = takeId(trim, '@table:');
        return { type: 'table', id: id, canonical: "table:".concat(id) };
    }
    if (lower.startsWith('node-table:')) {
        var id = takeId(trim, 'node-table:');
        return { type: 'table', id: id, canonical: "table:".concat(id) };
    }
    return { type: 'unknown', id: trim, canonical: trim };
}
function extractCapacityRefsFromString(str) {
    var refs = new Set();
    var regex = /(condition:[a-f0-9-]+|node-condition:[a-f0-9-]+|formula:[a-f0-9-]+|node-formula:[a-f0-9-]+|table:[a-z0-9-]+|table\.[a-z0-9-]+|@table\.[a-z0-9-]+|@table:[a-z0-9-]+|node-table:[a-z0-9-]+)/gi;
    var m;
    while ((m = regex.exec(str)) !== null) {
        refs.add(m[1]);
    }
    return refs;
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔍 EXTRACTION DES NODE IDS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Extrait TOUS les nodeIds d'un conditionSet
 */
function extractNodeIdsFromCondition(conditionSet) {
    var ids = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return ids;
    var str = JSON.stringify(conditionSet);
    // Pattern 1: @value.<uuid> ou @calculated.<uuid> ou @select.<uuid> AVEC suffixe optionnel
    var uuidRegex = /@(?:value|calculated|select)\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    var match;
    while ((match = uuidRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    // Pattern 2: @value.node_xxx
    var nodeRegex = /@value\.(node_[a-z0-9_-]+)/gi;
    while ((match = nodeRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    // Pattern 3: @value.shared-ref-xxx avec suffixe optionnel
    var sharedRefRegex = /@(?:value|calculated|select)\.(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((match = sharedRefRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    // Pattern 4: nodeIds dans les actions
    var obj = conditionSet;
    var extractFromActions = function (actions) {
        if (!Array.isArray(actions))
            return;
        for (var _i = 0, actions_1 = actions; _i < actions_1.length; _i++) {
            var action = actions_1[_i];
            if (Array.isArray(action.nodeIds)) {
                for (var _a = 0, _b = action.nodeIds; _a < _b.length; _a++) {
                    var nodeId = _b[_a];
                    if (typeof nodeId === 'string') {
                        // Nettoyer les préfixes si présents
                        var cleanId = nodeId
                            .replace(/^condition:/, '')
                            .replace(/^node-formula:/, '')
                            .replace(/^node-condition:/, '')
                            .replace(/^table:/, '');
                        if (cleanId && cleanId !== nodeId) {
                            // Si c'était une référence à une autre capacité, on ne l'ajoute pas
                            // car ce n'est pas un vrai nodeId de champ
                            continue;
                        }
                        ids.add(nodeId);
                    }
                }
            }
        }
    };
    if (Array.isArray(obj.branches)) {
        for (var _i = 0, _a = obj.branches; _i < _a.length; _i++) {
            var branch = _a[_i];
            if (Array.isArray(branch.actions)) {
                extractFromActions(branch.actions);
            }
        }
    }
    if (obj.fallback && Array.isArray(obj.fallback.actions)) {
        extractFromActions(obj.fallback.actions);
    }
    // Fallback: scanner tout le JSON pour des UUID/node_/shared-ref nus (au cas où le @value. est absent)
    // 🔧 FIX: Capturer les suffixes numériques (-1, -2, etc.)
    var genericUuid = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    while ((match = genericUuid.exec(str)) !== null) {
        ids.add(match[1]);
    }
    var genericNode = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
    while ((match = genericNode.exec(str)) !== null) {
        ids.add(match[1]);
    }
    var genericShared = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((match = genericShared.exec(str)) !== null) {
        ids.add(match[1]);
    }
    return ids;
}
function extractNodeAndCapacityRefsFromCondition(conditionSet) {
    var nodeIds = new Set();
    var capacityRefs = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return { nodeIds: nodeIds, capacityRefs: capacityRefs };
    var str = JSON.stringify(conditionSet);
    // Patterns @value.* @calculated.* @select.* AVEC suffixes
    var uuidRegex = /@(?:value|calculated|select)\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    var match;
    while ((match = uuidRegex.exec(str)) !== null)
        nodeIds.add(match[1]);
    var nodeRegex = /@(?:value|calculated|select)\.(node_[a-z0-9_-]+(?:-\d+)?)/gi;
    while ((match = nodeRegex.exec(str)) !== null)
        nodeIds.add(match[1]);
    var sharedRefRegex = /@(?:value|calculated|select)\.(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((match = sharedRefRegex.exec(str)) !== null)
        nodeIds.add(match[1]);
    var obj = conditionSet;
    var extractFromActions = function (actions) {
        if (!Array.isArray(actions))
            return;
        for (var _i = 0, actions_2 = actions; _i < actions_2.length; _i++) {
            var action = actions_2[_i];
            if (Array.isArray(action.nodeIds)) {
                for (var _a = 0, _b = action.nodeIds; _a < _b.length; _a++) {
                    var nodeId = _b[_a];
                    if (typeof nodeId !== 'string')
                        continue;
                    var normalized = normalizeCapacityRef(nodeId);
                    if (normalized.type === 'unknown') {
                        nodeIds.add(nodeId);
                    }
                    else {
                        capacityRefs.add(normalized.canonical);
                    }
                }
            }
        }
    };
    if (Array.isArray(obj.branches)) {
        for (var _i = 0, _a = obj.branches; _i < _a.length; _i++) {
            var branch = _a[_i];
            if (Array.isArray(branch.actions))
                extractFromActions(branch.actions);
        }
    }
    if (obj.fallback && Array.isArray(obj.fallback.actions)) {
        extractFromActions(obj.fallback.actions);
    }
    // Generic scans (UUID/node/shared) for stray refs - AVEC suffixes
    var genericUuid = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    while ((match = genericUuid.exec(str)) !== null)
        nodeIds.add(match[1]);
    var genericNode = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
    while ((match = genericNode.exec(str)) !== null)
        nodeIds.add(match[1]);
    var genericShared = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((match = genericShared.exec(str)) !== null)
        nodeIds.add(match[1]);
    // Capacity refs anywhere in JSON
    for (var _b = 0, _c = extractCapacityRefsFromString(str); _b < _c.length; _b++) {
        var ref = _c[_b];
        capacityRefs.add(ref);
    }
    return { nodeIds: nodeIds, capacityRefs: capacityRefs };
}
/**
 * Extrait TOUS les nodeIds d'un tableau de tokens (formule)
 */
function extractNodeIdsFromFormula(tokens) {
    var ids = new Set();
    if (!tokens)
        return ids;
    var tokensArray;
    if (typeof tokens === 'string') {
        try {
            tokensArray = JSON.parse(tokens);
        }
        catch (_a) {
            return ids;
        }
    }
    else if (Array.isArray(tokens)) {
        tokensArray = tokens;
    }
    else {
        return ids;
    }
    for (var _i = 0, tokensArray_1 = tokensArray; _i < tokensArray_1.length; _i++) {
        var token = tokensArray_1[_i];
        if (token && typeof token === 'object') {
            // Token de type field
            if (token.type === 'field' && token.fieldId) {
                ids.add(token.fieldId);
            }
            // Token de type nodeValue
            if (token.type === 'nodeValue' && token.nodeId) {
                ids.add(token.nodeId);
            }
            // Autres patterns possibles
            if (token.ref && typeof token.ref === 'string') {
                var match = token.ref.match(/@value\.([a-f0-9-]+)/);
                if (match)
                    ids.add(match[1]);
            }
        }
    }
    // Fallback: scan global JSON for UUID/node_/shared-ref nus
    var str = JSON.stringify(tokensArray);
    var m;
    // 🔧 FIX: Capturer les UUIDs AVEC leurs suffixes numériques (-1, -2, etc.)
    // Pattern: @value.UUID-suffix ou @calculated.UUID-suffix ou @select.UUID-suffix
    var refWithSuffixRegex = /@(?:value|calculated|select)\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    while ((m = refWithSuffixRegex.exec(str)) !== null)
        ids.add(m[1]);
    // Pattern pour UUID simple (fallback, mais essayer d'abord avec suffixe)
    var uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    while ((m = uuidRegex.exec(str)) !== null)
        ids.add(m[1]);
    var nodeRegex = /(node_[a-z0-9_-]+)/gi;
    while ((m = nodeRegex.exec(str)) !== null)
        ids.add(m[1]);
    var sharedRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((m = sharedRegex.exec(str)) !== null)
        ids.add(m[1]);
    return ids;
}
function extractNodeAndCapacityRefsFromFormula(tokens) {
    var nodeIds = new Set();
    var capacityRefs = new Set();
    if (!tokens)
        return { nodeIds: nodeIds, capacityRefs: capacityRefs };
    var tokensArray;
    if (typeof tokens === 'string') {
        try {
            tokensArray = JSON.parse(tokens);
        }
        catch (_a) {
            return { nodeIds: nodeIds, capacityRefs: capacityRefs };
        }
    }
    else if (Array.isArray(tokens)) {
        tokensArray = tokens;
    }
    else {
        return { nodeIds: nodeIds, capacityRefs: capacityRefs };
    }
    for (var _i = 0, tokensArray_2 = tokensArray; _i < tokensArray_2.length; _i++) {
        var token = tokensArray_2[_i];
        if (!token || typeof token !== 'object')
            continue;
        if (token.type === 'field' && token.fieldId)
            nodeIds.add(token.fieldId);
        if (token.type === 'nodeValue' && token.nodeId)
            nodeIds.add(token.nodeId);
        if (token.ref && typeof token.ref === 'string') {
            var m_1 = token.ref.match(/@value\.([a-f0-9-]+)/);
            if (m_1)
                nodeIds.add(m_1[1]);
        }
    }
    var str = JSON.stringify(tokensArray);
    var m;
    // 🔧 FIX: Capturer les UUIDs AVEC suffixes numériques
    var uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    while ((m = uuidRegex.exec(str)) !== null)
        nodeIds.add(m[1]);
    var nodeRegex = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
    while ((m = nodeRegex.exec(str)) !== null)
        nodeIds.add(m[1]);
    var sharedRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((m = sharedRegex.exec(str)) !== null)
        nodeIds.add(m[1]);
    for (var _b = 0, _c = extractCapacityRefsFromString(str); _b < _c.length; _b++) {
        var ref = _c[_b];
        capacityRefs.add(ref);
    }
    return { nodeIds: nodeIds, capacityRefs: capacityRefs };
}
/**
 * Extrait TOUS les nodeIds d'une configuration de table
 */
function extractNodeIdsFromTable(tableData) {
    var ids = new Set();
    if (!tableData || typeof tableData !== 'object')
        return ids;
    var str = JSON.stringify(tableData);
    // Extraire tous les patterns possibles AVEC suffixes
    var uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    var match;
    while ((match = uuidRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    var nodeRegex = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
    while ((match = nodeRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    var sharedRefRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((match = sharedRefRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    return ids;
}
function extractNodeAndCapacityRefsFromTable(tableData) {
    var nodeIds = new Set();
    var capacityRefs = new Set();
    if (!tableData || typeof tableData !== 'object')
        return { nodeIds: nodeIds, capacityRefs: capacityRefs };
    var str = JSON.stringify(tableData);
    var match;
    // AVEC suffixes
    var uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?)/gi;
    while ((match = uuidRegex.exec(str)) !== null)
        nodeIds.add(match[1]);
    var nodeRegex = /(node_[a-z0-9_-]+(?:-\d+)?)/gi;
    while ((match = nodeRegex.exec(str)) !== null)
        nodeIds.add(match[1]);
    var sharedRefRegex = /(shared-ref-[a-z0-9-]+(?:-\d+)?)/gi;
    while ((match = sharedRefRegex.exec(str)) !== null)
        nodeIds.add(match[1]);
    for (var _i = 0, _a = extractCapacityRefsFromString(str); _i < _a.length; _i++) {
        var ref = _a[_i];
        capacityRefs.add(ref);
    }
    return { nodeIds: nodeIds, capacityRefs: capacityRefs };
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔗 LIAISON AUTOMATIQUE - FONCTIONS DE BASE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Récupère la valeur actuelle d'un champ linked
 */
function getNodeLinkedField(client, nodeId, field) {
    return __awaiter(this, void 0, void 0, function () {
        var node, value, e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, client.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: (_a = {}, _a[field] = true, _a)
                        })];
                case 1:
                    node = _b.sent();
                    if (!node)
                        return [2 /*return*/, []];
                    value = node[field];
                    if (Array.isArray(value))
                        return [2 /*return*/, value.filter(Boolean)];
                    return [2 /*return*/, []];
                case 2:
                    e_1 = _b.sent();
                    console.warn("\u26A0\uFE0F Impossible de lire ".concat(field, " pour n\u0153ud ").concat(nodeId, ":"), e_1.message);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Définit la valeur d'un champ linked (écrase)
 */
function setNodeLinkedField(client, nodeId, field, values) {
    return __awaiter(this, void 0, void 0, function () {
        var uniqueValues, e_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    uniqueValues = Array.from(new Set(values.filter(Boolean)));
                    return [4 /*yield*/, client.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: (_a = {}, _a[field] = uniqueValues, _a)
                        })];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_2 = _b.sent();
                    console.warn("\u26A0\uFE0F Impossible de d\u00E9finir ".concat(field, " pour n\u0153ud ").concat(nodeId, ":"), e_2.message);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function gatherNodeIdsRecursively(client_1, sourceRef_1) {
    return __awaiter(this, arguments, void 0, function (client, sourceRef, visited) {
        var aggregated, norm, isUuid, isNodeId, isSharedRef, condition, _a, nodeIds, capacityRefs, _i, nodeIds_1, id, _b, capacityRefs_1, capRef, rec, _c, rec_1, id, formula, _d, nodeIds, capacityRefs, _e, nodeIds_2, id, _f, capacityRefs_2, capRef, rec, _g, rec_2, id, table, _h, nodeIds, capacityRefs, _j, nodeIds_3, id, _k, capacityRefs_3, capRef, rec, _l, rec_3, id;
        if (visited === void 0) { visited = new Set(); }
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    aggregated = new Set();
                    norm = normalizeCapacityRef(sourceRef);
                    isUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(sourceRef);
                    isNodeId = /^node_[a-z0-9_-]+$/i.test(sourceRef);
                    isSharedRef = /^shared-ref-[a-z0-9-]+$/i.test(sourceRef);
                    // Champs directs
                    if (norm.type === 'unknown') {
                        if (isUuid || isNodeId || isSharedRef)
                            aggregated.add(sourceRef);
                        return [2 /*return*/, aggregated];
                    }
                    // Évite les boucles sur les capacités
                    if (visited.has(norm.canonical))
                        return [2 /*return*/, aggregated];
                    visited.add(norm.canonical);
                    if (!(norm.type === 'condition')) return [3 /*break*/, 6];
                    return [4 /*yield*/, client.treeBranchLeafNodeCondition.findUnique({
                            where: { id: norm.id },
                            select: { conditionSet: true }
                        })];
                case 1:
                    condition = _m.sent();
                    if (!condition) return [3 /*break*/, 5];
                    _a = extractNodeAndCapacityRefsFromCondition(condition.conditionSet), nodeIds = _a.nodeIds, capacityRefs = _a.capacityRefs;
                    for (_i = 0, nodeIds_1 = nodeIds; _i < nodeIds_1.length; _i++) {
                        id = nodeIds_1[_i];
                        aggregated.add(id);
                    }
                    _b = 0, capacityRefs_1 = capacityRefs;
                    _m.label = 2;
                case 2:
                    if (!(_b < capacityRefs_1.length)) return [3 /*break*/, 5];
                    capRef = capacityRefs_1[_b];
                    return [4 /*yield*/, gatherNodeIdsRecursively(client, capRef, visited)];
                case 3:
                    rec = _m.sent();
                    for (_c = 0, rec_1 = rec; _c < rec_1.length; _c++) {
                        id = rec_1[_c];
                        aggregated.add(id);
                    }
                    _m.label = 4;
                case 4:
                    _b++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, aggregated];
                case 6:
                    if (!(norm.type === 'formula')) return [3 /*break*/, 12];
                    return [4 /*yield*/, client.treeBranchLeafNodeFormula.findUnique({
                            where: { id: norm.id },
                            select: { tokens: true }
                        })];
                case 7:
                    formula = _m.sent();
                    if (!formula) return [3 /*break*/, 11];
                    _d = extractNodeAndCapacityRefsFromFormula(formula.tokens), nodeIds = _d.nodeIds, capacityRefs = _d.capacityRefs;
                    for (_e = 0, nodeIds_2 = nodeIds; _e < nodeIds_2.length; _e++) {
                        id = nodeIds_2[_e];
                        aggregated.add(id);
                    }
                    _f = 0, capacityRefs_2 = capacityRefs;
                    _m.label = 8;
                case 8:
                    if (!(_f < capacityRefs_2.length)) return [3 /*break*/, 11];
                    capRef = capacityRefs_2[_f];
                    return [4 /*yield*/, gatherNodeIdsRecursively(client, capRef, visited)];
                case 9:
                    rec = _m.sent();
                    for (_g = 0, rec_2 = rec; _g < rec_2.length; _g++) {
                        id = rec_2[_g];
                        aggregated.add(id);
                    }
                    _m.label = 10;
                case 10:
                    _f++;
                    return [3 /*break*/, 8];
                case 11: return [2 /*return*/, aggregated];
                case 12:
                    if (!(norm.type === 'table')) return [3 /*break*/, 18];
                    return [4 /*yield*/, client.treeBranchLeafNodeTable.findUnique({
                            where: { id: norm.id },
                            select: { meta: true, tableRows: true, tableColumns: true }
                        })];
                case 13:
                    table = _m.sent();
                    if (!table) return [3 /*break*/, 17];
                    _h = extractNodeAndCapacityRefsFromTable({
                        meta: table.meta,
                        rows: table.tableRows,
                        columns: table.tableColumns,
                    }), nodeIds = _h.nodeIds, capacityRefs = _h.capacityRefs;
                    for (_j = 0, nodeIds_3 = nodeIds; _j < nodeIds_3.length; _j++) {
                        id = nodeIds_3[_j];
                        aggregated.add(id);
                    }
                    _k = 0, capacityRefs_3 = capacityRefs;
                    _m.label = 14;
                case 14:
                    if (!(_k < capacityRefs_3.length)) return [3 /*break*/, 17];
                    capRef = capacityRefs_3[_k];
                    return [4 /*yield*/, gatherNodeIdsRecursively(client, capRef, visited)];
                case 15:
                    rec = _m.sent();
                    for (_l = 0, rec_3 = rec; _l < rec_3.length; _l++) {
                        id = rec_3[_l];
                        aggregated.add(id);
                    }
                    _m.label = 16;
                case 16:
                    _k++;
                    return [3 /*break*/, 14];
                case 17: return [2 /*return*/, aggregated];
                case 18: return [2 /*return*/, aggregated];
            }
        });
    });
}
/**
 * Ajoute des IDs à un champ linked (sans doublons)
 */
function addToNodeLinkedField(client, nodeId, field, idsToAdd) {
    return __awaiter(this, void 0, void 0, function () {
        var current, updated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!idsToAdd || idsToAdd.length === 0)
                        return [2 /*return*/];
                    return [4 /*yield*/, getNodeLinkedField(client, nodeId, field)];
                case 1:
                    current = _a.sent();
                    updated = Array.from(new Set(__spreadArray(__spreadArray([], current, true), idsToAdd.filter(Boolean), true)));
                    if (updated.length === current.length)
                        return [2 /*return*/]; // Rien à ajouter
                    return [4 /*yield*/, setNodeLinkedField(client, nodeId, field, updated)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Retire des IDs d'un champ linked
 */
function removeFromNodeLinkedField(client, nodeId, field, idsToRemove) {
    return __awaiter(this, void 0, void 0, function () {
        var current, toRemoveSet, updated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!idsToRemove || idsToRemove.length === 0)
                        return [2 /*return*/];
                    return [4 /*yield*/, getNodeLinkedField(client, nodeId, field)];
                case 1:
                    current = _a.sent();
                    toRemoveSet = new Set(idsToRemove);
                    updated = current.filter(function (id) { return !toRemoveSet.has(id); });
                    if (updated.length === current.length)
                        return [2 /*return*/]; // Rien à retirer
                    return [4 /*yield*/, setNodeLinkedField(client, nodeId, field, updated)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🎯 SYSTÈME AUTOMATIQUE DE LIAISON - CAPACITÉS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Lie automatiquement une CONDITION à tous ses nœuds référencés
 *
 * OBLIGATOIRE : Cette fonction DOIT être appelée à chaque création/copie de condition
 */
function linkConditionToAllNodes(client, conditionId, conditionSet) {
    return __awaiter(this, void 0, void 0, function () {
        var nodeIds, successCount, errorCount, _i, nodeIds_4, nodeId, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n\uD83D\uDD17 LIAISON AUTOMATIQUE: Condition ".concat(conditionId));
                    nodeIds = extractNodeIdsFromCondition(conditionSet);
                    console.log("   \uD83D\uDCCB ".concat(nodeIds.size, " n\u0153ud(s) trouv\u00E9(s):"), Array.from(nodeIds));
                    successCount = 0;
                    errorCount = 0;
                    _i = 0, nodeIds_4 = nodeIds;
                    _a.label = 1;
                case 1:
                    if (!(_i < nodeIds_4.length)) return [3 /*break*/, 6];
                    nodeId = nodeIds_4[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, addToNodeLinkedField(client, nodeId, 'linkedConditionIds', [conditionId])];
                case 3:
                    _a.sent();
                    successCount++;
                    console.log("   \u2705 ".concat(nodeId, " \u2192 linkedConditionIds += ").concat(conditionId));
                    return [3 /*break*/, 5];
                case 4:
                    e_3 = _a.sent();
                    errorCount++;
                    console.error("   \u274C ".concat(nodeId, " \u2192 \u00C9CHEC:"), e_3.message);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log("   \uD83D\uDCCA R\u00E9sultat: ".concat(successCount, " r\u00E9ussites, ").concat(errorCount, " \u00E9checs"));
                    console.log("\uD83D\uDD17 LIAISON AUTOMATIQUE: Termin\u00E9e\n");
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Lie automatiquement une FORMULE à tous ses nœuds référencés
 *
 * OBLIGATOIRE : Cette fonction DOIT être appelée à chaque création/copie de formule
 */
function linkFormulaToAllNodes(client, formulaId, tokens) {
    return __awaiter(this, void 0, void 0, function () {
        var nodeIds, successCount, errorCount, _i, nodeIds_5, nodeId, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n\uD83D\uDD17 LIAISON AUTOMATIQUE: Formule ".concat(formulaId));
                    nodeIds = extractNodeIdsFromFormula(tokens);
                    console.log("   \uD83D\uDCCB ".concat(nodeIds.size, " n\u0153ud(s) trouv\u00E9(s):"), Array.from(nodeIds));
                    successCount = 0;
                    errorCount = 0;
                    _i = 0, nodeIds_5 = nodeIds;
                    _a.label = 1;
                case 1:
                    if (!(_i < nodeIds_5.length)) return [3 /*break*/, 6];
                    nodeId = nodeIds_5[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, addToNodeLinkedField(client, nodeId, 'linkedFormulaIds', [formulaId])];
                case 3:
                    _a.sent();
                    successCount++;
                    console.log("   \u2705 ".concat(nodeId, " \u2192 linkedFormulaIds += ").concat(formulaId));
                    return [3 /*break*/, 5];
                case 4:
                    e_4 = _a.sent();
                    errorCount++;
                    console.error("   \u274C ".concat(nodeId, " \u2192 \u00C9CHEC:"), e_4.message);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log("   \uD83D\uDCCA R\u00E9sultat: ".concat(successCount, " r\u00E9ussites, ").concat(errorCount, " \u00E9checs"));
                    console.log("\uD83D\uDD17 LIAISON AUTOMATIQUE: Termin\u00E9e\n");
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Lie automatiquement une TABLE à tous ses nœuds référencés
 *
 * OBLIGATOIRE : Cette fonction DOIT être appelée à chaque création/copie de table
 */
function linkTableToAllNodes(client, tableId, tableData) {
    return __awaiter(this, void 0, void 0, function () {
        var nodeIds, successCount, errorCount, _i, nodeIds_6, nodeId, e_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n\uD83D\uDD17 LIAISON AUTOMATIQUE: Table ".concat(tableId));
                    nodeIds = extractNodeIdsFromTable(tableData);
                    console.log("   \uD83D\uDCCB ".concat(nodeIds.size, " n\u0153ud(s) trouv\u00E9(s):"), Array.from(nodeIds));
                    successCount = 0;
                    errorCount = 0;
                    _i = 0, nodeIds_6 = nodeIds;
                    _a.label = 1;
                case 1:
                    if (!(_i < nodeIds_6.length)) return [3 /*break*/, 6];
                    nodeId = nodeIds_6[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, addToNodeLinkedField(client, nodeId, 'linkedTableIds', [tableId])];
                case 3:
                    _a.sent();
                    successCount++;
                    console.log("   \u2705 ".concat(nodeId, " \u2192 linkedTableIds += ").concat(tableId));
                    return [3 /*break*/, 5];
                case 4:
                    e_5 = _a.sent();
                    errorCount++;
                    console.error("   \u274C ".concat(nodeId, " \u2192 \u00C9CHEC:"), e_5.message);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log("   \uD83D\uDCCA R\u00E9sultat: ".concat(successCount, " r\u00E9ussites, ").concat(errorCount, " \u00E9checs"));
                    console.log("\uD83D\uDD17 LIAISON AUTOMATIQUE: Termin\u00E9e\n");
                    return [2 /*return*/];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🎯 SYSTÈME AUTOMATIQUE DE LIAISON - VARIABLES
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Lie automatiquement une VARIABLE à tous les nœuds de SA CAPACITÉ
 *
 * OBLIGATOIRE : Cette fonction DOIT être appelée quand une variable charge une capacité
 */
function linkVariableToAllCapacityNodes(client, variableId, sourceRef) {
    return __awaiter(this, void 0, void 0, function () {
        var nodeIds, successCount, errorCount, _i, nodeIds_7, nodeId, e_6, e_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n\uD83D\uDD17 LIAISON AUTOMATIQUE VARIABLE: ".concat(variableId));
                    console.log("   \uD83D\uDCCD sourceRef: ".concat(sourceRef));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, gatherNodeIdsRecursively(client, sourceRef)];
                case 2:
                    nodeIds = _a.sent();
                    console.log("   \uD83D\uDCCB ".concat(nodeIds.size, " n\u0153ud(s) trouv\u00E9(s):"), Array.from(nodeIds));
                    successCount = 0;
                    errorCount = 0;
                    _i = 0, nodeIds_7 = nodeIds;
                    _a.label = 3;
                case 3:
                    if (!(_i < nodeIds_7.length)) return [3 /*break*/, 8];
                    nodeId = nodeIds_7[_i];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, addToNodeLinkedField(client, nodeId, 'linkedVariableIds', [variableId])];
                case 5:
                    _a.sent();
                    successCount++;
                    console.log("   \u2705 ".concat(nodeId, " \u2192 linkedVariableIds += ").concat(variableId));
                    return [3 /*break*/, 7];
                case 6:
                    e_6 = _a.sent();
                    errorCount++;
                    console.error("   \u274C ".concat(nodeId, " \u2192 \u00C9CHEC:"), e_6.message);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    console.log("   \uD83D\uDCCA R\u00E9sultat: ".concat(successCount, " r\u00E9ussites, ").concat(errorCount, " \u00E9checs"));
                    return [3 /*break*/, 10];
                case 9:
                    e_7 = _a.sent();
                    console.error("   \u274C Erreur lors de la liaison variable:", e_7.message);
                    return [3 /*break*/, 10];
                case 10:
                    console.log("\uD83D\uDD17 LIAISON AUTOMATIQUE VARIABLE: Termin\u00E9e\n");
                    return [2 /*return*/];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🧹 NETTOYAGE DES LIAISONS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Retire une capacité de tous les nœuds liés
 */
function unlinkCapacityFromAllNodes(client, capacityType, capacityId, capacityData) {
    return __awaiter(this, void 0, void 0, function () {
        var nodeIds, field, _i, nodeIds_8, nodeId, e_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n\uD83E\uDDF9 SUPPRESSION LIAISON: ".concat(capacityType, " ").concat(capacityId));
                    nodeIds = new Set();
                    switch (capacityType) {
                        case 'condition':
                            nodeIds = extractNodeIdsFromCondition(capacityData);
                            field = 'linkedConditionIds';
                            break;
                        case 'formula':
                            nodeIds = extractNodeIdsFromFormula(capacityData);
                            field = 'linkedFormulaIds';
                            break;
                        case 'table':
                            nodeIds = extractNodeIdsFromTable(capacityData);
                            field = 'linkedTableIds';
                            break;
                    }
                    console.log("   \uD83D\uDCCB ".concat(nodeIds.size, " n\u0153ud(s) \u00E0 nettoyer"));
                    _i = 0, nodeIds_8 = nodeIds;
                    _a.label = 1;
                case 1:
                    if (!(_i < nodeIds_8.length)) return [3 /*break*/, 6];
                    nodeId = nodeIds_8[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, removeFromNodeLinkedField(client, nodeId, field, [capacityId])];
                case 3:
                    _a.sent();
                    console.log("   \u2705 ".concat(nodeId, " \u2192 ").concat(field, " -= ").concat(capacityId));
                    return [3 /*break*/, 5];
                case 4:
                    e_8 = _a.sent();
                    console.error("   \u274C ".concat(nodeId, " \u2192 \u00C9CHEC:"), e_8.message);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log("\uD83E\uDDF9 SUPPRESSION LIAISON: Termin\u00E9e\n");
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Retire une variable de tous les nœuds liés
 */
function unlinkVariableFromAllNodes(client, variableId, sourceRef) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log("\n\uD83E\uDDF9 SUPPRESSION LIAISON VARIABLE: ".concat(variableId));
            // On réutilise la même logique d'extraction que pour la création
            // mais on retire au lieu d'ajouter
            // TODO: Implémenter si nécessaire
            console.log("\uD83E\uDDF9 SUPPRESSION LIAISON VARIABLE: Termin\u00E9e\n");
            return [2 /*return*/];
        });
    });
}

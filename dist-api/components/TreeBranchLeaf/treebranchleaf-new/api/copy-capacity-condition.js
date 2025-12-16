"use strict";
/**
 * 🔀 Système de copie des CONDITIONS
 *
 * Ce module gère la copie complète d'une condition (TreeBranchLeafNodeCondition)
 * avec réécriture du conditionSet pour pointer vers les nouveaux IDs.
 *
 * PRINCIPES :
 * -----------
 * 1. Copier la condition avec suffixe
 * 2. Réécrire le conditionSet (@value.ID → @value.ID-suffix)
 * 3. Réécrire les références de formules (node-formula:ID → node-formula:ID-suffix)
 * 4. Mettre à jour linkedConditionIds du nœud propriétaire
 * 5. 🔗 LIAISON AUTOMATIQUE OBLIGATOIRE: linkedConditionIds sur TOUS les nœuds référencés
 * 6. Synchroniser les paramètres de capacité (hasCondition, condition_activeId, etc.)
 *
 * @author System TBL
 * @version 2.0.0 - LIAISON AUTOMATIQUE OBLIGATOIRE
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
exports.copyConditionCapacity = copyConditionCapacity;
var universal_linking_system_1 = require("./universal-linking-system");
var universal_reference_rewriter_js_1 = require("./repeat/utils/universal-reference-rewriter.js");
// ═══════════════════════════════════════════════════════════════════════════
// 🔄 RÉGÉNÉRATION DES IDs INTERNES (CRITICAL !)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 🔴 CRITIQUE : Régénère TOUS les IDs internes du conditionSet
 *
 * Les IDs internes (branches, actions, conditions binaires, fallbacks) doivent être
 * uniques et suffixés lors de la copie.
 *
 * Format des IDs internes :
 * - Branches: b_xxxxxxxx → b_xxxxxxxx-{suffix}
 * - Actions: a_xxxxxxxx → a_xxxxxxxx-{suffix}
 * - Conditions binaires: bin_xxxxxxxx → bin_xxxxxxxx-{suffix}
 * - Fallbacks: fb_xxxxxxxx → fb_xxxxxxxx-{suffix}
 * - ID principal condition: cond_xxxxxxxx → cond_xxxxxxxx-{suffix}
 *
 * @param conditionSet - Le conditionSet contenant les IDs internes
 * @param suffix - Suffixe à ajouter
 * @returns Nouveau conditionSet avec IDs internes régénérés
 */
function regenerateInternalIds(conditionSet, suffix) {
    if (!conditionSet || typeof conditionSet !== 'object') {
        return conditionSet;
    }
    try {
        var suffixStr_1 = String(suffix);
        // Créer une copie profonde
        var result = JSON.parse(JSON.stringify(conditionSet));
        // Parcourir récursivement et renommer les IDs internes
        var processObject_1 = function (obj) {
            if (!obj || typeof obj !== 'object')
                return obj;
            if (Array.isArray(obj)) {
                return obj.map(processObject_1);
            }
            var newObj = {};
            for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                if (key === 'id' && typeof value === 'string') {
                    // C'est un ID interne (b_xxx, a_xxx, bin_xxx, fb_xxx) OU l'ID principal (cond_xxx)
                    // IMPORTANT: Inclure les tirets dans la classe de caractères !
                    if (value.match(/^(b|a|bin|fb|cond)_[A-Za-z0-9_-]+$/)) {
                        var newId = "".concat(value, "-").concat(suffixStr_1);
                        console.log("   \uD83D\uDD00 Renommage ID: ".concat(value, " \u2192 ").concat(newId));
                        newObj[key] = newId;
                    }
                    else {
                        newObj[key] = value;
                    }
                }
                else if (typeof value === 'object') {
                    newObj[key] = processObject_1(value);
                }
                else {
                    newObj[key] = value;
                }
            }
            return newObj;
        };
        result = processObject_1(result);
        return result;
    }
    catch (error) {
        console.error("\u274C Erreur lors de la r\u00E9g\u00E9n\u00E9ration des IDs internes:", error);
        return conditionSet;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS D'EXTRACTION D'IDs
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Extrait TOUS les IDs de nœuds référencés dans un conditionSet
 * (utilisé pour les mises à jour bidirectionnelles)
 *
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de nœuds trouvés
 */
function extractNodeIdsFromConditionSet(conditionSet) {
    var ids = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return ids;
    var obj = conditionSet;
    var str = JSON.stringify(obj);
    // Extraire tous les @value.<id>
    var uuidRegex = /@value\.([a-f0-9-]{36})/gi;
    var match;
    while ((match = uuidRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    // Extraire les node_xxx
    var nodeRegex = /@value\.(node_[a-z0-9_-]+)/gi;
    while ((match = nodeRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    return ids;
}
/**
 * 🔗 EXTRACTION AUTOMATIQUE : Extrait TOUTES les conditions référencées dans le conditionSet
 * Cela permet de copier AUTOMATIQUEMENT les conditions liées MÊME SI elles ne sont
 * pas explicitement dans linkedConditionIds
 *
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de conditions trouvés (sans doublons)
 */
function extractLinkedConditionIdsFromConditionSet(conditionSet) {
    var ids = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return ids;
    var str = JSON.stringify(conditionSet);
    // 🔥 PATTERN AMÉLIORÉ: accepte les UUIDs avec suffixes (UUID-N)
    // Extraire TOUTES les références de condition:XXX ou node-condition:XXX
    var conditionRegex = /(?:condition|node-condition):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
    var match;
    while ((match = conditionRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    return ids;
}
/**
 * Extrait TOUTES les tables référencées dans un conditionSet
 * Formats supportés:
 * - @table.ID
 * - node-table:ID
 * - @value.node-table:ID
 *
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de tables trouvés (sans doublons)
 */
function extractLinkedTableIdsFromConditionSet(conditionSet) {
    var ids = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return ids;
    var str = JSON.stringify(conditionSet);
    // 🔥 PATTERN AMÉLIORÉ: accepte les UUIDs avec suffixes (UUID-N)
    // Extraire @table:XXX
    var tableRegex1 = /@table\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
    var match;
    while ((match = tableRegex1.exec(str)) !== null) {
        ids.add(match[1]);
    }
    // Extraire node-table:XXX
    var tableRegex2 = /node-table:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
    while ((match = tableRegex2.exec(str)) !== null) {
        ids.add(match[1]);
    }
    return ids;
}
/**
 * Remplace les occurrences dans le JSON selon une Map de replacements
 *
 * @param json - JSON à modifier
 * @param replacements - Map de "recherche" → "remplacement"
 * @returns Nouveau JSON avec remplacements appliqués
 */
function replaceInJson(json, replacements) {
    if (!json || typeof json !== 'object') {
        return json;
    }
    try {
        var str = JSON.stringify(json);
        // Remplacer toutes les occurrences
        for (var _i = 0, replacements_1 = replacements; _i < replacements_1.length; _i++) {
            var _a = replacements_1[_i], search = _a[0], replacement = _a[1];
            str = str.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        }
        return JSON.parse(str);
    }
    catch (error) {
        console.error("\u274C Erreur lors du remplacement dans JSON:", error);
        return json;
    }
}
/**
 * Extrait TOUTES les formules référencées dans un conditionSet
 * Formats supportés:
 * - node-formula:ID
 *
 * @param conditionSet - conditionSet à analyser
 * @returns Set des IDs de formules trouvés (sans doublons)
 */
function extractLinkedFormulaIdsFromConditionSet(conditionSet) {
    var ids = new Set();
    if (!conditionSet || typeof conditionSet !== 'object')
        return ids;
    var str = JSON.stringify(conditionSet);
    // Extraire TOUTES les références de node-formula:XXX
    // 🔥 PATTERN AMÉLIORÉ: accepte les UUIDs avec suffixes (UUID-N)
    var formulaRegex = /node-formula:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:-\d+)?|[A-Za-z0-9_-]+(?:-\d+)?)/gi;
    var match;
    while ((match = formulaRegex.exec(str)) !== null) {
        ids.add(match[1]);
    }
    return ids;
}
// ═══════════════════════════════════════════════════════════════════════════
// �🔧 FONCTIONS UTILITAIRES DE RÉÉCRITURE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Réécrire le conditionSet d'une condition pour remplacer les anciens IDs par les nouveaux
 *
 * Format du conditionSet :
 * - branches[].when.left/right.ref : "@value.<nodeId>"
 * - branches[].actions[].nodeIds : ["node-xxx", "uuid-yyy"]
 * - fallback.actions[].nodeIds
 * - Références de formules : "node-formula:<formulaId>"
 *
 * @param conditionSet - conditionSet original
 * @param nodeIdMap - Map ancien ID nœud → nouveau ID nœud
 * @param formulaIdMap - Map ancien ID formule → nouveau ID formule
 * @returns conditionSet réécrit
 *
 * @example
 * rewriteConditionSet(
 *   { branches: [{ when: { left: { ref: "@value.abc" } } }] },
 *   new Map([["abc", "abc-1"]]),
 *   new Map()
 * )
 * → { branches: [{ when: { left: { ref: "@value.abc-1" } } }] }
 */
function rewriteConditionSet(conditionSet, nodeIdMap, formulaIdMap, suffix) {
    if (!conditionSet || typeof conditionSet !== 'object') {
        return conditionSet;
    }
    try {
        // 0️⃣ Travaux de réécriture en deux passes: regex globaux puis parcours ciblé
        var str = JSON.stringify(conditionSet);
        // 1️⃣ Réécrire les @value.<nodeId> (avec fallback suffix si non mappé, mais jamais pour shared-ref sans mapping)
        str = str.replace(/@value\.([A-Za-z0-9_:-]+)/g, function (_match, nodeId) {
            var mapped = nodeIdMap.get(nodeId);
            if (mapped)
                return "@value.".concat(mapped);
            var isSharedRef = nodeId.startsWith('shared-ref-');
            if (isSharedRef)
                return "@value.".concat(nodeId); // ne pas suffixer une shared-ref sans mapping
            if (suffix !== undefined) {
                var suffixStr = "".concat(suffix);
                return "@value.".concat(nodeId, "-").concat(suffixStr);
            }
            return "@value.".concat(nodeId);
        });
        // 2️⃣ Réécrire les node-formula:<id> (IDs CUID/UUID supportés) avec fallback suffix
        str = str.replace(/node-formula:([A-Za-z0-9_-]+)/g, function (_match, formulaId) {
            var mapped = formulaIdMap.get(formulaId);
            if (mapped)
                return "node-formula:".concat(mapped);
            if (suffix !== undefined) {
                var suffixStr = "".concat(suffix);
                return "node-formula:".concat(formulaId, "-").concat(suffixStr);
            }
            return "node-formula:".concat(formulaId);
        });
        // 3️⃣ Réécrire aussi d'éventuels node-condition:/condition: en suffix fallback (pas de map dédiée ici)
        str = str.replace(/(node-condition:|condition:)([A-Za-z0-9_-]+)/g, function (_m, pref, condId) {
            if (suffix !== undefined) {
                var suffixStr = "".concat(suffix);
                return "".concat(pref).concat(condId, "-").concat(suffixStr);
            }
            return "".concat(pref).concat(condId);
        });
        // 4️⃣ Parser pour traiter précisément actions[].nodeIds (références nues)
        var parsed = JSON.parse(str);
        var mapNodeIdString_1 = function (raw) {
            if (typeof raw !== 'string')
                return raw;
            // Cas 0: shared-ref (ne pas suffixer si pas de mapping)
            if (raw.startsWith('shared-ref-')) {
                var mapped = nodeIdMap.get(raw);
                if (mapped)
                    return mapped;
                return raw;
            }
            // Cas 1: node-formula déjà couvert mais double sécurité
            if (raw.startsWith('node-formula:')) {
                var id = raw.replace('node-formula:', '');
                var mapped = formulaIdMap.get(id);
                if (mapped)
                    return "node-formula:".concat(mapped);
                return suffix !== undefined && !/-\d+$/.test(id) ? "node-formula:".concat(id, "-").concat(suffix) : raw;
            }
            // Cas 2: field id (UUID ou node_...)
            var uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
            var isNodeGen = /^node_[A-Za-z0-9_-]+$/i.test(raw);
            if (uuidRegex.test(raw) || isNodeGen) {
                var mapped = nodeIdMap.get(raw);
                if (mapped)
                    return mapped;
                if (suffix !== undefined) {
                    var suffixStr = "".concat(suffix);
                    return "".concat(raw, "-").concat(suffixStr);
                }
                return raw;
            }
            // Cas 3: condition ref en clair
            if (raw.startsWith('node-condition:') || raw.startsWith('condition:')) {
                var pref = raw.startsWith('node-condition:') ? 'node-condition:' : 'condition:';
                var id = raw.replace('node-condition:', '').replace('condition:', '');
                return suffix !== undefined && !/-\d+$/.test(id) ? "".concat(pref).concat(id, "-").concat(suffix) : raw;
            }
            return raw;
        };
        var walk_1 = function (obj) {
            if (!obj || typeof obj !== 'object')
                return obj;
            if (Array.isArray(obj))
                return obj.map(walk_1);
            var out = Array.isArray(obj) ? [] : __assign({}, obj);
            for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
                var key = _a[_i];
                var val = obj[key];
                if (key === 'nodeIds' && Array.isArray(val)) {
                    out[key] = val.map(function (s) { return (typeof s === 'string' ? mapNodeIdString_1(s) : s); });
                }
                else if (key === 'when' && val && typeof val === 'object') {
                    // when.left.ref / when.right.ref déjà traités via regex, mais on parcourt par sécurité
                    out[key] = walk_1(val);
                }
                else {
                    out[key] = walk_1(val);
                }
            }
            return out;
        };
        var rewritten = walk_1(parsed);
        var applySuffixIfNeeded_1 = function (value) {
            if (suffix === undefined)
                return value;
            if (typeof value !== 'string')
                return value;
            var suffixStr = "".concat(suffix);
            return "".concat(value, "-").concat(suffixStr);
        };
        var suffixConditionIds = function (cs) {
            if (!cs || typeof cs !== 'object')
                return cs;
            var out = __assign({}, cs);
            if (out.id)
                out.id = applySuffixIfNeeded_1(out.id);
            if (Array.isArray(out.branches)) {
                out.branches = out.branches.map(function (branch) {
                    var b = __assign({}, branch);
                    if (b.id)
                        b.id = applySuffixIfNeeded_1(b.id);
                    if (Array.isArray(b.actions)) {
                        b.actions = b.actions.map(function (action) {
                            var a = __assign({}, action);
                            if (a.id)
                                a.id = applySuffixIfNeeded_1(a.id);
                            return a;
                        });
                    }
                    return b;
                });
            }
            if (out.fallback && typeof out.fallback === 'object') {
                var fb = __assign({}, out.fallback);
                if (fb.id)
                    fb.id = applySuffixIfNeeded_1(fb.id);
                if (Array.isArray(fb.actions)) {
                    fb.actions = fb.actions.map(function (action) {
                        var a = __assign({}, action);
                        if (a.id)
                            a.id = applySuffixIfNeeded_1(a.id);
                        return a;
                    });
                }
                out.fallback = fb;
            }
            return out;
        };
        return suffixConditionIds(rewritten);
    }
    catch (error) {
        console.error("\u274C Erreur lors de la r\u00E9\u00E9criture du conditionSet:", error);
        return conditionSet;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Copie une condition avec réécriture du conditionSet
 *
 * PROCESSUS :
 * -----------
 * 1. Vérifier le cache (éviter doublons)
 * 2. Récupérer la condition originale
 * 3. Générer le nouvel ID avec suffixe
 * 4. Réécrire le conditionSet (@value.ID + node-formula:ID)
 * 5. Créer la nouvelle condition
 * 6. Mettre à jour linkedConditionIds du nœud
 * 7. Synchroniser les paramètres de capacité
 * 8. Mettre en cache
 *
 * @param originalConditionId - ID de la condition à copier
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec nodeIdMap et formulaIdMap
 * @returns Résultat de la copie
 *
 * @example
 * const result = await copyConditionCapacity(
 *   'condition-abc',
 *   'node-xyz-1',
 *   1,
 *   prisma,
 *   {
 *     nodeIdMap: new Map([['node-a', 'node-a-1']]),
 *     formulaIdMap: new Map([['formula-x', 'formula-x-1']])
 *   }
 * );
 * // result.newConditionId = 'condition-abc-1'
 * // result.conditionSet = { ... avec IDs réécrits ... }
 */
function copyConditionCapacity(originalConditionId_1, newNodeId_1, suffix_1, prisma_1) {
    return __awaiter(this, arguments, void 0, function (originalConditionId, newNodeId, suffix, prisma, options) {
        var _a, nodeIdMap, _b, formulaIdMap, _c, conditionCopyCache, cachedId, cached, cleanConditionId, originalCondition, newConditionId, originalOwnerNodeId, correctOwnerNodeId, ownerNodeExists, finalOwnerNodeId, linkedFormulaIdsFromSet, _i, linkedFormulaIdsFromSet_1, formId, existingForm, unsuffixedSharedRefs, enrichedNodeIdMap, _d, linkedFormulaIdsFromSet_2, linkedFormId, linkedFormResult, copiedForm, unsuffixed, e_1, rewriteMaps, rewrittenConditionSet, enrichedRewriteMaps, linkedConditionIdsFromSet, _e, linkedConditionIdsFromSet_1, linkedCondId, mappedId, linkedCondResult, e_2, linkedTableIdsFromSet, _f, linkedTableIdsFromSet_1, linkedTableId, mappedId, linkedTableResult, e_3, newCondition, e_4, e_5, e_6, error_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83D\uDD00 COPIE CONDITION: ".concat(originalConditionId));
                    console.log("   Suffixe: ".concat(suffix));
                    console.log("   Nouveau n\u0153ud: ".concat(newNodeId));
                    console.log("".concat('═'.repeat(80), "\n"));
                    _a = options.nodeIdMap, nodeIdMap = _a === void 0 ? new Map() : _a, _b = options.formulaIdMap, formulaIdMap = _b === void 0 ? new Map() : _b, _c = options.conditionCopyCache, conditionCopyCache = _c === void 0 ? new Map() : _c;
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 52, , 53]);
                    if (!conditionCopyCache.has(originalConditionId)) return [3 /*break*/, 3];
                    cachedId = conditionCopyCache.get(originalConditionId);
                    console.log("\u267B\uFE0F Condition d\u00E9j\u00E0 copi\u00E9e (cache): ".concat(originalConditionId, " \u2192 ").concat(cachedId));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                            where: { id: cachedId }
                        })];
                case 2:
                    cached = _g.sent();
                    if (cached) {
                        return [2 /*return*/, {
                                newConditionId: cached.id,
                                nodeId: cached.nodeId,
                                conditionSet: cached.conditionSet,
                                success: true
                            }];
                    }
                    _g.label = 3;
                case 3:
                    cleanConditionId = originalConditionId.replace(/-\d+$/, '');
                    console.log("\uD83D\uDD0D Recherche condition avec id: ".concat(cleanConditionId, " (original: ").concat(originalConditionId, ")"));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                            where: { id: cleanConditionId }
                        })];
                case 4:
                    originalCondition = _g.sent();
                    if (!originalCondition) {
                        console.error("\u274C Condition introuvable avec id: ".concat(cleanConditionId));
                        return [2 /*return*/, {
                                newConditionId: '',
                                nodeId: '',
                                conditionSet: null,
                                success: false,
                                error: "Condition introuvable avec id: ".concat(cleanConditionId)
                            }];
                    }
                    console.log("\u2705 Condition trouv\u00E9e: ".concat(originalCondition.name || originalCondition.id));
                    console.log("   NodeId original: ".concat(originalCondition.nodeId));
                    console.log("   conditionSet original:", originalCondition.conditionSet);
                    newConditionId = "".concat(originalCondition.id, "-").concat(suffix);
                    console.log("\uD83D\uDCDD Nouvel ID condition: ".concat(newConditionId));
                    originalOwnerNodeId = originalCondition.nodeId;
                    correctOwnerNodeId = "".concat(originalOwnerNodeId, "-").concat(suffix);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: correctOwnerNodeId },
                            select: { id: true, label: true }
                        })];
                case 5:
                    ownerNodeExists = _g.sent();
                    finalOwnerNodeId = ownerNodeExists ? correctOwnerNodeId : newNodeId;
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId original propri\u00E9taire: ".concat(originalOwnerNodeId));
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId propri\u00E9taire suffix\u00E9: ".concat(correctOwnerNodeId));
                    console.log("\uD83D\uDD27 [OWNER FIX] Propri\u00E9taire suffix\u00E9 existe: ".concat(ownerNodeExists ? 'OUI (' + ownerNodeExists.label + ')' : 'NON'));
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId FINAL utilis\u00E9: ".concat(finalOwnerNodeId));
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔄 ÉTAPE 4 : Réécrire le conditionSet
                    // ═══════════════════════════════════════════════════════════════════════
                    console.log("\n\uD83D\uDD04 R\u00E9\u00E9criture du conditionSet...");
                    console.log("   Nombre d'IDs n\u0153uds dans la map: ".concat(nodeIdMap.size));
                    console.log("   Nombre d'IDs formules dans la map: ".concat(formulaIdMap.size));
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔗 ÉTAPE 4A : EXTRACTION ET COPIE AUTOMATIQUE des FORMULES liées
                    // ═══════════════════════════════════════════════════════════════════════
                    // ⭐ CRITIQUE: Les formules DOIVENT être copiées AVANT la réécriture!
                    // Sinon formulaIdMap est vide et les tokens ne reçoivent pas les suffixes
                    console.log("\n\uD83D\uDD17 Extraction automatique des formules li\u00E9es du conditionSet...");
                    linkedFormulaIdsFromSet = extractLinkedFormulaIdsFromConditionSet(originalCondition.conditionSet);
                    console.log("\uD83D\uDD0D DEBUG: conditionSet original:", JSON.stringify(originalCondition.conditionSet).substring(0, 300));
                    console.log("\uD83D\uDD0D DEBUG: ".concat(linkedFormulaIdsFromSet.size, " formules trouv\u00E9es:"), Array.from(linkedFormulaIdsFromSet));
                    if (!(linkedFormulaIdsFromSet.size > 0)) return [3 /*break*/, 19];
                    console.log("   Formules trouv\u00E9es: ".concat(Array.from(linkedFormulaIdsFromSet).join(', ')));
                    // 🔍 VÉRIFICATION: Chercher les formules dans la BD pour voir leur état réel
                    console.log("\n\uD83D\uDD0D V\u00C9RIFICATION DES FORMULES DANS LA BD:");
                    _i = 0, linkedFormulaIdsFromSet_1 = linkedFormulaIdsFromSet;
                    _g.label = 6;
                case 6:
                    if (!(_i < linkedFormulaIdsFromSet_1.length)) return [3 /*break*/, 9];
                    formId = linkedFormulaIdsFromSet_1[_i];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: formId }
                        })];
                case 7:
                    existingForm = _g.sent();
                    if (existingForm) {
                        console.log("   \u2705 Formule EXISTE: ".concat(formId));
                        console.log("      Tokens actuels:", existingForm.tokens);
                        // Vérifier si les shared-refs sont suffixés
                        if (Array.isArray(existingForm.tokens)) {
                            unsuffixedSharedRefs = existingForm.tokens.filter(function (t) {
                                return typeof t === 'string' && t.includes('shared-ref') && !/-\d+$/.test(t);
                            });
                            if (unsuffixedSharedRefs.length > 0) {
                                console.warn("   \u26A0\uFE0F ".concat(unsuffixedSharedRefs.length, " shared-refs NON-suffix\u00E9s:"), unsuffixedSharedRefs);
                            }
                        }
                    }
                    else {
                        console.warn("   \u274C Formule INTROUVABLE: ".concat(formId));
                    }
                    _g.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 6];
                case 9:
                    enrichedNodeIdMap = new Map(nodeIdMap);
                    if (originalCondition.nodeId && finalOwnerNodeId) {
                        enrichedNodeIdMap.set(originalCondition.nodeId, finalOwnerNodeId);
                        console.log("   \uD83D\uDCCD NodeIdMap enrichie: ".concat(originalCondition.nodeId, " \u2192 ").concat(finalOwnerNodeId));
                    }
                    _d = 0, linkedFormulaIdsFromSet_2 = linkedFormulaIdsFromSet;
                    _g.label = 10;
                case 10:
                    if (!(_d < linkedFormulaIdsFromSet_2.length)) return [3 /*break*/, 18];
                    linkedFormId = linkedFormulaIdsFromSet_2[_d];
                    if (!formulaIdMap.has(linkedFormId)) return [3 /*break*/, 11];
                    console.log("   \u267B\uFE0F Formule li\u00E9e d\u00E9j\u00E0 copi\u00E9e: ".concat(linkedFormId, " \u2192 ").concat(formulaIdMap.get(linkedFormId)));
                    return [3 /*break*/, 17];
                case 11:
                    _g.trys.push([11, 16, , 17]);
                    console.log("   \uD83D\uDD00 Copie formule li\u00E9e: ".concat(linkedFormId, "..."));
                    return [4 /*yield*/, copyFormulaCapacity(linkedFormId, finalOwnerNodeId, // Même nœud propriétaire (corrigé)
                        suffix, prisma, { nodeIdMap: enrichedNodeIdMap, formulaIdMap: formulaIdMap })];
                case 12:
                    linkedFormResult = _g.sent();
                    if (!linkedFormResult.success) return [3 /*break*/, 14];
                    console.log("   \u2705 Formule li\u00E9e copi\u00E9e: ".concat(linkedFormId, " \u2192 ").concat(linkedFormResult.newFormulaId));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: linkedFormResult.newFormulaId }
                        })];
                case 13:
                    copiedForm = _g.sent();
                    if (copiedForm) {
                        console.log("   \uD83D\uDD0D V\u00E9rification formule copi\u00E9e ".concat(linkedFormResult.newFormulaId, ":"));
                        console.log("      Tokens en BD:", copiedForm.tokens);
                        if (Array.isArray(copiedForm.tokens)) {
                            unsuffixed = copiedForm.tokens.filter(function (t) {
                                return typeof t === 'string' && t.includes('shared-ref') && !/-\d+$/.test(t);
                            });
                            if (unsuffixed.length > 0) {
                                console.error("   \u274C PROBL\u00C8ME: ".concat(unsuffixed.length, " shared-refs TOUJOURS non-suffix\u00E9s en BD:"), unsuffixed);
                            }
                            else {
                                console.log("   \u2705 Tous les shared-refs sont suffix\u00E9s en BD");
                            }
                        }
                    }
                    // Enregistrer dans la map pour la réécriture suivante
                    formulaIdMap.set(linkedFormId, linkedFormResult.newFormulaId);
                    return [3 /*break*/, 15];
                case 14:
                    console.warn("   \u26A0\uFE0F \u00C9chec copie formule li\u00E9e: ".concat(linkedFormId));
                    _g.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    e_1 = _g.sent();
                    console.error("   \u274C Exception copie formule li\u00E9e:", e_1.message);
                    return [3 /*break*/, 17];
                case 17:
                    _d++;
                    return [3 /*break*/, 10];
                case 18: return [3 /*break*/, 20];
                case 19:
                    console.log("   (Aucune formule li\u00E9e trouv\u00E9e dans le conditionSet)");
                    _g.label = 20;
                case 20:
                    rewriteMaps = {
                        nodeIdMap: nodeIdMap,
                        formulaIdMap: formulaIdMap,
                        conditionIdMap: conditionCopyCache || new Map(),
                        tableIdMap: new Map() // Pas de table dans les conditions normalement
                    };
                    console.log("\n\uD83D\uDD0D DEBUG: formulaIdMap avant r\u00E9\u00E9criture:", Object.fromEntries(formulaIdMap));
                    rewrittenConditionSet = (0, universal_reference_rewriter_js_1.rewriteJsonReferences)(originalCondition.conditionSet, rewriteMaps, suffix);
                    console.log("\n\uD83D\uDD0D DEBUG: conditionSet apr\u00E8s 1\u00E8re r\u00E9\u00E9criture:", JSON.stringify(rewrittenConditionSet).substring(0, 500));
                    enrichedRewriteMaps = {
                        nodeIdMap: new Map(__spreadArray(__spreadArray([], nodeIdMap, true), [[originalCondition.nodeId, finalOwnerNodeId]], false)), // Enrichi avec le bon propriétaire
                        formulaIdMap: formulaIdMap,
                        conditionIdMap: conditionCopyCache || new Map(),
                        tableIdMap: new Map()
                    };
                    rewrittenConditionSet = (0, universal_reference_rewriter_js_1.rewriteJsonReferences)(rewrittenConditionSet, // Réécrire le résultat précédent
                    enrichedRewriteMaps, suffix);
                    console.log("\u2705 conditionSet r\u00E9\u00E9crit avec nodeIdMap enrichie (2\u00E8me pass):", rewrittenConditionSet);
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔥 RÉÉCRITURE FORCÉE DES SHARED-REFS DANS LE CONDITIONSET
                    // ═══════════════════════════════════════════════════════════════════════
                    // Forcer TOUS les @value.shared-ref-* même imbriqués partout dans le JSON
                    console.log("\n\uD83D\uDD25 R\u00C9\u00C9CRITURE FORC\u00C9E des shared-refs dans conditionSet...");
                    rewrittenConditionSet = (0, universal_reference_rewriter_js_1.forceSharedRefSuffixesInJson)(rewrittenConditionSet, suffix);
                    // 🔴 CRITIQUE : Régénérer les IDs INTERNES du conditionSet
                    // (branches, actions, conditions binaires, fallbacks)
                    console.log("\n\uD83D\uDD04 R\u00E9g\u00E9n\u00E9ration des IDs internes...");
                    rewrittenConditionSet = regenerateInternalIds(rewrittenConditionSet, suffix);
                    console.log("\u2705 conditionSet finalis\u00E9 avec IDs internes:", rewrittenConditionSet);
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔗 ÉTAPE 4B : EXTRACTION AUTOMATIQUE ET COPIE des conditions liées
                    // ═══════════════════════════════════════════════════════════════════════
                    // Chercher TOUTES les conditions référencées DANS le conditionSet
                    console.log("\n\uD83D\uDD17 Extraction automatique des conditions li\u00E9es du conditionSet...");
                    linkedConditionIdsFromSet = extractLinkedConditionIdsFromConditionSet(rewrittenConditionSet);
                    if (!(linkedConditionIdsFromSet.size > 0)) return [3 /*break*/, 27];
                    console.log("   Conditions trouv\u00E9es: ".concat(Array.from(linkedConditionIdsFromSet).join(', ')));
                    _e = 0, linkedConditionIdsFromSet_1 = linkedConditionIdsFromSet;
                    _g.label = 21;
                case 21:
                    if (!(_e < linkedConditionIdsFromSet_1.length)) return [3 /*break*/, 26];
                    linkedCondId = linkedConditionIdsFromSet_1[_e];
                    if (!conditionCopyCache.has(linkedCondId)) return [3 /*break*/, 22];
                    mappedId = conditionCopyCache.get(linkedCondId);
                    console.log("   \u267B\uFE0F Condition li\u00E9e d\u00E9j\u00E0 copi\u00E9e: ".concat(linkedCondId, " \u2192 ").concat(mappedId));
                    // Remplacer DANS LE JSON les références
                    rewrittenConditionSet = replaceInJson(rewrittenConditionSet, new Map([
                        ["condition:".concat(linkedCondId), "condition:".concat(mappedId)],
                        ["node-condition:".concat(linkedCondId), "node-condition:".concat(mappedId)]
                    ]));
                    return [3 /*break*/, 25];
                case 22:
                    _g.trys.push([22, 24, , 25]);
                    console.log("   \uD83D\uDD00 Copie condition li\u00E9e: ".concat(linkedCondId, "..."));
                    return [4 /*yield*/, copyConditionCapacity(linkedCondId, finalOwnerNodeId, // Même nœud propriétaire (corrigé)
                        suffix, prisma, { nodeIdMap: nodeIdMap, formulaIdMap: formulaIdMap, conditionCopyCache: conditionCopyCache })];
                case 23:
                    linkedCondResult = _g.sent();
                    if (linkedCondResult.success) {
                        console.log("   \u2705 Condition li\u00E9e copi\u00E9e: ".concat(linkedCondId, " \u2192 ").concat(linkedCondResult.newConditionId));
                        // Remplacer DANS LE JSON les références
                        rewrittenConditionSet = replaceInJson(rewrittenConditionSet, new Map([
                            ["condition:".concat(linkedCondId), "condition:".concat(linkedCondResult.newConditionId)],
                            ["node-condition:".concat(linkedCondId), "node-condition:".concat(linkedCondResult.newConditionId)]
                        ]));
                    }
                    else {
                        console.warn("   \u26A0\uFE0F \u00C9chec copie condition li\u00E9e: ".concat(linkedCondId));
                    }
                    return [3 /*break*/, 25];
                case 24:
                    e_2 = _g.sent();
                    console.error("   \u274C Exception copie condition li\u00E9e:", e_2.message);
                    return [3 /*break*/, 25];
                case 25:
                    _e++;
                    return [3 /*break*/, 21];
                case 26: return [3 /*break*/, 28];
                case 27:
                    console.log("   (Aucune condition li\u00E9e trouv\u00E9e dans le conditionSet)");
                    _g.label = 28;
                case 28:
                    // ═══════════════════════════════════════════════════════════════════════
                    // � ÉTAPE 4D : EXTRACTION AUTOMATIQUE ET COPIE des tables liées
                    // ═══════════════════════════════════════════════════════════════════════
                    // Chercher TOUTES les tables référencées DANS le conditionSet
                    console.log("\n\uD83D\uDD17 Extraction automatique des tables li\u00E9es du conditionSet...");
                    linkedTableIdsFromSet = extractLinkedTableIdsFromConditionSet(rewrittenConditionSet);
                    if (!(linkedTableIdsFromSet.size > 0)) return [3 /*break*/, 35];
                    console.log("   Tables trouv\u00E9es: ".concat(Array.from(linkedTableIdsFromSet).join(', ')));
                    _f = 0, linkedTableIdsFromSet_1 = linkedTableIdsFromSet;
                    _g.label = 29;
                case 29:
                    if (!(_f < linkedTableIdsFromSet_1.length)) return [3 /*break*/, 34];
                    linkedTableId = linkedTableIdsFromSet_1[_f];
                    if (!(tableIdMap && tableIdMap.has(linkedTableId))) return [3 /*break*/, 30];
                    mappedId = tableIdMap.get(linkedTableId);
                    console.log("   \u267B\uFE0F Table li\u00E9e d\u00E9j\u00E0 copi\u00E9e: ".concat(linkedTableId, " \u2192 ").concat(mappedId));
                    // Remplacer DANS LE JSON les références
                    rewrittenConditionSet = replaceInJson(rewrittenConditionSet, new Map([
                        ["@table.".concat(linkedTableId), "@table.".concat(mappedId)],
                        ["node-table:".concat(linkedTableId), "node-table:".concat(mappedId)]
                    ]));
                    return [3 /*break*/, 33];
                case 30:
                    _g.trys.push([30, 32, , 33]);
                    console.log("   \uD83D\uDD00 Copie table li\u00E9e: ".concat(linkedTableId, "..."));
                    return [4 /*yield*/, copyTableCapacity(linkedTableId, finalOwnerNodeId, // Même nœud propriétaire (corrigé)
                        suffix, prisma, { nodeIdMap: nodeIdMap, tableIdMap: tableIdMap })];
                case 31:
                    linkedTableResult = _g.sent();
                    if (linkedTableResult.success) {
                        console.log("   \u2705 Table li\u00E9e copi\u00E9e: ".concat(linkedTableId, " \u2192 ").concat(linkedTableResult.newTableId));
                        // Enregistrer dans la map
                        if (tableIdMap)
                            tableIdMap.set(linkedTableId, linkedTableResult.newTableId);
                        // Remplacer DANS LE JSON les références
                        rewrittenConditionSet = replaceInJson(rewrittenConditionSet, new Map([
                            ["@table.".concat(linkedTableId), "@table.".concat(linkedTableResult.newTableId)],
                            ["node-table:".concat(linkedTableId), "node-table:".concat(linkedTableResult.newTableId)]
                        ]));
                    }
                    else {
                        console.warn("   \u26A0\uFE0F \u00C9chec copie table li\u00E9e: ".concat(linkedTableId));
                    }
                    return [3 /*break*/, 33];
                case 32:
                    e_3 = _g.sent();
                    console.error("   \u274C Exception copie table li\u00E9e:", e_3.message);
                    return [3 /*break*/, 33];
                case 33:
                    _f++;
                    return [3 /*break*/, 29];
                case 34: return [3 /*break*/, 36];
                case 35:
                    console.log("   (Aucune table li\u00E9e trouv\u00E9e dans le conditionSet)");
                    _g.label = 36;
                case 36: return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: newConditionId } })];
                case 37:
                    newCondition = _g.sent();
                    if (!newCondition) return [3 /*break*/, 39];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.update({
                            where: { id: newConditionId },
                            data: {
                                nodeId: finalOwnerNodeId,
                                name: originalCondition.name ? "".concat(originalCondition.name, "-").concat(suffix) : null,
                                description: originalCondition.description,
                                conditionSet: rewrittenConditionSet,
                                metadata: originalCondition.metadata,
                                updatedAt: new Date()
                            }
                        })];
                case 38:
                    // Mise à jour minimale pour garder l'id stable entre ré-exécutions
                    newCondition = _g.sent();
                    return [3 /*break*/, 41];
                case 39: return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.create({
                        data: {
                            id: newConditionId,
                            nodeId: finalOwnerNodeId,
                            organizationId: originalCondition.organizationId,
                            name: originalCondition.name ? "".concat(originalCondition.name, "-").concat(suffix) : null,
                            description: originalCondition.description,
                            conditionSet: rewrittenConditionSet,
                            metadata: originalCondition.metadata,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
                case 40:
                    newCondition = _g.sent();
                    _g.label = 41;
                case 41:
                    console.log("\u2705 Condition cr\u00E9\u00E9e: ".concat(newCondition.id));
                    _g.label = 42;
                case 42:
                    _g.trys.push([42, 44, , 45]);
                    return [4 /*yield*/, (0, universal_linking_system_1.linkConditionToAllNodes)(prisma, newConditionId, rewrittenConditionSet)];
                case 43:
                    _g.sent();
                    return [3 /*break*/, 45];
                case 44:
                    e_4 = _g.sent();
                    console.error("\u274C Erreur LIAISON AUTOMATIQUE:", e_4.message);
                    return [3 /*break*/, 45];
                case 45:
                    _g.trys.push([45, 47, , 48]);
                    return [4 /*yield*/, addToNodeLinkedField(prisma, finalOwnerNodeId, 'linkedConditionIds', [newConditionId])];
                case 46:
                    _g.sent();
                    console.log("\u2705 linkedConditionIds mis \u00E0 jour pour n\u0153ud propri\u00E9taire ".concat(finalOwnerNodeId));
                    return [3 /*break*/, 48];
                case 47:
                    e_5 = _g.sent();
                    console.warn("\u26A0\uFE0F Erreur MAJ linkedConditionIds du propri\u00E9taire:", e_5.message);
                    return [3 /*break*/, 48];
                case 48:
                    _g.trys.push([48, 50, , 51]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: finalOwnerNodeId },
                            data: {
                                hasCondition: true,
                                condition_activeId: newConditionId,
                                condition_name: newCondition.name,
                                condition_description: newCondition.description
                            }
                        })];
                case 49:
                    _g.sent();
                    console.log("\u2705 Param\u00E8tres capacit\u00E9 (condition) mis \u00E0 jour pour n\u0153ud ".concat(finalOwnerNodeId));
                    console.log("   - condition_activeId: ".concat(newConditionId));
                    console.log("   - condition_name: ".concat(newCondition.name || 'null'));
                    return [3 /*break*/, 51];
                case 50:
                    e_6 = _g.sent();
                    console.warn("\u26A0\uFE0F Erreur lors de la mise \u00E0 jour des param\u00E8tres capacit\u00E9:", e_6.message);
                    return [3 /*break*/, 51];
                case 51:
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔗 ÉTAPE 8 : Mettre en cache
                    // ═══════════════════════════════════════════════════════════════════════
                    conditionCopyCache.set(originalConditionId, newConditionId);
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\u2705 COPIE CONDITION TERMIN\u00C9E");
                    console.log("".concat('═'.repeat(80), "\n"));
                    return [2 /*return*/, {
                            newConditionId: newConditionId,
                            nodeId: finalOwnerNodeId,
                            conditionSet: rewrittenConditionSet,
                            success: true
                        }];
                case 52:
                    error_1 = _g.sent();
                    console.error("\u274C Erreur lors de la copie de la condition:", error_1);
                    return [2 /*return*/, {
                            newConditionId: '',
                            nodeId: '',
                            conditionSet: null,
                            success: false,
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        }];
                case 53: return [2 /*return*/];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES POUR LINKED FIELDS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Ajoute des IDs à un champ linked... d'un nœud (sans doublons)
 */
function addToNodeLinkedField(prisma, nodeId, field, idsToAdd) {
    return __awaiter(this, void 0, void 0, function () {
        var node, current, newIds;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!idsToAdd || idsToAdd.length === 0)
                        return [2 /*return*/];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: (_a = {}, _a[field] = true, _a)
                        })];
                case 1:
                    node = _c.sent();
                    if (!node) {
                        console.warn("\u26A0\uFE0F N\u0153ud ".concat(nodeId, " introuvable pour MAJ ").concat(field));
                        return [2 /*return*/];
                    }
                    current = (node[field] || []);
                    newIds = __spreadArray([], new Set(__spreadArray(__spreadArray([], current, true), idsToAdd, true)), true);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: (_b = {}, _b[field] = { set: newIds }, _b)
                        })];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}

"use strict";
/**
 * 🧮 Système de copie des FORMULES
 *
 * Ce module gère la copie complète d'une formule (TreeBranchLeafNodeFormula)
 * avec réécriture des tokens pour pointer vers les nouveaux IDs.
 *
 * PRINCIPES :
 * -----------
 * 1. Copier la formule avec suffixe
 * 2. Réécrire les tokens (@value.ID → @value.ID-suffix)
 * 3. 🔗 LIAISON AUTOMATIQUE OBLIGATOIRE: linkedFormulaIds sur TOUS les nœuds référencés
 * 4. Mettre à jour linkedFormulaIds du nœud propriétaire
 * 5. Synchroniser les paramètres de capacité (hasFormula, formula_activeId, etc.)
 *
 * @author System TBL
 * @version 2.0.0 - LIAISON AUTOMATIQUE OBLIGATOIRE
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
exports.copyFormulaCapacity = copyFormulaCapacity;
var universal_linking_system_1 = require("./universal-linking-system");
var universal_reference_rewriter_js_1 = require("./repeat/utils/universal-reference-rewriter.js");
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES DE RÉÉCRITURE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Réécrire les tokens d'une formule pour remplacer les anciens IDs par les nouveaux
 *
 * Format des tokens :
 * - Array de strings/objets : ["@value.abc-123", "+", "@value.def-456"]
 * - Peut contenir des UUIDs ou des node_xxx
 *
 * @param tokens - Tokens originaux
 * @param idMap - Map ancien ID → nouveau ID
 * @param suffix - Suffixe à ajouter si ID pas trouvé dans la map
 * @returns Tokens réécrits
 *
 * @example
 * rewriteFormulaTokens(
 *   ["@value.abc", "+", "@value.def"],
 *   new Map([["abc", "abc-1"]]),
 *   1
 * )
 * → ["@value.abc-1", "+", "@value.def-1"]
 */
function rewriteFormulaTokens(tokens, idMap, suffix) {
    if (!tokens)
        return tokens;
    var rewriteString = function (str) {
        // ✅ FIX REPEATER REFERENCES (02/12/2025):
        // PROBLÈME: Les shared-ref du repeater n'étaient pas suffixées
        // SOLUTION: Traiter TOUTES les références (@value.<ID>) de la même manière
        // - Si trouvée dans la map → utiliser le mapping
        // - Sinon si suffixe fourni → ajouter le suffixe
        // - Y compris pour les shared-ref!
        return str.replace(/@value\.([A-Za-z0-9_:-]+(?:-[A-Za-z0-9]+)*)/g, function (_match, nodeId) {
            // 1. Chercher dans la map des nœuds mappés (y compris les shared-ref mappées)
            var mappedId = idMap.get(nodeId);
            if (mappedId) {
                console.log("\uD83D\uDD04 [FORMULA-TOKENS] Mapping trouv\u00E9: ".concat(nodeId, " \u2192 ").concat(mappedId));
                return "@value.".concat(mappedId);
            }
            // 2. Si pas dans la map et qu'on a un suffixe, l'ajouter automatiquement
            if (suffix !== undefined) {
                var suffixStr = "".concat(suffix);
                var suffixedId = "".concat(nodeId, "-").concat(suffixStr);
                console.log("\u2795 [FORMULA-TOKENS] Suffixe ajout\u00E9: ".concat(nodeId, " \u2192 ").concat(suffixedId));
                return "@value.".concat(suffixedId);
            }
            // 3. Sinon garder tel quel
            console.log("\u26AA [FORMULA-TOKENS] Inchang\u00E9: ".concat(nodeId));
            return "@value.".concat(nodeId);
        });
    };
    // Si tokens est un array
    if (Array.isArray(tokens)) {
        return tokens.map(function (token) {
            if (typeof token === 'string') {
                return rewriteString(token);
            }
            // Si c'est un objet, stringify puis rewrite puis parse
            if (token && typeof token === 'object') {
                try {
                    var str = JSON.stringify(token);
                    var rewritten = rewriteString(str);
                    return JSON.parse(rewritten);
                }
                catch (_a) {
                    return token;
                }
            }
            return token;
        });
    }
    // Si tokens est une string
    if (typeof tokens === 'string') {
        return rewriteString(tokens);
    }
    // Si tokens est un objet
    if (tokens && typeof tokens === 'object') {
        try {
            var str = JSON.stringify(tokens);
            var rewritten = rewriteString(str);
            return JSON.parse(rewritten);
        }
        catch (_a) {
            return tokens;
        }
    }
    return tokens;
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Copie une formule avec réécriture des tokens
 *
 * PROCESSUS :
 * -----------
 * 1. Vérifier le cache (éviter doublons)
 * 2. Récupérer la formule originale
 * 3. Générer le nouvel ID avec suffixe
 * 4. Réécrire les tokens (@value.ID → @value.ID-suffix)
 * 5. Créer la nouvelle formule
 * 6. Mettre à jour linkedFormulaIds du nœud
 * 7. Synchroniser les paramètres de capacité
 * 8. Mettre en cache
 *
 * @param originalFormulaId - ID de la formule à copier
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec nodeIdMap
 * @returns Résultat de la copie
 *
 * @example
 * const result = await copyFormulaCapacity(
 *   'formula-abc',
 *   'node-xyz-1',
 *   1,
 *   prisma,
 *   { nodeIdMap: new Map([['node-a', 'node-a-1']]) }
 * );
 * // result.newFormulaId = 'formula-abc-1'
 * // result.tokens = ["@value.node-a-1", "+", "5"]
 */
function copyFormulaCapacity(originalFormulaId_1, newNodeId_1, suffix_1, prisma_1) {
    return __awaiter(this, arguments, void 0, function (originalFormulaId, newNodeId, suffix, prisma, options) {
        var _a, nodeIdMap, _b, formulaCopyCache, cachedId, cached, cleanFormulaId, originalFormula, newFormulaId, originalOwnerNodeId, correctOwnerNodeId, ownerNodeExists, finalOwnerNodeId, rewriteMaps, rewrittenTokens, sharedRefsCountBefore, sharedRefsCountAfter1, sharedRefsCountAfter2, unsuffixed, newFormula, savedFormula, savedSharedRefs, suffixed, nonSuffixed, e_1, e_2, e_3, error_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83E\uDDEE COPIE FORMULE: ".concat(originalFormulaId));
                    console.log("   Suffixe: ".concat(suffix));
                    console.log("   Nouveau n\u0153ud: ".concat(newNodeId));
                    console.log("".concat('═'.repeat(80), "\n"));
                    _a = options.nodeIdMap, nodeIdMap = _a === void 0 ? new Map() : _a, _b = options.formulaCopyCache, formulaCopyCache = _b === void 0 ? new Map() : _b;
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 18, , 19]);
                    if (!formulaCopyCache.has(originalFormulaId)) return [3 /*break*/, 3];
                    cachedId = formulaCopyCache.get(originalFormulaId);
                    console.log("\u267B\uFE0F Formule d\u00E9j\u00E0 copi\u00E9e (cache): ".concat(originalFormulaId, " \u2192 ").concat(cachedId));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: cachedId }
                        })];
                case 2:
                    cached = _c.sent();
                    if (cached) {
                        return [2 /*return*/, {
                                newFormulaId: cached.id,
                                nodeId: cached.nodeId,
                                tokens: cached.tokens,
                                success: true
                            }];
                    }
                    _c.label = 3;
                case 3:
                    cleanFormulaId = originalFormulaId.replace(/-\d+$/, '');
                    console.log("\uD83D\uDD0D Recherche formule avec id: ".concat(cleanFormulaId, " (original: ").concat(originalFormulaId, ")"));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: cleanFormulaId }
                        })];
                case 4:
                    originalFormula = _c.sent();
                    if (!originalFormula) {
                        console.error("\u274C Formule introuvable avec id: ".concat(cleanFormulaId));
                        return [2 /*return*/, {
                                newFormulaId: '',
                                nodeId: '',
                                tokens: null,
                                success: false,
                                error: "Formule introuvable avec id: ".concat(cleanFormulaId)
                            }];
                    }
                    console.log("\u2705 Formule trouv\u00E9e: ".concat(originalFormula.name || originalFormula.id));
                    console.log("   NodeId original: ".concat(originalFormula.nodeId));
                    console.log("   Tokens originaux:", originalFormula.tokens);
                    newFormulaId = "".concat(originalFormula.id, "-").concat(suffix);
                    console.log("\uD83D\uDCDD Nouvel ID formule: ".concat(newFormulaId));
                    originalOwnerNodeId = originalFormula.nodeId;
                    correctOwnerNodeId = "".concat(originalOwnerNodeId, "-").concat(suffix);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: correctOwnerNodeId },
                            select: { id: true, label: true }
                        })];
                case 5:
                    ownerNodeExists = _c.sent();
                    finalOwnerNodeId = ownerNodeExists ? correctOwnerNodeId : newNodeId;
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId original propri\u00E9taire: ".concat(originalOwnerNodeId));
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId propri\u00E9taire suffix\u00E9: ".concat(correctOwnerNodeId));
                    console.log("\uD83D\uDD27 [OWNER FIX] Propri\u00E9taire suffix\u00E9 existe: ".concat(ownerNodeExists ? 'OUI (' + ownerNodeExists.label + ')' : 'NON'));
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId FINAL utilis\u00E9: ".concat(finalOwnerNodeId));
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔄 ÉTAPE 4 : Réécrire les tokens
                    // ═══════════════════════════════════════════════════════════════════════
                    console.log("\n\uD83D\uDD04 R\u00E9\u00E9criture des tokens...");
                    console.log("   Nombre d'IDs dans la map: ".concat(nodeIdMap.size));
                    rewriteMaps = {
                        nodeIdMap: nodeIdMap,
                        formulaIdMap: formulaCopyCache || new Map(),
                        conditionIdMap: new Map(), // Pas besoin ici mais requis par l'interface
                        tableIdMap: new Map() // Pas besoin ici mais requis par l'interface
                    };
                    rewrittenTokens = (0, universal_reference_rewriter_js_1.rewriteJsonReferences)(originalFormula.tokens, rewriteMaps, suffix);
                    console.log("\u2705 Tokens r\u00E9\u00E9crits (1\u00E8re passe):", rewrittenTokens);
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔥 RÉÉCRITURE FORCÉE DES SHARED-REFS
                    // ═══════════════════════════════════════════════════════════════════════
                    // Utiliser la fonction helper pour forcer les suffixes sur TOUS les shared-refs
                    console.log("\n\uD83D\uDD25 AVANT forceSharedRefSuffixes: ".concat(Array.isArray(rewrittenTokens) ? rewrittenTokens.length : '?', " tokens"));
                    sharedRefsCountBefore = rewrittenTokens && Array.isArray(rewrittenTokens)
                        ? rewrittenTokens.filter(function (t) { return typeof t === 'string' && t.includes('shared-ref'); }).length
                        : 0;
                    console.log("   Shared-refs avant: ".concat(sharedRefsCountBefore));
                    rewrittenTokens = (0, universal_reference_rewriter_js_1.forceSharedRefSuffixes)(rewrittenTokens, suffix);
                    console.log("\u2705 APR\u00C8S forceSharedRefSuffixes:");
                    sharedRefsCountAfter1 = rewrittenTokens && Array.isArray(rewrittenTokens)
                        ? rewrittenTokens.filter(function (t) { return typeof t === 'string' && t.includes('shared-ref'); }).length
                        : 0;
                    console.log("   Shared-refs apr\u00E8s: ".concat(sharedRefsCountAfter1));
                    // 🔥 RÉÉCRITURE RÉCURSIVE - Appel AUSSI la version JSON pour traiter les structures imbriquées
                    console.log("\n\uD83D\uDD25 AVANT forceSharedRefSuffixesInJson:");
                    rewrittenTokens = (0, universal_reference_rewriter_js_1.forceSharedRefSuffixesInJson)(rewrittenTokens, suffix);
                    console.log("\u2705 APR\u00C8S forceSharedRefSuffixesInJson:");
                    sharedRefsCountAfter2 = rewrittenTokens && Array.isArray(rewrittenTokens)
                        ? rewrittenTokens.filter(function (t) { return typeof t === 'string' && t.includes('shared-ref'); }).length
                        : 0;
                    console.log("   Shared-refs final: ".concat(sharedRefsCountAfter2));
                    console.log("\u2705 Tokens r\u00E9\u00E9crits (2\u00E8me passe - shared-refs forc\u00E9s):", rewrittenTokens);
                    console.log("\uD83D\uDD0D DEBUG: Cherchons shared-refs NON-suffix\u00E9s dans les tokens...");
                    if (Array.isArray(rewrittenTokens)) {
                        unsuffixed = rewrittenTokens.filter(function (t) {
                            return typeof t === 'string' && t.includes('shared-ref') && !/-\d+$/.test(t);
                        });
                        if (unsuffixed.length > 0) {
                            console.error("\u274C ALERTE: ".concat(unsuffixed.length, " shared-refs TOUJOURS non-suffix\u00E9s:"), unsuffixed);
                        }
                        else {
                            console.log("\u2705 Tous les shared-refs sont suffix\u00E9s !");
                        }
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.create({
                            data: {
                                id: newFormulaId,
                                nodeId: finalOwnerNodeId,
                                organizationId: originalFormula.organizationId,
                                name: originalFormula.name ? "".concat(originalFormula.name, "-").concat(suffix) : null,
                                description: originalFormula.description,
                                tokens: rewrittenTokens,
                                metadata: originalFormula.metadata,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        })];
                case 6:
                    newFormula = _c.sent();
                    console.log("\u2705 Formule cr\u00E9\u00E9e: ".concat(newFormula.id));
                    // 🔍 VÉRIFICATION POST-CRÉATION: Lire immédiatement ce qui a été sauvegardé
                    console.log("\n\uD83D\uDD0D V\u00C9RIFICATION POST-CR\u00C9ATION:");
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: newFormula.id }
                        })];
                case 7:
                    savedFormula = _c.sent();
                    if (savedFormula && Array.isArray(savedFormula.tokens)) {
                        savedSharedRefs = savedFormula.tokens.filter(function (t) {
                            return typeof t === 'string' && t.includes('shared-ref');
                        });
                        suffixed = savedSharedRefs.filter(function (s) { return /-\d+$/.test(s); });
                        nonSuffixed = savedSharedRefs.filter(function (s) { return !/-\d+$/.test(s); });
                        console.log("   Saved tokens: ".concat(savedFormula.tokens.length));
                        console.log("   Shared-refs en BD: ".concat(savedSharedRefs.length));
                        console.log("   \u2705 Suffix\u00E9s: ".concat(suffixed.length));
                        console.log("   \u274C Non-suffix\u00E9s: ".concat(nonSuffixed.length));
                        if (nonSuffixed.length > 0) {
                            console.error("\uD83D\uDEA8 ERREUR! Tokens non-suffix\u00E9s en BD:", nonSuffixed.slice(0, 2));
                        }
                        else {
                            console.log("\u2705 SUCC\u00C8S! Tous les shared-refs sont suffix\u00E9s en BD!");
                        }
                    }
                    console.log();
                    _c.label = 8;
                case 8:
                    _c.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, (0, universal_linking_system_1.linkFormulaToAllNodes)(prisma, newFormulaId, rewrittenTokens)];
                case 9:
                    _c.sent();
                    return [3 /*break*/, 11];
                case 10:
                    e_1 = _c.sent();
                    console.error("\u274C Erreur LIAISON AUTOMATIQUE:", e_1.message);
                    return [3 /*break*/, 11];
                case 11:
                    _c.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, addToNodeLinkedField(prisma, finalOwnerNodeId, 'linkedFormulaIds', [newFormulaId])];
                case 12:
                    _c.sent();
                    console.log("\u2705 linkedFormulaIds mis \u00E0 jour pour n\u0153ud propri\u00E9taire ".concat(finalOwnerNodeId));
                    return [3 /*break*/, 14];
                case 13:
                    e_2 = _c.sent();
                    console.warn("\u26A0\uFE0F Erreur MAJ linkedFormulaIds du propri\u00E9taire:", e_2.message);
                    return [3 /*break*/, 14];
                case 14:
                    _c.trys.push([14, 16, , 17]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: finalOwnerNodeId },
                            data: {
                                hasFormula: true,
                                formula_activeId: newFormulaId,
                                formula_name: newFormula.name,
                                formula_description: newFormula.description
                            }
                        })];
                case 15:
                    _c.sent();
                    console.log("\u2705 Param\u00E8tres capacit\u00E9 (formula) mis \u00E0 jour pour n\u0153ud ".concat(finalOwnerNodeId));
                    console.log("   - formula_activeId: ".concat(newFormulaId));
                    console.log("   - formula_name: ".concat(newFormula.name || 'null'));
                    return [3 /*break*/, 17];
                case 16:
                    e_3 = _c.sent();
                    console.warn("\u26A0\uFE0F Erreur lors de la mise \u00E0 jour des param\u00E8tres capacit\u00E9:", e_3.message);
                    return [3 /*break*/, 17];
                case 17:
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔗 ÉTAPE 8 : Mettre en cache
                    // ═══════════════════════════════════════════════════════════════════════
                    formulaCopyCache.set(originalFormulaId, newFormulaId);
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\u2705 COPIE FORMULE TERMIN\u00C9E");
                    console.log("".concat('═'.repeat(80), "\n"));
                    return [2 /*return*/, {
                            newFormulaId: newFormulaId,
                            nodeId: finalOwnerNodeId,
                            tokens: rewrittenTokens,
                            success: true
                        }];
                case 18:
                    error_1 = _c.sent();
                    console.error("\u274C Erreur lors de la copie de la formule:", error_1);
                    return [2 /*return*/, {
                            newFormulaId: '',
                            nodeId: '',
                            tokens: null,
                            success: false,
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        }];
                case 19: return [2 /*return*/];
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

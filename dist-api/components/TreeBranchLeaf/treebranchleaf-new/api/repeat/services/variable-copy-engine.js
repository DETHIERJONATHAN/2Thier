"use strict";
/**
 * 🔧 Système de copie des variables avec leurs capacités
 *
 * Ce module gère la copie complète des variables (TreeBranchLeafNodeVariable)
 * et de leurs capacités associées (formules, conditions, tables).
 *
 * PRINCIPES :
 * -----------
 * 1. Une variable peut avoir une "capacité" définie par sourceType + sourceRef
 * 2. Les formats de sourceRef sont :
 *    - "node-formula:ID" → Formule
 *    - "condition:ID" ou "node-condition:ID" → Condition
 *    - "@table.ID" ou "node-table:ID" → Table
 *    - UUID simple → Champ (field)
 * 3. Lors de la copie, on applique un suffixe sur TOUS les IDs
 * 4. Les références sont mises à jour pour pointer vers les capacités copiées
 * 5. Les colonnes linked... sont synchronisées dans les deux sens
 *
 * ⚠️ PIÈGE CRITIQUE (Déjà cassé par le passé):
 * ------------------------------------------------
 * La variable newSourceRef DOIT être MUTABLE (let) car elle est réassignée
 * dans plusieurs branches (condition/table/field) lors de la copie.
 * Si on la repasse en const, la création plantera au runtime (reassignation d'un const)
 * et la variable ne sera PAS créée. Ne pas modifier "let newSourceRef" en const.
 *
 * @author System TBL
 * @version 1.0.0
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
exports.copyVariableWithCapacities = copyVariableWithCapacities;
exports.createDisplayNodeForExistingVariable = createDisplayNodeForExistingVariable;
exports.copyLinkedVariablesFromNode = copyLinkedVariablesFromNode;
var repeat_blueprint_writer_js_1 = require("../repeat-blueprint-writer.js");
var source_ref_js_1 = require("../utils/source-ref.js");
var universal_linking_system_js_1 = require("../../universal-linking-system.js");
// 📊 Import pour la mise à jour des champs Total après copie
var sum_display_field_routes_js_1 = require("../../sum-display-field-routes.js");
// ═══════════════════════════════════════════════════════════════════════════
// 🔗 IMPORTS DES MODULES DE COPIE DE CAPACITÉS
// ═══════════════════════════════════════════════════════════════════════════
var copy_capacity_formula_js_1 = require("../../copy-capacity-formula.js");
var copy_capacity_condition_js_1 = require("../../copy-capacity-condition.js");
var copy_capacity_table_js_1 = require("../../copy-capacity-table.js");
// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Copie une variable avec sa capacité associée
 *
 * PROCESSUS :
 * -----------
 * 1. Récupère la variable originale
 * 2. Vérifie si déjà copiée (cache)
 * 3. Génère les nouveaux IDs avec suffixe
 * 4. Parse le sourceRef pour identifier la capacité
 * 5. Mappe vers la capacité copiée (si disponible dans les maps)
 * 6. Crée la nouvelle variable
 * 7. Met à jour linkedVariableIds du nœud propriétaire
 * 8. Met à jour linkedXxxIds de la capacité (bidirectionnel)
 *
 * @param originalVarId - ID de la variable à copier
 * @param suffix - Suffixe numérique à appliquer
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param prisma - Instance Prisma Client
 * @param options - Options avec les maps de références
 * @returns Résultat de la copie
 */
function copyVariableWithCapacities(originalVarId_1, suffix_1, newNodeId_1, prisma_1) {
    return __awaiter(this, arguments, void 0, function (originalVarId, suffix, newNodeId, prisma, options) {
        var _a, formulaIdMap, _b, conditionIdMap, _c, tableIdMap, _d, nodeIdMap, _e, variableCopyCache, _f, autoCreateDisplayNode, _g, displaySectionLabel, _h, linkToDisplaySection, displayParentId, _j, isFromRepeaterDuplication, repeatContext, cacheKey, cachedId, cached, parsed, originalVar, orphanLinkedVarIds, _i, orphanLinkedVarIds_1, node, cleaned, cleanErr_1, normalizedRepeatContext_1, suffixToken_1, stripTrailingNumeric_1, appendSuffixOnce_1, forceSingleSuffix, newVarId, newExposedKey, newSourceRef, capacityType, emitCapacityEvent, parsed, applySuffixOnceToSourceRef, mappedFormulaId, formulaResult, e_1, mappedConditionId, conditionResult, e_2, mappedTableId, tableResult, e_3, isSharedRefField, finalNodeId, parseJsonIfNeeded, originalOwnerNode, displayNodeSelect, hasRepeaterMetadata_1, pickDisplayCandidate, originalDisplayNode, templateNodeIds, templateIds, candidates, duplicatedOwnerNode, inheritedDisplayParentId, resolvedParentId, parentExists, parentCheckErr_1, displayNodeBaseId, baseNormalized, displayNodeId, now, cloneJson, ownerMetadata, inheritedMetadata, metadataForDisplay, ownerSubTabRaw, ownerSubTabsRaw, ownerSubTabsArray_1, inheritedSubTab, inheritedSubTabsRaw, inheritedSubTabs_1, appendSuffix_1, cloneAndSuffixInstances, formatSubTabColumn, tableSourceNode, displayLabel, resolvedOrder, resolvedSubTabsJson, displayNodeData, maybeExisting, copiedFormulaIds, copiedConditionIds, originalFormulas, _k, originalFormulas_1, f, newFormulaId, existingFormula, formulaResult, error_1, originalConditions, _l, originalConditions_1, c, newConditionId, existingCondition, conditionResult, error_2, updateData, newFormulaActiveId, newConditionActiveId, copiedTableIds, _m, _o, originalTableId, newTableId, existingTable, tableResult, tableErr_1, copyCapErr_1, e_4, existingById, tail, adjusted, e_5, existingByKey, tail, adjustedKey, e_6, _reusingExistingVariable, _existingVariableForReuse, existingForNode, expectedVarId, hasSuffixMatch, normalizedExistingName, isCopiedNode, e_7, cacheKey_1, delError_1, e_8, newVariable, normalizedDisplayName, newLinkedFormulaIds, _p, _q, formulaId, mappedId, formulaResult, e_9, newLinkedConditionIds, _r, _s, conditionId, mappedId, conditionResult, e_10, newLinkedTableIds, _t, _u, tableId, mappedId, tableResult, e_11, createError_1, metadataPayload, e_12, verification, normalizedNodeLabel, e_13, originalOwnerNode, displaySection, e_14, isCopiedNode, e_15, parsedCap, capId, cond, suffixedVarId, targetNode, current, withoutOriginal, candidates, next_1, changed, e_16, tbl, e_17, e_18, cacheKeyFinal, parsed, formula, condition, table, e_19, originalVariable, sumErr_1, error_3;
        var _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_34) {
            switch (_34.label) {
                case 0:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uFFFD\uD83D\uDE80\uD83D\uDE80 [ENTRY] copyVariableWithCapacities APPEL\u00C9E !");
                    console.log("\uFFFD\uD83D\uDD17 COPIE VARIABLE: ".concat(originalVarId));
                    console.log("   Suffixe: ".concat(suffix));
                    console.log("   Nouveau n\u0153ud: ".concat(newNodeId));
                    console.log("   Options:", {
                        formulaIdMapSize: (_v = options.formulaIdMap) === null || _v === void 0 ? void 0 : _v.size,
                        conditionIdMapSize: (_w = options.conditionIdMap) === null || _w === void 0 ? void 0 : _w.size,
                        tableIdMapSize: (_x = options.tableIdMap) === null || _x === void 0 ? void 0 : _x.size,
                        nodeIdMapSize: (_y = options.nodeIdMap) === null || _y === void 0 ? void 0 : _y.size,
                        variableCopyCacheSize: (_z = options.variableCopyCache) === null || _z === void 0 ? void 0 : _z.size,
                        autoCreateDisplayNode: options.autoCreateDisplayNode
                    });
                    console.log("".concat('═'.repeat(80), "\n"));
                    _a = options.formulaIdMap, formulaIdMap = _a === void 0 ? new Map() : _a, _b = options.conditionIdMap, conditionIdMap = _b === void 0 ? new Map() : _b, _c = options.tableIdMap, tableIdMap = _c === void 0 ? new Map() : _c, _d = options.nodeIdMap, nodeIdMap = _d === void 0 ? new Map() : _d, _e = options.variableCopyCache, variableCopyCache = _e === void 0 ? new Map() : _e, _f = options.autoCreateDisplayNode, autoCreateDisplayNode = _f === void 0 ? false : _f, _g = options.displaySectionLabel, displaySectionLabel = _g === void 0 ? 'Nouveau Section' : _g, _h = options.linkToDisplaySection, linkToDisplaySection = _h === void 0 ? false : _h, displayParentId = options.displayParentId, _j = options.isFromRepeaterDuplication, isFromRepeaterDuplication = _j === void 0 ? false : _j, repeatContext = options.repeatContext;
                    _34.label = 1;
                case 1:
                    _34.trys.push([1, 199, , 200]);
                    cacheKey = "".concat(originalVarId, "|").concat(newNodeId);
                    if (!variableCopyCache.has(cacheKey)) return [3 /*break*/, 3];
                    cachedId = variableCopyCache.get(cacheKey);
                    console.log("\u267B\uFE0F Variable d\u00E9j\u00E0 copi\u00E9e pour ce n\u0153ud (cache): ".concat(originalVarId, " \u2192 ").concat(cachedId));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                            where: { id: cachedId }
                        })];
                case 2:
                    cached = _34.sent();
                    if (cached) {
                        parsed = (0, source_ref_js_1.parseSourceRef)(cached.sourceRef);
                        return [2 /*return*/, {
                                variableId: cached.id,
                                exposedKey: cached.exposedKey,
                                capacityType: (parsed === null || parsed === void 0 ? void 0 : parsed.type) || null,
                                sourceRef: cached.sourceRef,
                                success: true,
                                displayNodeId: undefined
                            }];
                    }
                    _34.label = 3;
                case 3: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                        where: { id: originalVarId }
                    })];
                case 4:
                    originalVar = _34.sent();
                    if (!!originalVar) return [3 /*break*/, 13];
                    console.error("\u274C Variable introuvable: ".concat(originalVarId));
                    console.warn("\u26A0\uFE0F Cette variable est ORPHELINE - elle ne peut pas \u00EAtre copi\u00E9e");
                    if (!newNodeId) return [3 /*break*/, 12];
                    _34.label = 5;
                case 5:
                    _34.trys.push([5, 11, , 12]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: {
                                linkedVariableIds: {
                                    hasSome: [originalVarId]
                                }
                            },
                            select: { id: true, linkedVariableIds: true }
                        })];
                case 6:
                    orphanLinkedVarIds = _34.sent();
                    _i = 0, orphanLinkedVarIds_1 = orphanLinkedVarIds;
                    _34.label = 7;
                case 7:
                    if (!(_i < orphanLinkedVarIds_1.length)) return [3 /*break*/, 10];
                    node = orphanLinkedVarIds_1[_i];
                    cleaned = (node.linkedVariableIds || []).filter(function (id) { return id !== originalVarId; });
                    if (!(cleaned.length !== ((_0 = node.linkedVariableIds) === null || _0 === void 0 ? void 0 : _0.length))) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: node.id },
                            data: { linkedVariableIds: cleaned }
                        })];
                case 8:
                    _34.sent();
                    console.log("\uD83E\uDDF9 Nettoy\u00E9 linkedVariableIds orphelin de ".concat(node.id));
                    _34.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10: return [3 /*break*/, 12];
                case 11:
                    cleanErr_1 = _34.sent();
                    console.warn("\u26A0\uFE0F Impossible de nettoyer linkedVariableIds orphelins:", cleanErr_1.message);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/, {
                        variableId: '',
                        exposedKey: '',
                        capacityType: null,
                        sourceRef: null,
                        success: false,
                        displayNodeId: undefined,
                        error: "Variable introuvable: ".concat(originalVarId)
                    }];
                case 13:
                    console.log("\u2705 Variable trouv\u00E9e: ".concat(originalVar.displayName));
                    console.log("   sourceType: ".concat(originalVar.sourceType));
                    console.log("   sourceRef: ".concat(originalVar.sourceRef || 'null'));
                    console.log("   \uD83D\uDCCD DEBUG: newVariable.displayName sera utilis\u00E9 pour le label du n\u0153ud d'affichage");
                    normalizedRepeatContext_1 = repeatContext
                        ? __assign(__assign({}, repeatContext), { templateNodeId: (_2 = (_1 = repeatContext.templateNodeId) !== null && _1 !== void 0 ? _1 : originalVar.nodeId) !== null && _2 !== void 0 ? _2 : undefined, suffix: (_3 = repeatContext.suffix) !== null && _3 !== void 0 ? _3 : suffix }) : undefined;
                    suffixToken_1 = "".concat(suffix);
                    stripTrailingNumeric_1 = function (raw) {
                        if (!raw)
                            return '';
                        var trimmed = raw.trim();
                        // Enlever TOUTES les séquences finales "-<nombre>" (ex: "foo-1-1" → "foo")
                        return trimmed.replace(/(?:-\d+)+\s*$/, '');
                    };
                    appendSuffixOnce_1 = function (value) {
                        if (!value)
                            return value !== null && value !== void 0 ? value : '';
                        var base = stripTrailingNumeric_1(value);
                        return base.endsWith("-".concat(suffixToken_1)) ? base : "".concat(base, "-").concat(suffixToken_1);
                    };
                    forceSingleSuffix = function (value) {
                        if (!value)
                            return value !== null && value !== void 0 ? value : '';
                        var base = stripTrailingNumeric_1(value);
                        return "".concat(base, "-").concat(suffixToken_1);
                    };
                    newVarId = appendSuffixOnce_1(originalVarId);
                    newExposedKey = appendSuffixOnce_1(originalVar.exposedKey);
                    console.log("\uD83D\uDCDD Pr\u00E9paration des IDs:");
                    console.log("   Variable (pr\u00E9liminaire): ".concat(newVarId));
                    console.log("   ExposedKey (pr\u00E9liminaire): ".concat(newExposedKey));
                    newSourceRef = originalVar.sourceRef;
                    capacityType = null;
                    emitCapacityEvent = function (capacityId, capacityKind) {
                        if (!normalizedRepeatContext_1 || !capacityId) {
                            return;
                        }
                        (0, repeat_blueprint_writer_js_1.logCapacityEvent)({
                            ownerNodeId: newNodeId,
                            capacityId: capacityId,
                            capacityType: capacityKind,
                            context: normalizedRepeatContext_1
                        });
                    };
                    console.log("\n\uD83D\uDD0D [COPY-VAR] Analyse sourceType=\"".concat(originalVar.sourceType, "\" sourceRef=\"").concat(originalVar.sourceRef, "\""));
                    if (!originalVar.sourceRef) return [3 /*break*/, 32];
                    parsed = (0, source_ref_js_1.parseSourceRef)(originalVar.sourceRef);
                    if (!parsed) return [3 /*break*/, 32];
                    capacityType = parsed.type;
                    console.log("\uD83D\uDD0D [COPY-VAR] Capacit\u00E9 d\u00E9tect\u00E9e: ".concat(capacityType, " (ID: ").concat(parsed.id, ")"));
                    console.log("\uD83D\uDCE6 [COPY-VAR] Maps disponibles - formulas: ".concat(formulaIdMap.size, ", conditions: ").concat(conditionIdMap.size, ", tables: ").concat(tableIdMap.size, ", nodes: ").concat(nodeIdMap.size));
                    applySuffixOnceToSourceRef = function (ref) {
                        var parsedRef = (0, source_ref_js_1.parseSourceRef)(ref || '');
                        if (!parsedRef)
                            return ref;
                        var baseId = stripTrailingNumeric_1(parsedRef.id);
                        if (baseId.endsWith("-".concat(suffixToken_1)))
                            return ref;
                        return (0, source_ref_js_1.applySuffixToSourceRef)("".concat(parsedRef.prefix).concat(baseId), suffix);
                    };
                    if (!(capacityType === 'formula')) return [3 /*break*/, 19];
                    console.log("\uD83E\uDDEE [COPY-VAR] Traitement FORMULE: ".concat(parsed.id));
                    if (!formulaIdMap.has(parsed.id)) return [3 /*break*/, 14];
                    mappedFormulaId = formulaIdMap.get(parsed.id);
                    newSourceRef = "".concat(parsed.prefix).concat(mappedFormulaId);
                    console.log("\u2705 [COPY-VAR] Formule d\u00E9j\u00E0 mapp\u00E9e: ".concat(parsed.id, " \u2192 ").concat(mappedFormulaId));
                    emitCapacityEvent(mappedFormulaId, 'formula');
                    return [3 /*break*/, 18];
                case 14:
                    // ⭐ COPIER LA FORMULE MAINTENANT
                    console.log("\n\uD83E\uDDEE [COPY-VAR] Lancement copie formule ".concat(parsed.id, "..."));
                    _34.label = 15;
                case 15:
                    _34.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, (0, copy_capacity_formula_js_1.copyFormulaCapacity)(parsed.id, newNodeId, suffix, prisma, { nodeIdMap: nodeIdMap, formulaCopyCache: formulaIdMap })];
                case 16:
                    formulaResult = _34.sent();
                    if (formulaResult.success) {
                        // Ajouter au map pour les prochaines copies
                        formulaIdMap.set(parsed.id, formulaResult.newFormulaId);
                        newSourceRef = "".concat(parsed.prefix).concat(formulaResult.newFormulaId);
                        console.log("\u2705 [COPY-VAR] Formule copi\u00E9e et mapp\u00E9e: ".concat(parsed.id, " \u2192 ").concat(formulaResult.newFormulaId));
                        emitCapacityEvent(formulaResult.newFormulaId, 'formula');
                    }
                    else {
                        newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                        console.log("\u26A0\uFE0F [COPY-VAR] \u00C9chec copie formule (".concat(formulaResult.error, "), suffixe appliqu\u00E9: ").concat(newSourceRef));
                    }
                    return [3 /*break*/, 18];
                case 17:
                    e_1 = _34.sent();
                    console.error("\u274C [COPY-VAR] Exception copie formule:", e_1.message, e_1.stack);
                    newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                    return [3 /*break*/, 18];
                case 18: return [3 /*break*/, 32];
                case 19:
                    if (!(capacityType === 'condition')) return [3 /*break*/, 25];
                    if (!conditionIdMap.has(parsed.id)) return [3 /*break*/, 20];
                    mappedConditionId = conditionIdMap.get(parsed.id);
                    newSourceRef = "".concat(parsed.prefix).concat(mappedConditionId);
                    console.log("\u2705 Condition d\u00E9j\u00E0 mapp\u00E9e: ".concat(parsed.id, " \u2192 ").concat(mappedConditionId));
                    emitCapacityEvent(mappedConditionId, 'condition');
                    return [3 /*break*/, 24];
                case 20:
                    // ⭐ COPIER LA CONDITION MAINTENANT
                    console.log("\n\uD83D\uDD00 Copie de la condition ".concat(parsed.id, "..."));
                    _34.label = 21;
                case 21:
                    _34.trys.push([21, 23, , 24]);
                    return [4 /*yield*/, (0, copy_capacity_condition_js_1.copyConditionCapacity)(parsed.id, newNodeId, suffix, prisma, { nodeIdMap: nodeIdMap, formulaIdMap: formulaIdMap, conditionCopyCache: conditionIdMap })];
                case 22:
                    conditionResult = _34.sent();
                    if (conditionResult.success) {
                        // Ajouter au map
                        conditionIdMap.set(parsed.id, conditionResult.newConditionId);
                        newSourceRef = "".concat(parsed.prefix).concat(conditionResult.newConditionId);
                        console.log("\u2705 Condition copi\u00E9e et mapp\u00E9e: ".concat(parsed.id, " \u2192 ").concat(conditionResult.newConditionId));
                        emitCapacityEvent(conditionResult.newConditionId, 'condition');
                    }
                    else {
                        newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                        console.log("\u26A0\uFE0F \u00C9chec copie condition, suffixe appliqu\u00E9: ".concat(newSourceRef));
                    }
                    return [3 /*break*/, 24];
                case 23:
                    e_2 = _34.sent();
                    console.error("\u274C Exception copie condition:", e_2.message);
                    newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                    return [3 /*break*/, 24];
                case 24: return [3 /*break*/, 32];
                case 25:
                    if (!(capacityType === 'table')) return [3 /*break*/, 31];
                    if (!tableIdMap.has(parsed.id)) return [3 /*break*/, 26];
                    mappedTableId = tableIdMap.get(parsed.id);
                    newSourceRef = "".concat(parsed.prefix).concat(mappedTableId);
                    console.log("\u2705 Table d\u00E9j\u00E0 mapp\u00E9e: ".concat(parsed.id, " \u2192 ").concat(mappedTableId));
                    emitCapacityEvent(mappedTableId, 'table');
                    return [3 /*break*/, 30];
                case 26:
                    // ⭐ COPIER LA TABLE MAINTENANT
                    console.log("\n\uD83D\uDCCA Copie de la table ".concat(parsed.id, "..."));
                    _34.label = 27;
                case 27:
                    _34.trys.push([27, 29, , 30]);
                    return [4 /*yield*/, (0, copy_capacity_table_js_1.copyTableCapacity)(parsed.id, newNodeId, suffix, prisma, { nodeIdMap: nodeIdMap, tableCopyCache: tableIdMap, tableIdMap: tableIdMap })];
                case 28:
                    tableResult = _34.sent();
                    if (tableResult.success) {
                        // Ajouter au map
                        tableIdMap.set(parsed.id, tableResult.newTableId);
                        newSourceRef = "".concat(parsed.prefix).concat(tableResult.newTableId);
                        console.log("\u2705 Table copi\u00E9e et mapp\u00E9e: ".concat(parsed.id, " \u2192 ").concat(tableResult.newTableId));
                        console.log("   \uD83D\uDCCB ".concat(tableResult.columnsCount, " colonnes, ").concat(tableResult.rowsCount, " lignes, ").concat(tableResult.cellsCount, " cellules"));
                        emitCapacityEvent(tableResult.newTableId, 'table');
                    }
                    else {
                        newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                        console.log("\u26A0\uFE0F \u00C9chec copie table, suffixe appliqu\u00E9: ".concat(newSourceRef));
                    }
                    return [3 /*break*/, 30];
                case 29:
                    e_3 = _34.sent();
                    console.error("\u274C Exception copie table:", e_3.message);
                    newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                    return [3 /*break*/, 30];
                case 30: return [3 /*break*/, 32];
                case 31:
                    if (capacityType === 'field') {
                        isSharedRefField = parsed.id.startsWith('shared-ref-');
                        // Mapper le nodeId du champ si disponible
                        if (nodeIdMap.has(parsed.id)) {
                            newSourceRef = nodeIdMap.get(parsed.id);
                            console.log("\u2705 Champ mapp\u00E9: ".concat(parsed.id, " \u2192 ").concat(newSourceRef));
                        }
                        else if (isSharedRefField) {
                            // Ne pas suffixer une shared-ref si on n'a pas de mapping (elle reste partagée)
                            newSourceRef = parsed.id;
                            console.log("\u26AA Champ shared-ref conserv\u00E9 sans suffixe: ".concat(newSourceRef));
                        }
                        else {
                            newSourceRef = appendSuffixOnce_1(parsed.id);
                            console.log("\u26A0\uFE0F Champ non mapp\u00E9, suffixe appliqu\u00E9: ".concat(newSourceRef));
                        }
                    }
                    _34.label = 32;
                case 32:
                    console.log("\uD83D\uDCCD sourceRef final: ".concat(newSourceRef));
                    finalNodeId = newNodeId;
                    // 🔍 DEBUG: Vérifier l'état de nodeIdMap
                    console.log("\uD83D\uDD0D [DEBUG-DISPLAY] originalVar.nodeId: ".concat(originalVar.nodeId));
                    console.log("\uD83D\uDD0D [DEBUG-DISPLAY] nodeIdMap exists: ".concat(!!nodeIdMap));
                    console.log("\uD83D\uDD0D [DEBUG-DISPLAY] nodeIdMap.size: ".concat((nodeIdMap === null || nodeIdMap === void 0 ? void 0 : nodeIdMap.size) || 0));
                    console.log("\uD83D\uDD0D [DEBUG-DISPLAY] nodeIdMap.has(originalVar.nodeId): ".concat(originalVar.nodeId ? nodeIdMap === null || nodeIdMap === void 0 ? void 0 : nodeIdMap.has(originalVar.nodeId) : 'N/A (no nodeId)'));
                    if (nodeIdMap && nodeIdMap.size > 0) {
                        console.log("\uD83D\uDD0D [DEBUG-DISPLAY] nodeIdMap keys (first 5):", Array.from(nodeIdMap.keys()).slice(0, 5));
                    }
                    if (!autoCreateDisplayNode) return [3 /*break*/, 85];
                    console.log("\uD83D\uDE80\uD83D\uDE80\uD83D\uDE80 [AUTO-CREATE-DISPLAY] D\u00C9BUT - Variable: ".concat(originalVar.id, " (").concat(originalVar.displayName, "), nodeId: ").concat(originalVar.nodeId));
                    if (!!originalVar.nodeId) return [3 /*break*/, 33];
                    console.warn("\u26A0\uFE0F [AUTO-CREATE-DISPLAY] Variable ".concat(originalVar.id, " n'a PAS de nodeId! Impossible de cr\u00E9er display node. Fallback newNodeId."));
                    finalNodeId = newNodeId;
                    return [3 /*break*/, 84];
                case 33:
                    _34.trys.push([33, 83, , 84]);
                    parseJsonIfNeeded = function (value) {
                        if (typeof value !== 'string')
                            return value !== null && value !== void 0 ? value : undefined;
                        var trimmed = value.trim();
                        if (!trimmed)
                            return undefined;
                        var first = trimmed[0];
                        var last = trimmed[trimmed.length - 1];
                        var looksJson = (first === '[' && last === ']') || (first === '{' && last === '}');
                        if (!looksJson)
                            return value;
                        try {
                            return JSON.parse(trimmed);
                        }
                        catch (_a) {
                            return value;
                        }
                    };
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: originalVar.nodeId },
                            select: {
                                id: true,
                                parentId: true,
                                treeId: true,
                                order: true,
                                linkedTableIds: true,
                                hasTable: true,
                                table_name: true,
                                table_activeId: true,
                                table_instances: true,
                                table_columns: true,
                                table_data: true,
                                table_importSource: true,
                                table_isImported: true,
                                table_meta: true,
                                table_rows: true,
                                table_type: true,
                                metadata: true,
                                subtab: true,
                                subtabs: true,
                                hasAPI: true,
                                hasCondition: true,
                                hasData: true,
                                hasFormula: true,
                                hasLink: true,
                                hasMarkers: true,
                                // 🔧 FIX 16/12/2025: Ajouter condition_activeId et formula_activeId pour la copie
                                condition_activeId: true,
                                formula_activeId: true,
                                linkedConditionIds: true,
                                linkedFormulaIds: true,
                                data_activeId: true,
                                data_displayFormat: true,
                                data_exposedKey: true,
                                data_instances: true,
                                data_precision: true,
                                data_unit: true,
                                data_visibleToUser: true,
                                appearance_size: true,
                                appearance_variant: true,
                                appearance_width: true,
                                fieldType: true,
                                fieldSubType: true,
                                field_label: true,
                            }
                        })];
                case 34:
                    originalOwnerNode = _34.sent();
                    displayNodeSelect = {
                        id: true,
                        parentId: true,
                        order: true,
                        metadata: true,
                        subtab: true,
                        subtabs: true,
                        linkedTableIds: true,
                        hasTable: true,
                        table_name: true,
                        table_activeId: true,
                        table_instances: true,
                        table_columns: true,
                        table_data: true,
                        table_importSource: true,
                        table_isImported: true,
                        table_meta: true,
                        table_rows: true,
                        table_type: true,
                        hasAPI: true,
                        hasCondition: true,
                        hasData: true,
                        hasFormula: true,
                        hasLink: true,
                        hasMarkers: true,
                        // 🔧 FIX 16/12/2025: Ajouter condition_activeId et formula_activeId pour la copie
                        condition_activeId: true,
                        formula_activeId: true,
                        linkedConditionIds: true,
                        linkedFormulaIds: true,
                        data_activeId: true,
                        data_displayFormat: true,
                        data_exposedKey: true,
                        data_instances: true,
                        data_precision: true,
                        data_unit: true,
                        data_visibleToUser: true,
                        appearance_size: true,
                        appearance_variant: true,
                        appearance_width: true,
                        fieldType: true,
                        fieldSubType: true,
                        field_label: true,
                        createdAt: true,
                    };
                    hasRepeaterMetadata_1 = function (metadata) {
                        if (!metadata || typeof metadata !== 'object') {
                            return false;
                        }
                        return Boolean(metadata.repeater);
                    };
                    pickDisplayCandidate = function (nodes) {
                        if (!nodes.length) {
                            return null;
                        }
                        var withoutRepeater = nodes.find(function (node) { return !hasRepeaterMetadata_1(node.metadata); });
                        return withoutRepeater !== null && withoutRepeater !== void 0 ? withoutRepeater : nodes[0];
                    };
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                            where: {
                                metadata: {
                                    path: ['fromVariableId'],
                                    equals: originalVar.id
                                }
                            },
                            select: displayNodeSelect
                        })];
                case 35:
                    originalDisplayNode = _34.sent();
                    if (!!originalDisplayNode) return [3 /*break*/, 38];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: {
                                linkedVariableIds: {
                                    has: originalVar.id
                                }
                            },
                            select: { id: true }
                        })];
                case 36:
                    templateNodeIds = _34.sent();
                    templateIds = new Set(templateNodeIds.map(function (t) { return t.id; }));
                    console.log("\uD83D\uDD0D [DISPLAY_SEARCH] Template nodes to EXCLUDE: ".concat(templateIds.size));
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: __assign({ linkedVariableIds: {
                                    has: originalVar.id
                                }, 
                                // ⚠️ CRITICAL: Exclude the template nodes themselves
                                // This ensures we find TRUE display nodes, not the templates
                                id: {
                                    notIn: Array.from(templateIds)
                                } }, (originalVar.nodeId
                                ? {
                                    NOT: {
                                        id: originalVar.nodeId
                                    }
                                }
                                : {})),
                            select: displayNodeSelect,
                            orderBy: {
                                createdAt: 'asc'
                            }
                        })];
                case 37:
                    candidates = _34.sent();
                    if (candidates.length === 0) {
                        console.log("\u26A0\uFE0F [DISPLAY_SEARCH] No display node found after excluding templates");
                    }
                    else {
                        console.log("\u2705 [DISPLAY_SEARCH] Found ".concat(candidates.length, " candidates after excluding templates"));
                    }
                    originalDisplayNode = pickDisplayCandidate(candidates);
                    _34.label = 38;
                case 38:
                    if (originalDisplayNode) {
                        console.log("\u2705 [AUTO-CREATE-DISPLAY] Original display trouv\u00E9: ".concat(originalDisplayNode.id, " (parent=").concat(originalDisplayNode.parentId, ")"));
                    }
                    else {
                        console.log("\u26A0\uFE0F  [AUTO-CREATE-DISPLAY] Aucun display original trouv\u00E9 pour ".concat(originalVar.id));
                        // 🔧 FALLBACK: Si pas de display node trouvé, utiliser le parent du nœud PROPRIÉTAIRE
                        // (qui est le nœud auquel la variable appartient)
                        if (originalVar.nodeId && originalOwnerNode) {
                            console.log("\uD83D\uDCCC [AUTO-CREATE-DISPLAY] Fallback: utilisant parent du n\u0153ud propri\u00E9taire: ".concat(originalOwnerNode.parentId));
                        }
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: newNodeId },
                            select: {
                                id: true,
                                parentId: true,
                            }
                        })];
                case 39:
                    duplicatedOwnerNode = _34.sent();
                    if (!(originalOwnerNode && duplicatedOwnerNode)) return [3 /*break*/, 81];
                    inheritedDisplayParentId = (_4 = originalDisplayNode === null || originalDisplayNode === void 0 ? void 0 : originalDisplayNode.parentId) !== null && _4 !== void 0 ? _4 : null;
                    resolvedParentId = (_7 = (_6 = (_5 = inheritedDisplayParentId !== null && inheritedDisplayParentId !== void 0 ? inheritedDisplayParentId : originalOwnerNode.parentId // ⭐ PRIORITÉ 2: Parent du propriétaire original
                    ) !== null && _5 !== void 0 ? _5 : displayParentId) !== null && _6 !== void 0 ? _6 : duplicatedOwnerNode.parentId) !== null && _7 !== void 0 ? _7 : null;
                    console.log("\uD83D\uDCCC [DISPLAY_NODE_PARENT] R\u00E9solution du parentId:");
                    console.log("   - inheritedDisplayParentId: ".concat(inheritedDisplayParentId));
                    console.log("   - originalOwnerNode.parentId: ".concat(originalOwnerNode.parentId));
                    console.log("   - resolvedParentId final: ".concat(resolvedParentId));
                    if (!(resolvedParentId && prisma)) return [3 /*break*/, 44];
                    _34.label = 40;
                case 40:
                    _34.trys.push([40, 42, , 43]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: resolvedParentId },
                            select: { id: true }
                        })];
                case 41:
                    parentExists = _34.sent();
                    if (!parentExists) {
                        console.log("\u26A0\uFE0F  [DISPLAY_NODE_PARENT] Parent ".concat(resolvedParentId, " n'existe pas, fallback au parent du n\u0153ud dupliqu\u00E9"));
                        resolvedParentId = (_8 = duplicatedOwnerNode.parentId) !== null && _8 !== void 0 ? _8 : null;
                    }
                    else {
                        console.log("\u2705 [DISPLAY_NODE_PARENT] Parent ".concat(resolvedParentId, " existe, utilisation confirm\u00E9e"));
                    }
                    return [3 /*break*/, 43];
                case 42:
                    parentCheckErr_1 = _34.sent();
                    console.warn("\u26A0\uFE0F  [DISPLAY_NODE_PARENT] Erreur lors de la v\u00E9rification du parent, fallback:", parentCheckErr_1.message);
                    resolvedParentId = (_9 = duplicatedOwnerNode.parentId) !== null && _9 !== void 0 ? _9 : null;
                    return [3 /*break*/, 43];
                case 43: return [3 /*break*/, 45];
                case 44:
                    if (!resolvedParentId) {
                        // Fallback: utiliser le parent du nœud dupliqué
                        resolvedParentId = (_10 = duplicatedOwnerNode.parentId) !== null && _10 !== void 0 ? _10 : null;
                        console.log("\uD83D\uDCCC [DISPLAY_NODE_PARENT] Utilisation du parent du n\u0153ud dupliqu\u00E9: ".concat(resolvedParentId));
                    }
                    _34.label = 45;
                case 45:
                    displayNodeBaseId = (originalVar.nodeId && nodeIdMap.get(originalVar.nodeId)) || originalVar.nodeId;
                    baseNormalized = stripTrailingNumeric_1(displayNodeBaseId);
                    displayNodeId = appendSuffixOnce_1(baseNormalized);
                    finalNodeId = displayNodeId;
                    now = new Date();
                    cloneJson = function (value) {
                        if (!value || typeof value !== 'object') {
                            return {};
                        }
                        return JSON.parse(JSON.stringify(value));
                    };
                    ownerMetadata = cloneJson(originalOwnerNode.metadata);
                    inheritedMetadata = cloneJson(originalDisplayNode === null || originalDisplayNode === void 0 ? void 0 : originalDisplayNode.metadata);
                    metadataForDisplay = __assign(__assign(__assign(__assign({}, ownerMetadata), inheritedMetadata), { fromVariableId: forceSingleSuffix(originalVar.id), autoCreatedDisplayNode: true }), (isFromRepeaterDuplication && { duplicatedFromRepeater: true }));
                    ownerSubTabRaw = (_12 = (_11 = ownerMetadata === null || ownerMetadata === void 0 ? void 0 : ownerMetadata.subTab) !== null && _11 !== void 0 ? _11 : ownerMetadata === null || ownerMetadata === void 0 ? void 0 : ownerMetadata.subTabKey) !== null && _12 !== void 0 ? _12 : parseJsonIfNeeded((_13 = originalOwnerNode.subtab) !== null && _13 !== void 0 ? _13 : undefined);
                    ownerSubTabsRaw = (_14 = ownerMetadata === null || ownerMetadata === void 0 ? void 0 : ownerMetadata.subTabs) !== null && _14 !== void 0 ? _14 : parseJsonIfNeeded((_15 = originalOwnerNode.subtabs) !== null && _15 !== void 0 ? _15 : undefined);
                    ownerSubTabsArray_1 = Array.isArray(ownerSubTabsRaw)
                        ? ownerSubTabsRaw.map(function (entry) { return String(entry); })
                        : undefined;
                    inheritedSubTab = (_16 = inheritedMetadata === null || inheritedMetadata === void 0 ? void 0 : inheritedMetadata.subTab) !== null && _16 !== void 0 ? _16 : parseJsonIfNeeded((_17 = originalDisplayNode === null || originalDisplayNode === void 0 ? void 0 : originalDisplayNode.subtab) !== null && _17 !== void 0 ? _17 : undefined);
                    inheritedSubTabsRaw = (_18 = inheritedMetadata === null || inheritedMetadata === void 0 ? void 0 : inheritedMetadata.subTabs) !== null && _18 !== void 0 ? _18 : parseJsonIfNeeded((_19 = originalDisplayNode === null || originalDisplayNode === void 0 ? void 0 : originalDisplayNode.subtabs) !== null && _19 !== void 0 ? _19 : undefined);
                    inheritedSubTabs_1 = Array.isArray(inheritedSubTabsRaw)
                        ? inheritedSubTabsRaw.map(function (entry) { return String(entry); })
                        : undefined;
                    if (inheritedSubTab !== undefined) {
                        metadataForDisplay.subTab = inheritedSubTab;
                    }
                    else if (ownerSubTabRaw !== undefined) {
                        metadataForDisplay.subTab = ownerSubTabRaw;
                    }
                    if (Array.isArray(inheritedSubTabs_1) && inheritedSubTabs_1.length) {
                        metadataForDisplay.subTabs = inheritedSubTabs_1;
                    }
                    else if (ownerSubTabsArray_1 === null || ownerSubTabsArray_1 === void 0 ? void 0 : ownerSubTabsArray_1.length) {
                        metadataForDisplay.subTabs = ownerSubTabsArray_1;
                    }
                    appendSuffix_1 = function (value) { return appendSuffixOnce_1(value); };
                    cloneAndSuffixInstances = function (raw) {
                        if (!raw) {
                            return raw !== null && raw !== void 0 ? raw : null;
                        }
                        var rawInstances;
                        if (typeof raw === 'object') {
                            rawInstances = JSON.parse(JSON.stringify(raw));
                        }
                        else if (typeof raw === 'string') {
                            try {
                                rawInstances = JSON.parse(raw);
                            }
                            catch (_a) {
                                return raw;
                            }
                        }
                        else {
                            return raw;
                        }
                        var updatedInstances = {};
                        for (var _i = 0, _b = Object.entries(rawInstances); _i < _b.length; _i++) {
                            var _c = _b[_i], key = _c[0], value = _c[1];
                            var newKey = appendSuffix_1(String(key));
                            if (value && typeof value === 'object') {
                                var nested = __assign({}, value);
                                if (typeof nested.tableId === 'string') {
                                    nested.tableId = appendSuffix_1(nested.tableId);
                                }
                                updatedInstances[newKey] = nested;
                            }
                            else {
                                updatedInstances[newKey] = value;
                            }
                        }
                        return updatedInstances;
                    };
                    formatSubTabColumn = function (value) {
                        if (value === null || value === undefined)
                            return null;
                        if (Array.isArray(value)) {
                            return value.length ? JSON.stringify(value) : null;
                        }
                        return typeof value === 'string' ? value : String(value);
                    };
                    tableSourceNode = originalDisplayNode !== null && originalDisplayNode !== void 0 ? originalDisplayNode : originalOwnerNode;
                    displayLabel = forceSingleSuffix(originalVar.displayName || 'Donnée');
                    resolvedOrder = (_20 = originalDisplayNode === null || originalDisplayNode === void 0 ? void 0 : originalDisplayNode.order) !== null && _20 !== void 0 ? _20 : ((_21 = originalOwnerNode.order) !== null && _21 !== void 0 ? _21 : 0) + 1;
                    resolvedSubTabsJson = (function () {
                        var resolved = Array.isArray(inheritedSubTabs_1) && inheritedSubTabs_1.length
                            ? inheritedSubTabs_1
                            : ownerSubTabsArray_1;
                        return (resolved === null || resolved === void 0 ? void 0 : resolved.length) ? JSON.stringify(resolved) : null;
                    })();
                    displayNodeData = {
                        id: displayNodeId,
                        treeId: originalOwnerNode.treeId,
                        parentId: resolvedParentId,
                        type: 'leaf_field',
                        subType: null,
                        label: displayLabel,
                        description: null,
                        value: null,
                        order: resolvedOrder,
                        isRequired: false,
                        isVisible: true,
                        isActive: true,
                        isMultiple: false,
                        fieldConfig: null,
                        conditionConfig: null,
                        formulaConfig: null,
                        tableConfig: null,
                        apiConfig: null,
                        linkConfig: null,
                        defaultValue: null,
                        calculatedValue: null,
                        metadata: metadataForDisplay,
                        subtab: formatSubTabColumn(inheritedSubTab !== null && inheritedSubTab !== void 0 ? inheritedSubTab : ownerSubTabRaw),
                        subtabs: resolvedSubTabsJson,
                        createdAt: now,
                        updatedAt: now,
                        hasAPI: (_22 = tableSourceNode.hasAPI) !== null && _22 !== void 0 ? _22 : false,
                        hasCondition: (_23 = tableSourceNode.hasCondition) !== null && _23 !== void 0 ? _23 : false,
                        hasData: (_24 = tableSourceNode.hasData) !== null && _24 !== void 0 ? _24 : false,
                        hasFormula: (_25 = tableSourceNode.hasFormula) !== null && _25 !== void 0 ? _25 : false,
                        hasLink: (_26 = tableSourceNode.hasLink) !== null && _26 !== void 0 ? _26 : false,
                        hasMarkers: (_27 = tableSourceNode.hasMarkers) !== null && _27 !== void 0 ? _27 : false,
                        hasTable: (_28 = tableSourceNode.hasTable) !== null && _28 !== void 0 ? _28 : false,
                        table_name: tableSourceNode.table_name,
                        table_activeId: tableSourceNode.table_activeId ? appendSuffix_1(String(tableSourceNode.table_activeId)) : null,
                        table_instances: cloneAndSuffixInstances(tableSourceNode.table_instances),
                        table_columns: tableSourceNode.table_columns,
                        table_data: tableSourceNode.table_data,
                        table_importSource: tableSourceNode.table_importSource,
                        table_isImported: (_29 = tableSourceNode.table_isImported) !== null && _29 !== void 0 ? _29 : false,
                        table_meta: tableSourceNode.table_meta,
                        table_rows: tableSourceNode.table_rows,
                        table_type: tableSourceNode.table_type,
                        linkedTableIds: Array.isArray(tableSourceNode.linkedTableIds)
                            ? tableSourceNode.linkedTableIds.map(function (id) { return appendSuffix_1(String(id)); })
                            : [],
                        // 🔧 FIX 16/12/2025: NE PAS inclure linkedConditionIds et linkedFormulaIds ici
                        // car ils seront mis à jour APRÈS la copie des conditions/formules.
                        // Si on les inclut avec [], ils écraseraient les valeurs ajoutées par copyFormulaCapacity!
                        // linkedConditionIds: [] as any,  // SUPPRIMÉ
                        // linkedFormulaIds: [] as any,    // SUPPRIMÉ
                        linkedVariableIds: [newVarId],
                        data_activeId: tableSourceNode.data_activeId ? appendSuffix_1(String(tableSourceNode.data_activeId)) : null,
                        data_displayFormat: tableSourceNode.data_displayFormat,
                        data_exposedKey: tableSourceNode.data_exposedKey,
                        data_instances: cloneAndSuffixInstances(tableSourceNode.data_instances),
                        data_precision: tableSourceNode.data_precision,
                        data_unit: tableSourceNode.data_unit,
                        data_visibleToUser: (_30 = tableSourceNode.data_visibleToUser) !== null && _30 !== void 0 ? _30 : false,
                        appearance_size: (_31 = tableSourceNode.appearance_size) !== null && _31 !== void 0 ? _31 : 'md',
                        appearance_variant: tableSourceNode.appearance_variant,
                        appearance_width: (_32 = tableSourceNode.appearance_width) !== null && _32 !== void 0 ? _32 : '100%',
                        fieldType: (_33 = tableSourceNode.fieldType) !== null && _33 !== void 0 ? _33 : 'TEXT',
                        fieldSubType: tableSourceNode.fieldSubType,
                        field_label: displayLabel,
                    };
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } })];
                case 46:
                    maybeExisting = _34.sent();
                    if (!maybeExisting) return [3 /*break*/, 48];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({ where: { id: displayNodeId }, data: __assign(__assign({}, displayNodeData), { createdAt: maybeExisting.createdAt, updatedAt: now }) })];
                case 47:
                    _34.sent();
                    console.log("\u2705\u2705\u2705 [AUTO-CREATE-DISPLAY] N\u0153ud d'affichage existant mis \u00E0 jour: ".concat(displayNodeId, " (label: ").concat(originalVar.displayName, "-").concat(suffix, ")"));
                    return [3 /*break*/, 50];
                case 48: return [4 /*yield*/, prisma.treeBranchLeafNode.create({ data: displayNodeData })];
                case 49:
                    _34.sent();
                    console.log("\u2705\u2705\u2705 [AUTO-CREATE-DISPLAY] N\u0153ud d'affichage CR\u00C9\u00C9 AVEC SUCC\u00C8S: ".concat(displayNodeId, " (label: ").concat(originalVar.displayName, "-").concat(suffix, ")"));
                    _34.label = 50;
                case 50:
                    copiedFormulaIds = [];
                    copiedConditionIds = [];
                    _34.label = 51;
                case 51:
                    _34.trys.push([51, 79, , 80]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findMany({
                            where: { nodeId: tableSourceNode.id }
                        })];
                case 52:
                    originalFormulas = _34.sent();
                    console.log("\uD83D\uDCCB Formules \u00E0 copier depuis ".concat(tableSourceNode.id, ": ").concat(originalFormulas.length));
                    _k = 0, originalFormulas_1 = originalFormulas;
                    _34.label = 53;
                case 53:
                    if (!(_k < originalFormulas_1.length)) return [3 /*break*/, 59];
                    f = originalFormulas_1[_k];
                    newFormulaId = appendSuffixOnce_1(stripTrailingNumeric_1(f.id));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: newFormulaId } })];
                case 54:
                    existingFormula = _34.sent();
                    if (existingFormula) {
                        // Si la formule existe et pointe vers CE nœud, on la réutilise
                        if (existingFormula.nodeId === displayNodeId) {
                            console.log("   \u267B\uFE0F Formule ".concat(newFormulaId, " existe d\u00E9j\u00E0 pour CE n\u0153ud, skip"));
                            copiedFormulaIds.push(newFormulaId);
                            return [3 /*break*/, 58];
                        }
                        // Si elle existe pour un AUTRE nœud, c'est un conflit - on skip
                        // (chaque nœud avec le même suffixe devrait avoir les mêmes formules)
                        console.log("   \u26A0\uFE0F Formule ".concat(newFormulaId, " existe pour autre n\u0153ud (").concat(existingFormula.nodeId, "), skip"));
                        return [3 /*break*/, 58];
                    }
                    _34.label = 55;
                case 55:
                    _34.trys.push([55, 57, , 58]);
                    return [4 /*yield*/, (0, copy_capacity_formula_js_1.copyFormulaCapacity)(f.id, displayNodeId, suffix, prisma, { formulaIdMap: formulaIdMap, nodeIdMap: nodeIdMap })];
                case 56:
                    formulaResult = _34.sent();
                    if (formulaResult.success) {
                        formulaIdMap.set(f.id, formulaResult.newFormulaId);
                        copiedFormulaIds.push(formulaResult.newFormulaId);
                        console.log("   \u2705 Formule copi\u00E9e (centralis\u00E9e): ".concat(f.id, " \u2192 ").concat(formulaResult.newFormulaId));
                    }
                    else {
                        console.error("   \u274C Erreur copie formule: ".concat(f.id));
                    }
                    return [3 /*break*/, 58];
                case 57:
                    error_1 = _34.sent();
                    console.error("   \u274C Exception copie formule ".concat(f.id, ":"), error_1);
                    return [3 /*break*/, 58];
                case 58:
                    _k++;
                    return [3 /*break*/, 53];
                case 59: return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findMany({
                        where: { nodeId: tableSourceNode.id }
                    })];
                case 60:
                    originalConditions = _34.sent();
                    console.log("\uD83D\uDCCB Conditions \u00E0 copier depuis ".concat(tableSourceNode.id, ": ").concat(originalConditions.length));
                    _l = 0, originalConditions_1 = originalConditions;
                    _34.label = 61;
                case 61:
                    if (!(_l < originalConditions_1.length)) return [3 /*break*/, 67];
                    c = originalConditions_1[_l];
                    newConditionId = appendSuffixOnce_1(stripTrailingNumeric_1(c.id));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: newConditionId } })];
                case 62:
                    existingCondition = _34.sent();
                    if (existingCondition) {
                        // Si la condition existe et pointe vers CE nœud, on la réutilise
                        if (existingCondition.nodeId === displayNodeId) {
                            console.log("   \u267B\uFE0F Condition ".concat(newConditionId, " existe d\u00E9j\u00E0 pour CE n\u0153ud, skip"));
                            copiedConditionIds.push(newConditionId);
                            return [3 /*break*/, 66];
                        }
                        // Si elle existe pour un AUTRE nœud, c'est un conflit - on skip
                        console.log("   \u26A0\uFE0F Condition ".concat(newConditionId, " existe pour autre n\u0153ud (").concat(existingCondition.nodeId, "), skip"));
                        return [3 /*break*/, 66];
                    }
                    _34.label = 63;
                case 63:
                    _34.trys.push([63, 65, , 66]);
                    return [4 /*yield*/, (0, copy_capacity_condition_js_1.copyConditionCapacity)(c.id, displayNodeId, suffix, prisma, { nodeIdMap: nodeIdMap, formulaIdMap: formulaIdMap, conditionCopyCache: conditionIdMap })];
                case 64:
                    conditionResult = _34.sent();
                    if (conditionResult.success) {
                        conditionIdMap.set(c.id, conditionResult.newConditionId);
                        copiedConditionIds.push(conditionResult.newConditionId);
                        console.log("   \u2705 Condition copi\u00E9e (centralis\u00E9e): ".concat(c.id, " \u2192 ").concat(conditionResult.newConditionId));
                    }
                    else {
                        console.error("   \u274C Erreur copie condition: ".concat(c.id));
                    }
                    return [3 /*break*/, 66];
                case 65:
                    error_2 = _34.sent();
                    console.error("   \u274C Exception copie condition ".concat(c.id, ":"), error_2);
                    return [3 /*break*/, 66];
                case 66:
                    _l++;
                    return [3 /*break*/, 61];
                case 67:
                    updateData = {};
                    if (copiedFormulaIds.length > 0) {
                        updateData.hasFormula = true;
                        updateData.linkedFormulaIds = copiedFormulaIds;
                        // Mettre à jour formula_activeId - chercher l'ID correspondant ou utiliser le premier
                        if (tableSourceNode.formula_activeId) {
                            newFormulaActiveId = appendSuffixOnce_1(stripTrailingNumeric_1(String(tableSourceNode.formula_activeId)));
                            if (copiedFormulaIds.includes(newFormulaActiveId)) {
                                updateData.formula_activeId = newFormulaActiveId;
                                console.log("   \uD83D\uDCCA formula_activeId=".concat(newFormulaActiveId));
                            }
                            else {
                                // L'ID exact n'est pas trouvé (peut-être ID dédié), utiliser le premier
                                updateData.formula_activeId = copiedFormulaIds[0];
                                console.log("   \uD83D\uDCCA formula_activeId=".concat(copiedFormulaIds[0], " (premier disponible)"));
                            }
                        }
                        else if (copiedFormulaIds.length > 0) {
                            // Pas d'activeId sur l'original, utiliser le premier
                            updateData.formula_activeId = copiedFormulaIds[0];
                            console.log("   \uD83D\uDCCA formula_activeId=".concat(copiedFormulaIds[0], " (premier par d\u00E9faut)"));
                        }
                        console.log("   \uD83D\uDCCA hasFormula=true, linkedFormulaIds=".concat(copiedFormulaIds.join(', ')));
                    }
                    if (copiedConditionIds.length > 0) {
                        updateData.hasCondition = true;
                        updateData.linkedConditionIds = copiedConditionIds;
                        // Mettre à jour condition_activeId - chercher l'ID correspondant ou utiliser le premier
                        if (tableSourceNode.condition_activeId) {
                            newConditionActiveId = appendSuffixOnce_1(stripTrailingNumeric_1(String(tableSourceNode.condition_activeId)));
                            if (copiedConditionIds.includes(newConditionActiveId)) {
                                updateData.condition_activeId = newConditionActiveId;
                                console.log("   \uD83D\uDCCA condition_activeId=".concat(newConditionActiveId));
                            }
                            else {
                                // L'ID exact n'est pas trouvé (peut-être ID dédié), utiliser le premier
                                updateData.condition_activeId = copiedConditionIds[0];
                                console.log("   \uD83D\uDCCA condition_activeId=".concat(copiedConditionIds[0], " (premier disponible)"));
                            }
                        }
                        else if (copiedConditionIds.length > 0) {
                            // Pas d'activeId sur l'original, utiliser le premier
                            updateData.condition_activeId = copiedConditionIds[0];
                            console.log("   \uD83D\uDCCA condition_activeId=".concat(copiedConditionIds[0], " (premier par d\u00E9faut)"));
                        }
                        console.log("   \uD83D\uDCCA hasCondition=true, linkedConditionIds=".concat(copiedConditionIds.join(', ')));
                    }
                    if (!(Object.keys(updateData).length > 0)) return [3 /*break*/, 69];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: displayNodeId },
                            data: updateData
                        })];
                case 68:
                    _34.sent();
                    console.log("\u2705 N\u0153ud d'affichage ".concat(displayNodeId, " mis \u00E0 jour avec formules/conditions"));
                    _34.label = 69;
                case 69:
                    copiedTableIds = [];
                    if (!(tableSourceNode.hasTable && Array.isArray(tableSourceNode.linkedTableIds) && tableSourceNode.linkedTableIds.length > 0)) return [3 /*break*/, 78];
                    console.log("\n\uD83D\uDCCA [COPY-TABLES] N\u0153ud original a ".concat(tableSourceNode.linkedTableIds.length, " tables \u00E0 copier"));
                    _m = 0, _o = tableSourceNode.linkedTableIds;
                    _34.label = 70;
                case 70:
                    if (!(_m < _o.length)) return [3 /*break*/, 76];
                    originalTableId = _o[_m];
                    newTableId = appendSuffixOnce_1(stripTrailingNumeric_1(String(originalTableId)));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                            where: { id: newTableId }
                        })];
                case 71:
                    existingTable = _34.sent();
                    if (existingTable) {
                        console.log("   \u267B\uFE0F Table ".concat(newTableId, " existe d\u00E9j\u00E0, skip"));
                        copiedTableIds.push(newTableId);
                        tableIdMap.set(String(originalTableId), newTableId);
                        return [3 /*break*/, 75];
                    }
                    _34.label = 72;
                case 72:
                    _34.trys.push([72, 74, , 75]);
                    return [4 /*yield*/, (0, copy_capacity_table_js_1.copyTableCapacity)(String(originalTableId), displayNodeId, // La nouvelle table appartient au display node copié
                        suffix, prisma, { nodeIdMap: nodeIdMap, tableCopyCache: tableIdMap, tableIdMap: tableIdMap })];
                case 73:
                    tableResult = _34.sent();
                    if (tableResult.success) {
                        tableIdMap.set(String(originalTableId), tableResult.newTableId);
                        copiedTableIds.push(tableResult.newTableId);
                        console.log("   \u2705 Table copi\u00E9e: ".concat(originalTableId, " \u2192 ").concat(tableResult.newTableId, " (").concat(tableResult.columnsCount, " cols, ").concat(tableResult.rowsCount, " rows)"));
                    }
                    else {
                        console.warn("   \u26A0\uFE0F \u00C9chec copie table ".concat(originalTableId, ": ").concat(tableResult.error));
                    }
                    return [3 /*break*/, 75];
                case 74:
                    tableErr_1 = _34.sent();
                    console.error("   \u274C Exception copie table ".concat(originalTableId, ":"), tableErr_1.message);
                    return [3 /*break*/, 75];
                case 75:
                    _m++;
                    return [3 /*break*/, 70];
                case 76:
                    if (!(copiedTableIds.length > 0)) return [3 /*break*/, 78];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: displayNodeId },
                            data: {
                                hasTable: true,
                                linkedTableIds: copiedTableIds
                            }
                        })];
                case 77:
                    _34.sent();
                    console.log("   \u2705 hasTable=true, linkedTableIds mis \u00E0 jour sur ".concat(displayNodeId));
                    _34.label = 78;
                case 78: return [3 /*break*/, 80];
                case 79:
                    copyCapErr_1 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur lors de la copie des formules/conditions pour display node:", copyCapErr_1.message);
                    return [3 /*break*/, 80];
                case 80: return [3 /*break*/, 82];
                case 81:
                    console.warn("\u26A0\uFE0F Impossible de r\u00E9cup\u00E9rer le n\u0153ud propri\u00E9taire original ".concat(originalVar.nodeId, ". Fallback newNodeId."));
                    _34.label = 82;
                case 82: return [3 /*break*/, 84];
                case 83:
                    e_4 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur lors de la cr\u00E9ation du n\u0153ud d'affichage d\u00E9di\u00E9:", e_4.message);
                    return [3 /*break*/, 84];
                case 84:
                    console.log("\uD83C\uDF89\uD83C\uDF89\uD83C\uDF89 [AUTO-CREATE-DISPLAY] TERMIN\u00C9 - Variable: ".concat(originalVar.id, " (").concat(originalVar.displayName, "), displayNodeId: ").concat(finalNodeId));
                    return [3 /*break*/, 86];
                case 85:
                    console.log("\uD83D\uDCCD nodeId utilis\u00E9 (fallback): ".concat(finalNodeId));
                    _34.label = 86;
                case 86:
                    _34.trys.push([86, 88, , 89]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: newVarId } })];
                case 87:
                    existingById = _34.sent();
                    if (existingById) {
                        tail = (finalNodeId || newNodeId || '').slice(-6) || "".concat(Date.now());
                        adjusted = "".concat(originalVarId, "-").concat(suffix, "-").concat(tail);
                        console.warn("\u26A0\uFE0F Conflit sur id variable (".concat(newVarId, "), ajustement \u2192 ").concat(adjusted));
                        newVarId = adjusted;
                    }
                    return [3 /*break*/, 89];
                case 88:
                    e_5 = _34.sent();
                    console.warn("\u26A0\uFE0F V\u00E9rification collision id variable \u00E9chou\u00E9e:", e_5.message);
                    return [3 /*break*/, 89];
                case 89:
                    _34.trys.push([89, 91, , 92]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: newExposedKey } })];
                case 90:
                    existingByKey = _34.sent();
                    if (existingByKey) {
                        tail = (finalNodeId || newNodeId || '').slice(-6) || "".concat(Date.now());
                        adjustedKey = "".concat(originalVar.exposedKey, "-").concat(suffix, "-").concat(tail);
                        console.warn("\u26A0\uFE0F Conflit sur exposedKey (".concat(newExposedKey, "), ajustement \u2192 ").concat(adjustedKey));
                        newExposedKey = adjustedKey;
                    }
                    return [3 /*break*/, 92];
                case 91:
                    e_6 = _34.sent();
                    console.warn("\u26A0\uFE0F V\u00E9rification collision exposedKey \u00E9chou\u00E9e:", e_6.message);
                    return [3 /*break*/, 92];
                case 92:
                    _reusingExistingVariable = false;
                    _existingVariableForReuse = null;
                    _34.label = 93;
                case 93:
                    _34.trys.push([93, 108, , 109]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: finalNodeId } })];
                case 94:
                    existingForNode = _34.sent();
                    if (!existingForNode) return [3 /*break*/, 107];
                    expectedVarId = "".concat(originalVarId, "-").concat(suffix);
                    hasSuffixMatch = existingForNode.id === expectedVarId || existingForNode.id === newVarId;
                    if (!hasSuffixMatch) return [3 /*break*/, 102];
                    console.log("\u267B\uFE0F Variable existante AVEC BON SUFFIXE pour ".concat(finalNodeId, ", r\u00E9utilisation: ").concat(existingForNode.id));
                    _reusingExistingVariable = true;
                    _existingVariableForReuse = existingForNode;
                    _34.label = 95;
                case 95:
                    _34.trys.push([95, 100, , 101]);
                    normalizedExistingName = forceSingleSuffix(existingForNode.displayName);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: finalNodeId },
                            data: {
                                hasData: true,
                                data_activeId: existingForNode.id,
                                data_exposedKey: existingForNode.exposedKey,
                                data_displayFormat: existingForNode.displayFormat,
                                data_precision: existingForNode.precision,
                                data_unit: existingForNode.unit,
                                data_visibleToUser: existingForNode.visibleToUser,
                                label: normalizedExistingName || undefined,
                                field_label: normalizedExistingName || undefined
                            }
                        })];
                case 96:
                    _34.sent();
                    isCopiedNode = finalNodeId.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(finalNodeId);
                    if (!!isCopiedNode) return [3 /*break*/, 97];
                    console.warn("\u26A0\uFE0F SKIP addToNodeLinkedField (r\u00E9utilisation): ".concat(finalNodeId, " est un n\u0153ud ORIGINAL, pas une copie"));
                    return [3 /*break*/, 99];
                case 97: return [4 /*yield*/, addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [existingForNode.id])];
                case 98:
                    _34.sent();
                    _34.label = 99;
                case 99: return [3 /*break*/, 101];
                case 100:
                    e_7 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur MAJ display node (r\u00E9utilisation):", e_7.message);
                    return [3 /*break*/, 101];
                case 101:
                    cacheKey_1 = "".concat(originalVarId, "|").concat(finalNodeId);
                    variableCopyCache.set(cacheKey_1, existingForNode.id);
                    return [3 /*break*/, 107];
                case 102:
                    console.warn("\u26A0\uFE0F Variable existante MAIS MAUVAIS SUFFIXE: ".concat(existingForNode.id, ", attendu: ").concat(expectedVarId));
                    console.warn("   \u2192 Suppression de l'ancienne ET cr\u00E9ation nouvelle variable obligatoire");
                    _34.label = 103;
                case 103:
                    _34.trys.push([103, 105, , 106]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.delete({ where: { id: existingForNode.id } })];
                case 104:
                    _34.sent();
                    console.log("\uD83D\uDDD1\uFE0F Ancienne variable supprim\u00E9e: ".concat(existingForNode.id));
                    return [3 /*break*/, 106];
                case 105:
                    delError_1 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur suppression ancienne variable:", delError_1.message);
                    return [3 /*break*/, 106];
                case 106:
                    // 🎯 FORCER la création d'une nouvelle variable
                    _reusingExistingVariable = false;
                    _existingVariableForReuse = null;
                    _34.label = 107;
                case 107: return [3 /*break*/, 109];
                case 108:
                    e_8 = _34.sent();
                    console.warn("\u26A0\uFE0F V\u00E9rification variable existante par nodeId \u00E9chou\u00E9e:", e_8.message);
                    return [3 /*break*/, 109];
                case 109:
                    newVariable = void 0;
                    if (!(_reusingExistingVariable && _existingVariableForReuse)) return [3 /*break*/, 110];
                    console.log("\u267B\uFE0F [COPY-VAR] Utilisation de variable existante: ".concat(_existingVariableForReuse.id));
                    newVariable = _existingVariableForReuse;
                    return [3 /*break*/, 132];
                case 110:
                    console.log("\n\uD83D\uDD28 [COPY-VAR] CR\u00C9ATION DE LA VARIABLE EN BASE...");
                    console.log("   ID: ".concat(newVarId));
                    console.log("   nodeId: ".concat(finalNodeId));
                    console.log("   exposedKey: ".concat(newExposedKey));
                    normalizedDisplayName = forceSingleSuffix(originalVar.displayName);
                    console.log("   displayName: ".concat(normalizedDisplayName));
                    console.log("   sourceRef: ".concat(newSourceRef));
                    console.log("   sourceType: ".concat(originalVar.sourceType));
                    // 🔍 Vérification CRITIQUE du finalNodeId
                    if (!finalNodeId) {
                        console.error("\u274C ERREUR CRITIQUE: finalNodeId est NULL/undefined!");
                        console.error("   autoCreateDisplayNode: ".concat(autoCreateDisplayNode));
                        console.error("   originalVar.nodeId: ".concat(originalVar.nodeId));
                        console.error("   newNodeId: ".concat(newNodeId));
                        throw new Error("Cannot create variable: finalNodeId is ".concat(finalNodeId, ". This indicates the display node was not created properly."));
                    }
                    _34.label = 111;
                case 111:
                    _34.trys.push([111, 131, , 132]);
                    // 🔧 COPIER ET SUFFIXER les capacités liées
                    // ⭐ CRITIQUE : Ajouter le mapping du nœud ORIGINAL au nœud NOUVEAU
                    // Cela permet aux formules de réécrire correctement les @value.shared-ref-xxx
                    if (originalVar.nodeId && finalNodeId && !nodeIdMap.has(originalVar.nodeId)) {
                        nodeIdMap.set(originalVar.nodeId, finalNodeId);
                        console.log("\uD83D\uDCCD Mapping n\u0153ud ajout\u00E9: ".concat(originalVar.nodeId, " \u2192 ").concat(finalNodeId));
                    }
                    newLinkedFormulaIds = [];
                    _p = 0, _q = originalVar.linkedFormulaIds || [];
                    _34.label = 112;
                case 112:
                    if (!(_p < _q.length)) return [3 /*break*/, 117];
                    formulaId = _q[_p];
                    mappedId = formulaIdMap.get(formulaId);
                    if (!mappedId) return [3 /*break*/, 113];
                    newLinkedFormulaIds.push(mappedId);
                    return [3 /*break*/, 116];
                case 113:
                    _34.trys.push([113, 115, , 116]);
                    return [4 /*yield*/, (0, copy_capacity_formula_js_1.copyFormulaCapacity)(formulaId, finalNodeId, suffix, prisma, { nodeIdMap: nodeIdMap, formulaIdMap: formulaIdMap, conditionIdMap: conditionIdMap })];
                case 114:
                    formulaResult = _34.sent();
                    if (formulaResult.success) {
                        formulaIdMap.set(formulaId, formulaResult.newFormulaId);
                        newLinkedFormulaIds.push(formulaResult.newFormulaId);
                        console.log("\u2705 Formule copi\u00E9e (r\u00E9cursive): ".concat(formulaId, " \u2192 ").concat(formulaResult.newFormulaId));
                    }
                    else {
                        newLinkedFormulaIds.push("".concat(formulaId, "-").concat(suffix));
                    }
                    return [3 /*break*/, 116];
                case 115:
                    e_9 = _34.sent();
                    console.error("\u274C Erreur copie formule r\u00E9cursive:", e_9.message);
                    newLinkedFormulaIds.push("".concat(formulaId, "-").concat(suffix));
                    return [3 /*break*/, 116];
                case 116:
                    _p++;
                    return [3 /*break*/, 112];
                case 117:
                    newLinkedConditionIds = [];
                    _r = 0, _s = originalVar.linkedConditionIds || [];
                    _34.label = 118;
                case 118:
                    if (!(_r < _s.length)) return [3 /*break*/, 123];
                    conditionId = _s[_r];
                    mappedId = conditionIdMap.get(conditionId);
                    if (!mappedId) return [3 /*break*/, 119];
                    newLinkedConditionIds.push(mappedId);
                    return [3 /*break*/, 122];
                case 119:
                    _34.trys.push([119, 121, , 122]);
                    return [4 /*yield*/, (0, copy_capacity_condition_js_1.copyConditionCapacity)(conditionId, finalNodeId, suffix, prisma, { nodeIdMap: nodeIdMap, formulaIdMap: formulaIdMap, conditionIdMap: conditionIdMap })];
                case 120:
                    conditionResult = _34.sent();
                    if (conditionResult.success) {
                        conditionIdMap.set(conditionId, conditionResult.newConditionId);
                        newLinkedConditionIds.push(conditionResult.newConditionId);
                        console.log("\u2705 Condition copi\u00E9e (r\u00E9cursive): ".concat(conditionId, " \u2192 ").concat(conditionResult.newConditionId));
                    }
                    else {
                        newLinkedConditionIds.push("".concat(conditionId, "-").concat(suffix));
                    }
                    return [3 /*break*/, 122];
                case 121:
                    e_10 = _34.sent();
                    console.error("\u274C Erreur copie condition r\u00E9cursive:", e_10.message);
                    newLinkedConditionIds.push("".concat(conditionId, "-").concat(suffix));
                    return [3 /*break*/, 122];
                case 122:
                    _r++;
                    return [3 /*break*/, 118];
                case 123:
                    newLinkedTableIds = [];
                    _t = 0, _u = originalVar.linkedTableIds || [];
                    _34.label = 124;
                case 124:
                    if (!(_t < _u.length)) return [3 /*break*/, 129];
                    tableId = _u[_t];
                    mappedId = tableIdMap.get(tableId);
                    if (!mappedId) return [3 /*break*/, 125];
                    newLinkedTableIds.push(mappedId);
                    return [3 /*break*/, 128];
                case 125:
                    _34.trys.push([125, 127, , 128]);
                    return [4 /*yield*/, (0, copy_capacity_table_js_1.copyTableCapacity)(tableId, finalNodeId, suffix, prisma, { nodeIdMap: nodeIdMap, formulaIdMap: formulaIdMap, conditionIdMap: conditionIdMap, tableIdMap: tableIdMap })];
                case 126:
                    tableResult = _34.sent();
                    if (tableResult.success) {
                        tableIdMap.set(tableId, tableResult.newTableId);
                        newLinkedTableIds.push(tableResult.newTableId);
                        console.log("\u2705 Table copi\u00E9e (r\u00E9cursive): ".concat(tableId, " \u2192 ").concat(tableResult.newTableId));
                    }
                    else {
                        newLinkedTableIds.push("".concat(tableId, "-").concat(suffix));
                    }
                    return [3 /*break*/, 128];
                case 127:
                    e_11 = _34.sent();
                    console.error("\u274C Erreur copie table r\u00E9cursive:", e_11.message);
                    newLinkedTableIds.push("".concat(tableId, "-").concat(suffix));
                    return [3 /*break*/, 128];
                case 128:
                    _t++;
                    return [3 /*break*/, 124];
                case 129: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.create({
                        data: {
                            id: newVarId,
                            nodeId: finalNodeId,
                            exposedKey: newExposedKey,
                            displayName: normalizedDisplayName,
                            displayFormat: originalVar.displayFormat,
                            unit: originalVar.unit,
                            precision: originalVar.precision,
                            visibleToUser: originalVar.visibleToUser,
                            isReadonly: originalVar.isReadonly,
                            defaultValue: originalVar.defaultValue,
                            fixedValue: originalVar.fixedValue,
                            selectedNodeId: originalVar.selectedNodeId
                                ? (nodeIdMap.get(originalVar.selectedNodeId) || "".concat(originalVar.selectedNodeId, "-").concat(suffix))
                                : null,
                            sourceRef: newSourceRef,
                            sourceType: originalVar.sourceType,
                            metadata: originalVar.metadata,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
                case 130:
                    newVariable = _34.sent();
                    return [3 /*break*/, 132];
                case 131:
                    createError_1 = _34.sent();
                    console.error("\u274C\u274C\u274C ERREUR LORS DE LA CR\u00C9ATION DE LA VARIABLE!");
                    console.error("   Erreur Prisma: ".concat(createError_1.message));
                    console.error("   Node ID tent\u00E9: ".concat(finalNodeId));
                    console.error("   Variable ID: ".concat(newVarId));
                    console.error("   ExposedKey: ".concat(newExposedKey));
                    console.error("   D\u00E9tails complets:", createError_1);
                    throw createError_1;
                case 132:
                    if (normalizedRepeatContext_1) {
                        metadataPayload = newVariable.metadata && typeof newVariable.metadata === 'object'
                            ? newVariable.metadata
                            : undefined;
                        (0, repeat_blueprint_writer_js_1.logVariableEvent)({
                            nodeId: newVariable.nodeId,
                            displayNodeId: finalNodeId,
                            variableId: newVariable.id,
                            sourceRef: newVariable.sourceRef,
                            sourceType: newVariable.sourceType,
                            metadata: metadataPayload,
                            context: normalizedRepeatContext_1
                        });
                    }
                    console.log("\u2705\u2705\u2705 VARIABLE CR\u00C9\u00C9E AVEC SUCC\u00C8S EN BASE !");
                    console.log("   ID cr\u00E9\u00E9: ".concat(newVariable.id));
                    console.log("   nodeId: ".concat(newVariable.nodeId));
                    console.log("   exposedKey: ".concat(newVariable.exposedKey));
                    console.log("   \uD83D\uDCCD DEBUG displayName cr\u00E9\u00E9: \"".concat(newVariable.displayName, "\""));
                    if (!!isFromRepeaterDuplication) return [3 /*break*/, 137];
                    _34.label = 133;
                case 133:
                    _34.trys.push([133, 135, , 136]);
                    return [4 /*yield*/, (0, universal_linking_system_js_1.linkVariableToAllCapacityNodes)(prisma, newVariable.id, newVariable.sourceRef)];
                case 134:
                    _34.sent();
                    return [3 /*break*/, 136];
                case 135:
                    e_12 = _34.sent();
                    console.error("\u274C Erreur LIAISON AUTOMATIQUE VARIABLE:", e_12.message);
                    return [3 /*break*/, 136];
                case 136: return [3 /*break*/, 138];
                case 137:
                    console.log("\u23ED\uFE0F SKIP linkVariableToAllCapacityNodes (duplication r\u00E9p\u00E9teur - linkedVariableIds d\u00E9j\u00E0 copi\u00E9s)");
                    _34.label = 138;
                case 138: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                        where: { id: newVariable.id }
                    })];
                case 139:
                    verification = _34.sent();
                    if (verification) {
                        console.log("\u2705 V\u00C9RIFICATION OK: Variable ".concat(newVariable.id, " existe bien en base"));
                    }
                    else {
                        console.error("\u274C\u274C\u274C PROBL\u00C8ME GRAVE: Variable ".concat(newVariable.id, " N'EXISTE PAS apr\u00E8s cr\u00E9ation !"));
                        console.error("\u274C\u274C\u274C PROBL\u00C8ME GRAVE: Variable ".concat(newVariable.id, " N'EXISTE PAS apr\u00E8s cr\u00E9ation !"));
                    }
                    _34.label = 140;
                case 140:
                    _34.trys.push([140, 142, , 143]);
                    normalizedNodeLabel = forceSingleSuffix(newVariable.displayName);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: finalNodeId },
                            data: {
                                hasData: true,
                                data_activeId: newVariable.id,
                                data_exposedKey: newVariable.exposedKey,
                                data_displayFormat: newVariable.displayFormat,
                                data_precision: newVariable.precision,
                                data_unit: newVariable.unit,
                                data_visibleToUser: newVariable.visibleToUser,
                                // Harmoniser le label du nœud d'affichage sur le displayName de la variable
                                label: normalizedNodeLabel || undefined,
                                field_label: normalizedNodeLabel || undefined
                            }
                        })];
                case 141:
                    _34.sent();
                    console.log("\u2705 Param\u00E8tres capacit\u00E9 (data) mis \u00E0 jour pour n\u0153ud d'affichage ".concat(finalNodeId));
                    return [3 /*break*/, 143];
                case 142:
                    e_13 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur lors de la mise \u00E0 jour des param\u00E8tres capacit\u00E9 (display node):", e_13.message);
                    return [3 /*break*/, 143];
                case 143:
                    if (!linkToDisplaySection) return [3 /*break*/, 152];
                    _34.label = 144;
                case 144:
                    _34.trys.push([144, 150, , 151]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: originalVar.nodeId },
                            select: { parentId: true, treeId: true }
                        })];
                case 145:
                    originalOwnerNode = _34.sent();
                    if (!(originalOwnerNode === null || originalOwnerNode === void 0 ? void 0 : originalOwnerNode.parentId)) return [3 /*break*/, 149];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                            where: {
                                treeId: originalOwnerNode.treeId,
                                parentId: originalOwnerNode.parentId,
                                type: 'section',
                                label: { equals: displaySectionLabel }
                            },
                            select: { id: true }
                        })];
                case 146:
                    displaySection = _34.sent();
                    if (!displaySection) return [3 /*break*/, 148];
                    return [4 /*yield*/, addToNodeLinkedField(prisma, displaySection.id, 'linkedVariableIds', [newVariable.id])];
                case 147:
                    _34.sent();
                    console.log("\u2705 Variable li\u00E9e \u00E0 la section d'affichage ".concat(displaySectionLabel, ": ").concat(displaySection.id));
                    return [3 /*break*/, 149];
                case 148:
                    console.log("\u2139\uFE0F Section d'affichage \"".concat(displaySectionLabel, "\" introuvable sous le parent."));
                    _34.label = 149;
                case 149: return [3 /*break*/, 151];
                case 150:
                    e_14 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur lors du linkage vers la section d'affichage:", e_14.message);
                    return [3 /*break*/, 151];
                case 151: return [3 /*break*/, 174];
                case 152:
                    if (!autoCreateDisplayNode) return [3 /*break*/, 174];
                    _34.label = 153;
                case 153:
                    _34.trys.push([153, 157, , 158]);
                    isCopiedNode = finalNodeId.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(finalNodeId);
                    if (!!isCopiedNode) return [3 /*break*/, 154];
                    console.warn("\u26A0\uFE0F SKIP addToNodeLinkedField: ".concat(finalNodeId, " est un n\u0153ud ORIGINAL (template), pas une copie. On ne doit PAS ajouter ").concat(newVariable.id, " \u00E0 ses linkedVariableIds."));
                    return [3 /*break*/, 156];
                case 154: return [4 /*yield*/, addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [newVariable.id])];
                case 155:
                    _34.sent();
                    console.log("\u2705 Variable ".concat(newVariable.id, " ajout\u00E9e au linkedVariableIds du n\u0153ud copi\u00E9 ").concat(finalNodeId));
                    _34.label = 156;
                case 156: return [3 /*break*/, 158];
                case 157:
                    e_15 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur linkage variable\u2192display node:", e_15.message);
                    return [3 /*break*/, 158];
                case 158:
                    _34.trys.push([158, 173, , 174]);
                    if (!(capacityType && newSourceRef)) return [3 /*break*/, 172];
                    parsedCap = (0, source_ref_js_1.parseSourceRef)(newSourceRef);
                    capId = parsedCap === null || parsedCap === void 0 ? void 0 : parsedCap.id;
                    if (!(parsedCap && capId)) return [3 /*break*/, 172];
                    if (!(parsedCap.type === 'condition')) return [3 /*break*/, 168];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: capId }, select: { name: true, description: true } })];
                case 159:
                    cond = _34.sent();
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: finalNodeId },
                            data: {
                                hasCondition: true,
                                condition_activeId: capId,
                                condition_name: (cond === null || cond === void 0 ? void 0 : cond.name) || null,
                                condition_description: (cond === null || cond === void 0 ? void 0 : cond.description) || null
                            }
                        })];
                case 160:
                    _34.sent();
                    return [4 /*yield*/, addToNodeLinkedField(prisma, finalNodeId, 'linkedConditionIds', [capId])];
                case 161:
                    _34.sent();
                    _34.label = 162;
                case 162:
                    _34.trys.push([162, 166, , 167]);
                    if (!newNodeId) return [3 /*break*/, 165];
                    suffixedVarId = "".concat(originalVarId, "-").concat(suffix);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: newNodeId },
                            select: { linkedVariableIds: true }
                        })];
                case 163:
                    targetNode = _34.sent();
                    if (!targetNode) return [3 /*break*/, 165];
                    current = targetNode.linkedVariableIds || [];
                    withoutOriginal = current.filter(function (id) { return id !== originalVarId; });
                    candidates = [newVariable.id, suffixedVarId].filter(Boolean);
                    next_1 = Array.from(new Set(__spreadArray(__spreadArray([], withoutOriginal, true), candidates, true)));
                    changed = current.length !== next_1.length ||
                        current.some(function (id) { return !next_1.includes(id); });
                    if (!changed) return [3 /*break*/, 165];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: newNodeId },
                            data: {
                                linkedVariableIds: { set: next_1 }
                            }
                        })];
                case 164:
                    _34.sent();
                    console.log("\u2705 linkedVariableIds updated on target node ".concat(newNodeId, ":"), next_1);
                    _34.label = 165;
                case 165: return [3 /*break*/, 167];
                case 166:
                    e_16 = _34.sent();
                    console.warn("\u26A0\uFE0F Failed to sync linkedVariableIds on target node ".concat(newNodeId, ":"), e_16.message);
                    return [3 /*break*/, 167];
                case 167: return [3 /*break*/, 172];
                case 168:
                    if (!(parsedCap.type === 'table')) return [3 /*break*/, 172];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({ where: { id: capId }, select: { name: true, description: true, type: true } })];
                case 169:
                    tbl = _34.sent();
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: finalNodeId },
                            data: {
                                hasTable: true,
                                table_activeId: capId,
                                table_name: (tbl === null || tbl === void 0 ? void 0 : tbl.name) || null,
                                table_description: (tbl === null || tbl === void 0 ? void 0 : tbl.description) || null,
                                table_type: (tbl === null || tbl === void 0 ? void 0 : tbl.type) || null
                            }
                        })];
                case 170:
                    _34.sent();
                    return [4 /*yield*/, addToNodeLinkedField(prisma, finalNodeId, 'linkedTableIds', [capId])];
                case 171:
                    _34.sent();
                    _34.label = 172;
                case 172: return [3 /*break*/, 174];
                case 173:
                    e_17 = _34.sent();
                    console.warn("\u26A0\uFE0F Synchronisation capacit\u00E9s condition/table sur le n\u0153ud d'affichage:", e_17.message);
                    return [3 /*break*/, 174];
                case 174:
                    _34.trys.push([174, 179, , 180]);
                    if (!newNodeId) return [3 /*break*/, 176];
                    return [4 /*yield*/, replaceLinkedVariableId(prisma, newNodeId, originalVarId, newVariable.id, suffix)];
                case 175:
                    _34.sent();
                    _34.label = 176;
                case 176:
                    if (!(finalNodeId && finalNodeId !== newNodeId)) return [3 /*break*/, 178];
                    return [4 /*yield*/, replaceLinkedVariableId(prisma, finalNodeId, originalVarId, newVariable.id, suffix)];
                case 177:
                    _34.sent();
                    _34.label = 178;
                case 178: return [3 /*break*/, 180];
                case 179:
                    e_18 = _34.sent();
                    console.warn("\u26A0\uFE0F Failed to replace linkedVariableIds on nodes ".concat(newNodeId, " / ").concat(finalNodeId, ":"), e_18.message);
                    return [3 /*break*/, 180];
                case 180:
                    cacheKeyFinal = "".concat(originalVarId, "|").concat(finalNodeId);
                    variableCopyCache.set(cacheKeyFinal, newVariable.id);
                    if (!(capacityType && newSourceRef)) return [3 /*break*/, 194];
                    parsed = (0, source_ref_js_1.parseSourceRef)(newSourceRef);
                    if (!(parsed && parsed.id)) return [3 /*break*/, 194];
                    _34.label = 181;
                case 181:
                    _34.trys.push([181, 193, , 194]);
                    if (!(capacityType === 'formula')) return [3 /*break*/, 185];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                            where: { id: parsed.id },
                            select: { nodeId: true }
                        })];
                case 182:
                    formula = _34.sent();
                    if (!formula) return [3 /*break*/, 184];
                    return [4 /*yield*/, addToNodeLinkedField(prisma, formula.nodeId, 'linkedFormulaIds', [parsed.id])];
                case 183:
                    _34.sent();
                    console.log("\u2705 linkedFormulaIds mis \u00E0 jour pour formule ".concat(parsed.id));
                    _34.label = 184;
                case 184: return [3 /*break*/, 192];
                case 185:
                    if (!(capacityType === 'condition')) return [3 /*break*/, 189];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeCondition.findUnique({
                            where: { id: parsed.id },
                            select: { nodeId: true }
                        })];
                case 186:
                    condition = _34.sent();
                    if (!condition) return [3 /*break*/, 188];
                    return [4 /*yield*/, addToNodeLinkedField(prisma, condition.nodeId, 'linkedConditionIds', [parsed.id])];
                case 187:
                    _34.sent();
                    console.log("\u2705 linkedConditionIds mis \u00E0 jour pour condition ".concat(parsed.id));
                    _34.label = 188;
                case 188: return [3 /*break*/, 192];
                case 189:
                    if (!(capacityType === 'table')) return [3 /*break*/, 192];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                            where: { id: parsed.id },
                            select: { nodeId: true }
                        })];
                case 190:
                    table = _34.sent();
                    if (!table) return [3 /*break*/, 192];
                    return [4 /*yield*/, addToNodeLinkedField(prisma, table.nodeId, 'linkedTableIds', [parsed.id])];
                case 191:
                    _34.sent();
                    console.log("\u2705 linkedTableIds mis \u00E0 jour pour table ".concat(parsed.id));
                    _34.label = 192;
                case 192: return [3 /*break*/, 194];
                case 193:
                    e_19 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur MAJ bidirectionnelle:", e_19.message);
                    return [3 /*break*/, 194];
                case 194:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\u2705 COPIE VARIABLE TERMIN\u00C9E");
                    console.log("".concat('═'.repeat(80), "\n"));
                    _34.label = 195;
                case 195:
                    _34.trys.push([195, 197, , 198]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                            where: { id: originalVarId },
                            select: { nodeId: true }
                        })];
                case 196:
                    originalVariable = _34.sent();
                    if (originalVariable === null || originalVariable === void 0 ? void 0 : originalVariable.nodeId) {
                        // Appel asynchrone non-bloquant pour mettre à jour le Total
                        (0, sum_display_field_routes_js_1.updateSumDisplayFieldAfterCopyChange)(originalVariable.nodeId, prisma).catch(function (err) {
                            console.warn("\u26A0\uFE0F Erreur mise \u00E0 jour champ Total:", err);
                        });
                    }
                    return [3 /*break*/, 198];
                case 197:
                    sumErr_1 = _34.sent();
                    console.warn("\u26A0\uFE0F Erreur r\u00E9cup\u00E9ration variable originale pour Total:", sumErr_1);
                    return [3 /*break*/, 198];
                case 198: return [2 /*return*/, {
                        variableId: newVariable.id,
                        exposedKey: newExposedKey,
                        capacityType: capacityType,
                        sourceRef: newSourceRef,
                        success: true,
                        displayNodeId: autoCreateDisplayNode ? finalNodeId : undefined,
                        // 🟢 RETOURNER LES MAPS pour que repeat-executor puisse les agréger
                        formulaIdMap: formulaIdMap,
                        conditionIdMap: conditionIdMap,
                        tableIdMap: tableIdMap
                    }];
                case 199:
                    error_3 = _34.sent();
                    console.error("\n".concat('═'.repeat(80)));
                    console.error("\u274C\u274C\u274C ERREUR FATALE lors de la copie de la variable!");
                    console.error("Variable ID: ".concat(originalVarId));
                    console.error("Suffix: ".concat(suffix));
                    console.error("Display Node ID: ".concat(finalNodeId || 'undefined'));
                    console.error("Message d'erreur:", error_3 instanceof Error ? error_3.message : String(error_3));
                    console.error("Stack trace:", error_3 instanceof Error ? error_3.stack : 'N/A');
                    console.error("".concat('═'.repeat(80), "\n"));
                    // ⚠️ RE-JETER L'EXCEPTION au lieu de retourner silencieusement success: false
                    // Cela force le problème à remonter et à être visible
                    throw error_3;
                case 200: return [2 /*return*/];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🧩 CRÉER UN NŒUD D'AFFICHAGE POUR UNE VARIABLE EXISTANTE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Crée (ou met à jour) un nœud d'affichage pour une variable existante.
 * N'implique pas de duplication de variable.
 */
function createDisplayNodeForExistingVariable(variableId_1, prisma_1) {
    return __awaiter(this, arguments, void 0, function (variableId, prisma, displaySectionLabel, suffix) {
        var v, owner, displayParentId, now, baseData, existing;
        var _a, _b;
        if (displaySectionLabel === void 0) { displaySectionLabel = 'Nouveau Section'; }
        if (suffix === void 0) { suffix = 'nouveau'; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } })];
                case 1:
                    v = _c.sent();
                    if (!v)
                        throw new Error("Variable introuvable: ".concat(variableId));
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: v.nodeId },
                            select: {
                                id: true,
                                parentId: true,
                                treeId: true,
                                order: true,
                                linkedTableIds: true,
                                hasTable: true,
                                table_name: true,
                                table_activeId: true,
                                table_instances: true,
                                // 🔑 IMPORTANT: Récupérer subtab pour que la copie soit dans le bon sous-onglet
                                subtab: true,
                                subtabs: true,
                            }
                        })];
                case 2:
                    owner = _c.sent();
                    if (!owner)
                        throw new Error("N\u0153ud propri\u00E9taire introuvable: ".concat(v.nodeId));
                    displayParentId = owner.parentId;
                    console.log("\uD83D\uDCCC [createDisplayNodeForExistingVariable] R\u00C8GLE: Copie dans le M\u00CAME parent que l'original: ".concat(displayParentId));
                    now = new Date();
                    baseData = {
                        id: displayNodeId,
                        treeId: owner.treeId,
                        parentId: displayParentId,
                        type: 'leaf_field',
                        subType: null,
                        label: v.displayName || 'Donnée',
                        description: null,
                        value: null,
                        order: ((_a = owner.order) !== null && _a !== void 0 ? _a : 0) + 1,
                        isRequired: false,
                        isVisible: true,
                        isActive: true,
                        isMultiple: false,
                        fieldConfig: null,
                        conditionConfig: null,
                        formulaConfig: null,
                        tableConfig: null,
                        apiConfig: null,
                        linkConfig: null,
                        defaultValue: null,
                        calculatedValue: null,
                        metadata: { fromVariableId: variableId },
                        // 🔑 IMPORTANT: Copier le subtab pour que la copie soit dans le bon sous-onglet
                        subtab: owner.subtab,
                        subtabs: owner.subtabs,
                        createdAt: now,
                        updatedAt: now,
                        hasAPI: false,
                        hasCondition: false,
                        hasData: false,
                        hasFormula: false,
                        hasLink: false,
                        hasMarkers: false,
                        // 📊 TABLE: Copier les colonnes table du nœud original
                        hasTable: (_b = owner.hasTable) !== null && _b !== void 0 ? _b : false,
                        table_name: owner.table_name,
                        table_activeId: owner.table_activeId,
                        table_instances: owner.table_instances,
                        linkedTableIds: Array.isArray(owner.linkedTableIds) ? owner.linkedTableIds : [],
                        linkedConditionIds: [],
                        linkedFormulaIds: [],
                        linkedVariableIds: [variableId],
                        appearance_size: 'md',
                        appearance_variant: null,
                        appearance_width: '100%',
                        fieldType: 'TEXT',
                        fieldSubType: null,
                        field_label: v.displayName,
                    };
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } })];
                case 3:
                    existing = _c.sent();
                    if (!existing) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({ where: { id: displayNodeId }, data: __assign(__assign({}, baseData), { createdAt: existing.createdAt, updatedAt: now }) })];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, prisma.treeBranchLeafNode.create({ data: baseData })];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: displayNodeId },
                        data: {
                            hasData: true,
                            data_activeId: variableId,
                            data_exposedKey: v.exposedKey,
                            data_displayFormat: v.displayFormat,
                            data_precision: v.precision,
                            data_unit: v.unit,
                            data_visibleToUser: v.visibleToUser
                        }
                    })];
                case 8:
                    _c.sent();
                    return [2 /*return*/, { displayNodeId: displayNodeId, created: !existing }];
            }
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES POUR LINKED FIELDS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Ajoute des IDs à un champ linked... d'un nœud (sans doublons)
 *
 * @param prisma - Instance Prisma
 * @param nodeId - ID du nœud
 * @param field - Nom du champ ('linkedFormulaIds', 'linkedConditionIds', etc.)
 * @param idsToAdd - IDs à ajouter
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
// Remplace une variable liée par sa version suffixée sur un nœud donné
function replaceLinkedVariableId(prisma, nodeId, originalVarId, newVarId, suffix) {
    return __awaiter(this, void 0, void 0, function () {
        var stripNumericSuffix, node, suffixedId, current, base, filtered, next, changed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stripNumericSuffix = function (raw) { return raw.replace(/-\d+(?:-\d+)*$/, ''); };
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: nodeId },
                            select: { linkedVariableIds: true }
                        })];
                case 1:
                    node = _a.sent();
                    if (!node)
                        return [2 /*return*/];
                    suffixedId = "".concat(originalVarId, "-").concat(suffix);
                    current = node.linkedVariableIds || [];
                    base = stripNumericSuffix(originalVarId);
                    filtered = current.filter(function (id) { return stripNumericSuffix(id) !== base; });
                    next = Array.from(new Set(__spreadArray(__spreadArray([], filtered, true), [newVarId, suffixedId], false)));
                    changed = current.length !== next.length ||
                        current.some(function (id) { return !next.includes(id); });
                    if (!changed)
                        return [2 /*return*/];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: { linkedVariableIds: { set: next } }
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * 🔗 COPIE MASSIVE DE VARIABLES LIÉES
 *
 * Cette fonction :
 * 1. Lit l'ID du nœud source avec ses linkedVariableIds
 * 2. Pour chaque ID de variable lié, récupère la variable
 * 3. Copie la variable avec son suffixe
 * 4. Copie les données associées (capacités, formules, conditions, tables)
 * 5. Met à jour les références bidirectionnelles
 *
 * CONTEXTE D'UTILISATION :
 * Si un nœud a des linkedVariableIds = ['varA', 'varB', 'varC'],
 * cette fonction va copier ces 3 variables + toutes leurs capacités.
 * Les champs existent déjà dans le nouveau nœud avec le suffixe.
 *
 * @param sourceNodeId - ID du nœud source (contient linkedVariableIds)
 * @param newNodeId - ID du nouveau nœud destination
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec maps de références (formules, conditions, tables)
 * @returns Résultat de la copie massif
 *
 * @example
 * // Copier toutes les variables liées du nœud 'node-abc' vers 'node-abc-1'
 * const result = await copyLinkedVariablesFromNode(
 *   'node-abc',
 *   'node-abc-1',
 *   1,
 *   prisma,
 *   { formulaIdMap, conditionIdMap, tableIdMap }
 * );
 * console.log(`${result.count} variables copiées`);
 * // Accéder à la map : result.variableIdMap.get('oldVarId') → 'oldVarId-1'
 */
function copyLinkedVariablesFromNode(sourceNodeId_1, newNodeId_1, suffix_1, prisma_1) {
    return __awaiter(this, arguments, void 0, function (sourceNodeId, newNodeId, suffix, prisma, options) {
        var sourceNode, linkedVarIds, variableIdMap, results, i, varId, result, e_20, newVarIds, successCount, failureCount, error_4;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83D\uDD17 COPIE VARIABLES LI\u00C9ES DU N\u0152UD");
                    console.log("   Source: ".concat(sourceNodeId));
                    console.log("   Destination: ".concat(newNodeId));
                    console.log("   Suffixe: ".concat(suffix));
                    console.log("".concat('═'.repeat(80), "\n"));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: sourceNodeId },
                            select: { linkedVariableIds: true }
                        })];
                case 2:
                    sourceNode = _a.sent();
                    if (!sourceNode) {
                        console.error("\u274C N\u0153ud source introuvable: ".concat(sourceNodeId));
                        return [2 /*return*/, {
                                count: 0,
                                variableIdMap: new Map(),
                                results: [],
                                success: false,
                                error: "N\u0153ud source introuvable: ".concat(sourceNodeId)
                            }];
                    }
                    linkedVarIds = sourceNode.linkedVariableIds || [];
                    console.log("\uD83D\uDCCB ".concat(linkedVarIds.length, " variables li\u00E9es trouv\u00E9es"));
                    if (linkedVarIds.length === 0) {
                        console.log("\u26A0\uFE0F Aucune variable li\u00E9e \u00E0 copier");
                        return [2 /*return*/, {
                                count: 0,
                                variableIdMap: new Map(),
                                results: [],
                                success: true
                            }];
                    }
                    variableIdMap = new Map();
                    results = [];
                    console.log("\n\uD83D\uDCDD Copie de ".concat(linkedVarIds.length, " variables..."));
                    i = 0;
                    _a.label = 3;
                case 3:
                    if (!(i < linkedVarIds.length)) return [3 /*break*/, 8];
                    varId = linkedVarIds[i];
                    console.log("\n[".concat(i + 1, "/").concat(linkedVarIds.length, "] \uD83D\uDD04 Copie variable: ").concat(varId));
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, copyVariableWithCapacities(varId, suffix, newNodeId, prisma, options)];
                case 5:
                    result = _a.sent();
                    if (result.success) {
                        variableIdMap.set(varId, result.variableId);
                        console.log("\u2705 Variable copi\u00E9e: ".concat(varId, " \u2192 ").concat(result.variableId));
                    }
                    else {
                        console.error("\u274C \u00C9chec copie: ".concat(result.error));
                    }
                    results.push(result);
                    return [3 /*break*/, 7];
                case 6:
                    e_20 = _a.sent();
                    console.error("\u274C Exception lors de la copie: ".concat(e_20.message));
                    results.push({
                        variableId: '',
                        exposedKey: '',
                        capacityType: null,
                        sourceRef: null,
                        success: false,
                        error: e_20.message
                    });
                    return [3 /*break*/, 7];
                case 7:
                    i++;
                    return [3 /*break*/, 3];
                case 8:
                    newVarIds = Array.from(variableIdMap.values());
                    console.log("\n\uD83D\uDD17 Mise \u00E0 jour linkedVariableIds du n\u0153ud destination...");
                    console.log("   IDs \u00E0 ajouter: ".concat(newVarIds.join(', ')));
                    return [4 /*yield*/, addToNodeLinkedField(prisma, newNodeId, 'linkedVariableIds', newVarIds)];
                case 9:
                    _a.sent();
                    console.log("\u2705 linkedVariableIds mis \u00E0 jour pour le n\u0153ud ".concat(newNodeId));
                    successCount = results.filter(function (r) { return r.success; }).length;
                    failureCount = results.length - successCount;
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83D\uDCCA R\u00C9SUM\u00C9 COPIE VARIABLES LI\u00C9ES");
                    console.log("   \u2705 Succ\u00E8s: ".concat(successCount, "/").concat(linkedVarIds.length));
                    console.log("   \u274C \u00C9checs: ".concat(failureCount, "/").concat(linkedVarIds.length));
                    console.log("   \uD83D\uDDFA\uFE0F Map: ".concat(variableIdMap.size, " entr\u00E9es"));
                    console.log("".concat('═'.repeat(80), "\n"));
                    return [2 /*return*/, {
                            count: successCount,
                            variableIdMap: variableIdMap,
                            results: results,
                            success: failureCount === 0
                        }];
                case 10:
                    error_4 = _a.sent();
                    console.error("\u274C Erreur globale lors de la copie de variables li\u00E9es:", error_4);
                    return [2 /*return*/, {
                            count: 0,
                            variableIdMap: new Map(),
                            results: [],
                            success: false,
                            error: error_4 instanceof Error ? error_4.message : String(error_4)
                        }];
                case 11: return [2 /*return*/];
            }
        });
    });
}

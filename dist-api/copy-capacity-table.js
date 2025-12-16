"use strict";
/**
 * 📊 Système de copie des TABLES
 *
 * Ce module gère la copie complète d'une table (TreeBranchLeafNodeTable)
 * avec toutes ses sous-entités : colonnes, lignes et cellules.
 *
 * PRINCIPES :
 * -----------
 * 1. Copier la table principale avec suffixe
 * 2. Copier toutes les colonnes (TreeBranchLeafNodeTableColumn)
 * 3. Copier toutes les lignes (TreeBranchLeafNodeTableRow)
 * 4. Copier toutes les cellules (TreeBranchLeafNodeTableCell)
 * 5. Réécrire les IDs dans les configs JSON
 * 6. 🔗 LIAISON AUTOMATIQUE OBLIGATOIRE: linkedTableIds sur TOUS les nœuds référencés
 * 7. Mettre à jour linkedTableIds du nœud propriétaire
 * 8. Synchroniser les paramètres de capacité (hasTable, table_activeId, etc.)
 *
 * @author System TBL
 * @version 2.0.0 - LIAISON AUTOMATIQUE OBLIGATOIRE
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.copyTableCapacity = copyTableCapacity;
var universal_linking_system_1 = require("./universal-linking-system");
var universal_reference_rewriter_js_1 = require("./repeat/utils/universal-reference-rewriter.js");
function stripNumericSuffix(value) {
    if (!value)
        return value;
    var numericWithAnySuffix = /^\d+(?:-\d+)+$/;
    var numericOnly = /^\d+$/;
    if (numericWithAnySuffix.test(value))
        return value.split('-')[0];
    if (numericOnly.test(value))
        return value;
    return value;
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES DE RÉÉCRITURE
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// 🔄 Réécriture utilise maintenant le système universel rewriteJsonReferences
// La fonction ancienne rewriteIdsInJson est remplacée par rewriteJsonReferences
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Copie une table avec toutes ses colonnes, lignes et cellules
 *
 * PROCESSUS :
 * -----------
 * 1. Vérifier le cache (éviter doublons)
 * 2. Récupérer la table originale + colonnes + lignes + cellules
 * 3. Générer les nouveaux IDs avec suffixe
 * 4. Créer la nouvelle table
 * 5. Copier toutes les colonnes
 * 6. Copier toutes les lignes
 * 7. Copier toutes les cellules
 * 8. Mettre à jour linkedTableIds du nœud
 * 9. Synchroniser les paramètres de capacité
 * 10. Mettre en cache
 *
 * @param originalTableId - ID de la table à copier
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec nodeIdMap
 * @returns Résultat de la copie
 *
 * @example
 * const result = await copyTableCapacity(
 *   'table-abc',
 *   'node-xyz-1',
 *   1,
 *   prisma,
 *   { nodeIdMap: new Map([['node-a', 'node-a-1']]) }
 * );
 * // result.newTableId = 'table-abc-1'
 * // result.columnsCount = 3
 * // result.rowsCount = 5
 * // result.cellsCount = 15
 */
function copyTableCapacity(originalTableId_1, newNodeId_1, suffix_1, prisma_1) {
    return __awaiter(this, arguments, void 0, function (originalTableId, newNodeId, suffix, prisma, options) {
        var _a, nodeIdMap, _b, tableCopyCache, _c, tableIdMap, cachedId, cached, totalCells, _i, _d, row, cells, cleanTableId, originalTable_1, originalTotalCells, _e, _f, row, cells, newTableId, originalOwnerNodeId, correctOwnerNodeId, ownerNodeExists, finalOwnerNodeId, columnIdMap, rowIdMap, newTable, originalColumnsRaw, columnsCount, _loop_1, _g, originalColumnsRaw_1, col, originalRowsRaw, rowsCount, _h, originalRowsRaw_1, row, newRowId, e_1, cols, _j, cols_1, c, cleaned, e_2, rewriteMaps, rewrittenTableData, e_3, e_4, originalNode, newTableInstances, originalInstances, _k, _l, _m, tableId, config, mappedTableId, remappedConfig, oldActiveId, newActiveId, e_5, error_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83D\uDCCA COPIE TABLE: ".concat(originalTableId));
                    console.log("   Suffixe: ".concat(suffix));
                    console.log("   Nouveau n\u0153ud: ".concat(newNodeId));
                    console.log("".concat('═'.repeat(80), "\n"));
                    _a = options.nodeIdMap, nodeIdMap = _a === void 0 ? new Map() : _a, _b = options.tableCopyCache, tableCopyCache = _b === void 0 ? new Map() : _b, _c = options.tableIdMap, tableIdMap = _c === void 0 ? new Map() : _c;
                    _o.label = 1;
                case 1:
                    _o.trys.push([1, 43, , 44]);
                    if (!tableCopyCache.has(originalTableId)) return [3 /*break*/, 3];
                    cachedId = tableCopyCache.get(originalTableId);
                    console.log("\u267B\uFE0F Table d\u00E9j\u00E0 copi\u00E9e (cache): ".concat(originalTableId, " \u2192 ").concat(cachedId));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                            where: { id: cachedId },
                            include: {
                                tableColumns: true,
                                tableRows: true
                            }
                        })];
                case 2:
                    cached = _o.sent();
                    if (cached) {
                        totalCells = 0;
                        for (_i = 0, _d = cached.tableRows; _i < _d.length; _i++) {
                            row = _d[_i];
                            cells = row.cells || [];
                            totalCells += Array.isArray(cells) ? cells.length : Object.keys(cells).length;
                        }
                        return [2 /*return*/, {
                                newTableId: cached.id,
                                nodeId: cached.nodeId,
                                columnsCount: cached.tableColumns.length,
                                rowsCount: cached.tableRows.length,
                                cellsCount: totalCells,
                                success: true
                            }];
                    }
                    _o.label = 3;
                case 3:
                    cleanTableId = originalTableId.replace(/-\d+$/, '');
                    console.log("\uD83D\uDD0D Recherche table avec id: ".concat(cleanTableId, " (original: ").concat(originalTableId, ")"));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                            where: { id: cleanTableId },
                            include: {
                                tableColumns: { orderBy: { columnIndex: 'asc' } },
                                tableRows: { orderBy: { rowIndex: 'asc' } }
                            }
                        })];
                case 4:
                    originalTable_1 = _o.sent();
                    if (!originalTable_1) {
                        console.error("\u274C Table introuvable avec id: ".concat(cleanTableId));
                        return [2 /*return*/, {
                                newTableId: '',
                                nodeId: '',
                                columnsCount: 0,
                                rowsCount: 0,
                                cellsCount: 0,
                                success: false,
                                error: "Table introuvable avec id: ".concat(cleanTableId)
                            }];
                    }
                    console.log("\u2705 Table trouv\u00E9e: ".concat(originalTable_1.name || originalTable_1.id));
                    console.log("   NodeId original: ".concat(originalTable_1.nodeId));
                    console.log("   Colonnes: ".concat(originalTable_1.tableColumns.length));
                    console.log("   Lignes: ".concat(originalTable_1.tableRows.length));
                    originalTotalCells = 0;
                    for (_e = 0, _f = originalTable_1.tableRows; _e < _f.length; _e++) {
                        row = _f[_e];
                        cells = row.cells || [];
                        originalTotalCells += Array.isArray(cells) ? cells.length : Object.keys(cells).length;
                    }
                    console.log("   Cellules (total): ".concat(originalTotalCells));
                    newTableId = "".concat(originalTable_1.id, "-").concat(suffix);
                    console.log("\uD83D\uDCDD Nouvel ID table: ".concat(newTableId));
                    originalOwnerNodeId = originalTable_1.nodeId;
                    correctOwnerNodeId = "".concat(originalOwnerNodeId, "-").concat(suffix);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: correctOwnerNodeId },
                            select: { id: true, label: true }
                        })];
                case 5:
                    ownerNodeExists = _o.sent();
                    finalOwnerNodeId = ownerNodeExists ? correctOwnerNodeId : newNodeId;
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId original propri\u00E9taire: ".concat(originalOwnerNodeId));
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId propri\u00E9taire suffix\u00E9: ".concat(correctOwnerNodeId));
                    console.log("\uD83D\uDD27 [OWNER FIX] Propri\u00E9taire suffix\u00E9 existe: ".concat(ownerNodeExists ? 'OUI (' + ownerNodeExists.label + ')' : 'NON'));
                    console.log("\uD83D\uDD27 [OWNER FIX] NodeId FINAL utilis\u00E9: ".concat(finalOwnerNodeId));
                    columnIdMap = new Map();
                    rowIdMap = new Map();
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({ where: { id: newTableId } })];
                case 6:
                    newTable = _o.sent();
                    if (!newTable) return [3 /*break*/, 8];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.update({
                            where: { id: newTableId },
                            data: {
                                nodeId: finalOwnerNodeId,
                                name: originalTable_1.name ? "".concat(originalTable_1.name, "-").concat(suffix) : null,
                                description: originalTable_1.description,
                                type: originalTable_1.type,
                                // 🔢 COPIE TABLE META: suffixer TOUS les UUIDs et comparisonColumn
                                meta: (function () {
                                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                                    var rewriteMaps = { nodeIdMap: nodeIdMap, formulaIdMap: new Map(), conditionIdMap: new Map(), tableIdMap: tableIdMap };
                                    var rewritten = (0, universal_reference_rewriter_js_1.rewriteJsonReferences)(originalTable_1.meta, rewriteMaps, suffix);
                                    var suffixNum = parseInt(suffix) || 1;
                                    // Suffixer les UUIDs dans selectors
                                    if (((_b = (_a = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _a === void 0 ? void 0 : _a.selectors) === null || _b === void 0 ? void 0 : _b.columnFieldId) && !rewritten.lookup.selectors.columnFieldId.endsWith("-".concat(suffixNum))) {
                                        rewritten.lookup.selectors.columnFieldId = "".concat(rewritten.lookup.selectors.columnFieldId, "-").concat(suffixNum);
                                    }
                                    if (((_d = (_c = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _c === void 0 ? void 0 : _c.selectors) === null || _d === void 0 ? void 0 : _d.rowFieldId) && !rewritten.lookup.selectors.rowFieldId.endsWith("-".concat(suffixNum))) {
                                        rewritten.lookup.selectors.rowFieldId = "".concat(rewritten.lookup.selectors.rowFieldId, "-").concat(suffixNum);
                                    }
                                    // Suffixer sourceField
                                    if (((_f = (_e = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _e === void 0 ? void 0 : _e.rowSourceOption) === null || _f === void 0 ? void 0 : _f.sourceField) && !rewritten.lookup.rowSourceOption.sourceField.endsWith("-".concat(suffixNum))) {
                                        rewritten.lookup.rowSourceOption.sourceField = "".concat(rewritten.lookup.rowSourceOption.sourceField, "-").concat(suffixNum);
                                    }
                                    if (((_h = (_g = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _g === void 0 ? void 0 : _g.columnSourceOption) === null || _h === void 0 ? void 0 : _h.sourceField) && !rewritten.lookup.columnSourceOption.sourceField.endsWith("-".concat(suffixNum))) {
                                        rewritten.lookup.columnSourceOption.sourceField = "".concat(rewritten.lookup.columnSourceOption.sourceField, "-").concat(suffixNum);
                                    }
                                    // Suffixer comparisonColumn si c'est du texte
                                    if ((_k = (_j = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _j === void 0 ? void 0 : _j.rowSourceOption) === null || _k === void 0 ? void 0 : _k.comparisonColumn) {
                                        var val = rewritten.lookup.rowSourceOption.comparisonColumn;
                                        if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith("-".concat(suffix))) {
                                            rewritten.lookup.rowSourceOption.comparisonColumn = "".concat(val, "-").concat(suffix);
                                        }
                                    }
                                    if ((_m = (_l = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _l === void 0 ? void 0 : _l.columnSourceOption) === null || _m === void 0 ? void 0 : _m.comparisonColumn) {
                                        var val = rewritten.lookup.columnSourceOption.comparisonColumn;
                                        if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith("-".concat(suffix))) {
                                            rewritten.lookup.columnSourceOption.comparisonColumn = "".concat(val, "-").concat(suffix);
                                        }
                                    }
                                    return rewritten;
                                })(),
                                updatedAt: new Date()
                            }
                        })];
                case 7:
                    newTable = _o.sent();
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, prisma.treeBranchLeafNodeTable.create({
                        data: {
                            id: newTableId,
                            nodeId: finalOwnerNodeId,
                            organizationId: originalTable_1.organizationId,
                            name: originalTable_1.name ? "".concat(originalTable_1.name, "-").concat(suffix) : null,
                            description: originalTable_1.description,
                            type: originalTable_1.type,
                            // 🔢 COPIE TABLE META: suffixer TOUS les UUIDs et comparisonColumn
                            meta: (function () {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                                var rewriteMaps = { nodeIdMap: nodeIdMap, formulaIdMap: new Map(), conditionIdMap: new Map(), tableIdMap: tableIdMap };
                                var rewritten = (0, universal_reference_rewriter_js_1.rewriteJsonReferences)(originalTable_1.meta, rewriteMaps);
                                var suffixNum = parseInt(suffix) || 1;
                                // Suffixer les UUIDs dans selectors
                                if (((_b = (_a = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _a === void 0 ? void 0 : _a.selectors) === null || _b === void 0 ? void 0 : _b.columnFieldId) && !rewritten.lookup.selectors.columnFieldId.endsWith("-".concat(suffixNum))) {
                                    rewritten.lookup.selectors.columnFieldId = "".concat(rewritten.lookup.selectors.columnFieldId, "-").concat(suffixNum);
                                }
                                if (((_d = (_c = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _c === void 0 ? void 0 : _c.selectors) === null || _d === void 0 ? void 0 : _d.rowFieldId) && !rewritten.lookup.selectors.rowFieldId.endsWith("-".concat(suffixNum))) {
                                    rewritten.lookup.selectors.rowFieldId = "".concat(rewritten.lookup.selectors.rowFieldId, "-").concat(suffixNum);
                                }
                                // Suffixer sourceField
                                if (((_f = (_e = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _e === void 0 ? void 0 : _e.rowSourceOption) === null || _f === void 0 ? void 0 : _f.sourceField) && !rewritten.lookup.rowSourceOption.sourceField.endsWith("-".concat(suffixNum))) {
                                    rewritten.lookup.rowSourceOption.sourceField = "".concat(rewritten.lookup.rowSourceOption.sourceField, "-").concat(suffixNum);
                                }
                                if (((_h = (_g = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _g === void 0 ? void 0 : _g.columnSourceOption) === null || _h === void 0 ? void 0 : _h.sourceField) && !rewritten.lookup.columnSourceOption.sourceField.endsWith("-".concat(suffixNum))) {
                                    rewritten.lookup.columnSourceOption.sourceField = "".concat(rewritten.lookup.columnSourceOption.sourceField, "-").concat(suffixNum);
                                }
                                // Suffixer comparisonColumn si c'est du texte
                                if ((_k = (_j = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _j === void 0 ? void 0 : _j.rowSourceOption) === null || _k === void 0 ? void 0 : _k.comparisonColumn) {
                                    var val = rewritten.lookup.rowSourceOption.comparisonColumn;
                                    if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith("-".concat(suffix))) {
                                        rewritten.lookup.rowSourceOption.comparisonColumn = "".concat(val, "-").concat(suffix);
                                    }
                                }
                                if ((_m = (_l = rewritten === null || rewritten === void 0 ? void 0 : rewritten.lookup) === null || _l === void 0 ? void 0 : _l.columnSourceOption) === null || _m === void 0 ? void 0 : _m.comparisonColumn) {
                                    var val = rewritten.lookup.columnSourceOption.comparisonColumn;
                                    if (!/^-?\d+(\.\d+)?$/.test(val.trim()) && !val.endsWith("-".concat(suffix))) {
                                        rewritten.lookup.columnSourceOption.comparisonColumn = "".concat(val, "-").concat(suffix);
                                    }
                                }
                                return rewritten;
                            })(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    })];
                case 9:
                    newTable = _o.sent();
                    _o.label = 10;
                case 10:
                    console.log("\u2705 Table cr\u00E9\u00E9e: ".concat(newTable.id));
                    // ═══════════════════════════════════════════════════════════════════════
                    // 📋 ÉTAPE 5 : Copier toutes les colonnes (EXACT comme copy-table-final.cjs)
                    // ═══════════════════════════════════════════════════════════════════════
                    console.log("\n\uD83D\uDCCB Copie de ".concat(originalTable_1.tableColumns.length, " colonnes..."));
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT \"id\", \"tableId\", \"columnIndex\", \"name\", \"type\", \"width\", \"format\", \"metadata\"\n      FROM \"TreeBranchLeafNodeTableColumn\"\n      WHERE \"tableId\" = ", "\n      ORDER BY \"columnIndex\" ASC\n    "], ["\n      SELECT \"id\", \"tableId\", \"columnIndex\", \"name\", \"type\", \"width\", \"format\", \"metadata\"\n      FROM \"TreeBranchLeafNodeTableColumn\"\n      WHERE \"tableId\" = ", "\n      ORDER BY \"columnIndex\" ASC\n    "])), originalTable_1.id)];
                case 11:
                    originalColumnsRaw = _o.sent();
                    columnsCount = 0;
                    _loop_1 = function (col) {
                        var newColumnId, normalizedName, e_6;
                        return __generator(this, function (_p) {
                            switch (_p.label) {
                                case 0:
                                    _p.trys.push([0, 2, , 3]);
                                    newColumnId = "".concat(Math.random().toString(36).substring(2, 15)).concat(Math.random().toString(36).substring(2, 15));
                                    columnIdMap.set(col.id, newColumnId);
                                    normalizedName = (function () {
                                        var raw = col.name;
                                        if (!raw)
                                            return raw;
                                        // Si c'est un nombre pur (ex: "35", "90", "0.5"), pas de suffixe
                                        if (/^-?\d+(\.\d+)?$/.test(raw.trim()))
                                            return raw;
                                        // Sinon c'est du texte → ajouter le suffixe
                                        return "".concat(raw, "-").concat(suffix);
                                    })();
                                    // Créer directement - SANS réécrire le metadata/config (comme le script)
                                    return [4 /*yield*/, prisma.treeBranchLeafNodeTableColumn.create({
                                            data: {
                                                id: newColumnId,
                                                tableId: newTableId,
                                                columnIndex: col.columnIndex,
                                                name: normalizedName,
                                                type: col.type || 'text',
                                                width: col.width,
                                                format: col.format,
                                                metadata: col.metadata // Copie brute, pas de réécriture
                                            }
                                        })];
                                case 1:
                                    // Créer directement - SANS réécrire le metadata/config (comme le script)
                                    _p.sent();
                                    columnsCount++;
                                    console.log("  \u2713 [".concat(col.columnIndex, "] \"").concat(col.name, "\" \u2192 ").concat(newColumnId));
                                    return [3 /*break*/, 3];
                                case 2:
                                    e_6 = _p.sent();
                                    console.warn("  \u26A0\uFE0F [".concat(col.columnIndex, "] Erreur: ").concat(e_6.message.split('\n')[0].substring(0, 80)));
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _g = 0, originalColumnsRaw_1 = originalColumnsRaw;
                    _o.label = 12;
                case 12:
                    if (!(_g < originalColumnsRaw_1.length)) return [3 /*break*/, 15];
                    col = originalColumnsRaw_1[_g];
                    return [5 /*yield**/, _loop_1(col)];
                case 13:
                    _o.sent();
                    _o.label = 14;
                case 14:
                    _g++;
                    return [3 /*break*/, 12];
                case 15:
                    console.log("\u2705 ".concat(columnsCount, " colonnes copi\u00E9es"));
                    // ═══════════════════════════════════════════════════════════════════════
                    // 📄 ÉTAPE 6 : Copier toutes les lignes (EXACT comme copy-table-final.cjs)
                    // ═══════════════════════════════════════════════════════════════════════
                    console.log("\n\uD83D\uDCC4 Copie de ".concat(originalTable_1.tableRows.length, " lignes..."));
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      SELECT \"id\", \"tableId\", \"rowIndex\", \"cells\"\n      FROM \"TreeBranchLeafNodeTableRow\"\n      WHERE \"tableId\" = ", "\n      ORDER BY \"rowIndex\" ASC\n    "], ["\n      SELECT \"id\", \"tableId\", \"rowIndex\", \"cells\"\n      FROM \"TreeBranchLeafNodeTableRow\"\n      WHERE \"tableId\" = ", "\n      ORDER BY \"rowIndex\" ASC\n    "])), originalTable_1.id)];
                case 16:
                    originalRowsRaw = _o.sent();
                    rowsCount = 0;
                    _h = 0, originalRowsRaw_1 = originalRowsRaw;
                    _o.label = 17;
                case 17:
                    if (!(_h < originalRowsRaw_1.length)) return [3 /*break*/, 22];
                    row = originalRowsRaw_1[_h];
                    _o.label = 18;
                case 18:
                    _o.trys.push([18, 20, , 21]);
                    newRowId = "".concat(Math.random().toString(36).substring(2, 15)).concat(Math.random().toString(36).substring(2, 15));
                    rowIdMap.set(row.id, newRowId);
                    // Créer directement - SANS réécrire les cells (comme le script)
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTableRow.create({
                            data: {
                                id: newRowId,
                                tableId: newTableId,
                                rowIndex: row.rowIndex,
                                cells: row.cells // Copie brute, pas de réécriture
                            }
                        })];
                case 19:
                    // Créer directement - SANS réécrire les cells (comme le script)
                    _o.sent();
                    rowsCount++;
                    if (rowsCount % 5 === 0) {
                        console.log("  \u2713 ".concat(rowsCount, "/").concat(originalRowsRaw.length, " lignes copi\u00E9es..."));
                    }
                    return [3 /*break*/, 21];
                case 20:
                    e_1 = _o.sent();
                    console.warn("  \u26A0\uFE0F [".concat(row.rowIndex, "] Erreur: ").concat(e_1.message.split('\n')[0].substring(0, 80)));
                    return [3 /*break*/, 21];
                case 21:
                    _h++;
                    return [3 /*break*/, 17];
                case 22:
                    console.log("\u2705 ".concat(rowsCount, " lignes copi\u00E9es"));
                    _o.label = 23;
                case 23:
                    _o.trys.push([23, 29, , 30]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTableColumn.findMany({
                            where: { tableId: newTableId },
                            select: { id: true, name: true }
                        })];
                case 24:
                    cols = _o.sent();
                    _j = 0, cols_1 = cols;
                    _o.label = 25;
                case 25:
                    if (!(_j < cols_1.length)) return [3 /*break*/, 28];
                    c = cols_1[_j];
                    cleaned = stripNumericSuffix(c.name);
                    if (!(cleaned !== c.name)) return [3 /*break*/, 27];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTableColumn.update({
                            where: { id: c.id },
                            data: { name: cleaned }
                        })];
                case 26:
                    _o.sent();
                    _o.label = 27;
                case 27:
                    _j++;
                    return [3 /*break*/, 25];
                case 28:
                    console.log("\u2705 Noms de colonnes normalis\u00E9s (suffixes num\u00E9riques retir\u00E9s)");
                    return [3 /*break*/, 30];
                case 29:
                    e_2 = _o.sent();
                    console.warn("\u26A0\uFE0F Normalisation des noms de colonnes \u00E9chou\u00E9e:", e_2.message);
                    return [3 /*break*/, 30];
                case 30: 
                // ═══════════════════════════════════════════════════════════════════════
                // 🔢 ÉTAPE 7 : Mettre à jour les métadonnées rowCount et columnCount
                // ═══════════════════════════════════════════════════════════════════════
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.update({
                        where: { id: newTableId },
                        data: {
                            rowCount: rowsCount,
                            columnCount: columnsCount,
                            updatedAt: new Date()
                        }
                    })];
                case 31:
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔢 ÉTAPE 7 : Mettre à jour les métadonnées rowCount et columnCount
                    // ═══════════════════════════════════════════════════════════════════════
                    _o.sent();
                    console.log("\u2705 M\u00E9tadonn\u00E9es mises \u00E0 jour:");
                    console.log("   - rowCount: ".concat(rowsCount));
                    console.log("\u2705 Table cr\u00E9\u00E9e: ".concat(newTable.id));
                    rewriteMaps = { nodeIdMap: nodeIdMap, formulaIdMap: new Map(), conditionIdMap: new Map(), tableIdMap: tableIdMap };
                    rewrittenTableData = (0, universal_reference_rewriter_js_1.rewriteJsonReferences)(originalTable_1.tableData, rewriteMaps, suffix);
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔥 RÉÉCRITURE FORCÉE DES SHARED-REFS DANS LA TABLE
                    // ═══════════════════════════════════════════════════════════════════════
                    // Forcer TOUS les @value.shared-ref-* même imbriqués dans les cellules/colonnes
                    console.log("\n\uD83D\uDD25 R\u00C9\u00C9CRITURE FORC\u00C9E des shared-refs dans tableData...");
                    rewrittenTableData = (0, universal_reference_rewriter_js_1.forceSharedRefSuffixesInJson)(rewrittenTableData, suffix);
                    _o.label = 32;
                case 32:
                    _o.trys.push([32, 34, , 35]);
                    return [4 /*yield*/, (0, universal_linking_system_1.linkTableToAllNodes)(prisma, newTableId, rewrittenTableData)];
                case 33:
                    _o.sent();
                    return [3 /*break*/, 35];
                case 34:
                    e_3 = _o.sent();
                    console.error("\u274C Erreur LIAISON AUTOMATIQUE:", e_3.message);
                    return [3 /*break*/, 35];
                case 35:
                    _o.trys.push([35, 37, , 38]);
                    return [4 /*yield*/, addToNodeLinkedField(prisma, finalOwnerNodeId, 'linkedTableIds', [newTableId])];
                case 36:
                    _o.sent();
                    console.log("\u2705 linkedTableIds mis \u00E0 jour pour n\u0153ud propri\u00E9taire ".concat(finalOwnerNodeId));
                    return [3 /*break*/, 38];
                case 37:
                    e_4 = _o.sent();
                    console.warn("\u26A0\uFE0F Erreur MAJ linkedTableIds du propri\u00E9taire:", e_4.message);
                    return [3 /*break*/, 38];
                case 38:
                    _o.trys.push([38, 41, , 42]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: originalTable_1.nodeId },
                            select: {
                                table_activeId: true,
                                table_instances: true
                            }
                        })];
                case 39:
                    originalNode = _o.sent();
                    console.log("\uD83D\uDD0D N\u0153ud original trouv\u00E9, r\u00E9cup\u00E9ration table_instances...");
                    console.log("   - table_activeId original: ".concat(originalNode === null || originalNode === void 0 ? void 0 : originalNode.table_activeId));
                    console.log("   - table_instances:", (originalNode === null || originalNode === void 0 ? void 0 : originalNode.table_instances) ? Object.keys(originalNode.table_instances).length + ' clés' : 'null');
                    newTableInstances = {};
                    if ((originalNode === null || originalNode === void 0 ? void 0 : originalNode.table_instances) && typeof originalNode.table_instances === 'object') {
                        originalInstances = originalNode.table_instances;
                        for (_k = 0, _l = Object.entries(originalInstances); _k < _l.length; _k++) {
                            _m = _l[_k], tableId = _m[0], config = _m[1];
                            mappedTableId = tableIdMap.has(tableId) ? tableIdMap.get(tableId) : "".concat(tableId, "-").concat(suffix);
                            remappedConfig = (0, universal_reference_rewriter_js_1.rewriteJsonReferences)(config, rewriteMaps, suffix);
                            newTableInstances[mappedTableId] = remappedConfig;
                            console.log("   \uD83D\uDCCB Instance remapp\u00E9e: ".concat(tableId, " \u2192 ").concat(mappedTableId));
                        }
                    }
                    oldActiveId = originalNode === null || originalNode === void 0 ? void 0 : originalNode.table_activeId;
                    newActiveId = newTableId;
                    if (oldActiveId && tableIdMap.has(oldActiveId)) {
                        newActiveId = tableIdMap.get(oldActiveId);
                        console.log("   \uD83D\uDD04 table_activeId remapp\u00E9e: ".concat(oldActiveId, " \u2192 ").concat(newActiveId));
                    }
                    else if (oldActiveId) {
                        newActiveId = "".concat(oldActiveId, "-").concat(suffix);
                    }
                    // Ajouter la nouvelle table aux instances si pas déjà là
                    if (!newTableInstances[newTableId]) {
                        newTableInstances[newTableId] = {};
                        console.log("   \u2705 Instance ajout\u00E9e pour nouvelle table: ".concat(newTableId));
                    }
                    // Mettre à jour le nœud copié avec tous les paramètres
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: finalOwnerNodeId },
                            data: {
                                hasTable: true,
                                table_activeId: newTableId, // ✅ La nouvelle table est l'active
                                table_instances: newTableInstances, // ✅ Copié et remappé
                                table_name: newTable.name,
                                table_description: newTable.description,
                                table_type: newTable.type
                            }
                        })];
                case 40:
                    // Mettre à jour le nœud copié avec tous les paramètres
                    _o.sent();
                    console.log("\u2705 Param\u00E8tres capacit\u00E9 (table) mis \u00E0 jour pour n\u0153ud ".concat(finalOwnerNodeId));
                    console.log("   - table_activeId: ".concat(newTableId));
                    console.log("   - table_instances: ".concat(Object.keys(newTableInstances).length, " cl\u00E9(s) copi\u00E9e(s)"));
                    console.log("   - table_name: ".concat(newTable.name || 'null'));
                    console.log("   - table_type: ".concat(newTable.type || 'null'));
                    return [3 /*break*/, 42];
                case 41:
                    e_5 = _o.sent();
                    console.warn("\u26A0\uFE0F Erreur lors de la mise \u00E0 jour des param\u00E8tres capacit\u00E9:", e_5.message);
                    return [3 /*break*/, 42];
                case 42:
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🎯 ÉTAPE 10 (NOUVELLE) : Mettre à jour table_activeId + table_instances sur les nœuds selectors
                    // ═══════════════════════════════════════════════════════════════════════
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83C\uDFAF \u00C9TAPE 10: Activation des selectors avec lookup");
                    console.log("".concat('═'.repeat(80)));
                    // Selectors mis à jour automatiquement via ÉTAPE 9
                    console.log("\u2705 \u00C9TAPE 10: Selectors mis \u00E0 jour via l'\u00C9TAPE 9");
                    // ═══════════════════════════════════════════════════════════════════════
                    // 🔗 ÉTAPE 11 : Mettre en cache
                    // ═══════════════════════════════════════════════════════════════════════
                    tableCopyCache.set(originalTableId, newTableId);
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\u2705 COPIE TABLE TERMIN\u00C9E");
                    console.log("   \uD83D\uDCCA Table: ".concat(newTableId));
                    console.log("   \uD83D\uDCCB Colonnes: ".concat(originalTable_1.tableColumns.length));
                    console.log("   \uD83D\uDCC4 Lignes: ".concat(originalTable_1.tableRows.length));
                    console.log("   \uD83D\uDD22 Cellules: ".concat(cellsCopied));
                    console.log("".concat('═'.repeat(80), "\n"));
                    return [2 /*return*/, {
                            newTableId: newTableId,
                            nodeId: finalOwnerNodeId,
                            columnsCount: originalTable_1.tableColumns.length,
                            rowsCount: originalTable_1.tableRows.length,
                            cellsCount: cellsCopied,
                            success: true
                        }];
                case 43:
                    error_1 = _o.sent();
                    console.error("\u274C Erreur lors de la copie de la table:", error_1);
                    return [2 /*return*/, {
                            newTableId: '',
                            nodeId: '',
                            columnsCount: 0,
                            rowsCount: 0,
                            cellsCount: 0,
                            success: false,
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        }];
                case 44: return [2 /*return*/];
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
var templateObject_1, templateObject_2;

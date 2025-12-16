"use strict";
/**
 * 🎯 Copier les tables des SELECTORS après la copie de nœuds
 *
 * Quand on duplique un repeater qui contient des selecteurs,
 * les selecteurs sont copiés comme des nœuds (avec leurs IDs remappés),
 * mais leurs tables associées (linkedTableIds) ne sont PAS copiées!
 *
 * Cette fonction gère ça:
 * 1. Cherche tous les nœuds SELECTORS dans la copie
 * 2. Pour chaque selector avec table_activeId, copie sa table
 * 3. Met à jour le selector avec la nouvelle table copiée
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.copySelectorTablesAfterNodeCopy = copySelectorTablesAfterNodeCopy;
var copy_capacity_table_js_1 = require("./copy-capacity-table.js");
/**
 * Copie les tables des selectors APRÈS la duplication de nœuds
 */
function copySelectorTablesAfterNodeCopy(prisma, copiedRootNodeId, originalRootNodeId, options, suffix) {
    return __awaiter(this, void 0, void 0, function () {
        var getAllDescendants, originalNodeIds, copiedNodeIds, selectorsInOriginal, _i, selectorsInOriginal_1, originalSelector, originalTableId, copiedSelectorId, hasSelectConfig, originalTable, result, e_1, e_2;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n".concat('═'.repeat(80)));
                    console.log("\uD83C\uDFAF COPIE DES TABLES DES SELECTORS");
                    console.log("   copiedRootNodeId: ".concat(copiedRootNodeId));
                    console.log("   suffix: ".concat(suffix));
                    console.log("".concat('═'.repeat(80)));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 13, , 14]);
                    getAllDescendants = function (nodeId) { return __awaiter(_this, void 0, void 0, function () {
                        var results, queue, currentId, children;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    results = [];
                                    queue = [nodeId];
                                    _a.label = 1;
                                case 1:
                                    if (!(queue.length > 0)) return [3 /*break*/, 3];
                                    currentId = queue.shift();
                                    results.push(currentId);
                                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                                            where: { parentId: currentId },
                                            select: { id: true }
                                        })];
                                case 2:
                                    children = _a.sent();
                                    queue.push.apply(queue, children.map(function (c) { return c.id; }));
                                    return [3 /*break*/, 1];
                                case 3: return [2 /*return*/, results];
                            }
                        });
                    }); };
                    return [4 /*yield*/, getAllDescendants(originalRootNodeId)];
                case 2:
                    originalNodeIds = _a.sent();
                    return [4 /*yield*/, getAllDescendants(copiedRootNodeId)];
                case 3:
                    copiedNodeIds = _a.sent();
                    console.log("\uD83D\uDCCB ".concat(copiedNodeIds.length, " n\u0153uds trouv\u00E9s dans l'arborescence copi\u00E9e"));
                    console.log("\uD83D\uDCCB ".concat(originalNodeIds.length, " n\u0153uds trouv\u00E9s dans l'arborescence originale"));
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: {
                                id: { in: originalNodeIds },
                                table_activeId: { not: null }
                            },
                            select: {
                                id: true,
                                label: true,
                                type: true,
                                table_activeId: true,
                                linkedTableIds: true
                            }
                        })];
                case 4:
                    selectorsInOriginal = _a.sent();
                    console.log("\uD83D\uDD0D ".concat(selectorsInOriginal.length, " selector(s) trouv\u00E9(s) dans l'ORIGINAL"));
                    _i = 0, selectorsInOriginal_1 = selectorsInOriginal;
                    _a.label = 5;
                case 5:
                    if (!(_i < selectorsInOriginal_1.length)) return [3 /*break*/, 12];
                    originalSelector = selectorsInOriginal_1[_i];
                    originalTableId = originalSelector.table_activeId;
                    if (!originalTableId)
                        return [3 /*break*/, 11];
                    copiedSelectorId = options.nodeIdMap.get(originalSelector.id);
                    if (!copiedSelectorId) {
                        console.log("   \u26A0\uFE0F Selector ".concat(originalSelector.label, ": pas trouv\u00E9 dans nodeIdMap"));
                        return [3 /*break*/, 11];
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findUnique({
                            where: { nodeId: originalSelector.id }
                        })];
                case 6:
                    hasSelectConfig = _a.sent();
                    if (hasSelectConfig) {
                        console.log("   \u23ED\uFE0F Selector ".concat(originalSelector.label, ": utilise selectConfig (lookup), pas de copie de table"));
                        return [3 /*break*/, 11];
                    }
                    console.log("\n   \uD83D\uDCCD Selector: ".concat(originalSelector.label));
                    console.log("      - Original ID: ".concat(originalSelector.id.substring(0, 12), "..."));
                    console.log("      - Copi\u00E9 ID: ".concat(copiedSelectorId.substring(0, 12), "..."));
                    console.log("      - Table originale: ".concat(originalTableId));
                    return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                            where: { id: originalTableId },
                            select: {
                                id: true,
                                nodeId: true,
                                name: true,
                                meta: true,
                                type: true,
                                description: true,
                                displayInline: true,
                                tableColumns: { select: { id: true } },
                                tableRows: { select: { id: true, cells: true } }
                            }
                        })];
                case 7:
                    originalTable = _a.sent();
                    if (!originalTable) {
                        console.log("      \u274C Table ".concat(originalTableId, " NOT FOUND"));
                        return [3 /*break*/, 11];
                    }
                    console.log("      \u2705 Table trouv\u00E9e: ".concat(originalTable.name, " (").concat(originalTable.tableRows.length, " lignes)"));
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    console.log("      \uD83D\uDD04 Appel copyTableCapacity...");
                    console.log("         - originalTableId: ".concat(originalTableId));
                    console.log("         - copiedSelectorId (newNodeId): ".concat(copiedSelectorId));
                    console.log("         - suffix: ".concat(suffix));
                    return [4 /*yield*/, (0, copy_capacity_table_js_1.copyTableCapacity)(originalTableId, // ID de la table originale
                        copiedSelectorId, // 👈 Le nœud selector copié sera propriétaire de la table copiée
                        suffix, prisma, {
                            nodeIdMap: options.nodeIdMap,
                            tableCopyCache: options.tableCopyCache,
                            tableIdMap: options.tableIdMap
                        })];
                case 9:
                    result = _a.sent();
                    if (result.success) {
                        console.log("      \u2705 Table copi\u00E9e: ".concat(result.newTableId));
                        console.log("         - Colonnes: ".concat(result.columnsCount));
                        console.log("         - Lignes: ".concat(result.rowsCount));
                        console.log("         - Cellules: ".concat(result.cellsCount));
                        // 🎯 Les données ont déjà été copiées par copyTableCapacity !
                        // On juste confirme que le selector pointe vers la nouvelle table
                        console.log("      \u2705 Selector COPI\u00C9 automatiquement mis \u00E0 jour via copyTableCapacity");
                        console.log("         - table_activeId = ".concat(result.newTableId));
                        console.log("         - table_instances peupl\u00E9 avec donn\u00E9es");
                    }
                    else {
                        console.log("      \u274C Erreur copie table: ".concat(result.error));
                    }
                    return [3 /*break*/, 11];
                case 10:
                    e_1 = _a.sent();
                    console.warn("      \u26A0\uFE0F Erreur lors de la copie:", e_1.message);
                    return [3 /*break*/, 11];
                case 11:
                    _i++;
                    return [3 /*break*/, 5];
                case 12:
                    console.log("\n\u2705 Copie des tables des selectors termin\u00E9e\n");
                    return [3 /*break*/, 14];
                case 13:
                    e_2 = _a.sent();
                    console.warn("\u26A0\uFE0F Erreur dans copySelectorTablesAfterNodeCopy:", e_2.message);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}

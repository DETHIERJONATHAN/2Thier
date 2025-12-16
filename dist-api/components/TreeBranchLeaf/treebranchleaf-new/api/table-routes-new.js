"use strict";
/**
 * 🗂️ NOUVELLES ROUTES POUR LES TABLES - ARCHITECTURE NORMALISÉE
 *
 * Cette version utilise une architecture 100% normalisée :
 * - TreeBranchLeafNodeTable : Métadonnées de la table
 * - TreeBranchLeafNodeTableColumn : Chaque colonne est une entrée séparée
 * - TreeBranchLeafNodeTableRow : Chaque ligne est une entrée séparée
 *
 * Plus de JSON volumineux, tout est stocké de manière relationnelle !
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
var express_1 = require("express");
var client_1 = require("@prisma/client");
var crypto_1 = require("crypto");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
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
// =============================================================================
// POST /api/treebranchleaf/nodes/:nodeId/tables - Créer une table
// =============================================================================
router.post('/nodes/:nodeId/tables', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, name, description, columns, rows, _b, type, _c, organizationId, isSuperAdmin, node, finalName, existingTable, existingCount, tableId_1, tableData_1, tableColumnsData_1, tableRowsData_1, result, node_1, current, next, e_1, selectConfig, oldTableRef, otherConfigs, updateResult, updateError_1, createdTable, error_1;
    var _d, _e, _f, _g, _h, _j, _k;
    return __generator(this, function (_l) {
        switch (_l.label) {
            case 0:
                nodeId = req.params.nodeId;
                _a = req.body, name = _a.name, description = _a.description, columns = _a.columns, rows = _a.rows, _b = _a.type, type = _b === void 0 ? 'static' : _b;
                _c = getAuthCtx(req), organizationId = _c.organizationId, isSuperAdmin = _c.isSuperAdmin;
                console.log("[NEW POST /tables] \uD83D\uDE80 D\u00E9but cr\u00E9ation table pour node ".concat(nodeId));
                console.log("[NEW POST /tables] \uD83D\uDCCA Donn\u00E9es re\u00E7ues: ".concat(Array.isArray(columns) ? columns.length : 0, " colonnes, ").concat(Array.isArray(rows) ? rows.length : 0, " lignes"));
                if (!name) {
                    return [2 /*return*/, res.status(400).json({ error: 'Le nom de la table est requis' })];
                }
                if (!Array.isArray(columns)) {
                    return [2 /*return*/, res.status(400).json({ error: 'La définition des colonnes est requise (array)' })];
                }
                if (!Array.isArray(rows)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Les données (rows) sont requises (array)' })];
                }
                _l.label = 1;
            case 1:
                _l.trys.push([1, 23, , 24]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        include: { TreeBranchLeafTree: true }
                    })];
            case 2:
                node = _l.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                if (!isSuperAdmin && organizationId && node.TreeBranchLeafTree.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé à ce nœud' })];
                }
                finalName = name;
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findFirst({
                        where: { nodeId: nodeId, name: finalName },
                    })];
            case 3:
                existingTable = _l.sent();
                if (!existingTable) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.count({
                        where: { nodeId: nodeId },
                    })];
            case 4:
                existingCount = _l.sent();
                finalName = "".concat(name, " (").concat(existingCount + 1, ")");
                console.log("[NEW POST /tables] \u26A0\uFE0F Nom d\u00E9j\u00E0 utilis\u00E9, nouveau nom: ".concat(finalName));
                _l.label = 5;
            case 5:
                tableId_1 = (0, crypto_1.randomUUID)();
                console.log("[NEW POST /tables] \uD83C\uDD94 Nouvel ID de table g\u00E9n\u00E9r\u00E9: ".concat(tableId_1));
                tableData_1 = {
                    id: tableId_1,
                    nodeId: nodeId,
                    organizationId: node.TreeBranchLeafTree.organizationId,
                    name: finalName,
                    description: description || null,
                    type: type,
                    rowCount: rows.length,
                    columnCount: columns.length,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                tableColumnsData_1 = columns.map(function (col, index) {
                    var colName = typeof col === 'string' ? col : (col.name || "Colonne ".concat(index + 1));
                    var colType = typeof col === 'object' && col.type ? col.type : 'text';
                    var colWidth = typeof col === 'object' && col.width ? col.width : null;
                    var colFormat = typeof col === 'object' && col.format ? col.format : null;
                    var colMetadata = typeof col === 'object' && col.metadata ? col.metadata : {};
                    return {
                        tableId: tableId_1,
                        columnIndex: index,
                        name: colName,
                        type: colType,
                        width: colWidth,
                        format: colFormat,
                        metadata: colMetadata,
                    };
                });
                tableRowsData_1 = rows.map(function (row, index) { return ({
                    tableId: tableId_1,
                    rowIndex: index,
                    cells: row,
                }); });
                console.log("[NEW POST /tables] \uD83D\uDCE6 Transaction pr\u00E9par\u00E9e: 1 table + ".concat(tableColumnsData_1.length, " colonnes + ").concat(tableRowsData_1.length, " lignes"));
                if (rows.length > 0) {
                    console.log("[NEW POST /tables] \uD83D\uDD0D ANALYSE D\u00C9TAILL\u00C9E DES ROWS:");
                    console.log("[NEW POST /tables]    - Type de rows re\u00E7u: ".concat(Array.isArray(rows) ? 'array' : typeof rows));
                    console.log("[NEW POST /tables]    - rows.length: ".concat(rows.length));
                    console.log("[NEW POST /tables]    - rows[0] (premi\u00E8re ligne):", rows[0]);
                    console.log("[NEW POST /tables]    - rows[0][0] (A1):", (_d = rows[0]) === null || _d === void 0 ? void 0 : _d[0]);
                    console.log("[NEW POST /tables]    - rows[0][1-3] (premi\u00E8res donn\u00E9es):", (_e = rows[0]) === null || _e === void 0 ? void 0 : _e.slice(1, 4));
                    if (rows.length > 1) {
                        console.log("[NEW POST /tables]    - rows[1] (deuxi\u00E8me ligne):", rows[1]);
                        console.log("[NEW POST /tables]    - rows[1][0] (label ligne 2):", (_f = rows[1]) === null || _f === void 0 ? void 0 : _f[0]);
                    }
                    console.log("[NEW POST /tables]    - rows[derni\u00E8re]:", rows[rows.length - 1]);
                    console.log("[NEW POST /tables] \uD83D\uDD0D ANALYSE TABLEROWSDATA (apr\u00E8s map):");
                    console.log("[NEW POST /tables]    - tableRowsData[0].cells:", (_g = tableRowsData_1[0]) === null || _g === void 0 ? void 0 : _g.cells);
                    if (tableRowsData_1.length > 1) {
                        console.log("[NEW POST /tables]    - tableRowsData[1].cells:", (_h = tableRowsData_1[1]) === null || _h === void 0 ? void 0 : _h.cells);
                    }
                    console.log("[NEW POST /tables]    - tableRowsData[derni\u00E8re].cells:", (_j = tableRowsData_1[tableRowsData_1.length - 1]) === null || _j === void 0 ? void 0 : _j.cells);
                }
                else {
                    console.log("[NEW POST /tables] \u2139\uFE0F Table vide cr\u00E9\u00E9e (aucune ligne)");
                }
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var newTable, _i, tableRowsData_2, rowData, verif;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log("[NEW POST /tables] \uD83D\uDD04 \u00C9tape 1/3: Cr\u00E9ation de la table principale...");
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTable.create({
                                            data: tableData_1,
                                        })];
                                case 1:
                                    newTable = _a.sent();
                                    if (!(tableColumnsData_1.length > 0)) return [3 /*break*/, 3];
                                    console.log("[NEW POST /tables] \uD83D\uDD04 \u00C9tape 2/3: Insertion de ".concat(tableColumnsData_1.length, " colonnes..."));
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTableColumn.createMany({
                                            data: tableColumnsData_1,
                                        })];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    if (!(tableRowsData_1.length > 0)) return [3 /*break*/, 9];
                                    console.log("[NEW POST /tables] \uD83D\uDD04 \u00C9tape 3/3: Insertion de ".concat(tableRowsData_1.length, " lignes..."));
                                    _i = 0, tableRowsData_2 = tableRowsData_1;
                                    _a.label = 4;
                                case 4:
                                    if (!(_i < tableRowsData_2.length)) return [3 /*break*/, 7];
                                    rowData = tableRowsData_2[_i];
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTableRow.create({
                                            data: rowData,
                                        })];
                                case 5:
                                    _a.sent();
                                    _a.label = 6;
                                case 6:
                                    _i++;
                                    return [3 /*break*/, 4];
                                case 7:
                                    console.log("[NEW POST /tables] \u2705 Lignes ins\u00E9r\u00E9es ! V\u00E9rification...");
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTableRow.findMany({
                                            where: { tableId: tableId_1 },
                                            orderBy: { rowIndex: 'asc' },
                                            take: 3
                                        })];
                                case 8:
                                    verif = _a.sent();
                                    console.log("[NEW POST /tables] \uD83D\uDD0D V\u00C9RIFICATION POST-INSERTION:");
                                    verif.forEach(function (row, idx) {
                                        console.log("[NEW POST /tables]    - Ligne ".concat(idx, " (rowIndex=").concat(row.rowIndex, "):"));
                                        console.log("[NEW POST /tables]      cells type:", typeof row.cells);
                                        console.log("[NEW POST /tables]      cells value:", row.cells);
                                        if (typeof row.cells === 'string') {
                                            try {
                                                var parsed = JSON.parse(row.cells);
                                                console.log("[NEW POST /tables]      cells[0] apr\u00E8s parse:", parsed[0]);
                                            }
                                            catch (e) {
                                                console.log("[NEW POST /tables]      \u274C Erreur parse:", e.message);
                                            }
                                        }
                                        else if (Array.isArray(row.cells)) {
                                            console.log("[NEW POST /tables]      cells[0]:", row.cells[0]);
                                            console.log("[NEW POST /tables]      cells.length:", row.cells.length);
                                        }
                                    });
                                    _a.label = 9;
                                case 9: return [2 /*return*/, newTable];
                            }
                        });
                    }); }, {
                        timeout: 60000, // 60 secondes pour les gros fichiers (43k+ lignes)
                    })];
            case 6:
                result = _l.sent();
                console.log("[NEW POST /tables] \u2705 Transaction termin\u00E9e avec succ\u00E8s ! Table ".concat(result.id, " cr\u00E9\u00E9e."));
                // 🎯 Mettre à jour hasTable du nœud
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: nodeId },
                        data: { hasTable: true }
                    })];
            case 7:
                // 🎯 Mettre à jour hasTable du nœud
                _l.sent();
                console.log("[NEW POST /tables] \u2705 hasTable mis \u00E0 jour pour node ".concat(nodeId));
                _l.label = 8;
            case 8:
                _l.trys.push([8, 11, , 12]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { linkedTableIds: true } })];
            case 9:
                node_1 = _l.sent();
                current = (_k = node_1 === null || node_1 === void 0 ? void 0 : node_1.linkedTableIds) !== null && _k !== void 0 ? _k : [];
                next = Array.from(new Set(__spreadArray(__spreadArray([], (current || []), true), [result.id], false)));
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({ where: { id: nodeId }, data: { linkedTableIds: { set: next } } })];
            case 10:
                _l.sent();
                return [3 /*break*/, 12];
            case 11:
                e_1 = _l.sent();
                console.warn('[NEW POST /tables] Warning updating linkedTableIds:', e_1.message);
                return [3 /*break*/, 12];
            case 12:
                _l.trys.push([12, 20, , 21]);
                console.log("[NEW POST /tables] \uD83D\uDD0D Recherche des SelectConfigs \u00E0 mettre \u00E0 jour pour nodeId: ".concat(nodeId));
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findFirst({
                        where: { nodeId: nodeId },
                    })];
            case 13:
                selectConfig = _l.sent();
                if (!selectConfig) return [3 /*break*/, 18];
                oldTableRef = selectConfig.tableReference;
                // Mettre à jour vers la nouvelle table
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.update({
                        where: { id: selectConfig.id },
                        data: { tableReference: result.id },
                    })];
            case 14:
                // Mettre à jour vers la nouvelle table
                _l.sent();
                console.log("[NEW POST /tables] \u2705 SelectConfig mis \u00E0 jour: ".concat(selectConfig.id));
                console.log("[NEW POST /tables]    - Ancien tableau: ".concat(oldTableRef));
                console.log("[NEW POST /tables]    - Nouveau tableau: ".concat(result.id));
                if (!oldTableRef) return [3 /*break*/, 17];
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findMany({
                        where: {
                            tableReference: oldTableRef,
                            nodeId: { not: nodeId } // Exclure celui qu'on vient de mettre à jour
                        },
                    })];
            case 15:
                otherConfigs = _l.sent();
                if (!(otherConfigs.length > 0)) return [3 /*break*/, 17];
                console.log("[NEW POST /tables] \uD83D\uDD0D ".concat(otherConfigs.length, " autres SelectConfigs r\u00E9f\u00E9rencent l'ancien tableau"));
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.updateMany({
                        where: {
                            tableReference: oldTableRef,
                            nodeId: { not: nodeId }
                        },
                        data: { tableReference: result.id }
                    })];
            case 16:
                updateResult = _l.sent();
                console.log("[NEW POST /tables] \u2705 ".concat(updateResult.count, " SelectConfigs suppl\u00E9mentaires mis \u00E0 jour"));
                otherConfigs.forEach(function (cfg) {
                    console.log("[NEW POST /tables]    - NodeId: ".concat(cfg.nodeId, " (keyColumn: ").concat(cfg.keyColumn, ", keyRow: ").concat(cfg.keyRow, ")"));
                });
                _l.label = 17;
            case 17: return [3 /*break*/, 19];
            case 18:
                console.log("[NEW POST /tables] \u2139\uFE0F Pas de SelectConfig trouv\u00E9e pour ce n\u0153ud");
                _l.label = 19;
            case 19: return [3 /*break*/, 21];
            case 20:
                updateError_1 = _l.sent();
                console.error("[NEW POST /tables] \u26A0\uFE0F Erreur lors de la mise \u00E0 jour des SelectConfigs:", updateError_1);
                return [3 /*break*/, 21];
            case 21: return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                    where: { id: result.id },
                    include: {
                        tableColumns: {
                            orderBy: { columnIndex: 'asc' },
                        },
                        tableRows: {
                            orderBy: { rowIndex: 'asc' },
                        },
                    },
                })];
            case 22:
                createdTable = _l.sent();
                if (!createdTable) {
                    throw new Error('Table créée mais introuvable lors de la relecture');
                }
                // Formater la réponse avec colonnes et lignes
                res.status(201).json({
                    id: createdTable.id,
                    nodeId: createdTable.nodeId,
                    name: createdTable.name,
                    description: createdTable.description,
                    type: createdTable.type,
                    columns: createdTable.tableColumns.map(function (c) { return c.name; }),
                    rows: createdTable.tableRows.map(function (r) {
                        // Convertir JSONB Prisma → Array JavaScript natif
                        var cells = r.cells;
                        if (Array.isArray(cells)) {
                            return cells;
                        }
                        if (typeof cells === 'string') {
                            try {
                                var parsed = JSON.parse(cells);
                                return Array.isArray(parsed) ? parsed : [String(parsed)];
                            }
                            catch (_a) {
                                return [String(cells)];
                            }
                        }
                        if (cells && typeof cells === 'object') {
                            return Object.values(cells);
                        }
                        return [String(cells || '')];
                    }),
                    meta: createdTable.meta || {},
                    rowCount: createdTable.rowCount,
                    columnCount: createdTable.columnCount,
                    createdAt: createdTable.createdAt,
                    updatedAt: createdTable.updatedAt,
                });
                return [3 /*break*/, 24];
            case 23:
                error_1 = _l.sent();
                console.error("\u274C [NEW POST /tables] Erreur lors de la cr\u00E9ation de la table:", error_1);
                if (error_1 instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    // P2002 = Violation de contrainte unique
                    if (error_1.code === 'P2002') {
                        return [2 /*return*/, res.status(409).json({
                                error: 'Une table avec ce nom existe déjà pour ce champ. Veuillez choisir un autre nom.',
                                code: error_1.code,
                            })];
                    }
                    return [2 /*return*/, res.status(500).json({
                            error: 'Erreur de base de données lors de la création de la table.',
                            code: error_1.code,
                            meta: error_1.meta,
                        })];
                }
                res.status(500).json({ error: 'Impossible de créer la table' });
                return [3 /*break*/, 24];
            case 24: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// GET /api/treebranchleaf/tables/:id - Récupérer une table avec pagination
// =============================================================================
router.get('/tables/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, page, limit, offset, table, tableOrgId, columns, rows, error_2;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 100;
                offset = (page - 1) * limit;
                console.log("[NEW GET /tables/:id] \uD83D\uDCD6 R\u00E9cup\u00E9ration table ".concat(id, " (page ").concat(page, ", limit ").concat(limit, ")"));
                _d.label = 1;
            case 1:
                _d.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    treeId: true,
                                    TreeBranchLeafTree: {
                                        select: { organizationId: true }
                                    }
                                }
                            }
                        }
                    })];
            case 2:
                table = _d.sent();
                if (!table) {
                    return [2 /*return*/, res.status(404).json({ error: 'Table non trouvée' })];
                }
                tableOrgId = (_c = (_b = table.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé à cette table' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeTableColumn.findMany({
                        where: { tableId: id },
                        orderBy: { columnIndex: 'asc' },
                    })];
            case 3:
                columns = _d.sent();
                return [4 /*yield*/, prisma.treeBranchLeafNodeTableRow.findMany({
                        where: { tableId: id },
                        orderBy: { rowIndex: 'asc' },
                        take: limit,
                        skip: offset,
                    })];
            case 4:
                rows = _d.sent();
                console.log("[NEW GET /tables/:id] \u2705 R\u00E9cup\u00E9r\u00E9: ".concat(columns.length, " colonnes et ").concat(rows.length, " lignes (sur ").concat(table.rowCount, " total)"));
                // Renvoyer la réponse complète
                res.json({
                    id: table.id,
                    nodeId: table.nodeId,
                    name: table.name,
                    description: table.description,
                    type: table.type,
                    columns: columns.map(function (c) { return ({
                        name: c.name,
                        type: c.type,
                        width: c.width,
                        format: c.format,
                        metadata: c.metadata,
                    }); }),
                    rows: rows.map(function (r) { return r.cells; }),
                    page: page,
                    limit: limit,
                    totalRows: table.rowCount,
                    totalPages: Math.ceil(table.rowCount / limit),
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _d.sent();
                console.error("\u274C [NEW GET /tables/:id] Erreur lors de la r\u00E9cup\u00E9ration de la table:", error_2);
                res.status(500).json({ error: 'Impossible de récupérer la table' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// PUT /api/treebranchleaf/tables/:id - Mettre à jour une table
// =============================================================================
router.put('/tables/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, name, description, columns, rows, type, lookupSelectColumn, lookupDisplayColumns, _b, organizationId, isSuperAdmin, updatedTable, finalTableData, error_3, status_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = req.params.id;
                _a = req.body, name = _a.name, description = _a.description, columns = _a.columns, rows = _a.rows, type = _a.type, lookupSelectColumn = _a.lookupSelectColumn, lookupDisplayColumns = _a.lookupDisplayColumns;
                _b = getAuthCtx(req), organizationId = _b.organizationId, isSuperAdmin = _b.isSuperAdmin;
                console.log("[NEW PUT /tables/:id] \uD83D\uDD04 Mise \u00E0 jour table ".concat(id));
                console.log("[NEW PUT /tables/:id] Nouvelles donn\u00E9es: ".concat(Array.isArray(columns) ? columns.length : 'N/A', " colonnes, ").concat(Array.isArray(rows) ? rows.length : 'N/A', " lignes"));
                console.log("[NEW PUT /tables/:id] Lookup config: selectColumn=".concat(lookupSelectColumn, ", displayColumns=").concat(JSON.stringify(lookupDisplayColumns)));
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var table, tableOrgId, updateData, tableUpdated, newColumnsData, index, row;
                        var _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({
                                        where: { id: id },
                                        include: {
                                            TreeBranchLeafNode: {
                                                include: { TreeBranchLeafTree: true }
                                            }
                                        }
                                    })];
                                case 1:
                                    table = _c.sent();
                                    if (!table) {
                                        throw new Error('Table non trouvée');
                                    }
                                    tableOrgId = (_b = (_a = table.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                                    if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
                                        throw new Error('Accès non autorisé');
                                    }
                                    updateData = {
                                        updatedAt: new Date(),
                                    };
                                    if (name)
                                        updateData.name = name;
                                    if (description !== undefined)
                                        updateData.description = description;
                                    if (type)
                                        updateData.type = type;
                                    if (Array.isArray(columns))
                                        updateData.columnCount = columns.length;
                                    if (Array.isArray(rows))
                                        updateData.rowCount = rows.length;
                                    // 🔥 AJOUT: Sauvegarder la configuration du lookup
                                    if (lookupSelectColumn !== undefined)
                                        updateData.lookupSelectColumn = lookupSelectColumn;
                                    if (Array.isArray(lookupDisplayColumns))
                                        updateData.lookupDisplayColumns = lookupDisplayColumns;
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTable.update({
                                            where: { id: id },
                                            data: updateData,
                                        })];
                                case 2:
                                    tableUpdated = _c.sent();
                                    console.log("[NEW PUT /tables/:id] \u2705 \u00C9tape 1: Table principale mise \u00E0 jour");
                                    if (!Array.isArray(columns)) return [3 /*break*/, 6];
                                    console.log("[NEW PUT /tables/:id] \uD83D\uDD04 Remplacement des colonnes...");
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTableColumn.deleteMany({ where: { tableId: id } })];
                                case 3:
                                    _c.sent();
                                    if (!(columns.length > 0)) return [3 /*break*/, 5];
                                    newColumnsData = columns.map(function (col, index) { return ({
                                        tableId: id,
                                        columnIndex: index,
                                        name: typeof col === 'string' ? col : (col.name || "Colonne ".concat(index + 1)),
                                        type: typeof col === 'object' ? col.type : 'text',
                                        width: typeof col === 'object' ? col.width : null,
                                        format: typeof col === 'object' ? col.format : null,
                                        metadata: typeof col === 'object' && col.metadata ? col.metadata : {},
                                    }); });
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTableColumn.createMany({ data: newColumnsData })];
                                case 4:
                                    _c.sent();
                                    _c.label = 5;
                                case 5:
                                    console.log("[NEW PUT /tables/:id] \u2705 \u00C9tape 2: ".concat(columns.length, " colonnes remplac\u00E9es"));
                                    _c.label = 6;
                                case 6:
                                    if (!Array.isArray(rows)) return [3 /*break*/, 12];
                                    console.log("[NEW PUT /tables/:id] \uD83D\uDD04 Remplacement des lignes...");
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTableRow.deleteMany({ where: { tableId: id } })];
                                case 7:
                                    _c.sent();
                                    if (!(rows.length > 0)) return [3 /*break*/, 11];
                                    // ⚠️ CRITIQUE: Utiliser create() en boucle au lieu de createMany()
                                    // Prisma createMany() NE SUPPORTE PAS les champs JSONB correctement !
                                    console.log("[NEW PUT /tables/:id] \uD83D\uDD04 Cr\u00E9ation de ".concat(rows.length, " lignes (boucle create)..."));
                                    index = 0;
                                    _c.label = 8;
                                case 8:
                                    if (!(index < rows.length)) return [3 /*break*/, 11];
                                    row = rows[index];
                                    return [4 /*yield*/, tx.treeBranchLeafNodeTableRow.create({
                                            data: {
                                                tableId: id,
                                                rowIndex: index,
                                                cells: row,
                                            }
                                        })];
                                case 9:
                                    _c.sent();
                                    console.log("[PUT /tables/:id] Row ".concat(index, " created, cells.length:"), Array.isArray(row) ? row.length : 'N/A');
                                    _c.label = 10;
                                case 10:
                                    index++;
                                    return [3 /*break*/, 8];
                                case 11:
                                    console.log("[NEW PUT /tables/:id] \u2705 \u00C9tape 3: ".concat(rows.length, " lignes remplac\u00E9es"));
                                    _c.label = 12;
                                case 12: return [2 /*return*/, tableUpdated];
                            }
                        });
                    }); })];
            case 2:
                updatedTable = _c.sent();
                console.log("[NEW PUT /tables/:id] \uD83C\uDF89 Transaction de mise \u00E0 jour termin\u00E9e avec succ\u00E8s");
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({ where: { id: id } })];
            case 3:
                finalTableData = _c.sent();
                res.json(finalTableData);
                return [3 /*break*/, 5];
            case 4:
                error_3 = _c.sent();
                console.error("\u274C [NEW PUT /tables/:id] Erreur lors de la mise \u00E0 jour:", error_3);
                if (error_3 instanceof Error && (error_3.message === 'Table non trouvée' || error_3.message === 'Accès non autorisé')) {
                    status_1 = error_3.message === 'Table non trouvée' ? 404 : 403;
                    return [2 /*return*/, res.status(status_1).json({ error: error_3.message })];
                }
                res.status(500).json({ error: 'Impossible de mettre à jour la table' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// DELETE /api/treebranchleaf/tables/:id - Supprimer une table
// =============================================================================
router.delete('/tables/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, organizationId, isSuperAdmin, table, tableOrgId, selectConfigsUsingTable, _i, selectConfigsUsingTable_1, config, selectNode, oldMetadata, oldCapabilities, newCapabilities, newMetadata, selectConfigError_1, node, currentLinkedIds, nextLinkedIds, wasActiveTable, cleanedInstances, instances, remainingTables, error_4;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                id = req.params.id;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[NEW DELETE /tables/:id] \uD83D\uDDD1\uFE0F Suppression table ".concat(id));
                _f.label = 1;
            case 1:
                _f.trys.push([1, 19, , 20]);
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafNode: {
                                include: { TreeBranchLeafTree: true }
                            }
                        }
                    })];
            case 2:
                table = _f.sent();
                if (!table) {
                    return [2 /*return*/, res.status(404).json({ error: 'Table non trouvée' })];
                }
                tableOrgId = (_c = (_b = table.TreeBranchLeafNode) === null || _b === void 0 ? void 0 : _b.TreeBranchLeafTree) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé' })];
                }
                // 1️⃣ Supprimer la table (les colonnes et lignes seront supprimées en cascade via Prisma)
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.delete({ where: { id: id } })];
            case 3:
                // 1️⃣ Supprimer la table (les colonnes et lignes seront supprimées en cascade via Prisma)
                _f.sent();
                console.log("[NEW DELETE /tables/:id] \u2705 Table ".concat(id, " supprim\u00E9e (+ colonnes/lignes en cascade)"));
                _f.label = 4;
            case 4:
                _f.trys.push([4, 13, , 14]);
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.findMany({
                        where: { tableReference: id },
                        select: { nodeId: true }
                    })];
            case 5:
                selectConfigsUsingTable = _f.sent();
                if (!(selectConfigsUsingTable.length > 0)) return [3 /*break*/, 12];
                console.log("[NEW DELETE /tables/:id] \uD83E\uDDF9 ".concat(selectConfigsUsingTable.length, " champ(s) Select/Cascader r\u00E9f\u00E9rencent cette table - D\u00C9SACTIVATION LOOKUP"));
                _i = 0, selectConfigsUsingTable_1 = selectConfigsUsingTable;
                _f.label = 6;
            case 6:
                if (!(_i < selectConfigsUsingTable_1.length)) return [3 /*break*/, 11];
                config = selectConfigsUsingTable_1[_i];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: config.nodeId },
                        select: {
                            label: true,
                            metadata: true
                        }
                    })];
            case 7:
                selectNode = _f.sent();
                if (!selectNode) return [3 /*break*/, 10];
                console.log("[NEW DELETE /tables/:id] \uD83D\uDD27 D\u00E9sactivation lookup pour \"".concat(selectNode.label, "\" (").concat(config.nodeId, ")"));
                oldMetadata = (selectNode.metadata || {});
                oldCapabilities = (oldMetadata.capabilities || {});
                newCapabilities = __assign(__assign({}, oldCapabilities), { table: {
                        enabled: false,
                        activeId: null,
                        instances: null,
                        currentTable: null,
                    } });
                newMetadata = __assign(__assign({}, oldMetadata), { capabilities: newCapabilities });
                // 2️⃣ Mettre à jour le nœud (même logique que PUT /capabilities/table avec enabled: false)
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: config.nodeId },
                        data: {
                            hasTable: false,
                            table_activeId: null,
                            table_instances: null,
                            table_name: null,
                            table_type: null,
                            table_meta: null,
                            table_columns: null,
                            table_rows: null,
                            table_data: null,
                            metadata: JSON.parse(JSON.stringify(newMetadata)),
                            select_options: [],
                            updatedAt: new Date()
                        }
                    })];
            case 8:
                // 2️⃣ Mettre à jour le nœud (même logique que PUT /capabilities/table avec enabled: false)
                _f.sent();
                // 3️⃣ Supprimer la configuration SELECT (comme le fait le bouton Désactiver)
                return [4 /*yield*/, prisma.treeBranchLeafSelectConfig.deleteMany({
                        where: { nodeId: config.nodeId }
                    })];
            case 9:
                // 3️⃣ Supprimer la configuration SELECT (comme le fait le bouton Désactiver)
                _f.sent();
                console.log("[NEW DELETE /tables/:id] \u2705 Lookup d\u00E9sactiv\u00E9 pour \"".concat(selectNode.label, "\" - champ d\u00E9bloqu\u00E9"));
                _f.label = 10;
            case 10:
                _i++;
                return [3 /*break*/, 6];
            case 11:
                console.log("[NEW DELETE /tables/:id] \u2705 ".concat(selectConfigsUsingTable.length, " champ(s) Select D\u00C9BLOQU\u00C9S (lookup d\u00E9sactiv\u00E9)"));
                _f.label = 12;
            case 12: return [3 /*break*/, 14];
            case 13:
                selectConfigError_1 = _f.sent();
                console.error("[NEW DELETE /tables/:id] \u26A0\uFE0F Erreur d\u00E9sactivation lookups:", selectConfigError_1);
                return [3 /*break*/, 14];
            case 14:
                if (!table.nodeId) return [3 /*break*/, 18];
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: table.nodeId },
                        select: {
                            linkedTableIds: true,
                            table_activeId: true,
                            table_instances: true
                        }
                    })];
            case 15:
                node = _f.sent();
                currentLinkedIds = (_d = node === null || node === void 0 ? void 0 : node.linkedTableIds) !== null && _d !== void 0 ? _d : [];
                nextLinkedIds = currentLinkedIds.filter(function (x) { return x !== id; });
                wasActiveTable = (node === null || node === void 0 ? void 0 : node.table_activeId) === id;
                cleanedInstances = (_e = node === null || node === void 0 ? void 0 : node.table_instances) !== null && _e !== void 0 ? _e : {};
                if (typeof cleanedInstances === 'object' && cleanedInstances !== null) {
                    instances = cleanedInstances;
                    if (instances[id]) {
                        delete instances[id];
                        cleanedInstances = instances;
                    }
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.count({
                        where: { nodeId: table.nodeId }
                    })];
            case 16:
                remainingTables = _f.sent();
                // 📝 Mise à jour du nœud avec TOUS les nettoyages
                return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                        where: { id: table.nodeId },
                        data: __assign({ hasTable: remainingTables > 0, linkedTableIds: { set: nextLinkedIds }, table_activeId: wasActiveTable ? null : undefined, table_instances: cleanedInstances }, (remainingTables === 0 && {
                            table_name: null,
                            table_type: null,
                            table_meta: null,
                            table_columns: null,
                            table_rows: null,
                            table_data: null,
                            table_importSource: null,
                            table_isImported: false
                        }))
                    })];
            case 17:
                // 📝 Mise à jour du nœud avec TOUS les nettoyages
                _f.sent();
                console.log("[NEW DELETE /tables/:id] \u2705 N\u0153ud ".concat(table.nodeId, " nettoy\u00E9:"), {
                    hasTable: remainingTables > 0,
                    linkedTableIds: nextLinkedIds.length,
                    table_activeId_reset: wasActiveTable,
                    table_instances_cleaned: true,
                    all_fields_reset: remainingTables === 0
                });
                _f.label = 18;
            case 18:
                console.log("[NEW DELETE /tables/:id] \u2705 Table ".concat(id, " supprim\u00E9e avec succ\u00E8s (+ colonnes et lignes en cascade)"));
                res.json({ success: true, message: 'Table supprimée avec succès' });
                return [3 /*break*/, 20];
            case 19:
                error_4 = _f.sent();
                console.error("\u274C [NEW DELETE /tables/:id] Erreur lors de la suppression:", error_4);
                res.status(500).json({ error: 'Impossible de supprimer la table' });
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// ALIASES POUR COMPATIBILITÉ AVEC L'ANCIEN FORMAT D'URL
// =============================================================================
// Alias PUT: /nodes/:nodeId/tables/:tableId → /tables/:id
router.put('/nodes/:nodeId/tables/:tableId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tableId, _a, name, description, columns, rows, type, meta, _b, organizationId, isSuperAdmin, table, tableOrgId, updatedTable_1, updatedTable, error_5, status_2;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                tableId = req.params.tableId;
                _a = req.body, name = _a.name, description = _a.description, columns = _a.columns, rows = _a.rows, type = _a.type, meta = _a.meta;
                _b = getAuthCtx(req), organizationId = _b.organizationId, isSuperAdmin = _b.isSuperAdmin;
                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \uD83D\uDD04 Alias route - redirection vers PUT /tables/".concat(tableId));
                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \uD83D\uDCCA Donn\u00E9es re\u00E7ues:", {
                    hasColumns: !!columns,
                    hasRows: !!rows,
                    hasMeta: !!meta,
                    type: type
                });
                _e.label = 1;
            case 1:
                _e.trys.push([1, 6, , 7]);
                if (!(meta && !columns && !rows)) return [3 /*break*/, 4];
                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \u2699\uFE0F Mise \u00E0 jour m\u00E9tadonn\u00E9es uniquement (lookup config)");
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findUnique({
                        where: { id: tableId },
                        include: {
                            TreeBranchLeafNode: {
                                include: { TreeBranchLeafTree: true }
                            }
                        }
                    })];
            case 2:
                table = _e.sent();
                if (!table) {
                    return [2 /*return*/, res.status(404).json({ error: 'Table non trouvée' })];
                }
                tableOrgId = (_d = (_c = table.TreeBranchLeafNode) === null || _c === void 0 ? void 0 : _c.TreeBranchLeafTree) === null || _d === void 0 ? void 0 : _d.organizationId;
                if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.update({
                        where: { id: tableId },
                        data: {
                            meta: meta,
                            updatedAt: new Date(),
                        },
                    })];
            case 3:
                updatedTable_1 = _e.sent();
                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \u2705 M\u00E9tadonn\u00E9es mises \u00E0 jour - repeater cr\u00E9era les champs d'affichage");
                return [2 /*return*/, res.json(updatedTable_1)];
            case 4: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var table, tableOrgId, updateData, tableUpdated, newColumnsData, index, row;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, tx.treeBranchLeafNodeTable.findUnique({
                                    where: { id: tableId },
                                    include: {
                                        TreeBranchLeafNode: {
                                            include: { TreeBranchLeafTree: true }
                                        }
                                    }
                                })];
                            case 1:
                                table = _c.sent();
                                if (!table) {
                                    throw new Error('Table non trouvée');
                                }
                                tableOrgId = (_b = (_a = table.TreeBranchLeafNode) === null || _a === void 0 ? void 0 : _a.TreeBranchLeafTree) === null || _b === void 0 ? void 0 : _b.organizationId;
                                if (!isSuperAdmin && organizationId && tableOrgId !== organizationId) {
                                    throw new Error('Accès non autorisé');
                                }
                                updateData = {
                                    updatedAt: new Date(),
                                };
                                if (name)
                                    updateData.name = name;
                                if (description !== undefined)
                                    updateData.description = description;
                                if (type)
                                    updateData.type = type;
                                if (meta)
                                    updateData.meta = meta;
                                // NE mettre à jour columnCount/rowCount QUE si les arrays contiennent réellement des données
                                if (Array.isArray(columns) && columns.length > 0)
                                    updateData.columnCount = columns.length;
                                if (Array.isArray(rows) && rows.length > 0)
                                    updateData.rowCount = rows.length;
                                return [4 /*yield*/, tx.treeBranchLeafNodeTable.update({
                                        where: { id: tableId },
                                        data: updateData,
                                    })];
                            case 2:
                                tableUpdated = _c.sent();
                                if (!(Array.isArray(columns) && columns.length > 0)) return [3 /*break*/, 5];
                                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \uD83D\uDD04 Remplacement des colonnes...");
                                return [4 /*yield*/, tx.treeBranchLeafNodeTableColumn.deleteMany({ where: { tableId: tableId } })];
                            case 3:
                                _c.sent();
                                newColumnsData = columns.map(function (col, index) { return ({
                                    tableId: tableId,
                                    columnIndex: index,
                                    name: typeof col === 'string' ? col : (col.name || "Colonne ".concat(index + 1)),
                                    type: typeof col === 'object' ? col.type : 'text',
                                    width: typeof col === 'object' ? col.width : null,
                                    format: typeof col === 'object' ? col.format : null,
                                    metadata: typeof col === 'object' && col.metadata ? col.metadata : {},
                                }); });
                                return [4 /*yield*/, tx.treeBranchLeafNodeTableColumn.createMany({ data: newColumnsData })];
                            case 4:
                                _c.sent();
                                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \u2705 ".concat(columns.length, " colonnes remplac\u00E9es"));
                                _c.label = 5;
                            case 5:
                                if (!(Array.isArray(rows) && rows.length > 0)) return [3 /*break*/, 11];
                                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \uD83D\uDD04 Remplacement des lignes...");
                                console.log("[PUT ALIAS] \uD83D\uDD0D ANALYSE ROWS RE\u00C7UES DU FRONTEND:");
                                console.log("[PUT ALIAS]    - rows.length:", rows.length);
                                console.log("[PUT ALIAS]    - rows[0] type:", typeof rows[0]);
                                console.log("[PUT ALIAS]    - rows[0] isArray:", Array.isArray(rows[0]));
                                console.log("[PUT ALIAS]    - rows[0] value:", rows[0]);
                                if (rows.length > 1) {
                                    console.log("[PUT ALIAS]    - rows[1] type:", typeof rows[1]);
                                    console.log("[PUT ALIAS]    - rows[1] isArray:", Array.isArray(rows[1]));
                                    console.log("[PUT ALIAS]    - rows[1] value:", rows[1]);
                                }
                                return [4 /*yield*/, tx.treeBranchLeafNodeTableRow.deleteMany({ where: { tableId: tableId } })];
                            case 6:
                                _c.sent();
                                // ⚠️ CRITIQUE: Utiliser create() en boucle au lieu de createMany()
                                // Prisma createMany() NE SUPPORTE PAS les champs JSONB correctement !
                                // Il convertit les arrays JSON en simple strings, perdant les données
                                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \uD83D\uDD04 Cr\u00E9ation de ".concat(rows.length, " lignes (boucle create)..."));
                                index = 0;
                                _c.label = 7;
                            case 7:
                                if (!(index < rows.length)) return [3 /*break*/, 10];
                                row = rows[index];
                                console.log("[PUT ALIAS] Row ".concat(index, " AVANT create - type:"), typeof row, 'isArray:', Array.isArray(row), 'value:', row);
                                return [4 /*yield*/, tx.treeBranchLeafNodeTableRow.create({
                                        data: {
                                            tableId: tableId,
                                            rowIndex: index,
                                            cells: row,
                                        }
                                    })];
                            case 8:
                                _c.sent();
                                console.log("[PUT ALIAS] Row ".concat(index, " created, cells.length:"), Array.isArray(row) ? row.length : 'N/A');
                                _c.label = 9;
                            case 9:
                                index++;
                                return [3 /*break*/, 7];
                            case 10:
                                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \u2705 ".concat(rows.length, " lignes remplac\u00E9es"));
                                _c.label = 11;
                            case 11: return [2 /*return*/, tableUpdated];
                        }
                    });
                }); })];
            case 5:
                updatedTable = _e.sent();
                console.log("[NEW PUT /nodes/:nodeId/tables/:tableId] \uD83C\uDF89 Mise \u00E0 jour termin\u00E9e avec succ\u00E8s");
                res.json(updatedTable);
                return [3 /*break*/, 7];
            case 6:
                error_5 = _e.sent();
                console.error("\u274C [NEW PUT /nodes/:nodeId/tables/:tableId] Erreur:", error_5);
                if (error_5 instanceof Error && (error_5.message === 'Table non trouvée' || error_5.message === 'Accès non autorisé')) {
                    status_2 = error_5.message === 'Table non trouvée' ? 404 : 403;
                    return [2 /*return*/, res.status(status_2).json({ error: error_5.message })];
                }
                res.status(500).json({ error: 'Impossible de mettre à jour la table' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// GET /api/treebranchleaf/nodes/:nodeId/tables - Liste des tables d'un nœud
// =============================================================================
router.get('/nodes/:nodeId/tables', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var nodeId, _a, organizationId, isSuperAdmin, node, tables, formattedTables, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                nodeId = req.params.nodeId;
                _a = getAuthCtx(req), organizationId = _a.organizationId, isSuperAdmin = _a.isSuperAdmin;
                console.log("[NEW GET /nodes/:nodeId/tables] \uD83D\uDCCB R\u00E9cup\u00E9ration des tables pour node ".concat(nodeId));
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                        where: { id: nodeId },
                        include: { TreeBranchLeafTree: true }
                    })];
            case 2:
                node = _b.sent();
                if (!node) {
                    return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                }
                if (!isSuperAdmin && organizationId && node.TreeBranchLeafTree.organizationId !== organizationId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Accès non autorisé à ce nœud' })];
                }
                return [4 /*yield*/, prisma.treeBranchLeafNodeTable.findMany({
                        where: { nodeId: nodeId },
                        include: {
                            tableColumns: {
                                orderBy: { columnIndex: 'asc' },
                            },
                            tableRows: {
                                orderBy: { rowIndex: 'asc' },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    })];
            case 3:
                tables = _b.sent();
                console.log("[NEW GET /nodes/:nodeId/tables] \u2705 ".concat(tables.length, " table(s) trouv\u00E9e(s)"));
                formattedTables = tables.map(function (table) { return ({
                    id: table.id,
                    name: table.name,
                    description: table.description,
                    type: table.type,
                    columns: table.tableColumns.map(function (c) { return c.name; }),
                    rows: table.tableRows.map(function (r) {
                        // ✅ Convertir JSONB Prisma → Array JavaScript natif
                        var cells = r.cells;
                        if (Array.isArray(cells)) {
                            return cells;
                        }
                        // Si cells n'est pas déjà un array, essayer de le parser
                        if (typeof cells === 'string') {
                            try {
                                var parsed = JSON.parse(cells);
                                return Array.isArray(parsed) ? parsed : [String(parsed)];
                            }
                            catch (_a) {
                                return [String(cells)];
                            }
                        }
                        // Si cells est un objet (JSONB), vérifier s'il a une structure d'array
                        if (cells && typeof cells === 'object') {
                            return Object.values(cells);
                        }
                        return [String(cells || '')];
                    }),
                    meta: table.meta || {},
                    order: table.createdAt ? new Date(table.createdAt).getTime() : 0,
                    createdAt: table.createdAt,
                    updatedAt: table.updatedAt,
                }); });
                res.json(formattedTables);
                return [3 /*break*/, 5];
            case 4:
                error_6 = _b.sent();
                console.error("\u274C [NEW GET /nodes/:nodeId/tables] Erreur:", error_6);
                res.status(500).json({ error: 'Impossible de récupérer les tables' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

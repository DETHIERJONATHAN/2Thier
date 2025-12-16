"use strict";
/**
 * 📊 SUM DISPLAY FIELD ROUTES
 *
 * Routes pour gérer les champs Total (somme des copies de variables)
 *
 * Fonctionnalités:
 * - Créer un champ d'affichage qui affiche la somme de toutes les copies d'une variable
 * - Mettre à jour automatiquement quand les copies changent
 * - Supprimer le champ Total quand désactivé
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSumDisplayFieldRoutes = registerSumDisplayFieldRoutes;
exports.updateSumDisplayFieldAfterCopyChange = updateSumDisplayFieldAfterCopyChange;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function getOrgId(req) {
    var _a, _b, _c;
    var user = req.user || {};
    var headerOrg = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a['x-organization-id'])
        || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b['x-organization'])
        || ((_c = req.headers) === null || _c === void 0 ? void 0 : _c['organization-id']);
    return user.organizationId || headerOrg || null;
}
function registerSumDisplayFieldRoutes(router) {
    var _this = this;
    // POST /api/treebranchleaf/trees/:treeId/nodes/:nodeId/sum-display-field
    // Crée ou met à jour le champ Total qui somme toutes les copies d'une variable
    router.post('/trees/:treeId/nodes/:nodeId/sum-display-field', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var _a, treeId, nodeId, organizationId, tree, node, mainVariable, baseExposedKey, allCopies, copyNodeIds, copyNodes, maxCopyOrder, sumFieldNodeId, sumFieldVariableId, sumDisplayName, sumExposedKey, existingSumNode, sumTokens_1, now, sumFormulaId, formulaInstance, sumNodeData, err_1, existingSumVariable, sumVariableData, existingKey, finalExposedKey, err_2, existingSumFormula, formulaOrgId, sumFormulaData, err_3, existingMeta, error_1, errMsg, errStack;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 36, , 37]);
                    _a = req.params, treeId = _a.treeId, nodeId = _a.nodeId;
                    organizationId = getOrgId(req);
                    console.log("\uD83D\uDCCA [SUM DISPLAY] Cr\u00E9ation champ Total pour nodeId=".concat(nodeId, ", treeId=").concat(treeId, ", orgId=").concat(organizationId));
                    return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                            where: organizationId ? { id: treeId, organizationId: organizationId } : { id: treeId }
                        })];
                case 1:
                    tree = _c.sent();
                    if (!tree) {
                        return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                            where: { id: nodeId, treeId: treeId },
                            select: {
                                id: true,
                                parentId: true,
                                label: true,
                                order: true,
                                subtab: true,
                                linkedVariableIds: true,
                                metadata: true
                            }
                        })];
                case 2:
                    node = _c.sent();
                    if (!node) {
                        return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                            where: { nodeId: nodeId },
                            select: {
                                id: true,
                                displayName: true,
                                exposedKey: true,
                                displayFormat: true,
                                unit: true,
                                precision: true
                            }
                        })];
                case 3:
                    mainVariable = _c.sent();
                    if (!mainVariable) {
                        return [2 /*return*/, res.status(404).json({ error: 'Variable non trouvée pour ce nœud' })];
                    }
                    baseExposedKey = mainVariable.exposedKey.replace(/-\d+$/, '');
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findMany({
                            where: {
                                OR: [
                                    { exposedKey: baseExposedKey },
                                    { exposedKey: { startsWith: "".concat(baseExposedKey, "-") } }
                                ]
                            },
                            select: { id: true, exposedKey: true, nodeId: true }
                        })];
                case 4:
                    allCopies = _c.sent();
                    console.log("\uD83D\uDCCA [SUM DISPLAY] ".concat(allCopies.length, " copie(s) trouv\u00E9e(s) pour ").concat(baseExposedKey));
                    copyNodeIds = allCopies.map(function (c) { return c.nodeId; });
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findMany({
                            where: { id: { in: copyNodeIds } },
                            select: { id: true, order: true }
                        })];
                case 5:
                    copyNodes = _c.sent();
                    maxCopyOrder = copyNodes.reduce(function (max, n) { var _a; return Math.max(max, (_a = n.order) !== null && _a !== void 0 ? _a : 0); }, 0);
                    console.log("\uD83D\uDCCA [SUM DISPLAY] Max order des copies: ".concat(maxCopyOrder, ", Total sera \u00E0 order: ").concat(maxCopyOrder + 1));
                    sumFieldNodeId = "".concat(nodeId, "-sum-total");
                    sumFieldVariableId = "".concat(mainVariable.id, "-sum-total");
                    sumDisplayName = "".concat(mainVariable.displayName, " - Total");
                    sumExposedKey = "".concat(baseExposedKey, "_TOTAL");
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findUnique({
                            where: { id: sumFieldNodeId },
                            select: { id: true, metadata: true }
                        })];
                case 6:
                    existingSumNode = _c.sent();
                    sumTokens_1 = [];
                    allCopies.forEach(function (copy, index) {
                        if (index > 0) {
                            sumTokens_1.push('+');
                        }
                        sumTokens_1.push("@value.".concat(copy.nodeId));
                    });
                    // Si aucune copie, mettre une valeur par défaut
                    if (sumTokens_1.length === 0) {
                        sumTokens_1.push('0');
                    }
                    now = new Date();
                    sumFormulaId = "".concat(mainVariable.id, "-sum-formula");
                    formulaInstance = {
                        id: sumFormulaId,
                        name: "Somme ".concat(mainVariable.displayName),
                        tokens: sumTokens_1,
                        description: "Somme automatique de toutes les copies de ".concat(mainVariable.displayName)
                    };
                    sumNodeData = {
                        label: sumDisplayName,
                        field_label: sumDisplayName,
                        fieldType: null, // 🔧 UNIFIÉ: null comme M² toiture - Total
                        subType: null,
                        fieldSubType: null,
                        hasData: true,
                        hasFormula: true,
                        data_visibleToUser: false, // 🔧 UNIFIÉ: false comme M² toiture - Total
                        formula_activeId: sumFormulaId,
                        formula_instances: (_b = {}, _b[sumFormulaId] = formulaInstance, _b),
                        formula_tokens: sumTokens_1,
                        linkedFormulaIds: [sumFormulaId],
                        data_activeId: sumFieldVariableId,
                        data_displayFormat: mainVariable.displayFormat,
                        data_unit: mainVariable.unit,
                        data_precision: mainVariable.precision,
                        metadata: __assign(__assign({}, ((existingSumNode === null || existingSumNode === void 0 ? void 0 : existingSumNode.metadata) || {})), { isSumDisplayField: true, sourceVariableId: mainVariable.id, sourceNodeId: nodeId, sumTokens: sumTokens_1, copiesCount: allCopies.length, 
                            // 🚫 PAS de capabilities.datas ici - le frontend utilise formula_instances directement
                            // C'est le chemin qui fonctionne pour M² toiture - Total
                            updatedAt: now.toISOString() }),
                        updatedAt: now
                    };
                    if (!existingSumNode) return [3 /*break*/, 8];
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: sumFieldNodeId },
                            data: sumNodeData
                        })];
                case 7:
                    _c.sent();
                    console.log("\uD83D\uDCCA [SUM DISPLAY] N\u0153ud Total mis \u00E0 jour: ".concat(sumFieldNodeId));
                    return [3 /*break*/, 14];
                case 8:
                    _c.trys.push([8, 10, , 14]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.create({
                            data: __assign({ id: sumFieldNodeId, treeId: treeId, parentId: node.parentId, type: 'leaf_field', label: sumDisplayName, field_label: sumDisplayName, order: maxCopyOrder + 1, isVisible: true, isActive: true, subtab: node.subtab, hasData: true, hasFormula: true, data_activeId: sumFieldVariableId, createdAt: now, updatedAt: now }, sumNodeData)
                        })];
                case 9:
                    _c.sent();
                    console.log("\uD83D\uDCCA [SUM DISPLAY] N\u0153ud Total cr\u00E9\u00E9: ".concat(sumFieldNodeId));
                    return [3 /*break*/, 14];
                case 10:
                    err_1 = _c.sent();
                    if (!(err_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && err_1.code === 'P2002')) return [3 /*break*/, 12];
                    // Conflit d'unicité: le nœud existe déjà, on le met simplement à jour
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({ where: { id: sumFieldNodeId }, data: sumNodeData })];
                case 11:
                    // Conflit d'unicité: le nœud existe déjà, on le met simplement à jour
                    _c.sent();
                    console.warn("\u26A0\uFE0F [SUM DISPLAY] N\u0153ud Total d\u00E9j\u00E0 existant, mise \u00E0 jour forc\u00E9e: ".concat(sumFieldNodeId));
                    return [3 /*break*/, 13];
                case 12: throw err_1;
                case 13: return [3 /*break*/, 14];
                case 14: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                        where: { nodeId: sumFieldNodeId }
                    })];
                case 15:
                    existingSumVariable = _c.sent();
                    sumVariableData = {
                        displayName: sumDisplayName,
                        displayFormat: mainVariable.displayFormat,
                        unit: mainVariable.unit,
                        precision: mainVariable.precision,
                        visibleToUser: true,
                        sourceType: 'formula',
                        sourceRef: "node-formula:".concat(sumFormulaId),
                        metadata: {
                            isSumVariable: true,
                            sumTokens: sumTokens_1,
                            copiesCount: allCopies.length,
                            sourceVariableId: mainVariable.id
                        },
                        updatedAt: now
                    };
                    if (!existingSumVariable) return [3 /*break*/, 17];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.update({
                            where: { nodeId: sumFieldNodeId },
                            data: sumVariableData
                        })];
                case 16:
                    _c.sent();
                    return [3 /*break*/, 25];
                case 17: return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: sumExposedKey } })];
                case 18:
                    existingKey = _c.sent();
                    finalExposedKey = existingKey ? "".concat(sumExposedKey, "_").concat(Date.now()) : sumExposedKey;
                    _c.label = 19;
                case 19:
                    _c.trys.push([19, 21, , 25]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.create({
                            data: __assign({ id: sumFieldVariableId, nodeId: sumFieldNodeId, exposedKey: finalExposedKey, createdAt: now }, sumVariableData)
                        })];
                case 20:
                    _c.sent();
                    return [3 /*break*/, 25];
                case 21:
                    err_2 = _c.sent();
                    if (!(err_2 instanceof client_1.Prisma.PrismaClientKnownRequestError && err_2.code === 'P2002')) return [3 /*break*/, 23];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.update({ where: { nodeId: sumFieldNodeId }, data: sumVariableData })];
                case 22:
                    _c.sent();
                    console.warn("\u26A0\uFE0F [SUM DISPLAY] Variable Total d\u00E9j\u00E0 existante, mise \u00E0 jour forc\u00E9e: ".concat(sumFieldNodeId));
                    return [3 /*break*/, 24];
                case 23: throw err_2;
                case 24: return [3 /*break*/, 25];
                case 25: return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.findUnique({
                        where: { id: sumFormulaId }
                    })];
                case 26:
                    existingSumFormula = _c.sent();
                    formulaOrgId = tree.organizationId || organizationId;
                    sumFormulaData = {
                        tokens: sumTokens_1,
                        organizationId: formulaOrgId,
                        updatedAt: now
                    };
                    if (!existingSumFormula) return [3 /*break*/, 28];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.update({ where: { id: sumFormulaId }, data: sumFormulaData })];
                case 27:
                    _c.sent();
                    return [3 /*break*/, 34];
                case 28:
                    _c.trys.push([28, 30, , 34]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.create({
                            data: __assign({ id: sumFormulaId, nodeId: sumFieldNodeId, organizationId: formulaOrgId, name: "Somme ".concat(mainVariable.displayName), description: "Somme automatique de toutes les copies de ".concat(mainVariable.displayName), createdAt: now }, sumFormulaData)
                        })];
                case 29:
                    _c.sent();
                    return [3 /*break*/, 34];
                case 30:
                    err_3 = _c.sent();
                    if (!(err_3 instanceof client_1.Prisma.PrismaClientKnownRequestError && err_3.code === 'P2002')) return [3 /*break*/, 32];
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.update({ where: { id: sumFormulaId }, data: sumFormulaData })];
                case 31:
                    _c.sent();
                    console.warn("\u26A0\uFE0F [SUM DISPLAY] Formule Total d\u00E9j\u00E0 existante, mise \u00E0 jour forc\u00E9e: ".concat(sumFormulaId));
                    return [3 /*break*/, 33];
                case 32: throw err_3;
                case 33: return [3 /*break*/, 34];
                case 34:
                    existingMeta = node.metadata || {};
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: {
                                metadata: __assign(__assign({}, existingMeta), { createSumDisplayField: true, sumDisplayFieldNodeId: sumFieldNodeId })
                            }
                        })];
                case 35:
                    _c.sent();
                    console.log("\u2705 [SUM DISPLAY] Champ Total cr\u00E9\u00E9 avec succ\u00E8s");
                    return [2 /*return*/, res.json({
                            success: true,
                            sumFieldNodeId: sumFieldNodeId,
                            sumFieldVariableId: sumFieldVariableId,
                            sumFormulaId: sumFormulaId,
                            copiesCount: allCopies.length,
                            sumTokens: sumTokens_1
                        })];
                case 36:
                    error_1 = _c.sent();
                    errMsg = error_1 instanceof Error ? error_1.message : String(error_1);
                    errStack = error_1 instanceof Error ? error_1.stack : '';
                    console.error('❌ [SUM DISPLAY] Erreur:', errMsg);
                    console.error('❌ [SUM DISPLAY] Stack:', errStack);
                    res.status(500).json({ error: 'Erreur lors de la création du champ Total', details: errMsg });
                    return [3 /*break*/, 37];
                case 37: return [2 /*return*/];
            }
        });
    }); });
    // DELETE /api/treebranchleaf/trees/:treeId/nodes/:nodeId/sum-display-field
    // Supprime le champ Total d'une variable
    router.delete('/trees/:treeId/nodes/:nodeId/sum-display-field', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var _a, treeId, nodeId, organizationId, tree, node, sumFieldNodeId, mainVariable, sumFormulaId, _b, _c, _d, existingMeta, error_2;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 15, , 16]);
                    _a = req.params, treeId = _a.treeId, nodeId = _a.nodeId;
                    organizationId = getOrgId(req);
                    console.log("\uD83D\uDDD1\uFE0F [SUM DISPLAY] Suppression champ Total pour nodeId=".concat(nodeId));
                    return [4 /*yield*/, prisma.treeBranchLeafTree.findFirst({
                            where: organizationId ? { id: treeId, organizationId: organizationId } : { id: treeId }
                        })];
                case 1:
                    tree = _e.sent();
                    if (!tree) {
                        return [2 /*return*/, res.status(404).json({ error: 'Arbre non trouvé' })];
                    }
                    return [4 /*yield*/, prisma.treeBranchLeafNode.findFirst({
                            where: { id: nodeId, treeId: treeId },
                            select: { id: true, metadata: true }
                        })];
                case 2:
                    node = _e.sent();
                    if (!node) {
                        return [2 /*return*/, res.status(404).json({ error: 'Nœud non trouvé' })];
                    }
                    sumFieldNodeId = "".concat(nodeId, "-sum-total");
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.findUnique({
                            where: { nodeId: nodeId },
                            select: { id: true }
                        })];
                case 3:
                    mainVariable = _e.sent();
                    sumFormulaId = mainVariable ? "".concat(mainVariable.id, "-sum-formula") : null;
                    if (!sumFormulaId) return [3 /*break*/, 7];
                    _e.label = 4;
                case 4:
                    _e.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeFormula.delete({
                            where: { id: sumFormulaId }
                        })];
                case 5:
                    _e.sent();
                    console.log("\uD83D\uDDD1\uFE0F [SUM DISPLAY] Formule supprim\u00E9e: ".concat(sumFormulaId));
                    return [3 /*break*/, 7];
                case 6:
                    _b = _e.sent();
                    return [3 /*break*/, 7];
                case 7:
                    _e.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, prisma.treeBranchLeafNodeVariable.delete({
                            where: { nodeId: sumFieldNodeId }
                        })];
                case 8:
                    _e.sent();
                    console.log("\uD83D\uDDD1\uFE0F [SUM DISPLAY] Variable supprim\u00E9e");
                    return [3 /*break*/, 10];
                case 9:
                    _c = _e.sent();
                    return [3 /*break*/, 10];
                case 10:
                    _e.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, prisma.treeBranchLeafNode.delete({
                            where: { id: sumFieldNodeId }
                        })];
                case 11:
                    _e.sent();
                    console.log("\uD83D\uDDD1\uFE0F [SUM DISPLAY] N\u0153ud supprim\u00E9: ".concat(sumFieldNodeId));
                    return [3 /*break*/, 13];
                case 12:
                    _d = _e.sent();
                    return [3 /*break*/, 13];
                case 13:
                    existingMeta = node.metadata || {};
                    return [4 /*yield*/, prisma.treeBranchLeafNode.update({
                            where: { id: nodeId },
                            data: {
                                metadata: __assign(__assign({}, existingMeta), { createSumDisplayField: false, sumDisplayFieldNodeId: null })
                            }
                        })];
                case 14:
                    _e.sent();
                    console.log("\u2705 [SUM DISPLAY] Champ Total supprim\u00E9 avec succ\u00E8s");
                    return [2 /*return*/, res.json({ success: true })];
                case 15:
                    error_2 = _e.sent();
                    console.error('❌ [SUM DISPLAY] Erreur suppression:', error_2);
                    res.status(500).json({ error: 'Erreur lors de la suppression du champ Total' });
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    }); });
}
/**
 * 📊 Met à jour le champ Total quand les copies changent
 *
 * Appelée après chaque copie/suppression de variable pour recalculer la formule de somme
 *
 * @param sourceNodeId - ID du nœud source de la variable
 * @param prismaClient - Instance Prisma (optionnel, utilise le client global si non fourni)
 */
function updateSumDisplayFieldAfterCopyChange(sourceNodeId, prismaClient) {
    return __awaiter(this, void 0, void 0, function () {
        var db, sourceNode, metadata, hasSum, sumFieldNodeId, mainVariable, baseExposedKey, allCopies, sumTokens_2, now, sumFormulaId, formulaInstance, sumNode, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    db = prismaClient || prisma;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, db.treeBranchLeafNode.findUnique({
                            where: { id: sourceNodeId },
                            select: {
                                id: true,
                                treeId: true,
                                metadata: true
                            }
                        })];
                case 2:
                    sourceNode = _b.sent();
                    if (!sourceNode)
                        return [2 /*return*/];
                    metadata = sourceNode.metadata;
                    hasSum = (metadata === null || metadata === void 0 ? void 0 : metadata.createSumDisplayField) === true;
                    sumFieldNodeId = metadata === null || metadata === void 0 ? void 0 : metadata.sumDisplayFieldNodeId;
                    if (!hasSum || !sumFieldNodeId) {
                        console.log("\uD83D\uDCCA [SUM UPDATE] N\u0153ud ".concat(sourceNodeId, " n'a pas de champ Total activ\u00E9"));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, db.treeBranchLeafNodeVariable.findUnique({
                            where: { nodeId: sourceNodeId },
                            select: { id: true, exposedKey: true, displayName: true }
                        })];
                case 3:
                    mainVariable = _b.sent();
                    if (!mainVariable)
                        return [2 /*return*/];
                    baseExposedKey = mainVariable.exposedKey.replace(/-\d+$/, '');
                    return [4 /*yield*/, db.treeBranchLeafNodeVariable.findMany({
                            where: {
                                OR: [
                                    { exposedKey: baseExposedKey },
                                    { exposedKey: { startsWith: "".concat(baseExposedKey, "-") } }
                                ]
                            },
                            select: { nodeId: true }
                        })];
                case 4:
                    allCopies = _b.sent();
                    sumTokens_2 = [];
                    allCopies.forEach(function (copy, index) {
                        if (index > 0)
                            sumTokens_2.push('+');
                        sumTokens_2.push("@value.".concat(copy.nodeId));
                    });
                    if (sumTokens_2.length === 0)
                        sumTokens_2.push('0');
                    now = new Date();
                    sumFormulaId = "".concat(mainVariable.id, "-sum-formula");
                    formulaInstance = {
                        id: sumFormulaId,
                        name: "Somme ".concat(mainVariable.displayName),
                        tokens: sumTokens_2,
                        description: "Somme automatique de toutes les copies de ".concat(mainVariable.displayName)
                    };
                    // Mettre à jour la formule dans la table dédiée
                    return [4 /*yield*/, db.treeBranchLeafNodeFormula.update({
                            where: { id: sumFormulaId },
                            data: { tokens: sumTokens_2, updatedAt: now }
                        })];
                case 5:
                    // Mettre à jour la formule dans la table dédiée
                    _b.sent();
                    return [4 /*yield*/, db.treeBranchLeafNode.findUnique({
                            where: { id: sumFieldNodeId },
                            select: { metadata: true }
                        })];
                case 6:
                    sumNode = _b.sent();
                    if (!sumNode) return [3 /*break*/, 8];
                    return [4 /*yield*/, db.treeBranchLeafNode.update({
                            where: { id: sumFieldNodeId },
                            data: {
                                updatedAt: now,
                                formula_instances: (_a = {}, _a[sumFormulaId] = formulaInstance, _a),
                                formula_tokens: sumTokens_2,
                                metadata: __assign(__assign({}, (sumNode.metadata || {})), { sumTokens: sumTokens_2, copiesCount: allCopies.length, updatedAt: now.toISOString() })
                            }
                        })];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    console.log("\u2705 [SUM UPDATE] Champ Total mis \u00E0 jour: ".concat(allCopies.length, " copies, formule: ").concat(sumTokens_2.join(' ')));
                    return [3 /*break*/, 10];
                case 9:
                    error_3 = _b.sent();
                    console.error('❌ [SUM UPDATE] Erreur mise à jour champ Total:', error_3);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}

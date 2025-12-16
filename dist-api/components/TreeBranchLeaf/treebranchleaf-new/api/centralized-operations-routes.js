"use strict";
/**
 * 🚀 API Routes pour l'Architecture Centralisée TreeBranchLeaf
 *
 * Routes spécialisées pour la gestion des opérations centralisées
 * avec auto-résolution et cache
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
var express_1 = require("express");
var client_1 = require("@prisma/client");
var auth_1 = require("../../../../middleware/auth");
var TreeBranchLeafResolver_1 = require("../../../services/TreeBranchLeafResolver");
var TreeBranchLeafBackgroundJobService_1 = require("../../../services/TreeBranchLeafBackgroundJobService");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
var resolver = (0, TreeBranchLeafResolver_1.getResolver)(prisma);
var backgroundJobService = (0, TreeBranchLeafBackgroundJobService_1.getBackgroundJobService)(prisma);
// Authentification requise pour toutes les routes
router.use(auth_1.authenticateToken);
function getAuthCtx(req) {
    var user = req.user || {};
    return {
        organizationId: user.organizationId || null,
        isSuperAdmin: Boolean(user.isSuperAdmin)
    };
}
// =============================================================================
// 📊 SUBMISSION DATA - Gestion centralisée des données de soumission
// =============================================================================
/**
 * POST /api/treebranchleaf/submission-data
 * Créer une nouvelle entrée de données de soumission avec auto-résolution
 */
router.post('/submission-data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, submissionId, nodeId, value, sourceRef, operationSource, fieldLabel, variableKey, variableDisplayName, variableUnit, isVariable, organizationId, data, submissionData, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, submissionId = _a.submissionId, nodeId = _a.nodeId, value = _a.value, sourceRef = _a.sourceRef, operationSource = _a.operationSource, fieldLabel = _a.fieldLabel, variableKey = _a.variableKey, variableDisplayName = _a.variableDisplayName, variableUnit = _a.variableUnit, isVariable = _a.isVariable;
                organizationId = getAuthCtx(req).organizationId;
                if (!submissionId || !nodeId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'submissionId and nodeId are required'
                        })];
                }
                data = {
                    id: "".concat(submissionId, "-").concat(nodeId),
                    submissionId: submissionId,
                    nodeId: nodeId,
                    value: value || null,
                    sourceRef: sourceRef || null,
                    operationSource: operationSource || null,
                    fieldLabel: fieldLabel || null, // Le trigger remplira automatiquement si null
                    variableKey: variableKey || null,
                    variableDisplayName: variableDisplayName || null,
                    variableUnit: variableUnit || null,
                    isVariable: isVariable !== undefined ? isVariable : null // Le trigger déterminera automatiquement
                };
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.create({
                        data: data
                    })];
            case 1:
                submissionData = _b.sent();
                console.log("\u2705 Created submission data with ".concat(sourceRef ? 'auto-resolution' : 'basic mode', " and fieldLabel"));
                res.status(201).json({
                    success: true,
                    data: submissionData
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('❌ Failed to create submission data:', error_1);
                res.status(500).json({
                    error: 'Failed to create submission data',
                    details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * PUT /api/treebranchleaf/submission-data/:id
 * Mettre à jour une entrée de données de soumission
 */
router.put('/submission-data/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, value, sourceRef, operationSource, fieldLabel, variableKey, variableDisplayName, variableUnit, isVariable, updateData, submissionData, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, value = _a.value, sourceRef = _a.sourceRef, operationSource = _a.operationSource, fieldLabel = _a.fieldLabel, variableKey = _a.variableKey, variableDisplayName = _a.variableDisplayName, variableUnit = _a.variableUnit, isVariable = _a.isVariable;
                updateData = {};
                if (value !== undefined)
                    updateData.value = value;
                if (fieldLabel !== undefined)
                    updateData.fieldLabel = fieldLabel;
                if (variableKey !== undefined)
                    updateData.variableKey = variableKey;
                if (variableDisplayName !== undefined)
                    updateData.variableDisplayName = variableDisplayName;
                if (variableUnit !== undefined)
                    updateData.variableUnit = variableUnit;
                if (isVariable !== undefined)
                    updateData.isVariable = isVariable;
                if (sourceRef !== undefined) {
                    updateData.sourceRef = sourceRef;
                    // Réinitialiser pour forcer la re-résolution
                    updateData.operationDetail = null;
                    updateData.operationResult = null;
                }
                if (operationSource !== undefined)
                    updateData.operationSource = operationSource;
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.update({
                        where: { id: id },
                        data: updateData
                    })];
            case 1:
                submissionData = _b.sent();
                res.json({
                    success: true,
                    data: submissionData
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error('❌ Failed to update submission data:', error_2);
                res.status(500).json({
                    error: 'Failed to update submission data',
                    details: error_2 instanceof Error ? error_2.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/treebranchleaf/submission-data/:id/resolved
 * Récupérer une entrée avec toutes ses données résolues
 */
router.get('/submission-data/:id/resolved', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, forceResolve, submissionData, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 8, , 9]);
                id = req.params.id;
                forceResolve = req.query.forceResolve;
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    label: true,
                                    type: true,
                                    subType: true,
                                    description: true
                                }
                            }
                        }
                    })];
            case 1:
                submissionData = _a.sent();
                if (!submissionData) {
                    return [2 /*return*/, res.status(404).json({ error: 'Submission data not found' })];
                }
                if (!(forceResolve === 'true' || (!submissionData.operationDetail && submissionData.sourceRef))) return [3 /*break*/, 4];
                if (!(submissionData.sourceRef && submissionData.operationSource)) return [3 /*break*/, 4];
                return [4 /*yield*/, resolver.updateSubmissionWithResolvedOperation(id, submissionData.sourceRef, submissionData.operationSource)];
            case 2:
                _a.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    label: true,
                                    type: true,
                                    subType: true,
                                    description: true
                                }
                            }
                        }
                    })];
            case 3:
                // Recharger les données mises à jour
                submissionData = _a.sent();
                _a.label = 4;
            case 4:
                if (!(submissionData && !submissionData.operationResult && submissionData.operationDetail)) return [3 /*break*/, 7];
                return [4 /*yield*/, resolver.calculateAndCacheResult(id)];
            case 5:
                _a.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findUnique({
                        where: { id: id },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    label: true,
                                    type: true,
                                    subType: true,
                                    description: true
                                }
                            }
                        }
                    })];
            case 6:
                // Recharger une dernière fois
                submissionData = _a.sent();
                _a.label = 7;
            case 7:
                res.json({
                    success: true,
                    data: submissionData
                });
                return [3 /*break*/, 9];
            case 8:
                error_3 = _a.sent();
                console.error('❌ Failed to get resolved submission data:', error_3);
                res.status(500).json({
                    error: 'Failed to get resolved submission data',
                    details: error_3 instanceof Error ? error_3.message : 'Unknown error'
                });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/treebranchleaf/submission-data/by-submission/:submissionId
 * Récupérer toutes les données d'une soumission avec les libellés
 */
router.get('/submission-data/by-submission/:submissionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissionId, includeResolved, submissionDataList, _i, submissionDataList_1, item, error_4, resolvedData, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 11, , 12]);
                submissionId = req.params.submissionId;
                includeResolved = req.query.includeResolved;
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: { submissionId: submissionId },
                        include: {
                            TreeBranchLeafNode: {
                                select: {
                                    id: true,
                                    label: true,
                                    type: true,
                                    subType: true,
                                    description: true,
                                    order: true
                                }
                            }
                        },
                        orderBy: [
                            { TreeBranchLeafNode: { order: 'asc' } },
                            { createdAt: 'asc' }
                        ]
                    })];
            case 1:
                submissionDataList = _a.sent();
                if (!(includeResolved === 'true')) return [3 /*break*/, 9];
                _i = 0, submissionDataList_1 = submissionDataList;
                _a.label = 2;
            case 2:
                if (!(_i < submissionDataList_1.length)) return [3 /*break*/, 7];
                item = submissionDataList_1[_i];
                if (!(item.sourceRef && item.operationSource && !item.operationDetail)) return [3 /*break*/, 6];
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                return [4 /*yield*/, resolver.updateSubmissionWithResolvedOperation(item.id, item.sourceRef, item.operationSource)];
            case 4:
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                error_4 = _a.sent();
                console.warn("Failed to resolve operation for ".concat(item.id, ":"), error_4);
                return [3 /*break*/, 6];
            case 6:
                _i++;
                return [3 /*break*/, 2];
            case 7: return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                    where: { submissionId: submissionId },
                    include: {
                        TreeBranchLeafNode: {
                            select: {
                                id: true,
                                label: true,
                                type: true,
                                subType: true,
                                description: true,
                                order: true
                            }
                        }
                    },
                    orderBy: [
                        { TreeBranchLeafNode: { order: 'asc' } },
                        { createdAt: 'asc' }
                    ]
                })];
            case 8:
                resolvedData = _a.sent();
                res.json({
                    success: true,
                    data: resolvedData,
                    count: resolvedData.length
                });
                return [3 /*break*/, 10];
            case 9:
                res.json({
                    success: true,
                    data: submissionDataList,
                    count: submissionDataList.length
                });
                _a.label = 10;
            case 10: return [3 /*break*/, 12];
            case 11:
                error_5 = _a.sent();
                console.error('❌ Failed to get submission data:', error_5);
                res.status(500).json({
                    error: 'Failed to get submission data',
                    details: error_5 instanceof Error ? error_5.message : 'Unknown error'
                });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🔧 OPERATIONS - Gestion des opérations et cache
// =============================================================================
/**
 * POST /api/treebranchleaf/operations/invalidate-cache
 * Invalider le cache pour une sourceRef spécifique
 */
router.post('/operations/invalidate-cache', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sourceRef, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                sourceRef = req.body.sourceRef;
                if (!sourceRef) {
                    return [2 /*return*/, res.status(400).json({ error: 'sourceRef is required' })];
                }
                return [4 /*yield*/, resolver.invalidateCache(sourceRef)];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: "Cache invalidated for ".concat(sourceRef)
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error('❌ Failed to invalidate cache:', error_6);
                res.status(500).json({
                    error: 'Failed to invalidate cache',
                    details: error_6 instanceof Error ? error_6.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/treebranchleaf/operations/resolve-background
 * Déclencher manuellement la résolution en arrière-plan
 */
router.post('/operations/resolve-background', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, resolver.resolveOperationsInBackground()];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: 'Background resolution completed'
                });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                console.error('❌ Failed to run background resolution:', error_7);
                res.status(500).json({
                    error: 'Failed to run background resolution',
                    details: error_7 instanceof Error ? error_7.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/treebranchleaf/operations/statistics
 * Obtenir les statistiques du système d'opérations
 */
router.get('/operations/statistics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var totalEntries, unresolvedEntries, operationTypes, recentResolutions, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.count({
                        where: { sourceRef: { not: null } }
                    })];
            case 1:
                totalEntries = _a.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.count({
                        where: {
                            sourceRef: { not: null },
                            operationDetail: null
                        }
                    })];
            case 2:
                unresolvedEntries = _a.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.groupBy({
                        by: ['operationSource'],
                        where: { sourceRef: { not: null } },
                        _count: { id: true }
                    })];
            case 3:
                operationTypes = _a.sent();
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.count({
                        where: {
                            lastResolved: {
                                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // dernières 24h
                            }
                        }
                    })];
            case 4:
                recentResolutions = _a.sent();
                res.json({
                    success: true,
                    data: {
                        totalEntries: totalEntries,
                        unresolvedEntries: unresolvedEntries,
                        operationTypes: operationTypes,
                        recentResolutions: recentResolutions,
                        resolutionRate: totalEntries > 0 ? ((totalEntries - unresolvedEntries) / totalEntries * 100).toFixed(2) : 0
                    }
                });
                return [3 /*break*/, 6];
            case 5:
                error_8 = _a.sent();
                console.error('❌ Failed to get statistics:', error_8);
                res.status(500).json({
                    error: 'Failed to get statistics',
                    details: error_8 instanceof Error ? error_8.message : 'Unknown error'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// =============================================================================
// 🎛️ BACKGROUND JOBS - Gestion des tâches en arrière-plan
// =============================================================================
/**
 * GET /api/treebranchleaf/background-jobs/status
 * Vérifier le statut des tâches en arrière-plan
 */
router.get('/background-jobs/status', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var healthCheck, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, backgroundJobService.healthCheck()];
            case 1:
                healthCheck = _a.sent();
                res.json({
                    success: true,
                    data: __assign(__assign({}, healthCheck), { isActive: backgroundJobService.isActive() })
                });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('❌ Failed to get background jobs status:', error_9);
                res.status(500).json({
                    error: 'Failed to get background jobs status',
                    details: error_9 instanceof Error ? error_9.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/treebranchleaf/background-jobs/start
 * Démarrer les tâches en arrière-plan
 */
router.post('/background-jobs/start', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var intervalMinutes;
    return __generator(this, function (_a) {
        try {
            intervalMinutes = req.body.intervalMinutes;
            backgroundJobService.start(intervalMinutes || 15);
            res.json({
                success: true,
                message: "Background jobs started with ".concat(intervalMinutes || 15, " minutes interval")
            });
        }
        catch (error) {
            console.error('❌ Failed to start background jobs:', error);
            res.status(500).json({
                error: 'Failed to start background jobs',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * POST /api/treebranchleaf/background-jobs/stop
 * Arrêter les tâches en arrière-plan
 */
router.post('/background-jobs/stop', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        try {
            backgroundJobService.stop();
            res.json({
                success: true,
                message: 'Background jobs stopped'
            });
        }
        catch (error) {
            console.error('❌ Failed to stop background jobs:', error);
            res.status(500).json({
                error: 'Failed to stop background jobs',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        return [2 /*return*/];
    });
}); });
/**
 * POST /api/treebranchleaf/background-jobs/force-sync
 * Forcer une synchronisation complète (DANGER)
 */
router.post('/background-jobs/force-sync', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var confirmDangerous, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                confirmDangerous = req.body.confirmDangerous;
                if (!confirmDangerous) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'This is a dangerous operation. Add confirmDangerous: true to proceed.'
                        })];
                }
                return [4 /*yield*/, backgroundJobService.forceFullSync()];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: 'Forced full synchronization completed'
                });
                return [3 /*break*/, 3];
            case 2:
                error_10 = _a.sent();
                console.error('❌ Failed to force sync:', error_10);
                res.status(500).json({
                    error: 'Failed to force sync',
                    details: error_10 instanceof Error ? error_10.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/treebranchleaf/submission-data/by-submission/:submissionId/variables
 * Récupérer toutes les variables d'une soumission (pour les formules)
 */
router.get('/submission-data/by-submission/:submissionId/variables', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissionId, variables, variablesMap, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                submissionId = req.params.submissionId;
                return [4 /*yield*/, prisma.treeBranchLeafSubmissionData.findMany({
                        where: {
                            submissionId: submissionId,
                            isVariable: true
                        },
                        select: {
                            id: true,
                            nodeId: true,
                            value: true,
                            variableKey: true,
                            variableDisplayName: true,
                            variableUnit: true,
                            fieldLabel: true
                        },
                        orderBy: {
                            variableKey: 'asc'
                        }
                    })];
            case 1:
                variables = _a.sent();
                variablesMap = variables.reduce(function (acc, variable) {
                    if (variable.variableKey) {
                        acc[variable.variableKey] = {
                            value: variable.value,
                            displayName: variable.variableDisplayName,
                            unit: variable.variableUnit,
                            fieldLabel: variable.fieldLabel,
                            nodeId: variable.nodeId
                        };
                    }
                    return acc;
                }, {});
                res.json({
                    success: true,
                    data: {
                        variables: variables,
                        variablesMap: variablesMap,
                        count: variables.length
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_11 = _a.sent();
                console.error('❌ Failed to get variables:', error_11);
                res.status(500).json({
                    error: 'Failed to get variables',
                    details: error_11 instanceof Error ? error_11.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

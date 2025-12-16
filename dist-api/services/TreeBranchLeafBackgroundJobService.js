"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeBranchLeafBackgroundJobService = void 0;
exports.getBackgroundJobService = getBackgroundJobService;
exports.setupGracefulShutdown = setupGracefulShutdown;
var TreeBranchLeafResolver_1 = require("./TreeBranchLeafResolver");
/**
 * Service de tâches en arrière-plan pour le système TreeBranchLeaf
 */
var TreeBranchLeafBackgroundJobService = /** @class */ (function () {
    function TreeBranchLeafBackgroundJobService(prisma) {
        this.intervalId = null;
        this.isRunning = false;
        this.prisma = prisma;
        this.resolver = (0, TreeBranchLeafResolver_1.getResolver)(prisma);
    }
    /**
     * Démarre les tâches en arrière-plan
     */
    TreeBranchLeafBackgroundJobService.prototype.start = function (intervalMinutes) {
        var _this = this;
        if (intervalMinutes === void 0) { intervalMinutes = 15; }
        if (this.isRunning) {
            console.warn('⚠️ Background jobs are already running');
            return;
        }
        console.log("\uD83D\uDE80 Starting TreeBranchLeaf background jobs (every ".concat(intervalMinutes, " minutes)"));
        // Exécution immédiate
        this.runBackgroundTasks();
        // Programmation récurrente
        this.intervalId = setInterval(function () { return _this.runBackgroundTasks(); }, intervalMinutes * 60 * 1000);
        this.isRunning = true;
    };
    /**
     * Arrête les tâches en arrière-plan
     */
    TreeBranchLeafBackgroundJobService.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 TreeBranchLeaf background jobs stopped');
    };
    /**
     * Vérifie si les tâches sont en cours d'exécution
     */
    TreeBranchLeafBackgroundJobService.prototype.isActive = function () {
        return this.isRunning;
    };
    /**
     * Exécute toutes les tâches en arrière-plan
     */
    TreeBranchLeafBackgroundJobService.prototype.runBackgroundTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, duration, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        console.log('🔄 Running TreeBranchLeaf background tasks...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        // Tâche 1: Résolution des opérations non résolues
                        return [4 /*yield*/, this.resolver.resolveOperationsInBackground()];
                    case 2:
                        // Tâche 1: Résolution des opérations non résolues
                        _a.sent();
                        // Tâche 2: Nettoyage des anciens caches
                        return [4 /*yield*/, this.cleanupStaleCache()];
                    case 3:
                        // Tâche 2: Nettoyage des anciens caches
                        _a.sent();
                        // Tâche 3: Recalcul des résultats obsolètes
                        return [4 /*yield*/, this.recalculateStaleResults()];
                    case 4:
                        // Tâche 3: Recalcul des résultats obsolètes
                        _a.sent();
                        // Tâche 4: Statistiques et monitoring
                        return [4 /*yield*/, this.generateStatistics()];
                    case 5:
                        // Tâche 4: Statistiques et monitoring
                        _a.sent();
                        duration = Date.now() - startTime;
                        console.log("\u2705 Background tasks completed in ".concat(duration, "ms"));
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        console.error('❌ Background tasks failed:', error_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Nettoie les caches obsolètes (plus anciens que X jours)
     */
    TreeBranchLeafBackgroundJobService.prototype.cleanupStaleCache = function () {
        return __awaiter(this, arguments, void 0, function (staleDays) {
            var staleDate, result, error_2;
            if (staleDays === void 0) { staleDays = 7; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        staleDate = new Date();
                        staleDate.setDate(staleDate.getDate() - staleDays);
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.updateMany({
                                where: {
                                    lastResolved: {
                                        lt: staleDate
                                    },
                                    operationDetail: {
                                        not: null
                                    }
                                },
                                data: {
                                    operationDetail: null,
                                    operationResult: null,
                                    lastResolved: null
                                }
                            })];
                    case 1:
                        result = _a.sent();
                        if (result.count > 0) {
                            console.log("\uD83E\uDDF9 Cleaned up ".concat(result.count, " stale cache entries older than ").concat(staleDays, " days"));
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Failed to cleanup stale cache:', error_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Recalcule les résultats pour les entrées qui ont des opérations résolues mais pas de résultat
     */
    TreeBranchLeafBackgroundJobService.prototype.recalculateStaleResults = function () {
        return __awaiter(this, void 0, void 0, function () {
            var entriesNeedingCalculation, calculated, _i, entriesNeedingCalculation_1, entry, error_3, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.findMany({
                                where: {
                                    operationDetail: { not: null },
                                    operationResult: null,
                                    operationSource: { not: null }
                                },
                                select: { id: true },
                                take: 100 // Limiter pour éviter la surcharge
                            })];
                    case 1:
                        entriesNeedingCalculation = _a.sent();
                        calculated = 0;
                        _i = 0, entriesNeedingCalculation_1 = entriesNeedingCalculation;
                        _a.label = 2;
                    case 2:
                        if (!(_i < entriesNeedingCalculation_1.length)) return [3 /*break*/, 7];
                        entry = entriesNeedingCalculation_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.resolver.calculateAndCacheResult(entry.id)];
                    case 4:
                        _a.sent();
                        calculated++;
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _a.sent();
                        console.error("Failed to calculate result for entry ".concat(entry.id, ":"), error_3);
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        if (calculated > 0) {
                            console.log("\uD83E\uDDEE Calculated results for ".concat(calculated, " entries"));
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        error_4 = _a.sent();
                        console.error('Failed to recalculate stale results:', error_4);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Génère des statistiques sur l'état du système
     */
    TreeBranchLeafBackgroundJobService.prototype.generateStatistics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stats, unresolvedCount, totalWithOperations, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.groupBy({
                                by: ['operationSource'],
                                where: {
                                    sourceRef: { not: null }
                                },
                                _count: {
                                    id: true
                                }
                            })];
                    case 1:
                        stats = _a.sent();
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.count({
                                where: {
                                    sourceRef: { not: null },
                                    operationDetail: null
                                }
                            })];
                    case 2:
                        unresolvedCount = _a.sent();
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.count({
                                where: {
                                    sourceRef: { not: null }
                                }
                            })];
                    case 3:
                        totalWithOperations = _a.sent();
                        console.log('📊 TreeBranchLeaf Statistics:');
                        console.log("   Total entries with operations: ".concat(totalWithOperations));
                        console.log("   Unresolved operations: ".concat(unresolvedCount));
                        stats.forEach(function (stat) {
                            console.log("   ".concat(stat.operationSource, ": ").concat(stat._count.id, " entries"));
                        });
                        // Alertes si trop d'entrées non résolues
                        if (unresolvedCount > 100) {
                            console.warn("\u26A0\uFE0F High number of unresolved operations: ".concat(unresolvedCount));
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_5 = _a.sent();
                        console.error('Failed to generate statistics:', error_5);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Force une synchronisation complète (à utiliser avec précaution)
     */
    TreeBranchLeafBackgroundJobService.prototype.forceFullSync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🔄 Starting forced full synchronization...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        // Invalider tous les caches
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.updateMany({
                                where: {
                                    sourceRef: { not: null }
                                },
                                data: {
                                    operationDetail: null,
                                    operationResult: null,
                                    lastResolved: null
                                }
                            })];
                    case 2:
                        // Invalider tous les caches
                        _a.sent();
                        // Relancer les tâches en arrière-plan
                        return [4 /*yield*/, this.runBackgroundTasks()];
                    case 3:
                        // Relancer les tâches en arrière-plan
                        _a.sent();
                        console.log('✅ Forced full synchronization completed');
                        return [3 /*break*/, 5];
                    case 4:
                        error_6 = _a.sent();
                        console.error('❌ Forced full synchronization failed:', error_6);
                        throw error_6;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Teste la connectivité et le bon fonctionnement du service
     */
    TreeBranchLeafBackgroundJobService.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var count, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        // Test de connectivité à la base de données
                        return [4 /*yield*/, this.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT 1"], ["SELECT 1"])))];
                    case 1:
                        // Test de connectivité à la base de données
                        _a.sent();
                        return [4 /*yield*/, this.prisma.treeBranchLeafSubmissionData.count()];
                    case 2:
                        count = _a.sent();
                        return [2 /*return*/, {
                                status: 'healthy',
                                details: {
                                    isRunning: this.isRunning,
                                    databaseConnected: true,
                                    totalSubmissionData: count,
                                    timestamp: new Date().toISOString()
                                }
                            }];
                    case 3:
                        error_7 = _a.sent();
                        return [2 /*return*/, {
                                status: 'unhealthy',
                                details: {
                                    error: error_7 instanceof Error ? error_7.message : 'Unknown error',
                                    isRunning: this.isRunning,
                                    timestamp: new Date().toISOString()
                                }
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return TreeBranchLeafBackgroundJobService;
}());
exports.TreeBranchLeafBackgroundJobService = TreeBranchLeafBackgroundJobService;
// Instance singleton pour la gestion globale
var backgroundJobInstance = null;
function getBackgroundJobService(prisma) {
    if (!backgroundJobInstance) {
        backgroundJobInstance = new TreeBranchLeafBackgroundJobService(prisma);
    }
    return backgroundJobInstance;
}
// Gestionnaire pour l'arrêt propre
function setupGracefulShutdown() {
    var shutdownHandler = function () {
        if (backgroundJobInstance) {
            console.log('🛑 Graceful shutdown: stopping background jobs...');
            backgroundJobInstance.stop();
        }
        process.exit(0);
    };
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
}
var templateObject_1;

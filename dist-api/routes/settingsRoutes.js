"use strict";
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
var auth_js_1 = require("../middlewares/auth.js");
var client_1 = require("@prisma/client");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Appliquer l'authentification à toutes les routes
router.use(auth_js_1.authMiddleware);
// GET /api/settings/lead-statuses
router.get('/lead-statuses', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, statuses, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[LEAD-STATUSES] Récupération des statuts pour l\'organisation:', organizationId);
                return [4 /*yield*/, prisma.leadStatus.findMany({
                        where: {
                            organizationId: organizationId
                        },
                        orderBy: {
                            order: 'asc'
                        }
                    })];
            case 1:
                statuses = _b.sent();
                console.log("[LEAD-STATUSES] ".concat(statuses.length, " statuts trouv\u00E9s"));
                res.json(statuses);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('[LEAD-STATUSES] Erreur lors de la récupération des statuts:', error_1);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des statuts',
                    message: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/lead-statuses
router.post('/lead-statuses', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, _a, name_1, color, order, isDefault, newStatus, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                _a = req.body, name_1 = _a.name, color = _a.color, order = _a.order, isDefault = _a.isDefault;
                if (!isDefault) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.leadStatus.updateMany({
                        where: {
                            organizationId: organizationId,
                            isDefault: true
                        },
                        data: {
                            isDefault: false
                        }
                    })];
            case 1:
                _c.sent();
                _c.label = 2;
            case 2: return [4 /*yield*/, prisma.leadStatus.create({
                    data: {
                        name: name_1,
                        color: color,
                        order: order || 0,
                        isDefault: isDefault || false,
                        organizationId: organizationId
                    }
                })];
            case 3:
                newStatus = _c.sent();
                console.log('[LEAD-STATUSES] Nouveau statut créé:', newStatus.name);
                res.status(201).json(newStatus);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _c.sent();
                console.error('[LEAD-STATUSES] Erreur lors de la création du statut:', error_2);
                res.status(500).json({
                    error: 'Erreur lors de la création du statut',
                    message: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// PUT /api/settings/lead-statuses/reorder (DOIT ÊTRE AVANT la route :id)
router.put('/lead-statuses/reorder', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId_1, statuses, _i, statuses_1, status_1, updatePromises, results, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('🚨 [DEBUG] LEAD-STATUSES REORDER - ROUTE APPELÉE !');
                console.log('🚨 [DEBUG] Body received:', req.body);
                console.log('🚨 [DEBUG] Headers:', req.headers);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                authReq = req;
                organizationId_1 = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId_1) {
                    console.log('🚨 [DEBUG] PAS D\'ORG ID');
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                statuses = req.body.statuses;
                if (!Array.isArray(statuses)) {
                    console.log('🚨 [DEBUG] PAS UN ARRAY:', typeof statuses, statuses);
                    return [2 /*return*/, res.status(400).json({
                            error: 'Array de statuts requis'
                        })];
                }
                console.log('[LEAD-STATUSES] 📥 DONNÉES REÇUES:', JSON.stringify(statuses, null, 2));
                console.log('[LEAD-STATUSES] 📊 Réorganisation de', statuses.length, 'statuts pour org:', organizationId_1);
                // Vérifier que chaque statut a un id et un order
                for (_i = 0, statuses_1 = statuses; _i < statuses_1.length; _i++) {
                    status_1 = statuses_1[_i];
                    if (!status_1.id || status_1.order === undefined) {
                        console.error('[LEAD-STATUSES] ❌ Statut invalide:', status_1);
                        return [2 /*return*/, res.status(400).json({
                                error: "Statut invalide: ".concat(JSON.stringify(status_1))
                            })];
                    }
                }
                updatePromises = statuses.map(function (status) { return __awaiter(void 0, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.log("[LEAD-STATUSES] \uD83D\uDD04 Mise \u00E0 jour ".concat(status.id, " -> order: ").concat(status.order));
                                return [4 /*yield*/, prisma.leadStatus.updateMany({
                                        where: { id: status.id, organizationId: organizationId_1 },
                                        data: { order: status.order }
                                    })];
                            case 1:
                                result = _a.sent();
                                console.log("[LEAD-STATUSES] \u2705 R\u00E9sultat pour ".concat(status.id, ": ").concat(result.count, " ligne(s) modifi\u00E9e(s)"));
                                return [2 /*return*/, result];
                        }
                    });
                }); });
                return [4 /*yield*/, Promise.all(updatePromises)];
            case 2:
                results = _b.sent();
                console.log('[LEAD-STATUSES] 📋 Résultats globaux:', results.map(function (r) { return r.count; }));
                res.json({
                    success: true,
                    message: 'Ordre mis à jour avec succès'
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('[LEAD-STATUSES] Erreur lors de la réorganisation:', error_3);
                res.status(500).json({
                    error: 'Erreur lors de la réorganisation'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// PUT /api/settings/lead-statuses/:id (DOIT ÊTRE APRÈS la route /reorder)
router.put('/lead-statuses/:id', function (req, res) {
    console.log('[ROUTE] PUT /api/settings/lead-statuses/:id atteint', req.params.id);
    // Logique de placeholder
    res.status(200).json(__assign({ id: req.params.id }, req.body));
});
// DELETE /api/settings/lead-statuses/:id
router.delete('/lead-statuses/:id', function (req, res) {
    console.log('[ROUTE] DELETE /api/settings/lead-statuses/:id atteint', req.params.id);
    // Logique de placeholder
    res.status(204).send();
});
// ===== ROUTES CALL STATUSES =====
// GET /api/settings/call-statuses
router.get('/call-statuses', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, callStatuses, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[CALL-STATUSES] Récupération des statuts pour l\'organisation:', organizationId);
                return [4 /*yield*/, prisma.callStatus.findMany({
                        where: {
                            organizationId: organizationId
                        },
                        orderBy: {
                            order: 'asc'
                        }
                    })];
            case 1:
                callStatuses = _b.sent();
                // Si aucun statut d'appel, ne rien créer par défaut
                if (callStatuses.length === 0) {
                    console.log('[CALL-STATUSES] Aucun statut trouvé');
                }
                console.log("[CALL-STATUSES] ".concat(callStatuses.length, " statuts trouv\u00E9s"));
                res.json(callStatuses);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                console.error('[CALL-STATUSES] Erreur lors de la récupération des statuts:', error_4);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des statuts d\'appel',
                    message: error_4 instanceof Error ? error_4.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/call-statuses (bulk save)
router.post('/call-statuses', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, statuses, savedStatuses, i, status_2, savedStatus, error_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 6, , 7]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                statuses = req.body;
                if (!Array.isArray(statuses)) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Le corps de la requête doit être un tableau de statuts'
                        })];
                }
                console.log("[CALL-STATUSES] Sauvegarde en lot de ".concat(statuses.length, " statuts"));
                // Supprimer tous les statuts existants pour cette organisation
                return [4 /*yield*/, prisma.callStatus.deleteMany({
                        where: {
                            organizationId: organizationId
                        }
                    })];
            case 1:
                // Supprimer tous les statuts existants pour cette organisation
                _b.sent();
                savedStatuses = [];
                i = 0;
                _b.label = 2;
            case 2:
                if (!(i < statuses.length)) return [3 /*break*/, 5];
                status_2 = statuses[i];
                return [4 /*yield*/, prisma.callStatus.create({
                        data: {
                            name: status_2.name,
                            color: status_2.color,
                            order: i,
                            organizationId: organizationId
                        }
                    })];
            case 3:
                savedStatus = _b.sent();
                savedStatuses.push(savedStatus);
                _b.label = 4;
            case 4:
                i++;
                return [3 /*break*/, 2];
            case 5:
                console.log("[CALL-STATUSES] ".concat(savedStatuses.length, " statuts sauvegard\u00E9s"));
                res.json(savedStatuses);
                return [3 /*break*/, 7];
            case 6:
                error_5 = _b.sent();
                console.error('[CALL-STATUSES] Erreur lors de la sauvegarde des statuts:', error_5);
                res.status(500).json({
                    error: 'Erreur lors de la sauvegarde des statuts d\'appel',
                    message: error_5 instanceof Error ? error_5.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/call-statuses/reorder
router.post('/call-statuses/reorder', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, statusIds, i, updatedStatuses, error_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 6, , 7]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                statusIds = req.body.statusIds;
                if (!Array.isArray(statusIds)) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'statusIds doit être un tableau'
                        })];
                }
                console.log("[CALL-STATUSES] R\u00E9organisation de ".concat(statusIds.length, " statuts"));
                i = 0;
                _b.label = 1;
            case 1:
                if (!(i < statusIds.length)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.callStatus.update({
                        where: {
                            id: statusIds[i],
                            organizationId: organizationId
                        },
                        data: {
                            order: i
                        }
                    })];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                i++;
                return [3 /*break*/, 1];
            case 4: return [4 /*yield*/, prisma.callStatus.findMany({
                    where: {
                        organizationId: organizationId
                    },
                    orderBy: {
                        order: 'asc'
                    }
                })];
            case 5:
                updatedStatuses = _b.sent();
                console.log("[CALL-STATUSES] R\u00E9organisation termin\u00E9e");
                res.json(updatedStatuses);
                return [3 /*break*/, 7];
            case 6:
                error_6 = _b.sent();
                console.error('[CALL-STATUSES] Erreur lors de la réorganisation:', error_6);
                res.status(500).json({
                    error: 'Erreur lors de la réorganisation des statuts d\'appel',
                    message: error_6 instanceof Error ? error_6.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// PUT /api/settings/call-statuses/reorder (alias PUT pour POST)
router.put('/call-statuses/reorder', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, statuses, updatePromises, error_7;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                statuses = req.body.statuses;
                if (!Array.isArray(statuses)) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Array de statuts requis'
                        })];
                }
                console.log("[CALL-STATUSES] PUT R\u00E9organisation de ".concat(statuses.length, " statuts"));
                updatePromises = statuses.map(function (status) {
                    return prisma.callStatus.update({
                        where: { id: status.id },
                        data: { order: status.order }
                    });
                });
                return [4 /*yield*/, Promise.all(updatePromises)];
            case 1:
                _b.sent();
                console.log("[CALL-STATUSES] PUT R\u00E9organisation termin\u00E9e");
                res.json({
                    success: true,
                    message: 'Ordre mis à jour avec succès'
                });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _b.sent();
                console.error('[CALL-STATUSES] PUT Erreur lors de la réorganisation:', error_7);
                res.status(500).json({
                    error: 'Erreur lors de la réorganisation des statuts d\'appel',
                    message: error_7 instanceof Error ? error_7.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/call-statuses/add
router.post('/call-statuses/add', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, _a, name_2, color, maxOrder, nextOrder, newStatus, error_8;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                _a = req.body, name_2 = _a.name, color = _a.color;
                if (!name_2 || !color) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Le nom et la couleur sont requis'
                        })];
                }
                return [4 /*yield*/, prisma.callStatus.aggregate({
                        where: {
                            organizationId: organizationId
                        },
                        _max: {
                            order: true
                        }
                    })];
            case 1:
                maxOrder = _c.sent();
                nextOrder = (maxOrder._max.order || 0) + 1;
                return [4 /*yield*/, prisma.callStatus.create({
                        data: {
                            name: name_2,
                            color: color,
                            order: nextOrder,
                            organizationId: organizationId
                        }
                    })];
            case 2:
                newStatus = _c.sent();
                console.log("[CALL-STATUSES] Nouveau statut cr\u00E9\u00E9: ".concat(newStatus.name));
                res.status(201).json(newStatus);
                return [3 /*break*/, 4];
            case 3:
                error_8 = _c.sent();
                console.error('[CALL-STATUSES] Erreur lors de la création du statut:', error_8);
                res.status(500).json({
                    error: 'Erreur lors de la création du statut d\'appel',
                    message: error_8 instanceof Error ? error_8.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// PUT /api/settings/call-statuses/:id
router.put('/call-statuses/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, id, _a, name_3, color, updatedStatus, error_9;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                id = req.params.id;
                _a = req.body, name_3 = _a.name, color = _a.color;
                console.log("[CALL-STATUSES] Mise \u00E0 jour du statut ".concat(id));
                return [4 /*yield*/, prisma.callStatus.update({
                        where: {
                            id: id,
                            organizationId: organizationId
                        },
                        data: {
                            name: name_3,
                            color: color
                        }
                    })];
            case 1:
                updatedStatus = _c.sent();
                console.log("[CALL-STATUSES] Statut mis \u00E0 jour: ".concat(updatedStatus.name));
                res.json(updatedStatus);
                return [3 /*break*/, 3];
            case 2:
                error_9 = _c.sent();
                console.error('[CALL-STATUSES] Erreur lors de la mise à jour du statut:', error_9);
                res.status(500).json({
                    error: 'Erreur lors de la mise à jour du statut d\'appel',
                    message: error_9 instanceof Error ? error_9.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/settings/call-statuses/:id
router.delete('/call-statuses/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, id, error_10;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                id = req.params.id;
                console.log("[CALL-STATUSES] Suppression du statut ".concat(id));
                return [4 /*yield*/, prisma.callStatus.delete({
                        where: {
                            id: id,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                _b.sent();
                console.log("[CALL-STATUSES] Statut supprim\u00E9");
                res.status(204).send();
                return [3 /*break*/, 3];
            case 2:
                error_10 = _b.sent();
                console.error('[CALL-STATUSES] Erreur lors de la suppression du statut:', error_10);
                res.status(500).json({
                    error: 'Erreur lors de la suppression du statut d\'appel',
                    message: error_10 instanceof Error ? error_10.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ===== ROUTES CALL TO LEAD MAPPING =====
// GET /api/settings/call-to-lead-mappings
router.get('/call-to-lead-mappings', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappings, error_11;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[MAPPINGS] Récupération des mappings pour l\'organisation:', organizationId);
                return [4 /*yield*/, prisma.callToLeadMapping.findMany({
                        where: {
                            organizationId: organizationId,
                            isActive: true
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        },
                        orderBy: {
                            priority: 'asc'
                        }
                    })];
            case 1:
                mappings = _b.sent();
                console.log("[MAPPINGS] ".concat(mappings.length, " mappings trouv\u00E9s"));
                res.json(mappings);
                return [3 /*break*/, 3];
            case 2:
                error_11 = _b.sent();
                console.error('[MAPPINGS] Erreur lors de la récupération des mappings:', error_11);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des mappings',
                    message: error_11 instanceof Error ? error_11.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/call-to-lead-mappings
router.post('/call-to-lead-mappings', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, _a, callStatusId, leadStatusId, condition, priority, mapping, error_12;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                _a = req.body, callStatusId = _a.callStatusId, leadStatusId = _a.leadStatusId, condition = _a.condition, priority = _a.priority;
                if (!callStatusId || !leadStatusId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'callStatusId et leadStatusId sont requis'
                        })];
                }
                console.log("[MAPPINGS] Cr\u00E9ation d'un mapping: ".concat(callStatusId, " -> ").concat(leadStatusId));
                return [4 /*yield*/, prisma.callToLeadMapping.create({
                        data: {
                            organizationId: organizationId,
                            callStatusId: callStatusId,
                            leadStatusId: leadStatusId,
                            condition: condition || null,
                            priority: priority || 0
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        }
                    })];
            case 1:
                mapping = _c.sent();
                console.log("[MAPPINGS] Mapping cr\u00E9\u00E9: ".concat(mapping.id));
                res.status(201).json(mapping);
                return [3 /*break*/, 3];
            case 2:
                error_12 = _c.sent();
                console.error('[MAPPINGS] Erreur lors de la création du mapping:', error_12);
                res.status(500).json({
                    error: 'Erreur lors de la création du mapping',
                    message: error_12 instanceof Error ? error_12.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/settings/call-to-lead-mappings/:id
router.put('/call-to-lead-mappings/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, id, _a, callStatusId, leadStatusId, condition, priority, isActive, mapping, error_13;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                id = req.params.id;
                _a = req.body, callStatusId = _a.callStatusId, leadStatusId = _a.leadStatusId, condition = _a.condition, priority = _a.priority, isActive = _a.isActive;
                console.log("[MAPPINGS] Mise \u00E0 jour du mapping ".concat(id));
                return [4 /*yield*/, prisma.callToLeadMapping.update({
                        where: {
                            id: id,
                            organizationId: organizationId
                        },
                        data: {
                            callStatusId: callStatusId,
                            leadStatusId: leadStatusId,
                            condition: condition,
                            priority: priority,
                            isActive: isActive
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        }
                    })];
            case 1:
                mapping = _c.sent();
                console.log("[MAPPINGS] Mapping mis \u00E0 jour: ".concat(mapping.id));
                res.json(mapping);
                return [3 /*break*/, 3];
            case 2:
                error_13 = _c.sent();
                console.error('[MAPPINGS] Erreur lors de la mise à jour du mapping:', error_13);
                res.status(500).json({
                    error: 'Erreur lors de la mise à jour du mapping',
                    message: error_13 instanceof Error ? error_13.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/settings/call-to-lead-mappings/:id
router.delete('/call-to-lead-mappings/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, id, error_14;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                id = req.params.id;
                console.log("[MAPPINGS] Suppression du mapping ".concat(id));
                return [4 /*yield*/, prisma.callToLeadMapping.delete({
                        where: {
                            id: id,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                _b.sent();
                console.log("[MAPPINGS] Mapping supprim\u00E9");
                res.status(204).send();
                return [3 /*break*/, 3];
            case 2:
                error_14 = _b.sent();
                console.error('[MAPPINGS] Erreur lors de la suppression du mapping:', error_14);
                res.status(500).json({
                    error: 'Erreur lors de la suppression du mapping',
                    message: error_14 instanceof Error ? error_14.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/call-to-lead-mappings/bulk
router.post('/call-to-lead-mappings/bulk', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappings, savedMappings, i, mapping, savedMapping, error_15;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 6, , 7]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                mappings = req.body.mappings;
                if (!Array.isArray(mappings)) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'mappings doit être un tableau'
                        })];
                }
                console.log("[MAPPINGS] Sauvegarde en lot de ".concat(mappings.length, " mappings"));
                // Supprimer tous les mappings existants
                return [4 /*yield*/, prisma.callToLeadMapping.deleteMany({
                        where: {
                            organizationId: organizationId
                        }
                    })];
            case 1:
                // Supprimer tous les mappings existants
                _b.sent();
                savedMappings = [];
                i = 0;
                _b.label = 2;
            case 2:
                if (!(i < mappings.length)) return [3 /*break*/, 5];
                mapping = mappings[i];
                return [4 /*yield*/, prisma.callToLeadMapping.create({
                        data: {
                            organizationId: organizationId,
                            callStatusId: mapping.callStatusId,
                            leadStatusId: mapping.leadStatusId,
                            condition: mapping.condition || null,
                            priority: i,
                            isActive: mapping.isActive !== false
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        }
                    })];
            case 3:
                savedMapping = _b.sent();
                savedMappings.push(savedMapping);
                _b.label = 4;
            case 4:
                i++;
                return [3 /*break*/, 2];
            case 5:
                console.log("[MAPPINGS] ".concat(savedMappings.length, " mappings sauvegard\u00E9s"));
                res.json(savedMappings);
                return [3 /*break*/, 7];
            case 6:
                error_15 = _b.sent();
                console.error('[MAPPINGS] Erreur lors de la sauvegarde des mappings:', error_15);
                res.status(500).json({
                    error: 'Erreur lors de la sauvegarde des mappings',
                    message: error_15 instanceof Error ? error_15.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// GET /api/settings/call-lead-mappings
router.get('/call-lead-mappings', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappings, error_16;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[MAPPINGS] Récupération des mappings pour l\'organisation:', organizationId);
                return [4 /*yield*/, prisma.callToLeadMapping.findMany({
                        where: {
                            organizationId: organizationId
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        },
                        orderBy: {
                            priority: 'asc'
                        }
                    })];
            case 1:
                mappings = _b.sent();
                console.log("[MAPPINGS] ".concat(mappings.length, " mappings trouv\u00E9s"));
                res.json(mappings);
                return [3 /*break*/, 3];
            case 2:
                error_16 = _b.sent();
                console.error('[MAPPINGS] Erreur lors de la récupération des mappings:', error_16);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des mappings',
                    message: error_16 instanceof Error ? error_16.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/settings/call-lead-mappings
router.get('/call-lead-mappings', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappings, error_17;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[MAPPINGS] Récupération des mappings pour l\'organisation:', organizationId);
                return [4 /*yield*/, prisma.callToLeadMapping.findMany({
                        where: {
                            organizationId: organizationId
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        },
                        orderBy: {
                            priority: 'asc'
                        }
                    })];
            case 1:
                mappings = _b.sent();
                console.log("[MAPPINGS] ".concat(mappings.length, " mappings trouv\u00E9s"));
                res.json(mappings);
                return [3 /*break*/, 3];
            case 2:
                error_17 = _b.sent();
                console.error('[MAPPINGS] Erreur lors de la récupération des mappings:', error_17);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des mappings',
                    message: error_17 instanceof Error ? error_17.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/settings/email-templates
router.get('/email-templates', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, templates, error_18;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                return [4 /*yield*/, prisma.emailTemplate.findMany({
                        where: { organizationId: organizationId }
                    })];
            case 1:
                templates = _b.sent();
                res.json(templates);
                return [3 /*break*/, 3];
            case 2:
                error_18 = _b.sent();
                console.error('[TEMPLATES] Erreur lors de la récupération des modèles:', error_18);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des modèles',
                    message: error_18 instanceof Error ? error_18.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/settings/lead-sources
router.get('/lead-sources', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, sources, error_19;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                return [4 /*yield*/, prisma.leadSource.findMany({
                        where: { organizationId: organizationId }
                    })];
            case 1:
                sources = _b.sent();
                res.json(sources);
                return [3 /*break*/, 3];
            case 2:
                error_19 = _b.sent();
                console.error('[SOURCES] Erreur lors de la récupération des sources:', error_19);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des sources',
                    message: error_19 instanceof Error ? error_19.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/call-lead-mappings  
router.post('/call-lead-mappings', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, _a, callStatusId, leadStatusId, priority, description, newMapping, error_20;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                _a = req.body, callStatusId = _a.callStatusId, leadStatusId = _a.leadStatusId, priority = _a.priority, description = _a.description;
                console.log('[MAPPINGS] Création d\'un nouveau mapping:', {
                    callStatusId: callStatusId,
                    leadStatusId: leadStatusId,
                    organizationId: organizationId,
                    priority: priority
                });
                return [4 /*yield*/, prisma.callToLeadMapping.create({
                        data: {
                            callStatusId: callStatusId,
                            leadStatusId: leadStatusId,
                            organizationId: organizationId,
                            priority: priority || 1,
                            description: description || null
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        }
                    })];
            case 1:
                newMapping = _c.sent();
                console.log('[MAPPINGS] Nouveau mapping créé:', newMapping.id);
                res.status(201).json(newMapping);
                return [3 /*break*/, 3];
            case 2:
                error_20 = _c.sent();
                console.error('[MAPPINGS] Erreur lors de la création du mapping:', error_20);
                res.status(500).json({
                    error: 'Erreur lors de la création du mapping',
                    message: error_20 instanceof Error ? error_20.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/settings/call-lead-mappings/:id
router.put('/call-lead-mappings/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappingId, _a, callStatusId, leadStatusId, priority, description, updatedMapping, error_21;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                mappingId = req.params.id;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                _a = req.body, callStatusId = _a.callStatusId, leadStatusId = _a.leadStatusId, priority = _a.priority, description = _a.description;
                console.log('[MAPPINGS] Mise à jour du mapping:', mappingId);
                return [4 /*yield*/, prisma.callToLeadMapping.update({
                        where: {
                            id: mappingId,
                            organizationId: organizationId
                        },
                        data: {
                            callStatusId: callStatusId,
                            leadStatusId: leadStatusId,
                            priority: priority,
                            description: description
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        }
                    })];
            case 1:
                updatedMapping = _c.sent();
                console.log('[MAPPINGS] Mapping mis à jour:', updatedMapping.id);
                res.json(updatedMapping);
                return [3 /*break*/, 3];
            case 2:
                error_21 = _c.sent();
                console.error('[MAPPINGS] Erreur lors de la mise à jour du mapping:', error_21);
                res.status(500).json({
                    error: 'Erreur lors de la mise à jour du mapping',
                    message: error_21 instanceof Error ? error_21.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/settings/call-lead-mappings/:id
router.delete('/call-lead-mappings/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappingId, error_22;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                mappingId = req.params.id;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[MAPPINGS] Suppression du mapping:', mappingId);
                return [4 /*yield*/, prisma.callToLeadMapping.delete({
                        where: {
                            id: mappingId,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                _b.sent();
                console.log('[MAPPINGS] Mapping supprimé:', mappingId);
                res.status(204).send();
                return [3 /*break*/, 3];
            case 2:
                error_22 = _b.sent();
                console.error('[MAPPINGS] Erreur lors de la suppression du mapping:', error_22);
                res.status(500).json({
                    error: 'Erreur lors de la suppression du mapping',
                    message: error_22 instanceof Error ? error_22.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/settings/call-lead-mappings - Créer un nouveau mapping
router.post('/call-lead-mappings', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, _a, callStatusId, leadStatusId, priority, existingMapping, updatedMapping, newMapping, error_23;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 6, , 7]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                _a = req.body, callStatusId = _a.callStatusId, leadStatusId = _a.leadStatusId, priority = _a.priority;
                if (!callStatusId || !leadStatusId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'callStatusId et leadStatusId sont requis'
                        })];
                }
                console.log('[MAPPING] Création d\'un nouveau mapping:', { callStatusId: callStatusId, leadStatusId: leadStatusId, priority: priority });
                return [4 /*yield*/, prisma.callToLeadMapping.findFirst({
                        where: {
                            callStatusId: callStatusId,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                existingMapping = _c.sent();
                if (!existingMapping) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.callToLeadMapping.update({
                        where: { id: existingMapping.id },
                        data: {
                            leadStatusId: leadStatusId,
                            priority: priority || existingMapping.priority
                        },
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        }
                    })];
            case 2:
                updatedMapping = _c.sent();
                console.log('[MAPPING] Mapping mis à jour:', updatedMapping.id);
                return [2 /*return*/, res.json(updatedMapping)];
            case 3: return [4 /*yield*/, prisma.callToLeadMapping.create({
                    data: {
                        callStatusId: callStatusId,
                        leadStatusId: leadStatusId,
                        organizationId: organizationId,
                        priority: priority || 1
                    },
                    include: {
                        CallStatus: true,
                        LeadStatus: true
                    }
                })];
            case 4:
                newMapping = _c.sent();
                console.log('[MAPPING] Nouveau mapping créé:', newMapping.id);
                return [2 /*return*/, res.json(newMapping)];
            case 5: return [3 /*break*/, 7];
            case 6:
                error_23 = _c.sent();
                console.error('[MAPPING] Erreur lors de la création du mapping:', error_23);
                res.status(500).json({
                    error: 'Erreur lors de la création du mapping',
                    message: error_23 instanceof Error ? error_23.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// PUT /api/settings/call-lead-mappings/:id - Modifier un mapping
router.put('/call-lead-mappings/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappingId, _a, callStatusId, leadStatusId, priority, updatedMapping, error_24;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                mappingId = req.params.id;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                _a = req.body, callStatusId = _a.callStatusId, leadStatusId = _a.leadStatusId, priority = _a.priority;
                console.log('[MAPPING] Modification du mapping:', mappingId, { callStatusId: callStatusId, leadStatusId: leadStatusId, priority: priority });
                return [4 /*yield*/, prisma.callToLeadMapping.update({
                        where: {
                            id: mappingId,
                            organizationId: organizationId
                        },
                        data: __assign(__assign(__assign({}, (callStatusId && { callStatusId: callStatusId })), (leadStatusId && { leadStatusId: leadStatusId })), (priority !== undefined && { priority: priority })),
                        include: {
                            CallStatus: true,
                            LeadStatus: true
                        }
                    })];
            case 1:
                updatedMapping = _c.sent();
                console.log('[MAPPING] Mapping mis à jour:', updatedMapping.id);
                res.json(updatedMapping);
                return [3 /*break*/, 3];
            case 2:
                error_24 = _c.sent();
                console.error('[MAPPING] Erreur lors de la modification du mapping:', error_24);
                res.status(500).json({
                    error: 'Erreur lors de la modification du mapping',
                    message: error_24 instanceof Error ? error_24.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/settings/call-lead-mappings/:id - Supprimer un mapping
router.delete('/call-lead-mappings/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, mappingId, error_25;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                authReq = req;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                mappingId = req.params.id;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[MAPPING] Suppression du mapping:', mappingId);
                return [4 /*yield*/, prisma.callToLeadMapping.delete({
                        where: {
                            id: mappingId,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                _b.sent();
                console.log('[MAPPING] Mapping supprimé:', mappingId);
                res.json({ success: true, message: 'Mapping supprimé avec succès' });
                return [3 /*break*/, 3];
            case 2:
                error_25 = _b.sent();
                console.error('[MAPPING] Erreur lors de la suppression du mapping:', error_25);
                res.status(500).json({
                    error: 'Erreur lors de la suppression du mapping',
                    message: error_25 instanceof Error ? error_25.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🚀 POST /api/settings/initialize-default-statuses - Initialiser les statuts par défaut
router.post('/initialize-default-statuses', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, defaultCallStatuses, defaultLeadStatuses, _i, defaultCallStatuses_1, status_3, _a, _b, defaultLeadStatuses_1, status_4, _c, mappings, callStatuses, leadStatuses, _loop_1, _d, mappings_1, mapping, error_26;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 19, , 20]);
                authReq = req;
                organizationId = (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('🚀 [INIT] Initialisation des statuts par défaut pour l\'organisation:', organizationId);
                defaultCallStatuses = [
                    { name: "📞 Pas de réponse", description: "Le client n'a pas décroché", color: "#f39c12", icon: "📞", order: 1 },
                    { name: "📞 Numéro incorrect / injoignable", description: "Numéro invalide ou injoignable", color: "#e74c3c", icon: "📞", order: 2 },
                    { name: "📞 Rappel programmé", description: "Rappel planifié avec le client", color: "#3498db", icon: "📞", order: 3 },
                    { name: "📞 Contacté – Pas intéressé", description: "Client contacté mais pas intéressé", color: "#e67e22", icon: "📞", order: 4 },
                    { name: "📞 Contacté – À rappeler plus tard", description: "Client demande à être rappelé plus tard", color: "#f1c40f", icon: "📞", order: 5 },
                    { name: "📞 Contacté – Information envoyée (mail/sms)", description: "Informations envoyées au client", color: "#9b59b6", icon: "📞", order: 6 },
                    { name: "📞 Contacté – Rendez-vous fixé", description: "RDV fixé avec le client", color: "#2ecc71", icon: "📞", order: 7 },
                    { name: "📞 Contacté – Refus (non direct à l'appel)", description: "Refus lors de l'appel", color: "#c0392b", icon: "📞", order: 8 },
                    { name: "📞 Contacté – Refus ferme (après devis/visite)", description: "Refus définitif après devis/visite", color: "#8e44ad", icon: "📞", order: 9 },
                    { name: "📞 Contacté – Devis demandé", description: "Client demande un devis", color: "#16a085", icon: "📞", order: 10 },
                    { name: "📞 Contacté – Devis envoyé", description: "Devis envoyé au client", color: "#27ae60", icon: "📞", order: 11 },
                    { name: "📞 Contacté – En négociation", description: "Négociation en cours", color: "#f39c12", icon: "📞", order: 12 },
                    { name: "📞 Contacté – Gagné (vente conclue)", description: "Vente finalisée", color: "#2ecc71", icon: "📞", order: 13 }
                ];
                defaultLeadStatuses = [
                    { name: "🟢 Nouveau lead", description: "Lead nouvellement créé", color: "#2ecc71", order: 1 },
                    { name: "🟡 Contacter (dès le 1er appel tenté)", description: "À contacter dès le premier appel", color: "#f1c40f", order: 2 },
                    { name: "🟡 En attente de rappel (si convenu avec le client)", description: "Rappel convenu avec le client", color: "#f39c12", order: 3 },
                    { name: "🟡 Information envoyée", description: "Informations envoyées au client", color: "#f1c40f", order: 4 },
                    { name: "🟠 Devis en préparation", description: "Devis en cours de préparation", color: "#e67e22", order: 5 },
                    { name: "🟠 Devis envoyé", description: "Devis envoyé au client", color: "#d35400", order: 6 },
                    { name: "🟠 En négociation", description: "Négociation en cours", color: "#e74c3c", order: 7 },
                    { name: "🎯 Ciblé (objectif client)", description: "Client ciblé comme objectif", color: "#9b59b6", order: 8 },
                    { name: "🟣 Non traité dans le délai (auto)", description: "Non traité automatiquement", color: "#8e44ad", order: 9 },
                    { name: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)", description: "Lead perdu", color: "#c0392b", order: 10 },
                    { name: "❌ Refusé (non direct / pas intéressé)", description: "Refus direct", color: "#e74c3c", order: 11 },
                    { name: "🟢 Gagné", description: "Lead gagné", color: "#27ae60", order: 12 },
                    { name: "⚫ Injoignable / Archivé", description: "Lead injoignable ou archivé", color: "#34495e", order: 13 }
                ];
                _i = 0, defaultCallStatuses_1 = defaultCallStatuses;
                _f.label = 1;
            case 1:
                if (!(_i < defaultCallStatuses_1.length)) return [3 /*break*/, 6];
                status_3 = defaultCallStatuses_1[_i];
                _f.label = 2;
            case 2:
                _f.trys.push([2, 4, , 5]);
                return [4 /*yield*/, prisma.callStatus.upsert({
                        where: {
                            organizationId_name: {
                                organizationId: organizationId,
                                name: status_3.name
                            }
                        },
                        update: {}, // Ne pas modifier si existe déjà
                        create: __assign(__assign({}, status_3), { organizationId: organizationId, isActive: true, isDefault: false })
                    })];
            case 3:
                _f.sent();
                console.log("\u2705 [INIT] Statut d'appel cr\u00E9\u00E9: ".concat(status_3.name));
                return [3 /*break*/, 5];
            case 4:
                _a = _f.sent();
                console.log("\u26A0\uFE0F [INIT] Statut d'appel existe d\u00E9j\u00E0: ".concat(status_3.name));
                return [3 /*break*/, 5];
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6:
                _b = 0, defaultLeadStatuses_1 = defaultLeadStatuses;
                _f.label = 7;
            case 7:
                if (!(_b < defaultLeadStatuses_1.length)) return [3 /*break*/, 12];
                status_4 = defaultLeadStatuses_1[_b];
                _f.label = 8;
            case 8:
                _f.trys.push([8, 10, , 11]);
                return [4 /*yield*/, prisma.leadStatus.upsert({
                        where: {
                            organizationId_name: {
                                organizationId: organizationId,
                                name: status_4.name
                            }
                        },
                        update: {}, // Ne pas modifier si existe déjà
                        create: __assign(__assign({}, status_4), { organizationId: organizationId, isDefault: false })
                    })];
            case 9:
                _f.sent();
                console.log("\u2705 [INIT] Statut de lead cr\u00E9\u00E9: ".concat(status_4.name));
                return [3 /*break*/, 11];
            case 10:
                _c = _f.sent();
                console.log("\u26A0\uFE0F [INIT] Statut de lead existe d\u00E9j\u00E0: ".concat(status_4.name));
                return [3 /*break*/, 11];
            case 11:
                _b++;
                return [3 /*break*/, 7];
            case 12:
                mappings = [
                    { callStatusName: "📞 Pas de réponse", leadStatusName: "🟡 Contacter (dès le 1er appel tenté)" },
                    { callStatusName: "📞 Numéro incorrect / injoignable", leadStatusName: "⚫ Injoignable / Archivé" },
                    { callStatusName: "📞 Rappel programmé", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
                    { callStatusName: "📞 Contacté – Pas intéressé", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
                    { callStatusName: "📞 Contacté – Refus (non direct à l'appel)", leadStatusName: "❌ Refusé (non direct / pas intéressé)" },
                    { callStatusName: "📞 Contacté – Refus ferme (après devis/visite)", leadStatusName: "🔴 Perdu (après visite/devis non signé, ou auto via SLA)" },
                    { callStatusName: "📞 Contacté – À rappeler plus tard", leadStatusName: "🟡 En attente de rappel (si convenu avec le client)" },
                    { callStatusName: "📞 Contacté – Information envoyée (mail/sms)", leadStatusName: "🟡 Information envoyée" },
                    { callStatusName: "📞 Contacté – Rendez-vous fixé", leadStatusName: "🎯 Ciblé (objectif client)" },
                    { callStatusName: "📞 Contacté – Devis demandé", leadStatusName: "🟠 Devis en préparation" },
                    { callStatusName: "📞 Contacté – Devis envoyé", leadStatusName: "🟠 Devis envoyé" },
                    { callStatusName: "📞 Contacté – En négociation", leadStatusName: "🟠 En négociation" },
                    { callStatusName: "📞 Contacté – Gagné (vente conclue)", leadStatusName: "🟢 Gagné" }
                ];
                return [4 /*yield*/, prisma.callStatus.findMany({ where: { organizationId: organizationId } })];
            case 13:
                callStatuses = _f.sent();
                return [4 /*yield*/, prisma.leadStatus.findMany({ where: { organizationId: organizationId } })];
            case 14:
                leadStatuses = _f.sent();
                _loop_1 = function (mapping) {
                    var callStatus, leadStatus, _g;
                    return __generator(this, function (_h) {
                        switch (_h.label) {
                            case 0:
                                callStatus = callStatuses.find(function (cs) { return cs.name === mapping.callStatusName; });
                                leadStatus = leadStatuses.find(function (ls) { return ls.name === mapping.leadStatusName; });
                                if (!(callStatus && leadStatus)) return [3 /*break*/, 4];
                                _h.label = 1;
                            case 1:
                                _h.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, prisma.callToLeadMapping.upsert({
                                        where: {
                                            organizationId_callStatusId_leadStatusId: {
                                                organizationId: organizationId,
                                                callStatusId: callStatus.id,
                                                leadStatusId: leadStatus.id
                                            }
                                        },
                                        update: {},
                                        create: {
                                            organizationId: organizationId,
                                            callStatusId: callStatus.id,
                                            leadStatusId: leadStatus.id,
                                            condition: "automatic",
                                            priority: 1,
                                            description: "Mapping automatique: ".concat(mapping.callStatusName, " \u2192 ").concat(mapping.leadStatusName),
                                            isActive: true
                                        }
                                    })];
                            case 2:
                                _h.sent();
                                console.log("\u2705 [INIT] Mapping cr\u00E9\u00E9: ".concat(mapping.callStatusName, " \u2192 ").concat(mapping.leadStatusName));
                                return [3 /*break*/, 4];
                            case 3:
                                _g = _h.sent();
                                console.log("\u26A0\uFE0F [INIT] Mapping existe d\u00E9j\u00E0: ".concat(mapping.callStatusName, " \u2192 ").concat(mapping.leadStatusName));
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                };
                _d = 0, mappings_1 = mappings;
                _f.label = 15;
            case 15:
                if (!(_d < mappings_1.length)) return [3 /*break*/, 18];
                mapping = mappings_1[_d];
                return [5 /*yield**/, _loop_1(mapping)];
            case 16:
                _f.sent();
                _f.label = 17;
            case 17:
                _d++;
                return [3 /*break*/, 15];
            case 18:
                console.log('🎉 [INIT] Initialisation terminée avec succès !');
                res.json({
                    success: true,
                    message: 'Statuts par défaut initialisés avec succès !',
                    details: {
                        callStatuses: defaultCallStatuses.length,
                        leadStatuses: defaultLeadStatuses.length,
                        mappings: mappings.length
                    }
                });
                return [3 /*break*/, 20];
            case 19:
                error_26 = _f.sent();
                console.error('❌ [INIT] Erreur lors de l\'initialisation des statuts:', error_26);
                res.status(500).json({
                    error: 'Erreur lors de l\'initialisation des statuts',
                    details: error_26 instanceof Error ? error_26.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

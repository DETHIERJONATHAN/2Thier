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
var auth_1 = require("../middlewares/auth");
var requireRole_1 = require("../middlewares/requireRole");
var impersonation_1 = require("../middlewares/impersonation");
var client_1 = require("@prisma/client");
var uuid_1 = require("uuid");
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)({ mergeParams: true });
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// Liste des dépendances d'un champ
router.get('/', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, dependencies, processedDependencies, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fieldId = req.params.fieldId || req.params.id;
                if (!fieldId) {
                    res.status(400).json({ error: "Paramètre 'fieldId' manquant dans l'URL." });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.fieldDependency.findMany({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'asc' },
                    })];
            case 2:
                dependencies = _a.sent();
                processedDependencies = dependencies.map(function (dep) {
                    var _a;
                    var sequence = [];
                    try {
                        // Le champ Prisma est de type Json?; gérer string ou objet
                        sequence = typeof dep.sequence === 'string' ? JSON.parse(dep.sequence) : ((_a = dep.sequence) !== null && _a !== void 0 ? _a : []);
                    }
                    catch (_b) {
                        sequence = [];
                    }
                    return __assign(__assign({}, dep), { sequence: sequence });
                });
                res.json(processedDependencies);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error("[API] Erreur GET /api/fields/".concat(fieldId, "/dependencies:"), error_1);
                res.status(500).json({ error: 'Erreur lors de la récupération des dépendances', details: error_1.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Lecture SÛRE (authentifié) des dépendances d'un champ, sans contrainte de rôle admin
// GET /api/fields/:id/dependencies/read
router.get('/read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, dependencies, processed, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fieldId = req.params.fieldId || req.params.id;
                if (!fieldId) {
                    res.status(400).json({ error: "Paramètre 'fieldId' manquant dans l'URL." });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.fieldDependency.findMany({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'asc' },
                    })];
            case 2:
                dependencies = _a.sent();
                processed = dependencies.map(function (dep) {
                    var _a;
                    var sequence = [];
                    try {
                        sequence = typeof dep.sequence === 'string' ? JSON.parse(dep.sequence) : ((_a = dep.sequence) !== null && _a !== void 0 ? _a : []);
                    }
                    catch (_b) {
                        sequence = [];
                    }
                    return __assign(__assign({}, dep), { sequence: sequence });
                });
                res.json({ success: true, data: processed });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.error("[API] Erreur GET /api/fields/".concat(fieldId, "/dependencies/read:"), error_2);
                res.status(500).json({ success: false, error: 'Erreur lors de la récupération des dépendances', details: error_2.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Ajout d'une dépendance
router.post('/', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, _a, name, description, sequence, order, targetFieldId, operator, value, action, prefillValue, lastDep, newOrder, resolvedDependsOnId, firstCondGroup, firstCond, params, deps, processed, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                fieldId = req.params.fieldId || req.params.id;
                if (!fieldId) {
                    res.status(400).json({ error: "Paramètre 'fieldId' manquant dans l'URL." });
                    return [2 /*return*/];
                }
                _a = req.body || {}, name = _a.name, description = _a.description, sequence = _a.sequence, order = _a.order, targetFieldId = _a.targetFieldId, operator = _a.operator, value = _a.value, action = _a.action, prefillValue = _a.prefillValue;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.fieldDependency.findFirst({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'desc' }
                    })];
            case 2:
                lastDep = _b.sent();
                newOrder = order !== null && order !== void 0 ? order : ((lastDep === null || lastDep === void 0 ? void 0 : lastDep.order) != null ? (lastDep.order + 1) : 0);
                resolvedDependsOnId = targetFieldId;
                if (!resolvedDependsOnId && sequence && Array.isArray(sequence.conditions)) {
                    firstCondGroup = sequence.conditions[0];
                    firstCond = Array.isArray(firstCondGroup) ? firstCondGroup[0] : undefined;
                    resolvedDependsOnId = firstCond === null || firstCond === void 0 ? void 0 : firstCond.targetFieldId;
                }
                if (!resolvedDependsOnId) {
                    return [2 /*return*/, res.status(400).json({ error: "targetFieldId requis pour créer une dépendance" })];
                }
                params = (action || prefillValue)
                    ? { action: action, prefillValue: prefillValue }
                    : undefined;
                return [4 /*yield*/, prisma.fieldDependency.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            fieldId: fieldId,
                            name: name || '',
                            description: description || '',
                            sequence: sequence ? JSON.stringify(sequence) : '[]',
                            order: newOrder,
                            dependsOnId: resolvedDependsOnId,
                            condition: operator || '',
                            value: value !== null && value !== void 0 ? value : null,
                            params: params,
                        }
                    })];
            case 3:
                _b.sent();
                return [4 /*yield*/, prisma.fieldDependency.findMany({ where: { fieldId: fieldId }, orderBy: { order: 'asc' } })];
            case 4:
                deps = _b.sent();
                processed = deps.map(function (d) {
                    var _a;
                    return (__assign(__assign({}, d), { sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence) : ((_a = d.sequence) !== null && _a !== void 0 ? _a : []) }));
                });
                res.json(processed);
                return [3 /*break*/, 6];
            case 5:
                error_3 = _b.sent();
                console.error("[API] Erreur POST /api/fields/".concat(fieldId, "/dependencies:"), error_3);
                res.status(500).json({ error: 'Erreur lors de la création de la dépendance', details: error_3.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Réordonner les dépendances d'un champ
router.post('/reorder', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, dependencies, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fieldId = req.params.fieldId || req.params.id;
                dependencies = req.body.dependencies;
                if (!Array.isArray(dependencies)) {
                    res.status(400).json({ error: "Le corps de la requête doit contenir un tableau 'dependencies'." });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.$transaction(dependencies.map(function (dep) {
                        return prisma.fieldDependency.update({
                            where: { id: dep.id },
                            data: { order: dep.order },
                        });
                    }))];
            case 2:
                _a.sent();
                res.status(200).json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                console.error("[API] Erreur POST /api/fields/".concat(fieldId, "/dependencies/reorder:"), error_4);
                res.status(500).json({ error: 'Erreur lors du réordonnancement', details: error_4.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Modifier une dépendance
router.put('/:dependencyId', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dependencyId, _a, name, description, sequence, order, targetFieldId, operator, value, action, prefillValue, existing, dataToUpdate, dep, deps, processed, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                dependencyId = req.params.dependencyId;
                _a = req.body || {}, name = _a.name, description = _a.description, sequence = _a.sequence, order = _a.order, targetFieldId = _a.targetFieldId, operator = _a.operator, value = _a.value, action = _a.action, prefillValue = _a.prefillValue;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.fieldDependency.findUnique({ where: { id: dependencyId } })];
            case 2:
                existing = _b.sent();
                if (!existing) {
                    return [2 /*return*/, res.status(404).json({ error: 'Dépendance non trouvée' })];
                }
                dataToUpdate = {};
                if (name !== undefined)
                    dataToUpdate.name = name;
                if (description !== undefined)
                    dataToUpdate.description = description;
                if (sequence !== undefined)
                    dataToUpdate.sequence = JSON.stringify(sequence);
                if (order !== undefined)
                    dataToUpdate.order = order;
                if (targetFieldId !== undefined)
                    dataToUpdate.dependsOnId = targetFieldId;
                if (operator !== undefined)
                    dataToUpdate.condition = operator;
                if (value !== undefined)
                    dataToUpdate.value = value;
                if (action !== undefined || prefillValue !== undefined)
                    dataToUpdate.params = { action: action, prefillValue: prefillValue };
                return [4 /*yield*/, prisma.fieldDependency.update({
                        where: { id: dependencyId },
                        data: dataToUpdate,
                    })];
            case 3:
                dep = _b.sent();
                return [4 /*yield*/, prisma.fieldDependency.findMany({ where: { fieldId: dep.fieldId }, orderBy: { order: 'asc' } })];
            case 4:
                deps = _b.sent();
                processed = deps.map(function (d) {
                    var _a;
                    return (__assign(__assign({}, d), { sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence) : ((_a = d.sequence) !== null && _a !== void 0 ? _a : []) }));
                });
                res.json(processed);
                return [3 /*break*/, 6];
            case 5:
                error_5 = _b.sent();
                console.error("[API] Erreur PUT /api/fields/".concat(req.params.fieldId, "/dependencies/").concat(dependencyId, ":"), error_5);
                res.status(500).json({ error: 'Erreur lors de la mise à jour de la dépendance', details: error_5.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Correction de la signature de la route DELETE
router.delete('/:dependencyId', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dependencyId, error_6, errObj;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dependencyId = req.params.dependencyId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.fieldDependency.delete({ where: { id: dependencyId } })];
            case 2:
                _a.sent();
                res.status(200).json({ id: dependencyId, success: true });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                console.error("[API] Erreur DELETE /api/fields/".concat(req.params.fieldId, "/dependencies/").concat(dependencyId, ":"), error_6);
                errObj = error_6;
                if (errObj.code === 'P2025') {
                    res.status(404).json({ error: 'Dépendance non trouvée.' });
                }
                else {
                    res.status(500).json({ error: 'Erreur lors de la suppression de la dépendance', details: error_6.message });
                }
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

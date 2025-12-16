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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var uuid_1 = require("uuid");
var client_1 = require("@prisma/client");
var adaptBlockStructure_1 = require("../helpers/adaptBlockStructure");
var auth_1 = require("../middlewares/auth");
// Import du middleware d'impersonation supprimé car non utilisé pour le moment
var requireRole_1 = require("../middlewares/requireRole");
var formulas_1 = __importDefault(require("./formulas"));
var dependencies_1 = __importDefault(require("./dependencies"));
var validations_1 = __importDefault(require("./validations"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Appliquer le middleware d'authentification à toutes les routes
router.use(auth_1.authMiddleware);
function mapFieldForFrontend(field) {
    if (!field || typeof field !== 'object')
        return field;
    var f = field;
    var options = Array.isArray(f.FieldOption)
        ? f.FieldOption
            .slice()
            .sort(function (a, b) { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 0) - ((_b = b.order) !== null && _b !== void 0 ? _b : 0); })
            .map(function (o) { return ({ id: o.id, label: o.label, value: o.value, order: o.order }); })
        : Array.isArray(f.options)
            ? f.options
            : [];
    var rest = __assign({}, field);
    delete rest['FieldOption'];
    return __assign(__assign({}, rest), { options: options });
}
// GET /api/fields - Récupérer tous les champs pour les validateurs
// NOTE : Cette route doit être définie AVANT les routes avec des paramètres comme /:id
// CORRECTION : Ajouter une protection de rôle pour s'assurer que l'utilisateur est authentifié.
router.get("/", (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, userRole, whereClause, fields, error_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                whereClause = {};
                if (userRole === 'super_admin') {
                    // Le super_admin peut voir les champs de toutes les organisations.
                    // Nous ne filtrons pas par organizationId.
                    // Si vous voulez filtrer par une organisation sélectionnée dans l'UI,
                    // il faudrait la passer en query param, mais pour l'instant, on retourne tout.
                }
                else {
                    // Pour les autres rôles (comme 'admin'), on exige une organizationId.
                    if (!organizationId) {
                        return [2 /*return*/, res.status(403).json({ error: "ID de l'organisation manquant pour cet utilisateur." })];
                    }
                    whereClause.organizationId = organizationId;
                }
                return [4 /*yield*/, prisma.field.findMany({
                        where: whereClause,
                        orderBy: {
                            label: 'asc'
                        }
                    })];
            case 1:
                fields = _c.sent();
                res.json(fields);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _c.sent();
                console.error("Erreur lors de la récupération des champs:", error_1);
                res.status(500).json({ error: "Erreur interne du serveur" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Monter les sous-routeurs en utilisant :id pour la cohérence
router.use('/:id/formulas', formulas_1.default);
router.use('/:id/dependencies', dependencies_1.default);
router.use('/:id/validations', validations_1.default);
// Alias attendu par le frontend pour le réordonnancement des dépendances
router.post('/:id/reorder-dependencies', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dependencyIds, dependencies, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                dependencyIds = ((_a = req.body) !== null && _a !== void 0 ? _a : {}).dependencyIds;
                if (!Array.isArray(dependencyIds)) {
                    return [2 /*return*/, res.status(400).json({ error: "Le corps doit contenir 'dependencyIds' (array)." })];
                }
                dependencies = dependencyIds.map(function (depId, index) { return ({ id: depId, order: index }); });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.$transaction(dependencies.map(function (dep) {
                        return prisma.fieldDependency.update({ where: { id: dep.id }, data: { order: dep.order } });
                    }))];
            case 2:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                console.error('[API] [POST /fields/:id/reorder-dependencies] Erreur:', error_2);
                res.status(500).json({ error: 'Erreur lors du réordonnancement des dépendances', details: error_2.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// PUT /api/fields/:id - Mise à jour d'un champ (onglet Paramètres)
router.put('/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, label, type, required, width, advancedConfig, field, err_1, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, label = _a.label, type = _a.type, required = _a.required, width = _a.width, advancedConfig = _a.advancedConfig;
                console.log('[fields.ts] PUT /:id - fieldId:', id);
                console.log('[fields.ts] PUT /:id - body reçu:', req.body);
                console.log('[fields.ts] PUT /:id - advancedConfig:', advancedConfig);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.field.update({
                        where: { id: id },
                        data: { label: label, type: type, required: required, width: width, advancedConfig: advancedConfig }
                    })];
            case 2:
                field = _b.sent();
                console.log('[fields.ts] PUT /:id - Champ mis à jour:', field);
                res.json(field);
                return [3 /*break*/, 4];
            case 3:
                err_1 = _b.sent();
                console.error('[fields.ts] PUT /:id - Erreur:', err_1);
                errorMessage = err_1 instanceof Error ? err_1.message : 'Erreur inconnue';
                res.status(404).json({ error: "Champ non trouvé ou erreur lors de la mise à jour", details: errorMessage });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Ajouter une option à un champ
router.post('/:fieldId/options', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, _a, label, order, value, existingOption, updatedField, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                fieldId = req.params.fieldId;
                _a = req.body, label = _a.label, order = _a.order, value = _a.value;
                // Vérification backend : refuser si label ou value vide
                if (!label || !value) {
                    res.status(400).json({ error: "Le label et la value de l'option sont obligatoires." });
                    return [2 /*return*/];
                }
                console.log('[API] [POST /fields/:fieldId/options] Reçu pour fieldId:', fieldId, 'body:', req.body);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                return [4 /*yield*/, prisma.fieldOption.findFirst({
                        where: {
                            fieldId: fieldId,
                            value: value
                        }
                    })];
            case 2:
                existingOption = _b.sent();
                if (!!existingOption) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.fieldOption.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            label: label,
                            value: value,
                            order: order,
                            fieldId: fieldId
                        }
                    })];
            case 3:
                _b.sent();
                console.log('[API] [POST /fields/:fieldId/options] Option créée en base');
                return [3 /*break*/, 5];
            case 4:
                console.log('[API] [POST /fields/:fieldId/options] Option déjà existante, retour du champ à jour');
                _b.label = 5;
            case 5: return [4 /*yield*/, prisma.field.findUnique({
                    where: { id: fieldId },
                    include: { FieldOption: true }
                })];
            case 6:
                updatedField = _b.sent();
                res.json(mapFieldForFrontend(updatedField));
                return [3 /*break*/, 8];
            case 7:
                err_2 = _b.sent();
                console.error('[API] [POST /fields/:fieldId/options] Erreur création option:', err_2);
                res.status(400).json({ error: "Erreur lors de la création de l'option", details: err_2.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Supprimer une option d'un champ
router.delete('/field-options/:optionId', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var optionId, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                optionId = req.params.optionId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.fieldOption.delete({ where: { id: optionId } })];
            case 2:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                err_3 = _a.sent();
                res.status(400).json({ error: "Erreur lors de la suppression de l'option", details: err_3.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Nouvelle route cohérente avec le frontend: DELETE /api/fields/:fieldId/options/:optionId
router.delete('/:fieldId/options/:optionId', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, fieldId, optionId, updatedField, err_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.params, fieldId = _a.fieldId, optionId = _a.optionId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.fieldOption.delete({ where: { id: optionId } })];
            case 2:
                _b.sent();
                return [4 /*yield*/, prisma.field.findUnique({
                        where: { id: fieldId },
                        include: { FieldOption: true }
                    })];
            case 3:
                updatedField = _b.sent();
                if (!updatedField) {
                    return [2 /*return*/, res.status(404).json({ error: 'Champ non trouvé après suppression de l\'option' })];
                }
                res.json(mapFieldForFrontend(updatedField));
                return [3 /*break*/, 5];
            case 4:
                err_4 = _b.sent();
                console.error('[API] [DELETE /fields/:fieldId/options/:optionId] Erreur suppression option:', err_4);
                res.status(400).json({ error: "Erreur lors de la suppression de l'option", details: err_4.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Récupérer un champ avec ses options
router.get('/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, field, err_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.field.findUnique({
                        where: { id: id },
                        include: { FieldOption: true }
                    })];
            case 2:
                field = _a.sent();
                if (!field) {
                    res.status(404).json({ error: "Champ non trouvé" });
                    return [2 /*return*/];
                }
                res.json(mapFieldForFrontend(field));
                return [3 /*break*/, 4];
            case 3:
                err_5 = _a.sent();
                res.status(400).json({ error: "Erreur lors de la récupération du champ", details: err_5.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/fields/meta-counts - Récupérer les comptes de métadonnées pour plusieurs champs
router.post('/meta-counts', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldIds, counts, result, err_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fieldIds = req.body.fieldIds;
                if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
                    res.status(400).json({ error: "fieldIds doit être un tableau non vide." });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Promise.all(fieldIds.map(function (fieldId) { return __awaiter(void 0, void 0, void 0, function () {
                        var formulas, validations, dependencies;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, prisma.fieldFormula.count({ where: { fieldId: fieldId } })];
                                case 1:
                                    formulas = _a.sent();
                                    return [4 /*yield*/, prisma.fieldValidation.count({ where: { fieldId: fieldId } })];
                                case 2:
                                    validations = _a.sent();
                                    return [4 /*yield*/, prisma.fieldDependency.count({ where: { fieldId: fieldId } })];
                                case 3:
                                    dependencies = _a.sent();
                                    return [2 /*return*/, {
                                            fieldId: fieldId,
                                            counts: { formulas: formulas, validations: validations, dependencies: dependencies },
                                        }];
                            }
                        });
                    }); }))];
            case 2:
                counts = _a.sent();
                result = counts.reduce(function (acc, _a) {
                    var fieldId = _a.fieldId, counts = _a.counts;
                    acc[fieldId] = counts;
                    return acc;
                }, {});
                res.json(result);
                return [3 /*break*/, 4];
            case 3:
                err_6 = _a.sent();
                console.error('[API] [POST /fields/meta-counts] Erreur:', err_6);
                res.status(500).json({ error: "Erreur serveur lors de la récupération des métadonnées", details: err_6.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/fields/:id - Suppression d'un champ
router.delete('/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, field, blockId, remainingFields, updatePromises, updatedBlock, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, prisma.field.findUnique({
                        where: { id: id },
                        include: { Section: true }
                    })];
            case 2:
                field = _a.sent();
                if (!field || !field.Section) {
                    res.status(404).json({ error: "Champ ou section parente non trouvé" });
                    return [2 /*return*/];
                }
                blockId = field.Section.blockId;
                if (!blockId) {
                    res.status(404).json({ error: "Block parent non trouvé" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.field.delete({
                        where: { id: id },
                    })];
            case 3:
                _a.sent();
                return [4 /*yield*/, prisma.field.findMany({
                        where: { sectionId: field.sectionId },
                        orderBy: { order: 'asc' },
                    })];
            case 4:
                remainingFields = _a.sent();
                updatePromises = remainingFields.map(function (f, index) {
                    return prisma.field.update({
                        where: { id: f.id },
                        data: { order: index },
                    });
                });
                return [4 /*yield*/, prisma.$transaction(updatePromises)];
            case 5:
                _a.sent();
                return [4 /*yield*/, prisma.block.findUnique({
                        where: { id: blockId },
                        include: {
                            Section: {
                                include: {
                                    Field: {
                                        orderBy: {
                                            order: 'asc'
                                        }
                                    }
                                },
                                orderBy: {
                                    order: 'asc'
                                }
                            }
                        }
                    })];
            case 6:
                updatedBlock = _a.sent();
                if (!updatedBlock) {
                    res.status(404).json({ error: "Le block mis à jour n'a pas pu être récupéré." });
                    return [2 /*return*/];
                }
                res.status(200).json(updatedBlock);
                return [3 /*break*/, 8];
            case 7:
                error_3 = _a.sent();
                console.error("Error deleting field:", error_3);
                res.status(500).json({ error: "An error occurred while deleting the field" });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// PUT /api/fields/:id/move - Déplacer un champ vers une autre section
router.put('/:id/move', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, targetSectionId, newOrder, fieldToMove_1, blockId, sourceSectionId_1, fieldsInSection, fieldIndex, reorderedFields, movedItem, updatedBlock, adaptedBlock, err_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, targetSectionId = _a.targetSectionId, newOrder = _a.newOrder;
                if (targetSectionId === undefined || newOrder === undefined) {
                    return [2 /*return*/, res.status(400).json({ error: "Les informations de section cible et d'ordre sont requises." })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 10]);
                return [4 /*yield*/, prisma.field.findUnique({
                        where: { id: id },
                        include: { Section: true },
                    })];
            case 2:
                fieldToMove_1 = _b.sent();
                if (!fieldToMove_1 || !fieldToMove_1.Section) {
                    return [2 /*return*/, res.status(404).json({ error: "Champ ou section d'origine non trouvé." })];
                }
                blockId = fieldToMove_1.Section.blockId;
                sourceSectionId_1 = fieldToMove_1.sectionId;
                if (!(sourceSectionId_1 === targetSectionId)) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.field.findMany({
                        where: { sectionId: targetSectionId },
                        orderBy: { order: 'asc' },
                    })];
            case 3:
                fieldsInSection = _b.sent();
                fieldIndex = fieldsInSection.findIndex(function (f) { return f.id === id; });
                if (fieldIndex === -1) {
                    return [2 /*return*/, res.status(404).json({ error: "Le champ à déplacer n'a pas été trouvé dans la section." })];
                }
                reorderedFields = __spreadArray([], fieldsInSection, true);
                movedItem = reorderedFields.splice(fieldIndex, 1)[0];
                reorderedFields.splice(newOrder, 0, movedItem);
                return [4 /*yield*/, prisma.$transaction(reorderedFields.map(function (field, index) {
                        return prisma.field.update({ where: { id: field.id }, data: { order: index } });
                    }))];
            case 4:
                _b.sent();
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, tx.field.updateMany({
                                    where: { sectionId: sourceSectionId_1, order: { gt: fieldToMove_1.order } },
                                    data: { order: { decrement: 1 } },
                                })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, tx.field.updateMany({
                                        where: { sectionId: targetSectionId, order: { gte: newOrder } },
                                        data: { order: { increment: 1 } },
                                    })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, tx.field.update({
                                        where: { id: id },
                                        data: { sectionId: targetSectionId, order: newOrder },
                                    })];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7: return [4 /*yield*/, prisma.block.findUnique({
                    where: { id: blockId },
                    include: {
                        Section: { orderBy: { order: 'asc' }, include: { Field: { orderBy: { order: 'asc' }, include: { FieldOption: { orderBy: { order: 'asc' } } } } } }
                    }
                })];
            case 8:
                updatedBlock = _b.sent();
                if (!updatedBlock) {
                    return [2 /*return*/, res.status(404).json({ error: "Le block mis à jour n'a pas pu être récupéré." })];
                }
                adaptedBlock = (0, adaptBlockStructure_1.adaptBlockStructure)(updatedBlock);
                res.json(adaptedBlock);
                return [3 /*break*/, 10];
            case 9:
                err_7 = _b.sent();
                console.error("[API] [PUT /fields/:id/move] Erreur:", err_7);
                res.status(500).json({ error: "Erreur lors du déplacement du champ", details: err_7.message });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// PUT /api/fields/:id/reorder - Réordonner un champ dans sa section
router.put('/:id/reorder', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var newIndex, id, fieldToMove, allFieldsInSection, oldIndex, reorderedFields, movedItem, updatePromises, updatedSection, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                newIndex = req.body.newIndex;
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, prisma.field.findUnique({
                        where: { id: id },
                    })];
            case 2:
                fieldToMove = _a.sent();
                if (!fieldToMove) {
                    res.status(404).json({ error: "Field not found" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.field.findMany({
                        where: { sectionId: fieldToMove.sectionId },
                        orderBy: { order: 'asc' },
                    })];
            case 3:
                allFieldsInSection = _a.sent();
                oldIndex = allFieldsInSection.findIndex(function (f) { return f.id === id; });
                if (oldIndex === -1) {
                    res.status(404).json({ error: "Field not found in its section" });
                    return [2 /*return*/];
                }
                reorderedFields = __spreadArray([], allFieldsInSection, true);
                movedItem = reorderedFields.splice(oldIndex, 1)[0];
                reorderedFields.splice(newIndex, 0, movedItem);
                updatePromises = reorderedFields.map(function (field, index) {
                    return prisma.field.update({
                        where: { id: field.id },
                        data: { order: index },
                    });
                });
                return [4 /*yield*/, prisma.$transaction(updatePromises)];
            case 4:
                _a.sent();
                return [4 /*yield*/, prisma.section.findUnique({
                        where: { id: fieldToMove.sectionId },
                        include: {
                            Field: {
                                orderBy: {
                                    order: 'asc'
                                }
                            }
                        }
                    })];
            case 5:
                updatedSection = _a.sent();
                res.status(200).json(updatedSection);
                return [3 /*break*/, 7];
            case 6:
                error_4 = _a.sent();
                console.error("Error reordering field:", error_4);
                res.status(500).json({ error: "An error occurred while reordering the field" });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

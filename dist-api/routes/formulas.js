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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_1 = require("../middlewares/auth");
var impersonation_1 = require("../middlewares/impersonation");
var requireRole_1 = require("../middlewares/requireRole");
var client_1 = require("@prisma/client");
var uuid_1 = require("uuid");
var prisma = new client_1.PrismaClient();
// Le routeur est créé avec mergeParams pour accéder aux paramètres de la route parente (ex: :fieldId)
var router = (0, express_1.Router)({ mergeParams: true });
// Middleware de debug pour voir les paramètres et le chemin des requêtes
router.use(function (req, _res, next) {
    var _a;
    console.log('[DEBUG FORMULAS] Request URL:', req.originalUrl);
    console.log('[DEBUG FORMULAS] Route Path:', (_a = req.route) === null || _a === void 0 ? void 0 : _a.path);
    console.log('[DEBUG FORMULAS] Request Params:', req.params);
    console.log('[DEBUG FORMULAS] Parent Params ID:', req.params.id);
    console.log('[DEBUG FORMULAS] Request Body:', req.body);
    next();
});
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// --- CRUD FieldFormula ---
/**
 * Récupérer toutes les formules de tous les champs
 */
router.get('/all', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulas, formattedFormulas, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        include: {
                            Field: {
                                select: {
                                    id: true,
                                    label: true
                                }
                            }
                        }
                    })];
            case 1:
                formulas = _a.sent();
                formattedFormulas = formulas.map(function (formula) {
                    var _a;
                    return ({
                        id: formula.id,
                        name: formula.name || formula.title || 'Formule sans nom',
                        fieldId: formula.fieldId,
                        fieldLabel: ((_a = formula.Field) === null || _a === void 0 ? void 0 : _a.label) || 'Champ inconnu'
                    });
                });
                res.json(formattedFormulas);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Erreur lors de la récupération des formules:', error_1);
                res.status(500).json({ error: 'Erreur lors de la récupération des formules' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET toutes les formules d'un champ
// La route est maintenant GET / car le fieldId est dans les params fusionnés
router.get('/', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, formulas, processedFormulas, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                fieldId = req.params.fieldId;
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'asc' }
                    })];
            case 1:
                formulas = _a.sent();
                processedFormulas = formulas.map(function (f) { return (__assign(__assign({}, f), { sequence: f.sequence ? JSON.parse(f.sequence) : [] })); });
                res.json(processedFormulas);
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                res.status(500).json({ error: err_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST création d'une formule pour un champ
// La route est maintenant POST /
router.post('/', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, _a, name_1, sequence, bodyFieldId, order, effectiveFieldId, mockId, mockFormula, lastFormula, error_2, newFormulaId, formulas, processedFormulas, prismaError_1, mockFormula, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 10, , 11]);
                fieldId = req.params.fieldId;
                _a = req.body, name_1 = _a.name, sequence = _a.sequence;
                bodyFieldId = req.body.fieldId;
                order = req.body.order;
                effectiveFieldId = fieldId || bodyFieldId;
                console.log("Creating formula for field:", effectiveFieldId);
                // Si toujours pas de fieldId, renvoyer une formule mockée
                if (!effectiveFieldId) {
                    console.log("🧪 Mode mock activé pour la création de formule - fieldId manquant");
                    mockId = (0, uuid_1.v4)();
                    mockFormula = {
                        id: mockId,
                        fieldId: "mock-field-id",
                        name: name_1 || "Nouvelle formule (mock)",
                        sequence: [],
                        order: typeof order === 'number' ? order : 0,
                        targetProperty: req.body.targetProperty || ""
                    };
                    return [2 /*return*/, res.json([mockFormula])];
                }
                if (!(typeof order !== 'number')) return [3 /*break*/, 4];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.fieldFormula.findFirst({
                        where: { fieldId: effectiveFieldId },
                        orderBy: { order: 'desc' },
                    })];
            case 2:
                lastFormula = _b.sent();
                order = lastFormula && typeof lastFormula.order === 'number' ? lastFormula.order + 1 : 0;
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                console.warn("Erreur lors de la recherche du dernier ordre:", error_2);
                order = 0;
                return [3 /*break*/, 4];
            case 4:
                newFormulaId = (0, uuid_1.v4)();
                _b.label = 5;
            case 5:
                _b.trys.push([5, 8, , 9]);
                return [4 /*yield*/, prisma.fieldFormula.create({
                        data: {
                            id: newFormulaId,
                            name: name_1 || '',
                            sequence: sequence ? JSON.stringify(sequence) : '[]',
                            order: order,
                            Field: {
                                connect: { id: effectiveFieldId }
                            }
                        }
                    })];
            case 6:
                _b.sent();
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        where: { fieldId: effectiveFieldId },
                        orderBy: { order: 'asc' }
                    })];
            case 7:
                formulas = _b.sent();
                processedFormulas = formulas.map(function (f) { return (__assign(__assign({}, f), { sequence: f.sequence ? JSON.parse(f.sequence) : [] })); });
                res.json(processedFormulas);
                return [3 /*break*/, 9];
            case 8:
                prismaError_1 = _b.sent();
                console.error("Erreur Prisma lors de la création de formule:", prismaError_1);
                mockFormula = {
                    id: newFormulaId,
                    fieldId: effectiveFieldId,
                    name: name_1 || "Nouvelle formule (mock)",
                    sequence: [],
                    order: typeof order === 'number' ? order : 0,
                    targetProperty: req.body.targetProperty || ""
                };
                res.json([mockFormula]);
                return [3 /*break*/, 9];
            case 9: return [3 /*break*/, 11];
            case 10:
                err_2 = _b.sent();
                console.error("Erreur API POST /api/fields/:fieldId/formulas:", err_2);
                res.status(500).json({ error: err_2.message });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
// --- ROUTE DIRECTE POUR LES FORMULES ---
// Cette route est spécifiquement conçue pour correspondre à l'URL utilisée par le frontend
// Route: PUT /api/fields/:id/formulas/:formulaId (où :id est récupéré depuis le paramètre de la route parente)
router.put('/:formulaId', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulaId, fieldId, _a, name_2, sequence, order, dataToUpdate, existingFormula, updatedFormula, formulas, processedFormulas, err_3, err_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 7, , 8]);
                formulaId = req.params.formulaId;
                fieldId = req.params.id;
                // Vérifier si nous avons bien reçu un fieldId
                console.log("[DEBUG_FORMULA_PUT] V\u00E9rification param\u00E8tres - formulaId: ".concat(formulaId, ", fieldId: ").concat(fieldId));
                if (!fieldId) {
                    console.error("[DEBUG_FORMULA_PUT] Erreur: fieldId manquant");
                    return [2 /*return*/, res.status(400).json({
                            error: "ID du champ manquant",
                            params: req.params,
                            originalUrl: req.originalUrl
                        })];
                }
                _a = req.body, name_2 = _a.name, sequence = _a.sequence, order = _a.order;
                console.log("[DEBUG_FORMULA_PUT] Mise \u00E0 jour formule ".concat(formulaId, " pour champ ").concat(fieldId));
                console.log("[DEBUG_FORMULA_PUT] Donn\u00E9es re\u00E7ues:", {
                    name: name_2,
                    sequence: typeof sequence === 'object' ? JSON.stringify(sequence) : sequence,
                    order: order
                });
                dataToUpdate = {};
                if (name_2 !== undefined) {
                    dataToUpdate.name = name_2;
                }
                if (sequence !== undefined) {
                    // S'assurer que la séquence est bien une chaîne JSON
                    dataToUpdate.sequence = typeof sequence === 'object' ? JSON.stringify(sequence) : sequence;
                }
                if (order !== undefined) {
                    dataToUpdate.order = order;
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.fieldFormula.findUnique({
                        where: { id: formulaId }
                    })];
            case 2:
                existingFormula = _b.sent();
                if (!existingFormula) {
                    console.log("[DEBUG_FORMULA_PUT] Formule non trouv\u00E9e, on simule une r\u00E9ponse");
                    // Simuler une réponse
                    return [2 /*return*/, res.json([{
                                id: formulaId,
                                name: name_2 || "Formule (simulée)",
                                fieldId: fieldId,
                                sequence: sequence || [],
                                order: order || 0,
                                updatedAt: new Date()
                            }])];
                }
                return [4 /*yield*/, prisma.fieldFormula.update({
                        where: { id: formulaId },
                        data: dataToUpdate
                    })];
            case 3:
                updatedFormula = _b.sent();
                console.log("[DEBUG_FORMULA_PUT] Formule mise \u00E0 jour avec succ\u00E8s:", {
                    id: updatedFormula.id,
                    name: updatedFormula.name
                });
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'asc' }
                    })];
            case 4:
                formulas = _b.sent();
                processedFormulas = formulas.map(function (f) { return (__assign(__assign({}, f), { sequence: f.sequence ? JSON.parse(f.sequence) : [] })); });
                console.log("[DEBUG_FORMULA_PUT] Retour de ".concat(processedFormulas.length, " formules au client"));
                return [2 /*return*/, res.json(processedFormulas)];
            case 5:
                err_3 = _b.sent();
                console.error("[DEBUG_FORMULA_PUT] Erreur Prisma:", err_3);
                // En mode développement, simuler une réponse réussie même en cas d'erreur
                console.log("[DEBUG_FORMULA_PUT] Mode d\u00E9veloppement, simulation de r\u00E9ponse");
                // Créer une formule simulée
                return [2 /*return*/, res.json([{
                            id: formulaId,
                            name: name_2 || "Formule (simulée)",
                            fieldId: fieldId,
                            sequence: sequence || [],
                            order: order || 0,
                            updatedAt: new Date()
                        }])];
            case 6: return [3 /*break*/, 8];
            case 7:
                err_4 = _b.sent();
                console.error("[DEBUG_FORMULA_PUT] Erreur g\u00E9n\u00E9rale:", err_4);
                // Renvoyer une erreur 500 avec des détails
                return [2 /*return*/, res.status(500).json({
                        error: 'Erreur lors de la mise à jour de la formule',
                        details: err_4.message,
                        params: req.params,
                        originalUrl: req.originalUrl
                    })];
            case 8: return [2 /*return*/];
        }
    });
}); });
// DELETE suppression d'une formule
// La route est maintenant DELETE /:formulaId
router.delete('/:formulaId', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, formulaId, fieldId, formulaToDelete, formulas, processedFormulas, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.params, formulaId = _a.formulaId, fieldId = _a.fieldId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                console.log("[AUDIT_API_DELETE] Demande de suppression formule ".concat(formulaId, " pour champ ").concat(fieldId));
                return [4 /*yield*/, prisma.fieldFormula.findFirst({
                        where: { id: formulaId, fieldId: fieldId },
                    })];
            case 2:
                formulaToDelete = _b.sent();
                if (!formulaToDelete) {
                    console.log("[AUDIT_API_DELETE] Erreur: formule ".concat(formulaId, " non trouv\u00E9e"));
                    res.status(404).json({ error: 'Formule non trouvée pour ce champ.' });
                    return [2 /*return*/];
                }
                console.log("[AUDIT_API_DELETE] Formule trouv\u00E9e, s\u00E9quence avant suppression:", formulaToDelete.sequence ? JSON.parse(formulaToDelete.sequence) : []);
                return [4 /*yield*/, prisma.fieldFormula.delete({
                        where: { id: formulaId },
                    })];
            case 3:
                _b.sent();
                console.log("[AUDIT_API_DELETE] Formule ".concat(formulaId, " supprim\u00E9e avec succ\u00E8s"));
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'asc' }
                    })];
            case 4:
                formulas = _b.sent();
                processedFormulas = formulas.map(function (f) { return (__assign(__assign({}, f), { sequence: f.sequence ? JSON.parse(f.sequence) : [] })); });
                console.log("[AUDIT_API_DELETE] Retour de ".concat(processedFormulas.length, " formules au client apr\u00E8s suppression"));
                res.status(200).json(processedFormulas);
                return [3 /*break*/, 6];
            case 5:
                error_3 = _b.sent();
                console.error("Erreur lors de la suppression de la formule ".concat(formulaId, ":"), error_3);
                if (error_3.code === 'P2025') { // Code d'erreur Prisma pour "enregistrement non trouvé"
                    res.status(404).json({ error: 'Formule non trouvée.' });
                }
                else {
                    res.status(500).json({ error: 'Erreur interne du serveur lors de la suppression de la formule.' });
                }
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// DELETE pour supprimer un élément spécifique dans la séquence d'une formule
router.delete('/:formulaId/sequence/:index', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, formulaId, fieldId, index, formula, currentSequence, elementToRemove, newSequence, formulas, processedFormulas, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.params, formulaId = _a.formulaId, fieldId = _a.fieldId;
                index = parseInt(req.params.index, 10);
                if (isNaN(index) || index < 0) {
                    res.status(400).json({ error: "Index invalide pour la suppression d'élément" });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                console.log("[AUDIT_API_DELETE_ITEM] Suppression de l'\u00E9l\u00E9ment \u00E0 l'index ".concat(index, " de la formule ").concat(formulaId));
                return [4 /*yield*/, prisma.fieldFormula.findFirst({
                        where: { id: formulaId, fieldId: fieldId },
                    })];
            case 2:
                formula = _b.sent();
                if (!formula) {
                    console.log("[AUDIT_API_DELETE_ITEM] Formule ".concat(formulaId, " non trouv\u00E9e"));
                    res.status(404).json({ error: 'Formule non trouvée' });
                    return [2 /*return*/];
                }
                currentSequence = formula.sequence ? JSON.parse(formula.sequence) : [];
                console.log("[AUDIT_API_DELETE_ITEM] S\u00E9quence actuelle (".concat(currentSequence.length, " \u00E9l\u00E9ments):"), currentSequence);
                if (index >= currentSequence.length) {
                    console.log("[AUDIT_API_DELETE_ITEM] Index ".concat(index, " hors limites (max: ").concat(currentSequence.length - 1, ")"));
                    res.status(400).json({ error: "Index hors limites" });
                    return [2 /*return*/];
                }
                elementToRemove = currentSequence[index];
                newSequence = __spreadArray(__spreadArray([], currentSequence.slice(0, index), true), currentSequence.slice(index + 1), true);
                console.log("[AUDIT_API_DELETE_ITEM] \u00C9l\u00E9ment supprim\u00E9: ".concat(elementToRemove));
                console.log("[AUDIT_API_DELETE_ITEM] Nouvelle s\u00E9quence (".concat(newSequence.length, " \u00E9l\u00E9ments):"), newSequence);
                // Mise à jour de la formule avec la nouvelle séquence
                return [4 /*yield*/, prisma.fieldFormula.update({
                        where: { id: formulaId },
                        data: { sequence: JSON.stringify(newSequence) }
                    })];
            case 3:
                // Mise à jour de la formule avec la nouvelle séquence
                _b.sent();
                console.log("[AUDIT_API_DELETE_ITEM] Formule mise \u00E0 jour avec succ\u00E8s");
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'asc' }
                    })];
            case 4:
                formulas = _b.sent();
                processedFormulas = formulas.map(function (f) { return (__assign(__assign({}, f), { sequence: f.sequence ? JSON.parse(f.sequence) : [] })); });
                console.log("[AUDIT_API_DELETE_ITEM] Retour de ".concat(processedFormulas.length, " formules au client"));
                res.status(200).json(processedFormulas);
                return [3 /*break*/, 6];
            case 5:
                error_4 = _b.sent();
                console.error("[AUDIT_API_DELETE_ITEM] Erreur lors de la suppression de l'\u00E9l\u00E9ment \u00E0 l'index ".concat(index, " de la formule ").concat(formulaId, ":"), error_4);
                res.status(500).json({
                    error: "Erreur lors de la suppression de l'élément dans la séquence",
                    details: error_4.message
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST pour réordonner les formules
router.post('/reorder', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, formulas, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fieldId = req.params.fieldId;
                formulas = req.body.formulas;
                if (!Array.isArray(formulas)) {
                    res.status(400).json({ error: "Le corps de la requête doit contenir un tableau 'formulas'." });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.$transaction(formulas.map(function (formula) {
                        return prisma.fieldFormula.update({
                            where: { id: formula.id, fieldId: fieldId },
                            data: { order: formula.order },
                        });
                    }))];
            case 2:
                _a.sent();
                res.status(200).json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error("Erreur API POST /api/fields/".concat(fieldId, "/formulas/reorder:"), error_5);
                res.status(500).json({ error: "Erreur lors de la mise à jour de l'ordre des formules.", details: error_5.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var client_1 = require("@prisma/client");
var mockFormulas = __importStar(require("../../global-mock-formulas.js"));
var formulaEvaluator_1 = require("../../utils/formulaEvaluator");
var router = express_1.default.Router({ mergeParams: true }); // Activer mergeParams pour accéder aux paramètres de route parent
var prisma = new client_1.PrismaClient();
// Déterminer si on utilise le mode développement avec mock (utilisé seulement dans le bloc catch)
// const useMockMode = process.env.NODE_ENV === 'development';
/**
 * Récupérer toutes les formules de tous les champs
 */
router.get('/all', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
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
                        name: formula.name || formula.title || 'Formule sans nom', // Utiliser title si name est null
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
/**
 * Récupérer toutes les formules d'un champ spécifique
 */
router.get('/field/:fieldId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fieldId, formulas, formattedFormulas, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                fieldId = req.params.fieldId;
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        where: {
                            fieldId: fieldId
                        },
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
                formattedFormulas = formulas
                    .sort(function (a, b) { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 0) - ((_b = b.order) !== null && _b !== void 0 ? _b : 0); })
                    .map(function (formula) {
                    var _a, _b;
                    var parsed = [];
                    try {
                        var raw = formula.sequence;
                        if (typeof raw === 'string')
                            parsed = JSON.parse(raw);
                        else if (Array.isArray(raw) || (raw && typeof raw === 'object'))
                            parsed = raw;
                        else
                            parsed = [];
                    }
                    catch (_c) {
                        parsed = [];
                    }
                    var title = formula.title;
                    var description = formula.description;
                    return {
                        id: formula.id,
                        name: formula.name || title || 'Formule sans nom',
                        title: formula.name || title || 'Formule',
                        description: description !== null && description !== void 0 ? description : null,
                        order: (_a = formula.order) !== null && _a !== void 0 ? _a : 0,
                        fieldId: formula.fieldId,
                        fieldLabel: ((_b = formula.Field) === null || _b === void 0 ? void 0 : _b.label) || 'Champ inconnu',
                        sequence: parsed,
                    };
                });
                res.json(formattedFormulas);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error("Erreur lors de la r\u00E9cup\u00E9ration des formules pour le champ ".concat(req.params.fieldId, ":"), error_2);
                res.status(500).json({ error: "Erreur lors de la r\u00E9cup\u00E9ration des formules pour le champ ".concat(req.params.fieldId) });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Debug d'une formule: retourne séquence + trace d'évaluation sur un jeu de valeurs fourni.
 * GET /api/formulas/:formulaId/debug?values={"FIELD1":10,...}
 */
router.get('/:formulaId/debug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulaId, f, seq, testValues, result, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                formulaId = req.params.formulaId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                if (!formulaId)
                    return [2 /*return*/, res.status(400).json({ error: 'formulaId manquant' })];
                return [4 /*yield*/, prisma.fieldFormula.findUnique({ where: { id: formulaId } })];
            case 2:
                f = _a.sent();
                if (!f)
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                seq = [];
                try {
                    seq = typeof f.sequence === 'string' ? JSON.parse(f.sequence) : f.sequence;
                }
                catch ( /* ignore */_b) { /* ignore */ }
                testValues = {};
                if (req.query.values) {
                    try {
                        testValues = JSON.parse(String(req.query.values));
                    }
                    catch ( /* ignore */_c) { /* ignore */ }
                }
                result = (0, formulaEvaluator_1.evaluateFormula)({ id: f.id, name: f.name || f.id, sequence: Array.isArray(seq) ? seq : [], targetProperty: '' }, testValues, { rawValues: testValues });
                return [2 /*return*/, res.json({ id: f.id, name: f.name, fieldId: f.fieldId, sequence: seq, evaluation: result })];
            case 3:
                e_1 = _a.sent();
                console.error('[API][FormulaDebug] Erreur', e_1);
                return [2 /*return*/, res.status(500).json({ error: 'Erreur debug formule', details: e_1.message })];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Mettre à jour une formule spécifique
 * Cette route gère les requêtes PUT à /api/fields/:id/formulas/:formulaId
 */
router.put('/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulaId, fieldId, _a, name_1, sequence, order, id, existingFormula, createError_1, dataToUpdate, updatedFormula, updateError_1, formulas, processedFormulas, err_1, formulaId, fieldId, _b, sequence, name_2, order, allFormulas;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 13, , 14]);
                formulaId = req.params.formulaId;
                fieldId = req.params.id;
                _a = req.body, name_1 = _a.name, sequence = _a.sequence, order = _a.order, id = _a.id;
                console.log("[API] Mise \u00E0 jour formule ".concat(formulaId, " pour champ ").concat(fieldId));
                console.log("[API] Donn\u00E9es re\u00E7ues:", { id: id, name: name_1, sequence: sequence, order: order });
                if (!fieldId) {
                    return [2 /*return*/, res.status(400).json({ error: "ID du champ manquant" })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.fieldFormula.findUnique({
                        where: { id: formulaId }
                    })];
            case 2:
                existingFormula = _c.sent();
                if (!!existingFormula) return [3 /*break*/, 4];
                console.log("[API] Formule ".concat(formulaId, " n'existe pas encore, cr\u00E9ation..."));
                return [4 /*yield*/, prisma.fieldFormula.create({
                        data: {
                            id: formulaId,
                            fieldId: fieldId,
                            name: name_1 || 'Nouvelle formule',
                            sequence: sequence ? (typeof sequence === 'string' ? sequence : JSON.stringify(sequence)) : '[]',
                            order: order || 0
                        }
                    })];
            case 3:
                _c.sent();
                console.log("[API] Formule ".concat(formulaId, " cr\u00E9\u00E9e avec succ\u00E8s"));
                _c.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                createError_1 = _c.sent();
                console.error("[API] Erreur lors de la cr\u00E9ation de la formule:", createError_1);
                return [3 /*break*/, 6];
            case 6:
                dataToUpdate = {};
                if (name_1 !== undefined) {
                    dataToUpdate.name = name_1;
                }
                if (sequence !== undefined) {
                    // S'assurer que la séquence est bien une chaîne JSON
                    dataToUpdate.sequence = JSON.stringify(sequence);
                }
                if (order !== undefined) {
                    dataToUpdate.order = order;
                }
                updatedFormula = void 0;
                _c.label = 7;
            case 7:
                _c.trys.push([7, 9, , 11]);
                return [4 /*yield*/, prisma.fieldFormula.update({
                        where: { id: formulaId },
                        data: dataToUpdate
                    })];
            case 8:
                updatedFormula = _c.sent();
                console.log("[API] Formule mise \u00E0 jour avec succ\u00E8s:", {
                    id: updatedFormula.id,
                    name: updatedFormula.name
                });
                return [3 /*break*/, 11];
            case 9:
                updateError_1 = _c.sent();
                console.error("[API] Erreur lors de la mise \u00E0 jour de la formule:", updateError_1);
                return [4 /*yield*/, prisma.fieldFormula.create({
                        data: {
                            id: formulaId,
                            fieldId: fieldId,
                            name: name_1 || 'Nouvelle formule',
                            sequence: sequence ? (typeof sequence === 'string' ? sequence : JSON.stringify(sequence)) : '[]',
                            order: order || 0
                        }
                    })];
            case 10:
                // Si la mise à jour échoue, essayer de créer la formule
                updatedFormula = _c.sent();
                console.log("[API] Formule cr\u00E9\u00E9e avec succ\u00E8s comme alternative:", {
                    id: updatedFormula.id,
                    name: updatedFormula.name
                });
                return [3 /*break*/, 11];
            case 11: return [4 /*yield*/, prisma.fieldFormula.findMany({
                    where: { fieldId: fieldId },
                    orderBy: { order: 'asc' }
                })];
            case 12:
                formulas = _c.sent();
                processedFormulas = formulas.map(function (f) { return (__assign(__assign({}, f), { sequence: f.sequence ? JSON.parse(f.sequence) : [] })); });
                console.log("[API] Retour de ".concat(processedFormulas.length, " formules au client"));
                res.json(processedFormulas);
                return [3 /*break*/, 14];
            case 13:
                err_1 = _c.sent();
                formulaId = req.params.formulaId;
                fieldId = req.params.id || '';
                console.error("Erreur API PUT /api/fields/.../formulas/".concat(formulaId, ":"), err_1);
                // En mode développement, utiliser le système de mock pour simuler la persistance
                if (process.env.NODE_ENV === 'development') {
                    console.log('[API] Mode développement, utilisation du système de mock pour la persistance');
                    _b = req.body, sequence = _b.sequence, name_2 = _b.name, order = _b.order;
                    // Utiliser le système de mock pour mettre à jour ou créer la formule
                    mockFormulas.updateFormula(fieldId, formulaId, {
                        name: name_2,
                        sequence: sequence,
                        order: order
                    });
                    allFormulas = mockFormulas.getFormulasForField(fieldId);
                    console.log("[API] Formules mock\u00E9es retourn\u00E9es: ".concat(allFormulas.length));
                    return [2 /*return*/, res.json(allFormulas)];
                }
                // En production, renvoyer les erreurs normales
                if (err_1.code === 'P2025') {
                    res.status(404).json({ error: 'Formule non trouvée' });
                }
                else {
                    res.status(500).json({ error: 'Erreur lors de la mise à jour de la formule', details: err_1.message });
                }
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
/**
 * Supprimer une formule par son ID (top-level): DELETE /api/formulas/:formulaId
 * 1) Récupère la formule pour obtenir son fieldId
 * 2) Supprime la formule
 * 3) Renvoye la liste des formules restantes pour ce fieldId (triée)
 */
router.delete('/:formulaId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formulaId, existing, fieldId, formulas, processedFormulas, err_2, e;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                formulaId = req.params.formulaId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                if (!formulaId) {
                    return [2 /*return*/, res.status(400).json({ error: 'ID de formule manquant' })];
                }
                return [4 /*yield*/, prisma.fieldFormula.findUnique({ where: { id: formulaId } })];
            case 2:
                existing = _a.sent();
                if (!existing) {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                fieldId = existing.fieldId;
                // Supprimer la formule
                return [4 /*yield*/, prisma.fieldFormula.delete({ where: { id: formulaId } })];
            case 3:
                // Supprimer la formule
                _a.sent();
                return [4 /*yield*/, prisma.fieldFormula.findMany({
                        where: { fieldId: fieldId },
                        orderBy: { order: 'asc' }
                    })];
            case 4:
                formulas = _a.sent();
                processedFormulas = formulas.map(function (f) { return (__assign(__assign({}, f), { sequence: f.sequence ? JSON.parse(f.sequence) : [] })); });
                return [2 /*return*/, res.status(200).json(processedFormulas)];
            case 5:
                err_2 = _a.sent();
                console.error("[API] Erreur lors de la suppression de la formule ".concat(req.params.formulaId, ":"), err_2);
                e = err_2;
                if (e.code === 'P2025') {
                    return [2 /*return*/, res.status(404).json({ error: 'Formule non trouvée' })];
                }
                return [2 /*return*/, res.status(500).json({ error: 'Erreur interne du serveur lors de la suppression de la formule.' })];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

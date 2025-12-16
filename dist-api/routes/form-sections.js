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
var client_1 = require("@prisma/client");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 📝 SECTIONS DE FORMULAIRES - Gestion des sections Block→Section→Field
// ⚠️  Ne pas confondre avec la navigation des modules (module.category)
// GET toutes les sections pour un bloc spécifique
router.get('/:blockId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var blockId, sections, adaptedSections, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                blockId = req.params.blockId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                console.log("[API] GET /api/form-sections/".concat(blockId, " - R\u00E9cup\u00E9ration sections de formulaire"));
                return [4 /*yield*/, prisma.section.findMany({
                        where: { blockId: blockId },
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
                    })];
            case 2:
                sections = _a.sent();
                adaptedSections = sections.map(function (section) { return (__assign(__assign({}, section), { fields: section.Field || [] // 'Field' est maintenant inclus et disponible
                 })); });
                console.log("[API] ".concat(adaptedSections.length, " sections de formulaire trouv\u00E9es pour bloc ").concat(blockId));
                res.json(adaptedSections);
                return [3 /*break*/, 4];
            case 3:
                e_1 = _a.sent();
                console.error("[API] Erreur r\u00E9cup\u00E9ration sections pour bloc ".concat(blockId, ":"), e_1);
                res.status(500).json({ error: 'Erreur lors de la récupération des sections', details: e_1 });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST - Créer une nouvelle section de formulaire
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, blockId, order, sectionType, section, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, blockId = _a.blockId, order = _a.order, sectionType = _a.sectionType;
                console.log("[API] POST /api/form-sections - Cr\u00E9ation section: ".concat(name_1, " pour bloc ").concat(blockId));
                if (!name_1 || !blockId) {
                    res.status(400).json({ error: 'Name et blockId requis' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.section.create({
                        data: {
                            id: "section-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9)),
                            name: name_1,
                            blockId: blockId,
                            order: order || 0,
                            sectionType: sectionType || 'normal',
                            active: true
                        },
                        include: {
                            Field: true
                        }
                    })];
            case 1:
                section = _b.sent();
                console.log("[API] \u2705 Section de formulaire cr\u00E9\u00E9e: ".concat(section.id));
                res.json({ success: true, data: section });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('[API] Erreur création section:', error_1);
                res.status(500).json({ error: 'Erreur lors de la création de la section de formulaire' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT - Modifier une section de formulaire
router.put('/:sectionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sectionId, _a, name_2, order, sectionType, active, section, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                sectionId = req.params.sectionId;
                _a = req.body, name_2 = _a.name, order = _a.order, sectionType = _a.sectionType, active = _a.active;
                console.log("[API] PUT /api/form-sections/".concat(sectionId, " - Modification section"));
                return [4 /*yield*/, prisma.section.update({
                        where: { id: sectionId },
                        data: __assign(__assign(__assign(__assign({}, (name_2 && { name: name_2 })), (order !== undefined && { order: order })), (sectionType && { sectionType: sectionType })), (active !== undefined && { active: active })),
                        include: {
                            Field: true
                        }
                    })];
            case 1:
                section = _b.sent();
                console.log("[API] \u2705 Section de formulaire modifi\u00E9e: ".concat(section.id));
                res.json({ success: true, data: section });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error("[API] Erreur modification section ".concat(req.params.sectionId, ":"), error_2);
                res.status(500).json({ error: 'Erreur lors de la modification de la section de formulaire' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE - Supprimer une section de formulaire
router.delete('/:sectionId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sectionId, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                sectionId = req.params.sectionId;
                console.log("[API] DELETE /api/form-sections/".concat(sectionId, " - Suppression section"));
                return [4 /*yield*/, prisma.section.delete({
                        where: { id: sectionId }
                    })];
            case 1:
                _a.sent();
                console.log("[API] \u2705 Section de formulaire supprim\u00E9e: ".concat(sectionId));
                res.json({ success: true, message: 'Section de formulaire supprimée' });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("[API] Erreur suppression section ".concat(req.params.sectionId, ":"), error_3);
                res.status(500).json({ error: 'Erreur lors de la suppression de la section de formulaire' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

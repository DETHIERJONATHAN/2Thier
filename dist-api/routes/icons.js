"use strict";
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
var impersonation_1 = require("../middlewares/impersonation");
var client_1 = require("@prisma/client");
var requireRole_1 = require("../middlewares/requireRole");
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// GET - Récupérer toutes les icônes disponibles
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, category, search, whereClause, searchTerm, icons, groupedIcons, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query, category = _a.category, search = _a.search;
                console.log('[ICONS-API] GET - Récupération des icônes', { category: category, search: search });
                whereClause = {
                    active: true // Seulement les icônes actives
                };
                // Filtre par catégorie
                if (category && category !== 'all') {
                    whereClause.category = category;
                }
                // Recherche dans le nom, la description et les tags
                if (search && typeof search === 'string') {
                    searchTerm = search.toLowerCase();
                    whereClause.OR = [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } },
                        { tags: { hasSome: [searchTerm] } }
                    ];
                }
                return [4 /*yield*/, prisma.icon.findMany({
                        where: whereClause,
                        orderBy: [
                            { category: 'asc' },
                            { name: 'asc' }
                        ]
                    })];
            case 1:
                icons = _b.sent();
                groupedIcons = icons.reduce(function (acc, icon) {
                    if (!acc[icon.category]) {
                        acc[icon.category] = [];
                    }
                    acc[icon.category].push(icon);
                    return acc;
                }, {});
                res.json({
                    success: true,
                    data: {
                        icons: icons,
                        groupedIcons: groupedIcons,
                        totalCount: icons.length,
                        categories: Object.keys(groupedIcons).sort()
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('[ICONS-API] Erreur lors de la récupération des icônes:', error_1);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des icônes',
                    details: error_1.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET - Récupérer les catégories d'icônes
router.get('/categories', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categories, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('[ICONS-API] GET - Récupération des catégories d\'icônes');
                return [4 /*yield*/, prisma.icon.groupBy({
                        by: ['category'],
                        where: { active: true },
                        _count: { id: true },
                        orderBy: { category: 'asc' }
                    })];
            case 1:
                categories = _a.sent();
                res.json({
                    success: true,
                    data: categories.map(function (cat) { return ({
                        name: cat.category,
                        count: cat._count.id
                    }); })
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[ICONS-API] Erreur lors de la récupération des catégories:', error_2);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des catégories',
                    details: error_2.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST - Créer une nouvelle icône (Admin seulement)
router.post('/', (0, requireRole_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, category, description, tags, _b, active, newIcon, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, category = _a.category, description = _a.description, tags = _a.tags, _b = _a.active, active = _b === void 0 ? true : _b;
                console.log('[ICONS-API] POST - Création d\'une nouvelle icône:', { name: name_1, category: category });
                if (!name_1 || !category) {
                    res.status(400).json({
                        success: false,
                        error: 'Le nom et la catégorie sont requis'
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.icon.create({
                        data: {
                            name: name_1,
                            category: category,
                            description: description,
                            tags: Array.isArray(tags) ? tags : [],
                            active: active
                        }
                    })];
            case 1:
                newIcon = _c.sent();
                res.json({
                    success: true,
                    data: newIcon,
                    message: "Ic\u00F4ne \"".concat(name_1, "\" cr\u00E9\u00E9e avec succ\u00E8s")
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _c.sent();
                console.error('[ICONS-API] Erreur lors de la création de l\'icône:', error_3);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la création de l\'icône',
                    details: error_3.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT - Modifier une icône existante (Admin seulement)
router.put('/:id', (0, requireRole_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, updateData, updatedIcon, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                updateData = req.body;
                console.log('[ICONS-API] PUT - Modification de l\'icône:', { id: id, updateData: updateData });
                // Supprimer les champs non modifiables
                delete updateData.id;
                delete updateData.createdAt;
                delete updateData.updatedAt;
                return [4 /*yield*/, prisma.icon.update({
                        where: { id: id },
                        data: updateData
                    })];
            case 1:
                updatedIcon = _a.sent();
                res.json({
                    success: true,
                    data: updatedIcon,
                    message: "Ic\u00F4ne mise \u00E0 jour avec succ\u00E8s"
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('[ICONS-API] Erreur lors de la modification de l\'icône:', error_4);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la modification de l\'icône',
                    details: error_4.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE - Désactiver une icône (Admin seulement)
router.delete('/:id', (0, requireRole_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, disabledIcon, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                console.log('[ICONS-API] DELETE - Désactivation de l\'icône:', id);
                return [4 /*yield*/, prisma.icon.update({
                        where: { id: id },
                        data: { active: false }
                    })];
            case 1:
                disabledIcon = _a.sent();
                res.json({
                    success: true,
                    data: disabledIcon,
                    message: "Ic\u00F4ne d\u00E9sactiv\u00E9e avec succ\u00E8s"
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('[ICONS-API] Erreur lors de la désactivation de l\'icône:', error_5);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la désactivation de l\'icône',
                    details: error_5.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

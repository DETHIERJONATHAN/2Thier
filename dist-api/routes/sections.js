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
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// ✅ REDIRECTION : /api/sections → Categories Prisma
// Ces routes permettent au hook useDynamicSections de fonctionner sans modification
// GET - Récupérer toutes les Categories (compatible avec useDynamicSections)
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, categories, sectionsFormat, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.query.organizationId;
                console.log('[SECTIONS→CATEGORIES] GET - Récupération des Categories existantes depuis admin-modules');
                return [4 /*yield*/, prisma.category.findMany({
                        where: organizationId ? {
                            OR: [
                                { organizationId: organizationId },
                                { organizationId: null } // Categories globales
                            ]
                        } : undefined,
                        orderBy: { order: 'asc' }
                    })];
            case 1:
                categories = _a.sent();
                sectionsFormat = categories.map(function (category) { return ({
                    id: category.id,
                    title: category.name,
                    description: category.description || '',
                    iconName: category.icon,
                    iconColor: category.iconColor,
                    order: category.order,
                    active: category.active,
                    organizationId: category.organizationId,
                    createdAt: category.createdAt.toISOString(),
                    updatedAt: category.updatedAt.toISOString()
                }); });
                console.log("[SECTIONS\u2192CATEGORIES] ".concat(sectionsFormat.length, " Categories existantes converties en sections"));
                console.log("[SECTIONS\u2192CATEGORIES] Categories trouv\u00E9es: ".concat(sectionsFormat.map(function (s) { return s.title; }).join(', ')));
                res.json(sectionsFormat);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('[SECTIONS→CATEGORIES] Erreur GET:', error_1);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des sections'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /bulk - Créer plusieurs Categories en une fois
router.post('/bulk', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sections, categoriesToCreate, createdCategories, sectionsFormat, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                sections = req.body.sections;
                console.log("[SECTIONS\u2192CATEGORIES] POST/bulk - Cr\u00E9ation de ".concat(sections.length, " Categories"));
                categoriesToCreate = sections.map(function (section) { return ({
                    name: section.title,
                    description: section.description,
                    icon: section.iconName,
                    iconColor: section.iconColor,
                    order: section.order,
                    active: section.active,
                    organizationId: section.organizationId,
                    superAdminOnly: false
                }); });
                return [4 /*yield*/, Promise.all(categoriesToCreate.map(function (category) {
                        return prisma.category.create({ data: category });
                    }))];
            case 1:
                createdCategories = _a.sent();
                sectionsFormat = createdCategories.map(function (category) { return ({
                    id: category.id,
                    title: category.name,
                    description: category.description || '',
                    iconName: category.icon,
                    iconColor: category.iconColor,
                    order: category.order,
                    active: category.active,
                    organizationId: category.organizationId,
                    createdAt: category.createdAt.toISOString(),
                    updatedAt: category.updatedAt.toISOString()
                }); });
                console.log("[SECTIONS\u2192CATEGORIES] ".concat(createdCategories.length, " Categories cr\u00E9\u00E9es avec succ\u00E8s"));
                res.json(sectionsFormat);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[SECTIONS→CATEGORIES] Erreur POST/bulk:', error_2);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la création des sections'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST - Créer une nouvelle Category
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, description, iconName, iconColor, order, active, organizationId, category, sectionFormat, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, description = _a.description, iconName = _a.iconName, iconColor = _a.iconColor, order = _a.order, active = _a.active, organizationId = _a.organizationId;
                console.log("[SECTIONS\u2192CATEGORIES] POST - Cr\u00E9ation Category \"".concat(name_1, "\""));
                return [4 /*yield*/, prisma.category.create({
                        data: {
                            name: name_1,
                            description: description || "Category ".concat(name_1),
                            icon: iconName || 'AppstoreOutlined',
                            iconColor: iconColor || '#1890ff',
                            order: order || 999,
                            active: active !== false,
                            organizationId: organizationId,
                            superAdminOnly: false
                        }
                    })];
            case 1:
                category = _b.sent();
                sectionFormat = {
                    id: category.id,
                    title: category.name,
                    description: category.description || '',
                    iconName: category.icon,
                    iconColor: category.iconColor,
                    order: category.order,
                    active: category.active,
                    organizationId: category.organizationId,
                    createdAt: category.createdAt.toISOString(),
                    updatedAt: category.updatedAt.toISOString()
                };
                console.log("[SECTIONS\u2192CATEGORIES] Category \"".concat(name_1, "\" cr\u00E9\u00E9e avec succ\u00E8s"));
                res.json({ success: true, data: sectionFormat });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('[SECTIONS→CATEGORIES] Erreur POST:', error_3);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la création de la section'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PATCH - Mettre à jour une Category
router.patch('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, updateData, categoryUpdateData, category, sectionFormat, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                updateData = req.body;
                console.log("[SECTIONS\u2192CATEGORIES] PATCH - Mise \u00E0 jour Category ".concat(id));
                categoryUpdateData = {};
                if (updateData.title)
                    categoryUpdateData.name = updateData.title;
                if (updateData.description !== undefined)
                    categoryUpdateData.description = updateData.description;
                if (updateData.iconName)
                    categoryUpdateData.icon = updateData.iconName;
                if (updateData.iconColor)
                    categoryUpdateData.iconColor = updateData.iconColor;
                if (updateData.order !== undefined)
                    categoryUpdateData.order = updateData.order;
                if (updateData.active !== undefined)
                    categoryUpdateData.active = updateData.active;
                return [4 /*yield*/, prisma.category.update({
                        where: { id: id },
                        data: categoryUpdateData
                    })];
            case 1:
                category = _a.sent();
                sectionFormat = {
                    id: category.id,
                    title: category.name,
                    description: category.description || '',
                    iconName: category.icon,
                    iconColor: category.iconColor,
                    order: category.order,
                    active: category.active,
                    organizationId: category.organizationId,
                    createdAt: category.createdAt.toISOString(),
                    updatedAt: category.updatedAt.toISOString()
                };
                console.log("[SECTIONS\u2192CATEGORIES] Category ".concat(id, " mise \u00E0 jour avec succ\u00E8s"));
                res.json(sectionFormat);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('[SECTIONS→CATEGORIES] Erreur PATCH:', error_4);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la mise à jour de la section'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE - Supprimer une Category
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                console.log("[SECTIONS\u2192CATEGORIES] DELETE - Suppression Category ".concat(id));
                return [4 /*yield*/, prisma.category.delete({
                        where: { id: id }
                    })];
            case 1:
                _a.sent();
                console.log("[SECTIONS\u2192CATEGORIES] Category ".concat(id, " supprim\u00E9e avec succ\u00E8s"));
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('[SECTIONS→CATEGORIES] Erreur DELETE:', error_5);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la suppression de la section'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

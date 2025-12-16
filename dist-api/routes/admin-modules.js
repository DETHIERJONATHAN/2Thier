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
var prisma_1 = require("../lib/prisma");
var router = (0, express_1.Router)();
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// GET - Récupérer TOUS les modules organisés par sections (100% dynamique depuis BDD)
// ⚠️ ANCIENNE API - Utilise system section/module classique MAIS avec support Category
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, user, isSuperAdmin, fallbackIcon_1, modules, allCategories, sectionsMap_1, sections, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                organizationId = req.query.organizationId;
                user = req.user;
                isSuperAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'super_admin';
                console.log('[ADMIN-MODULES-V1] GET - Récupération modules par sections (système hybride)');
                console.log('[ADMIN-MODULES-V1] 👤 User:', user === null || user === void 0 ? void 0 : user.email, 'Role:', user === null || user === void 0 ? void 0 : user.role, 'IsSuperAdmin:', isSuperAdmin);
                fallbackIcon_1 = 'AppstoreOutlined';
                return [4 /*yield*/, prisma_1.prisma.module.findMany({
                        where: organizationId ? {
                            OR: [
                                { organizationId: organizationId },
                                { organizationId: null } // Modules globaux
                            ]
                        } : undefined,
                        orderBy: { order: 'asc' },
                        include: {
                            Organization: true,
                            Category: true, // ✅ Inclure la nouvelle relation Category
                            OrganizationModuleStatus: organizationId ? {
                                where: { organizationId: organizationId }
                            } : true,
                            Permission: true
                        }
                    })];
            case 1:
                modules = _a.sent();
                return [4 /*yield*/, prisma_1.prisma.category.findMany({
                        where: {
                            AND: __spreadArray([
                                // Filtrage par organisation
                                organizationId ? {
                                    OR: [
                                        { organizationId: organizationId },
                                        { organizationId: null } // Catégories globales
                                    ]
                                } : {}
                            ], (isSuperAdmin ? [] : [{ superAdminOnly: false }]), true)
                        },
                        orderBy: { order: 'asc' }
                    })];
            case 2:
                allCategories = _a.sent();
                sectionsMap_1 = new Map();
                // 1. Ajouter TOUTES les catégories (même vides)
                allCategories.forEach(function (category) {
                    var _a, _b;
                    var sectionKey = "category_".concat(category.id);
                    sectionsMap_1.set(sectionKey, {
                        id: category.id,
                        backendCategoryId: category.id, // ✅ identifiant réel BDD
                        title: category.name,
                        iconName: category.icon || fallbackIcon_1,
                        iconColor: category.iconColor || '#1890ff',
                        order: category.order || 999,
                        active: (_a = category.active) !== null && _a !== void 0 ? _a : true,
                        superAdminOnly: (_b = category.superAdminOnly) !== null && _b !== void 0 ? _b : false,
                        isRealCategory: true,
                        modules: []
                    });
                });
                // 2. Ensuite, assigner les modules aux catégories
                modules.forEach(function (module) {
                    var _a, _b, _c, _d, _e, _f;
                    // Utiliser la VRAIE catégorie de la BDD, pas le feature
                    var sectionKey, sectionName, sectionIcon, sectionColor, sectionOrder, sectionId, sectionActive, sectionSuperAdminOnly;
                    if (module.Category) {
                        // Module avec une vraie catégorie BDD
                        sectionKey = "category_".concat(module.Category.id);
                        sectionName = module.Category.name;
                        sectionIcon = module.Category.icon || fallbackIcon_1;
                        sectionColor = module.Category.iconColor || '#1890ff';
                        sectionOrder = module.Category.order || 999;
                        sectionId = module.Category.id;
                        sectionActive = (_a = module.Category.active) !== null && _a !== void 0 ? _a : true;
                        sectionSuperAdminOnly = (_b = module.Category.superAdminOnly) !== null && _b !== void 0 ? _b : false;
                    }
                    else {
                        // Fallback pour modules sans catégorie (utiliser feature ou "Non classé")
                        var fallbackName = module.feature ?
                            module.feature.charAt(0).toUpperCase() + module.feature.slice(1) :
                            'Non classé';
                        sectionKey = "feature_".concat(fallbackName);
                        sectionName = fallbackName;
                        sectionIcon = module.icon || fallbackIcon_1;
                        sectionColor = '#1890ff';
                        sectionOrder = module.order ? Math.floor(module.order / 10) * 10 : 999;
                        sectionId = fallbackName; // Pas d'ID pour les fallbacks
                        sectionActive = true;
                        sectionSuperAdminOnly = false;
                        // Créer la section fallback si elle n'existe pas
                        if (!sectionsMap_1.has(sectionKey)) {
                            sectionsMap_1.set(sectionKey, {
                                id: sectionId,
                                backendCategoryId: null, // ❌ pas de catégorie BDD
                                title: sectionName,
                                iconName: sectionIcon,
                                iconColor: sectionColor,
                                order: sectionOrder,
                                active: sectionActive,
                                superAdminOnly: sectionSuperAdminOnly,
                                isRealCategory: false,
                                modules: []
                            });
                        }
                    }
                    // Ajouter le module à la section (elle existe déjà grâce à l'étape 1)
                    if (sectionsMap_1.has(sectionKey)) {
                        sectionsMap_1.get(sectionKey).modules.push(__assign(__assign({}, module), { 
                            // Enrichir avec les données de statut
                            isActiveForOrg: (_e = (_d = (_c = module.OrganizationModuleStatus) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.active) !== null && _e !== void 0 ? _e : true, hasOrgSpecificConfig: ((_f = module.OrganizationModuleStatus) === null || _f === void 0 ? void 0 : _f.length) > 0 }));
                    }
                });
                sections = Array.from(sectionsMap_1.values()).sort(function (a, b) { return a.order - b.order; });
                console.log("[ADMIN-MODULES-V1] Sections cr\u00E9\u00E9es: ".concat(sections.length, " (syst\u00E8me par cat\u00E9gories)"));
                console.log("[ADMIN-MODULES-V1] Total modules: ".concat(modules.length));
                res.json({
                    success: true,
                    data: {
                        sections: sections,
                        totalModules: modules.length,
                        totalSections: sections.length,
                        systemType: 'hybrid', // Indicateur pour le frontend
                        categorySystemAvailable: modules.some(function (m) { return m.categoryId; }) // ✅ Y a-t-il des modules avec categoryId ?
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('[ADMIN-MODULES-V1] Erreur GET:', error_1);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des modules',
                    details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ===== ROUTES CATEGORIES SYSTEM =====
// GET - Récupérer toutes les categories (pour l'admin des modules)
router.get('/categories', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, categories, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.query.organizationId;
                console.log('[ADMIN-MODULES] GET /categories - Récupération des categories');
                return [4 /*yield*/, prisma_1.prisma.category.findMany({
                        where: organizationId ? {
                            OR: [
                                { organizationId: organizationId },
                                { organizationId: null } // Categories globales
                            ]
                        } : undefined,
                        orderBy: { order: 'asc' },
                        include: {
                            _count: {
                                select: {
                                    Module: true // Compter les modules dans chaque category
                                }
                            }
                        }
                    })];
            case 1:
                categories = _a.sent();
                console.log("[ADMIN-MODULES] ".concat(categories.length, " categories trouv\u00E9es"));
                res.json({
                    success: true,
                    data: categories,
                    total: categories.length
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[ADMIN-MODULES] Erreur GET /categories:', error_2);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des categories',
                    details: error_2 instanceof Error ? error_2.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST - Créer une nouvelle category
router.post('/categories', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, description, icon, iconColor, order, organizationId, randomUUID, categoryId, now, category, error_3, code;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, name_1 = _a.name, description = _a.description, icon = _a.icon, iconColor = _a.iconColor, order = _a.order, organizationId = _a.organizationId;
                // Validation minimale du payload
                if (!name_1 || typeof name_1 !== 'string' || !name_1.trim()) {
                    res.status(400).json({ success: false, error: 'Le champ "name" est requis pour créer une catégorie.' });
                    return [2 /*return*/];
                }
                console.log('[ADMIN-MODULES] POST /categories - Création category:', { name: name_1, icon: icon, organizationId: organizationId });
                return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('crypto')); })];
            case 1:
                randomUUID = (_b.sent()).randomUUID;
                categoryId = randomUUID();
                now = new Date();
                return [4 /*yield*/, prisma_1.prisma.category.create({
                        data: {
                            id: categoryId,
                            name: name_1.trim(),
                            description: description || null,
                            icon: icon || 'AppstoreOutlined',
                            iconColor: iconColor || '#1890ff',
                            order: typeof order === 'number' ? order : 0,
                            organizationId: organizationId || null,
                            active: true,
                            // Le schéma ne définit pas @updatedAt ni de default → fournir explicitement
                            updatedAt: now,
                        }
                    })];
            case 2:
                category = _b.sent();
                console.log("[ADMIN-MODULES] Category cr\u00E9\u00E9e: ".concat(category.id));
                res.json({
                    success: true,
                    data: category
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                code = error_3 === null || error_3 === void 0 ? void 0 : error_3.code;
                if (code === 'P2003') {
                    // Contrainte FK échouée (ex: organizationId invalide)
                    res.status(400).json({ success: false, error: 'organizationId invalide' });
                    return [2 /*return*/];
                }
                console.error('[ADMIN-MODULES] Erreur POST /categories:', error_3);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la création de la category',
                    details: error_3 instanceof Error ? error_3.message : 'Unknown error'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// PUT - Réorganiser les categories (drag & drop) - DOIT être avant /:id
router.put('/categories/reorder', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var updates, _i, updates_1, update, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                updates = req.body.updates;
                console.log('[ADMIN-MODULES] PUT /categories/reorder - Réorganisation categories:', updates.length);
                _i = 0, updates_1 = updates;
                _a.label = 1;
            case 1:
                if (!(_i < updates_1.length)) return [3 /*break*/, 4];
                update = updates_1[_i];
                return [4 /*yield*/, prisma_1.prisma.category.update({
                        where: { id: update.id },
                        data: {
                            order: update.order,
                            updatedAt: new Date()
                        }
                    })];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                console.log("[ADMIN-MODULES] ".concat(updates.length, " categories r\u00E9organis\u00E9es"));
                res.json({
                    success: true,
                    message: "".concat(updates.length, " categories r\u00E9organis\u00E9es avec succ\u00E8s")
                });
                return [3 /*break*/, 6];
            case 5:
                error_4 = _a.sent();
                console.error('[ADMIN-MODULES] Erreur PUT /categories/reorder:', error_4);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la réorganisation des categories',
                    details: error_4 instanceof Error ? error_4.message : 'Unknown error'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// PUT - Modifier une category existante
router.put('/categories/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, name_2, description, icon, iconColor, order, active, superAdminOnly, finalActive, category, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, name_2 = _a.name, description = _a.description, icon = _a.icon, iconColor = _a.iconColor, order = _a.order, active = _a.active, superAdminOnly = _a.superAdminOnly;
                console.log('[ADMIN-MODULES] PUT /categories/:id - Modification category:', { id: id, name: name_2, active: active, superAdminOnly: superAdminOnly });
                finalActive = superAdminOnly ? false : active;
                if (superAdminOnly && active) {
                    console.log('[ADMIN-MODULES] SuperAdminOnly activé - Désactivation automatique du module pour les organisations');
                }
                return [4 /*yield*/, prisma_1.prisma.category.update({
                        where: { id: id },
                        data: {
                            name: name_2,
                            description: description,
                            icon: icon,
                            iconColor: iconColor,
                            order: order,
                            active: finalActive,
                            superAdminOnly: superAdminOnly !== null && superAdminOnly !== void 0 ? superAdminOnly : false,
                            updatedAt: new Date()
                        }
                    })];
            case 1:
                category = _b.sent();
                console.log("[ADMIN-MODULES] Category modifi\u00E9e: ".concat(category.id));
                res.json({
                    success: true,
                    data: category
                });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _b.sent();
                console.error('[ADMIN-MODULES] Erreur PUT /categories/:id:', error_5);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la modification de la category',
                    details: error_5 instanceof Error ? error_5.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE - Supprimer une category
router.delete('/categories/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, moduleCount, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                console.log('[ADMIN-MODULES] DELETE /categories/:id - Suppression category:', { id: id });
                return [4 /*yield*/, prisma_1.prisma.module.count({
                        where: { categoryId: id }
                    })];
            case 1:
                moduleCount = _a.sent();
                if (moduleCount > 0) {
                    res.status(400).json({
                        success: false,
                        error: "Cannot delete category with ".concat(moduleCount, " modules attached")
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma_1.prisma.category.delete({
                        where: { id: id }
                    })];
            case 2:
                _a.sent();
                console.log("[ADMIN-MODULES] Category supprim\u00E9e: ".concat(id));
                res.json({
                    success: true,
                    message: 'Category supprimée avec succès'
                });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                console.error('[ADMIN-MODULES] Erreur DELETE /categories/:id:', error_6);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la suppression de la category',
                    details: error_6 instanceof Error ? error_6.message : 'Unknown error'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// PUT - Modifier un module existant (pour les toggles)
router.put('/modules/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, active, superAdminOnly, finalActive, module_1, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, active = _a.active, superAdminOnly = _a.superAdminOnly;
                console.log('[ADMIN-MODULES] PUT /modules/:id - Modification module:', { id: id, active: active, superAdminOnly: superAdminOnly });
                finalActive = superAdminOnly ? false : active;
                if (superAdminOnly && active) {
                    console.log('[ADMIN-MODULES] SuperAdminOnly activé - Désactivation automatique du module pour les organisations');
                }
                return [4 /*yield*/, prisma_1.prisma.module.update({
                        where: { id: id },
                        data: {
                            active: finalActive,
                            superAdminOnly: superAdminOnly !== null && superAdminOnly !== void 0 ? superAdminOnly : false,
                            updatedAt: new Date()
                        }
                    })];
            case 1:
                module_1 = _b.sent();
                console.log("[ADMIN-MODULES] Module modifi\u00E9: ".concat(module_1.id));
                res.json({
                    success: true,
                    data: module_1
                });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _b.sent();
                console.error('[ADMIN-MODULES] Erreur PUT /modules/:id:', error_7);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la modification du module',
                    details: error_7 instanceof Error ? error_7.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE - Supprimer un module (alias de compatibilité)
router.delete('/modules/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                id = req.params.id;
                console.log('[ADMIN-MODULES] DELETE /modules/:id (alias) - Suppression module:', { id: id });
                // Supprimer d'abord les statuts et permissions liés (meilleur effort)
                return [4 /*yield*/, prisma_1.prisma.organizationModuleStatus.deleteMany({ where: { moduleId: id } })];
            case 1:
                // Supprimer d'abord les statuts et permissions liés (meilleur effort)
                _a.sent();
                return [4 /*yield*/, prisma_1.prisma.permission.deleteMany({ where: { moduleId: id } }).catch(function () { })];
            case 2:
                _a.sent();
                return [4 /*yield*/, prisma_1.prisma.module.delete({ where: { id: id } })];
            case 3:
                _a.sent();
                res.json({ success: true, data: { id: id } });
                return [3 /*break*/, 5];
            case 4:
                error_8 = _a.sent();
                console.error('[ADMIN-MODULES] Erreur DELETE /modules/:id (alias):', error_8);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la suppression du module',
                    details: error_8 instanceof Error ? error_8.message : 'Unknown error'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

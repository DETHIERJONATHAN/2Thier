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
var prisma_1 = require("../lib/prisma");
var router = (0, express_1.Router)();
// Appliquer les middlewares d'authentification
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// 🗂️ NAVIGATION DES MODULES - Organise les modules par catégories pour l'interface
// ⚠️  Ne pas confondre avec les sections de formulaires (table Section)
// GET - Récupérer les sections de navigation basées sur la table Category avec toutes les vérifications de sécurité
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId_1, user, isSuperAdmin, userOrganizationId, userOrg, whereCategories, categories, sections, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                console.log('🔍 [module-navigation] Route appelée - Système Category');
                console.log('🔍 [module-navigation] User:', req.user);
                console.log('🔍 [module-navigation] Prisma client status:', typeof prisma_1.prisma, !!prisma_1.prisma);
                organizationId_1 = req.query.organizationId;
                if (!organizationId_1) {
                    console.log('❌ [module-navigation] organizationId manquant');
                    res.status(400).json({ error: 'organizationId required' });
                    return [2 /*return*/];
                }
                console.log('[API] GET /api/module-navigation - Système Category avec sécurité multifacteur pour org:', organizationId_1);
                user = req.user;
                isSuperAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'super_admin';
                console.log("[API] Utilisateur: ".concat(user === null || user === void 0 ? void 0 : user.email, " (").concat(user === null || user === void 0 ? void 0 : user.role, "), SuperAdmin: ").concat(isSuperAdmin));
                userOrganizationId = user === null || user === void 0 ? void 0 : user.organizationId;
                if (!(!userOrganizationId && (user === null || user === void 0 ? void 0 : user.id))) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma_1.prisma.userOrganization.findFirst({
                        where: { userId: user.id }
                    })];
            case 1:
                userOrg = _a.sent();
                userOrganizationId = userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId;
                console.log("[API] OrganizationId r\u00E9cup\u00E9r\u00E9 via UserOrganization: ".concat(userOrganizationId));
                _a.label = 2;
            case 2:
                whereCategories = {
                    AND: __spreadArray([
                        // Catégories actives uniquement
                        { active: true },
                        // Catégories globales OU spécifiques à l'organisation
                        {
                            OR: [
                                { organizationId: null }, // Catégories globales
                                { organizationId: organizationId_1 } // Catégories spécifiques à l'org
                            ]
                        }
                    ], (isSuperAdmin ? [] : [{ superAdminOnly: false }]), true)
                };
                return [4 /*yield*/, prisma_1.prisma.category.findMany({
                        where: whereCategories,
                        include: {
                            // Inclure les modules associés
                            Module: {
                                where: {
                                    AND: __spreadArray(__spreadArray([
                                        // Modules actifs uniquement
                                        { active: true }
                                    ], (isSuperAdmin ? [] : [{ superAdminOnly: false }]), true), [
                                        // Modules pour cette organisation ou modules globaux
                                        {
                                            OR: __spreadArray(__spreadArray([], (userOrganizationId ? [{ organizationId: userOrganizationId }] : []), true), (isSuperAdmin ? [{ organizationId: null }] : []), true)
                                        }
                                    ], false)
                                },
                                orderBy: { order: 'asc' }
                            }
                        },
                        orderBy: { order: 'asc' }
                    })];
            case 3:
                categories = _a.sent();
                console.log("[API] ".concat(categories.length, " cat\u00E9gories trouv\u00E9es"));
                sections = categories.map(function (category) { return ({
                    id: "section-".concat(category.id),
                    title: category.name,
                    description: category.description || category.Module.map(function (m) { return m.label; }).join(', '),
                    icon: category.icon,
                    iconColor: category.iconColor,
                    order: category.order,
                    organizationId: organizationId_1,
                    modules: category.Module.map(function (module) { return (__assign(__assign({}, module), { category: category.name, categoryIcon: category.icon, categoryColor: category.iconColor })); }),
                    createdAt: category.createdAt.toISOString(),
                    updatedAt: category.updatedAt.toISOString(),
                    // Métadonnées pour debugging
                    categoryId: category.id,
                    superAdminOnly: category.superAdminOnly,
                    allowedRoles: category.allowedRoles,
                    requiredPermissions: category.requiredPermissions
                }); });
                console.log('[API] Sections créées depuis les catégories:', sections.length);
                console.log('[API] Sections:', sections.map(function (s) { return "".concat(s.title, " (").concat(s.modules.length, " modules)"); }));
                res.json(sections);
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                console.error('[API] Erreur système Category:', error_1);
                res.status(500).json({ error: 'Erreur lors de la récupération des catégories depuis la table Category' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

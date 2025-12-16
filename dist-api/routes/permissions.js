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
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// Helper pour obtenir l'utilisateur effectif (gère l'usurpation d'identité)
var getEffectiveUser = function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var originalUser, impersonatedUser, userOrg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                originalUser = req.user;
                impersonatedUser = req.impersonatedUser;
                if (!(originalUser && originalUser.role === 'super_admin' && impersonatedUser)) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.userOrganization.findFirst({
                        where: { userId: impersonatedUser.id },
                        select: { organizationId: true }
                    })];
            case 1:
                userOrg = _a.sent();
                return [2 /*return*/, {
                        userId: impersonatedUser.id,
                        role: impersonatedUser.role,
                        organizationId: req.impersonatedOrganizationId || (userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId),
                    }];
            case 2: return [2 /*return*/, req.user];
        }
    });
}); };
// GET /api/permissions?roleId=...&organizationId=...
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, roleId, organizationId, effectiveUser, role, isEffectivelySuperAdmin, permissions, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, roleId = _a.roleId, organizationId = _a.organizationId;
                if (!req.user) {
                    res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getEffectiveUser(req)];
            case 1:
                effectiveUser = _b.sent();
                if (!effectiveUser) {
                    res.status(401).json({ success: false, message: "Utilisateur effectif non déterminé." });
                    return [2 /*return*/];
                }
                if (!roleId) {
                    res.status(400).json({ success: false, message: 'Le paramètre roleId est manquant' });
                    return [2 /*return*/];
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 5, , 6]);
                return [4 /*yield*/, prisma.role.findUnique({
                        where: { id: roleId },
                    })];
            case 3:
                role = _b.sent();
                if (!role) {
                    res.status(404).json({ success: false, message: "Rôle non trouvé." });
                    return [2 /*return*/];
                }
                isEffectivelySuperAdmin = effectiveUser.role === 'super_admin';
                if (!isEffectivelySuperAdmin) {
                    if (!effectiveUser.organizationId || role.organizationId !== effectiveUser.organizationId) {
                        res.status(403).json({ success: false, message: "Vous n'avez pas la permission de voir les permissions de ce rôle." });
                        return [2 /*return*/];
                    }
                }
                else {
                    if (organizationId && role.organizationId && role.organizationId !== organizationId) {
                        res.status(403).json({ success: false, message: "Ce rôle n'appartient pas à l'organisation sélectionnée." });
                        return [2 /*return*/];
                    }
                }
                return [4 /*yield*/, prisma.permission.findMany({
                        where: {
                            roleId: roleId,
                        },
                    })];
            case 4:
                permissions = _b.sent();
                res.json({ success: true, data: permissions });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _b.sent();
                console.error('[API][permissions] Erreur lors de la récupération des permissions :', error_1);
                res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST /api/permissions/bulk - Met à jour plusieurs permissions pour un rôle
router.post('/bulk', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, roleId, permissions, organizationId, effectiveUser, roleToUpdate_1, isEffectivelySuperAdmin, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, roleId = _a.roleId, permissions = _a.permissions, organizationId = _a.organizationId;
                if (!req.user) {
                    res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getEffectiveUser(req)];
            case 1:
                effectiveUser = _b.sent();
                if (!effectiveUser) {
                    res.status(401).json({ success: false, message: "Utilisateur effectif non déterminé." });
                    return [2 /*return*/];
                }
                if (!roleId || !Array.isArray(permissions)) {
                    res.status(400).json({ success: false, message: 'Paramètres invalides' });
                    return [2 /*return*/];
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 5, , 6]);
                return [4 /*yield*/, prisma.role.findUnique({
                        where: { id: roleId },
                    })];
            case 3:
                roleToUpdate_1 = _b.sent();
                if (!roleToUpdate_1) {
                    res.status(404).json({ success: false, message: "Rôle non trouvé." });
                    return [2 /*return*/];
                }
                isEffectivelySuperAdmin = effectiveUser.role === 'super_admin';
                if (!isEffectivelySuperAdmin) {
                    if (!effectiveUser.organizationId || roleToUpdate_1.organizationId !== effectiveUser.organizationId) {
                        res.status(403).json({ success: false, message: "Vous n'avez pas la permission de modifier ce rôle." });
                        return [2 /*return*/];
                    }
                }
                else {
                    if (organizationId && roleToUpdate_1.organizationId && roleToUpdate_1.organizationId !== organizationId) {
                        res.status(403).json({ success: false, message: "Ce rôle n'appartient pas à l'organisation sélectionnée." });
                        return [2 /*return*/];
                    }
                }
                return [4 /*yield*/, prisma.$transaction(__spreadArray([
                        prisma.permission.deleteMany({
                            where: {
                                roleId: roleId,
                            }
                        })
                    ], (permissions.length > 0 ? [prisma.permission.createMany({
                            data: permissions.map(function (p) { return ({
                                id: "perm_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
                                roleId: roleId,
                                organizationId: roleToUpdate_1.organizationId || null,
                                moduleId: p.moduleId,
                                action: p.action,
                                resource: p.resource,
                                allowed: p.allowed,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }); }),
                            skipDuplicates: true,
                        })] : []), true))];
            case 4:
                _b.sent();
                res.status(200).json({ success: true, message: 'Permissions mises à jour avec succès' });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _b.sent();
                console.error('[API][permissions/bulk] Erreur lors de la mise à jour en masse:', error_2);
                res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST /api/permissions - Route racine pour la compatibilité avec le frontend
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, roleId, permissions, organizationId, effectiveUser, roleToUpdate_2, isEffectivelySuperAdmin, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, roleId = _a.roleId, permissions = _a.permissions, organizationId = _a.organizationId;
                if (!req.user) {
                    res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getEffectiveUser(req)];
            case 1:
                effectiveUser = _b.sent();
                if (!effectiveUser) {
                    res.status(401).json({ success: false, message: "Utilisateur effectif non déterminé." });
                    return [2 /*return*/];
                }
                if (!roleId || !Array.isArray(permissions)) {
                    res.status(400).json({ success: false, message: 'Paramètres invalides' });
                    return [2 /*return*/];
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 5, , 6]);
                return [4 /*yield*/, prisma.role.findUnique({
                        where: { id: roleId },
                    })];
            case 3:
                roleToUpdate_2 = _b.sent();
                if (!roleToUpdate_2) {
                    res.status(404).json({ success: false, message: "Rôle non trouvé." });
                    return [2 /*return*/];
                }
                isEffectivelySuperAdmin = effectiveUser.role === 'super_admin';
                if (!isEffectivelySuperAdmin) {
                    if (!effectiveUser.organizationId || roleToUpdate_2.organizationId !== effectiveUser.organizationId) {
                        res.status(403).json({ success: false, message: "Vous n'avez pas la permission de modifier ce rôle." });
                        return [2 /*return*/];
                    }
                }
                else {
                    if (organizationId && roleToUpdate_2.organizationId && roleToUpdate_2.organizationId !== organizationId) {
                        res.status(403).json({ success: false, message: "Ce rôle n'appartient pas à l'organisation sélectionnée." });
                        return [2 /*return*/];
                    }
                }
                return [4 /*yield*/, prisma.$transaction(__spreadArray([
                        prisma.permission.deleteMany({
                            where: {
                                roleId: roleId,
                            }
                        })
                    ], (permissions.length > 0 ? [prisma.permission.createMany({
                            data: permissions.map(function (p) { return ({
                                id: "perm_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
                                roleId: roleId,
                                organizationId: roleToUpdate_2.organizationId || null,
                                moduleId: p.moduleId,
                                action: p.action,
                                resource: p.resource,
                                allowed: p.allowed,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }); }),
                            skipDuplicates: true,
                        })] : []), true))];
            case 4:
                _b.sent();
                res.status(200).json({ success: true, message: 'Permissions mises à jour avec succès' });
                return [3 /*break*/, 6];
            case 5:
                error_3 = _b.sent();
                console.error('[API][permissions] Erreur lors de la mise à jour:', error_3);
                res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

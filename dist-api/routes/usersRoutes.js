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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var invitations_js_1 = __importDefault(require("./invitations.js"));
var client_1 = require("@prisma/client");
var zod_1 = require("zod");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🧹 SANITISATION SIMPLE (sans DOMPurify)
var sanitizeString = function (input) {
    return input.trim().replace(/[<>]/g, ''); // Supprime < et >
};
// 🔒 VALIDATION ZOD ULTRA-STRICTE
var userUpdateSchema = zod_1.z.object({
    // Accepter des IDs non-UUID (ex: cuid, chaînes custom)
    roleId: zod_1.z.string().min(1, 'ID rôle requis').optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE'], {
        errorMap: function () { return ({ message: 'Statut doit être ACTIVE ou INACTIVE' }); }
    }).optional()
});
var userOrganizationSchema = zod_1.z.object({
    // IDs non-UUID supportés
    userId: zod_1.z.string().min(1, 'ID utilisateur requis'),
    organizationId: zod_1.z.string().min(1, 'ID organisation requis'),
    roleId: zod_1.z.string().min(1, 'ID rôle requis')
});
// 🛡️ RATE LIMITING ADAPTÉ
var usersRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requêtes max
    message: {
        success: false,
        message: 'Trop de requêtes utilisateurs, réessayez plus tard'
    }
});
var usersModifyRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // 30 modifications max
    message: {
        success: false,
        message: 'Trop de modifications utilisateurs, réessayez plus tard'
    }
});
// 🔧 GESTION ERREURS ZOD CENTRALISÉE
var handleZodError = function (error) {
    return {
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); })
    };
};
// Appliquer l'authentification et rate limiting
router.use(auth_js_1.authMiddleware);
router.use(usersRateLimit);
// Monter les routes d'invitations sous /users/invitations
router.use('/invitations', invitations_js_1.default);
// 🏷️ GET /api/users/free - SÉCURISÉ AVEC ZOD + SANITISATION
router.get('/free', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var freeUsers, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[USERS] GET /users/free - Récupération utilisateurs libres SÉCURISÉE');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.user.findMany({
                        where: {
                            UserOrganization: {
                                none: {}
                            }
                        },
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            createdAt: true,
                            status: true
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 2:
                freeUsers = _a.sent();
                console.log("[USERS] Found ".concat(freeUsers.length, " free users"));
                res.json({ success: true, data: freeUsers });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('[USERS] Erreur récupération utilisateurs libres:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération des utilisateurs libres'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🏷️ GET /api/users - SÉCURISÉ AVEC LOGIQUE SUPER ADMIN
router.get('/', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionUser, allUsers, organizationId, usersInOrg, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[USERS] GET /users - Récupération utilisateurs SÉCURISÉE');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                sessionUser = req.user;
                if (!(sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.isSuperAdmin)) return [3 /*break*/, 3];
                console.log('[USERS] SuperAdmin request - showing ALL users');
                return [4 /*yield*/, prisma.user.findMany({
                        include: {
                            UserOrganization: {
                                include: {
                                    Role: true,
                                    Organization: {
                                        include: {
                                            GoogleWorkspaceConfig: true
                                        }
                                    },
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 2:
                allUsers = _a.sent();
                console.log("[USERS] Found ".concat(allUsers.length, " total users for SuperAdmin"));
                return [2 /*return*/, res.json({ success: true, data: allUsers })];
            case 3:
                organizationId = sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: "L'ID de l'organisation est manquant"
                        })];
                }
                console.log("[USERS] Standard user request - org: ".concat(organizationId));
                return [4 /*yield*/, prisma.user.findMany({
                        where: {
                            UserOrganization: {
                                some: { organizationId: organizationId }
                            }
                        },
                        include: {
                            UserOrganization: {
                                where: { organizationId: organizationId },
                                include: {
                                    Role: true,
                                    Organization: {
                                        include: {
                                            GoogleWorkspaceConfig: true
                                        }
                                    },
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 4:
                usersInOrg = _a.sent();
                console.log("[USERS] Found ".concat(usersInOrg.length, " users for org ").concat(organizationId));
                res.json({ success: true, data: usersInOrg });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _a.sent();
                console.error('[USERS] Erreur récupération utilisateurs:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// 🏷️ GET /api/users/:userId/organizations - SÉCURISÉ
router.get('/:userId/organizations', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, userOrganizations, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.params.userId;
                console.log("[USERS] GET /users/".concat(userId, "/organizations - S\u00C9CURIS\u00C9"));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
                if (!userId || !zod_1.z.string().min(1).safeParse(userId).success) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'ID utilisateur invalide ou manquant'
                        })];
                }
                return [4 /*yield*/, prisma.userOrganization.findMany({
                        where: { userId: sanitizeString(userId) },
                        include: {
                            Organization: true,
                            Role: true,
                        },
                        orderBy: {
                            Organization: { name: 'asc' }
                        }
                    })];
            case 2:
                userOrganizations = _a.sent();
                console.log("[USERS] Found ".concat(userOrganizations.length, " organizations for user ").concat(userId));
                res.json({ success: true, data: userOrganizations });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error("[USERS] Erreur organisations utilisateur ".concat(userId, ":"), error_3);
                res.status(500).json({
                    success: false,
                    message: "Erreur interne du serveur"
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🏷️ POST /api/users/user-organizations - SÉCURISÉ AVEC ZOD
router.post('/user-organizations', usersModifyRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var validation, _a, userId, organizationId, roleId, newId, now, existingAssignment, newUserOrganization, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('[USERS] POST /users/user-organizations - Assignation SÉCURISÉE');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                validation = userOrganizationSchema.safeParse(req.body);
                if (!validation.success) {
                    console.log('[USERS] Validation échouée:', validation.error);
                    return [2 /*return*/, res.status(400).json(handleZodError(validation.error))];
                }
                _a = validation.data, userId = _a.userId, organizationId = _a.organizationId, roleId = _a.roleId;
                newId = "uo_".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 9));
                now = new Date();
                return [4 /*yield*/, prisma.userOrganization.findFirst({
                        where: { userId: userId, organizationId: organizationId }
                    })];
            case 2:
                existingAssignment = _b.sent();
                if (existingAssignment) {
                    return [2 /*return*/, res.status(409).json({
                            success: false,
                            message: "L'utilisateur est déjà dans cette organisation"
                        })];
                }
                return [4 /*yield*/, prisma.userOrganization.create({
                        data: {
                            id: newId,
                            userId: userId,
                            organizationId: organizationId,
                            roleId: roleId,
                            status: 'ACTIVE',
                            updatedAt: now
                        },
                        include: {
                            Organization: true,
                            Role: true,
                        }
                    })];
            case 3:
                newUserOrganization = _b.sent();
                console.log("[USERS] Assignation r\u00E9ussie: user ".concat(userId, " \u2192 org ").concat(organizationId));
                res.status(201).json({ success: true, data: newUserOrganization });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _b.sent();
                console.error('[USERS] Erreur assignation utilisateur:', error_4);
                res.status(500).json({
                    success: false,
                    message: "Erreur interne du serveur"
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 🏷️ PATCH /api/users/user-organizations/:userOrganizationId - SÉCURISÉ AVEC ZOD
router.patch('/user-organizations/:userOrganizationId', usersModifyRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userOrganizationId, validation, _a, roleId, status_1, updateData, updatedUserOrganization, error_5, e;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userOrganizationId = req.params.userOrganizationId;
                console.log("[USERS] PATCH /users/user-organizations/".concat(userOrganizationId, " - S\u00C9CURIS\u00C9"));
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
                if (!userOrganizationId || !zod_1.z.string().min(1).safeParse(userOrganizationId).success) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'ID relation utilisateur-organisation invalide ou manquant'
                        })];
                }
                validation = userUpdateSchema.safeParse(req.body);
                if (!validation.success) {
                    console.log('[USERS] Validation échouée:', validation.error);
                    return [2 /*return*/, res.status(400).json(handleZodError(validation.error))];
                }
                _a = validation.data, roleId = _a.roleId, status_1 = _a.status;
                updateData = {};
                if (roleId)
                    updateData.roleId = roleId;
                if (status_1)
                    updateData.status = status_1;
                updateData.updatedAt = new Date();
                if (Object.keys(updateData).length === 0) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: "Aucune donnée de mise à jour fournie"
                        })];
                }
                return [4 /*yield*/, prisma.userOrganization.update({
                        where: { id: sanitizeString(userOrganizationId) },
                        data: updateData,
                        include: {
                            Organization: true,
                            Role: true,
                            User: { select: { id: true, email: true, firstName: true, lastName: true } }
                        }
                    })];
            case 2:
                updatedUserOrganization = _b.sent();
                console.log("[USERS] Mise \u00E0 jour r\u00E9ussie: relation ".concat(userOrganizationId));
                res.json({ success: true, data: updatedUserOrganization });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _b.sent();
                e = error_5;
                if ((e === null || e === void 0 ? void 0 : e.code) === 'P2025') {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: "Relation utilisateur-organisation introuvable"
                        })];
                }
                console.error('[USERS] Erreur mise à jour utilisateur:', error_5);
                res.status(500).json({
                    success: false,
                    message: "Erreur interne du serveur"
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🏷️ DELETE /api/users/user-organizations/:userOrganizationId - SÉCURISÉ
router.delete('/user-organizations/:userOrganizationId', usersModifyRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userOrganizationId, relationToDelete, remainingRelations, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userOrganizationId = req.params.userOrganizationId;
                console.log("[USERS] DELETE /users/user-organizations/".concat(userOrganizationId, " - S\u00C9CURIS\u00C9"));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
                if (!userOrganizationId || !zod_1.z.string().min(1).safeParse(userOrganizationId).success) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'ID relation utilisateur-organisation invalide ou manquant'
                        })];
                }
                return [4 /*yield*/, prisma.userOrganization.findUnique({
                        where: { id: sanitizeString(userOrganizationId) },
                        select: { userId: true }
                    })];
            case 2:
                relationToDelete = _a.sent();
                if (!relationToDelete) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: "Relation non trouvée"
                        })];
                }
                return [4 /*yield*/, prisma.userOrganization.count({
                        where: {
                            userId: relationToDelete.userId,
                            id: { not: sanitizeString(userOrganizationId) }
                        }
                    })];
            case 3:
                remainingRelations = _a.sent();
                if (remainingRelations === 0) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: "Impossible de supprimer la dernière organisation de l'utilisateur"
                        })];
                }
                return [4 /*yield*/, prisma.userOrganization.delete({
                        where: { id: sanitizeString(userOrganizationId) }
                    })];
            case 4:
                _a.sent();
                console.log("[USERS] Suppression relation r\u00E9ussie: ".concat(userOrganizationId));
                res.json({ success: true, message: "Utilisateur retiré de l'organisation avec succès" });
                return [3 /*break*/, 6];
            case 5:
                error_6 = _a.sent();
                console.error('[USERS] Erreur suppression relation:', error_6);
                res.status(500).json({
                    success: false,
                    message: "Erreur interne du serveur"
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// 🏷️ PATCH /api/users/:userId - Modifier les informations utilisateur
router.patch('/:userId', usersModifyRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, userInfoSchema, validationResult, updateData, sessionUser, userToUpdate, userOrganization, updatedUser, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.params.userId;
                console.log("[USERS] PATCH /users/".concat(userId, " - Modification informations utilisateur"));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                userInfoSchema = zod_1.z.object({
                    firstName: zod_1.z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long').optional(),
                    lastName: zod_1.z.string().min(1, 'Nom requis').max(50, 'Nom trop long').optional(),
                    email: zod_1.z.string().email('Email invalide').optional(),
                    phoneNumber: zod_1.z.string().nullable().optional(),
                    address: zod_1.z.string().nullable().optional(),
                    vatNumber: zod_1.z.string().nullable().optional(),
                    avatarUrl: zod_1.z.string().url('URL avatar invalide').nullable().optional()
                });
                validationResult = userInfoSchema.safeParse(req.body);
                if (!validationResult.success) {
                    console.error('[USERS] Validation error:', validationResult.error.errors);
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Données invalides',
                            errors: validationResult.error.errors
                        })];
                }
                updateData = validationResult.data;
                sessionUser = req.user;
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: sanitizeString(userId) }
                    })];
            case 2:
                userToUpdate = _a.sent();
                if (!userToUpdate) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Utilisateur non trouvé'
                        })];
                }
                if (!!(sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.isSuperAdmin)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.userOrganization.findFirst({
                        where: {
                            userId: sanitizeString(userId),
                            organizationId: sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.organizationId
                        }
                    })];
            case 3:
                userOrganization = _a.sent();
                if (!userOrganization) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Vous ne pouvez modifier que les utilisateurs de votre organisation'
                        })];
                }
                _a.label = 4;
            case 4: return [4 /*yield*/, prisma.user.update({
                    where: { id: sanitizeString(userId) },
                    data: updateData,
                    include: {
                        UserOrganization: {
                            include: {
                                Role: true,
                                Organization: {
                                    include: {
                                        GoogleWorkspaceConfig: true
                                    }
                                }
                            }
                        }
                    }
                })];
            case 5:
                updatedUser = _a.sent();
                console.log("[USERS] User ".concat(sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.email, " updated user ").concat(updatedUser.email));
                res.json({
                    success: true,
                    message: 'Informations utilisateur mises à jour avec succès',
                    data: updatedUser
                });
                return [3 /*break*/, 7];
            case 6:
                error_7 = _a.sent();
                console.error('[USERS] Erreur modification utilisateur:', error_7);
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur lors de la modification'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// 🏷️ DELETE /api/users/:userId - ADMIN ET SUPER ADMIN - SÉCURISÉ
router.delete('/:userId', usersModifyRateLimit, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, sessionUser, userToDelete, isUserFree, isInSameOrg, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.params.userId;
                sessionUser = req.user;
                console.log("[USERS] DELETE /users/".concat(userId, " - ADMIN/SUPER ADMIN S\u00C9CURIS\u00C9"));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                // Validation souple: accepter toute chaîne non vide (IDs non-UUID)
                if (!userId || !zod_1.z.string().min(1).safeParse(userId).success) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'ID utilisateur invalide ou manquant'
                        })];
                }
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: sanitizeString(userId) },
                        include: { UserOrganization: true }
                    })];
            case 2:
                userToDelete = _a.sent();
                if (!userToDelete) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: "Utilisateur non trouvé"
                        })];
                }
                // Empêcher l'auto-suppression
                if (userToDelete.id === (sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.id)) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: "Vous ne pouvez pas supprimer votre propre compte"
                        })];
                }
                // LOGIQUE POUR ADMIN NON-SUPERADMIN
                if (!(sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.isSuperAdmin)) {
                    isUserFree = userToDelete.UserOrganization.length === 0;
                    isInSameOrg = userToDelete.UserOrganization.some(function (uo) { return uo.organizationId === (sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.organizationId); });
                    if (!isUserFree && !isInSameOrg) {
                        return [2 /*return*/, res.status(403).json({
                                success: false,
                                message: "Vous ne pouvez supprimer que les utilisateurs libres ou de votre organisation"
                            })];
                    }
                }
                // Transaction sécurisée
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: 
                                // Supprimer toutes les relations UserOrganization
                                return [4 /*yield*/, tx.userOrganization.deleteMany({
                                        where: { userId: sanitizeString(userId) }
                                    })];
                                case 1:
                                    // Supprimer toutes les relations UserOrganization
                                    _a.sent();
                                    // Supprimer l'utilisateur
                                    return [4 /*yield*/, tx.user.delete({
                                            where: { id: sanitizeString(userId) }
                                        })];
                                case 2:
                                    // Supprimer l'utilisateur
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 3:
                // Transaction sécurisée
                _a.sent();
                console.log("[USERS] User ".concat(sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.email, " deleted user ").concat(userToDelete.email));
                res.json({
                    success: true,
                    message: "Utilisateur ".concat(userToDelete.email, " supprim\u00E9 avec succ\u00E8s")
                });
                return [3 /*break*/, 5];
            case 4:
                error_8 = _a.sent();
                console.error('[USERS] Erreur suppression utilisateur:', error_8);
                res.status(500).json({
                    success: false,
                    message: "Erreur interne du serveur lors de la suppression"
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 📊 NOUVEAU ENDPOINT: Résumé des droits d'un utilisateur dans une organisation
router.get('/:userId/rights-summary', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, organizationId, userWithOrgInfo, userOrgRelation, organization, role, permissions, permissionsByModule_1, rightsSummary, isSuperAdminRole, moduleIds, rawPerms, synthetic_1, error_9;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                userId = req.params.userId;
                organizationId = req.query.organizationId;
                console.log("[USERS] R\u00E9cup\u00E9ration du r\u00E9sum\u00E9 des droits pour utilisateur ".concat(userId, " dans organisation ").concat(organizationId));
                if (!userId || !organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'ID utilisateur et organisation requis'
                        })];
                }
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: sanitizeString(userId) },
                        include: {
                            UserOrganization: {
                                where: { organizationId: sanitizeString(organizationId) },
                                include: {
                                    Role: {
                                        include: {
                                            Permission: {
                                                include: {
                                                    Module: true
                                                }
                                            }
                                        }
                                    },
                                    Organization: {
                                        include: {
                                            Module: {
                                                where: { active: true },
                                                orderBy: { order: 'asc' }
                                            },
                                            OrganizationModuleStatus: true
                                        }
                                    }
                                }
                            }
                        }
                    })];
            case 1:
                userWithOrgInfo = _c.sent();
                if (!userWithOrgInfo) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Utilisateur non trouvé'
                        })];
                }
                userOrgRelation = userWithOrgInfo.UserOrganization[0];
                if (!userOrgRelation) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Utilisateur non associé à cette organisation'
                        })];
                }
                organization = userOrgRelation.Organization;
                role = userOrgRelation.Role;
                permissions = role.Permission;
                permissionsByModule_1 = {};
                permissions.forEach(function (permission) {
                    if (permission.allowed && permission.Module) {
                        var moduleKey = permission.Module.key;
                        if (!permissionsByModule_1[moduleKey]) {
                            permissionsByModule_1[moduleKey] = {
                                label: permission.Module.label,
                                actions: []
                            };
                        }
                        permissionsByModule_1[moduleKey].actions.push(permission.action);
                    }
                });
                rightsSummary = {
                    userInfo: {
                        id: userWithOrgInfo.id,
                        email: userWithOrgInfo.email,
                        firstName: userWithOrgInfo.firstName,
                        lastName: userWithOrgInfo.lastName,
                        accountStatus: userWithOrgInfo.status,
                        lastConnection: userWithOrgInfo.updatedAt
                    },
                    organizationInfo: {
                        id: organization.id,
                        name: organization.name,
                        status: organization.status,
                        moduleCount: organization.Module.length
                    },
                    roles: [role.label],
                    permissions: permissionsByModule_1
                };
                isSuperAdminRole = ((_a = role.label) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('super')) && ((_b = role.label) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes('admin'));
                if (!(isSuperAdminRole && Object.keys(permissionsByModule_1).length === 0)) return [3 /*break*/, 3];
                console.log('[USERS][rights-summary] Aucun permission explicite trouvée pour un rôle SuperAdmin – génération synthétique de toutes les permissions actives.');
                moduleIds = organization.Module.map(function (m) { return m.id; });
                if (!(moduleIds.length > 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.permission.findMany({
                        where: { moduleId: { in: moduleIds } },
                        include: { Module: true }
                    })];
            case 2:
                rawPerms = _c.sent();
                synthetic_1 = {};
                rawPerms.forEach(function (p) {
                    if (!p.Module)
                        return;
                    var key = p.Module.key;
                    if (!synthetic_1[key]) {
                        synthetic_1[key] = { label: p.Module.label || key, actions: [], isActive: true, synthetic: true };
                    }
                    if (!synthetic_1[key].actions.includes(p.action)) {
                        synthetic_1[key].actions.push(p.action);
                    }
                });
                rightsSummary.permissions = synthetic_1;
                rightsSummary.organizationInfo.moduleCount = Object.keys(synthetic_1).length;
                rightsSummary.synthetic = true;
                console.log("[USERS][rights-summary] Permissions synth\u00E9tiques g\u00E9n\u00E9r\u00E9es: ".concat(Object.keys(synthetic_1).length, " modules."));
                _c.label = 3;
            case 3:
                console.log("[USERS] R\u00E9sum\u00E9 des droits g\u00E9n\u00E9r\u00E9 pour ".concat(userWithOrgInfo.email, " dans ").concat(organization.name));
                console.log("[USERS] R\u00F4le: ".concat(role.label, ", Permissions: ").concat(Object.keys(rightsSummary.permissions).length, " modules (synthetic=").concat(rightsSummary.synthetic ? 'yes' : 'no', ")"));
                res.json({
                    success: true,
                    data: rightsSummary
                });
                return [3 /*break*/, 5];
            case 4:
                error_9 = _c.sent();
                console.error('[USERS] Erreur récupération résumé des droits:', error_9);
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur lors de la récupération du résumé des droits'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

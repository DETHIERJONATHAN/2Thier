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
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middlewares/auth.js");
var zod_1 = require("zod");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🧹 SANITISATION SIMPLE ET EFFICACE
var sanitizeString = function (input) {
    return input.trim().replace(/[<>]/g, ''); // Supprime < et >
};
// 🔒 VALIDATION ZOD ULTRA-STRICTE
var roleCreateSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nom du rôle minimum 2 caractères')
        .max(50, 'Nom du rôle maximum 50 caractères')
        .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Nom du rôle contient des caractères non autorisés'),
    description: zod_1.z.string()
        .max(500, 'Description maximum 500 caractères')
        .optional(),
    organizationId: zod_1.z.string()
        .uuid('ID organisation invalide')
        .optional()
});
var roleUpdateSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nom du rôle minimum 2 caractères')
        .max(50, 'Nom du rôle maximum 50 caractères')
        .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Nom du rôle contient des caractères non autorisés')
        .optional(),
    description: zod_1.z.string()
        .max(500, 'Description maximum 500 caractères')
        .optional()
});
var roleQuerySchema = zod_1.z.object({
    // Accepter 'current' OU n'importe quelle chaîne non vide (IDs personnalisés autorisés)
    organizationId: zod_1.z.string()
        .min(1, 'ID organisation invalide')
        .optional()
});
// 🛡️ RATE LIMITING ADAPTÉ
var rolesRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes max (lecture fréquente)
    message: {
        success: false,
        message: 'Trop de requêtes sur les rôles, réessayez plus tard'
    },
    standardHeaders: true,
    legacyHeaders: false
});
var rolesCreateRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 10, // 10 créations max
    message: {
        success: false,
        message: 'Trop de créations de rôles, réessayez plus tard'
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
router.use(rolesRateLimit);
// 🏷️ GET /api/roles - SÉCURISÉ AVEC ZOD + SANITISATION
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var queryValidation, organizationId, requestingUser, finalOrganizationId, whereClause, roles, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[ROLES] GET /roles - Récupération des rôles SÉCURISÉE');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                queryValidation = roleQuerySchema.safeParse(req.query);
                if (!queryValidation.success) {
                    console.log('[ROLES] Validation échouée:', queryValidation.error);
                    res.status(400).json(handleZodError(queryValidation.error));
                    return [2 /*return*/];
                }
                organizationId = queryValidation.data.organizationId;
                requestingUser = req.user;
                console.log("[ROLES] User role: ".concat(requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role));
                console.log("[ROLES] Organization ID: ".concat(organizationId || (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId)));
                finalOrganizationId = organizationId;
                if (organizationId === 'current') {
                    finalOrganizationId = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId;
                }
                whereClause = {};
                // Si un ID d'organisation est spécifié (et résolu), on retourne:
                // 1. Les rôles spécifiques à cette organisation
                // 2. Les rôles globaux (organizationId: null)
                if (finalOrganizationId) {
                    whereClause.OR = [
                        { organizationId: finalOrganizationId },
                        { organizationId: null } // Rôles globaux
                    ];
                }
                // Si l'utilisateur n'est PAS super_admin, on force le filtrage sur son organisation
                // pour des raisons de sécurité, écrasant tout autre filtre.
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin') {
                    whereClause.OR = [
                        { organizationId: requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId },
                        { organizationId: null } // Rôles globaux toujours disponibles
                    ];
                    console.log("[ROLES] Non-SuperAdmin: Filtering for org ".concat(requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId, " + global roles"));
                }
                // Si aucun filtre d'organisation n'est spécifié et que c'est un super_admin,
                // retourner tous les rôles (globaux et spécifiques)
                if (!finalOrganizationId && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) === 'super_admin') {
                    // Pas de filtre - retourner tous les rôles
                    console.log('[ROLES] SuperAdmin: Returning all roles (global and organization-specific)');
                }
                console.log('[ROLES] Final where clause:', whereClause);
                return [4 /*yield*/, prisma.role.findMany({
                        where: whereClause,
                        include: {
                            Permission: true,
                            Organization: true
                        },
                        orderBy: { name: 'asc' }
                    })];
            case 2:
                roles = _a.sent();
                console.log("[ROLES] Found ".concat(roles.length, " total roles based on filter."));
                res.status(200).json({ success: true, data: roles });
                return [2 /*return*/];
            case 3:
                error_1 = _a.sent();
                console.error('[ROLES] Erreur lors de la récupération des rôles:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne lors de la récupération des rôles'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🏷️ GET /api/roles/:id - RÉCUPÉRER UN RÔLE SÉCURISÉ
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, requestingUser, sanitizedId, role, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                console.log("[ROLES] GET /roles/".concat(id, " - R\u00E9cup\u00E9ration du r\u00F4le S\u00C9CURIS\u00C9E"));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                // 🔒 VALIDATION ZOD PARAMS
                if (!id || typeof id !== 'string' || id.trim() === '') {
                    res.status(400).json({
                        success: false,
                        message: 'ID du rôle invalide'
                    });
                    return [2 /*return*/];
                }
                if (!req.user) {
                    res.status(401).json({
                        success: false,
                        message: "Utilisateur non authentifié"
                    });
                    return [2 /*return*/];
                }
                requestingUser = req.user;
                sanitizedId = sanitizeString(id.trim());
                return [4 /*yield*/, prisma.role.findUnique({
                        where: { id: sanitizedId },
                        include: {
                            Permission: true,
                            UserOrganizations: {
                                include: {
                                    Organization: true,
                                    User: {
                                        select: { id: true, firstName: true, lastName: true, email: true }
                                    }
                                }
                            },
                            Organization: true
                        }
                    })];
            case 2:
                role = _a.sent();
                if (!role) {
                    res.status(404).json({
                        success: false,
                        message: "Rôle non trouvé"
                    });
                    return [2 /*return*/];
                }
                // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
                if (requestingUser.role !== 'super_admin') {
                    if (!requestingUser.organizationId || role.organizationId !== requestingUser.organizationId) {
                        res.status(403).json({
                            success: false,
                            message: "Accès refusé: vous ne pouvez voir que les rôles de votre organisation"
                        });
                        return [2 /*return*/];
                    }
                }
                console.log("[ROLES] R\u00F4le \"".concat(role.name, "\" r\u00E9cup\u00E9r\u00E9 avec succ\u00E8s"));
                res.json({
                    success: true,
                    data: role
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.error('[ROLES] Error fetching role:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne du serveur'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/roles - Créer un nouveau rôle
// 🏷️ POST /api/roles - CRÉER UN RÔLE SÉCURISÉ
router.post('/', rolesCreateRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var bodyValidation, requestingUser, _a, name_1, description, organizationId, sanitizedName, sanitizedDescription, targetOrgId, finalOrgId, existingRole, newRole, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('[ROLES] POST /roles - Création d\'un rôle SÉCURISÉE');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                bodyValidation = roleCreateSchema.safeParse(req.body);
                if (!bodyValidation.success) {
                    console.log('[ROLES] Validation création échouée:', bodyValidation.error);
                    res.status(400).json(handleZodError(bodyValidation.error));
                    return [2 /*return*/];
                }
                if (!req.user) {
                    res.status(401).json({
                        success: false,
                        message: "Utilisateur non authentifié"
                    });
                    return [2 /*return*/];
                }
                requestingUser = req.user;
                _a = bodyValidation.data, name_1 = _a.name, description = _a.description, organizationId = _a.organizationId;
                sanitizedName = sanitizeString(name_1);
                sanitizedDescription = description ? sanitizeString(description) : '';
                console.log("[ROLES] Cr\u00E9ation r\u00F4le: ".concat(sanitizedName, " pour org: ").concat(organizationId || requestingUser.organizationId));
                // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
                if (requestingUser.role !== 'super_admin') {
                    targetOrgId = organizationId || requestingUser.organizationId;
                    if (!requestingUser.organizationId || requestingUser.organizationId !== targetOrgId) {
                        res.status(403).json({
                            success: false,
                            message: "Accès refusé: vous ne pouvez créer des rôles que pour votre organisation"
                        });
                        return [2 /*return*/];
                    }
                }
                finalOrgId = organizationId || requestingUser.organizationId;
                return [4 /*yield*/, prisma.role.findFirst({
                        where: {
                            name: sanitizedName,
                            organizationId: finalOrgId
                        }
                    })];
            case 2:
                existingRole = _b.sent();
                if (existingRole) {
                    res.status(409).json({
                        success: false,
                        message: "Un r\u00F4le avec le nom \"".concat(sanitizedName, "\" existe d\u00E9j\u00E0 dans cette organisation")
                    });
                    return [2 /*return*/];
                }
                // 🚫 Interdire la création d'un rôle réservé "super_admin"
                if (sanitizedName === 'super_admin') {
                    res.status(400).json({
                        success: false,
                        message: 'Le nom de rôle "super_admin" est réservé et ne peut pas être créé.'
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.role.create({
                        data: {
                            id: "role_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9)),
                            name: sanitizedName,
                            label: sanitizedName,
                            description: sanitizedDescription,
                            organizationId: finalOrgId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        include: {
                            UserOrganizations: {
                                include: {
                                    Organization: true,
                                    User: true
                                }
                            },
                            Organization: true
                        }
                    })];
            case 3:
                newRole = _b.sent();
                console.log("[ROLES] R\u00F4le cr\u00E9\u00E9 avec succ\u00E8s: ".concat(newRole.id));
                res.status(201).json({
                    success: true,
                    data: newRole,
                    message: "R\u00F4le \"".concat(sanitizedName, "\" cr\u00E9\u00E9 avec succ\u00E8s")
                });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                console.error('[ROLES] Error creating role:', error_3);
                res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// PUT /api/roles/:id - Mettre à jour un rôle
// 🏷️ PUT /api/roles/:id - MODIFIER UN RÔLE SÉCURISÉ  
router.put('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, bodyValidation, requestingUser, _a, name_2, description, sanitizedName, sanitizedDescription, existingRole, duplicateRole, updateData, updatedRole, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                console.log("[ROLES] PUT /roles/".concat(id, " - Mise \u00E0 jour du r\u00F4le S\u00C9CURIS\u00C9E"));
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                // 🔒 VALIDATION ZOD PARAMS + BODY
                if (!id || typeof id !== 'string' || id.trim() === '') {
                    res.status(400).json({
                        success: false,
                        message: 'ID du rôle invalide'
                    });
                    return [2 /*return*/];
                }
                bodyValidation = roleUpdateSchema.safeParse(req.body);
                if (!bodyValidation.success) {
                    console.log('[ROLES] Validation modification échouée:', bodyValidation.error);
                    res.status(400).json(handleZodError(bodyValidation.error));
                    return [2 /*return*/];
                }
                if (!req.user) {
                    res.status(401).json({
                        success: false,
                        message: "Utilisateur non authentifié"
                    });
                    return [2 /*return*/];
                }
                requestingUser = req.user;
                _a = bodyValidation.data, name_2 = _a.name, description = _a.description;
                sanitizedName = name_2 ? sanitizeString(name_2) : undefined;
                sanitizedDescription = description ? sanitizeString(description) : undefined;
                return [4 /*yield*/, prisma.role.findUnique({
                        where: { id: id.trim() }
                    })];
            case 2:
                existingRole = _b.sent();
                if (!existingRole) {
                    res.status(404).json({
                        success: false,
                        message: "Rôle non trouvé"
                    });
                    return [2 /*return*/];
                }
                // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
                if (requestingUser.role !== 'super_admin') {
                    if (!requestingUser.organizationId || existingRole.organizationId !== requestingUser.organizationId) {
                        res.status(403).json({
                            success: false,
                            message: "Accès refusé: vous ne pouvez modifier que les rôles de votre organisation"
                        });
                        return [2 /*return*/];
                    }
                }
                // � Interdire toute modification du rôle réservé "super_admin" (cohérent avec l'UI)
                if (existingRole.name === 'super_admin') {
                    res.status(403).json({
                        success: false,
                        message: 'Le rôle "super_admin" est protégé et ne peut pas être modifié.'
                    });
                    return [2 /*return*/];
                }
                if (!(sanitizedName && sanitizedName !== existingRole.name)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.role.findFirst({
                        where: {
                            name: sanitizedName,
                            organizationId: existingRole.organizationId,
                            id: { not: id.trim() }
                        }
                    })];
            case 3:
                duplicateRole = _b.sent();
                if (duplicateRole) {
                    res.status(409).json({
                        success: false,
                        message: "Un r\u00F4le avec le nom \"".concat(sanitizedName, "\" existe d\u00E9j\u00E0 dans cette organisation")
                    });
                    return [2 /*return*/];
                }
                _b.label = 4;
            case 4:
                updateData = {
                    updatedAt: new Date()
                };
                if (sanitizedName !== undefined) {
                    updateData.name = sanitizedName;
                    updateData.label = sanitizedName; // Synchroniser label avec name
                }
                if (sanitizedDescription !== undefined) {
                    updateData.description = sanitizedDescription;
                }
                return [4 /*yield*/, prisma.role.update({
                        where: { id: id.trim() },
                        data: updateData,
                        include: {
                            UserOrganizations: {
                                include: {
                                    Organization: true,
                                    User: true
                                }
                            },
                            Organization: true
                        }
                    })];
            case 5:
                updatedRole = _b.sent();
                console.log("[ROLES] R\u00F4le modifi\u00E9 avec succ\u00E8s: ".concat(updatedRole.id));
                res.status(200).json({
                    success: true,
                    data: updatedRole,
                    message: 'Rôle modifié avec succès'
                });
                return [3 /*break*/, 7];
            case 6:
                error_4 = _b.sent();
                console.error('[ROLES] Erreur lors de la modification du rôle:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur interne lors de la modification du rôle'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/roles/:id - Supprimer un rôle
// 🏷️ DELETE /api/roles/:id - SUPPRIMER UN RÔLE SÉCURISÉ
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, requestingUser, roleId, existingRole, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                console.log("[ROLES] DELETE /roles/".concat(id, " - Suppression du r\u00F4le S\u00C9CURIS\u00C9E"));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                // 🔒 VALIDATION PARAMS
                if (!id || typeof id !== 'string' || id.trim() === '') {
                    res.status(400).json({
                        success: false,
                        message: 'ID du rôle invalide'
                    });
                    return [2 /*return*/];
                }
                if (!req.user) {
                    res.status(401).json({
                        success: false,
                        message: "Utilisateur non authentifié"
                    });
                    return [2 /*return*/];
                }
                requestingUser = req.user;
                roleId = id.trim();
                return [4 /*yield*/, prisma.role.findUnique({
                        where: { id: roleId },
                        include: {
                            UserOrganizations: true // Pour vérifier s'il y a des utilisateurs assignés
                        }
                    })];
            case 2:
                existingRole = _a.sent();
                if (!existingRole) {
                    res.status(404).json({
                        success: false,
                        message: "Rôle non trouvé"
                    });
                    return [2 /*return*/];
                }
                // 🔐 VÉRIFICATION PERMISSIONS RENFORCÉE
                if (requestingUser.role !== 'super_admin') {
                    if (!requestingUser.organizationId || existingRole.organizationId !== requestingUser.organizationId) {
                        res.status(403).json({
                            success: false,
                            message: "Accès refusé: vous ne pouvez supprimer que les rôles de votre organisation"
                        });
                        return [2 /*return*/];
                    }
                }
                // 🚫 Interdire la suppression du rôle réservé "super_admin" (sécurité système)
                if (existingRole.name === 'super_admin') {
                    res.status(400).json({
                        success: false,
                        message: 'Le rôle "super_admin" est protégé et ne peut pas être supprimé.'
                    });
                    return [2 /*return*/];
                }
                // ⚠️ VÉRIFIER QU'AUCUN UTILISATEUR N'EST ASSIGNÉ
                if (existingRole.UserOrganizations && existingRole.UserOrganizations.length > 0) {
                    res.status(409).json({
                        success: false,
                        message: "Impossible de supprimer le r\u00F4le \"".concat(existingRole.name, "\": ").concat(existingRole.UserOrganizations.length, " utilisateur(s) y sont encore assign\u00E9(s)")
                    });
                    return [2 /*return*/];
                }
                // 🗑️ SUPPRESSION SÉCURISÉE
                return [4 /*yield*/, prisma.role.delete({
                        where: { id: roleId }
                    })];
            case 3:
                // 🗑️ SUPPRESSION SÉCURISÉE
                _a.sent();
                console.log("[ROLES] R\u00F4le supprim\u00E9 avec succ\u00E8s: ".concat(roleId, " (").concat(existingRole.name, ")"));
                res.status(200).json({
                    success: true,
                    message: "R\u00F4le \"".concat(existingRole.name, "\" supprim\u00E9 avec succ\u00E8s")
                });
                return [3 /*break*/, 5];
            case 4:
                error_5 = _a.sent();
                console.error('[ROLES] Erreur lors de la suppression du rôle:', error_5);
                res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_1 = require("../middlewares/auth");
var impersonation_1 = require("../middlewares/impersonation");
var requireRole_1 = require("../middlewares/requireRole");
var uuid_1 = require("uuid");
var zod_1 = require("zod");
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var EmailService_1 = require("../services/EmailService");
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// Schéma de validation pour la création d'invitation
var createInvitationSchema = zod_1.z.object({
    email: zod_1.z.string().email("L'adresse e-mail est invalide."),
    roleName: zod_1.z.string().min(1, "Le nom du rôle est requis."),
    organizationId: zod_1.z.string().uuid("L'ID de l'organisation est requis et doit être un UUID valide."),
});
// Route pour créer une nouvelle invitation
router.post('/', auth_1.authMiddleware, (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, roleName, organizationId, inviterId, existingUserInOrg, role, existingInvitation, targetUser, token, expiresAt, invitationData, newInvitation, emailError_1, error_1, target;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 12, , 13]);
                _a = createInvitationSchema.parse(req.body), email = _a.email, roleName = _a.roleName, organizationId = _a.organizationId;
                inviterId = req.user.userId;
                return [4 /*yield*/, prisma.userOrganization.findFirst({
                        where: {
                            organizationId: organizationId,
                            User: { email: email },
                        },
                    })];
            case 1:
                existingUserInOrg = _d.sent();
                if (existingUserInOrg) {
                    res.status(409).json({ message: "Un utilisateur avec cet e-mail est déjà membre de cette organisation." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.role.findFirst({
                        where: {
                            name: roleName,
                            OR: [
                                { organizationId: organizationId }, // Rôle spécifique à l'organisation
                                { organizationId: null } // Rôle global
                            ]
                        },
                    })];
            case 2:
                role = _d.sent();
                if (!role) {
                    res.status(404).json({ message: "Le r\u00F4le '".concat(roleName, "' n'a pas \u00E9t\u00E9 trouv\u00E9.") });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.invitation.findUnique({
                        where: { email_organizationId: { email: email, organizationId: organizationId } },
                    })];
            case 3:
                existingInvitation = _d.sent();
                if (existingInvitation && existingInvitation.status === 'PENDING' && existingInvitation.expiresAt > new Date()) {
                    res.status(409).json({ message: "Une invitation active existe déjà pour cette adresse e-mail dans cette organisation." });
                    return [2 /*return*/];
                }
                if (!existingInvitation) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma.invitation.delete({ where: { id: existingInvitation.id } })];
            case 4:
                _d.sent();
                _d.label = 5;
            case 5: return [4 /*yield*/, prisma.user.findUnique({
                    where: { email: email },
                })];
            case 6:
                targetUser = _d.sent();
                token = (0, uuid_1.v4)();
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);
                invitationData = {
                    email: email,
                    token: token,
                    expiresAt: expiresAt,
                    Organization: { connect: { id: organizationId } },
                    Role: { connect: { id: role.id } },
                    // Relation "Invitation_invitedByIdToUser" côté Invitation est exposée comme
                    // User_Invitation_invitedByIdToUser dans le client Prisma
                    User_Invitation_invitedByIdToUser: { connect: { id: inviterId } },
                    status: 'PENDING',
                };
                // Si un utilisateur existe (quel que soit son statut ou ses organisations), on lie l'invitation
                if (targetUser) {
                    // Relation "Invitation_targetUserIdToUser" côté Invitation
                    invitationData.User_Invitation_targetUserIdToUser = { connect: { id: targetUser.id } };
                }
                return [4 /*yield*/, prisma.invitation.create({
                        data: invitationData,
                        include: {
                            Organization: true,
                            Role: true,
                        }
                    })];
            case 7:
                newInvitation = _d.sent();
                _d.label = 8;
            case 8:
                _d.trys.push([8, 10, , 11]);
                return [4 /*yield*/, EmailService_1.emailService.sendInvitationEmail({
                        to: newInvitation.email,
                        token: newInvitation.token,
                        isExistingUser: !!targetUser,
                        organizationName: newInvitation.Organization.name,
                        roleName: newInvitation.Role.label || newInvitation.Role.name,
                    })];
            case 9:
                _d.sent();
                return [3 /*break*/, 11];
            case 10:
                emailError_1 = _d.sent();
                console.error("Échec de l'envoi de l'e-mail d'invitation:", emailError_1);
                return [3 /*break*/, 11];
            case 11:
                res.status(201).json({
                    success: true,
                    message: "Invitation envoyée avec succès.",
                    data: {
                        id: newInvitation.id,
                        token: newInvitation.token,
                        isExistingUser: !!targetUser,
                    },
                });
                return [3 /*break*/, 13];
            case 12:
                error_1 = _d.sent();
                if (error_1 instanceof zod_1.z.ZodError) {
                    res.status(400).json({ message: 'Données invalides.', details: error_1.errors });
                    return [2 /*return*/];
                }
                if (error_1 instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error_1.code === 'P2002') {
                        target = (_c = (_b = error_1.meta) === null || _b === void 0 ? void 0 : _b.target) !== null && _c !== void 0 ? _c : 'champs inconnus';
                        console.error("Erreur de contrainte unique (P2002) sur ".concat(target, ":"), error_1);
                        res.status(409).json({
                            message: "Conflit de donn\u00E9es. Une entr\u00E9e avec ces informations existe d\u00E9j\u00E0."
                        });
                        return [2 /*return*/];
                    }
                }
                console.error("Erreur lors de la création de l'invitation:", error_1);
                res.status(500).json({ message: "Erreur interne du serveur." });
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
// POST /api/invitations/:id/resend
// Regénère le token pour une invitation existante.
router.post('/:id/resend', auth_1.authMiddleware, (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, invitation, newToken, newExpiresAt, updatedInvitation, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.invitation.findFirst({
                        where: { id: id, status: { in: ['PENDING', 'DISABLED'] } },
                    })];
            case 2:
                invitation = _a.sent();
                if (!invitation) {
                    res.status(404).json({ success: false, message: "Invitation non trouvée, déjà utilisée ou expirée." });
                    return [2 /*return*/];
                }
                newToken = (0, uuid_1.v4)();
                newExpiresAt = new Date();
                newExpiresAt.setDate(newExpiresAt.getDate() + 7);
                return [4 /*yield*/, prisma.invitation.update({
                        where: { id: id },
                        data: {
                            token: newToken,
                            expiresAt: newExpiresAt,
                            status: 'PENDING', // Réactiver l'invitation si elle était désactivée
                        },
                    })];
            case 3:
                updatedInvitation = _a.sent();
                // Ici, vous pourriez déclencher un envoi d'email avec le nouveau token
                res.status(200).json({ success: true, message: "L'invitation a été renvoyée avec succès.", data: { token: updatedInvitation.token } });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                console.error("Erreur lors du renvoi de l'invitation:", error_2);
                res.status(500).json({ success: false, message: "Erreur interne du serveur." });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Route pour changer le statut d'une invitation
router.patch('/:id/status', auth_1.authMiddleware, (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, status, invitation, updatedInvitation, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                status = req.body.status;
                if (!['PENDING', 'DISABLED'].includes(status)) {
                    res.status(400).json({ message: "Statut invalide. Seuls PENDING et DISABLED sont autorisés." });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.invitation.findUnique({ where: { id: id } })];
            case 2:
                invitation = _a.sent();
                if (!invitation) {
                    res.status(404).json({ message: "Invitation non trouvée." });
                    return [2 /*return*/];
                }
                if (invitation.status !== 'PENDING' && invitation.status !== 'DISABLED') {
                    res.status(400).json({ message: "L'invitation ne peut pas \u00EAtre modifi\u00E9e car son statut est ".concat(invitation.status, ".") });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.invitation.update({
                        where: { id: id },
                        data: { status: status },
                    })];
            case 3:
                updatedInvitation = _a.sent();
                res.json({ success: true, data: updatedInvitation });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _a.sent();
                console.error("Erreur lors de la mise \u00E0 jour du statut de l'invitation ".concat(id, ":"), error_3);
                res.status(500).json({ success: false, message: "Erreur interne du serveur." });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Schéma de validation pour la vérification du jeton
var verifyTokenSchema = zod_1.z.object({
    token: zod_1.z.string().uuid("Le format du jeton est invalide."),
});
// Route pour vérifier la validité d'un jeton d'invitation
router.get('/verify', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, invitation, isExistingUser, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                token = verifyTokenSchema.parse(req.query).token;
                return [4 /*yield*/, prisma.invitation.findUnique({
                        where: {
                            token: token,
                            expiresAt: { gte: new Date() },
                            status: 'PENDING'
                        },
                        include: {
                            Organization: { select: { name: true } },
                            Role: { select: { name: true, label: true } }
                        }
                    })];
            case 1:
                invitation = _a.sent();
                if (!invitation) {
                    res.status(404).json({ message: 'Invitation non trouvée, invalide, expirée ou déjà utilisée.' });
                    return [2 /*return*/];
                }
                isExistingUser = !!invitation.targetUserId;
                res.json({
                    success: true,
                    data: {
                        email: invitation.email,
                        // Normaliser les clés attendues par le frontend (lowercase)
                        organization: invitation.Organization,
                        role: invitation.Role,
                        isExistingUser: isExistingUser,
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                if (error_4 instanceof zod_1.z.ZodError) {
                    res.status(400).json({ message: 'Jeton invalide fourni.', details: error_4.errors });
                    return [2 /*return*/];
                }
                console.error("Erreur lors de la vérification du jeton d'invitation:", error_4);
                res.status(500).json({ message: "Erreur interne du serveur." });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Schéma de validation pour l'acceptation de l'invitation
var acceptInvitationSchema = zod_1.z.object({
    token: zod_1.z.string().uuid("Le format du jeton est invalide."),
    firstName: zod_1.z.string().min(1, "Le prénom est requis."),
    lastName: zod_1.z.string().min(1, "Le nom est requis."),
    password: zod_1.z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});
// Route pour accepter une invitation et finaliser l'inscription
router.post('/accept', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var invitationToken, invitation_1, user_1, _a, firstName_1, lastName_1, password, existingUser, passwordHash_1, newUser, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 8, , 9]);
                invitationToken = zod_1.z.string().uuid("Le format du jeton est invalide.").parse(req.body.token);
                return [4 /*yield*/, prisma.invitation.findUnique({
                        where: {
                            token: invitationToken,
                            expiresAt: { gte: new Date() },
                            status: 'PENDING'
                        },
                    })];
            case 1:
                invitation_1 = _b.sent();
                if (!invitation_1) {
                    res.status(404).json({ message: 'Invitation non trouvée, invalide, expirée ou déjà utilisée.' });
                    return [2 /*return*/];
                }
                if (!invitation_1.targetUserId) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: invitation_1.targetUserId } })];
            case 2:
                user_1 = _b.sent();
                if (!user_1) {
                    // Cas de sécurité : l'utilisateur lié a été supprimé entre-temps
                    res.status(404).json({ message: "L'utilisateur associé à cette invitation n'existe plus." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: 
                                // Ajouter l'utilisateur à la nouvelle organisation
                                return [4 /*yield*/, tx.userOrganization.create({
                                        data: {
                                            userId: user_1.id,
                                            organizationId: invitation_1.organizationId,
                                            roleId: invitation_1.roleId,
                                            status: 'ACTIVE'
                                        }
                                    })];
                                case 1:
                                    // Ajouter l'utilisateur à la nouvelle organisation
                                    _a.sent();
                                    // Mettre à jour l'invitation
                                    return [4 /*yield*/, tx.invitation.update({
                                            where: { id: invitation_1.id },
                                            data: { status: 'ACCEPTED' },
                                        })];
                                case 2:
                                    // Mettre à jour l'invitation
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 3:
                _b.sent();
                res.status(200).json({ success: true, message: "Vous avez rejoint l'organisation avec succ\u00E8s." });
                return [2 /*return*/];
            case 4:
                _a = acceptInvitationSchema.parse(req.body), firstName_1 = _a.firstName, lastName_1 = _a.lastName, password = _a.password;
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: invitation_1.email } })];
            case 5:
                existingUser = _b.sent();
                if (existingUser) {
                    // Ce cas ne devrait plus se produire grâce à la logique de liaison, mais reste une sécurité
                    res.status(409).json({ message: "Un utilisateur avec cette adresse e-mail existe déjà. Veuillez vous connecter pour accepter l'invitation." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 6:
                passwordHash_1 = _b.sent();
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var createdUser;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.user.create({
                                        data: {
                                            firstName: firstName_1,
                                            lastName: lastName_1,
                                            email: invitation_1.email,
                                            passwordHash: passwordHash_1,
                                            status: 'active',
                                            role: 'user',
                                        }
                                    })];
                                case 1:
                                    createdUser = _a.sent();
                                    return [4 /*yield*/, tx.userOrganization.create({
                                            data: {
                                                userId: createdUser.id,
                                                organizationId: invitation_1.organizationId,
                                                roleId: invitation_1.roleId,
                                            }
                                        })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, tx.invitation.update({
                                            where: { id: invitation_1.id },
                                            data: { status: 'ACCEPTED' },
                                        })];
                                case 3:
                                    _a.sent();
                                    return [2 /*return*/, createdUser];
                            }
                        });
                    }); })];
            case 7:
                newUser = _b.sent();
                res.status(201).json({ success: true, message: "Inscription réussie!", data: { userId: newUser.id } });
                return [3 /*break*/, 9];
            case 8:
                error_5 = _b.sent();
                if (error_5 instanceof zod_1.z.ZodError) {
                    res.status(400).json({ message: 'Données d\'inscription invalides.', details: error_5.errors });
                    return [2 /*return*/];
                }
                console.error("Erreur lors de l'acceptation de l'invitation:", error_5);
                res.status(500).json({ message: "Erreur interne du serveur." });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/invitations/:id
// Annule une invitation en attente.
router.delete('/:id', auth_1.authMiddleware, (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, invitation, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.invitation.findFirst({
                        where: { id: id, status: { in: ['PENDING', 'DISABLED'] } },
                    })];
            case 2:
                invitation = _a.sent();
                if (!invitation) {
                    res.status(404).json({ success: false, message: "Invitation non trouvée, déjà utilisée ou expirée." });
                    return [2 /*return*/];
                }
                // Supprimer l'invitation
                return [4 /*yield*/, prisma.invitation.delete({
                        where: { id: id },
                    })];
            case 3:
                // Supprimer l'invitation
                _a.sent();
                // Par sécurité, on supprime aussi un potentiel utilisateur créé avec le statut 'invited'
                // Bien que la logique actuelle ne semble pas en créer, cela rend le système plus robuste.
                return [4 /*yield*/, prisma.user.deleteMany({
                        where: {
                            email: invitation.email,
                            status: 'invited'
                        }
                    })];
            case 4:
                // Par sécurité, on supprime aussi un potentiel utilisateur créé avec le statut 'invited'
                // Bien que la logique actuelle ne semble pas en créer, cela rend le système plus robuste.
                _a.sent();
                res.status(200).json({ success: true, message: "L'invitation a été annulée avec succès." });
                return [3 /*break*/, 6];
            case 5:
                error_6 = _a.sent();
                console.error("Erreur lors de l'annulation de l'invitation:", error_6);
                res.status(500).json({ success: false, message: "Erreur interne du serveur." });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// POST /api/invitations/:id/force-accept
// Force l'acceptation d'une invitation pour créer un utilisateur (super_admin only)
router.post('/:id/force-accept', (0, requireRole_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, invitation_2, existingUser, tempPassword, passwordHash_2, newUser, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, prisma.invitation.findUnique({ where: { id: id } })];
            case 2:
                invitation_2 = _a.sent();
                if (!invitation_2) {
                    return [2 /*return*/, res.status(404).json({ success: false, message: "Invitation non trouvée." })];
                }
                if (invitation_2.status !== 'PENDING') {
                    return [2 /*return*/, res.status(400).json({ success: false, message: "L'invitation a d\u00E9j\u00E0 le statut ".concat(invitation_2.status, ".") })];
                }
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: invitation_2.email } })];
            case 3:
                existingUser = _a.sent();
                if (existingUser) {
                    return [2 /*return*/, res.status(409).json({ success: false, message: "Un utilisateur avec cet e-mail existe déjà." })];
                }
                tempPassword = (0, uuid_1.v4)();
                return [4 /*yield*/, bcryptjs_1.default.hash(tempPassword, 10)];
            case 4:
                passwordHash_2 = _a.sent();
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var createdUser;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.user.create({
                                        data: {
                                            email: invitation_2.email,
                                            passwordHash: passwordHash_2,
                                            status: 'active',
                                            role: 'user', // Rôle global par défaut
                                            // Le prénom/nom peuvent être vides, l'utilisateur les mettra à jour
                                        }
                                    })];
                                case 1:
                                    createdUser = _a.sent();
                                    if (!invitation_2.organizationId) return [3 /*break*/, 3];
                                    return [4 /*yield*/, tx.userOrganization.create({
                                            data: {
                                                userId: createdUser.id,
                                                organizationId: invitation_2.organizationId,
                                                roleId: invitation_2.roleId,
                                                status: 'ACTIVE'
                                            }
                                        })];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3: return [4 /*yield*/, tx.invitation.update({
                                        where: { id: invitation_2.id },
                                        data: { status: 'ACCEPTED' },
                                    })];
                                case 4:
                                    _a.sent();
                                    // Retourner l'utilisateur complet avec ses nouvelles relations
                                    return [2 /*return*/, tx.user.findUnique({
                                            where: { id: createdUser.id },
                                            include: {
                                                UserOrganization: {
                                                    include: {
                                                        Organization: true,
                                                        Role: true,
                                                    },
                                                },
                                            }
                                        })];
                            }
                        });
                    }); })];
            case 5:
                newUser = _a.sent();
                // NOTE: Vous devriez probablement envoyer un e-mail à l'utilisateur
                // avec un lien pour réinitialiser son mot de passe.
                res.status(201).json({ success: true, message: "L'utilisateur a été créé et l'invitation acceptée.", data: newUser });
                return [3 /*break*/, 7];
            case 6:
                error_7 = _a.sent();
                console.error("Erreur lors de l'acceptation forcée de l'invitation:", error_7);
                res.status(500).json({ success: false, message: "Erreur interne du serveur." });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// GET /api/invitations : liste les invitations (optionnellement filtrées par organizationId)
router.get('/', auth_1.authMiddleware, (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, requestingUser, where, invitationsRaw, invitations, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.query.organizationId;
                requestingUser = req.user;
                if (!requestingUser) {
                    res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
                    return [2 /*return*/];
                }
                where = {};
                if (organizationId) {
                    where.organizationId = organizationId;
                }
                // Si admin, ne retourne que les invitations de son org
                if (requestingUser.role !== 'super_admin' && requestingUser.organizationId) {
                    where.organizationId = requestingUser.organizationId;
                }
                // Invitations PENDING ou DISABLED (pas ACCEPTED ni CANCELLED)
                where.status = { in: ['PENDING', 'DISABLED'] };
                return [4 /*yield*/, prisma.invitation.findMany({
                        where: where,
                        include: {
                            Role: true,
                            Organization: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    })];
            case 1:
                invitationsRaw = _a.sent();
                invitations = invitationsRaw.map(function (inv) { return (__assign(__assign({}, inv), { organization: inv.Organization, role: inv.Role })); });
                res.json({ success: true, data: invitations });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error('Erreur lors de la récupération des invitations:', error_8);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération des invitations.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

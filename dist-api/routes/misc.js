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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var auth_1 = require("../middlewares/auth");
var impersonation_1 = require("../middlewares/impersonation"); // Importer le middleware
var config_1 = require("../config");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
var userWithOrgsArgs = {
    include: {
        UserOrganization: {
            include: {
                Organization: true,
                Role: {
                    include: {
                        Permission: true, // CORRECTION: 'permissions' devient 'Permission'
                    },
                },
            },
        },
    },
};
// POST /api/register - Inscription d'un nouvel utilisateur
router.post("/register", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, firstName, lastName, hashedPassword, user, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password, firstName = _a.firstName, lastName = _a.lastName;
                if (!email || !password || !firstName) {
                    return [2 /*return*/, res.status(400).json({ error: "Email, mot de passe et prénom sont requis" })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 2:
                hashedPassword = _b.sent();
                return [4 /*yield*/, prisma.user.create({
                        data: {
                            email: email,
                            passwordHash: hashedPassword,
                            firstName: firstName,
                            lastName: lastName,
                            status: 'active',
                            role: 'user',
                        },
                    })];
            case 3:
                user = _b.sent();
                res.status(201).json({ success: true, id: user.id, email: user.email });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                console.error("[API][register] Erreur lors de l'inscription:", error_1);
                // Gestion spécifique de l'erreur de contrainte d'unicité
                if (error_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && error_1.code === 'P2002') {
                    return [2 /*return*/, res.status(409).json({ error: "Cette adresse email est déjà utilisée." })];
                }
                res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// POST /api/login - Connexion d'un utilisateur
router.post("/login", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, isPasswordValid, freshUser, isSuperAdmin, mainOrg, tokenRole, token, _passwordHash, _b, userOrganizations, userInfos, organizations, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                if (!email || !password) {
                    return [2 /*return*/, res.status(400).json({ error: "L'email et le mot de passe sont requis" })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.user.findUnique(__assign({ where: { email: email } }, userWithOrgsArgs))];
            case 2:
                user = _c.sent();
                if (!user) {
                    return [2 /*return*/, res.status(401).json({ error: "Identifiants invalides" })];
                }
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.passwordHash)];
            case 3:
                isPasswordValid = _c.sent();
                if (!isPasswordValid) {
                    return [2 /*return*/, res.status(401).json({ error: "Identifiants invalides" })];
                }
                return [4 /*yield*/, prisma.user.findUnique(__assign({ where: { id: user.id } }, userWithOrgsArgs))];
            case 4:
                freshUser = _c.sent();
                if (!freshUser) {
                    // This should not happen if the user was just found
                    return [2 /*return*/, res.status(404).json({ error: "Utilisateur non trouvé après la vérification." })];
                }
                isSuperAdmin = freshUser.role === 'super_admin';
                mainOrg = freshUser.UserOrganization && freshUser.UserOrganization.length > 0
                    ? freshUser.UserOrganization.find(function (uo) { return uo.Organization && uo.Role && uo.status === client_1.UserOrganizationStatus.ACTIVE; }) || freshUser.UserOrganization.find(function (uo) { return uo.Organization && uo.Role; })
                    : null;
                // Un utilisateur standard DOIT POUVOIR se connecter même sans organisation pour en créer une ou accepter une invitation.
                // La logique de ce qu'il peut faire une fois connecté est gérée par le frontend et les autres routes API.
                if (!isSuperAdmin && !mainOrg) {
                    console.log("[API][login] Utilisateur ".concat(user.id, " se connecte sans organisation principale. C'est un utilisateur \"flottant\"."));
                }
                tokenRole = void 0;
                if (isSuperAdmin) {
                    tokenRole = 'super_admin';
                }
                else if (mainOrg && mainOrg.Role) {
                    // Cas standard : l'utilisateur a un rôle dans une organisation
                    tokenRole = mainOrg.Role.name;
                }
                else {
                    // Cas d'un nouvel utilisateur sans organisation : on lui donne un rôle de base.
                    tokenRole = 'user'; // Rôle par défaut pour les utilisateurs "flottants"
                }
                token = jsonwebtoken_1.default.sign({
                    userId: user.id,
                    role: tokenRole,
                    // L'organizationId peut être null pour un super_admin sans orga principale
                    organizationId: mainOrg ? mainOrg.organizationId : null,
                }, config_1.JWT_SECRET, { expiresIn: "24h" });
                _passwordHash = freshUser.passwordHash, _b = freshUser.UserOrganization, userOrganizations = _b === void 0 ? [] : _b, userInfos = __rest(freshUser, ["passwordHash", "UserOrganization"]);
                organizations = userOrganizations
                    .filter(function (uo) { return uo.Organization && uo.Role; }) // Filtrer les relations invalides
                    .map(function (uo) { return (__assign(__assign({}, uo.Organization), { role: uo.Role.name, roleLabel: uo.Role.label, userOrganizationId: uo.id, status: uo.status })); });
                // ✅ DÉFINIR LE COOKIE HTTPONLY SÉCURISÉ
                console.log('🍪 [LOGIN] Définition du cookie d\'authentification...');
                res.cookie('token', token, {
                    httpOnly: true, // Empêche l'accès via JavaScript côté client (sécurité)
                    secure: false, // true en production avec HTTPS, false en développement
                    sameSite: 'lax', // Protection CSRF tout en permettant les redirections
                    maxAge: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
                    path: '/' // Cookie disponible sur tout le site
                });
                console.log('✅ [LOGIN] Cookie défini avec succès');
                res.json({
                    token: token,
                    user: userInfos,
                    organizations: organizations,
                });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _c.sent();
                console.error("[API][login] Erreur lors de la connexion:", error_2);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Erreur interne du serveur." });
                }
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// GET /api/me - Récupère les informations de l'utilisateur connecté
router.get("/me", auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, isSuperAdmin, mainOrg, tokenRole, token, _passwordHash, _a, userOrganizations, userInfos, organizations, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                console.log('[/me] === DEBUG /me ROUTE ===');
                console.log('[/me] req.user:', req.user);
                console.log('[/me] req.cookies:', req.cookies);
                console.log('[/me] req.headers.authorization:', req.headers.authorization);
                // CORRECTION : Vérifier si req.user existe avant de l'utiliser.
                // S'il n'existe pas, cela signifie que le client n'est pas authentifié.
                if (!req.user || !req.user.userId) {
                    console.log('[/me] Échec: req.user ou req.user.userId manquant');
                    return [2 /*return*/, res.status(401).json({ error: "Utilisateur non authentifié" })];
                }
                return [4 /*yield*/, prisma.user.findUnique(__assign({ where: { id: req.user.userId } }, userWithOrgsArgs))];
            case 1:
                user = _b.sent();
                if (!user) {
                    return [2 /*return*/, res.status(404).json({ error: "Utilisateur non trouvé" })];
                }
                isSuperAdmin = user.role === 'super_admin';
                mainOrg = user.UserOrganization && user.UserOrganization.length > 0
                    ? user.UserOrganization.find(function (uo) { return uo.Organization && uo.Role && uo.status === client_1.UserOrganizationStatus.ACTIVE; }) || user.UserOrganization.find(function (uo) { return uo.Organization && uo.Role; })
                    : null;
                // Un utilisateur standard doit appartenir à au moins une organisation valide pour se connecter.
                if (!isSuperAdmin && !mainOrg) {
                    return [2 /*return*/, res.status(403).json({ error: "Vous n'êtes associé à aucune organisation valide ou votre rôle n'est pas correctement configuré." })];
                }
                tokenRole = void 0;
                if (isSuperAdmin) {
                    tokenRole = 'super_admin';
                }
                else {
                    // mainOrg et mainOrg.Role sont garantis d'exister pour un utilisateur non-super-admin à ce stade.
                    if (!mainOrg || !mainOrg.Role) {
                        return [2 /*return*/, res.status(403).json({ error: "Impossible de déterminer un rôle valide pour la connexion." })];
                    }
                    tokenRole = mainOrg.Role.name;
                }
                token = jsonwebtoken_1.default.sign({
                    userId: user.id,
                    role: tokenRole,
                    // L'organizationId peut être null pour un super_admin sans orga principale
                    organizationId: mainOrg ? mainOrg.organizationId : null,
                }, config_1.JWT_SECRET, { expiresIn: "24h" });
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000,
                    path: '/'
                });
                _passwordHash = user.passwordHash, _a = user.UserOrganization, userOrganizations = _a === void 0 ? [] : _a, userInfos = __rest(user, ["passwordHash", "UserOrganization"]);
                organizations = userOrganizations
                    .filter(function (uo) { return uo.Organization && uo.Role; }) // Filtrer les relations invalides
                    .map(function (uo) { return (__assign(__assign({}, uo.Organization), { role: uo.Role.name, roleLabel: uo.Role.label, userOrganizationId: uo.id, status: uo.status })); });
                res.json({ currentUser: __assign(__assign({}, userInfos), { organizations: organizations }), isImpersonating: !!req.originalUser });
                return [3 /*break*/, 3];
            case 2:
                err_1 = _b.sent();
                console.error(err_1);
                res.status(500).json({ error: "Erreur lors de la récupération de l'utilisateur." });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/logout - Déconnexion avec nettoyage des cookies
router.post("/logout", function (_req, res) {
    console.log('🚪 [LOGOUT] Demande de déconnexion reçue');
    // Nettoyer le cookie principal avec la même configuration que lors de la création
    res.clearCookie('token', {
        httpOnly: true,
        secure: false, // Même valeur qu'à la création
        sameSite: 'lax',
        path: '/'
    });
    // Nettoyer aussi d'autres variantes possibles (au cas où)
    var cookieOptions = [
        { path: '/' },
        { path: '/', httpOnly: true },
        { path: '/', secure: false },
        { path: '/', sameSite: 'lax' }
    ];
    cookieOptions.forEach(function (options) {
        res.clearCookie('token', options);
    });
    // Headers pour forcer le nettoyage côté client
    res.header('Clear-Site-Data', '"cookies"');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    console.log('✅ [LOGOUT] Cookie nettoyé avec succès');
    res.json({
        success: true,
        message: 'Déconnexion réussie',
        clearCache: true
    });
});
// NOUVELLE ROUTE
// GET /api/me/organizations - Récupère les organisations pour l'utilisateur actuel (ou toutes pour un super_admin)
router.get("/me/organizations", auth_1.authMiddleware, impersonation_1.impersonationMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var isSuperAdmin, isImpersonating, effectiveUserId, organizations, allOrgs, userWithOrgs, error_3;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 5, , 6]);
                isSuperAdmin = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'super_admin';
                isImpersonating = !!req.impersonatedUser;
                effectiveUserId = ((_b = req.impersonatedUser) === null || _b === void 0 ? void 0 : _b.id) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId);
                if (!effectiveUserId) {
                    return [2 /*return*/, res.status(401).json({ error: "Utilisateur non authentifié." })];
                }
                organizations = [];
                if (!(isSuperAdmin && !isImpersonating)) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.organization.findMany({
                        orderBy: { name: 'asc' },
                    })];
            case 1:
                allOrgs = _d.sent();
                // On formate pour correspondre à la structure attendue par le front-end
                organizations = allOrgs.map(function (org) { return (__assign(__assign({}, org), { role: 'super_admin', roleLabel: 'Super Administrateur', userOrganizationId: null, status: 'ACTIVE' })); });
                return [3 /*break*/, 4];
            case 2: return [4 /*yield*/, prisma.user.findUnique(__assign({ where: { id: effectiveUserId } }, userWithOrgsArgs))];
            case 3:
                userWithOrgs = _d.sent();
                if (userWithOrgs && userWithOrgs.UserOrganization) {
                    organizations = userWithOrgs.UserOrganization
                        .filter(function (uo) { return uo.Organization && uo.Role; })
                        .map(function (uo) { return (__assign(__assign({}, uo.Organization), { role: uo.Role.name, roleLabel: uo.Role.label, userOrganizationId: uo.id, status: uo.status })); });
                }
                _d.label = 4;
            case 4:
                res.json({ success: true, data: organizations });
                return [3 /*break*/, 6];
            case 5:
                error_3 = _d.sent();
                console.error("[API][me/organizations] Erreur:", error_3);
                res.status(500).json({ success: false, message: "Erreur interne du serveur." });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// GET /api/me/role - Récupérer le rôle de l'utilisateur dans une organisation spécifique
router.get("/me/role", auth_1.authMiddleware, impersonation_1.impersonationMiddleware, // << AJOUT DU MIDDLEWARE
function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, userId, userOrg_1, userOrg, error_4;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                organizationId = req.query.organizationId;
                userId = ((_a = req.impersonatedUser) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId);
                console.log('[API][me/role] userId:', userId, 'organizationId:', organizationId, 'impersonatedUser:', req.impersonatedUser, 'headers:', req.headers);
                if (!userId) {
                    res.status(401).json({ error: "Utilisateur non authentifié" });
                    return [2 /*return*/];
                }
                if (!organizationId) {
                    res.status(400).json({ error: "L'ID de l'organisation est requis" });
                    return [2 /*return*/];
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 6, , 7]);
                if (!(((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'super_admin' && req.impersonatedUser)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.userOrganization.findFirst({
                        where: { userId: req.impersonatedUser.id, organizationId: organizationId },
                        include: { Role: true, Organization: true },
                    })];
            case 2:
                userOrg_1 = _e.sent();
                if (userOrg_1 && userOrg_1.Role && userOrg_1.Organization) {
                    res.json({
                        role: userOrg_1.Role.name,
                        roleLabel: userOrg_1.Role.label,
                        orgStatus: userOrg_1.Organization.status,
                        organizationName: userOrg_1.Organization.name,
                    });
                    return [2 /*return*/];
                }
                else {
                    // Si l'utilisateur usurpé n'a pas de rôle dans cette orga, on renvoie null
                    res.status(404).json({ error: "L'utilisateur usurpé n'a pas de rôle dans cette organisation." });
                    return [2 /*return*/];
                }
                return [3 /*break*/, 4];
            case 3:
                if (((_d = req.user) === null || _d === void 0 ? void 0 : _d.role) === 'super_admin' && !req.impersonatedUser) {
                    // Un super_admin non-usurpateur a toujours le rôle super_admin
                    res.json({ role: 'super_admin', roleLabel: 'Super administrateur', orgStatus: null });
                    return [2 /*return*/];
                }
                _e.label = 4;
            case 4: return [4 /*yield*/, prisma.userOrganization.findFirst({
                    where: { userId: userId, organizationId: organizationId },
                    include: { Role: true, Organization: true },
                })];
            case 5:
                userOrg = _e.sent();
                if (userOrg && userOrg.Role && userOrg.Organization) {
                    res.json({
                        role: userOrg.Role.name,
                        roleLabel: userOrg.Role.label,
                        orgStatus: userOrg.Organization.status,
                        organizationName: userOrg.Organization.name,
                    });
                }
                else {
                    res.status(404).json({ error: "Rôle non trouvé pour l'utilisateur dans cette organisation" });
                }
                return [3 /*break*/, 7];
            case 6:
                error_4 = _e.sent();
                console.error("[API][me/role] Erreur:", error_4);
                res.status(500).json({ error: "Erreur interne du serveur" });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// POST /api/logout - Déconnexion de l'utilisateur
router.post("/logout", function (_req, res) {
    // Ici, vous pouvez gérer la déconnexion, comme la suppression du token côté client.
    // Cela dépend de la manière dont vous gérez l'authentification côté client.
    res.json({ message: "Déconnexion réussie" });
});
exports.default = router;

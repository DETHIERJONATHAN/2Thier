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
exports.logout = exports.getMe = exports.login = void 0;
var prisma_1 = require("../lib/prisma");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var fs_1 = __importDefault(require("fs"));
// Helper pour lire JWT_SECRET dynamiquement (amélioration pour la production)
// En local: utilise la valeur par défaut ou .env
// En production Cloud Run: lit depuis /run/secrets/JWT_SECRET
var getJWTSecret = function () {
    // ✅ PRIORITÉ 1: Lire depuis process.env (variable d'environnement)
    var secret = process.env.JWT_SECRET;
    if (secret && secret.trim()) {
        console.log('[AUTH] ✅ JWT_SECRET trouvé dans process.env');
        return secret;
    }
    // ✅ PRIORITÉ 2: Lire depuis le fichier Cloud Run secret
    var cloudRunSecretPath = '/run/secrets/JWT_SECRET';
    if (fs_1.default.existsSync(cloudRunSecretPath)) {
        try {
            secret = fs_1.default.readFileSync(cloudRunSecretPath, 'utf-8').trim();
            if (secret) {
                console.log('[AUTH] ✅ JWT_SECRET trouvé dans /run/secrets/JWT_SECRET');
                return secret;
            }
        }
        catch (err) {
            console.error('[AUTH] ❌ Erreur à la lecture de /run/secrets/JWT_SECRET:', err);
        }
    }
    // ❌ FALLBACK: Clé de développement (ne jamais atteindre en production !)
    console.warn('[AUTH] ⚠️ JWT_SECRET non disponible, utilisation de la clé de développement');
    return 'development-secret-key';
};
var login = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, isPasswordValid, _passwordHash, userWithoutPassword, userRoles, allPermissions, isSuperAdmin, response, primaryOrganization, organizationId, token, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                _a = req.body, email = _a.email, password = _a.password;
                if (!email || !password) {
                    return [2 /*return*/, res.status(400).json({ message: 'Email et mot de passe requis' })];
                }
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                        where: { email: email },
                        include: {
                            UserOrganization: {
                                include: {
                                    Organization: true,
                                    Role: {
                                        include: {
                                            Permission: true,
                                        },
                                    },
                                },
                            },
                        },
                    })];
            case 1:
                user = _d.sent();
                if (!user || !user.passwordHash) {
                    return [2 /*return*/, res.status(401).json({ message: 'Identifiants invalides' })];
                }
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.passwordHash)];
            case 2:
                isPasswordValid = _d.sent();
                if (!isPasswordValid) {
                    return [2 /*return*/, res.status(401).json({ message: 'Identifiants invalides' })];
                }
                _passwordHash = user.passwordHash, userWithoutPassword = __rest(user, ["passwordHash"]);
                userRoles = user.UserOrganization.map(function (uo) { return uo.Role; });
                allPermissions = userRoles.flatMap(function (role) { return role.Permission || []; });
                isSuperAdmin = user.role === 'super_admin' || userRoles.some(function (role) { return role.name === 'super_admin'; });
                response = {
                    currentUser: __assign(__assign({}, userWithoutPassword), { role: isSuperAdmin ? 'super_admin' : (((_b = userRoles[0]) === null || _b === void 0 ? void 0 : _b.name) || user.role || 'user'), permissions: allPermissions, isSuperAdmin: isSuperAdmin, organizations: user.UserOrganization.map(function (uo) { return ({
                            id: uo.Organization.id,
                            name: uo.Organization.name,
                            status: uo.status
                        }); }) }),
                    originalUser: null,
                };
                primaryOrganization = user.UserOrganization.find(function (uo) { return uo.status === 'active'; }) || user.UserOrganization[0];
                organizationId = primaryOrganization === null || primaryOrganization === void 0 ? void 0 : primaryOrganization.organizationId;
                token = jsonwebtoken_1.default.sign({
                    userId: user.id,
                    email: user.email,
                    organizationId: organizationId,
                    isSuperAdmin: isSuperAdmin,
                    role: isSuperAdmin ? 'super_admin' : (((_c = userRoles[0]) === null || _c === void 0 ? void 0 : _c.name) || user.role || 'user')
                }, getJWTSecret(), { expiresIn: '24h' });
                // Définir le cookie
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 24 * 60 * 60 * 1000, // 24 heures
                });
                console.log("[AUTH] Connexion r\u00E9ussie pour ".concat(email));
                res.status(200).json(response);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _d.sent();
                console.error('[AUTH] Erreur lors de la connexion:', error_1);
                res.status(500).json({ message: 'Erreur interne du serveur' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.login = login;
var getMe = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var token, decoded, user, _passwordHash2, userWithoutPassword, organizations, currentOrganization, userRoles, allPermissions, isSuperAdmin, response, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                token = req.cookies.token;
                if (!token) {
                    return [2 /*return*/, res.status(401).json({ message: 'Non authentifié' })];
                }
                decoded = jsonwebtoken_1.default.verify(token, getJWTSecret());
                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                        where: { id: decoded.userId },
                        include: {
                            UserOrganization: {
                                include: {
                                    Organization: true,
                                    Role: {
                                        include: {
                                            Permission: true
                                        }
                                    }
                                }
                            }
                        },
                    })];
            case 1:
                user = _b.sent();
                if (!user) {
                    res.clearCookie('token');
                    return [2 /*return*/, res.status(401).json({ message: 'Utilisateur introuvable' })];
                }
                _passwordHash2 = user.passwordHash, userWithoutPassword = __rest(user, ["passwordHash"]);
                organizations = user.UserOrganization.map(function (uo) { return ({
                    id: uo.Organization.id,
                    name: uo.Organization.name,
                    status: uo.status,
                    role: uo.Role.name,
                    roleLabel: uo.Role.label,
                    permissions: uo.Role.Permission || []
                }); });
                currentOrganization = organizations.find(function (org) { return org.status === 'ACTIVE'; }) || organizations[0] || null;
                userRoles = user.UserOrganization.map(function (uo) { return uo.Role; });
                allPermissions = userRoles.flatMap(function (role) { return role.Permission || []; });
                isSuperAdmin = user.role === 'super_admin' || userRoles.some(function (role) { return role.name === 'super_admin'; });
                response = {
                    currentUser: __assign(__assign({}, userWithoutPassword), { role: isSuperAdmin ? 'super_admin' : (((_a = userRoles[0]) === null || _a === void 0 ? void 0 : _a.name) || user.role || 'user'), permissions: allPermissions, isSuperAdmin: isSuperAdmin, organizations: organizations, currentOrganization: currentOrganization // Ajouter l'organisation actuelle
                     }),
                    originalUser: null // Pour l'usurpation d'identité, null par défaut
                };
                console.log("[AUTH] R\u00E9cup\u00E9ration des donn\u00E9es utilisateur pour ".concat(user.email));
                res.status(200).json(response);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error('[AUTH] Erreur lors de la vérification du token:', error_2);
                res.clearCookie('token');
                res.status(401).json({ message: 'Token invalide ou expiré' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getMe = getMe;
var logout = function (_req, res) {
    try {
        res.clearCookie('token');
        console.log('[AUTH] Déconnexion réussie');
        res.status(200).json({ message: 'Déconnexion réussie' });
    }
    catch (error) {
        console.error('[AUTH] Erreur lors de la déconnexion:', error);
        res.status(500).json({ message: 'Erreur lors de la déconnexion' });
    }
};
exports.logout = logout;

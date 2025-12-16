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
exports.requireRole = exports.requireSuperAdmin = exports.login = exports.authMiddleware = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var client_1 = require("@prisma/client");
var bcrypt_1 = __importDefault(require("bcrypt"));
var config_1 = require("../config");
var prisma = new client_1.PrismaClient();
var authMiddleware = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, cookieToken, orgIdFromHeader, token, decoded, user, organizationId, orgIdFromQuery, organization, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                authHeader = req.headers.authorization;
                cookieToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token;
                orgIdFromHeader = req.headers['x-organization-id'];
                console.log('[AUTH] x-organization-id de l\'en-tête:', orgIdFromHeader);
                // Essayer d'abord le cookie (plus fiable)
                if (cookieToken) {
                    token = cookieToken;
                    console.log('[AUTH] Token trouvé dans les cookies');
                }
                // Ensuite l'en-tête Authorization si pas de cookie ou si cookie non valide
                else if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.split(' ')[1];
                    console.log('[AUTH] Token trouvé dans l\'en-tête Authorization');
                }
                // Si aucun token n'est trouvé
                if (!token) {
                    console.log('[AUTH] Aucun token d\'authentification trouvé');
                    return [2 /*return*/, res.status(401).json({ error: 'Authentification requise' })];
                }
                // Si le token est un token de développement (à partir du frontend)
                if (token.startsWith('dev-token-')) {
                    console.log('[AUTH] Token de développement détecté, non autorisé en production');
                    return [2 /*return*/, res.status(401).json({ error: 'Token de développement non autorisé' })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 5, , 6]);
                decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: decoded.userId }
                    })];
            case 2:
                user = _d.sent();
                if (!user) {
                    console.log('[AUTH] Utilisateur non trouvé pour l\'ID:', decoded.userId);
                    return [2 /*return*/, res.status(401).json({ error: 'Authentification invalide' })];
                }
                organizationId = decoded.organizationId || null;
                orgIdFromQuery = ((_b = req.query) === null || _b === void 0 ? void 0 : _b.organizationId) || ((_c = req.query) === null || _c === void 0 ? void 0 : _c.orgId);
                if (!organizationId && orgIdFromQuery) {
                    console.log('[AUTH] Fallback organizationId depuis query string:', orgIdFromQuery);
                    organizationId = orgIdFromQuery;
                }
                // Si on a un ID d'organisation dans l'en-tête, il prime
                if (orgIdFromHeader) {
                    console.log('[AUTH] Utilisation de l\'ID d\'organisation de l\'en-tête:', orgIdFromHeader);
                    organizationId = orgIdFromHeader;
                }
                if (!organizationId) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.organization.findUnique({ where: { id: organizationId } })];
            case 3:
                organization = _d.sent();
                if (organization) {
                    console.log('[AUTH] Organisation trouvée:', organization.name);
                }
                else {
                    console.log('[AUTH] AVERTISSEMENT: Organisation non trouvée pour l\'ID:', organizationId);
                    return [2 /*return*/, res.status(404).json({ error: 'Organisation non trouvée' })];
                }
                _d.label = 4;
            case 4:
                // Configurer l'utilisateur dans la requête
                req.user = {
                    userId: user.id,
                    role: user.role || 'user',
                    organizationId: organizationId,
                    roles: user.role ? [user.role] : [],
                    firstname: user.firstName || '',
                    lastname: user.lastName || '',
                    email: user.email,
                    // 👑 SUPER IMPORTANT: Définir isSuperAdmin pour que les middlewares le reconnaissent ! 👑
                    isSuperAdmin: user.role === 'super_admin'
                };
                console.log('[AUTH] Utilisateur authentifié avec:', {
                    userId: req.user.userId,
                    role: req.user.role,
                    firstname: req.user.firstname,
                    lastname: req.user.lastname,
                    email: req.user.email,
                    organizationId: req.user.organizationId
                });
                return [2 /*return*/, next()];
            case 5:
                error_1 = _d.sent();
                console.error('[AUTH] Erreur de vérification du token:', error_1);
                return [2 /*return*/, res.status(401).json({ error: 'Token d\'authentification invalide' })];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.authMiddleware = authMiddleware;
var login = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, passwordMatch, userOrg, token, passwordHash, userWithoutPassword, e_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: email } })];
            case 2:
                user = _b.sent();
                if (!user) {
                    return [2 /*return*/, res.status(401).json({ error: 'Email ou mot de passe incorrect' })];
                }
                // Log pour vérifier l'utilisateur trouvé
                console.log('[Login] Utilisateur trouvé:', { id: user.id, email: user.email, role: user.role });
                return [4 /*yield*/, bcrypt_1.default.compare(password, user.passwordHash)];
            case 3:
                passwordMatch = _b.sent();
                if (!passwordMatch) {
                    return [2 /*return*/, res.status(401).json({ error: 'Email ou mot de passe incorrect' })];
                }
                // Assurer que le rôle existe avant de générer le token
                if (!user.role) {
                    console.error("[Login] ERREUR: Le r\u00F4le de l'utilisateur ".concat(user.email, " est manquant."));
                    return [2 /*return*/, res.status(500).json({ error: 'Erreur de configuration du compte : rôle manquant.' })];
                }
                return [4 /*yield*/, prisma.userOrganization.findFirst({
                        where: { userId: user.id },
                    })];
            case 4:
                userOrg = _b.sent();
                token = jsonwebtoken_1.default.sign({
                    userId: user.id,
                    // Utiliser 'roles' (pluriel) pour être cohérent
                    roles: [user.role],
                    organizationId: userOrg === null || userOrg === void 0 ? void 0 : userOrg.organizationId
                }, config_1.JWT_SECRET, { expiresIn: '1h' });
                passwordHash = user.passwordHash, userWithoutPassword = __rest(user, ["passwordHash"]);
                res.json({ token: token, user: userWithoutPassword });
                return [3 /*break*/, 6];
            case 5:
                e_1 = _b.sent();
                console.error('[Login] Erreur lors de la connexion:', e_1);
                res.status(500).json({ error: 'Erreur interne' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.login = login;
var requireSuperAdmin = function (req, res, next) {
    var _a, _b, _c;
    // Vérification adaptée pour notre middleware de développement
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'super_admin' || ((_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.roles) === null || _c === void 0 ? void 0 : _c.includes('super_admin'))) {
        next();
    }
    else {
        // Message d'erreur standardisé
        res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
};
exports.requireSuperAdmin = requireSuperAdmin;
// Fonction requireRole manquante
var requireRole = function (roles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentification requise.' });
        }
        var userRole = req.user.role;
        var userRoles = req.user.roles || [];
        // Vérifier si l'utilisateur a l'un des rôles requis
        var hasRequiredRole = roles.includes(userRole) || userRoles.some(function (role) { return roles.includes(role); });
        if (hasRequiredRole) {
            next();
        }
        else {
            res.status(403).json({ success: false, message: 'Accès non autorisé.' });
        }
    };
};
exports.requireRole = requireRole;
// ...autres parties du fichier inchangées...

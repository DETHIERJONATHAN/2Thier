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
exports.extractOrganization = exports.requireOrganization = exports.requireSuperAdmin = exports.isAdmin = exports.fetchFullUser = exports.authenticateToken = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var prisma_1 = __importDefault(require("../prisma"));
var config_1 = require("../config");
// Unifier le secret avec la configuration globale pour éviter les 401
var JWT_SECRET = config_1.JWT_SECRET;
console.log('[AUTH] 🔐 JWT_SECRET prefix:', typeof JWT_SECRET === 'string' ? JWT_SECRET.substring(0, 6) + '...' : 'invalid');
var authenticateToken = function (req, res, next) {
    console.log('[AUTH] 🔍 authenticateToken - Début');
    console.log('[AUTH] 📋 URL:', req.originalUrl);
    console.log('[AUTH] 📋 Method:', req.method);
    console.log('[AUTH] 🔐 Using JWT_SECRET prefix:', typeof JWT_SECRET === 'string' ? JWT_SECRET.substring(0, 6) + '...' : 'invalid');
    // Bypass pour tests internes (éviter besoin de token dans tests d'intégration ciblés)
    if (req.headers['x-test-bypass-auth'] === '1') {
        req.user = req.user || {
            id: 'test-user',
            email: 'test@example.com',
            organizationId: 'org-test',
            isSuperAdmin: true,
            role: 'super_admin'
        };
        console.log('[AUTH] 🚩 Bypass auth activé (x-test-bypass-auth)');
        return next();
    }
    var authHeader = req.headers['authorization'];
    var token = authHeader && authHeader.split(' ')[1];
    console.log('[AUTH] 📋 Auth header présent:', !!authHeader);
    // Si pas de token dans l'en-tête, vérifier les cookies
    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log('[AUTH] 🍪 Token trouvé dans les cookies');
    }
    if (!token) {
        console.log('[AUTH] ❌ Aucun token trouvé');
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }
    console.log('[AUTH] 🔑 Token présent, vérification...');
    try {
        var decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('[AUTH] ✅ Token valide, utilisateur:', decoded.userId);
        console.log('[AUTH] 📋 Email:', decoded.email);
        console.log('[AUTH] 📋 OrganizationId:', decoded.organizationId);
        console.log('[AUTH] 📋 SuperAdmin:', decoded.isSuperAdmin);
        // Correction : garantir que le champ 'role' est toujours présent pour les super admins
        if (!decoded.role && decoded.isSuperAdmin) {
            decoded.role = 'super_admin';
            console.log('[AUTH] 👑 Rôle super_admin assigné automatiquement');
        }
        req.user = __assign(__assign({}, decoded), { id: decoded.userId }); // Assurer la présence de id et userId
        console.log('[AUTH] ✅ req.user assigné:', { id: req.user.id, userId: req.user.userId, email: req.user.email });
        console.log('[AUTH] ✅ authenticateToken terminé avec succès');
        next();
    }
    catch (error) {
        console.log('[AUTH] ❌ Token invalide ou expiré:', error.message);
        console.log('[AUTH] ❌ Erreur détaillée:', error);
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware pour enrichir req.user avec les données complètes de la base de données.
 * Doit être appelé APRÈS authenticateToken.
 * Ne perturbe pas le flux d'authentification existant.
 */
var fetchFullUser = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var userFromDb, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("<<<<< [MIDDLEWARE] fetchFullUser: Exécution. >>>>>");
                if (!req.user || !req.user.userId) {
                    console.log("<<<<< [MIDDLEWARE] fetchFullUser: req.user ou req.user.userId manquant. Le middleware authenticateToken doit être exécuté avant. >>>>>");
                    return [2 /*return*/, res.status(401).json({ message: "Utilisateur non authentifié." })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.user.findUnique({
                        where: { id: req.user.userId },
                    })];
            case 2:
                userFromDb = _a.sent();
                if (!userFromDb) {
                    console.log("<<<<< [MIDDLEWARE] fetchFullUser: Utilisateur avec ID ".concat(req.user.userId, " non trouv\u00E9 dans la DB. >>>>>"));
                    return [2 /*return*/, res.status(401).json({ message: "Utilisateur non valide." })];
                }
                // Enrichir req.user avec les données complètes de la base de données
                req.user = __assign(__assign({}, userFromDb), req.user);
                console.log("<<<<< [MIDDLEWARE] fetchFullUser: req.user enrichi avec succès. >>>>>");
                next();
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error("<<<<< [MIDDLEWARE] fetchFullUser: Erreur lors de la récupération de l'utilisateur.", error_1);
                res.status(500).json({ message: "Erreur interne du serveur." });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.fetchFullUser = fetchFullUser;
// Middleware pour vérifier le rôle administrateur ou super_admin
var isAdmin = function (req, res, next) {
    var _a, _b;
    var role = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase().replace(/_/g, '');
    // Correction : inclure super_admin dans la logique de vérification
    if (role === 'admin' || role === 'superadmin') {
        return next();
    }
    return res.status(403).json({ error: 'Accès non autorisé. Rôle Administrateur requis.' });
};
exports.isAdmin = isAdmin;
var requireSuperAdmin = function (req, res, next) {
    var _a;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.isSuperAdmin)) {
        return res.status(403).json({ error: 'Accès réservé aux Super Admins' });
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
var requireOrganization = function (req, res, next) {
    var _a, _b;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId) && !((_b = req.user) === null || _b === void 0 ? void 0 : _b.isSuperAdmin)) {
        return res.status(403).json({ error: 'Organisation requise' });
    }
    next();
};
exports.requireOrganization = requireOrganization;
// Middleware pour extraire l'ID d'organisation
var extractOrganization = function (req, res, next) {
    // L'organisation peut venir du token JWT ou du header
    var orgHeader = req.headers['x-organization-id'];
    if (orgHeader && req.user) {
        req.user.organizationId = orgHeader;
    }
    next();
};
exports.extractOrganization = extractOrganization;

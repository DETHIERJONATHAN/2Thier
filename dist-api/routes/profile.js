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
var client_1 = require("@prisma/client");
var multer_1 = __importDefault(require("multer"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var prisma = new client_1.PrismaClient();
var router = (0, express_1.Router)();
var buildAvatarUrl = function (req, avatarPath) {
    if (!avatarPath) {
        return '';
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
    }
    var host = req.get('host');
    if (!host) {
        return avatarPath;
    }
    var normalizedPath = avatarPath.startsWith('/') ? avatarPath : "/".concat(avatarPath);
    return "".concat(req.protocol, "://").concat(host).concat(normalizedPath);
};
var sanitizeText = function (value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    var trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};
// Configuration de Multer pour le stockage des avatars
var storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        var dir = 'public/uploads/avatars';
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        var _a;
        var authReq = req;
        var userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
        cb(null, userId + path_1.default.extname(file.originalname));
    }
});
var upload = (0, multer_1.default)({ storage: storage });
// Le middleware d'authentification est appliqué à toutes les routes de ce routeur
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// GET /api/profile - Récupérer le profil de l'utilisateur
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, user, formattedUser, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    return [2 /*return*/, res.status(401).json({ error: "Utilisateur non authentifié" })];
                }
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: userId },
                        include: {
                            UserOrganization: {
                                include: {
                                    Organization: true,
                                    Role: true
                                }
                            }
                        }
                    })];
            case 1:
                user = _d.sent();
                if (!user) {
                    return [2 /*return*/, res.status(404).json({ error: "Utilisateur non trouvé" })];
                }
                formattedUser = {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName || "", // Utiliser firstName (camelCase) pour correspondre au frontend
                    lastName: user.lastName || "", // Utiliser lastName (camelCase) pour correspondre au frontend
                    address: user.address || "", // Ajouter l'adresse
                    vatNumber: user.vatNumber || "", // Ajouter le numéro TVA
                    phoneNumber: user.phoneNumber || "", // Ajouter le numéro de téléphone
                    role: user.role || "user",
                    avatarUrl: buildAvatarUrl(req, user.avatarUrl),
                    createdAt: user.createdAt.toISOString(),
                    updatedAt: user.updatedAt.toISOString(),
                    organizationId: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId) || null,
                    permissions: [], // À remplir si nécessaire
                    organization: ((_c = user.UserOrganization) === null || _c === void 0 ? void 0 : _c.length) > 0 ? {
                        id: user.UserOrganization[0].Organization.id,
                        name: user.UserOrganization[0].Organization.name
                    } : null
                };
                return [2 /*return*/, res.json(formattedUser)];
            case 2:
                error_1 = _d.sent();
                console.error("Error fetching user profile:", error_1);
                return [2 /*return*/, res.status(500).json({ error: "Internal server error" })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/profile/avatar - Upload a new avatar
router.post('/avatar', upload.single('avatar'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, avatarUrl, updatedUser, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(400).json({ error: "User ID not found in token" });
                    return [2 /*return*/];
                }
                if (!req.file) {
                    res.status(400).json({ error: "Aucun fichier n'a été téléversé." });
                    return [2 /*return*/];
                }
                avatarUrl = "/uploads/avatars/".concat(req.file.filename);
                return [4 /*yield*/, prisma.user.update({
                        where: { id: userId },
                        data: { avatarUrl: avatarUrl },
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                            address: true,
                            vatNumber: true,
                            phoneNumber: true,
                            status: true,
                            createdAt: true,
                            updatedAt: true,
                            UserOrganization: {
                                select: {
                                    Organization: {
                                        select: {
                                            id: true,
                                            name: true,
                                            status: true,
                                        }
                                    },
                                    Role: {
                                        select: {
                                            id: true,
                                            name: true,
                                            label: true,
                                            description: true,
                                        }
                                    },
                                    id: true
                                }
                            }
                        }
                    })];
            case 1:
                updatedUser = _b.sent();
                res.json(__assign(__assign({}, updatedUser), { avatarUrl: buildAvatarUrl(req, updatedUser.avatarUrl) }));
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error("Erreur lors du téléversement de l'avatar:", error_2);
                res.status(500).json({ error: 'Erreur interne du serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/profile/permissions - Get current user's permissions
router.get('/permissions', (function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, organizationId, user, userOrgLink, permissions, error_3;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!userId) {
                    return [2 /*return*/, res.status(400).json({ error: "User ID not found in token" })];
                }
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: userId },
                        select: { role: true } // On vérifie le rôle global de l'utilisateur
                    })];
            case 1:
                user = _c.sent();
                // Le super admin (rôle global) a toutes les permissions
                if ((user === null || user === void 0 ? void 0 : user.role) === 'super_admin') {
                    return [2 /*return*/, res.json({ permissions: ['manage:all'] })];
                }
                if (!organizationId) {
                    // Les utilisateurs non-super-admin doivent avoir un contexte d'organisation
                    return [2 /*return*/, res.json({ permissions: [] })];
                }
                return [4 /*yield*/, prisma.userOrganization.findUnique({
                        where: {
                            userId_organizationId: {
                                userId: userId,
                                organizationId: organizationId
                            }
                        },
                        include: {
                            Role: {
                                include: {
                                    Permission: {
                                        where: { allowed: true } // On ne récupère que les permissions actives
                                    }
                                }
                            }
                        }
                    })];
            case 2:
                userOrgLink = _c.sent();
                if (!userOrgLink || !userOrgLink.Role) {
                    // User is not in the organization or has no role assigned
                    return [2 /*return*/, res.json({ permissions: [] })];
                }
                permissions = userOrgLink.Role.Permission.map(function (p) { return "".concat(p.action, ":").concat(p.resource); });
                res.json({ permissions: permissions });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _c.sent();
                console.error("Failed to fetch permissions:", error_3);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); }));
// PUT /api/profile - Update current user's profile
router.put('/', (function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, _a, firstName, lastName, address, vatNumber, phoneNumber, avatarUrl, normalizedAvatarUrl, trimmed, parsed, updatedUser, error_4;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
                if (!userId) {
                    return [2 /*return*/, res.status(400).json({ error: "User ID not found in token" })];
                }
                _a = req.body, firstName = _a.firstName, lastName = _a.lastName, address = _a.address, vatNumber = _a.vatNumber, phoneNumber = _a.phoneNumber, avatarUrl = _a.avatarUrl;
                normalizedAvatarUrl = undefined;
                if (typeof avatarUrl === 'string') {
                    trimmed = avatarUrl.trim();
                    if (trimmed.length === 0) {
                        normalizedAvatarUrl = null;
                    }
                    else {
                        try {
                            parsed = new URL(trimmed);
                            normalizedAvatarUrl = parsed.pathname.startsWith('/uploads/') ? parsed.pathname : trimmed;
                        }
                        catch (_d) {
                            normalizedAvatarUrl = trimmed;
                        }
                    }
                }
                return [4 /*yield*/, prisma.user.update({
                        where: { id: userId },
                        data: {
                            firstName: sanitizeText(firstName),
                            lastName: sanitizeText(lastName),
                            address: sanitizeText(address),
                            vatNumber: sanitizeText(vatNumber),
                            phoneNumber: sanitizeText(phoneNumber),
                            avatarUrl: normalizedAvatarUrl,
                        },
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                            address: true,
                            vatNumber: true,
                            phoneNumber: true,
                            status: true,
                            createdAt: true,
                            updatedAt: true,
                            UserOrganization: {
                                select: {
                                    Organization: {
                                        select: {
                                            id: true,
                                            name: true,
                                            status: true,
                                        }
                                    },
                                    Role: {
                                        select: {
                                            id: true,
                                            name: true,
                                            label: true,
                                            description: true,
                                        }
                                    },
                                    id: true
                                }
                            }
                        }
                    })];
            case 1:
                updatedUser = _c.sent();
                res.json(__assign(__assign({}, updatedUser), { avatarUrl: buildAvatarUrl(req, updatedUser.avatarUrl) }));
                return [3 /*break*/, 3];
            case 2:
                error_4 = _c.sent();
                console.error('Error updating profile:', error_4);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); }));
exports.default = router;

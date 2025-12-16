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
var express_1 = __importDefault(require("express"));
var client_1 = require("@prisma/client");
var crypto_1 = require("../utils/crypto");
var requireRole_1 = require("../middlewares/requireRole");
var auth_1 = require("../middlewares/auth");
var impersonation_1 = require("../middlewares/impersonation");
var prisma = new client_1.PrismaClient();
var router = express_1.default.Router();
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// Route pour récupérer un utilisateur par son ID (pour restaurer l'impersonation)
router.get('/users/:id', (0, requireRole_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, user, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { id: id },
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                            status: true,
                        }
                    })];
            case 2:
                user = _a.sent();
                if (!user) {
                    res.status(404).json({ error: 'Utilisateur non trouvé' });
                    return [2 /*return*/];
                }
                res.json(user);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error("Erreur lors de la r\u00E9cup\u00E9ration de l'utilisateur ".concat(id, ":"), error_1);
                res.status(500).json({ error: 'Erreur interne du serveur' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Route pour récupérer le statut mail de tous les utilisateurs (pour l'admin)
router.get('/users/mail-status', (0, requireRole_1.requireRole)(['super_admin']), function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var users, usersWithMailStatus, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma.user.findMany({
                        include: {
                            mailSettings: true,
                        },
                    })];
            case 1:
                users = _a.sent();
                usersWithMailStatus = users.map(function (user) {
                    var _a, _b;
                    return {
                        id: user.id,
                        email: user.email,
                        name: "".concat(user.firstName || '', " ").concat(user.lastName || '').trim() || user.email,
                        isMailConfigured: (_b = (_a = user.mailSettings) === null || _a === void 0 ? void 0 : _a.isVerified) !== null && _b !== void 0 ? _b : false,
                    };
                });
                res.json(usersWithMailStatus);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Erreur lors de la récupération des utilisateurs:', error_2);
                res.status(500).json({ error: 'Erreur interne du serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Route pour définir/mettre à jour le mot de passe mail d'un utilisateur
router.post('/mail/settings', (0, requireRole_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, password, user, userName, encryptedPassword, userEmail, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, userId = _a.userId, password = _a.password;
                if (!userId || !password) {
                    res.status(400).json({ error: "L'ID de l'utilisateur et le mot de passe sont requis." });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: userId } })];
            case 2:
                user = _b.sent();
                if (!user) {
                    res.status(404).json({ error: 'Utilisateur non trouvé.' });
                    return [2 /*return*/];
                }
                userName = "".concat(user.firstName || '', " ").concat(user.lastName || '').trim();
                if (!userName) {
                    res.status(400).json({ error: "Le nom de l'utilisateur n'est pas défini, impossible de créer l'adresse email." });
                    return [2 /*return*/];
                }
                encryptedPassword = (0, crypto_1.encrypt)(password);
                userEmail = "".concat(userName.replace(/\s+/g, '.').toLowerCase(), "@2thier.be");
                return [4 /*yield*/, prisma.mailSettings.upsert({
                        where: { userId: userId },
                        update: {
                            encryptedPassword: encryptedPassword,
                            isVerified: true,
                        },
                        create: {
                            userId: userId,
                            emailAddress: userEmail,
                            encryptedPassword: encryptedPassword,
                            imapHost: 'imap.one.com',
                            imapPort: 993,
                            smtpHost: 'mail.one.com',
                            smtpPort: 465,
                            isVerified: true,
                        },
                    })];
            case 3:
                _b.sent();
                res.status(200).json({ message: 'Configuration mail mise à jour avec succès.' });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                console.error('Erreur lors de la mise à jour de la configuration mail:', error_3);
                res.status(500).json({ error: 'Erreur interne du serveur' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Route pour récupérer les paramètres mail d'un utilisateur
router.get('/mail/settings', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, mailSettings, _encryptedPassword, settings, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ error: 'Utilisateur non authentifié.' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.mailSettings.findUnique({
                        where: { userId: userId },
                    })];
            case 1:
                mailSettings = _b.sent();
                if (!mailSettings) {
                    res.status(404).json({ error: 'Aucune configuration mail trouvée pour cet utilisateur.' });
                    return [2 /*return*/];
                }
                _encryptedPassword = mailSettings.encryptedPassword, settings = __rest(mailSettings, ["encryptedPassword"]);
                res.status(200).json(settings);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                console.error('Erreur lors de la récupération des paramètres mail:', error_4);
                res.status(500).json({ error: 'Erreur interne du serveur' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

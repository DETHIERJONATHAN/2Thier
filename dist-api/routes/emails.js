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
var GmailService_js_1 = __importDefault(require("../services/GmailService.js"));
var router = (0, express_1.Router)();
/**
 * @route   GET /api/emails
 * @desc    Récupère les emails Gmail de l'utilisateur authentifié pour un dossier donné.
 * @access  Private
 */
router.get('/', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, folder, threads, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId)) {
                    return [2 /*return*/, res.status(401).json({ error: 'Authentification requise' })];
                }
                _a = req.query.folder, folder = _a === void 0 ? 'INBOX' : _a;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, GmailService_js_1.default.listThreads(req.user.userId, folder)];
            case 2:
                threads = _c.sent();
                res.json(threads);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _c.sent();
                console.error("Erreur lors de la r\u00E9cup\u00E9ration des emails Gmail du dossier ".concat(folder, ":"), error_1);
                // Gérer les erreurs d'authentification spécifiquement
                if (error_1 instanceof Error && error_1.message.includes('Authentication failed')) {
                    return [2 /*return*/, res.status(401).json({
                            error: 'Authentification Google requise',
                            needsAuth: true
                        })];
                }
                // Gérer le cas où l'utilisateur n'est pas connecté à Google
                if (error_1 instanceof Error && error_1.message.includes('not authenticated with Google')) {
                    return [2 /*return*/, res.status(200).json([])]; // Retourner un tableau vide plutôt qu'une erreur
                }
                // Autres erreurs : retourner un tableau vide pour éviter de casser l'agenda
                console.warn("Gmail non disponible pour user ".concat(req.user.userId, ", retour d'un tableau vide"));
                res.status(200).json([]);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @route   GET /api/emails/thread/:threadId
 * @desc    Récupère les détails d'une conversation Gmail
 * @access  Private
 */
router.get('/thread/:threadId', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var threadId, threadDetails, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                    return [2 /*return*/, res.status(401).json({ error: 'Authentification requise' })];
                }
                threadId = req.params.threadId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, GmailService_js_1.default.getThreadDetails(req.user.userId, threadId)];
            case 2:
                threadDetails = _b.sent();
                res.json(threadDetails);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                console.error("Erreur lors de la r\u00E9cup\u00E9ration du thread ".concat(threadId, ":"), error_2);
                res.status(500).json({ error: 'Une erreur interne est survenue.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @route   POST /api/emails/send
 * @desc    Envoie un email via Gmail
 * @access  Private
 */
router.post('/send', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, to, subject, body, result, error_3;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId)) {
                    return [2 /*return*/, res.status(401).json({ error: 'Authentification requise' })];
                }
                _a = req.body, to = _a.to, subject = _a.subject, body = _a.body;
                if (!to || !subject || !body) {
                    return [2 /*return*/, res.status(400).json({ error: 'Destinataire, sujet et corps requis' })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, GmailService_js_1.default.sendEmail(req.user.userId, to, subject, body)];
            case 2:
                result = _c.sent();
                res.json({ success: true, messageId: result.id });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _c.sent();
                console.error('Erreur lors de l\'envoi de l\'email:', error_3);
                res.status(500).json({ error: 'Une erreur interne est survenue.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

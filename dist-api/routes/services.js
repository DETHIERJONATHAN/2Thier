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
var express_1 = __importDefault(require("express"));
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var zod_1 = require("zod");
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middlewares/auth.js");
var prisma = new client_1.PrismaClient();
var router = express_1.default.Router();
// Rate limiting pour les services
var servicesRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Augmenté pour les appels bulk légitimes
    message: {
        success: false,
        message: 'Trop de requêtes vers les services. Veuillez patienter.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Schémas de validation Zod
var serviceParamsSchema = zod_1.z.object({
    serviceName: zod_1.z.enum(['email', 'telnyx']),
    // Certains environnements utilisent des IDs non-UUID (cuid, etc.)
    userId: zod_1.z.string().min(1, 'ID utilisateur invalide')
});
// Middleware d'authentification
// @ts-expect-error Le middleware est compatible
router.use(auth_js_1.authMiddleware);
router.use(servicesRateLimit);
// Fonction utilitaire pour activer/désactiver un service
var handleServiceToggle = function (res, userId, serviceType, isActive) { return __awaiter(void 0, void 0, void 0, function () {
    var validatedUserId, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                validatedUserId = zod_1.z.string().min(1).parse(userId);
                return [4 /*yield*/, prisma.userService.upsert({
                        where: {
                            userId_serviceType: { userId: validatedUserId, serviceType: serviceType }
                        },
                        update: { isActive: isActive },
                        create: { userId: validatedUserId, serviceType: serviceType, isActive: isActive, isConfigured: false },
                    })];
            case 1:
                _a.sent();
                res.json({
                    success: true,
                    message: "Service ".concat(serviceType, " mis \u00E0 jour."),
                    data: { userId: validatedUserId, serviceType: serviceType, isActive: isActive }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error("[API/Services] Erreur lors de la mise \u00E0 jour du service ".concat(serviceType, ":"), error_1);
                if (error_1 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Paramètres invalides', errors: error_1.errors })];
                }
                res.status(500).json({ success: false, message: "Impossible de mettre \u00E0 jour le service ".concat(serviceType, ".") });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
// Helper pour normaliser la sortie côté front (serviceName en lower-case)
var mapService = function (s) {
    var _a, _b, _c, _d;
    return ({
        id: s.id,
        userId: s.userId,
        serviceType: s.serviceType,
        serviceName: s.serviceType.toLowerCase(),
        isActive: s.isActive,
        isConfigured: s.isConfigured,
        email: (_a = s.email) !== null && _a !== void 0 ? _a : undefined,
        phoneNumber: (_b = s.phoneNumber) !== null && _b !== void 0 ? _b : undefined,
        apiKey: (_c = s.apiKey) !== null && _c !== void 0 ? _c : undefined,
        data: (_d = s.data) !== null && _d !== void 0 ? _d : undefined,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
    });
};
// **ROUTE CORRIGÉE** : Récupérer TOUS les services pour un utilisateur (corrige le 404)
router.get('/status/:userId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, services, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = zod_1.z.object({ userId: zod_1.z.string().min(1) }).parse(req.params).userId;
                return [4 /*yield*/, prisma.userService.findMany({ where: { userId: userId } })];
            case 1:
                services = _a.sent();
                res.json({ success: true, data: services.map(mapService) });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error("[API/Services] Erreur GET /status/".concat(req.params.userId, ":"), error_2);
                if (error_2 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'ID utilisateur invalide.' })];
                }
                res.status(500).json({ success: false, message: 'Erreur serveur.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// **NOUVELLE ROUTE OPTIMISÉE** : Récupérer les services pour plusieurs utilisateurs
router.post('/status/bulk', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userIds, services, servicesByUser, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userIds = zod_1.z.object({ userIds: zod_1.z.array(zod_1.z.string().min(1)) }).parse(req.body).userIds;
                if (userIds.length === 0) {
                    return [2 /*return*/, res.json({ success: true, data: {} })];
                }
                return [4 /*yield*/, prisma.userService.findMany({
                        where: { userId: { in: userIds } },
                    })];
            case 1:
                services = _a.sent();
                servicesByUser = services.reduce(function (acc, service) {
                    if (!acc[service.userId])
                        acc[service.userId] = [];
                    acc[service.userId].push(mapService(service));
                    return acc;
                }, {});
                res.json({ success: true, data: servicesByUser });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('[API/Services] Erreur POST /status/bulk:', error_3);
                if (error_3 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Données invalides.' })];
                }
                res.status(500).json({ success: false, message: 'Erreur serveur.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Activer un service
router.post('/:serviceName/enable/:userId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, serviceName, userId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = serviceParamsSchema.parse(req.params), serviceName = _a.serviceName, userId = _a.userId;
                return [4 /*yield*/, handleServiceToggle(res, userId, serviceName.toUpperCase(), true)];
            case 1:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
// Désactiver un service
router.post('/:serviceName/disable/:userId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, serviceName, userId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = serviceParamsSchema.parse(req.params), serviceName = _a.serviceName, userId = _a.userId;
                return [4 /*yield*/, handleServiceToggle(res, userId, serviceName.toUpperCase(), false)];
            case 1:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
exports.default = router;

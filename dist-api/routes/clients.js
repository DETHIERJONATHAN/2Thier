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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middleware/auth.js");
var client_1 = require("@prisma/client");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Appliquer l'authentification à toutes les routes
router.use(auth_js_1.authenticateToken);
// GET /api/clients - Récupérer tous les clients (basé sur les leads)
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var leads, clients, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('[CLIENTS] Récupération des clients pour l\'organisation:', req.organizationId);
                return [4 /*yield*/, prisma.lead.findMany({
                        where: {
                            organizationId: req.organizationId,
                            // Filtrer pour obtenir les leads qui sont devenus des clients
                            OR: [
                                { status: { contains: 'client', mode: 'insensitive' } },
                                { status: { contains: 'converti', mode: 'insensitive' } },
                                { status: { contains: 'actif', mode: 'insensitive' } }
                            ]
                        },
                        include: {
                            assignedTo: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            },
                            leadStatus: true
                        },
                        orderBy: {
                            updatedAt: 'desc'
                        }
                    })];
            case 1:
                leads = _a.sent();
                clients = leads.map(function (lead) {
                    var data = lead.data || {};
                    return {
                        id: lead.id,
                        name: data.company || data.name || "Lead ".concat(lead.id.slice(0, 8)),
                        email: data.email || data.contactEmail || '',
                        phone: data.phone || data.phoneNumber || '',
                        company: data.company || '',
                        status: lead.status,
                        assignedTo: lead.assignedTo,
                        createdAt: lead.createdAt,
                        updatedAt: lead.updatedAt
                    };
                });
                console.log("[CLIENTS] ".concat(clients.length, " clients trouv\u00E9s"));
                res.json(clients);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('[CLIENTS] Erreur lors de la récupération des clients:', error_1);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des clients',
                    message: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/clients/:id - Récupérer un client spécifique
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, lead, data, client, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                console.log('[CLIENTS] Récupération du client:', id);
                return [4 /*yield*/, prisma.lead.findFirst({
                        where: {
                            id: id,
                            organizationId: req.organizationId
                        },
                        include: {
                            assignedTo: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            },
                            leadStatus: true
                        }
                    })];
            case 1:
                lead = _a.sent();
                if (!lead) {
                    return [2 /*return*/, res.status(404).json({ error: 'Client non trouvé' })];
                }
                data = lead.data || {};
                client = {
                    id: lead.id,
                    name: data.company || data.name || "Lead ".concat(lead.id.slice(0, 8)),
                    email: data.email || data.contactEmail || '',
                    phone: data.phone || data.phoneNumber || '',
                    company: data.company || '',
                    status: lead.status,
                    assignedTo: lead.assignedTo,
                    createdAt: lead.createdAt,
                    updatedAt: lead.updatedAt,
                    data: lead.data
                };
                res.json(client);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[CLIENTS] Erreur lors de la récupération du client:', error_2);
                res.status(500).json({
                    error: 'Erreur lors de la récupération du client',
                    message: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/clients - Créer un nouveau client
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, email, phone, company, lead, client, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, email = _a.email, phone = _a.phone, company = _a.company;
                console.log('[CLIENTS] Création d\'un nouveau client:', { name: name_1, email: email, company: company });
                return [4 /*yield*/, prisma.lead.create({
                        data: {
                            organizationId: req.organizationId,
                            status: 'client',
                            data: {
                                name: name_1,
                                email: email,
                                phone: phone,
                                company: company,
                                source: 'manuel'
                            }
                        },
                        include: {
                            assignedTo: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            }
                        }
                    })];
            case 1:
                lead = _b.sent();
                client = {
                    id: lead.id,
                    name: company || name_1,
                    email: email,
                    phone: phone,
                    company: company,
                    status: lead.status,
                    assignedTo: lead.assignedTo,
                    createdAt: lead.createdAt,
                    updatedAt: lead.updatedAt
                };
                res.status(201).json(client);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('[CLIENTS] Erreur lors de la création du client:', error_3);
                res.status(500).json({
                    error: 'Erreur lors de la création du client',
                    message: error_3 instanceof Error ? error_3.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

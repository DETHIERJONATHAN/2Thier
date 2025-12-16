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
// GET /api/projects - Récupérer tous les projets
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var projectLeads, projects, sampleProjects, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('[PROJECTS] Récupération des projets pour l\'organisation:', req.organizationId);
                return [4 /*yield*/, prisma.lead.findMany({
                        where: {
                            organizationId: req.organizationId,
                            OR: [
                                { status: { contains: 'projet', mode: 'insensitive' } },
                                { status: { contains: 'en cours', mode: 'insensitive' } },
                                { status: { contains: 'development', mode: 'insensitive' } }
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
                projectLeads = _a.sent();
                projects = projectLeads.map(function (lead) {
                    var data = lead.data || {};
                    return {
                        id: lead.id,
                        name: data.name || "Projet ".concat(lead.id.slice(0, 8)),
                        description: data.description || '',
                        status: lead.status,
                        client: data.clientName || '',
                        assignedTo: lead.assignedTo,
                        budget: data.budget || 0,
                        deadline: data.deadline || null,
                        priority: data.priority || 'medium',
                        createdAt: lead.createdAt,
                        updatedAt: lead.updatedAt
                    };
                });
                // Si aucun projet trouvé, retourner quelques exemples pour démonstration
                if (projects.length === 0) {
                    sampleProjects = [
                        {
                            id: 'sample-1',
                            name: 'Site web entreprise',
                            description: 'Développement du site vitrine',
                            status: 'en cours',
                            client: 'Client Exemple',
                            assignedTo: null,
                            budget: 5000,
                            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            priority: 'high',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            id: 'sample-2',
                            name: 'Application mobile',
                            description: 'App iOS/Android',
                            status: 'planifié',
                            client: 'Autre Client',
                            assignedTo: null,
                            budget: 15000,
                            deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                            priority: 'medium',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    ];
                    console.log('[PROJECTS] Aucun projet trouvé, retour d\'exemples');
                    return [2 /*return*/, res.json(sampleProjects)];
                }
                console.log("[PROJECTS] ".concat(projects.length, " projets trouv\u00E9s"));
                res.json(projects);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('[PROJECTS] Erreur lors de la récupération des projets:', error_1);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des projets',
                    message: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/projects/:id - Récupérer un projet spécifique
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, sampleProject, lead, data, project, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                console.log('[PROJECTS] Récupération du projet:', id);
                // Vérifier s'il s'agit d'un exemple
                if (id.startsWith('sample-')) {
                    sampleProject = {
                        id: id,
                        name: id === 'sample-1' ? 'Site web entreprise' : 'Application mobile',
                        description: id === 'sample-1' ? 'Développement du site vitrine' : 'App iOS/Android',
                        status: 'en cours',
                        client: 'Client Exemple',
                        assignedTo: null,
                        budget: id === 'sample-1' ? 5000 : 15000,
                        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        priority: 'high',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    return [2 /*return*/, res.json(sampleProject)];
                }
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
                            }
                        }
                    })];
            case 1:
                lead = _a.sent();
                if (!lead) {
                    return [2 /*return*/, res.status(404).json({ error: 'Projet non trouvé' })];
                }
                data = lead.data || {};
                project = {
                    id: lead.id,
                    name: data.name || "Projet ".concat(lead.id.slice(0, 8)),
                    description: data.description || '',
                    status: lead.status,
                    client: data.clientName || '',
                    assignedTo: lead.assignedTo,
                    budget: data.budget || 0,
                    deadline: data.deadline || null,
                    priority: data.priority || 'medium',
                    createdAt: lead.createdAt,
                    updatedAt: lead.updatedAt,
                    data: lead.data
                };
                res.json(project);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[PROJECTS] Erreur lors de la récupération du projet:', error_2);
                res.status(500).json({
                    error: 'Erreur lors de la récupération du projet',
                    message: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST /api/projects - Créer un nouveau projet
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, description, clientName, budget, deadline, priority, lead, project, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, description = _a.description, clientName = _a.clientName, budget = _a.budget, deadline = _a.deadline, priority = _a.priority;
                console.log('[PROJECTS] Création d\'un nouveau projet:', { name: name_1, clientName: clientName });
                return [4 /*yield*/, prisma.lead.create({
                        data: {
                            organizationId: req.organizationId,
                            status: 'projet',
                            data: {
                                name: name_1,
                                description: description,
                                clientName: clientName,
                                budget: budget ? parseFloat(budget) : 0,
                                deadline: deadline,
                                priority: priority || 'medium',
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
                project = {
                    id: lead.id,
                    name: name_1,
                    description: description,
                    status: lead.status,
                    client: clientName,
                    assignedTo: lead.assignedTo,
                    budget: budget ? parseFloat(budget) : 0,
                    deadline: deadline,
                    priority: priority || 'medium',
                    createdAt: lead.createdAt,
                    updatedAt: lead.updatedAt
                };
                res.status(201).json(project);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('[PROJECTS] Erreur lors de la création du projet:', error_3);
                res.status(500).json({
                    error: 'Erreur lors de la création du projet',
                    message: error_3 instanceof Error ? error_3.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

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
var express_1 = __importDefault(require("express"));
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middlewares/auth.js");
var router = express_1.default.Router();
var prisma = new client_1.PrismaClient();
// 📊 GET /api/dashboard/stats - Récupérer les statistiques du dashboard
router.get('/stats', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, isSuperAdmin, whereCondition, _a, totalLeads, newLeadsToday, totalClients, totalUsers, completedLeads, pendingTasks, upcomingMeetings, monthlyRevenue, conversionRate, monthlyGrowth, stats, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                isSuperAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'super_admin';
                if (!organizationId && !isSuperAdmin) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organisation ID requis ou droits super admin'
                        })];
                }
                whereCondition = isSuperAdmin ? {} : { organizationId: organizationId };
                return [4 /*yield*/, Promise.all([
                        // Total des leads
                        prisma.lead.count({
                            where: whereCondition
                        }),
                        // Nouveaux leads aujourd'hui
                        prisma.lead.count({
                            where: __assign(__assign({}, whereCondition), { createdAt: {
                                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                                } })
                        }),
                        // Total clients actifs
                        prisma.user.count({
                            where: __assign(__assign({}, whereCondition), { status: 'active' })
                        }),
                        // Total utilisateurs
                        prisma.user.count({
                            where: whereCondition
                        }),
                        // Leads convertis (pour calculer le taux de conversion)
                        prisma.lead.count({
                            where: __assign(__assign({}, whereCondition), { status: 'converti' })
                        }),
                        // Tâches en attente (simulé pour l'instant)
                        Promise.resolve(Math.floor(Math.random() * 20) + 5),
                        // RDV à venir (simulé pour l'instant)
                        Promise.resolve(Math.floor(Math.random() * 10) + 2),
                        // CA du mois (simulé pour l'instant)
                        Promise.resolve(Math.floor(Math.random() * 100000) + 50000)
                    ])];
            case 1:
                _a = _d.sent(), totalLeads = _a[0], newLeadsToday = _a[1], totalClients = _a[2], totalUsers = _a[3], completedLeads = _a[4], pendingTasks = _a[5], upcomingMeetings = _a[6], monthlyRevenue = _a[7];
                conversionRate = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;
                monthlyGrowth = Math.floor(Math.random() * 30) - 10;
                stats = {
                    totalLeads: totalLeads,
                    newLeadsToday: newLeadsToday,
                    totalClients: totalClients,
                    totalUsers: totalUsers,
                    conversionRate: Math.round(conversionRate * 10) / 10,
                    pendingTasks: pendingTasks,
                    upcomingMeetings: upcomingMeetings,
                    totalRevenue: monthlyRevenue,
                    monthlyGrowth: monthlyGrowth
                };
                res.json({
                    success: true,
                    data: stats
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('❌ [DASHBOARD] Erreur lors de la récupération des stats:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des statistiques',
                    error: process.env.NODE_ENV === 'development' ? error_1.message : undefined
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 📈 GET /api/dashboard/activities - Récupérer les activités récentes RÉELLES
router.get('/activities', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, isSuperAdmin, limit, whereCondition, _a, recentLeads, recentEmails, recentCalendarEvents, timelineEvents, activities_1, sortedActivities, error_2;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                isSuperAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'super_admin';
                limit = parseInt(req.query.limit) || 10;
                if (!organizationId && !isSuperAdmin) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organisation ID requis ou droits super admin'
                        })];
                }
                whereCondition = isSuperAdmin ? {} : { organizationId: organizationId };
                return [4 /*yield*/, Promise.all([
                        // Leads récents
                        prisma.lead.findMany({
                            where: __assign(__assign({}, whereCondition), { createdAt: {
                                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 derniers jours
                                } }),
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                company: true,
                                createdAt: true,
                                status: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: limit
                        }),
                        // Emails récents (si applicable)
                        organizationId ? prisma.email.findMany({
                            where: {
                                createdAt: {
                                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 dernières heures
                                },
                                User: {
                                    UserOrganization: {
                                        some: {
                                            organizationId: organizationId
                                        }
                                    }
                                }
                            },
                            select: {
                                id: true,
                                subject: true,
                                from: true,
                                to: true,
                                createdAt: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: Math.floor(limit / 2)
                        }) : [],
                        // Événements de calendrier récents
                        prisma.calendarEvent.findMany({
                            where: __assign(__assign({}, whereCondition), { createdAt: {
                                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                } }),
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                startDate: true,
                                createdAt: true,
                                status: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: Math.floor(limit / 2)
                        }),
                        // Événements de timeline
                        prisma.timelineEvent.findMany({
                            where: __assign(__assign({}, whereCondition), { createdAt: {
                                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                } }),
                            select: {
                                id: true,
                                eventType: true,
                                entityType: true,
                                data: true,
                                createdAt: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: Math.floor(limit / 2)
                        })
                    ])];
            case 1:
                _a = _d.sent(), recentLeads = _a[0], recentEmails = _a[1], recentCalendarEvents = _a[2], timelineEvents = _a[3];
                activities_1 = [];
                // Ajouter les leads
                recentLeads.forEach(function (lead) {
                    activities_1.push({
                        id: "lead-".concat(lead.id),
                        type: 'lead',
                        title: 'Nouveau lead créé',
                        description: "".concat(lead.firstName, " ").concat(lead.lastName).concat(lead.company ? " - ".concat(lead.company) : ''),
                        timestamp: lead.createdAt.toISOString(),
                        status: 'success',
                        entityId: lead.id
                    });
                });
                // Ajouter les emails
                recentEmails.forEach(function (email) {
                    activities_1.push({
                        id: "email-".concat(email.id),
                        type: 'email',
                        title: 'Email reçu',
                        description: email.subject || 'Sans objet',
                        timestamp: email.createdAt.toISOString(),
                        status: 'info',
                        entityId: email.id
                    });
                });
                // Ajouter les événements de calendrier
                recentCalendarEvents.forEach(function (event) {
                    activities_1.push({
                        id: "calendar-".concat(event.id),
                        type: 'meeting',
                        title: event.title || 'Événement calendrier',
                        description: event.description || "Pr\u00E9vu le ".concat(event.startDate.toLocaleDateString('fr-FR')),
                        timestamp: event.createdAt.toISOString(),
                        status: event.status === 'confirmed' ? 'success' : 'warning',
                        entityId: event.id
                    });
                });
                // Ajouter les événements de timeline
                timelineEvents.forEach(function (event) {
                    activities_1.push({
                        id: "timeline-".concat(event.id),
                        type: event.entityType || 'task',
                        title: event.eventType || 'Activité système',
                        description: event.data ? JSON.stringify(event.data).substring(0, 100) + '...' : 'Activité automatique',
                        timestamp: event.createdAt.toISOString(),
                        status: 'info',
                        entityId: event.id
                    });
                });
                sortedActivities = activities_1
                    .sort(function (a, b) { return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); })
                    .slice(0, limit);
                res.json({
                    success: true,
                    data: sortedActivities
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _d.sent();
                console.error('❌ [DASHBOARD] Erreur lors de la récupération des activités:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des activités',
                    error: process.env.NODE_ENV === 'development' ? error_2.message : undefined
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 🏆 GET /api/dashboard/top-leads - Récupérer les meilleurs leads RÉELS
router.get('/top-leads', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, isSuperAdmin, limit, whereCondition, topLeads, leadsWithScore, sortedLeads, error_3;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                isSuperAdmin = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'super_admin';
                limit = parseInt(req.query.limit) || 5;
                if (!organizationId && !isSuperAdmin) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organisation ID requis ou droits super admin'
                        })];
                }
                whereCondition = isSuperAdmin ? {} : { organizationId: organizationId };
                return [4 /*yield*/, prisma.lead.findMany({
                        where: __assign(__assign({}, whereCondition), { status: {
                                not: 'supprimé'
                            } }),
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            company: true,
                            email: true,
                            phone: true,
                            status: true,
                            lastContactDate: true,
                            nextFollowUpDate: true,
                            createdAt: true,
                            updatedAt: true,
                            source: true,
                            notes: true,
                            assignedToId: true,
                            User: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            },
                            LeadStatus: {
                                select: {
                                    name: true,
                                    color: true
                                }
                            }
                        },
                        orderBy: [
                            { updatedAt: 'desc' },
                            { createdAt: 'desc' }
                        ],
                        take: limit
                    })];
            case 1:
                topLeads = _c.sent();
                leadsWithScore = topLeads.map(function (lead) {
                    var _a, _b, _c, _d, _e;
                    var score = 50; // Score de base
                    // Bonus si contact récent
                    if (lead.lastContactDate) {
                        var daysSinceContact = Math.floor((Date.now() - lead.lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysSinceContact < 7)
                            score += 20;
                        else if (daysSinceContact < 30)
                            score += 10;
                    }
                    // Bonus si suivi planifié
                    if (lead.nextFollowUpDate && lead.nextFollowUpDate > new Date()) {
                        score += 15;
                    }
                    // Bonus si email et téléphone
                    if (lead.email)
                        score += 10;
                    if (lead.phone)
                        score += 10;
                    // Bonus si entreprise
                    if (lead.company)
                        score += 15;
                    // Bonus/malus selon statut
                    switch (lead.status) {
                        case 'qualifié':
                        case 'négociation':
                            score += 25;
                            break;
                        case 'nouveau':
                            score += 10;
                            break;
                        case 'prospect':
                            score += 15;
                            break;
                        case 'perdu':
                            score -= 30;
                            break;
                    }
                    // Limiter le score entre 0 et 100
                    score = Math.max(0, Math.min(100, score));
                    return {
                        id: lead.id,
                        nom: lead.lastName || 'N/A',
                        prenom: lead.firstName || 'N/A',
                        entreprise: lead.company || 'Particulier',
                        email: lead.email,
                        phone: lead.phone,
                        status: ((_a = lead.LeadStatus) === null || _a === void 0 ? void 0 : _a.name) || lead.status || 'nouveau',
                        statusColor: ((_b = lead.LeadStatus) === null || _b === void 0 ? void 0 : _b.color) || '#6b7280',
                        score: Math.round(score),
                        lastContact: ((_c = lead.lastContactDate) === null || _c === void 0 ? void 0 : _c.toISOString().split('T')[0]) || null,
                        nextFollowUp: ((_d = lead.nextFollowUpDate) === null || _d === void 0 ? void 0 : _d.toISOString().split('T')[0]) || null,
                        assignedTo: lead.User ? "".concat(lead.User.firstName, " ").concat(lead.User.lastName) : null,
                        source: lead.source || 'Manuel',
                        createdAt: lead.createdAt.toISOString(),
                        notes: ((_e = lead.notes) === null || _e === void 0 ? void 0 : _e.substring(0, 100)) + (lead.notes && lead.notes.length > 100 ? '...' : '') || null
                    };
                });
                sortedLeads = leadsWithScore.sort(function (a, b) { return b.score - a.score; });
                res.json({
                    success: true,
                    data: sortedLeads
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _c.sent();
                console.error('❌ [DASHBOARD] Erreur lors de la récupération des top leads:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des meilleurs leads',
                    error: process.env.NODE_ENV === 'development' ? error_3.message : undefined
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 📅 GET /api/dashboard/tasks - Récupérer les tâches RÉELLES
router.get('/tasks', auth_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, isSuperAdmin, whereCondition, today, startOfDay, endOfDay, _a, leadsToFollowUp, todayEvents, overdueFollowUps, taskData, error_4;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                organizationId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                isSuperAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'super_admin';
                if (!organizationId && !isSuperAdmin) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Organisation ID requis ou droits super admin'
                        })];
                }
                whereCondition = isSuperAdmin ? {} : { organizationId: organizationId };
                today = new Date();
                startOfDay = new Date(today.setHours(0, 0, 0, 0));
                endOfDay = new Date(today.setHours(23, 59, 59, 999));
                return [4 /*yield*/, Promise.all([
                        // Leads avec suivi prévu aujourd'hui
                        prisma.lead.count({
                            where: __assign(__assign({}, whereCondition), { nextFollowUpDate: {
                                    gte: startOfDay,
                                    lte: endOfDay
                                } })
                        }),
                        // Événements d'aujourd'hui
                        prisma.calendarEvent.count({
                            where: __assign(__assign({}, whereCondition), { startDate: {
                                    gte: startOfDay,
                                    lte: endOfDay
                                } })
                        }),
                        // Suivis en retard
                        prisma.lead.count({
                            where: __assign(__assign({}, whereCondition), { nextFollowUpDate: {
                                    lt: startOfDay
                                } })
                        })
                    ])];
            case 1:
                _a = _d.sent(), leadsToFollowUp = _a[0], todayEvents = _a[1], overdueFollowUps = _a[2];
                taskData = {
                    pendingTasks: overdueFollowUps,
                    upcomingMeetings: todayEvents,
                    followUpsToday: leadsToFollowUp,
                    totalTasks: overdueFollowUps + todayEvents + leadsToFollowUp
                };
                res.json({
                    success: true,
                    data: taskData
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _d.sent();
                console.error('❌ [DASHBOARD] Erreur lors de la récupération des tâches:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des tâches',
                    error: process.env.NODE_ENV === 'development' ? error_4.message : undefined
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var client_1 = require("@prisma/client");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Appliquer l'authentification à toutes les routes
router.use(auth_js_1.authMiddleware);
// GET /api/leads
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, isSuperAdmin, allLeads, formattedLeads_1, error_1, organizationId, leads, formattedLeads, error_2;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    return __generator(this, function (_r) {
        switch (_r.label) {
            case 0:
                _r.trys.push([0, 6, , 7]);
                authReq = req;
                // 🐛 Debug logs pour comprendre le problème SuperAdmin
                console.log('[LEADS] 🔍 Utilisateur connecté:', {
                    id: ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.id),
                    email: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.email,
                    role: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.role,
                    isSuperAdmin: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.isSuperAdmin,
                    organizationId: (_f = authReq.user) === null || _f === void 0 ? void 0 : _f.organizationId
                });
                isSuperAdmin = ((_g = authReq.user) === null || _g === void 0 ? void 0 : _g.role) === 'super_admin' ||
                    ((_h = authReq.user) === null || _h === void 0 ? void 0 : _h.isSuperAdmin) === true ||
                    ((_k = (_j = authReq.user) === null || _j === void 0 ? void 0 : _j.role) === null || _k === void 0 ? void 0 : _k.toLowerCase().includes('super'));
                console.log('[LEADS] 👑 Vérification SuperAdmin:', {
                    isSuperAdmin: isSuperAdmin,
                    conditions: {
                        roleCheck: ((_l = authReq.user) === null || _l === void 0 ? void 0 : _l.role) === 'super_admin',
                        booleanCheck: ((_m = authReq.user) === null || _m === void 0 ? void 0 : _m.isSuperAdmin) === true,
                        roleIncludesSuper: (_p = (_o = authReq.user) === null || _o === void 0 ? void 0 : _o.role) === null || _p === void 0 ? void 0 : _p.toLowerCase().includes('super')
                    }
                });
                if (!isSuperAdmin) return [3 /*break*/, 4];
                console.log('[LEADS] 🌍 SuperAdmin détecté - récupération de TOUS les leads');
                _r.label = 1;
            case 1:
                _r.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma.lead.findMany({
                        include: {
                            User: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                }
                            },
                            LeadStatus: true,
                            Organization: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        },
                        orderBy: {
                            updatedAt: 'desc'
                        }
                    })];
            case 2:
                allLeads = _r.sent();
                console.log('[LEADS] 📊 Total leads récupérés pour SuperAdmin:', allLeads.length);
                console.log('[LEADS] 📋 Leads par organisation:', allLeads.reduce(function (acc, lead) {
                    var _a;
                    var orgName = ((_a = lead.Organization) === null || _a === void 0 ? void 0 : _a.name) || 'Sans organisation';
                    acc[orgName] = (acc[orgName] || 0) + 1;
                    return acc;
                }, {}));
                formattedLeads_1 = allLeads.map(function (lead) {
                    var data = lead.data || {};
                    var formattedName = lead.firstName && lead.lastName ? "".concat(lead.firstName, " ").concat(lead.lastName) :
                        (lead.firstName || lead.lastName || data.name || "Lead ".concat(lead.id.slice(0, 8)));
                    return {
                        id: lead.id,
                        name: formattedName,
                        firstName: lead.firstName || data.firstName || '',
                        lastName: lead.lastName || data.lastName || '',
                        email: lead.email || data.email || '',
                        phone: lead.phone || data.phone || '',
                        company: lead.company || data.company || '',
                        status: lead.status,
                        source: lead.source || 'unknown',
                        assignedTo: lead.User,
                        leadStatus: lead.LeadStatus,
                        createdAt: lead.createdAt,
                        updatedAt: lead.updatedAt,
                        statusId: lead.statusId,
                        organizationId: lead.organizationId,
                        assignedToId: lead.assignedToId,
                        // Données additionnelles pour la compatibilité
                        data: lead.data,
                        // Information organisation pour SuperAdmin
                        organization: lead.Organization
                    };
                });
                res.json({ success: true, data: formattedLeads_1 });
                return [2 /*return*/];
            case 3:
                error_1 = _r.sent();
                console.error('[LEADS] Erreur lors de la récupération des leads pour SuperAdmin:', error_1);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des leads pour SuperAdmin',
                    message: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                });
                return [2 /*return*/];
            case 4:
                organizationId = (_q = authReq.user) === null || _q === void 0 ? void 0 : _q.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée pour utilisateur non-SuperAdmin'
                        })];
                }
                console.log('[LEADS] 👤 Utilisateur normal - Récupération des leads pour l\'organisation:', organizationId);
                return [4 /*yield*/, prisma.lead.findMany({
                        where: {
                            organizationId: organizationId
                        },
                        include: {
                            User: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            },
                            LeadStatus: true
                        },
                        orderBy: {
                            updatedAt: 'desc'
                        }
                    })];
            case 5:
                leads = _r.sent();
                formattedLeads = leads.map(function (lead) {
                    // Utiliser d'abord les colonnes dédiées, puis fallback sur data JSON si nécessaire
                    var data = lead.data || {};
                    console.log("[LEADS] Formatage lead ".concat(lead.id, ":"));
                    console.log("[LEADS] - firstName: \"".concat(lead.firstName, "\" (").concat(typeof lead.firstName, ")"));
                    console.log("[LEADS] - lastName: \"".concat(lead.lastName, "\" (").concat(typeof lead.lastName, ")"));
                    console.log("[LEADS] - data.name: \"".concat(data.name, "\""));
                    var formattedName = lead.firstName && lead.lastName ? "".concat(lead.firstName, " ").concat(lead.lastName) :
                        (lead.firstName || lead.lastName || data.name || "Lead ".concat(lead.id.slice(0, 8)));
                    console.log("[LEADS] - Nom final: \"".concat(formattedName, "\""));
                    return {
                        id: lead.id,
                        name: formattedName,
                        firstName: lead.firstName || data.firstName || '',
                        lastName: lead.lastName || data.lastName || '',
                        email: lead.email || data.email || '',
                        phone: lead.phone || data.phone || '',
                        company: lead.company || data.company || '',
                        status: lead.status,
                        source: lead.source || 'unknown',
                        assignedTo: lead.User,
                        leadStatus: lead.LeadStatus,
                        createdAt: lead.createdAt,
                        updatedAt: lead.updatedAt,
                        statusId: lead.statusId,
                        organizationId: lead.organizationId,
                        assignedToId: lead.assignedToId,
                        // Données additionnelles pour la compatibilité
                        data: lead.data
                    };
                });
                console.log("[LEADS] ".concat(leads.length, " leads trouv\u00E9s"));
                res.json({ success: true, data: formattedLeads });
                return [3 /*break*/, 7];
            case 6:
                error_2 = _r.sent();
                console.error('[LEADS] Erreur lors de la récupération des leads:', error_2);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des leads',
                    message: error_2 instanceof Error ? error_2.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// POST /api/leads
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, organizationId, _a, firstName, lastName, email, phone, company, source, _b, status_1, statusId, notes, website, linkedin, data, finalStatusId, statusExists, defaultStatus, now, newLead, formattedLead, error_3;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 6, , 7]);
                authReq = req;
                organizationId = (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[LEADS] POST - Création d\'un nouveau lead');
                console.log('[LEADS] Données reçues:', req.body);
                console.log('[LEADS] Organisation:', organizationId);
                _a = req.body, firstName = _a.firstName, lastName = _a.lastName, email = _a.email, phone = _a.phone, company = _a.company, source = _a.source, _b = _a.status, status_1 = _b === void 0 ? 'new' : _b, statusId = _a.statusId, notes = _a.notes, website = _a.website, linkedin = _a.linkedin, data = _a.data;
                // Validation des champs requis
                if (!firstName || !lastName || !email || !company) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Les champs prénom, nom, email et société sont requis'
                        })];
                }
                finalStatusId = statusId;
                if (!statusId) return [3 /*break*/, 2];
                return [4 /*yield*/, prisma.leadStatus.findUnique({
                        where: { id: statusId }
                    })];
            case 1:
                statusExists = _e.sent();
                if (!statusExists) {
                    console.log('[LEADS] Statut non trouvé, utilisation du statut par défaut');
                    finalStatusId = null;
                }
                _e.label = 2;
            case 2:
                if (!!finalStatusId) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.leadStatus.findFirst({
                        where: {
                            organizationId: organizationId,
                            isDefault: true
                        }
                    })];
            case 3:
                defaultStatus = _e.sent();
                if (defaultStatus) {
                    finalStatusId = defaultStatus.id;
                    console.log('[LEADS] Statut par défaut assigné:', defaultStatus.name);
                }
                _e.label = 4;
            case 4:
                now = new Date();
                return [4 /*yield*/, prisma.lead.create({
                        data: {
                            firstName: firstName,
                            lastName: lastName,
                            email: email,
                            phone: phone || null,
                            company: company,
                            source: source || 'manual',
                            status: status_1,
                            statusId: finalStatusId,
                            notes: notes || null,
                            website: website || null,
                            linkedin: linkedin || null,
                            createdAt: now,
                            updatedAt: now,
                            organizationId: organizationId,
                            assignedToId: ((_d = authReq.user) === null || _d === void 0 ? void 0 : _d.userId) || null,
                            // Données JSON pour compatibilité
                            data: data || {
                                name: "".concat(firstName, " ").concat(lastName),
                                email: email,
                                phone: phone || '',
                                company: company,
                                notes: notes || '',
                                website: website || '',
                                linkedin: linkedin || '',
                                source: source || 'manual'
                            }
                        },
                        include: {
                            User: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            },
                            LeadStatus: true
                        }
                    })];
            case 5:
                newLead = _e.sent();
                console.log('[LEADS] Lead créé avec succès:', newLead.id);
                formattedLead = {
                    id: newLead.id,
                    name: "".concat(newLead.firstName, " ").concat(newLead.lastName),
                    firstName: newLead.firstName,
                    lastName: newLead.lastName,
                    email: newLead.email,
                    phone: newLead.phone,
                    company: newLead.company,
                    status: newLead.status,
                    source: newLead.source,
                    assignedTo: newLead.User,
                    leadStatus: newLead.LeadStatus,
                    createdAt: newLead.createdAt,
                    updatedAt: newLead.updatedAt,
                    statusId: newLead.statusId,
                    organizationId: newLead.organizationId,
                    assignedToId: newLead.assignedToId,
                    data: newLead.data
                };
                res.status(201).json(formattedLead);
                return [3 /*break*/, 7];
            case 6:
                error_3 = _e.sent();
                console.error('[LEADS] Erreur lors de la création du lead:', error_3);
                res.status(500).json({
                    error: 'Erreur lors de la création du lead',
                    message: error_3 instanceof Error ? error_3.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// GET /api/leads/:id
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, id, organizationId, isSuperAdmin, whereCondition, lead, data, formattedLead, error_4;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    return __generator(this, function (_r) {
        switch (_r.label) {
            case 0:
                _r.trys.push([0, 2, , 3]);
                authReq = req;
                id = req.params.id;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                console.log('[LEADS] 🔍 Récupération du lead:', id, 'utilisateur:', {
                    id: ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId) || ((_c = authReq.user) === null || _c === void 0 ? void 0 : _c.id),
                    email: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.email,
                    role: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.role,
                    isSuperAdmin: (_f = authReq.user) === null || _f === void 0 ? void 0 : _f.isSuperAdmin,
                    organizationId: (_g = authReq.user) === null || _g === void 0 ? void 0 : _g.organizationId
                });
                isSuperAdmin = ((_h = authReq.user) === null || _h === void 0 ? void 0 : _h.role) === 'super_admin' ||
                    ((_j = authReq.user) === null || _j === void 0 ? void 0 : _j.isSuperAdmin) === true ||
                    ((_l = (_k = authReq.user) === null || _k === void 0 ? void 0 : _k.role) === null || _l === void 0 ? void 0 : _l.toLowerCase().includes('super'));
                console.log('[LEADS] 👑 Vérification SuperAdmin:', {
                    isSuperAdmin: isSuperAdmin,
                    conditions: {
                        roleCheck: ((_m = authReq.user) === null || _m === void 0 ? void 0 : _m.role) === 'super_admin',
                        booleanCheck: ((_o = authReq.user) === null || _o === void 0 ? void 0 : _o.isSuperAdmin) === true,
                        roleIncludesSuper: (_q = (_p = authReq.user) === null || _p === void 0 ? void 0 : _p.role) === null || _q === void 0 ? void 0 : _q.toLowerCase().includes('super')
                    }
                });
                whereCondition = void 0;
                if (isSuperAdmin) {
                    console.log('[LEADS] 🌍 SuperAdmin détecté - accès à TOUS les leads');
                    whereCondition = { id: id }; // SuperAdmin peut accéder à n'importe quel lead
                }
                else {
                    if (!organizationId) {
                        return [2 /*return*/, res.status(400).json({
                                error: 'Organisation non spécifiée'
                            })];
                    }
                    console.log('[LEADS] 🏢 Utilisateur normal - accès limité à l\'organisation:', organizationId);
                    whereCondition = {
                        id: id,
                        organizationId: organizationId // Sécurité: s'assurer que le lead appartient à l'organisation
                    };
                }
                return [4 /*yield*/, prisma.lead.findFirst({
                        where: whereCondition,
                        include: {
                            User: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            },
                            LeadStatus: true,
                            Organization: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    })];
            case 1:
                lead = _r.sent();
                if (!lead) {
                    console.log('[LEADS] Lead non trouvé:', id);
                    return [2 /*return*/, res.status(404).json({
                            error: 'Lead non trouvé ou non autorisé'
                        })];
                }
                data = lead.data || {};
                formattedLead = {
                    id: lead.id,
                    name: lead.firstName && lead.lastName ? "".concat(lead.firstName, " ").concat(lead.lastName) :
                        (lead.firstName || lead.lastName || data.name || "Lead ".concat(lead.id.slice(0, 8))),
                    firstName: lead.firstName || data.firstName || '',
                    lastName: lead.lastName || data.lastName || '',
                    email: lead.email || data.email || '',
                    phone: lead.phone || data.phone || '',
                    company: lead.company || data.company || '',
                    status: lead.status,
                    source: lead.source || 'unknown',
                    assignedTo: lead.User,
                    leadStatus: lead.LeadStatus,
                    createdAt: lead.createdAt,
                    updatedAt: lead.updatedAt,
                    statusId: lead.statusId,
                    organizationId: lead.organizationId,
                    assignedToId: lead.assignedToId,
                    notes: lead.notes || data.notes || '',
                    website: lead.website || data.website || '',
                    linkedin: lead.linkedin || data.linkedin || '',
                    lastContactDate: lead.lastContactDate,
                    nextFollowUpDate: lead.nextFollowUpDate,
                    // Données additionnelles pour la compatibilité
                    data: lead.data
                };
                console.log('[LEADS] Lead trouvé et formaté:', formattedLead.name);
                res.json(formattedLead);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _r.sent();
                console.error('[LEADS] Erreur lors de la récupération du lead:', error_4);
                res.status(500).json({
                    error: 'Erreur lors de la récupération du lead',
                    message: error_4 instanceof Error ? error_4.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /api/leads/:id - Modifier un lead
router.put('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, id, organizationId, existingLead, _a, firstName, lastName, email, phone, company, source, status_2, statusId, notes, website, linkedin, assignedToId, nextFollowUpDate, data, updateData, validStatuses, statusMapping, normalizedStatus, updatedLead, formattedLead, error_5;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 3, , 4]);
                authReq = req;
                id = req.params.id;
                organizationId = (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.organizationId;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Organisation non spécifiée'
                        })];
                }
                console.log('[LEADS] Modification du lead:', id, 'données:', req.body);
                return [4 /*yield*/, prisma.lead.findFirst({
                        where: {
                            id: id,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                existingLead = _d.sent();
                if (!existingLead) {
                    console.log('[LEADS] Lead non trouvé pour modification:', id);
                    return [2 /*return*/, res.status(404).json({
                            error: 'Lead non trouvé ou non autorisé'
                        })];
                }
                _a = req.body, firstName = _a.firstName, lastName = _a.lastName, email = _a.email, phone = _a.phone, company = _a.company, source = _a.source, status_2 = _a.status, statusId = _a.statusId, notes = _a.notes, website = _a.website, linkedin = _a.linkedin, assignedToId = _a.assignedToId, nextFollowUpDate = _a.nextFollowUpDate, data = _a.data;
                updateData = {};
                if (firstName !== undefined)
                    updateData.firstName = firstName;
                if (lastName !== undefined)
                    updateData.lastName = lastName;
                if (email !== undefined)
                    updateData.email = email;
                if (phone !== undefined)
                    updateData.phone = phone;
                if (company !== undefined)
                    updateData.company = company;
                if (source !== undefined)
                    updateData.source = source;
                // Validation et normalisation du statut
                if (status_2 !== undefined) {
                    validStatuses = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
                    statusMapping = {
                        'nouveau': 'new',
                        'en_cours': 'contacted',
                        'contacte': 'contacted',
                        'contacté': 'contacted',
                        'rdv': 'meeting',
                        'rendez_vous': 'meeting',
                        'devis': 'proposal',
                        'gagne': 'won',
                        'gagné': 'won',
                        'perdu': 'lost',
                        'termine': 'won',
                        'terminé': 'won'
                    };
                    normalizedStatus = statusMapping[status_2.toLowerCase()] || status_2;
                    if (!validStatuses.includes(normalizedStatus)) {
                        console.warn('[LEADS] Statut invalide:', status_2, '- utilisation de "new" par défaut');
                        updateData.status = 'new';
                    }
                    else {
                        updateData.status = normalizedStatus;
                    }
                }
                if (statusId !== undefined)
                    updateData.statusId = statusId;
                if (notes !== undefined)
                    updateData.notes = notes;
                if (website !== undefined)
                    updateData.website = website;
                if (linkedin !== undefined)
                    updateData.linkedin = linkedin;
                if (assignedToId !== undefined)
                    updateData.assignedToId = assignedToId;
                if (nextFollowUpDate !== undefined)
                    updateData.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
                if (data !== undefined)
                    updateData.data = data;
                return [4 /*yield*/, prisma.lead.update({
                        where: { id: id },
                        data: __assign(__assign({}, updateData), { updatedAt: new Date() }),
                        include: {
                            User: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            },
                            LeadStatus: true
                        }
                    })];
            case 2:
                updatedLead = _d.sent();
                console.log('[LEADS] Lead modifié avec succès:', updatedLead.id);
                formattedLead = {
                    id: updatedLead.id,
                    name: updatedLead.firstName && updatedLead.lastName ? "".concat(updatedLead.firstName, " ").concat(updatedLead.lastName) :
                        (updatedLead.firstName || updatedLead.lastName || ((_c = updatedLead.data) === null || _c === void 0 ? void 0 : _c.name) || "Lead ".concat(updatedLead.id.slice(0, 8))),
                    firstName: updatedLead.firstName || '',
                    lastName: updatedLead.lastName || '',
                    email: updatedLead.email || '',
                    phone: updatedLead.phone || '',
                    company: updatedLead.company || '',
                    status: updatedLead.status,
                    source: updatedLead.source || 'unknown',
                    assignedTo: updatedLead.User,
                    leadStatus: updatedLead.LeadStatus,
                    createdAt: updatedLead.createdAt,
                    updatedAt: updatedLead.updatedAt,
                    statusId: updatedLead.statusId,
                    organizationId: updatedLead.organizationId,
                    assignedToId: updatedLead.assignedToId,
                    notes: updatedLead.notes || '',
                    website: updatedLead.website || '',
                    linkedin: updatedLead.linkedin || '',
                    nextFollowUpDate: updatedLead.nextFollowUpDate,
                    data: updatedLead.data
                };
                res.json(formattedLead);
                return [3 /*break*/, 4];
            case 3:
                error_5 = _d.sent();
                console.error('[LEADS] Erreur lors de la modification du lead:', error_5);
                res.status(500).json({
                    error: 'Erreur lors de la modification du lead',
                    message: error_5 instanceof Error ? error_5.message : 'Erreur inconnue'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// DELETE /api/leads/:id
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, id, isSuperAdmin, whereCondition, organizationId, existing, error_6;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    return __generator(this, function (_m) {
        switch (_m.label) {
            case 0:
                _m.trys.push([0, 3, , 4]);
                authReq = req;
                id = req.params.id;
                console.log('[LEADS] 🗑️ Demande de suppression du lead:', id, 'par utilisateur:', {
                    id: ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.id),
                    email: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.email,
                    role: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.role,
                    isSuperAdmin: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.isSuperAdmin,
                    organizationId: (_f = authReq.user) === null || _f === void 0 ? void 0 : _f.organizationId
                });
                isSuperAdmin = ((_g = authReq.user) === null || _g === void 0 ? void 0 : _g.role) === 'super_admin' ||
                    ((_h = authReq.user) === null || _h === void 0 ? void 0 : _h.isSuperAdmin) === true ||
                    ((_k = (_j = authReq.user) === null || _j === void 0 ? void 0 : _j.role) === null || _k === void 0 ? void 0 : _k.toLowerCase().includes('super'));
                whereCondition = { id: id };
                if (!isSuperAdmin) {
                    organizationId = (_l = authReq.user) === null || _l === void 0 ? void 0 : _l.organizationId;
                    if (!organizationId) {
                        return [2 /*return*/, res.status(400).json({ error: 'Organisation non spécifiée' })];
                    }
                    whereCondition.organizationId = organizationId;
                }
                return [4 /*yield*/, prisma.lead.findFirst({ where: whereCondition })];
            case 1:
                existing = _m.sent();
                if (!existing) {
                    console.log('[LEADS] ❌ Lead non trouvé ou non autorisé pour suppression:', id);
                    return [2 /*return*/, res.status(404).json({ error: 'Lead non trouvé ou non autorisé' })];
                }
                // Supprimer le lead
                return [4 /*yield*/, prisma.lead.delete({ where: { id: id } })];
            case 2:
                // Supprimer le lead
                _m.sent();
                console.log('[LEADS] ✅ Lead supprimé avec succès:', id);
                // 204 No Content pour simplifier la gestion côté client (converti en {success:true})
                return [2 /*return*/, res.status(204).send()];
            case 3:
                error_6 = _m.sent();
                console.error('[LEADS] Erreur lors de la suppression du lead:', error_6);
                // Conflits potentiels liés aux contraintes d’intégrité (FK)
                return [2 /*return*/, res.status(500).json({
                        error: 'Erreur lors de la suppression du lead',
                        message: error_6 instanceof Error ? error_6.message : 'Erreur inconnue'
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Historique du lead (GET): lecture depuis lead.data.history
router.get('/:id/history', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, id, isSuperAdmin, whereCond, lead, dataObj, history_1, e_1;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 2, , 3]);
                authReq = req;
                id = req.params.id;
                isSuperAdmin = ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.role) === 'super_admin' ||
                    ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.isSuperAdmin) === true ||
                    ((_d = (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.role) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes('super'));
                whereCond = isSuperAdmin
                    ? { id: id }
                    : { id: id, organizationId: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.organizationId };
                return [4 /*yield*/, prisma.lead.findFirst({ where: whereCond })];
            case 1:
                lead = _f.sent();
                if (!lead)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' })];
                dataObj = lead.data || {};
                history_1 = Array.isArray(dataObj.history) ? dataObj.history : [];
                return [2 /*return*/, res.json({ success: true, data: history_1 })];
            case 2:
                e_1 = _f.sent();
                console.error('[LEADS] GET history error', e_1);
                return [2 /*return*/, res.status(500).json({ success: false, error: 'Erreur lors du chargement de l\'historique' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Ajout d'une entrée d'historique (POST): append dans lead.data.history
router.post('/:id/history', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, id, organizationId, isSuperAdmin, whereCond, lead, _a, _b, type, _c, content, author, historyItem, dataObj, existing, e_2;
    var _d, _e, _f, _g, _h, _j, _k;
    return __generator(this, function (_l) {
        switch (_l.label) {
            case 0:
                _l.trys.push([0, 3, , 4]);
                authReq = req;
                id = req.params.id;
                organizationId = (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.organizationId;
                isSuperAdmin = ((_e = authReq.user) === null || _e === void 0 ? void 0 : _e.role) === 'super_admin' ||
                    ((_f = authReq.user) === null || _f === void 0 ? void 0 : _f.isSuperAdmin) === true ||
                    ((_h = (_g = authReq.user) === null || _g === void 0 ? void 0 : _g.role) === null || _h === void 0 ? void 0 : _h.toLowerCase().includes('super'));
                whereCond = isSuperAdmin
                    ? { id: id }
                    : { id: id, organizationId: organizationId };
                return [4 /*yield*/, prisma.lead.findFirst({ where: whereCond })];
            case 1:
                lead = _l.sent();
                if (!lead)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' })];
                _a = (req.body || {}), _b = _a.type, type = _b === void 0 ? 'internal' : _b, _c = _a.content, content = _c === void 0 ? '' : _c, author = _a.author;
                historyItem = {
                    type: type,
                    content: content,
                    author: author || ((_k = (_j = authReq.user) === null || _j === void 0 ? void 0 : _j.email) !== null && _k !== void 0 ? _k : 'system'),
                    createdAt: new Date().toISOString(),
                };
                dataObj = lead.data || {};
                existing = Array.isArray(dataObj.history) ? dataObj.history : [];
                dataObj.history = __spreadArray([historyItem], existing, true);
                return [4 /*yield*/, prisma.lead.update({ where: { id: lead.id }, data: { data: dataObj } })];
            case 2:
                _l.sent();
                return [2 /*return*/, res.status(201).json({ success: true, item: historyItem })];
            case 3:
                e_2 = _l.sent();
                console.error('[LEADS] POST history error', e_2);
                return [2 /*return*/, res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout à l\'historique' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Documents du lead (GET): lecture depuis lead.data.documents
router.get('/:id/documents', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, id, isSuperAdmin, whereCond, lead, dataObj, docs, e_3;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 2, , 3]);
                authReq = req;
                id = req.params.id;
                isSuperAdmin = ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.role) === 'super_admin' ||
                    ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.isSuperAdmin) === true ||
                    ((_d = (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.role) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes('super'));
                whereCond = isSuperAdmin
                    ? { id: id }
                    : { id: id, organizationId: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.organizationId };
                return [4 /*yield*/, prisma.lead.findFirst({ where: whereCond })];
            case 1:
                lead = _f.sent();
                if (!lead)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' })];
                dataObj = lead.data || {};
                docs = Array.isArray(dataObj.documents) ? dataObj.documents : [];
                return [2 /*return*/, res.json({ success: true, data: docs })];
            case 2:
                e_3 = _f.sent();
                console.error('[LEADS] GET documents error', e_3);
                return [2 /*return*/, res.status(500).json({ success: false, error: 'Erreur lors du chargement des documents' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Ajout d'un document lié (POST): append dans lead.data.documents
router.post('/:id/documents', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authReq, id, organizationId, isSuperAdmin, whereCond, lead, body, newDoc, dataObj, existingDocs, updatedDocs, e_4;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 3, , 4]);
                authReq = req;
                id = req.params.id;
                organizationId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.organizationId;
                isSuperAdmin = ((_b = authReq.user) === null || _b === void 0 ? void 0 : _b.role) === 'super_admin' ||
                    ((_c = authReq.user) === null || _c === void 0 ? void 0 : _c.isSuperAdmin) === true ||
                    ((_e = (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.role) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes('super'));
                whereCond = isSuperAdmin
                    ? { id: id }
                    : { id: id, organizationId: organizationId };
                return [4 /*yield*/, prisma.lead.findFirst({ where: whereCond })];
            case 1:
                lead = _f.sent();
                if (!lead)
                    return [2 /*return*/, res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' })];
                body = (req.body || {});
                newDoc = {
                    id: body.id || cryptoRandomId(),
                    name: body.name || 'Document',
                    type: body.type || 'devis',
                    url: body.url || null,
                    createdAt: new Date().toISOString(),
                    meta: body.meta || {}
                };
                dataObj = lead.data || {};
                existingDocs = Array.isArray(dataObj.documents) ? dataObj.documents : [];
                updatedDocs = __spreadArray([newDoc], existingDocs, true);
                dataObj.documents = updatedDocs;
                return [4 /*yield*/, prisma.lead.update({ where: { id: lead.id }, data: { data: dataObj } })];
            case 2:
                _f.sent();
                return [2 /*return*/, res.status(201).json({ success: true, item: newDoc })];
            case 3:
                e_4 = _f.sent();
                console.error('[LEADS] POST documents error', e_4);
                return [2 /*return*/, res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout du document' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

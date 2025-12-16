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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var client_1 = require("@prisma/client");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🚀 RATE LIMITING ANALYTICS
var analyticsRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requêtes par minute
    message: { success: false, message: 'Trop de requêtes analytics' }
});
router.use(auth_js_1.authMiddleware);
router.use(analyticsRateLimit);
// 📊 GET /api/analytics/dashboard - Métriques tableau de bord
router.get('/dashboard', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var requestingUser, _a, startDate, endDate, dateFilter, metrics, _b, totalUsers, totalOrganizations, activeModules, totalLeads, orgId, _c, orgUsers, orgModules, orgLeads, error_1;
    var _d, _e, _f;
    var _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                console.log('[ANALYTICS] 📊 Génération métriques dashboard');
                _j.label = 1;
            case 1:
                _j.trys.push([1, 9, , 10]);
                requestingUser = req.user;
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate;
                dateFilter = __assign(__assign({}, (startDate && { gte: new Date(startDate) })), (endDate && { lte: new Date(endDate) }));
                metrics = void 0;
                if (!((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) === 'super_admin')) return [3 /*break*/, 5];
                return [4 /*yield*/, Promise.all([
                        prisma.user.count({ where: { createdAt: dateFilter } }),
                        prisma.organization.count({ where: { createdAt: dateFilter } }),
                        prisma.organizationModuleStatus.count({ where: { active: true } }),
                        ((_g = prisma.lead) === null || _g === void 0 ? void 0 : _g.count({ where: { createdAt: dateFilter } })) || 0
                    ])];
            case 2:
                _b = _j.sent(), totalUsers = _b[0], totalOrganizations = _b[1], activeModules = _b[2], totalLeads = _b[3];
                _d = {
                    totalUsers: totalUsers,
                    totalOrganizations: totalOrganizations,
                    activeModules: activeModules,
                    totalLeads: totalLeads
                };
                _e = {};
                return [4 /*yield*/, calculateGrowth('user', dateFilter)];
            case 3:
                _e.users = _j.sent();
                return [4 /*yield*/, calculateGrowth('organization', dateFilter)];
            case 4:
                metrics = (_d.growth = (_e.organizations = _j.sent(),
                    _e),
                    _d);
                return [3 /*break*/, 8];
            case 5:
                orgId = requestingUser.organizationId;
                return [4 /*yield*/, Promise.all([
                        prisma.userOrganization.count({
                            where: { organizationId: orgId, createdAt: dateFilter }
                        }),
                        prisma.organizationModuleStatus.count({
                            where: { organizationId: orgId, active: true }
                        }),
                        ((_h = prisma.lead) === null || _h === void 0 ? void 0 : _h.count({
                            where: { organizationId: orgId, createdAt: dateFilter }
                        })) || 0
                    ])];
            case 6:
                _c = _j.sent(), orgUsers = _c[0], orgModules = _c[1], orgLeads = _c[2];
                _f = {
                    users: orgUsers,
                    activeModules: orgModules,
                    leads: orgLeads
                };
                return [4 /*yield*/, calculateConversionRate(orgId, dateFilter)];
            case 7:
                metrics = (_f.conversion = _j.sent(),
                    _f);
                _j.label = 8;
            case 8:
                res.json({ success: true, data: metrics });
                return [3 /*break*/, 10];
            case 9:
                error_1 = _j.sent();
                console.error('[ANALYTICS] Erreur métriques dashboard:', error_1);
                res.status(500).json({ success: false, message: 'Erreur génération métriques' });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// 📈 GET /api/analytics/export - Export données CSV/Excel
router.get('/export', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, format, _c, type, requestingUser, data, filename, _d, error_2;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                console.log('[ANALYTICS] 📈 Export données');
                _e.label = 1;
            case 1:
                _e.trys.push([1, 8, , 9]);
                _a = req.query, _b = _a.format, format = _b === void 0 ? 'csv' : _b, _c = _a.type, type = _c === void 0 ? 'users' : _c;
                requestingUser = req.user;
                data = void 0;
                filename = void 0;
                _d = type;
                switch (_d) {
                    case 'users': return [3 /*break*/, 2];
                    case 'organizations': return [3 /*break*/, 4];
                }
                return [3 /*break*/, 6];
            case 2: return [4 /*yield*/, exportUsers(requestingUser)];
            case 3:
                data = _e.sent();
                filename = "users_export_".concat(new Date().toISOString().split('T')[0], ".").concat(format);
                return [3 /*break*/, 7];
            case 4:
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin') {
                    return [2 /*return*/, res.status(403).json({ success: false, message: 'Super admin requis' })];
                }
                return [4 /*yield*/, exportOrganizations()];
            case 5:
                data = _e.sent();
                filename = "organizations_export_".concat(new Date().toISOString().split('T')[0], ".").concat(format);
                return [3 /*break*/, 7];
            case 6: return [2 /*return*/, res.status(400).json({ success: false, message: 'Type export invalide' })];
            case 7:
                if (format === 'csv') {
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', "attachment; filename=\"".concat(filename, "\""));
                    res.send(convertToCSV(data));
                }
                else {
                    res.json({ success: true, data: data, filename: filename });
                }
                return [3 /*break*/, 9];
            case 8:
                error_2 = _e.sent();
                console.error('[ANALYTICS] Erreur export:', error_2);
                res.status(500).json({ success: false, message: 'Erreur export données' });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// 📋 GET /api/analytics/audit-trail - Journal d'audit
router.get('/audit-trail', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, userId, action, requestingUser, whereClause, _d, auditLogs, total, error_3;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                console.log('[ANALYTICS] 📋 Récupération audit trail');
                _g.label = 1;
            case 1:
                _g.trys.push([1, 3, , 4]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 50 : _c, userId = _a.userId, action = _a.action;
                requestingUser = req.user;
                whereClause = {};
                if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'super_admin' && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId)) {
                    // Non-super admin : seulement son organisation
                    whereClause.organizationId = requestingUser.organizationId;
                }
                if (userId)
                    whereClause.userId = userId;
                if (action)
                    whereClause.action = { contains: action };
                return [4 /*yield*/, Promise.all([
                        ((_e = prisma.auditLog) === null || _e === void 0 ? void 0 : _e.findMany({
                            where: whereClause,
                            include: {
                                User: { select: { firstName: true, lastName: true, email: true } }
                            },
                            orderBy: { createdAt: 'desc' },
                            skip: (Number(page) - 1) * Number(limit),
                            take: Number(limit)
                        })) || [],
                        ((_f = prisma.auditLog) === null || _f === void 0 ? void 0 : _f.count({ where: whereClause })) || 0
                    ])];
            case 2:
                _d = _g.sent(), auditLogs = _d[0], total = _d[1];
                res.json({
                    success: true,
                    data: auditLogs,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: total,
                        pages: Math.ceil(total / Number(limit))
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _g.sent();
                console.error('[ANALYTICS] Erreur audit trail:', error_3);
                res.status(500).json({ success: false, message: 'Erreur récupération audit' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 🔧 UTILITAIRES ANALYTICS
function calculateGrowth(model, dateFilter) {
    return __awaiter(this, void 0, void 0, function () {
        var currentPeriod, previousPeriod, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (model === 'user' ? prisma.user : prisma.organization).count({
                            where: { createdAt: dateFilter }
                        })];
                case 1:
                    currentPeriod = _b.sent();
                    return [4 /*yield*/, (model === 'user' ? prisma.user : prisma.organization).count({
                            where: {
                                createdAt: {
                                    gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 jours avant
                                    lte: dateFilter.gte
                                }
                            }
                        })];
                case 2:
                    previousPeriod = _b.sent();
                    return [2 /*return*/, previousPeriod > 0 ?
                            Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100) :
                            0];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, 0];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function calculateConversionRate(organizationId, dateFilter) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, totalLeads, convertedLeads, _b;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.all([
                            ((_c = prisma.lead) === null || _c === void 0 ? void 0 : _c.count({
                                where: { organizationId: organizationId, createdAt: dateFilter }
                            })) || 0,
                            ((_d = prisma.lead) === null || _d === void 0 ? void 0 : _d.count({
                                where: {
                                    organizationId: organizationId,
                                    status: 'converted',
                                    createdAt: dateFilter
                                }
                            })) || 0
                        ])];
                case 1:
                    _a = _e.sent(), totalLeads = _a[0], convertedLeads = _a[1];
                    return [2 /*return*/, totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0];
                case 2:
                    _b = _e.sent();
                    return [2 /*return*/, 0];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function exportUsers(requestingUser) {
    return __awaiter(this, void 0, void 0, function () {
        var whereClause;
        return __generator(this, function (_a) {
            whereClause = (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) === 'super_admin'
                ? {}
                : { organizationId: requestingUser.organizationId };
            return [2 /*return*/, prisma.user.findMany({
                    where: whereClause,
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        UserOrganization: {
                            select: {
                                Organization: { select: { name: true } }
                            }
                        }
                    }
                })];
        });
    });
}
function exportOrganizations() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, prisma.organization.findMany({
                    select: {
                        name: true,
                        status: true,
                        createdAt: true,
                        _count: {
                            select: {
                                UserOrganization: true,
                                OrganizationModuleStatus: { where: { active: true } }
                            }
                        }
                    }
                })];
        });
    });
}
function convertToCSV(data) {
    if (!data.length)
        return '';
    var headers = Object.keys(data[0]).join(',');
    var rows = data.map(function (row) {
        return Object.values(row).map(function (value) {
            return typeof value === 'string' ? "\"".concat(value, "\"") : value;
        }).join(',');
    });
    return __spreadArray([headers], rows, true).join('\n');
}
exports.default = router;

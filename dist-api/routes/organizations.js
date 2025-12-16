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
var zod_1 = require("zod");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var crypto_1 = require("crypto");
// ✅ PLUS BESOIN D'INTERFACE LOCALE - UTILISATION DE L'INTERFACE CENTRALISÉE
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// 🧹 SANITISATION SIMPLE ET EFFICACE (sans DOMPurify)
var sanitizeString = function (input) {
    return input.trim().replace(/[<>]/g, ''); // Supprime < et >
};
var canAccessOrganization = function (user, organizationId) {
    // SuperAdmin peut tout voir
    if ((user === null || user === void 0 ? void 0 : user.role) === 'super_admin') {
        return true;
    }
    // Autres utilisateurs : seulement leur organisation
    return (user === null || user === void 0 ? void 0 : user.organizationId) === organizationId;
};
var isSuperAdmin = function (user) {
    return (user === null || user === void 0 ? void 0 : user.role) === 'super_admin';
};
// 🔧 VALIDATION ID CENTRALISÉE (Factorisation)
// Accepter UUID, CUID (cuid2 non strict) ou identifiants alphanumériques simples (fallback dev)
var isValidId = function (id) {
    if (!id)
        return false;
    var s = String(id).trim();
    // UUID v4-like
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // CUID (commençant par c) ou cuid2 plus large
    var cuidRe = /^c[a-z0-9]{7,}$/i;
    // Identifiants alphanumériques (sécurisé par sanitization) – utile en dev/scripts
    var simpleRe = /^[a-zA-Z0-9_-]{8,}$/;
    return uuidRe.test(s) || cuidRe.test(s) || simpleRe.test(s);
};
var validateAndSanitizeId = function (id, fieldName) {
    if (fieldName === void 0) { fieldName = 'ID'; }
    var sanitized = sanitizeString(String(id));
    if (!isValidId(sanitized)) {
        throw new Error("".concat(fieldName, " invalide"));
    }
    return sanitized;
};
// 🔧 UTILITAIRES GOOGLE WORKSPACE (Factorisation TypeScript stricte)
var GOOGLE_WORKSPACE_MODULES = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'];
var isGoogleWorkspaceModule = function (moduleKey) {
    return GOOGLE_WORKSPACE_MODULES.includes(moduleKey);
};
var getActiveGoogleModules = function (moduleStatuses) {
    if (moduleStatuses === void 0) { moduleStatuses = []; }
    return moduleStatuses.filter(function (oms) { var _a; return oms.active && ((_a = oms.Module) === null || _a === void 0 ? void 0 : _a.key) && isGoogleWorkspaceModule(oms.Module.key); });
};
// ✅ FONCTION UTILITAIRE : Compter les modules réellement actifs pour une organisation
function countRealActiveModules(organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var organization, hasGoogleWorkspace, allActiveModules, activeModulesForOrg, finalCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[countRealActiveModules] \uD83D\uDD0D D\u00E9but count pour organisation: ".concat(organizationId));
                    return [4 /*yield*/, prisma.organization.findUnique({
                            where: { id: organizationId },
                            select: {
                                GoogleWorkspaceConfig: true,
                                name: true
                            }
                        })];
                case 1:
                    organization = _a.sent();
                    hasGoogleWorkspace = !!(organization === null || organization === void 0 ? void 0 : organization.GoogleWorkspaceConfig);
                    console.log("[countRealActiveModules] \uD83C\uDF10 Organisation ".concat(organization === null || organization === void 0 ? void 0 : organization.name, " - Google Workspace: ").concat(hasGoogleWorkspace));
                    return [4 /*yield*/, prisma.module.findMany({
                            where: {
                                active: true
                            },
                            include: {
                                OrganizationModuleStatus: {
                                    where: {
                                        organizationId: organizationId
                                    }
                                }
                            }
                        })];
                case 2:
                    allActiveModules = _a.sent();
                    console.log("[countRealActiveModules] \uD83D\uDCCA Total modules actifs dans Module: ".concat(allActiveModules.length));
                    activeModulesForOrg = allActiveModules.filter(function (module) {
                        // Si le module a un statut spécifique pour cette organisation
                        var moduleStatus = module.OrganizationModuleStatus[0];
                        // Si c'est un module Google et que Google Workspace n'est pas activé
                        if (module.key && module.key.toLowerCase().startsWith('google_') && !hasGoogleWorkspace) {
                            console.log("[countRealActiveModules] \uD83D\uDEAB Module Google ".concat(module.key, ": Google Workspace d\u00E9sactiv\u00E9 -> EXCLU"));
                            return false;
                        }
                        if (moduleStatus) {
                            // Utiliser le statut spécifique (peut être actif ou inactif)
                            console.log("[countRealActiveModules] ".concat(moduleStatus.active ? '✅' : '❌', " Module ").concat(module.key || 'Sans clé', " (").concat(module.label || 'Sans nom', "): statut sp\u00E9cifique -> ").concat(moduleStatus.active ? 'ACTIF' : 'INACTIF'));
                            return moduleStatus.active;
                        }
                        else {
                            // Pas de statut spécifique = actif par défaut
                            console.log("[countRealActiveModules] \u2705 Module ".concat(module.key || 'Sans clé', " (").concat(module.label || 'Sans nom', "): pas de statut sp\u00E9cifique -> ACTIF par d\u00E9faut"));
                            return true;
                        }
                    });
                    finalCount = activeModulesForOrg.length;
                    console.log("[countRealActiveModules] \uD83C\uDFAF Count final pour ".concat(organization === null || organization === void 0 ? void 0 : organization.name, ": ").concat(finalCount));
                    return [2 /*return*/, finalCount];
            }
        });
    });
}
// 🔧 FONCTION HELPER : Vérifier si Google Workspace est activé
function hasGoogleWorkspaceEnabled(moduleStatuses, googleWorkspaceConfig) {
    if (moduleStatuses === void 0) { moduleStatuses = []; }
    // 1. Vérifier si au moins un module Google Workspace est actif
    var hasActiveModules = getActiveGoogleModules(moduleStatuses).length > 0;
    // 2. Vérifier si une configuration Google Workspace active existe
    var hasActiveConfig = (googleWorkspaceConfig === null || googleWorkspaceConfig === void 0 ? void 0 : googleWorkspaceConfig.isActive) === true;
    // Google Workspace est considéré comme activé si :
    // - Il y a des modules actifs OU une configuration active
    return hasActiveModules || hasActiveConfig;
}
;
var extractGoogleWorkspaceDomain = function (organization) {
    var _a;
    // TODO: À terme, récupérer depuis un champ dédié googleWorkspaceDomain
    // Pour l'instant, logique de fallback basique
    if ((_a = organization.features) === null || _a === void 0 ? void 0 : _a.includes('google_workspace')) {
        return "".concat(organization.name.toLowerCase().replace(/\s+/g, ''), ".com");
    }
    return null;
};
// 🧹 SUPPRESSION PROFONDE DES DONNÉES LIÉES À UNE ORGANISATION AVANT LA SUPPRESSION
var cleanupOrganizationData = function (tx, organizationId) { return __awaiter(void 0, void 0, void 0, function () {
    var runDelete;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                runDelete = function (label, action) { return __awaiter(void 0, void 0, void 0, function () {
                    var error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                console.log("[ORGANIZATIONS] \uD83D\uDDD1\uFE0F Suppression ".concat(label, " pour ").concat(organizationId));
                                return [4 /*yield*/, action()];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                error_1 = _a.sent();
                                console.error("[ORGANIZATIONS] \u274C \u00C9chec suppression ".concat(label, " pour ").concat(organizationId), error_1);
                                throw error_1;
                            case 3: return [2 /*return*/];
                        }
                    });
                }); };
                return [4 /*yield*/, runDelete('CalendarParticipant', function () { return tx.calendarParticipant.deleteMany({
                        where: {
                            CalendarEvent: {
                                organizationId: organizationId
                            }
                        }
                    }); })];
            case 1:
                _a.sent();
                return [4 /*yield*/, runDelete('FormSubmission', function () { return tx.formSubmission.deleteMany({
                        where: {
                            Block: {
                                organizationId: organizationId
                            }
                        }
                    }); })];
            case 2:
                _a.sent();
                return [4 /*yield*/, runDelete('AIRecommendation', function () { return tx.aIRecommendation.deleteMany({ where: { organizationId: organizationId } }); })];
            case 3:
                _a.sent();
                return [4 /*yield*/, runDelete('AdCampaign', function () { return tx.adCampaign.deleteMany({ where: { organizationId: organizationId } }); })];
            case 4:
                _a.sent();
                return [4 /*yield*/, runDelete('AdPlatformIntegration', function () { return tx.adPlatformIntegration.deleteMany({ where: { organizationId: organizationId } }); })];
            case 5:
                _a.sent();
                return [4 /*yield*/, runDelete('AnalyticsEvent', function () { return tx.analyticsEvent.deleteMany({ where: { organizationId: organizationId } }); })];
            case 6:
                _a.sent();
                return [4 /*yield*/, runDelete('AutomationRule', function () { return tx.automationRule.deleteMany({ where: { organizationId: organizationId } }); })];
            case 7:
                _a.sent();
                return [4 /*yield*/, runDelete('AiUsageLog', function () { return tx.aiUsageLog.deleteMany({ where: { organizationId: organizationId } }); })];
            case 8:
                _a.sent();
                return [4 /*yield*/, runDelete('CallToLeadMapping', function () { return tx.callToLeadMapping.deleteMany({ where: { organizationId: organizationId } }); })];
            case 9:
                _a.sent();
                return [4 /*yield*/, runDelete('CallStatus', function () { return tx.callStatus.deleteMany({ where: { organizationId: organizationId } }); })];
            case 10:
                _a.sent();
                return [4 /*yield*/, runDelete('Category', function () { return tx.category.deleteMany({ where: { organizationId: organizationId } }); })];
            case 11:
                _a.sent();
                return [4 /*yield*/, runDelete('GoogleMailWatch', function () { return tx.googleMailWatch.deleteMany({ where: { organizationId: organizationId } }); })];
            case 12:
                _a.sent();
                return [4 /*yield*/, runDelete('GoogleToken', function () { return tx.googleToken.deleteMany({ where: { organizationId: organizationId } }); })];
            case 13:
                _a.sent();
                return [4 /*yield*/, runDelete('GoogleVoiceCall', function () { return tx.googleVoiceCall.deleteMany({ where: { organizationId: organizationId } }); })];
            case 14:
                _a.sent();
                return [4 /*yield*/, runDelete('GoogleVoiceConfig', function () { return tx.googleVoiceConfig.deleteMany({ where: { organizationId: organizationId } }); })];
            case 15:
                _a.sent();
                return [4 /*yield*/, runDelete('GoogleVoiceSMS', function () { return tx.googleVoiceSMS.deleteMany({ where: { organizationId: organizationId } }); })];
            case 16:
                _a.sent();
                return [4 /*yield*/, runDelete('GoogleWorkspaceConfig', function () { return tx.googleWorkspaceConfig.deleteMany({ where: { organizationId: organizationId } }); })];
            case 17:
                _a.sent();
                return [4 /*yield*/, runDelete('IntegrationsSettings', function () { return tx.integrationsSettings.deleteMany({ where: { organizationId: organizationId } }); })];
            case 18:
                _a.sent();
                return [4 /*yield*/, runDelete('Invitation', function () { return tx.invitation.deleteMany({ where: { organizationId: organizationId } }); })];
            case 19:
                _a.sent();
                return [4 /*yield*/, runDelete('Lead', function () { return tx.lead.deleteMany({ where: { organizationId: organizationId } }); })];
            case 20:
                _a.sent();
                return [4 /*yield*/, runDelete('LeadSource', function () { return tx.leadSource.deleteMany({ where: { organizationId: organizationId } }); })];
            case 21:
                _a.sent();
                return [4 /*yield*/, runDelete('LeadStatus', function () { return tx.leadStatus.deleteMany({ where: { organizationId: organizationId } }); })];
            case 22:
                _a.sent();
                return [4 /*yield*/, runDelete('Module', function () { return tx.module.deleteMany({ where: { organizationId: organizationId } }); })];
            case 23:
                _a.sent();
                return [4 /*yield*/, runDelete('Notification', function () { return tx.notification.deleteMany({ where: { organizationId: organizationId } }); })];
            case 24:
                _a.sent();
                return [4 /*yield*/, runDelete('Order', function () { return tx.order.deleteMany({ where: { organizationId: organizationId } }); })];
            case 25:
                _a.sent();
                return [4 /*yield*/, runDelete('OrganizationModuleStatus', function () { return tx.organizationModuleStatus.deleteMany({ where: { organizationId: organizationId } }); })];
            case 26:
                _a.sent();
                return [4 /*yield*/, runDelete('OrganizationRoleStatus', function () { return tx.organizationRoleStatus.deleteMany({ where: { organizationId: organizationId } }); })];
            case 27:
                _a.sent();
                return [4 /*yield*/, runDelete('Permission', function () { return tx.permission.deleteMany({ where: { organizationId: organizationId } }); })];
            case 28:
                _a.sent();
                return [4 /*yield*/, runDelete('Product', function () { return tx.product.deleteMany({ where: { organizationId: organizationId } }); })];
            case 29:
                _a.sent();
                return [4 /*yield*/, runDelete('Role', function () { return tx.role.deleteMany({ where: { organizationId: organizationId } }); })];
            case 30:
                _a.sent();
                return [4 /*yield*/, runDelete('TechnicalData', function () { return tx.technicalData.deleteMany({ where: { organizationId: organizationId } }); })];
            case 31:
                _a.sent();
                return [4 /*yield*/, runDelete('TelnyxCall', function () { return tx.telnyxCall.deleteMany({ where: { organizationId: organizationId } }); })];
            case 32:
                _a.sent();
                return [4 /*yield*/, runDelete('TelnyxConnection', function () { return tx.telnyxConnection.deleteMany({ where: { organizationId: organizationId } }); })];
            case 33:
                _a.sent();
                return [4 /*yield*/, runDelete('TelnyxMessage', function () { return tx.telnyxMessage.deleteMany({ where: { organizationId: organizationId } }); })];
            case 34:
                _a.sent();
                return [4 /*yield*/, runDelete('TelnyxPhoneNumber', function () { return tx.telnyxPhoneNumber.deleteMany({ where: { organizationId: organizationId } }); })];
            case 35:
                _a.sent();
                return [4 /*yield*/, runDelete('TelnyxUserConfig', function () { return tx.telnyxUserConfig.deleteMany({ where: { organizationId: organizationId } }); })];
            case 36:
                _a.sent();
                return [4 /*yield*/, runDelete('TimelineEvent', function () { return tx.timelineEvent.deleteMany({ where: { organizationId: organizationId } }); })];
            case 37:
                _a.sent();
                return [4 /*yield*/, runDelete('TreeBranchLeafNodeCondition', function () { return tx.treeBranchLeafNodeCondition.deleteMany({ where: { organizationId: organizationId } }); })];
            case 38:
                _a.sent();
                return [4 /*yield*/, runDelete('TreeBranchLeafNodeFormula', function () { return tx.treeBranchLeafNodeFormula.deleteMany({ where: { organizationId: organizationId } }); })];
            case 39:
                _a.sent();
                return [4 /*yield*/, runDelete('TreeBranchLeafNodeTable', function () { return tx.treeBranchLeafNodeTable.deleteMany({ where: { organizationId: organizationId } }); })];
            case 40:
                _a.sent();
                return [4 /*yield*/, runDelete('TreeBranchLeafMarker', function () { return tx.treeBranchLeafMarker.deleteMany({ where: { organizationId: organizationId } }); })];
            case 41:
                _a.sent();
                return [4 /*yield*/, runDelete('TreeBranchLeafTree', function () { return tx.treeBranchLeafTree.deleteMany({ where: { organizationId: organizationId } }); })];
            case 42:
                _a.sent();
                return [4 /*yield*/, runDelete('EcommerceIntegration', function () { return tx.ecommerceIntegration.deleteMany({ where: { organizationId: organizationId } }); })];
            case 43:
                _a.sent();
                return [4 /*yield*/, runDelete('EmailAccount', function () { return tx.emailAccount.deleteMany({ where: { organizationId: organizationId } }); })];
            case 44:
                _a.sent();
                return [4 /*yield*/, runDelete('EmailDomain', function () { return tx.emailDomain.deleteMany({ where: { organizationId: organizationId } }); })];
            case 45:
                _a.sent();
                return [4 /*yield*/, runDelete('EmailTemplate', function () { return tx.emailTemplate.deleteMany({ where: { organizationId: organizationId } }); })];
            case 46:
                _a.sent();
                return [4 /*yield*/, runDelete('CalendarEvent', function () { return tx.calendarEvent.deleteMany({ where: { organizationId: organizationId } }); })];
            case 47:
                _a.sent();
                return [4 /*yield*/, runDelete('Block', function () { return tx.block.deleteMany({ where: { organizationId: organizationId } }); })];
            case 48:
                _a.sent();
                return [4 /*yield*/, runDelete('UserOrganization', function () { return tx.userOrganization.deleteMany({ where: { organizationId: organizationId } }); })];
            case 49:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
// 🔒 VALIDATION ZOD ULTRA-STRICTE
var organizationCreateSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nom organisation minimum 2 caractères')
        .max(100, 'Nom organisation maximum 100 caractères')
        .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nom organisation contient des caractères non autorisés'),
    description: zod_1.z.string()
        .max(500, 'Description maximum 500 caractères')
        .optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE'], {
        errorMap: function () { return ({ message: 'Statut doit être ACTIVE ou INACTIVE' }); }
    }).optional(),
    // 📞 NOUVEAUX CHAMPS DE CONTACT
    website: zod_1.z.string()
        .url('Site web doit être une URL valide')
        .max(255, 'Site web maximum 255 caractères')
        .optional(),
    phone: zod_1.z.string()
        .max(20, 'Téléphone maximum 20 caractères')
        .regex(/^[\d\s\-+().]+$/, 'Numéro de téléphone contient des caractères non autorisés')
        .optional(),
    address: zod_1.z.string()
        .max(500, 'Adresse maximum 500 caractères')
        .optional(),
    // 🌟 GOOGLE WORKSPACE CONFIGURATION
    googleWorkspace: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        domain: zod_1.z.string().optional(),
        adminEmail: zod_1.z.string().email().optional(),
        modules: zod_1.z.object({
            gmail: zod_1.z.boolean().default(false),
            calendar: zod_1.z.boolean().default(false),
            drive: zod_1.z.boolean().default(false),
            meet: zod_1.z.boolean().default(false),
            docs: zod_1.z.boolean().default(false),
            sheets: zod_1.z.boolean().default(false),
            voice: zod_1.z.boolean().default(false)
        }).optional()
    }).optional()
});
var organizationUpdateSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(2, 'Nom organisation minimum 2 caractères')
        .max(100, 'Nom organisation maximum 100 caractères')
        .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nom organisation contient des caractères non autorisés')
        .optional(),
    description: zod_1.z.string()
        .max(500, 'Description maximum 500 caractères')
        .nullish(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE'], {
        errorMap: function () { return ({ message: 'Statut doit être ACTIVE ou INACTIVE' }); }
    }).optional(),
    // 📞 NOUVEAUX CHAMPS DE CONTACT
    website: zod_1.z.string()
        .url('Site web doit être une URL valide')
        .max(255, 'Site web maximum 255 caractères')
        .nullish(),
    phone: zod_1.z.string()
        .max(20, 'Téléphone maximum 20 caractères')
        .regex(/^[\d\s\-+().]+$/, 'Numéro de téléphone contient des caractères non autorisés')
        .nullish(),
    address: zod_1.z.string()
        .max(500, 'Adresse maximum 500 caractères')
        .nullish(),
    googleWorkspace: zod_1.z.object({
        enabled: zod_1.z.boolean().optional(),
        domain: zod_1.z.string().optional(),
        adminEmail: zod_1.z.string().email().optional(),
        modules: zod_1.z.object({
            gmail: zod_1.z.boolean().optional(),
            calendar: zod_1.z.boolean().optional(),
            drive: zod_1.z.boolean().optional(),
            meet: zod_1.z.boolean().optional(),
            docs: zod_1.z.boolean().optional(),
            sheets: zod_1.z.boolean().optional(),
            voice: zod_1.z.boolean().optional()
        }).optional()
    }).optional()
});
// 🚀 RATE LIMITING ADAPTATIF (Plus strict que Users/Roles car fonctionnalités sensibles)
var organizationsRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requêtes par minute (très strict)
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: function (_req, res) {
        console.log('🚨 [ORGANIZATIONS] Rate limit dépassé');
        res.status(429).json({
            success: false,
            message: 'Trop de requêtes. Veuillez attendre.'
        });
    }
});
var organizationsCreateRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 créations par minute max
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: function (_req, res) {
        res.status(429).json({
            success: false,
            message: 'Limite de création atteinte. Attendez 1 minute.'
        });
    }
});
var organizationsDeleteRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 suppressions par minute max
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: function (_req, res) {
        res.status(429).json({
            success: false,
            message: 'Limite de suppression atteinte. Attendez 1 minute.'
        });
    }
});
// 🛡️ GESTION D'ERREURS ZOD CENTRALISÉE
var handleZodError = function (error) {
    return {
        success: false,
        message: 'Données invalides',
        errors: error.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); })
    };
};
// Appliquer l'authentification et rate limiting
router.use(auth_js_1.authMiddleware);
router.use(organizationsRateLimit);
// 🟢 GET /api/organizations/active - SEULEMENT LES ORGANISATIONS ACTIVES
router.get('/active', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var requestingUser, _a, search, userId, where, sanitizedSearch, userOrgs, orgIds, organizations, enrichedOrganizations, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('[ORGANIZATIONS] GET /organizations/active - Récupération organisations ACTIVES uniquement');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                requestingUser = req.user;
                _a = req.query, search = _a.search, userId = _a.userId;
                console.log("[ORGANIZATIONS] User role: ".concat(requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role));
                console.log("[ORGANIZATIONS] Query params:", { search: search, userId: userId });
                where = {
                    status: { in: ['ACTIVE', 'active'] } // ✅ Accepter variantes de statut
                };
                if (search && typeof search === 'string') {
                    sanitizedSearch = sanitizeString(search);
                    where.name = {
                        contains: sanitizedSearch,
                        mode: 'insensitive'
                    };
                }
                if (!(userId && typeof userId === 'string')) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.userOrganization.findMany({
                        where: { userId: sanitizeString(userId) },
                        select: { organizationId: true }
                    })];
            case 2:
                userOrgs = _b.sent();
                orgIds = userOrgs.map(function (uo) { return uo.organizationId; });
                if (orgIds.length === 0) {
                    return [2 /*return*/, res.json({ success: true, data: [] })];
                }
                where.id = { in: orgIds };
                _b.label = 3;
            case 3:
                // ✅ PERMISSIONS : Tous les utilisateurs authentifiés peuvent voir les orgs actives
                if (isSuperAdmin(requestingUser)) {
                    // Super admin voit toutes les organisations actives
                    console.log('[ORGANIZATIONS] Super admin - accès aux organisations actives');
                }
                else if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) === 'admin' && requestingUser.organizationId) {
                    // Admin voit seulement son organisation SI elle est active
                    where.id = requestingUser.organizationId;
                    console.log('[ORGANIZATIONS] Admin - accès à son organisation uniquement si active');
                }
                else if (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.organizationId) {
                    // Utilisateur normal voit seulement son organisation SI elle est active
                    where.id = requestingUser.organizationId;
                    console.log('[ORGANIZATIONS] Utilisateur - accès à son organisation uniquement si active');
                }
                else {
                    console.log('[ORGANIZATIONS] Accès refusé - pas d\'organisation assignée');
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé'
                        })];
                }
                return [4 /*yield*/, prisma.organization.findMany({
                        where: where,
                        include: {
                            _count: {
                                select: {
                                    UserOrganization: true,
                                    Role: true
                                }
                            },
                            OrganizationModuleStatus: {
                                include: {
                                    Module: true
                                }
                            },
                            Role: {
                                select: {
                                    id: true,
                                    name: true,
                                    isGlobal: true
                                }
                            },
                            GoogleWorkspaceConfig: {
                                select: {
                                    id: true,
                                    isActive: true,
                                    domain: true
                                }
                            }
                        },
                        orderBy: {
                            name: 'asc'
                        }
                    })];
            case 4:
                organizations = _b.sent();
                return [4 /*yield*/, Promise.all(organizations.map(function (org) { return __awaiter(void 0, void 0, void 0, function () {
                        var activeGoogleModules, realActiveModulesCount;
                        var _a, _b, _c, _d, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    activeGoogleModules = getActiveGoogleModules(org.OrganizationModuleStatus);
                                    return [4 /*yield*/, countRealActiveModules(org.id)];
                                case 1:
                                    realActiveModulesCount = _f.sent();
                                    return [2 /*return*/, __assign(__assign({}, org), { stats: {
                                                totalUsers: (_b = (_a = org._count) === null || _a === void 0 ? void 0 : _a.UserOrganization) !== null && _b !== void 0 ? _b : 0,
                                                totalRoles: (_d = (_c = org._count) === null || _c === void 0 ? void 0 : _c.Role) !== null && _d !== void 0 ? _d : 0,
                                                activeModules: realActiveModulesCount, // ✅ DYNAMIQUE : Comptage réel en temps réel
                                                googleWorkspaceEnabled: hasGoogleWorkspaceEnabled(org.OrganizationModuleStatus, org.GoogleWorkspaceConfig)
                                            }, googleWorkspaceDomain: ((_e = org.GoogleWorkspaceConfig) === null || _e === void 0 ? void 0 : _e.domain) || extractGoogleWorkspaceDomain(org), googleWorkspaceModules: activeGoogleModules.map(function (oms) { return oms.Module; }).filter(Boolean) })];
                            }
                        });
                    }); }))];
            case 5:
                enrichedOrganizations = _b.sent();
                console.log("[ORGANIZATIONS] ".concat(enrichedOrganizations.length, " organisations ACTIVES trouv\u00E9es"));
                res.json({
                    success: true,
                    data: enrichedOrganizations
                });
                return [3 /*break*/, 7];
            case 6:
                error_2 = _b.sent();
                console.error('[ORGANIZATIONS] Erreur GET /active:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération des organisations actives'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// �🏷️ GET /api/organizations - SÉCURISÉ AVEC ZOD + SANITISATION (TOUTES LES ORGS POUR ADMIN)
router.get('/', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var requestingUser, _a, search, userId, where, sanitizedSearch, userOrgs, orgIds, organizations, enrichedOrganizations, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('[ORGANIZATIONS] GET /organizations - Récupération organisations SÉCURISÉE');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                requestingUser = req.user;
                _a = req.query, search = _a.search, userId = _a.userId;
                console.log("[ORGANIZATIONS] User role: ".concat(requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role));
                console.log("[ORGANIZATIONS] Query params:", { search: search, userId: userId });
                where = {};
                if (search && typeof search === 'string') {
                    sanitizedSearch = sanitizeString(search);
                    where.name = {
                        contains: sanitizedSearch,
                        mode: 'insensitive'
                    };
                }
                if (!(userId && typeof userId === 'string')) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.userOrganization.findMany({
                        where: { userId: sanitizeString(userId) },
                        select: { organizationId: true }
                    })];
            case 2:
                userOrgs = _b.sent();
                orgIds = userOrgs.map(function (uo) { return uo.organizationId; });
                if (orgIds.length === 0) {
                    return [2 /*return*/, res.json({ success: true, data: [] })];
                }
                where.id = { in: orgIds };
                _b.label = 3;
            case 3:
                // ✅ LOGIQUE PERMISSIONS STRICTE
                if (isSuperAdmin(requestingUser)) {
                    // Super admin voit tout
                    console.log('[ORGANIZATIONS] Super admin - accès complet');
                }
                else if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) === 'admin' && requestingUser.organizationId) {
                    // Admin voit seulement son organisation
                    where.id = requestingUser.organizationId;
                    console.log('[ORGANIZATIONS] Admin - accès à son organisation uniquement');
                }
                else {
                    console.log('[ORGANIZATIONS] Accès refusé - rôle insuffisant');
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé'
                        })];
                }
                return [4 /*yield*/, prisma.organization.findMany({
                        where: where,
                        include: {
                            _count: {
                                select: {
                                    UserOrganization: true,
                                    Role: true // ✅ AJOUT : Compter les rôles
                                }
                            },
                            OrganizationModuleStatus: {
                                include: {
                                    Module: true
                                }
                            },
                            Role: {
                                select: {
                                    id: true,
                                    name: true,
                                    isGlobal: true
                                }
                            },
                            GoogleWorkspaceConfig: {
                                select: {
                                    id: true,
                                    isActive: true,
                                    domain: true
                                }
                            }
                        },
                        orderBy: {
                            name: 'asc'
                        }
                    })];
            case 4:
                organizations = _b.sent();
                return [4 /*yield*/, Promise.all(organizations.map(function (org) { return __awaiter(void 0, void 0, void 0, function () {
                        var activeGoogleModules, realActiveModulesCount;
                        var _a, _b, _c, _d, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    activeGoogleModules = getActiveGoogleModules(org.OrganizationModuleStatus);
                                    return [4 /*yield*/, countRealActiveModules(org.id)];
                                case 1:
                                    realActiveModulesCount = _f.sent();
                                    console.log("[DEBUG] Organisation ".concat(org.name, ": ").concat(realActiveModulesCount, " modules r\u00E9ellement actifs"));
                                    return [2 /*return*/, __assign(__assign({}, org), { stats: {
                                                totalUsers: (_b = (_a = org._count) === null || _a === void 0 ? void 0 : _a.UserOrganization) !== null && _b !== void 0 ? _b : 0,
                                                totalRoles: (_d = (_c = org._count) === null || _c === void 0 ? void 0 : _c.Role) !== null && _d !== void 0 ? _d : 0, // ✅ CORRIGÉ : Nombre réel de rôles
                                                activeModules: realActiveModulesCount, // ✅ DYNAMIQUE : Comptage réel en temps réel
                                                googleWorkspaceEnabled: hasGoogleWorkspaceEnabled(org.OrganizationModuleStatus, org.GoogleWorkspaceConfig)
                                            }, googleWorkspaceDomain: ((_e = org.GoogleWorkspaceConfig) === null || _e === void 0 ? void 0 : _e.domain) || extractGoogleWorkspaceDomain(org), googleWorkspaceModules: activeGoogleModules.map(function (oms) { return oms.Module; }).filter(Boolean) })];
                            }
                        });
                    }); }))];
            case 5:
                enrichedOrganizations = _b.sent();
                console.log("[ORGANIZATIONS] ".concat(enrichedOrganizations.length, " organisations trouv\u00E9es"));
                res.json({
                    success: true,
                    data: enrichedOrganizations
                });
                return [3 /*break*/, 7];
            case 6:
                error_3 = _b.sent();
                console.error('[ORGANIZATIONS] Erreur GET:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération des organisations'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// 🏷️ POST /api/organizations - SÉCURISÉ AVEC ZOD + SANITISATION + RATE LIMITING
router.post('/', organizationsCreateRateLimit, (0, requireRole_js_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var validation, data_1, sanitizedData_1, existingOrg, now_1, generatedId_1, newOrganization, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[ORGANIZATIONS] POST /organizations - Création organisation SÉCURISÉE');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                validation = organizationCreateSchema.safeParse(req.body);
                if (!validation.success) {
                    console.log('[ORGANIZATIONS] Validation échouée:', validation.error);
                    return [2 /*return*/, res.status(400).json(handleZodError(validation.error))];
                }
                data_1 = validation.data;
                sanitizedData_1 = {
                    name: sanitizeString(data_1.name),
                    description: data_1.description ? sanitizeString(data_1.description) : null,
                    status: (data_1.status || 'ACTIVE').toUpperCase(),
                    // 📞 NOUVEAUX CHAMPS DE CONTACT
                    website: data_1.website ? sanitizeString(data_1.website) : null,
                    phone: data_1.phone ? sanitizeString(data_1.phone) : null,
                    address: data_1.address ? sanitizeString(data_1.address) : null
                };
                console.log('[ORGANIZATIONS] Données sanitisées:', sanitizedData_1);
                return [4 /*yield*/, prisma.organization.findFirst({
                        where: {
                            name: {
                                equals: sanitizedData_1.name,
                                mode: 'insensitive'
                            }
                        }
                    })];
            case 2:
                existingOrg = _a.sent();
                if (existingOrg) {
                    return [2 /*return*/, res.status(409).json({
                            success: false,
                            message: 'Une organisation avec ce nom existe déjà'
                        })];
                }
                now_1 = new Date();
                generatedId_1 = (0, crypto_1.randomUUID)();
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var org;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, tx.organization.create({
                                        data: {
                                            id: generatedId_1,
                                            name: sanitizedData_1.name,
                                            description: sanitizedData_1.description,
                                            status: sanitizedData_1.status,
                                            website: sanitizedData_1.website,
                                            phone: sanitizedData_1.phone,
                                            address: sanitizedData_1.address,
                                            createdAt: now_1,
                                            updatedAt: now_1
                                        }
                                    })];
                                case 1:
                                    org = _b.sent();
                                    // 🌟 CONFIGURATION GOOGLE WORKSPACE SI ACTIVÉE
                                    if ((_a = data_1.googleWorkspace) === null || _a === void 0 ? void 0 : _a.enabled) {
                                        console.log('[ORGANIZATIONS] Configuration Google Workspace activée');
                                        // Ici on pourrait ajouter la logique pour créer la configuration Google Workspace
                                        // pour l'instant on log juste
                                    }
                                    return [2 /*return*/, org];
                            }
                        });
                    }); })];
            case 3:
                newOrganization = _a.sent();
                console.log('[ORGANIZATIONS] Organisation créée avec succès:', newOrganization.id);
                res.status(201).json({
                    success: true,
                    message: 'Organisation créée avec succès',
                    data: newOrganization
                });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _a.sent();
                console.error('[ORGANIZATIONS] Erreur POST:', error_4);
                if (error_4 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, res.status(400).json(handleZodError(error_4))];
                }
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la création de l\'organisation'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 🏷️ GET /api/organizations/:id - SÉCURISÉ AVEC ZOD + SANITISATION
router.get('/:id', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, requestingUser, sanitizedId, organization, activeGoogleModules, realActiveModulesCount, enrichedOrganization, error_5;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                console.log('[ORGANIZATIONS] GET /organizations/:id - Récupération organisation SÉCURISÉE');
                _f.label = 1;
            case 1:
                _f.trys.push([1, 4, , 5]);
                id = req.params.id;
                requestingUser = req.user;
                sanitizedId = validateAndSanitizeId(id, 'ID organisation');
                console.log("[ORGANIZATIONS] R\u00E9cup\u00E9ration organisation ".concat(sanitizedId));
                // ✅ VÉRIFICATION PERMISSIONS
                if (!canAccessOrganization(requestingUser, sanitizedId)) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cette organisation'
                        })];
                }
                return [4 /*yield*/, prisma.organization.findUnique({
                        where: { id: sanitizedId },
                        include: {
                            UserOrganization: {
                                include: {
                                    User: {
                                        select: {
                                            id: true,
                                            email: true,
                                            firstName: true,
                                            lastName: true
                                        }
                                    },
                                    Role: {
                                        select: {
                                            id: true,
                                            name: true,
                                            label: true
                                        }
                                    }
                                }
                            },
                            OrganizationModuleStatus: {
                                include: {
                                    Module: true
                                }
                            },
                            _count: {
                                select: {
                                    UserOrganization: true,
                                    Role: true // ✅ AJOUT : Compter les rôles pour organisation individuelle
                                }
                            },
                            Role: {
                                select: {
                                    id: true,
                                    name: true,
                                    label: true,
                                    isGlobal: true
                                }
                            },
                            GoogleWorkspaceConfig: {
                                select: {
                                    id: true,
                                    isActive: true,
                                    domain: true
                                }
                            }
                        }
                    })];
            case 2:
                organization = _f.sent();
                if (!organization) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Organisation non trouvée'
                        })];
                }
                activeGoogleModules = getActiveGoogleModules(organization.OrganizationModuleStatus);
                return [4 /*yield*/, countRealActiveModules(organization.id)];
            case 3:
                realActiveModulesCount = _f.sent();
                console.log("[DEBUG] Organisation individuelle ".concat(organization.name, ": ").concat(realActiveModulesCount, " modules r\u00E9ellement actifs"));
                enrichedOrganization = __assign(__assign({}, organization), { stats: {
                        totalUsers: (_b = (_a = organization._count) === null || _a === void 0 ? void 0 : _a.UserOrganization) !== null && _b !== void 0 ? _b : 0,
                        totalRoles: (_d = (_c = organization._count) === null || _c === void 0 ? void 0 : _c.Role) !== null && _d !== void 0 ? _d : 0, // ✅ CORRIGÉ : Utilise le count direct des rôles
                        activeModules: realActiveModulesCount, // ✅ DYNAMIQUE : Comptage réel en temps réel
                        googleWorkspaceEnabled: hasGoogleWorkspaceEnabled(organization.OrganizationModuleStatus, organization.GoogleWorkspaceConfig)
                    }, googleWorkspaceDomain: ((_e = organization.GoogleWorkspaceConfig) === null || _e === void 0 ? void 0 : _e.domain) || extractGoogleWorkspaceDomain(organization), googleWorkspaceModules: activeGoogleModules.map(function (oms) { return oms.Module; }).filter(Boolean) });
                console.log('[ORGANIZATIONS] Organisation récupérée avec succès');
                res.json({
                    success: true,
                    data: enrichedOrganization
                });
                return [3 /*break*/, 5];
            case 4:
                error_5 = _f.sent();
                console.error('[ORGANIZATIONS] Erreur GET /:id:', error_5);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération de l\'organisation'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 🏷️ PUT /api/organizations/:id - SÉCURISÉ AVEC ZOD + SANITISATION + RATE LIMITING
router.put('/:id', (0, requireRole_js_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, sanitizedId_1, validation, data_2, updateData_1, existingOrg, duplicateOrg, updatedOrganization, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[ORGANIZATIONS] PUT /organizations/:id - Mise à jour organisation SÉCURISÉE');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                id = req.params.id;
                console.log('🔍 [ORGANIZATIONS] ID reçu:', id);
                console.log('🔍 [ORGANIZATIONS] Body reçu:', JSON.stringify(req.body, null, 2));
                sanitizedId_1 = validateAndSanitizeId(id, 'ID organisation');
                validation = organizationUpdateSchema.safeParse(req.body);
                if (!validation.success) {
                    console.error('❌ [ORGANIZATIONS] Erreur validation Zod:', validation.error.errors);
                    return [2 /*return*/, res.status(400).json(handleZodError(validation.error))];
                }
                console.log('✅ [ORGANIZATIONS] Validation Zod réussie');
                data_2 = validation.data;
                updateData_1 = {};
                if (data_2.name)
                    updateData_1.name = sanitizeString(data_2.name);
                if (data_2.description !== undefined) {
                    updateData_1.description = data_2.description ? sanitizeString(data_2.description) : null;
                }
                if (data_2.status)
                    updateData_1.status = data_2.status;
                // 📞 NOUVEAUX CHAMPS DE CONTACT
                if (data_2.website !== undefined) {
                    updateData_1.website = data_2.website ? sanitizeString(data_2.website) : null;
                }
                if (data_2.phone !== undefined) {
                    updateData_1.phone = data_2.phone ? sanitizeString(data_2.phone) : null;
                }
                if (data_2.address !== undefined) {
                    updateData_1.address = data_2.address ? sanitizeString(data_2.address) : null;
                }
                console.log('[ORGANIZATIONS] Données de mise à jour sanitisées:', updateData_1);
                return [4 /*yield*/, prisma.organization.findUnique({
                        where: { id: sanitizedId_1 }
                    })];
            case 2:
                existingOrg = _a.sent();
                if (!existingOrg) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Organisation non trouvée'
                        })];
                }
                if (!(updateData_1.name && updateData_1.name !== existingOrg.name)) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.organization.findFirst({
                        where: {
                            name: {
                                equals: updateData_1.name,
                                mode: 'insensitive'
                            },
                            id: { not: sanitizedId_1 }
                        }
                    })];
            case 3:
                duplicateOrg = _a.sent();
                if (duplicateOrg) {
                    return [2 /*return*/, res.status(409).json({
                            success: false,
                            message: 'Une autre organisation avec ce nom existe déjà'
                        })];
                }
                _a.label = 4;
            case 4: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var updated, existingConfig, googleWorkspaceData, modules;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, tx.organization.update({
                                    where: { id: sanitizedId_1 },
                                    data: updateData_1
                                })];
                            case 1:
                                updated = _a.sent();
                                if (!data_2.googleWorkspace) return [3 /*break*/, 6];
                                console.log('[ORGANIZATIONS] Mise à jour Google Workspace:', data_2.googleWorkspace);
                                return [4 /*yield*/, tx.googleWorkspaceConfig.findUnique({
                                        where: { organizationId: sanitizedId_1 }
                                    })];
                            case 2:
                                existingConfig = _a.sent();
                                googleWorkspaceData = {};
                                // Gestion des modules Google Workspace
                                if (data_2.googleWorkspace.modules) {
                                    modules = data_2.googleWorkspace.modules;
                                    if (modules.gmail !== undefined)
                                        googleWorkspaceData.gmailEnabled = modules.gmail;
                                    if (modules.calendar !== undefined)
                                        googleWorkspaceData.calendarEnabled = modules.calendar;
                                    if (modules.drive !== undefined)
                                        googleWorkspaceData.driveEnabled = modules.drive;
                                    if (modules.meet !== undefined)
                                        googleWorkspaceData.meetEnabled = modules.meet;
                                    if (modules.docs !== undefined)
                                        googleWorkspaceData.docsEnabled = modules.docs;
                                    if (modules.sheets !== undefined)
                                        googleWorkspaceData.sheetsEnabled = modules.sheets;
                                    if (modules.voice !== undefined)
                                        googleWorkspaceData.voiceEnabled = modules.voice;
                                }
                                // Gestion de l'activation/désactivation
                                if (data_2.googleWorkspace.enabled !== undefined) {
                                    googleWorkspaceData.enabled = data_2.googleWorkspace.enabled;
                                }
                                // Gestion du domaine et email admin
                                if (data_2.googleWorkspace.domain) {
                                    googleWorkspaceData.domain = sanitizeString(data_2.googleWorkspace.domain);
                                }
                                if (data_2.googleWorkspace.adminEmail) {
                                    googleWorkspaceData.adminEmail = sanitizeString(data_2.googleWorkspace.adminEmail);
                                }
                                if (!existingConfig) return [3 /*break*/, 4];
                                return [4 /*yield*/, tx.googleWorkspaceConfig.update({
                                        where: { organizationId: sanitizedId_1 },
                                        data: googleWorkspaceData
                                    })];
                            case 3:
                                _a.sent();
                                return [3 /*break*/, 6];
                            case 4: return [4 /*yield*/, tx.googleWorkspaceConfig.create({
                                    data: __assign({ organizationId: sanitizedId_1, enabled: data_2.googleWorkspace.enabled || false }, googleWorkspaceData)
                                })];
                            case 5:
                                _a.sent();
                                _a.label = 6;
                            case 6: return [2 /*return*/, updated];
                        }
                    });
                }); })];
            case 5:
                updatedOrganization = _a.sent();
                console.log('[ORGANIZATIONS] Organisation mise à jour avec succès');
                res.json({
                    success: true,
                    message: 'Organisation mise à jour avec succès',
                    data: updatedOrganization
                });
                return [3 /*break*/, 7];
            case 6:
                error_6 = _a.sent();
                console.error('[ORGANIZATIONS] Erreur PUT:', error_6);
                if (error_6 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, res.status(400).json(handleZodError(error_6))];
                }
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la mise à jour de l\'organisation'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// 🏷️ DELETE /api/organizations/:id - SÉCURISÉ + RATE LIMITING
router.delete('/:id', organizationsDeleteRateLimit, (0, requireRole_js_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, sanitizedId_2, existingOrg, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[ORGANIZATIONS] DELETE /organizations/:id - Suppression organisation SÉCURISÉE');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                id = req.params.id;
                sanitizedId_2 = validateAndSanitizeId(id, 'ID organisation');
                console.log("[ORGANIZATIONS] Tentative suppression organisation ".concat(sanitizedId_2));
                return [4 /*yield*/, prisma.organization.findUnique({
                        where: { id: sanitizedId_2 },
                        include: {
                            _count: {
                                select: {
                                    UserOrganization: true
                                }
                            }
                        }
                    })];
            case 2:
                existingOrg = _a.sent();
                if (!existingOrg) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Organisation non trouvée'
                        })];
                }
                // ✅ VÉRIFICATION SÉCURITÉ - Empêcher suppression si utilisateurs
                if (existingOrg._count.UserOrganization > 0) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Impossible de supprimer une organisation ayant des utilisateurs'
                        })];
                }
                // 🔄 TRANSACTION SÉCURISÉE AVEC NETTOYAGE COMPLET
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, cleanupOrganizationData(tx, sanitizedId_2)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, tx.organization.delete({
                                            where: { id: sanitizedId_2 }
                                        })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 3:
                // 🔄 TRANSACTION SÉCURISÉE AVEC NETTOYAGE COMPLET
                _a.sent();
                console.log('[ORGANIZATIONS] Organisation supprimée avec succès');
                res.json({
                    success: true,
                    message: 'Organisation supprimée avec succès'
                });
                return [3 /*break*/, 5];
            case 4:
                error_7 = _a.sent();
                console.error('[ORGANIZATIONS] Erreur DELETE:', error_7);
                if (error_7 instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error_7.code === 'P2003') {
                        return [2 /*return*/, res.status(409).json({
                                success: false,
                                message: 'Impossible de supprimer cette organisation tant que des données associées existent (modules, rôles, configurations, etc.).'
                            })];
                    }
                }
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la suppression de l\'organisation'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 🌟 ROUTES GOOGLE WORKSPACE - NOUVELLES FONCTIONNALITÉS AVANCÉES
// GET /api/organizations/:id/google-modules - Récupérer statut modules Google Workspace
router.get('/:id/google-modules', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, sanitizedId, requestingUser, moduleStatuses, defaultModules_1, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[ORGANIZATIONS] GET /organizations/:id/google-modules - Récupération modules Google');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                id = req.params.id;
                sanitizedId = validateAndSanitizeId(id, 'ID organisation');
                requestingUser = req.user;
                // ✅ VÉRIFICATION PERMISSIONS
                if (!canAccessOrganization(requestingUser, sanitizedId)) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cette organisation'
                        })];
                }
                return [4 /*yield*/, prisma.organizationModuleStatus.findMany({
                        where: {
                            organizationId: sanitizedId,
                            Module: {
                                key: {
                                    in: __spreadArray([], GOOGLE_WORKSPACE_MODULES, true)
                                }
                            }
                        },
                        include: {
                            Module: true
                        }
                    })];
            case 2:
                moduleStatuses = _a.sent();
                defaultModules_1 = {
                    gmail: { enabled: false, configured: false },
                    calendar: { enabled: false, configured: false },
                    drive: { enabled: false, configured: false },
                    meet: { enabled: false, configured: false },
                    docs: { enabled: false, configured: false },
                    sheets: { enabled: false, configured: false },
                    voice: { enabled: false, configured: false }
                };
                // Mettre à jour avec les données de la base
                moduleStatuses.forEach(function (status) {
                    var _a;
                    if (((_a = status.Module) === null || _a === void 0 ? void 0 : _a.key) && defaultModules_1[status.Module.key]) {
                        defaultModules_1[status.Module.key] = {
                            enabled: status.active,
                            configured: status.active // Simplifié pour le moment
                        };
                    }
                });
                res.json({
                    success: true,
                    data: defaultModules_1
                });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _a.sent();
                console.error('[ORGANIZATIONS] Erreur GET google-modules:', error_8);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération des modules Google'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// POST /api/organizations/:id/google-modules/:module/toggle - Toggle module Google Workspace
router.post('/:id/google-modules/:module/toggle', (0, requireRole_js_1.requireRole)(['super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, module_1, enabled_1, sanitizedId_3, sanitizedModule_1, error_9;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('[ORGANIZATIONS] POST /organizations/:id/google-modules/:module/toggle - Toggle module Google');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                _a = req.params, id = _a.id, module_1 = _a.module;
                enabled_1 = req.body.enabled;
                sanitizedId_3 = validateAndSanitizeId(id, 'ID organisation');
                sanitizedModule_1 = sanitizeString(module_1);
                // ✅ VALIDATION MODULE GOOGLE (Factorisé)
                if (!isGoogleWorkspaceModule(sanitizedModule_1)) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Module Google Workspace invalide'
                        })];
                }
                // ✅ VALIDATION ENABLED
                if (typeof enabled_1 !== 'boolean') {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Le paramètre enabled doit être un booléen'
                        })];
                }
                console.log("[ORGANIZATIONS] Toggle module ".concat(sanitizedModule_1, " \u00E0 ").concat(enabled_1, " pour organisation ").concat(sanitizedId_3));
                // 🔄 TRANSACTION SÉCURISÉE
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var moduleRecord;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.module.findFirst({
                                        where: { key: sanitizedModule_1 }
                                    })];
                                case 1:
                                    moduleRecord = _a.sent();
                                    if (!!moduleRecord) return [3 /*break*/, 3];
                                    return [4 /*yield*/, tx.module.create({
                                            data: {
                                                key: sanitizedModule_1,
                                                label: sanitizedModule_1.charAt(0).toUpperCase() + sanitizedModule_1.slice(1),
                                                feature: "google_".concat(sanitizedModule_1),
                                                active: true,
                                                order: GOOGLE_WORKSPACE_MODULES.indexOf(sanitizedModule_1)
                                            }
                                        })];
                                case 2:
                                    // Créer le module s'il n'existe pas
                                    moduleRecord = _a.sent();
                                    _a.label = 3;
                                case 3: 
                                // Mettre à jour ou créer le statut du module pour l'organisation
                                return [4 /*yield*/, tx.organizationModuleStatus.upsert({
                                        where: {
                                            organizationId_moduleId: {
                                                organizationId: sanitizedId_3,
                                                moduleId: moduleRecord.id
                                            }
                                        },
                                        update: {
                                            active: enabled_1
                                        },
                                        create: {
                                            organizationId: sanitizedId_3,
                                            moduleId: moduleRecord.id,
                                            active: enabled_1
                                        }
                                    })];
                                case 4:
                                    // Mettre à jour ou créer le statut du module pour l'organisation
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 2:
                // 🔄 TRANSACTION SÉCURISÉE
                _b.sent();
                console.log('[ORGANIZATIONS] Module Google mis à jour avec succès');
                res.json({
                    success: true,
                    message: "Module ".concat(sanitizedModule_1, " ").concat(enabled_1 ? 'activé' : 'désactivé', " avec succ\u00E8s")
                });
                return [3 /*break*/, 4];
            case 3:
                error_9 = _b.sent();
                console.error('[ORGANIZATIONS] Erreur POST google-modules toggle:', error_9);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la mise à jour du module Google'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/organizations/:id/google-workspace/domain-status - Vérifier le statut du domaine pour Google Workspace
router.get('/:id/google-workspace/domain-status', (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, sanitizedId, requestingUser, organization, googleConfig, domain, requiredRecords, isConfigured, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[ORGANIZATIONS] GET /organizations/:id/google-workspace/domain-status - Vérification statut domaine');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                id = req.params.id;
                sanitizedId = validateAndSanitizeId(id, 'ID organisation');
                requestingUser = req.user;
                // ✅ VÉRIFICATION PERMISSIONS
                if (!canAccessOrganization(requestingUser, sanitizedId)) {
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Accès refusé à cette organisation'
                        })];
                }
                return [4 /*yield*/, prisma.organization.findUnique({
                        where: { id: sanitizedId }
                    })];
            case 2:
                organization = _a.sent();
                if (!organization) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Organisation non trouvée'
                        })];
                }
                return [4 /*yield*/, prisma.googleWorkspaceConfig.findUnique({
                        where: { organizationId: sanitizedId }
                    })];
            case 3:
                googleConfig = _a.sent();
                domain = (googleConfig === null || googleConfig === void 0 ? void 0 : googleConfig.domain) || '2thier.be';
                requiredRecords = {
                    verification: {
                        type: 'TXT',
                        name: '@',
                        value: "google-site-verification=ABC123XYZ".concat(Date.now().toString().slice(-6))
                    },
                    mx: [
                        { priority: 1, server: 'aspmx.l.google.com.' },
                        { priority: 5, server: 'alt1.aspmx.l.google.com.' },
                        { priority: 5, server: 'alt2.aspmx.l.google.com.' },
                        { priority: 10, server: 'alt3.aspmx.l.google.com.' },
                        { priority: 10, server: 'alt4.aspmx.l.google.com.' }
                    ],
                    security: {
                        spf: 'v=spf1 include:_spf.google.com ~all',
                        dmarc: 'v=DMARC1; p=quarantine; rua=mailto:admin@' + domain
                    }
                };
                isConfigured = false;
                console.log('[ORGANIZATIONS] Statut domaine calculé:', { domain: domain, isConfigured: isConfigured });
                res.json({
                    success: true,
                    data: {
                        domain: domain,
                        isConfigured: isConfigured,
                        requiredRecords: isConfigured ? null : requiredRecords
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_10 = _a.sent();
                console.error('[ORGANIZATIONS] Erreur GET domain-status:', error_10);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la vérification du domaine'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

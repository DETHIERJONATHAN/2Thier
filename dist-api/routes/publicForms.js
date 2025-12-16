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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
// Routes gestion des formulaires publics (Public Forms) - RELOAD FIX
var express_1 = require("express");
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var zod_1 = require("zod");
var auth_js_1 = require("../middlewares/auth.js");
var requireRole_js_1 = require("../middlewares/requireRole.js");
var prisma_js_1 = require("../lib/prisma.js");
// 🔍 DEBUG: Vérifier que prisma est bien importé
console.log('[PUBLIC-FORMS-DEBUG] prisma importé:', typeof prisma_js_1.prisma, prisma_js_1.prisma ? '✅ OK' : '❌ UNDEFINED');
var router = (0, express_1.Router)();
var submissionRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Trop de soumissions de formulaires' }
});
var adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    message: { success: false, message: 'Trop de requetes formulaires' }
});
var rawBaseUrl = process.env.PUBLIC_FORMS_BASE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.FRONTEND_BASE_URL ||
    'https://devis1minute.be';
var PUBLIC_FORMS_BASE_URL = rawBaseUrl.replace(/\/$/, '');
var DEFAULT_EMBED_HEIGHT = Number.parseInt((_a = process.env.PUBLIC_FORM_EMBED_HEIGHT) !== null && _a !== void 0 ? _a : '', 10) || 520;
var slugify = function (value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
};
var generateFallbackSlug = function () { return "form-".concat(Math.random().toString(36).slice(2, 8)); };
var ensureUniqueSlug = function (organizationId, base, excludeFormId) { return __awaiter(void 0, void 0, void 0, function () {
    var sanitized, slug, counter, maxAttempts, allWithSlug, activeOnes, deletedOnes, timestamp, timestampedSlug;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sanitized = base || generateFallbackSlug();
                slug = sanitized;
                counter = 1;
                maxAttempts = 100;
                _a.label = 1;
            case 1:
                if (!(counter <= maxAttempts)) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findMany({
                        where: {
                            organizationId: organizationId,
                            slug: slug,
                            id: excludeFormId ? { not: excludeFormId } : undefined
                        },
                        select: { id: true, deletedAt: true }
                    })];
            case 2:
                allWithSlug = _a.sent();
                if (allWithSlug.length === 0) {
                    // Aucun formulaire avec ce slug, on peut l'utiliser
                    console.log('[ensureUniqueSlug] ✅ Slug disponible:', slug);
                    return [2 /*return*/, slug];
                }
                activeOnes = allWithSlug.filter(function (f) { return f.deletedAt === null; });
                deletedOnes = allWithSlug.filter(function (f) { return f.deletedAt !== null; });
                if (!(activeOnes.length === 0 && deletedOnes.length > 0)) return [3 /*break*/, 4];
                // Tous sont supprimés : les supprimer définitivement pour libérer le slug
                console.log("[ensureUniqueSlug] \uD83D\uDDD1\uFE0F Suppression d\u00E9finitive de ".concat(deletedOnes.length, " formulaire(s) supprim\u00E9(s) avec le slug \"").concat(slug, "\""));
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.deleteMany({
                        where: {
                            id: { in: deletedOnes.map(function (f) { return f.id; }) }
                        }
                    })];
            case 3:
                _a.sent();
                console.log('[ensureUniqueSlug] ✅ Slug libéré:', slug);
                return [2 /*return*/, slug];
            case 4:
                if (activeOnes.length > 0) {
                    // Il existe un formulaire actif avec ce slug, essayer avec un compteur
                    console.log('[ensureUniqueSlug] ⚠️ Slug déjà utilisé par un formulaire actif:', slug);
                    slug = "".concat(sanitized, "-").concat(counter++);
                }
                return [3 /*break*/, 1];
            case 5:
                timestamp = Date.now();
                timestampedSlug = "".concat(sanitized, "-").concat(timestamp);
                console.log('[ensureUniqueSlug] 🔄 Utilisation du slug avec timestamp:', timestampedSlug);
                return [2 /*return*/, timestampedSlug];
        }
    });
}); };
var toPublicUrl = function (slug) { return "".concat(PUBLIC_FORMS_BASE_URL, "/forms/").concat(slug); };
var buildEmbedCode = function (slug) {
    var url = toPublicUrl(slug);
    return "<iframe src=\"".concat(url, "\" title=\"Formulaire ").concat(slug, "\" style=\"width:100%;max-width:600px;height:").concat(DEFAULT_EMBED_HEIGHT, "px;border:0;border-radius:12px;\" loading=\"lazy\" referrerpolicy=\"no-referrer-when-downgrade\"></iframe>");
};
var mapFormToResponse = function (form) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var rawFields = Array.isArray(form.fields) ? form.fields : [];
    return {
        id: form.id,
        name: form.name,
        description: (_a = form.description) !== null && _a !== void 0 ? _a : undefined,
        category: (_b = form.category) !== null && _b !== void 0 ? _b : 'contact',
        slug: form.slug,
        publicUrl: toPublicUrl(form.slug),
        embedCode: buildEmbedCode(form.slug),
        isActive: form.isActive && form.deletedAt === null,
        collectsRgpdConsent: form.collectsRgpdConsent,
        autoPublishLeads: form.autoPublishLeads,
        maxSubmissionsPerDay: (_c = form.maxSubmissionsPerDay) !== null && _c !== void 0 ? _c : undefined,
        customCss: (_d = form.customCss) !== null && _d !== void 0 ? _d : undefined,
        thankYouMessage: form.thankYouMessage,
        redirectUrl: (_e = form.redirectUrl) !== null && _e !== void 0 ? _e : undefined,
        submissionCount: (_f = form.submissionCount) !== null && _f !== void 0 ? _f : 0,
        conversionRate: Number((_g = form.conversionRate) !== null && _g !== void 0 ? _g : 0),
        lastSubmission: form.lastSubmissionAt ? form.lastSubmissionAt.toISOString() : undefined,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
        fields: rawFields,
        campaigns: (_h = form.campaigns) !== null && _h !== void 0 ? _h : []
    };
};
var mapSubmissionToResponse = function (submission) {
    var _a, _b, _c, _d, _e;
    return ({
        id: submission.id,
        formId: submission.formId,
        submittedAt: submission.createdAt.toISOString(),
        ipAddress: (_a = submission.ipAddress) !== null && _a !== void 0 ? _a : '',
        userAgent: (_b = submission.userAgent) !== null && _b !== void 0 ? _b : '',
        leadId: (_c = submission.leadId) !== null && _c !== void 0 ? _c : undefined,
        data: (_d = submission.data) !== null && _d !== void 0 ? _d : {},
        status: (_e = submission.status) !== null && _e !== void 0 ? _e : 'new'
    });
};
var optionalPositiveInt = zod_1.z.preprocess(function (value) {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    if (typeof value === 'string') {
        var parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
}, zod_1.z.number().int().positive().optional());
var formFieldSchema = zod_1.z
    .object({
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    name: zod_1.z.string().optional(),
    label: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    required: zod_1.z.boolean().optional(),
    placeholder: zod_1.z.string().optional(),
    options: zod_1.z.array(zod_1.z.string()).optional(),
    order: zod_1.z.number().int().optional()
})
    .passthrough();
var baseFormSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nom requis'),
    description: zod_1.z.string().max(1000).optional(),
    category: zod_1.z.string().max(120).optional(),
    slug: zod_1.z.string().max(160).optional(),
    fields: zod_1.z.array(formFieldSchema).default([]),
    thankYouMessage: zod_1.z.string().min(1).max(1000).optional(),
    redirectUrl: zod_1.z.string().max(500).optional(),
    collectsRgpdConsent: zod_1.z.boolean().optional(),
    autoPublishLeads: zod_1.z.boolean().optional(),
    maxSubmissionsPerDay: optionalPositiveInt,
    customCss: zod_1.z.string().optional(),
    campaigns: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    isActive: zod_1.z.boolean().optional(),
    isPublic: zod_1.z.boolean().optional()
});
var createFormSchema = baseFormSchema;
var updateFormSchema = baseFormSchema.partial();
var toggleSchema = zod_1.z.object({ isActive: zod_1.z.boolean() });
var submissionSchema = zod_1.z
    .object({
    formId: zod_1.z.string().min(1),
    privacyConsent: zod_1.z.boolean(),
    marketingConsent: zod_1.z.boolean().optional()
})
    .passthrough();
var normalizeFormPayload = function (payload) {
    if (!payload || typeof payload !== 'object') {
        return {};
    }
    var data = __assign({}, payload);
    if (!data.name && typeof data.title === 'string') {
        data.name = data.title;
    }
    if (!data.thankYouMessage && typeof data.submissionMessage === 'string') {
        data.thankYouMessage = data.submissionMessage;
    }
    if (!data.fields && Array.isArray(data.formFields)) {
        data.fields = data.formFields;
    }
    if (data.maxSubmissionsPerDay === '') {
        data.maxSubmissionsPerDay = undefined;
    }
    return data;
};
var resolveOrganizationId = function (req, res) {
    var _a;
    var organizationId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.organizationId;
    if (!organizationId) {
        res.status(400).json({ success: false, message: 'Organization ID manquant' });
        return null;
    }
    return organizationId;
};
var listFormsHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, forms, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                organizationId = resolveOrganizationId(req, res);
                if (!organizationId) {
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findMany({
                        where: { organizationId: organizationId, deletedAt: null },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 2:
                forms = _a.sent();
                res.json(forms.map(mapFormToResponse));
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('[PUBLIC-FORMS] Liste impossible:', error_1);
                res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des formulaires' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
var statsHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, startOfDay, _a, forms, totalSubmissions, todaySubmissions, totalForms, activeForms, conversionRate, topForm, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                organizationId = resolveOrganizationId(req, res);
                if (!organizationId) {
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                return [4 /*yield*/, prisma_js_1.prisma.$transaction([
                        prisma_js_1.prisma.publicForm.findMany({
                            where: { organizationId: organizationId, deletedAt: null },
                            select: { id: true, name: true, submissionCount: true, conversionRate: true, isActive: true }
                        }),
                        prisma_js_1.prisma.publicFormSubmission.count({ where: { organizationId: organizationId } }),
                        prisma_js_1.prisma.publicFormSubmission.count({
                            where: { organizationId: organizationId, createdAt: { gte: startOfDay } }
                        })
                    ])];
            case 2:
                _a = _c.sent(), forms = _a[0], totalSubmissions = _a[1], todaySubmissions = _a[2];
                totalForms = forms.length;
                activeForms = forms.filter(function (form) { return form.isActive; }).length;
                conversionRate = totalForms > 0
                    ? Number((forms.reduce(function (sum, form) { var _a; return sum + Number((_a = form.conversionRate) !== null && _a !== void 0 ? _a : 0); }, 0) /
                        totalForms).toFixed(2))
                    : 0;
                topForm = forms.reduce(function (best, current) {
                    if (!best || current.submissionCount > best.submissionCount) {
                        return current;
                    }
                    return best;
                }, null);
                res.json({
                    totalForms: totalForms,
                    activeForms: activeForms,
                    totalSubmissions: totalSubmissions,
                    todaySubmissions: todaySubmissions,
                    conversionRate: conversionRate,
                    topPerformingForm: (_b = topForm === null || topForm === void 0 ? void 0 : topForm.name) !== null && _b !== void 0 ? _b : ''
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _c.sent();
                console.error('[PUBLIC-FORMS] Statistiques impossibles:', error_2);
                res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des statistiques' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
var submissionsHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, formId, form, submissions, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                organizationId = resolveOrganizationId(req, res);
                if (!organizationId) {
                    return [2 /*return*/];
                }
                formId = req.params.formId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findFirst({
                        where: { id: formId, organizationId: organizationId, deletedAt: null }
                    })];
            case 2:
                form = _a.sent();
                if (!form) {
                    res.status(404).json({ success: false, message: 'Formulaire introuvable' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma_js_1.prisma.publicFormSubmission.findMany({
                        where: { formId: form.id, organizationId: organizationId },
                        orderBy: { createdAt: 'desc' },
                        take: 100
                    })];
            case 3:
                submissions = _a.sent();
                res.json(submissions.map(mapSubmissionToResponse));
                return [3 /*break*/, 5];
            case 4:
                error_3 = _a.sent();
                console.error('[PUBLIC-FORMS] Soumissions impossibles:', error_3);
                res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des soumissions' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
var createFormHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, normalized, parsed, payload, baseSlug, slug, created, error_4;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return __generator(this, function (_o) {
        switch (_o.label) {
            case 0:
                organizationId = resolveOrganizationId(req, res);
                if (!organizationId) {
                    return [2 /*return*/];
                }
                normalized = normalizeFormPayload(req.body);
                parsed = createFormSchema.safeParse(normalized);
                if (!parsed.success) {
                    res.status(400).json({ success: false, message: 'Donnees invalides', issues: parsed.error.flatten() });
                    return [2 /*return*/];
                }
                _o.label = 1;
            case 1:
                _o.trys.push([1, 4, , 5]);
                payload = parsed.data;
                baseSlug = slugify((_a = payload.slug) !== null && _a !== void 0 ? _a : payload.name);
                return [4 /*yield*/, ensureUniqueSlug(organizationId, baseSlug)];
            case 2:
                slug = _o.sent();
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.create({
                        data: {
                            organizationId: organizationId,
                            name: payload.name.trim(),
                            description: ((_b = payload.description) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                            category: ((_c = payload.category) !== null && _c !== void 0 ? _c : 'contact').toLowerCase(),
                            slug: slug,
                            fields: payload.fields,
                            thankYouMessage: (_d = payload.thankYouMessage) !== null && _d !== void 0 ? _d : 'Merci pour votre soumission !',
                            redirectUrl: ((_e = payload.redirectUrl) === null || _e === void 0 ? void 0 : _e.trim()) || null,
                            collectsRgpdConsent: (_f = payload.collectsRgpdConsent) !== null && _f !== void 0 ? _f : true,
                            autoPublishLeads: (_g = payload.autoPublishLeads) !== null && _g !== void 0 ? _g : false,
                            maxSubmissionsPerDay: (_h = payload.maxSubmissionsPerDay) !== null && _h !== void 0 ? _h : null,
                            customCss: (_j = payload.customCss) !== null && _j !== void 0 ? _j : null,
                            campaigns: (_k = payload.campaigns) !== null && _k !== void 0 ? _k : [],
                            isActive: (_l = payload.isActive) !== null && _l !== void 0 ? _l : true,
                            isPublic: (_m = payload.isPublic) !== null && _m !== void 0 ? _m : true,
                            submissionCount: 0,
                            conversionRate: 0
                        }
                    })];
            case 3:
                created = _o.sent();
                res.status(201).json(mapFormToResponse(created));
                return [3 /*break*/, 5];
            case 4:
                error_4 = _o.sent();
                console.error('[PUBLIC-FORMS] Creation impossible:', error_4);
                // Erreur de contrainte unique (ne devrait plus arriver avec la nouvelle logique)
                if (error_4 instanceof Error && 'code' in error_4 && error_4.code === 'P2002') {
                    res.status(409).json({
                        success: false,
                        message: 'Un formulaire avec ce nom existe déjà. Veuillez choisir un autre nom.'
                    });
                    return [2 /*return*/];
                }
                res.status(500).json({ success: false, message: 'Erreur lors de la création du formulaire' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
var updateFormHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, formId, normalized, parsed, form, payload, nextSlug, baseSlug, data, updated, error_5;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                organizationId = resolveOrganizationId(req, res);
                if (!organizationId) {
                    return [2 /*return*/];
                }
                formId = req.params.formId;
                normalized = normalizeFormPayload(req.body);
                parsed = updateFormSchema.safeParse(normalized);
                if (!parsed.success) {
                    res.status(400).json({ success: false, message: 'Donnees invalides', issues: parsed.error.flatten() });
                    return [2 /*return*/];
                }
                _g.label = 1;
            case 1:
                _g.trys.push([1, 6, , 7]);
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findFirst({
                        where: { id: formId, organizationId: organizationId, deletedAt: null }
                    })];
            case 2:
                form = _g.sent();
                if (!form) {
                    res.status(404).json({ success: false, message: 'Formulaire introuvable' });
                    return [2 /*return*/];
                }
                payload = parsed.data;
                nextSlug = form.slug;
                if (!(payload.slug || payload.name)) return [3 /*break*/, 4];
                baseSlug = slugify((_b = (_a = payload.slug) !== null && _a !== void 0 ? _a : payload.name) !== null && _b !== void 0 ? _b : form.name);
                return [4 /*yield*/, ensureUniqueSlug(organizationId, baseSlug, form.id)];
            case 3:
                nextSlug = _g.sent();
                _g.label = 4;
            case 4:
                data = {};
                if (payload.name !== undefined)
                    data.name = payload.name.trim();
                if (payload.description !== undefined)
                    data.description = ((_c = payload.description) === null || _c === void 0 ? void 0 : _c.trim()) || null;
                if (payload.category !== undefined)
                    data.category = payload.category;
                if (payload.fields !== undefined)
                    data.fields = payload.fields;
                if (payload.thankYouMessage !== undefined)
                    data.thankYouMessage = payload.thankYouMessage;
                if (payload.redirectUrl !== undefined)
                    data.redirectUrl = ((_d = payload.redirectUrl) === null || _d === void 0 ? void 0 : _d.trim()) || null;
                if (payload.collectsRgpdConsent !== undefined)
                    data.collectsRgpdConsent = payload.collectsRgpdConsent;
                if (payload.autoPublishLeads !== undefined)
                    data.autoPublishLeads = payload.autoPublishLeads;
                if (payload.maxSubmissionsPerDay !== undefined)
                    data.maxSubmissionsPerDay = (_e = payload.maxSubmissionsPerDay) !== null && _e !== void 0 ? _e : null;
                if (payload.customCss !== undefined)
                    data.customCss = (_f = payload.customCss) !== null && _f !== void 0 ? _f : null;
                if (payload.campaigns !== undefined)
                    data.campaigns = payload.campaigns;
                if (payload.isActive !== undefined)
                    data.isActive = payload.isActive;
                if (nextSlug !== form.slug)
                    data.slug = nextSlug;
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.update({
                        where: { id: form.id },
                        data: data
                    })];
            case 5:
                updated = _g.sent();
                res.json(mapFormToResponse(updated));
                return [3 /*break*/, 7];
            case 6:
                error_5 = _g.sent();
                console.error('[PUBLIC-FORMS] Mise à jour impossible:', error_5);
                // Erreur de contrainte unique lors de la modification du slug
                if (error_5 instanceof Error && 'code' in error_5 && error_5.code === 'P2002') {
                    res.status(409).json({
                        success: false,
                        message: 'Un formulaire avec ce nom existe déjà. Veuillez choisir un autre nom.'
                    });
                    return [2 /*return*/];
                }
                res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du formulaire' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
var toggleFormHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, formId, parsed, form, updated, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                organizationId = resolveOrganizationId(req, res);
                if (!organizationId) {
                    return [2 /*return*/];
                }
                formId = req.params.formId;
                parsed = toggleSchema.safeParse(req.body);
                if (!parsed.success) {
                    res.status(400).json({ success: false, message: 'Donnees invalides', issues: parsed.error.flatten() });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findFirst({
                        where: { id: formId, organizationId: organizationId, deletedAt: null }
                    })];
            case 2:
                form = _a.sent();
                if (!form) {
                    res.status(404).json({ success: false, message: 'Formulaire introuvable' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.update({
                        where: { id: form.id },
                        data: { isActive: parsed.data.isActive }
                    })];
            case 3:
                updated = _a.sent();
                res.json(mapFormToResponse(updated));
                return [3 /*break*/, 5];
            case 4:
                error_6 = _a.sent();
                console.error('[PUBLIC-FORMS] Toggle impossible:', error_6);
                res.status(500).json({ success: false, message: 'Erreur lors du changement de statut du formulaire' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
var deleteFormHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, formId, form, deletedSlug, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                organizationId = resolveOrganizationId(req, res);
                if (!organizationId) {
                    return [2 /*return*/];
                }
                formId = req.params.formId;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findFirst({
                        where: { id: formId, organizationId: organizationId, deletedAt: null }
                    })];
            case 2:
                form = _a.sent();
                if (!form) {
                    res.status(404).json({ success: false, message: 'Formulaire introuvable' });
                    return [2 /*return*/];
                }
                deletedSlug = "".concat(form.slug, "-deleted-").concat(Date.now());
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.update({
                        where: { id: form.id },
                        data: {
                            deletedAt: new Date(),
                            isActive: false,
                            slug: deletedSlug // Libère le slug original pour réutilisation
                        }
                    })];
            case 3:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 5];
            case 4:
                error_7 = _a.sent();
                console.error('[PUBLIC-FORMS] Suppression impossible:', error_7);
                res.status(500).json({ success: false, message: 'Erreur lors de la suppression du formulaire' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
router.get('/', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, listFormsHandler);
router.get('/stats', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, statsHandler);
router.get('/:formId/submissions', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, submissionsHandler);
router.get('/:formId', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formId, user, form, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                formId = req.params.formId;
                user = req.user;
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findFirst({
                        where: __assign({ id: formId, deletedAt: null }, (user.isSuperAdmin ? {} : { organizationId: user.organizationId }))
                    })];
            case 1:
                form = _a.sent();
                if (!form) {
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Formulaire introuvable' })];
                }
                res.json(form);
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error('[PUBLIC-FORMS] Erreur récupération formulaire:', error_8);
                res.status(500).json({ success: false, message: 'Erreur lors de la récupération du formulaire' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, createFormHandler);
router.put('/:formId', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, updateFormHandler);
router.patch('/:formId/toggle', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, toggleFormHandler);
router.delete('/:formId', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, deleteFormHandler);
var adminRouter = (0, express_1.Router)();
adminRouter.get('/list', listFormsHandler);
adminRouter.get('/stats', statsHandler);
adminRouter.get('/:formId/submissions', submissionsHandler);
adminRouter.post('/create', createFormHandler);
adminRouter.put('/:formId', updateFormHandler);
adminRouter.patch('/:formId/toggle', toggleFormHandler);
adminRouter.post('/:formId/toggle', toggleFormHandler);
adminRouter.delete('/:formId', deleteFormHandler);
router.use('/admin', auth_js_1.authMiddleware, (0, requireRole_js_1.requireRole)(['admin', 'super_admin']), adminRateLimit, adminRouter);
router.get('/public/:identifier/config', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var identifier, form, fields, error_9;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                identifier = req.params.identifier;
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findFirst({
                        where: {
                            deletedAt: null,
                            isActive: true,
                            isPublic: true,
                            OR: [{ id: identifier }, { slug: identifier }]
                        }
                    })];
            case 1:
                form = _c.sent();
                if (!form) {
                    res.status(404).json({ success: false, message: 'Formulaire introuvable' });
                    return [2 /*return*/];
                }
                fields = Array.isArray(form.fields) ? form.fields : [];
                res.json({
                    success: true,
                    data: {
                        id: form.id,
                        title: form.name,
                        name: form.name,
                        description: form.description,
                        fields: fields,
                        styling: {
                            submitLabel: 'Envoyer',
                            customCss: (_a = form.customCss) !== null && _a !== void 0 ? _a : undefined,
                            redirectUrl: (_b = form.redirectUrl) !== null && _b !== void 0 ? _b : undefined
                        },
                        submissionMessage: form.thankYouMessage
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _c.sent();
                console.error('[PUBLIC-FORMS] Config publique impossible:', error_9);
                res.status(500).json({ success: false, message: 'Erreur lors de la recuperation de la configuration du formulaire' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/submit', submissionRateLimit, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, _a, formId, privacyConsent, _b, marketingConsent, payload, form, startOfDay, submissionsToday, ipAddress, userAgent, submission, error_10;
    var _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                parsed = submissionSchema.safeParse(req.body);
                if (!parsed.success) {
                    res.status(400).json({ success: false, message: 'Donnees de soumission invalides', issues: parsed.error.flatten() });
                    return [2 /*return*/];
                }
                _a = parsed.data, formId = _a.formId, privacyConsent = _a.privacyConsent, _b = _a.marketingConsent, marketingConsent = _b === void 0 ? false : _b, payload = __rest(_a, ["formId", "privacyConsent", "marketingConsent"]);
                if (!privacyConsent) {
                    res.status(400).json({ success: false, message: 'Consentement de confidentialite requis' });
                    return [2 /*return*/];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 7, , 8]);
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.findFirst({
                        where: {
                            deletedAt: null,
                            isActive: true,
                            isPublic: true,
                            OR: [{ id: formId }, { slug: formId }]
                        }
                    })];
            case 2:
                form = _f.sent();
                if (!form) {
                    res.status(404).json({ success: false, message: 'Formulaire introuvable' });
                    return [2 /*return*/];
                }
                if (!form.maxSubmissionsPerDay) return [3 /*break*/, 4];
                startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                return [4 /*yield*/, prisma_js_1.prisma.publicFormSubmission.count({
                        where: {
                            formId: form.id,
                            createdAt: { gte: startOfDay }
                        }
                    })];
            case 3:
                submissionsToday = _f.sent();
                if (submissionsToday >= form.maxSubmissionsPerDay) {
                    res.status(429).json({ success: false, message: 'Limite de soumissions atteinte pour aujourd\'hui' });
                    return [2 /*return*/];
                }
                _f.label = 4;
            case 4:
                ipAddress = ((_d = (_c = req.headers['x-forwarded-for']) === null || _c === void 0 ? void 0 : _c.split(',')[0]) === null || _d === void 0 ? void 0 : _d.trim()) ||
                    req.socket.remoteAddress ||
                    'unknown';
                userAgent = (_e = req.headers['user-agent']) !== null && _e !== void 0 ? _e : 'unknown';
                return [4 /*yield*/, prisma_js_1.prisma.publicFormSubmission.create({
                        data: {
                            formId: form.id,
                            organizationId: form.organizationId,
                            data: payload,
                            status: 'new',
                            ipAddress: ipAddress,
                            userAgent: userAgent,
                            privacyConsent: privacyConsent,
                            marketingConsent: marketingConsent
                        }
                    })];
            case 5:
                submission = _f.sent();
                return [4 /*yield*/, prisma_js_1.prisma.publicForm.update({
                        where: { id: form.id },
                        data: {
                            submissionCount: { increment: 1 },
                            lastSubmissionAt: new Date()
                        }
                    })];
            case 6:
                _f.sent();
                res.json({
                    success: true,
                    message: form.thankYouMessage,
                    data: {
                        submissionId: submission.id,
                        submittedAt: submission.createdAt.toISOString()
                    }
                });
                return [3 /*break*/, 8];
            case 7:
                error_10 = _f.sent();
                console.error('[PUBLIC-FORMS] Soumission impossible:', error_10);
                res.status(500).json({ success: false, message: 'Erreur lors de la soumission du formulaire' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

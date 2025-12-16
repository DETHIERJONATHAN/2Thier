"use strict";
/**
 * API Routes pour la gestion des sites web
 * GET /api/websites - Liste des sites
 * GET /api/websites/:slug - Détails complets d'un site
 */
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
var client_1 = require("@prisma/client");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// ⚠️ IMPORTANT: Les routes GET sont publiques (affichage site vitrine)
// Les routes POST/PUT/PATCH/DELETE sont protégées par authenticateToken
/**
 * GET /api/websites
 * Liste tous les sites web d'une organisation
 * Query param: ?all=true pour voir tous les sites (Super Admin uniquement)
 * 🔒 PROTÉGÉE: Nécessite authentification (admin seulement)
 */
router.get('/websites', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, showAll, whereClause, websites, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.headers['x-organization-id'];
                showAll = req.query.all === 'true';
                if (!organizationId && !showAll) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organization ID is required' })];
                }
                whereClause = {
                    isActive: true
                };
                // Si pas de showAll, filtrer par organisation
                if (!showAll && organizationId) {
                    whereClause.organizationId = organizationId;
                }
                return [4 /*yield*/, prisma.webSite.findMany({
                        where: whereClause,
                        include: {
                            config: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    })];
            case 1:
                websites = _a.sent();
                res.json(websites);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Error fetching websites:', error_1);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/websites/:slug
 * Récupère tous les détails d'un site par son slug
 */
router.get('/websites/:slug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, organizationId, whereClause, website, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                slug = req.params.slug;
                organizationId = req.headers['x-organization-id'];
                whereClause = { slug: slug, isActive: true };
                if (organizationId) {
                    whereClause.organizationId = organizationId;
                }
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: whereClause,
                        include: {
                            config: {
                                include: {
                                    logoFile: true,
                                    faviconFile: true,
                                    heroBackgroundFile: true,
                                    ogImageFile: true
                                }
                            },
                            sections: {
                                where: { isActive: true },
                                orderBy: { displayOrder: 'asc' }
                            },
                            services: {
                                where: { isActive: true },
                                orderBy: { displayOrder: 'asc' }
                            },
                            projects: {
                                where: { isActive: true },
                                orderBy: { displayOrder: 'asc' }
                            },
                            testimonials: {
                                where: { isActive: true },
                                orderBy: { displayOrder: 'asc' }
                            },
                            blogPosts: {
                                where: { isPublished: true },
                                orderBy: { publishedAt: 'desc' },
                                take: 10,
                                include: {
                                    author: {
                                        select: {
                                            id: true,
                                            firstName: true,
                                            lastName: true,
                                            avatarUrl: true
                                        }
                                    }
                                }
                            },
                            mediaFiles: {
                                where: { isPublic: true },
                                orderBy: { createdAt: 'desc' }
                            }
                        }
                    })];
            case 1:
                website = _a.sent();
                if (!website) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                // Vérifier si le site est en maintenance
                if (website.maintenanceMode && !organizationId) {
                    return [2 /*return*/, res.status(503).json({
                            error: 'Site en maintenance',
                            message: website.maintenanceMessage || 'Le site est temporairement indisponible.'
                        })];
                }
                res.json(website);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Error fetching website:', error_2);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/websites/:slug/services
 * Récupère uniquement les services d'un site
 */
router.get('/websites/:slug/services', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, website, services, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                slug = req.params.slug;
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: { slug: slug, isActive: true },
                        select: { id: true }
                    })];
            case 1:
                website = _a.sent();
                if (!website) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                return [4 /*yield*/, prisma.webSiteService.findMany({
                        where: {
                            websiteId: website.id,
                            isActive: true
                        },
                        orderBy: { displayOrder: 'asc' }
                    })];
            case 2:
                services = _a.sent();
                res.json(services);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error('Error fetching services:', error_3);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/websites/:slug/projects
 * Récupère uniquement les projets/réalisations d'un site
 */
router.get('/websites/:slug/projects', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, featured, website, whereClause, projects, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                slug = req.params.slug;
                featured = req.query.featured;
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: { slug: slug, isActive: true },
                        select: { id: true }
                    })];
            case 1:
                website = _a.sent();
                if (!website) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                whereClause = {
                    websiteId: website.id,
                    isActive: true
                };
                if (featured === 'true') {
                    whereClause.isFeatured = true;
                }
                return [4 /*yield*/, prisma.webSiteProject.findMany({
                        where: whereClause,
                        orderBy: { displayOrder: 'asc' }
                    })];
            case 2:
                projects = _a.sent();
                res.json(projects);
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                console.error('Error fetching projects:', error_4);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/websites/:slug/testimonials
 * Récupère uniquement les témoignages d'un site
 */
router.get('/websites/:slug/testimonials', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, featured, website, whereClause, testimonials, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                slug = req.params.slug;
                featured = req.query.featured;
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: { slug: slug, isActive: true },
                        select: { id: true }
                    })];
            case 1:
                website = _a.sent();
                if (!website) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                whereClause = {
                    websiteId: website.id,
                    isActive: true
                };
                if (featured === 'true') {
                    whereClause.isFeatured = true;
                }
                return [4 /*yield*/, prisma.webSiteTestimonial.findMany({
                        where: whereClause,
                        orderBy: { displayOrder: 'asc' }
                    })];
            case 2:
                testimonials = _a.sent();
                res.json(testimonials);
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('Error fetching testimonials:', error_5);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/websites/:slug/blog
 * Récupère les articles de blog d'un site
 */
router.get('/websites/:slug/blog', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, _a, _b, limit, featured, website, whereClause, blogPosts, error_6;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                slug = req.params.slug;
                _a = req.query, _b = _a.limit, limit = _b === void 0 ? '10' : _b, featured = _a.featured;
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: { slug: slug, isActive: true },
                        select: { id: true }
                    })];
            case 1:
                website = _c.sent();
                if (!website) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                whereClause = {
                    websiteId: website.id,
                    isPublished: true
                };
                if (featured === 'true') {
                    whereClause.isFeatured = true;
                }
                return [4 /*yield*/, prisma.webSiteBlogPost.findMany({
                        where: whereClause,
                        orderBy: { publishedAt: 'desc' },
                        take: parseInt(limit),
                        include: {
                            author: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    avatarUrl: true
                                }
                            }
                        }
                    })];
            case 2:
                blogPosts = _c.sent();
                res.json(blogPosts);
                return [3 /*break*/, 4];
            case 3:
                error_6 = _c.sent();
                console.error('Error fetching blog posts:', error_6);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /api/websites/:slug/blog/:postSlug
 * Récupère un article de blog spécifique
 */
router.get('/websites/:slug/blog/:postSlug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, slug, postSlug, website, blogPost, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.params, slug = _a.slug, postSlug = _a.postSlug;
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: { slug: slug, isActive: true },
                        select: { id: true }
                    })];
            case 1:
                website = _b.sent();
                if (!website) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                return [4 /*yield*/, prisma.webSiteBlogPost.findFirst({
                        where: {
                            websiteId: website.id,
                            slug: postSlug,
                            isPublished: true
                        },
                        include: {
                            author: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    avatarUrl: true,
                                    email: true
                                }
                            }
                        }
                    })];
            case 2:
                blogPost = _b.sent();
                if (!blogPost) {
                    return [2 /*return*/, res.status(404).json({ error: 'Blog post not found' })];
                }
                res.json(blogPost);
                return [3 /*break*/, 4];
            case 3:
                error_7 = _b.sent();
                console.error('Error fetching blog post:', error_7);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * PUT /api/websites/:id
 * Met à jour un site web
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.put('/websites/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var websiteId, organizationId, data, existingWebsite, updatedWebsite, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                websiteId = parseInt(req.params.id);
                organizationId = req.headers['x-organization-id'];
                data = req.body;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organization ID is required' })];
                }
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: {
                            id: websiteId,
                            organizationId: organizationId
                        }
                    })];
            case 1:
                existingWebsite = _a.sent();
                if (!existingWebsite) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                return [4 /*yield*/, prisma.webSite.update({
                        where: { id: websiteId },
                        data: {
                            name: data.name,
                            slug: data.slug,
                            domain: data.domain,
                            description: data.description,
                            language: data.language,
                            timezone: data.timezone,
                            isActive: data.isActive,
                            maintenanceMode: data.maintenanceMode,
                            maintenanceMessage: data.maintenanceMessage,
                            analyticsCode: data.analyticsCode,
                            customCss: data.customCss,
                            customJs: data.customJs,
                            seoMetadata: data.seoMetadata
                        },
                        include: {
                            config: true
                        }
                    })];
            case 2:
                updatedWebsite = _a.sent();
                res.json(updatedWebsite);
                return [3 /*break*/, 4];
            case 3:
                error_8 = _a.sent();
                console.error('Error updating website:', error_8);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * POST /api/websites
 * Crée un nouveau site web
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.post('/websites', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, data, newWebsite, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                organizationId = req.headers['x-organization-id'];
                data = req.body;
                if (!organizationId) {
                    return [2 /*return*/, res.status(400).json({ error: 'Organization ID is required' })];
                }
                return [4 /*yield*/, prisma.webSite.create({
                        data: {
                            name: data.name,
                            slug: data.slug,
                            domain: data.domain,
                            description: data.description,
                            language: data.language || 'fr',
                            timezone: data.timezone || 'Europe/Brussels',
                            organizationId: organizationId,
                            isActive: true,
                            maintenanceMode: false
                        },
                        include: {
                            config: true
                        }
                    })];
            case 1:
                newWebsite = _a.sent();
                res.status(201).json(newWebsite);
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('Error creating website:', error_9);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * DELETE /api/websites/:id
 * Supprime un site web et toutes ses données associées (cascade)
 * Super Admin peut supprimer n'importe quel site
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.delete('/websites/:id', auth_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var websiteId, organizationId, user, whereClause, existingWebsite, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('🗑️ [WEBSITES] DELETE /websites/:id atteint!');
                console.log('🗑️ [WEBSITES] ID du site:', req.params.id);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                websiteId = parseInt(req.params.id);
                organizationId = req.headers['x-organization-id'];
                user = req.user;
                console.log('🗑️ [WEBSITES] User:', user === null || user === void 0 ? void 0 : user.email, 'isSuperAdmin:', user === null || user === void 0 ? void 0 : user.isSuperAdmin);
                console.log('🗑️ [WEBSITES] OrganizationId:', organizationId);
                if (!organizationId && !(user === null || user === void 0 ? void 0 : user.isSuperAdmin)) {
                    console.log('❌ [WEBSITES] Organization ID requis et user n\'est pas Super Admin');
                    return [2 /*return*/, res.status(400).json({ error: 'Organization ID is required' })];
                }
                whereClause = { id: websiteId };
                // Si ce n'est pas un Super Admin, on vérifie l'organisation
                if (!(user === null || user === void 0 ? void 0 : user.isSuperAdmin) && organizationId) {
                    whereClause.organizationId = organizationId;
                }
                return [4 /*yield*/, prisma.webSite.findFirst({
                        where: whereClause
                    })];
            case 2:
                existingWebsite = _a.sent();
                if (!existingWebsite) {
                    return [2 /*return*/, res.status(404).json({ error: 'Website not found' })];
                }
                // Supprimer le site (cascade delete configuré dans Prisma supprimera automatiquement:
                // sections, services, projects, testimonials, blogPosts, mediaFiles, config)
                return [4 /*yield*/, prisma.webSite.delete({
                        where: { id: websiteId }
                    })];
            case 3:
                // Supprimer le site (cascade delete configuré dans Prisma supprimera automatiquement:
                // sections, services, projects, testimonials, blogPosts, mediaFiles, config)
                _a.sent();
                console.log("\u2705 Site web ".concat(websiteId, " (").concat(existingWebsite.name, ") supprim\u00E9 par ").concat((user === null || user === void 0 ? void 0 : user.email) || 'unknown'));
                res.json({
                    success: true,
                    message: "Site \"".concat(existingWebsite.name, "\" supprim\u00E9 avec succ\u00E8s")
                });
                return [3 /*break*/, 5];
            case 4:
                error_10 = _a.sent();
                console.error('Error deleting website:', error_10);
                res.status(500).json({ error: 'Internal server error' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

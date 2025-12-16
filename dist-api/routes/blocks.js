"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
var uuid_1 = require("uuid");
var auth_1 = require("../middlewares/auth");
var requireRole_1 = require("../middlewares/requireRole");
var impersonation_1 = require("../middlewares/impersonation");
var adaptBlockStructure_1 = require("../helpers/adaptBlockStructure");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
router.use(auth_1.authMiddleware, impersonation_1.impersonationMiddleware);
// Petit helper de résilience: ajoute la colonne sectionType si absente
function ensureSectionTypeColumnExists() {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma.$executeRawUnsafe('ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "sectionType" TEXT NOT NULL DEFAULT \'normal\'')];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    // silencieux, on laissera l'erreur initiale si autre problème
                    console.warn('[API] ensureSectionTypeColumnExists (blocks.ts) - avertissement:', e_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// GET tous les blocks d'une organisation
router.get('/', 
// Middleware anti-cache pour forcer le rechargement
function (req, res, next) {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': false,
        'Last-Modified': false
    });
    // Désactiver aussi les headers de cache de la requête
    if (req.headers['if-none-match'])
        delete req.headers['if-none-match'];
    if (req.headers['if-modified-since'])
        delete req.headers['if-modified-since'];
    next();
}, (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, whereClause, blocks, firstBlock, blocksWithAdaptedStructure, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                user = req.user;
                console.log('[DEBUG] User role:', user === null || user === void 0 ? void 0 : user.role);
                console.log('[DEBUG] User:', JSON.stringify(user, null, 2));
                organizationId = req.query.organizationId ||
                    req.headers['x-organization-id'] ||
                    (user === null || user === void 0 ? void 0 : user.organizationId);
                console.log("[API] GET /api/blocks pour org: ".concat(organizationId, " par user: ").concat((user === null || user === void 0 ? void 0 : user.id) || 'undefined'));
                console.log("[API] Sources org ID - query: ".concat(req.query.organizationId, ", header: ").concat(req.headers['x-organization-id'], ", user: ").concat(user === null || user === void 0 ? void 0 : user.organizationId));
                whereClause = {};
                // Si un organizationId est fourni, on l'utilise.
                if (organizationId) {
                    whereClause.organizationId = organizationId;
                    console.log("[API] Recherche de blocs pour l'organisation: ".concat(organizationId));
                }
                else if ((user === null || user === void 0 ? void 0 : user.isSuperAdmin) || (user === null || user === void 0 ? void 0 : user.role) === 'super_admin') {
                    // Si l'utilisateur est super_admin et qu'aucun ID d'orga n'est fourni,
                    // on ne met pas de filtre, ce qui retournera TOUS les blocs.
                    console.log('[API] SuperAdmin a demandé tous les blocs.');
                }
                else {
                    // Si ce n'est pas un super_admin et qu'il n'y a pas d'ID d'orga, on retourne un tableau vide.
                    console.log('[API] Utilisateur non-SuperAdmin sans ID d\'orga. Retour d\'un tableau vide.');
                    res.json({ success: true, data: [] });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                console.log("[API] Clause WHERE pour Prisma:", JSON.stringify(whereClause, null, 2));
                return [4 /*yield*/, prisma.block.findMany({
                        where: whereClause,
                        include: {
                            Section: {
                                orderBy: { order: 'asc' },
                                include: {
                                    Field: {
                                        orderBy: { order: 'asc' },
                                        include: {
                                            FieldOption: {
                                                orderBy: { order: 'asc' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    })];
            case 2:
                blocks = _b.sent();
                console.log("[API] Prisma a trouv\u00E9 ".concat(blocks.length, " blocks bruts"));
                // Debug détaillé du premier bloc
                if (blocks.length > 0) {
                    firstBlock = blocks[0];
                    console.log("[API] Premier bloc - ID: ".concat(firstBlock.id, ", Name: ").concat(firstBlock.name));
                    console.log("[API] Premier bloc - Section prop exists: ".concat('Section' in firstBlock));
                    console.log("[API] Premier bloc - Section value: ".concat(Array.isArray(firstBlock.Section) ? firstBlock.Section.length + ' sections' : typeof firstBlock.Section));
                    if (firstBlock.Section && Array.isArray(firstBlock.Section)) {
                        console.log("[API] Section details: ".concat(firstBlock.Section.map(function (s) { var _a; return "".concat(s.name, "(").concat(((_a = s.Field) === null || _a === void 0 ? void 0 : _a.length) || 0, " fields)"); }).join(', ')));
                    }
                }
                console.log("[API] Blocks trouv\u00E9s:", blocks.map(function (b) { var _a; return ({ id: b.id, name: b.name, organizationId: b.organizationId, sectionsCount: ((_a = b.Section) === null || _a === void 0 ? void 0 : _a.length) || 0 }); }));
                console.log("[API] Premier bloc avant adaptation:", JSON.stringify(blocks[0], null, 2));
                console.log("[API] === D\u00C9BUT ADAPTATION ===");
                blocksWithAdaptedStructure = blocks.map(adaptBlockStructure_1.adaptBlockStructure);
                console.log("[API] Blocks apr\u00E8s adaptation: ".concat(blocksWithAdaptedStructure.length));
                if (blocksWithAdaptedStructure.length > 0) {
                    console.log("[API] Premier bloc apr\u00E8s adaptation - ID: ".concat(blocksWithAdaptedStructure[0].id));
                    console.log("[API] Premier bloc apr\u00E8s adaptation - sections?: ".concat(blocksWithAdaptedStructure[0].sections ? blocksWithAdaptedStructure[0].sections.length : 'undefined'));
                    if (blocksWithAdaptedStructure[0].sections && blocksWithAdaptedStructure[0].sections.length > 0) {
                        console.log("[API] Premi\u00E8re section: ".concat(blocksWithAdaptedStructure[0].sections[0].name, " avec ").concat(((_a = blocksWithAdaptedStructure[0].sections[0].fields) === null || _a === void 0 ? void 0 : _a.length) || 0, " champs"));
                    }
                }
                console.log("[API] === FIN ADAPTATION ===");
                console.log("[API] Retour final:", blocksWithAdaptedStructure.map(function (b) { var _a; return ({ id: b.id, name: b.name, sectionsCount: ((_a = b.sections) === null || _a === void 0 ? void 0 : _a.length) || 0 }); }));
                // Désactiver le cache pour s'assurer que les données fraîches sont retournées
                res.set({
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.json({ success: true, data: blocksWithAdaptedStructure });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                console.error("[API] Erreur lors de la récupération des blocks:", error_1);
                res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des formulaires" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /api/blocks/read - Lecture SÛRE pour utilisateurs authentifiés (même organisation)
// Retourne les formulaires (blocks) de l'organisation de l'utilisateur sans exiger le rôle admin
router.get('/read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, organizationId, blocks, adapted, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                user = req.user;
                organizationId = req.query.organizationId || req.headers['x-organization-id'] || (user === null || user === void 0 ? void 0 : user.organizationId);
                if (!organizationId) {
                    res.json({ success: true, data: [] });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.block.findMany({
                        where: { organizationId: organizationId },
                        include: {
                            Section: {
                                orderBy: { order: 'asc' },
                                include: {
                                    Field: {
                                        orderBy: { order: 'asc' },
                                        include: { FieldOption: { orderBy: { order: 'asc' } } },
                                    },
                                },
                            },
                        },
                        orderBy: { updatedAt: 'desc' },
                    })];
            case 1:
                blocks = _a.sent();
                adapted = blocks.map(adaptBlockStructure_1.adaptBlockStructure);
                res.json({ success: true, data: adapted });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('[API] Erreur GET /api/blocks/read:', error_2);
                res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des formulaires (lecture)' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET /api/blocks/:id/read - Lecture SÛRE d'un formulaire spécifique si appartient à l'organisation
router.get('/:id/read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, user, organizationId, block, adapted, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                user = req.user;
                organizationId = req.query.organizationId || req.headers['x-organization-id'] || (user === null || user === void 0 ? void 0 : user.organizationId);
                if (!organizationId) {
                    res.status(404).json({ success: false, message: 'Formulaire non trouvé' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.block.findFirst({
                        where: { id: id, organizationId: organizationId },
                        include: {
                            Section: {
                                orderBy: { order: 'asc' },
                                include: {
                                    Field: {
                                        orderBy: { order: 'asc' },
                                        include: { FieldOption: { orderBy: { order: 'asc' } } },
                                    },
                                },
                            },
                        },
                    })];
            case 1:
                block = _a.sent();
                if (!block) {
                    res.status(404).json({ success: false, message: 'Formulaire non trouvé' });
                    return [2 /*return*/];
                }
                adapted = (0, adaptBlockStructure_1.adaptBlockStructure)(block);
                res.json({ success: true, data: adapted });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('[API] Erreur GET /api/blocks/:id/read:', error_3);
                res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération du formulaire' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// POST création d'un block
router.post('/', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, organizationId, block;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, organizationId = _a.organizationId;
                if (!name || !organizationId) {
                    res.status(400).json({ success: false, message: 'Nom et organisation requis.' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.block.create({ data: { id: (0, uuid_1.v4)(), name: name, organizationId: organizationId, createdAt: new Date(), updatedAt: new Date() } })];
            case 1:
                block = _b.sent();
                res.json({ success: true, data: block });
                return [2 /*return*/];
        }
    });
}); });
// PUT mise à jour d'un block
router.put('/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, name, block;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                name = req.body.name;
                return [4 /*yield*/, prisma.block.update({ where: { id: id }, data: { name: name, updatedAt: new Date() } })];
            case 1:
                block = _a.sent();
                res.json({ success: true, data: block });
                return [2 /*return*/];
        }
    });
}); });
// DELETE suppression d'un block
router.delete('/:id', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, sections, _i, sections_1, section, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 9, , 10]);
                return [4 /*yield*/, prisma.section.findMany({ where: { blockId: id } })];
            case 2:
                sections = _a.sent();
                _i = 0, sections_1 = sections;
                _a.label = 3;
            case 3:
                if (!(_i < sections_1.length)) return [3 /*break*/, 6];
                section = sections_1[_i];
                return [4 /*yield*/, prisma.field.deleteMany({ where: { sectionId: section.id } })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6: return [4 /*yield*/, prisma.section.deleteMany({ where: { blockId: id } })];
            case 7:
                _a.sent();
                return [4 /*yield*/, prisma.block.delete({ where: { id: id } })];
            case 8:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 10];
            case 9:
                error_4 = _a.sent();
                console.error("[API] Erreur lors de la suppression du block ".concat(id, ":"), error_4);
                res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression du block." });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// Route pour ajouter une section à un block
router.post('/:blockId/sections', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var blockId, _a, name, order, type, err_1, msg, created, updatedBlockWithRelations, adaptedBlock, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                blockId = req.params.blockId;
                _a = req.body, name = _a.name, order = _a.order, type = _a.type;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 17, , 18]);
                // On ne crée pas la section si elle n'a pas de nom
                if (!name) {
                    res.status(400).json({ success: false, message: "Le nom de la section est requis." });
                    return [2 /*return*/];
                }
                if (!(typeof type !== 'undefined')) return [3 /*break*/, 3];
                return [4 /*yield*/, ensureSectionTypeColumnExists()];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 15]);
                return [4 /*yield*/, prisma.section.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            name: name,
                            order: order || 0,
                            blockId: blockId,
                            sectionType: type || 'normal',
                        },
                    })];
            case 4:
                _b.sent();
                return [3 /*break*/, 15];
            case 5:
                err_1 = _b.sent();
                msg = String((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || '');
                if (!(msg.includes('sectionType') &&
                    (msg.includes('does not exist') || msg.includes("doesn't exist") || msg.includes('column') || msg.includes('relation')))) return [3 /*break*/, 8];
                // Colonne manquante -> on la crée puis on retente
                return [4 /*yield*/, ensureSectionTypeColumnExists()];
            case 6:
                // Colonne manquante -> on la crée puis on retente
                _b.sent();
                return [4 /*yield*/, prisma.section.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            name: name,
                            order: order || 0,
                            blockId: blockId,
                            sectionType: type || 'normal',
                        },
                    })];
            case 7:
                _b.sent();
                return [3 /*break*/, 14];
            case 8:
                if (!(msg.includes('Unknown arg') && msg.includes('sectionType'))) return [3 /*break*/, 13];
                return [4 /*yield*/, prisma.section.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            name: name,
                            order: order || 0,
                            blockId: blockId,
                        },
                    })];
            case 9:
                created = _b.sent();
                if (!(typeof type !== 'undefined')) return [3 /*break*/, 12];
                return [4 /*yield*/, ensureSectionTypeColumnExists()];
            case 10:
                _b.sent();
                return [4 /*yield*/, prisma.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["UPDATE \"Section\" SET \"sectionType\" = ", " WHERE id = ", ""], ["UPDATE \"Section\" SET \"sectionType\" = ", " WHERE id = ", ""])), type || 'normal', created.id)];
            case 11:
                _b.sent();
                _b.label = 12;
            case 12: return [3 /*break*/, 14];
            case 13: throw err_1;
            case 14: return [3 /*break*/, 15];
            case 15: return [4 /*yield*/, prisma.block.findUnique({
                    where: { id: blockId },
                    include: {
                        Section: {
                            orderBy: { order: 'asc' },
                            include: {
                                Field: {
                                    orderBy: { order: 'asc' },
                                    include: {
                                        FieldOption: {
                                            orderBy: { order: 'asc' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                })];
            case 16:
                updatedBlockWithRelations = _b.sent();
                if (!updatedBlockWithRelations) {
                    res.status(404).json({ success: false, message: "Block non trouvé après ajout de la section." });
                    return [2 /*return*/];
                }
                adaptedBlock = (0, adaptBlockStructure_1.adaptBlockStructure)(updatedBlockWithRelations);
                res.status(201).json(adaptedBlock);
                return [3 /*break*/, 18];
            case 17:
                error_5 = _b.sent();
                console.error("Erreur lors de l'ajout de la section:", error_5);
                res.status(500).json({ success: false, message: "Erreur serveur lors de l'ajout de la section." });
                return [3 /*break*/, 18];
            case 18: return [2 /*return*/];
        }
    });
}); });
// Route pour supprimer une section d'un block
router.delete('/:blockId/sections/:sectionId', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, blockId, sectionId, updatedBlockWithRelations, adaptedBlock, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.params, blockId = _a.blockId, sectionId = _a.sectionId;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                // On supprime d'abord les champs associés pour éviter les erreurs de contrainte de clé étrangère
                return [4 /*yield*/, prisma.field.deleteMany({
                        where: { sectionId: sectionId },
                    })];
            case 2:
                // On supprime d'abord les champs associés pour éviter les erreurs de contrainte de clé étrangère
                _b.sent();
                // Ensuite, on supprime la section elle-même
                return [4 /*yield*/, prisma.section.delete({
                        where: { id: sectionId },
                    })];
            case 3:
                // Ensuite, on supprime la section elle-même
                _b.sent();
                return [4 /*yield*/, prisma.block.findUnique({
                        where: { id: blockId },
                        include: {
                            Section: {
                                orderBy: { order: 'asc' },
                                include: {
                                    Field: {
                                        orderBy: { order: 'asc' },
                                        include: {
                                            FieldOption: {
                                                orderBy: { order: 'asc' }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    })];
            case 4:
                updatedBlockWithRelations = _b.sent();
                if (!updatedBlockWithRelations) {
                    res.status(404).json({ success: false, message: "Block non trouvé après suppression de la section." });
                    return [2 /*return*/];
                }
                adaptedBlock = (0, adaptBlockStructure_1.adaptBlockStructure)(updatedBlockWithRelations);
                res.json(adaptedBlock);
                return [3 /*break*/, 6];
            case 5:
                error_6 = _b.sent();
                console.error("Erreur lors de la suppression de la section:", error_6);
                res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de la section." });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Route pour réordonner les sections d'un block
router.put('/:blockId/sections/reorder', (0, requireRole_1.requireRole)(['admin', 'super_admin']), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var blockId, sections, sectionIds, sectionsInDb, updatedBlockWithRelations, adaptedBlock, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                blockId = req.params.blockId;
                sections = req.body.sections;
                console.log("[API] R\u00E9ordonnancement des sections pour le block ".concat(blockId), sections);
                if (!sections || !Array.isArray(sections)) {
                    res.status(400).json({ success: false, message: "La liste des sections est requise." });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                sectionIds = sections.map(function (s) { return s.id; });
                return [4 /*yield*/, prisma.section.findMany({
                        where: {
                            id: { in: sectionIds },
                            blockId: blockId,
                        },
                    })];
            case 2:
                sectionsInDb = _a.sent();
                if (sectionsInDb.length !== sections.length) {
                    res.status(400).json({ success: false, message: "Certaines sections n'appartiennent pas au bon formulaire ou n'existent pas." });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, prisma.$transaction(sections.map(function (section) {
                        return prisma.section.update({
                            where: {
                                id: section.id,
                                // On s'assure aussi que la section appartient bien au bloc pour la sécurité
                                blockId: blockId,
                            },
                            data: { order: section.order },
                        });
                    }))];
            case 3:
                _a.sent();
                return [4 /*yield*/, prisma.block.findUnique({
                        where: { id: blockId },
                        include: {
                            Section: {
                                orderBy: { order: 'asc' },
                                include: {
                                    Field: {
                                        orderBy: { order: 'asc' },
                                        include: {
                                            FieldOption: {
                                                orderBy: { order: 'asc' }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    })];
            case 4:
                updatedBlockWithRelations = _a.sent();
                if (!updatedBlockWithRelations) {
                    res.status(404).json({ success: false, message: "Block non trouvé après le réordonnancement des sections." });
                    return [2 /*return*/];
                }
                adaptedBlock = (0, adaptBlockStructure_1.adaptBlockStructure)(updatedBlockWithRelations);
                res.json(adaptedBlock);
                return [3 /*break*/, 6];
            case 5:
                error_7 = _a.sent();
                console.error("Erreur lors du réordonnancement des sections:", error_7);
                res.status(500).json({ success: false, message: "Erreur serveur lors du réordonnancement des sections." });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
var templateObject_1;

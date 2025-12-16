"use strict";
/**
 * 🖼️ UPLOAD D'IMAGES - SYSTÈME COMPLET
 *
 * API endpoint pour uploader des images (logos, photos projets, etc.)
 * Stockage local ou S3
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var multer_1 = __importDefault(require("multer"));
var path_1 = __importDefault(require("path"));
var promises_1 = __importDefault(require("fs/promises"));
var client_1 = require("@prisma/client");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// Configuration Multer pour l'upload
var storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) { return __awaiter(void 0, void 0, void 0, function () {
        var uploadDir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'websites');
                    // Créer le dossier s'il n'existe pas
                    return [4 /*yield*/, promises_1.default.mkdir(uploadDir, { recursive: true })];
                case 1:
                    // Créer le dossier s'il n'existe pas
                    _a.sent();
                    cb(null, uploadDir);
                    return [2 /*return*/];
            }
        });
    }); },
    filename: function (req, file, cb) {
        // Générer un nom unique : timestamp_originalname
        var uniqueName = "".concat(Date.now(), "_").concat(file.originalname.replace(/\s+/g, '_'));
        cb(null, uniqueName);
    }
});
// Filtre pour n'accepter que les images
var fileFilter = function (req, file, cb) {
    var allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG, GIF, WEBP ou SVG.'));
    }
};
var upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});
// POST - Upload une image
router.post('/upload-image', upload.single('image'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, websiteId, _b, category, fileUrl, mediaFile, error_1;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Aucune image fournie'
                        })];
                }
                _a = req.body, websiteId = _a.websiteId, _b = _a.category, category = _b === void 0 ? 'general' : _b;
                if (!websiteId) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'Website ID manquant'
                        })];
                }
                fileUrl = "/uploads/websites/".concat(req.file.filename);
                return [4 /*yield*/, prisma.webSiteMediaFile.create({
                        data: {
                            websiteId: parseInt(websiteId),
                            fileName: req.file.originalname,
                            fileType: req.file.mimetype, // ✅ CORRECTION: fileType au lieu de mimeType
                            fileUrl: fileUrl,
                            filePath: req.file.path,
                            fileSize: req.file.size,
                            category: category, // 'logo', 'project', 'service', 'general'
                            uploadedById: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) || null
                        }
                    })];
            case 1:
                mediaFile = _d.sent();
                console.log('📸 ✅ Image uploadée:', {
                    id: mediaFile.id,
                    fileName: mediaFile.fileName,
                    url: fileUrl,
                    size: "".concat((req.file.size / 1024).toFixed(2), " KB"),
                    category: category
                });
                res.json({
                    success: true,
                    message: 'Image uploadée avec succès',
                    file: {
                        id: mediaFile.id,
                        fileName: mediaFile.fileName,
                        url: fileUrl,
                        size: mediaFile.fileSize,
                        mimeType: mediaFile.fileType // ✅ CORRECTION: retourne fileType
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('❌ Erreur upload image:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'upload'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// GET - Liste des images d'un site
router.get('/images/:websiteId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var websiteId, category, where, images, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                websiteId = parseInt(req.params.websiteId);
                category = req.query.category;
                where = { websiteId: websiteId };
                if (category) {
                    where.category = category;
                }
                return [4 /*yield*/, prisma.webSiteMediaFile.findMany({
                        where: where,
                        orderBy: { uploadedAt: 'desc' }
                    })];
            case 1:
                images = _a.sent();
                res.json({
                    success: true,
                    images: images
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Erreur récupération images:', error_2);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// DELETE - Supprimer une image
router.delete('/image/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, mediaFile, err_1, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                id = parseInt(req.params.id);
                return [4 /*yield*/, prisma.webSiteMediaFile.findUnique({
                        where: { id: id }
                    })];
            case 1:
                mediaFile = _a.sent();
                if (!mediaFile) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            message: 'Image introuvable'
                        })];
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, promises_1.default.unlink(mediaFile.filePath)];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                err_1 = _a.sent();
                console.warn('Fichier déjà supprimé ou inexistant');
                return [3 /*break*/, 5];
            case 5: 
            // Supprimer de la BDD
            return [4 /*yield*/, prisma.webSiteMediaFile.delete({
                    where: { id: id }
                })];
            case 6:
                // Supprimer de la BDD
                _a.sent();
                res.json({
                    success: true,
                    message: 'Image supprimée'
                });
                return [3 /*break*/, 8];
            case 7:
                error_3 = _a.sent();
                console.error('Erreur suppression image:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur'
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.default = router;

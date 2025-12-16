"use strict";
/**
 * ROUTES GMAIL CENTRALISÉES
 *
 * Routes pour toutes les opérations Gmail utilisant l'authentification centralisée.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var formidable_1 = __importDefault(require("formidable"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var GmailController_1 = require("../controllers/GmailController");
// Middleware Formidable personnalisé pour gros fichiers (alternative robuste à Busboy)
var formidableMiddleware = function (req, res, next) {
    var _a;
    console.log('[DEBUG FORMIDABLE] ==================== DÉBUT ANALYSE REQUÊTE ====================');
    console.log('[DEBUG FORMIDABLE] 📥 Headers reçus:', JSON.stringify(req.headers, null, 2));
    console.log('[DEBUG FORMIDABLE] 🎯 Content-Type:', req.headers['content-type']);
    console.log('[DEBUG FORMIDABLE] 📊 Content-Length:', req.headers['content-length']);
    console.log('[DEBUG FORMIDABLE] 🔧 Method:', req.method);
    console.log('[DEBUG FORMIDABLE] 🌐 URL:', req.url);
    console.log('[DEBUG FORMIDABLE] ================== TRANSFERT VERS FORMIDABLE ==================');
    // Skip si pas multipart
    if (!((_a = req.headers['content-type']) === null || _a === void 0 ? void 0 : _a.includes('multipart/form-data'))) {
        console.log('[DEBUG FORMIDABLE] ⚠️ Pas de multipart/form-data - skip Formidable');
        return next();
    }
    // Configuration Formidable robuste pour gros fichiers
    var form = (0, formidable_1.default)({
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        maxFields: 50,
        maxFieldsSize: 50 * 1024 * 1024, // 50MB pour les champs
        allowEmptyFiles: false,
        multiples: true,
        keepExtensions: true,
        encoding: 'utf-8',
        uploadDir: path_1.default.join(process.cwd(), 'uploads'), // Dossier temporaire
        hashAlgorithm: false, // Pas de hash pour la performance
    });
    // Créer le dossier uploads s'il n'existe pas
    var uploadDir = path_1.default.join(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    console.log('[DEBUG FORMIDABLE] 🔧 Configuration Formidable appliquée');
    console.log('[DEBUG FORMIDABLE] 📁 Upload Directory:', uploadDir);
    form.parse(req, function (err, fields, files) {
        if (err) {
            console.error('[DEBUG FORMIDABLE] ❌ Erreur parsing:', err);
            return res.status(400).json({
                error: 'Erreur lors du parsing du formulaire',
                details: err.message
            });
        }
        console.log('[DEBUG FORMIDABLE] ✅ Parsing réussi !');
        console.log('[DEBUG FORMIDABLE] 📝 Fields:', Object.keys(fields));
        console.log('[DEBUG FORMIDABLE] 📎 Files:', Object.keys(files));
        // Transformer pour être compatible avec l'API existante
        req.body = {};
        for (var _i = 0, _a = Object.entries(fields); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            req.body[key] = Array.isArray(value) ? value[0] : value;
        }
        req.files = {};
        for (var _c = 0, _d = Object.entries(files); _c < _d.length; _c++) {
            var _e = _d[_c], key = _e[0], fileArray = _e[1];
            var fileList = Array.isArray(fileArray) ? fileArray : [fileArray];
            req.files[key] = fileList.map(function (file) { return ({
                name: file.originalFilename || file.newFilename,
                data: fs_1.default.readFileSync(file.filepath), // Lire le fichier en Buffer
                size: file.size,
                mimetype: file.mimetype,
                tempFilePath: file.filepath, // Pour nettoyage ultérieur
            }); });
        }
        console.log('[DEBUG FORMIDABLE] 🔄 Données transformées pour compatibilité');
        console.log('[DEBUG FORMIDABLE] ==================== FIN ANALYSE REQUÊTE ====================');
        // Nettoyer les fichiers temporaires après la requête
        res.on('finish', function () {
            for (var _i = 0, _a = Object.entries(files); _i < _a.length; _i++) {
                var _b = _a[_i], fileArray = _b[1];
                var fileList = Array.isArray(fileArray) ? fileArray : [fileArray];
                fileList.forEach(function (file) {
                    if (fs_1.default.existsSync(file.filepath)) {
                        fs_1.default.unlinkSync(file.filepath);
                        console.log('[DEBUG FORMIDABLE] 🗑️ Fichier temporaire supprimé:', file.filepath);
                    }
                });
            }
        });
        next();
    });
};
var router = (0, express_1.Router)();
// Routes pour les messages
router.get('/messages', GmailController_1.getMessages);
router.get('/messages/:id', GmailController_1.getMessage);
router.patch('/messages/:id', GmailController_1.modifyMessage);
router.delete('/messages/:id', GmailController_1.deleteMessage);
router.post('/messages/:id/trash', GmailController_1.trashMessage);
router.post('/messages/:id/untrash', GmailController_1.untrashMessage);
// Routes pour la corbeille
router.post('/trash/empty', GmailController_1.emptyTrash);
// Routes pour les brouillons
router.get('/drafts', GmailController_1.getDrafts);
router.post('/drafts', formidableMiddleware, GmailController_1.saveDraft); // 🔄 Ajout support pièces jointes avec Formidable
router.delete('/drafts/:id', GmailController_1.deleteDraft);
router.post('/drafts/:id/send', GmailController_1.sendDraft);
// 🆕 Route d'envoi direct avec support des pièces jointes - NOUVELLE VERSION avec Formidable (plus robuste)
router.post('/send', formidableMiddleware, function (req, res, next) {
    console.log('[ROUTE SEND] 🚀 === DÉBUT TRAITEMENT ROUTE /send (FORMIDABLE) ===');
    // Augmenter le timeout pour cette route spécifique
    req.setTimeout(300000); // 5 minutes au lieu du timeout par défaut
    res.setTimeout(300000);
    console.log('[ROUTE SEND] ⏰ Timeouts configurés à 5 minutes');
    console.log('[ROUTE SEND] 📝 req.body après Formidable:', req.body);
    console.log('[ROUTE SEND] 📎 req.files après Formidable:', req.files);
    // Vérifier si des fichiers ont été uploadés
    if (req.files) {
        console.log('[ROUTE SEND] 📎 Fichiers détectés:');
        Object.keys(req.files).forEach(function (fieldName) {
            var files = req.files[fieldName];
            if (Array.isArray(files)) {
                console.log('[ROUTE SEND] 📎', fieldName, ':', files.length, 'fichiers');
                files.forEach(function (file, index) {
                    console.log('[ROUTE SEND] 📎   -', index + 1, ':', file.name, '(', file.size, 'bytes)');
                });
            }
            else {
                console.log('[ROUTE SEND] 📎', fieldName, ':', files.name, '(', files.size, 'bytes)');
            }
        });
    }
    else {
        console.log('[ROUTE SEND] 📎 Aucun fichier détecté');
    }
    console.log('[ROUTE SEND] ✅ Formidable a traité la requête SANS ERREUR');
    console.log('[ROUTE SEND] ✅ Transfert vers sendMessage...');
    // Formidable a déjà parsé les données, on peut directement passer au contrôleur
    next();
}, GmailController_1.sendMessage);
// Routes pour les labels
router.get('/labels', GmailController_1.getLabels);
router.post('/labels', GmailController_1.createLabel);
router.patch('/labels/:id', GmailController_1.updateLabel);
router.delete('/labels/:id', GmailController_1.deleteLabel);
// Routes pour les pièces jointes
router.get('/messages/:messageId/attachments/:id', GmailController_1.getAttachment);
exports.default = router;

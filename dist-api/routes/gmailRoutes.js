"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var auth_1 = require("../middleware/auth");
var gmailController = __importStar(require("../google-auth/controllers/GmailController"));
var router = express_1.default.Router();
console.log("<<<<< [DÉMARRAGE] Le fichier 'src/routes/gmailRoutes.ts' est en cours de chargement avec le nouveau contrôleur centralisé. >>>>>");
// Appliquer la chaîne de middlewares correcte pour TOUTES les routes Gmail.
// 1. authenticateToken: Vérifie le JWT et attache un req.user partiel.
// TEMPORAIRE: On utilise seulement authenticateToken pour débloquer Gmail
router.use(auth_1.authenticateToken);
// Harmoniser l'organisation depuis le header sur req.user (fallback possible côté contrôleur)
router.use(auth_1.extractOrganization);
// Les routes ci-dessous sont maintenant protégées et auront accès à un req.user complet.
router.get('/threads', gmailController.getThreads);
router.get('/messages', gmailController.getMessages);
router.get('/messages/:id', gmailController.getMessage);
router.post('/messages/send', gmailController.sendMessage);
router.post('/messages/:id/modify', gmailController.modifyMessage); // Ajout pour la modification (étoile, etc.)
router.post('/messages/:id/trash', gmailController.trashMessage); // Ajout pour la suppression
router.post('/messages/:id/untrash', gmailController.untrashMessage); // Ajout pour restaurer
router.delete('/messages/:id', gmailController.deleteMessage); // Ajout pour la suppression définitive
router.post('/trash/empty', gmailController.emptyTrash); // Ajout pour vider la corbeille
router.get('/labels', gmailController.getLabels);
router.post('/labels', gmailController.createLabel); // Ajout pour la création de labels/dossiers
router.put('/labels/:id', gmailController.updateLabel); // Ajout pour la modification de labels/dossiers
router.delete('/labels/:id', gmailController.deleteLabel); // Ajout pour la suppression de labels/dossiers
router.get('/messages/:messageId/attachments/:attachmentId', gmailController.getAttachment); // 🔄 Ajout pour télécharger les pièces jointes
// Endpoint de santé/diagnostic Gmail
router.get('/health', gmailController.health);
exports.default = router;

import express from 'express';
import { authenticateToken, extractOrganization } from '../middleware/auth';
import * as gmailController from '../google-auth/controllers/GmailController';

const router = express.Router();

console.log("<<<<< [DÉMARRAGE] Le fichier 'src/routes/gmailRoutes.ts' est en cours de chargement avec le nouveau contrôleur centralisé. >>>>>");

// Appliquer la chaîne de middlewares correcte pour TOUTES les routes Gmail.
// 1. authenticateToken: Vérifie le JWT et attache un req.user partiel.
// TEMPORAIRE: On utilise seulement authenticateToken pour débloquer Gmail
router.use(authenticateToken);
// Harmoniser l'organisation depuis le header sur req.user (fallback possible côté contrôleur)
router.use(extractOrganization);

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

export default router;

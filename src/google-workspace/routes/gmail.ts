import { Router, type Request, type Response, type NextFunction } from 'express';
import { getThreads, getMessage, sendMessage, getLabels, createLabel } from '../controllers/gmailController.ts';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Middleware de logging pour ce routeur spécifique
router.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[GMAIL ROUTER] Requête reçue: ${req.method} ${req.originalUrl}`);
    next();
});

// Réactiver l'authentification pour toutes les routes
router.use(authenticateToken);

// Définition de la route pour récupérer les threads (conversations)
router.get('/threads', getThreads);

// Définition des autres routes Gmail
router.get('/messages/:id', getMessage);
router.post('/messages/send', sendMessage);
router.get('/labels', getLabels);
router.post('/labels', createLabel);
router.post('/labels', createLabel);

export default router;

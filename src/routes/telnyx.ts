import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { impersonationMiddleware } from '../middlewares/impersonation.js';
import telnyxApi from '../api/telnyx.js';

const router = Router();

// Appliquer l'authentification et l'usurpation à toutes les routes Telnyx
router.use(authMiddleware, impersonationMiddleware);

// Toutes les routes Telnyx
router.use('/', telnyxApi);

export default router;

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { impersonationMiddleware } from '../middlewares/impersonation.js';
import telnyxApi from '../api/telnyx.js';

const router = Router();

// IMPORTANT: Les webhooks Telnyx ne peuvent pas envoyer de token.
// On bypass donc l'auth pour /webhooks* uniquement.
router.use((req, res, next) => {
	const path = req.path || '';
	const originalUrl = req.originalUrl || '';
	const isWebhook =
		path === '/webhooks' ||
		path.startsWith('/webhooks/') ||
		originalUrl.includes('/api/telnyx/webhooks');
	if (isWebhook) {
		if (process.env.TELNYX_DEBUG_WEBHOOKS === '1') {
			// eslint-disable-next-line no-console
			console.log('🧷 [Telnyx Webhook Debug] bypass auth', { path, originalUrl });
		}
		return next();
	}

	return authMiddleware(req as any, res as any, (err?: any) => {
		if (err) return next(err);
		return impersonationMiddleware(req as any, res as any, next as any);
	});
});

// Toutes les routes Telnyx
router.use('/', telnyxApi);

export default router;

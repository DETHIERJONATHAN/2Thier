import { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { logger } from '../lib/logger';

/**
 * Configure les middlewares de sécurité pour l'application Express.
 * - Helmet pour les headers de sécurité HTTP
 * - Protection CSRF (désactivée pour API JSON)
 * - Autres mesures de sécurité
 */
export function setupSecurity(app: Application): void {
  // Utiliser Helmet pour sécuriser les en-têtes HTTP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'self'", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Désactiver pour permettre les ressources externes
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Permettre CORS
  }));

  // Protection contre le clickjacking (déjà inclus dans helmet, mais explicite)
  app.use(helmet.frameguard({ action: 'sameorigin' }));

  // Cache control pour les ressources sensibles
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Désactiver le cache pour les endpoints API
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  logger.debug('🔒 [Security] Middlewares de sécurité configurés');
}

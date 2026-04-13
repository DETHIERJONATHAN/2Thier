import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE ?? 'development';

export function initSentry(): void {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    // Echantillonnage : 10% des transactions en prod pour limiter les coûts
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    // Capturer le replay uniquement sur les sessions avec erreurs
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
    // Eviter les données personnelles dans les breadcrumbs
    beforeSend(event) {
      // Supprimer les valeurs de formulaires sensibles
      if (event.request?.data) {
        const sensitiveKeys = ['password', 'token', 'secret', 'iban', 'card'];
        const data = event.request.data as Record<string, unknown>;
        for (const key of sensitiveKeys) {
          if (key in data) data[key] = '[Filtered]';
        }
      }
      return event;
    },
  });
}

export { Sentry };

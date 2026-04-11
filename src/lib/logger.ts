/**
 * 🪵 LOGGER CENTRALISÉ
 *
 * Usage:
 *   import { logger } from '../lib/logger';
 *   logger.debug('ma valeur:', val);   // silencieux en prod
 *   logger.info('Route démarrée');     // silencieux en prod
 *   logger.warn('Attention...');       // actif en dev + prod
 *   logger.error('Erreur critique');   // toujours actif
 *
 * En production (NODE_ENV=production) : seuls warn et error s'affichent.
 * En développement : tout s'affiche.
 *
 * Pour activer les logs debug en prod : LOG_LEVEL=debug
 */

const IS_PROD   = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PROD ? 'warn' : 'debug');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL as keyof typeof LEVELS] ?? LEVELS.debug;

function shouldLog(level: keyof typeof LEVELS): boolean {
  return LEVELS[level] >= currentLevel;
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) console.log('[DEBUG]', ...args);
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) console.log('[INFO]', ...args);
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) console.error('[ERROR]', ...args);
  },
};

export default logger;

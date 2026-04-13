import { logger } from '../lib/logger';
// Utilitaires centralisés de debug (activation: localStorage.DEBUG_VERBOSE = "1")
export const isVerbose = (): boolean => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('DEBUG_VERBOSE') === '1';
  } catch {
    return false;
  }
};

// Log contrôlé
export const dlog = (...args: unknown[]) => {
  if (isVerbose()) {
    logger.debug('[VERBOSE]', ...args);
  }
};

// Warn contrôlé (toujours affiché si verbose, sinon passe à travers logger.warn standard)
export const dwarn = (...args: unknown[]) => {
  if (isVerbose()) {
    logger.warn('[VERBOSE]', ...args);
  }
};

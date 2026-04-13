import { logger } from '../lib/logger';
/**
 * 🔧 TBL Debug Utility - Système de logging conditionnel pour TBL
 * 
 * Active le debug via localStorage:
 *   localStorage.setItem('TBL_DEBUG', '1')
 * 
 * Désactive:
 *   localStorage.removeItem('TBL_DEBUG')
 * 
 * Ou via la console:
 *   window.enableTBLDebug()
 *   window.disableTBLDebug()
 */

// Cache pour éviter les appels répétés à localStorage
let debugEnabled: boolean | null = null;
let lastCheck = 0;
const CHECK_INTERVAL = 5000; // Vérifier localStorage toutes les 5 secondes max

/**
 * Vérifie si le mode debug TBL est activé
 */
export const isTBLDebugEnabled = (): boolean => {
  const now = Date.now();
  
  // Utiliser le cache si récent
  if (debugEnabled !== null && (now - lastCheck) < CHECK_INTERVAL) {
    return debugEnabled;
  }
  
  // Mettre à jour le cache
  lastCheck = now;
  try {
    debugEnabled = typeof window !== 'undefined' && localStorage.getItem('TBL_DEBUG') === '1';
  } catch {
    debugEnabled = false;
  }
  
  return debugEnabled;
};

/**
 * Log conditionnel pour TBL - N'affiche que si TBL_DEBUG=1
 */
export const tblLog = (...args: unknown[]): void => {
  if (isTBLDebugEnabled()) {
    logger.debug(...args);
  }
};

/**
 * Warn conditionnel pour TBL
 */
export const tblWarn = (...args: unknown[]): void => {
  if (isTBLDebugEnabled()) {
    logger.warn(...args);
  }
};

/**
 * Error conditionnel pour TBL (toujours affiché car critique)
 */
export const tblError = (...args: unknown[]): void => {
  logger.error(...args);
};

// Exposer les fonctions utilitaires sur window pour debug facile
if (typeof window !== 'undefined') {
  (window as any).enableTBLDebug = () => {
    localStorage.setItem('TBL_DEBUG', '1');
    debugEnabled = true;
    logger.debug('✅ TBL Debug ACTIVÉ - Les logs TBL seront affichés');
  };
  
  (window as any).disableTBLDebug = () => {
    localStorage.removeItem('TBL_DEBUG');
    debugEnabled = false;
    logger.debug('🔇 TBL Debug DÉSACTIVÉ - Les logs TBL sont masqués');
  };
  
  (window as any).isTBLDebugEnabled = isTBLDebugEnabled;
}

export default { tblLog, tblWarn, tblError, isTBLDebugEnabled };

// Utilitaires centralisés de debug (activation: localStorage.DEBUG_VERBOSE = "1")
export const isVerbose = (): boolean => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('DEBUG_VERBOSE') === '1';
  } catch {
    return false;
  }
};

// Log contrôlé
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dlog = (...args: any[]) => {
  if (isVerbose()) {
    console.log('[VERBOSE]', ...args);
  }
};

// Warn contrôlé (toujours affiché si verbose, sinon passe à travers console.warn standard)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dwarn = (...args: any[]) => {
  if (isVerbose()) {
    console.warn('[VERBOSE]', ...args);
  }
};

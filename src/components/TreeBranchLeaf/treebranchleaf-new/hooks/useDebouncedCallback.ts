import { useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * ✅ Hook de debounce STABLE - Ne réinitialise PAS le timer entre les renders
 * 
 * Utilise useRef pour stocker cb et delay, évitant la recréation du callback
 * 
 * Retourne un objet avec:
 * - Appel direct: debouncedFn(...args) pour planifier un appel debounced
 * - debouncedFn.cancel(): annuler le timer en cours (utile avant suppression)
 * - debouncedFn.flush(): exécuter immédiatement si un timer est en cours
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 400) {
  const timer = useRef<number | null>(null);
  const callbackRef = useRef(cb);
  const delayRef = useRef(delay);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  
  // ✅ Mettre à jour les refs sans recréer le callback
  useEffect(() => {
    callbackRef.current = cb;
    delayRef.current = delay;
  }, [cb, delay]);
  
  // ✅ Fonction cancel stable
  const cancel = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    pendingArgsRef.current = null;
  }, []);

  // ✅ Fonction flush stable (exécute immédiatement si timer en cours)
  const flush = useCallback(() => {
    if (timer.current && pendingArgsRef.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
      const args = pendingArgsRef.current;
      pendingArgsRef.current = null;
      callbackRef.current(...args);
    }
  }, []);

  // ✅ Callback stable qui ne change JAMAIS
  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timer.current) window.clearTimeout(timer.current);
    pendingArgsRef.current = args;
    timer.current = window.setTimeout(() => {
      pendingArgsRef.current = null;
      callbackRef.current(...args);
    }, delayRef.current);
  }, []); // ⚠️ Dépendances vides = callback stable à vie

  // ✅ Retourner un callable avec méthodes cancel/flush attachées
  return useMemo(() => {
    const fn = debouncedFn as typeof debouncedFn & { cancel: () => void; flush: () => void };
    fn.cancel = cancel;
    fn.flush = flush;
    return fn;
  }, [debouncedFn, cancel, flush]);
}

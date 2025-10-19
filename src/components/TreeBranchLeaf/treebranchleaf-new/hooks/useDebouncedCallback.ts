import { useCallback, useRef, useEffect } from 'react';

/**
 * ✅ Hook de debounce STABLE - Ne réinitialise PAS le timer entre les renders
 * 
 * Utilise useRef pour stocker cb et delay, évitant la recréation du callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 400) {
  const timer = useRef<number | null>(null);
  const callbackRef = useRef(cb);
  const delayRef = useRef(delay);
  
  // ✅ Mettre à jour les refs sans recréer le callback
  useEffect(() => {
    callbackRef.current = cb;
    delayRef.current = delay;
  }, [cb, delay]);
  
  // ✅ Callback stable qui ne change JAMAIS
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      callbackRef.current(...args);
    }, delayRef.current);
  }, []); // ⚠️ Dépendances vides = callback stable à vie
}

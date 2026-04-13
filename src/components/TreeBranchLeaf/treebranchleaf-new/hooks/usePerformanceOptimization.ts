/**
 * 🚀 useThrottledCallback - Hook pour throttler les callbacks
 * 
 * Optimise les performances en limitant la fréquence d'exécution
 * des fonctions coûteuses comme les validations de drag & drop
 */

import { useCallback, useRef } from 'react';

export function useThrottledCallback<T extends (...args: unknown[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const lastResult = useRef<ReturnType<T>>();
  
  const throttledCallback = useCallback(
    (...args: Parameters<T>): ReturnType<T> => {
      if (Date.now() - lastRun.current >= delay) {
        const result = callback(...args);
        lastResult.current = result;
        lastRun.current = Date.now();
        return result;
      }
      // Retourner le dernier résultat si on est dans la période de throttling
      return lastResult.current as ReturnType<T>;
    },
    [callback, delay]
  );

  return throttledCallback as T;
}

/**
 * 🔄 useDebounce - Hook pour débouncer les valeurs
 * 
 * Évite les mises à jour trop fréquentes d'une valeur
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { useCallback, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 400) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const timer = useRef<number | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      cb(...args);
    }, delay);
  }, [cb, delay]);
}

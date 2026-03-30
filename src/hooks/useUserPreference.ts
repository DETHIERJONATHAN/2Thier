/**
 * useUserPreference — Hook for DB-backed user preferences
 * 
 * REPLACES localStorage for all user preferences.
 * Data is persisted in the UserPreference table via /api/user-preferences.
 * 
 * Usage:
 *   const [value, setValue, { loading }] = useUserPreference<string[]>('sf_tab_order', []);
 *   // value is loaded from DB on mount
 *   // setValue(newVal) persists to DB automatically
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

type UseUserPreferenceReturn<T> = [
  T,
  (val: T) => void,
  { loading: boolean; error: string | null }
];

export function useUserPreference<T>(
  key: string,
  defaultValue: T
): UseUserPreferenceReturn<T> {
  const { api } = useAuthenticatedApi();
  const [value, setValueState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Load from DB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get(`/user-preferences/${key}`);
        if (!cancelled && resp?.value !== null && resp?.value !== undefined) {
          setValueState(resp.value as T);
        }
      } catch {
        // First load: preference doesn't exist yet, use default
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced save to DB
  const setValue = useCallback((newVal: T) => {
    setValueState(newVal);
    setError(null);

    // Debounce: wait 300ms before saving to avoid rapid writes
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.put(`/user-preferences/${keyRef.current}`, { value: newVal });
      } catch (err) {
        console.error(`[useUserPreference] Failed to save '${keyRef.current}':`, err);
        setError('Erreur de sauvegarde');
      }
    }, 300);
  }, [api]);

  return [value, setValue, { loading, error }];
}

/**
 * Bulk load all user preferences at once.
 * Useful for app initialization.
 */
export function useAllUserPreferences() {
  const { api } = useAuthenticatedApi();
  const [prefs, setPrefs] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get('/user-preferences');
        if (!cancelled && resp) {
          setPrefs(resp);
        }
      } catch {
        // No prefs yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { prefs, loading };
}

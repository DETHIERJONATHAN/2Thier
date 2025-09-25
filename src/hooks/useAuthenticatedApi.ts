/**
 * Hook pour appels API authentifiés avec :
 * - Cookies (pas de header Authorization)
 * - Contexte organisation (X-Organization-Id)
 * - Impersonation facultative
 * - Cache local TTL + déduplication des requêtes identiques
 * - Niveaux de logs configurables (localStorage apiLogLevel)
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

interface ApiOptions extends RequestInit {
  showErrors?: boolean;
  redirectOnAuth?: boolean;
  responseType?: 'json' | 'blob' | 'text';
  params?: Record<string, string | number | boolean | undefined | null>;
  noLocalCache?: boolean;
  // Ne pas logger en erreur pour ces statuts HTTP (ex: [404])
  suppressErrorLogForStatuses?: number[];
}

type CacheEntry = { time: number; data: unknown };
const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
// Déduplication des requêtes GET pendant qu'elles sont en cours de traitement (retourne directement la même promesse de données)
const inFlightData = new Map<string, Promise<unknown>>();
const ROUTE_TTLS: Record<string, number> = {
  '/api/field-types': 60_000,
  '/api/ai/status': 15_000,
  '/api/notifications': 8_000,
  // Cache statut Google pour éviter des rafales d'appels tout en restant frais
  '/api/google-auth/status': 30_000,
  // Statut auto-google (utile pour l'auto-connect); faible risque, même fenêtre de 30s
  '/auto-google-auth/status': 30_000
};
const matchTtl = (path: string) => {
  for (const k of Object.keys(ROUTE_TTLS)) if (path.startsWith(k)) return ROUTE_TTLS[k];
  return undefined;
};

export function useAuthenticatedApi() {
  // Gestion des niveaux de logs
  const getLogLevel = () =>
    ((window as unknown as Record<string, unknown>)['__API_LOG_LEVEL'] as string) ||
    localStorage.getItem('apiLogLevel') ||
    'info';
  const order = useMemo(() => ({ none: 0, error: 1, warn: 2, info: 3, debug: 4 }), []);
  const can = useCallback((lvl: keyof typeof order) => order[getLogLevel()] >= order[lvl], [order]);
  const L = useMemo(() => ({
    error: (...a: unknown[]) => can('error') && console.error('[useAuthenticatedApi]', ...a),
    warn: (...a: unknown[]) => can('warn') && console.warn('[useAuthenticatedApi]', ...a),
    info: (...a: unknown[]) => can('info') && console.log('[useAuthenticatedApi]', ...a),
    debug: (...a: unknown[]) => can('debug') && console.log('[useAuthenticatedApi]', ...a)
  }), [can]);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { logout: authLogout, currentOrganization } = useAuth();

  const logout = useCallback(() => {
    authLogout();
    navigate('/login');
  }, [authLogout, navigate]);

  const fetchApi = useCallback(
    async <T = unknown>(url: string, options: ApiOptions = {}): Promise<T> => {
      const { showErrors = true, redirectOnAuth = true, params, ...fetchOptions } = options;
      let finalUrl = url;

      // Query params GET
      if (params && Object.keys(params).length > 0) {
        const sp = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) sp.append(k, String(v));
        });
        const qs = sp.toString();
        if (qs) finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
      }

      const headers = new Headers(fetchOptions.headers || {});
      headers.delete('Authorization'); // on force cookies

      const organizationId = currentOrganization?.id;
      if (organizationId) headers.set('X-Organization-Id', organizationId);

      const impersonatedUserId = sessionStorage.getItem('impersonatedUserId');
      const impersonatedOrgId = sessionStorage.getItem('impersonatedOrgId');
      if (impersonatedUserId) headers.set('x-impersonate-user-id', impersonatedUserId);
      if (impersonatedOrgId) headers.set('x-impersonate-org-id', impersonatedOrgId);

      if (['POST', 'PUT', 'PATCH'].includes((fetchOptions.method || '').toUpperCase()) &&
          !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }

      setIsLoading(true);
      setGlobalError(null);

      const method = (fetchOptions.method || 'GET').toUpperCase();
      const ttl = method === 'GET' && !options.noLocalCache ? matchTtl(finalUrl) : undefined;
      const orgKey = currentOrganization?.id || 'no-org';
      const cacheKey = `${finalUrl}#${orgKey}`;

      // Déduplication stricte des GET en cours (même URL/org) pour éviter les doublons dus à StrictMode
      if (method === 'GET') {
        const existingDataProm = inFlightData.get(cacheKey);
        if (existingDataProm) {
          L.debug('Re-use inFlight(data)', finalUrl);
          return existingDataProm as Promise<T>;
        }
      }
      if (ttl) {
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.time < ttl) {
          L.debug('Cache HIT', finalUrl);
          return cached.data as T;
        }
        const existing = inFlight.get(cacheKey);
        if (existing) {
          L.debug('Re-use inFlight', finalUrl);
          return existing as Promise<T>;
        }
      }

      const baseUrl = 'http://localhost:4000'; // Forcer l'URL complète pour toutes les routes API
      const fullApiUrl = `${baseUrl}${finalUrl}`;

      L.info('➡️', method, finalUrl, ttl ? `(TTL ${ttl}ms)` : '');
      L.debug('Headers', Object.fromEntries(headers.entries()));
      if (params) L.debug('Query', params);
      L.debug('Full URL', fullApiUrl);

      const finalFetchOptions: RequestInit = {
        ...fetchOptions,
        headers,
        credentials: 'include',
        cache: 'no-store'
      };
      L.debug('no-store activé');

      // On encapsule tout le traitement dans une promesse afin de pouvoir la partager si une autre requête identique arrive pendant l'exécution
      const workPromise = (async () => {
        try {
          const fetchPromise: Promise<Response> = fetch(fullApiUrl, finalFetchOptions);
          if (ttl) inFlight.set(cacheKey, fetchPromise);
          const response = await fetchPromise;

        const suppressedForStatus = Array.isArray(options.suppressErrorLogForStatuses) && options.suppressErrorLogForStatuses.includes(response.status);
        if (suppressedForStatus) {
          L.debug('⬅️ (suppressed)', response.status, response.statusText, finalUrl);
        } else {
          L.info('⬅️', response.status, response.statusText, finalUrl);
        }
        L.debug('Headers réponse', Object.fromEntries(response.headers.entries()));

        if (response.status === 401) {
          if (redirectOnAuth && window.location.pathname !== '/login') logout();
          return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
        }

        // Pas de contenu
        if (response.status === 204) {
          L.debug('204 No Content', finalUrl);
          return { success: true } as unknown as T;
        }

        // Gestion blob
        if (options.responseType === 'blob') {
          const blob = await response.blob();
            if (!response.ok) throw new Error(`Erreur ${response.status}`);
          L.debug('Blob taille', blob.size);
          return blob as unknown as T;
        }

        const contentType = response.headers.get('content-type') || '';
        L.debug('Content-Type', contentType);
        let data: unknown = null;
        if (contentType.includes('application/json')) {
          data = await response.json();
          if (data && typeof data === 'object') {
            L.debug('JSON keys', Object.keys(data as Record<string, unknown>));
          }
        } else {
          const textContent = await response.text();
          // Si l'état HTTP est prévu comme « supprimé », ne pas polluer les logs avec un warn
          const suppressed = Array.isArray(options.suppressErrorLogForStatuses) && options.suppressErrorLogForStatuses.includes(response.status);
          if (!suppressed) {
            L.warn('Réponse non-JSON', { url: finalUrl, contentType, status: response.status, preview: textContent.slice(0, 100) });
          } else {
            L.debug('Réponse non-JSON (suppressed)', { url: finalUrl, contentType, status: response.status });
          }
          data = textContent;
        }

        if (!response.ok) {
          const suppress = Array.isArray(options.suppressErrorLogForStatuses) && options.suppressErrorLogForStatuses.includes(response.status);
          if (suppress) {
            // Ne pas remonter d'erreur ni polluer la console si le statut est explicitement supprimé.
            // On retourne une valeur neutre (null) et on log en debug uniquement.
            L.debug('API Suppressed Error (no-throw)', { url: finalUrl, status: response.status, statusText: response.statusText });
            // Note: Les appelants tolérants (ex: test Array.isArray(...) ou data?.success) gèrent null en fallback.
            return null as T;
          } else {
            L.error('API Error', { url: finalUrl, status: response.status, statusText: response.statusText, data });
            let messageText = `Erreur ${response.status}`;
            if (typeof data === 'object' && data !== null) {
              const payload = data as Record<string, unknown>;
              const candidate = payload.message ?? payload.error;
              if (typeof candidate === 'string') {
                messageText = candidate;
              }
            } else if (typeof data === 'string' && data.trim().length > 0) {
              messageText = data;
            }

            if (showErrors) setGlobalError(messageText);
            const apiError = new Error(messageText) as Error & { status?: number };
            apiError.status = response.status;
            return Promise.reject(apiError);
          }
        }

        if (ttl) {
          responseCache.set(cacheKey, { time: Date.now(), data });
          inFlight.delete(cacheKey);
          L.debug('Cache WRITE', finalUrl);
        }
        return data as T;
      } catch (err: unknown) {
        if (ttl) inFlight.delete(cacheKey);
        L.error('Network/parsing error', finalUrl, err);
        const message = (err as Error)?.message || 'Erreur réseau';
        if (showErrors) setGlobalError(message);
        return Promise.reject(new Error(message));
      } finally {
        setIsLoading(false);
      }
      })();

      if (method === 'GET') inFlightData.set(cacheKey, workPromise as Promise<unknown>);
      try {
        const result = await workPromise;
        return result;
      } finally {
        if (method === 'GET') inFlightData.delete(cacheKey);
      }
    },
  // L est stable car défini dans le rendu; si on souhaite stricte dépendance, on l'ajoute
  [currentOrganization, logout, L]
  );

  const api = useMemo(() => ({
    get: <T = unknown>(url: string, options: ApiOptions = {}) => fetchApi<T>(url, { ...options, method: 'GET' }),
    post: <T = unknown>(url: string, body?: unknown, options: ApiOptions = {}) => {
      const isFormData = body instanceof FormData;
      return fetchApi<T>(url, { ...options, method: 'POST', body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)) });
    },
    put: <T = unknown>(url: string, body?: unknown, options: ApiOptions = {}) => {
      const isFormData = body instanceof FormData;
      return fetchApi<T>(url, { ...options, method: 'PUT', body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)) });
    },
    patch: <T = unknown>(url: string, body?: unknown, options: ApiOptions = {}) => {
      const isFormData = body instanceof FormData;
      return fetchApi<T>(url, { ...options, method: 'PATCH', body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)) });
    },
    delete: <T = unknown>(url: string, options: ApiOptions = {}) => fetchApi<T>(url, { ...options, method: 'DELETE' })
  }), [fetchApi]);

  return { api, isLoading, globalError, ...api };
}

/**
 * Hook pour faciliter les appels à l'API avec authentification
 * Gère automatiquement les erreurs d'authentification et le contexte d'organisation
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

interface ApiOptions extends RequestInit {
  showErrors?: boolean;
  redirectOnAuth?: boolean;
  responseType?: 'json' | 'blob' | 'text';
  params?: Record<string, string | number | boolean | undefined | null>; // 🔥 NOUVEAU: Support des paramètres query
}

export function useAuthenticatedApi() {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { logout: authLogout, currentOrganization } = useAuth();
  
  const logout = useCallback(() => {
    authLogout();
    navigate('/login');
  }, [authLogout, navigate]);

  // Supprime les erreurs après 5 secondes
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => {
        setGlobalError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  // Fonction principale pour les appels API avec authentification
  // Typage générique assoupli: par défaut 'any' pour réduire les erreurs "unknown" côté consommateurs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchApi = useCallback(async <T = any>(url: string, options: ApiOptions = {}): Promise<T> => {
    const {
      showErrors = true,
      redirectOnAuth = true,
      params, // 🔥 NOUVEAU: Extraction des paramètres query
      ...fetchOptions
    } = options;
    
    const organizationId = currentOrganization?.id;
    let finalUrl = url.startsWith('/api') ? url : `/api${url}`;
    
    // 🔥 SOLUTION IMMÉDIATE: Si c'est une route de notifications, utiliser directement le backend
    const isNotificationRoute = finalUrl.includes('/api/notifications');
    const baseUrl = isNotificationRoute ? 'http://localhost:4000' : '';
    
    // 🔥 NOUVEAU: Traitement des paramètres query pour les requêtes GET
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    const headers = new Headers(fetchOptions.headers || {});

    // 🚨 CORRECTION CRITIQUE: S'assurer qu'on n'ajoute JAMAIS de header Authorization
    // Car nous utilisons des cookies pour l'authentification
    headers.delete('Authorization');

    if (organizationId) {
      headers.set('X-Organization-Id', organizationId);
    }

    // Ajout des en-têtes d'impersonnalisation
    const impersonatedUserId = sessionStorage.getItem("impersonatedUserId");
    const impersonatedOrgId = sessionStorage.getItem("impersonatedOrgId");

    if (impersonatedUserId) {
      headers.set('x-impersonate-user-id', impersonatedUserId);
    }
    if (impersonatedOrgId) {
      headers.set('x-impersonate-org-id', impersonatedOrgId);
    }

    // Ajout explicite du header Content-Type: application/json pour les requêtes POST/PUT/PATCH
    // SAUF si le body est un FormData (dans ce cas le navigateur doit gérer le Content-Type)
    if (["POST", "PUT", "PATCH"].includes((fetchOptions.method || '').toUpperCase()) && 
        !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    setIsLoading(true);
    setGlobalError(null);
    
    console.log('[useAuthenticatedApi] 📡 Début requête:', finalUrl);
    console.log('[useAuthenticatedApi] 🔧 Options:', fetchOptions);
    console.log('[useAuthenticatedApi] 🔑 Token présent: N/A (cookies utilisés)');
    console.log('[useAuthenticatedApi] � Authorization header supprimé pour éviter conflit avec cookies');
    console.log('[useAuthenticatedApi] �📋 Headers:', Object.fromEntries(headers.entries()));
    if (params) {
      console.log('[useAuthenticatedApi] 🔍 Paramètres query:', params);
    }
    
    // � SOLUTION IMMÉDIATE: URL complète pour les notifications
    const fullApiUrl = isNotificationRoute ? `${baseUrl}${finalUrl}` : finalUrl;
    console.log('[useAuthenticatedApi] 🎯 URL finale:', fullApiUrl);
    
    // �🚨 CORRECTION CRITIQUE: Désactiver le cache pour éviter les réponses identiques
    const finalFetchOptions = {
      ...fetchOptions,
      headers,
      credentials: 'include' as RequestCredentials,
      cache: 'no-store' as RequestCache, // 🔥 Forcer no-cache pour toutes les requêtes
    };
    
    console.log('[useAuthenticatedApi] 🚫 Cache désactivé pour:', finalUrl);
    
    try {
      // Utiliser l'URL relative pour passer par le proxy Vite
      const response = await fetch(fullApiUrl, finalFetchOptions);
      
      console.log('[useAuthenticatedApi] ✅ Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });
      if (response.status === 401) {
        // Déconnexion automatique si cookie invalide ou expiré
        
        // On s'assure que la redirection n'est faite qu'une seule fois
        if (redirectOnAuth && window.location.pathname !== '/login') {
          logout();
          // Enregistrer la page actuelle pour rediriger après connexion
          navigate('/login', { state: { from: window.location.pathname } });
        }
        return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
      }

      // Si la réponse est No Content (204), ne pas essayer de parser le JSON
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = {};
      if (response.status !== 204 && response.headers.get('content-length') !== '0') {
        // Vérifier si on attend un blob
        if (fetchOptions.responseType === 'blob') {
          // Pour les blobs, retourner directement la réponse
          data = await response.blob();
          console.log('[useAuthenticatedApi] 📄 Blob reçu, taille:', data.size);
          return {
            // On cast en T pour homogénéiser l'appel côté consommateur
            data: data as T,
            status: response.status,
            headers: response.headers
          } as unknown as T;
        }
        
        // Vérifier le type de contenu pour éviter les erreurs de parsing
        const contentType = response.headers.get('content-type');
        console.log('[useAuthenticatedApi] 📄 Content-Type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          // C'est du JSON, on peut le parser
          data = await response.json();
          console.log('[useAuthenticatedApi] 📋 JSON parsé:', data);
        } else {
          // Ce n'est pas du JSON, on renvoie une erreur plus explicite
          const textContent = await response.text();
          console.warn(`[useAuthenticatedApi] Réponse non-JSON reçue de ${finalUrl}:`, {
            contentType,
            statusCode: response.status,
            textPreview: textContent.substring(0, 100) + '...'
          });
          
          // Si c'est une 404, on retourne un objet d'erreur structuré
          if (response.status === 404) {
            return {
              success: false,
              error: 'Ressource non trouvée',
              status: 404
            } as unknown as T;
          }
          
          // Sinon on lance une erreur pour être consistant
          throw new Error(`Réponse invalide (${contentType || 'type inconnu'})`);
        }
      }

      // Si la réponse est No Content (204), retourner un objet vide
      if (response.status === 204) {
        console.log(`[useAuthenticatedApi] Received 204 No Content response from ${finalUrl}`);
  return { success: true } as unknown as T;
      }

      if (!response.ok) {
        // Log plus détaillé de l'erreur
        console.error(`[useAuthenticatedApi] API Error on ${finalUrl}:`, {
          status: response.status,
          statusText: response.statusText,
          responseData: data
        });
        // Utilise le message de l'API s'il existe, sinon un message générique
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorMessage = (data as any)?.message || (data as any)?.error || `Erreur ${response.status}`;
        if (showErrors) {
          setGlobalError(errorMessage);
        }
        // Créer une erreur personnalisée avec le statut HTTP préservé
        const apiError = new Error(errorMessage) as Error & { status?: number; response?: { status: number } };
        apiError.status = response.status;
        apiError.response = { status: response.status };
        return Promise.reject(apiError);
      }

      // Journalisation de la réponse réussie
      console.log('[useAuthenticatedApi] ✅ Retour de données:', data);
      console.log('[useAuthenticatedApi] 🔍 Type données:', typeof data);
      console.log('[useAuthenticatedApi] 🔍 Clés données:', Object.keys(data || {}));
  return data as T;
    } catch (error: unknown) {
      console.error(`[useAuthenticatedApi] Network or parsing error on ${finalUrl}:`, error);
      // Gérer les erreurs réseau ou de parsing JSON
      const errorMessage = (error as Error)?.message || 'Une erreur de communication est survenue.';
       if (showErrors) {
        setGlobalError(errorMessage);
      }
      return Promise.reject(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [navigate, logout, currentOrganization]);

  const api = useMemo(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: <T = any>(url: string, options: ApiOptions = {}) => fetchApi<T>(url, { ...options, method: 'GET' }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T = any>(url:string, body?: unknown, options: ApiOptions = {}) => {
      // Détecter si body est un FormData - dans ce cas, ne pas le JSON.stringify
    const isFormData = body instanceof FormData;
      return fetchApi<T>(url, { 
        ...options, 
        method: 'POST', 
    body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body))
      });
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: <T = any>(url:string, body?: unknown, options: ApiOptions = {}) => {
      const isFormData = body instanceof FormData;
      return fetchApi<T>(url, { 
        ...options, 
        method: 'PUT', 
    body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body))
      });
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T = any>(url:string, body?: unknown, options: ApiOptions = {}) => {
      const isFormData = body instanceof FormData;
      return fetchApi<T>(url, { 
        ...options, 
        method: 'PATCH', 
    body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body))
      });
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: <T = any>(url: string, options: ApiOptions = {}) => fetchApi<T>(url, { ...options, method: 'DELETE' }),
  }), [fetchApi]);

  // Exposer aussi les méthodes directement pour compatibilité avec ancien code: const { post } = useAuthenticatedApi();
  return { api, isLoading, globalError, ...api };
}

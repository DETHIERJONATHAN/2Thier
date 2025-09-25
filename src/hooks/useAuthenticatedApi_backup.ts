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
  const fetchApi = useCallback(async (url: string, options: ApiOptions = {}) => {
    const {
      showErrors = true,
      redirectOnAuth = true,
      ...fetchOptions
    } = options;
    
    const organizationId = currentOrganization?.id;
    const finalUrl = url.startsWith('/api') ? url : `/api${url}`;

    const headers = new Headers(fetchOptions.headers || {});

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
    if (["POST", "PUT", "PATCH"].includes((fetchOptions.method || '').toUpperCase())) {
      headers.set('Content-Type', 'application/json');
    }

    setIsLoading(true);
    setGlobalError(null);
    
    console.log('[useAuthenticatedApi] 📡 Début requête:', finalUrl);
    console.log('[useAuthenticatedApi] 🔧 Options:', fetchOptions);
    console.log('[useAuthenticatedApi] 🔑 Token présent: N/A (cookies utilisés)');
    console.log('[useAuthenticatedApi] 📋 Headers:', Object.fromEntries(headers.entries()));
    
    try {
      // Utiliser l'URL relative pour passer par le proxy Vite
      const response = await fetch(finalUrl, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Important: pour envoyer les cookies d'authentification
      });
      
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
      let data: unknown = {};
      if (response.status !== 204 && response.headers.get('content-length') !== '0') {
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
            };
          }
          
          // Sinon on lance une erreur pour être consistant
          throw new Error(`Réponse invalide (${contentType || 'type inconnu'})`);
        }
      }

      // Si la réponse est No Content (204), retourner un objet vide
      if (response.status === 204) {
        console.log(`[useAuthenticatedApi] Received 204 No Content response from ${finalUrl}`);
        return { success: true };
      }

      if (!response.ok) {
        // Log plus détaillé de l'erreur
        console.error(`[useAuthenticatedApi] API Error on ${finalUrl}:`, {
          status: response.status,
          statusText: response.statusText,
          responseData: data
        });
        // Utilise le message de l'API s'il existe, sinon un message générique
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
      return data;
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
    get: (url: string, options: ApiOptions = {}) => fetchApi(url, { ...options, method: 'GET' }),
    post: (url:string, body: unknown, options: ApiOptions = {}) => fetchApi(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (url:string, body: unknown, options: ApiOptions = {}) => fetchApi(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: (url:string, body: unknown, options: ApiOptions = {}) => fetchApi(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: (url: string, options: ApiOptions = {}) => fetchApi(url, { ...options, method: 'DELETE' }),
  }), [fetchApi]);

  return { api, isLoading, globalError };
}

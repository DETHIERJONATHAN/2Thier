/**
 * 🔧 Hook optimisé pour les appels API avec gestion des conflits
 * 
 * Ce hook remplace useAuthenticatedApi pour éviter les appels simultanés
 * et optimiser les performances des formules TreeBranchLeaf.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '@hooks/useAuthenticatedApi';

interface OptimizedApiHook {
  api: {
    get: (url: string) => Promise<unknown>;
    post: (url: string, data?: unknown) => Promise<unknown>;
    put: (url: string, data?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
  };
  isLoading: boolean;
  clearCache: () => void;
}

export const useOptimizedApi = (): OptimizedApiHook => {
  const baseApiHook = useAuthenticatedApi();
  const pendingCalls = useRef<Map<string, Promise<unknown>>>(new Map());
  const loadingRef = useRef<boolean>(false);
  const cache = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map());
  
  // TTL du cache : 5 secondes pour éviter les appels redondants
  const CACHE_TTL = 5000;
  
  const getCacheKey = useCallback((method: string, url: string, data?: unknown) => {
    return `${method}:${url}:${data ? JSON.stringify(data) : ''}`;
  }, []);
  
  const isValidCache = useCallback((timestamp: number) => {
    return Date.now() - timestamp < CACHE_TTL;
  }, []);
  
  const makeRequest = useCallback(async (
    method: 'get' | 'post' | 'put' | 'delete',
    url: string, 
    data?: unknown
  ): Promise<unknown> => {
    const cacheKey = getCacheKey(method, url, data);
    
    // Vérifier le cache pour les GET
    if (method === 'get') {
      const cached = cache.current.get(cacheKey);
      if (cached && isValidCache(cached.timestamp)) {
        // console.log(`📋 useOptimizedApi: Cache hit pour ${url}`); // ✨ Log réduit
        return cached.data;
      }
    }
    
    // Vérifier si un appel identique est déjà en cours
    const existingCall = pendingCalls.current.get(cacheKey);
    if (existingCall) {
      // console.log(`⏳ useOptimizedApi: Appel en cours pour ${url}, réutilisation`); // ✨ Log réduit
      return existingCall;
    }
    
    // Créer le nouvel appel
    // console.log(`🚀 useOptimizedApi: Nouvel appel ${method.toUpperCase()} ${url}`); // ✨ Log réduit
    loadingRef.current = true;
    
    const apiCall = (async () => {
      try {
        let result: unknown;
        
        switch (method) {
          case 'get':
            result = await baseApiHook.api.get(url);
            break;
          case 'post':
            result = await baseApiHook.api.post(url, data);
            break;
          case 'put':
            result = await baseApiHook.api.put(url, data);
            break;
          case 'delete':
            result = await baseApiHook.api.delete(url);
            break;
          default:
            throw new Error(`Méthode non supportée: ${method}`);
        }
        
        // Mettre en cache les GET réussis
        if (method === 'get' && result) {
          cache.current.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }
        
        // Invalider le cache pour les mutations
        if (method !== 'get') {
          // Invalider les caches GET qui pourraient être affectés
          const urlBase = url.split('?')[0];
          for (const [key] of cache.current.entries()) {
            if (key.startsWith('get:') && key.includes(urlBase)) {
              cache.current.delete(key);
            }
          }
        }
        
        // console.log(`✅ useOptimizedApi: Succès ${method.toUpperCase()} ${url}`); // ✨ Log réduit
        return result;
        
      } catch (error) {
        console.error(`❌ useOptimizedApi: Erreur ${method.toUpperCase()} ${url}`, error);
        throw error;
      } finally {
        // Nettoyer la map des appels en cours
        pendingCalls.current.delete(cacheKey);
        loadingRef.current = false;
      }
    })();
    
    // Stocker l'appel en cours
    pendingCalls.current.set(cacheKey, apiCall);
    
    return apiCall;
  }, [baseApiHook.api, getCacheKey, isValidCache]);
  
  // API stabilisée avec useMemo
  const api = useMemo(() => ({
    get: (url: string) => makeRequest('get', url),
    post: (url: string, data?: unknown) => makeRequest('post', url, data),
    put: (url: string, data?: unknown) => makeRequest('put', url, data),
    delete: (url: string) => makeRequest('delete', url)
  }), [makeRequest]);
  
  const clearCache = useCallback(() => {
    cache.current.clear();
    pendingCalls.current.clear();
    // console.log('🗑️ useOptimizedApi: Cache vidé'); // ✨ Log réduit
  }, []);
  
  return {
    api,
    isLoading: loadingRef.current,
    clearCache
  };
};

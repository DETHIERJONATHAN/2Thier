/**
 * ============================================================
 *  HOOK: useStorageProvider
 * ============================================================
 *
 *  Détecte automatiquement le provider de stockage de l'utilisateur
 *  connecté : Google Drive pour les users Google, stockage local CRM
 *  pour les users Yandex.
 *
 *  Pattern identique à useMailProvider pour la cohérence.
 *
 *  Usage :
 *    const { provider, isLoading } = useStorageProvider();
 *    // provider = "google_drive" | "local"
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

export type StorageProviderType = 'google_drive' | 'local';

export interface StorageProviderInfo {
  provider: StorageProviderType;
  hasGoogleDrive: boolean;
  mailProvider: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useStorageProvider = (): StorageProviderInfo => {
  const { api } = useAuthenticatedApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [provider, setProvider] = useState<StorageProviderType>('local');
  const [hasGoogleDrive, setHasGoogleDrive] = useState(false);
  const [mailProvider, setMailProvider] = useState('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCounter(c => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const detectProvider = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRef.current.get('/api/product-documents/provider');
        const data = response?.data || response;

        if (!cancelled) {
          setProvider((data?.provider as StorageProviderType) || 'local');
          setHasGoogleDrive(data?.hasGoogleDrive ?? false);
          setMailProvider(data?.mailProvider || 'none');
        }
      } catch (err) {
        console.error('[useStorageProvider] ❌ Erreur détection provider:', err);
        if (!cancelled) {
          setError('Impossible de détecter le provider de stockage');
          setProvider('local');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    detectProvider();

    return () => {
      cancelled = true;
    };
  }, [refreshCounter]);

  return { provider, hasGoogleDrive, mailProvider, isLoading, error, refresh };
};

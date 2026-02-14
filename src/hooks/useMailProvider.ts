/**
 * ============================================================
 *  HOOK: useMailProvider
 * ============================================================
 *
 *  Détecte automatiquement le fournisseur de messagerie de
 *  l'utilisateur connecté (Gmail ou Yandex).
 *
 *  Ce hook fait un appel unique au backend (/api/mail/provider)
 *  au montage du composant, puis met le résultat en cache.
 *
 *  Usage :
 *    const { provider, email, isLoading } = useMailProvider();
 *    // provider = "gmail" | "yandex" | "none"
 *
 *  Dépendances :
 *    - useAuthenticatedApi (hook authentifié)
 *    - Backend: GET /api/mail/provider (route mail-provider.ts)
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

/** Fournisseurs de messagerie supportés */
export type MailProviderType = 'gmail' | 'yandex' | 'none';

export interface MailProviderInfo {
  /** Le fournisseur détecté */
  provider: MailProviderType;
  /** L'adresse email associée (si disponible) */
  email: string | null;
  /** Chargement en cours */
  isLoading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Forcer un re-check du provider */
  refresh: () => void;
}

export const useMailProvider = (): MailProviderInfo => {
  const { api } = useAuthenticatedApi();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [provider, setProvider] = useState<MailProviderType>('none');
  const [email, setEmail] = useState<string | null>(null);
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
        const response = await apiRef.current.get('/api/mail/provider');
        const data = response?.data || response;

        if (!cancelled) {
          setProvider((data?.provider as MailProviderType) || 'none');
          setEmail(data?.email || null);
        }
      } catch (err) {
        console.error('[useMailProvider] ❌ Erreur détection provider:', err);
        if (!cancelled) {
          setError('Impossible de détecter le fournisseur de messagerie');
          setProvider('none');
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
  }, [refreshCounter]); // Se re-déclenche quand on appelle refresh()

  return { provider, email, isLoading, error, refresh };
};

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import type { ChantierStatus } from '../types/chantier';
import { logger } from '../lib/logger';

/**
 * Hook pour récupérer et gérer les statuts de chantiers
 */
export function useChantierStatuses() {
  const [statuses, setStatuses] = useState<ChantierStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/api/chantier-statuses') as { success: boolean; data: ChantierStatus[] };
      setStatuses(response.data || []);
    } catch (err) {
      logger.error('[useChantierStatuses] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setStatuses([]);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Seed default statuses if none exist
  const seedDefaults = useCallback(async () => {
    try {
      await api.post('/api/chantier-statuses/seed', {});
      await fetchStatuses();
    } catch (err) {
      logger.error('[useChantierStatuses] Erreur seed:', err);
    }
  }, [api, fetchStatuses]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Auto-seed if no statuses
  useEffect(() => {
    if (!isLoading && statuses.length === 0 && !error) {
      seedDefaults();
    }
  }, [isLoading, statuses.length, error, seedDefaults]);

  return {
    statuses,
    isLoading,
    error,
    refetch: fetchStatuses,
  };
}

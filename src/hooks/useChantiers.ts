import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import type { Chantier } from '../types/chantier';

/**
 * Hook pour récupérer et gérer les chantiers
 */
export function useChantiers(filters?: {
  statusId?: string;
  productValue?: string;
  leadId?: string;
  responsableId?: string;
}) {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

  const fetchChantiers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.statusId) params.set('statusId', filters.statusId);
      if (filters?.productValue) params.set('productValue', filters.productValue);
      if (filters?.leadId) params.set('leadId', filters.leadId);
      if (filters?.responsableId) params.set('responsableId', filters.responsableId);

      const queryString = params.toString();
      const url = queryString ? `/api/chantiers?${queryString}` : '/api/chantiers';

      const response = await api.get(url) as { success: boolean; data: Chantier[] };
      setChantiers(response.data || []);
    } catch (err) {
      console.error('[useChantiers] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setChantiers([]);
    } finally {
      setIsLoading(false);
    }
  }, [api, filters?.statusId, filters?.productValue, filters?.leadId, filters?.responsableId]);

  useEffect(() => {
    fetchChantiers();
  }, [fetchChantiers]);

  const updateChantierStatus = useCallback(async (chantierId: string, statusId: string, force?: boolean) => {
    try {
      await api.put(`/api/chantiers/${chantierId}/status`, { statusId, force });
      // Optimistic update
      setChantiers(prev =>
        prev.map(c => c.id === chantierId ? { ...c, statusId } : c)
      );
    } catch (err) {
      console.error('[useChantiers] Erreur changement statut:', err);
      throw err;
    }
  }, [api]);

  return {
    chantiers,
    isLoading,
    error,
    refetch: fetchChantiers,
    updateChantierStatus,
  };
}

/**
 * Hook pour récupérer les chantiers d'un lead spécifique
 */
export function useChantiersByLead(leadId: string | undefined) {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

  const fetchChantiers = useCallback(async () => {
    if (!leadId) {
      setChantiers([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/api/chantiers/by-lead/${leadId}`) as { success: boolean; data: Chantier[] };
      setChantiers(response.data || []);
    } catch (err) {
      console.error('[useChantiersByLead] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setChantiers([]);
    } finally {
      setIsLoading(false);
    }
  }, [api, leadId]);

  useEffect(() => {
    fetchChantiers();
  }, [fetchChantiers]);

  return {
    chantiers,
    isLoading,
    error,
    refetch: fetchChantiers,
  };
}

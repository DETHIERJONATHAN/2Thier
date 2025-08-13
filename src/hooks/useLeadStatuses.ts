import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { LeadStatus } from '../types/leads';

// Interface pour la compatibilité avec l'ancien format
export interface LeadStatusWithLegacy extends LeadStatus {
  label: string;
  value: string;
}

/**
 * Hook pour récupérer et gérer les statuts de leads depuis la base de données
 */
export function useLeadStatuses() {
  const [leadStatuses, setLeadStatuses] = useState<LeadStatusWithLegacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stabiliser l'API selon les instructions du projet
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

  const fetchLeadStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statuses = await api.get('/api/settings/lead-statuses') as LeadStatus[];
      
      // Convertir le format de la base de données vers le format attendu par les composants
      const formattedStatuses: LeadStatusWithLegacy[] = statuses.map((status) => ({
        ...status,
        label: status.name, // Pour la compatibilité avec l'ancien format
        value: status.name.toLowerCase().replace(/\s+/g, '_'), // Générer une valeur pour la compatibilité
      }));

      setLeadStatuses(formattedStatuses);
    } catch (err) {
      console.error('Erreur lors de la récupération des statuts de leads:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      // Fallback vers des statuts par défaut en cas d'erreur
      setLeadStatuses([
        { 
          id: '1', 
          name: 'Nouveau', 
          label: 'Nouveau', 
          value: 'nouveau', 
          color: '#52c41a', 
          order: 0, 
          isDefault: true,
          organizationId: '',
          createdAt: '',
          updatedAt: ''
        },
        { 
          id: '2', 
          name: 'En cours', 
          label: 'En cours', 
          value: 'en_cours', 
          color: '#1890ff', 
          order: 1, 
          isDefault: false,
          organizationId: '',
          createdAt: '',
          updatedAt: ''
        },
        { 
          id: '3', 
          name: 'Fermé', 
          label: 'Fermé', 
          value: 'ferme', 
          color: '#f5222d', 
          order: 2, 
          isDefault: false,
          organizationId: '',
          createdAt: '',
          updatedAt: ''
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchLeadStatuses();
  }, [fetchLeadStatuses]);

  return {
    leadStatuses,
    isLoading,
    error,
    refreshStatuses: fetchLeadStatuses
  };
}

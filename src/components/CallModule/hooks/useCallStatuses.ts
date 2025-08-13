/**
 * 🎯 Hook pour récupérer les statuts d'appels configurés
 * Connecte le CallModule aux paramètres de statuts - 100% dynamique
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

export interface CallStatus {
  id?: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  mappedToLeadStatus?: string;
  value?: string; // Pour la compatibilité avec le Select
  label?: string; // Pour l'affichage dans le Select
}

export const useCallStatuses = () => {
  const { api } = useAuthenticatedApi();
  const [callStatuses, setCallStatuses] = useState<CallStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // � Récupération des statuts depuis l'API uniquement
  const fetchCallStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupération depuis les paramètres UNIQUEMENT
      const response = await api.get('/api/settings/call-statuses');
      
      if (response && Array.isArray(response)) {
        // Transformer les statuts pour compatibilité avec le Select
        const transformedStatuses = response.map((status: CallStatus, index: number) => ({
          ...status,
          value: status.id || `status_${index}`,
          label: `${status.icon || '📞'} ${status.name}`
        }));
        
        setCallStatuses(transformedStatuses);
        console.log(`✅ ${transformedStatuses.length} statuts d'appels chargés depuis les paramètres`);
      } else {
        // Aucun statut trouvé
        console.warn('⚠️ Aucun statut d\'appel configuré dans les paramètres');
        setCallStatuses([]);
        setError('Aucun statut d\'appel configuré. Veuillez configurer les statuts dans les paramètres.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statuts d\'appels:', error);
      setCallStatuses([]);
      setError('Impossible de charger les statuts d\'appels. Vérifiez votre connexion et les paramètres.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  // 🎯 Récupérer un statut par sa valeur
  const getStatusByValue = useCallback((value: string): CallStatus | undefined => {
    return callStatuses.find(status => status.value === value);
  }, [callStatuses]);

  // 🎯 Récupérer le statut de lead mappé
  const getMappedLeadStatus = useCallback((callStatusValue: string): string => {
    const status = getStatusByValue(callStatusValue);
    return status?.mappedToLeadStatus || 'nouveau';
  }, [getStatusByValue]);

  // 🔧 Transformer en format pour Select Antd
  const getSelectOptions = useCallback(() => {
    return callStatuses.map(status => ({
      value: status.value!,
      label: status.label!,
      color: status.color,
      icon: status.icon
    }));
  }, [callStatuses]);

  // 🎬 Chargement initial
  useEffect(() => {
    fetchCallStatuses();
  }, [fetchCallStatuses]);

  return {
    callStatuses,
    loading,
    error,
    refetch: fetchCallStatuses,
    getStatusByValue,
    getMappedLeadStatus,
    getSelectOptions,
    hasStatuses: callStatuses.length > 0
  };
};

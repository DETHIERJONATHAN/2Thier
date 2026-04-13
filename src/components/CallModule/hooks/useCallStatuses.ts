/**
 * 🎯 Hook pour récupérer les statuts d'appels configurés
 * Connecte le CallModule aux paramètres de statuts - 100% dynamique
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { logger } from '../../../lib/logger';

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
    logger.debug('🔍 [DEBUG] useCallStatuses - fetchCallStatuses called');
    try {
      setLoading(true);
      setError(null);
      
      // Récupération depuis les paramètres UNIQUEMENT
      const response = await api.get('/api/settings/call-statuses');
      logger.debug('🔍 [DEBUG] useCallStatuses - API response:', response);
      
      if (response && Array.isArray(response)) {
        // Transformer les statuts pour compatibilité avec le Select
        const transformedStatuses = response.map((status: CallStatus, index: number) => ({
          ...status,
          value: status.id || `status_${index}`,
          label: `${status.icon || '📞'} ${status.name}`
        }));
        
        setCallStatuses(transformedStatuses);
        logger.debug(`✅ ${transformedStatuses.length} statuts d'appels chargés depuis les paramètres`, transformedStatuses);
      } else {
        // Aucun statut trouvé
        logger.warn('⚠️ Aucun statut d\'appel configuré dans les paramètres');
        setCallStatuses([]);
        setError('Aucun statut d\'appel configuré. Veuillez configurer les statuts dans les paramètres.');
      }
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des statuts d\'appels:', error);
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

  // 🎯 Récupérer un statut par son NOM (important pour les comparaisons)
  const getStatusByName = useCallback((name: string): CallStatus | undefined => {
    return callStatuses.find(status => status.name === name);
  }, [callStatuses]);

  // 🎯 Vérifier si un status est de type RDV (pour afficher le calendrier)
  const isRDVStatus = useCallback((statusValue: string): boolean => {
    const status = getStatusByValue(statusValue);
    return status?.name?.includes('Rendez-vous') || status?.name?.includes('RDV') || false;
  }, [getStatusByValue]);

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

  // 🎬 Chargement initial - NE SE DÉCLENCHE QU'UNE FOIS
  useEffect(() => {
    logger.debug('🔍 [DEBUG] useCallStatuses - useEffect mount, fetching statuses');
    fetchCallStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dépendances vides volontairement pour ne charger qu'une fois

  return {
    callStatuses,
    loading,
    error,
    refetch: fetchCallStatuses,
    getStatusByValue,
    getStatusByName,
    isRDVStatus,
    getMappedLeadStatus,
    getSelectOptions,
    hasStatuses: callStatuses.length > 0
  };
};

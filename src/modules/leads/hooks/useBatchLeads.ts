/**
 * 🚀 Hook pour les opérations batch sur les leads
 * 
 * Permet d'effectuer des actions en masse sur plusieurs leads en UNE SEULE requête API
 * au lieu de N requêtes individuelles.
 * 
 * Exemples d'utilisation:
 * - Changer le statut de 50 leads sélectionnés → 1 requête au lieu de 50
 * - Assigner 30 leads à un commercial → 1 requête au lieu de 30
 * - Supprimer 20 leads → 1 requête au lieu de 20
 */

import { useCallback, useState } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { message } from 'antd';

interface BatchResult {
  success: boolean;
  count: number;
  message: string;
}

interface UseBatchLeadsReturn {
  loading: boolean;
  updateStatus: (leadIds: string[], statusId: string) => Promise<BatchResult | null>;
  assignTo: (leadIds: string[], assignedToId: string | null) => Promise<BatchResult | null>;
  deleteMany: (leadIds: string[]) => Promise<BatchResult | null>;
}

export const useBatchLeads = (): UseBatchLeadsReturn => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);

  /**
   * Mettre à jour le statut de plusieurs leads
   * 
   * @param leadIds - Liste des IDs de leads à modifier
   * @param statusId - ID du nouveau statut
   */
  const updateStatus = useCallback(async (leadIds: string[], statusId: string): Promise<BatchResult | null> => {
    if (!leadIds.length || !statusId) {
      message.warning('Aucun lead sélectionné ou statut manquant');
      return null;
    }

    setLoading(true);
    try {
      const result = await api.patch('/api/batch/leads/status', {
        leadIds,
        statusId
      });
      
      message.success(result.message || `${result.count} lead(s) mis à jour`);
      return result;
    } catch (error: any) {
      console.error('[BatchLeads] ❌ Erreur updateStatus:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Assigner plusieurs leads à un utilisateur
   * 
   * @param leadIds - Liste des IDs de leads à assigner
   * @param assignedToId - ID de l'utilisateur (ou null pour désassigner)
   */
  const assignTo = useCallback(async (leadIds: string[], assignedToId: string | null): Promise<BatchResult | null> => {
    if (!leadIds.length) {
      message.warning('Aucun lead sélectionné');
      return null;
    }

    setLoading(true);
    try {
      const result = await api.patch('/api/batch/leads/assign', {
        leadIds,
        assignedToId
      });
      
      message.success(result.message || `${result.count} lead(s) assigné(s)`);
      return result;
    } catch (error: any) {
      console.error('[BatchLeads] ❌ Erreur assignTo:', error);
      message.error(error.response?.data?.error || 'Erreur lors de l\'assignation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Supprimer plusieurs leads
   * 
   * @param leadIds - Liste des IDs de leads à supprimer
   */
  const deleteMany = useCallback(async (leadIds: string[]): Promise<BatchResult | null> => {
    if (!leadIds.length) {
      message.warning('Aucun lead sélectionné');
      return null;
    }

    setLoading(true);
    try {
      const result = await api.delete('/api/batch/leads', {
        data: { leadIds }
      });
      
      message.success(result.message || `${result.count} lead(s) supprimé(s)`);
      return result;
    } catch (error: any) {
      console.error('[BatchLeads] ❌ Erreur deleteMany:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la suppression');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return {
    loading,
    updateStatus,
    assignTo,
    deleteMany
  };
};

export default useBatchLeads;

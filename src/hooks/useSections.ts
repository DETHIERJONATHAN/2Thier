import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { message } from 'antd';
import { ModuleSectionData, ModuleSectionResponse, defaultSections } from '../api/sections';

export const useSections = () => {
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [sections, setSections] = useState<ModuleSectionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialiser les sections par défaut
  const initializeDefaultSections = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      const sectionsToCreate = defaultSections.map(section => ({
        ...section,
        organizationId: currentOrganization.id
      }));

      const response = await api.post('/api/sections/bulk', {
        sections: sectionsToCreate
      });

      if (response) {
        setSections(response);
        message.success('Sections initialisées avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des sections:', error);
      message.error('Erreur lors de l\'initialisation des sections');
    }
  }, [api, currentOrganization?.id]);

  // Charger les sections
  const fetchSections = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      const response = await api.get(`/api/sections?organizationId=${currentOrganization.id}`);
      
      if (response && response.length > 0) {
        setSections(response);
      } else {
        // Créer les sections par défaut si elles n'existent pas
        await initializeDefaultSections();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sections:', error);
      message.error('Erreur lors du chargement des sections');
    } finally {
      setLoading(false);
    }
  }, [api, currentOrganization?.id, initializeDefaultSections]);

  // Sauvegarder une section (créer ou modifier)
  const saveSection = useCallback(async (sectionData: ModuleSectionData) => {
    if (!currentOrganization?.id) return;

    try {
      const dataWithOrg = {
        ...sectionData,
        organizationId: currentOrganization.id
      };

      let response;
      if (sectionData.id) {
        // Modifier
        response = await api.put(`/api/sections/${sectionData.id}`, dataWithOrg);
        setSections(prev => prev.map(s => s.id === sectionData.id ? response : s));
        message.success('Section modifiée avec succès');
      } else {
        // Créer
        response = await api.post('/api/sections', dataWithOrg);
        setSections(prev => [...prev, response]);
        message.success('Section créée avec succès');
      }

      return response;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la section:', error);
      message.error('Erreur lors de la sauvegarde');
      throw error;
    }
  }, [api, currentOrganization?.id]);

  // Supprimer une section
  const deleteSection = useCallback(async (sectionId: string) => {
    try {
      await api.delete(`/api/sections/${sectionId}`);
      setSections(prev => prev.filter(s => s.id !== sectionId));
      message.success('Section supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression de la section:', error);
      message.error('Erreur lors de la suppression');
      throw error;
    }
  }, [api]);

  // Réorganiser les sections
  const reorderSections = useCallback(async (newOrder: { id: string; order: number }[]) => {
    try {
      await api.put('/api/sections/reorder', { sections: newOrder });
      
      // Mettre à jour l'état local
      setSections(prev => {
        const updated = [...prev];
        newOrder.forEach(({ id, order }) => {
          const index = updated.findIndex(s => s.id === id);
          if (index !== -1) {
            updated[index] = { ...updated[index], order };
          }
        });
        return updated.sort((a, b) => a.order - b.order);
      });

      message.success('Ordre des sections sauvegardé');
    } catch (error) {
      console.error('Erreur lors de la réorganisation:', error);
      message.error('Erreur lors de la sauvegarde de l\'ordre');
      throw error;
    }
  }, [api]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return {
    sections: sections.sort((a, b) => a.order - b.order),
    loading,
    saveSection,
    deleteSection,
    reorderSections,
    refetchSections: fetchSections
  };
};

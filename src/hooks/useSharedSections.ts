import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { logger } from '../lib/logger';

export interface SharedSection {
  id: string;
  title: string;
  description: string;
  icon?: string; // Changé de iconName à icon pour correspondre à l'API
  iconColor?: string;
  order: number;
  active: boolean;
}

export const useSharedSections = () => {
  const { currentOrganization } = useAuth();
  const { api } = useAuthenticatedApi();
  const [sections, setSections] = useState<SharedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚀 Charger les catégories DYNAMIQUEMENT depuis la BDD Prisma
  const loadSections = useCallback(async () => {
    if (!api || !currentOrganization?.id) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer les catégories dynamiques depuis Prisma avec organizationId
      const navigationData = await api.get('/api/module-navigation', {
        params: { organizationId: currentOrganization.id }
      });
      
  // L'API retourne directement un array de catégories, pas sous une propriété 'categories'
      if (navigationData && Array.isArray(navigationData) && navigationData.length > 0) {
        const dynamicSections: SharedSection[] = navigationData.map((section: {
          id?: string;
          title?: string;
          description?: string;
          icon?: string;
          iconColor?: string;
          order?: number;
          modules?: unknown[];
        }, index: number) => ({
          id: section.id || `section_${index}`,
          title: section.title || 'Sans catégorie',
          description: section.description || `Catégorie ${section.title || 'divers'}`,
          icon: section.icon || 'AppstoreOutlined',
          iconColor: section.iconColor || '#1890ff',
          order: section.order || index + 1,
          active: true
        }));

        setSections(dynamicSections);
      } else {
        throw new Error('Aucune catégorie trouvée dans la réponse API ou réponse vide');
      }
    } catch (error) {
      logger.error('❌ [useSharedSections] Erreur lors du chargement:', error);
      setError('Impossible de charger les catégories depuis la base de données');
      
      // Fallback: catégories vides plutôt que du code en dur
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [api, currentOrganization?.id]);

  // 🔄 Mettre à jour une catégorie dans la BDD (au lieu de localStorage)
  const updateSectionName = useCallback(async (sectionId: string, newTitle: string) => {
    if (!api || !currentOrganization?.id) return;
    
    try {
      // Mettre à jour via l'API avec organizationId
      await api.put(`/api/admin-modules/update-category`, {
        oldCategory: sectionId,
        newCategory: newTitle,
        organizationId: currentOrganization.id
      });
      
      // Recharger les sections pour refléter les changements
      await loadSections();
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour de la catégorie:', error);
    }
  }, [api, currentOrganization?.id, loadSections]);

  // 🔄 Réorganiser les sections (pour l'instant, on garde l'ordre Prisma)
  const reorderSections = useCallback((newOrder: SharedSection[]) => {
    // Pour l'instant, on met à jour localement
    // TODO: Implémenter l'ordre dans Prisma si nécessaire
    const reordered = newOrder.map((section, index) => ({
      ...section,
      order: index + 1
    }));
    setSections(reordered);
  }, []);

  // ➕ Ajouter une nouvelle catégorie dans la BDD
  const addSection = useCallback(async (title: string) => {
    if (!api || !currentOrganization?.id) return;
    
    try {
      // Créer un module temporaire avec la nouvelle catégorie
      await api.post('/api/admin-modules', {
        name: `Catégorie ${title}`,
        category: title.trim(),
        categoryIcon: 'AppstoreOutlined',
        categoryColor: '#13c2c2',
        active: true,
        organizationId: currentOrganization.id,
        temporary: true // Flag pour indiquer que c'est juste pour créer la catégorie
      });
      
      // Recharger les sections
      await loadSections();
    } catch (error) {
      logger.error('❌ Erreur lors de l\'ajout de la catégorie:', error);
    }
  }, [api, currentOrganization?.id, loadSections]);

  // ✅ Activer/désactiver une section (toggle modules de cette catégorie)
  const toggleSectionActive = useCallback(async (sectionId: string) => {
    if (!api || !currentOrganization?.id) return;
    
    try {
      // Toggle tous les modules de cette catégorie
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        await api.put('/api/admin-modules/toggle-category', {
          category: section.title,
          organizationId: currentOrganization.id,
          active: !section.active
        });
        
        // Recharger les sections
        await loadSections();
      }
    } catch (error) {
      logger.error('❌ Erreur lors du toggle de la catégorie:', error);
    }
  }, [api, currentOrganization?.id, sections, loadSections]);

  // 🗑️ Supprimer une section (supprimer tous les modules de cette catégorie)
  const deleteSection = useCallback(async (sectionId: string) => {
    if (!api || !currentOrganization?.id) return;
    
    try {
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        await api.delete(`/api/admin-modules/delete-category`, {
          data: { 
            category: section.title,
            organizationId: currentOrganization.id
          }
        });
        
        // Recharger les sections
        await loadSections();
      }
    } catch (error) {
      logger.error('❌ Erreur lors de la suppression de la catégorie:', error);
    }
  }, [api, currentOrganization?.id, sections, loadSections]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  return {
    sections: sections.sort((a, b) => a.order - b.order),
    updateSectionName,
    reorderSections,
    addSection,
    deleteSection,
    toggleSectionActive,
    refetchSections: loadSections,
    loading,
    error
  };
};

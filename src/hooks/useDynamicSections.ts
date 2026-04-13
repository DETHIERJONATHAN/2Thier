import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { message } from 'antd';
import { logger } from '../lib/logger';

export interface DynamicSection {
  id: string;
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
  order: number;
  active: boolean;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ✅ Interface pour les Categories Prisma
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon: string;
  iconColor: string;
  order: number;
  active: boolean;
  organizationId?: string;
  superAdminOnly: boolean;
  allowedRoles?: unknown;
  requiredPermissions?: unknown;
  createdAt: string;
  updatedAt: string;
}

// Sections par défaut à créer si elles n'existent pas
const defaultDynamicSections: Omit<DynamicSection, 'organizationId' | 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'admin',
    title: 'Administration',
    description: 'Modules, Rôles, Utilisateurs, Permissions, Synthèse des droits, Organisations, Telnyx',
    iconName: 'UserSwitchOutlined',
    iconColor: '#f5222d',
    order: 1,
    active: true
  },
  {
    id: 'forms',
    title: 'Formulaires',
    description: 'Bloc',
    iconName: 'FormOutlined',
    iconColor: '#52c41a',
    order: 2,
    active: true
  },
  {
    id: 'technical',
    title: 'Outils Techniques',
    description: 'Gestion des Tableaux',
    iconName: 'ToolOutlined',
    iconColor: '#fa8c16',
    order: 3,
    active: true
  },
  {
    id: 'googleWorkspace',
    title: 'Google Workspace',
    description: 'Google Gmail, Google Drive, Google Meet, Google Docs, Google Sheets, Google Voice, Google Agenda',
    iconName: 'GoogleOutlined',
    iconColor: '#4285f4',
    order: 4,
    active: true
  },
  {
    id: 'devis1minuteAdmin',
    title: 'Devis1Minute - Admin',
    description: 'Campagnes, Analytics, Formulaires Publics, Landing Pages',
    iconName: 'RocketOutlined',
    iconColor: '#722ed1',
    order: 5,
    active: true
  },
  {
    id: 'devis1minute',
    title: 'Devis1Minute',
    description: 'Marketplace, Portail Partenaire, Mes Leads, Facturation',
    iconName: 'RocketOutlined',
    iconColor: '#ff7a00',
    order: 6,
    active: true
  },
  {
    id: 'other',
    title: 'Autres Modules',
    description: 'Dashboard, Techniques, Clients, Agenda, Devis, Facturation, Leads, Mail, Profile, Settings',
    iconName: 'AppstoreOutlined',
    iconColor: '#13c2c2',
    order: 7,
    active: true
  }
];

export const useDynamicSections = () => {
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [sections, setSections] = useState<DynamicSection[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Initialiser les Categories par défaut dans Prisma
  const initializeDefaultCategories = useCallback(async () => {
    if (!currentOrganization?.id || !api) return;

    try {
      const categoriesToCreate = defaultDynamicSections.map(section => ({
        name: section.title,
        description: section.description,
        icon: section.iconName,
        iconColor: section.iconColor,
        order: section.order,
        active: section.active,
        organizationId: currentOrganization.id,
        superAdminOnly: false,
        allowedRoles: null,
        requiredPermissions: null
      }));

      logger.debug(`� [useDynamicSections] Création de ${categoriesToCreate.length} Categories par défaut...`);
      const response = await api.post('/admin-modules/categories/bulk', {
        categories: categoriesToCreate
      });

      if (response?.success && Array.isArray(response.data)) {
        logger.debug(`✅ [useDynamicSections] ${response.data.length} Categories créées avec succès`);

        // ✅ Convertir les Categories vers DynamicSection
        const sectionsFromCategories: DynamicSection[] = response.data.map((category: Category) => ({
          id: category.id,
          title: category.name,
          description: category.description || '',
          iconName: category.icon,
          iconColor: category.iconColor,
          order: category.order,
          active: category.active,
          organizationId: category.organizationId,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }));

        setSections(sectionsFromCategories.sort((a, b) => a.order - b.order));
        message.success('Categories initialisées avec succès');
      }
    } catch (error) {
      logger.error('❌ [useDynamicSections] Erreur lors de l\'initialisation des Categories:', error);
      setError('Erreur lors de l\'initialisation des categories');
    }
  }, [currentOrganization?.id, api]);

  // ✅ Charger les Categories depuis Prisma au lieu des sections 
  const loadSections = useCallback(async () => {
    if (!currentOrganization?.id || !api) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.debug('� [useDynamicSections] Chargement des Categories depuis Prisma...');
      
      // ✅ NOUVEAU : Utiliser les routes Categories au lieu de /api/sections
      const response = await api.get(`/admin-modules/categories?organizationId=${currentOrganization.id}`);
      
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        logger.debug(`✅ [useDynamicSections] ${response.data.length} Categories chargées depuis Prisma`);
        
        // ✅ Convertir les Categories Prisma vers le format DynamicSection
        const sectionsFromCategories: DynamicSection[] = response.data.map((category: Category) => ({
          id: category.id,
          title: category.name,
          description: category.description || '',
          iconName: category.icon,
          iconColor: category.iconColor,
          order: category.order,
          active: category.active,
          organizationId: category.organizationId,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }));
        
        setSections(sectionsFromCategories.sort((a, b) => a.order - b.order));
      } else {
        logger.debug('� [useDynamicSections] Aucune Category trouvée, création des categories par défaut...');
        await initializeDefaultCategories();
      }
    } catch (error) {
      logger.error('❌ [useDynamicSections] Erreur lors du chargement des Categories:', error);
      setError('Erreur lors du chargement des categories');
      
      // Fallback : utiliser les sections par défaut
      logger.debug('⚠️ [useDynamicSections] Utilisation des sections par défaut (fallback)');
      setSections(defaultDynamicSections as DynamicSection[]);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, api, initializeDefaultCategories]);

  // Charger les modules depuis la base de données
  const loadModules = useCallback(async () => {
    if (!currentOrganization?.id || !api) {
      logger.warn('Pas d\'organisation courante, impossible de charger les modules');
      return;
    }

    try {
      logger.debug('📦 [useDynamicSections] Chargement modules pour org:', currentOrganization.id);
      const modulesResponse = await api.get(`/api/modules?organizationId=${currentOrganization.id}`);

      if (modulesResponse.success && modulesResponse.data) {
        logger.debug('📦 [useDynamicSections] Modules récupérés:', modulesResponse.data.length);
        setModules(modulesResponse.data);
      }
    } catch (error) {
      logger.error('❌ [useDynamicSections] Erreur lors du chargement des modules:', error);
      setError('Erreur lors du chargement des modules');
    }
  }, [currentOrganization?.id, api]);

  // ✅ Activer/désactiver une Category
  const toggleSectionActive = useCallback(async (sectionId: string) => {
    if (!api) return;

    try {
      logger.debug(`🔄 [useDynamicSections] Toggle Category ${sectionId}...`);
      const section = sections.find(s => s.id === sectionId);
      if (!section) {
        logger.error(`❌ [useDynamicSections] Category ${sectionId} introuvable`);
        return;
      }

      const newActiveStatus = !section.active;
      const response = await api.patch(`/admin-modules/categories/${sectionId}`, {
        active: newActiveStatus
      });

      if (response?.success) {
        logger.debug(`✅ [useDynamicSections] Category ${sectionId} ${newActiveStatus ? 'activée' : 'désactivée'}`);
        setSections(prev => prev.map(s => 
          s.id === sectionId 
            ? { ...s, active: newActiveStatus }
            : s
        ));
        message.success(`Category ${newActiveStatus ? 'activée' : 'désactivée'} avec succès`);
      }
    } catch (error) {
      logger.error('❌ [useDynamicSections] Erreur lors du toggle Category:', error);
      message.error('Erreur lors de la mise à jour de la category');
    }
  }, [sections, api]);

  // ✅ Supprimer une Category
  const deleteSection = useCallback(async (sectionId: string) => {
    if (!api) return;

    try {
      logger.debug(`🗑️ [useDynamicSections] Suppression Category ${sectionId}...`);
      const response = await api.delete(`/admin-modules/categories/${sectionId}`);
      
      if (response?.success) {
        logger.debug(`✅ [useDynamicSections] Category ${sectionId} supprimée`);
        setSections(prev => prev.filter(s => s.id !== sectionId));
        message.success('Category supprimée avec succès');
      }
    } catch (error) {
      logger.error('❌ [useDynamicSections] Erreur lors de la suppression Category:', error);
      message.error('Erreur lors de la suppression de la category');
    }
  }, [api]);

  // Écouter les événements de synchronisation
  useEffect(() => {
    const handleSyncEvent = () => {
      logger.debug('🔄 [useDynamicSections] Synchronisation demandée, rechargement...');
      loadSections();
    };

    // Écouter les événements personnalisés de synchronisation
    window.addEventListener('sectionsUpdated', handleSyncEvent);
    window.addEventListener('modulesUpdated', handleSyncEvent);

    return () => {
      window.removeEventListener('sectionsUpdated', handleSyncEvent);
      window.removeEventListener('modulesUpdated', handleSyncEvent);
    };
  }, [loadSections]);

  // Charger les sections au montage et quand l'organisation change
  useEffect(() => {
    if (currentOrganization?.id) {
      loadSections();
      loadModules();
    }
  }, [loadSections, loadModules, currentOrganization?.id]);

  // ✅ Ajouter une nouvelle Category
  const addSection = useCallback(async (name: string) => {
    try {
      const result = await api.post('/admin-modules/categories', { 
        name,
        description: `Category ${name}`,
        icon: 'AppstoreOutlined',
        iconColor: '#1890ff',
        order: sections.length + 1,
        active: true,
        organizationId: currentOrganization?.id,
        superAdminOnly: false
      });
      if (result?.success) {
        await loadSections(); // Recharger les sections
        message.success('Category ajoutée avec succès');
        // Déclencher l'événement pour la synchronisation
        window.dispatchEvent(new CustomEvent('sectionsUpdated'));
      }
    } catch (error) {
      message.error('Erreur lors de l\'ajout de la category');
      logger.error(error);
    }
  }, [api, loadSections, sections.length, currentOrganization?.id]);

  // Modifier le nom d'une section
  const updateSectionName = useCallback(async (sectionId: string, newName: string) => {
    try {
      const result = await api.put(`/api/sections/${sectionId}`, { name: newName });
      if (result.success) {
        await loadSections(); // Recharger les sections
        message.success('Section modifiée avec succès');
        // Déclencher l'événement pour la synchronisation
        window.dispatchEvent(new CustomEvent('sectionsUpdated'));
      }
    } catch (error) {
      message.error('Erreur lors de la modification de la section');
      logger.error(error);
    }
  }, [api, loadSections]);

  // Réorganiser les sections
  const reorderSections = useCallback(async (reorderedSections: DynamicSection[]) => {
    try {
      const updates = reorderedSections.map((section, index) => ({
        id: section.id,
        order: index
      }));
      
      const result = await api.put('/api/sections/reorder', { updates });
      if (result.success) {
        await loadSections(); // Recharger les sections
        message.success('Ordre des sections mis à jour');
        // Déclencher l'événement pour la synchronisation
        window.dispatchEvent(new CustomEvent('sectionsUpdated'));
      }
    } catch (error) {
      message.error('Erreur lors de la réorganisation des sections');
      logger.error(error);
    }
  }, [api, loadSections]);

  return {
    sections: sections.filter(section => section.active), // Retourner seulement les sections actives
    allSections: sections, // Toutes les sections (pour l'admin)
    modules, // Les modules chargés
    setModules, // Ajout du setter pour les modules
    loading,
    error,
    loadSections,
    loadModules,
    toggleSectionActive,
    deleteSection,
    addSection,
    updateSectionName,
    reorderSections,
    refetchSections: loadSections
  };
};

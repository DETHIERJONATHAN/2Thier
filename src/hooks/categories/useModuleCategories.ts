import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../useAuthenticatedApi';
import { message } from 'antd';

// ✅ Interface pour les Categories de modules (Prisma)
export interface ModuleCategory {
  id: string;
  name: string;
  description?: string;
  icon: string;
  iconColor: string;
  order: number;
  active: boolean;
  organizationId?: string;
  superAdminOnly: boolean;
  allowedRoles?: any;
  requiredPermissions?: any;
  createdAt: string;
  updatedAt: string;
}

// ✅ Interface compatible avec l'excellente page ModulesAdminPage.tsx
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

// Categories par défaut si aucune n'existe
const defaultCategories: Omit<ModuleCategory, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Administration',
    description: 'Modules, Rôles, Utilisateurs, Permissions, Synthèse des droits, Organisations',
    icon: 'UserSwitchOutlined',
    iconColor: '#f5222d',
    order: 1,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Google Workspace',
    description: 'Gmail, Drive, Meet, Docs, Sheets, Voice, Agenda',
    icon: 'GoogleOutlined',
    iconColor: '#4285f4',
    order: 2,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Intelligence',
    description: 'IA, Gemini, Analytics, Recommandations',
    icon: 'BulbOutlined',
    iconColor: '#722ed1',
    order: 3,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'CRM',
    description: 'Clients, Projets, Leads, Devis',
    icon: 'TeamOutlined',
    iconColor: '#13c2c2',
    order: 4,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Devis1Minute',
    description: 'Marketplace, Partenaires, Campagnes, Landing Pages',
    icon: 'RocketOutlined',
    iconColor: '#ff7a00',
    order: 5,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Formulaires',
    description: 'Blocs, Sections, Champs, Validations',
    icon: 'FormOutlined',
    iconColor: '#52c41a',
    order: 6,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Autres',
    description: 'Dashboard, Techniques, Mail, Profile, Settings',
    icon: 'AppstoreOutlined',
    iconColor: '#1890ff',
    order: 7,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  }
];

export const useModuleCategories = () => {
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [modules, setModules] = useState<any[]>([]); // ✅ Ajout des modules
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Convertir Categories → DynamicSection (pour compatibilité avec ModulesAdminPage.tsx)
  const allSections: DynamicSection[] = categories.map(category => ({
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

  // Initialiser les Categories par défaut
  const initializeDefaultCategories = useCallback(async () => {
    if (!currentOrganization?.id || !api) return;

    try {
      console.log(`📦 [useModuleCategories] Création de ${defaultCategories.length} Categories par défaut...`);

      const createdCategories: ModuleCategory[] = [];

      // Créer chaque category individuellement pour éviter les erreurs
      for (const categoryData of defaultCategories) {
        try {
          const response = await api.post('/admin-modules/categories', {
            ...categoryData,
            organizationId: currentOrganization.id
          });

          if (response?.success && response.data) {
            createdCategories.push(response.data);
            console.log(`✅ Category "${categoryData.name}" créée`);
          }
        } catch (error) {
          console.warn(`⚠️ Erreur création category "${categoryData.name}":`, error);
        }
      }

      if (createdCategories.length > 0) {
        console.log(`✅ [useModuleCategories] ${createdCategories.length} Categories créées avec succès`);
        setCategories(createdCategories.sort((a, b) => a.order - b.order));
        message.success(`${createdCategories.length} Categories initialisées avec succès`);
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors de l\'initialisation des Categories:', error);
      setError('Erreur lors de l\'initialisation des categories');
    }
  }, [currentOrganization?.id, api]);

  // Charger les Categories depuis Prisma
  const loadCategories = useCallback(async () => {
    if (!currentOrganization?.id || !api) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [useModuleCategories] Chargement Categories depuis Prisma...');
      
      // ✅ Utiliser les routes admin-modules/categories existantes
      const response = await api.get(`/admin-modules/categories?organizationId=${currentOrganization.id}`);
      
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ [useModuleCategories] ${response.data.length} Categories trouvées dans Prisma`);
        console.log(`✅ Categories: ${response.data.map((c: ModuleCategory) => c.name).join(', ')}`);
        
        setCategories(response.data.sort((a: ModuleCategory, b: ModuleCategory) => a.order - b.order));
      } else {
        console.log('📝 [useModuleCategories] Aucune Category trouvée, création des categories par défaut...');
        await initializeDefaultCategories();
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors du chargement des Categories:', error);
      setError('Erreur lors du chargement des categories');
      
      // Fallback : créer les categories par défaut
      console.log('⚠️ [useModuleCategories] Tentative de création des categories par défaut');
      await initializeDefaultCategories();
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, api, initializeDefaultCategories]);

  // ✅ Charger les modules (compatible avec ModulesAdminPage.tsx)
  const loadModules = useCallback(async () => {
    if (!currentOrganization?.id || !api) {
      console.warn('Pas d\'organisation courante, impossible de charger les modules');
      return;
    }

    try {
      console.log('🔄 [useModuleCategories] Chargement des modules...');
      const response = await api.get(`/admin-modules?organizationId=${currentOrganization.id}`);
      
      if (response?.success && response.data?.sections) {
        // Extraire tous les modules de toutes les sections
        const allModules = response.data.sections.flatMap((section: any) => 
          section.modules || []
        );
        
        console.log(`✅ [useModuleCategories] ${allModules.length} modules chargés`);
        setModules(allModules);
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors du chargement des modules:', error);
    }
  }, [currentOrganization?.id, api]);

  // Activer/désactiver une Category
  const toggleSectionActive = useCallback(async (categoryId: string) => {
    if (!api) return;

    try {
      console.log(`🔄 [useModuleCategories] Toggle Category ${categoryId}...`);
      const category = categories.find(c => c.id === categoryId);
      if (!category) {
        console.error(`❌ [useModuleCategories] Category ${categoryId} introuvable`);
        return;
      }

      const newActiveStatus = !category.active;
      const response = await api.put(`/admin-modules/categories/${categoryId}`, {
        active: newActiveStatus
      });

      if (response?.success) {
        console.log(`✅ [useModuleCategories] Category ${categoryId} ${newActiveStatus ? 'activée' : 'désactivée'}`);
        setCategories(prev => prev.map(c => 
          c.id === categoryId 
            ? { ...c, active: newActiveStatus }
            : c
        ));
        message.success(`Category ${newActiveStatus ? 'activée' : 'désactivée'} avec succès`);
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors du toggle Category:', error);
      message.error('Erreur lors de la mise à jour de la category');
    }
  }, [categories, api]);

  // Supprimer une Category
  const deleteSection = useCallback(async (categoryId: string) => {
    if (!api) return;

    try {
      console.log(`🗑️ [useModuleCategories] Suppression Category ${categoryId}...`);
      const response = await api.delete(`/admin-modules/categories/${categoryId}`);
      
      if (response?.success) {
        console.log(`✅ [useModuleCategories] Category ${categoryId} supprimée`);
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        message.success('Category supprimée avec succès');
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors de la suppression Category:', error);
      message.error('Erreur lors de la suppression de la category');
    }
  }, [api]);

  // Ajouter une nouvelle Category
  const addSection = useCallback(async (name: string) => {
    try {
      const result = await api.post('/admin-modules/categories', { 
        name,
        description: `Category ${name}`,
        icon: 'AppstoreOutlined',
        iconColor: '#1890ff',
        order: categories.length + 1,
        active: true,
        organizationId: currentOrganization?.id,
        superAdminOnly: false
      });
      if (result?.success) {
        await loadCategories(); // Recharger les categories
        message.success('Category ajoutée avec succès');
      }
    } catch (error) {
      message.error('Erreur lors de l\'ajout de la category');
      console.error(error);
    }
  }, [api, loadCategories, categories.length, currentOrganization?.id]);

  // Mettre à jour le nom d'une Category
  const updateSectionName = useCallback(async (categoryId: string, newName: string) => {
    if (!api) return;

    try {
      const response = await api.put(`/admin-modules/categories/${categoryId}`, {
        name: newName
      });

      if (response?.success) {
        setCategories(prev => prev.map(c => 
          c.id === categoryId 
            ? { ...c, name: newName }
            : c
        ));
        message.success('Nom de la category mis à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du nom:', error);
      message.error('Erreur lors de la mise à jour du nom');
    }
  }, [api]);

  // Réorganiser les Categories (drag & drop)
  const reorderSections = useCallback(async (reorderedSections: DynamicSection[]) => {
    // Mettre à jour l'ordre localement d'abord
    const reorderedCategories = reorderedSections.map((section, index) => {
      const category = categories.find(c => c.id === section.id);
      return category ? { ...category, order: index + 1 } : null;
    }).filter(Boolean) as ModuleCategory[];
    
    setCategories(reorderedCategories);

    // Puis sauvegarder en BDD
    try {
      for (const [index, section] of reorderedSections.entries()) {
        await api.put(`/admin-modules/categories/${section.id}`, {
          order: index + 1
        });
      }
      console.log('✅ Ordre des categories sauvegardé');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'ordre:', error);
      // Recharger en cas d'erreur
      loadCategories();
    }
  }, [categories, api, loadCategories]);

  // Charger au montage et quand l'organisation change
  useEffect(() => {
    if (currentOrganization?.id) {
      loadCategories();
      loadModules(); // ✅ Charger aussi les modules
    }
  }, [loadCategories, loadModules, currentOrganization?.id]);

  // ✅ Interface compatible avec ModulesAdminPage.tsx
  return {
    // Interface compatible
    allSections, // Categories converties en DynamicSection
    modules, // ✅ Modules chargés
    setModules, // ✅ Setter pour les modules
    loading,
    error,
    
    // Fonctions compatibles
    loadSections: loadCategories,
    loadModules, // ✅ Fonction pour charger les modules
    toggleSectionActive,
    deleteSection,
    addSection,
    updateSectionName,
    reorderSections,
    
    // Données spécifiques aux Categories
    categories,
    loadCategories
  };
};

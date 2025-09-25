import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { message } from 'antd';

// Interface pour les Categories (remplace les sections)
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

// Interface pour les modules avec category
export interface ModuleWithCategory {
  id: string;
  key: string;
  label: string;
  feature: string;
  icon?: string;
  route?: string;
  description?: string;
  page?: string;
  order?: number;
  active: boolean;
  superAdminOnly: boolean;
  categoryId?: string;
  category?: string; // Ancien système
  categoryColor?: string;
  categoryIcon?: string;
  organizationId?: string;
  // Relations
  Category?: ModuleCategory;
  OrganizationModuleStatus?: any[];
  Permission?: any[];
}

// Categories par défaut si elles n'existent pas
const defaultCategories: Omit<ModuleCategory, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Administration',
    description: 'Modules, Rôles, Utilisateurs, Permissions, Synthèse des droits, Organisations, Telnyx',
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
    description: 'Google Gmail, Google Drive, Google Meet, Google Docs, Google Sheets, Google Voice, Google Agenda',
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
    description: 'IA, Recommendations, Analytics, Insights',
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
    icon: 'CustomerServiceOutlined',
    iconColor: '#13c2c2',
    order: 4,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Devis1Minute',
    description: 'Marketplace, Portail Partenaire, Mes Leads, Facturation, Analytics',
    icon: 'RocketOutlined',
    iconColor: '#ff7a00',
    order: 5,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Marketing & Ventes',
    description: 'Site Vitrine, Publicités (Google/Meta/LinkedIn/TikTok), E-commerce, Analytics Avancés, Lead Generation',
    icon: 'FundOutlined',
    iconColor: '#eb2f96',
    order: 6,
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
    order: 7,
    active: true,
    superAdminOnly: false,
    allowedRoles: null,
    requiredPermissions: null
  },
  {
    name: 'Autres',
    description: 'Dashboard, Mail, Profile, Settings',
    icon: 'AppstoreOutlined',
    iconColor: '#1890ff',
    order: 8,
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
  const [modules, setModules] = useState<ModuleWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Charger les Categories depuis Prisma
  const loadCategories = useCallback(async () => {
    if (!currentOrganization?.id || !api) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [useModuleCategories] Chargement des Categories depuis Prisma...');
      
      // Utiliser les routes admin-modules/categories qui existent déjà
      const response = await api.get(`/admin-modules/categories?organizationId=${currentOrganization.id}`);
      
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ [useModuleCategories] ${response.data.length} Categories chargées depuis Prisma`);
        setCategories(response.data.sort((a: ModuleCategory, b: ModuleCategory) => a.order - b.order));
      } else {
        console.log('📝 [useModuleCategories] Aucune Category trouvée, création des categories par défaut...');
        await initializeDefaultCategories();
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors du chargement des Categories:', error);
      setError('Erreur lors du chargement des categories');
      
      // Fallback : utiliser les categories par défaut
      console.log('⚠️ [useModuleCategories] Utilisation des categories par défaut (fallback)');
      const fallbackCategories = defaultCategories.map((cat, index) => ({
        ...cat,
        id: `fallback-${index}`,
        organizationId: currentOrganization.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      setCategories(fallbackCategories);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, api]);

  // ✅ Charger les Modules avec leurs Categories
  const loadModules = useCallback(async () => {
    if (!currentOrganization?.id || !api) {
      console.warn('Pas d\'organisation courante, impossible de charger les modules');
      return;
    }

    try {
      console.log('🔄 [useModuleCategories] Chargement des modules avec categories...');
      
      // Utiliser les routes admin-modules qui supportent déjà les categories
      const response = await api.get(`/admin-modules?organizationId=${currentOrganization.id}`);
      
      if (response?.success && response.data?.sections) {
        // Extraire tous les modules de toutes les sections
        const allModules: ModuleWithCategory[] = [];
        response.data.sections.forEach((section: any) => {
          if (section.modules && Array.isArray(section.modules)) {
            allModules.push(...section.modules.map((module: any) => ({
              ...module,
              isActiveForOrg: module.isActiveInOrg || module.isActiveForOrg || false
            })));
          }
        });
        
        console.log(`✅ [useModuleCategories] ${allModules.length} modules chargés avec categories`);
        setModules(allModules);
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors du chargement des modules:', error);
      setError('Erreur lors du chargement des modules');
    }
  }, [currentOrganization?.id, api]);

  // ✅ Initialiser les Categories par défaut
  const initializeDefaultCategories = useCallback(async () => {
    if (!currentOrganization?.id || !api) return;

    try {
      const categoriesToCreate = defaultCategories.map(category => ({
        ...category,
        organizationId: currentOrganization.id
      }));

      console.log(`📦 [useModuleCategories] Création de ${categoriesToCreate.length} Categories par défaut...`);
      const response = await api.post('/admin-modules/categories/bulk', {
        categories: categoriesToCreate
      });

      if (response?.success && Array.isArray(response.data)) {
        console.log(`✅ [useModuleCategories] ${response.data.length} Categories créées avec succès`);
        setCategories(response.data.sort((a: ModuleCategory, b: ModuleCategory) => a.order - b.order));
        message.success('Categories initialisées avec succès');
      }
    } catch (error) {
      console.error('❌ [useModuleCategories] Erreur lors de l\'initialisation des Categories:', error);
      setError('Erreur lors de l\'initialisation des categories');
    }
  }, [currentOrganization?.id, api]);

  // ✅ Activer/désactiver une Category
  const toggleCategoryActive = useCallback(async (categoryId: string) => {
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

  // ✅ Supprimer une Category
  const deleteCategory = useCallback(async (categoryId: string) => {
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

  // ✅ Ajouter une nouvelle Category
  const addCategory = useCallback(async (name: string) => {
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

  // Charger les categories et modules au montage
  useEffect(() => {
    if (currentOrganization?.id) {
      loadCategories();
      loadModules();
    }
  }, [loadCategories, loadModules, currentOrganization?.id]);

  return {
    // Données
    categories,
    modules,
    loading,
    error,
    
    // Actions Categories
    loadCategories,
    toggleCategoryActive,
    deleteCategory,
    addCategory,
    
    // Actions Modules  
    loadModules,
    setModules,
    
    // Pour compatibilité avec l'ancienne page (sections → categories)
    allSections: categories, // Alias pour compatibilité
    toggleSectionActive: toggleCategoryActive, // Alias pour compatibilité
    deleteSection: deleteCategory, // Alias pour compatibilité
    addSection: addCategory, // Alias pour compatibilité
    loadSections: loadCategories // Alias pour compatibilité
  };
};

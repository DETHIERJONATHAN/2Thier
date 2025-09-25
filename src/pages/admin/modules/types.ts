// Types pour la gestion des modules admin et leurs catégories

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
  allowedRoles?: any;
  requiredPermissions?: any;
  createdAt: string;
  updatedAt: string;
}

// Alias pour compatibilité avec l'ancienne page
export interface DynamicSection extends Category {
  title: string; // alias pour name
  iconName: string; // alias pour icon
}

export interface ModuleWithStatus {
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
  organizationId?: string;
  categoryId?: string;
  category?: string;
  categoryColor?: string;
  categoryIcon?: string;
  section?: string;
  sectionColor?: string;
  sectionIcon?: string;
  
  // Status pour l'organisation
  isActiveForOrg?: boolean;
  isActiveInOrg?: boolean;
  hasOrgSpecificConfig?: boolean;
  
  // Relation avec Category
  Category?: Category;
  
  // Autres relations
  Organization?: any;
  OrganizationModuleStatus?: any[];
  Permission?: any[];
}

export interface SectionWithModules {
  id: string;
  sectionName: string;
  sectionIcon: string;
  sectionColor: string;
  sectionOrder: number;
  active: boolean;
  modules: ModuleWithStatus[];
}

export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current: {
        type: string;
        moduleId?: string;
        sectionId?: string;
      };
    };
  };
  over: {
    id: string;
    data: {
      current: {
        type: string;
        sectionId?: string;
      };
    };
  } | null;
}

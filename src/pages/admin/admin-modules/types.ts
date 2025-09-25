// Types pour l'administration des modules et categories
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
  allowedRoles?: string[];
  requiredPermissions?: string[];
  createdAt: string;
  updatedAt: string;
}

// Format compatible avec l'ancienne interface DynamicSection
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

// Module avec son statut d'activation pour une organisation
export interface ModuleWithStatus {
  id: string;
  key: string;
  label: string;
  feature: string;
  icon?: string;
  iconColor?: string;
  route?: string;
  description?: string;
  order?: number;
  section?: string;
  sectionIcon?: string;
  sectionColor?: string;
  categoryId?: string;
  Category?: ModuleCategory;
  isActiveForOrg?: boolean;
  hasOrgSpecificConfig?: boolean;
  organizationId?: string;
  superAdminOnly: boolean;
}

// Section avec ses modules organisés
export interface SectionWithModules {
  id: string;
  // Id interne utilisé pour le DnD/affichage (peut différer de l'id réel DB de la catégorie)
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
  order: number;
  active: boolean;
  superAdminOnly?: boolean;
  modules: ModuleWithStatus[];
  modulesCount: number;
  organizationId?: string;
  // Id réel de la catégorie côté base de données (UUID ou numérique)
  backendCategoryId?: string;
}

// Réponses API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: ModuleCategory[];
  total: number;
}

export interface ModulesResponse {
  success: boolean;
  data: {
    sections: SectionWithModules[];
    totalModules: number;
    totalSections: number;
    systemType: string;
    categorySystemAvailable: boolean;
  };
}

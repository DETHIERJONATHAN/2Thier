// Types pour le système de categories de modules

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
  category?: string;
  categoryColor?: string;
  categoryIcon?: string;
  categoryId?: string;
  isActiveForOrg?: boolean;
  isActiveInOrg?: boolean;
  hasOrgSpecificConfig?: boolean;
  categoryName?: string;
  // Relations Prisma
  Category?: ModuleCategory;
  OrganizationModuleStatus?: any[];
  Permission?: any[];
}

export interface SectionWithModules {
  id: string;
  sectionName: string;
  sectionIcon: string;
  sectionColor: string;
  sectionOrder: number;
  modules: ModuleWithStatus[];
  active?: boolean;
}

// Format compatible avec l'ancienne page ModulesAdminPage
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

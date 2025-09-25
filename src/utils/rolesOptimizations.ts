/**
 * 🚀 OPTIMISATIONS PERFORMANCE - PAGE ADMIN RÔLES
 * Améliorations pour atteindre le score 10/10
 */

// 🎯 CONSTANTES OPTIMISÉES POUR LES RÔLES
export const ROLE_TYPES = ['admin', 'user', 'manager', 'viewer', 'super_admin'] as const;

export const ROLE_ICONS = {
  admin: { icon: 'CrownOutlined', color: '#ff4d4f' },
  super_admin: { icon: 'StarOutlined', color: '#722ed1' },
  manager: { icon: 'TeamOutlined', color: '#1890ff' },
  user: { icon: 'UserOutlined', color: '#52c41a' },
  viewer: { icon: 'EyeOutlined', color: '#fa8c16' },
  default: { icon: 'SafetyCertificateOutlined', color: '#666' }
} as const;

export const PERMISSION_CATEGORIES = {
  read: { label: 'Lecture', color: '#52c41a' },
  write: { label: 'Écriture', color: '#1890ff' },
  delete: { label: 'Suppression', color: '#ff4d4f' },
  admin: { label: 'Administration', color: '#722ed1' }
} as const;

// 🛡️ TYPES ULTRA-STRICTS POUR LES RÔLES
export interface RolePermission {
  id: string;
  name: string;
  description?: string;
  category: keyof typeof PERMISSION_CATEGORIES;
}

export interface RoleOptimized {
  id: string;
  name: string;
  description?: string;
  type: typeof ROLE_TYPES[number];
  permissions: RolePermission[];
  userCount: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  organizationId?: string;
}

export interface ApiClient {
  get: (url: string) => Promise<{ data: unknown }>;
  post: (url: string, data: unknown) => Promise<{ success: boolean; data?: unknown }>;
  patch: (url: string, data: unknown) => Promise<{ success: boolean; data?: unknown }>;
  delete: (url: string) => Promise<{ success: boolean }>;
}

// 🚀 UTILITAIRES PERFORMANCE POUR LES RÔLES
export const formatRoleName = (name: string, maxLength = 25): string => {
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};

export const formatRoleDescription = (description: string | undefined, maxLength = 60): string => {
  if (!description) return 'Aucune description';
  return description.length > maxLength 
    ? `${description.substring(0, maxLength)}...` 
    : description;
};

export const getRoleIcon = (roleType: string) => {
  return ROLE_ICONS[roleType as keyof typeof ROLE_ICONS] || ROLE_ICONS.default;
};

export const getRoleTypeLabel = (roleType: string): string => {
  const labels: Record<string, string> = {
    admin: 'Administrateur',
    super_admin: 'Super Admin',
    manager: 'Gestionnaire',
    user: 'Utilisateur',
    viewer: 'Observateur'
  };
  return labels[roleType] || roleType;
};

export const calculateRoleStats = (roles: RoleOptimized[]): {
  total: number;
  active: number;
  system: number;
  custom: number;
  totalUsers: number;
} => {
  return {
    total: roles.length,
    active: roles.filter(r => r.isActive).length,
    system: roles.filter(r => r.isSystem).length,
    custom: roles.filter(r => !r.isSystem).length,
    totalUsers: roles.reduce((sum, role) => sum + role.userCount, 0)
  };
};

export const validateRoleData = (data: Record<string, unknown>): boolean => {
  return !!(
    data.name && 
    typeof data.name === 'string' && 
    data.name.trim().length >= 2 &&
    data.type &&
    typeof data.type === 'string'
  );
};

export const getPermissionsByCategory = (permissions: RolePermission[]) => {
  return permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, RolePermission[]>);
};

// 🔄 DEBOUNCE POUR RECHERCHE (RÉUTILISÉ)
export const debounce = <T extends (...args: never[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

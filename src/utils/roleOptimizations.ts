/**
 * 🚀 OPTIMISATIONS PERFORMANCE - PAGE ADMIN RÔLES
 * Améliorations pour atteindre le score 10/10
 */

// 🎯 CONSTANTES OPTIMISÉES POUR RÔLES
export const ROLE_TYPES = ['super_admin', 'admin', 'manager', 'user', 'viewer'] as const;

export const ROLE_ICONS = {
  super_admin: { icon: 'CrownOutlined', color: '#ff4d4f' },
  admin: { icon: 'SettingOutlined', color: '#722ed1' },
  manager: { icon: 'UserSwitchOutlined', color: '#1890ff' },
  user: { icon: 'UserOutlined', color: '#52c41a' },
  viewer: { icon: 'EyeOutlined', color: '#fa8c16' },
  custom: { icon: 'TagsOutlined', color: '#13c2c2' }
} as const;

export const PERMISSION_CATEGORIES = {
  system: { label: 'Système', color: '#ff4d4f', icon: 'SettingOutlined' },
  users: { label: 'Utilisateurs', color: '#1890ff', icon: 'UserOutlined' },
  organizations: { label: 'Organisations', color: '#722ed1', icon: 'TeamOutlined' },
  modules: { label: 'Modules', color: '#52c41a', icon: 'AppstoreOutlined' },
  data: { label: 'Données', color: '#fa8c16', icon: 'DatabaseOutlined' },
  reports: { label: 'Rapports', color: '#eb2f96', icon: 'BarChartOutlined' }
} as const;

// 🛡️ TYPES ULTRA-STRICTS POUR RÔLES
export interface RoleStats {
  totalUsers: number;
  totalPermissions: number;
  activeRoles: number;
  systemRoles: number;
  customRoles: number;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  isSystemPermission: boolean;
}

export interface RoleOptimized {
  id: string;
  name: string;
  description?: string;
  type: typeof ROLE_TYPES[number] | 'custom';
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: RoleStats;
  permissions: Permission[];
  usersCount: number;
}

// 🚀 UTILITAIRES PERFORMANCE POUR RÔLES
export const isSystemRole = (roleType: string): boolean => {
  return ROLE_TYPES.includes(roleType as typeof ROLE_TYPES[number]);
};

export const getRoleLevel = (roleType: string): number => {
  const levels = {
    super_admin: 5,
    admin: 4,
    manager: 3,
    user: 2,
    viewer: 1,
    custom: 0
  };
  return levels[roleType as keyof typeof levels] || 0;
};

export const formatRoleName = (name: string, maxLength = 25): string => {
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};

export const formatRoleDescription = (description: string | undefined, maxLength = 60): string => {
  if (!description) return '';
  return description.length > maxLength 
    ? `${description.substring(0, maxLength)}...` 
    : description;
};

// 🎨 CACHE DES ICÔNES POUR RÔLES
export const getCachedRoleIcon = (roleType: string) => {
  return ROLE_ICONS[roleType as keyof typeof ROLE_ICONS] || 
         { icon: 'TagsOutlined', color: '#666' };
};

export const getCachedPermissionCategoryIcon = (category: string) => {
  return PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || 
         { label: 'Autre', color: '#666', icon: 'AppstoreOutlined' };
};

// 📊 CALCULS OPTIMISÉS POUR RÔLES
export const calculateRoleStats = (roles: RoleOptimized[]): RoleStats => {
  return {
    totalUsers: roles.reduce((sum, role) => sum + role.usersCount, 0),
    totalPermissions: roles.reduce((sum, role) => sum + role.permissions.length, 0),
    activeRoles: roles.filter(r => r.isActive).length,
    systemRoles: roles.filter(r => r.isSystemRole).length,
    customRoles: roles.filter(r => !r.isSystemRole).length
  };
};

export const calculatePermissionStats = (permissions: Permission[]): {
  total: number;
  byCategory: Record<string, number>;
  systemPermissions: number;
  customPermissions: number;
} => {
  const byCategory: Record<string, number> = {};
  
  permissions.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });
  
  return {
    total: permissions.length,
    byCategory,
    systemPermissions: permissions.filter(p => p.isSystemPermission).length,
    customPermissions: permissions.filter(p => !p.isSystemPermission).length
  };
};

// 🎯 VALIDATION RAPIDE POUR RÔLES
export const validateRoleData = (data: Record<string, unknown>): boolean => {
  return !!(
    data.name && 
    typeof data.name === 'string' && 
    data.name.trim().length >= 2 &&
    data.name.trim().length <= 50
  );
};

export const validatePermissionData = (data: Record<string, unknown>): boolean => {
  return !!(
    data.key && 
    typeof data.key === 'string' && 
    data.key.trim().length >= 2 &&
    data.name &&
    typeof data.name === 'string' &&
    data.name.trim().length >= 2
  );
};

// 🔍 FONCTIONS DE RECHERCHE OPTIMISÉES
export const filterRolesBySearch = (roles: RoleOptimized[], searchTerm: string): RoleOptimized[] => {
  if (!searchTerm) return roles;
  
  const term = searchTerm.toLowerCase();
  return roles.filter(role => 
    role.name.toLowerCase().includes(term) ||
    (role.description && role.description.toLowerCase().includes(term)) ||
    role.type.toLowerCase().includes(term)
  );
};

export const filterRolesByType = (roles: RoleOptimized[], typeFilter: string): RoleOptimized[] => {
  if (typeFilter === 'all') return roles;
  if (typeFilter === 'system') return roles.filter(r => r.isSystemRole);
  if (typeFilter === 'custom') return roles.filter(r => !r.isSystemRole);
  if (typeFilter === 'active') return roles.filter(r => r.isActive);
  if (typeFilter === 'inactive') return roles.filter(r => !r.isActive);
  
  return roles.filter(r => r.type === typeFilter);
};

// 🚀 PRÉCHARGEMENT INTELLIGENT POUR RÔLES
export const preloadRoleData = async (api: { get: (url: string) => Promise<{ data: unknown }> }, roleIds: string[]) => {
  const promises = roleIds.map(id => 
    Promise.all([
      api.get(`/roles/${id}/permissions`).catch(() => ({ data: [] })),
      api.get(`/roles/${id}/users`).catch(() => ({ data: [] }))
    ])
  );
  
  return Promise.all(promises);
};

// 🎨 COULEURS THÉMATIQUES POUR RÔLES
export const getRoleStatusColor = (role: RoleOptimized): string => {
  if (!role.isActive) return '#d9d9d9';
  if (role.isSystemRole) return '#722ed1';
  return '#52c41a';
};

export const getRoleTypeLabel = (type: string): string => {
  const labels = {
    super_admin: 'Super Administrateur',
    admin: 'Administrateur',
    manager: 'Manager',
    user: 'Utilisateur',
    viewer: 'Lecteur',
    custom: 'Personnalisé'
  };
  return labels[type as keyof typeof labels] || 'Personnalisé';
};

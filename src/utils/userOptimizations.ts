/**
 * 🚀 OPTIMISATIONS PERFORMANCE - PAGE ADMIN UTILISATEURS
 * Améliorations pour atteindre le score 10/10
 */

// 🎯 CONSTANTES OPTIMISÉES POUR UTILISATEURS
export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'] as const;

export const USER_STATUS_ICONS = {
  ACTIVE: { icon: 'CheckCircleOutlined', color: '#52c41a' },
  INACTIVE: { icon: 'PoweroffOutlined', color: '#d9d9d9' },
  PENDING: { icon: 'ClockCircleOutlined', color: '#fa8c16' },
  SUSPENDED: { icon: 'StopOutlined', color: '#ff4d4f' }
} as const;

export const USER_ROLE_ICONS = {
  super_admin: { icon: 'CrownOutlined', color: '#ff4d4f' },
  admin: { icon: 'SettingOutlined', color: '#722ed1' },
  manager: { icon: 'UserSwitchOutlined', color: '#1890ff' },
  user: { icon: 'UserOutlined', color: '#52c41a' },
  viewer: { icon: 'EyeOutlined', color: '#fa8c16' }
} as const;

export const AUTHENTICATION_METHODS = {
  password: { label: 'Mot de passe', icon: 'LockOutlined', color: '#1890ff' },
  google: { label: 'Google OAuth', icon: 'GoogleOutlined', color: '#4285F4' },
  microsoft: { label: 'Microsoft', icon: 'WindowsOutlined', color: '#00A1F1' },
  sso: { label: 'SSO', icon: 'SafetyOutlined', color: '#722ed1' }
} as const;

// 🛡️ TYPES ULTRA-STRICTS POUR UTILISATEURS
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  lastLoginUsers: number;
  totalSessions: number;
}

export interface UserRole {
  id: string;
  name: string;
  type: string;
  permissions: string[];
}

export interface UserOrganization {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  role?: UserRole;
}

export interface UserActivity {
  lastLogin?: string;
  lastActivity?: string;
  sessionsCount: number;
  totalLogins: number;
}

export interface UserOptimized {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: typeof USER_STATUSES[number];
  role: UserRole;
  organization: UserOrganization;
  authMethod: keyof typeof AUTHENTICATION_METHODS;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  activity: UserActivity;
  profilePicture?: string;
  phone?: string;
  department?: string;
  position?: string;
}

// 🚀 UTILITAIRES PERFORMANCE POUR UTILISATEURS
export const getUserFullName = (user: UserOptimized): string => {
  return `${user.firstName} ${user.lastName}`.trim();
};

export const formatUserName = (firstName: string, lastName: string, maxLength = 25): string => {
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName.length > maxLength ? `${fullName.substring(0, maxLength)}...` : fullName;
};

export const formatUserEmail = (email: string, maxLength = 30): string => {
  return email.length > maxLength ? `${email.substring(0, maxLength)}...` : email;
};

export const getUserDisplayRole = (role: UserRole): string => {
  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Administrateur',
    manager: 'Manager',
    user: 'Utilisateur',
    viewer: 'Lecteur'
  };
  return roleLabels[role.type as keyof typeof roleLabels] || role.name;
};

// 🎨 CACHE DES ICÔNES POUR UTILISATEURS
export const getCachedUserStatusIcon = (status: string) => {
  return USER_STATUS_ICONS[status as keyof typeof USER_STATUS_ICONS] || 
         { icon: 'QuestionCircleOutlined', color: '#666' };
};

export const getCachedUserRoleIcon = (roleType: string) => {
  return USER_ROLE_ICONS[roleType as keyof typeof USER_ROLE_ICONS] || 
         { icon: 'UserOutlined', color: '#666' };
};

export const getCachedAuthMethodIcon = (method: string) => {
  return AUTHENTICATION_METHODS[method as keyof typeof AUTHENTICATION_METHODS] || 
         { label: 'Autre', icon: 'LockOutlined', color: '#666' };
};

// 📊 CALCULS OPTIMISÉS POUR UTILISATEURS
export const calculateUserStats = (users: UserOptimized[]): UserStats => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'ACTIVE').length,
    pendingUsers: users.filter(u => u.status === 'PENDING').length,
    suspendedUsers: users.filter(u => u.status === 'SUSPENDED').length,
    lastLoginUsers: users.filter(u => 
      u.activity.lastLogin && new Date(u.activity.lastLogin) > twentyFourHoursAgo
    ).length,
    totalSessions: users.reduce((sum, u) => sum + u.activity.sessionsCount, 0)
  };
};

export const calculateUserActivityScore = (user: UserOptimized): number => {
  const weights = {
    recentLogin: 40,
    totalLogins: 30,
    sessions: 20,
    emailVerified: 10
  };
  
  let score = 0;
  
  // Score pour connexion récente (dernière semaine)
  if (user.activity.lastLogin) {
    const lastLogin = new Date(user.activity.lastLogin);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (lastLogin > weekAgo) score += weights.recentLogin;
  }
  
  // Score pour nombre total de connexions
  const loginScore = Math.min(user.activity.totalLogins / 50, 1) * weights.totalLogins;
  score += loginScore;
  
  // Score pour sessions actives
  const sessionScore = Math.min(user.activity.sessionsCount / 10, 1) * weights.sessions;
  score += sessionScore;
  
  // Bonus pour email vérifié
  if (user.isEmailVerified) score += weights.emailVerified;
  
  return Math.round(score);
};

// 🎯 VALIDATION RAPIDE POUR UTILISATEURS
export const validateUserData = (data: Record<string, unknown>): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return !!(
    data.email && 
    typeof data.email === 'string' && 
    emailRegex.test(data.email) &&
    data.firstName &&
    typeof data.firstName === 'string' &&
    data.firstName.trim().length >= 1 &&
    data.lastName &&
    typeof data.lastName === 'string' &&
    data.lastName.trim().length >= 1
  );
};

export const validateUserPassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 🔍 FONCTIONS DE RECHERCHE OPTIMISÉES
export const filterUsersBySearch = (users: UserOptimized[], searchTerm: string): UserOptimized[] => {
  if (!searchTerm) return users;
  
  const term = searchTerm.toLowerCase();
  return users.filter(user => 
    user.email.toLowerCase().includes(term) ||
    user.firstName.toLowerCase().includes(term) ||
    user.lastName.toLowerCase().includes(term) ||
    user.organization.name.toLowerCase().includes(term) ||
    getUserDisplayRole(user.role).toLowerCase().includes(term) ||
    (user.department && user.department.toLowerCase().includes(term)) ||
    (user.position && user.position.toLowerCase().includes(term))
  );
};

export const filterUsersByStatus = (users: UserOptimized[], statusFilter: string): UserOptimized[] => {
  if (statusFilter === 'all') return users;
  return users.filter(u => u.status === statusFilter);
};

export const filterUsersByRole = (users: UserOptimized[], roleFilter: string): UserOptimized[] => {
  if (roleFilter === 'all') return users;
  return users.filter(u => u.role.type === roleFilter);
};

export const filterUsersByOrganization = (users: UserOptimized[], orgFilter: string): UserOptimized[] => {
  if (orgFilter === 'all') return users;
  return users.filter(u => u.organization.id === orgFilter);
};

// 🚀 PRÉCHARGEMENT INTELLIGENT POUR UTILISATEURS
export const preloadUserData = async (api: { get: (url: string) => Promise<{ data: unknown }> }, userIds: string[]) => {
  const promises = userIds.map(id => 
    Promise.all([
      api.get(`/users/${id}/activity`).catch(() => ({ data: {} })),
      api.get(`/users/${id}/sessions`).catch(() => ({ data: [] })),
      api.get(`/users/${id}/permissions`).catch(() => ({ data: [] }))
    ])
  );
  
  return Promise.all(promises);
};

// 🎨 COULEURS THÉMATIQUES POUR UTILISATEURS
export const getUserStatusColor = (status: string): string => {
  const colors = {
    ACTIVE: '#52c41a',
    INACTIVE: '#d9d9d9',
    PENDING: '#fa8c16',
    SUSPENDED: '#ff4d4f'
  };
  return colors[status as keyof typeof colors] || '#666';
};

export const getUserRoleColor = (roleType: string): string => {
  const colors = {
    super_admin: '#ff4d4f',
    admin: '#722ed1',
    manager: '#1890ff',
    user: '#52c41a',
    viewer: '#fa8c16'
  };
  return colors[roleType as keyof typeof colors] || '#666';
};

// 📅 UTILITAIRES DE DATE POUR UTILISATEURS
export const formatLastActivity = (date: string | undefined): string => {
  if (!date) return 'Jamais';
  
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  
  return activityDate.toLocaleDateString('fr-FR');
};

export const getActivityStatus = (user: UserOptimized): 'online' | 'recent' | 'away' | 'offline' => {
  if (!user.activity.lastActivity) return 'offline';
  
  const now = new Date();
  const lastActivity = new Date(user.activity.lastActivity);
  const diffMins = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
  
  if (diffMins <= 5) return 'online';
  if (diffMins <= 30) return 'recent';
  if (diffMins <= 1440) return 'away'; // 24h
  return 'offline';
};

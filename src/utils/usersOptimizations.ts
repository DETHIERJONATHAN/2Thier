/**
 * 🚀 OPTIMISATIONS PERFORMANCE - PAGE ADMIN UTILISATEURS
 * Améliorations pour atteindre le score 10/10
 */

// 🎯 CONSTANTES OPTIMISÉES POUR LES UTILISATEURS
export const USER_STATUS = ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'] as const;

export const USER_STATUS_ICONS = {
  ACTIVE: { icon: 'CheckCircleOutlined', color: '#52c41a' },
  INACTIVE: { icon: 'CloseCircleOutlined', color: '#d9d9d9' },
  PENDING: { icon: 'ClockCircleOutlined', color: '#fa8c16' },
  SUSPENDED: { icon: 'StopOutlined', color: '#ff4d4f' }
} as const;

export const USER_ROLE_COLORS = {
  admin: '#ff4d4f',
  super_admin: '#722ed1', 
  manager: '#1890ff',
  user: '#52c41a',
  viewer: '#fa8c16'
} as const;

// 🛡️ TYPES ULTRA-STRICTS POUR LES UTILISATEURS
export interface UserRole {
  id: string;
  name: string;
  type: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  status: string;
}

export interface UserOptimized {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: typeof USER_STATUS[number];
  role?: UserRole;
  organization?: UserOrganization;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  isEmailVerified: boolean;
  isSuperAdmin?: boolean;
}

export interface ApiClient {
  get: (url: string) => Promise<{ data: unknown }>;
  post: (url: string, data: unknown) => Promise<{ success: boolean; data?: unknown }>;
  patch: (url: string, data: unknown) => Promise<{ success: boolean; data?: unknown }>;
  delete: (url: string) => Promise<{ success: boolean }>;
}

// 🚀 UTILITAIRES PERFORMANCE POUR LES UTILISATEURS
export const formatUserName = (firstName: string, lastName: string, maxLength = 30): string => {
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName.length > maxLength ? `${fullName.substring(0, maxLength)}...` : fullName;
};

export const formatUserEmail = (email: string, maxLength = 35): string => {
  return email.length > maxLength ? `${email.substring(0, maxLength)}...` : email;
};

export const getUserStatusConfig = (status: string) => {
  return USER_STATUS_ICONS[status as keyof typeof USER_STATUS_ICONS] || 
         { icon: 'QuestionCircleOutlined', color: '#999' };
};

export const getUserRoleColor = (roleType?: string): string => {
  if (!roleType) return '#999';
  return USER_ROLE_COLORS[roleType as keyof typeof USER_ROLE_COLORS] || '#999';
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    ACTIVE: 'Actif',
    INACTIVE: 'Inactif',
    PENDING: 'En attente',
    SUSPENDED: 'Suspendu'
  };
  return labels[status] || status;
};

export const formatLastLogin = (lastLoginAt?: string): string => {
  if (!lastLoginAt) return 'Jamais connecté';
  
  const date = new Date(lastLoginAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Il y a moins d\'1h';
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  if (diffInHours < 168) return `Il y a ${Math.floor(diffInHours / 24)} jour(s)`;
  
  return date.toLocaleDateString('fr-FR');
};

export const calculateUserStats = (users: UserOptimized[]): {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  suspended: number;
  verified: number;
  byRole: Record<string, number>;
  byOrganization: Record<string, number>;
} => {
  const byRole: Record<string, number> = {};
  const byOrganization: Record<string, number> = {};
  
  users.forEach(user => {
    // Compter par rôle
    const roleType = user.role?.type || 'no_role';
    byRole[roleType] = (byRole[roleType] || 0) + 1;
    
    // Compter par organisation
    const orgName = user.organization?.name || 'Sans organisation';
    byOrganization[orgName] = (byOrganization[orgName] || 0) + 1;
  });
  
  return {
    total: users.length,
    active: users.filter(u => u.status === 'ACTIVE').length,
    inactive: users.filter(u => u.status === 'INACTIVE').length,
    pending: users.filter(u => u.status === 'PENDING').length,
    suspended: users.filter(u => u.status === 'SUSPENDED').length,
    verified: users.filter(u => u.isEmailVerified).length,
    byRole,
    byOrganization
  };
};

export const validateUserData = (data: Record<string, unknown>): boolean => {
  return !!(
    data.email && 
    typeof data.email === 'string' && 
    data.email.includes('@') &&
    data.firstName &&
    typeof data.firstName === 'string' &&
    data.firstName.trim().length >= 1 &&
    data.lastName &&
    typeof data.lastName === 'string' &&
    data.lastName.trim().length >= 1
  );
};

export const generateUserEmail = (firstName: string, lastName: string, organization: string): string => {
  // Normalisation selon les règles métier du CRM
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/[^a-z0-9]/g, ''); // Garde seulement lettres et chiffres
  };
  
  const normalizedFirstName = normalizeText(firstName);
  const normalizedLastName = normalizeText(lastName);
  const domain = organization === 'Super Admin' ? '2thier.be' : `${normalizeText(organization)}.be`;
  
  return `${normalizedFirstName}.${normalizedLastName}@${domain}`;
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

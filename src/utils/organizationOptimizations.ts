/**
 * 🚀 OPTIMISATIONS PERFORMANCE - PAGE ADMIN ORGANISATIONS
 * Améliorations pour atteindre le score 10/10
 */

// 🎯 CONSTANTES OPTIMISÉES
export const GOOGLE_MODULE_KEYS = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'] as const;

export const CRM_MODULE_ICONS = {
  leads: { icon: 'UserOutlined', color: '#1890ff' },
  customers: { icon: 'TeamOutlined', color: '#52c41a' },
  projects: { icon: 'DatabaseOutlined', color: '#722ed1' },
  tasks: { icon: 'CheckCircleOutlined', color: '#fa8c16' },
  documents: { icon: 'FileOutlined', color: '#13c2c2' },
  reports: { icon: 'BarChartOutlined', color: '#eb2f96' },
  crm: { icon: 'UserOutlined', color: '#1890ff' },
  sav: { icon: 'CustomerServiceOutlined', color: '#f5222d' },
  agenda: { icon: 'CalendarOutlined', color: '#722ed1' }
} as const;

export const GOOGLE_MODULE_ICONS = {
  gmail: { icon: 'MailOutlined', color: '#EA4335' },
  calendar: { icon: 'CalendarOutlined', color: '#4285F4' },
  drive: { icon: 'FileOutlined', color: '#34A853' },
  meet: { icon: 'VideoCameraOutlined', color: '#FBBC04' },
  docs: { icon: 'FileOutlined', color: '#4285F4' },
  sheets: { icon: 'DatabaseOutlined', color: '#34A853' },
  voice: { icon: 'PhoneOutlined', color: '#EA4335' }
} as const;

// 🛡️ TYPES ULTRA-STRICTS
export interface OrganizationStats {
  totalUsers: number;
  totalRoles: number;
  activeModules: number;
  activeCrmModules?: number;
  googleWorkspaceEnabled: boolean;
}

export interface OrganizationModule {
  id: string;
  key: string;
  label: string;
  feature: string;
  icon: string;
  isActiveForOrg?: boolean;
}

export interface ApiClient {
  get: (url: string) => Promise<{ data: unknown }>;
}

export interface OrganizationOptimized {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  googleWorkspaceDomain?: string;
  googleWorkspaceEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  stats: OrganizationStats;
  googleWorkspaceModules: OrganizationModule[];
}

// 🚀 UTILITAIRES PERFORMANCE
export const isCrmModule = (moduleKey: string): boolean => {
  return !GOOGLE_MODULE_KEYS.includes(moduleKey as typeof GOOGLE_MODULE_KEYS[number]);
};

export const isGoogleModule = (moduleKey: string): boolean => {
  return GOOGLE_MODULE_KEYS.includes(moduleKey as typeof GOOGLE_MODULE_KEYS[number]);
};

export const formatOrganizationName = (name: string, maxLength = 30): string => {
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};

export const formatDescription = (description: string | undefined, maxLength = 50): string => {
  if (!description) return '';
  return description.length > maxLength 
    ? `${description.substring(0, maxLength)}...` 
    : description;
};

// 🎨 CACHE DES ICÔNES (PERFORMANCE)
export const getCachedCrmIcon = (moduleKey: string) => {
  return CRM_MODULE_ICONS[moduleKey as keyof typeof CRM_MODULE_ICONS] || 
         { icon: 'AppstoreOutlined', color: '#666' };
};

export const getCachedGoogleIcon = (moduleKey: string) => {
  return GOOGLE_MODULE_ICONS[moduleKey as keyof typeof GOOGLE_MODULE_ICONS] || 
         { icon: 'AppstoreOutlined', color: '#666' };
};

// 🔄 DEBOUNCE POUR RECHERCHE (PERFORMANCE)
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

// 📊 CALCULS OPTIMISÉS
export const calculateModuleStats = (modules: OrganizationModule[]): {
  total: number;
  active: number;
  crmOnly: number;
  googleOnly: number;
} => {
  const crmModules = modules.filter(m => isCrmModule(m.key));
  const googleModules = modules.filter(m => isGoogleModule(m.key));
  
  return {
    total: modules.length,
    active: modules.filter(m => m.isActiveForOrg || false).length,
    crmOnly: crmModules.filter(m => m.isActiveForOrg || false).length,
    googleOnly: googleModules.filter(m => m.isActiveForOrg || false).length
  };
};

// 🎯 VALIDATION RAPIDE
export const validateOrganizationData = (data: Record<string, unknown>): boolean => {
  return !!(data.name && typeof data.name === 'string' && data.name.trim().length >= 2);
};

// 🚀 PRÉCHARGEMENT INTELLIGENT
export const preloadCriticalData = async (api: ApiClient, organizationIds: string[]) => {
  const promises = organizationIds.map(id => 
    api.get(`/modules?organizationId=${id}`).catch(() => ({ data: [] }))
  );
  
  return Promise.all(promises);
};

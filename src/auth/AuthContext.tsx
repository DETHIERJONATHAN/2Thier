import { createContext, useContext } from 'react';
import { AuthUser } from './user';
import { AuthOrganization } from './organization';
import { Permission } from './permissions';
import { RoleName } from './role';
import { ModuleAccess } from './modules';

export interface AuthContextType {
  user: AuthUser | null;
  originalUser: AuthUser | null;
  organizations: AuthOrganization[];
  currentOrganization: AuthOrganization | null;
  permissions: Permission[];
  modules: ModuleAccess[];
  loading: boolean;
  refresh: () => Promise<void>;
  refetchUser: () => Promise<void>;
  refreshModules: () => Promise<void>;
  isSuperAdmin: boolean;
  userRole: RoleName | null;
  selectedOrganization: AuthOrganization | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isImpersonating: boolean;
  setImpersonation: (user: AuthUser, organization: AuthOrganization) => void;
  clearImpersonation: () => void;
  can: (permission: string) => boolean;
  selectOrganization: (organizationId: string | null) => Promise<void>;
  api: {
    get: <T = unknown>(url: string) => Promise<T>;
    post: <T = unknown, B = unknown>(url: string, body: B) => Promise<T>;
    put: <T = unknown, B = unknown>(url: string, body: B) => Promise<T>;
    patch: <T = unknown, B = unknown>(url: string, body: B) => Promise<T>;
    delete: <T = unknown>(url: string) => Promise<T>;
  };
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

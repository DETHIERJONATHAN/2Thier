// Types principaux pour l'application CRM

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  UserOrganization?: UserOrganization[];
  organizationRole?: Role;
  userOrganizationId?: string;
  key?: string; // Pour Ant Design Table
}

export interface Role {
  id: string;
  name: string;
  label: string;
  description?: string;
  organizationId: string | null; // null pour les rôles globaux
  createdAt?: string;
  updatedAt?: string;
  // Relations
  Organization?: Organization;
}

export interface Organization {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
  // Relations
  User?: User;
  Organization?: Organization;
  Role?: Role;
}

export interface UserService {
  id: string;
  userId: string;
  serviceName: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  roleId: string;
  inviterId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  Organization?: Organization;
  Role?: Role;
  Inviter?: User;
}

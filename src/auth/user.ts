// Types et helpers pour l'utilisateur
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  address?: string;
  phoneNumber?: string;
  vatNumber?: string;
  role: string; // Rôle global (ex: 'super_admin')
  status?: string;
  isSuperAdmin?: boolean; // compat héritée
  // Renommé pour correspondre à la réponse de l'API Prisma
  UserOrganization?: {
    id: string; // ID de la table de liaison UserOrganization
    Organization: { // Notez la majuscule, comme dans Prisma
      id: string;
      name: string;
      activeModules?: number; // ajout pour compat écran droits
      moduleCount?: number;
    };
    Role: { // Notez la majuscule, comme dans Prisma
      id: string;
      name: string;
      label: string;
    };
    status: string;
    organizationId: string; // Ajout pour la clé de mapping
  }[];
}

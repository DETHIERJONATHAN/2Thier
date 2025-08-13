// Configuration centralisée des rôles et permissions
export const rolesConfig = {
  super_admin: {
    pages: ['*'],
    modules: ['*'],
  },
  admin: {
    pages: ['Accueil', 'Blocs Bâtiment', 'Leads'],
    modules: ['blocks', 'leads'],
  },
  manager: {
    pages: ['Accueil', 'Leads'],
    modules: ['leads'],
  },
  commercial: {
    pages: ['Accueil', 'Leads'],
    modules: ['leads'],
  },
  support: {
    pages: ['Accueil'],
    modules: [],
  },
  client: {
    pages: ['Accueil'],
    modules: [],
  },
  prestataire: {
    pages: ['Accueil'],
    modules: [],
  },
};

export type UserRole = keyof typeof rolesConfig;

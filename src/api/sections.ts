// API pour la gestion des sections de modules

export interface ModuleSectionData {
  id?: string;
  title: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  order: number;
  organizationId: string;
}

export interface ModuleSectionResponse {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  order: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export const defaultSections: Omit<ModuleSectionData, 'organizationId'>[] = [
  {
    title: 'Administration',
    description: 'Modules, Rôles, Utilisateurs, Permissions, Synthèse des droits, Organisations, Telnyx',
    icon: 'UserSwitchOutlined',
    iconColor: '#f5222d',
    order: 1
  },
  {
    title: 'Formulaires',
    description: 'Bloc',
    icon: 'FormOutlined', 
    iconColor: '#52c41a',
    order: 2
  },
  {
    title: 'Outils Techniques',
    description: 'Gestion des Tableaux',
    icon: 'ToolOutlined',
    iconColor: '#fa8c16',
    order: 3
  },
  {
    title: 'Google Workspace',
    description: 'Google Gmail, Google Drive, Google Meet, Google Docs, Google Sheets, Google Voice, Google Agenda',
    icon: 'GoogleOutlined',
    iconColor: '#4285f4',
    order: 4
  },
  {
    title: 'Devis1Minute - Admin',
    description: 'Campagnes, Analytics, Formulaires Publics, Landing Pages',
    icon: 'RocketOutlined',
    iconColor: '#722ed1',
    order: 5
  },
  {
    title: 'Devis1Minute',
    description: 'Marketplace, Portail Partenaire, Mes Leads, Facturation',
    icon: 'RocketOutlined',
    iconColor: '#ff7a00',
    order: 6
  },
  {
    title: 'Autres Modules',
    description: 'Dashboard, Techniques, Clients, Agenda, Devis, Facturation, Leads, Mail, Profile, Settings',
    icon: 'AppstoreOutlined',
    iconColor: '#13c2c2',
    order: 7
  }
];

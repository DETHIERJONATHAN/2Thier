// Types pour la gestion des leads
export interface Lead {
  id: string;
  organizationId: string;
  assignedToId?: string;
  status: string;
  name?: string; // champ utilisé largement dans les pages legacy
  // Données JSON flexibles : on passe à any pour éviter la cascade d'erreurs "unknown" dans le code UI legacy.
  // TODO: Remonter vers un type structuré (LeadData) une fois le build stabilisé.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>; // JSON data from database (assoupli)
  createdAt: string;
  updatedAt: string;
  source?: string;
  statusId?: string;
  company?: string;
  email?: string;
  firstName?: string;
  lastContactDate?: Date;
  lastName?: string;
  leadNumber?: string;
  linkedin?: string;
  nextFollowUpDate?: Date;
  notes?: string;
  phone?: string;
  website?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  leadStatus?: LeadStatus | null;
  nextFollowUp?: string;
  lastContact?: string;
  priorityIA?: number;
  notificationColor?: string;
}

export interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadSource {
  value: string;
  label: string;
}

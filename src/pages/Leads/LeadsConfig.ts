// Types et configurations pour la gestion des leads

import type { LeadData } from '../../types/leads';

/**
 * Type pour un lead
 */
export interface Lead {
  id: string;
  status: string;
  createdAt: string;
  assignedToId: string | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  data?: LeadData;
  source?: string;
  organizationId: string;
}

/**
 * Valeur moyenne estimée par lead (en euros)
 */
export const LEAD_AVERAGE_VALUE = 1250;

/**
 * Statuts disponibles pour les leads
 */
export const LEAD_STATUSES = [
  { value: 'new', label: 'Nouveau', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacté', color: 'bg-yellow-500' },
  { value: 'meeting_scheduled', label: 'RDV Programmé', color: 'bg-purple-500' },
  { value: 'quote_sent', label: 'Devis Envoyé', color: 'bg-orange-500' },
  { value: 'negotiation', label: 'En Négociation', color: 'bg-pink-500' },
  { value: 'won', label: 'Gagné', color: 'bg-green-500' },
  { value: 'lost', label: 'Perdu', color: 'bg-red-500' },
  { value: 'installation', label: 'Installation', color: 'bg-indigo-500' },
  { value: 'completed', label: 'Terminé', color: 'bg-green-700' },
];

/**
 * Sources possibles pour les leads
 */
export const LEAD_SOURCES = [
  { value: 'direct', label: 'Direct' },
  { value: 'website', label: 'Site Web' },
  { value: 'referral', label: 'Recommandation' },
  { value: 'bobex', label: 'Bobex' },
  { value: 'solvari', label: 'Solvari' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'email', label: 'Email' },
  { value: 'manual', label: 'Manuel' },
  { value: 'other', label: 'Autre' },
];

/**
 * Priorités des leads
 */
export const LEAD_PRIORITIES = [
  { value: 'low', label: 'Basse', color: 'bg-blue-200' },
  { value: 'medium', label: 'Moyenne', color: 'bg-yellow-200' },
  { value: 'high', label: 'Haute', color: 'bg-orange-200' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-200' },
];

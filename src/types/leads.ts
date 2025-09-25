// Types pour la gestion des leads
export interface LeadAddress {
  street?: string;
  line1?: string;
  postalCode?: string;
  zip?: string;
  city?: string;
  country?: string;
  [key: string]: unknown;
}

export type StringArrayLike = string | string[] | null | undefined;

export interface LeadContact {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emails?: StringArrayLike;
  phone?: string;
  phones?: StringArrayLike;
  mobile?: string;
  company?: string;
  address?: LeadAddress | string | null;
  addresses?: Array<LeadAddress | string> | null;
  [key: string]: unknown;
}

export interface LeadOrganization {
  name?: string;
  [key: string]: unknown;
}

export interface LeadCustomer {
  name?: string;
  company?: string;
  [key: string]: unknown;
}

export interface LeadCompanyContact {
  name?: string;
  [key: string]: unknown;
}

export type LeadEmails = StringArrayLike;
export type LeadPhones = StringArrayLike;

import type { ApiEnvelope } from '../utils/apiResponse';

export interface Lead {
  id: string;
  organizationId: string;
  assignedToId?: string;
  status: string;
  name?: string; // champ utilisé largement dans les pages legacy
  // Données JSON flexibles : utilise un Record générique pour conserver la souplesse sans `any`.
  data?: LeadData;
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
  contactEmail?: string;
  contactEmails?: LeadEmails;
  emails?: LeadEmails;
  phones?: LeadPhones;
  mobile?: string;
  telephone?: string;
  contact?: LeadContact | null;
  organization?: LeadOrganization | null;
  customer?: LeadCustomer | null;
  isCompany?: boolean;
  companyName?: string;
  fullName?: string;
  companyContact?: LeadCompanyContact | null;
  address?: LeadAddress | string | null;
  addresses?: Array<LeadAddress | string> | null;
}

export type LeadApiResponse = Lead | ApiEnvelope<Lead> | null;

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

export type LeadData = Record<string, unknown> & Partial<{
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: LeadAddress | string;
  addresses: Array<LeadAddress | string>;
}>;

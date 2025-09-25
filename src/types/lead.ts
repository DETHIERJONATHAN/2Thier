export interface Lead {
  id: string;
  name?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  assignedTo?: string;
  leadStatus?: string;
  createdAt: string;
  updatedAt: string;
  statusId?: string;
  organizationId: string;
  assignedToId?: string;
  notes?: string;
  website?: string;
  linkedin?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  data?: Record<string, unknown>;
}

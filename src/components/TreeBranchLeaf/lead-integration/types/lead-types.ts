/**
 * 🎯 Types TypeScript pour l'intégration Lead-TBL
 */

// Lead de base du système CRM
export interface Lead {
  id: string;
  organizationId: string;
  assignedToId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  notes?: string;
  status: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Lead formaté pour l'affichage TBL
export interface TBLLead {
  id: string;
  name: string; // firstName + lastName ou company
  email?: string;
  phone?: string;
  company?: string;
  hasSubmission: boolean; // A déjà une soumission TBL
  submissionId?: string;
  lastModified?: Date;
}

// Données pour créer un nouveau lead
export interface CreateLeadData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

// État du hook useTBLLead
export interface TBLLeadState {
  selectedLead: TBLLead | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

// Props pour les modals
export interface LeadSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelectLead: (lead: TBLLead) => void;
  currentLeadId?: string;
}

export interface LeadCreatorModalProps {
  open: boolean;
  onClose: () => void;
  onLeadCreated: (lead: TBLLead) => void;
}

// Props pour l'en-tête
export interface TreeBranchLeafLeadHeaderProps {
  selectedLead: TBLLead | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSelectLead: (lead: TBLLead) => void;
  onCreateLead: (leadData: CreateLeadData) => Promise<void>;
  disabled?: boolean;
}

// Réponse API pour la liste des leads
export interface LeadsListResponse {
  success: boolean;
  data: TBLLead[];
  error?: string;
}

// Réponse API pour la création de lead
export interface CreateLeadResponse {
  success: boolean;
  data: TBLLead;
  error?: string;
}
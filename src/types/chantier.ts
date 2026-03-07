// Types pour la gestion des chantiers (module Chantier)

export interface ChantierStatus {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    Chantier: number;
  };
}

export interface Chantier {
  id: string;
  organizationId: string;
  leadId?: string | null;
  statusId?: string | null;
  responsableId?: string | null;
  commercialId?: string | null;
  productValue: string;
  productLabel: string;
  productIcon?: string | null;
  productColor?: string | null;
  customLabel?: string | null;
  clientName?: string | null;
  siteAddress?: string | null;
  notes?: string | null;
  amount?: number | null;
  signedAt?: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  uploadedById?: string | null;
  generatedDocumentId?: string | null;
  submissionId?: string | null;
  data?: Record<string, unknown> | null;
  isValidated?: boolean;
  validatedAt?: string | null;
  validatedById?: string | null;
  validationNotes?: string | null;
  plannedDate?: string | null;
  receptionDate?: string | null;
  deliveryDate?: string | null;
  completedDate?: string | null;
  createdAt: string;
  updatedAt: string;

  // Résumé facturation (calculé côté backend)
  _invoiceSummary?: {
    total: number;      // nb factures
    paid: number;       // nb payées
    sent: number;       // nb envoyées
    overdue: number;    // nb en retard
    totalAmount: number; // montant total
    paidAmount: number;  // montant payé
  } | null;

  // Relations incluses par l'API
  Lead?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    data?: Record<string, any> | null;
  } | null;
  ChantierStatus?: ChantierStatus | null;
  Responsable?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  Commercial?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  Organization?: {
    id: string;
    name: string;
  } | null;
  GeneratedDocument?: {
    id: string;
    title?: string | null;
    documentNumber?: string | null;
    type?: string;
    status?: string;
    pdfUrl?: string | null;
    submissionId?: string | null;
    dataSnapshot?: Record<string, any> | null;
    paymentAmount?: number | null;
    createdAt?: string;
  } | null;
  TreeBranchLeafSubmission?: {
    id: string;
    treeId?: string;
    summary?: Record<string, any> | null;
    status?: string;
  } | null;
}

export interface ChantierCreatePayload {
  leadId?: string;
  statusId?: string;
  responsableId?: string;
  commercialId?: string;
  productValue: string;
  productLabel: string;
  productIcon?: string;
  productColor?: string;
  customLabel?: string;
  clientName?: string;
  siteAddress?: string;
  notes?: string;
  amount?: number;
}

export interface ChantierStatsOverview {
  total: number;
  totalAmount: number;
  byStatus: Array<{
    statusId: string | null;
    statusName: string;
    statusColor: string;
    count: number;
  }>;
  byProduct: Array<{
    productValue: string;
    count: number;
  }>;
}

// Produit enrichi (icon + color) — structure utilisée dans TBL Capacités Produit
export interface ProductOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

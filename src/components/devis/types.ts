// Types complets du système devis modularisé
export interface FieldOption {
  id: string;
  label: string;
  value?: string;
}

export interface Field {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  options?: FieldOption[];
  config?: Record<string, unknown> | null;
  advancedConfig?: Record<string, unknown> | null;
}

export interface UploadedFileValue {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface Section {
  id: string;
  name: string;
  sectionType?: string | null;
  menuFieldId?: string | null;
  order?: number;
  active?: boolean;
  fields: Field[];
}

export interface Block {
  id: string;
  name?: string;
  sections: Section[];
}

export interface LeadData {
  devis?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export interface Lead {
  id: string;
  data?: LeadData;
  name?: string;
  email?: string;
  company?: string;
}

export interface FieldUIState {
  visible: boolean;
  disabled: boolean;
  required: boolean;
}

export interface RuleFormula {
  id: string;
  sequence?: unknown;
  order?: number;
  name?: string;
  targetFieldId?: string;
}

export interface FieldRuleSets {
  validations?: Array<{
    id: string;
    type?: string;
    message?: string;
    params?: Record<string, unknown>;
  }>;
  dependencies?: Array<{
    id: string;
    name?: string;
    sequence?: unknown;
    targetFieldId?: string;
    defaultValue?: unknown;
  }>;
  formulas?: Array<RuleFormula>;
}

export interface BlockListItem {
  id: string;
  name?: string;
}

export interface LeadLite {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

export function isWrapped<T>(x: unknown): x is { success: boolean; data: T } {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  return 'data' in obj;
}

export function isUploadedFileValue(v: unknown): v is UploadedFileValue {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.name === 'string' && typeof obj.dataUrl === 'string';
}

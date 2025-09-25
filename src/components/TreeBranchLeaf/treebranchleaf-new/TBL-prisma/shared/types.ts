// Types génériques pour toutes les opérations TBL

export interface TBLReference {
  ref: string;
  kind: 'nodeValue' | 'formula' | 'condition' | 'table' | 'variable';
}

export interface TBLToken {
  type: 'reference' | 'operator' | 'literal' | 'function';
  value?: string | number;
  ref?: string;
  kind?: string;
}

export interface TBLCalculationResult {
  detail: Record<string, unknown>;
  result: string;
  value?: number | string;
  hasError?: boolean;
  errorMessage?: string;
}

export interface TBLContext {
  submissionId: string;
  labelMap: Map<string, string>;
  valueMap: Map<string, unknown>;
  organizationId: string;
  userId: string;
}

export interface TBLNode {
  id: string;
  fieldLabel?: string;
  displayName?: string;
  value?: unknown;
  sourceRef?: string;
  isVariable?: boolean;
}
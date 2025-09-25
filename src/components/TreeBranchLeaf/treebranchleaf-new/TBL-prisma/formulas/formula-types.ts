import { TBLToken, TBLCalculationResult, TBLReference } from '../shared/types';

// Types spécifiques aux formules
export interface FormulaToken extends TBLToken {
  // Extension des tokens de base pour formules
  precision?: number;
  unit?: string;
}

export interface FormulaDefinition {
  id: string;
  name: string;
  description?: string;
  tokens: FormulaToken[];
  nodeId?: string;
  unit?: string;
  precision?: number;
}

export interface FormulaCalculationStep {
  stepNumber: number;
  operation: string;
  leftOperand: {
    label: string;
    value: number | string;
    raw: unknown;
  };
  operator?: string;
  rightOperand?: {
    label: string;
    value: number | string;
    raw: unknown;
  };
  result: number | string;
  expression: string;
}

export interface FormulaEvaluationResult extends TBLCalculationResult {
  steps: FormulaCalculationStep[];
  finalValue: number | string;
  unit?: string;
  precision?: number;
  hasNumericResult: boolean;
  referencesResolved: Array<{
    ref: string;
    label: string;
    value: unknown;
    resolved: boolean;
  }>;
}
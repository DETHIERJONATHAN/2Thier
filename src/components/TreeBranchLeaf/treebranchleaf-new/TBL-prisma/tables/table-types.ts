import { TBLCalculationResult } from '../shared/types';

// Types spécifiques aux tableaux
export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'formula' | 'condition';
  width?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface TableRow {
  id: string;
  cells: Record<string, TableCell>;
  isHeader?: boolean;
}

export interface TableCell {
  id: string;
  value: unknown;
  formula?: string;
  condition?: string;
  calculatedValue?: number | string;
  displayValue?: string;
}

export interface TableDefinition {
  id: string;
  name: string;
  description?: string;
  columns: TableColumn[];
  rows: TableRow[];
  calculations?: {
    totals?: boolean;
    averages?: boolean;
    customFormulas?: string[];
  };
}

export interface TableEvaluationResult extends TBLCalculationResult {
  processedRows: number;
  calculatedCells: number;
  aggregations: Record<string, number | string>;
  tableDisplay: string;
}
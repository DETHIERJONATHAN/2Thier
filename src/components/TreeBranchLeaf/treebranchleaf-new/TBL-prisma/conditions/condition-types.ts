import { TBLReference, TBLCalculationResult } from '../shared/types';

// Types spécifiques aux conditions
export interface ConditionOperator {
  type: 'isNotEmpty' | 'isEmpty' | 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
  displayText: string;
}

export interface BinaryCondition {
  id: string;
  op: string;
  left: TBLReference;
  right?: unknown;
  type: 'binary';
}

export interface ConditionAction {
  id: string;
  type: 'SHOW' | 'HIDE' | 'CALCULATE';
  nodeIds: string[];
}

export interface ConditionBranch {
  id: string;
  when: BinaryCondition;
  label: string;
  actions: ConditionAction[];
}

export interface ConditionSet {
  id: string;
  mode: 'first-match' | 'all-match';
  tokens: unknown[];
  branches: ConditionBranch[];
  fallback: {
    id: string;
    label: string;
    actions: ConditionAction[];
  };
}

export interface ConditionDefinition {
  id: string;
  name: string;
  type: 'condition';
  nodeId: string;
  description?: string;
  conditionSet: ConditionSet;
}

export interface ConditionEvaluationResult extends TBLCalculationResult {
  branchUsed: 'ALORS' | 'SINON';
  conditionValue: boolean;
  conditionExpression: string;
  actionsExecuted: string[];
}
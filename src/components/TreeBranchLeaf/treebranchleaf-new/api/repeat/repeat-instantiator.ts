import type { RepeatBlueprint } from './repeat-blueprint-builder.js';

/**
 * Pure planning helpers that translate a repeat blueprint into deterministic
 * IDs. The resulting plan can be consumed by any executor (legacy router,
 * server action, background worker) without re-deriving naming rules.
 */

export interface InstantiationOptions {
  suffix: string | number;
  targetParentId?: string | null;
  includeTotals?: boolean;
  perTemplateSuffixes?: Record<string, number>;
}

export interface NodeCopyPlan {
  templateNodeId: string;
  newNodeId: string;
  plannedSuffix: string | number;
}

export interface VariableCopyPlan {
  templateVariableId: string;
  targetNodeId: string;
  plannedVariableId: string;
  plannedSuffix: string | number;
}

export interface RepeatInstantiationPlan {
  nodes: NodeCopyPlan[];
  variables: VariableCopyPlan[];
  totalField?: {
    plannedVariableId: string;
    plannedDisplayNodeId: string;
    plannedSuffix: string | number;
  };
}

/**
 * Produces the full list of node/variable IDs that should exist once the
 * repeater duplication finishes. The executor can iterate over the plan and
 * call the existing copy helpers in a stable order.
 */
export function createInstantiationPlan(
  blueprint: RepeatBlueprint,
  options: InstantiationOptions
): RepeatInstantiationPlan {
  const { suffix, perTemplateSuffixes } = options;
  const resolveSuffix = (templateNodeId: string): string | number => {
    if (perTemplateSuffixes && perTemplateSuffixes[templateNodeId] !== undefined) {
      return perTemplateSuffixes[templateNodeId];
    }
    return suffix;
  };

  const nodes: NodeCopyPlan[] = blueprint.templateNodeIds.map(templateNodeId => {
    const nodeSuffix = resolveSuffix(templateNodeId);
    return {
      templateNodeId,
      plannedSuffix: nodeSuffix,
      newNodeId: `${templateNodeId}-${nodeSuffix}`
    };
  });

  const variables: VariableCopyPlan[] = blueprint.variables.map(variable => {
    // 🔧 CRITICAL FIX: Check if this is a linked variable that should target a specific template node
    // For linked variables, primaryTargetNodeId specifies which template node should receive the copy
    // For direct variables, primaryTargetNodeId is undefined, so we fallback to variable.nodeId
    // 
    // WHY THIS MATTERS:
    // - Orientation-inclinaison is linked to BOTH Inclinaison and Orientation templates
    // - We need TWO copies: one attached to Inclinaison-1, one to Orientation-1
    // - primaryTargetNodeId tells us which template this copy is for
    const targetTemplateNodeId = (variable as any).primaryTargetNodeId || variable.nodeId;
    const variableSuffix = resolveSuffix(targetTemplateNodeId);
    // Make planned variable IDs unique per (variable, target node) to avoid collisions when
    // a single variable is linked to multiple templates. This keeps the execution plan stable
    // and prevents clashes such as var-1 being reused for two different target nodes.
    const plannedVariableId = `${variable.variableId}-${targetTemplateNodeId}-${variableSuffix}`;
    const plannedTargetNodeId = `${targetTemplateNodeId}-${variableSuffix}`;
    
    return {
      templateVariableId: variable.variableId,
      plannedSuffix: variableSuffix,
      targetNodeId: plannedTargetNodeId,  // ← NOW uses the template node that REFERENCES the variable
      plannedVariableId
    };
  });

  let totalFieldPlan: RepeatInstantiationPlan['totalField'];
  if (options.includeTotals && blueprint.totalField) {
    totalFieldPlan = {
      plannedSuffix: suffix,
      plannedVariableId: `${blueprint.totalField.targetVariableId ?? 'total'}-${suffix}`,
      plannedDisplayNodeId: `${blueprint.totalField.targetDisplayNodeId ?? 'display-total'}-${suffix}`
    };
  }

  return {
    nodes,
    variables,
    totalField: totalFieldPlan
  };
}

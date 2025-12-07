import type { PrismaClient } from '@prisma/client';
import { buildBlueprintForRepeater, type RepeatBlueprint } from './repeat-blueprint-builder.js';
import { createInstantiationPlan, type RepeatInstantiationPlan } from './repeat-instantiator.js';
import { computeTemplateCopySuffixMax, createSuffixAllocator } from './utils/suffix-utils.js';

export interface RepeatDuplicationOptions {
  suffix?: string | number;
  includeTotals?: boolean;
  targetParentId?: string | null;
  scopeId?: string;
}

export interface RepeatDuplicationResult {
  repeaterNodeId: string;
  suffix: string | number;
  scopeId: string;
  blueprint: RepeatBlueprint;
  plan: RepeatInstantiationPlan;
}

export interface RepeatExecutionOperation {
  type: 'node-copy' | 'variable-copy';
  templateId: string;
  targetId: string;
}

export interface RepeatExecutionResult extends RepeatDuplicationResult {
  status: 'pending-execution';
  operations: RepeatExecutionOperation[];
}

export class RepeatOperationError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'RepeatOperationError';
    this.status = status;
    this.details = details;
  }
}

const makeScopeId = (repeaterNodeId: string, suffix: string | number): string => {
  const trimmedSuffix = typeof suffix === 'string' ? suffix.trim() : String(suffix);
  return `${repeaterNodeId}:${trimmedSuffix}`;
};

const ensureSuffix = (maybeSuffix?: string | number): string | number => {
  if (maybeSuffix !== undefined && maybeSuffix !== null && `${maybeSuffix}`.trim()) {
    return maybeSuffix;
  }
  return Date.now();
};

/**
 * Builds the blueprint and prepares an instantiation plan without touching the
 * legacy repeater routes. Execution of the plan will be handled by a dedicated
 * service in the next iteration.
 */
export async function planRepeatDuplication(
  prisma: PrismaClient,
  repeaterNodeId: string,
  options: RepeatDuplicationOptions = {}
): Promise<RepeatDuplicationResult> {
  if (!repeaterNodeId) {
    throw new RepeatOperationError('Missing repeaterNodeId in request path.', 400);
  }

  const blueprint = await buildBlueprintForRepeater(prisma, repeaterNodeId);
  if (!blueprint) {
    throw new RepeatOperationError(`No blueprint available for repeater ${repeaterNodeId}.`, 404);
  }
  if (!blueprint.templateNodeIds?.length) {
    throw new RepeatOperationError(
      `Repeater ${repeaterNodeId} does not reference any template nodes.`,
      422
    );
  }

  const repeaterNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterNodeId },
    select: { treeId: true }
  });
  if (!repeaterNode) {
    throw new RepeatOperationError(`Repeater ${repeaterNodeId} was not found.`, 404);
  }

  let forcedNumericSuffix: number | null = null;
  if (options.suffix !== undefined && options.suffix !== null && `${options.suffix}`.trim()) {
    const parsed = Number(options.suffix);
    if (!Number.isFinite(parsed)) {
      throw new RepeatOperationError('Repeat suffix must be numeric when provided.', 422);
    }
    forcedNumericSuffix = parsed;
  }

  const suffix = forcedNumericSuffix ?? ensureSuffix(undefined);
  const scopeId = options.scopeId?.trim() || makeScopeId(repeaterNodeId, suffix);

  let perTemplateSuffixes: Record<string, number> | undefined;
  if (blueprint.templateNodeIds.length) {
    if (forcedNumericSuffix !== null) {
      perTemplateSuffixes = Object.fromEntries(
        blueprint.templateNodeIds.map(id => [id, forcedNumericSuffix!])
      );
    } else {
      const existingMax = await computeTemplateCopySuffixMax(
        prisma,
        repeaterNode.treeId,
        blueprint.templateNodeIds
      );
      
      const globalMax = existingMax.size > 0 ? Math.max(...existingMax.values()) : 0;
      const nextSuffix = globalMax + 1;
      console.log(`Global max: ${globalMax}, Prochain suffixe: ${nextSuffix}`);
      perTemplateSuffixes = {};
      for (const templateId of blueprint.templateNodeIds) {
        perTemplateSuffixes[templateId] = nextSuffix;
      }
    }
  }

  const plan = createInstantiationPlan(blueprint, {
    suffix,
    includeTotals: options.includeTotals ?? true,
    targetParentId: options.targetParentId ?? null,
    perTemplateSuffixes
  });

  return {
    repeaterNodeId,
    suffix,
    scopeId,
    blueprint,
    plan
  };
}

/**
 * Builds the deterministic execution queue for a repeater duplication. This does not
 * mutate the database yet; instead it returns the operations that an executor should
 * perform (node copies followed by variable copies). Keeping the logic here prevents
 * routes from duplicating the ordering rules.
 */
export async function executeRepeatDuplication(
  prisma: PrismaClient,
  repeaterNodeId: string,
  options: RepeatDuplicationOptions = {}
): Promise<RepeatExecutionResult> {
  console.log(`[repeat-service] 🔄 executeRepeatDuplication called for ${repeaterNodeId}`, { options });
  try {
    const planned = await planRepeatDuplication(prisma, repeaterNodeId, options);
    console.log(`[repeat-service] ✅ Plan created successfully`);

    console.log(`\n🔥 [repeat-service] PLANNED VARIABLES:`, JSON.stringify(planned.plan.variables.slice(0, 2), null, 2));
    const operations: RepeatExecutionOperation[] = [
      ...planned.plan.nodes.map(nodePlan => ({
        type: 'node-copy' as const,
        templateId: nodePlan.templateNodeId,
        targetId: nodePlan.newNodeId
      })),
      ...planned.plan.variables.map(variablePlan => ({
        type: 'variable-copy' as const,
        templateId: variablePlan.templateVariableId,
        targetId: variablePlan.plannedVariableId
      }))
    ];

    console.log(`[repeat-service] Operations count: ${operations.length} (nodes: ${planned.plan.nodes.length}, variables: ${planned.plan.variables.length})`);
    return {
      ...planned,
      status: 'pending-execution',
      operations
    };
  } catch (error) {
    console.error(`[repeat-service] ❌ ERROR in executeRepeatDuplication:`, error instanceof Error ? error.stack : String(error));
    throw error;
  }
}

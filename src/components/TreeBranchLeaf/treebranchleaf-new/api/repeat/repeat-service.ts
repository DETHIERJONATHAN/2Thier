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
    // 🔴 FILTRE CRITIQUE: Nettoyer les IDs suffixés avant de calculer les suffixes
    // Les templateNodeIds ne doivent contenir que des UUIDs purs
    const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;
    const cleanedTemplateIds = blueprint.templateNodeIds
      .filter(id => typeof id === 'string' && !!id)
      .map(id => id.replace(/(-\d+)+$/, '')) // Retirer les suffixes
      .filter((id, idx, arr) => arr.indexOf(id) === idx) // Dédupliquer
      .filter(id => !hasCopySuffix.test(id)); // Vérification finale
    
    if (blueprint.templateNodeIds.length !== cleanedTemplateIds.length) {
      console.log(`🧹 [repeat-service] NETTOYAGE des templateNodeIds:`);
      console.log(`   Avant: ${blueprint.templateNodeIds.length} IDs`);
      console.log(`   Après: ${cleanedTemplateIds.length} IDs`);
      blueprint.templateNodeIds.forEach((id, idx) => {
        const cleaned = id.replace(/(-\d+)+$/, '');
        if (id !== cleaned) {
          console.log(`      "${id}" → "${cleaned}"`);
        }
      });
    }
    
    if (forcedNumericSuffix !== null) {
      perTemplateSuffixes = Object.fromEntries(
        cleanedTemplateIds.map(id => [id, forcedNumericSuffix!])
      );
    } else {
      const existingMax = await computeTemplateCopySuffixMax(
        prisma,
        repeaterNode.treeId,
        cleanedTemplateIds  // ← Utiliser les IDs nettoyés
      );
      
      const globalMax = existingMax.size > 0 ? Math.max(...existingMax.values()) : 0;
      const nextSuffix = globalMax + 1;
      console.log(`📊 [repeat-service] Calcul du suffixe:`);
      console.log(`   Max existant: ${globalMax}`);
      console.log(`   ➡️  Prochain suffixe: ${nextSuffix}`);
      perTemplateSuffixes = {};
      for (const templateId of cleanedTemplateIds) {
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

  // 🔐 Guard: éviter duplication si une duplication récente (par le même repeater) a déjà été créée
  try {
    const now = new Date();
    const recentWindowMs = 10000; // 10 secondes
    const lookback = new Date(now.getTime() - recentWindowMs);
    // Nettoyer les template IDs
    const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)+$/i;
    const cleanedTemplateIds = planned.blueprint.templateNodeIds
      .filter(id => typeof id === 'string' && !!id)
      .map(id => id.replace(/(-\d+)+$/, ''))
      .filter((id, idx, arr) => arr.indexOf(id) === idx)
      .filter(id => !hasCopySuffix.test(id));

    const recentCopies = await prisma.treeBranchLeafNode.findMany({
      where: {
        duplicatedFromRepeater: repeaterNodeId,
        createdAt: { gt: lookback },
        metadata: {
          path: ['sourceTemplateId'],
          in: cleanedTemplateIds
        }
      },
      select: { id: true }
    });

    if (recentCopies.length > 0) {
      console.warn(`[repeat-service] Duplicate protection: a recent duplication was detected for repeater ${repeaterNodeId}. Aborting duplicate run.`);
      return {
        ...planned,
        status: 'pending-execution',
        operations: []
      } as any;
    }
  } catch (e) {
    console.warn('[repeat-service] duplicate guard failed, proceeding with execution', (e as Error).message);
  }
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

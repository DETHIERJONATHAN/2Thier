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

  // 🔴 FILTRE CRITIQUE: Nettoyer les IDs suffixés avant de calculer les suffixes
  // Les templateNodeIds ne doivent contenir que des UUIDs purs
  const cleanedTemplateIds = blueprint.templateNodeIds
    .filter(id => typeof id === 'string' && !!id)
    .map(id => id.replace(/(-\d+)+$/, '')) // Retirer les suffixes
    .filter((id, idx, arr) => arr.indexOf(id) === idx); // Dédupliquer
  
  const needsCleaning = blueprint.templateNodeIds.length !== cleanedTemplateIds.length;
  
  if (needsCleaning) {
    console.log(`🧹 [repeat-service] NETTOYAGE DES IDs DÉTECTÉ:`);
    console.log(`   Avant: ${blueprint.templateNodeIds.length} IDs`);
    console.log(`   Après: ${cleanedTemplateIds.length} IDs`);
    blueprint.templateNodeIds.forEach((id, idx) => {
      const cleaned = id.replace(/(-\d+)+$/, '');
      if (id !== cleaned) {
        console.log(`      "${id}" → "${cleaned}"`);
      }
    });
  }

  // ⚠️ IMPORTANT : NE JAMAIS modifier metadata.repeater.templateNodeIds dans la base !
  // Les IDs dans metadata doivent TOUJOURS rester les IDs originaux (sans suffixes)
  // On utilise seulement cleanedTemplateIds en mémoire pour calculer les suffixes

  let actualSuffix: number;
  let perTemplateSuffixes: Record<string, number>;

  if (options.suffix) {
    const parsed = parseInt(String(options.suffix), 10);
    if (Number.isNaN(parsed)) {
      throw new RepeatOperationError('Repeat suffix must be numeric when provided.', 422);
    }
    actualSuffix = parsed;
    perTemplateSuffixes = Object.fromEntries(
      cleanedTemplateIds.map(id => [id, actualSuffix])
    );
  } else {
    // Calculer automatiquement le prochain suffix séquentiel
    const existingMax = await computeTemplateCopySuffixMax(
      prisma,
      repeaterNode.treeId,
      cleanedTemplateIds
    );
    
    const globalMax = existingMax.size > 0 ? Math.max(...existingMax.values()) : 0;
    actualSuffix = globalMax + 1;
    
    console.log(`📊 [repeat-service] Calcul du suffixe (execute)`);
    console.log(`   Templates évalués: ${cleanedTemplateIds.length}`);
    cleanedTemplateIds.forEach(id => {
      const mx = existingMax.get(id) ?? 0;
      console.log(`   - ${id} => max ${mx}`);
    });
    console.log(`   Max global: ${globalMax}`);
    console.log(`   ➡️  Prochain suffixe appliqué à tous: ${actualSuffix}`);
    
    perTemplateSuffixes = {};
    for (const templateId of cleanedTemplateIds) {
      perTemplateSuffixes[templateId] = actualSuffix;
    }
  }

  const scopeId = options.scopeId?.trim() || makeScopeId(repeaterNodeId, actualSuffix);

  // 🔧 FIX CRITIQUE: Mettre à jour blueprint.templateNodeIds avec les IDs nettoyés
  // avant de créer le plan, sinon le plan recevra des IDs vides/pollués
  blueprint.templateNodeIds = cleanedTemplateIds;

  const plan = createInstantiationPlan(blueprint, {
    suffix: actualSuffix,
    includeTotals: options.includeTotals ?? true,
    targetParentId: options.targetParentId ?? null,
    perTemplateSuffixes
  });

  return {
    repeaterNodeId,
    suffix: actualSuffix,
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

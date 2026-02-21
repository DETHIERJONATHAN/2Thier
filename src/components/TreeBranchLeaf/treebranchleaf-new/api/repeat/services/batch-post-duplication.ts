/**
 * 🚀 Batch post-duplication processing
 * 
 * Replaces 5 individual per-node services that each did N × (findUnique + update)
 * with a single findMany + N × update approach.
 * 
 * Combines:
 * - enforceStrictIsolation      (was: N × findUnique + 2 × update)
 * - resetCalculatedValuesAfterCopy (was: findMany + updateMany)
 * - forceIndependentCalculation  (was: N × findUnique + update)
 * - createRecalculationTriggers  (was: N × findUnique + update)
 * - blockFallbackToOriginalValues (was: N × findUnique + update)
 * 
 * Also removes verifyIsolation (was logging-only, no side effects).
 * 
 * Net effect: ~560 queries → ~71 queries for 70 nodes.
 */

import { type PrismaClient } from '@prisma/client';

export interface BatchPostDuplicationResult {
  processedCount: number;
  hasTableFixCount: number;
  errors: Array<{ nodeId: string; error: string }>;
}

export async function batchPostDuplicationProcessing(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<BatchPostDuplicationResult> {
  const result: BatchPostDuplicationResult = {
    processedCount: 0,
    hasTableFixCount: 0,
    errors: []
  };

  if (copiedNodeIds.length === 0) return result;

  const now = new Date().toISOString();
  const triggerTimestamp = Date.now();

  // 1. Single findMany to load all nodes + their tables (replaces ~280 individual findUnique)
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: copiedNodeIds } },
    include: {
      TreeBranchLeafNodeTable: { select: { id: true } }
    }
  });

  // 2. For each node, compute ALL metadata changes in memory and write ONCE
  for (const node of nodes) {
    try {
      const currentMetadata = (node.metadata && typeof node.metadata === 'object')
        ? (node.metadata as Record<string, unknown>)
        : {};

      // Combined metadata from all 5 services (applied in original order):
      const combinedMetadata: Record<string, unknown> = {
        ...currentMetadata,
        // From enforceStrictIsolation:
        strictlyIsolated: true,
        isolatedAt: now,
        calculatedValueReset: true,
        independentCalculation: true,
        // From forceIndependentCalculation:
        lastForceRecalc: now,
        forceIndependentCalc: true,
        requiresFreshCalculation: true,
        calculationInvalidated: triggerTimestamp,
        // From createRecalculationTriggers:
        recalcTrigger: triggerTimestamp,
        mustRecalculate: true,
        independentNode: true,
        noFallbackToOriginal: true,
        // From blockFallbackToOriginalValues:
        blockFallbackToOriginal: true,
        enforceIndependentCalculation: true,
        lastAntiFactbackUpdate: now,
        calculationIsolationLevel: 'STRICT',
      };

      // Build update data
      const updateData: Record<string, unknown> = {
        calculatedValue: null,
        calculatedAt: null,
        metadata: combinedMetadata,
      };

      // From enforceStrictIsolation: fix hasTable if no tables found
      if (node.hasTable && (!node.TreeBranchLeafNodeTable || node.TreeBranchLeafNodeTable.length === 0)) {
        updateData.hasTable = false;
        result.hasTableFixCount++;
      }

      await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: updateData,
      });

      result.processedCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ nodeId: node.id, error: errorMsg });
      console.error(`[BATCH-POST-DUP] Error for ${node.id}:`, errorMsg);
    }
  }

  return result;
}

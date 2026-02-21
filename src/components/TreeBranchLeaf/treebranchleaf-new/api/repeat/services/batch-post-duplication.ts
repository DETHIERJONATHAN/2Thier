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

  // 2. Build all updates in memory, then execute as a single $transaction
  const updateOps = [];
  for (const node of nodes) {
    try {
      const currentMetadata = (node.metadata && typeof node.metadata === 'object')
        ? (node.metadata as Record<string, unknown>)
        : {};

      const combinedMetadata: Record<string, unknown> = {
        ...currentMetadata,
        strictlyIsolated: true,
        isolatedAt: now,
        calculatedValueReset: true,
        independentCalculation: true,
        lastForceRecalc: now,
        forceIndependentCalc: true,
        requiresFreshCalculation: true,
        calculationInvalidated: triggerTimestamp,
        recalcTrigger: triggerTimestamp,
        mustRecalculate: true,
        independentNode: true,
        noFallbackToOriginal: true,
        blockFallbackToOriginal: true,
        enforceIndependentCalculation: true,
        lastAntiFactbackUpdate: now,
        calculationIsolationLevel: 'STRICT',
      };

      const updateData: Record<string, unknown> = {
        calculatedValue: null,
        calculatedAt: null,
        metadata: combinedMetadata,
      };

      if (node.hasTable && (!node.TreeBranchLeafNodeTable || node.TreeBranchLeafNodeTable.length === 0)) {
        updateData.hasTable = false;
        result.hasTableFixCount++;
      }

      updateOps.push(
        prisma.treeBranchLeafNode.update({
          where: { id: node.id },
          data: updateData,
        })
      );
      result.processedCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ nodeId: node.id, error: errorMsg });
    }
  }

  // Execute all updates in a single transaction (1 round-trip instead of N)
  if (updateOps.length > 0) {
    try {
      await prisma.$transaction(updateOps);
    } catch (txError) {
      // Fallback: try individually if transaction fails
      for (const op of updateOps) {
        try { await op; } catch (e) {
          console.error(`[BATCH-POST-DUP] Individual update failed:`, (e as Error).message);
        }
      }
    }
  }

  return result;
}

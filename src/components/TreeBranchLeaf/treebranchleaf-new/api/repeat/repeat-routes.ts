import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { planRepeatDuplication, executeRepeatDuplication, RepeatOperationError } from './repeat-service.js';
import { runRepeatExecution } from './repeat-executor.js';
import type { MinimalReq } from './services/shared-helpers.js';
import { authenticateToken } from '../../../../../middleware/auth';

interface RepeatRequestBody {
  suffix?: string | number;
  includeTotals?: boolean;
  targetParentId?: string | null;
  scopeId?: string;
}

export default function createRepeatRouter(prisma: PrismaClient) {
  const router = Router();

  // Guard serveur (in-memory) : empÃƒÂªche deux exÃƒÂ©cutions concurrentes pour le mÃƒÂªme repeater.
  // Objectif: ÃƒÂ©viter les doubles exÃƒÂ©cutions "1 clic => 2 requÃƒÂªtes" qui crÃƒÂ©ent -1 puis -2.
  // Ce guard ne bloque pas les clics suivants une fois la requÃƒÂªte terminÃƒÂ©e.
  const inFlightExecuteByRepeater = new Set<string>();

  router.use(authenticateToken);

  router.post('/:repeaterNodeId/instances', async (req, res) => {
    const { repeaterNodeId } = req.params;
    const body = (req.body || {}) as RepeatRequestBody;

    try {
      const result = await planRepeatDuplication(prisma, repeaterNodeId, {
        suffix: body.suffix,
        includeTotals: body.includeTotals,
        targetParentId: body.targetParentId,
        scopeId: body.scopeId
      });

      return res.status(200).json({
        status: 'planned',
        repeaterNodeId,
        scopeId: result.scopeId,
        suffix: result.suffix,
        plan: result.plan,
        blueprint: result.blueprint
      });
    } catch (error) {
      if (error instanceof RepeatOperationError) {
        return res.status(error.status).json({
          error: error.message,
          details: error.details ?? null
        });
      }
      console.error('[repeat-route] Unable to plan duplication', error);
      return res.status(500).json({
        error: 'Failed to plan repeat duplication.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  router.post('/:repeaterNodeId/instances/execute', async (req, res) => {
    const { repeaterNodeId } = req.params;
    const body = (req.body || {}) as RepeatRequestBody;

    if (inFlightExecuteByRepeater.has(repeaterNodeId)) {
      return res.status(409).json({
        error: 'Repeat execution already in progress for this repeater.',
        details: 'Another request is currently duplicating this repeater. Please retry in a moment.'
      });
    }

    inFlightExecuteByRepeater.add(repeaterNodeId);

    try {
      const executionPlan = await executeRepeatDuplication(prisma, repeaterNodeId, {
        suffix: body.suffix,
        includeTotals: body.includeTotals,
        targetParentId: body.targetParentId,
        scopeId: body.scopeId
      });

      const executionSummary = await runRepeatExecution(
        prisma,
        req as unknown as MinimalReq,
        executionPlan
      );

      return res.status(201).json({
        status: 'completed',
        repeaterNodeId,
        scopeId: executionPlan.scopeId,
        suffix: executionPlan.suffix,
        operations: executionPlan.operations,
        plan: executionPlan.plan,
        blueprint: executionPlan.blueprint,
        duplicated: executionSummary.duplicated,
        nodes: executionSummary.nodes,
        count: executionSummary.count,
        debug: executionSummary.debug
      });
    } catch (error) {
      if (error instanceof RepeatOperationError) {
        return res.status(error.status).json({
          error: error.message,
          details: error.details ?? null
        });
      }
      // Log stack to help debugging in development (improves visibility of 500s)
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      console.error('[repeat-route] Unable to execute duplication', stack);
      return res.status(500).json({
        error: 'Failed to execute repeat duplication.',
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      inFlightExecuteByRepeater.delete(repeaterNodeId);
    }
  });

  return router;
}

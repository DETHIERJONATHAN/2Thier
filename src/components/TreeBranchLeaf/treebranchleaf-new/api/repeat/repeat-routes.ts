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

  /**
   * ⚡ POST /api/repeat/:repeaterId/preload-copies
   * 
   * Pré-charge automatiquement des copies d'un repeater en fonction d'un nombre cible.
   * Si l'utilisateur veut 3 copies et qu'il y en a déjà 1 (la base), on crée 2 copies.
   * Fonctionne exactement comme si on cliquait N fois sur le bouton repeat.
   * 
   * Body: { targetCount: number }
   * - targetCount: Nombre total de copies souhaitées (ex: 3 = 1 original + 2 copies)
   */
  router.post('/:repeaterId/preload-copies', async (req, res) => {
    try {
      const { repeaterId } = req.params;
      const { targetCount } = (req.body || {}) as { targetCount?: number };
      
      console.log(`⚡ [PRELOAD] Démarrage pré-chargement pour repeater ${repeaterId}, cible: ${targetCount}`);
      
      if (typeof targetCount !== 'number' || targetCount < 1) {
        return res.status(400).json({ error: 'targetCount doit être un nombre >= 1' });
      }
      
      // 1. Récupérer le nœud repeater
      const repeaterNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: repeaterId },
        select: { 
          id: true, 
          parentId: true, 
          treeId: true, 
          type: true,
          metadata: true 
        }
      });
      
      if (!repeaterNode) {
        return res.status(404).json({ error: 'Repeater non trouvé' });
      }
      
      if (repeaterNode.type !== 'leaf_repeater') {
        return res.status(400).json({ error: 'Le nœud spécifié n\'est pas un repeater' });
      }
      
      // 2. Compter les copies existantes (nœuds avec ce repeater comme rootOriginalId dans metadata.copyOf)
      const existingCopies = await prisma.treeBranchLeafNode.count({
        where: {
          treeId: repeaterNode.treeId,
          metadata: {
            path: ['copyOf', 'rootOriginalId'],
            equals: repeaterId
          }
        }
      });
      
      // 3. Calculer combien de copies créer: targetCount - 1 (l'original) - existingCopies
      const copiesToCreate = Math.max(0, targetCount - 1 - existingCopies);
      
      console.log(`⚡ [PRELOAD] Copies existantes: ${existingCopies}, à créer: ${copiesToCreate}`);
      
      if (copiesToCreate === 0) {
        return res.json({ 
          success: true, 
          message: 'Aucune copie à créer',
          existingCopies: existingCopies + 1, // +1 pour l'original
          createdCopies: 0,
          totalCopies: existingCopies + 1
        });
      }
      
      // 4. Créer les copies séquentiellement EN UTILISANT LA MÊME LOGIQUE QUE LE BOUTON REPEAT
      const createdNodes: string[] = [];
      
      for (let i = 0; i < copiesToCreate; i++) {
        console.log(`⚡ [PRELOAD] Exécution repeat ${i + 1}/${copiesToCreate}...`);
        
        try {
          // Utiliser executeRepeatDuplication + runRepeatExecution comme le bouton
          const executionPlan = await executeRepeatDuplication(prisma, repeaterId, {});
          
          const executionSummary = await runRepeatExecution(
            prisma,
            req as unknown as MinimalReq,
            executionPlan
          );
          
          if (executionSummary.duplicated?.newId) {
            createdNodes.push(executionSummary.duplicated.newId);
            console.log(`⚡ [PRELOAD] Copie ${i + 1} créée: ${executionSummary.duplicated.newId}`);
          }
        } catch (execError) {
          console.error(`⚡ [PRELOAD] Erreur création copie ${i + 1}:`, execError);
          // Continuer avec les autres copies
        }
      }
      
      console.log(`✅ [PRELOAD] Pré-chargement terminé: ${createdNodes.length} copies créées`);
      
      res.json({
        success: true,
        message: `${createdNodes.length} copies créées`,
        existingCopies: existingCopies + 1,
        createdCopies: createdNodes.length,
        totalCopies: existingCopies + 1 + createdNodes.length,
        newNodeIds: createdNodes
      });
      
    } catch (error) {
      console.error('❌ [PRELOAD] Erreur:', error);
      res.status(500).json({ error: 'Erreur lors du pré-chargement des copies' });
    }
  });

  return router;
}

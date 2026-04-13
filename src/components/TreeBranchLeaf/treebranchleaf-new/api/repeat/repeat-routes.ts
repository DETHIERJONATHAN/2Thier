import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { planRepeatDuplication, executeRepeatDuplication, RepeatOperationError } from './repeat-service.js';
import { runRepeatExecution } from './repeat-executor.js';
import type { MinimalReq } from './services/shared-helpers.js';
import { authenticateToken } from '../../../../../middleware/auth';
import { updateSumDisplayFieldAfterCopyChange } from '../sum-display-field-routes.js';
import { invalidateTriggerIndexCache } from '../../../tbl-bridge/routes/tbl-submission-evaluator.js';
import { logger } from '../../../../../lib/logger';

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
      logger.error('[repeat-route] Unable to plan duplication', error);
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

      // 🔥 FIX CACHE-STALE: Invalider le trigger index cache après la duplication repeat.
      // Sans cela, les display fields copiés (ex: display-uuid-1) ne sont PAS dans le
      // trigger index → changer un champ dans l'instance repeat ne déclenche PAS le recalcul
      // des display fields correspondants. Le cache a un TTL de 60s, mais l'utilisateur
      // remplit les champs immédiatement après le repeat → cache stale → pas de calcul.
      invalidateTriggerIndexCache();

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
      logger.error('[repeat-route] Unable to execute duplication', stack);
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
   * - targetCount: Nombre total souhaité (ex: 3 = 1 original + 2 copies)
   * - Si targetCount < total actuel, les copies excédentaires sont SUPPRIMÉES (les plus récentes d'abord)
   */
  router.post('/:repeaterId/preload-copies', async (req, res) => {
    try {
      const { repeaterId } = req.params;
      const { targetCount } = (req.body || {}) as { targetCount?: number };
      
      // logger.debug(`⚡ [PRELOAD] Démarrage pour repeater ${repeaterId}, cible: ${targetCount}`);
      
      if (typeof targetCount !== 'number' || targetCount < 1) {
        return res.status(400).json({ error: 'targetCount doit être un nombre >= 1' });
      }
      
      // 1. Récupérer le nœud repeater avec ses templateNodeIds
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
      
      // 2. Extraire les templateNodeIds depuis metadata.repeater.templateNodeIds
      const metadata = repeaterNode.metadata as { repeater?: { templateNodeIds?: string[] } } | null;
      const templateNodeIds = metadata?.repeater?.templateNodeIds || [];
      
      if (templateNodeIds.length === 0) {
        return res.status(400).json({ error: 'Aucun templateNodeIds configuré pour ce repeater' });
      }
      
      // logger.debug(`⚡ [PRELOAD] Templates: ${templateNodeIds.join(', ')}`);
      
      // 3. Trouver les copies existantes (IDs suffixés comme templateId-1, templateId-2...)
      // On utilise la même logique que suffix-utils.ts
      const orStartsWith = templateNodeIds.map(templateId => ({ id: { startsWith: `${templateId}-` } }));
      
      const allCopies = await prisma.treeBranchLeafNode.findMany({
        where: {
          treeId: repeaterNode.treeId,
          OR: orStartsWith
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      });
      
      // Extraire les suffixes uniques (ex: -1, -2, -3)
      const suffixSet = new Set<number>();
      for (const copy of allCopies) {
        for (const templateId of templateNodeIds) {
          if (copy.id.startsWith(`${templateId}-`)) {
            const rest = copy.id.slice(templateId.length + 1);
            if (/^\d+$/.test(rest)) {
              suffixSet.add(Number(rest));
            }
            break;
          }
        }
      }
      
      const existingSuffixes = Array.from(suffixSet).sort((a, b) => a - b);
      const existingCopiesCount = existingSuffixes.length;
      const totalCurrentInstances = existingCopiesCount + 1; // +1 pour l'original
      
      // logger.debug(`⚡ [PRELOAD] Suffixes existants: [${existingSuffixes.join(', ')}] (total: ${totalCurrentInstances})`);
      
      // 4. Calculer les actions nécessaires
      const copiesToCreate = Math.max(0, targetCount - totalCurrentInstances);
      const copiesToDelete = Math.max(0, totalCurrentInstances - targetCount);
      
      // logger.debug(`⚡ [PRELOAD] À créer: ${copiesToCreate}, à supprimer: ${copiesToDelete}`);
      
      const createdNodes: string[] = [];
      const deletedNodes: string[] = [];
      
      // 5. SUPPRESSION des copies excédentaires (les plus récentes = suffixes les plus élevés)
      if (copiesToDelete > 0) {
        // Prendre les N suffixes les plus élevés pour les supprimer
        const suffixesToDelete = existingSuffixes.slice(-copiesToDelete);
        
        // logger.debug(`🗑️ [PRELOAD] Suppression des suffixes: [${suffixesToDelete.join(', ')}]`);
        
        for (const suffix of suffixesToDelete) {
          // Trouver TOUS les nœuds avec ce suffixe (templates + display nodes + autres)
          const nodesToDeleteForSuffix = await prisma.treeBranchLeafNode.findMany({
            where: {
              treeId: repeaterNode.treeId,
              id: { endsWith: `-${suffix}` }
            },
            select: { id: true }
          });
          
          // logger.debug(`🗑️ [PRELOAD] Suffixe -${suffix}: ${nodesToDeleteForSuffix.length} nœuds à supprimer`);
          
          for (const node of nodesToDeleteForSuffix) {
            try {
              // logger.debug(`🗑️ [PRELOAD] Suppression ${node.id}...`);
              await deleteNodeWithCascade(prisma, repeaterNode.treeId, node.id);
              deletedNodes.push(node.id);
            } catch (deleteError) {
              // Peut échouer si déjà supprimé par cascade, c'est OK
              logger.warn(`⚠️ [PRELOAD] Node ${node.id} peut-être déjà supprimé:`, (deleteError as Error).message);
            }
          }
        }
      }
      
      // 5b. NETTOYAGE: Supprimer les SubmissionData orphelines des nœuds supprimés
      // + Mettre à jour les champs sum-total
      if (deletedNodes.length > 0) {
        try {
          const deletedSD = await prisma.treeBranchLeafSubmissionData.deleteMany({
            where: { nodeId: { in: deletedNodes } }
          });
          if (deletedSD.count > 0) {
            // logger.debug(`🧹 [PRELOAD] ${deletedSD.count} entrée(s) SubmissionData orpheline(s) supprimée(s)`);
          }
        } catch (sdErr) {
          logger.warn(`⚠️ [PRELOAD] Erreur nettoyage SubmissionData:`, (sdErr as Error).message);
        }

        // Mettre à jour les champs sum-total impactés
        try {
          const remainingNodes = await prisma.treeBranchLeafNode.findMany({
            where: { treeId: repeaterNode.treeId },
            select: { id: true, metadata: true }
          });
          for (const node of remainingNodes) {
            const meta = node.metadata as Record<string, unknown> | null;
            if (meta?.isSumDisplayField === true && meta?.sourceNodeId) {
              updateSumDisplayFieldAfterCopyChange(String(meta.sourceNodeId), prisma).catch(err => {
                logger.warn(`[PRELOAD] Erreur mise à jour champ Total ${node.id}:`, err);
              });
            }
          }
        } catch (sumErr) {
          logger.warn(`⚠️ [PRELOAD] Erreur mise à jour sum-total:`, (sumErr as Error).message);
        }
      }

      // 6. CRÉATION des copies manquantes
      if (copiesToCreate > 0) {
        for (let i = 0; i < copiesToCreate; i++) {
          // logger.debug(`⚡ [PRELOAD] Création copie ${i + 1}/${copiesToCreate}...`);
          
          try {
            const executionPlan = await executeRepeatDuplication(prisma, repeaterId, {});
            
            const executionSummary = await runRepeatExecution(
              prisma,
              req as unknown as MinimalReq,
              executionPlan
            );
            
            if (executionSummary.duplicated?.newId) {
              createdNodes.push(executionSummary.duplicated.newId);
              // logger.debug(`✅ [PRELOAD] Copie créée: ${executionSummary.duplicated.newId}`);
            }
          } catch (execError) {
            logger.error(`❌ [PRELOAD] Erreur création copie ${i + 1}:`, execError);
          }
        }
      }
      
      const finalTotal = totalCurrentInstances + createdNodes.length - (copiesToDelete > 0 ? copiesToDelete : 0);
      
      // logger.debug(`✅ [PRELOAD] Terminé: ${createdNodes.length} créées, ${deletedNodes.length} supprimées, total: ${finalTotal}`);
      
      res.json({
        success: true,
        message: `${createdNodes.length} créées, ${deletedNodes.length} supprimées`,
        existingCopies: totalCurrentInstances,
        createdCopies: createdNodes.length,
        deletedCopies: deletedNodes.length,
        totalCopies: finalTotal,
        newNodeIds: createdNodes,
        deletedNodeIds: deletedNodes
      });
      
    } catch (error) {
      logger.error('❌ [PRELOAD] Erreur:', error);
      res.status(500).json({ error: 'Erreur lors du pré-chargement des copies' });
    }
  });

  return router;
}

/**
 * Supprime un nœud avec cascade (même logique que DELETE /trees/:treeId/nodes/:nodeId)
 */
async function deleteNodeWithCascade(prisma: PrismaClient, treeId: string, nodeId: string): Promise<void> {
  // Charger tous les nœuds de l'arbre pour calculer la sous-arborescence
  const allNodes = await prisma.treeBranchLeafNode.findMany({ 
    where: { treeId },
    select: { id: true, parentId: true }
  });
  
  const childrenByParent = new Map<string, string[]>();
  for (const n of allNodes) {
    if (!n.parentId) continue;
    const arr = childrenByParent.get(n.parentId) || [];
    arr.push(n.id);
    childrenByParent.set(n.parentId, arr);
  }
  
  // Collecter tous les descendants (BFS)
  const toDelete: string[] = [];
  const queue: string[] = [nodeId];
  const depth = new Map<string, number>();
  depth.set(nodeId, 0);
  
  while (queue.length) {
    const cur = queue.shift()!;
    toDelete.push(cur);
    const children = childrenByParent.get(cur) || [];
    for (const c of children) {
      depth.set(c, (depth.get(cur) || 0) + 1);
      queue.push(c);
    }
  }
  
  // Supprimer en partant des feuilles (profondeur décroissante)
  toDelete.sort((a, b) => (depth.get(b)! - depth.get(a)!));
  
  // Suppression transactionnelle
  await prisma.$transaction(async (tx) => {
    for (const id of toDelete) {
      try {
        await tx.treeBranchLeafNode.delete({ where: { id } });
      } catch (err) {
        // Ignorer si déjà supprimé
        logger.warn(`[PRELOAD DELETE] Node ${id} peut-être déjà supprimé`);
      }
    }
  });
}

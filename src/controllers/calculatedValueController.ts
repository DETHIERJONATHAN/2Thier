/**
 * 🎯 Contrôleur pour gérer les valeurs calculées
 * 
 * GET  /api/tree-nodes/:nodeId/calculated-value
 * POST /api/tree-nodes/:nodeId/store-calculated-value
 * POST /api/tree-nodes/store-batch-calculated-values
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/tree-nodes/:nodeId/calculated-value
 * 
 * Récupère la valeur calculée stockée dans Prisma
 */
router.get('/:nodeId/calculated-value', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { _submissionId } = req.query;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId requis' });
    }

    // 🎯 Chercher le nœud et récupérer sa valeur calculée
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: {
        id: nodeId
      },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        metadata: true,
        calculatedAt: true,
        calculatedBy: true,
        type: true,
        fieldType: true
      }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }
    // 🎯 Si le nœud courant n'a pas de valeur calculée mais qu'il est une copie
    // (metadata.copiedFromNodeId) -> retourner la valeur du noeud original
    try {
      const meta = (node as any).metadata as any;
      if ((node.calculatedValue === null || node.calculatedValue === undefined || node.calculatedValue === '') && meta?.copiedFromNodeId) {
        let origId = meta.copiedFromNodeId;
        if (typeof origId === 'string' && origId.trim().startsWith('[')) {
          try { origId = JSON.parse(origId)[0]; } catch { /* ignore */ }
        }
        if (Array.isArray(origId) && origId.length > 0) origId = origId[0];
        if (origId) {
          const originalNode = await prisma.treeBranchLeafNode.findUnique({ where: { id: String(origId) }, select: { id: true, label: true, calculatedValue: true, calculatedAt: true, calculatedBy: true, type: true, fieldType: true } });
          if (originalNode) {
            return res.json({
              success: true,
              nodeId: originalNode.id,
              label: originalNode.label,
              value: originalNode.calculatedValue,
              calculatedAt: originalNode.calculatedAt,
              calculatedBy: originalNode.calculatedBy,
              type: originalNode.type,
              fieldType: originalNode.fieldType
            });
          }
        }
      }
    } catch (metaErr) {
      console.warn('[CalculatedValueController] error checking copiedFromNodeId fallback', metaErr);
    }

    // ✅ Retourner la valeur calculée du Nœud (par défaut)
    return res.json({
      success: true,
      nodeId: node.id,
      label: node.label,
      value: node.calculatedValue,
      calculatedAt: node.calculatedAt,
      calculatedBy: node.calculatedBy,
      type: node.type,
      fieldType: node.fieldType
    });
  } catch (error) {
    console.error('[CalculatedValueController] GET erreur:', error);
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/tree-nodes/:nodeId/store-calculated-value
 * 
 * Stocke une valeur calculée dans le nœud
 */
router.post('/:nodeId/store-calculated-value', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { calculatedValue, calculatedBy, submissionId } = req.body;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId requis' });
    }

    if (calculatedValue === undefined) {
      return res.status(400).json({ error: 'calculatedValue requis' });
    }

    // 🎯 Mettre à jour le nœud avec la valeur calculée
    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        calculatedValue: String(calculatedValue),
        calculatedAt: new Date(),
        calculatedBy: calculatedBy || 'unknown'
      },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      }
    });

    console.log('✅ [CalculatedValueController] Valeur stockée:', {
      nodeId,
      calculatedValue,
      calculatedBy,
      submissionId
    });

    return res.json({
      success: true,
      nodeId: updated.id,
      calculatedValue: updated.calculatedValue,
      calculatedAt: updated.calculatedAt,
      calculatedBy: updated.calculatedBy
    });
  } catch (error) {
    console.error('[CalculatedValueController] POST erreur:', error);
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * BATCH POST /api/tree-nodes/store-batch-calculated-values
 * 
 * Stocke plusieurs valeurs calculées à la fois
 * Utile après une soumission de formulaire complet
 */
router.post('/store-batch-calculated-values', async (req: Request, res: Response) => {
  try {
    const { values, submissionId } = req.body;

    if (!Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'values doit être un tableau non-vide' });
    }

    // 🎯 Mettre à jour tous les nœuds
    const results = [];
    for (const { nodeId, calculatedValue, calculatedBy } of values) {
      if (!nodeId) continue;

      try {
        const updated = await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: {
            calculatedValue: String(calculatedValue),
            calculatedAt: new Date(),
            calculatedBy: calculatedBy || 'unknown'
          }
        });

        results.push({
          nodeId,
          success: true,
          calculatedValue: updated.calculatedValue
        });
      } catch (err) {
        results.push({
          nodeId,
          success: false,
          error: String(err)
        });
      }
    }

    console.log('✅ [CalculatedValueController] BATCH stockage:', {
      submissionId,
      total: values.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return res.json({
      success: true,
      results,
      submissionId
    });
  } catch (error) {
    console.error('[CalculatedValueController] BATCH POST erreur:', error);
    return res.status(500).json({ error: String(error) });
  }
});

export default router;

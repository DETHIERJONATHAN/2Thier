/**
 * 🚀 TBL Batch Routes - Endpoints optimisés pour le chargement en masse
 * 
 * Ces routes remplacent les dizaines d'appels individuels par quelques requêtes batch.
 * Cela réduit drastiquement le nombre de requêtes HTTP et accélère le chargement de ~80%
 */

import { Router } from 'express';
import { db } from '../lib/database';

const router = Router();

// Type pour le contexte d'authentification
interface AuthContext {
  organizationId?: string | null;
  isSuperAdmin?: boolean;
}

// Helper pour extraire le contexte d'auth
function getAuthCtx(req: { user?: { organizationId?: string; isSuperAdmin?: boolean } }): AuthContext {
  return {
    organizationId: req.user?.organizationId || null,
    isSuperAdmin: req.user?.isSuperAdmin || false
  };
}

/**
 * GET /api/tbl/batch/trees/:treeId/formulas
 * 
 * Récupère TOUTES les formules de TOUS les noeuds d'un tree en UNE SEULE requête
 * Remplace les ~50 appels à /nodes/:nodeId/formulas
 */
router.get('/trees/:treeId/formulas', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as any);

    // Vérifier l'accès au tree
    const treeWhereFilter = isSuperAdmin || !organizationId 
      ? { id: treeId } 
      : { id: treeId, organizationId };
    
    const tree = await db.treeBranchLeafTree.findFirst({ where: treeWhereFilter });
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Récupérer tous les nodeIds de ce tree
    const nodes = await db.treeBranchLeafNode.findMany({
      where: { treeId },
      select: { id: true }
    });
    const nodeIds = nodes.map(n => n.id);

    // Récupérer toutes les formules de tous ces noeuds EN UNE REQUÊTE
    const allFormulas = await db.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: { in: nodeIds } },
      orderBy: { createdAt: 'asc' }
    });

    // Grouper par nodeId pour faciliter l'utilisation côté client
    const formulasByNode: Record<string, typeof allFormulas> = {};
    for (const formula of allFormulas) {
      if (!formulasByNode[formula.nodeId]) {
        formulasByNode[formula.nodeId] = [];
      }
      formulasByNode[formula.nodeId].push(formula);
    }

    return res.json({
      success: true,
      treeId,
      totalFormulas: allFormulas.length,
      nodesWithFormulas: Object.keys(formulasByNode).length,
      formulasByNode
    });
  } catch (error) {
    console.error('[TBL Batch API] Error batch fetching formulas:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération batch des formules' });
  }
});

/**
 * GET /api/tbl/batch/trees/:treeId/calculated-values
 * 
 * Récupère TOUTES les valeurs calculées stockées pour un tree
 * Remplace les ~30 appels à /tree-nodes/:nodeId/calculated-value
 */
router.get('/trees/:treeId/calculated-values', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { leadId } = req.query;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as any);

    // Vérifier l'accès au tree
    const treeWhereFilter = isSuperAdmin || !organizationId 
      ? { id: treeId } 
      : { id: treeId, organizationId };
    
    const tree = await db.treeBranchLeafTree.findFirst({ where: treeWhereFilter });
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Récupérer tous les nodes de ce tree avec leurs valeurs calculées
    const nodes = await db.treeBranchLeafNode.findMany({
      where: { treeId },
      select: { 
        id: true, 
        fieldType: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      }
    });

    // Si un leadId est fourni, récupérer aussi les valeurs de la submission
    let submissionValues: Record<string, unknown> = {};
    if (leadId && typeof leadId === 'string') {
      const submission = await db.tBLSubmission.findFirst({
        where: { 
          treeId,
          leadId 
        },
        orderBy: { updatedAt: 'desc' }
      });
      if (submission?.formData && typeof submission.formData === 'object') {
        submissionValues = submission.formData as Record<string, unknown>;
      }
    }

    // Construire le résultat indexé par nodeId
    const valuesByNode: Record<string, {
      calculatedValue: unknown;
      calculatedAt: Date | null;
      calculatedBy: string | null;
      submissionValue?: unknown;
    }> = {};

    for (const node of nodes) {
      // Inclure le noeud s'il a une valeur calculée OU une valeur dans la submission
      if (node.calculatedValue !== null || submissionValues[node.id] !== undefined) {
        valuesByNode[node.id] = {
          calculatedValue: node.calculatedValue,
          calculatedAt: node.calculatedAt,
          calculatedBy: node.calculatedBy,
          submissionValue: submissionValues[node.id]
        };
      }
    }

    return res.json({
      success: true,
      treeId,
      leadId: leadId || null,
      totalValues: Object.keys(valuesByNode).length,
      valuesByNode
    });
  } catch (error) {
    console.error('[TBL Batch API] Error batch fetching calculated values:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération batch des valeurs calculées' });
  }
});

/**
 * GET /api/tbl/batch/trees/:treeId/select-configs
 * 
 * Récupère TOUTES les configurations de select (options) pour un tree
 * Remplace les ~20 appels à /nodes/:nodeId/select-config
 */
router.get('/trees/:treeId/select-configs', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as any);

    // Vérifier l'accès au tree
    const treeWhereFilter = isSuperAdmin || !organizationId 
      ? { id: treeId } 
      : { id: treeId, organizationId };
    
    const tree = await db.treeBranchLeafTree.findFirst({ where: treeWhereFilter });
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // Récupérer les noeuds de type select/radio/checkbox avec leurs options
    const selectNodes = await db.treeBranchLeafNode.findMany({
      where: { 
        treeId,
        OR: [
          { fieldType: 'select' },
          { fieldType: 'radio' },
          { fieldType: 'checkbox' },
          { fieldType: 'multi-select' },
          { fieldType: { contains: 'select' } }
        ]
      },
      select: {
        id: true,
        fieldType: true,
        select_options: true,
        select_sourceType: true,
        select_sourceTableId: true,
        select_sourceColumn: true,
        select_displayColumn: true,
        table_lookupConfig: true
      }
    });

    // Construire le résultat indexé par nodeId
    const configsByNode: Record<string, {
      fieldType: string | null;
      options: unknown;
      sourceType: string | null;
      sourceTableId: string | null;
      sourceColumn: string | null;
      displayColumn: string | null;
      lookupConfig: unknown;
    }> = {};

    for (const node of selectNodes) {
      configsByNode[node.id] = {
        fieldType: node.fieldType,
        options: node.select_options,
        sourceType: node.select_sourceType,
        sourceTableId: node.select_sourceTableId,
        sourceColumn: node.select_sourceColumn,
        displayColumn: node.select_displayColumn,
        lookupConfig: node.table_lookupConfig
      };
    }

    return res.json({
      success: true,
      treeId,
      totalSelectFields: Object.keys(configsByNode).length,
      configsByNode
    });
  } catch (error) {
    console.error('[TBL Batch API] Error batch fetching select configs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération batch des configs select' });
  }
});

/**
 * GET /api/tbl/batch/trees/:treeId/all
 * 
 * 🚀 SUPER BATCH : Récupère TOUT en une seule requête !
 * - Formules
 * - Valeurs calculées  
 * - Configs de select
 */
router.get('/trees/:treeId/all', async (req, res) => {
  try {
    const { treeId } = req.params;
    const { leadId } = req.query;
    const { organizationId, isSuperAdmin } = getAuthCtx(req as any);

    // Vérifier l'accès au tree
    const treeWhereFilter = isSuperAdmin || !organizationId 
      ? { id: treeId } 
      : { id: treeId, organizationId };
    
    const tree = await db.treeBranchLeafTree.findFirst({ where: treeWhereFilter });
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // 🚀 Exécuter toutes les requêtes en parallèle pour max perf
    const [nodes, allFormulas, submission] = await Promise.all([
      // 1. Tous les nodes
      db.treeBranchLeafNode.findMany({
        where: { treeId },
        select: { 
          id: true, 
          fieldType: true,
          calculatedValue: true,
          calculatedAt: true,
          calculatedBy: true,
          select_options: true,
          select_sourceType: true,
          select_sourceTableId: true,
          select_sourceColumn: true,
          select_displayColumn: true,
          table_lookupConfig: true
        }
      }),
      // 2. Toutes les formules
      db.treeBranchLeafNodeFormula.findMany({
        where: { 
          node: { treeId }
        },
        orderBy: { createdAt: 'asc' }
      }),
      // 3. Submission si leadId
      leadId && typeof leadId === 'string'
        ? db.tBLSubmission.findFirst({
            where: { treeId, leadId },
            orderBy: { updatedAt: 'desc' }
          })
        : Promise.resolve(null)
    ]);

    // Construire les maps de résultats
    const formulasByNode: Record<string, typeof allFormulas> = {};
    for (const formula of allFormulas) {
      if (!formulasByNode[formula.nodeId]) {
        formulasByNode[formula.nodeId] = [];
      }
      formulasByNode[formula.nodeId].push(formula);
    }

    const submissionValues = (submission?.formData && typeof submission.formData === 'object')
      ? submission.formData as Record<string, unknown>
      : {};

    const valuesByNode: Record<string, {
      calculatedValue: unknown;
      calculatedAt: Date | null;
      calculatedBy: string | null;
      submissionValue?: unknown;
    }> = {};

    const configsByNode: Record<string, {
      fieldType: string | null;
      options: unknown;
      sourceType: string | null;
      sourceTableId: string | null;
      sourceColumn: string | null;
      displayColumn: string | null;
      lookupConfig: unknown;
    }> = {};

    for (const node of nodes) {
      // Valeurs calculées
      if (node.calculatedValue !== null || submissionValues[node.id] !== undefined) {
        valuesByNode[node.id] = {
          calculatedValue: node.calculatedValue,
          calculatedAt: node.calculatedAt,
          calculatedBy: node.calculatedBy,
          submissionValue: submissionValues[node.id]
        };
      }

      // Configs select
      const isSelectType = ['select', 'radio', 'checkbox', 'multi-select'].includes(node.fieldType || '')
        || (node.fieldType || '').includes('select');
      
      if (isSelectType) {
        configsByNode[node.id] = {
          fieldType: node.fieldType,
          options: node.select_options,
          sourceType: node.select_sourceType,
          sourceTableId: node.select_sourceTableId,
          sourceColumn: node.select_sourceColumn,
          displayColumn: node.select_displayColumn,
          lookupConfig: node.table_lookupConfig
        };
      }
    }

    return res.json({
      success: true,
      treeId,
      leadId: leadId || null,
      stats: {
        totalNodes: nodes.length,
        totalFormulas: allFormulas.length,
        nodesWithFormulas: Object.keys(formulasByNode).length,
        nodesWithValues: Object.keys(valuesByNode).length,
        selectFields: Object.keys(configsByNode).length
      },
      formulasByNode,
      valuesByNode,
      configsByNode
    });
  } catch (error) {
    console.error('[TBL Batch API] Error super batch fetching:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération batch complète' });
  }
});

export default router;

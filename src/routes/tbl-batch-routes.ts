/**
 * 🚀 TBL Batch Routes - Endpoints optimisés pour le chargement en masse
 * 
 * Ces routes remplacent les dizaines d'appels individuels par quelques requêtes batch.
 * Cela réduit drastiquement le nombre de requêtes HTTP et accélère le chargement de ~80%
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';

const router = Router();

// Type pour le contexte d'authentification
interface AuthContext {
  organizationId?: string | null;
  isSuperAdmin?: boolean;
}

// Helper pour extraire le contexte d'auth de façon robuste
function getAuthCtx(req: Request): AuthContext {
  const user = (req as any).user;
  return {
    organizationId: user?.organizationId || null,
    isSuperAdmin: user?.isSuperAdmin || false
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
      // D'abord trouver la submission
      const submission = await db.treeBranchLeafSubmission.findFirst({
        where: { 
          treeId,
          leadId 
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true }
      });
      
      // Puis récupérer toutes les valeurs via TreeBranchLeafSubmissionData
      if (submission?.id) {
        const submissionData = await db.treeBranchLeafSubmissionData.findMany({
          where: { submissionId: submission.id },
          select: { nodeId: true, value: true }
        });
        
        for (const data of submissionData) {
          if (data.value !== null) {
            submissionValues[data.nodeId] = data.value;
          }
        }
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
        // Utiliser la relation pour les configs avancées
        TreeBranchLeafSelectConfig: {
          select: {
            optionsSource: true,
            tableReference: true,
            keyColumn: true,
            displayColumn: true
          }
        }
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
    }> = {};

    for (const node of selectNodes) {
      const selectConfig = node.TreeBranchLeafSelectConfig;
      configsByNode[node.id] = {
        fieldType: node.fieldType,
        options: node.select_options,
        sourceType: selectConfig?.optionsSource || null,
        sourceTableId: selectConfig?.tableReference || null,
        sourceColumn: selectConfig?.keyColumn || null,
        displayColumn: selectConfig?.displayColumn || null
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
router.get('/trees/:treeId/all', async (req: Request, res: Response) => {
  const { treeId } = req.params;
  console.log(`[TBL Batch API] /all called for treeId: ${treeId}`);
  
  try {
    const { leadId } = req.query;
    const { organizationId, isSuperAdmin } = getAuthCtx(req);
    console.log(`[TBL Batch API] Auth context: org=${organizationId}, superAdmin=${isSuperAdmin}`);

    // Vérifier l'accès au tree
    const treeWhereFilter = isSuperAdmin || !organizationId 
      ? { id: treeId } 
      : { id: treeId, organizationId };
    
    const tree = await db.treeBranchLeafTree.findFirst({ where: treeWhereFilter });
    if (!tree) {
      return res.status(404).json({ error: 'Arbre non trouvé' });
    }

    // 🚀 Exécuter toutes les requêtes en parallèle pour max perf
    // D'abord récupérer les nodes pour avoir leurs IDs
    const nodes = await db.treeBranchLeafNode.findMany({
      where: { treeId },
      select: { 
        id: true, 
        fieldType: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true,
        select_options: true,
        // Inclure la config select si elle existe (relation 1-1)
        TreeBranchLeafSelectConfig: {
          select: {
            optionsSource: true,
            tableReference: true,
            displayColumn: true,
            keyColumn: true,
            valueColumn: true
          }
        }
      }
    });

    const nodeIds = nodes.map(n => n.id);

    // Ensuite exécuter formules et submission en parallèle
    const [allFormulas, submission] = await Promise.all([
      // Toutes les formules (en utilisant nodeId: { in: nodeIds })
      db.treeBranchLeafNodeFormula.findMany({
        where: { 
          nodeId: { in: nodeIds }
        },
        orderBy: { createdAt: 'asc' }
      }),
      // Submission si leadId
      leadId && typeof leadId === 'string'
        ? db.treeBranchLeafSubmission.findFirst({
            where: { treeId, leadId },
            orderBy: { updatedAt: 'desc' },
            select: { id: true }
          })
        : Promise.resolve(null)
    ]);

    // Récupérer les valeurs de submission si on a une submission
    let submissionValues: Record<string, unknown> = {};
    if (submission?.id) {
      const submissionData = await db.treeBranchLeafSubmissionData.findMany({
        where: { submissionId: submission.id },
        select: { nodeId: true, value: true }
      });
      for (const data of submissionData) {
        if (data.value !== null) {
          submissionValues[data.nodeId] = data.value;
        }
      }
    }

    // Construire les maps de résultats
    const formulasByNode: Record<string, typeof allFormulas> = {};
    for (const formula of allFormulas) {
      if (!formulasByNode[formula.nodeId]) {
        formulasByNode[formula.nodeId] = [];
      }
      formulasByNode[formula.nodeId].push(formula);
    }

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
        const selectConfig = node.TreeBranchLeafSelectConfig;
        configsByNode[node.id] = {
          fieldType: node.fieldType,
          options: node.select_options,
          sourceType: selectConfig?.optionsSource || null,
          sourceTableId: selectConfig?.tableReference || null,
          sourceColumn: selectConfig?.keyColumn || null,
          displayColumn: selectConfig?.displayColumn || null
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
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    };
    console.error('[TBL Batch API] Error super batch fetching:', JSON.stringify(errorDetails, null, 2));
    res.status(500).json({ 
      error: 'Erreur lors de la récupération batch complète',
      details: errorDetails.message 
    });
  }
});

/**
 * GET /api/tbl/batch/trees/:treeId/node-data
 * 
 * 🚀 Récupère TOUTES les configurations de données (variables) de tous les nodes
 * Remplace les ~50+ appels à /nodes/:nodeId/data
 */
router.get('/trees/:treeId/node-data', async (req, res) => {
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

    // Récupérer tous les nodes avec hasData=true et leurs variables liées
    const nodesWithData = await db.treeBranchLeafNode.findMany({
      where: { 
        treeId,
        hasData: true
      },
      select: { 
        id: true,
        data_activeId: true,
        linkedVariableIds: true
      }
    });

    // Récupérer tous les IDs de variables potentiels
    const allVariableIds = new Set<string>();
    for (const node of nodesWithData) {
      if (node.data_activeId) allVariableIds.add(node.data_activeId);
      if (node.linkedVariableIds && Array.isArray(node.linkedVariableIds)) {
        for (const vid of node.linkedVariableIds) {
          if (typeof vid === 'string') allVariableIds.add(vid);
        }
      }
    }

    // Charger toutes les variables en une seule requête
    const allVariables = await db.treeBranchLeafNodeVariable.findMany({
      where: {
        id: { in: Array.from(allVariableIds) }
      }
    });

    // Map des variables par ID
    const variablesMap = new Map(allVariables.map(v => [v.id, v]));

    // Construire le résultat par nodeId
    const dataByNode: Record<string, {
      usedVariableId: string | null;
      variable: typeof allVariables[0] | null;
      ownerNodeId: string | null;
    }> = {};

    for (const node of nodesWithData) {
      // Logique simplifiée de résolution de variable (similaire à resolveNodeVariable)
      let variable: typeof allVariables[0] | null = null;
      let ownerNodeId: string | null = null;

      if (node.data_activeId) {
        variable = variablesMap.get(node.data_activeId) || null;
        ownerNodeId = variable?.nodeId || null;
      } else if (node.linkedVariableIds && Array.isArray(node.linkedVariableIds)) {
        // Prendre la première variable liée
        for (const vid of node.linkedVariableIds) {
          if (typeof vid === 'string' && variablesMap.has(vid)) {
            variable = variablesMap.get(vid) || null;
            ownerNodeId = variable?.nodeId || null;
            break;
          }
        }
      }

      dataByNode[node.id] = {
        usedVariableId: node.data_activeId || variable?.id || null,
        variable,
        ownerNodeId
      };
    }

    return res.json({
      success: true,
      treeId,
      totalNodesWithData: Object.keys(dataByNode).length,
      dataByNode
    });
  } catch (error) {
    console.error('[TBL Batch API] Error batch fetching node data:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération batch des données de noeuds' });
  }
});

export default router;

/**
 * Ã°Å¸Å¡â‚¬ API Routes pour l'Architecture CentralisÃƒÂ©e TreeBranchLeaf
 * 
 * Routes spÃƒÂ©cialisÃƒÂ©es pour la gestion des opÃƒÂ©rations centralisÃƒÂ©es
 * avec auto-rÃƒÂ©solution et cache
 */

import { Router } from 'express';
import { db } from '../../../../lib/database';
import { authenticateToken } from '../../../../middleware/auth';
import { getResolver } from '../../../../services/TreeBranchLeafResolver';
import { getBackgroundJobService } from '../../../../services/TreeBranchLeafBackgroundJobService';
import { logger } from '../../../../lib/logger';

const router = Router();
const prisma = db;
const resolver = getResolver(prisma);
const backgroundJobService = getBackgroundJobService(prisma);

// Authentification requise pour toutes les routes
router.use(authenticateToken);

// Helper pour le contexte d'auth
type MinimalReqUser = { organizationId?: string | null; isSuperAdmin?: boolean };
function getAuthCtx(req: { user?: MinimalReqUser }): { organizationId: string | null; isSuperAdmin: boolean } {
  const user = req.user || {};
  return {
    organizationId: user.organizationId || null,
    isSuperAdmin: Boolean(user.isSuperAdmin)
  };
}

// =============================================================================
// Ã°Å¸â€œÅ  SUBMISSION DATA - Gestion centralisÃƒÂ©e des donnÃƒÂ©es de soumission
// =============================================================================

/**
 * POST /api/treebranchleaf/submission-data
 * CrÃƒÂ©er une nouvelle entrÃƒÂ©e de donnÃƒÂ©es de soumission avec auto-rÃƒÂ©solution
 */
router.post('/submission-data', async (req, res) => {
  try {
    const { submissionId, nodeId, value, sourceRef, operationSource, fieldLabel, variableKey, variableDisplayName, variableUnit, isVariable } = req.body;
    const { organizationId } = getAuthCtx(req);

    if (!submissionId || !nodeId) {
      return res.status(400).json({ 
        error: 'submissionId and nodeId are required' 
      });
    }

    // PrÃƒÂ©parer les donnÃƒÂ©es avec auto-rÃƒÂ©solution
    const data: Partial<Record<string, unknown>> = {
      id: `${submissionId}-${nodeId}`,
      submissionId,
      nodeId,
      value: value || null,
      sourceRef: sourceRef || null,
      operationSource: operationSource || null,
      fieldLabel: fieldLabel || null, // Le trigger remplira automatiquement si null
      variableKey: variableKey || null,
      variableDisplayName: variableDisplayName || null,
      variableUnit: variableUnit || null,
      isVariable: isVariable !== undefined ? isVariable : null // Le trigger dÃƒÂ©terminera automatiquement
    };

    // Si sourceRef est fourni, le trigger SQL s'occupera de l'auto-rÃƒÂ©solution
    const submissionData = await prisma.treeBranchLeafSubmissionData.create({
      data
    });


    res.status(201).json({ 
      success: true, 
      data: submissionData 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to create submission data:', error);
    res.status(500).json({ 
      error: 'Failed to create submission data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/treebranchleaf/submission-data/:id
 * Mettre ÃƒÂ  jour une entrÃƒÂ©e de donnÃƒÂ©es de soumission
 */
router.put('/submission-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value, sourceRef, operationSource, fieldLabel, variableKey, variableDisplayName, variableUnit, isVariable } = req.body;

    const updateData: Record<string, unknown> = {};
    
    if (value !== undefined) updateData.value = value;
    if (fieldLabel !== undefined) updateData.fieldLabel = fieldLabel;
    if (variableKey !== undefined) updateData.variableKey = variableKey;
    if (variableDisplayName !== undefined) updateData.variableDisplayName = variableDisplayName;
    if (variableUnit !== undefined) updateData.variableUnit = variableUnit;
    if (isVariable !== undefined) updateData.isVariable = isVariable;
    if (sourceRef !== undefined) {
      updateData.sourceRef = sourceRef;
      // RÃƒÂ©initialiser pour forcer la re-rÃƒÂ©solution
      updateData.operationDetail = null;
      updateData.operationResult = null;
    }
    if (operationSource !== undefined) updateData.operationSource = operationSource;

    const submissionData = await prisma.treeBranchLeafSubmissionData.update({
      where: { id },
      data: updateData
    });

    res.json({ 
      success: true, 
      data: submissionData 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to update submission data:', error);
    res.status(500).json({ 
      error: 'Failed to update submission data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/treebranchleaf/submission-data/:id/resolved
 * RÃƒÂ©cupÃƒÂ©rer une entrÃƒÂ©e avec toutes ses donnÃƒÂ©es rÃƒÂ©solues
 */
router.get('/submission-data/:id/resolved', async (req, res) => {
  try {
    const { id } = req.params;
    const { forceResolve } = req.query;

    let submissionData = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id },
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            type: true,
            subType: true,
            description: true
          }
        }
      }
    });

    if (!submissionData) {
      return res.status(404).json({ error: 'Submission data not found' });
    }

    // Force la rÃƒÂ©solution si demandÃƒÂ©e ou si pas encore rÃƒÂ©solu
    if (forceResolve === 'true' || (!submissionData.operationDetail && submissionData.sourceRef)) {
      if (submissionData.sourceRef && submissionData.operationSource) {
        await resolver.updateSubmissionWithResolvedOperation(
          id,
          submissionData.sourceRef,
          submissionData.operationSource
        );

        // Recharger les donnÃƒÂ©es mises ÃƒÂ  jour
        submissionData = await prisma.treeBranchLeafSubmissionData.findUnique({
          where: { id },
          include: {
            TreeBranchLeafNode: {
              select: {
                id: true,
                label: true,
                type: true,
                subType: true,
                description: true
              }
            }
          }
        });
      }
    }

    // Calculer le rÃƒÂ©sultat si pas encore fait
    if (submissionData && !submissionData.operationResult && submissionData.operationDetail) {
      await resolver.calculateAndCacheResult(id);
      
      // Recharger une derniÃƒÂ¨re fois
      submissionData = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id },
        include: {
          TreeBranchLeafNode: {
            select: {
              id: true,
              label: true,
              type: true,
              subType: true,
              description: true
            }
          }
        }
      });
    }

    res.json({ 
      success: true, 
      data: submissionData 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to get resolved submission data:', error);
    res.status(500).json({ 
      error: 'Failed to get resolved submission data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/treebranchleaf/submission-data/by-submission/:submissionId
 * RÃƒÂ©cupÃƒÂ©rer toutes les donnÃƒÂ©es d'une soumission avec les libellÃƒÂ©s
 */
router.get('/submission-data/by-submission/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { includeResolved } = req.query;

    const submissionDataList = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId },
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            type: true,
            subType: true,
            description: true,
            order: true
          }
        }
      },
      orderBy: [
        { TreeBranchLeafNode: { order: 'asc' } },
        { createdAt: 'asc' }
      ]
    });

    // Si demandÃƒÂ©, inclure toutes les donnÃƒÂ©es rÃƒÂ©solues
    if (includeResolved === 'true') {
      for (const item of submissionDataList) {
        if (item.sourceRef && item.operationSource && !item.operationDetail) {
          try {
            await resolver.updateSubmissionWithResolvedOperation(
              item.id,
              item.sourceRef,
              item.operationSource
            );
          } catch (error) {
            logger.warn(`Failed to resolve operation for ${item.id}:`, error);
          }
        }
      }

      // Recharger avec les donnÃƒÂ©es rÃƒÂ©solues
      const resolvedData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId },
        include: {
          TreeBranchLeafNode: {
            select: {
              id: true,
              label: true,
              type: true,
              subType: true,
              description: true,
              order: true
            }
          }
        },
        orderBy: [
          { TreeBranchLeafNode: { order: 'asc' } },
          { createdAt: 'asc' }
        ]
      });

      res.json({ 
        success: true, 
        data: resolvedData,
        count: resolvedData.length
      });
    } else {
      res.json({ 
        success: true, 
        data: submissionDataList,
        count: submissionDataList.length
      });
    }

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to get submission data:', error);
    res.status(500).json({ 
      error: 'Failed to get submission data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// Ã°Å¸â€Â§ OPERATIONS - Gestion des opÃƒÂ©rations et cache
// =============================================================================

/**
 * POST /api/treebranchleaf/operations/invalidate-cache
 * Invalider le cache pour une sourceRef spÃƒÂ©cifique
 */
router.post('/operations/invalidate-cache', async (req, res) => {
  try {
    const { sourceRef } = req.body;

    if (!sourceRef) {
      return res.status(400).json({ error: 'sourceRef is required' });
    }

    await resolver.invalidateCache(sourceRef);

    res.json({ 
      success: true, 
      message: `Cache invalidated for ${sourceRef}` 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to invalidate cache:', error);
    res.status(500).json({ 
      error: 'Failed to invalidate cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/treebranchleaf/operations/resolve-background
 * DÃƒÂ©clencher manuellement la rÃƒÂ©solution en arriÃƒÂ¨re-plan
 */
router.post('/operations/resolve-background', async (req, res) => {
  try {
    await resolver.resolveOperationsInBackground();

    res.json({ 
      success: true, 
      message: 'Background resolution completed' 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to run background resolution:', error);
    res.status(500).json({ 
      error: 'Failed to run background resolution',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/treebranchleaf/operations/statistics
 * Obtenir les statistiques du systÃƒÂ¨me d'opÃƒÂ©rations
 */
router.get('/operations/statistics', async (req, res) => {
  try {
    const totalEntries = await prisma.treeBranchLeafSubmissionData.count({
      where: { sourceRef: { not: null } }
    });

    const unresolvedEntries = await prisma.treeBranchLeafSubmissionData.count({
      where: {
        sourceRef: { not: null },
        operationDetail: null
      }
    });

    const operationTypes = await prisma.treeBranchLeafSubmissionData.groupBy({
      by: ['operationSource'],
      where: { sourceRef: { not: null } },
      _count: { id: true }
    });

    const recentResolutions = await prisma.treeBranchLeafSubmissionData.count({
      where: {
        lastResolved: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // derniÃƒÂ¨res 24h
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalEntries,
        unresolvedEntries,
        operationTypes,
        recentResolutions,
        resolutionRate: totalEntries > 0 ? ((totalEntries - unresolvedEntries) / totalEntries * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to get statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// Ã°Å¸Å½â€ºÃ¯Â¸Â BACKGROUND JOBS - Gestion des tÃƒÂ¢ches en arriÃƒÂ¨re-plan
// =============================================================================

/**
 * GET /api/treebranchleaf/background-jobs/status
 * VÃƒÂ©rifier le statut des tÃƒÂ¢ches en arriÃƒÂ¨re-plan
 */
router.get('/background-jobs/status', async (req, res) => {
  try {
    const healthCheck = await backgroundJobService.healthCheck();
    
    res.json({
      success: true,
      data: {
        ...healthCheck,
        isActive: backgroundJobService.isActive()
      }
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to get background jobs status:', error);
    res.status(500).json({ 
      error: 'Failed to get background jobs status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/treebranchleaf/background-jobs/start
 * DÃƒÂ©marrer les tÃƒÂ¢ches en arriÃƒÂ¨re-plan
 */
router.post('/background-jobs/start', async (req, res) => {
  try {
    const { intervalMinutes } = req.body;
    
    backgroundJobService.start(intervalMinutes || 15);
    
    res.json({ 
      success: true, 
      message: `Background jobs started with ${intervalMinutes || 15} minutes interval` 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to start background jobs:', error);
    res.status(500).json({ 
      error: 'Failed to start background jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/treebranchleaf/background-jobs/stop
 * ArrÃƒÂªter les tÃƒÂ¢ches en arriÃƒÂ¨re-plan
 */
router.post('/background-jobs/stop', async (req, res) => {
  try {
    backgroundJobService.stop();
    
    res.json({ 
      success: true, 
      message: 'Background jobs stopped' 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to stop background jobs:', error);
    res.status(500).json({ 
      error: 'Failed to stop background jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/treebranchleaf/background-jobs/force-sync
 * Forcer une synchronisation complÃƒÂ¨te (DANGER)
 */
router.post('/background-jobs/force-sync', async (req, res) => {
  try {
    const { confirmDangerous } = req.body;
    
    if (!confirmDangerous) {
      return res.status(400).json({ 
        error: 'This is a dangerous operation. Add confirmDangerous: true to proceed.' 
      });
    }
    
    await backgroundJobService.forceFullSync();
    
    res.json({ 
      success: true, 
      message: 'Forced full synchronization completed' 
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to force sync:', error);
    res.status(500).json({ 
      error: 'Failed to force sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/treebranchleaf/submission-data/by-submission/:submissionId/variables
 * RÃƒÂ©cupÃƒÂ©rer toutes les variables d'une soumission (pour les formules)
 */
router.get('/submission-data/by-submission/:submissionId/variables', async (req, res) => {
  try {
    const { submissionId } = req.params;

    const variables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        submissionId,
        isVariable: true 
      },
      select: {
        id: true,
        nodeId: true,
        value: true,
        variableKey: true,
        variableDisplayName: true,
        variableUnit: true,
        fieldLabel: true
      },
      orderBy: {
        variableKey: 'asc'
      }
    });

    // Transformer en objet pour faciliter l'utilisation dans les formules
    const variablesMap = variables.reduce((acc, variable) => {
      if (variable.variableKey) {
        acc[variable.variableKey] = {
          value: variable.value,
          displayName: variable.variableDisplayName,
          unit: variable.variableUnit,
          fieldLabel: variable.fieldLabel,
          nodeId: variable.nodeId
        };
      }
      return acc;
    }, {} as Record<string, unknown>);

    res.json({ 
      success: true, 
      data: {
        variables: variables,
        variablesMap: variablesMap,
        count: variables.length
      }
    });

  } catch (error) {
    logger.error('Ã¢ÂÅ’ Failed to get variables:', error);
    res.status(500).json({ 
      error: 'Failed to get variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

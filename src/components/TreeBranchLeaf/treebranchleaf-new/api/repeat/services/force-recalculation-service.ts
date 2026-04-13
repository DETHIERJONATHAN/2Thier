import { PrismaClient } from '@prisma/client';

/**
 * Service pour forcer le recalcul immÃƒÂ©diat des nÃ…â€œuds copiÃƒÂ©s avec leurs propres donnÃƒÂ©es
 * 
 * Ce service s'assure que:
 * 1. Les nÃ…â€œuds copiÃƒÂ©s ne retombent jamais sur les valeurs originales
 * 2. Tous les calculs utilisent les capacitÃƒÂ©s copiÃƒÂ©es avec suffixe
 * 3. Les lookups pointent vers les bonnes tables copiÃƒÂ©es
 * 4. Aucun fallback n'est possible
 */

export interface ForceRecalculationResult {
  nodeId: string;
  nodeLabel: string | null;
  oldCalculatedValue: string | null;
  newCalculatedValue: string | null;
  recalculationForced: boolean;
  referencesUpdated: string[];
}

export interface ForceRecalculationReport {
  totalNodesProcessed: number;
  nodesRecalculated: ForceRecalculationResult[];
  errors: Array<{ nodeId: string; error: string }>;
}

/**
 * Force le recalcul d'un nÃ…â€œud copiÃƒÂ© avec ses propres donnÃƒÂ©es
 */
export async function forceNodeRecalculationWithOwnData(
  prisma: PrismaClient,
  copiedNodeId: string
): Promise<ForceRecalculationResult> {

  const result: ForceRecalculationResult = {
    nodeId: copiedNodeId,
    nodeLabel: null,
    oldCalculatedValue: null,
    newCalculatedValue: null,
    recalculationForced: false,
    referencesUpdated: []
  };

  const copiedNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: copiedNodeId },
    include: {
      TreeBranchLeafNodeTable: {
        include: {
          tableColumns: true,
          tableRows: true
        }
      }
    }
  });

  if (!copiedNode) {
    throw new Error(`NÃ…â€œud copiÃƒÂ© ${copiedNodeId} non trouvÃƒÂ©`);
  }

  result.nodeLabel = copiedNode.label;
  result.oldCalculatedValue = copiedNode.calculatedValue;

  // 1. Mettre ÃƒÂ  jour toutes les rÃƒÂ©fÃƒÂ©rences dans les formules pour qu'elles pointent vers les nÃ…â€œuds -1
  for (const formula of copiedNode.TreeBranchLeafNodeFormula) {
    if (formula.tokens) {
      let tokensStr = JSON.stringify(formula.tokens);
      let updated = false;

      // Remplacer toutes les rÃƒÂ©fÃƒÂ©rences qui ne finissent pas par -1
      const updatedTokensStr = tokensStr.replace(
        /@value\.([A-Za-z0-9_:-]+)(?!-1)/g,
        (match, nodeId) => {
          if (nodeId.includes('shared-ref') || nodeId.endsWith('1')) {
            return match;
          }
          updated = true;
          result.referencesUpdated.push(`Formula ${formula.name}: ${nodeId} Ã¢â€ â€™ ${nodeId}-1`);
          return `@value.${nodeId}-1`;
        }
      );

      if (updated) {
        const newTokens = JSON.parse(updatedTokensStr);
        await prisma.treeBranchLeafNodeFormula.update({
          where: { id: formula.id },
          data: { tokens: newTokens }
        });
      }
    }
  }

  // 2. Mettre ÃƒÂ  jour toutes les rÃƒÂ©fÃƒÂ©rences dans les conditions
  for (const condition of copiedNode.TreeBranchLeafNodeCondition) {
    if (condition.conditionSet) {
      let conditionStr = JSON.stringify(condition.conditionSet);
      let updated = false;

      const updatedConditionStr = conditionStr.replace(
        /@value\.([A-Za-z0-9_:-]+)(?!-1)/g,
        (match, nodeId) => {
          if (nodeId.includes('shared-ref') || nodeId.endsWith('1')) {
            return match;
          }
          updated = true;
          result.referencesUpdated.push(`Condition ${condition.name}: ${nodeId} Ã¢â€ â€™ ${nodeId}-1`);
          return `@value.${nodeId}-1`;
        }
      );

      if (updated) {
        const newConditionSet = JSON.parse(updatedConditionStr);
        await prisma.treeBranchLeafNodeCondition.update({
          where: { id: condition.id },
          data: { conditionSet: newConditionSet }
        });
      }
    }
  }

  // 3. Forcer le recalcul en supprimant la valeur calculÃƒÂ©e et ajoutant des mÃƒÂ©tadonnÃƒÂ©es de forÃƒÂ§age
  const forceRecalcMetadata = {
    ...(copiedNode.metadata && typeof copiedNode.metadata === 'object' ? copiedNode.metadata : {}),
    forceRecalculation: true,
    lastForceRecalc: new Date().toISOString(),
    independentCalculation: true,
    noFallbackToOriginal: true,
    recalculationReason: 'Duplication independence enforcement'
  };

  await prisma.treeBranchLeafNode.update({
    where: { id: copiedNodeId },
    data: {
      calculatedValue: null,
      calculatedAt: null,
      calculatedBy: null,
      metadata: forceRecalcMetadata
    }
  });

  result.recalculationForced = true;
  result.newCalculatedValue = null; // Sera recalculÃƒÂ© par le systÃƒÂ¨me
  

  return result;
}

/**
 * Force le recalcul de tous les nÃ…â€œuds copiÃƒÂ©s d'un repeater
 */
export async function forceAllNodesRecalculationWithOwnData(
  prisma: PrismaClient,
  repeaterNodeId?: string
): Promise<ForceRecalculationReport> {

  const report: ForceRecalculationReport = {
    totalNodesProcessed: 0,
    nodesRecalculated: [],
    errors: []
  };

  try {
    const whereClause: unknown = {
      AND: [
        { label: { endsWith: '-1' } }
      ]
    };

    if (repeaterNodeId) {
      whereClause.AND.push({
        metadata: {
          path: ['duplicatedFromRepeater'],
          equals: repeaterNodeId
        }
      });
    }

    const copiedNodes = await prisma.treeBranchLeafNode.findMany({
      where: whereClause,
      select: {
        id: true,
        label: true,
        calculatedValue: true
      }
    });


    for (const node of copiedNodes) {
      report.totalNodesProcessed++;

      try {
        // Ne forcer le recalcul que pour les nÃ…â€œuds qui ont une valeur calculÃƒÂ©e
        if (node.calculatedValue !== null) {
          const result = await forceNodeRecalculationWithOwnData(prisma, node.id);
          report.nodesRecalculated.push(result);
        } else {
        }

      } catch (error) {
        report.errors.push({
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

  } catch (error) {
    console.error('Ã¢ÂÅ’ [FORCE-RECALC-ALL] Erreur gÃƒÂ©nÃƒÂ©rale:', error);
  }

  return report;
}

/**
 * Bloque complÃƒÂ¨tement le fallback vers les valeurs originales
 */
export async function blockFallbackToOriginalValues(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {

  for (const nodeId of copiedNodeIds) {
    // Ajouter des mÃƒÂ©tadonnÃƒÂ©es pour empÃƒÂªcher le fallback
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { metadata: true }
    });

    if (node) {
      const antiFactbackMetadata = {
        ...(node.metadata && typeof node.metadata === 'object' ? node.metadata : {}),
        blockFallbackToOriginal: true,
        enforceIndependentCalculation: true,
        lastAntiFactbackUpdate: new Date().toISOString(),
        calculationIsolationLevel: 'STRICT'
      };

      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: {
          metadata: antiFactbackMetadata,
          // S'assurer que la valeur est null pour forcer un nouveau calcul
          calculatedValue: null,
          calculatedAt: null
        }
      });
    }
  }

}

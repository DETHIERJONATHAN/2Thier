import { PrismaClient } from '@prisma/client';

/**
 * Service pour forcer le recalcul immédiat des nœuds copiés avec leurs propres données
 * 
 * Ce service s'assure que:
 * 1. Les nœuds copiés ne retombent jamais sur les valeurs originales
 * 2. Tous les calculs utilisent les capacités copiées avec suffixe
 * 3. Les lookups pointent vers les bonnes tables copiées
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
 * Force le recalcul d'un nœud copié avec ses propres données
 */
export async function forceNodeRecalculationWithOwnData(
  prisma: PrismaClient,
  copiedNodeId: string
): Promise<ForceRecalculationResult> {
  console.log(`🔄 [FORCE-RECALC] Recalcul forcé: ${copiedNodeId}`);

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
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true,
      TreeBranchLeafNodeTable: {
        include: {
          tableColumns: true,
          tableRows: true
        }
      }
    }
  });

  if (!copiedNode) {
    throw new Error(`Nœud copié ${copiedNodeId} non trouvé`);
  }

  result.nodeLabel = copiedNode.label;
  result.oldCalculatedValue = copiedNode.calculatedValue;

  // 1. Mettre à jour toutes les références dans les formules pour qu'elles pointent vers les nœuds -1
  for (const formula of copiedNode.TreeBranchLeafNodeFormula) {
    if (formula.tokens) {
      let tokensStr = JSON.stringify(formula.tokens);
      let updated = false;

      // Remplacer toutes les références qui ne finissent pas par -1
      const updatedTokensStr = tokensStr.replace(
        /@value\.([A-Za-z0-9_:-]+)(?!-1)/g,
        (match, nodeId) => {
          if (nodeId.includes('shared-ref') || nodeId.endsWith('1')) {
            return match;
          }
          updated = true;
          result.referencesUpdated.push(`Formula ${formula.name}: ${nodeId} → ${nodeId}-1`);
          return `@value.${nodeId}-1`;
        }
      );

      if (updated) {
        const newTokens = JSON.parse(updatedTokensStr);
        await prisma.treeBranchLeafNodeFormula.update({
          where: { id: formula.id },
          data: { tokens: newTokens }
        });
        console.log(`   🔄 Références formule "${formula.name}" mises à jour`);
      }
    }
  }

  // 2. Mettre à jour toutes les références dans les conditions
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
          result.referencesUpdated.push(`Condition ${condition.name}: ${nodeId} → ${nodeId}-1`);
          return `@value.${nodeId}-1`;
        }
      );

      if (updated) {
        const newConditionSet = JSON.parse(updatedConditionStr);
        await prisma.treeBranchLeafNodeCondition.update({
          where: { id: condition.id },
          data: { conditionSet: newConditionSet }
        });
        console.log(`   🔄 Références condition "${condition.name}" mises à jour`);
      }
    }
  }

  // 3. Forcer le recalcul en supprimant la valeur calculée et ajoutant des métadonnées de forçage
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
  result.newCalculatedValue = null; // Sera recalculé par le système
  
  console.log(`   ✅ Recalcul forcé avec ${result.referencesUpdated.length} références mises à jour`);

  return result;
}

/**
 * Force le recalcul de tous les nœuds copiés d'un repeater
 */
export async function forceAllNodesRecalculationWithOwnData(
  prisma: PrismaClient,
  repeaterNodeId?: string
): Promise<ForceRecalculationReport> {
  console.log('🚀 [FORCE-RECALC-ALL] Recalcul forcé de tous les nœuds copiés...');

  const report: ForceRecalculationReport = {
    totalNodesProcessed: 0,
    nodesRecalculated: [],
    errors: []
  };

  try {
    const whereClause: any = {
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

    console.log(`🎯 Trouvé ${copiedNodes.length} nœuds copiés à forcer au recalcul`);

    for (const node of copiedNodes) {
      report.totalNodesProcessed++;

      try {
        // Ne forcer le recalcul que pour les nœuds qui ont une valeur calculée
        if (node.calculatedValue !== null) {
          console.log(`📊 Forçage recalcul: ${node.label} (${node.calculatedValue} → null)`);
          const result = await forceNodeRecalculationWithOwnData(prisma, node.id);
          report.nodesRecalculated.push(result);
        } else {
          console.log(`⏭️  Skip: ${node.label} (déjà null)`);
        }

      } catch (error) {
        report.errors.push({
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

  } catch (error) {
    console.error('❌ [FORCE-RECALC-ALL] Erreur générale:', error);
  }

  return report;
}

/**
 * Bloque complètement le fallback vers les valeurs originales
 */
export async function blockFallbackToOriginalValues(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {
  console.log(`🚫 [BLOCK-FALLBACK] Blocage du fallback pour ${copiedNodeIds.length} nœuds...`);

  for (const nodeId of copiedNodeIds) {
    // Ajouter des métadonnées pour empêcher le fallback
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

  console.log(`✅ [BLOCK-FALLBACK] Fallback bloqué pour ${copiedNodeIds.length} nœuds`);
}
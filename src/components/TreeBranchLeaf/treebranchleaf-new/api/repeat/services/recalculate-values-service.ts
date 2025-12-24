/**
 * Ã°Å¸â€â€ž Service de recalcul des valeurs calculÃƒÂ©es aprÃƒÂ¨s duplication
 * 
 * AprÃƒÂ¨s qu'un nÃ…â€œud soit dupliquÃƒÂ© avec ses formules/conditions/tables,
 * ce service s'assure que les nouvelles valeurs calculÃƒÂ©es sont recalculÃƒÂ©es
 * plutÃƒÂ´t que d'hÃƒÂ©riter des valeurs de l'original.
 * 
 * PRINCIPE :
 * - Les nÃ…â€œuds copiÃƒÂ©s ont leurs propres formules/conditions/tables copiÃƒÂ©es
 * - Mais leurs calculatedValue peuvent encore pointer vers les anciennes valeurs
 * - Ce service force le recalcul pour garantir l'indÃƒÂ©pendance
 */

import { type PrismaClient } from '@prisma/client';
import type { DuplicationContext } from '../../registry/repeat-id-registry.js';

/**
 * Options pour le recalcul des valeurs
 */
export interface RecalculateValuesOptions {
  /** Map des nÃ…â€œuds copiÃƒÂ©s (ancien ID Ã¢â€ â€™ nouveau ID) */
  nodeIdMap: Map<string, string>;
  /** Contexte de duplication pour les logs */
  context?: DuplicationContext;
  /** Force le recalcul mÃƒÂªme si une valeur existe dÃƒÂ©jÃƒÂ  */
  forceRecalculation?: boolean;
}

/**
 * RÃƒÂ©sultat du recalcul
 */
export interface RecalculateValuesResult {
  /** Nombre de nÃ…â€œuds recalculÃƒÂ©s avec succÃƒÂ¨s */
  recalculatedCount: number;
  /** NÃ…â€œuds qui ont ÃƒÂ©chouÃƒÂ© */
  failedNodes: Array<{ nodeId: string; error: string }>;
  /** DÃƒÂ©tails des recalculs */
  details: Array<{
    nodeId: string;
    label: string | null;
    oldValue: unknown;
    newValue: unknown;
    capacityType: 'formula' | 'condition' | 'table' | null;
  }>;
}

/**
 * Ã°Å¸â€â€ž Recalcule les valeurs calculÃƒÂ©es pour les nÃ…â€œuds copiÃƒÂ©s
 */
export async function recalculateValuesAfterCopy(
  prisma: PrismaClient,
  options: RecalculateValuesOptions
): Promise<RecalculateValuesResult> {
  const { nodeIdMap, context, forceRecalculation = true } = options;
  
  const result: RecalculateValuesResult = {
    recalculatedCount: 0,
    failedNodes: [],
    details: []
  };

  if (!nodeIdMap.size) {
    return result;
  }


  // RÃƒÂ©cupÃƒÂ©rer tous les nÃ…â€œuds copiÃƒÂ©s qui ont des capacitÃƒÂ©s
  const copiedNodeIds = Array.from(nodeIdMap.values());
  
  const nodesWithCapacities = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { in: copiedNodeIds },
      OR: [
        { hasFormula: true },
        { hasCondition: true },
        { hasTable: true }
      ]
    },
    include: {
      TreeBranchLeafNodeFormula: {
        where: { isDefault: true },
        take: 1
      },
      TreeBranchLeafNodeCondition: {
        where: { isDefault: true },
        take: 1
      },
      TreeBranchLeafNodeTable: {
        where: { isDefault: true },
        take: 1
      },
      TreeBranchLeafNodeVariable: true
    }
  });


  for (const node of nodesWithCapacities) {
    try {
      const oldValue = node.calculatedValue;
      let newValue: unknown = null;
      let capacityType: 'formula' | 'condition' | 'table' | null = null;

      // Identifier le type de capacitÃƒÂ© et recalculer
      if (node.hasFormula && node.TreeBranchLeafNodeFormula.length > 0) {
        capacityType = 'formula';
        newValue = await recalculateFormulaValue(prisma, node.id, node.TreeBranchLeafNodeFormula[0].id);
      } else if (node.hasCondition && node.TreeBranchLeafNodeCondition.length > 0) {
        capacityType = 'condition';
        newValue = await recalculateConditionValue(prisma, node.id, node.TreeBranchLeafNodeCondition[0].id);
      } else if (node.hasTable && node.TreeBranchLeafNodeTable.length > 0) {
        capacityType = 'table';
        newValue = await recalculateTableValue(prisma, node.id, node.TreeBranchLeafNodeTable[0].id);
      }

      // Mettre ÃƒÂ  jour la valeur calculÃƒÂ©e si elle a changÃƒÂ© ou si force
      if (forceRecalculation || newValue !== oldValue) {
        await prisma.treeBranchLeafNode.update({
          where: { id: node.id },
          data: { calculatedValue: newValue as any }
        });

        result.recalculatedCount++;
        result.details.push({
          nodeId: node.id,
          label: node.label,
          oldValue,
          newValue,
          capacityType
        });

      } else {
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.failedNodes.push({
        nodeId: node.id,
        error: errorMsg
      });
      console.error(`Ã¢ÂÅ’ [RECALCULATE] Erreur pour ${node.label || node.id}:`, errorMsg);
    }
  }

  
  return result;
}

/**
 * Recalcule une valeur de formule
 */
async function recalculateFormulaValue(
  prisma: PrismaClient,
  nodeId: string,
  formulaId: string
): Promise<unknown> {
  
  // Pour l'instant, remettre ÃƒÂ  null pour forcer un nouveau calcul
  // Dans une implÃƒÂ©mentation complÃƒÂ¨te, on utiliserait le moteur de formules
  return null;
}

/**
 * Recalcule une valeur de condition
 */
async function recalculateConditionValue(
  prisma: PrismaClient,
  nodeId: string,
  conditionId: string
): Promise<unknown> {
  
  // Pour l'instant, remettre ÃƒÂ  null pour forcer un nouveau calcul
  // Dans une implÃƒÂ©mentation complÃƒÂ¨te, on utiliserait le moteur de conditions
  return null;
}

/**
 * Recalcule une valeur de table
 */
async function recalculateTableValue(
  prisma: PrismaClient,
  nodeId: string,
  tableId: string
): Promise<unknown> {
  
  // Pour l'instant, remettre ÃƒÂ  null pour forcer un nouveau calcul
  // Dans une implÃƒÂ©mentation complÃƒÂ¨te, on utiliserait le moteur de tables
  return null;
}

/**
 * Ã°Å¸â€â€ž MÃƒâ€°THODE SIMPLE : Remet toutes les valeurs calculÃƒÂ©es ÃƒÂ  null
 * pour forcer un recalcul cÃƒÂ´tÃƒÂ© frontend
 */
export async function resetCalculatedValuesAfterCopy(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<number> {
  
  // D'abord vÃƒÂ©rifier quels nÃ…â€œuds ont des capacitÃƒÂ©s
  const nodesWithCapacities = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { in: copiedNodeIds },
      OR: [
        { hasFormula: true },
        { hasCondition: true },
        { hasTable: true }
      ]
    },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      hasFormula: true,
      hasCondition: true,
      hasTable: true
    }
  });
  
  for (const node of nodesWithCapacities) {
  }
  
  // Maintenant faire le reset
  const result = await prisma.treeBranchLeafNode.updateMany({
    where: {
      id: { in: copiedNodeIds },
      OR: [
        { hasFormula: true },
        { hasCondition: true },
        { hasTable: true }
      ]
    },
    data: {
      calculatedValue: null
    }
  });

  return result.count;
}

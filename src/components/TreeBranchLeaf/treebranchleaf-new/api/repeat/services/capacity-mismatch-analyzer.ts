/**
 * Ã°Å¸Â§Âª Service de test spÃƒÂ©cifique pour les problÃƒÂ¨mes de capacitÃƒÂ©s manquantes
 * 
 * Ce service se concentre sur le cas prÃƒÂ©cis oÃƒÂ¹ un nÃ…â€œud copiÃƒÂ© a le flag
 * hasTable=true mais aucune table associÃƒÂ©e (Tables: 0)
 */

import { type PrismaClient } from '@prisma/client';

export interface CapacityMismatchAnalysis {
  nodeId: string;
  label: string | null;
  hasCapacityFlag: boolean;
  actualCapacityCount: number;
  capacityType: 'formula' | 'condition' | 'table';
  originalCapacityCount: number;
  possibleCauses: string[];
  suggestedFix: string;
}

/**
 * Ã°Å¸â€Â Analyser les dÃƒÂ©calages entre flags de capacitÃƒÂ© et capacitÃƒÂ©s rÃƒÂ©elles
 */
export async function analyzeCapacityMismatches(
  prisma: PrismaClient,
  nodeId: string
): Promise<CapacityMismatchAnalysis[]> {
  
  const results: CapacityMismatchAnalysis[] = [];
  
  // RÃƒÂ©cupÃƒÂ©rer le nÃ…â€œud avec toutes ses capacitÃƒÂ©s
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    include: {
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true,
      TreeBranchLeafNodeTable: true,
      TreeBranchLeafNodeVariable: true
    }
  });

  if (!node) {
    return results;
  }

  // Trouver le nÃ…â€œud original si c'est une copie
  const originalId = nodeId.replace(/-\d+$/, '');
  let originalNode = null;
  
  if (originalId !== nodeId) {
    originalNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: originalId },
      include: {
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true,
        TreeBranchLeafNodeTable: true,
        TreeBranchLeafNodeVariable: true
      }
    });
  }

  
  if (originalNode) {
  }

  // Analyser les dÃƒÂ©calages
  const capacityChecks = [
    {
      type: 'formula' as const,
      hasFlag: node.hasFormula,
      actualCount: node.TreeBranchLeafNodeFormula.length,
      originalCount: originalNode?.TreeBranchLeafNodeFormula.length || 0
    },
    {
      type: 'condition' as const,
      hasFlag: node.hasCondition,
      actualCount: node.TreeBranchLeafNodeCondition.length,
      originalCount: originalNode?.TreeBranchLeafNodeCondition.length || 0
    },
    {
      type: 'table' as const,
      hasFlag: node.hasTable,
      actualCount: node.TreeBranchLeafNodeTable.length,
      originalCount: originalNode?.TreeBranchLeafNodeTable.length || 0
    }
  ];

  for (const check of capacityChecks) {
    if (check.hasFlag && check.actualCount === 0) {
      const causes = [];
      let suggestedFix = '';

      if (check.originalCount > 0) {
        causes.push(`L'original avait ${check.originalCount} ${check.type}(s) mais la copie en a 0`);
        causes.push(`ProblÃƒÂ¨me dans le processus de copie des ${check.type}s`);
        suggestedFix = `VÃƒÂ©rifier pourquoi copy${check.type.charAt(0).toUpperCase() + check.type.slice(1)}Capacity a ÃƒÂ©chouÃƒÂ©`;
      } else {
        causes.push(`Le flag has${check.type.charAt(0).toUpperCase() + check.type.slice(1)} est incorrect`);
        suggestedFix = `Corriger le flag has${check.type.charAt(0).toUpperCase() + check.type.slice(1)} ÃƒÂ  false`;
      }

      results.push({
        nodeId: node.id,
        label: node.label,
        hasCapacityFlag: check.hasFlag,
        actualCapacityCount: check.actualCount,
        capacityType: check.type,
        originalCapacityCount: check.originalCount,
        possibleCauses: causes,
        suggestedFix
      });

    }
  }

  return results;
}

/**
 * Ã°Å¸â€ºÂ Ã¯Â¸Â Corriger automatiquement les flags de capacitÃƒÂ© incorrects
 */
export async function fixCapacityFlags(
  prisma: PrismaClient,
  nodeId: string,
  analysis: CapacityMismatchAnalysis[]
): Promise<void> {
  if (analysis.length === 0) {
    return;
  }

  
  const updateData: Record<string, boolean> = {};
  
  for (const mismatch of analysis) {
    if (mismatch.actualCapacityCount === 0 && mismatch.hasCapacityFlag) {
      // Si pas de capacitÃƒÂ© mais flag ÃƒÂ  true, mettre le flag ÃƒÂ  false
      const flagName = `has${mismatch.capacityType.charAt(0).toUpperCase() + mismatch.capacityType.slice(1)}`;
      updateData[flagName] = false;
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: updateData
    });
  }
}

/**
 * Ã°Å¸â€Â Service de diagnostic des copies incomplÃƒÂ¨tes
 * 
 * Ce service identifie pourquoi les champs copiÃƒÂ©s gardent les valeurs de l'original
 * et propose des corrections dans le processus de copie.
 */

import { type PrismaClient } from '@prisma/client';
import { analyzeCapacityMismatches, fixCapacityFlags } from './capacity-mismatch-analyzer.js';

export interface CopyDiagnosticResult {
  /** NÃ…â€œuds avec des capacitÃƒÂ©s manquantes aprÃƒÂ¨s copie */
  missingCapacities: Array<{
    nodeId: string;
    label: string | null;
    expectedCapacity: 'formula' | 'condition' | 'table';
    hasFlag: boolean;
    actualCount: number;
  }>;
  /** NÃ…â€œuds avec des valeurs hÃƒÂ©ritÃƒÂ©es incorrectes */
  inheritedValues: Array<{
    nodeId: string;
    label: string | null;
    originalValue: unknown;
    copiedValue: unknown;
    shouldBeIndependent: boolean;
  }>;
  /** Recommandations de correction */
  recommendations: string[];
}

/**
 * Ã°Å¸â€Â Diagnostiquer les problÃƒÂ¨mes de copie des nÃ…â€œuds
 */
export async function diagnoseCopyProblems(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<CopyDiagnosticResult> {
  
  const result: CopyDiagnosticResult = {
    missingCapacities: [],
    inheritedValues: [],
    recommendations: []
  };

  // RÃƒÂ©cupÃƒÂ©rer tous les nÃ…â€œuds copiÃƒÂ©s avec leurs capacitÃƒÂ©s
  const copiedNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: copiedNodeIds } },
    include: {
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true,
      TreeBranchLeafNodeTable: true,
      TreeBranchLeafNodeVariable: true
    }
  });


  for (const node of copiedNodes) {
    // Identifier le nÃ…â€œud original (sans suffixe -1, -2, etc.)
    const originalId = node.id.replace(/-\d+$/, '');
    if (originalId === node.id) continue; // Ce n'est pas une copie

    const original = await prisma.treeBranchLeafNode.findUnique({
      where: { id: originalId },
      include: {
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true,
        TreeBranchLeafNodeTable: true,
        TreeBranchLeafNodeVariable: true
      }
    });

    if (!original) continue;


    // VÃƒÂ©rifier les capacitÃƒÂ©s manquantes
    if (node.hasFormula && node.TreeBranchLeafNodeFormula.length === 0) {
      result.missingCapacities.push({
        nodeId: node.id,
        label: node.label,
        expectedCapacity: 'formula',
        hasFlag: node.hasFormula,
        actualCount: node.TreeBranchLeafNodeFormula.length
      });
    }

    if (node.hasCondition && node.TreeBranchLeafNodeCondition.length === 0) {
      result.missingCapacities.push({
        nodeId: node.id,
        label: node.label,
        expectedCapacity: 'condition',
        hasFlag: node.hasCondition,
        actualCount: node.TreeBranchLeafNodeCondition.length
      });
    }

    if (node.hasTable && node.TreeBranchLeafNodeTable.length === 0) {
      result.missingCapacities.push({
        nodeId: node.id,
        label: node.label,
        expectedCapacity: 'table',
        hasFlag: node.hasTable,
        actualCount: node.TreeBranchLeafNodeTable.length
      });
    }

    // VÃƒÂ©rifier les valeurs hÃƒÂ©ritÃƒÂ©es
    if (node.calculatedValue === original.calculatedValue && 
        node.calculatedValue !== null &&
        (node.hasFormula || node.hasCondition || node.hasTable)) {
      result.inheritedValues.push({
        nodeId: node.id,
        label: node.label,
        originalValue: original.calculatedValue,
        copiedValue: node.calculatedValue,
        shouldBeIndependent: true
      });
    }

    // Analyser les dÃƒÂ©calages de capacitÃƒÂ©s pour ce nÃ…â€œud
    const capacityMismatches = await analyzeCapacityMismatches(prisma, node.id);
    if (capacityMismatches.length > 0) {
      // Corriger automatiquement les flags incorrects
      await fixCapacityFlags(prisma, node.id, capacityMismatches);
    }
  }

  // GÃƒÂ©nÃƒÂ©rer les recommandations
  if (result.missingCapacities.length > 0) {
    result.recommendations.push(`${result.missingCapacities.length} nÃ…â€œuds ont des capacitÃƒÂ©s manquantes aprÃƒÂ¨s copie - vÃƒÂ©rifier le processus de copie des formules/conditions/tables`);
  }

  if (result.inheritedValues.length > 0) {
    result.recommendations.push(`${result.inheritedValues.length} nÃ…â€œuds ont hÃƒÂ©ritÃƒÂ© des valeurs de l'original - forcer calculatedValue ÃƒÂ  null aprÃƒÂ¨s copie`);
  }


  return result;
}

/**
 * Ã°Å¸â€ºÂ Ã¯Â¸Â Corriger les problÃƒÂ¨mes de copie dÃƒÂ©tectÃƒÂ©s
 */
export async function fixCopyProblems(
  prisma: PrismaClient,
  diagnostic: CopyDiagnosticResult
): Promise<void> {

  // Corriger les valeurs hÃƒÂ©ritÃƒÂ©es
  if (diagnostic.inheritedValues.length > 0) {
    
    const nodeIds = diagnostic.inheritedValues.map(item => item.nodeId);
    const result = await prisma.treeBranchLeafNode.updateMany({
      where: { id: { in: nodeIds } },
      data: { calculatedValue: null }
    });

  }

  // Les capacitÃƒÂ©s manquantes nÃƒÂ©cessitent une correction plus complexe
  // qui doit se faire dans le processus de copie lui-mÃƒÂªme
  if (diagnostic.missingCapacities.length > 0) {
    
    for (const missing of diagnostic.missingCapacities) {
    }
  }
}

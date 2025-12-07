/**
 * 🔍 Service de diagnostic des copies incomplètes
 * 
 * Ce service identifie pourquoi les champs copiés gardent les valeurs de l'original
 * et propose des corrections dans le processus de copie.
 */

import { type PrismaClient } from '@prisma/client';
import { analyzeCapacityMismatches, fixCapacityFlags } from './capacity-mismatch-analyzer.js';

export interface CopyDiagnosticResult {
  /** Nœuds avec des capacités manquantes après copie */
  missingCapacities: Array<{
    nodeId: string;
    label: string | null;
    expectedCapacity: 'formula' | 'condition' | 'table';
    hasFlag: boolean;
    actualCount: number;
  }>;
  /** Nœuds avec des valeurs héritées incorrectes */
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
 * 🔍 Diagnostiquer les problèmes de copie des nœuds
 */
export async function diagnoseCopyProblems(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<CopyDiagnosticResult> {
  console.log(`🔍 [DIAGNOSTIC] Analyse de ${copiedNodeIds.length} nœuds copiés`);
  
  const result: CopyDiagnosticResult = {
    missingCapacities: [],
    inheritedValues: [],
    recommendations: []
  };

  // Récupérer tous les nœuds copiés avec leurs capacités
  const copiedNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: copiedNodeIds } },
    include: {
      TreeBranchLeafNodeFormula: true,
      TreeBranchLeafNodeCondition: true,
      TreeBranchLeafNodeTable: true,
      TreeBranchLeafNodeVariable: true
    }
  });

  console.log(`🔍 [DIAGNOSTIC] Trouvé ${copiedNodes.length} nœuds copiés`);

  for (const node of copiedNodes) {
    // Identifier le nœud original (sans suffixe -1, -2, etc.)
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

    console.log(`\n🔍 [DIAGNOSTIC] Analyse ${node.label} (copie de ${original.label})`);
    console.log(`  Original: hasFormula=${original.hasFormula}, formules=${original.TreeBranchLeafNodeFormula.length}`);
    console.log(`  Copié: hasFormula=${node.hasFormula}, formules=${node.TreeBranchLeafNodeFormula.length}`);
    console.log(`  Original calculatedValue: ${original.calculatedValue}`);
    console.log(`  Copié calculatedValue: ${node.calculatedValue}`);

    // Vérifier les capacités manquantes
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

    // Vérifier les valeurs héritées
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

    // Analyser les décalages de capacités pour ce nœud
    const capacityMismatches = await analyzeCapacityMismatches(prisma, node.id);
    if (capacityMismatches.length > 0) {
      console.log(`⚠️ [DIAGNOSTIC] ${capacityMismatches.length} décalages de capacités détectés pour ${node.label}`);
      // Corriger automatiquement les flags incorrects
      await fixCapacityFlags(prisma, node.id, capacityMismatches);
    }
  }

  // Générer les recommandations
  if (result.missingCapacities.length > 0) {
    result.recommendations.push(`${result.missingCapacities.length} nœuds ont des capacités manquantes après copie - vérifier le processus de copie des formules/conditions/tables`);
  }

  if (result.inheritedValues.length > 0) {
    result.recommendations.push(`${result.inheritedValues.length} nœuds ont hérité des valeurs de l'original - forcer calculatedValue à null après copie`);
  }

  console.log(`\n🔍 [DIAGNOSTIC] === RÉSULTATS ===`);
  console.log(`  Capacités manquantes: ${result.missingCapacities.length}`);
  console.log(`  Valeurs héritées: ${result.inheritedValues.length}`);
  console.log(`  Recommandations: ${result.recommendations.length}`);

  return result;
}

/**
 * 🛠️ Corriger les problèmes de copie détectés
 */
export async function fixCopyProblems(
  prisma: PrismaClient,
  diagnostic: CopyDiagnosticResult
): Promise<void> {
  console.log(`🛠️ [FIX] Correction des problèmes détectés`);

  // Corriger les valeurs héritées
  if (diagnostic.inheritedValues.length > 0) {
    console.log(`🛠️ [FIX] Reset de ${diagnostic.inheritedValues.length} valeurs héritées`);
    
    const nodeIds = diagnostic.inheritedValues.map(item => item.nodeId);
    const result = await prisma.treeBranchLeafNode.updateMany({
      where: { id: { in: nodeIds } },
      data: { calculatedValue: null }
    });

    console.log(`✅ [FIX] ${result.count} valeurs remises à null`);
  }

  // Les capacités manquantes nécessitent une correction plus complexe
  // qui doit se faire dans le processus de copie lui-même
  if (diagnostic.missingCapacities.length > 0) {
    console.log(`⚠️ [FIX] ${diagnostic.missingCapacities.length} capacités manquantes nécessitent une correction du processus de copie`);
    
    for (const missing of diagnostic.missingCapacities) {
      console.log(`  - ${missing.label} (${missing.nodeId}): ${missing.expectedCapacity} manquante`);
    }
  }
}
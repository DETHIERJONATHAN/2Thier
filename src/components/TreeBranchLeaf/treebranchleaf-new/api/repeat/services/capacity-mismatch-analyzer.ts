/**
 * 🧪 Service de test spécifique pour les problèmes de capacités manquantes
 * 
 * Ce service se concentre sur le cas précis où un nœud copié a le flag
 * hasTable=true mais aucune table associée (Tables: 0)
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
 * 🔍 Analyser les décalages entre flags de capacité et capacités réelles
 */
export async function analyzeCapacityMismatches(
  prisma: PrismaClient,
  nodeId: string
): Promise<CapacityMismatchAnalysis[]> {
  console.log(`🔍 [CAPACITY-ANALYSIS] Analyse des décalages pour ${nodeId}`);
  
  const results: CapacityMismatchAnalysis[] = [];
  
  // Récupérer le nœud avec toutes ses capacités
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
    console.log(`❌ [CAPACITY-ANALYSIS] Nœud ${nodeId} introuvable`);
    return results;
  }

  // Trouver le nœud original si c'est une copie
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

  console.log(`📊 [CAPACITY-ANALYSIS] Node: ${node.label} (${node.id})`);
  console.log(`  hasFormula: ${node.hasFormula}, formulas: ${node.TreeBranchLeafNodeFormula.length}`);
  console.log(`  hasCondition: ${node.hasCondition}, conditions: ${node.TreeBranchLeafNodeCondition.length}`);
  console.log(`  hasTable: ${node.hasTable}, tables: ${node.TreeBranchLeafNodeTable.length}`);
  
  if (originalNode) {
    console.log(`📊 [CAPACITY-ANALYSIS] Original: ${originalNode.label} (${originalNode.id})`);
    console.log(`  hasFormula: ${originalNode.hasFormula}, formulas: ${originalNode.TreeBranchLeafNodeFormula.length}`);
    console.log(`  hasCondition: ${originalNode.hasCondition}, conditions: ${originalNode.TreeBranchLeafNodeCondition.length}`);
    console.log(`  hasTable: ${originalNode.hasTable}, tables: ${originalNode.TreeBranchLeafNodeTable.length}`);
  }

  // Analyser les décalages
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
        causes.push(`Problème dans le processus de copie des ${check.type}s`);
        suggestedFix = `Vérifier pourquoi copy${check.type.charAt(0).toUpperCase() + check.type.slice(1)}Capacity a échoué`;
      } else {
        causes.push(`Le flag has${check.type.charAt(0).toUpperCase() + check.type.slice(1)} est incorrect`);
        suggestedFix = `Corriger le flag has${check.type.charAt(0).toUpperCase() + check.type.slice(1)} à false`;
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

      console.log(`⚠️ [CAPACITY-ANALYSIS] DÉCALAGE DÉTECTÉ: ${check.type}`);
      console.log(`   Flag: ${check.hasFlag}, Réel: ${check.actualCount}, Original: ${check.originalCount}`);
      console.log(`   Causes possibles: ${causes.join(', ')}`);
    }
  }

  return results;
}

/**
 * 🛠️ Corriger automatiquement les flags de capacité incorrects
 */
export async function fixCapacityFlags(
  prisma: PrismaClient,
  nodeId: string,
  analysis: CapacityMismatchAnalysis[]
): Promise<void> {
  if (analysis.length === 0) {
    console.log(`✅ [CAPACITY-FIX] Aucune correction nécessaire pour ${nodeId}`);
    return;
  }

  console.log(`🛠️ [CAPACITY-FIX] Correction des flags pour ${nodeId}`);
  
  const updateData: Record<string, boolean> = {};
  
  for (const mismatch of analysis) {
    if (mismatch.actualCapacityCount === 0 && mismatch.hasCapacityFlag) {
      // Si pas de capacité mais flag à true, mettre le flag à false
      const flagName = `has${mismatch.capacityType.charAt(0).toUpperCase() + mismatch.capacityType.slice(1)}`;
      updateData[flagName] = false;
      console.log(`🛠️ [CAPACITY-FIX] Correction ${flagName}: true → false`);
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: updateData
    });
    console.log(`✅ [CAPACITY-FIX] Flags corrigés pour ${nodeId}`);
  }
}
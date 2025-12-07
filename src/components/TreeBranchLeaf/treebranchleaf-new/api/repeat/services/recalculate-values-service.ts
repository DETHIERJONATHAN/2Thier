/**
 * 🔄 Service de recalcul des valeurs calculées après duplication
 * 
 * Après qu'un nœud soit dupliqué avec ses formules/conditions/tables,
 * ce service s'assure que les nouvelles valeurs calculées sont recalculées
 * plutôt que d'hériter des valeurs de l'original.
 * 
 * PRINCIPE :
 * - Les nœuds copiés ont leurs propres formules/conditions/tables copiées
 * - Mais leurs calculatedValue peuvent encore pointer vers les anciennes valeurs
 * - Ce service force le recalcul pour garantir l'indépendance
 */

import { type PrismaClient } from '@prisma/client';
import type { DuplicationContext } from '../../registry/repeat-id-registry.js';

/**
 * Options pour le recalcul des valeurs
 */
export interface RecalculateValuesOptions {
  /** Map des nœuds copiés (ancien ID → nouveau ID) */
  nodeIdMap: Map<string, string>;
  /** Contexte de duplication pour les logs */
  context?: DuplicationContext;
  /** Force le recalcul même si une valeur existe déjà */
  forceRecalculation?: boolean;
}

/**
 * Résultat du recalcul
 */
export interface RecalculateValuesResult {
  /** Nombre de nœuds recalculés avec succès */
  recalculatedCount: number;
  /** Nœuds qui ont échoué */
  failedNodes: Array<{ nodeId: string; error: string }>;
  /** Détails des recalculs */
  details: Array<{
    nodeId: string;
    label: string | null;
    oldValue: unknown;
    newValue: unknown;
    capacityType: 'formula' | 'condition' | 'table' | null;
  }>;
}

/**
 * 🔄 Recalcule les valeurs calculées pour les nœuds copiés
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
    console.log('🔄 [RECALCULATE] Aucun nœud à recalculer');
    return result;
  }

  console.log(`🔄 [RECALCULATE] Début recalcul pour ${nodeIdMap.size} nœuds copiés`);

  // Récupérer tous les nœuds copiés qui ont des capacités
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

  console.log(`🔄 [RECALCULATE] Trouvé ${nodesWithCapacities.length} nœuds avec capacités à recalculer`);

  for (const node of nodesWithCapacities) {
    try {
      const oldValue = node.calculatedValue;
      let newValue: unknown = null;
      let capacityType: 'formula' | 'condition' | 'table' | null = null;

      // Identifier le type de capacité et recalculer
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

      // Mettre à jour la valeur calculée si elle a changé ou si force
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

        console.log(`✅ [RECALCULATE] ${node.label || node.id}: ${oldValue} → ${newValue} (${capacityType})`);
      } else {
        console.log(`⚪ [RECALCULATE] ${node.label || node.id}: valeur inchangée (${capacityType})`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.failedNodes.push({
        nodeId: node.id,
        error: errorMsg
      });
      console.error(`❌ [RECALCULATE] Erreur pour ${node.label || node.id}:`, errorMsg);
    }
  }

  console.log(`🔄 [RECALCULATE] Terminé: ${result.recalculatedCount} recalculés, ${result.failedNodes.length} échecs`);
  
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
  console.log(`🧮 [FORMULA] Recalcul formule ${formulaId} pour nœud ${nodeId}`);
  
  // Pour l'instant, remettre à null pour forcer un nouveau calcul
  // Dans une implémentation complète, on utiliserait le moteur de formules
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
  console.log(`🔀 [CONDITION] Recalcul condition ${conditionId} pour nœud ${nodeId}`);
  
  // Pour l'instant, remettre à null pour forcer un nouveau calcul
  // Dans une implémentation complète, on utiliserait le moteur de conditions
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
  console.log(`📊 [TABLE] Recalcul table ${tableId} pour nœud ${nodeId}`);
  
  // Pour l'instant, remettre à null pour forcer un nouveau calcul
  // Dans une implémentation complète, on utiliserait le moteur de tables
  return null;
}

/**
 * 🔄 MÉTHODE SIMPLE : Remet toutes les valeurs calculées à null
 * pour forcer un recalcul côté frontend
 */
export async function resetCalculatedValuesAfterCopy(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<number> {
  console.log(`🔄 [RESET] === DÉBUT RESET DES VALEURS CALCULÉES ===`);
  console.log(`🔄 [RESET] Nœuds à traiter: ${copiedNodeIds.length}`);
  console.log(`🔄 [RESET] IDs des nœuds:`, copiedNodeIds.slice(0, 3), '...');
  
  // D'abord vérifier quels nœuds ont des capacités
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
  
  console.log(`🔄 [RESET] Trouvé ${nodesWithCapacities.length} nœuds avec capacités:`);
  for (const node of nodesWithCapacities) {
    console.log(`  - ${node.label} (${node.id}): calculatedValue=${node.calculatedValue}, hasFormula=${node.hasFormula}, hasCondition=${node.hasCondition}, hasTable=${node.hasTable}`);
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

  console.log(`✅ [RESET] ${result.count} valeurs calculées remises à null`);
  console.log(`🔄 [RESET] === FIN RESET DES VALEURS CALCULÉES ===`);
  return result.count;
}
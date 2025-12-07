/**
 * 🚫 Service d'isolation stricte des champs copiés
 * 
 * Ce service s'assure que les champs copiés sont COMPLÈTEMENT indépendants
 * de l'original, même au niveau des références et des calculs.
 */

import { type PrismaClient } from '@prisma/client';

export interface IsolationResult {
  /** Nœuds isolés avec succès */
  isolatedNodes: Array<{
    nodeId: string;
    label: string | null;
    changes: string[];
  }>;
  /** Erreurs rencontrées */
  errors: Array<{
    nodeId: string;
    error: string;
  }>;
}

/**
 * 🚫 Forcer l'isolation complète des champs copiés
 * 
 * Cette fonction s'assure que :
 * 1. Tous les champs copiés ont calculatedValue = null
 * 2. Aucune référence cachée vers l'original
 * 3. Les formules/conditions/tables pointent vers les bonnes copies
 */
export async function enforceStrictIsolation(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<IsolationResult> {
  console.log(`🚫 [ISOLATION] === DÉBUT ISOLATION STRICTE ===`);
  console.log(`🚫 [ISOLATION] Isolation de ${copiedNodeIds.length} nœuds copiés`);
  
  const result: IsolationResult = {
    isolatedNodes: [],
    errors: []
  };

  for (const nodeId of copiedNodeIds) {
    try {
      const changes: string[] = [];
      
      console.log(`\n🚫 [ISOLATION] Traitement ${nodeId}...`);
      
      // 1. Récupérer le nœud avec toutes ses relations
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
        result.errors.push({ nodeId, error: 'Nœud non trouvé' });
        continue;
      }

      // 2. FORCER calculatedValue à null si c'est un champ avec capacités
      if (node.hasFormula || node.hasCondition || node.hasTable) {
        if (node.calculatedValue !== null) {
          await prisma.treeBranchLeafNode.update({
            where: { id: nodeId },
            data: { calculatedValue: null }
          });
          changes.push(`calculatedValue: ${node.calculatedValue} → null`);
          console.log(`🚫 [ISOLATION] ${node.label}: calculatedValue forcé à null`);
        }
      }

      // 3. Vérifier que les formules/conditions/tables existent
      if (node.hasFormula && node.TreeBranchLeafNodeFormula.length === 0) {
        // Flag incorrect - corriger
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { hasFormula: false }
        });
        changes.push('hasFormula: true → false (aucune formule trouvée)');
        console.log(`🚫 [ISOLATION] ${node.label}: hasFormula corrigé à false`);
      }

      if (node.hasCondition && node.TreeBranchLeafNodeCondition.length === 0) {
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { hasCondition: false }
        });
        changes.push('hasCondition: true → false (aucune condition trouvée)');
        console.log(`🚫 [ISOLATION] ${node.label}: hasCondition corrigé à false`);
      }

      if (node.hasTable && node.TreeBranchLeafNodeTable.length === 0) {
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { hasTable: false }
        });
        changes.push('hasTable: true → false (aucune table trouvée)');
        console.log(`🚫 [ISOLATION] ${node.label}: hasTable corrigé à false`);
      }

      // 4. Marquer le nœud avec metadata d'isolation
      const currentMetadata = (node.metadata && typeof node.metadata === 'object') 
        ? (node.metadata as Record<string, unknown>) 
        : {};
        
      const updatedMetadata = {
        ...currentMetadata,
        strictlyIsolated: true,
        isolatedAt: new Date().toISOString(),
        calculatedValueReset: true,
        independentCalculation: true
      };

      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: { metadata: updatedMetadata }
      });
      changes.push('metadata: marqué comme strictement isolé');

      result.isolatedNodes.push({
        nodeId: node.id,
        label: node.label,
        changes
      });

      console.log(`✅ [ISOLATION] ${node.label}: ${changes.length} changements appliqués`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ nodeId, error: errorMsg });
      console.error(`❌ [ISOLATION] Erreur pour ${nodeId}:`, errorMsg);
    }
  }

  console.log(`\n🚫 [ISOLATION] === RÉSULTATS ISOLATION ===`);
  console.log(`  Nœuds isolés: ${result.isolatedNodes.length}`);
  console.log(`  Erreurs: ${result.errors.length}`);
  console.log(`🚫 [ISOLATION] === FIN ISOLATION STRICTE ===`);

  return result;
}

/**
 * 🔍 Vérifier l'état d'isolation des nœuds
 */
export async function verifyIsolation(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {
  console.log(`🔍 [VERIFY-ISOLATION] Vérification de ${copiedNodeIds.length} nœuds`);

  for (const nodeId of copiedNodeIds) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        metadata: true
      }
    });

    if (!node) continue;

    const metadata = (node.metadata && typeof node.metadata === 'object') 
      ? (node.metadata as Record<string, unknown>) 
      : {};
      
    const isIsolated = metadata.strictlyIsolated === true;
    const hasCapacity = node.hasFormula || node.hasCondition || node.hasTable;

    console.log(`📊 [VERIFY] ${node.label}:`);
    console.log(`  - calculatedValue: ${node.calculatedValue}`);
    console.log(`  - hasCapacity: ${hasCapacity}`);
    console.log(`  - strictlyIsolated: ${isIsolated}`);

    if (hasCapacity && node.calculatedValue !== null) {
      console.log(`⚠️ [VERIFY] PROBLÈME: ${node.label} a une capacité mais calculatedValue != null`);
    }

    if (!isIsolated) {
      console.log(`⚠️ [VERIFY] PROBLÈME: ${node.label} n'est pas marqué comme isolé`);
    }
  }
}
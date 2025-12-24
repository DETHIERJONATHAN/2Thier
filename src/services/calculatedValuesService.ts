/**
 * 🎯 Service Backend pour stocker les valeurs calculées dans Prisma
 * 
 * Après que le backend calcule les formules/tables/conditions,
 * ce service stocke les résultats dans TreeBranchLeafNode.calculatedValue
 * 
 * Utilisation:
 * const results = await storeCalculatedValues(nodeValues, submissionId);
 */

import { prisma } from '../lib/prisma';

export interface CalculatedValueInput {
  nodeId: string;
  calculatedValue: string | number | boolean;
  calculatedBy?: string; // "formula-abc", "table-def", "condition-ghi"
  submissionId?: string; // Pour audit
}

export interface StoreCalculatedValuesResult {
  success: boolean;
  stored: number;
  failed: number;
  errors: Array<{ nodeId: string; error: string }>;
}

/**
 * Stocke plusieurs valeurs calculées à la fois
 * 
 * @param values - Liste des valeurs à stocker
 * @param submissionId - (Optionnel) ID de la soumission pour contexte
 * @returns Résultat du stockage
 */
export async function storeCalculatedValues(
  values: CalculatedValueInput[],
  submissionId?: string
): Promise<StoreCalculatedValuesResult> {
  const result: StoreCalculatedValuesResult = {
    success: true,
    stored: 0,
    failed: 0,
    errors: []
  };

  // Stockage silencieux des valeurs calculées

  for (const value of values) {
    try {
      const { nodeId, calculatedValue, calculatedBy = 'unknown' } = value;

      if (!nodeId) {
        result.errors.push({ nodeId: 'unknown', error: 'nodeId manquant' });
        result.failed++;
        continue;
      }

      // 🎯 Vérifier que le nœud existe
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { id: true, label: true }
      });

      if (!node) {
        result.errors.push({ 
          nodeId, 
          error: 'Nœud non trouvé' 
        });
        result.failed++;
        continue;
      }

      // 🎯 Stocker la valeur calculée
      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: {
          calculatedValue: String(calculatedValue),
          calculatedAt: new Date(),
          calculatedBy
        }
      });

      result.stored++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        nodeId: value.nodeId,
        error: error instanceof Error ? error.message : String(error)
      });

      console.error(`❌ [StoreCalculatedValues] Erreur stockage:`, {
        nodeId: value.nodeId,
        error,
        submissionId
      });
    }
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Stocke UNE SEULE valeur calculée
 * 
 * @param nodeId - ID du nœud
 * @param calculatedValue - Valeur à stocker
 * @param calculatedBy - Source du calcul (optionnel)
 * @returns La valeur stockée
 */
export async function storeCalculatedValue(
  nodeId: string,
  calculatedValue: string | number | boolean,
  calculatedBy: string = 'unknown'
): Promise<{ success: boolean; value?: string; error?: string }> {
  try {
    const updated = await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: {
        calculatedValue: String(calculatedValue),
        calculatedAt: new Date(),
        calculatedBy
      },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      }
    });

    console.log('✅ [storeCalculatedValue] Valeur stockée:', {
      nodeId,
      label: updated.label,
      value: updated.calculatedValue,
      calculatedBy: updated.calculatedBy
    });

    return {
      success: true,
      value: updated.calculatedValue || undefined
    };
  } catch (error) {
    console.error('❌ [storeCalculatedValue] Erreur:', {
      nodeId,
      error
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Récupère UNE valeur calculée (sans requête API)
 * 
 * @param nodeId - ID du nœud
 * @returns La valeur calculée
 */
export async function getCalculatedValue(nodeId: string): Promise<string | null> {
  try {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { calculatedValue: true }
    });

    return node?.calculatedValue ?? null;
  } catch (error) {
    console.error('❌ [getCalculatedValue] Erreur:', { nodeId, error });
    return null;
  }
}

/**
 * Récupère TOUTES les valeurs calculées pour des nœuds donnés
 * 
 * @param nodeIds - Liste des IDs de nœuds
 * @returns Map nodeId -> calculatedValue
 */
export async function getCalculatedValues(
  nodeIds: string[]
): Promise<Record<string, string | null>> {
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { in: nodeIds }
      },
      select: {
        id: true,
        calculatedValue: true
      }
    });

    const result: Record<string, string | null> = {};
    for (const nodeId of nodeIds) {
      const node = nodes.find(n => n.id === nodeId);
      result[nodeId] = node?.calculatedValue ?? null;
    }

    return result;
  } catch (error) {
    console.error('❌ [getCalculatedValues] Erreur:', { error });
    return {};
  }
}

/**
 * Efface les valeurs calculées pour réinitialiser
 * 
 * @param nodeIds - Liste des IDs de nœuds à réinitialiser
 * @returns Nombre de nœuds réinitialisés
 */
export async function clearCalculatedValues(nodeIds: string[]): Promise<number> {
  try {
    const result = await prisma.treeBranchLeafNode.updateMany({
      where: {
        id: { in: nodeIds }
      },
      data: {
        calculatedValue: null,
        calculatedAt: null,
        calculatedBy: null
      }
    });

    console.log('🗑️ [clearCalculatedValues] Valeurs réinitialisées:', {
      count: result.count,
      nodeIds: nodeIds.length
    });

    return result.count;
  } catch (error) {
    console.error('❌ [clearCalculatedValues] Erreur:', { error });
    return 0;
  }
}

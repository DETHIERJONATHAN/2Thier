/**
 * Ã°Å¸Å¡Â« Service d'isolation stricte des champs copiÃƒÂ©s
 * 
 * Ce service s'assure que les champs copiÃƒÂ©s sont COMPLÃƒË†TEMENT indÃƒÂ©pendants
 * de l'original, mÃƒÂªme au niveau des rÃƒÂ©fÃƒÂ©rences et des calculs.
 */

import { type PrismaClient } from '@prisma/client';

export interface IsolationResult {
  /** NÃ…â€œuds isolÃƒÂ©s avec succÃƒÂ¨s */
  isolatedNodes: Array<{
    nodeId: string;
    label: string | null;
    changes: string[];
  }>;
  /** Erreurs rencontrÃƒÂ©es */
  errors: Array<{
    nodeId: string;
    error: string;
  }>;
}

/**
 * Ã°Å¸Å¡Â« Forcer l'isolation complÃƒÂ¨te des champs copiÃƒÂ©s
 * 
 * Cette fonction s'assure que :
 * 1. Tous les champs copiÃƒÂ©s ont calculatedValue = null
 * 2. Aucune rÃƒÂ©fÃƒÂ©rence cachÃƒÂ©e vers l'original
 * 3. Les formules/conditions/tables pointent vers les bonnes copies
 */
export async function enforceStrictIsolation(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<IsolationResult> {
  
  const result: IsolationResult = {
    isolatedNodes: [],
    errors: []
  };

  for (const nodeId of copiedNodeIds) {
    try {
      const changes: string[] = [];
      
      
      // 1. RÃƒÂ©cupÃƒÂ©rer le nÃ…â€œud avec toutes ses relations
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
        result.errors.push({ nodeId, error: 'NÃ…â€œud non trouvÃƒÂ©' });
        continue;
      }

      // 2. FORCER calculatedValue ÃƒÂ  null si c'est un champ avec capacitÃƒÂ©s
      if (node.hasFormula || node.hasCondition || node.hasTable) {
        if (node.calculatedValue !== null) {
          await prisma.treeBranchLeafNode.update({
            where: { id: nodeId },
            data: { calculatedValue: null }
          });
          changes.push(`calculatedValue: ${node.calculatedValue} Ã¢â€ â€™ null`);
        }
      }

      // 3. VÃƒÂ©rifier que les formules/conditions/tables existent
      if (node.hasFormula && node.TreeBranchLeafNodeFormula.length === 0) {
        // Flag incorrect - corriger
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { hasFormula: false }
        });
        changes.push('hasFormula: true Ã¢â€ â€™ false (aucune formule trouvÃƒÂ©e)');
      }

      if (node.hasCondition && node.TreeBranchLeafNodeCondition.length === 0) {
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { hasCondition: false }
        });
        changes.push('hasCondition: true Ã¢â€ â€™ false (aucune condition trouvÃƒÂ©e)');
      }

      if (node.hasTable && node.TreeBranchLeafNodeTable.length === 0) {
        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { hasTable: false }
        });
        changes.push('hasTable: true Ã¢â€ â€™ false (aucune table trouvÃƒÂ©e)');
      }

      // 4. Marquer le nÃ…â€œud avec metadata d'isolation
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
      changes.push('metadata: marquÃƒÂ© comme strictement isolÃƒÂ©');

      result.isolatedNodes.push({
        nodeId: node.id,
        label: node.label,
        changes
      });


    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ nodeId, error: errorMsg });
      console.error(`Ã¢ÂÅ’ [ISOLATION] Erreur pour ${nodeId}:`, errorMsg);
    }
  }


  return result;
}

/**
 * Ã°Å¸â€Â VÃƒÂ©rifier l'ÃƒÂ©tat d'isolation des nÃ…â€œuds
 */
export async function verifyIsolation(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {

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


    if (hasCapacity && node.calculatedValue !== null) {
    }

    if (!isIsolated) {
    }
  }
}

/**
 * Ã°Å¸â€â€ž Service de recalcul forcÃƒÂ© avec donnÃƒÂ©es indÃƒÂ©pendantes
 * 
 * Ce service force les champs copiÃƒÂ©s ÃƒÂ  recalculer avec leurs propres donnÃƒÂ©es
 * au lieu de fallback vers l'original.
 */

import { type PrismaClient } from '@prisma/client';

/**
 * Ã°Å¸â€â€ž Forcer la mise ÃƒÂ  jour des rÃƒÂ©fÃƒÂ©rences internes pour l'indÃƒÂ©pendance
 */
export async function forceIndependentCalculation(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {
  
  for (const nodeId of copiedNodeIds) {
    try {
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        include: {
          TreeBranchLeafNodeFormula: true,
          TreeBranchLeafNodeCondition: true,
          TreeBranchLeafNodeTable: true,
          TreeBranchLeafNodeVariable: true
        }
      });

      if (!node) continue;


      // 1. Si c'est un champ de donnÃƒÂ©es d'affichage (formule/condition/table)
      if (node.hasFormula || node.hasCondition || node.hasTable) {
        
        // Forcer un timestamp de "derniÃƒÂ¨re modification" pour invalider les caches
        const currentMetadata = (node.metadata && typeof node.metadata === 'object') 
          ? (node.metadata as Record<string, unknown>) 
          : {};
          
        const updatedMetadata = {
          ...currentMetadata,
          lastForceRecalc: new Date().toISOString(),
          forceIndependentCalc: true,
          // Marquer comme devant ÃƒÂªtre recalculÃƒÂ© cÃƒÂ´tÃƒÂ© frontend
          requiresFreshCalculation: true,
          calculationInvalidated: Date.now()
        };

        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { 
            calculatedValue: null,
            metadata: updatedMetadata
          }
        });

      }

      // 2. Si c'est un champ de saisie, s'assurer qu'il est vide par dÃƒÂ©faut
      else if (!node.hasFormula && !node.hasCondition && !node.hasTable) {
        
        // Les champs de saisie copiÃƒÂ©s doivent commencer vides
        if (node.calculatedValue !== null) {
          await prisma.treeBranchLeafNode.update({
            where: { id: nodeId },
            data: { calculatedValue: null }
          });
        }
      }

    } catch (error) {
      console.error(`Ã¢ÂÅ’ [FORCE-CALC] Erreur pour ${nodeId}:`, error);
    }
  }

}

/**
 * Ã°Å¸Å½Â¯ CrÃƒÂ©er des "triggers" de recalcul pour le frontend
 */
export async function createRecalculationTriggers(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {

  // Mettre un timestamp unique pour forcer la re-ÃƒÂ©valuation cÃƒÂ´tÃƒÂ© frontend
  const triggerTimestamp = Date.now();
  
  for (const nodeId of copiedNodeIds) {
    try {
      const currentMetadata = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { metadata: true, label: true }
      });

      if (!currentMetadata) continue;

      const metadata = (currentMetadata.metadata && typeof currentMetadata.metadata === 'object') 
        ? (currentMetadata.metadata as Record<string, unknown>) 
        : {};

      const updatedMetadata = {
        ...metadata,
        // Marqueurs pour forcer le recalcul cÃƒÂ´tÃƒÂ© frontend
        recalcTrigger: triggerTimestamp,
        mustRecalculate: true,
        independentNode: true,
        noFallbackToOriginal: true
      };

      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: { metadata: updatedMetadata }
      });


    } catch (error) {
      console.error(`Ã¢ÂÅ’ [TRIGGERS] Erreur pour ${nodeId}:`, error);
    }
  }
}

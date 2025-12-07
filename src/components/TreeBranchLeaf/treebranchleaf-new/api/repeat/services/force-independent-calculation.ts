/**
 * 🔄 Service de recalcul forcé avec données indépendantes
 * 
 * Ce service force les champs copiés à recalculer avec leurs propres données
 * au lieu de fallback vers l'original.
 */

import { type PrismaClient } from '@prisma/client';

/**
 * 🔄 Forcer la mise à jour des références internes pour l'indépendance
 */
export async function forceIndependentCalculation(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {
  console.log(`🔄 [FORCE-CALC] === FORÇAGE CALCUL INDÉPENDANT ===`);
  
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

      console.log(`🔄 [FORCE-CALC] Traitement ${node.label} (${nodeId})`);

      // 1. Si c'est un champ de données d'affichage (formule/condition/table)
      if (node.hasFormula || node.hasCondition || node.hasTable) {
        console.log(`📊 [FORCE-CALC] ${node.label}: champ de données d'affichage détecté`);
        
        // Forcer un timestamp de "dernière modification" pour invalider les caches
        const currentMetadata = (node.metadata && typeof node.metadata === 'object') 
          ? (node.metadata as Record<string, unknown>) 
          : {};
          
        const updatedMetadata = {
          ...currentMetadata,
          lastForceRecalc: new Date().toISOString(),
          forceIndependentCalc: true,
          // Marquer comme devant être recalculé côté frontend
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

        console.log(`✅ [FORCE-CALC] ${node.label}: métadonnées de recalcul mises à jour`);
      }

      // 2. Si c'est un champ de saisie, s'assurer qu'il est vide par défaut
      else if (!node.hasFormula && !node.hasCondition && !node.hasTable) {
        console.log(`📝 [FORCE-CALC] ${node.label}: champ de saisie - s'assurer qu'il est vide`);
        
        // Les champs de saisie copiés doivent commencer vides
        if (node.calculatedValue !== null) {
          await prisma.treeBranchLeafNode.update({
            where: { id: nodeId },
            data: { calculatedValue: null }
          });
          console.log(`🧹 [FORCE-CALC] ${node.label}: valeur de saisie remise à null`);
        }
      }

    } catch (error) {
      console.error(`❌ [FORCE-CALC] Erreur pour ${nodeId}:`, error);
    }
  }

  console.log(`🔄 [FORCE-CALC] === FIN FORÇAGE CALCUL ===`);
}

/**
 * 🎯 Créer des "triggers" de recalcul pour le frontend
 */
export async function createRecalculationTriggers(
  prisma: PrismaClient,
  copiedNodeIds: string[]
): Promise<void> {
  console.log(`🎯 [TRIGGERS] Création de triggers de recalcul pour ${copiedNodeIds.length} nœuds`);

  // Mettre un timestamp unique pour forcer la re-évaluation côté frontend
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
        // Marqueurs pour forcer le recalcul côté frontend
        recalcTrigger: triggerTimestamp,
        mustRecalculate: true,
        independentNode: true,
        noFallbackToOriginal: true
      };

      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: { metadata: updatedMetadata }
      });

      console.log(`🎯 [TRIGGERS] ${currentMetadata.label}: trigger créé (${triggerTimestamp})`);

    } catch (error) {
      console.error(`❌ [TRIGGERS] Erreur pour ${nodeId}:`, error);
    }
  }
}
/**
 * 🔄 HOOK DE SYNCHRONISATION AUTOMATIQUE
 * 
 * Synchronise TreeBranchLeafNodeVariable.sourceRef avec data_instances.metadata.sourceRef
 * 
 * Se lance automatiquement au démarrage du serveur
 * Corrige les désynchronisations sans casser ce qui fonctionne déjà
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DataInstanceMetadata {
  sourceRef?: string;
  sourceType?: string;
  [key: string]: unknown;
}

interface DataInstance {
  id: string;
  metadata?: DataInstanceMetadata;
  [key: string]: unknown;
}

export async function syncVariableSourceRefs() {
  try {
    console.log('\n🔄 [SYNC HOOK] Synchronisation des sourceRef...');

    // Récupérer tous les nodes avec data_instances
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        data_instances: { not: null }
      },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });

    let syncCount = 0;
    let skipCount = 0;

    for (const node of nodes) {
      if (!node.data_instances) continue;

      const dataInstances = node.data_instances as Record<string, DataInstance>;
      const firstInstanceKey = Object.keys(dataInstances)[0];
      if (!firstInstanceKey) continue;

      const firstInstance = dataInstances[firstInstanceKey];
      if (!firstInstance?.metadata?.sourceRef) continue;

      const jsonSourceRef = firstInstance.metadata.sourceRef;

      // Si pas de variable en DB, skip (sera créée plus tard)
      if (!node.TreeBranchLeafNodeVariable) {
        continue;
      }

      const dbSourceRef = node.TreeBranchLeafNodeVariable.sourceRef;

      // ⚠️ PROTECTION: Ne pas écraser les références @table. et @value.
      if (dbSourceRef && (dbSourceRef.startsWith('@table.') || dbSourceRef.startsWith('@value.'))) {
        // Vérifier que le JSON ne dit pas autre chose
        if (jsonSourceRef.startsWith('node-formula:')) {
          // Le JSON dit formula mais la DB dit table/value
          // C'est probablement une erreur de sync précédente
          // On GARDE la DB (table/value) car c'est ce qui fonctionne
          skipCount++;
          continue;
        }
      }

      // Si déjà synchronisé, skip
      if (jsonSourceRef === dbSourceRef) {
        continue;
      }

      // ✅ SYNCHRONISER
      await prisma.treeBranchLeafNodeVariable.update({
        where: { id: node.TreeBranchLeafNodeVariable.id },
        data: { sourceRef: jsonSourceRef }
      });

      syncCount++;
    }

    if (syncCount > 0) {
      console.log(`✅ [SYNC HOOK] ${syncCount} sourceRef synchronisé(s)`);
    }
    if (skipCount > 0) {
      console.log(`⚠️  [SYNC HOOK] ${skipCount} table/value protégé(s)`);
    }
    if (syncCount === 0 && skipCount === 0) {
      console.log(`✅ [SYNC HOOK] Tout est déjà synchronisé`);
    }

  } catch (error) {
    console.error('❌ [SYNC HOOK] Erreur:', error);
    // Ne pas crasher le serveur si le hook échoue
  }
}

/**
 * 🎯 Hook à appeler au démarrage du serveur
 */
export async function initializeTreeBranchLeafSync() {
  try {
    await syncVariableSourceRefs();
  } catch (error) {
    console.error('❌ [INIT SYNC] Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

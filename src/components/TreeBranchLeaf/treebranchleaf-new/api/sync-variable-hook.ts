/**
 * Ã°Å¸â€â€ž HOOK DE SYNCHRONISATION AUTOMATIQUE
 * 
 * Synchronise TreeBranchLeafNodeVariable.sourceRef avec data_instances.metadata.sourceRef
 * 
 * Se lance automatiquement au dÃƒÂ©marrage du serveur
 * Corrige les dÃƒÂ©synchronisations sans casser ce qui fonctionne dÃƒÂ©jÃƒÂ 
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

    // RÃƒÂ©cupÃƒÂ©rer tous les nodes avec data_instances
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

      // Si pas de variable en DB, skip (sera crÃƒÂ©ÃƒÂ©e plus tard)
      if (!node.TreeBranchLeafNodeVariable) {
        continue;
      }

      const dbSourceRef = node.TreeBranchLeafNodeVariable.sourceRef;

      // Ã¢Å¡Â Ã¯Â¸Â PROTECTION: Ne pas ÃƒÂ©craser les rÃƒÂ©fÃƒÂ©rences @table. et @value.
      if (dbSourceRef && (dbSourceRef.startsWith('@table.') || dbSourceRef.startsWith('@value.'))) {
        // VÃƒÂ©rifier que le JSON ne dit pas autre chose
        if (jsonSourceRef.startsWith('node-formula:')) {
          // Le JSON dit formula mais la DB dit table/value
          // C'est probablement une erreur de sync prÃƒÂ©cÃƒÂ©dente
          // On GARDE la DB (table/value) car c'est ce qui fonctionne
          skipCount++;
          continue;
        }
      }

      // Si dÃƒÂ©jÃƒÂ  synchronisÃƒÂ©, skip
      if (jsonSourceRef === dbSourceRef) {
        continue;
      }

      // Ã¢Å“â€¦ SYNCHRONISER
      await prisma.treeBranchLeafNodeVariable.update({
        where: { id: node.TreeBranchLeafNodeVariable.id },
        data: { sourceRef: jsonSourceRef }
      });

      syncCount++;
    }

    if (syncCount > 0) {
    }
    if (skipCount > 0) {
    }
    if (syncCount === 0 && skipCount === 0) {
    }

  } catch (error) {
    console.error('Ã¢ÂÅ’ [SYNC HOOK] Erreur:', error);
    // Ne pas crasher le serveur si le hook ÃƒÂ©choue
  }
}

/**
 * Ã°Å¸Å½Â¯ Hook ÃƒÂ  appeler au dÃƒÂ©marrage du serveur
 */
export async function initializeTreeBranchLeafSync() {
  try {
    await syncVariableSourceRefs();
  } catch (error) {
    console.error('Ã¢ÂÅ’ [INIT SYNC] Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

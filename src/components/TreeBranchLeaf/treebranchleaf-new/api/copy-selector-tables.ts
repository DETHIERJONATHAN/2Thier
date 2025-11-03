/**
 * 🎯 Copier les tables des SELECTORS après la copie de nœuds
 * 
 * Quand on duplique un repeater qui contient des selecteurs,
 * les selecteurs sont copiés comme des nœuds (avec leurs IDs remappés),
 * mais leurs tables associées (linkedTableIds) ne sont PAS copiées!
 * 
 * Cette fonction gère ça:
 * 1. Cherche tous les nœuds SELECTORS dans la copie
 * 2. Pour chaque selector avec table_activeId, copie sa table
 * 3. Met à jour le selector avec la nouvelle table copiée
 */

import { PrismaClient } from '@prisma/client';
import { copyTableCapacity } from './copy-capacity-table.js';

export interface CopySelectorTablesOptions {
  nodeIdMap: Map<string, string>;
  tableCopyCache: Map<string, string>;
  tableIdMap: Map<string, string>;
}

/**
 * Copie les tables des selectors APRÈS la duplication de nœuds
 */
export async function copySelectorTablesAfterNodeCopy(
  prisma: PrismaClient,
  copiedRootNodeId: string,
  originalRootNodeId: string,
  options: CopySelectorTablesOptions,
  suffix: number
): Promise<void> {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎯 COPIE DES TABLES DES SELECTORS`);
  console.log(`   copiedRootNodeId: ${copiedRootNodeId}`);
  console.log(`   suffix: ${suffix}`);
  console.log(`${'═'.repeat(80)}`);

  try {
    // 1️⃣ Chercher le nœud copié et tous ses descendants
    const getAllDescendants = async (nodeId: string): Promise<string[]> => {
      const results: string[] = [];
      const queue = [nodeId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        results.push(currentId);

        const children = await prisma.treeBranchLeafNode.findMany({
          where: { parentId: currentId },
          select: { id: true }
        });

        queue.push(...children.map(c => c.id));
      }

      return results;
    };

    // AUSSI chercher les descendants ORIGINAUX pour les mapper
    const originalNodeIds = await getAllDescendants(originalRootNodeId);
    const copiedNodeIds = await getAllDescendants(copiedRootNodeId);
    
    console.log(`📋 ${copiedNodeIds.length} nœuds trouvés dans l'arborescence copiée`);
    console.log(`📋 ${originalNodeIds.length} nœuds trouvés dans l'arborescence originale`);

    // 2️⃣ Chercher les nœuds ORIGINAUX avec table_activeId
    const selectorsInOriginal = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { in: originalNodeIds },
        table_activeId: { not: null }
      },
      select: {
        id: true,
        label: true,
        type: true,
        table_activeId: true,
        linkedTableIds: true
      }
    });

    console.log(`🔍 ${selectorsInOriginal.length} selector(s) trouvé(s) dans l'ORIGINAL`);

    // 3️⃣ Pour chaque selector ORIGINAL, trouver son équivalent COPIÉ et copier sa table
    for (const originalSelector of selectorsInOriginal) {
      const originalTableId = originalSelector.table_activeId;
      if (!originalTableId) continue;

      // Trouver le selector copié (via nodeIdMap)
      const copiedSelectorId = options.nodeIdMap.get(originalSelector.id);
      if (!copiedSelectorId) {
        console.log(`   ⚠️ Selector ${originalSelector.label}: pas trouvé dans nodeIdMap`);
        continue;
      }

      console.log(`\n   📍 Selector: ${originalSelector.label}`);
      console.log(`      - Original ID: ${originalSelector.id.substring(0, 12)}...`);
      console.log(`      - Copié ID: ${copiedSelectorId.substring(0, 12)}...`);
      console.log(`      - Table originale: ${originalTableId}`);

      // Chercher la table originale du selector
      const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: originalTableId },
        select: {
          id: true,
          nodeId: true,
          name: true,
          meta: true,
          type: true,
          description: true,
          displayInline: true,
          tableColumns: { select: { id: true } },
          tableRows: { select: { id: true, cells: true } }
        }
      });

      if (!originalTable) {
        console.log(`      ❌ Table ${originalTableId} NOT FOUND`);
        continue;
      }

      console.log(`      ✅ Table trouvée: ${originalTable.name} (${originalTable.tableRows.length} lignes)`);

      // Copier la table avec la bonne signature
      try {
        console.log(`      🔄 Appel copyTableCapacity...`);
        console.log(`         - originalTableId: ${originalTableId}`);
        console.log(`         - copiedSelectorId (newNodeId): ${copiedSelectorId}`);
        console.log(`         - suffix: ${suffix}`);
        
        const result = await copyTableCapacity(
          originalTableId,  // ID de la table originale
          copiedSelectorId, // 👈 Le nœud selector copié sera propriétaire de la table copiée
          suffix,
          prisma,
          {
            nodeIdMap: options.nodeIdMap,
            tableCopyCache: options.tableCopyCache,
            tableIdMap: options.tableIdMap
          }
        );

        if (result.success) {
          console.log(`      ✅ Table copiée: ${result.newTableId}`);
          console.log(`         - Colonnes: ${result.columnsCount}`);
          console.log(`         - Lignes: ${result.rowsCount}`);
          console.log(`         - Cellules: ${result.cellsCount}`);

          // 🎯 Les données ont déjà été copiées par copyTableCapacity !
          // On juste confirme que le selector pointe vers la nouvelle table
          console.log(`      ✅ Selector COPIÉ automatiquement mis à jour via copyTableCapacity`);
          console.log(`         - table_activeId = ${result.newTableId}`);
          console.log(`         - table_instances peuplé avec données`);
        } else {
          console.log(`      ❌ Erreur copie table: ${result.error}`);
        }
      } catch (e) {
        console.warn(`      ⚠️ Erreur lors de la copie:`, (e as Error).message);
      }
    }

    console.log(`\n✅ Copie des tables des selectors terminée\n`);
  } catch (e) {
    console.warn(`⚠️ Erreur dans copySelectorTablesAfterNodeCopy:`, (e as Error).message);
  }
}

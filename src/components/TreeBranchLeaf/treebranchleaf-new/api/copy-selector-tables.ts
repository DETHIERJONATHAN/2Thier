/**
 * Ã°Å¸Å½Â¯ Copier les tables des SELECTORS aprÃƒÂ¨s la copie de nÃ…â€œuds
 * 
 * Quand on duplique un repeater qui contient des selecteurs,
 * les selecteurs sont copiÃƒÂ©s comme des nÃ…â€œuds (avec leurs IDs remappÃƒÂ©s),
 * mais leurs tables associÃƒÂ©es (linkedTableIds) ne sont PAS copiÃƒÂ©es!
 * 
 * Cette fonction gÃƒÂ¨re ÃƒÂ§a:
 * 1. Cherche tous les nÃ…â€œuds SELECTORS dans la copie
 * 2. Pour chaque selector avec table_activeId, copie sa table
 * 3. Met ÃƒÂ  jour le selector avec la nouvelle table copiÃƒÂ©e
 */

import { PrismaClient } from '@prisma/client';
import { copyTableCapacity } from './copy-capacity-table.js';

export interface CopySelectorTablesOptions {
  nodeIdMap: Map<string, string>;
  tableCopyCache: Map<string, string>;
  tableIdMap: Map<string, string>;
}

/**
 * Copie les tables des selectors APRÃƒË†S la duplication de nÃ…â€œuds
 */
export async function copySelectorTablesAfterNodeCopy(
  prisma: PrismaClient,
  copiedRootNodeId: string,
  originalRootNodeId: string,
  options: CopySelectorTablesOptions,
  suffix: number
): Promise<void> {

  try {
    // 1Ã¯Â¸ÂÃ¢Æ’Â£ Chercher le nÃ…â€œud copiÃƒÂ© et tous ses descendants
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
    

    // 2Ã¯Â¸ÂÃ¢Æ’Â£ Chercher les nÃ…â€œuds ORIGINAUX avec table_activeId
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


    // 3Ã¯Â¸ÂÃ¢Æ’Â£ Pour chaque selector ORIGINAL, trouver son ÃƒÂ©quivalent COPIÃƒâ€° et copier sa table
    for (const originalSelector of selectorsInOriginal) {
      const originalTableId = originalSelector.table_activeId;
      if (!originalTableId) continue;

      // Trouver le selector copiÃƒÂ© (via nodeIdMap)
      const copiedSelectorId = options.nodeIdMap.get(originalSelector.id);
      if (!copiedSelectorId) {
        continue;
      }

      // Ã°Å¸Å½Â¯ SKIP si le selector a un selectConfig (lookup vers table partagÃƒÂ©e, pas de copie nÃƒÂ©cessaire)
      const hasSelectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
        where: { nodeId: originalSelector.id }
      });
      if (hasSelectConfig) {
        continue;
      }


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
        continue;
      }


      // Copier la table avec la bonne signature
      try {
        
        const result = await copyTableCapacity(
          originalTableId,  // ID de la table originale
          copiedSelectorId, // Ã°Å¸â€˜Ë† Le nÃ…â€œud selector copiÃƒÂ© sera propriÃƒÂ©taire de la table copiÃƒÂ©e
          suffix,
          prisma,
          {
            nodeIdMap: options.nodeIdMap,
            tableCopyCache: options.tableCopyCache,
            tableIdMap: options.tableIdMap
          }
        );

        if (result.success) {

          // Ã°Å¸Å½Â¯ Les donnÃƒÂ©es ont dÃƒÂ©jÃƒÂ  ÃƒÂ©tÃƒÂ© copiÃƒÂ©es par copyTableCapacity !
          // On juste confirme que le selector pointe vers la nouvelle table
        } else {
        }
      } catch (e) {
        console.warn(`      Ã¢Å¡Â Ã¯Â¸Â Erreur lors de la copie:`, (e as Error).message);
      }
    }

  } catch (e) {
    console.warn(`Ã¢Å¡Â Ã¯Â¸Â Erreur dans copySelectorTablesAfterNodeCopy:`, (e as Error).message);
  }
}

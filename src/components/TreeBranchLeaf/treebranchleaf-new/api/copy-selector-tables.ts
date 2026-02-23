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
    // 🚀 OPTIMISÉ: utiliser nodeIdMap au lieu de BFS récursif (getAllDescendants)
    // nodeIdMap contient déjà TOUS les mappings originalId → copiedId
    const originalNodeIds = Array.from(options.nodeIdMap.keys());
    // Ajouter le root s'il n'est pas déjà dans le map
    if (!originalNodeIds.includes(originalRootNodeId)) {
      originalNodeIds.push(originalRootNodeId);
    }


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

    // PERF R12: Batch-load all selectConfigs and original tables (saves 2 findUnique per selector)
    const selectorOriginalIds = selectorsInOriginal.map(s => s.id);
    const tableActiveIds = selectorsInOriginal.map(s => s.table_activeId!).filter(Boolean);
    
    const [allSelectConfigs, allOriginalTables] = await Promise.all([
      selectorOriginalIds.length > 0
        ? prisma.treeBranchLeafSelectConfig.findMany({ where: { nodeId: { in: selectorOriginalIds } } })
        : Promise.resolve([]),
      tableActiveIds.length > 0
        ? prisma.treeBranchLeafNodeTable.findMany({
            where: { id: { in: tableActiveIds } },
            select: {
              id: true,
              nodeId: true,
              name: true,
              meta: true,
              type: true,
              description: true,
              tableColumns: { select: { id: true } },
              tableRows: { select: { id: true, cells: true } }
            }
          })
        : Promise.resolve([])
    ]);
    
    const selectConfigByNodeId = new Set(allSelectConfigs.map(sc => sc.nodeId));
    const originalTableById = new Map(allOriginalTables.map(t => [t.id, t]));

    // Pour chaque selector ORIGINAL, trouver son equivalent COPIE et copier sa table
    for (const originalSelector of selectorsInOriginal) {
      const originalTableId = originalSelector.table_activeId;
      if (!originalTableId) continue;

      const copiedSelectorId = options.nodeIdMap.get(originalSelector.id);
      if (!copiedSelectorId) {
        continue;
      }

      // PERF R12: Use pre-loaded selectConfig set (was sequential findUnique)
      if (selectConfigByNodeId.has(originalSelector.id)) {
        continue;
      }

      // PERF R12: Use pre-loaded original table (was sequential findUnique)
      const originalTable = originalTableById.get(originalTableId);
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

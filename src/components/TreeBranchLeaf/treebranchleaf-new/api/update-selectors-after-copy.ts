/**
 * Ã°Å¸Å½Â¯ FONCTION UTILITAIRE: Mettre ÃƒÂ  jour les selectors aprÃƒÂ¨s copie de tables
 * 
 * Cette fonction corrige les selectors copiÃƒÂ©s qui n'ont pas ÃƒÂ©tÃƒÂ© mis ÃƒÂ  jour
 * avec les nouvelles tables copiÃƒÂ©es lors de la duplication d'un repeater.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Mise ÃƒÂ  jour POST-COPIE des selectors avec les nouvelles tables copiÃƒÂ©es
 * 
 * Quand un repeater avec tables est copiÃƒÂ©, les selectors (qui sont des nÃ…â€œuds)
 * sont copiÃƒÂ©s aussi, mais leur table_activeId et table_instances restent NULL.
 * Cette fonction met ÃƒÂ  jour les selectors avec les nouvelles tables copiÃƒÂ©es.
 */
export async function updateSelectorsAfterTableCopy(
  prisma: PrismaClient,
  copiedTemplateId: string,
  idMap: Map<string, string>,
  suffix: number
): Promise<void> {
  
  try {
    // 1Ã¯Â¸ÂÃ¢Æ’Â£ Chercher toutes les tables du template copiÃƒÂ©
    const copiedNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copiedTemplateId },
      select: { linkedTableIds: true }
    });

    if (!copiedNode?.linkedTableIds || copiedNode.linkedTableIds.length === 0) {
      return;
    }


    // 2Ã¯Â¸ÂÃ¢Æ’Â£ Pour chaque table, chercher sa config de lookup
    for (const tableId of copiedNode.linkedTableIds) {
      const cleanTableId = tableId.replace(/-\d+$/, '');
      
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: cleanTableId },
        select: { meta: true, id: true }
      });

      if (!table) {
        continue;
      }

      const lookupConfig = (table.meta as any)?.lookup;
      if (!lookupConfig?.selectors) {
        continue;
      }


      // 3Ã¯Â¸ÂÃ¢Æ’Â£ Chercher les IDs des selectors copiÃƒÂ©s
      const originalRowSelectorId = lookupConfig.selectors.rowFieldId;
      const originalColSelectorId = lookupConfig.selectors.columnFieldId;

      // Chercher les copies de ces selectors dans idMap, ou appliquer le suffixe
      const copiedRowSelectorId = idMap.get(originalRowSelectorId) || `${originalRowSelectorId}-${suffix}`;
      const copiedColSelectorId = idMap.get(originalColSelectorId) || `${originalColSelectorId}-${suffix}`;


      // 4Ã¯Â¸ÂÃ¢Æ’Â£ Chercher la table copiÃƒÂ©e (la nouvelle)
      // Ã¢Å“â€¦ FIX: VÃƒÂ©rifier si le tableId a DÃƒâ€°JÃƒâ‚¬ un suffixe numÃƒÂ©rique (-1, -2, etc.)
      // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
      const hasSuffixRegex = /-\d+$/;  // Suffixe numÃƒÂ©rique ÃƒÂ  la fin
      const copiedTableId = hasSuffixRegex.test(tableId) ? tableId : `${tableId}-${suffix}`;
      
      const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: copiedTableId },
        select: { id: true, name: true }
      });

      if (!copiedTable) {
        continue;
      }


      // 5Ã¯Â¸ÂÃ¢Æ’Â£ Mettre ÃƒÂ  jour les selectors copiÃƒÂ©s
      const selectorIds = [copiedRowSelectorId, copiedColSelectorId].filter(Boolean);
      const selectorTableInstances: Record<string, any> = {};
      selectorTableInstances[copiedTable.id] = {};

      for (const selectorId of selectorIds) {
        try {
          await prisma.treeBranchLeafNode.update({
            where: { id: selectorId },
            data: {
              table_activeId: copiedTable.id,
              table_instances: selectorTableInstances as any,
              hasTable: true
            }
          });
        } catch (e) {
          console.warn(`   Ã¢Å¡Â Ã¯Â¸Â Erreur MAJ selector ${selectorId}:`, (e as Error).message);
        }
      }
    }

  } catch (e) {
    console.warn(`Ã¢Å¡Â Ã¯Â¸Â [UPDATE-SELECTORS] Erreur:`, (e as Error).message);
  }
}

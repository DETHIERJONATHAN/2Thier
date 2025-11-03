/**
 * 🎯 FONCTION UTILITAIRE: Mettre à jour les selectors après copie de tables
 * 
 * Cette fonction corrige les selectors copiés qui n'ont pas été mis à jour
 * avec les nouvelles tables copiées lors de la duplication d'un repeater.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Mise à jour POST-COPIE des selectors avec les nouvelles tables copiées
 * 
 * Quand un repeater avec tables est copié, les selectors (qui sont des nœuds)
 * sont copiés aussi, mais leur table_activeId et table_instances restent NULL.
 * Cette fonction met à jour les selectors avec les nouvelles tables copiées.
 */
export async function updateSelectorsAfterTableCopy(
  prisma: PrismaClient,
  copiedTemplateId: string,
  idMap: Map<string, string>,
  suffix: number
): Promise<void> {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 [UPDATE-SELECTORS] ✨ FUNCTION CALLED`);
  console.log(`📊 [UPDATE-SELECTORS] copiedTemplateId: ${copiedTemplateId}`);
  console.log(`📊 [UPDATE-SELECTORS] suffix: ${suffix}`);
  console.log(`📊 [UPDATE-SELECTORS] idMap.size: ${idMap.size}`);
  console.log(`${'═'.repeat(80)}`);
  
  try {
    // 1️⃣ Chercher toutes les tables du template copié
    const copiedNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copiedTemplateId },
      select: { linkedTableIds: true }
    });

    if (!copiedNode?.linkedTableIds || copiedNode.linkedTableIds.length === 0) {
      console.log(`ℹ️ [UPDATE-SELECTORS] Aucune table liée`);
      return;
    }

    console.log(`📋 [UPDATE-SELECTORS] ${copiedNode.linkedTableIds.length} table(s) liée(s)`);

    // 2️⃣ Pour chaque table, chercher sa config de lookup
    for (const tableId of copiedNode.linkedTableIds) {
      const cleanTableId = tableId.replace(/-\d+$/, '');
      
      const table = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: cleanTableId },
        select: { meta: true, id: true }
      });

      if (!table) {
        console.log(`⚠️ [UPDATE-SELECTORS] Table ${cleanTableId} non trouvée`);
        continue;
      }

      const lookupConfig = (table.meta as any)?.lookup;
      if (!lookupConfig?.selectors) {
        console.log(`ℹ️ [UPDATE-SELECTORS] Table ${table.id} sans lookup config`);
        continue;
      }

      console.log(`✅ [UPDATE-SELECTORS] Table ${table.id} a des selectors`);

      // 3️⃣ Chercher les IDs des selectors copiés
      const originalRowSelectorId = lookupConfig.selectors.rowFieldId;
      const originalColSelectorId = lookupConfig.selectors.columnFieldId;

      // Chercher les copies de ces selectors dans idMap, ou appliquer le suffixe
      const copiedRowSelectorId = idMap.get(originalRowSelectorId) || `${originalRowSelectorId}-${suffix}`;
      const copiedColSelectorId = idMap.get(originalColSelectorId) || `${originalColSelectorId}-${suffix}`;

      console.log(`   Row selector: ${originalRowSelectorId} → ${copiedRowSelectorId}`);
      console.log(`   Col selector: ${originalColSelectorId} → ${copiedColSelectorId}`);

      // 4️⃣ Chercher la table copiée (la nouvelle)
      // ✅ FIX: Vérifier si le tableId a DÉJÀ un suffixe numérique (-1, -2, etc.)
      // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
      const hasSuffixRegex = /-\d+$/;  // Suffixe numérique à la fin
      const copiedTableId = hasSuffixRegex.test(tableId) ? tableId : `${tableId}-${suffix}`;
      
      const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: copiedTableId },
        select: { id: true, name: true }
      });

      if (!copiedTable) {
        console.log(`⚠️ [UPDATE-SELECTORS] Table copiée ${copiedTableId} non trouvée`);
        continue;
      }

      console.log(`   Table copiée: ${copiedTable.id}`);

      // 5️⃣ Mettre à jour les selectors copiés
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
          console.log(`   ✅ Selector ${selectorId.substring(0, 8)}... mis à jour`);
        } catch (e) {
          console.warn(`   ⚠️ Erreur MAJ selector ${selectorId}:`, (e as Error).message);
        }
      }
    }

    console.log(`\n✅ [UPDATE-SELECTORS] Mise à jour des selectors terminée\n`);
  } catch (e) {
    console.warn(`⚠️ [UPDATE-SELECTORS] Erreur:`, (e as Error).message);
  }
}

/**
 * 🔧 FIX CRITICAL - Créer les variables sur les champs Select du Lookup
 * 
 * Problem: Les tables avec lookup configuré (columnFieldId, rowFieldId)
 * n'ont PAS de variables créées sur les champs Select eux-mêmes.
 * 
 * Solution: Pour chaque table avec lookup:
 * 1. Récupérer columnFieldId et rowFieldId
 * 2. Sur ces nœuds Select, créer des variables avec sourceRef=@table.{tableId}
 * 3. Remplir linkedTableIds et linkedVariableIds
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLookupSelectVariables() {
  console.log(`\n========================================`);
  console.log(`🔧 FIX: Créer variables sur Select du Lookup`);
  console.log(`========================================\n`);

  try {
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: {
          path: ['lookup', 'enabled'],
          equals: true
        }
      }
    });

    console.log(`📊 Trouvé ${tables.length} table(s) avec lookup\n`);

    for (const table of tables) {
      const meta = table.meta as any;
      const lookup = meta?.lookup || {};

      console.log(`📋 TABLE: "${table.name}" (${table.id})`);

      // COLONNE LOOKUP
      if (lookup.columnLookupEnabled && lookup.selectors?.columnFieldId) {
        const colFieldId = lookup.selectors.columnFieldId;
        console.log(`   ✓ Column Field: ${colFieldId}`);

        const colNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: colFieldId }
        });

        if (colNode) {
          console.log(`     Node: "${colNode.label}"`);

          // Créer ou réutiliser la variable
          let colVar = await prisma.treeBranchLeafNodeVariable.findFirst({
            where: { nodeId: colFieldId }
          });

          if (!colVar) {
            colVar = await prisma.treeBranchLeafNodeVariable.create({
              data: {
                id: `var_${Date.now()}_col`,
                nodeId: colFieldId,
                exposedKey: `var_col_${colFieldId.slice(0, 4)}`,
                displayName: `Lookup Table Column (${table.name})`,
                displayFormat: 'text',
                updatedAt: new Date(),
                metadata: {
                  sourceRef: `@table.${table.id}`,
                  sourceType: 'tree',
                  displayFormat: 'text'
                }
              }
            });
            console.log(`     ✅ Variable créée: ${colVar.id}`);
          } else {
            console.log(`     ℹ️ Variable existe déjà: ${colVar.id}`);
          }

          // Remplir les linked*Ids
          const currentTableIds = colNode.linkedTableIds ?? [];
          const currentVarIds = colNode.linkedVariableIds ?? [];

          if (!currentTableIds.includes(table.id) || !currentVarIds.includes(colVar.id)) {
            await prisma.treeBranchLeafNode.update({
              where: { id: colFieldId },
              data: {
                linkedTableIds: {
                  set: Array.from(new Set([...currentTableIds, table.id]))
                },
                linkedVariableIds: {
                  set: Array.from(new Set([...currentVarIds, colVar.id]))
                },
                hasData: true,
                data_activeId: colVar.id
              }
            });
            console.log(`     ✅ linkedTableIds/linkedVariableIds rempli`);
          }
        }
      }

      // LIGNE LOOKUP
      if (lookup.rowLookupEnabled && lookup.selectors?.rowFieldId) {
        const rowFieldId = lookup.selectors.rowFieldId;
        console.log(`   ✓ Row Field: ${rowFieldId}`);

        const rowNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: rowFieldId }
        });

        if (rowNode) {
          console.log(`     Node: "${rowNode.label}"`);

          // Créer ou réutiliser la variable
          let rowVar = await prisma.treeBranchLeafNodeVariable.findFirst({
            where: { nodeId: rowFieldId }
          });

          if (!rowVar) {
            rowVar = await prisma.treeBranchLeafNodeVariable.create({
              data: {
                id: `var_${Date.now()}_row`,
                nodeId: rowFieldId,
                exposedKey: `var_row_${rowFieldId.slice(0, 4)}`,
                displayName: `Lookup Table Row (${table.name})`,
                displayFormat: 'text',
                updatedAt: new Date(),
                metadata: {
                  sourceRef: `@table.${table.id}`,
                  sourceType: 'tree',
                  displayFormat: 'text'
                }
              }
            });
            console.log(`     ✅ Variable créée: ${rowVar.id}`);
          } else {
            console.log(`     ℹ️ Variable existe déjà: ${rowVar.id}`);
          }

          // Remplir les linked*Ids
          const currentTableIds = rowNode.linkedTableIds ?? [];
          const currentVarIds = rowNode.linkedVariableIds ?? [];

          if (!currentTableIds.includes(table.id) || !currentVarIds.includes(rowVar.id)) {
            await prisma.treeBranchLeafNode.update({
              where: { id: rowFieldId },
              data: {
                linkedTableIds: {
                  set: Array.from(new Set([...currentTableIds, table.id]))
                },
                linkedVariableIds: {
                  set: Array.from(new Set([...currentVarIds, rowVar.id]))
                },
                hasData: true,
                data_activeId: rowVar.id
              }
            });
            console.log(`     ✅ linkedTableIds/linkedVariableIds rempli`);
          }
        }
      }

      console.log();
    }

    console.log(`✅ FIX TERMINÉ\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLookupSelectVariables();

/**
 * 🔧 FIX v2 - Gérer les deux formats de lookup config
 * 
 * Format 1: lookup.selectors.{column|row}FieldId
 * Format 2: lookup.{column|row}SourceOption avec type:"field"/sourceField
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllLookupConfigs() {
  console.log(`\n========================================`);
  console.log(`🔧 FIX v2: Tous les formats de lookup`);
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

    console.log(`📊 ${tables.length} table(s) avec lookup\n`);

    for (const table of tables) {
      const meta = table.meta as any;
      const lookup = meta?.lookup || {};

      console.log(`📋 TABLE: "${table.name}"`);

      // COLONNE
      let colFieldId: string | null = null;

      // Format 1: lookup.selectors.columnFieldId
      if (lookup.selectors?.columnFieldId) {
        colFieldId = lookup.selectors.columnFieldId;
      }
      // Format 2: lookup.columnSourceOption.sourceField
      else if (lookup.columnSourceOption?.sourceField) {
        colFieldId = lookup.columnSourceOption.sourceField;
      }

      if (colFieldId && lookup.columnLookupEnabled) {
        await processField(colFieldId, table, 'COLUMN');
      }

      // LIGNE
      let rowFieldId: string | null = null;

      // Format 1: lookup.selectors.rowFieldId
      if (lookup.selectors?.rowFieldId) {
        rowFieldId = lookup.selectors.rowFieldId;
      }
      // Format 2: lookup.rowSourceOption.sourceField
      else if (lookup.rowSourceOption?.sourceField) {
        rowFieldId = lookup.rowSourceOption.sourceField;
      }

      if (rowFieldId && lookup.rowLookupEnabled) {
        await processField(rowFieldId, table, 'ROW');
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

async function processField(fieldId: string, table: any, type: 'COLUMN' | 'ROW') {
  console.log(`   ${type}: ${fieldId}`);

  const fieldNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: fieldId }
  });

  if (!fieldNode) {
    console.log(`     ⚠️ Nœud non trouvé`);
    return;
  }

  console.log(`     Node: "${fieldNode.label}"`);

  // Chercher ou créer la variable
  let fieldVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { nodeId: fieldId }
  });

  if (!fieldVar) {
    const varId = `var_${Date.now()}_${type.toLowerCase()}`;
    const exposedKey = `var_${type.toLowerCase()[0]}${fieldId.slice(0, 4)}`;

    fieldVar = await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: varId,
        nodeId: fieldId,
        exposedKey: exposedKey,
        displayName: `Lookup Table ${type} (${table.name})`,
        displayFormat: 'text',
        updatedAt: new Date(),
        metadata: {
          sourceRef: `@table.${table.id}`,
          sourceType: 'tree',
          displayFormat: 'text'
        }
      }
    });
    console.log(`     ✅ Variable créée: ${fieldVar.id}`);
  } else {
    console.log(`     ℹ️ Variable existe: ${fieldVar.id}`);
  }

  // Remplir les linked*Ids
  const currentTableIds = fieldNode.linkedTableIds ?? [];
  const currentVarIds = fieldNode.linkedVariableIds ?? [];

  if (!currentTableIds.includes(table.id) || !currentVarIds.includes(fieldVar.id)) {
    await prisma.treeBranchLeafNode.update({
      where: { id: fieldId },
      data: {
        linkedTableIds: {
          set: Array.from(new Set([...currentTableIds, table.id]))
        },
        linkedVariableIds: {
          set: Array.from(new Set([...currentVarIds, fieldVar.id]))
        },
        hasData: true,
        data_activeId: fieldVar.id
      }
    });
    console.log(`     ✅ linkedTableIds/linkedVariableIds rempli`);
  } else {
    console.log(`     ✅ Déjà correct`);
  }
}

fixAllLookupConfigs();

/**
 * 📊 SCRIPT D'ANALYSE - Simple & Efficace
 * But: Voir exactement le state des tables et leurs linked*Ids
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
  console.log(`\n========================================`);
  console.log(`📊 ANALYSE: Lookup Linking`);
  console.log(`========================================\n`);

  try {
    // 1️⃣ LISTER TOUTES LES TABLES
    console.log(`1️⃣ TOUTES LES TABLES AVEC LOOKUP\n`);
    const tablesWithLookup = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: {
          path: ['lookup'],
          not: null
        }
      }
    });

    console.log(`Trouvé ${tablesWithLookup.length} table(s):\n`);

    for (const table of tablesWithLookup) {
      const meta = table.meta as any;
      const lookup = meta?.lookup || {};

      console.log(`📋 TABLE: "${table.name}"`);
      console.log(`   ID: ${table.id}`);
      console.log(`   Propriétaire Node: ${table.nodeId}`);
      console.log(`   Lookup Column: ${lookup.columnFieldLabel} (${lookup.columnFieldId})`);
      console.log(`   Lookup Row: ${lookup.rowFieldLabel} (${lookup.rowFieldId})`);

      // Chercher le nœud propriétaire et voir ses linked*Ids
      const ownerNode = await prisma.treeBranchLeafNode.findUnique({
        where: { id: table.nodeId }
      });

      if (ownerNode) {
        console.log(`   Owner linkedTableIds: ${JSON.stringify(ownerNode.linkedTableIds ?? [])}`);
        console.log(`   Owner linkedVariableIds: ${JSON.stringify(ownerNode.linkedVariableIds ?? [])}`);
      }

      // Chercher les champs Select utilisant cette table
      const selectsUsing = await prisma.treeBranchLeafSelectConfig.findMany({
        where: {
          metadata: {
            path: ['sourceRef'],
            string_contains: `@table.${table.id}`
          }
        }
      });

      console.log(`   Champs Select utilisant cette table: ${selectsUsing.length}`);

      for (const selectCfg of selectsUsing) {
        // Récupérer le nœud du select
        const selectNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: selectCfg.nodeId }
        });

        if (selectNode) {
          console.log(`     - "${selectNode.label}" (${selectNode.id})`);
          console.log(`       linkedTableIds: ${JSON.stringify(selectNode.linkedTableIds ?? [])} ${
            selectNode.linkedTableIds?.includes(table.id) ? '✅' : '❌ MANQUANT'
          }`);
          console.log(`       linkedVariableIds: ${JSON.stringify(selectNode.linkedVariableIds ?? [])} ${
            selectNode.linkedVariableIds?.length ? '✅' : '❌ VIDE'
          }`);
          console.log(`       hasData: ${selectNode.hasData ? '✅' : '❌'}`);
        }
      }

      console.log();
    }

    console.log(`\n${'='.repeat(60)}\n`);

    // 2️⃣ RÉSUMÉ DES PROBLÈMES
    console.log(`2️⃣ RÉSUMÉ DES PROBLÈMES\n`);

    let problemCount = 0;
    for (const table of tablesWithLookup) {
      const selectsUsing = await prisma.treeBranchLeafSelectConfig.findMany({
        where: {
          metadata: {
            path: ['sourceRef'],
            string_contains: `@table.${table.id}`
          }
        }
      });

      for (const selectCfg of selectsUsing) {
        const selectNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: selectCfg.nodeId }
        });

        if (selectNode) {
          const missingTableId = !selectNode.linkedTableIds?.includes(table.id);
          const missingVarId = !selectNode.linkedVariableIds?.length;
          const missingData = !selectNode.hasData;

          if (missingTableId || missingVarId || missingData) {
            problemCount++;
            console.log(`❌ PROBLÈME ${problemCount}: "${selectNode.label}"`);
            if (missingTableId) console.log(`   - linkedTableIds n'inclut pas la table`);
            if (missingVarId) console.log(`   - linkedVariableIds vide`);
            if (missingData) console.log(`   - hasData = false`);
          }
        }
      }
    }

    if (problemCount === 0) {
      console.log(`✅ Aucun problème détecté - tout est correct!`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();

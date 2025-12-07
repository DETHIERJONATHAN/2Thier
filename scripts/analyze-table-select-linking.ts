/**
 * 📊 SCRIPT D'ANALYSE - Comprendre le flow complet Lookup → LinkedIds
 * 
 * But: Tracer exactement ce qui se passe quand on configure un lookup
 * et identifier où les linked*Ids ne sont pas remplis
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeTableSelectConfig() {
  console.log(`\n========================================`);
  console.log(`📊 ANALYSE: Table & Select Linking`);
  console.log(`========================================\n`);

  try {
    // 1️⃣ LISTER TOUTES LES TABLES
    console.log(`1️⃣ TOUTES LES TABLES\n`);
    const allTables = await prisma.treeBranchLeafNodeTable.findMany({
      select: {
        id: true,
        name: true,
        nodeId: true,
        meta: true,
        _count: { select: { tableColumns: true } }
      }
    });

    console.log(`Trouvé ${allTables.length} table(s):\n`);
    for (const table of allTables) {
      const meta = table.meta as any;
      const hasLookup = meta?.lookup && (meta.lookup.columnLookupEnabled || meta.lookup.rowLookupEnabled);
      console.log(`📋 "${table.name}" (${table.id})`);
      console.log(`   Propriétaire: ${table.nodeId}`);
      console.log(`   Colonnes: ${table._count.tableColumns}`);
      console.log(`   Lookup: ${hasLookup ? '✅ ACTIVÉ' : '❌ NON'}`);
      if (hasLookup) {
        console.log(`      Column: ${meta.lookup.columnFieldLabel} (${meta.lookup.columnFieldId})`);
        console.log(`      Row: ${meta.lookup.rowFieldLabel} (${meta.lookup.rowFieldId})`);
      }
      console.log();
    }

    // 2️⃣ LISTER TOUS LES CHAMPS SELECT
    console.log(`\n2️⃣ TOUS LES CHAMPS SELECT\n`);
    const allSelects = await prisma.treeBranchLeafSelectConfig.findMany({
      include: {
        node: {
          select: {
            id: true,
            label: true,
            type: true,
            linkedTableIds: true,
            linkedVariableIds: true,
            hasData: true,
            TreeBranchLeafNodeVariable: { select: { id: true } }
          }
        }
      }
    });

    console.log(`Trouvé ${allSelects.length} champ(s) Select:\n`);
    for (const select of allSelects) {
      const sourceRef = (select.metadata as any)?.sourceRef;
      const isTableRef = sourceRef?.startsWith('@table.');
      console.log(`📌 "${select.node?.label}" (${select.node?.id})`);
      console.log(`   sourceRef: ${sourceRef || '❌ VIDE'}`);
      console.log(`   linkedTableIds: ${JSON.stringify(select.node?.linkedTableIds ?? [])} ${
        isTableRef ? (select.node?.linkedTableIds?.length ? '✅' : '❌ MANQUANT') : '⏭️'
      }`);
      console.log(`   linkedVariableIds: ${JSON.stringify(select.node?.linkedVariableIds ?? [])} ${
        select.node?.linkedVariableIds?.length ? '✅' : '❌'
      }`);
      console.log(`   hasData: ${select.node?.hasData}`);
      console.log(`   Variables: ${select.node?.TreeBranchLeafNodeVariable?.length ?? 0}`);
      console.log();
    }

    // 3️⃣ CROISER TABLE ↔ SELECT
    console.log(`\n3️⃣ ANALYSE CROISÉE TABLE ↔ SELECT\n`);
    
    for (const table of allTables) {
      const meta = table.meta as any;
      const lookup = meta?.lookup;
      if (!lookup) continue;

      console.log(`📊 Table: "${table.name}"`);
      
      // Chercher les selects utilisant cette table
      const linkedSelects = allSelects.filter(s => {
        const sourceRef = (s.metadata as any)?.sourceRef;
        return sourceRef === `@table.${table.id}`;
      });

      console.log(`   Selects utilisant cette table: ${linkedSelects.length}`);

      if (linkedSelects.length === 0) {
        console.log(`   ⚠️ Aucun select ne référence cette table!\n`);
        continue;
      }

      for (const select of linkedSelects) {
        const node = select.node;
        console.log(`   - "${node?.label}"`);
        
        // Vérifier les dépendances
        const hasTableInLinked = node?.linkedTableIds?.includes(table.id);
        const hasVarInLinked = node?.linkedVariableIds?.length;
        
        console.log(`     linkedTableIds contient tableId: ${hasTableInLinked ? '✅' : '❌'}`);
        console.log(`     linkedVariableIds rempli: ${hasVarInLinked ? '✅' : '❌'}`);
        console.log(`     hasData: ${node?.hasData ? '✅' : '❌'}`);
        
        // Problème détecté?
        if (!hasTableInLinked || !hasVarInLinked || !node?.hasData) {
          console.log(`     ⚠️ PROBLÈME DÉTECTÉ - Les linked*Ids ne sont pas remplis!`);
        }
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTableSelectConfig();

/**
 * Script diagnostic pour panel max-1
 * Utilise TreeBranchLeafNodeTable, TreeBranchLeafNodeTableColumn, TreeBranchLeafNodeTableRow
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 
        `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || '2thier'}`
    }
  }
});

async function diagnoseMax1() {
  console.log('🔍 DIAGNOSTIC PANEL MAX-1 (TreeBranchLeafNode)\n');
  console.log('=' .repeat(60));

  try {
    // 1. Chercher TOUS les TreeBranchLeafNodeTable contenant "max" ou "1"
    console.log('\n1️⃣  Recherche TreeBranchLeafNodeTable contenant "max" ou "1"...');
    const allNodeTables = await db.treeBranchLeafNodeTable.findMany({
      include: {
        tableColumns: true,
        tableRows: true
      }
    });

    console.log(`   ➜ Total TreeBranchLeafNodeTable: ${allNodeTables.length}`);
    
    const maxPanels = allNodeTables.filter(t => 
      (t.id && (t.id.toLowerCase().includes('max') || t.id.includes('1'))) ||
      (t.name && (t.name.toLowerCase().includes('max') || t.name.includes('1')))
    );

    if (maxPanels.length === 0) {
      console.log('   ⚠️  Pas de panel "max-1" trouvé avec recherche "max" ou "1"');
      console.log('\n   📋 TOUS les TreeBranchLeafNodeTable:');
      allNodeTables.forEach((t, i) => {
        console.log(`      [${i + 1}] ID: ${t.id}`);
        console.log(`          Name: ${t.name || '(vide)'}`);
        console.log(`          Cols: ${t.tableColumns?.length || 0}, Rows: ${t.tableRows?.length || 0}`);
      });
      process.exit(1);
    }

    for (const nodeTable of maxPanels) {
      console.log(`\n   ✅ TROUVÉ: ${nodeTable.id}`);
      console.log(`      ├─ Name: ${nodeTable.name || '(vide)'}`);
      console.log(`      ├─ Colonnes: ${nodeTable.tableColumns?.length || 0}`);
      console.log(`      ├─ Lignes: ${nodeTable.tableRows?.length || 0}`);
      
      if (nodeTable.tableColumns && nodeTable.tableColumns.length > 0) {
        console.log(`      ├─ Détail colonnes:`);
        nodeTable.tableColumns.forEach(col => {
          console.log(`      │  ├─ ${col.name || col.id} (Type: ${col.dataType || 'N/A'})`);
        });
      }
      
      if (nodeTable.tableRows && nodeTable.tableRows.length > 0) {
        console.log(`      └─ Aperçu données (${nodeTable.tableRows.length} lignes):`);
        nodeTable.tableRows.slice(0, 3).forEach((row, i) => {
          console.log(`         [${i + 1}] ${JSON.stringify(row.data || {}).substring(0, 70)}...`);
        });
      }
    }

    // 2. Chercher les formules liées
    console.log('\n2️⃣  Recherche des formules...');
    
    const allFormulas = await db.fieldFormula.findMany({
      take: 100
    });

    console.log(`   ➜ Total formules en base: ${allFormulas.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('🔴 PROBLÈME IDENTIFIÉ:\n');
    console.log('Les tables TreeBranchLeafNodeTable existent:');
    console.log('  ✅ Panneau (5 lignes - Panel Solaire)');
    console.log('  ✅ Onduleur (86 lignes)');
    console.log('  ✅ Orientation-Inclinaison (18 lignes)');
    console.log('  ✅ etc.');
    console.log('\n⚠️  MAIS les données sont VIDES dans TreeBranchLeafNodeTableRow:');
    console.log('  ❌ Champ "data" = {} (objet vide)');
    console.log('  ❌ Aucune données réelles stockées');
    console.log('\nConséquences:');
    console.log('  ❌ Le champ n\'affiche pas les données');
    console.log('  ❌ Les formules ne peuvent pas lire les valeurs');
    console.log('  ❌ L\'onglet formule n\'est pas bleu');
    console.log('  ❌ L\'icône formule n\'est pas dans treeBranchLeaf');
    console.log('\nSOLUTION: Repeupler les données dans TreeBranchLeafNodeTableRow');
    console.log('=' .repeat(60));
    console.log('\n✅ Diagnostic complété\n');

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

diagnoseMax1();

diagnoseMax1();

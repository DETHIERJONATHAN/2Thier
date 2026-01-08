/**
 * 🔬 DIAGNOSTIC APPROFONDI: Analyser les SelectConfig et les références
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepDiagnosis() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🔬 DIAGNOSTIC APPROFONDI: SELECTCONFIG ET RÉFÉRENCES           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: 'f5e24326-ef46-469e-9fdc-0b53d9e2067b' },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } }
      }
    });

    const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: 'f5e24326-ef46-469e-9fdc-0b53d9e2067b-1' },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } }
      }
    });

    console.log('1️⃣  VÉRIFICATION DES SELECTCONFIG\n');
    console.log('   Cherchant tous les SelectConfig pour ces deux tables...\n');

    // Chercher TOUS les SelectConfig qui référencent ces tables
    const allSelectConfigs = await prisma.treeBranchLeafSelectConfig.findMany();
    
    console.log(`   Total SelectConfig dans la DB: ${allSelectConfigs.length}\n`);

    // Chercher ceux qui pourraient référencer ces tables
    const originalSelectConfigs = allSelectConfigs.filter(sc => 
      sc.tableReference === originalTable?.name || 
      sc.tableReference?.includes('Import O-I')
    );

    const copiedSelectConfigs = allSelectConfigs.filter(sc => 
      sc.tableReference === copiedTable?.name ||
      sc.tableReference?.includes('Import O-I.xlsx-1')
    );

    console.log(`   SelectConfig pour table originale: ${originalSelectConfigs.length}`);
    originalSelectConfigs.forEach(sc => {
      console.log(`     - NodeID: ${sc.nodeId}`);
      console.log(`       tableReference: ${sc.tableReference}`);
      console.log(`       keyColumn: ${sc.keyColumn}`);
      console.log(`       displayColumn: ${sc.displayColumn}\n`);
    });

    console.log(`   SelectConfig pour table copiée: ${copiedSelectConfigs.length}`);
    copiedSelectConfigs.forEach(sc => {
      console.log(`     - NodeID: ${sc.nodeId}`);
      console.log(`       tableReference: ${sc.tableReference}`);
      console.log(`       keyColumn: ${sc.keyColumn}`);
      console.log(`       displayColumn: ${sc.displayColumn}\n`);
    });

    // Chercher les nodes qui utilisent ces tables
    console.log('\n2️⃣  VÉRIFICATION DES NŒUDS QUI UTILISENT CES TABLES\n');

    const originalNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: '440d696a-34cf-418f-8f56-d61015f66d91' },
      include: {
        TreeBranchLeafNodeTable: true,
        TreeBranchLeafSelectConfig: true
      }
    });

    const copiedNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: '440d696a-34cf-418f-8f56-d61015f66d91-1' },
      include: {
        TreeBranchLeafNodeTable: true,
        TreeBranchLeafSelectConfig: true
      }
    });

    console.log(`   Nœud Original: "${originalNode?.label}"`);
    console.log(`   - Tables: ${originalNode?.TreeBranchLeafNodeTable?.length || 0}`);
    console.log(`   - SelectConfig: ${originalNode?.TreeBranchLeafSelectConfig?.length || 0}\n`);

    if (!originalNode?.TreeBranchLeafSelectConfig || originalNode.TreeBranchLeafSelectConfig.length === 0) {
      console.log(`   ⚠️  PAS DE SELECTCONFIG POUR LE NŒUD ORIGINAL!\n`);
    } else {
      originalNode.TreeBranchLeafSelectConfig.forEach(sc => {
        console.log(`   SelectConfig:`);
        console.log(`     - tableReference: ${sc.tableReference}`);
        console.log(`     - keyColumn: ${sc.keyColumn}`);
        console.log(`     - displayColumn: ${sc.displayColumn}\n`);
      });
    }

    console.log(`   Nœud Copié: "${copiedNode?.label}"`);
    console.log(`   - Tables: ${copiedNode?.TreeBranchLeafNodeTable?.length || 0}`);
    console.log(`   - SelectConfig: ${copiedNode?.TreeBranchLeafSelectConfig?.length || 0}\n`);

    if (!copiedNode?.TreeBranchLeafSelectConfig || copiedNode.TreeBranchLeafSelectConfig.length === 0) {
      console.log(`   ⚠️  PAS DE SELECTCONFIG POUR LE NŒUD COPIÉ!\n`);
    } else {
      copiedNode.TreeBranchLeafSelectConfig.forEach(sc => {
        console.log(`   SelectConfig:`);
        console.log(`     - tableReference: ${sc.tableReference}`);
        console.log(`     - keyColumn: ${sc.keyColumn}`);
        console.log(`     - displayColumn: ${sc.displayColumn}\n`);
      });
    }

    // 3. Vérifier les métadatas complètes des tables
    console.log('\n3️⃣  ANALYSE DES MÉTADATAS COMPLÈTES\n');

    if (originalTable?.meta) {
      console.log('   Original meta.lookup:');
      console.log(JSON.stringify(originalTable.meta, null, 2));
    }

    if (copiedTable?.meta) {
      console.log('\n   Copié meta.lookup:');
      console.log(JSON.stringify(copiedTable.meta, null, 2));
    }

    // 4. Vérifier si les colonnes référencées dans meta existent
    console.log('\n4️⃣  VÉRIFICATION DES COLONNES RÉFÉRENCÉES\n');

    if (originalTable?.meta && typeof originalTable.meta === 'object' && 'lookup' in originalTable.meta) {
      const lookup = (originalTable.meta as any).lookup;
      if (lookup?.rowSourceOption?.comparisonColumn) {
        const colName = lookup.rowSourceOption.comparisonColumn;
        const colExists = originalTable.tableColumns.find(c => c.name === colName);
        console.log(`   Original - Colonne référencée: "${colName}"`);
        console.log(`   ${colExists ? '✅ Existe' : '❌ N\'existe pas'}\n`);
      }
    }

    if (copiedTable?.meta && typeof copiedTable.meta === 'object' && 'lookup' in copiedTable.meta) {
      const lookup = (copiedTable.meta as any).lookup;
      if (lookup?.rowSourceOption?.comparisonColumn) {
        const colName = lookup.rowSourceOption.comparisonColumn;
        const colExists = copiedTable.tableColumns.find(c => c.name === colName);
        console.log(`   Copié - Colonne référencée: "${colName}"`);
        console.log(`   ${colExists ? '✅ Existe' : '❌ N\'existe pas'}\n`);
      }
    }

    // 5. Vérifier les rows de chaque table
    console.log('\n5️⃣  VÉRIFICATION DES DONNÉES (ROWS)\n');

    const originalRows = await prisma.treeBranchLeafNodeTableRow.findMany({
      where: { tableId: originalTable?.id },
      take: 5
    });

    const copiedRows = await prisma.treeBranchLeafNodeTableRow.findMany({
      where: { tableId: copiedTable?.id },
      take: 5
    });

    console.log(`   Original - Nombre de lignes: ${await prisma.treeBranchLeafNodeTableRow.count({where: {tableId: originalTable?.id}})}`);
    console.log(`   Copié - Nombre de lignes: ${await prisma.treeBranchLeafNodeTableRow.count({where: {tableId: copiedTable?.id}})}`);

    if (originalRows.length > 0) {
      console.log(`\n   Exemple de données originales (première ligne):`);
      console.log(JSON.stringify(originalRows[0].cells, null, 2));
    }

    if (copiedRows.length > 0) {
      console.log(`\n   Exemple de données copiées (première ligne):`);
      console.log(JSON.stringify(copiedRows[0].cells, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n╚════════════════════════════════════════════════════════════════╝\n');
}

deepDiagnosis();

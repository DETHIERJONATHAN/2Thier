#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 DIAGNOSTIC: Vérifier les colonnes des tables "Panneau"');
  
  try {
    // Chercher la table "Panneau" (originale)
    const originalTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { name: 'Panneau' },
      include: { tableColumns: true }
    });
    
    console.log('\n📋 Table ORIGINALE "Panneau":');
    if (originalTable) {
      console.log(`  ID: ${originalTable.id}`);
      console.log(`  Colonnes: ${originalTable.tableColumns.map(c => c.name).join(', ')}`);
    } else {
      console.log('  ❌ NON TROUVÉE');
    }
    
    // Chercher la table "Panneau-1" (dupliquée)
    const duplicatedTable = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { name: 'Panneau-1' },
      include: { tableColumns: true }
    });
    
    console.log('\n📋 Table DUPLIQUÉE "Panneau-1":');
    if (duplicatedTable) {
      console.log(`  ID: ${duplicatedTable.id}`);
      console.log(`  Colonnes: ${duplicatedTable.tableColumns.map(c => c.name).join(', ')}`);
      
      console.log('\n🔥 PROBLÈME DÉTECTÉ?');
      const originalCols = originalTable?.tableColumns.map(c => c.name) || [];
      const dupCols = duplicatedTable.tableColumns.map(c => c.name);
      
      originalCols.forEach(origName => {
        const corresponding = dupCols.find(d => d === origName || d === `${origName}-1`);
        if (!corresponding) {
          console.log(`  ❌ Colonne "${origName}" NOT FOUND in duplicated table!`);
        } else if (corresponding === origName) {
          console.log(`  ⚠️ Colonne "${origName}" n'a PAS été suffixée (devrait être "${origName}-1")`);
        } else {
          console.log(`  ✅ Colonne "${origName}" → "${corresponding}" (correct!)`);
        }
      });
    } else {
      console.log('  ❌ NON TROUVÉE');
    }
    
    // Vérifier aussi les instances du nœud Puissance WC-1
    console.log('\n\n🎯 Vérifier les instances du nœud dupliqué:');
    const nodeId = 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a-1'; // Le nœud dupliqué
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });
    
    if (node && node.table_instances) {
      console.log(`\n  table_instances keys: ${Object.keys(node.table_instances)}`);
      Object.entries(node.table_instances).forEach(([tableId, instance]) => {
        console.log(`\n  Instance pour table ${tableId}:`);
        console.log(`    columns: ${instance.columns?.join(', ') || 'NULL'}`);
      });
    }
    
  } catch (err) {
    console.error('Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();

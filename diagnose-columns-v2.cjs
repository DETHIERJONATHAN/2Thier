#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 DIAGNOSTIC: Vérifier les colonnes des tables');
  
  try {
    // Récupérer TOUS les nœuds et filtrer manuellement
    console.log('\n1️⃣ Chercher les nœuds avec configuration lookup...');
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      select: {
        id: true,
        name: true,
        metadata: true,
        table_instances: true
      }
    });
    
    const nodesWithLookup = allNodes.filter(n => n.metadata?.lookup);
    console.log(`Trouvé ${nodesWithLookup.length} nœuds avec lookup config (sur ${allNodes.length} total)`);
    
    nodesWithLookup.slice(0, 10).forEach((node, i) => {
      console.log(`\n  ${i+1}. ${node.name} (${node.id})`);
      const lookup = node.metadata?.lookup;
      if (lookup) {
        console.log(`     📌 Original tableId: ${lookup.tableId}`);
        console.log(`     📌 displayColumn: ${lookup.displayColumn}`);
        console.log(`     📦 table_instances keys: ${Object.keys(node.table_instances || {}).join(', ')}`);
        
        Object.entries(node.table_instances || {}).forEach(([tableId, inst]) => {
          console.log(`       └─ Table ${tableId}:`);
          console.log(`          columns=${inst.columns ? inst.columns.length : 0} items`);
          if (inst.columns && inst.columns.length > 0) {
            console.log(`          [${inst.columns.slice(0, 4).join(', ')}${inst.columns.length > 4 ? '...' : ''}]`);
          } else if (!inst.columns) {
            console.log(`          ⚠️ columns est NULL/undefined!`);
          }
        });
      }
    });
    
    // Vérifier les vraies tables en BD
    console.log('\n\n2️⃣ Vérifier les vraies tables en BD:');
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      include: { tableColumns: { select: { name: true }, take: 10 } }
    });
    
    console.log(`Trouvé ${tables.length} tables au total`);
    tables.slice(0, 10).forEach((table, i) => {
      console.log(`\n  ${i+1}. ${table.name} (${table.id})`);
      const cols = table.tableColumns.map(c => c.name);
      console.log(`     Colonnes (${cols.length}): ${cols.slice(0, 5).join(', ')}${cols.length > 5 ? '...' : ''}`);
      
      // Vérifier si elle a un suffixe
      if (table.name.endsWith('-1') || table.name.includes('-')) {
        console.log(`     ✅ Cette table EST dupliquée!`);
      }
    });
    
  } catch (err) {
    console.error('Erreur:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullDiagnosis() {
  console.log('🔍 DIAGNOSTIC COMPLET : Orientation - Inclinaison\n');
  
  // 1. Trouver tous les nœuds mentionnant "Orientation" ou "Inclinaison"
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'Orientation', mode: 'insensitive' } },
        { label: { contains: 'Inclinaison', mode: 'insensitive' } }
      ]
    },
    orderBy: { label: 'asc' }
  });
  
  console.log(`📋 Found ${allNodes.length} nodes:\n`);
  for (const node of allNodes) {
    console.log(`  • ${node.label}`);
    console.log(`    ID: ${node.id}`);
    console.log(`    Type: ${node.type}/${node.subType}`);
    console.log(`    ParentId: ${node.parentId}`);
    console.log(`    table_activeId: ${node.table_activeId || 'null'}`);
    console.log('');
  }
  
  // 2. Vérifier SelectConfigs
  console.log('\n🔍 Checking SelectConfigs...\n');
  const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    where: {
      nodeId: { in: allNodes.map(n => n.id) }
    }
  });
  
  console.log(`📋 Found ${selectConfigs.length} SelectConfigs:\n`);
  for (const cfg of selectConfigs) {
    const node = allNodes.find(n => n.id === cfg.nodeId);
    console.log(`  • Node: ${node?.label} (${cfg.nodeId})`);
    console.log(`    optionsSource: ${cfg.optionsSource}`);
    console.log(`    tableReference: ${cfg.tableReference}`);
    console.log(`    keyColumn: ${cfg.keyColumn}`);
    console.log(`    keyRow: ${cfg.keyRow}`);
    console.log('');
  }
  
  // 3. Vérifier si les nœuds SELECT ont le bon subType
  console.log('\n⚠️ PROBLÈMES DÉTECTÉS:\n');
  
  for (const node of allNodes) {
    const cfg = selectConfigs.find(c => c.nodeId === node.id);
    
    if (cfg && node.subType !== 'SELECT') {
      console.log(`  ❌ Node "${node.label}" a un SelectConfig mais subType=${node.subType} (devrait être SELECT)`);
    }
    
    if (cfg && cfg.tableReference && !node.table_activeId) {
      console.log(`  ⚠️ Node "${node.label}" a tableReference dans SelectConfig mais pas de table_activeId`);
    }
  }
  
  // 4. Vérifier la table
  const tableId = '44e227e3-43fa-44df-92a6-7f6d0b3e10ee';
  const table = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    include: {
      tableColumns: { orderBy: { columnIndex: 'asc' } },
      tableRows: { take: 3, orderBy: { rowIndex: 'asc' } }
    }
  });
  
  console.log(`\n📊 Table ${tableId}:`);
  console.log(`  Columns: ${table?.tableColumns.map(c => c.name).join(', ')}`);
  console.log(`  Rows (first 3): ${table?.tableRows.map(r => r[0]).join(', ')}`);
  console.log(`  meta.lookup:`, table?.meta?.lookup);
}

fullDiagnosis()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

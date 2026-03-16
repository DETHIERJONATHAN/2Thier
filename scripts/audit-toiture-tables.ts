import { db } from '../src/lib/database';

async function main() {
  const badTableIds = [
    '71b5f791-ab28-4b3d-bfa3-b52bad25001c', // isolation
    '1d45b1cf-fe94-448e-93bc-7140fdd68e1d', // ardoises
    '8a8fe947-f26f-4eb8-8a3f-f6350f5aaf66', // sous_toiture
    '4f193ec2-7f99-486e-b3e7-1d4f44e21aa2', // chatieres
    'ac4e62a4-19c5-41d1-9c72-89eb10a10e3b', // gouttieres
    '173f3efa-7ec2-4411-87f5-6e6bd6f2f05b', // vue isolation
  ];
  
  const tables = await db.treeBranchLeafNodeTable.findMany({
    where: { id: { in: badTableIds } },
    select: { id: true, name: true, type: true, sourceTableId: true }
  });
  console.log('=== TABLES EXISTANTES (à supprimer) ===');
  for (const t of tables) {
    const colCount = await db.treeBranchLeafNodeTableColumn.count({ where: { tableId: t.id } });
    const rowCount = await db.treeBranchLeafNodeTableRow.count({ where: { tableId: t.id } });
    console.log(`  ${t.name} | id=${t.id.slice(0,8)} | type=${t.type} | src=${t.sourceTableId ? 'VIEW' : 'SOURCE'} | cols=${colCount} rows=${rowCount}`);
  }

  // SelectConfigs liés
  const configs = await db.treeBranchLeafSelectConfig.findMany({
    where: { tableReference: { in: badTableIds } },
    select: { id: true, nodeId: true, tableReference: true, keyColumn: true, displayColumn: true }
  });
  console.log('\n=== SELECT CONFIGS (à supprimer) ===');
  configs.forEach(c => console.log(`  id=${c.id} | nodeId=${c.nodeId} | table=${c.tableReference?.slice(0,8)} | key=${c.keyColumn} | display=${c.displayColumn}`));

  // Noeuds Toiture avec hasTable
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  const nodes = await db.treeBranchLeafNode.findMany({
    where: { treeId, hasTable: true },
    select: { id: true, label: true, hasTable: true, table_activeId: true, fieldType: true }
  });
  console.log('\n=== NOEUDS avec hasTable (tree Devis) ===');
  nodes.forEach(n => console.log(`  ${n.label} | id=${n.id.slice(0,8)} | type=${n.fieldType} | activeId=${n.table_activeId?.slice(0,8)}`));

  // Exemple Onduleur PV (fonctionnel)
  const onduleurTable = await db.treeBranchLeafNodeTable.findFirst({
    where: { id: 'de4973d9-7b54-4f9c-a6b2-ba94e0c1c33a' },
    select: { id: true, name: true, type: true, meta: true, sourceTableId: true, nodeId: true }
  });
  if (onduleurTable) {
    console.log('\n=== EXEMPLE ONDULEUR PV (fonctionnel) ===');
    console.log(`  name=${onduleurTable.name} | type=${onduleurTable.type} | nodeId=${onduleurTable.nodeId}`);
    console.log(`  meta=${JSON.stringify(onduleurTable.meta, null, 2)}`);
    
    const ondulConfigs = await db.treeBranchLeafSelectConfig.findMany({
      where: { tableReference: onduleurTable.id },
      select: { id: true, nodeId: true, optionsSource: true, keyColumn: true, displayColumn: true, columnSourceOption: true }
    });
    console.log('  SelectConfigs:');
    ondulConfigs.forEach(c => console.log(`    nodeId=${c.nodeId} | src=${c.optionsSource} | key=${c.keyColumn} | display=${c.displayColumn} | colSrc=${JSON.stringify(c.columnSourceOption)}`));
    
    const ondulViews = await db.treeBranchLeafNodeTable.findMany({
      where: { sourceTableId: onduleurTable.id },
      select: { id: true, name: true, meta: true }
    });
    console.log(`  Views (${ondulViews.length}):`);
    ondulViews.forEach(v => console.log(`    ${v.name} | id=${v.id.slice(0,8)} | meta=${JSON.stringify(v.meta)}`));

    // Node de l'onduleur
    const onduleurNode = await db.treeBranchLeafNode.findFirst({
      where: { id: onduleurTable.nodeId! },
      select: { id: true, label: true, table_activeId: true, hasTable: true, table_instances: true, linkedTableIds: true }
    });
    if (onduleurNode) {
      console.log(`  Node: label=${onduleurNode.label} | activeId=${onduleurNode.table_activeId?.slice(0,8)} | hasTable=${onduleurNode.hasTable}`);
      console.log(`  table_instances=${JSON.stringify(onduleurNode.table_instances)}`);
      console.log(`  linkedTableIds=${JSON.stringify(onduleurNode.linkedTableIds)}`);
    }
  }

  // Voir la structure des colonnes de l'onduleur
  const onduleurCols = await db.treeBranchLeafNodeTableColumn.findMany({
    where: { tableId: 'de4973d9-7b54-4f9c-a6b2-ba94e0c1c33a' },
    select: { id: true, name: true, type: true, order: true },
    orderBy: { order: 'asc' }
  });
  console.log('\n=== COLONNES ONDULEUR ===');
  onduleurCols.forEach(c => console.log(`  ${c.name} | type=${c.type} | order=${c.order}`));

  await db.$disconnect();
}
main().catch(console.error);

import { db } from '../src/lib/database';

async function main() {
  // Exemple Onduleur PV (fonctionnel)
  const onduleurTable = await db.treeBranchLeafNodeTable.findFirst({
    where: { id: 'de4973d9-7b54-4f9c-a6b2-ba94e0c1c33a' },
    select: { id: true, name: true, type: true, meta: true, sourceTableId: true, nodeId: true }
  });
  if (onduleurTable) {
    console.log('=== TABLE ONDULEUR PV ===');
    console.log(`  name=${onduleurTable.name} | type=${onduleurTable.type} | nodeId=${onduleurTable.nodeId}`);
    console.log(`  sourceTableId=${onduleurTable.sourceTableId || 'NULL (=SOURCE)'}`);
    console.log(`  meta=${JSON.stringify(onduleurTable.meta, null, 2)}`);
    
    const ondulConfigs = await db.treeBranchLeafSelectConfig.findMany({
      where: { tableReference: onduleurTable.id },
      select: { id: true, nodeId: true, optionsSource: true, keyColumn: true, displayColumn: true, keyRow: true, valueColumn: true }
    });
    console.log(`\n  SelectConfigs (${ondulConfigs.length}):`);
    ondulConfigs.forEach(c => console.log(`    nodeId=${c.nodeId} | src=${c.optionsSource} | key=${c.keyColumn} | display=${c.displayColumn} | keyRow=${c.keyRow} | valueCol=${c.valueColumn}`));
    
    const ondulViews = await db.treeBranchLeafNodeTable.findMany({
      where: { sourceTableId: onduleurTable.id },
      select: { id: true, name: true, meta: true, nodeId: true }
    });
    console.log(`\n  Views (${ondulViews.length}):`);
    ondulViews.forEach(v => console.log(`    ${v.name} | id=${v.id.slice(0,8)} | nodeId=${v.nodeId} | meta=${JSON.stringify(v.meta)}`));

    // Node onduleur
    const onduleurNode = await db.treeBranchLeafNode.findFirst({
      where: { id: onduleurTable.nodeId! },
      select: { id: true, label: true, table_activeId: true, hasTable: true, table_instances: true, linkedTableIds: true }
    });
    if (onduleurNode) {
      console.log(`\n  Node: label=${onduleurNode.label} | activeId=${onduleurNode.table_activeId} | hasTable=${onduleurNode.hasTable}`);
      console.log(`  table_instances=${JSON.stringify(onduleurNode.table_instances)}`);
      console.log(`  linkedTableIds=${JSON.stringify(onduleurNode.linkedTableIds)}`);
    }

    // Colonnes
    const cols = await db.treeBranchLeafNodeTableColumn.findMany({
      where: { tableId: onduleurTable.id },
      select: { id: true, name: true, type: true, columnIndex: true },
      orderBy: { columnIndex: 'asc' }
    });
    console.log(`\n  Colonnes (${cols.length}):`);
    cols.forEach(c => console.log(`    [${c.columnIndex}] ${c.name} | type=${c.type}`));

    // Nombre de rows
    const rowCount = await db.treeBranchLeafNodeTableRow.count({ where: { tableId: onduleurTable.id } });
    console.log(`\n  Rows: ${rowCount}`);
  }

  // Aussi vérifier un noeud DISPLAY lié à l'onduleur pour comprendre displayColumn
  console.log('\n\n=== NOEUDS DISPLAY LIÉS AU PV ===');
  const displayNodes = await db.treeBranchLeafNode.findMany({
    where: { 
      treeId: 'cmf1mwoz10005gooked1j6orn',
      label: { contains: 'achat' },
      hasTable: true
    },
    select: { id: true, label: true, table_activeId: true, fieldType: true }
  });
  for (const dn of displayNodes) {
    console.log(`\n  ${dn.label} | id=${dn.id} | type=${dn.fieldType} | activeId=${dn.table_activeId}`);
    if (dn.table_activeId) {
      const t = await db.treeBranchLeafNodeTable.findFirst({
        where: { id: dn.table_activeId },
        select: { id: true, name: true, type: true, sourceTableId: true, meta: true, nodeId: true }
      });
      if (t) {
        console.log(`    Table: ${t.name} | type=${t.type} | src=${t.sourceTableId ? t.sourceTableId.slice(0,8) + '...(VIEW)' : 'SOURCE'}`);
        console.log(`    meta=${JSON.stringify(t.meta)}`);
      }
      const sc = await db.treeBranchLeafSelectConfig.findFirst({
        where: { nodeId: dn.id },
        select: { id: true, optionsSource: true, keyColumn: true, displayColumn: true, tableReference: true, keyRow: true, valueColumn: true, displayRow: true }
      });
      if (sc) {
        console.log(`    SelectConfig: src=${sc.optionsSource} | key=${sc.keyColumn} | display=${sc.displayColumn} | table=${sc.tableReference?.slice(0,8)} | keyRow=${sc.keyRow} | valueCol=${sc.valueColumn} | displayRow=${sc.displayRow}`);
      }
    }
  }

  await db.$disconnect();
}
main().catch(console.error);

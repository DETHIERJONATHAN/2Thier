import { db } from '../src/lib/database';

async function main() {
  // Trouver un exemple de VUE qui fonctionne (PV / Onduleur)
  const onduleurNode = await db.treeBranchLeafNode.findFirst({
    where: { label: { contains: 'Onduleur' }, hasTable: true },
    select: { id: true, label: true, table_activeId: true, hasTable: true, table_instances: true, linkedTableIds: true, fieldType: true }
  });
  if (!onduleurNode) { console.log('Onduleur not found'); process.exit(0); }
  console.log('=== NOEUD ONDULEUR ===');
  console.log('  id:', onduleurNode.id);
  console.log('  label:', onduleurNode.label);
  console.log('  fieldType:', onduleurNode.fieldType);
  console.log('  hasTable:', onduleurNode.hasTable);
  console.log('  table_activeId:', onduleurNode.table_activeId);
  console.log('  linkedTableIds:', onduleurNode.linkedTableIds);
  
  // Table active
  if (onduleurNode.table_activeId) {
    const activeTable = await db.treeBranchLeafNodeTable.findUnique({
      where: { id: onduleurNode.table_activeId },
      select: { id: true, name: true, type: true, sourceTableId: true, meta: true, nodeId: true,
        tableColumns: { select: { name: true }, orderBy: { columnIndex: 'asc' } },
        _count: { select: { tableRows: true } }
      }
    });
    if (activeTable) {
      console.log('\n=== TABLE ACTIVE ===');
      console.log('  id:', activeTable.id);
      console.log('  name:', activeTable.name);
      console.log('  type:', activeTable.type);
      console.log('  sourceTableId:', activeTable.sourceTableId);
      console.log('  nodeId:', activeTable.nodeId);
      console.log('  cols:', activeTable.tableColumns.map(c => c.name));
      console.log('  rows:', activeTable._count.tableRows);
      const meta = activeTable.meta as any;
      if (meta?.lookup) {
        console.log('  meta.lookup:', JSON.stringify(meta.lookup, null, 2).slice(0, 1200));
      }
    }
  }
  
  // SelectConfig
  const sc = await db.treeBranchLeafSelectConfig.findFirst({
    where: { nodeId: onduleurNode.id }
  });
  if (sc) {
    console.log('\n=== SELECT CONFIG ===');
    console.log('  optionsSource:', sc.optionsSource);
    console.log('  tableReference:', sc.tableReference);
    console.log('  keyColumn:', sc.keyColumn);
    console.log('  displayColumn:', sc.displayColumn);
    console.log('  keyRow:', sc.keyRow);
  }
  
  // table_instances format
  const inst = onduleurNode.table_instances;
  if (inst && typeof inst === 'object') {
    const keys = Object.keys(inst as any);
    console.log('\n=== TABLE_INSTANCES ===');
    console.log('  keys:', keys);
    if (keys[0]) {
      const first = (inst as any)[keys[0]];
      console.log('  first instance keys:', Object.keys(first || {}));
      const hasLookup = first?.meta?.lookup ? true : false;
      console.log('  first.meta.lookup exists:', hasLookup);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

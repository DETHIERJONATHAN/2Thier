import { db } from '../src/lib/database';

async function main() {
  // Get all PV-related nodes with hasTable (both SELECT and DISPLAY)
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  
  // Check both the SELECT nodes (Onduleur, Panneau, Batterie) and display nodes
  const pvSelectNodes = await db.treeBranchLeafNode.findMany({
    where: {
      treeId,
      hasTable: true,
      label: { in: ['Onduleur', 'Panneau', 'Batterie', 'KVA', 'Puissance WC', 'N° de panneau max ', 'Production', 'Couverture', 'Orientation', 'Orientation inclinaison', 'GRD'] }
    },
    select: { id: true, label: true, table_activeId: true, fieldType: true, hasTable: true }
  });
  
  console.log('=== SELECT/DISPLAY NODES PV ===');
  for (const n of pvSelectNodes) {
    console.log(`\n  ${n.label} | id=${n.id} | type=${n.fieldType}`);
    
    if (n.table_activeId) {
      const t = await db.treeBranchLeafNodeTable.findFirst({
        where: { id: n.table_activeId },
        select: { id: true, name: true, type: true, sourceTableId: true, meta: true }
      });
      if (t) {
        console.log(`    Table: ${t.name} | type=${t.type} | src=${t.sourceTableId ? t.sourceTableId.slice(0,8)+'...(VIEW)' : 'SOURCE'}`);
        const meta = t.meta as any;
        if (meta?.lookup) {
          console.log(`    lookup.enabled=${meta.lookup.enabled}`);
          console.log(`    lookup.columnLookupEnabled=${meta.lookup.columnLookupEnabled}`);
          console.log(`    lookup.displayColumn=${JSON.stringify(meta.lookup.displayColumn)}`);
          console.log(`    lookup.columnSourceOption=${JSON.stringify(meta.lookup.columnSourceOption)}`);
          console.log(`    lookup.keyRow=${JSON.stringify(meta.lookup.keyRow?.slice(0,3))}... (${meta.lookup.keyRow?.length} items)`);
          if (meta.lookup.filterConditions) console.log(`    lookup.filterConditions=${JSON.stringify(meta.lookup.filterConditions)}`);
          if (meta.lookup.keyColumn) console.log(`    lookup.keyColumn=${meta.lookup.keyColumn}`);
        }
      }
      
      const sc = await db.treeBranchLeafSelectConfig.findFirst({
        where: { nodeId: n.id },
        select: { id: true, optionsSource: true, keyColumn: true, displayColumn: true, tableReference: true }
      });
      if (sc) {
        console.log(`    SC: src=${sc.optionsSource} | key=${sc.keyColumn} | display=${sc.displayColumn} | tableRef=${sc.tableReference?.slice(0,8)}`);
      }
    }
  }

  // Now check if there are any VIEW tables in the system at all
  console.log('\n\n=== ALL VIEW TABLES IN SYSTEM ===');
  const views = await db.treeBranchLeafNodeTable.findMany({
    where: { sourceTableId: { not: null } },
    select: { id: true, name: true, sourceTableId: true, meta: true, nodeId: true }
  });
  console.log(`Total views: ${views.length}`);
  views.forEach(v => {
    const meta = v.meta as any;
    console.log(`  ${v.name} | src=${v.sourceTableId?.slice(0,8)} | node=${v.nodeId?.slice(0,8)} | filterConditions=${JSON.stringify(meta?.lookup?.filterConditions || 'none')}`);
  });

  // Toiture nodes that currently point to deleted tables
  console.log('\n\n=== TOITURE NODES (broken refs) ===');
  const toitureNodes = await db.treeBranchLeafNode.findMany({
    where: {
      treeId,
      id: { in: [
        'cdd207df-d1f4-41d9-a0b2-42b6e2b9c6ad', // Type évacuation eaux
        'b5453005-e48e-4da1-920f-e2e8b28bff3a', // Sous-toiture à poser
        '851859d0-5dff-43e1-9b3f-7de4e28e0fe2', // Matériau couverture
        'cdfb1287-8e28-4c80-9d7e-d5e15edda9f9', // Modèle chatière  
        '1c6d1a66-4680-4bfc-b4a4-cd76bf7afe3d', // Type isolation
      ]}
    },
    select: { id: true, label: true, table_activeId: true, fieldType: true, hasTable: true, parentId: true }
  });
  for (const n of toitureNodes) {
    const tableExists = n.table_activeId ? await db.treeBranchLeafNodeTable.findFirst({ where: { id: n.table_activeId }, select: { id: true } }) : null;
    console.log(`  ${n.label} | type=${n.fieldType} | activeId=${n.table_activeId?.slice(0,8)} | tableExists=${!!tableExists} | parentId=${n.parentId?.slice(0,8)}`);
  }

  await db.$disconnect();
}
main().catch(console.error);

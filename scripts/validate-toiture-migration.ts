import { db } from '../src/lib/database';

async function main() {
  console.log('=== VALIDATION POST-MIGRATION ===\n');

  // 1. Vérifier la table source
  const source = await db.treeBranchLeafNodeTable.findFirst({
    where: { name: 'Catalogue Façozinc - Toiture' },
    select: { id: true, name: true, type: true, sourceTableId: true, meta: true }
  });
  if (!source) { console.log('❌ Table source introuvable!'); return; }
  const srcCols = await db.treeBranchLeafNodeTableColumn.count({ where: { tableId: source.id } });
  const srcRows = await db.treeBranchLeafNodeTableRow.count({ where: { tableId: source.id } });
  console.log(`✅ Source: ${source.name}`);
  console.log(`   id=${source.id}`);
  console.log(`   type=${source.type} | sourceTableId=${source.sourceTableId || 'NULL (=SOURCE)'}`);
  console.log(`   ${srcCols} colonnes, ${srcRows} rows (1 header + ${srcRows - 1} données)`);

  // 2. Vérifier les vues
  const views = await db.treeBranchLeafNodeTable.findMany({
    where: { sourceTableId: source.id },
    select: { id: true, name: true, meta: true, nodeId: true }
  });
  console.log(`\n✅ ${views.length} vues trouvées:`);
  for (const v of views) {
    const meta = v.meta as any;
    const filterCond = meta?.lookup?.filterConditions?.conditions?.[0];
    const node = await db.treeBranchLeafNode.findUnique({
      where: { id: v.nodeId },
      select: { label: true, hasTable: true, table_activeId: true }
    });
    const sc = await db.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId: v.nodeId },
      select: { keyColumn: true, displayColumn: true, tableReference: true, optionsSource: true }
    });
    
    const activeOk = node?.table_activeId === v.id ? '✅' : '❌';
    const scOk = sc?.tableReference === v.id ? '✅' : '❌';
    
    console.log(`\n   ${v.name} (${v.id.slice(0,8)}...)`);
    console.log(`   Node: ${node?.label} | hasTable=${node?.hasTable} | activeId=${activeOk} matches`);
    console.log(`   Filter: ${filterCond?.filterByColumn} ${filterCond?.operator} "${filterCond?.compareWithRef}"`);
    console.log(`   SC: ${scOk} src=${sc?.optionsSource} key=${sc?.keyColumn} display=${sc?.displayColumn}`);
    console.log(`   meta.lookup.displayColumn=${JSON.stringify(meta?.lookup?.displayColumn)}`);
  }

  // 3. Vérifier quelques données de la source
  console.log('\n✅ Échantillon de données source:');
  const sampleRows = await db.treeBranchLeafNodeTableRow.findMany({
    where: { tableId: source.id },
    orderBy: { rowIndex: 'asc' },
    take: 6,
    select: { rowIndex: true, cells: true }
  });
  sampleRows.forEach(r => {
    const cells = typeof r.cells === 'string' ? JSON.parse(r.cells) : r.cells;
    console.log(`   [${r.rowIndex}] ${JSON.stringify(cells)}`);
  });

  // 4. Compter les produits par catégorie
  console.log('\n✅ Répartition par catégorie:');
  const allRows = await db.treeBranchLeafNodeTableRow.findMany({
    where: { tableId: source.id, rowIndex: { gt: 0 } }, // skip header
    select: { cells: true }
  });
  const catStats: Record<string, number> = {};
  for (const row of allRows) {
    const cells = typeof row.cells === 'string' ? JSON.parse(row.cells) : row.cells;
    const cat = (cells as any[])[2]; // Catégorie at index 2
    catStats[cat] = (catStats[cat] || 0) + 1;
  }
  Object.entries(catStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} produits`);
  });

  await db.$disconnect();
}
main().catch(console.error);

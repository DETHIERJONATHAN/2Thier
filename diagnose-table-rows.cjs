/**
 * 🔍 DIAGNOSTIC : Vérifier les données sauvegardées dans tableRows
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseTableRows() {
  console.log('\n🔍 DIAGNOSTIC tableRows pour table Import O-I.xlsx\n');

  // 1. Lister toutes les tables
  const allTables = await prisma.treeBranchLeafNodeTable.findMany({
    select: {
      id: true,
      name: true,
      nodeId: true,
      type: true
    },
    take: 20
  });

  console.log('📋 TABLES DISPONIBLES:');
  allTables.forEach((t, idx) => {
    console.log(`   [${idx}] id=${t.id.slice(0, 20)}..., name="${t.name}", type=${t.type}`);
  });

  // Chercher "Import O-I"
  const table = allTables.find(t => t.name && t.name.toLowerCase().includes('import'));
  
  if (!table) {
    console.log('\n❌ Aucune table "Import" trouvée');
    return;
  }

  console.log(`\n✅ Table trouvée: ${table.name} (ID: ${table.id})\n`);

  // 2. Charger avec détails
  const tableDetails = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: table.id },
    include: {
      tableColumns: {
        orderBy: { columnIndex: 'asc' },
        take: 5
      },
      tableRows: {
        orderBy: { rowIndex: 'asc' },
        take: 5
      }
    }
  });

  if (!tableDetails) {
    console.error('❌ Table introuvable après chargement');
    return;
  }

  console.log('📊 TABLE INFO:');
  console.log(`   ID: ${tableDetails.id}`);
  console.log(`   Nom: ${tableDetails.name}`);
  console.log(`   Type: ${tableDetails.type}`);

  console.log('\n📋 COLONNES (5 premières):');
  tableDetails.tableColumns.forEach((col, idx) => {
    console.log(`   [${idx}] columnIndex=${col.columnIndex}, name="${col.name}"`);
  });

  console.log('\n📋 LIGNES (5 premières):');
  tableDetails.tableRows.forEach((row, idx) => {
    console.log(`\n   [${idx}] rowIndex=${row.rowIndex}`);
    console.log(`        cells (raw): ${typeof row.cells}`);
    
    if (typeof row.cells === 'string') {
      try {
        const parsed = JSON.parse(row.cells);
        console.log(`        cells (parsed): array[${parsed.length}]`);
        console.log(`        cells[0] (label): "${parsed[0]}"`);
        console.log(`        cells[1-3] (data): [${parsed.slice(1, 4).join(', ')}]`);
      } catch (err) {
        console.log(`        ❌ ERREUR PARSE: ${err.message}`);
        console.log(`        cells (string): "${row.cells.slice(0, 100)}..."`);
      }
    } else if (Array.isArray(row.cells)) {
      console.log(`        cells (array): length=${row.cells.length}`);
      console.log(`        cells[0] (label): "${row.cells[0]}"`);
      console.log(`        cells[1-3] (data): [${row.cells.slice(1, 4).join(', ')}]`);
    } else {
      console.log(`        ❌ cells est null ou undefined`);
    }
  });

  // 2. Compter le nombre total de lignes
  const totalRows = await prisma.treeBranchLeafNodeTableRow.count({
    where: { tableId: table.id }
  });
  console.log(`\n📊 TOTAL LIGNES: ${totalRows}`);

  // 3. Vérifier s'il y a des lignes avec cells vide
  const { Prisma } = require('@prisma/client');
  const emptyRows = await prisma.treeBranchLeafNodeTableRow.findMany({
    where: {
      tableId: table.id,
      OR: [
        { cells: { equals: Prisma.DbNull } },
        { cells: { equals: '[]' } },
        { cells: { equals: '' } }
      ]
    },
    take: 10
  });
  
  console.log(`\n⚠️ LIGNES AVEC CELLS VIDE: ${emptyRows.length}`);
  emptyRows.forEach((row, idx) => {
    console.log(`   [${idx}] rowIndex=${row.rowIndex}, cells=${JSON.stringify(row.cells)}`);
  });

  console.log('\n💡 DIAGNOSTIC:');
  if (emptyRows.length > 0) {
    console.log('   ❌ PROBLÈME: Des lignes ont cells vide → labels deviennent ""');
    console.log('   ✅ SOLUTION: Recharger les données du tableau depuis la source');
  } else {
    console.log('   ✅ Toutes les lignes ont des cells valides');
    console.log('   → Le problème vient probablement de la normalisation côté API');
  }
}

diagnoseTableRows()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error('❌ Erreur:', err);
    prisma.$disconnect();
  });

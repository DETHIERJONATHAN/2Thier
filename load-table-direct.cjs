/**
 * 🔍 Charger directement la table par ID
 */

const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function loadTableById() {
  console.log('\n🔍 CHARGEMENT TABLE PAR ID\n');

  const tableId = 'ace9ddf9-4819-4f7c-b62e-46b719e66c79';

  const table = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    include: {
      tableColumns: {
        orderBy: { columnIndex: 'asc' }
      },
      tableRows: {
        orderBy: { rowIndex: 'asc' },
        take: 10
      }
    }
  });

  if (!table) {
    console.log('❌ Table introuvable avec cet ID');
    console.log('\n📋 Recherche par pattern dans le nom...');
    
    const allTables = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        name: {
          contains: 'Import',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        nodeId: true,
        type: true
      }
    });

    console.log(`\n✅ ${allTables.length} table(s) "Import" trouvée(s):`);
    allTables.forEach((t, idx) => {
      console.log(`   [${idx}] ID: ${t.id}`);
      console.log(`        Nom: ${t.name}`);
      console.log(`        NodeId: ${t.nodeId}`);
    });
    
    return;
  }

  console.log('✅ TABLE TROUVÉE:');
  console.log(`   ID: ${table.id}`);
  console.log(`   Nom: ${table.name}`);
  console.log(`   Type: ${table.type}`);
  console.log(`   NodeId: ${table.nodeId}`);

  console.log(`\n📋 COLONNES (${table.tableColumns.length} total):`);
  table.tableColumns.slice(0, 15).forEach((col, idx) => {
    console.log(`   [${idx}] columnIndex=${col.columnIndex}, name="${col.name}"`);
  });
  if (table.tableColumns.length > 15) {
    console.log(`   ... (${table.tableColumns.length - 15} autres colonnes)`);
  }

  console.log(`\n📋 LIGNES (10 premières):`);
  table.tableRows.forEach((row, idx) => {
    console.log(`\n   [${idx}] rowIndex=${row.rowIndex}`);
    
    try {
      let parsed;
      if (typeof row.cells === 'string') {
        parsed = JSON.parse(row.cells);
      } else {
        parsed = row.cells;
      }
      
      if (Array.isArray(parsed)) {
        console.log(`        cells: array[${parsed.length}]`);
        console.log(`        cells[0] (label): "${parsed[0]}"`);
        if (parsed.length > 1) {
          console.log(`        cells[1-3]: [${parsed.slice(1, 4).join(', ')}]`);
        }
      } else {
        console.log(`        ⚠️ cells n'est PAS un array: ${typeof parsed}`);
        console.log(`        cells: ${JSON.stringify(parsed).slice(0, 100)}`);
      }
    } catch (err) {
      console.log(`        ❌ ERREUR PARSE: ${err.message}`);
      const raw = typeof row.cells === 'string' ? row.cells : JSON.stringify(row.cells);
      console.log(`        cells (raw): ${raw.slice(0, 100)}...`);
    }
  });

  const totalRows = await prisma.treeBranchLeafNodeTableRow.count({
    where: { tableId: table.id }
  });
  console.log(`\n📊 TOTAL LIGNES: ${totalRows}`);

  console.log('\n💡 ANALYSE:');
  if (totalRows === 0) {
    console.log('   ❌ Le tableau est VIDE (0 lignes) !');
    console.log('   → Il faut réimporter le fichier Excel');
  } else if (table.tableRows[0]) {
    const firstRow = table.tableRows[0];
    try {
      const parsed = typeof firstRow.cells === 'string' ? JSON.parse(firstRow.cells) : firstRow.cells;
      if (Array.isArray(parsed) && parsed[0]) {
        console.log('   ✅ Les lignes contiennent des données');
        console.log(`   → Premier label: "${parsed[0]}"`);
      } else {
        console.log('   ⚠️ Le format des cells est incorrect');
      }
    } catch {
      console.log('   ❌ Impossible de parser les cells');
    }
  }
}

loadTableById()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error('❌ Erreur:', err);
    prisma.$disconnect();
  });

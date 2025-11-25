const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tableId = process.argv[2];

if (!tableId) {
  console.error('Usage: node scripts/dump-table.cjs <tableId>');
  process.exit(1);
}

(async () => {
  try {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { orderBy: { rowIndex: 'asc' } }
      }
    });

    if (!table) {
      console.error('❌ Table introuvable');
      return;
    }

    console.log('ID:', table.id);
    console.log('NodeId:', table.nodeId);
    console.log('Nom:', table.name);
    console.log('Type:', table.type);
    console.log('Rows:', table.rowCount, 'Columns:', table.columnCount);

    const meta = table.meta;
    console.log('Lookup meta keys:', meta ? Object.keys(meta) : []);
    console.log('Lookup config:', JSON.stringify(meta?.lookup, null, 2));

    console.log('\nColonnes:');
    table.tableColumns.forEach(col => {
      console.log(`  [${col.columnIndex}] ${col.name}`);
    });

    console.log('\nLignes (rowIndex / cells):');
    table.tableRows.forEach(row => {
      console.log(`  [${row.rowIndex}] ${JSON.stringify(row.cells)}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();

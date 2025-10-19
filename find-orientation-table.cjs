/**
 * 🔍 Trouver la table avec Orientation et Inclinison
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOrientationTable() {
  console.log('\n🔍 RECHERCHE table Orientation-Inclinison\n');

  // NodeId du champ avec la table (d'après les logs précédents)
  const nodeId = 'cc8bf34e-3461-426e-a16d-2c1db4ff8a76';

  console.log('📋 Recherche pour nodeId:', nodeId);

  // 1. Trouver toutes les tables de ce nœud
  const tables = await prisma.treeBranchLeafNodeTable.findMany({
    where: { nodeId },
    select: {
      id: true,
      name: true,
      type: true,
      nodeId: true
    }
  });

  console.log(`\n✅ ${tables.length} table(s) trouvée(s):`);
  tables.forEach((t, idx) => {
    console.log(`   [${idx}] ID: ${t.id}`);
    console.log(`        Nom: ${t.name}`);
    console.log(`        Type: ${t.type}`);
  });

  if (tables.length === 0) {
    console.log('\n❌ Aucune table trouvée pour ce nœud');
    return;
  }

  // 2. Pour chaque table, charger les détails
  for (const table of tables) {
    console.log(`\n\n📊 DÉTAILS TABLE: ${table.name} (${table.id})`);
    
    const details = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: table.id },
      include: {
        tableColumns: {
          orderBy: { columnIndex: 'asc' },
          take: 10
        },
        tableRows: {
          orderBy: { rowIndex: 'asc' },
          take: 5
        }
      }
    });

    console.log(`\n   📋 COLONNES (${details.tableColumns.length} premières):`);
    details.tableColumns.forEach((col, idx) => {
      console.log(`      [${idx}] name="${col.name}"`);
    });

    console.log(`\n   📋 LIGNES (${details.tableRows.length} premières):`);
    details.tableRows.forEach((row, idx) => {
      console.log(`\n      [${idx}] rowIndex=${row.rowIndex}`);
      console.log(`           cells type: ${typeof row.cells}`);
      
      try {
        let parsed;
        if (typeof row.cells === 'string') {
          parsed = JSON.parse(row.cells);
        } else {
          parsed = row.cells;
        }
        
        if (Array.isArray(parsed)) {
          console.log(`           cells: array[${parsed.length}]`);
          console.log(`           cells[0] (label): "${parsed[0]}"`);
          if (parsed.length > 1) {
            console.log(`           cells[1-3]: [${parsed.slice(1, 4).join(', ')}]`);
          }
        } else {
          console.log(`           cells: ${JSON.stringify(parsed).slice(0, 100)}`);
        }
      } catch (err) {
        console.log(`           ❌ ERREUR PARSE: ${err.message}`);
        console.log(`           cells (raw): ${JSON.stringify(row.cells).slice(0, 100)}`);
      }
    });

    // Compter total lignes
    const totalRows = await prisma.treeBranchLeafNodeTableRow.count({
      where: { tableId: table.id }
    });
    console.log(`\n   📊 TOTAL LIGNES: ${totalRows}`);
  }
}

findOrientationTable()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error('❌ Erreur:', err);
    prisma.$disconnect();
  });

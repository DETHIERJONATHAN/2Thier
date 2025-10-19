const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchInTable() {
  try {
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      select: {
        id: true,
        name: true,
        columns: true,
        rows: true,
        data: true
      }
    });

    console.log('Total tables trouvees:', tables.length);

    for (const table of tables) {
      let columns, rows, matrix;
      
      try {
        columns = typeof table.columns === 'string' ? JSON.parse(table.columns) : table.columns;
        rows = typeof table.rows === 'string' ? JSON.parse(table.rows) : table.rows;
        matrix = typeof table.data === 'string' ? JSON.parse(table.data) : table.data;
        
        if (!Array.isArray(matrix)) {
          matrix = matrix?.matrix || [];
        }
      } catch (e) {
        console.log('Erreur parsing table', table.name, ':', e.message);
        continue;
      }

      console.log('Table:', table.name, '-', rows?.length || 0, 'lignes,', columns?.length || 0, 'colonnes');

      const sibelgaIndex = columns?.findIndex(col => 
        col.toLowerCase().includes('sibelga')
      );

      if (sibelgaIndex === -1) {
        console.log('  Pas de colonne sibelga');
        continue;
      }

      console.log('  Colonne sibelga trouvee a index', sibelgaIndex);

      let found = false;
      for (let rowIdx = 0; rowIdx < (matrix?.length || 0); rowIdx++) {
        const row = matrix[rowIdx];
        if (!Array.isArray(row)) continue;

        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const cell = String(row[colIdx] || '');
          if (cell.includes('5150')) {
            const sibelgaValue = row[sibelgaIndex];
            console.log('');
            console.log('=== TROUVE 5150 ===');
            console.log('Ligne:', rowIdx + 1, '-', rows?.[rowIdx] || 'N/A');
            console.log('Colonne:', colIdx, '-', columns?.[colIdx] || 'N/A');
            console.log('Valeur:', cell);
            console.log('Valeur Sibelga:', sibelgaValue);
            console.log('===================');
            console.log('');
            found = true;
          }
        }
      }

      if (!found) {
        console.log('  5150 non trouve dans cette table');
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchInTable();

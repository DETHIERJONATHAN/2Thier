const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllTables() {
  try {
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('=== DERNIERES TABLES ===');
    console.log('');

    for (const table of tables) {
      const rowCount = Array.isArray(table.rows) ? table.rows.length : 0;
      const dataCount = Array.isArray(table.data) ? table.data.length : 
                        (table.data?.matrix?.length || 0);
      const colCount = Array.isArray(table.columns) ? table.columns.length : 0;

      console.log(`ID: ${table.id}`);
      console.log(`Name: ${table.name}`);
      console.log(`Created: ${table.createdAt}`);
      console.log(`Colonnes: ${colCount}`);
      console.log(`Rows: ${rowCount}`);
      console.log(`Data rows: ${dataCount}`);
      
      if (dataCount > 0) {
        if (table.data?.matrix) {
          for (let i = 0; i < Math.min(table.data.matrix.length, 50000); i++) {
            if (Array.isArray(table.data.matrix[i])) {
              for (let j = 0; j < table.data.matrix[i].length; j++) {
                if (String(table.data.matrix[i][j]).includes('5150')) {
                  console.log('');
                  console.log('*** TROUVE 5150 DANS CETTE TABLE ! ***');
                  console.log('Ligne:', i);
                  console.log('Colonne:', j, '-', table.columns[j]);
                  console.log('Valeur:', table.data.matrix[i][j]);
                  console.log('Ligne complete:', table.data.matrix[i]);
                  console.log('***********************************');
                }
              }
            }
          }
        } else if (Array.isArray(table.data)) {
          for (let i = 0; i < Math.min(table.data.length, 50000); i++) {
            if (Array.isArray(table.data[i])) {
              for (let j = 0; j < table.data[i].length; j++) {
                if (String(table.data[i][j]).includes('5150')) {
                  console.log('');
                  console.log('*** TROUVE 5150 DANS CETTE TABLE ! ***');
                  console.log('Ligne:', i);
                  console.log('Colonne:', j, '-', table.columns[j]);
                  console.log('Valeur:', table.data[i][j]);
                  console.log('Ligne complete:', table.data[i]);
                  console.log('***********************************');
                }
              }
            }
          }
        }
      }
      console.log('---');
      console.log('');
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAllTables();

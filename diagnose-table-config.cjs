const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnose() {
  try {
    // La table ID du node Puissance WC
    const tableId = 'a897ea6c-0c9a-411e-a573-87ebf7629716';

    // Trouver la table
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId }
    });

    console.log('\n=== TABLE ORIGINAL ===');
    console.log('ID:', table?.id);
    console.log('Name:', table?.name);
    console.log('Columns:');
    if (table?.columns && Array.isArray(table.columns)) {
      table.columns.forEach((col, idx) => {
        console.log(`  [${idx}]: ${col.name || col}`);
      });
    }

    // Trouver la SelectConfig
    const selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
      where: {
        table_id: tableId
      }
    });

    console.log('\n=== SELECT CONFIG ===');
    console.log('Trouvé:', !!selectConfig);
    if (selectConfig) {
      console.log('Config:', JSON.stringify(selectConfig.config, null, 2));
    }

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();

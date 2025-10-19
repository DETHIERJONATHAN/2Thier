const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function search5150() {
  try {
    const table = await prisma.treeBranchLeafNodeTable.findFirst({
      where: { name: { contains: 'GRD' } }
    });

    if (!table) {
      console.log('Table GRD non trouvee');
      return;
    }

    console.log('Table trouvee:', table.name);
    console.log('Colonnes:', table.columns);
    console.log('Nombre de rows:', table.rows.length);
    console.log('Nombre de data:', table.data.length);
    console.log('');

    // Chercher 5150 dans les rows (premiere colonne - codes GRD)
    const rowIndex = table.rows.findIndex(r => String(r) === '5150');
    
    if (rowIndex !== -1) {
      console.log('=== TROUVE 5150 ===');
      console.log('Position dans rows:', rowIndex);
      console.log('Valeur row:', table.rows[rowIndex]);
      
      // L index dans data est rowIndex - 1 (car rows[0] est le header)
      const dataIndex = rowIndex - 1;
      if (dataIndex >= 0 && dataIndex < table.data.length) {
        const dataRow = table.data[dataIndex];
        console.log('Data correspondante:', dataRow);
        console.log('');
        console.log('GRD: 5150');
        console.log('Sibelga:', dataRow[0]);
      }
    } else {
      console.log('5150 non trouve dans les rows');
      console.log('Premiers rows:', table.rows.slice(0, 20));
      console.log('...');
      console.log('Rows autour de 5150:', table.rows.filter(r => String(r).includes('51')).slice(0, 10));
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

search5150();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTableau() {
  try {
    const tableauFields = await prisma.fieldType.findMany({
      where: { name: 'tableau' }
    });
    
    console.log('=== Champs tableau trouvés ===');
    tableauFields.forEach((field, i) => {
      console.log(`${i+1}. ${field.label} (id: ${field.id})`);
      console.log('   Configuration:', JSON.stringify(field.config, null, 2));
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableau();

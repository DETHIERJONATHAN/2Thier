const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const nodes = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        name: { contains: 'Onduleur', mode: 'insensitive' }
      }
    });
    
    console.log('Nodes avec "Onduleur" dans le nom:');
    for (const node of nodes) {
      console.log(`ID: ${node.id}`);
      console.log(`Name: ${node.name}`);
      console.log(`Has lookup: ${!!node.meta?.lookup}`);
      console.log('---');
    }
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('ERREUR:', err.message);
    await prisma.$disconnect();
  }
})();

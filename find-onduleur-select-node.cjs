const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Chercher le noeud avec la table onduleur
    const nodes = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: {
          path: ['lookup', 'tableReference'],
          string_contains: '9a990cff-be6d-4e3c-811c-bfc4c01f1290'
        }
      }
    });
    
    console.log('Nodes referencant la table onduleur:');
    nodes.forEach(n => {
      console.log(`ID: ${n.id}`);
      console.log(`Name: ${n.name}`);
      if (n.meta?.lookup?.columnSourceOption?.filters) {
        console.log('Current filters:');
        console.log(JSON.stringify(n.meta.lookup.columnSourceOption.filters, null, 2));
      }
      console.log('---');
    });
    
    if (nodes.length === 0) {
      console.log('Pas de nodes trouves, cherche via grep...');
    }
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('ERREUR:', err.message);
    await prisma.$disconnect();
  }
})();

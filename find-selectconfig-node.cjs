const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Cherche SelectConfig pour table onduleur...');
    const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
      where: {
        tableReference: '9a990cff-be6d-4e3c-811c-bfc4c01f1290'
      }
    });
    
    if (selectConfigs.length > 0) {
      const config = selectConfigs[0];
      console.log('SelectConfig trouve:');
      console.log(`ID: ${config.id}`);
      console.log(`Table: ${config.tableReference}`);
      console.log(`Key: ${config.keyColumn}`);
      
      console.log('\nCherche le noeud qui utilise ce SelectConfig...');
      const nodes = await prisma.treeBranchLeafNodeTable.findMany({});
      
      for (const node of nodes) {
        if (node.meta?.lookup?.columnSourceOption?.selectConfigId === config.id || 
            node.meta?.lookup?.selectConfigId === config.id) {
          console.log(`TROUVE: ${node.id} - ${node.name}`);
          console.log('Filters actuels:');
          console.log(JSON.stringify(node.meta?.lookup?.columnSourceOption?.filters, null, 2));
        }
      }
    }
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('ERREUR:', err.message);
    console.error(err);
    await prisma.$disconnect();
  }
})();

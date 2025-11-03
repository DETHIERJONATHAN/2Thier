const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function find() {
  try {
    console.log('🔍 Cherche les nœuds avec table_instances...\n');

    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        table_instances: { not: null }
      },
      select: {
        id: true,
        label: true,
        table_activeId: true,
        table_instances: true
      },
      take: 5
    });

    if (nodes.length === 0) {
      console.log('❌ Aucun nœud avec table_instances trouvé');
      return;
    }

    nodes.forEach((node, idx) => {
      console.log(`\n[${idx + 1}] ${node.label}`);
      console.log(`    ID: ${node.id}`);
      console.log(`    table_activeId: ${node.table_activeId}`);
      
      if (node.table_instances) {
        try {
          const instances = typeof node.table_instances === 'string' 
            ? JSON.parse(node.table_instances)
            : node.table_instances;
          const keys = Object.keys(instances || {});
          console.log(`    table_instances keys: ${keys.length > 0 ? keys.slice(0, 3).join(', ') : '(empty)'}`);
          if (keys.length > 0) {
            console.log(`    First key: ${keys[0]}`);
          }
        } catch (e) {
          console.log(`    table_instances: (parse error)`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

find();

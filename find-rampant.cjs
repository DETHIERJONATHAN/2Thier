const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findRampantTemplates() {
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: 'Rampant toiture'
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true
      }
    });

    console.log('Tous les Rampant toiture:', JSON.stringify(nodes, null, 2));
    
  } finally {
    await prisma.$disconnect();
  }
}

findRampantTemplates();
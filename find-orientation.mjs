import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findOrientation() {
  console.log('🔍 Searching for orientation nodes...\n');

  try {
    // Chercher tous les nodes avec "orientation" dans le label
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: 'orientation',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        label: true,
        type: true,
        linkedTableIds: true
      }
    });

    console.log(`Found ${nodes.length} nodes with "orientation":\n`);
    
    for (const node of nodes) {
      console.log(`✓ ${node.label} (${node.type})`);
      console.log(`  ID: ${node.id}`);
      console.log(`  LinkedTableIds: ${node.linkedTableIds.length > 0 ? node.linkedTableIds.join(', ') : 'none'}`);
      console.log();
    }

    // Chercher les conditions
    const conditions = await prisma.treeBranchLeafCondition.findMany({
      where: {
        label: {
          contains: 'orientation',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        label: true,
        treeId: true
      },
      take: 10
    });

    console.log(`\nFound ${conditions.length} conditions with "orientation":\n`);
    for (const cond of conditions) {
      console.log(`✓ ${cond.label}`);
      console.log(`  ID: ${cond.id}`);
      console.log(`  TreeId: ${cond.treeId}`);
    }

  } finally {
    await prisma.$disconnect();
  }
}

findOrientation();

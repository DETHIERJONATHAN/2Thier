import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['autoCreatedDisplayNode'],
          equals: true
        }
      },
      select: {
        id: true,
        label: true,
        metadata: true,
        parentId: true
      }
    });
    console.log(`Found ${nodes.length} auto display nodes`);
    for (const node of nodes) {
      console.log(`${node.id} | ${node.label} | parent=${node.parentId}`);
    }
  } catch (error) {
    console.error('Error listing display nodes:', error);
  } finally {
    await prisma.$disconnect();
  }
};

run();

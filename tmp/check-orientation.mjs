import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  try {
    const node = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Orientation' },
      select: { id: true, label: true, parentId: true, metadata: true }
    });
    console.log('Orientation node:', node);

    if (node?.id) {
      const copyId = `${node.id}-1`;
      const copy = await prisma.treeBranchLeafNode.findUnique({
        where: { id: copyId },
        select: {
          id: true,
          label: true,
          parentId: true,
          metadata: true,
          linkedTableIds: true
        }
      });
      console.log('Orientation copy:', copy);

      const tables = await prisma.treeBranchLeafNodeTable.findMany({
        where: { nodeId: copyId },
        select: { id: true, name: true, rowCount: true }
      });
      console.log('Copy tables:', tables);
    }
  } catch (error) {
    console.error('Error querying Orientation:', error);
  } finally {
    await prisma.$disconnect();
  }
};

run();

const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
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
        parentId: true,
        linkedVariableIds: true,
        subtab: true
      }
    });
    console.log(nodes);
  } finally {
    await prisma.$disconnect();
  }
})();

const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: {
          endsWith: '-display'
        }
      },
      select: {
        id: true,
        label: true,
        metadata: true,
        linkedVariableIds: true
      }
    });
    console.log(nodes);
  } finally {
    await prisma.$disconnect();
  }
})();

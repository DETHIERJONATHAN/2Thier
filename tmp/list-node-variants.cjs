const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: {
        in: [
          'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b',
          'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-1',
          'section-dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-nouveau'
        ]
      }
    },
    select: { id: true, label: true, parentId: true }
  });
  console.log(nodes);
  await prisma.$disconnect();
})();

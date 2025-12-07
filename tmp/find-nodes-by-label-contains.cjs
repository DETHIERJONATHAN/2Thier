const { PrismaClient } = require('@prisma/client');

const needle = process.argv[2];

if (!needle) {
  console.error('Usage: node tmp/find-nodes-by-label-contains.cjs <substring>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: needle
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

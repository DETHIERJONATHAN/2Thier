const { PrismaClient } = require('@prisma/client');

const parentId = process.argv[2];

if (!parentId) {
  console.error('Usage: node tmp/list-nodes-by-parent.cjs <parentId>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { parentId },
      select: {
        id: true,
        label: true,
        metadata: true,
        subtab: true
      }
    });
    console.log(nodes);
  } finally {
    await prisma.$disconnect();
  }
})();

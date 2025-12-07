const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const ids = process.argv.slice(2);
    if (!ids.length) {
      console.error('Usage: node tmp/inspect-node.cjs <id> [id...]');
      process.exit(1);
    }
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        label: true,
        parentId: true,
        type: true,
        metadata: true
      }
    });
    console.log(JSON.stringify(nodes, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})();

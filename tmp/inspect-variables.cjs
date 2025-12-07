const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const ids = process.argv.slice(2);
    if (!ids.length) {
      console.error('Usage: node tmp/inspect-variables.cjs <id> [id...]');
      process.exit(1);
    }
    const vars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nodeId: true,
        displayName: true,
        sourceRef: true,
        sourceType: true,
        metadata: true
      }
    });
    console.log(JSON.stringify(vars, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})();

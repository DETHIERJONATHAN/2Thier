const { PrismaClient } = require('@prisma/client');

const key = process.argv[2];
if (!key) {
  console.error('Usage: node tmp/find-variables-by-exposed-key.cjs <exposedKey>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const vars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { exposedKey: key },
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    console.log(vars);
  } finally {
    await prisma.$disconnect();
  }
})();

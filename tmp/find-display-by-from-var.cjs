const { PrismaClient } = require('@prisma/client');

const fromVar = process.argv[2];

if (!fromVar) {
  console.error('Usage: node tmp/find-display-by-from-var.cjs <fromVariableId>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['fromVariableId'],
          equals: fromVar
        }
      }
    });
    console.log(nodes);
  } finally {
    await prisma.$disconnect();
  }
})();

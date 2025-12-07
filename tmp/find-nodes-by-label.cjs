const { PrismaClient } = require('@prisma/client');

const label = process.argv[2];

if (!label) {
  console.error('Usage: node tmp/find-nodes-by-label.cjs <label>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { label } });
    console.log(nodes);
  } finally {
    await prisma.$disconnect();
  }
})();

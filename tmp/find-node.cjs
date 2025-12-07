const { PrismaClient } = require('@prisma/client');

const id = process.argv[2];

if (!id) {
  console.error('Usage: node tmp/find-node.cjs <nodeId>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const node = await prisma.treeBranchLeafNode.findUnique({ where: { id } });
    console.log(node);
  } finally {
    await prisma.$disconnect();
  }
})();

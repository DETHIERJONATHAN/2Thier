const { PrismaClient } = require('@prisma/client');

const varId = process.argv[2];

if (!varId) {
  console.error('Usage: node tmp/find-original-display-for-var.cjs <variableId>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const display = await prisma.treeBranchLeafNode.findFirst({
      where: {
        metadata: {
          path: ['fromVariableId'],
          equals: varId
        }
      }
    });
    const fallback = await prisma.treeBranchLeafNode.findFirst({
      where: {
        linkedVariableIds: {
          has: varId
        },
        NOT: {
          id: await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: varId }, select: { nodeId: true } }).then(res => res?.nodeId || '')
        }
      }
    });
    console.log({ display, fallback });
  } finally {
    await prisma.$disconnect();
  }
})();

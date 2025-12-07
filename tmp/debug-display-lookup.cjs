const { PrismaClient } = require('@prisma/client');

const varId = process.argv[2];

(async () => {
  const prisma = new PrismaClient();
  try {
    const byMeta = await prisma.treeBranchLeafNode.findFirst({
      where: {
        metadata: {
          path: ['fromVariableId'],
          equals: varId
        }
      }
    });

    const candidates = await prisma.treeBranchLeafNode.findMany({
      where: {
        linkedVariableIds: {
          has: varId
        },
        NOT: {
          id: '22de1a53-2185-4669-8f6a-0544a54bfcb3'
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        parentId: true,
        metadata: true,
        createdAt: true
      }
    });

    console.log({ byMeta, candidates });
  } finally {
    await prisma.$disconnect();
  }
})();

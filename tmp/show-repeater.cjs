const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: '1f4db31a-4474-462f-af6c-f798b7e3534a' },
      select: { id: true, label: true, repeater_templateNodeIds: true, metadata: true }
    });
    console.log(JSON.stringify(node, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})();

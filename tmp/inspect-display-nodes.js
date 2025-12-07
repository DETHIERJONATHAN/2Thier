const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const labels = ['Longueur toiture', 'Orientation-Inclinaison', 'Rampant toiture', 'Orientation-Inclinaison-1'];
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { label: { in: labels } },
      select: {
        id: true,
        label: true,
        parentId: true,
        linkedVariableIds: true,
        data_activeId: true,
        hasData: true,
        metadata: true
      }
    });
    console.log(JSON.stringify(nodes, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

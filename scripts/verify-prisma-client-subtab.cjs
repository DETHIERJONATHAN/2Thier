const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const r = await prisma.treeBranchLeafNode.findFirst({ select: { id: true, subtab: true, subtabs: true } });
    console.log('Result:', JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('ERR:', e);
  } finally {
    await prisma.$disconnect();
  }
})();

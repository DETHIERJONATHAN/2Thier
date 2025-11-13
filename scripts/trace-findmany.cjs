const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });
(async() => {
  try {
    const treeId = 'cmf1mwoz10005gooked1j6orn';
    console.log('Running findMany for TreeBranchLeafNode with treeId', treeId);
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId }, take: 1 });
    console.log('Result count:', nodes.length);
  } catch (err) {
    console.error('Error running findMany:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

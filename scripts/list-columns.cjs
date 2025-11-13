const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async() => {
  try {
    const res = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='TreeBranchLeafNode'`;
    console.log(res);
  } catch (err) {
    console.error('Error listing columns:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

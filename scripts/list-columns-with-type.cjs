const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async() => {
  try {
    const res = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='TreeBranchLeafNode' ORDER BY ordinal_position`;
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error listing columns:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

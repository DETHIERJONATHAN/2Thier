const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.$queryRaw`SELECT id, "treeId", label, subtabs, subtab FROM "public"."TreeBranchLeafNode" WHERE "treeId" = 'cmf1mwoz10005gooked1j6orn' ORDER BY id LIMIT 50`;
    console.log('Subtabs values (first 50):', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error reading subtabs columns:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

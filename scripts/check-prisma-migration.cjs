const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try{
    const res = await prisma.$queryRaw`SELECT * FROM "_prisma_migrations" WHERE migration_name like '%add_treebranchleaf_subtabs_columns%';`;
    console.log('Found migrations:', res.length);
    if (res.length > 0) console.log(res[0]);
  } catch (err) {
    console.error('Error querying migrations:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

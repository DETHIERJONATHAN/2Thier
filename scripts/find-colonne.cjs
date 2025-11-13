const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async() => {
  try {
    const res = await prisma.$queryRaw`select table_name, column_name from information_schema.columns where column_name like 'colonne' or column_name like '%colonne%'`;
    console.log(res);
  } catch (err) {
    console.error('Error finding colonne:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('=== Prisma schema: Searching schema.prisma for subtabs/subtab ===');
    const fs = require('fs');
    const sp = fs.readFileSync('./prisma/schema.prisma','utf-8');
    const lines = sp.split('\n');
    lines.forEach((l,i)=>{
      if (l.includes('subtabs') || l.includes('subtab')) {
        console.log(`${i+1}: ${l}`);
      }
    });

    console.log('\n=== DB: information_schema check for columns subtabs, subtab ===');
    const res = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='TreeBranchLeafNode' AND column_name in ('subtabs','subtab') ORDER BY column_name`;
    console.log(JSON.stringify(res, null, 2));
  } catch(err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

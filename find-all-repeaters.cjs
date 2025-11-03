const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  
  const repeaters = await p.treeBranchLeafNode.findMany({
    where: {
      repeater_templateNodeIds: {
        isEmpty: false
      }
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true
    },
    take: 10
  });
  
  console.log('🔁 REPEATERS TROUVÉS:', repeaters.length, '\n');
  
  for (const rep of repeaters) {
    console.log(`📋 ${rep.label}`);
    console.log(`   Templates: ${rep.repeater_templateNodeIds.length}`);
    console.log('');
  }
  
  await p.$disconnect();
})();

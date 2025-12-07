const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Trouver le treeId du champ "Rampant toiture-1"
  const rampant1 = await p.treeBranchLeafNode.findFirst({
    where: { label: 'Rampant toiture-1' },
    select: { id: true, treeId: true, createdAt: true }
  });
  
  console.log('=== Rampant toiture-1 ===');
  console.log('  id:', rampant1?.id);
  console.log('  treeId:', rampant1?.treeId);
  console.log('  createdAt:', rampant1?.createdAt);

  if (rampant1?.treeId) {
    // Chercher les nœuds récents dans ce treeId
    const recentNodes = await p.treeBranchLeafNode.findMany({
      where: { 
        treeId: rampant1.treeId,
        createdAt: { gte: new Date('2025-12-03') }
      },
      select: { id: true, label: true, parentId: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    
    console.log(`\n=== Nœuds dans treeId ${rampant1.treeId} depuis 2025-12-03 ===`);
    for (const n of recentNodes) {
      console.log(`\n${n.label} (${n.type})`);
      console.log(`  id: ${n.id}`);
      console.log(`  parentId: ${n.parentId}`);
      console.log(`  createdAt: ${n.createdAt}`);
    }
  }

  await p.$disconnect();
})();

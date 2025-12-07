const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // La section originale "Nouveau Section" a l'ID dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b
  // Elle devrait être copiée avec un suffixe -1 car copySuffix=1
  
  const possibleCopies = await p.treeBranchLeafNode.findMany({
    where: { 
      OR: [
        { id: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-1' },
        { id: { contains: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b' } }
      ]
    },
    select: { id: true, label: true, parentId: true, metadata: true, createdAt: true }
  });
  
  console.log('=== Copies possibles de dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b ===');
  for (const c of possibleCopies) {
    console.log(`\n${c.label} (${c.id})`);
    console.log(`  parentId: ${c.parentId}`);
    console.log(`  createdAt: ${c.createdAt}`);
  }

  // Chercher les nœuds créés récemment dans ce treeId
  const recentNodes = await p.treeBranchLeafNode.findMany({
    where: { 
      treeId: '14610697-45cc-46c4-bba9-6db1d4de3be3',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    select: { id: true, label: true, parentId: true, type: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log('\n=== Nœuds créés récemment (24h) ===');
  for (const n of recentNodes) {
    console.log(`\n${n.label} (${n.type})`);
    console.log(`  id: ${n.id}`);
    console.log(`  parentId: ${n.parentId}`);
  }

  await p.$disconnect();
})();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  // Simulerons le calcul exact
  const oldNode = await prisma.treeBranchLeafNode.findFirst({
    where: { label: 'Orientation - inclinaison' },
    select: { linkedTableIds: true, id: true }
  });
  
  console.log('oldNode.linkedTableIds:', oldNode?.linkedTableIds);
  
  // Simuler tableIdMap comme il est rempli en boucle 2
  const tableIdMap = new Map();
  const suffix = 1;
  
  // Boucle 2 pour ce nœud
  const tablesOfNode = await prisma.treeBranchLeafNodeTable.findMany({
    where: { nodeId: oldNode?.id }
  });
  
  console.log('tablesOfNode:', tablesOfNode.map(t => ({ id: t.id, name: t.name })));
  
  for (const t of tablesOfNode) {
    const newTableId = `${t.id}-${suffix}`;
    tableIdMap.set(t.id, newTableId);
    console.log(`tableIdMap.set("${t.id}", "${newTableId}")`);
  }
  
  console.log('\ntableIdMap contents:');
  for (const [k, v] of tableIdMap) {
    console.log(`  "${k}" => "${v}"`);
  }
  
  // Boucle 3: calcul de newLinkedTableIds
  console.log('\nCalcul newLinkedTableIds:');
  const newLinkedTableIds = (Array.isArray(oldNode?.linkedTableIds) ? (oldNode?.linkedTableIds || []) : [])
    .map(id => {
      const mappedId = tableIdMap.get(id) || id;
      console.log(`  id="${id}" => mappedId="${mappedId}"`);
      const result = `${mappedId}-${suffix}`;
      console.log(`    => result="${result}"`);
      return result;
    })
    .filter(Boolean);
  
  console.log('\nFinal newLinkedTableIds:', newLinkedTableIds);
  
  await prisma.$disconnect();
})();

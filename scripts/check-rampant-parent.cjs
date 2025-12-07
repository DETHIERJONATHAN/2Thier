const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Original Rampant toiture
  const original = await p.treeBranchLeafNode.findUnique({
    where: { id: '9c9f42b2-e0df-4726-8a81-997c0dee71bc' },
    select: { id: true, label: true, parentId: true }
  });
  console.log('=== Original Rampant toiture ===');
  console.log('  ID:', original?.id);
  console.log('  Label:', original?.label);
  console.log('  parentId:', original?.parentId);

  // Copies de Rampant toiture
  const copies = await p.treeBranchLeafNode.findMany({
    where: { 
      id: { startsWith: '9c9f42b2-e0df-4726-8a81-997c0dee71bc-' }
    },
    select: { id: true, label: true, parentId: true, metadata: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('\n=== Copies de Rampant toiture ===');
  for (const c of copies) {
    console.log('\n  ID:', c.id);
    console.log('  Label:', c.label);
    console.log('  parentId:', c.parentId);
    
    // Le parent existe-t-il?
    const parentExists = await p.treeBranchLeafNode.findUnique({
      where: { id: c.parentId },
      select: { id: true, label: true }
    });
    console.log('  Parent existe?', parentExists ? `OUI: "${parentExists.label}"` : 'NON!');
    
    // Le parent ORIGINAL 
    if (original?.parentId) {
      const originalParent = await p.treeBranchLeafNode.findUnique({
        where: { id: original.parentId },
        select: { id: true, label: true }
      });
      console.log('  Parent original:', originalParent?.label);
      
      // Le parent devrait être suffixé si c'est une copie repeater
      const suffix = c.id.split('-').pop();
      const expectedParentId = `${original.parentId}-${suffix}`;
      const expectedParent = await p.treeBranchLeafNode.findUnique({
        where: { id: expectedParentId },
        select: { id: true, label: true }
      });
      console.log('  Parent attendu (suffixé):', expectedParentId);
      console.log('  Parent attendu existe?', expectedParent ? `OUI: "${expectedParent.label}"` : 'NON');
    }
  }

  await p.$disconnect();
})();

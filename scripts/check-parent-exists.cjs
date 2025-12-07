const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Vérifier si le parent avec suffixe -1 existe
  const parentWithSuffix = await p.treeBranchLeafNode.findUnique({
    where: { id: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-1' },
    select: { id: true, label: true }
  });
  
  console.log('=== Parent dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-1 ===');
  console.log(parentWithSuffix ? `EXISTE: ${parentWithSuffix.label}` : 'N\'EXISTE PAS!');

  // Vérifier le parent actuel de Rampant toiture-1
  const rampant1 = await p.treeBranchLeafNode.findFirst({
    where: { label: 'Rampant toiture-1' },
    select: { id: true, parentId: true }
  });
  
  console.log('\n=== Rampant toiture-1 ===');
  console.log('  parentId actuel:', rampant1?.parentId);

  // Vérifier si ce parentId existe
  if (rampant1?.parentId) {
    const currentParent = await p.treeBranchLeafNode.findUnique({
      where: { id: rampant1.parentId },
      select: { id: true, label: true }
    });
    console.log('  parent existe?', currentParent ? `OUI: ${currentParent.label}` : 'NON!');
  }

  await p.$disconnect();
})();

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Chercher toutes les sections "Nouveau Section" ou copies
  const sections = await p.treeBranchLeafNode.findMany({
    where: { 
      OR: [
        { label: { startsWith: 'Nouveau Section' } },
        { id: { startsWith: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b' } },
        { id: { startsWith: 'section-dd3a4c6b' } }
      ]
    },
    select: { id: true, label: true, parentId: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('=== Toutes les sections "Nouveau Section" ou copies ===');
  for (const s of sections) {
    console.log(`\n${s.label} (${s.id})`);
    console.log(`  parentId: ${s.parentId}`);
    console.log(`  copySuffix: ${s.metadata?.copySuffix || 'N/A'}`);
    console.log(`  createdAt: ${s.createdAt}`);
  }

  // Chercher toutes les sections qui ont le suffixe 1764760490184
  const suffixedSections = await p.treeBranchLeafNode.findMany({
    where: { 
      id: { endsWith: '-1764760490184' }
    },
    select: { id: true, label: true, parentId: true },
    take: 10
  });
  
  console.log('\n=== Sections avec suffixe -1764760490184 ===');
  if (suffixedSections.length === 0) {
    console.log('  AUCUNE TROUVÉE!');
  } else {
    for (const s of suffixedSections) {
      console.log(`  ${s.label} (${s.id})`);
    }
  }

  await p.$disconnect();
})();

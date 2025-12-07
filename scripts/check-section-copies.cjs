const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Chercher toutes les copies de la section "Nouveau Section" 
  const sectionCopies = await p.treeBranchLeafNode.findMany({
    where: { 
      id: { startsWith: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-' }
    },
    select: { id: true, label: true, parentId: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('=== Copies de la section (parentId original: dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b) ===');
  sectionCopies.forEach(s => {
    console.log('  -', s.id, ':', s.label);
  });

  // Chercher les champs du repeater copiés (suffixe -1 dans la copie récente)
  const recentCopies = await p.treeBranchLeafNode.findMany({
    where: {
      metadata: { path: ['repeatScopeId'], string_contains: 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c' }
    },
    select: { id: true, label: true, parentId: true, metadata: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('\n=== Champs du repeater copiés récemment ===');
  for (const c of recentCopies) {
    const meta = c.metadata;
    console.log(`\n  ${c.label} (${c.id})`);
    console.log(`    parentId: ${c.parentId}`);
    console.log(`    repeatScopeId: ${meta?.repeatScopeId}`);
    console.log(`    copySuffix: ${meta?.copySuffix}`);
  }

  await p.$disconnect();
})();

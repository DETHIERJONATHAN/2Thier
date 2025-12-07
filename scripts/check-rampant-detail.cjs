const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Chercher "Rampant toiture" et sa copie
  const rampants = await p.treeBranchLeafNode.findMany({
    where: { 
      label: { startsWith: 'Rampant toiture' }
    },
    select: { id: true, label: true, parentId: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('=== Tous les "Rampant toiture" ===');
  for (const r of rampants) {
    console.log(`\n${r.label} (${r.id})`);
    console.log(`  parentId: ${r.parentId}`);
    console.log(`  fromVariableId: ${r.metadata?.fromVariableId || 'N/A'}`);
    console.log(`  repeatScopeId: ${r.metadata?.repeatScopeId || 'N/A'}`);
    console.log(`  copySuffix: ${r.metadata?.copySuffix || 'N/A'}`);
    console.log(`  createdAt: ${r.createdAt}`);
  }

  // Chercher la section correcte - celle qui contient les champs copiés
  const correctSection = await p.treeBranchLeafNode.findUnique({
    where: { id: 'node_1757366229474_w8xt9wtqz' },
    select: { id: true, label: true, parentId: true, metadata: true }
  });
  
  console.log('\n=== Section correcte (où les champs -1 sont) ===');
  if (correctSection) {
    console.log(`  ${correctSection.label} (${correctSection.id})`);
    console.log(`  parentId: ${correctSection.parentId}`);
    console.log(`  metadata: ${JSON.stringify(correctSection.metadata)}`);
  } else {
    console.log('  PAS TROUVÉ!');
  }

  // Chercher la section originale
  const originalSection = await p.treeBranchLeafNode.findUnique({
    where: { id: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b' },
    select: { id: true, label: true, parentId: true }
  });
  
  console.log('\n=== Section originale ===');
  if (originalSection) {
    console.log(`  ${originalSection.label} (${originalSection.id})`);
    console.log(`  parentId: ${originalSection.parentId}`);
  }

  await p.$disconnect();
})();

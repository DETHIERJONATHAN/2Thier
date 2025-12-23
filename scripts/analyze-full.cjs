const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  
  // Récupérer TOUTES les soumissions
  console.log('=== TOUTES LES SOUMISSIONS ===');
  const submissions = await prisma.treeBranchLeafSubmission.findMany({
    where: { treeId },
    orderBy: { createdAt: 'desc' },
    include: { Lead: { select: { firstName: true, lastName: true } } }
  });
  
  console.log('Total soumissions:', submissions.length);
  
  for (const sub of submissions) {
    console.log(`\n--- Soumission ${sub.id} ---`);
    console.log(`Lead: ${sub.Lead?.firstName} ${sub.Lead?.lastName}`);
    console.log(`Date: ${sub.createdAt}`);
    
    // Données de soumission
    const subData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: sub.id }
    });
    
    const nonNullData = subData.filter(d => d.value !== null && d.value !== 'null');
    console.log(`Données: ${subData.length} total, ${nonNullData.length} non-null`);
    
    if (nonNullData.length > 0) {
      console.log('Valeurs non-null:');
      nonNullData.forEach(d => {
        console.log(`  ${d.nodeId}: ${d.value}`);
      });
    }
  }
  
  // Regarder aussi la structure des nodes
  console.log('\n\n=== STRUCTURE ARBRE ===');
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId },
    orderBy: { order: 'asc' }
  });
  
  // Mapper par parent pour voir la hiérarchie
  const byParent = {};
  nodes.forEach(n => {
    const p = n.parentId || 'ROOT';
    if (!byParent[p]) byParent[p] = [];
    byParent[p].push(n);
  });
  
  // Afficher l'arbre
  function printTree(parentId, indent = '') {
    const children = byParent[parentId] || [];
    children.forEach(c => {
      console.log(`${indent}${c.type}: ${c.label} (${c.id.substring(0, 8)}...)`);
      if (c.type === 'leaf_repeater' || c.type === 'section' || c.type === 'branch') {
        printTree(c.id, indent + '  ');
      }
    });
  }
  
  console.log('\nHiérarchie:');
  printTree('ROOT');
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🔍 RECHERCHE DES CHAMPS COMMENÇANT PAR "M"\n');

  // Chercher aussi les champs avec suffixe (copies)
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { startsWith: 'M ', mode: 'insensitive' } },
        { id: { contains: '-1' } },  // Copies avec suffixe -1
        { id: { contains: '-2' } }   // Copies avec suffixe -2
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      isSharedReference: true,
      sharedReferenceId: true,
      metadata: true
    },
    orderBy: { label: 'asc' },
    take: 50
  });

  console.log(`Trouvé ${allNodes.length} nœud(s):\n`);
  
  for (const node of allNodes) {
    const isSuffixed = node.id.match(/^(.+)-(\d+)$/);
    const marker = isSuffixed ? '🔶 COPIE' : '🔷 ORIGINAL';
    
    console.log(`${marker} ${node.label} (${node.id})`);
    console.log(`  isSharedReference: ${node.isSharedReference}`);
    console.log(`  sharedReferenceId: ${node.sharedReferenceId}`);
    if (isSuffixed) {
      console.log(`  Original ID: ${isSuffixed[1]}`);
      console.log(`  Suffixe: ${isSuffixed[2]}`);
    }
    console.log();
  }

  await prisma.$disconnect();
})();

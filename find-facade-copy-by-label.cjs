#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🔍 RECHERCHE DE "M FAÇADE-1" PAR LABEL\n');

  // Chercher par label exact ou contenant "-1"
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: 'M façade-1' },
        { label: { contains: 'façade-1', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true,
      isSharedReference: true,
      sharedReferenceId: true,
      linkedVariableIds: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Trouvé ${copies.length} résultat(s):\n`);

  for (const copy of copies) {
    console.log(`📋 ${copy.label} (${copy.id})`);
    console.log(`   Créé: ${copy.createdAt}`);
    console.log(`   Type: ${copy.type}`);
    console.log(`   ParentId: ${copy.parentId}`);
    console.log(`   isSharedReference: ${copy.isSharedReference}`);
    console.log(`   sharedReferenceId: ${copy.sharedReferenceId}`);
    console.log(`   linkedVariableIds: ${JSON.stringify(copy.linkedVariableIds)}`);
    console.log(`   metadata.sourceTemplateId: ${copy.metadata?.sourceTemplateId || 'N/A'}`);
    console.log(`   metadata.copiedFromNodeId: ${copy.metadata?.copiedFromNodeId || 'N/A'}`);
    
    // Parent
    if (copy.parentId) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: copy.parentId },
        select: { id: true, label: true, metadata: true }
      });
      console.log(`   Parent: ${parent?.label} (${parent?.id})`);
      console.log(`   Parent sourceTemplateId: ${parent?.metadata?.sourceTemplateId || 'N/A'}`);
    }
    console.log();
  }

  // Chercher aussi Orientation-inclinaison-1
  console.log('\n🔍 RECHERCHE DE "ORIENTATION-INCLINAISON-1":\n');
  const oriCopies = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'orientation', mode: 'insensitive' },
      label: { contains: 'inclinaison', mode: 'insensitive' }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  for (const ori of oriCopies) {
    console.log(`📋 ${ori.label} (${ori.id})`);
    console.log(`   sourceTemplateId: ${ori.metadata?.sourceTemplateId || 'N/A'}`);
    console.log(`   Créé: ${ori.createdAt}`);
    console.log();
  }

  await prisma.$disconnect();
})();

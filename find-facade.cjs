#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🔍 RECHERCHE DE TOUS LES CHAMPS "FACADE"\n');

  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'facade', mode: 'insensitive' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      fieldType: true,
      parentId: true,
      isSharedReference: true,
      sharedReferenceId: true,
      metadata: true
    },
    orderBy: { label: 'asc' }
  });

  console.log(`Trouvé ${nodes.length} nœud(s) avec "facade":\n`);
  
  for (const node of nodes) {
    console.log(`📋 ${node.label} (${node.id})`);
    console.log(`   Type: ${node.type}, FieldType: ${node.fieldType}`);
    console.log(`   isSharedReference: ${node.isSharedReference}`);
    console.log(`   sharedReferenceId: ${node.sharedReferenceId}`);
    console.log(`   sourceTemplateId: ${node.metadata?.sourceTemplateId || 'N/A'}`);
    console.log(`   parentId: ${node.parentId}`);
    
    // Si c'est une copie suffixée, identifier l'original
    const match = node.id.match(/^(.+)-(\d+)$/);
    if (match) {
      console.log(`   ✅ C'EST UNE COPIE SUFFIXÉE !`);
      console.log(`   Original ID: ${match[1]}`);
      console.log(`   Suffixe: ${match[2]}`);
    }
    console.log();
  }

  await prisma.$disconnect();
})();

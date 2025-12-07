import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRepeatConfig() {
  console.log('🔍 RECHERCHE DE LA CONFIGURATION DU REPEAT\n');
  console.log('='.repeat(80));

  // Chercher le nœud qui a le repeat configuré
  const nodesWithRepeat = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        {
          metadata: {
            path: ['hasRepeater'],
            equals: true
          }
        },
        {
          metadata: {
            path: ['repeater'],
            not: { equals: null }
          }
        }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true,
      metadata: true
    }
  });

  console.log(`\nNœuds avec repeat configuré: ${nodesWithRepeat.length}\n`);

  for (const node of nodesWithRepeat) {
    console.log(`📊 ${node.label} (${node.type}):`);
    console.log(`  ID: ${node.id}`);
    console.log(`  ParentId: ${node.parentId}`);
    
    const repeater = node.metadata?.repeater;
    if (repeater && typeof repeater === 'object') {
      console.log(`  Repeater:`);
      console.log(`    sourceNodeId: ${repeater.sourceNodeId || 'N/A'}`);
      console.log(`    targetParentId: ${repeater.targetParentId || 'N/A'}`);
      console.log(`    behavior: ${repeater.behavior || 'N/A'}`);
    }
    
    console.log();
  }

  console.log('='.repeat(80));
  console.log('\n🎯 ANALYSE:\n');

  // Vérifier si le parent dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b a un repeat
  const targetSection = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b' },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true,
      metadata: true
    }
  });

  if (targetSection) {
    console.log(`Section cible: ${targetSection.label}`);
    console.log(`  ID: ${targetSection.id}`);
    console.log(`  Type: ${targetSection.type}`);
    console.log(`  A un repeat: ${targetSection.metadata?.hasRepeater ? 'OUI' : 'NON'}`);
    
    if (targetSection.metadata?.repeater) {
      const rep = targetSection.metadata.repeater;
      console.log(`  Repeater sourceNodeId: ${rep.sourceNodeId}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 SOLUTION:\n');
  
  console.log('Le repeat doit copier la SECTION elle-même, pas seulement ses enfants.');
  console.log('Pour cela, le sourceNodeId du repeat doit être la section:');
  console.log('  dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b');
  console.log('\nSi le repeat copie un enfant de la section, alors la section');
  console.log('sera traitée comme "parent externe" et préfixée avec "section-".');
  console.log('\n✅ CORRECTIF: Configurer le repeat pour copier la section entière');
  console.log('   au lieu de copier uniquement ses enfants.');
}

findRepeatConfig()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

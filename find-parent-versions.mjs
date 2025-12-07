import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllParents() {
  console.log('🔍 RECHERCHE DE TOUS LES PARENTS POSSIBLES\n');

  // Le parent source original
  const sourceParentId = 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b';
  
  console.log(`Parent source: ${sourceParentId}\n`);

  // Chercher toutes les versions de ce parent (avec suffixes)
  const allVersions = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { id: sourceParentId },
        { id: { startsWith: `${sourceParentId}-` } }
      ]
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true
    }
  });

  console.log(`Trouvé ${allVersions.length} version(s):\n`);
  allVersions.forEach(v => {
    const copySuffix = v.metadata && typeof v.metadata === 'object' && 'copySuffix' in v.metadata 
      ? v.metadata.copySuffix 
      : 'AUCUN';
    console.log(`  - ${v.id}`);
    console.log(`    Label: ${v.label}`);
    console.log(`    Parent: ${v.parentId}`);
    console.log(`    CopySuffix: ${copySuffix}\n`);
  });

  // Maintenant vérifier où est attaché le nœud d'affichage
  const displayNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '9c9f42b2-e0df-4726-8a81-997c0dee71bc-1' },
    select: { 
      id: true, 
      label: true, 
      parentId: true,
      metadata: true
    }
  });

  if (displayNode) {
    console.log('='.repeat(80));
    console.log('\n📊 NŒUD D\'AFFICHAGE:\n');
    console.log(`ID: ${displayNode.id}`);
    console.log(`Label: ${displayNode.label}`);
    console.log(`Parent actuel: ${displayNode.parentId}`);
    console.log(`Metadata:`, JSON.stringify(displayNode.metadata, null, 2));

    // Vérifier si le parent actuel existe
    const currentParent = await prisma.treeBranchLeafNode.findUnique({
      where: { id: displayNode.parentId },
      select: { id: true, label: true }
    });

    console.log(`\nParent actuel existe: ${currentParent ? '✅ OUI' : '❌ NON'}`);
    if (currentParent) {
      console.log(`  → ${currentParent.label} (${currentParent.id})`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 DIAGNOSTIC:\n');

  if (allVersions.length === 0) {
    console.log('❌ AUCUNE version du parent trouvée (ni source ni copie)');
  } else if (allVersions.length === 1 && allVersions[0].id === sourceParentId) {
    console.log('❌ Seul le parent SOURCE existe, aucune copie avec suffixe');
    console.log('   → Le parent n\'a JAMAIS été dupliqué par le repeat');
  } else {
    console.log('✅ Des copies du parent existent avec suffixes');
    const copiesWithSuffix = allVersions.filter(v => v.id !== sourceParentId);
    console.log(`   → ${copiesWithSuffix.length} copie(s) trouvée(s)`);
    copiesWithSuffix.forEach(c => console.log(`      • ${c.id}`));
  }

  console.log('\n' + '='.repeat(80));
}

findAllParents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

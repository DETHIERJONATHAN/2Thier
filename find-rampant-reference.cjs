const { PrismaClient } = require('@prisma/client');

async function findCorrectReference() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Recherche de la référence shared-ref-1764094032592-fj0uj...\n');
  
  // 1. Chercher la référence exacte
  const exactRef = await prisma.treeBranchLeafNode.findFirst({
    where: {
      sharedReferenceId: 'shared-ref-1764094032592-fj0uj'
    },
    select: {
      id: true,
      label: true,
      sharedReferenceId: true,
      calculatedValue: true,
      type: true
    }
  });
  
  if (exactRef) {
    console.log('✅ Référence exacte trouvée:');
    console.log(`  - ID: ${exactRef.id}`);
    console.log(`  - Label: ${exactRef.label}`);
    console.log(`  - SharedRef: ${exactRef.sharedReferenceId}`);
    console.log(`  - Valeur: ${exactRef.calculatedValue || 'VIDE'}`);
    console.log(`  - Type: ${exactRef.type}`);
  } else {
    console.log('❌ Référence exacte non trouvée');
  }
  
  // 2. Chercher toutes les références qui commencent par shared-ref-1764
  const similarRefs = await prisma.treeBranchLeafNode.findMany({
    where: {
      sharedReferenceId: { startsWith: 'shared-ref-1764' }
    },
    select: {
      id: true,
      label: true,
      sharedReferenceId: true,
      calculatedValue: true,
      type: true
    },
    orderBy: { sharedReferenceId: 'asc' }
  });
  
  console.log(`\n📋 ${similarRefs.length} références similaires trouvées:`);
  similarRefs.forEach(node => {
    console.log(`  - ${node.sharedReferenceId}`);
    console.log(`    Label: ${node.label}`);
    console.log(`    ID: ${node.id}`);
    console.log(`    Valeur: ${node.calculatedValue || 'VIDE'}`);
    console.log(`    Type: ${node.type}`);
    console.log('');
  });
  
  // 3. Maintenant chercher le nœud de condition qui pose problème
  console.log('\n🔍 Recherche du nœud "Rampant toiture"...');
  
  const rampantNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'Rampant' } },
        { label: { contains: 'rampant' } },
        { calculatedValue: { contains: 'condition' } }
      ]
    },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      type: true,
      sharedReferenceId: true
    },
    take: 10
  });
  
  console.log(`📋 ${rampantNodes.length} nœuds "Rampant" trouvés:`);
  rampantNodes.forEach(node => {
    console.log(`  - ${node.label} (${node.id})`);
    console.log(`    Valeur: ${node.calculatedValue || 'VIDE'}`);
    console.log(`    Type: ${node.type}`);
    console.log(`    SharedRef: ${node.sharedReferenceId || 'AUCUNE'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

findCorrectReference().catch(console.error);
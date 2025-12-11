import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function compareNodes() {
  console.log('🔍 COMPARAISON DES NOEUDS QUI MARCHENT VS CELUI QUI NE MARCHE PAS\n');

  // Rampant toiture (MARCHE)
  const rampant = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58' },
    select: {
      id: true,
      field_label: true,
      fieldType: true,
      hasData: true,
      data_activeId: true,
      linkedTableIds: true,
      linkedVariableIds: true
    }
  });

  console.log('✅ RAMPANT TOITURE (MARCHE):');
  console.log(JSON.stringify(rampant, null, 2));

  const rampantVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { nodeId: rampant.id }
  });
  console.log('   Variable:', rampantVar ? `${rampantVar.exposedKey} (nodeId: ${rampantVar.nodeId})` : 'AUCUNE');

  // Longueur toiture (MARCHE)
  const longueur = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'aaf69b1e-75d2-4a55-8bf2-231ca96e459a' },
    select: {
      id: true,
      field_label: true,
      fieldType: true,
      hasData: true,
      data_activeId: true,
      linkedTableIds: true,
      linkedVariableIds: true
    }
  });

  console.log('\n✅ LONGUEUR TOITURE (MARCHE):');
  console.log(JSON.stringify(longueur, null, 2));

  const longueurVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { nodeId: longueur.id }
  });
  console.log('   Variable:', longueurVar ? `${longueurVar.exposedKey} (nodeId: ${longueurVar.nodeId})` : 'AUCUNE');

  // Orientation (NE MARCHE PAS)
  const orientation = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '440d696a-34cf-418f-8f56-d61015f66d91' },
    select: {
      id: true,
      field_label: true,
      fieldType: true,
      hasData: true,
      data_activeId: true,
      linkedTableIds: true,
      linkedVariableIds: true
    }
  });

  console.log('\n❌ ORIENTATION - INCLINAISON (NE MARCHE PAS):');
  console.log(JSON.stringify(orientation, null, 2));

  const orientationVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { nodeId: orientation.id }
  });
  console.log('   Variable:', orientationVar ? `${orientationVar.exposedKey} (nodeId: ${orientationVar.nodeId})` : 'AUCUNE');

  console.log('\n\n📊 DIFFÉRENCES:');
  console.log(`Rampant linkedTableIds: ${JSON.stringify(rampant.linkedTableIds)}`);
  console.log(`Longueur linkedTableIds: ${JSON.stringify(longueur.linkedTableIds)}`);
  console.log(`Orientation linkedTableIds: ${JSON.stringify(orientation.linkedTableIds)}`);
  
  console.log(`\nRampant data_activeId: ${rampant.data_activeId}`);
  console.log(`Longueur data_activeId: ${longueur.data_activeId}`);
  console.log(`Orientation data_activeId: ${orientation.data_activeId}`);

  await prisma.$disconnect();
}

compareNodes().catch(console.error);

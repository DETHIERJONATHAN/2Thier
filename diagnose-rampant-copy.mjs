import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 DIAGNOSTIC: Pourquoi "Rampant toiture-1" ne se crée pas?\n');

  // 1. Chercher le template original
  const rampantTemplate = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58' },
    select: {
      id: true,
      label: true,
      type: true,
      linkedVariableIds: true,
      metadata: true,
      parentId: true
    }
  });

  console.log('📌 TEMPLATE "Rampant toiture":');
  console.log(`   ID: ${rampantTemplate?.id}`);
  console.log(`   Label: ${rampantTemplate?.label}`);
  console.log(`   Type: ${rampantTemplate?.type}`);
  console.log(`   linkedVariableIds: ${JSON.stringify(rampantTemplate?.linkedVariableIds || [])}`);
  console.log(`   Parent: ${rampantTemplate?.parentId}`);
  console.log(`   Metadata: ${JSON.stringify(rampantTemplate?.metadata)}\n`);

  // 2. Vérifier si la copie -1 existe
  const rampantCopy = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: { startsWith: 'Rampant toiture-1' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      linkedVariableIds: true,
      metadata: true,
      parentId: true
    }
  });

  if (rampantCopy) {
    console.log('✅ COPIE "Rampant toiture-1" EXISTE:');
    console.log(`   ID: ${rampantCopy.id}`);
    console.log(`   Label: ${rampantCopy.label}`);
    console.log(`   Type: ${rampantCopy.type}`);
    console.log(`   linkedVariableIds: ${JSON.stringify(rampantCopy.linkedVariableIds || [])}`);
    console.log(`   Parent: ${rampantCopy.parentId}`);
    console.log(`   Metadata: ${JSON.stringify(rampantCopy.metadata)}\n`);
  } else {
    console.log('❌ COPIE "Rampant toiture-1" N\'EXISTE PAS!\n');
  }

  // 3. Si le template a linkedVariableIds, vérifier les variables
  if (rampantTemplate?.linkedVariableIds && rampantTemplate.linkedVariableIds.length > 0) {
    console.log('🔗 VÉRIFICATION VARIABLES LIÉES:');
    for (const varId of rampantTemplate.linkedVariableIds) {
      const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: varId },
        select: {
          id: true,
          displayName: true,
          sourceType: true,
          sourceRef: true,
          nodeId: true
        }
      });

      if (variable) {
        console.log(`   ✅ Variable ${varId}:`);
        console.log(`       displayName: ${variable.displayName}`);
        console.log(`       sourceType: ${variable.sourceType}`);
        console.log(`       nodeId: ${variable.nodeId}`);
      } else {
        console.log(`   ❌ Variable ${varId}: NOT FOUND`);
      }
    }
    console.log();
  }

  // 4. Chercher les nœuds affichage (Panneau) qui devraient être créés
  console.log('🎨 NŒUDS AFFICHAGE (Panneau) EXISTANTS:');
  const displayNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      type: 'leaf_display',
      label: { contains: 'Rampant' }
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true
    }
  });

  if (displayNodes.length > 0) {
    displayNodes.forEach((n, i) => {
      console.log(`   [${i}] ${n.label} (parent: ${n.parentId})`);
    });
  } else {
    console.log('   ❌ AUCUN nœud Panneau trouvé pour Rampant!');
  }
  console.log();

  // 5. Chercher les variables copiées pour -1
  if (rampantCopy) {
    console.log('🔗 VARIABLES COPIÉES POUR "Rampant toiture-1":');
    const copiedVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        sourceRef: { contains: rampantCopy.id }
      },
      select: {
        id: true,
        displayName: true,
        sourceRef: true
      }
    });

    if (copiedVars.length > 0) {
      copiedVars.forEach((v, i) => {
        console.log(`   [${i}] ${v.displayName} (sourceRef: ${v.sourceRef})`);
      });
    } else {
      console.log('   ❌ AUCUNE variable copiée!');
    }
  }

  await prisma.$disconnect();
}

diagnose().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

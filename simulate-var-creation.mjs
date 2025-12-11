import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateCopyVariable() {
  console.log('🧪 SIMULATION DE COPIE VARIABLE AVEC LES VRAIS CHAMPS\n');

  const originalVarId = 'b279d630-b709-40a7-bfd9-3eb7760c3909';
  const newNodeId = '440d696a-34cf-418f-8f56-d61015f66d91-1';
  const suffix = '-1';

  // 1. Récupérer la variable originale
  const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { id: originalVarId }
  });

  if (!originalVar) {
    console.log('❌ Variable originale non trouvée');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Variable originale trouvée:');
  console.log(JSON.stringify(originalVar, null, 2));

  const newVarId = `${originalVar.id}${suffix}`;
  const newExposedKey = `${originalVar.exposedKey}${suffix}`;

  console.log(`\n🔧 Tentative de création:`);
  console.log(`   newVarId: ${newVarId}`);
  console.log(`   newExposedKey: ${newExposedKey}`);
  console.log(`   nodeId: ${newNodeId}`);

  // 2. Essayer de créer EXACTEMENT comme variable-copy-engine.ts le fait
  try {
    // Supprimer si existe
    const existing = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: newVarId }
    });
    if (existing) {
      await prisma.treeBranchLeafNodeVariable.delete({ where: { id: newVarId } });
      console.log('🗑️  Variable existante supprimée');
    }

    const newVariable = await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: newVarId,
        nodeId: newNodeId,
        exposedKey: newExposedKey,
        displayName: originalVar.displayName + '-1',
        displayFormat: originalVar.displayFormat,
        unit: originalVar.unit,
        precision: originalVar.precision,
        visibleToUser: originalVar.visibleToUser,
        isReadonly: originalVar.isReadonly,
        defaultValue: originalVar.defaultValue,
        fixedValue: originalVar.fixedValue,
        selectedNodeId: originalVar.selectedNodeId,
        sourceRef: originalVar.sourceRef,
        sourceType: originalVar.sourceType,
        metadata: originalVar.metadata || {},
        linkedFormulaIds: [],
        linkedConditionIds: [],
        linkedTableIds: Array.isArray(originalVar.linkedTableIds) 
          ? originalVar.linkedTableIds.map(id => `${id}${suffix}`)
          : [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('\n✅ SUCCÈS! Variable créée:');
    console.log(`   ID: ${newVariable.id}`);
    console.log(`   nodeId: ${newVariable.nodeId}`);
    console.log(`   exposedKey: ${newVariable.exposedKey}`);
    console.log(`   displayName: ${newVariable.displayName}`);

  } catch (error) {
    console.error('\n❌ ERREUR PRISMA:');
    console.error(`   Message: ${error.message}`);
    if (error.meta) {
      console.error('   Meta:', JSON.stringify(error.meta, null, 2));
    }
  }

  await prisma.$disconnect();
}

simulateCopyVariable().catch(console.error);

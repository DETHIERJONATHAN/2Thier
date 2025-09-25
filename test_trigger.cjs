const { PrismaClient } = require('@prisma/client');

async function testNewDataInsertion() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Test d\'insertion de nouvelles données...\n');

    // 1. Trouver un nodeId qui a une variable
    const nodeWithVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
      select: {
        nodeId: true,
        exposedKey: true,
        displayName: true,
        unit: true
      }
    });

    if (!nodeWithVariable) {
      console.log('❌ Aucune variable trouvée pour tester');
      return;
    }

    console.log('📝 Variable sélectionnée pour le test:');
    console.log(`   - nodeId: ${nodeWithVariable.nodeId}`);
    console.log(`   - exposedKey: "${nodeWithVariable.exposedKey}"`);
    console.log(`   - displayName: "${nodeWithVariable.displayName}"`);

    // 2. Insérer une nouvelle soumission avec ce nodeId
    const newSubmission = await prisma.treeBranchLeafSubmissionData.create({
      data: {
        id: `test-${Date.now()}`,
        nodeId: nodeWithVariable.nodeId,
        userId: 'test-user',
        treeId: 'test-tree',
        submittedValue: 'test-value-auto-trigger',
        submittedAt: new Date(),
        // On laisse les champs auto-remplis vides pour tester le trigger
      }
    });

    console.log(`\n✅ Nouvelle soumission créée: ${newSubmission.id}`);

    // 3. Vérifier immédiatement si les champs ont été auto-remplis
    await new Promise(resolve => setTimeout(resolve, 100)); // Petit délai pour le trigger

    const updatedSubmission = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id: newSubmission.id },
      select: {
        id: true,
        nodeId: true,
        fieldLabel: true,
        variableKey: true,
        variableDisplayName: true,
        variableUnit: true,
        isVariable: true,
        operationSource: true
      }
    });

    console.log('\n📊 Résultat après trigger:');
    console.log(`   - fieldLabel: "${updatedSubmission.fieldLabel}"`);
    console.log(`   - variableKey: "${updatedSubmission.variableKey}"`);
    console.log(`   - variableDisplayName: "${updatedSubmission.variableDisplayName}"`);
    console.log(`   - variableUnit: "${updatedSubmission.variableUnit}"`);
    console.log(`   - isVariable: ${updatedSubmission.isVariable}`);
    console.log(`   - operationSource: "${updatedSubmission.operationSource}"`);

    // 4. Nettoyer après le test
    await prisma.treeBranchLeafSubmissionData.delete({
      where: { id: newSubmission.id }
    });
    console.log('\n🗑️  Données de test supprimées');

    // 5. Conclusions
    if (updatedSubmission.fieldLabel && updatedSubmission.variableKey) {
      console.log('\n🎉 SUCCESS: Le trigger fonctionne correctement !');
    } else if (updatedSubmission.fieldLabel && !updatedSubmission.variableKey) {
      console.log('\n⚠️  PARTIAL: fieldLabel fonctionne, mais pas les variables');
    } else {
      console.log('\n❌ FAILED: Le trigger ne fonctionne pas');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewDataInsertion();
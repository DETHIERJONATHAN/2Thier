const { PrismaClient } = require('@prisma/client');

async function testTriggerWithExistingSubmission() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Test du trigger avec une submission existante...\n');

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
      console.log('❌ Aucune variable trouvée');
      return;
    }

    console.log('📝 Node avec variable sélectionné:');
    console.log(`   - nodeId: ${nodeWithVariable.nodeId}`);
    console.log(`   - exposedKey: "${nodeWithVariable.exposedKey}"`);

    // 2. Vérifier si ce node existe
    const nodeExists = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeWithVariable.nodeId },
      select: { id: true, label: true }
    });

    if (!nodeExists) {
      console.log('❌ Node n\'existe pas dans TreeBranchLeafNode');
      return;
    }

    console.log(`   - label: "${nodeExists.label}"`);

    // 3. Trouver une submission existante pour utiliser son submissionId
    const existingSubmission = await prisma.treeBranchLeafSubmission.findFirst({
      select: { id: true }
    });

    if (!existingSubmission) {
      console.log('❌ Aucune submission existante trouvée');
      return;
    }

    // 4. Insérer une nouvelle ligne dans TreeBranchLeafSubmissionData
    const testId = `test-trigger-${Date.now()}`;
    const newData = await prisma.treeBranchLeafSubmissionData.create({
      data: {
        id: testId,
        submissionId: existingSubmission.id,
        nodeId: nodeWithVariable.nodeId,
        value: 'test-trigger-value'
        // Les autres champs doivent être auto-remplis par le trigger
      }
    });

    console.log(`\n✅ Nouvelle data créée: ${newData.id}`);

    // 5. Vérifier si le trigger a fonctionné
    await new Promise(resolve => setTimeout(resolve, 200)); // Délai pour trigger

    const result = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id: testId },
      select: {
        id: true,
        fieldLabel: true,
        variableKey: true,
        variableDisplayName: true,
        variableUnit: true,
        isVariable: true,
        operationSource: true
      }
    });

    console.log('\n📊 Résultat après trigger:');
    console.log(`   - fieldLabel: "${result.fieldLabel}"`);
    console.log(`   - variableKey: "${result.variableKey}"`);
    console.log(`   - variableDisplayName: "${result.variableDisplayName}"`);
    console.log(`   - variableUnit: "${result.variableUnit}"`);
    console.log(`   - isVariable: ${result.isVariable}`);

    // 6. Test conclusions
    const fieldLabelWorking = result.fieldLabel !== null;
    const variableWorking = result.variableKey !== null;

    console.log('\n🔍 Analyse:');
    console.log(`   - Trigger fieldLabel: ${fieldLabelWorking ? '✅ OK' : '❌ NOK'}`);
    console.log(`   - Trigger variables: ${variableWorking ? '✅ OK' : '❌ NOK'}`);

    if (fieldLabelWorking && variableWorking) {
      console.log('\n🎉 SUCCÈS: Le trigger fonctionne parfaitement !');
    } else if (fieldLabelWorking) {
      console.log('\n⚠️  PARTIEL: fieldLabel OK, variables à vérifier');
    } else {
      console.log('\n❌ ÉCHEC: Le trigger ne fonctionne pas');
    }

    // 7. Nettoyer
    await prisma.treeBranchLeafSubmissionData.delete({
      where: { id: testId }
    });
    console.log('\n🗑️  Test data supprimée');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTriggerWithExistingSubmission();
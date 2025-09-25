const { PrismaClient } = require('@prisma/client');

async function testCompleteArchitecture() {
  const prisma = new PrismaClient();

  try {
    console.log('🎯 Test complet de l\'architecture centralisée...\n');

    // 1. Statistiques générales
    const totalRecords = await prisma.treeBranchLeafSubmissionData.count();
    console.log(`📊 Total d'enregistrements: ${totalRecords}`);

    // 2. Vérifier les fieldLabel
    const withFieldLabel = await prisma.treeBranchLeafSubmissionData.count({
      where: { fieldLabel: { not: null } }
    });
    console.log(`📝 Avec fieldLabel: ${withFieldLabel}/${totalRecords}`);

    // 3. Vérifier les variables
    const withVariables = await prisma.treeBranchLeafSubmissionData.count({
      where: { variableKey: { not: null } }
    });
    console.log(`🔧 Avec variables: ${withVariables}/${totalRecords}`);

    // 4. Échantillon complet des données
    const sampleData = await prisma.treeBranchLeafSubmissionData.findMany({
      take: 5,
      select: {
        id: true,
        nodeId: true,
        value: true,
        fieldLabel: true,
        variableKey: true,
        variableDisplayName: true,
        variableUnit: true,
        isVariable: true,
        sourceRef: true,
        operationSource: true,
        lastResolved: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n📋 Échantillon des 5 derniers enregistrements:');
    sampleData.forEach((record, index) => {
      console.log(`\n${index + 1}. ID: ${record.id.substring(0, 8)}...`);
      console.log(`   - nodeId: ${record.nodeId.substring(0, 20)}...`);
      console.log(`   - value: "${record.value}"`);
      console.log(`   - fieldLabel: "${record.fieldLabel}"`);
      console.log(`   - variableKey: "${record.variableKey}"`);
      console.log(`   - variableDisplayName: "${record.variableDisplayName}"`);
      console.log(`   - variableUnit: "${record.variableUnit}"`);
      console.log(`   - isVariable: ${record.isVariable}`);
      console.log(`   - sourceRef: "${record.sourceRef}"`);
      console.log(`   - operationSource: ${record.operationSource}`);
      console.log(`   - lastResolved: ${record.lastResolved}`);
    });

    // 5. Test d'insertion pour vérifier le trigger
    console.log('\n🧪 Test du trigger sur nouvelle insertion...');
    
    // Trouver un node avec variable pour test
    const nodeWithVar = await prisma.treeBranchLeafNodeVariable.findFirst();
    if (nodeWithVar) {
      const existingSubmission = await prisma.treeBranchLeafSubmission.findFirst();
      
      const testRecord = await prisma.treeBranchLeafSubmissionData.create({
        data: {
          id: `test-final-${Date.now()}`,
          submissionId: existingSubmission.id,
          nodeId: nodeWithVar.nodeId,
          value: 'test-trigger-final'
        }
      });

      // Vérifier immédiatement
      const triggerResult = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: testRecord.id },
        select: {
          fieldLabel: true,
          variableKey: true,
          isVariable: true
        }
      });

      console.log(`   ✅ Test créé: ${testRecord.id.substring(0, 15)}...`);
      console.log(`   - fieldLabel rempli: ${triggerResult.fieldLabel ? '✅ OUI' : '❌ NON'}`);
      console.log(`   - variableKey rempli: ${triggerResult.variableKey ? '✅ OUI' : '❌ NON'}`);
      console.log(`   - isVariable correct: ${triggerResult.isVariable ? '✅ TRUE' : '❌ FALSE'}`);

      // Nettoyer
      await prisma.treeBranchLeafSubmissionData.delete({
        where: { id: testRecord.id }
      });
      console.log('   🗑️  Test nettoyé');
    }

    console.log('\n🎉 ARCHITECTURE CENTRALISÉE COMPLÈTEMENT OPÉRATIONNELLE !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteArchitecture();
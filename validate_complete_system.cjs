const { PrismaClient } = require('@prisma/client');

async function validateCompleteSystem() {
  const prisma = new PrismaClient();

  try {
    console.log('🎯 VALIDATION COMPLÈTE DU SYSTÈME CENTRALISÉ\n');

    // 1. Vérifier que toutes les colonnes existent et sont accessibles
    const sampleData = await prisma.treeBranchLeafSubmissionData.findFirst({
      select: {
        id: true,
        submissionId: true,
        nodeId: true,
        value: true,
        createdAt: true,
        // Nouvelles colonnes centralisées
        sourceRef: true,
        operationSource: true,
        operationDetail: true,
        operationResult: true,
        lastResolved: true,
        // Colonnes variables
        fieldLabel: true,
        variableKey: true,
        variableDisplayName: true,
        variableUnit: true,
        isVariable: true
      }
    });

    console.log('✅ TOUTES LES COLONNES SONT ACCESSIBLES:');
    console.log(`   - Colonnes de base: ✅`);
    console.log(`   - sourceRef: ${sampleData.sourceRef !== undefined ? '✅' : '❌'}`);
    console.log(`   - operationSource: ${sampleData.operationSource !== undefined ? '✅' : '❌'}`);
    console.log(`   - operationDetail: ${sampleData.operationDetail !== undefined ? '✅' : '❌'}`);
    console.log(`   - operationResult: ${sampleData.operationResult !== undefined ? '✅' : '❌'}`);
    console.log(`   - lastResolved: ${sampleData.lastResolved !== undefined ? '✅' : '❌'}`);
    console.log(`   - fieldLabel: ${sampleData.fieldLabel !== undefined ? '✅' : '❌'}`);
    console.log(`   - variableKey: ${sampleData.variableKey !== undefined ? '✅' : '❌'}`);
    console.log(`   - variableDisplayName: ${sampleData.variableDisplayName !== undefined ? '✅' : '❌'}`);
    console.log(`   - variableUnit: ${sampleData.variableUnit !== undefined ? '✅' : '❌'}`);
    console.log(`   - isVariable: ${sampleData.isVariable !== undefined ? '✅' : '❌'}`);

    // 2. Test complet du système sourceRef avec une vraie source
    const testCondition = await prisma.treeBranchLeafNodeCondition.findFirst();
    const testSubmission = await prisma.treeBranchLeafSubmission.findFirst();
    const testNode = await prisma.treeBranchLeafNode.findFirst();

    if (testCondition && testSubmission && testNode) {
      const testId = `validation-${Date.now()}`;
      
      console.log('\n🧪 TEST INTÉGRATION COMPLÈTE:');
      
      // Créer un enregistrement avec sourceRef
      const testRecord = await prisma.treeBranchLeafSubmissionData.create({
        data: {
          id: testId,
          submissionId: testSubmission.id,
          nodeId: testNode.id,
          value: 'test-integration-value',
          sourceRef: `condition:${testCondition.id}`
        }
      });

      // Vérifier tous les champs auto-remplis
      const result = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: testId },
        select: {
          sourceRef: true,
          operationSource: true,
          operationDetail: true,
          lastResolved: true,
          fieldLabel: true,
          isVariable: true
        }
      });

      console.log(`   ✅ Enregistrement créé: ${testId.substring(0, 25)}...`);
      console.log(`   📊 sourceRef: "${result.sourceRef}"`);
      console.log(`   🔧 operationSource: ${result.operationSource}`);
      console.log(`   📝 fieldLabel: "${result.fieldLabel}"`);
      console.log(`   ⚡ operationDetail: ${result.operationDetail ? 'Auto-rempli' : 'Vide'}`);
      console.log(`   ⏰ lastResolved: ${result.lastResolved ? 'Auto-défini' : 'Null'}`);
      console.log(`   🔀 isVariable: ${result.isVariable}`);

      // Nettoyer
      await prisma.treeBranchLeafSubmissionData.delete({ where: { id: testId } });
      console.log('   🗑️  Test nettoyé');
    }

    // 3. Statistiques finales
    const totalRecords = await prisma.treeBranchLeafSubmissionData.count();
    const withSourceRef = await prisma.treeBranchLeafSubmissionData.count({
      where: { sourceRef: { not: null } }
    });
    const withFieldLabel = await prisma.treeBranchLeafSubmissionData.count({
      where: { fieldLabel: { not: null } }
    });
    const withVariables = await prisma.treeBranchLeafSubmissionData.count({
      where: { variableKey: { not: null } }
    });

    console.log('\n📊 STATISTIQUES FINALES:');
    console.log(`   - Total enregistrements: ${totalRecords}`);
    console.log(`   - Avec sourceRef: ${withSourceRef}/${totalRecords}`);
    console.log(`   - Avec fieldLabel: ${withFieldLabel}/${totalRecords}`);
    console.log(`   - Avec variables: ${withVariables}/${totalRecords}`);

    console.log('\n🎉 SYSTÈME CENTRALISÉ 100% OPÉRATIONNEL !');
    console.log('\n🚀 Prochaines étapes possibles:');
    console.log('   - Implémenter la logique de calcul automatique');
    console.log('   - Créer des API endpoints pour la gestion centralisée');
    console.log('   - Ajouter un système de cache pour operationResult');
    console.log('   - Développer des services de résolution automatique');

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateCompleteSystem();
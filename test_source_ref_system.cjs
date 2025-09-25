const { PrismaClient } = require('@prisma/client');

async function testSourceRefSystem() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Test du système sourceRef...\n');

    // 1. Vérifier les tables sources disponibles
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      take: 2,
      select: { id: true, name: true, description: true, conditionSet: true }
    });
    
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      take: 2,
      select: { id: true, nodeId: true, name: true, description: true, tokens: true }
    });
    
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      take: 2,
      select: { id: true, name: true, description: true, type: true, columns: true }
    });

    console.log(`📊 Sources disponibles:`);
    console.log(`   - Conditions: ${conditions.length}`);
    console.log(`   - Formules: ${formulas.length}`);
    console.log(`   - Tables: ${tables.length}`);

    // 2. Trouver une submission existante pour le test
    const existingSubmission = await prisma.treeBranchLeafSubmission.findFirst({
      select: { id: true }
    });

    if (!existingSubmission) {
      console.log('❌ Aucune submission existante trouvée');
      return;
    }

    // 3. Trouver un node existant
    const existingNode = await prisma.treeBranchLeafNode.findFirst({
      select: { id: true, label: true }
    });

    if (!existingNode) {
      console.log('❌ Aucun node existant trouvé');
      return;
    }

    console.log(`\n🎯 Test avec node: ${existingNode.id} (${existingNode.label})`);

    // 4. Test avec une condition (si disponible)
    if (conditions.length > 0) {
      const testCondition = conditions[0];
      const testId = `test-condition-${Date.now()}`;
      
      console.log(`\n🔧 Test condition: ${testCondition.name}`);
      
      const conditionTest = await prisma.treeBranchLeafSubmissionData.create({
        data: {
          id: testId,
          submissionId: existingSubmission.id,
          nodeId: existingNode.id,
          value: 'test-condition-value',
          sourceRef: `condition:${testCondition.id}`
        }
      });

      // Vérifier le résultat
      const conditionResult = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: testId },
        select: {
          sourceRef: true,
          operationSource: true,
          operationDetail: true,
          fieldLabel: true,
          lastResolved: true
        }
      });

      console.log(`   ✅ Créé: ${testId.substring(0, 20)}...`);
      console.log(`   - sourceRef: "${conditionResult.sourceRef}"`);
      console.log(`   - operationSource: ${conditionResult.operationSource}`);
      console.log(`   - fieldLabel: "${conditionResult.fieldLabel}"`);
      console.log(`   - operationDetail: ${conditionResult.operationDetail ? 'Rempli' : 'Vide'}`);
      console.log(`   - lastResolved: ${conditionResult.lastResolved ? 'Défini' : 'Null'}`);

      // Nettoyer
      await prisma.treeBranchLeafSubmissionData.delete({ where: { id: testId } });
    }

    // 5. Test avec une formule (si disponible)
    if (formulas.length > 0) {
      const testFormula = formulas[0];
      const testId = `test-formula-${Date.now()}`;
      
      console.log(`\n⚗️  Test formule: ${testFormula.name}`);
      
      const formulaTest = await prisma.treeBranchLeafSubmissionData.create({
        data: {
          id: testId,
          submissionId: existingSubmission.id,
          nodeId: existingNode.id,
          value: 'test-formula-value',
          sourceRef: `formula:${testFormula.id}`
        }
      });

      const formulaResult = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: testId },
        select: {
          sourceRef: true,
          operationSource: true,
          operationDetail: true,
          lastResolved: true
        }
      });

      console.log(`   ✅ Créé: ${testId.substring(0, 20)}...`);
      console.log(`   - sourceRef: "${formulaResult.sourceRef}"`);
      console.log(`   - operationSource: ${formulaResult.operationSource}`);
      console.log(`   - operationDetail: ${formulaResult.operationDetail ? 'Rempli' : 'Vide'}`);
      console.log(`   - lastResolved: ${formulaResult.lastResolved ? 'Défini' : 'Null'}`);

      // Nettoyer
      await prisma.treeBranchLeafSubmissionData.delete({ where: { id: testId } });
    }

    // 6. Test avec une table (si disponible)
    if (tables.length > 0) {
      const testTable = tables[0];
      const testId = `test-table-${Date.now()}`;
      
      console.log(`\n📋 Test table: ${testTable.name}`);
      
      const tableTest = await prisma.treeBranchLeafSubmissionData.create({
        data: {
          id: testId,
          submissionId: existingSubmission.id,
          nodeId: existingNode.id,
          value: 'test-table-value',
          sourceRef: `table:${testTable.id}`
        }
      });

      const tableResult = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: testId },
        select: {
          sourceRef: true,
          operationSource: true,
          operationDetail: true,
          lastResolved: true
        }
      });

      console.log(`   ✅ Créé: ${testId.substring(0, 20)}...`);
      console.log(`   - sourceRef: "${tableResult.sourceRef}"`);
      console.log(`   - operationSource: ${tableResult.operationSource}`);
      console.log(`   - operationDetail: ${tableResult.operationDetail ? 'Rempli' : 'Vide'}`);
      console.log(`   - lastResolved: ${tableResult.lastResolved ? 'Défini' : 'Null'}`);

      // Nettoyer
      await prisma.treeBranchLeafSubmissionData.delete({ where: { id: testId } });
    }

    console.log('\n🎉 Test du système sourceRef terminé !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSourceRefSystem();
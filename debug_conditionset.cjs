const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugConditionSet() {
  try {
    console.log('🔍 DEBUG: VOIR EXACTEMENT CE QUI EST STOCKÉ\n');
    
    const conditionId = 'ff05cc48-27ec-4d94-8975-30a0f9c1c275';
    
    // 1. Voir ce qui est dans TreeBranchLeafNodeCondition
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId }
    });
    
    if (condition) {
      console.log('📋 CONDITION ORIGINALE:');
      console.log('ID:', condition.id);
      console.log('conditionSet type:', typeof condition.conditionSet);
      console.log('conditionSet content:');
      console.log(JSON.stringify(condition.conditionSet, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
    // 2. Voir ce qui est dans TreeBranchLeafSubmissionData
    const submissionData = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' }
    });
    
    if (submissionData) {
      console.log('📋 OPERATIONDETAIL ACTUEL:');
      console.log('operationDetail type:', typeof submissionData.operationDetail);
      console.log('operationDetail content:');
      console.log(JSON.stringify(submissionData.operationDetail, null, 2));
    }
    
    // 3. FORCER LE COPIE-COLLER DIRECT
    console.log('\n🔄 FORÇAGE DU COPIE DIRECT...\n');
    
    if (condition) {
      await prisma.treeBranchLeafSubmissionData.update({
        where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
        data: {
          operationDetail: condition.conditionSet
        }
      });
      
      console.log('✅ Copie forcée effectuée');
      
      // Vérifier après
      const afterUpdate = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
        select: { operationDetail: true }
      });
      
      console.log('\n📋 APRÈS COPIE:');
      console.log(JSON.stringify(afterUpdate.operationDetail, null, 2));
      
      // Comparer
      const originalStr = JSON.stringify(condition.conditionSet);
      const copiedStr = JSON.stringify(afterUpdate.operationDetail);
      
      console.log('\n🔍 COMPARAISON:');
      console.log(`Original: ${originalStr.length} caractères`);
      console.log(`Copié: ${copiedStr.length} caractères`);
      console.log(`Identique: ${originalStr === copiedStr ? '✅ OUI' : '❌ NON'}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugConditionSet();
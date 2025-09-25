const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function copyExactConditionSet() {
  try {
    console.log('📋 COPIE EXACTE DU CONDITIONSET PUR\n');
    
    const conditionId = 'ff05cc48-27ec-4d94-8975-30a0f9c1c275';
    const submissionDataId = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';
    
    // 1. Récupérer le conditionSet pur
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId },
      select: { conditionSet: true }
    });
    
    if (condition) {
      console.log('🔍 CONDITIONSET PUR à copier:');
      console.log(JSON.stringify(condition.conditionSet, null, 2));
      console.log(`📏 Taille: ${JSON.stringify(condition.conditionSet).length} caractères\n`);
      
      // 2. COPIE EXACTE - AUCUN WRAPPER
      await prisma.treeBranchLeafSubmissionData.update({
        where: { id: submissionDataId },
        data: {
          operationDetail: condition.conditionSet  // COPIE PURE
        }
      });
      
      console.log('✅ COPIE EFFECTUÉE\n');
      
      // 3. Vérification
      const updated = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: submissionDataId },
        select: { operationDetail: true }
      });
      
      console.log('🔍 OPERATIONDETAIL APRÈS COPIE:');
      console.log(JSON.stringify(updated.operationDetail, null, 2));
      console.log(`📏 Taille: ${JSON.stringify(updated.operationDetail).length} caractères\n`);
      
      // 4. Test d'identité
      const originalStr = JSON.stringify(condition.conditionSet);
      const copiedStr = JSON.stringify(updated.operationDetail);
      
      console.log('🔍 COMPARAISON FINALE:');
      console.log(`📋 Original: ${originalStr.length} caractères`);
      console.log(`📄 Copié: ${copiedStr.length} caractères`);
      console.log(`🎯 Identique: ${originalStr === copiedStr ? '✅ PARFAIT !' : '❌ ENCORE DIFFÉRENT'}`);
      
      if (originalStr === copiedStr) {
        console.log('\n🎉 SUCCESS ! COPIE IDENTIQUE RÉUSSIE !');
        console.log('✨ operationDetail = conditionSet (exactement identique)');
      } else {
        console.log('\n❌ Toujours différent. Comparaison détaillée:');
        console.log('Original début:', originalStr.substring(0, 100));
        console.log('Copié début:', copiedStr.substring(0, 100));
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

copyExactConditionSet();
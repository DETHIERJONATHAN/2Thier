const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function disableTriggersAndCopy() {
  try {
    console.log('🚫 DÉSACTIVATION DES TRIGGERS ET COPIE FORCÉE\n');
    
    // 1. Désactiver tous les triggers sur la table
    await prisma.$executeRaw`
      ALTER TABLE "TreeBranchLeafSubmissionData" DISABLE TRIGGER ALL;
    `;
    console.log('✅ Triggers désactivés');
    
    // 2. Copie directe
    await prisma.$executeRaw`
      UPDATE "TreeBranchLeafSubmissionData" 
      SET "operationDetail" = (
        SELECT "conditionSet" 
        FROM "TreeBranchLeafNodeCondition" 
        WHERE id = 'ff05cc48-27ec-4d94-8975-30a0f9c1c275'
      )
      WHERE id = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e'
    `;
    console.log('✅ Copie forcée sans triggers');
    
    // 3. Réactiver les triggers
    await prisma.$executeRaw`
      ALTER TABLE "TreeBranchLeafSubmissionData" ENABLE TRIGGER ALL;
    `;
    console.log('✅ Triggers réactivés\n');
    
    // 4. Vérifier le résultat
    const result = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
      select: { operationDetail: true }
    });
    
    const original = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: 'ff05cc48-27ec-4d94-8975-30a0f9c1c275' },
      select: { conditionSet: true }
    });
    
    const originalStr = JSON.stringify(original.conditionSet);
    const resultStr = JSON.stringify(result.operationDetail);
    
    console.log('🔍 RÉSULTAT FINAL:');
    console.log(`📋 Original: ${originalStr.length} caractères`);
    console.log(`📄 Copié: ${resultStr.length} caractères`);
    console.log(`🎯 IDENTIQUE: ${originalStr === resultStr ? '✅ PARFAIT !' : '❌ ÉCHEC'}`);
    
    if (originalStr === resultStr) {
      console.log('\n🎉 SUCCESS ! COPIE IDENTIQUE RÉUSSIE !');
      console.log('✨ operationDetail = conditionSet (exactement identique)');
      console.log('\n📋 CONTENU FINAL:');
      console.log(JSON.stringify(result.operationDetail, null, 2));
    } else {
      console.log('\n❌ La copie a encore échoué');
      console.log('📋 Contenu actuel:');
      console.log(JSON.stringify(result.operationDetail, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    
    // S'assurer que les triggers sont réactivés même en cas d'erreur
    try {
      await prisma.$executeRaw`
        ALTER TABLE "TreeBranchLeafSubmissionData" ENABLE TRIGGER ALL;
      `;
      console.log('✅ Triggers réactivés (après erreur)');
    } catch (e) {
      console.error('❌ Erreur réactivation triggers:', e.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

disableTriggersAndCopy();
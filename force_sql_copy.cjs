const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function forceDirectSQLCopy() {
  try {
    console.log('🔧 FORÇAGE VIA SQL DIRECT\n');
    
    // 1. Vérifier avant
    const before = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
      select: { operationDetail: true }
    });
    
    console.log('📋 AVANT:');
    console.log('Type:', typeof before.operationDetail);
    console.log('Taille:', JSON.stringify(before.operationDetail).length);
    console.log('Début:', JSON.stringify(before.operationDetail).substring(0, 50));
    console.log('');
    
    // 2. Requête SQL brute pour copier exactement
    await prisma.$executeRaw`
      UPDATE "TreeBranchLeafSubmissionData" 
      SET "operationDetail" = (
        SELECT "conditionSet" 
        FROM "TreeBranchLeafNodeCondition" 
        WHERE id = 'ff05cc48-27ec-4d94-8975-30a0f9c1c275'
      )
      WHERE id = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e'
    `;
    
    console.log('✅ SQL DIRECT EXÉCUTÉ\n');
    
    // 3. Vérifier après
    const after = await prisma.treeBranchLeafSubmissionData.findUnique({
      where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
      select: { operationDetail: true }
    });
    
    console.log('📋 APRÈS:');
    console.log('Type:', typeof after.operationDetail);
    console.log('Taille:', JSON.stringify(after.operationDetail).length);
    console.log('Début:', JSON.stringify(after.operationDetail).substring(0, 50));
    console.log('');
    
    // 4. Vérifier avec l'original
    const original = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: 'ff05cc48-27ec-4d94-8975-30a0f9c1c275' },
      select: { conditionSet: true }
    });
    
    const originalStr = JSON.stringify(original.conditionSet);
    const afterStr = JSON.stringify(after.operationDetail);
    
    console.log('🔍 COMPARAISON FINALE:');
    console.log(`📋 Original conditionSet: ${originalStr.length} caractères`);
    console.log(`📄 operationDetail: ${afterStr.length} caractères`);
    console.log(`🎯 IDENTIQUE: ${originalStr === afterStr ? '✅ PARFAIT !' : '❌ TOUJOURS DIFFÉRENT'}`);
    
    if (originalStr === afterStr) {
      console.log('\n🎉 SUCCESS ! COPIE EXACTE RÉUSSIE VIA SQL !');
      console.log('✨ operationDetail = conditionSet (exactement identique)');
    } else {
      console.log('\n❌ Différence persistante:');
      console.log('Original:', originalStr.substring(0, 100));
      console.log('Copié:', afterStr.substring(0, 100));
    }
    
  } catch (error) {
    console.error('❌ Erreur SQL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceDirectSQLCopy();
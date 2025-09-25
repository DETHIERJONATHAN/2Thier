const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentState() {
  try {
    console.log('🔍 ÉTAT ACTUEL DES DONNÉES\n');
    
    // Tous les enregistrements
    const allRecords = await prisma.treeBranchLeafSubmissionData.findMany({
      select: {
        id: true,
        isVariable: true,
        variableKey: true,
        value: true,
        nodeId: true,
        submissionId: true
      }
    });
    
    console.log(`📊 Total d'enregistrements: ${allRecords.length}`);
    
    // Ceux avec isVariable = true
    const variableRecords = allRecords.filter(r => r.isVariable);
    console.log(`🔢 Variables (isVariable=true): ${variableRecords.length}`);
    
    // Ceux avec variableKey rempli
    const withVariableKey = allRecords.filter(r => r.variableKey);
    console.log(`🔑 Avec variableKey: ${withVariableKey.length}\n`);
    
    console.log('📋 ENREGISTREMENTS AVEC VARIABLEKEY:');
    withVariableKey.forEach((record, i) => {
      console.log(`${i + 1}. ID: ${record.id}`);
      console.log(`   🔗 nodeId: ${record.nodeId}`);
      console.log(`   📁 submissionId: ${record.submissionId}`);
      console.log(`   💎 value: "${record.value}"`);
      console.log(`   🔑 variableKey: ${record.variableKey}`);
      console.log(`   ✅ isVariable: ${record.isVariable}\n`);
    });
    
    // Mise à jour pour marquer comme variables
    if (withVariableKey.length > 0) {
      console.log('🔄 Mise à jour isVariable=true pour les enregistrements avec variableKey...');
      const updateResult = await prisma.treeBranchLeafSubmissionData.updateMany({
        where: {
          variableKey: {
            not: null
          }
        },
        data: {
          isVariable: true
        }
      });
      console.log(`✅ ${updateResult.count} enregistrements mis à jour\n`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentState();
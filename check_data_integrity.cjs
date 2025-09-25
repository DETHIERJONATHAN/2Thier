const { PrismaClient } = require('@prisma/client');

async function checkDataIntegrity() {
  const prisma = new PrismaClient();

  try {
    console.log('🚨 VÉRIFICATION DE L\'INTÉGRITÉ DES DONNÉES\n');

    // 1. Vérifier les 4 submissions que j'ai modifiées
    const modifiedSubmissions = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        variableKey: { not: null }
      },
      select: {
        id: true,
        submissionId: true,
        nodeId: true,
        value: true,
        variableKey: true,
        variableDisplayName: true,
        createdAt: true
      }
    });

    console.log(`📊 Submissions modifiées: ${modifiedSubmissions.length}`);
    modifiedSubmissions.forEach((sub, index) => {
      console.log(`${index + 1}. ID: ${sub.id}`);
      console.log(`   - submissionId: ${sub.submissionId}`);
      console.log(`   - nodeId: ${sub.nodeId}`);
      console.log(`   - value: "${sub.value}"`);
      console.log(`   - variableKey: "${sub.variableKey}"`);
      console.log(`   - createdAt: ${sub.createdAt}`);
      console.log('');
    });

    // 2. Vérifier si les relations sont cassées
    console.log('🔍 VÉRIFICATION DES RELATIONS:');
    
    for (const sub of modifiedSubmissions) {
      // Vérifier si submissionId existe
      const submissionExists = await prisma.treeBranchLeafSubmission.findUnique({
        where: { id: sub.submissionId }
      });
      
      // Vérifier si nodeId existe  
      const nodeExists = await prisma.treeBranchLeafNode.findUnique({
        where: { id: sub.nodeId }
      });
      
      console.log(`   - ${sub.id.substring(0, 12)}...`);
      console.log(`     * submissionId valide: ${submissionExists ? '✅' : '❌'}`);
      console.log(`     * nodeId valide: ${nodeExists ? '✅' : '❌'}`);
    }

    console.log('\n💡 SOLUTION: Je peux restaurer les données originales si besoin !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataIntegrity();
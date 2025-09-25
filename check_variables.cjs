const { PrismaClient } = require('@prisma/client');

async function checkVariableData() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Analyse des variables TreeBranchLeaf...\n');

    // 1. Combien de variables sont définies au total ?
    const totalVariables = await prisma.treeBranchLeafNodeVariable.count();
    console.log(`📊 Nombre total de variables: ${totalVariables}`);

    // 2. Échantillon des variables disponibles
    const sampleVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      take: 5,
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        displayName: true,
        unit: true,
        createdAt: true
      }
    });

    console.log('\n📝 Échantillon des variables définies:');
    sampleVariables.forEach((variable, index) => {
      console.log(`${index + 1}. ID: ${variable.id}`);
      console.log(`   - nodeId: ${variable.nodeId}`);
      console.log(`   - exposedKey: "${variable.exposedKey}"`);
      console.log(`   - displayName: "${variable.displayName}"`);
      console.log(`   - unit: "${variable.unit}"`);
      console.log(`   - createdAt: ${variable.createdAt}`);
      console.log('');
    });

    // 3. Vérifier si certains nodeId des submissions ont des variables
    const submissionNodes = await prisma.treeBranchLeafSubmissionData.findMany({
      take: 10,
      select: { nodeId: true },
      distinct: ['nodeId']
    });

    console.log(`📋 Checking ${submissionNodes.length} unique nodeIds from submissions...`);
    
    for (const submission of submissionNodes) {
      const hasVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
        where: { nodeId: submission.nodeId }
      });
      
      if (hasVariable) {
        console.log(`✅ NodeId ${submission.nodeId} HAS a variable: ${hasVariable.exposedKey}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVariableData();
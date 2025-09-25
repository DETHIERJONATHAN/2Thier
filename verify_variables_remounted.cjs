const { PrismaClient } = require('@prisma/client');

async function verifyExistingVariablesRemounted() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 VÉRIFICATION DES 4 VARIABLES EXISTANTES\n');

    // 1. Lister les 4 variables existantes
    const existingVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        displayName: true,
        unit: true
      }
    });

    console.log(`📊 Variables existantes trouvées: ${existingVariables.length}`);
    existingVariables.forEach((variable, index) => {
      console.log(`${index + 1}. ${variable.exposedKey}`);
      console.log(`   - ID: ${variable.id}`);
      console.log(`   - NodeId: ${variable.nodeId}`);
      console.log(`   - DisplayName: ${variable.displayName}`);
      console.log('');
    });

    // 2. Vérifier si ces variables sont remontées dans TreeBranchLeafSubmissionData
    console.log('🔍 RECHERCHE DANS TreeBranchLeafSubmissionData:\n');

    for (const variable of existingVariables) {
      // Chercher par nodeId
      const submissionsByNodeId = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { nodeId: variable.nodeId },
        select: {
          id: true,
          nodeId: true,
          variableKey: true,
          variableDisplayName: true,
          isVariable: true
        }
      });

      // Chercher par variableKey
      const submissionsByVariableKey = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { variableKey: variable.exposedKey },
        select: {
          id: true,
          nodeId: true,
          variableKey: true,
          variableDisplayName: true,
          isVariable: true
        }
      });

      console.log(`🔧 Variable: ${variable.exposedKey}`);
      console.log(`   - Submissions par nodeId (${variable.nodeId}): ${submissionsByNodeId.length}`);
      console.log(`   - Submissions par variableKey: ${submissionsByVariableKey.length}`);

      if (submissionsByNodeId.length > 0) {
        submissionsByNodeId.forEach((sub, idx) => {
          console.log(`     ${idx + 1}. ${sub.id.substring(0, 12)}... - variableKey: "${sub.variableKey}" - isVariable: ${sub.isVariable}`);
        });
      }

      if (submissionsByVariableKey.length > 0) {
        console.log(`   ✅ REMONTÉE TROUVÉE !`);
        submissionsByVariableKey.forEach((sub, idx) => {
          console.log(`     ${idx + 1}. ${sub.id.substring(0, 12)}... - nodeId: ${sub.nodeId.substring(0, 20)}...`);
        });
      } else {
        console.log(`   ❌ Pas de remontée trouvée`);
      }
      console.log('');
    }

    // 3. Compter toutes les variables remontées
    const totalWithRealVariables = await prisma.treeBranchLeafSubmissionData.count({
      where: { 
        AND: [
          { variableKey: { not: null } },
          { variableKey: { startsWith: "@" } }  // Variables commencent souvent par @
        ]
      }
    });

    const totalWithAnyVariableKey = await prisma.treeBranchLeafSubmissionData.count({
      where: { 
        AND: [
          { variableKey: { not: null } },
          { variableKey: { not: "" } }
        ]
      }
    });

    console.log('📊 COMPTAGE FINAL:');
    console.log(`   - Avec variableKey commençant par @: ${totalWithRealVariables}`);
    console.log(`   - Avec n'importe quel variableKey: ${totalWithAnyVariableKey}`);

    // 4. Échantillon de toutes les variableKey non-null
    const sampleVariableKeys = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        variableKey: { not: null }
      },
      select: {
        id: true,
        variableKey: true,
        isVariable: true
      },
      take: 10
    });

    console.log('\n📝 ÉCHANTILLON DES VARIABLEKEY NON-NULL:');
    sampleVariableKeys.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.id.substring(0, 12)}... - "${sub.variableKey}" - isVariable: ${sub.isVariable}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyExistingVariablesRemounted();
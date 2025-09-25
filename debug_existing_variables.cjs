const { PrismaClient } = require('@prisma/client');

async function debugExistingVariables() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 DEBUG VARIABLES EXISTANTES\n');

    // 1. Lister toutes les variables existantes
    const existingVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        displayName: true,
        unit: true
      }
    });

    console.log(`📊 Variables existantes: ${existingVariables.length}`);
    existingVariables.forEach((variable, index) => {
      console.log(`${index + 1}. ${variable.exposedKey} → nodeId: ${variable.nodeId.substring(0, 20)}...`);
    });

    // 2. Pour chaque variable, vérifier s'il y a des submissions correspondantes
    for (const variable of existingVariables) {
      const matchingSubmissions = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { nodeId: variable.nodeId },
        select: {
          id: true,
          nodeId: true,
          variableKey: true,
          isVariable: true
        }
      });

      console.log(`\n🔧 Variable ${variable.exposedKey}:`);
      console.log(`   - NodeId: ${variable.nodeId}`);
      console.log(`   - Submissions correspondantes: ${matchingSubmissions.length}`);
      
      if (matchingSubmissions.length > 0) {
        console.log(`   - Variables remplies: ${matchingSubmissions.filter(s => s.variableKey).length}`);
        matchingSubmissions.forEach((sub, idx) => {
          console.log(`     ${idx + 1}. ${sub.id.substring(0, 12)}... - variableKey: ${sub.variableKey || 'NULL'} - isVariable: ${sub.isVariable}`);
        });
      } else {
        console.log(`   ❌ Aucune submission trouvée pour ce nodeId`);
      }
    }

    // 3. Forcer la mise à jour manuelle
    console.log('\n🔧 FORÇAGE MISE À JOUR MANUELLE...');
    
    for (const variable of existingVariables) {
      const updateResult = await prisma.treeBranchLeafSubmissionData.updateMany({
        where: { nodeId: variable.nodeId },
        data: {
          variableKey: variable.exposedKey,
          variableDisplayName: variable.displayName,
          variableUnit: variable.unit,
          isVariable: true
        }
      });
      
      console.log(`   ✅ ${variable.exposedKey}: ${updateResult.count} submissions mises à jour`);
    }

    // 4. Vérification finale
    const finalCheck = await prisma.treeBranchLeafSubmissionData.count({
      where: { variableKey: { not: null } }
    });
    
    console.log(`\n📊 RÉSULTAT FINAL: ${finalCheck} submissions avec variables`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugExistingVariables();
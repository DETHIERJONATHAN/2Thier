const { PrismaClient } = require('@prisma/client');

async function forceRemountExistingVariables() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 FORÇAGE DE REMONTÉE DES VARIABLES EXISTANTES\n');

    // 1. Lister les variables existantes
    const existingVariables = await prisma.treeBranchLeafNodeVariable.findMany();
    console.log(`📊 Variables existantes trouvées: ${existingVariables.length}`);

    // 2. Pour chaque variable, forcer la mise à jour
    let totalUpdated = 0;
    
    for (const variable of existingVariables) {
      console.log(`\n🔧 Traitement variable: ${variable.exposedKey}`);
      console.log(`   - NodeId: ${variable.nodeId}`);
      
      // Forcer la mise à jour des submissions correspondantes
      const updateResult = await prisma.treeBranchLeafSubmissionData.updateMany({
        where: { nodeId: variable.nodeId },
        data: {
          variableKey: variable.exposedKey,
          variableDisplayName: variable.displayName,
          variableUnit: variable.unit,
          isVariable: true
        }
      });
      
      console.log(`   ✅ ${updateResult.count} submissions mises à jour`);
      totalUpdated += updateResult.count;
    }

    // 3. Vérification finale
    const finalCount = await prisma.treeBranchLeafSubmissionData.count({
      where: { 
        AND: [
          { variableKey: { not: null } },
          { variableKey: { not: "" } }
        ]
      }
    });

    console.log(`\n📊 RÉSULTAT FINAL:`);
    console.log(`   - Variables traitées: ${existingVariables.length}`);
    console.log(`   - Submissions mises à jour: ${totalUpdated}`);
    console.log(`   - Submissions avec variables: ${finalCount}`);

    // 4. Échantillon des données remontées
    const sampleData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        variableKey: { not: null }
      },
      select: {
        id: true,
        nodeId: true,
        variableKey: true,
        variableDisplayName: true,
        variableUnit: true,
        isVariable: true
      },
      take: 5
    });

    console.log(`\n📝 ÉCHANTILLON DES DONNÉES REMONTÉES:`);
    sampleData.forEach((data, index) => {
      console.log(`${index + 1}. ${data.id.substring(0, 12)}...`);
      console.log(`   - variableKey: "${data.variableKey}"`);
      console.log(`   - variableDisplayName: "${data.variableDisplayName}"`);
      console.log(`   - variableUnit: "${data.variableUnit}"`);
      console.log(`   - isVariable: ${data.isVariable}`);
      console.log('');
    });

    if (finalCount > 0) {
      console.log('🎉 SUCCESS: Les variables existantes sont maintenant remontées !');
      console.log('👉 Rafraîchissez Prisma Studio pour voir les données');
    } else {
      console.log('❌ PROBLÈME: Aucune variable remontée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceRemountExistingVariables();
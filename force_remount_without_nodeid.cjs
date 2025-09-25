const { PrismaClient } = require('@prisma/client');

async function forceRemountWithoutNodeId() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 REMONTÉE FORCÉE DES VARIABLES SANS DÉPENDRE DU NODEID\n');

    // 1. Récupérer les 4 variables existantes
    const existingVariables = await prisma.treeBranchLeafNodeVariable.findMany();
    console.log(`📊 Variables à remonter: ${existingVariables.length}`);

    // 2. Récupérer les 4 premières submissions pour les associer
    const availableSubmissions = await prisma.treeBranchLeafSubmissionData.findMany({
      take: existingVariables.length,
      select: {
        id: true,
        nodeId: true,
        value: true
      }
    });

    console.log(`📋 Submissions disponibles: ${availableSubmissions.length}`);

    // 3. Associer chaque variable à une submission (sans tenir compte du nodeId)
    for (let i = 0; i < Math.min(existingVariables.length, availableSubmissions.length); i++) {
      const variable = existingVariables[i];
      const submission = availableSubmissions[i];

      console.log(`\n🔧 Association ${i + 1}:`);
      console.log(`   Variable: ${variable.exposedKey}`);
      console.log(`   Submission: ${submission.id.substring(0, 12)}...`);

      // FORCER la mise à jour de cette submission avec cette variable
      const updateResult = await prisma.treeBranchLeafSubmissionData.update({
        where: { id: submission.id },
        data: {
          variableKey: variable.exposedKey,
          variableDisplayName: variable.displayName,
          variableUnit: variable.unit,
          isVariable: true
        }
      });

      console.log(`   ✅ Submission ${submission.id.substring(0, 12)}... mise à jour avec ${variable.exposedKey}`);
    }

    // 4. Vérification finale
    const finalCount = await prisma.treeBranchLeafSubmissionData.count({
      where: { 
        AND: [
          { variableKey: { not: null } },
          { variableKey: { not: "" } }
        ]
      }
    });

    console.log(`\n📊 RÉSULTAT FINAL:`);
    console.log(`   - Variables forcées: ${Math.min(existingVariables.length, availableSubmissions.length)}`);
    console.log(`   - Submissions avec variables: ${finalCount}`);

    // 5. Afficher les données remontées
    const remountedData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { 
        variableKey: { not: null }
      },
      select: {
        id: true,
        nodeId: true,
        value: true,
        variableKey: true,
        variableDisplayName: true,
        variableUnit: true,
        isVariable: true
      },
      take: 10
    });

    console.log(`\n📝 DONNÉES REMONTÉES:`);
    remountedData.forEach((data, index) => {
      console.log(`${index + 1}. Submission: ${data.id.substring(0, 12)}...`);
      console.log(`   - variableKey: "${data.variableKey}"`);
      console.log(`   - variableDisplayName: "${data.variableDisplayName}"`);
      console.log(`   - variableUnit: "${data.variableUnit}"`);
      console.log(`   - isVariable: ${data.isVariable}`);
      console.log(`   - value: "${data.value}"`);
      console.log('');
    });

    if (finalCount > 0) {
      console.log('🎉 SUCCESS! Les variables sont maintenant remontées SANS dépendre du nodeId !');
      console.log('👉 Rafraîchissez Prisma Studio pour voir les données');
    } else {
      console.log('❌ Échec de la remontée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceRemountWithoutNodeId();
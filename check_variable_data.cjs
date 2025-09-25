const { PrismaClient } = require('@prisma/client');

async function checkVariableData() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 VÉRIFICATION DES DONNÉES VARIABLES\n');

    // Vérifier toutes les valeurs de variableKey
    const allSubmissions = await prisma.treeBranchLeafSubmissionData.findMany({
      select: {
        id: true,
        variableKey: true,
        isVariable: true
      },
      take: 10
    });

    console.log('📊 Échantillon des variableKey:');
    allSubmissions.forEach((sub, index) => {
      console.log(`${index + 1}. ID: ${sub.id.substring(0, 12)}...`);
      console.log(`   - variableKey: "${sub.variableKey}" (type: ${typeof sub.variableKey})`);
      console.log(`   - isVariable: ${sub.isVariable}`);
      console.log('');
    });

    // Compter les différents types
    const counts = {
      null_values: await prisma.treeBranchLeafSubmissionData.count({
        where: { variableKey: null }
      }),
      string_null: await prisma.treeBranchLeafSubmissionData.count({
        where: { variableKey: "null" }
      }),
      empty_string: await prisma.treeBranchLeafSubmissionData.count({
        where: { variableKey: "" }
      }),
      real_values: await prisma.treeBranchLeafSubmissionData.count({
        where: { 
          AND: [
            { variableKey: { not: null } },
            { variableKey: { not: "null" } },
            { variableKey: { not: "" } }
          ]
        }
      })
    };

    console.log('📈 COMPTAGE PAR TYPE:');
    console.log(`   - NULL (vraies valeurs nulles): ${counts.null_values}`);
    console.log(`   - "null" (string): ${counts.string_null}`);
    console.log(`   - "" (string vide): ${counts.empty_string}`);
    console.log(`   - Vraies valeurs: ${counts.real_values}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVariableData();
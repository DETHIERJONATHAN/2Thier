const { PrismaClient } = require('@prisma/client');

async function checkFixedData() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Vérification des données après réparation...\n');

    // 1. Vérifier les fieldLabel
    const fieldLabelStats = await prisma.$queryRaw`
      SELECT 
        'fieldLabel' as type,
        COUNT(*) as total,
        COUNT("fieldLabel") as filled,
        COUNT(*) - COUNT("fieldLabel") as missing
      FROM "TreeBranchLeafSubmissionData"
    `;
    console.log('📊 Statistiques fieldLabel:', fieldLabelStats[0]);

    // 2. Vérifier les variables
    const variableStats = await prisma.$queryRaw`
      SELECT 
        'variables' as type,
        COUNT(*) as total,
        COUNT("variableKey") as filled,
        COUNT(*) - COUNT("variableKey") as missing
      FROM "TreeBranchLeafSubmissionData"
    `;
    console.log('📊 Statistiques variables:', variableStats[0]);

    // 3. Vérifier isVariable
    const isVariableStats = await prisma.$queryRaw`
      SELECT 
        "isVariable",
        COUNT(*) as count
      FROM "TreeBranchLeafSubmissionData"
      GROUP BY "isVariable"
      ORDER BY "isVariable"
    `;
    console.log('📊 Répartition isVariable:');
    isVariableStats.forEach(stat => {
      console.log(`  - ${stat.isVariable === null ? 'NULL' : stat.isVariable}: ${stat.count} enregistrements`);
    });

    // 4. Échantillon de données réparées
    const sampleData = await prisma.$queryRaw`
      SELECT 
        "id",
        "nodeId",
        "fieldLabel",
        "variableKey",
        "variableDisplayName", 
        "variableUnit",
        "isVariable"
      FROM "TreeBranchLeafSubmissionData"
      WHERE "fieldLabel" IS NOT NULL OR "variableKey" IS NOT NULL
      LIMIT 5
    `;
    
    console.log('\n📝 Échantillon de données réparées:');
    sampleData.forEach((data, index) => {
      console.log(`\n${index + 1}. ID: ${data.id}`);
      console.log(`   - nodeId: ${data.nodeId}`);
      console.log(`   - fieldLabel: "${data.fieldLabel}"`);
      console.log(`   - variableKey: "${data.variableKey}"`);
      console.log(`   - variableDisplayName: "${data.variableDisplayName}"`);
      console.log(`   - variableUnit: "${data.variableUnit}"`);
      console.log(`   - isVariable: ${data.isVariable}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFixedData();
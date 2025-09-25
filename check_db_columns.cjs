const { PrismaClient } = require('@prisma/client');

async function checkDatabaseColumns() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Vérification des colonnes dans la base de données...\n');

    // Vérifier quelles colonnes existent dans TreeBranchLeafSubmissionData
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'TreeBranchLeafSubmissionData' 
        AND table_schema = 'public'
      ORDER BY column_name;
    `;

    console.log('📊 Colonnes existantes dans TreeBranchLeafSubmissionData:');
    result.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });

    // Vérifier spécifiquement nos nouvelles colonnes
    const expectedColumns = [
      'sourceRef', 'operationSource', 'operationDetail', 'operationResult', 
      'lastResolved', 'fieldLabel', 'variableKey', 'variableDisplayName', 
      'variableUnit', 'isVariable'
    ];

    console.log('\n🎯 Vérification des colonnes attendues:');
    expectedColumns.forEach(expectedCol => {
      const exists = result.some(col => col.column_name === expectedCol);
      console.log(`   - ${expectedCol}: ${exists ? '✅ Existe' : '❌ Manquante'}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseColumns();
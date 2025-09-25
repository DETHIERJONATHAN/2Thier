const { PrismaClient } = require('@prisma/client');

async function checkTableColumns() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 VÉRIFICATION DES COLONNES TreeBranchLeafSubmissionData\n');

    // Vérifier quelles colonnes existent vraiment dans la table
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'TreeBranchLeafSubmissionData' 
        AND table_schema = 'public'
      ORDER BY column_name;
    `;

    console.log('📊 COLONNES EXISTANTES DANS LA BASE:');
    result.forEach((col, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${col.column_name.padEnd(25)} (${col.data_type})`);
    });

    // Vérifier spécifiquement les colonnes de variables
    const variableColumns = [
      'fieldLabel', 'variableKey', 'variableDisplayName', 'variableUnit', 'isVariable'
    ];

    console.log('\n🎯 COLONNES VARIABLES:');
    variableColumns.forEach(expectedCol => {
      const exists = result.some(col => col.column_name === expectedCol);
      console.log(`   - ${expectedCol.padEnd(20)}: ${exists ? '✅ EXISTE' : '❌ MANQUANTE'}`);
    });

    // Vérifier les colonnes d'opération
    const operationColumns = [
      'sourceRef', 'operationSource', 'operationDetail', 'operationResult', 'lastResolved'
    ];

    console.log('\n🔧 COLONNES OPÉRATION:');
    operationColumns.forEach(expectedCol => {
      const exists = result.some(col => col.column_name === expectedCol);
      console.log(`   - ${expectedCol.padEnd(20)}: ${exists ? '✅ EXISTE' : '❌ MANQUANTE'}`);
    });

    console.log(`\n📈 TOTAL: ${result.length} colonnes trouvées`);

  } catch (error) {
    console.error('❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableColumns();
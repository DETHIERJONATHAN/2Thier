const { PrismaClient } = require('@prisma/client');

async function quickTableCheck() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 VÉRIFICATION RAPIDE DE LA STRUCTURE\n');

    // Vérifier la vraie structure de TreeBranchLeafSubmissionData
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'TreeBranchLeafSubmissionData'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Colonnes TreeBranchLeafSubmissionData:');
    columns.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });

    // Vérifier quelques données
    const sampleData = await prisma.$queryRaw`
      SELECT id, "submissionId", "nodeId", value, "operationDetail", "operationResult"
      FROM "TreeBranchLeafSubmissionData" 
      LIMIT 5;
    `;
    
    console.log('\n📊 Échantillon de données:');
    sampleData.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.id}:`);
      console.log(`      value: ${row.value}`);
      console.log(`      operationDetail: ${row.operationDetail}`);
      console.log(`      operationResult: ${row.operationResult}`);
    });

    // Compter les données NULL
    const nullData = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "operationDetail" IS NULL THEN 1 END) as null_detail,
        COUNT(CASE WHEN "operationResult" IS NULL THEN 1 END) as null_result,
        COUNT(CASE WHEN value IS NULL THEN 1 END) as null_value
      FROM "TreeBranchLeafSubmissionData";
    `;
    
    console.log('\n📈 État des données:');
    console.log(`   Total: ${nullData[0].total}`);
    console.log(`   NULL operationDetail: ${nullData[0].null_detail}`);
    console.log(`   NULL operationResult: ${nullData[0].null_result}`);
    console.log(`   NULL value: ${nullData[0].null_value}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTableCheck();
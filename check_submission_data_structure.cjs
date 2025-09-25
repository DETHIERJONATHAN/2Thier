const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubmissionDataStructure() {
  try {
    console.log('🔍 Vérification de la structure TreeBranchLeafSubmissionData...\n');
    
    // Vérifier les colonnes de la table TreeBranchLeafSubmissionData
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'TreeBranchLeafSubmissionData'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log(`📊 Colonnes dans TreeBranchLeafSubmissionData: ${columns.length}`);
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubmissionDataStructure();
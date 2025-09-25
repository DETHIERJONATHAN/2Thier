const { PrismaClient } = require('@prisma/client');

async function testFunctionAccess() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Test d\'accès à la fonction PostgreSQL...');
    
    // Test direct de la fonction create_submission_with_auto_populate
    const result = await prisma.$queryRaw`
      SELECT * FROM create_submission_with_auto_populate(
        ${1}, 
        ${1}, 
        ${null}, 
        ${'draft'}, 
        ${'Test depuis script'}
      )
    `;
    
    console.log('✅ Fonction accessible !');
    console.log('📊 Résultat:', result);
    
    // Vérifier si la soumission a été créée avec des données automatiques
    const submissionId = result[0]?.id;
    
    if (submissionId) {
      console.log('🆔 ID soumission créé:', submissionId);
      
      // Vérifier les données auto-populées
      const submissionData = await prisma.$queryRaw`
        SELECT * FROM "TreeBranchLeafSubmissionData" 
        WHERE "submissionId" = ${submissionId}
      `;
      
      console.log('🌳 Données auto-populées:', submissionData);
      
      if (submissionData.length > 0) {
        console.log('✅ Système d\'auto-population fonctionne !');
        console.log('🎯 Colonnes remplies automatiquement:');
        const data = submissionData[0];
        Object.keys(data).forEach(key => {
          if (data[key] !== null) {
            console.log(`   - ${key}: ${data[key]}`);
          }
        });
      } else {
        console.log('❌ Aucune donnée auto-populée trouvée');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('📋 Détails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFunctionAccess();
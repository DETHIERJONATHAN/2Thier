const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDynamicSystem() {
  try {
    console.log('🔍 VÉRIFICATION DU SYSTÈME DYNAMIQUE\n');
    
    // 1. Test de la fonction de découverte
    console.log('1️⃣ Test fonction discover_missing_variables:');
    const discoveries = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM discover_missing_variables();
    `;
    console.log(`   📊 Variables manquantes découvertes: ${discoveries[0].count}`);
    
    // 2. Test de création manuelle
    console.log('\n2️⃣ Test création manuelle:');
    const creationResult = await prisma.$queryRaw`
      SELECT auto_create_all_missing_variables('test_manual_check') as created_count;
    `;
    console.log(`   ✅ Variables créées: ${creationResult[0].created_count}`);
    
    // 3. Vérifier les variables créées
    console.log('\n3️⃣ Vérification variables créées:');
    const newVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        sourceRef: { contains: 'auto-created:' }
      },
      select: {
        id: true,
        exposedKey: true,
        displayName: true,
        sourceRef: true
      },
      take: 10
    });
    
    console.log(`   📋 Variables auto-créées trouvées: ${newVariables.length}`);
    newVariables.forEach((variable, i) => {
      console.log(`   ${i + 1}. ${variable.exposedKey}: "${variable.displayName}"`);
    });
    
    // 4. Vérifier les submissions data
    console.log('\n4️⃣ Vérification submission data:');
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: 'test_manual_check',
        isVariable: true
      },
      take: 5
    });
    
    console.log(`   📊 Données de soumission créées: ${submissionData.length}`);
    
    // 5. Test du trigger sur un nouveau devis
    console.log('\n5️⃣ Test trigger avec nouveau devis:');
    
    const testTree = await prisma.treeBranchLeafTree.findFirst();
    if (testTree) {
      const newSubmission = await prisma.treeBranchLeafSubmission.create({
        data: {
          id: `trigger_test_${Date.now()}`,
          treeId: testTree.id,
          status: 'draft',
          updatedAt: new Date()
        }
      });
      
      console.log(`   📝 Nouveau devis créé: ${newSubmission.id}`);
      
      // Attendre le trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier les créations automatiques
      const triggerCreations = await prisma.treeBranchLeafSubmissionData.findMany({
        where: {
          submissionId: newSubmission.id,
          isVariable: true
        }
      });
      
      console.log(`   🎯 Variables créées par trigger: ${triggerCreations.length}`);
      
      // Nettoyage
      await prisma.treeBranchLeafSubmission.delete({
        where: { id: newSubmission.id }
      });
      console.log('   🧹 Test nettoyé');
    }
    
    console.log('\n✅ VÉRIFICATION TERMINÉE');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDynamicSystem();
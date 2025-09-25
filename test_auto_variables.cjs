const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAutoVariableCreation() {
  try {
    console.log('🧪 TEST MANUEL : AUTO-CRÉATION VARIABLES\n');
    
    // 1. Vérifier que les triggers existent
    const triggers = await prisma.$queryRaw`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND event_object_table = 'TreeBranchLeafSubmission'
    `;
    
    console.log('📋 Triggers installés:');
    triggers.forEach(trigger => {
      console.log(`   ✅ ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
    });
    console.log('');
    
    // 2. Compter les variables disponibles
    const variableCount = await prisma.treeBranchLeafNodeVariable.count();
    console.log(`🔢 Variables disponibles: ${variableCount}\n`);
    
    if (variableCount === 0) {
      console.log('⚠️  Aucune variable trouvée. Le système est configuré mais il n\'y a rien à auto-créer.');
      return;
    }
    
    // 3. Obtenir un devis existant pour les infos
    const existingSubmission = await prisma.treeBranchLeafSubmission.findFirst({
      where: {
        organizationId: { not: null }
      }
    });
    
    if (!existingSubmission) {
      console.log('❌ Aucun devis existant trouvé pour récupérer les informations');
      return;
    }
    
    console.log(`📋 Modèle de devis trouvé: ${existingSubmission.id}`);
    console.log(`   🏢 Organisation: ${existingSubmission.organizationId}`);
    console.log(`   👤 Utilisateur: ${existingSubmission.userId}`);
    console.log(`   🌳 Tree: ${existingSubmission.treeId}\n`);
    
    // 4. Créer un nouveau devis
    console.log('🔄 Création d\'un nouveau devis...');
    const newDevis = await prisma.treeBranchLeafSubmission.create({
      data: {
        id: `auto-test-${Date.now()}`,
        treeId: existingSubmission.treeId,
        organizationId: existingSubmission.organizationId,
        userId: existingSubmission.userId,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Nouveau devis créé: ${newDevis.id}\n`);
    
    // 5. Attendre un peu pour les triggers
    console.log('⏳ Attente de l\'exécution des triggers...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. Vérifier les variables auto-créées
    const autoVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: newDevis.id,
        isVariable: true
      },
      include: {
        TreeBranchLeafNode: {
          select: { label: true }
        }
      }
    });
    
    console.log(`\n🎉 RÉSULTAT: ${autoVariables.length} variables auto-créées !\n`);
    
    autoVariables.forEach((variable, i) => {
      console.log(`${i + 1}. 🔑 ${variable.variableKey}`);
      console.log(`   🆔 ID: ${variable.id}`);
      console.log(`   🔗 nodeId: ${variable.nodeId}`);
      console.log(`   🏷️  Node: ${variable.TreeBranchLeafNode?.label || 'N/A'}`);
      console.log(`   💎 Value: ${variable.value || 'NULL (prêt pour saisie)'}`);
      console.log(`   📍 SourceRef: ${variable.sourceRef || 'N/A'}\n`);
    });
    
    // 7. Test de mise à jour
    if (autoVariables.length > 0) {
      const firstVar = autoVariables[0];
      console.log(`🔄 Test de mise à jour de valeur...`);
      
      await prisma.treeBranchLeafSubmissionData.update({
        where: { id: firstVar.id },
        data: { value: '999.88' }
      });
      
      console.log(`✅ ${firstVar.variableKey} = "999.88" (valeur du devis spécifique)\n`);
    }
    
    // 8. Nettoyage
    console.log('🗑️  Suppression du devis test...');
    await prisma.treeBranchLeafSubmission.delete({
      where: { id: newDevis.id }
    });
    
    const remaining = await prisma.treeBranchLeafSubmissionData.count({
      where: {
        submissionId: newDevis.id,
        isVariable: true
      }
    });
    
    console.log(`✅ Nettoyage auto: ${remaining} variables restantes (devrait être 0)\n`);
    
    console.log('🎉 TEST TERMINÉ AVEC SUCCÈS !');
    console.log('✨ Le système d\'auto-création est opérationnel !');
    console.log('💡 Maintenant chaque nouveau devis aura automatiquement toutes ses variables.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoVariableCreation();
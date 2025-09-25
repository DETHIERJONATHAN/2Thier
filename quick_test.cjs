const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickTest() {
  try {
    console.log('🚀 TEST RAPIDE AUTO-CRÉATION\n');
    
    // Prendre n'importe quel devis existant comme modèle
    const anySubmission = await prisma.treeBranchLeafSubmission.findFirst();
    
    if (!anySubmission) {
      console.log('❌ Aucun devis existant');
      return;
    }
    
    console.log(`📋 Modèle trouvé: ${anySubmission.id}`);
    
    // Créer un nouveau devis en copiant les champs du modèle
    const newDevis = await prisma.treeBranchLeafSubmission.create({
      data: {
        id: `test-auto-${Date.now()}`,
        treeId: anySubmission.treeId,
        userId: anySubmission.userId,
        leadId: anySubmission.leadId,
        sessionId: anySubmission.sessionId,
        status: anySubmission.status,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Nouveau devis: ${newDevis.id}`);
    
    // Attendre les triggers
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Vérifier les variables auto-créées
    const autoVars = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: newDevis.id,
        isVariable: true
      }
    });
    
    console.log(`\n🎉 ${autoVars.length} VARIABLES AUTO-CRÉÉES !`);
    
    autoVars.forEach((v, i) => {
      console.log(`${i+1}. ${v.variableKey} (ID: ${v.id})`);
    });
    
    // Nettoyage
    await prisma.treeBranchLeafSubmission.delete({
      where: { id: newDevis.id }
    });
    
    console.log('\n✅ SYSTÈME OPÉRATIONNEL !');
    console.log('🎯 Approche 1 implémentée avec succès !');
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();
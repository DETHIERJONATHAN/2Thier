const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🚀 TEST FINAL AUTO-CRÉATION');
    
    // Récupérer un devis existant pour copier ses données
    const existingDevis = await prisma.treeBranchLeafSubmission.findFirst({
      select: { userId: true, treeId: true }
    });
    
    if (!existingDevis) {
      console.log('❌ Aucun devis existant trouvé');
      return;
    }
    
    console.log('📋 Devis de référence trouvé');
    
    const newDevis = await prisma.treeBranchLeafSubmission.create({
      data: {
        id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        treeId: existingDevis.treeId,
        userId: existingDevis.userId,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Devis créé:', newDevis.id);
    
    // Attendre que le trigger fasse son travail
    await new Promise(r => setTimeout(r, 2000));
    
    const vars = await prisma.treeBranchLeafSubmissionData.count({
      where: { 
        submissionId: newDevis.id, 
        isVariable: true 
      }
    });
    
    console.log('🎉 Variables auto-créées:', vars);
    
    if (vars > 0) {
      console.log('✅ SUCCÈS ! Approche 1 opérationnelle !');
    } else {
      console.log('⚠️ Aucune variable créée automatiquement');
    }
    
    // Nettoyage
    await prisma.treeBranchLeafSubmission.delete({
      where: { id: newDevis.id }
    });
    
    console.log('🧹 Test nettoyé');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
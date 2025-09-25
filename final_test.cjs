const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🚀 TEST FINAL AUTO-CRÉATION');
    
    const newDevis = await prisma.treeBranchLeafSubmission.create({
      data: {
        id: `test-${Math.random().toString(36).substr(2, 9)}`,
        treeId: '7de9b14d-974b-4c5e-839f-9e1b4e6c7d8a',
        userId: '1757366075163-2vdibc2ve',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Devis créé:', newDevis.id);
    
    await new Promise(r => setTimeout(r, 1000));
    
    const vars = await prisma.treeBranchLeafSubmissionData.count({
      where: { 
        submissionId: newDevis.id, 
        isVariable: true 
      }
    });
    
    console.log('🎉 Variables auto-créées:', vars);
    
    await prisma.treeBranchLeafSubmission.delete({
      where: { id: newDevis.id }
    });
    
    console.log('✅ SUCCÈS ! Approche 1 opérationnelle !');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
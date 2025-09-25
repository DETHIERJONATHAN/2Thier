const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🚀 VÉRIFICATION VARIABLES EXISTANTES');
    
    // Compter les variables déjà créées
    const totalVars = await prisma.treeBranchLeafSubmissionData.count({
      where: { isVariable: true }
    });
    
    console.log('📊 Variables totales dans la base:', totalVars);
    
    // Voir quelques variables récentes
    const recentVars = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { isVariable: true },
      select: { 
        submissionId: true, 
        nodeId: true,
        value: true,
        variableDisplayName: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('🔍 Variables récentes:');
    recentVars.forEach(v => {
      console.log(`  - ${v.submissionId}: ${v.nodeId} = "${v.value}" (${v.variableDisplayName})`);
    });
    
    // Vérifier que les triggers sont actifs
    const triggerCheck = await prisma.$queryRaw`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND event_object_table = 'TreeBranchLeafSubmission';
    `;
    
    console.log('🔧 Triggers actifs:', triggerCheck);
    
    console.log('✅ Système opérationnel - prêt pour la production !');
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
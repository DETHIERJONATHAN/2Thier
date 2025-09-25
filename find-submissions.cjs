const { PrismaClient } = require('@prisma/client');

async function findSubmissions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 RECHERCHE DES SOUMISSIONS TREEBRANCHLEAF');
    console.log('===========================================\n');
    
    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      take: 10,
      select: {
        id: true,
        createdAt: true,
        TreeBranchLeafTree: {
          select: {
            name: true,
            organizationId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 ${submissions.length} soumissions trouvées:\n`);
    
    submissions.forEach((sub, index) => {
      console.log(`${index + 1}. ID: ${sub.id}`);
      console.log(`   Arbre: ${sub.TreeBranchLeafTree?.name || 'N/A'}`);
      console.log(`   Organisation: ${sub.TreeBranchLeafTree?.organizationId || 'N/A'}`);
      console.log(`   Date: ${sub.createdAt}`);
      console.log('');
    });
    
    if (submissions.length > 0) {
      console.log('🎯 RECOMMANDATION:');
      console.log(`Utiliser cette soumission pour le test: ${submissions[0].id}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findSubmissions();
const { PrismaClient } = require('@prisma/client');

async function findRealDevis() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 RECHERCHE VRAIS DEVIS DANS PRISMA\n');
    
    // 1. Chercher des soumissions TBL avec des données
    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      where: {
        TreeBranchLeafSubmissionData: {
          some: {
            value: { not: null }
          }
        }
      },
      include: {
        TreeBranchLeafSubmissionData: {
          where: {
            value: { not: null }
          },
          include: {
            TreeBranchLeafNode: {
              select: { id: true, label: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    if (submissions.length === 0) {
      console.log('❌ Aucune soumission TBL trouvée avec des données');
      return;
    }
    
    console.log(`✅ ${submissions.length} soumissions trouvées avec des données\n`);
    
    submissions.forEach((submission, index) => {
      console.log(`📋 SOUMISSION ${index + 1}: ${submission.id}`);
      console.log(`📅 Créée: ${submission.createdAt}`);
      console.log(`🌳 TreeID: ${submission.treeId}`);
      
      if (submission.exportData) {
        console.log(`📊 Export Data:`, JSON.stringify(submission.exportData, null, 2));
      }
      
      console.log(`📊 DONNÉES SAISIES (${submission.TreeBranchLeafSubmissionData.length}):`);
      submission.TreeBranchLeafSubmissionData.forEach((data, dataIndex) => {
        console.log(`  ${dataIndex + 1}. ${data.TreeBranchLeafNode?.label || 'Sans label'}`);
        console.log(`     NodeID: ${data.nodeId}`);
        console.log(`     Valeur: ${data.value}`);
        console.log('');
      });
      
      // Suggestion pour le test
      const formData = {};
      submission.TreeBranchLeafSubmissionData.forEach(data => {
        if (data.value) {
          formData[data.nodeId] = data.value;
        }
      });
      
      console.log(`🎯 FORMDATA POUR TEST:`);
      console.log(JSON.stringify(formData, null, 2));
      console.log('\n' + '='.repeat(60) + '\n');
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findRealDevis();
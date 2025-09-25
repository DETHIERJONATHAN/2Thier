// Test direct en base pour trouver les soumissions et leurs opérations conditions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('🔍 Recherche des soumissions avec conditions...');
    
    const submissions = await prisma.treeBranchLeafSubmission.findMany({
      select: { id: true, status: true },
      take: 5
    });
    
    console.log('Soumissions trouvées:', submissions.length);
    
    for (const sub of submissions) {
      console.log('\n=== Soumission:', sub.id, '===');
      
      const conditions = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { 
          submissionId: sub.id
        },
        select: {
          nodeId: true,
          operationDetail: true,
          operationResult: true,
          fieldLabel: true
        }
      });
      
      console.log('Conditions trouvées:', conditions.length);
      
      // Afficher toutes les conditions pour voir leur structure
      conditions.forEach((c, i) => {
        console.log(`Condition ${i}:`, {
          nodeId: c.nodeId,
          fieldLabel: c.fieldLabel,
          operationDetail: typeof c.operationDetail,
          operationResult: typeof c.operationResult
        });
      });
      
      const targetCondition = conditions.find(c => 
        c.fieldLabel && c.fieldLabel.includes('Prix Kw/h')
      );
      
      if (targetCondition) {
        console.log('🎯 CONDITION PRIX KW/H TROUVÉE:');
        console.log('NodeId:', targetCondition.nodeId);
        console.log('Field Label:', targetCondition.fieldLabel);
        console.log('Operation Detail:', targetCondition.operationDetail);
        console.log('Operation Result:', targetCondition.operationResult);
        
        // Tester l'API pour cette soumission
        console.log('\n🔗 URL API: http://localhost:4000/api/treebranchleaf/submissions/' + sub.id + '/operations');
        break;
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
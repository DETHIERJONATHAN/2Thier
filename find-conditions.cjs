const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findConditionData() {
  try {
    console.log('=== RECHERCHE DE DONNÉES AVEC CONDITIONS ===\n');

    // 1. Chercher dans TreeBranchLeafNodeCondition des données avec conditionSet
    console.log('🔍 Recherche dans TreeBranchLeafNodeCondition...');
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: {
        conditionSet: {
          not: null
        }
      },
      take: 5,
      include: {
        node: {
          select: { label: true, type: true, treeId: true }
        }
      }
    });

    console.log(`✅ ${conditions.length} conditions avec conditionSet trouvées:`);
    for (const condition of conditions) {
      console.log(`\n📋 Condition: ${condition.node?.label || 'Sans label'}`);
      console.log(`   Type: ${condition.node?.type || 'N/A'}`);
      console.log(`   TreeId: ${condition.node?.treeId || 'N/A'}`);
      console.log(`   ConditionSet: ${JSON.stringify(condition.conditionSet)}`);
      console.log(`   Name: ${condition.name}`);
    }

    // 2. Vérifier les soumissions qui utilisent ces arbres
    if (conditions.length > 0) {
      const treeIds = [...new Set(conditions.map(c => c.node?.treeId).filter(Boolean))];
      console.log(`\n🔍 Vérification des soumissions pour ces arbres (${treeIds.length})...`);
      
      for (const treeId of treeIds) {
        const submissions = await prisma.treeBranchLeafSubmission.findMany({
          where: { treeId: treeId },
          include: {
            _count: {
              select: {
                TreeBranchLeafSubmissionData: true
              }
            }
          },
          take: 3
        });
        
        console.log(`\n   📊 Tree ${treeId} - ${submissions.length} soumissions:`);
        for (const submission of submissions) {
          console.log(`      ${submission.id}: ${submission._count.TreeBranchLeafSubmissionData} données, statut: ${submission.status}`);
        }
      }
    }

    // 3. Chercher des soumissions récentes avec beaucoup de données ET des records avec conditions
    console.log('\n🔍 Recherche de soumissions complètes avec conditions...');
    const completedSubmissions = await prisma.treeBranchLeafSubmission.findMany({
      where: {
        TreeBranchLeafSubmissionData: {
          some: {}
        }
      },
      include: {
        _count: {
          select: {
            TreeBranchLeafSubmissionData: true
          }
        }
      },
      orderBy: {
        TreeBranchLeafSubmissionData: {
          _count: 'desc'
        }
      },
      take: 3
    });

    console.log(`✅ Top 3 soumissions avec données:`);
    for (const submission of completedSubmissions) {
      console.log(`\n📋 ID: ${submission.id}`);
      console.log(`   Données: ${submission._count.TreeBranchLeafSubmissionData}`);
      console.log(`   Records: ${submission._count.TreeBranchLeafRecord}`);
      console.log(`   Statut: ${submission.status}`);
      
      // Vérifier s'il y a des conditions pour cette soumission/arbre
      const conditionCount = await prisma.treeBranchLeafNodeCondition.count({
        where: {
          node: {
            treeId: submission.treeId
          }
        }
      });
      
      console.log(`   Conditions pour cet arbre: ${conditionCount}`);
      
      if (conditionCount > 0) {
        console.log(`   🎯 BINGO! Cette soumission a un arbre avec des conditions!`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findConditionData();
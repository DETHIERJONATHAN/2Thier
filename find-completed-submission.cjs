const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findCompletedSubmission() {
  try {
    console.log('=== RECHERCHE DU DEVIS COMPLET DE TEST ===\n');

    // 1. Chercher des soumissions avec statut completed ou submitted
    console.log('🔍 Recherche de soumissions complétées...');
    const completedByStatus = await prisma.treeBranchLeafSubmission.findMany({
      where: {
        OR: [
          { status: 'completed' },
          { status: 'submitted' },
          { status: 'finished' },
          { status: 'done' }
        ]
      },
      include: {
        TreeBranchLeafSubmissionData: {
          take: 5,
          include: {
            TreeBranchLeafNode: {
              select: { label: true, type: true }
            }
          }
        }
      }
    });

    if (completedByStatus.length > 0) {
      console.log(`✅ ${completedByStatus.length} soumissions avec statut completed trouvées:`);
      for (const submission of completedByStatus) {
        console.log(`\n📋 ID: ${submission.id}`);
        console.log(`   Statut: ${submission.status}`);
        console.log(`   Données: ${submission.TreeBranchLeafSubmissionData.length} entrées`);
        if (submission.TreeBranchLeafSubmissionData.length > 0) {
          for (const data of submission.TreeBranchLeafSubmissionData.slice(0, 3)) {
            console.log(`     - ${data.TreeBranchLeafNode?.label || 'Sans label'}: "${data.value}"`);
          }
        }
      }
    }

    // 2. Chercher des soumissions avec beaucoup de données (même en draft)
    console.log('\n🔍 Recherche de soumissions avec beaucoup de données...');
    const submissionsWithMostData = await prisma.treeBranchLeafSubmission.findMany({
      include: {
        _count: {
          select: {
            TreeBranchLeafSubmissionData: true
          }
        },
        TreeBranchLeafSubmissionData: {
          take: 10,
          include: {
            TreeBranchLeafNode: {
              select: { label: true, type: true }
            }
          }
        }
      },
      orderBy: {
        TreeBranchLeafSubmissionData: {
          _count: 'desc'
        }
      },
      take: 5
    });

    console.log(`✅ Top 5 des soumissions avec le plus de données:`);
    for (const submission of submissionsWithMostData) {
      const dataCount = submission._count.TreeBranchLeafSubmissionData;
      console.log(`\n📋 ID: ${submission.id}`);
      console.log(`   Statut: ${submission.status}`);
      console.log(`   Créée: ${submission.createdAt}`);
      console.log(`   Total données: ${dataCount} entrées`);
      
      if (dataCount > 0) {
        console.log(`   Exemples de données:`);
        for (const data of submission.TreeBranchLeafSubmissionData.slice(0, 5)) {
          console.log(`     - ${data.TreeBranchLeafNode?.label || 'Sans label'}: "${data.value}"`);
        }
        if (dataCount > 5) {
          console.log(`     ... et ${dataCount - 5} autres`);
        }
      }
    }

    // 3. Chercher spécifiquement des données avec des valeurs numériques
    console.log('\n🔍 Recherche de données avec valeurs numériques...');
    const numericData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        value: {
          not: null,
          not: ''
        }
      },
      take: 10,
      include: {
        TreeBranchLeafNode: {
          select: { label: true, type: true }
        },
        TreeBranchLeafSubmission: {
          select: { id: true, status: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (numericData.length > 0) {
      console.log(`✅ ${numericData.length} données avec valeurs trouvées:`);
      const submissionGroups = {};
      
      for (const data of numericData) {
        const submissionId = data.TreeBranchLeafSubmission.id;
        if (!submissionGroups[submissionId]) {
          submissionGroups[submissionId] = {
            submission: data.TreeBranchLeafSubmission,
            data: []
          };
        }
        submissionGroups[submissionId].data.push(data);
      }

      for (const [submissionId, group] of Object.entries(submissionGroups)) {
        console.log(`\n📋 Soumission: ${submissionId}`);
        console.log(`   Statut: ${group.submission.status}`);
        console.log(`   Créée: ${group.submission.createdAt}`);
        console.log(`   Données avec valeurs (${group.data.length}):`);
        for (const data of group.data) {
          console.log(`     - ${data.TreeBranchLeafNode?.label || 'Sans label'}: "${data.value}"`);
        }
      }
    } else {
      console.log('❌ Aucune donnée avec valeurs trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCompletedSubmission();
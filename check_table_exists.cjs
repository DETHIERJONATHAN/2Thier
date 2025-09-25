const { PrismaClient } = require('@prisma/client');

async function checkTableExists() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 VÉRIFICATION DE LA TABLE TreeBranchLeafSubmission\n');

    // 1. Vérifier directement avec SQL
    console.log('1️⃣ Vérification SQL directe...');
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'TreeBranchLeafSubmission'
      );
    `;
    
    console.log(`📋 Table TreeBranchLeafSubmission existe: ${tableExists[0].exists}`);

    // 2. Lister toutes les tables TreeBranch*
    console.log('\n2️⃣ Tables TreeBranch existantes:');
    const treeTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'TreeBranch%'
      ORDER BY table_name;
    `;
    
    treeTables.forEach(t => {
      console.log(`   ✅ ${t.table_name}`);
    });

    // 3. Tester l'accès Prisma direct
    console.log('\n3️⃣ Test accès Prisma...');
    try {
      const count = await prisma.treeBranchLeafSubmission.count();
      console.log(`✅ prisma.treeBranchLeafSubmission.count() = ${count}`);
    } catch (e) {
      console.log(`❌ prisma.treeBranchLeafSubmission: ${e.message}`);
      console.log(`   Code d'erreur: ${e.code}`);
      
      if (e.code === 'P2021') {
        console.log('💡 Solution: Problème de synchronisation client Prisma');
      }
    }

    // 4. Vérifier les autres tables
    console.log('\n4️⃣ Test autres tables TreeBranch...');
    try {
      const dataCount = await prisma.treeBranchLeafSubmissionData.count();
      console.log(`✅ treeBranchLeafSubmissionData: ${dataCount} lignes`);
    } catch (e) {
      console.log(`❌ treeBranchLeafSubmissionData: ${e.message}`);
    }

    try {
      const treeCount = await prisma.treeBranchLeafTree.count();
      console.log(`✅ treeBranchLeafTree: ${treeCount} lignes`);
    } catch (e) {
      console.log(`❌ treeBranchLeafTree: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableExists();
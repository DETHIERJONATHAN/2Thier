const { PrismaClient } = require('@prisma/client');

async function diagnosePrismaTableIssue() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 DIAGNOSTIC DU PROBLÈME DE TABLE PRISMA\n');

    // 1. Vérifier les tables qui existent vraiment
    console.log('1️⃣ Vérification des tables existantes...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%TreeBranch%'
      ORDER BY table_name;
    `;
    
    console.log(`📋 Tables TreeBranch trouvées: ${tables.length}`);
    tables.forEach(t => {
      console.log(`   ✅ ${t.table_name}`);
    });

    // 2. Chercher des variantes de noms
    console.log('\n2️⃣ Recherche de variantes de noms...');
    const allTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const treeRelatedTables = allTables.filter(t => 
      t.table_name.toLowerCase().includes('tree') || 
      t.table_name.toLowerCase().includes('submission')
    );
    
    console.log(`🔍 Tables liées à Tree/Submission: ${treeRelatedTables.length}`);
    treeRelatedTables.forEach(t => {
      console.log(`   🔹 ${t.table_name}`);
    });

    // 3. Test d'accès direct aux tables trouvées
    console.log('\n3️⃣ Test d\'accès aux tables...');
    
    try {
      const submissionData = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "TreeBranchLeafSubmissionData";`;
      console.log(`✅ TreeBranchLeafSubmissionData accessible: ${submissionData[0].count} lignes`);
    } catch (e) {
      console.log(`❌ TreeBranchLeafSubmissionData: ${e.message}`);
    }

    try {
      const tree = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "TreeBranchLeafTree";`;
      console.log(`✅ TreeBranchLeafTree accessible: ${tree[0].count} lignes`);
    } catch (e) {
      console.log(`❌ TreeBranchLeafTree: ${e.message}`);
    }

    try {
      const submission = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "TreeBranchLeafSubmission";`;
      console.log(`✅ TreeBranchLeafSubmission accessible: ${submission[0].count} lignes`);
    } catch (e) {
      console.log(`❌ TreeBranchLeafSubmission: ${e.message}`);
    }

    // 4. Vérifier le schéma Prisma
    console.log('\n4️⃣ Test avec méthodes Prisma...');
    
    try {
      const dataCount = await prisma.treeBranchLeafSubmissionData.count();
      console.log(`✅ prisma.treeBranchLeafSubmissionData.count(): ${dataCount}`);
    } catch (e) {
      console.log(`❌ prisma.treeBranchLeafSubmissionData: ${e.message}`);
    }

    try {
      const treeCount = await prisma.treeBranchLeafTree.count();
      console.log(`✅ prisma.treeBranchLeafTree.count(): ${treeCount}`);
    } catch (e) {
      console.log(`❌ prisma.treeBranchLeafTree: ${e.message}`);
    }

    try {
      const submissionCount = await prisma.treeBranchLeafSubmission.count();
      console.log(`✅ prisma.treeBranchLeafSubmission.count(): ${submissionCount}`);
    } catch (e) {
      console.log(`❌ prisma.treeBranchLeafSubmission: ${e.message}`);
    }

    // 5. Solution proposée
    console.log('\n🎯 DIAGNOSTIC:');
    console.log('Le problème vient probablement de:');
    console.log('1. Schema Prisma non synchronisé avec la base');
    console.log('2. Client Prisma non regeneré');
    console.log('3. Migration non appliquée');
    
    console.log('\n💡 SOLUTIONS POSSIBLES:');
    console.log('1. npx prisma generate');
    console.log('2. npx prisma db push');
    console.log('3. npx prisma migrate dev');
    console.log('4. Redémarrer le serveur');

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePrismaTableIssue();
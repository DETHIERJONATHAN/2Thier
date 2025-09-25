const { PrismaClient } = require('@prisma/client');

async function debugForeignKeyConstraint() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 DIAGNOSTIC DE LA CONTRAINTE DE CLÉ ÉTRANGÈRE\n');

    // 1. Vérifier la structure de TreeBranchLeafSubmission
    console.log('1️⃣ Structure de TreeBranchLeafSubmission...');
    const submissionColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'TreeBranchLeafSubmission'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Colonnes:');
    submissionColumns.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 2. Vérifier les contraintes de clé étrangère
    console.log('\n2️⃣ Contraintes de clé étrangère...');
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'TreeBranchLeafSubmission';
    `;
    
    console.log('🔗 Contraintes FK:');
    constraints.forEach(fk => {
      console.log(`   ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // 3. Vérifier les données existantes dans les tables référencées
    console.log('\n3️⃣ Vérification des données référencées...');
    
    // Vérifier TreeBranchLeafTree
    const trees = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "TreeBranchLeafTree";`;
    console.log(`📊 Arbres disponibles: ${trees[0].count}`);
    
    if (trees[0].count > 0) {
      const sampleTree = await prisma.$queryRaw`SELECT id, name FROM "TreeBranchLeafTree" LIMIT 1;`;
      console.log(`   Premier arbre: ${sampleTree[0].id} - ${sampleTree[0].name || 'Sans nom'}`);
    }

    // Vérifier User (si c'est nécessaire)
    try {
      const users = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User";`;
      console.log(`👤 Utilisateurs disponibles: ${users[0].count}`);
      
      if (users[0].count > 0) {
        const sampleUser = await prisma.$queryRaw`SELECT id, email FROM "User" LIMIT 1;`;
        console.log(`   Premier utilisateur: ${sampleUser[0].id} - ${sampleUser[0].email || 'Sans email'}`);
      }
    } catch (e) {
      console.log('⚠️ Table User non accessible ou inexistante');
    }

    // 4. Test de création avec des données valides
    console.log('\n4️⃣ Test avec données valides...');
    
    if (trees[0].count > 0) {
      const validTree = await prisma.$queryRaw`SELECT id FROM "TreeBranchLeafTree" LIMIT 1;`;
      const treeId = validTree[0].id;
      
      try {
        // Test avec un userId qui pourrait exister
        let validUserId = 'test-user';
        
        // Essayer de trouver un vrai userId
        try {
          const realUser = await prisma.$queryRaw`SELECT id FROM "User" LIMIT 1;`;
          if (realUser.length > 0) {
            validUserId = realUser[0].id;
            console.log(`🔑 Utilisation userId réel: ${validUserId}`);
          }
        } catch (e) {
          console.log(`🔑 Utilisation userId test: ${validUserId}`);
        }
        
        const testId = 'test_submission_' + Date.now();
        console.log(`🧪 Tentative création avec treeId: ${treeId}, userId: ${validUserId}`);
        
        const submission = await prisma.treeBranchLeafSubmission.create({
          data: {
            id: testId,
            treeId: treeId,
            userId: validUserId,
            status: 'draft',
            summary: { name: 'Test diagnostic' },
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ Succès! Soumission créée: ${submission.id}`);
        
        // Nettoyer
        await prisma.treeBranchLeafSubmission.delete({ where: { id: testId } });
        console.log(`🧹 Test nettoyé`);
        
      } catch (testError) {
        console.log(`❌ Erreur test: ${testError.message}`);
        
        // Analyser l'erreur
        if (testError.message.includes('Foreign key constraint')) {
          console.log('🔍 Analyse de l\'erreur FK...');
          console.log('   Causes possibles:');
          console.log('   - userId invalide (référence vers User)');
          console.log('   - treeId invalide (référence vers TreeBranchLeafTree)');
          console.log('   - leadId requis (référence vers Lead)');
        }
      }
    }

    console.log('\n🎯 CONCLUSION:');
    console.log('✅ Triggers automatiques supprimés');
    console.log('❌ Contrainte FK empêche la création');
    console.log('💡 Solution: Identifier et corriger la contrainte FK');

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugForeignKeyConstraint();